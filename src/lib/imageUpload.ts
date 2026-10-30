import { sniffImage } from "./imageValidate";

/**
 * Reads a user-chosen image file and downscales it to a sane canvas texture size.
 * Posters are rendered at 1080–2048 px, so 2400 px on the long edge is plenty
 * and keeps the data URL small enough to keep in component state.
 *
 * The file is checked before it is decoded: the poster studio passes whatever the
 * file picker returned, and a 60 MB RAW file or a renamed text file used to be
 * handed straight to `FileReader`/`Image`, where it either froze the tab or failed
 * with no explanation.
 */
export const UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
/** Long edge the decode is capped at, in pixels. */
export const UPLOAD_MAX_EDGE = 2400;
/** Refuse absurd pixel counts even when the byte size looks small (decompression bombs). */
export const UPLOAD_MAX_PIXELS = 60_000_000;

export const UPLOAD_KINDS = ["jpeg", "png", "webp", "gif", "avif", "heic", "bmp", "tiff"] as const;

export interface UploadCheck {
  ok: boolean;
  reason?: string;
  kind: string;
}

/** Magic-byte check on the first 4 KB. Camera renames and unknown types are caught here. */
export async function checkUploadFile(file: File): Promise<UploadCheck> {
  if (!file) return { ok: false, kind: "unknown", reason: "No file was chosen." };
  if (!file.size) return { ok: false, kind: "unknown", reason: "That file is empty." };
  if (file.size > UPLOAD_MAX_BYTES) {
    const mb = (UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0);
    return {
      ok: false,
      kind: "unknown",
      reason: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${mb} MB — resize it first.`,
    };
  }
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const info = sniffImage(head);
  if (info.kind === "unknown" || !(UPLOAD_KINDS as readonly string[]).includes(info.kind)) {
    return {
      ok: false,
      kind: info.kind,
      reason: "That is not an image this browser can open. Use JPEG, PNG, WebP, AVIF or HEIC.",
    };
  }
  return { ok: true, kind: info.kind };
}

export async function fileToImageSource(file: File, maxEdge = UPLOAD_MAX_EDGE): Promise<string> {
  const check = await checkUploadFile(file);
  if (!check.ok) throw new Error(check.reason ?? "That file cannot be used.");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file — it may have moved or been changed on disk."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That file is not a readable image, even though its name says it is."));
    image.src = dataUrl;
  });

  const pixels = img.width * img.height;
  const release = () => {
    // Drop the decoded bitmap now; a 60 MP phone photo otherwise stays resident.
    img.src = "data:,";
    (img as HTMLImageElement & { close?: () => void }).close?.();
  };

  try {
    if (!img.width || !img.height) throw new Error("That image has no width or height — it may be damaged.");
    if (pixels > UPLOAD_MAX_PIXELS) {
      throw new Error("That image has too many pixels to open safely. Export it smaller and try again.");
    }
    const longest = Math.max(img.width, img.height);
    if (longest <= maxEdge) return dataUrl;

    const scale = maxEdge / longest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    release();
  }
}
