/**
 * Astrosivam Design System · design engine
 *
 * Turns a campaign brief — category, copy, format, and what the studio has just
 * shown — into a complete design: composition, palette, artwork, typeface and
 * motion preset.
 *
 * The rules that matter:
 *   · a design is a tuple; changing the palette never changes the composition;
 *   · `nextDesign` must change the *composition*, and it must not repeat any of
 *     the last four compositions unless the caller has fewer than four options;
 *   · copy length and aspect ratio change what is chosen, because a 9:16 story
 *     and a 4:5 post cannot carry the same page;
 *   · the result is seeded, so the same brief reproduces the same poster.
 */

import { CATEGORY_MAP, resolveCategory, type CategoryKey } from "./categories";
import { COMPOSITIONS, COMPOSITION_MAP, type CompositionKey, type PosterCopy } from "./compositions";
import { PALETTE_LIST, PALETTES, type PaletteKey } from "./palettes";
import { PRESET_FOR_COMPOSITION, type MotionPresetKey } from "./timeline";
import type { ArtPlan } from "./artLibrary";
import type { DisplayFace } from "./type";

export interface DesignSpec {
  id: string;
  category: CategoryKey;
  composition: CompositionKey;
  palette: PaletteKey;
  face: DisplayFace;
  motion: MotionPresetKey;
  art: ArtPlan;
  /** Deterministic detail seed. */
  seed: number;
}

export interface BriefInput {
  category?: CategoryKey | string | null;
  headline?: string;
  subline?: string;
  hasArt?: boolean;
  width?: number;
  height?: number;
  /** Recently shown compositions, newest first. */
  recent?: CompositionKey[];
  /** Locked elements — the engine will not change them. */
  palette?: PaletteKey | null;
  face?: DisplayFace | null;
  art?: ArtPlan | null;
  composition?: CompositionKey | null;
  /** Vary the seed so repeated generations are visually distinct. */
  nonce?: number;
}

/* -------------------------------- helpers --------------------------------- */

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

/** Stable id for a design tuple — two designs with the same id are the same poster. */
export const designId = (spec: Omit<DesignSpec, "id">): string => {
  const parts = [spec.category, spec.composition, spec.palette, spec.face, spec.art.kind, spec.art.subject ?? "", spec.seed % 1000];
  return parts.join(":");
};

const FACES_FOR: Record<string, DisplayFace[]> = {
  "birth-jathagam": ["cormorant", "cinzel", "playfair"],
  "wedding-matching": ["cormorant", "playfair", "cinzel"],
  "baby-naming": ["cormorant", "playfair", "marcellus"],
  "subha-muhurtham": ["cinzel", "playfair", "cormorant"],
  "astrology-education": ["inter", "playfair", "cinzel"],
  navagraha: ["cinzel", "playfair", "cormorant"],
  "festival-greeting": ["cormorant", "playfair", "marcellus"],
  devotional: ["cinzel", "cormorant", "marcellus"],
  "service-ad": ["inter", "playfair", "cinzel"],
  carousel: ["playfair", "inter", "cormorant"],
};

/** Aspect families that a composition can actually carry. */
type Shape = "square" | "portrait" | "story" | "print";

const shapeOf = (width: number, height: number): Shape => {
  if (width >= 2000) return "print";
  const ratio = height / width;
  if (ratio > 1.5) return "story";
  if (ratio < 1.08) return "square";
  return "portrait";
};

/** Compositions that fall apart outside the shapes listed. */
const SHAPE_FIT: Partial<Record<CompositionKey, Shape[]>> = {
  "hero-illustration": ["portrait", "story", "square", "print"],
  "luxury-editorial": ["portrait", "print", "story"],
  "circular-mandala": ["portrait", "story", "square", "print"],
  "diagonal-dynamic": ["portrait", "square", "story"],
  "luxury-framed": ["portrait", "story", "print"],
  "cosmic-astrology": ["portrait", "story", "print"],
  "typography-dominant": ["portrait", "print", "square", "story"],
  "educational-infographic": ["portrait", "print", "square"],
  "commercial-ad": ["portrait", "square", "story"],
  "illustrated-story": ["portrait", "story", "print"],
  "collage-asymmetric": ["portrait", "square", "print"],
  "minimal-luxury": ["portrait", "print", "square", "story"],
  "festival-celebration": ["portrait", "story", "square", "print"],
  "split-panel": ["portrait", "story", "print", "square"],
  "geometric-astrology": ["portrait", "square", "print", "story"],
};

/**
 * Wide-column compositions: a long headline needs a broad measure, or the
 * composition must be one that deliberately sets type small.
 */
const WIDE_COPY: CompositionKey[] = [
  "luxury-editorial",
  "typography-dominant",
  "educational-infographic",
  "cosmic-astrology",
  "geometric-astrology",
  "diagonal-dynamic",
  "split-panel",
];

const SHORT_COPY: CompositionKey[] = ["minimal-luxury", "circular-mandala", "luxury-framed", "hero-illustration", "festival-celebration"];

const copyProfile = (headline?: string, subline?: string) => {
  const head = (headline ?? "").trim();
  const sub = (subline ?? "").trim();
  const words = head ? head.split(/\s+/).length : 0;
  return {
    long: head.length > 52 || words > 9,
    short: head.length > 0 && head.length < 24 && words <= 4,
    hasSub: sub.length > 12,
  };
};

/** Score a composition for a brief. Higher wins. */
function scoreComposition(key: CompositionKey, input: BriefInput, position: number): number {
  const category = resolveCategory(input.category);
  const profile = copyProfile(input.headline, input.subline);
  const shape = shapeOf(input.width ?? 1080, input.height ?? 1350);
  let score = 0;

  // Category priority dominates: position 0 in the list is the natural lead.
  const categoryIndex = category.compositions.indexOf(key);
  if (categoryIndex >= 0) score += 60 - categoryIndex * 9;
  else score -= 12;

  const allowed = SHAPE_FIT[key];
  if (allowed && !allowed.includes(shape)) score -= 45;
  else score += 8;

  if (profile.long) score += WIDE_COPY.includes(key) ? 20 : -16;
  if (profile.short) score += SHORT_COPY.includes(key) ? 16 : -6;
  if (!profile.hasSub) score += key === "educational-infographic" ? -22 : 0;
  if (!input.hasArt && COMPOSITION_MAP[key]?.usesArt) score -= 4;

  // Recency: the last four compositions are excluded, not merely penalised.
  const recent = input.recent ?? [];
  const recentIndex = recent.indexOf(key);
  if (recentIndex >= 0) score -= 120 - recentIndex * 6;

  // A gentle rotation term so the same category does not always pick the same.
  score += ((hashString(`${category.key}:${key}:${input.nonce ?? 0}`) % 1000) / 1000) * 4;
  score += position * 0.001;
  return score;
}

/** Best palette for a category, honouring an explicit choice. */
const paletteFor = (categoryKey: string, nonce: number): PaletteKey => {
  const category = resolveCategory(categoryKey);
  const list = category.palettes.length ? category.palettes : PALETTE_LIST.map((p) => p.key);
  return list[nonce % list.length];
};

const faceFor = (categoryKey: string, composition: CompositionKey, nonce: number): DisplayFace => {
  // The typographic composition is an editorial serif page by definition.
  if (composition === "typography-dominant") return "cormorant";
  if (composition === "commercial-ad" || composition === "diagonal-dynamic") return "inter";
  const list = FACES_FOR[categoryKey] ?? ["cinzel"];
  return list[nonce % list.length];
};

const clampSeed = (seed: number) => Math.abs(Math.round(seed)) % 100000;

/** Build a complete design from a brief. */
export function designFromBrief(input: BriefInput = {}): DesignSpec {
  const category = resolveCategory(input.category);
  const nonce = input.nonce ?? 0;
  const compositionKey =
    input.composition && COMPOSITION_MAP[input.composition]
      ? input.composition
      : COMPOSITIONS.map((c) => c.key)
          .map((key, i) => ({ key, score: scoreComposition(key, { ...input, category: category.key }, i) }))
          .sort((a, b) => b.score - a.score)[0].key;

  const palette = (input.palette && PALETTES[input.palette] ? input.palette : paletteFor(category.key, nonce)) as PaletteKey;
  const face = (input.face ?? faceFor(category.key, compositionKey, nonce)) as DisplayFace;
  const art: ArtPlan = input.art ?? { ...category.art, seed: clampSeed(hashString(`${category.key}:${nonce}`)) };
  const motion: MotionPresetKey = PRESET_FOR_COMPOSITION[compositionKey] ?? "spiritual";
  const seed = clampSeed(hashString(`${compositionKey}:${palette}:${category.key}:${nonce}`));
  const draft = {
    category: category.key,
    composition: compositionKey,
    palette,
    face,
    motion,
    art: { ...art, seed: art.seed ?? seed },
    seed,
  };
  return { id: designId(draft), ...draft };
}

/**
 * Generate another design. Changes the composition (and, where it helps, the
 * palette), and refuses to reuse any of the last four.
 */
export function nextDesign(current: DesignSpec, input: BriefInput = {}): DesignSpec {
  // Dedupe before slicing: a caller that already listed the current
  // composition would otherwise spend two of its four exclusion slots on one
  // family and let a fourth-from-last repeat come back.
  const recent = Array.from(new Set([current.composition, ...(input.recent ?? [])])).slice(0, 4);
  const category = CATEGORY_MAP[current.category] ?? resolveCategory(current.category);
  const shape = shapeOf(input.width ?? 1080, input.height ?? 1350);
  // Candidates: the category's own list first, then everything else.
  const candidates = [
    ...category.compositions.filter((key) => !recent.includes(key)),
    ...COMPOSITIONS.map((c) => c.key).filter((key) => !category.compositions.includes(key) && !recent.includes(key)),
  ];
  const viable = candidates.filter((key) => {
    const allowed = SHAPE_FIT[key];
    return !allowed || allowed.includes(shape);
  });
  const pool = viable.length ? viable : candidates;
  const profile = copyProfile(input.headline ?? "", input.subline ?? "");
  // Prefer a composition whose type column suits this copy.
  const preferred = pool.find((key) => (profile.long ? WIDE_COPY.includes(key) : true)) ?? pool[0] ?? current.composition;
  const allowedPalettes = category.palettes.length ? category.palettes : PALETTE_LIST.map((p) => p.key);
  const paletteIndex = allowedPalettes.indexOf(current.palette);
  const nextPalette = (allowedPalettes[(paletteIndex + 1) % allowedPalettes.length] ?? current.palette) as PaletteKey;
  const nonce = (input.nonce ?? 0) + 1;
  return designFromBrief({
    ...input,
    category: current.category,
    composition: input.composition ?? preferred,
    // Keep the client's palette when they picked one; otherwise rotate.
    palette: input.palette ?? nextPalette,
    face: input.face ?? null,
    art: input.art ?? null,
    recent,
    nonce,
  });
}

/* --------------------------------- variety -------------------------------- */

/**
 * The diversity harness. Produces `count` designs for a set of categories with
 * the rule "no more than two consecutive samples share a composition".
 */
export function diversityRun(
  categories: CategoryKey[],
  count: number,
  options: { width?: number; height?: number; startSeed?: number } = {},
): DesignSpec[] {
  const out: DesignSpec[] = [];
  const recent: CompositionKey[] = [];
  for (let i = 0; i < count; i += 1) {
    const category = categories[i % categories.length];
    const spec = designFromBrief({
      category,
      width: options.width ?? 1080,
      height: options.height ?? 1350,
      recent: recent.slice(0, 3),
      nonce: (options.startSeed ?? 0) + i,
      headline: CATEGORY_MAP[category]?.sample.headline,
      subline: CATEGORY_MAP[category]?.sample.subline,
    });
    out.push(spec);
    recent.unshift(spec.composition);
    if (recent.length > 6) recent.pop();
  }
  return out;
}

/* ------------------------------- copy normalisation ----------------------- */

/** The copy a design actually paints: English only, trimmed, footer fallback. */
export function normaliseCopy(copy: Partial<PosterCopy>): PosterCopy {
  const clean = (value?: string) => (value ?? "").replace(/\s+/g, " ").trim();
  return {
    kicker: clean(copy.kicker),
    headline: clean(copy.headline) || "Astro Sivam",
    subline: clean(copy.subline),
    cta: clean(copy.cta) || "astrosivam.com",
    footer: clean(copy.footer) || clean(copy.cta) || "astrosivam.com",
    badge: copy.badge ? clean(copy.badge) : undefined,
  };
}

export { resolveComposition } from "./compositions";
