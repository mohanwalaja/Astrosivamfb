/**
 * Image validation for publishing.
 *
 * The browser and the PHP backend must agree on what is acceptable, and both
 * must read the bytes rather than trust the file extension — a `.jpg` that is
 * really a WebP is the single most common upload failure against the Graph API.
 * Everything here is pure (no DOM) so it can be unit tested in Node and reused
 * by the PHP side through the same documented rules.
 */

export type ImageKind = "jpeg" | "png" | "webp" | "gif" | "avif" | "heic" | "bmp" | "tiff" | "unknown";
export type Platform = "facebook" | "instagram";

export interface ImageKindInfo {
  kind: ImageKind;
  mime: string;
  extension: string;
  /** What the browser must convert the file to before it is uploaded. */
  transport: "passthrough" | "convert";
}

const KINDS: Record<Exclude<ImageKind, "unknown">, ImageKindInfo> = {
  jpeg: { kind: "jpeg", mime: "image/jpeg", extension: "jpg", transport: "passthrough" },
  png: { kind: "png", mime: "image/png", extension: "png", transport: "passthrough" },
  webp: { kind: "webp", mime: "image/webp", extension: "webp", transport: "convert" },
  gif: { kind: "gif", mime: "image/gif", extension: "gif", transport: "convert" },
  avif: { kind: "avif", mime: "image/avif", extension: "avif", transport: "convert" },
  heic: { kind: "heic", mime: "image/heic", extension: "heic", transport: "convert" },
  bmp: { kind: "bmp", mime: "image/bmp", extension: "bmp", transport: "convert" },
  tiff: { kind: "tiff", mime: "image/tiff", extension: "tiff", transport: "convert" },
};

const starts = (bytes: Uint8Array, pattern: number[], offset = 0) =>
  pattern.every((value, index) => bytes[offset + index] === value);

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...Array.from(bytes.slice(offset, offset + length)));

/**
 * Identify an image from its magic bytes. Returns `unknown` for anything the
 * pipeline cannot describe, which the caller must treat as a hard failure.
 */
export function sniffImage(bytes: Uint8Array): ImageKindInfo {
  if (bytes.length >= 3 && starts(bytes, [0xff, 0xd8, 0xff])) return KINDS.jpeg;
  if (bytes.length >= 8 && starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return KINDS.png;
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return KINDS.webp;
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) return KINDS.gif;
  if (bytes.length >= 12 && starts(bytes, [0x42, 0x4d])) return KINDS.bmp;
  if (bytes.length >= 4 && (starts(bytes, [0x49, 0x49, 0x2a, 0x00]) || starts(bytes, [0x4d, 0x4d, 0x00, 0x2a]))) {
    return KINDS.tiff;
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (brand === "avif" || brand === "avis") return KINDS.avif;
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return KINDS.heic;
  }
  return { kind: "unknown", mime: "application/octet-stream", extension: "bin", transport: "convert" };
}

/** What the Graph API accepts directly, per platform. */
export const PLATFORM_RULES: Record<
  Platform,
  {
    label: string;
    native: ReadonlyArray<ImageKind>;
    /** Instagram accepts JPEG only; the browser converts before upload. */
    requiresJpeg: boolean;
    minWidth: number;
    maxWidth: number;
    minAspect: number;
    maxAspect: number;
    maxBytes: number;
    captionLimit: number;
    hashtagLimit: number;
  }
> = {
  facebook: {
    label: "Facebook Page",
    native: ["jpeg", "png", "gif", "bmp", "tiff", "webp"],
    requiresJpeg: false,
    minWidth: 200,
    maxWidth: 8192,
    minAspect: 0.5,
    maxAspect: 5.5,
    maxBytes: 8 * 1024 * 1024,
    captionLimit: 5000,
    hashtagLimit: 30,
  },
  instagram: {
    label: "Instagram",
    native: ["jpeg"],
    requiresJpeg: true,
    minWidth: 320,
    maxWidth: 1440,
    minAspect: 0.8,
    maxAspect: 1.91,
    maxBytes: 8 * 1024 * 1024,
    captionLimit: 2200,
    hashtagLimit: 30,
  },
};

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  /** What the person should actually do about it. */
  fix?: string;
}

export interface ImageMeta {
  kind: ImageKind;
  mime: string;
  extension: string;
  width: number;
  height: number;
  aspect: number;
  bytes: number;
}

export interface ImageValidation {
  ok: boolean;
  meta: ImageMeta | null;
  /** JPEG/PNG can go straight to Meta; everything else is converted first. */
  needsConversion: boolean;
  /** Final MIME the Graph API will receive. */
  uploadMime: "image/jpeg" | "image/png" | null;
  /** Downscale target for Instagram, which caps width at 1440 px. */
  targetWidth: number | null;
  issues: ValidationIssue[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Validate bytes for the given platforms. Callers get every issue at once so the
 * UI can explain all the problems in one pass instead of one per attempt.
 */
export function validateImage(
  bytes: Uint8Array,
  dimensions: { width: number; height: number } | null,
  platforms: Platform[],
): ImageValidation {
  const info = sniffImage(bytes);
  const issues: ValidationIssue[] = [];
  const targets = platforms.length ? platforms : (["facebook"] as Platform[]);

  if (info.kind === "unknown") {
    issues.push({
      code: "format-unknown",
      severity: "error",
      message: "This file is not a recognised image.",
      fix: "Use a JPEG or PNG. WebP, HEIC, GIF and BMP are converted automatically once identified.",
    });
    return { ok: false, meta: null, needsConversion: false, uploadMime: null, targetWidth: null, issues };
  }

  if (!dimensions || !dimensions.width || !dimensions.height) {
    issues.push({
      code: "dimensions-unreadable",
      severity: "error",
      message: "The image dimensions could not be read.",
      fix: "Re-export the image from Photos, Preview or Canva and try again.",
    });
    return { ok: false, meta: null, needsConversion: info.transport === "convert", uploadMime: null, targetWidth: null, issues };
  }

  const { width, height } = dimensions;
  const aspect = width / height;
  const meta: ImageMeta = {
    kind: info.kind,
    mime: info.mime,
    extension: info.extension,
    width,
    height,
    aspect: round2(aspect),
    bytes: bytes.length,
  };

  for (const platform of targets) {
    const rules = PLATFORM_RULES[platform];
    if (!rules.native.includes(info.kind) && !rules.requiresJpeg) {
      issues.push({
        code: `format-${platform}`,
        severity: "error",
        message: `${rules.label} does not accept ${info.kind.toUpperCase()} uploads from this app.`,
        fix: "Convert the file to JPEG or PNG.",
      });
    }
    if (width < rules.minWidth) {
      issues.push({
        code: `width-${platform}`,
        severity: "error",
        message: `${rules.label} needs at least ${rules.minWidth} px wide — this image is ${width} px.`,
        fix: "Use a larger export, not an upscaled one.",
      });
    }
    if (platform === "instagram" && width > rules.maxWidth) {
      issues.push({
        code: "width-instagram-large",
        severity: "warning",
        message: `${width} px is wider than Instagram's 1440 px cap.`,
        fix: "The image is downscaled to 1440 px before upload.",
      });
    }
    if (aspect < rules.minAspect || aspect > rules.maxAspect) {
      issues.push({
        code: `aspect-${platform}`,
        severity: "error",
        message: `${rules.label} accepts ${rules.minAspect}:1 to ${rules.maxAspect}:1 — this image is ${round2(aspect)}:1.`,
        fix:
          platform === "instagram"
            ? "Crop to 4:5 (portrait) or 1.91:1 (landscape) before posting."
            : "Crop to a feed shape; extreme panoramas are cropped by Facebook anyway.",
      });
    }
    if (bytes.length > rules.maxBytes) {
      issues.push({
        code: `size-${platform}`,
        severity: "error",
        message: `${(bytes.length / 1024 / 1024).toFixed(1)} MB is over the ${rules.maxBytes / 1024 / 1024} MB limit.`,
        fix: "Re-export at a lower quality; 1080 px wide is plenty for a feed post.",
      });
    }
  }

  const hasError = issues.some((issue) => issue.severity === "error");
  const uploadMime: ImageValidation["uploadMime"] = targets.includes("instagram")
    ? "image/jpeg"
    : info.kind === "png"
      ? "image/png"
      : "image/jpeg";
  const targetWidth = targets.includes("instagram") && width > PLATFORM_RULES.instagram.maxWidth ? 1440 : null;

  return {
    ok: !hasError,
    meta,
    needsConversion: info.transport === "convert" || uploadMime === "image/jpeg" && info.kind !== "jpeg",
    uploadMime,
    targetWidth,
    issues,
  };
}

/* --------------------------------- text ---------------------------------- */

export interface TextValidation {
  ok: boolean;
  issues: ValidationIssue[];
  /** Characters visible before "See more" on the FB feed / IG truncation. */
  hookLength: number;
  hashtagCount: number;
  hashtagLimit: number;
}

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

export const captionLimit = (platforms: Platform[]) =>
  Math.min(...(platforms.length ? platforms : (["facebook"] as Platform[])).map((p) => PLATFORM_RULES[p].captionLimit));

/**
 * Caption rules that actually cause failures or silent reach loss: over-length
 * captions are rejected by the API, and a hook longer than the feed's "See
 * more" cut buries the call to action.
 */
export function validateCaption(text: string, platforms: Platform[]): TextValidation {
  const targets = platforms.length ? platforms : (["facebook"] as Platform[]);
  const issues: ValidationIssue[] = [];
  const limit = captionLimit(targets);
  const characters = Array.from(text).length;
  const firstLine = (text.split(/\n/)[0] ?? "").trim();
  const hashtags = text.match(HASHTAG) ?? [];

  if (!characters) {
    issues.push({
      code: "caption-empty",
      severity: "warning",
      message: "No caption yet.",
      fix: "Add a first line that states the service and the offer.",
    });
  }
  if (characters > limit) {
    issues.push({
      code: "caption-length",
      severity: "error",
      message: `${characters} characters — the limit is ${limit} for ${targets.map((p) => PLATFORM_RULES[p].label).join(" + ")}.`,
      fix: "Move the detail into the image or trim to the first 125 characters.",
    });
  }
  if (firstLine.length > 125) {
    issues.push({
      code: "caption-hook",
      severity: "warning",
      message: `The first line is ${firstLine.length} characters; the feed cuts it at about 125.`,
      fix: "Put the service and the price in the first 125 characters.",
    });
  }
  const tagLimit = Math.min(...targets.map((p) => PLATFORM_RULES[p].hashtagLimit));
  if (hashtags.length > tagLimit) {
    issues.push({
      code: "hashtag-count",
      severity: "warning",
      message: `${hashtags.length} hashtags — Meta recommends 3–5 and caps the platform at ${tagLimit}.`,
      fix: "Keep the 3–5 that describe the service and the city.",
    });
  }
  if (/\b(guarantee|guaranteed|100% accurate|will cure|destiny will)\b/i.test(text)) {
    issues.push({
      code: "caption-policy",
      severity: "warning",
      message: "This wording may breach Meta's advertising policy on guaranteed outcomes.",
      fix: "Describe the method and what is delivered instead of promising a result.",
    });
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
    hookLength: firstLine.length,
    hashtagCount: hashtags.length,
    hashtagLimit: tagLimit,
  };
}

/* ------------------------------ DOM helpers ------------------------------- */

/** Read the leading bytes of a Blob — enough for every magic number above. */
export async function readHeader(blob: Blob, length = 32): Promise<Uint8Array> {
  const buffer = await blob.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

/** Full byte read, needed for size-accurate validation. */
export async function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/** Decode dimensions through the browser; rejects if the image cannot be read. */
export function readDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };
    image.src = url;
  });
}

/** One-shot validation used by every upload surface in the app. */
export async function validateImageFile(file: File, platforms: Platform[]): Promise<ImageValidation> {
  const bytes = await readBytes(file);
  let dimensions: { width: number; height: number } | null = null;
  try {
    dimensions = await readDimensions(file);
  } catch {
    dimensions = null;
  }
  return validateImage(bytes, dimensions, platforms);
}

/**
 * Prepare a validated file for the Graph API: convert to JPEG when required and
 * cap the width. Returns the original file untouched when no work is needed.
 */
export async function prepareImage(file: File, validation: ImageValidation): Promise<File> {
  const needsWork = validation.needsConversion || validation.targetWidth !== null;
  if (!needsWork) return file;
  const image = await createImageBitmap(file);
  const targetWidth = validation.targetWidth ?? Math.min(image.width, 2048);
  const scale = targetWidth / image.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the image for upload.");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const mime = validation.uploadMime ?? "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, mime === "image/jpeg" ? 0.92 : undefined),
  );
  if (!blob) throw new Error("Could not convert the image for upload.");
  const extension = mime === "image/png" ? "png" : "jpg";
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "post"}.${extension}`, { type: mime });
}
