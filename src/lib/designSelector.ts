import { BRIEF_MAP, COMPOSITIONS, COMPOSITION_MAP, resolveCategory, type CompositionKey, type DesignCategory } from "../data/designBriefs";
import { formatFor, type PosterFormat } from "./compositionPlan";

export interface DesignHistoryEntry { composition: CompositionKey; category: DesignCategory; seed: number; at: number }
export interface SelectionInput {
  category: DesignCategory;
  occasion?: string;
  width: number; height: number;
  headline?: string;
  subline?: string;
  hasArtwork?: boolean;
  seed?: number;
}
export interface DesignSelection {
  composition: CompositionKey;
  seed: number;
  reason: string;
  scores: Array<{ key: CompositionKey; score: number }>;
}
const HISTORY_KEY = "astrosivam:composition-history:v3";
export const newSeed = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0 || 1;
};
const noise = (seed: number, index: number) => {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) / 0xffffffff;
};

/**
 * History is an input, not a side effect: the same brief + history + seed gives
 * the same result in Node tests and the browser. Hard constraints run BEFORE
 * scoring, so a high category affinity can never override variety.
 */
export function selectDesign(input: SelectionInput, history: DesignHistoryEntry[] = []): DesignSelection {
  const category = resolveCategory(input.category);
  const brief = BRIEF_MAP[category];
  const seed = input.seed ?? newSeed();
  const format = formatFor(input.width, input.height);
  const last = history.at(-1)?.composition;
  const lastTwo = history.slice(-2).map((entry) => COMPOSITION_MAP[entry.composition]?.family);
  const blockedFamily = lastTwo.length === 2 && lastTwo[0] === lastTwo[1] ? lastTwo[0] : undefined;
  const recent = history.slice(-5);
  const contentLength = (input.headline?.length ?? 0) + (input.subline?.length ?? 0);
  const hasArt = input.hasArtwork !== false;
  const formatAffinity: Record<PosterFormat, Partial<Record<CompositionKey, number>>> = {
    portrait: { hero: 3, asymmetric: 3, story: 3, devotional: 2, editorial: 2, collage: 2 },
    square: { mandala: 4, minimal: 3, split: 3, editorial: 3, infographic: 2 },
    landscape: { split: 4, asymmetric: 4, editorial: 3, cosmic: 3, devotional: 3 },
    story: { hero: 4, devotional: 4, story: 3, cosmic: 3, diagonal: 2 },
  };
  const scored = COMPOSITIONS.map((meta, index) => {
    let score = (brief.weights[meta.key] ?? 0) + (formatAffinity[format][meta.key] ?? 0);
    score += noise(seed, index) * 4;
    if (!hasArt) score += ["editorial", "minimal", "infographic"].includes(meta.key) ? 12 : -10;
    if (contentLength > 190) score += ["editorial", "split", "infographic", "story"].includes(meta.key) ? 5 : -5;
    if (contentLength < 90 && hasArt) score += ["minimal", "hero", "devotional"].includes(meta.key) ? 2 : 0;
    if (category === "festival" && input.occasion === "pongal" && ["story", "collage", "split"].includes(meta.key)) score += 3;
    if (category === "muhurtham" && meta.key === "infographic") score += 2;
    const age = recent.map((entry) => entry.composition).lastIndexOf(meta.key);
    if (age !== -1) score -= (5 - age) * 1.7;
    const eligible = meta.key !== last && meta.family !== blockedFamily;
    return { key: meta.key, score: eligible ? score : -Infinity, meta };
  }).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const winner = scored[0];
  const reasons = [`${brief.shortName} art direction`, `${format} safe area`];
  if (!hasArt) reasons.push("type-led fallback");
  if (last) reasons.push("different from your previous design");
  return { composition: winner.key, seed, reason: reasons.join(" · "), scores: scored.map(({ key, score }) => ({ key, score })) };
}
export function appendHistory(history: DesignHistoryEntry[], selection: DesignSelection, category: DesignCategory): DesignHistoryEntry[] {
  return [...history, { composition: selection.composition, category, seed: selection.seed, at: Date.now() }].slice(-24);
}
export function loadHistory(): DesignHistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && COMPOSITION_MAP[entry.composition as CompositionKey] && entry.category in BRIEF_MAP).slice(-24) : [];
  } catch { return []; }
}
export function saveHistory(history: DesignHistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-24))); } catch { /* private mode: selection still works in memory */ }
}
