import { hasGlyph } from "./canvas";
import { breakWord, clusters } from "./typeset";

export { breakWord, clusters };

/**
 * Script-aware text handling.
 *
 * The studio draws three scripts with three different faces, and each one fails
 * in a different way. Tamil and Devanagari are *shaped*: their vowel signs and
 * viramas belong to the preceding letter, so anything that walks the string one
 * glyph at a time — letter-spacing, a naive wrap, an ellipsis at the wrong
 * index — breaks the cluster and renders a dotted circle instead of a letter.
 * Latin display faces, meanwhile, are missing ₹ and often the Tamil/Devanagari
 * ranges entirely, so a "safe" fallback has to be chosen per character.
 *
 * This module holds the shared answers so every engine behaves the same way.
 */

export type ScriptName = "latin" | "tamil" | "devanagari" | "mixed";

const TAMIL_RANGE = /[\u0B80-\u0BFF]/;
const DEVA_RANGE = /[\u0900-\u097F]/;

export function isTamil(text: string): boolean {
  return TAMIL_RANGE.test(text);
}

export function isDevanagari(text: string): boolean {
  return DEVA_RANGE.test(text);
}

export function isIndic(text: string): boolean {
  return TAMIL_RANGE.test(text) || DEVA_RANGE.test(text);
}

export function scriptOf(text: string): ScriptName {
  const tamil = TAMIL_RANGE.test(text);
  const deva = DEVA_RANGE.test(text);
  if (tamil && deva) return "mixed";
  if (tamil) return "tamil";
  if (deva) return "devanagari";
  return "latin";
}

/**
 * Truncate without ending between a letter and its vowel sign. Caption previews
 * cut at 280–320 characters; on Tamil that boundary lands inside a cluster
 * roughly one time in three and leaves an orphaned dotted circle.
 */
export function safeSlice(text: string, max: number): string {
  if (text.length <= max) return text;
  // Cut on a cluster boundary, never inside one: a Tamil caption preview that
  // ends on a bare vowel sign renders as a dotted circle.
  let out = "";
  for (const cluster of clusters(text)) {
    if (out.length + cluster.length > max) break;
    out += cluster;
  }
  return out || clusters(text)[0] || "";
}

/**
 * Split a mixed string into script runs, so a Tamil greeting inside an English
 * caption can be marked with `lang="ta"` and painted in the Tamil face while the
 * surrounding sentence keeps the Latin face. Whitespace between runs is folded
 * into the preceding run to keep word spacing even.
 */
export interface ScriptRun {
  text: string;
  script: Exclude<ScriptName, "mixed">;
}

export function splitByScript(text: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  for (const char of Array.from(text)) {
    const script: ScriptRun["script"] = TAMIL_RANGE.test(char)
      ? "tamil"
      : DEVA_RANGE.test(char)
        ? "devanagari"
        : "latin";
    const last = runs[runs.length - 1];
    // Whitespace is script-neutral: it joins whatever run it follows so word
    // spacing stays even. Anything else starts a run of its own language — an
    // em dash between two Tamil words belongs to the Latin face, not to Tamil.
    if (last && (last.script === script || (script === "latin" && /\s/.test(char)))) last.text += char;
    else runs.push({ text: char, script });
  }
  return runs;
}

/**
 * Letter-spacing is a Latin typographic device. On an Indic run it either
 * shatters the cluster (when the renderer positions each glyph) or leaves an
 * uneven gap after every syllable (when it positions each cluster). Both are
 * wrong, so requested tracking is dropped for any string containing Indic text.
 */
export function trackingFor(text: string, wanted: number): number {
  return isIndic(text) ? 0 : wanted;
}

/** Conservative word count used by the caption checks. */
export const words = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);

/**
 * Every character the face cannot draw, in order, de-duplicated. Spaces and
 * combining marks are excluded: they have no glyph of their own by design.
 */
export function missingGlyphs(font: string, text: string): string[] {
  const missing: string[] = [];
  for (const cluster of clusters(text)) {
    const base = Array.from(cluster)[0];
    if (!base || /\s/.test(base)) continue;
    if (!hasGlyph(font, base)) missing.push(base);
  }
  return [...new Set(missing)];
}

export interface FaceSpec {
  /** Human label used in reports, e.g. "Tamil — Tiro Tamil". */
  name: string;
  /** CSS font shorthand as the painter would set it. */
  font: string;
}

export interface CoverageFinding {
  face: string;
  text: string;
  missing: string[];
}

/**
 * Coverage for a set of strings across a set of faces. The caller passes the
 * exact strings it intends to draw and the exact font strings it will use, so
 * the report matches the canvas rather than a guess about the font stack.
 */
export function coverageReport(faces: FaceSpec[], strings: string[]): CoverageFinding[] {
  const findings: CoverageFinding[] = [];
  for (const face of faces) {
    for (const text of strings) {
      if (!text.trim()) continue;
      const missing = missingGlyphs(face.font, text);
      if (missing.length) findings.push({ face: face.name, text, missing });
    }
  }
  return findings;
}

/** One-line summary for the UI badge. */
export function coverageSummary(findings: CoverageFinding[]): string {
  if (!findings.length) return "All characters covered";
  const chars = [...new Set(findings.flatMap((finding) => finding.missing))];
  return `${chars.length} character${chars.length === 1 ? "" : "s"} missing: ${chars.join(" ")}`;
}

/**
 * A paragraph is "long" when it will need more than `lines` at the given size.
 * Used by the audits to decide whether a placement needs a smaller size.
 */
export function approximateLines(ctx: CanvasRenderingContext2D, text: string, width: number): number {
  if (!text.trim()) return 0;
  const total = ctx.measureText(text).width;
  return Math.max(1, Math.ceil(total / Math.max(1, width)));
}
