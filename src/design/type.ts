/**
 * Astrosivam Design System · typography
 *
 * One English-only type engine. It owns the ramp, the fitting strategy and the
 * painting primitives, so fifteen compositions can share a typographic voice
 * without sharing a layout.
 *
 * Fitting strategy (in order, per call):
 *   1. shrink to the smallest size that still fits the requested line count,
 *   2. if the block needs more lines, allow the extra lines (`maxLines`),
 *   3. if a single word is wider than the measure, break it at a syllable-safe
 *      point rather than overflowing,
 *   4. never truncate: an overflowing headline is a layout bug the composition
 *      must solve, and a silently clipped sentence is a wrong poster.
 *
 * The engine also refuses to set Indic code points: `auditEnglish` returns the
 * offending fragments and every public entry point routes through it.
 */

export const INDIC = /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u0A80-\u0AFF]/;

/** Latin display families the studio ships. `weight` is a CSS-style number. */
export type DisplayFace = "cinzel" | "cormorant" | "playfair" | "inter" | "marcellus";

const FACE_STACK: Record<DisplayFace, string> = {
  cinzel: `Cinzel, Georgia, "Times New Roman", serif`,
  cormorant: `"Cormorant Garamond", Cinzel, Georgia, serif`,
  playfair: `"Playfair Display", "Cormorant Garamond", Georgia, serif`,
  inter: `"Inter Tight", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`,
  marcellus: `Marcellus, Cinzel, Georgia, serif`,
};

/** The faces the studio offers, with the stack each picker label is set in. */
export const DISPLAY_FACES: Array<{ key: DisplayFace; label: string; note: string; stack: string }> = [
  { key: "cinzel", label: "Cinzel", note: "Engraved Roman capitals", stack: FACE_STACK.cinzel },
  { key: "cormorant", label: "Cormorant", note: "High-contrast heritage serif", stack: FACE_STACK.cormorant },
  { key: "playfair", label: "Playfair", note: "Editorial hairlines", stack: FACE_STACK.playfair },
  { key: "marcellus", label: "Marcellus", note: "Warm inscription serif", stack: FACE_STACK.marcellus },
  { key: "inter", label: "Inter Tight", note: "Modern campaign sans", stack: FACE_STACK.inter },
];

export const SANS_STACK = `"Plus Jakarta Sans", "Inter Tight", ui-sans-serif, system-ui, sans-serif`;
export const SERIF_STACK = `Marcellus, Cinzel, Georgia, serif`;

export const fontFor = (face: DisplayFace, size: number, weight = 700): string =>
  `${weight} ${Math.max(1, size)}px ${FACE_STACK[face]}`;

export const sansFor = (size: number, weight = 500): string =>
  `${weight} ${Math.max(1, size)}px ${SANS_STACK}`;

export const serifFor = (size: number, weight = 400): string =>
  `${weight} ${Math.max(1, size)}px ${SERIF_STACK}`;

/** Families that are tracked in capitals — the rest are set as written. */
export const isDisplayCap = (face: DisplayFace) => face === "cinzel";

/* --------------------------------- audit ---------------------------------- */

export interface EnglishAudit {
  ok: boolean;
  /** The offending substrings, in reading order. */
  offending: string[];
}

/**
 * Reports any non-Latin script in poster copy. Used by the studio to flag
 * pasted Indic text *before* a render, and by the test suite to guarantee no
 * shipped sample contains it.
 */
export function auditEnglish(text: string): EnglishAudit {
  if (!text) return { ok: true, offending: [] };
  const offending: string[] = [];
  let run = "";
  for (const char of Array.from(text)) {
    if (INDIC.test(char)) {
      run += char;
    } else if (run) {
      offending.push(run);
      run = "";
    }
  }
  if (run) offending.push(run);
  return { ok: offending.length === 0, offending };
}

/** Strip Indic runs so a stale saved preset can never print them. */
export function englishOnly(text: string): string {
  if (!text) return "";
  return text
    .replace(/([\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u0A80-\u0AFF]+[ \u00A0]?)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/* --------------------------------- measure -------------------------------- */

export interface Measured {
  lines: string[];
  size: number;
  /** Advance from one baseline to the next. */
  leading: number;
  width: number;
  height: number;
}

export interface FitOptions {
  maxWidth: number;
  maxLines?: number;
  startSize: number;
  minSize?: number;
  weight?: number;
  face?: DisplayFace;
  /** Extra space between glyphs at `startSize`; scaled down with the size. */
  tracking?: number;
  leading?: number;
  uppercase?: boolean;
}

const isBreakOpportunity = (word: string) => {
  // Soft break points inside an over-long word: after a vowel group or a
  // hyphenated part. Conservative — it only runs when the word cannot fit.
  const parts: string[] = [];
  let buffer = "";
  for (let i = 0; i < word.length; i += 1) {
    buffer += word[i];
    const next = word[i + 1] ?? "";
    const vowelBreak = /[aeiouy]/i.test(word[i]) && /[^aeiouy]/.test(next) && buffer.length > 2;
    const pairBreak = /[bcdfghjklmnpqrstvwxz]{3}/i.test(buffer + next);
    if (vowelBreak || pairBreak || word[i] === "-") {
      parts.push(buffer);
      buffer = "";
    }
  }
  if (buffer) parts.push(buffer);
  return parts.length > 1 ? parts : [];
};

function breakLongWord(ctx: CanvasRenderingContext2D, word: string, maxWidth: number, tracking: number): string[] {
  const pieces: string[] = [];
  let rest = word;
  let guard = 0;
  while (rest && guard < 24) {
    guard += 1;
    if (measure(ctx, rest, tracking) <= maxWidth) {
      pieces.push(rest);
      break;
    }
    const candidates = isBreakOpportunity(rest);
    if (!candidates.length) {
      // Worst case: hard split, but always keep at least two characters.
      let cut = Math.max(2, Math.ceil(rest.length / 2));
      while (cut > 2 && measure(ctx, `${rest.slice(0, cut)}-`, tracking) > maxWidth) cut -= 1;
      pieces.push(`${rest.slice(0, cut)}-`);
      rest = rest.slice(cut);
      continue;
    }
    let take = "";
    for (const part of candidates) {
      if (measure(ctx, take + part, tracking) > maxWidth) break;
      take += part;
    }
    if (!take) take = candidates[0];
    pieces.push(take);
    rest = rest.slice(take.length);
  }
  if (rest && guard >= 24) pieces.push(rest);
  return pieces;
}

export function measure(ctx: CanvasRenderingContext2D, text: string, tracking = 0): number {
  const width = ctx.measureText(text).width;
  if (!tracking) return width;
  return width + Math.max(0, Array.from(text).length - 1) * tracking;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  tracking = 0,
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(ctx, candidate, tracking) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (measure(ctx, word, tracking) <= maxWidth) {
      current = word;
    } else {
      const pieces = breakLongWord(ctx, word, maxWidth, tracking);
      lines.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1] ?? "";
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Balanced wrapping: for two-line display settings it picks the split whose
 * lines are closest in width, which is what makes a headline look *set* rather
 * than flushed.
 */
function wrapBalanced(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, tracking: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length < 4) return wrapText(ctx, text, maxWidth, tracking);
  if (measure(ctx, text, tracking) <= maxWidth) return [text];
  let best: string[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let split = 1; split < words.length; split += 1) {
    const a = words.slice(0, split).join(" ");
    const b = words.slice(split).join(" ");
    if (measure(ctx, a, tracking) > maxWidth || measure(ctx, b, tracking) > maxWidth) continue;
    const score = Math.abs(measure(ctx, a, tracking) - measure(ctx, b, tracking));
    if (score < bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best ?? wrapText(ctx, text, maxWidth, tracking);
}

/** Fit a display line to a measure. Shrinks, re-wraps, then accepts extra lines. */
export function fitDisplay(ctx: CanvasRenderingContext2D, text: string, options: FitOptions): Measured {
  const {
    maxWidth,
    maxLines = 3,
    startSize,
    minSize = startSize * 0.42,
    weight = 700,
    face = "cinzel",
    tracking = 0,
    leading = 1.06,
    uppercase = false,
  } = options;
  const value = uppercase ? text.toUpperCase() : text;
  const track = (size: number) => (tracking * size) / startSize;
  let size = startSize;
  let lines: string[] = [];
  for (;;) {
    ctx.font = fontFor(face, size, weight);
    const t = track(size);
    const candidate =
      maxLines <= 2 && size > startSize * 0.6
        ? wrapBalanced(ctx, value, maxWidth, t)
        : wrapText(ctx, value, maxWidth, t);
    const widest = candidate.reduce((max, line) => Math.max(max, measure(ctx, line, t)), 0);
    lines = candidate;
    if ((candidate.length <= maxLines && widest <= maxWidth) || size <= minSize) break;
    size = Math.max(minSize, size * 0.955);
  }
  ctx.font = fontFor(face, size, weight);
  const t = track(size);
  const widest = lines.reduce((max, line) => Math.max(max, measure(ctx, line, t)), 0);
  return {
    lines,
    size,
    leading: size * leading,
    width: widest,
    height: lines.length * size * leading,
  };
}

/* ---------------------------------- paint --------------------------------- */

export interface PaintOptions {
  x: number;
  y: number;
  /** First baseline. */
  align?: CanvasTextAlign;
  tracking?: number;
  color?: string | CanvasGradient;
  alpha?: number;
  /** 0–1 wipe from the left, for kinetic type. */
  reveal?: number;
  shadowColor?: string;
  shadowBlur?: number;
  uppercase?: boolean;
  baseline?: CanvasTextBaseline;
  /**
   * Grow the wipe window so no glyph is partially clipped by the clip rect.
   * Kinetic entrances use this; static paint leaves it off.
   */
  revealGrow?: boolean;
}

/** Draw one line with manual tracking, honouring canvas shaping per glyph. */
export function paintLine(ctx: CanvasRenderingContext2D, text: string, options: PaintOptions & { font: string }): number {
  const { x, y, font, align = "left", tracking = 0, color = "#fff", alpha = 1, reveal = 1, shadowColor, shadowBlur, baseline = "alphabetic", revealGrow = false } = options;
  if (!text) return 0;
  ctx.save();
  ctx.font = font;
  ctx.globalAlpha *= alpha;
  if (shadowColor && shadowBlur) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
  }
  ctx.fillStyle = color;
  ctx.textBaseline = baseline;
  ctx.textAlign = "left";
  const total = measure(ctx, text, tracking);
  const startX = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  if (tracking) {
    const chars = Array.from(text);
    let cursor = startX;
    for (const char of chars) {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + tracking;
    }
  } else if (reveal >= 1) {
    ctx.fillText(text, startX, y);
  } else if (reveal > 0) {
    const em = ctx.measureText("H").width;
    const width = total * reveal + (revealGrow ? em * 1.1 : 0) + 4;
    ctx.beginPath();
    ctx.rect(startX - 2, y - em * 2.4, width, em * 4.2);
    ctx.clip();
    ctx.fillText(text, startX, y);
  }
  ctx.restore();
  return total;
}

/** Paint a measured block, one line per leading step. */
export function paintBlock(
  ctx: CanvasRenderingContext2D,
  block: Measured,
  options: {
    face?: DisplayFace;
    weight?: number;
    sizeAt?: number;
    x: number;
    y: number;
    align?: CanvasTextAlign;
    tracking?: number;
    color?: string | CanvasGradient;
    alpha?: number;
    /** Per-line stagger in ms-normalised units (0–1 of the block). */
    stagger?: (index: number) => number;
    uppercase?: boolean;
  },
): number {
  const {
    face = "cinzel",
    weight = 700,
    x,
    y,
    align = "left",
    tracking = 0,
    color = "#fff",
    alpha = 1,
    stagger,
    uppercase = false,
  } = options;
  const size = options.sizeAt ?? block.size;
  const scale = size / block.size;
  const t = (tracking * size) / 100;
  const font = fontFor(face, size, weight);
  block.lines.forEach((line, index) => {
    paintLine(ctx, uppercase ? line.toUpperCase() : line, {
      x,
      y: y + index * block.leading * scale,
      font,
      align,
      tracking: t,
      color,
      alpha: alpha * (stagger ? stagger(index) : 1),
    });
  });
  return block.lines.length * block.leading * scale;
}

/* -------------------------------- utilities -------------------------------- */

/** Tracking in px for a size and an em ratio. */
export const track = (size: number, em: number) => size * em;

/** A tracked run of capitals — the standard kicker treatment. */
export function paintKicker(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: {
    x: number;
    y: number;
    size: number;
    color: string;
    align?: CanvasTextAlign;
    tracking?: number;
    alpha?: number;
    weight?: number;
  },
) {
  const { x, y, size, color, align = "left", tracking = size * 0.22, alpha = 1, weight = 600 } = options;
  const value = text.toUpperCase();
  ctx.save();
  ctx.font = sansFor(size, weight);
  const width = measure(ctx, value, tracking);
  paintLine(ctx, value, {
    x: align === "center" ? x : align === "right" ? x : x,
    y,
    font: sansFor(size, weight),
    align,
    tracking,
    color,
    alpha,
  });
  ctx.restore();
  return width;
}

/**
 * Split a long body into a bullet list on sentence boundaries — used by the
 * infographic and commercial compositions so a paragraph becomes readable rows.
 */
export function toPoints(text: string, max = 4): string[] {
  if (!text) return [];
  const bySentence = text
    .split(/(?<=[.!?·])\s+|\s*·\s*|\s*\|\s*/)
    .map((part) => part.replace(/[.!?]$/, "").trim())
    .filter(Boolean);
  if (bySentence.length > 1) return bySentence.slice(0, max);
  const byComma = text
    .split(/,\s*|\s+·\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return byComma.length > 1 ? byComma.slice(0, max) : [text.trim()];
}
