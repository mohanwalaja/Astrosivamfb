import { renderPoster, type PosterOptions } from "./poster";
import { slugify } from "./export";

/**
 * 15-second Reels / Story clip, built from the poster the user already made.
 *
 * There is no second drawing engine here. The poster is rendered twice through
 * `renderPoster` — once with `reveal: 0` (background, art, logo, nothing else)
 * and once complete — and every video frame is those two images composited
 * with a camera move, a glow pulse and a text reveal. That keeps the reel
 * pixel-identical to the PNG, including the style art and the Indic shaping.
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

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** 0 before `from`, 1 after `to`, eased between. */
const windowed = (t: number, from: number, to: number) => easeOutCubic(clamp01((t - from) / (to - from)));

/**
 * One animation frame — but never wait forever. A hidden tab stops firing
 * rAF entirely, and a recorder that waits on it would hang instead of failing.
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

/**
 * One frame of the reel, as a pure function of `t` (0–1). Kept out of the
 * recorder so it can be rendered and inspected without a MediaRecorder.
 */
export function paintReelFrame({
  ctx,
  plate,
  full,
  t,
  bg,
}: {
  ctx: CanvasRenderingContext2D;
  plate: CanvasImageSource;
  full: CanvasImageSource;
  t: number;
  bg: string;
}): void {
  const { width: W, height: H } = REEL_SIZE;
  const zoom = 1 + 0.07 * easeInOut(t);
  const drift = (t - 0.5) * H * 0.012;
  const reveal = windowed(t, 0.16, 0.62);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ---- camera: slow push-in with a touch of drift ----
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2 + drift);
  ctx.drawImage(plate, 0, 0, W, H);
  // Drawing the finished poster over its own plate at alpha = reveal is exactly
  // "the type fades in": where the two match, alpha compositing is a no-op.
  if (reveal > 0) {
    ctx.globalAlpha = reveal;
    ctx.drawImage(full, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ---- glow pulse over the art ----
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 3.2);
  const glow = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, W * 0.72);
  glow.addColorStop(0, `rgba(255, 198, 96, ${0.05 + pulse * 0.07})`);
  glow.addColorStop(0.55, `rgba(255, 176, 64, ${0.02 + pulse * 0.03})`);
  glow.addColorStop(1, "rgba(255, 160, 48, 0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // ---- vignette, so the push-in has an edge to fall against ----
  const vignette = ctx.createRadialGradient(W / 2, H * 0.46, W * 0.28, W / 2, H * 0.46, W * 0.92);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ---- open on a short fade from the poster's own ground colour ----
  // No fade-out: the clip has to end on the finished card, ready to be looped
  // or paused on. Ending on a black frame loses the last thing the viewer sees.
  const fadeIn = 1 - clamp01(t / 0.05);
  if (fadeIn > 0) {
    ctx.globalAlpha = fadeIn;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
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

  // Two renders of the same poster: the plate without type, and the finished card.
  const plate = await renderPoster({ ...options.poster, width: W, height: H, reveal: 0 });
  const full = await renderPoster({ ...options.poster, width: W, height: H, reveal: 1 });
  options.onProgress?.(0.04, "rendering");

  // The frame's own background colour, sampled from the plate — used for the fades.
  let bg = "#0b0f1a";
  try {
    const probe = plate.getContext("2d");
    const pixel = probe?.getImageData(2, 2, 1, 1).data;
    if (pixel) bg = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  } catch {
    /* tainted or unavailable — the default is close enough */
  }

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not open a 2D context for the video canvas.");
  ctx.imageSmoothingQuality = "high";

  const drawFrame = (t: number) => paintReelFrame({ ctx, plate, full, t, bg });

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
  options.onProgress?.(0.05, "recording");

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
      drawFrame(t);
      if (manual) track.requestFrame();
      frames += 1;
      if (frame % 5 === 0) options.onProgress?.(0.05 + 0.9 * t, "recording");
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
  return { blob, mimeType, frames, durationMs, thumbnailCanvas: full };
}

export const reelFileName = (headline: string, stamp = new Date()) => {
  // `slugify` folds accents and falls back to a stable fingerprint for Tamil or
  // Hindi headlines, which used to slug to "" and lose the reel's only name.
  const slug = slugify(headline).slice(0, 40) || "astrosivam-reel";
  const date = stamp.toISOString().slice(0, 10);
  const ext = pickMimeType()?.includes("mp4") ? "mp4" : "webm";
  return `${slug}-1080x1920-${date}.${ext}`;
};
