/**
 * Animated poster export (Reels / Story clip).
 *
 * This is not a camera move over a finished picture. The clip is the design
 * system itself, re-painted once per frame at 1080 × 1920 with a motion state
 * taken from the chosen preset (see `src/design/timeline.ts`). Every track —
 * ground, illustration build-up, headline wipe, body stagger, CTA, lockup,
 * gold sweep, parallax — is evaluated independently, so the motion is authored
 * rather than applied as an after-the-fact effect.
 *
 * Because each frame goes through the same `renderDesign` path as the PNG, the
 * video cannot drift from the still.
 */

import { paintDesign, renderDesign } from "../design/render";
import { renderPoster, designForPoster, type PosterOptions } from "./poster";
import { resolveMotion } from "../design/timeline";
import { englishOnly } from "../design/type";
import { slugify } from "./export";

export type PosterSource = Omit<PosterOptions, "scale" | "reveal">;

export interface ReelOptions {
  poster: PosterSource;
  /** Preset key from `src/design/timeline.ts`; overrides the design's own. */
  motionPreset?: string;
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
export const REEL_SECONDS = 8;
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
 * One animation frame — but never wait forever. A hidden tab stops firing rAF
 * entirely, and a recorder that waits on it would hang instead of failing.
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

export async function recordReel(options: ReelOptions): Promise<ReelResult> {
  const support = reelSupport();
  if (!support.ok) throw new Error(support.reason ?? "Video export is unavailable.");

  const { width: W, height: H } = REEL_SIZE;
  options.onProgress?.(0, "rendering");

  // Two renders: the finished card (for the thumbnail + the ground colour), and
  // the design spec the per-frame painter re-uses.
  const full = await renderPoster({ ...options.poster, width: W, height: H, reveal: 1 });
  const spec = designForPoster({ ...options.poster, width: W, height: H });
  const preset = resolveMotion(options.motionPreset ?? spec.motion);
  const seconds = options.seconds ?? preset.seconds;
  const fps = options.fps ?? REEL_FPS;
  const durationMs = seconds * 1000;
  const totalFrames = Math.max(2, Math.round(seconds * fps));

  // The brief's copy, normalised for the per-frame renderer.
  const copy = {
    kicker: englishOnly(options.poster.kicker ?? ""),
    headline: englishOnly(options.poster.headline ?? ""),
    subline: englishOnly(options.poster.subline ?? ""),
    cta: englishOnly(options.poster.cta ?? ""),
    footer: englishOnly(options.poster.footer ?? "") || englishOnly(options.poster.cta ?? ""),
  };

  // The frame's own background colour, sampled from the finished card.
  let bg = "#0b0f1a";
  try {
    const probe = full.getContext("2d");
    const pixel = probe?.getImageData(2, 2, 1, 1).data;
    if (pixel) bg = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  } catch {
    /* tainted or unavailable — the default is close enough */
  }
  options.onProgress?.(0.05, "rendering");

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not open a 2D context for the video canvas.");
  ctx.imageSmoothingQuality = "high";

  // Reused canvas: repainting into one node avoids allocating 240 canvases.
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = W;
  frameCanvas.height = H;
  const frameCtx = frameCanvas.getContext("2d");
  if (!frameCtx) throw new Error("Could not open a 2D context for the frame canvas.");

  const drawFrame = (t: number) => {
    const motion = preset.state(Math.max(0, Math.min(1, t)));
    // Ground wipe: paint the poster into the frame canvas, then composite it
    // over the resolved background so the first frame is never transparent.
    frameCtx.setTransform(1, 0, 0, 1, 0, 0);
    frameCtx.clearRect(0, 0, W, H);
    paintDesignInto(frameCtx, spec, copy, W, H, motion, preset.key);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(frameCanvas, 0, 0);
  };

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
  void stopped.catch(() => undefined);

  const startedAt = performance.now();
  recorder.start(250);
  options.onProgress?.(0.08, "recording");

  let frames = 0;
  const hiddenMessage = "Recording paused — keep this tab visible until it finishes.";
  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      if (options.signal?.aborted) throw new Error("Recording cancelled.");
      const target = startedAt + (frame / fps) * 1000;
      let waits = 0;
      while (performance.now() < target) {
        await nextFrame();
        if (document.hidden) throw new Error(hiddenMessage);
        waits += 1;
        if (waits > fps * 30) throw new Error(hiddenMessage);
      }
      drawFrame(frame / Math.max(1, totalFrames - 1));
      if (manual) track.requestFrame();
      frames += 1;
      if (frame % 4 === 0) options.onProgress?.(0.08 + 0.87 * (frame / totalFrames), "recording");
    }
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
  return { blob, mimeType, frames, durationMs, thumbnailCanvas: full };
}

/** Paint one design frame into an existing context. */
function paintDesignInto(
  ctx: CanvasRenderingContext2D,
  spec: ReturnType<typeof designForPoster>,
  copy: { kicker: string; headline: string; subline: string; cta: string; footer: string },
  W: number,
  H: number,
  motion: ReturnType<ReturnType<typeof resolveMotion>["state"]>,
  presetKey: string,
) {
  paintDesign(ctx, {
    spec,
    copy,
    width: W,
    height: H,
    scale: 1,
    showLogo: true,
    motion,
  });
  void presetKey;
}

export const reelFileName = (headline: string, stamp = new Date()) => {
  // `slugify` folds accents and always returns a usable stem.
  const slug = slugify(englishOnly(headline)).slice(0, 40) || "astrosivam-reel";
  const date = stamp.toISOString().slice(0, 10);
  const ext = pickMimeType()?.includes("mp4") ? "mp4" : "webm";
  return `${slug}-1080x1920-${date}.${ext}`;
};
