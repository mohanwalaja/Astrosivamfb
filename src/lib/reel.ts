import { renderPoster, renderPosterLayers, type PosterOptions } from "./poster";
import { slugify } from "./export";
import { paintMotionFrame, type PosterLayers, type PosterManifest } from "./motion";
import { themeFor } from "./posterKit";
import { templateForLayout } from "../data/posterTemplates";

/**
 * 15-second Reels / Story clip, built from the poster the user already made.
 *
 * The redesign replaced the old two-still crossfade with a real motion
 * pipeline: the poster is painted once into four depth planes (ground, art,
 * copy, brand) and every video frame composites those planes with a camera
 * push, parallax between them, a masked type reveal and live light overlays.
 * Because the planes come from the same painter as the PNG export, a reel
 * frame and the still are the same artwork at different times.
 *
 * 450 frames at 30 fps is far too much to pre-render and store, so frames are
 * painted live into a canvas capture stream and handed to MediaRecorder.
 */

export type PosterSource = Omit<PosterOptions, "scale" | "reveal">;

export interface ReelOptions {
  poster: PosterSource;
  seconds?: number;
  fps?: number;
  onProgress?: (fraction: number, stage: ReelStage) => void;
  signal?: AbortSignal;
}

export type ReelStage = "rendering" | "recording" | "encoding";

export interface ReelResult {
  blob: Blob;
  mimeType: string;
  frames: number;
  durationMs: number;
  /** Finished poster canvas, used as the export-library thumbnail for this reel. */
  thumbnailCanvas: HTMLCanvasElement;
}

export const REEL_SIZE = { width: 1080, height: 1920 } as const;
export const REEL_SECONDS = 15;
export const REEL_FPS = 30;

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
];

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  // MediaRecorder.isTypeSupported is missing in some older Safari builds.
  if (typeof MediaRecorder.isTypeSupported !== "function") return "video/webm";
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function reelSupport(): { ok: boolean; reason?: string } {
  if (typeof window === "undefined") return { ok: false, reason: "Video export needs a browser." };
  const canvas = document.createElement("canvas");
  if (typeof canvas.captureStream !== "function") {
    return { ok: false, reason: "This browser cannot capture a canvas as video. Try Chrome, Edge or Firefox." };
  }
  if (typeof MediaRecorder === "undefined") {
    return { ok: false, reason: "This browser has no MediaRecorder — video export is unavailable here." };
  }
  if (!pickMimeType()) return { ok: false, reason: "No supported video codec found in this browser." };
  return { ok: true };
}

/**
 * One animation frame — but never wait forever. A hidden tab stops firing
 * rAF entirely, and a recorder that waited on it would hang instead of failing.
 */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 250);
  });

export interface ReelFrameInput {
  ctx: CanvasRenderingContext2D;
  layers: PosterLayers;
  manifest: PosterManifest;
  template: ReturnType<typeof templateForLayout>;
  themeKey: PosterOptions["themeKey"];
  t: number;
}

/** One frame of the reel as a pure function of time — inspectable without a recorder. */
export function paintReelFrame({ ctx, layers, manifest, template, themeKey, t }: ReelFrameInput) {
  paintMotionFrame({ ctx, layers, manifest, template, theme: themeFor(themeKey), t });
}

export async function recordReel(options: ReelOptions): Promise<ReelResult> {
  const support = reelSupport();
  if (!support.ok) throw new Error(support.reason ?? "Video export is unavailable.");

  const seconds = options.seconds ?? REEL_SECONDS;
  const fps = options.fps ?? REEL_FPS;
  const durationMs = seconds * 1000;
  const totalFrames = Math.round(seconds * fps);
  const { width: W, height: H } = REEL_SIZE;

  options.onProgress?.(0, "rendering");

  // One layered render of the poster: four depth planes plus the manifest.
  const poster: PosterOptions = { ...options.poster, width: W, height: H };
  const { layers, manifest } = await renderPosterLayers(poster);
  const finished = await renderPoster({ ...poster, reveal: 1 });
  const template = poster.template ?? templateForLayout(poster.layout);
  options.onProgress?.(0.08, "rendering");

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not open a 2D context for the video canvas.");
  ctx.imageSmoothingQuality = "high";

  const drawFrame = (t: number) => paintReelFrame({ ctx, layers, manifest, template, themeKey: poster.themeKey, t });

  // A still first frame makes the recorder start on real pixels, not a blank canvas.
  drawFrame(0);

  const stream = out.captureStream(0) as MediaStream;
  const [track] = stream.getVideoTracks() as Array<CanvasCaptureMediaStreamTrack & MediaStreamTrack>;
  const manual = typeof track?.requestFrame === "function";
  if (!manual) {
    stream.getTracks().forEach((t) => t.stop());
  }
  const capture = manual ? stream : out.captureStream(fps);

  const mimeType = pickMimeType() ?? "video/webm";
  const recorder = new MediaRecorder(capture, { mimeType, videoBitsPerSecond: 9_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("The recorder stopped with an error."));
  });
  // A cancel throws past the await below; keep that rejection handled anyway.
  void stopped.catch(() => undefined);

  const startedAt = performance.now();
  recorder.start(250);
  options.onProgress?.(0.1, "recording");

  let frames = 0;
  const hiddenMessage = "Recording paused — keep this tab visible until it finishes.";
  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      if (options.signal?.aborted) throw new Error("Recording cancelled.");
      // Pace to wall-clock time: a capture stream timestamps frames as they
      // arrive, so painting 450 frames as fast as the CPU allows would produce
      // a half-second video instead of a 15-second one.
      const target = startedAt + (frame / fps) * 1000;
      let waits = 0;
      while (performance.now() < target) {
        await nextFrame();
        if (document.hidden) throw new Error(hiddenMessage);
        waits += 1;
        if (waits > fps * 30) throw new Error(hiddenMessage);
      }
      const t = frame / Math.max(1, totalFrames - 1);
      drawFrame(t * seconds);
      if (manual) track.requestFrame();
      frames += 1;
      if (frame % 5 === 0) options.onProgress?.(0.1 + 0.85 * t, "recording");
    }
    // the loop already ends on the final frame — do not paint a duplicate
    options.onProgress?.(0.97, "encoding");
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    capture.getTracks().forEach((t) => t.stop());
  }

  let stopTimer: number | undefined;
  try {
    await Promise.race([
      stopped,
      new Promise<void>((_resolve, reject) => {
        stopTimer = window.setTimeout(() => reject(new Error("Video encoding took too long. Try again in a supported browser.")), 30000);
      }),
    ]);
  } finally {
    if (stopTimer !== undefined) window.clearTimeout(stopTimer);
  }
  const blob = new Blob(chunks, { type: mimeType });
  if (!blob.size) throw new Error("Recording produced an empty file — try again.");
  options.onProgress?.(1, "encoding");
  return { blob, mimeType, frames, durationMs, thumbnailCanvas: finished };
}

export const reelFileName = (headline: string, stamp = new Date()) => {
  // `slugify` folds accents and falls back to a stable fingerprint for Tamil or
  // Hindi headlines, which used to slug to "" and lose the reel's only name.
  const slug = slugify(headline).slice(0, 40) || "astrosivam-reel";
  const date = stamp.toISOString().slice(0, 10);
  const ext = pickMimeType()?.includes("mp4") ? "mp4" : "webm";
  return `${slug}-1080x1920-${date}.${ext}`;
};
