import type { MotifKey, Theme } from "../types";
import { ORNAMENTS } from "./ornaments";
import { breakWord, wrapAll } from "./typeset";
import { foilGradient } from "./premium";

/**
 * Font stacks, with the Indic faces in the fallback position rather than
 * assumed absent. Cinzel and Marcellus carry no Tamil or Devanagari at all;
 * without a hosted family behind them the browser silently substitutes a system
 * face (different metrics, different shaping) while Node's Skia renderer draws
 * .notdef boxes. Both are fixed by naming the family the studio actually ships.
 *
 * "Noto Sans Tamil" is deliberately absent: it is not self-hosted, so naming it
 * only ever resolves to a system font on the visitor's machine.
 */
/*
 * Each script family is named twice — "Tiro Tamil" for Tamil and "Tiro Tamil
 * Latin" for its Latin/punctuation half. The browser resolves both through the
 * two @font-face unicode-ranges and never sees the second name; the Node sample
 * renderer has to name it explicitly because Skia keeps one face per family,
 * and without it a Tamil sentence loses its full stop to a .notdef box.
 */
export const DISPLAY = (size: number, weight = 700) =>
  `${weight} ${size}px Cinzel, "Baloo Thambi 2", "Baloo Thambi 2 Latin", "Tiro Tamil", "Tiro Tamil Latin", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", Georgia, "Times New Roman", serif`;
export const SERIF = (size: number, weight = 400) =>
  `${weight} ${size}px Marcellus, Cinzel, "Tiro Tamil", "Tiro Tamil Latin", "Baloo Thambi 2", "Baloo Thambi 2 Latin", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", Georgia, serif`;
export const ROUND = (size: number, weight = 500) =>
  `${weight} ${size}px "Baloo Thambi 2", "Baloo Thambi 2 Latin", "Plus Jakarta Sans", "Tiro Tamil", "Tiro Tamil Latin", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", system-ui, sans-serif`;
export const HINDI_DISPLAY = (size: number, weight = 400) =>
  `${weight} ${size}px "Yatra One", "Yatra One Latin", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", "Tiro Tamil", "Tiro Tamil Latin", sans-serif`;
export const SANS = (size: number, weight = 500) =>
  `${weight} ${size}px "Plus Jakarta Sans", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", "Tiro Tamil", "Tiro Tamil Latin", "Baloo Thambi 2", "Baloo Thambi 2 Latin", ui-sans-serif, system-ui, sans-serif`;
export const DEVA = (size: number, weight = 500) =>
  `${weight} ${size}px "Noto Sans Devanagari", "Noto Sans Devanagari Latin", "Plus Jakarta Sans", "Tiro Tamil", "Tiro Tamil Latin", ui-sans-serif, sans-serif`;
export const TAMIL = (size: number, weight = 400) =>
  `${weight} ${size}px "Tiro Tamil", "Tiro Tamil Latin", "Baloo Thambi 2", "Baloo Thambi 2 Latin", "Noto Sans Devanagari", serif`;
/* Poster curated set. Each stack ends in the Indic faces so a mixed line never drops to .notdef. */
export const CORMORANT = (size: number, weight = 600) =>
  `${weight} ${size}px "Cormorant Garamond", "Noto Serif Tamil", "Noto Serif Tamil Latin", "Noto Serif Devanagari", "Tiro Tamil", "Tiro Tamil Latin", Georgia, serif`;
export const PLAYFAIR = (size: number, weight = 700) =>
  `${weight} ${size}px "Playfair Display", "Noto Serif Tamil", "Noto Serif Tamil Latin", "Noto Serif Devanagari", "Tiro Tamil", "Tiro Tamil Latin", Georgia, serif`;
export const INTER = (size: number, weight = 600) =>
  `${weight} ${size}px "Inter Tight", "Hind Madurai", "Hind Madurai Latin", "Hind", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", ui-sans-serif, system-ui, sans-serif`;
export const SERIF_TAMIL = (size: number, weight = 500) =>
  `${weight} ${size}px "Noto Serif Tamil", "Noto Serif Tamil Latin", "Tiro Tamil", "Tiro Tamil Latin", "Noto Serif Devanagari", serif`;
export const SERIF_DEVA = (size: number, weight = 500) =>
  `${weight} ${size}px "Noto Serif Devanagari", "Noto Serif Tamil Latin", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", serif`;
export const SANS_TAMIL = (size: number, weight = 500) =>
  `${weight} ${size}px "Hind Madurai", "Hind Madurai Latin", "Baloo Thambi 2", "Baloo Thambi 2 Latin", "Hind", sans-serif`;
export const SANS_DEVA = (size: number, weight = 500) =>
  `${weight} ${size}px "Hind", "Hind Madurai Latin", "Noto Sans Devanagari", "Noto Sans Devanagari Latin", sans-serif`;
let fontsPromise: Promise<void> | null = null;

/**
 * Characters in the two script ranges the studio sets in their own faces.
 * Exported so every engine agrees on what counts as "Indic" — a string with a
 * single Tamil letter in it must not be letter-spaced, and must be measured in
 * the Tamil face.
 */
export const INDIC_TEXT = /[\u0900-\u097F\u0B80-\u0BFF]/;

/** Every family the canvas engine draws with. Used to verify the faces really loaded. */
export const BRAND_FONTS = [
  "Cinzel",
  "Marcellus",
  "Plus Jakarta Sans",
  "Baloo Thambi 2",
  "Tiro Tamil",
  "Noto Sans Devanagari",
  "Yatra One",
  "Cormorant Garamond",
  "Playfair Display",
  "Inter Tight",
  "Noto Serif Tamil",
  "Noto Serif Devanagari",
  "Hind Madurai",
  "Hind",
] as const;

/**
 * Families whose faces are not usable. Checked from the live FontFaceSet rather
 * than `document.fonts.check()` — that returns true for an unknown family, which
 * is exactly the case we need to catch.
 */
export function fontHealth(): { ok: boolean; missing: string[] } {
  if (typeof document === "undefined" || !document.fonts || typeof document.fonts.forEach !== "function") {
    return { ok: true, missing: [] };
  }
  const normalize = (family: string) => family.replace(/["']/g, "").trim().replace(/\s+/g, " ").toLowerCase();
  const loaded = new Set<string>();
  document.fonts.forEach((face) => {
    if (face.status === "loaded") loaded.add(normalize(face.family));
  });
  // A family can have several faces (one per unicode-range); one loaded face is enough.
  const missing = (BRAND_FONTS as readonly string[]).filter((family) => !loaded.has(normalize(family)));
  return { ok: missing.length === 0, missing };
}

export function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts || typeof document.fonts.load !== "function") {
    return Promise.resolve();
  }
  if (!fontsPromise) {
    // pass sample text per script: with unicode-range splitting, loading with the
    // default "BESbswy" probe only pulls the Latin faces, never Tamil or Devanagari
    // One probe per family *and weight and script*. `document.fonts.load` only
    // fetches faces whose unicode-range matches the sample text, so a probe of
    // Latin alone never downloads the Tamil or Devanagari subsets — and a probe
    // at one weight never downloads the others. Measuring before these resolve
    // produces a layout that is silently a few per cent wrong, which is how a
    // headline ends up over its safe area only in export.
    const probes: Array<[string, string]> = [];
    for (const weight of [500, 600, 700, 800]) probes.push([DISPLAY(64, weight), "ASTRO SIVAM"]);
    probes.push([SERIF(48, 400), "Astro Sivam"]);
    for (const weight of [400, 500, 600, 700]) probes.push([SANS(28, weight), "Your life, mapped"]);
    for (const weight of [500, 600]) {
      // Baloo Thambi 2 is split Latin/Tamil, so both ranges need their own probe.
      probes.push([ROUND(40, weight), "Astro Sivam"]);
      probes.push([ROUND(40, weight), "தமிழ் வாழ்த்துக்கள்"]);
    }
    probes.push([TAMIL(32, 400), "தமிழ் வாழ்த்துக்கள்"]);
    probes.push([TAMIL(32, 400), "Astro Sivam"]);
    for (const weight of [400, 500, 600]) probes.push([DEVA(28, weight), "आपका जीवन"]);
    probes.push([HINDI_DISPLAY(40), "हार्दिक शुभकामनाएँ"]);
    for (const weight of [600, 700]) {
      probes.push([CORMORANT(64, weight), "Astro Sivam"]);
      probes.push([PLAYFAIR(64, weight), "Astro Sivam"]);
    }
    for (const weight of [500, 600, 700]) probes.push([INTER(40, weight), "Astro Sivam"]);
    for (const weight of [500, 700]) {
      probes.push([SERIF_TAMIL(32, weight), "தமிழ் வாழ்த்துக்கள்"]);
      probes.push([SERIF_DEVA(32, weight), "आपका जीवन"]);
      probes.push([SANS_TAMIL(32, weight), "தமிழ் வாழ்த்துக்கள்"]);
      probes.push([SANS_DEVA(32, weight), "आपका जीवन"]);
    }
    probes.push([SERIF_TAMIL(32, 500), "Astro Sivam"]);
    probes.push([SANS_TAMIL(32, 500), "Astro Sivam"]);
    probes.push([HINDI_DISPLAY(40), "Astro Sivam"]);
    const loads = probes.map(([font, sample]) => document.fonts.load(font, sample));
    let timeoutId: number | undefined;
    const timeout = new Promise<void>((resolve) => {
      // Shared hosting and mobile networks can take longer than a few seconds to
      // deliver the full set of script subsets. Keep exports bounded, but avoid
      // declaring healthy self-hosted fonts missing after a short 4-second race.
      timeoutId = window.setTimeout(resolve, 10_000);
    });
    // Exports must remain usable if a browser stalls a font request. All shipped
    // faces are self-hosted; after ten seconds canvas rendering falls back safely.
    fontsPromise = Promise.race([Promise.allSettled(loads).then(() => undefined), timeout])
      .catch(() => undefined)
      .finally(() => {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      });
  }
  return fontsPromise;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Loads and caches any same-origin image or data URL. Used by the poster + festival engines. */
export function loadImageSource(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      img.onload = null;
      img.onerror = null;
      if (error) reject(error);
      else resolve(img);
    };
    const timeout = window.setTimeout(() => finish(new Error(`Image timed out: ${src}`)), 12000);
    img.crossOrigin = "anonymous";
    img.onload = () => finish();
    img.onerror = () => finish(new Error(`Image failed: ${src}`));
    img.src = src;
  });
  imageCache.set(src, promise);
  void promise.catch(() => {
    if (imageCache.get(src) === promise) imageCache.delete(src);
  });
  return promise;
}

let logoPromise: Promise<HTMLImageElement> | null = null;

export function loadLogo(): Promise<HTMLImageElement> {
  if (!logoPromise) {
    logoPromise = loadImageSource("/astrosivam_logo.png").catch((error) => {
      logoPromise = null;
      throw error;
    });
  }
  return logoPromise;
}

export function createCanvas(width: number, height: number, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // deity art is 1200 px and an A4 poster draws it ~1560 px wide — ask the browser for
  // its best resampling rather than the default bilinear mush
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

/* ---------------------------------- colour --------------------------------- */

export function withAlpha(hex: string, alpha: number): string {
  const trimmed = hex.trim();
  if (trimmed.startsWith("rgb")) {
    const parts = trimmed.replace(/^rgba?\(|\)$/g, "").split(",");
    return `rgba(${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}, ${alpha})`;
  }
  const clean = trimmed.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function goldGradient(ctx: CanvasRenderingContext2D, theme: Theme, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, theme.goldSoft);
  g.addColorStop(0.45, theme.gold);
  g.addColorStop(0.75, theme.gold);
  g.addColorStop(1, theme.goldSoft);
  return g;
}

export function rand(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/* --------------------------------- backdrop -------------------------------- */

export function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  options: { seed?: number; glowX?: number; glowY?: number; frameInset?: number; stars?: boolean } = {},
) {
  const { seed = 7, glowX = 0.5, glowY = 0.34, frameInset = 26, stars = true } = options;

  const bg = ctx.createLinearGradient(0, 0, W * 0.65, H);
  bg.addColorStop(0, theme.bgFrom);
  bg.addColorStop(0.55, theme.bgTo);
  bg.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glowRadius = Math.max(W, H) * 0.7;
  const glow = ctx.createRadialGradient(W * glowX, H * glowY, 0, W * glowX, H * glowY, glowRadius);
  glow.addColorStop(0, withAlpha(theme.gold, theme.light ? 0.16 : 0.19));
  glow.addColorStop(0.42, withAlpha(theme.gold, theme.light ? 0.06 : 0.07));
  glow.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // secondary cool nebula for depth
  const cool = theme.light ? "#B7A98C" : "#2B3A63";
  const nebula = ctx.createRadialGradient(W * 0.92, H * 0.08, 0, W * 0.92, H * 0.08, W * 0.55);
  nebula.addColorStop(0, withAlpha(cool, theme.light ? 0.14 : 0.24));
  nebula.addColorStop(1, withAlpha(cool, 0));
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  const nebula2 = ctx.createRadialGradient(W * 0.06, H * 0.95, 0, W * 0.06, H * 0.95, W * 0.45);
  nebula2.addColorStop(0, withAlpha(theme.gold, theme.light ? 0.12 : 0.1));
  nebula2.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, W, H);

  if (stars) drawStarfield(ctx, W, H, theme, seed);

  drawFrame(ctx, W, H, theme, frameInset);
}

export function drawStarfield(ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme, seed = 7) {
  const rng = rand(seed);
  const count = Math.round((W * H) / 8200);
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const x = rng() * W;
    const y = rng() * H;
    const r = rng() < 0.88 ? rng() * 1.5 + 0.4 : rng() * 2.6 + 1.2;
    const a = rng() * (theme.light ? 0.22 : 0.55) + 0.06;
    ctx.fillStyle = withAlpha(theme.light ? "#3A2E1A" : theme.goldSoft, a);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // a few larger four-point sparkles
  for (let i = 0; i < 8; i += 1) {
    const x = rng() * W;
    const y = rng() * H;
    const s = 4 + rng() * 7;
    ctx.strokeStyle = withAlpha(theme.gold, theme.light ? 0.3 : 0.45);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme, inset = 26) {
  ctx.save();
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 0.5, inset + 0.5, W - inset * 2 - 1, H - inset * 2 - 1);
  ctx.strokeStyle = withAlpha(theme.gold, 0.34);
  ctx.lineWidth = 0.8;
  ctx.strokeRect(inset + 7.5, inset + 7.5, W - (inset + 7) * 2 - 1, H - (inset + 7) * 2 - 1);

  // corner ticks
  const tick = 22;
  ctx.strokeStyle = withAlpha(theme.gold, 0.7);
  ctx.lineWidth = 1.4;
  const corners: Array<[number, number, number, number]> = [
    [inset + 7, inset + 7, 1, 1],
    [W - inset - 7, inset + 7, -1, 1],
    [inset + 7, H - inset - 7, 1, -1],
    [W - inset - 7, H - inset - 7, -1, -1],
  ];
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * tick);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * tick, y);
    ctx.stroke();
  });
  ctx.restore();
}

export function drawOrbit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  color: string,
  lineWidth = 1,
  dashed = false,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (dashed) ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  alpha = 1,
) {
  const ratio = img.width / img.height || 1;
  const w = ratio >= 1 ? size : size * ratio;
  const h = ratio >= 1 ? size / ratio : size;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

export function drawWordmark(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  tracking: number,
  align: CanvasTextAlign = "left",
) {
  ctx.save();
  ctx.font = DISPLAY(size, 700);
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  drawTracked(ctx, text, x, y, tracking, align);
  ctx.restore();
}

export function setTracking(ctx: CanvasRenderingContext2D, value: number) {
  const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in ctxAny) ctxAny.letterSpacing = `${value}px`;
}

export function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: CanvasTextAlign = "left",
) {
  // Letter-spacing belongs to Latin display type. Tamil and Devanagari are
  // shaped: drawing them one glyph at a time (which tracking requires) splits
  // vowel signs off their consonants and pulls ligatures apart. Every caller
  // that passes a user-editable string therefore gets its tracking ignored
  // rather than a shattered word, and the string is drawn in one call so the
  // shaper can see the whole cluster.
  if (INDIC_TEXT.test(text)) {
    const prev = ctx.textAlign;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.textAlign = prev;
    return ctx.measureText(text).width;
  }
  if (!tracking) {
    const prev = ctx.textAlign;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.textAlign = prev;
    return 0;
  }
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + tracking * Math.max(0, chars.length - 1);
  let cursor = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += widths[index] + tracking;
  });
  ctx.textAlign = prevAlign;
  return total;
}

/* ----------------------------------- curved & vertical text ---------------------------------- */

/**
 * Draw text along a circular arc. radius in px, startAngle in radians (0 = 3 o'clock),
 * sweep in radians (positive = clockwise). align: "center" | "left" | "right" relative to arc.
 */
export function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  sweep: number,
  options: {
    size?: number;
    font?: (size: number, weight?: number) => string;
    align?: "center" | "left" | "right";
    flip?: boolean;
  } = {},
): void {
  const {
    size = 32,
    font = DISPLAY,
    align = "center",
    flip = false,
  } = options;
  const chars = Array.from(text);
  const dir = flip ? -1 : 1;
  const totalAngle = dir * sweep;
  const totalArc = Math.abs(totalAngle);
  const charAngle = totalArc / Math.max(1, chars.length - 1);
  let angle = startAngle;
  if (align === "center") angle -= totalArc / 2;
  else if (align === "right") angle -= totalArc;
  ctx.save();
  ctx.font = font(size, 700);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  chars.forEach((char, i) => {
    const a = angle + i * charAngle * dir;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    const rot = flip ? a + Math.PI : a + Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

/**
 * Draw text vertically (bottom-to-top or top-to-bottom).
 * orient: "up" (rotates 90° CCW, reads bottom-to-top) | "down" (rotates 90° CW, reads top-to-bottom).
 */
export function drawVerticalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    font?: (size: number, weight?: number) => string;
    orient?: "up" | "down";
    align?: CanvasTextAlign | "top" | "bottom";
  } = {},
): void {
  const {
    size = 32,
    font = DISPLAY,
    orient = "up",
    align = "center",
  } = options;
  const chars = Array.from(text);
  ctx.save();
  ctx.font = font(size, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = size * 1.2;
  const total = chars.length * lineHeight;
  const start =
    align === "center" ? y - total / 2 : align === "top" ? y : y - total;
  chars.forEach((char, i) => {
    const yy = start + i * lineHeight + lineHeight / 2;
    ctx.save();
    ctx.translate(x, yy);
    ctx.rotate(orient === "up" ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

/* ----------------------------------- text ---------------------------------- */

/* --------------------------- glyph coverage ------------------------------- */

/**
 * Cinzel and Marcellus are Latin display faces with no ₹ glyph, and Skia does not
 * synthesise one — it draws .notdef, which exports as a hollow box next to the
 * price. Width measurement cannot detect this reliably (several real glyphs share
 * the .notdef advance), so we compare rendered pixels against a deliberately
 * unassigned codepoint and cache the answer per font.
 */
const glyphCache = new Map<string, boolean>();

function glyphSample(font: string, char: string): string {
  const size = 40;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.font = font;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.fillText(char, 4, 4);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let hash = "";
  for (let i = 3; i < data.length; i += 4) hash += data[i] > 24 ? "1" : "0";
  return hash;
}

export function hasGlyph(font: string, char: string): boolean {
  const key = `${font}\u0000${char}`;
  const cached = glyphCache.get(key);
  if (cached !== undefined) return cached;
  // Combining marks and whitespace have no glyph of their own.
  if (/\s/.test(char)) {
    glyphCache.set(key, true);
    return true;
  }
  const reference = glyphSample(font, "\uFFFF");
  const sample = glyphSample(font, char);
  const covered = reference !== "" && sample !== "" && reference !== sample;
  glyphCache.set(key, covered);
  return covered;
}

/** Characters a Latin display face is expected to be missing. */
const FALLBACK_CANDIDATES = /[^\x20-\x7E\u00A0-\u024F\u2010-\u2027]/u;

/** True when a face is missing a character the fallback could draw. */
export function needsFallback(font: string, text: string): boolean {
  for (const char of Array.from(text)) {
    const rarer = FALLBACK_CANDIDATES.test(char) || /[!-\/:-@\[-`{-~\u2000-\u206F]/.test(char);
    if (rarer && !hasGlyph(font, char)) return true;
  }
  return false;
}

/**
 * Draw text, substituting the fallback face only for the glyphs the primary face
 * cannot render — so a price line set in Cinzel keeps its engraved figures but
 * shows a real ₹ instead of a box.
 */
export function drawGlyphSafe(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: {
    x: number;
    y: number;
    font: string;
    fallbackFont?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  },
): number {
  const { x, y, font, fallbackFont, align = "left", baseline = "alphabetic" } = options;
  if (!text) return 0;
  const chars = Array.from(text);
  if (!fallbackFont || !needsFallback(font, text)) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
    ctx.restore();
    return ctx.measureText(text).width;
  }

  // Build runs: consecutive characters that share a face.
  const runs: Array<{ text: string; fallback: boolean }> = [];
  for (const char of chars) {
    // Script faces often ship without ASCII punctuation; treat any character
    // the face genuinely lacks as fallback material (combining marks are not
    // punctuation, so their shaping is left alone).
    const punctuation = /[!-\/:-@\[-`{-~\u2000-\u206F]/.test(char);
    const fallback = (FALLBACK_CANDIDATES.test(char) || punctuation) && !hasGlyph(font, char);
    const last = runs[runs.length - 1];
    if (last && last.fallback === fallback) last.text += char;
    else runs.push({ text: char, fallback });
  }

  const widthOf = (run: { text: string; fallback: boolean }) => {
    ctx.save();
    ctx.font = run.fallback ? fallbackFont : font;
    const width = ctx.measureText(run.text).width;
    ctx.restore();
    return width;
  };
  const total = runs.reduce((sum, run) => sum + widthOf(run), 0);
  let cursor = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = baseline;
  for (const run of runs) {
    ctx.font = run.fallback ? fallbackFont : font;
    ctx.fillText(run.text, cursor, y);
    cursor += widthOf(run);
  }
  ctx.restore();
  return total;
}

/**
 * Wrap to a column. Delegates to the shared wrapper so a word that is wider than
 * the column — a Tamil place name, a long Hindi compound — is broken at a
 * cluster boundary instead of running under the artwork. `ctx.font` must be set
 * by the caller: these wrappers measure with whatever face is current.
 */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  return wrapAll(ctx, text, maxWidth);
}

export function wrapBalanced(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length < 2) {
    // One word (or a single long Tamil word): still has to obey the column.
    return ctx.measureText(text).width <= maxWidth ? [text] : breakWord(ctx, text, maxWidth);
  }
  const total = words.join(" ");
  const target = Math.ceil(words.length / 2);
  let best = [total];
  let bestScore = Number.POSITIVE_INFINITY;
  for (let split = 1; split < words.length; split += 1) {
    const first = words.slice(0, split).join(" ");
    const second = words.slice(split).join(" ");
    if (ctx.measureText(first).width > maxWidth || ctx.measureText(second).width > maxWidth) continue;
    const score = Math.abs(split - target) * 1000 + Math.abs(
      ctx.measureText(first).width - ctx.measureText(second).width,
    );
    if (score < bestScore) {
      bestScore = score;
      best = [first, second];
    }
  }
  // No split fits — the words themselves are wider than the column.
  if (best.length === 1 && ctx.measureText(best[0]).width > maxWidth) return wrapAll(ctx, text, maxWidth);
  return best;
}

export function fitHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  weight = 700,
  font?: (size: number, weight?: number) => string,
) {
  const face = font ?? DISPLAY;
  let size = startSize;
  const balanced = (value: number) => {
    if (maxLines === 2) {
      const two = wrapBalanced(ctx, text, maxWidth);
      const one = ctx.measureText(text).width <= maxWidth ? [text] : null;
      return one ?? two;
    }
    return wrapLines(ctx, text, maxWidth);
  };
  while (size > minSize) {
    ctx.font = face(size, weight);
    const lines = balanced(size);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    if (lines.length <= maxLines && widest <= maxWidth) return { size, lines };
    size -= 2;
  }
  ctx.font = face(minSize, weight);
  // Never silently drop the end of a headline. An overflowing block is a layout
  // bug the templates can fix; a truncated sentence is a wrong poster.
  return { size: minSize, lines: balanced(minSize) };
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  align: CanvasTextAlign = "left",
) {
  const prev = ctx.textAlign;
  ctx.textAlign = align;
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  ctx.textAlign = prev;
  return y + (lines.length - 1) * lineHeight;
}

export interface PillOptions {
  theme: Theme;
  filled?: boolean;
  tracking?: number;
  size?: number;
  height?: number;
  paddingX?: number;
  weight?: number;
  muted?: boolean;
}

export function drawPill(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  options: PillOptions,
): { width: number; height: number } {
  const {
    theme,
    filled = false,
    tracking = 2.2,
    size = 18,
    height = 44,
    paddingX = 18,
    weight = 600,
    muted = false,
  } = options;
  ctx.save();
  ctx.font = SANS(size, weight);
  const textWidth = ctx.measureText(label).width + tracking * Math.max(0, label.length - 1);
  const width = textWidth + paddingX * 2;
  roundRect(ctx, x, y, width, height, height / 2);
  if (filled) {
    ctx.fillStyle = withAlpha(theme.gold, 0.95);
    ctx.fill();
    ctx.fillStyle = "#140F04";
  } else {
    ctx.fillStyle = withAlpha(theme.gold, 0.08);
    ctx.fill();
    ctx.strokeStyle = withAlpha(theme.gold, 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = muted ? theme.muted : theme.goldSoft;
  }
  ctx.textBaseline = "middle";
  drawTracked(ctx, label, x + width / 2, y + height / 2 + 1, tracking, "center");
  ctx.restore();
  return { width, height };
}

export function drawChips(
  ctx: CanvasRenderingContext2D,
  chips: string[],
  x: number,
  y: number,
  maxWidth: number,
  theme: Theme,
  options: { size?: number; height?: number; gap?: number; tracking?: number } = {},
): number {
  const { size = 18, height = 42, gap = 10, tracking = 1.2 } = options;
  let cursorX = x;
  let cursorY = y;
  ctx.save();
  chips.filter(Boolean).forEach((chip) => {
    ctx.font = SANS(size, 500);
    const textWidth = ctx.measureText(chip).width + tracking * Math.max(0, chip.length - 1);
    const width = textWidth + 28;
    if (cursorX + width > x + maxWidth) {
      cursorX = x;
      cursorY += height + gap;
    }
    roundRect(ctx, cursorX, cursorY, width, height, height / 2);
    ctx.fillStyle = withAlpha(theme.gold, 0.07);
    ctx.fill();
    ctx.strokeStyle = withAlpha(theme.gold, 0.3);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = theme.muted;
    ctx.textBaseline = "middle";
    drawTracked(ctx, chip, cursorX + width / 2, cursorY + height / 2 + 1, tracking, "center");
    cursorX += width + gap;
  });
  ctx.restore();
  return cursorY + height - y;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/* ---------------------------------- motifs --------------------------------- */

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  // A filled four-point glint catches the upper-left key light and carries a soft drop shadow.
  ctx.save();
  ctx.shadowColor = withAlpha("#000000", 0.42);
  ctx.shadowBlur = Math.max(1, s * 0.42);
  ctx.shadowOffsetX = s * 0.16;
  ctx.shadowOffsetY = s * 0.24;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.14, y - s * 0.14, x + s, y);
  ctx.quadraticCurveTo(x + s * 0.14, y + s * 0.14, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.14, y + s * 0.14, x - s, y);
  ctx.quadraticCurveTo(x - s * 0.14, y - s * 0.14, x, y - s);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillStyle = withAlpha("#FFFBE6", 0.8);
  ctx.beginPath();
  ctx.arc(x - s * 0.12, y - s * 0.16, Math.max(0.45, s * 0.11), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMotif(
  ctx: CanvasRenderingContext2D,
  motif: MotifKey,
  cx: number,
  cy: number,
  size: number,
  theme: Theme,
  opacity = 1,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  ctx.globalAlpha = opacity;
  const foil = foilGradient(ctx, theme, 0, -50, 100);
  ctx.strokeStyle = foil;
  ctx.fillStyle = foil;
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(12, 7, 2, 0.52)";
  ctx.shadowBlur = 4.5;
  ctx.shadowOffsetX = 0.8;
  ctx.shadowOffsetY = 1.4;

  const ornament = ORNAMENTS[motif];
  if (ornament) {
    ornament(ctx, theme);
    ctx.restore();
    return;
  }

  switch (motif) {
    case "jathagam": {
      // Royal South Indian Vedic Rasi Chakra (Lagna Kundali)
      ctx.save();
      // Outer 24k gold leaf repousse frame
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = theme.gold;
      ctx.strokeRect(-44, -44, 88, 88);

      // Inner hairline border
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = withAlpha(theme.goldSoft, 0.6);
      ctx.strokeRect(-41, -41, 82, 82);

      // 12 South Indian Bhavas / Houses division grid
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = theme.gold;
      [-20, 20].forEach((v) => {
        ctx.beginPath();
        ctx.moveTo(v, -41);
        ctx.lineTo(v, 41);
        ctx.moveTo(-41, v);
        ctx.lineTo(41, v);
        ctx.stroke();
      });

      // Four corner diagonal house dividers (Mesha, Karkataka, Thula, Makara)
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = withAlpha(theme.goldSoft, 0.85);
      const diagonals: number[][] = [
        [-41, -41, -20, -20],
        [41, -41, 20, -20],
        [-41, 41, -20, 20],
        [41, 41, 20, 20],
      ];
      diagonals.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Central Brahma-Sthana Ashtadal Lotus (8 sacred petals)
      ctx.save();
      ctx.fillStyle = withAlpha(theme.gold, 0.15);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // 8 lotus petals in central diamond
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a + 0.3) * 9, Math.sin(a + 0.3) * 9, Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.quadraticCurveTo(Math.cos(a - 0.3) * 9, Math.sin(a - 0.3) * 9, 0, 0);
        ctx.fillStyle = withAlpha(theme.goldSoft, 0.5);
        ctx.fill();
        ctx.strokeStyle = withAlpha(theme.gold, 0.8);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Golden central bindu
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFDE7";
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // 12 House degree dots and corner ornamental florets
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 31, Math.sin(a) * 31, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(theme.goldSoft, 0.9);
        ctx.fill();
      }

      // Corner rosettes
      [-41, 41].forEach((cx2) => {
        [-41, 41].forEach((cy2) => {
          ctx.beginPath();
          ctx.arc(cx2, cy2, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = theme.gold;
          ctx.fill();
        });
      });
      ctx.restore();
      break;
    }
    case "porutham": {
      // Sacred Vivaha Porutham: Consecrated Golden Rings, Mangalsutra Thali & Agni Flame
      ctx.save();
      // 1. Two Interlocking 3D Sculpted 24k Gold Wedding Rings
      const drawRing = (cx2: number, cy2: number, r: number) => {
        ctx.beginPath();
        ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
        ctx.lineWidth = 3.6;
        ctx.strokeStyle = theme.gold;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx2, cy2, r - 1.2, 0, Math.PI * 2);
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = withAlpha("#FFFDE7", 0.9);
        ctx.stroke();
      };
      drawRing(-14, 8, 22);
      drawRing(14, 8, 22);

      // Brilliant Cut Diamond Facet Crown atop left ring
      ctx.save();
      ctx.translate(-14, -14);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, -1);
      ctx.lineTo(0, 4);
      ctx.lineTo(-4.5, -1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(theme.gold, 0.9);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      sparkle(ctx, 0, -1, 3.5, "#FFFFFF");
      ctx.restore();

      // 2. Auspicious Sacred Mangalsutra (Thali) pendant in center
      ctx.save();
      ctx.translate(0, 10);
      ctx.fillStyle = theme.gold;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.bezierCurveTo(7, -3, 8, 8, 0, 14);
      ctx.bezierCurveTo(-8, 8, -7, -3, 0, -6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#FFFDE7";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Red Kumkum bindu on Thali
      ctx.fillStyle = "#C62828";
      ctx.beginPath();
      ctx.arc(0, 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Sacred Vedic Agni Marriage Flame crowning top
      ctx.save();
      ctx.translate(0, -28);
      ctx.fillStyle = withAlpha("#FF8F00", 0.35);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.bezierCurveTo(11, -5, 10, 8, 0, 14);
      ctx.bezierCurveTo(-10, 8, -11, -5, 0, -16);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = withAlpha(theme.gold, 0.85);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(7, -3, 6, 6, 0, 10);
      ctx.bezierCurveTo(-6, 6, -7, -3, 0, -12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#FFFDE7";
      ctx.beginPath();
      ctx.ellipse(0, 4, 2.2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Auspicious Jasmine & Marigold Garland swag at base
      for (let i = 0; i < 19; i += 1) {
        const t = i / 18;
        const x = -38 + t * 76;
        const y = 38 + Math.sin(t * Math.PI) * 7;
        ctx.fillStyle = i % 2 === 0 ? "#FFFDE7" : "#FFB300";
        ctx.beginPath();
        ctx.arc(x, y, i % 3 === 0 ? 1.6 : 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      sparkle(ctx, -36, -26, 4, withAlpha(theme.goldSoft, 0.85));
      sparkle(ctx, 36, -26, 4, withAlpha(theme.goldSoft, 0.85));
      ctx.restore();
      break;
    }
    case "namakaranam": {
      // 1. Classical Temple Arch Engraving (Koodu Mandapam Arch) in Gold Foil Filigree
      ctx.save();
      ctx.strokeStyle = withAlpha(theme.gold, 0.75);
      ctx.lineWidth = 1.2;

      // Outer temple archway
      ctx.beginPath();
      ctx.moveTo(-36, 34);
      ctx.lineTo(-36, -6);
      ctx.quadraticCurveTo(-36, -40, 0, -44);
      ctx.quadraticCurveTo(36, -40, 36, -6);
      ctx.lineTo(36, 34);
      ctx.stroke();

      // Inner hairline archway
      ctx.strokeStyle = withAlpha(theme.gold, 0.45);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-31, 34);
      ctx.lineTo(-31, -5);
      ctx.quadraticCurveTo(-31, -35, 0, -39);
      ctx.quadraticCurveTo(31, -35, 31, -5);
      ctx.lineTo(31, 34);
      ctx.stroke();

      // Beaded pearls along arch crest
      for (let i = 0; i < 15; i += 1) {
        const t = i / 14;
        const angle = Math.PI * 1.12 + t * Math.PI * 0.76;
        const bx = Math.cos(angle) * 33.5;
        const by = Math.sin(angle) * 28 - 14;
        ctx.fillStyle = i % 2 === 0 ? "#FFFDE7" : theme.gold;
        ctx.beginPath();
        ctx.arc(bx, by, 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      // Temple Arch Apex Medallion with Sacred Tamil OM (ஓம்)
      ctx.save();
      ctx.fillStyle = theme.light ? "#FFFDF8" : withAlpha(theme.bgTo, 0.9);
      ctx.beginPath();
      ctx.arc(0, -44, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Tamil OM calligraphy inside medallion
      ctx.fillStyle = theme.gold;
      ctx.font = `bold 8px ${TAMIL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ஓம்", 0, -43.5);
      ctx.restore();

      // Flanking Sacred Tamil Syllable Cartouches (Namakaranam seed sounds: ந & ஸ்ரீ)
      const drawTamilCartouche = (tx: number, ty: number, char: string) => {
        ctx.save();
        ctx.fillStyle = theme.light ? "#FFFDF8" : withAlpha(theme.bgTo, 0.85);
        ctx.beginPath();
        ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = withAlpha(theme.gold, 0.7);
        ctx.lineWidth = 0.75;
        ctx.stroke();
        ctx.fillStyle = theme.gold;
        ctx.font = `600 5px ${TAMIL}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(char, tx, ty + 0.3);
        ctx.restore();
      };
      drawTamilCartouche(-25, -20, "ந");
      drawTamilCartouche(25, -20, "ஸ்ரீ");

      ctx.restore();

      // 2. Arch of 27 Janma Nakshatra celestial constellation stars
      for (let i = 0; i < 27; i += 1) {
        const a = Math.PI * 1.15 + (i / 26) * Math.PI * 0.7;
        const x = Math.cos(a) * 30;
        const y = Math.sin(a) * 24 - 10;
        ctx.beginPath();
        ctx.arc(x, y, i % 3 === 0 ? 1.2 : 0.75, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(theme.goldSoft, 0.55 + (i % 4) * 0.12);
        ctx.fill();
      }

      // 3. Radiant 8-pointed Janma Nakshatra birth star at crest
      const star = (cx2: number, cy2: number, r: number) => {
        ctx.beginPath();
        for (let i = 0; i < 16; i += 1) {
          const a = -Math.PI / 2 + (i * Math.PI) / 8;
          const radius = i % 2 === 0 ? r : r * 0.38;
          const x = cx2 + Math.cos(a) * radius;
          const y = cy2 + Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      ctx.save();
      star(0, -28, 10);
      ctx.fillStyle = withAlpha(theme.gold, 0.95);
      ctx.fill();
      star(0, -28, 4.5);
      ctx.fillStyle = "#FFFDE7";
      ctx.fill();

      // Four pada quadrant rays
      ctx.strokeStyle = withAlpha(theme.gold, 0.65);
      ctx.lineWidth = 0.85;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10.5, -28 + Math.sin(a) * 10.5);
        ctx.lineTo(Math.cos(a) * 16, -28 + Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Blooming Sacred Lotus Throne (Padma Peedam)
      // Stepped base terrace
      ctx.beginPath();
      ctx.roundRect(-24, 22, 48, 5, [2, 2, 1, 1]);
      ctx.fillStyle = withAlpha(theme.gold, 0.85);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Lotus petals
      const drawPetal = (x: number, y: number, w: number, h: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.bezierCurveTo(w, -h * 0.5, w * 0.8, h * 0.4, 0, h * 0.5);
        ctx.bezierCurveTo(-w * 0.8, h * 0.4, -w, -h * 0.5, 0, -h);
        ctx.closePath();
        ctx.fillStyle = withAlpha(theme.gold, 0.28);
        ctx.fill();
        ctx.strokeStyle = theme.gold;
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      };
      drawPetal(-17, 18, 6.5, 13, -0.5);
      drawPetal(17, 18, 6.5, 13, 0.5);
      drawPetal(-8.5, 20, 7.5, 14, -0.22);
      drawPetal(8.5, 20, 7.5, 14, 0.22);
      drawPetal(0, 21, 8.5, 15, 0);

      // 5. Divine Infant Footprints (Bala Paadam)
      const drawBabyFoot = (cx2: number, cy2: number, flip: number) => {
        ctx.save();
        ctx.translate(cx2, cy2);

        // Sole contour: rounded chubby heel, gentle medial arch, broad front ball
        ctx.beginPath();
        ctx.moveTo(-1 * flip, -7.5);
        ctx.bezierCurveTo(3.6 * flip, -7.5, 5.2 * flip, -3.8, 4.5 * flip, -0.8);
        ctx.bezierCurveTo(4.0 * flip, 2.8, 2.0 * flip, 4.8, 3.2 * flip, 7.0);
        ctx.bezierCurveTo(2.8 * flip, 9.5, -2.0 * flip, 9.5, -2.6 * flip, 7.0);
        ctx.bezierCurveTo(-1.8 * flip, 4.2, -3.8 * flip, 1.8, -3.5 * flip, -2.2);
        ctx.bezierCurveTo(-3.4 * flip, -5.5, -2.0 * flip, -7.5, -1 * flip, -7.5);
        ctx.closePath();
        ctx.fillStyle = withAlpha(theme.gold, 0.88);
        ctx.fill();
        ctx.strokeStyle = withAlpha("#FFFDE7", 0.95);
        ctx.lineWidth = 0.65;
        ctx.stroke();

        // 5 round chubby toes
        const toes = [
          { x: -2.3 * flip, y: -10.2, r: 1.7 },
          { x: -0.2 * flip, y: -10.8, r: 1.4 },
          { x: 1.7 * flip, y: -10.3, r: 1.2 },
          { x: 3.3 * flip, y: -9.2, r: 1.0 },
          { x: 4.6 * flip, y: -8.0, r: 0.8 },
        ];
        for (const t of toes) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
          ctx.fillStyle = withAlpha(theme.gold, 0.92);
          ctx.fill();
          ctx.strokeStyle = "#FFFDE7";
          ctx.lineWidth = 0.45;
          ctx.stroke();
        }

        // Tilak dot on sole
        ctx.fillStyle = "#C62828";
        ctx.beginPath();
        ctx.arc(0.2 * flip, -1.6, 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawBabyFoot(-6.8, 11, -1);
      drawBabyFoot(6.8, 11, 1);

      // 6. Jasmine garland & ankle bells at base
      for (let i = -5; i <= 5; i += 1) {
        const gx = i * 4.4;
        const gy = 28 + Math.cos((i / 5) * (Math.PI / 2.2)) * 2;
        ctx.fillStyle = "#FFFDE7";
        ctx.beginPath();
        ctx.arc(gx, gy, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const bx of [-19, 0, 19]) {
        ctx.fillStyle = theme.gold;
        ctx.beginPath();
        ctx.arc(bx, 31, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "muhurtham": {
      // Sacred Subha Muhurtham: Consecrated Purna Kumbha (Kalash), Mango Leaves & Kuthuvilakku Lamps
      ctx.save();
      // 1. Auspicious Mango Leaf & Marigold Toranam swag at top
      ctx.strokeStyle = withAlpha(theme.gold, 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-42, -36);
      ctx.quadraticCurveTo(0, -28, 42, -36);
      ctx.stroke();

      for (let i = 0; i < 9; i += 1) {
        const t = i / 8;
        const lx = -36 + t * 72;
        const ly = -35 + Math.sin(t * Math.PI) * 5;
        // Mango leaf
        ctx.fillStyle = withAlpha("#2E7D32", 0.85);
        ctx.beginPath();
        ctx.ellipse(lx, ly + 4, 2.2, 5.5, (t - 0.5) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = withAlpha(theme.goldSoft, 0.6);
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Marigold blossom
        ctx.fillStyle = i % 2 === 0 ? "#FFB300" : "#E65100";
        ctx.beginPath();
        ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Consecrated Purna Kumbha (Kalash) in center
      // Stepped Lotus Pedestal
      ctx.fillStyle = withAlpha(theme.gold, 0.85);
      ctx.beginPath();
      ctx.roundRect(-24, 26, 48, 6, [2, 2, 1, 1]);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // Rounded Kalash Urn Pot
      ctx.beginPath();
      ctx.arc(0, 10, 16, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(theme.gold, 0.92);
      ctx.fill();
      ctx.strokeStyle = withAlpha("#FFFDE7", 0.95);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Sacred Kalava thread wrapped around urn
      ctx.strokeStyle = "#C62828";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 10, 15.5, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Urn neck rim
      ctx.fillStyle = theme.gold;
      ctx.beginPath();
      ctx.roundRect(-10, -5, 20, 5, 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFDE7";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Five sacred Mango leaves (Mavilai) fanning out from rim
      const angles = [-0.65, -0.32, 0, 0.32, 0.65];
      for (const a of angles) {
        ctx.save();
        ctx.translate(0, -5);
        ctx.rotate(a);
        ctx.fillStyle = withAlpha("#388E3C", 0.9);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(4.5, -9, 0, -18);
        ctx.quadraticCurveTo(-4.5, -9, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = withAlpha(theme.goldSoft, 0.7);
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.restore();
      }

      // Sacred Coconut (Thengai) crowned in center
      ctx.fillStyle = withAlpha(theme.gold, 0.95);
      ctx.beginPath();
      ctx.arc(0, -11, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFDE7";
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // Auspicious Kumkum and Chandan tilak on coconut
      ctx.fillStyle = "#FFD54F";
      ctx.beginPath();
      ctx.arc(0, -12, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#C62828";
      ctx.beginPath();
      ctx.arc(0, -12, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Twin Brass Kuthuvilakku Lamps flanking left and right
      const drawLamp = (lx: number) => {
        ctx.save();
        ctx.translate(lx, 16);
        // Lamp stand
        ctx.fillStyle = theme.gold;
        ctx.fillRect(-1.2, -6, 2.4, 14);
        ctx.beginPath();
        ctx.ellipse(0, 8, 7, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, -6, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Flame
        ctx.fillStyle = "#FF8F00";
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.quadraticCurveTo(3.5, -11, 0, -7);
        ctx.quadraticCurveTo(-3.5, -11, 0, -16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#FFFDE7";
        ctx.beginPath();
        ctx.ellipse(0, -10, 1.2, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawLamp(-32);
      drawLamp(32);
      ctx.restore();
      break;
    }
    case "panchangam": {
      // Sacred Panchanga Ephemeris Astrolabe: Surya-Chandra Synchrony & 27 Nakshatras
      ctx.save();
      // 1. Concentric Golden Astrolabe Rings
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = withAlpha(theme.goldSoft, 0.55);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();

      // 27 Nakshatra ticks along circumference
      for (let i = 0; i < 27; i += 1) {
        const a = (i / 27) * Math.PI * 2;
        const r1 = i % 3 === 0 ? 35 : 37.5;
        ctx.strokeStyle = withAlpha(theme.gold, i % 3 === 0 ? 0.9 : 0.45);
        ctx.lineWidth = i % 3 === 0 ? 1.1 : 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * 41, Math.sin(a) * 41);
        ctx.stroke();
      }

      // Four cardinal solstice/equinox crosshair markers (Ayana & Vishuva)
      ctx.strokeStyle = withAlpha(theme.gold, 0.75);
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
        ctx.lineTo(Math.cos(a) * 45, Math.sin(a) * 45);
        ctx.stroke();
      }

      // 2. Radiant Surya (Sun Disc) at Upper Right with 12 Sauramana Month Rays
      ctx.save();
      ctx.translate(18, -18);
      ctx.fillStyle = withAlpha(theme.gold, 0.95);
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFDE7";
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // 12 solar rays
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const len = i % 2 === 0 ? 15 : 12;
        ctx.strokeStyle = withAlpha(theme.goldSoft, 0.85);
        ctx.lineWidth = i % 2 === 0 ? 1.0 : 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Luminous Chandra (Crescent Moon) at Lower Left representing Tithis
      ctx.save();
      ctx.translate(-18, 18);
      ctx.fillStyle = withAlpha("#FFFDE7", 0.9);
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0.5, Math.PI * 1.8);
      ctx.arc(-2.5, -2, 7.5, Math.PI * 1.7, 0.6, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // 4. Central Shanku (Gnomon Sundial Needle) for Shadow & Time Reckoning
      ctx.beginPath();
      ctx.moveTo(-6, 12);
      ctx.lineTo(6, 12);
      ctx.lineTo(0, -18);
      ctx.closePath();
      ctx.fillStyle = withAlpha(theme.gold, 0.22);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Center pivot jewel
      ctx.fillStyle = "#FFFDE7";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "transits": {
      // Clean modern editorial minimalist gold wireframe Saturn with Cassini Division
      ctx.save();
      ctx.rotate(-0.44); // 26.7° orbital tilt
      const rx = 46;
      const ry = 13.5;
      const pr = 18;

      // 1. Tilted Polar Axis Line
      ctx.strokeStyle = withAlpha(theme.gold, 0.45);
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(0, 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Back arc of rings (angles PI to 2*PI) drawn BEHIND the planet globe
      // Ring A outer behind
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Ring A inner behind
      ctx.strokeStyle = withAlpha(theme.goldSoft, 0.7);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 3.2, ry - 0.95, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Cassini Division gap line behind
      ctx.strokeStyle = withAlpha(theme.gold, 0.22);
      ctx.lineWidth = 0.75;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 5.0, ry - 1.45, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ring B behind (dense broad ring)
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 8.0, ry - 2.3, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = withAlpha(theme.goldSoft, 0.85);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 11.5, ry - 3.3, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Crepe Ring C behind
      ctx.strokeStyle = withAlpha(theme.gold, 0.4);
      ctx.lineWidth = 0.75;
      ctx.setLineDash([1, 2]);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 14.2, ry - 4.1, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Planet Globe Body (Solid mask fill completely hides back rings)
      ctx.fillStyle = theme.light ? (theme.bgFrom ?? "#FFFDF8") : (theme.bgTo ?? "#060A14");
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Atmospheric latitude bands across globe
      ctx.strokeStyle = withAlpha(theme.gold, 0.5);
      ctx.lineWidth = 0.85;
      for (const by of [-9, -3.5, 3.5, 10]) {
        const half = Math.sqrt(Math.max(1, pr * pr - by * by));
        ctx.beginPath();
        ctx.moveTo(-half, by);
        ctx.lineTo(half, by);
        ctx.stroke();
      }

      // Ring shadow cast on upper globe
      ctx.strokeStyle = withAlpha(theme.gold, 0.7);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 2.2, pr * 0.95, 3.0, 0, 0, Math.PI);
      ctx.stroke();

      // 4. Front arc of rings (angles 0 to PI) drawn IN FRONT of globe
      // Crepe Ring C in front
      ctx.strokeStyle = withAlpha(theme.gold, 0.4);
      ctx.lineWidth = 0.75;
      ctx.setLineDash([1, 2]);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 14.2, ry - 4.1, 0, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ring B in front (dense broad luminous ring)
      ctx.strokeStyle = withAlpha(theme.goldSoft, 0.85);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 11.5, ry - 3.3, 0, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 8.0, ry - 2.3, 0, 0, Math.PI);
      ctx.stroke();

      // Cassini Division in front (sharp dark gap)
      ctx.strokeStyle = withAlpha(theme.gold, 0.22);
      ctx.lineWidth = 0.75;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 5.0, ry - 1.45, 0, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ring A in front
      ctx.strokeStyle = withAlpha(theme.goldSoft, 0.7);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 3.2, ry - 0.95, 0, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      ctx.restore();

      // 5. Astrological Saturn Symbol ♄ & degree ticks
      ctx.fillStyle = theme.gold;
      ctx.font = "bold 9px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♄", 31, -25);

      // Celestial coordinate degree ticks
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.strokeStyle = withAlpha(theme.gold, i % 2 === 0 ? 0.7 : 0.35);
        ctx.lineWidth = i % 2 === 0 ? 1.0 : 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
        ctx.lineTo(Math.cos(a) * (i % 2 === 0 ? 49 : 47), Math.sin(a) * (i % 2 === 0 ? 49 : 47));
        ctx.stroke();
      }
      break;
    }
    case "scroll": {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(-30, -32, 56, 56);
      ctx.fillStyle = withAlpha(theme.gold, 0.08);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.stroke();
      // rolled edges
      ctx.beginPath();
      ctx.ellipse(-31, -4, 4.5, 30, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(27, -4, 4.5, 30, 0, 0, Math.PI * 2);
      ctx.stroke();
      // lines
      [-18, -8, 2, 12].forEach((y, i) => {
        ctx.beginPath();
        ctx.moveTo(-20, y);
        ctx.lineTo(i === 3 ? 4 : 14, y);
        ctx.strokeStyle = withAlpha(theme.gold, i === 3 ? 0.35 : 0.6);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
      // seal
      ctx.beginPath();
      ctx.arc(19, 26, 11, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(theme.gold, 0.9);
      ctx.fill();
      ctx.fillStyle = theme.light ? "#FBF6EA" : "#0A1020";
      ctx.font = DISPLAY(9, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AS", 19, 27);
      ctx.textAlign = "left";
      sparkle(ctx, -30, -34, 3.4, withAlpha(theme.goldSoft, 0.8));
      break;
    }
    case "chat": {
      roundRect(ctx, -40, -34, 80, 54, 14);
      ctx.fillStyle = withAlpha(theme.gold, 0.1);
      ctx.fill();
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, 20);
      ctx.lineTo(-12, 34);
      ctx.lineTo(-2, 20);
      ctx.stroke();
      [-18, 0, 18].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, -7, 3, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(theme.goldSoft, 0.9);
        ctx.fill();
      });
      break;
    }
    case "sun": {
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(theme.goldSoft, 0.9);
      ctx.fill();
      for (let i = 0; i < 16; i += 1) {
        const angle = (i / 16) * Math.PI * 2;
        const inner = 23;
        const outer = i % 2 === 0 ? 34 : 29;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.strokeStyle = withAlpha(theme.gold, 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      break;
    }
    case "star":
    default: {
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? 34 : 14;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = withAlpha(theme.gold, 0.16);
      ctx.fill();
      ctx.strokeStyle = theme.goldSoft;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.setLineDash([3, 7]);
      ctx.strokeStyle = withAlpha(theme.gold, 0.4);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

/* -------------------------------- safe zones ------------------------------- */

interface Zone {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  label: string;
}

export function drawSafeZones(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  zones: Zone[],
) {
  ctx.save();
  zones.forEach((zone, index) => {
    const isBand = zone.left === undefined && zone.right === undefined && zone.top !== undefined;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = withAlpha("#57B89A", 0.9);
    if (isBand) {
      const top = zone.top ?? 0;
      const bottom = zone.bottom ?? 0;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, W, top);
      ctx.fillRect(0, H - bottom, W, bottom);
      ctx.strokeRect(1, top + 1, W - 2, H - top - bottom - 2);
      ctx.fillStyle = "rgba(87,184,154,0.92)";
      ctx.font = SANS(15, 600);
      ctx.fillText(`SAFE · ${zone.label}`, 24, top - 12);
    } else {
      const left = zone.left ?? 0;
      const top = zone.top ?? 0;
      const right = zone.right ?? 0;
      const bottom = zone.bottom ?? 0;
      const w = W - left - right;
      const h = H - top - bottom;
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.fillRect(0, 0, W, top);
      ctx.fillRect(0, top, left, H - top);
      ctx.fillRect(W - right, top, right, H - top);
      ctx.fillRect(left, top + h, w, H - top - h);
      ctx.strokeRect(left + 1, top + 1, w - 2, h - 2);
      ctx.fillStyle = "rgba(87,184,154,0.95)";
      ctx.font = SANS(16, 600);
      ctx.fillText(zone.label, left + 16, top + 26);
    }
    if (index === 0) ctx.setLineDash([]);
  });
  ctx.restore();
}
