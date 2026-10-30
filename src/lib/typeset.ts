/**
 * Measure-then-paint text fitting, shared by the creative engines.
 *
 * These are deliberately paranoid: a headline shrinks rather than losing words,
 * a column never lets a single unbreakable word run under the artwork, and a
 * size floor is respected even when the copy cannot fit — because silently
 * dropping half a sentence is worse than a tight line.
 */

const INDIC_LINE = /[\u0900-\u097F\u0B80-\u0BFF]/;

/**
 * One-line fitter that knows about tracking.
 *
 * `fitSize` measures the string and nothing else, but a tracked line also
 * carries `tracking` between every pair of glyphs. A kicker fitted without that
 * allowance is right up until the tracking is applied and then runs off the
 * card. Indic text is exempt because the painter drops its tracking entirely.
 */
export function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  start: number,
  min: number,
  font: (size: number) => string,
  tracking = 0,
): number {
  const track = INDIC_LINE.test(text) ? 0 : tracking;
  const gaps = Math.max(0, Array.from(text).length - 1);
  let size = start;
  ctx.save();
  for (;;) {
    ctx.font = font(size);
    if (ctx.measureText(text).width + track * gaps <= width || size <= min) break;
    size = Math.max(min, size - Math.max(1, start * 0.04));
  }
  ctx.restore();
  return size;
}

/**
 * Line advance for a wrapped line.
 *
 * The Latin faces sit inside a 1.14–1.24 em rhythm; Tamil and Devanagari do
 * not. Measured on the shipped faces, Tamil ink reaches 1.31 em below the
 * baseline and Devanagari 1.15 em, so a 1.06 em headline rhythm makes the
 * second line of a Tamil headline collide with the first. The factor is kept
 * where it is for Latin and raised to a floor for Indic text, so neither script
 * inherits the other's assumptions.
 */
/**
 * Vertical offsets for a block of fitted lines, using the Indic-aware advance.
 *
 * Drawing at `index * size * factor` is right for Latin and collides for Tamil:
 * a 1.06 em headline rhythm puts the second line's ascenders through the first
 * line's descenders. `lineHop` returns the same number for Latin copy and a
 * taller one for Indic copy, so one loop serves both.
 */
export function leadOffsets(lines: string[], size: number, factor: number): number[] {
  const offsets: number[] = [];
  let y = 0;
  lines.forEach((line) => {
    offsets.push(y);
    y += lineHop(size, factor, line);
  });
  return offsets;
}

export function blockHeight(lines: string[], size: number, factor: number): number {
  const offsets = leadOffsets(lines, size, factor);
  return lines.length ? offsets[offsets.length - 1] + lineHop(size, factor, lines[lines.length - 1]) : 0;
}

/**
 * Line advance for one wrapped line.
 *
 * The Latin faces sit inside a 1.14–1.24 em rhythm; Tamil and Devanagari do not.
 * Measured on the shipped faces, Tamil ink reaches 1.31 em below the baseline
 * and Devanagari 1.15 em, so a 1.06 em headline rhythm makes the second line of
 * a Tamil headline collide with the first. The factor is kept where it is for
 * Latin and raised to a floor for Indic text, so neither script inherits the
 * other's assumptions.
 */
export function lineHop(size: number, factor: number, text = ""): number {
  const advance = size * factor;
  return INDIC_LINE.test(text) ? Math.max(advance, size * 1.46) : advance;
}

/* ------------------------------ script safety ----------------------------- */

/** Combining marks that belong to the preceding letter in Tamil / Devanagari. */
const COMBINING =
  /[\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962-\u0963\u0BBE-\u0BCD\u0BD7\u200C\u200D\uFE00-\uFE0F]/;

/**
 * Split into user-perceived clusters. Two ways to lose a Tamil letter are to
 * slice between a base character and its vowel sign, or to treat a ZWJ sequence
 * as two glyphs; both look like typos rather than truncation.
 */
const VIRAMA = /[\u094D\u0BCD\u0B4D\u0C4D\u0CCD\u0D4D]/;

export function clusters(text: string): string[] {
  const out: string[] = [];
  let joins = false;
  for (const char of Array.from(text)) {
    // A virama joins the consonant that follows it into one conjunct (क्ष), and
    // a ZWJ chains the next character onto the run. Both must stay in one
    // cluster or `breakWord` can cut a conjunct in half.
    if (out.length && (joins || COMBINING.test(char))) out[out.length - 1] += char;
    else out.push(char);
    joins = VIRAMA.test(char) || char === "\u200D";
  }
  return out;
}

/**
 * Break one over-long word into pieces that fit `width`, never splitting a
 * cluster. Latin copy rarely needs this; Tamil place names and Hindi compounds
 * routinely do, and without it the word runs under the artwork.
 */
export function breakWord(ctx: CanvasRenderingContext2D, word: string, width: number): string[] {
  ctx.save();
  const pieces: string[] = [];
  let current = "";
  for (const cluster of clusters(word)) {
    const candidate = current + cluster;
    if (current && ctx.measureText(candidate).width > width) {
      pieces.push(current);
      current = cluster;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  ctx.restore();
  return pieces.length ? pieces : [word];
}

/** Font size in pixels, parsed out of a CSS font shorthand. */
export const fontPx = (font: string): number => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 0);

/**
 * Wrap every word. Nothing is ever dropped, unlike a max-lines wrapper.
 *
 * Paragraph breaks survive, and a word that is wider than the column is broken
 * at a cluster boundary instead of running under the artwork. Tamil place names
 * ("திருவான்மியூர்த்திருச்சிற்றம்பலம்") and Hindi compounds hit this routinely;
 * Latin copy almost never does.
 */
export function wrapAll(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  ctx.save();
  for (const paragraph of text.split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      // Preserve an intentional blank line, but never a leading one.
      if (lines.length) lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (ctx.measureText(word).width > width) {
        const pieces = breakWord(ctx, word, width);
        pieces.slice(0, -1).forEach((piece) => lines.push(piece));
        current = pieces[pieces.length - 1] ?? "";
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  ctx.restore();
  return lines;
}

/**
 * Wrap for a fixed slot: at most `maxLines`, with the tail marked by an ellipsis
 * when it does not fit.
 *
 * The poster layouts used `wrapAll(...).slice(0, 2)` to bound a paragraph, which
 * cut the sentence with no sign that anything was missing — a reader has no way
 * to tell "with" from the end of the thought. `ctx.font` must be the face the
 * lines will be painted in.
 */
export function wrapClip(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines = wrapAll(ctx, text, width);
  if (lines.length <= maxLines || maxLines < 1) return lines;
  const kept = lines.slice(0, maxLines);
  const tail = [kept[maxLines - 1], ...lines.slice(maxLines)].join(" ");
  kept[maxLines - 1] = ellipsize(ctx, tail, width, ctx.font);
  return kept;
}

/**
 * Largest size at which the text fits both the column width and the line budget.
 * A word wider than the column still counts as a line, so the exit test checks
 * width as well as line count.
 */
export function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines: number,
  font: (size: number) => string,
  start: number,
  min: number,
  /**
   * When the copy still needs more lines at the floor size, clip the tail with
   * an ellipsis instead of painting it. Off by default: a headline must never
   * lose words. Body copy inside a fixed card is the opposite case — the card
   * cannot grow, so the paragraph has to.
   */
  clip = false,
): { size: number; lines: string[]; truncated: boolean } {
  let size = start;
  ctx.save();
  for (;;) {
    ctx.font = font(size);
    const lines = wrapAll(ctx, text, width);
    const overflows = lines.some((line) => ctx.measureText(line).width > width * 1.005);
    if ((lines.length <= maxLines && !overflows) || size <= min) {
      // At the floor, a paragraph that still needs more lines than the block
      // has room for is cut with an ellipsis. Painting line five through the
      // footer is the alternative, and it is worse than losing the tail.
      if (clip && lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        const tail = [kept[maxLines - 1], ...lines.slice(maxLines)].join(" ");
        kept[maxLines - 1] = ellipsize(ctx, tail, width, font(size));
        ctx.restore();
        return { size, lines: kept, truncated: true };
      }
      ctx.restore();
      return { size, lines, truncated: overflows };
    }
    size = Math.max(min, size - Math.max(1, Math.round(start * 0.04)));
  }
}

/** Largest size at which a single line still fits. Used for footers beside art. */
export function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  start: number,
  min: number,
  font: (size: number) => string,
): number {
  ctx.save();
  let size = start;
  ctx.font = font(size);
  while (size > min && ctx.measureText(text).width > width) {
    size -= 1;
    ctx.font = font(size);
  }
  ctx.restore();
  return size;
}

/**
 * Clip a line to a width with an ellipsis. Used for citations and addresses,
 * where a squeezed glyph would be worse than a shortened reference — unlike
 * body copy, which must never lose a word.
 */
export function ellipsize(ctx: CanvasRenderingContext2D, text: string, width: number, font: string): string {
  ctx.save();
  ctx.font = font;
  if (ctx.measureText(text).width <= width) {
    ctx.restore();
    return text;
  }
  const words = text.split(/\s+/);
  let line = words[0] ?? "";
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${line} ${words[index]}`;
    if (ctx.measureText(`${candidate}…`).width > width) break;
    line = candidate;
  }
  // A single word can still be wider than the column (Tamil place names,
  // Hindi compounds). Trim whole clusters off the end rather than slicing
  // between a letter and its vowel sign, which would leave a dotted circle.
  const pieces = clusters(line);
  while (pieces.length > 1 && ctx.measureText(`${pieces.join("")}…`).width > width) pieces.pop();
  line = pieces.join("");
  ctx.restore();
  return `${line.replace(/[.,·—–]$/, "").trimEnd()}…`;
}
