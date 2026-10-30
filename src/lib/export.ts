import type { DownloadFile } from "../types";
import { recordExport, type LibraryItem } from "./exportLibrary";

/**
 * A short, deterministic fingerprint for text that has no Latin characters.
 * FNV-1a is used because it is tiny, synchronous and stable across sessions —
 * the same headline always produces the same file name.
 */
function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0").slice(0, 7);
}

/**
 * Safe file-name fragment. Latin text is lower-cased and hyphenated; accents are
 * folded to ASCII. Tamil, Hindi, emoji and punctuation-only input used to slug
 * to `""`, which produced names like `astrosivam_poster__1080x1350.png`; those
 * now fall back to `fallback` and finally to a stable fingerprint of the input,
 * so a name is never empty and never silently repeats another headline's name.
 */
export function slugify(value: string, fallback = ""): string {
  const clean = (input: string) =>
    input
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const slug = clean(value ?? "");
  if (slug) return slug;
  const alt = clean(fallback ?? "");
  if (alt) return alt;
  const trimmed = (value ?? "").trim();
  // Punctuation and whitespace alone are not a name; only real letters or digits
  // (Tamil, Hindi, Latin, any script) earn the fingerprint fallback.
  return trimmed && /[\p{L}\p{N}]/u.test(trimmed) ? `item-${fingerprint(trimmed)}` : "";
}

export const MAX_FILE_STEM = 96;

/**
 * One naming rule for every download, so a pack, a single PNG and a ZIP all
 * read the same way: `astrosivam_<subject>_<format>_<W>x<H>`.
 * Empty fragments are dropped rather than producing `__` runs.
 */
export function exportFileName(parts: Array<string | number | null | undefined>, fallback = "astrosivam"): string {
  const fragments: string[] = [];
  for (const part of parts) {
    if (part === null || part === undefined || part === "") continue;
    const raw = String(part);
    const slug = /^\d+x\d+$/.test(raw) ? raw : slugify(raw);
    if (slug) fragments.push(slug);
  }
  const stem = fragments.join("_").slice(0, MAX_FILE_STEM).replace(/_+$/g, "");
  return stem || slugify(fallback) || "astrosivam";
}

/** `name` (no extension), `ext` (includes the dot) split that never splits a directory. */
function splitExtension(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

/**
 * Guarantee that no two entries in a ZIP share a name. Duplicate names make most
 * extractors silently drop one of the files — the service pack shipped two
 * pairs of IG sizes under the same name before this existed.
 */
export function uniqueFileNames(files: DownloadFile[]): DownloadFile[] {
  // Every original name is reserved first, so a real `a-2.png` keeps its name and
  // only the genuine repeats move.
  const taken = new Set(files.map((file) => file.name.toLowerCase()));
  const counts = new Map<string, number>();
  return files.map((file) => {
    const { base, ext } = splitExtension(file.name);
    const key = file.name.toLowerCase();
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count === 1) return file;
    let attempt = count;
    let candidate = `${base}-${attempt}${ext}`;
    while (taken.has(candidate.toLowerCase())) {
      attempt += 1;
      candidate = `${base}-${attempt}${ext}`;
    }
    taken.add(candidate.toLowerCase());
    return { ...file, name: candidate };
  });
}

/** Object URLs handed to the browser, kept here so a leak is measurable and fixable. */
const pendingObjectUrls = new Set<string>();

export function pendingObjectUrlCount(): number {
  return pendingObjectUrls.size;
}

/** Test seam: how long a download URL stays alive before it is revoked. */
let revokeDelayMs = 4000;

export function setDownloadRevokeDelay(ms: number): void {
  revokeDelayMs = ms;
}

/** Release every URL that is still waiting on its timer (used when the tab unloads). */
export function revokePendingObjectUrls(): void {
  for (const url of pendingObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* already gone */
    }
  }
  pendingObjectUrls.clear();
}

// A backgrounded tab that is closed never runs the revoke timer; release what is
// left when the page is discarded.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("pagehide", revokePendingObjectUrls, { once: true });
}

function downloadBlob(blob: Blob, filename: string) {
  const name = filename.trim() || "astrosivam-export";
  const url = URL.createObjectURL(blob);
  pendingObjectUrls.add(url);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Browsers read the blob after the click resolves; revoking on the next tick
  // cancels the download in Safari, so the URL is released on a timer instead.
  setTimeout(() => {
    if (!pendingObjectUrls.delete(url)) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* already gone */
    }
  }, revokeDelayMs);
}

/**
 * Encode a canvas to PNG. Errors are specific because the common causes need
 * different fixes: an oversized canvas, a tainted canvas, or a browser that ran
 * out of memory for the encode.
 */
/**
 * Save any blob (PNG, ZIP, WebM) through the one download path, so object URLs
 * are tracked and revoked in the same place.
 */
export function saveBlob(blob: Blob, filename: string): void {
  downloadBlob(blob, filename);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!canvas || !canvas.width || !canvas.height) {
      reject(new Error("This image has no pixels to export — render it again."));
      return;
    }
    const fail = (error?: unknown) =>
      reject(
        new Error(
          error instanceof Error
            ? `Could not encode the PNG: ${error.message}`
            : "The browser could not encode this PNG. Try a smaller size, or close other tabs and retry.",
        ),
      );
    try {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) resolve(blob);
        else fail();
      }, "image/png");
    } catch (error) {
      // Tainted or too-large canvases throw synchronously rather than via callback.
      fail(error);
    }
  });
}

export async function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas);
  return new Uint8Array(await blob.arrayBuffer());
}

/** Encode and release in one step, for the loops that render many cards in a row. */
export async function canvasToBytesAndRelease(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const bytes = await canvasToBytes(canvas);
  releaseCanvas(canvas);
  return bytes;
}

/**
 * Release a canvas's pixel buffer as soon as its bytes are captured.
 *
 * A 2000×2100 contact sheet is ~17 MB of RGBA, and a 53-card year pack would
 * otherwise keep every one of those buffers alive until the next GC pass —
 * measured at +292 MB RSS on the year pack before this was added. Setting the
 * dimensions to zero frees the backing store immediately in every browser.
 */
export function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    /* detached or already released */
  }
}

export interface CanvasDownloadOptions {
  formatId?: string;
  caption?: string;
}

/** Download a PNG and quietly add it to the browser's export library when available. */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  options: CanvasDownloadOptions = {},
): Promise<LibraryItem | null> {
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, filename);
  try {
    return await recordExport({
      canvas,
      name: filename,
      formatId: options.formatId ?? `${canvas.width}x${canvas.height}`,
      width: canvas.width,
      height: canvas.height,
      caption: options.caption ?? "",
      blob,
    });
  } catch {
    // A storage/quota issue must never turn a successful file download into an error.
    return null;
  }
}

export function downloadText(text: string, filename: string, type = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([text], { type }), filename);
}

export function downloadZip(files: DownloadFile[], filename: string) {
  downloadBlob(buildZip(files), filename);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/* ---------------------------------- zip ---------------------------------- */

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZip(input: DownloadFile[]): Blob {
  if (input.length === 0) throw new Error("Nothing to zip — the pack came back empty.");
  // Duplicate names make extractors drop files silently; normalise before writing.
  const files = uniqueFileNames(input);
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  files.forEach((file) => {
    const data = new Uint8Array(file.data);
    const name = encoder.encode(file.name);
    const crc = crc32(data);
    const size = data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    parts.push(local, data);
    offset += local.length + size;

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset - local.length - size, true);
    cd.set(name, 46);
    central.push(cd);
  });

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
