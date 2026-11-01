/**
 * Astrosivam studio · design state
 *
 * The studio's own model, sitting on top of the v3 design engine. Everything the
 * brief asks the user to control is a separate, optional lock on the spec:
 *
 *   category      the brief's identity (copy direction, art family, ladders)
 *   composition   which page architecture
 *   art           which illustration program
 *   palette       which colour scheme
 *   face          which display typeface
 *   decoration    how much ornament the ground and the emblem carry
 *   motion        which animation preset the reel and the preview use
 *   format        the aspect ratio
 *
 * None of those fields can force another: `designFromBrief` only consults a lock
 * when one is set, so changing a palette never rebuilds the composition and
 * changing a composition never recolours the card. That is the whole point of
 * keeping the locks in one small object instead of scattering flags.
 */

import { ART_BY_ID, CATEGORIES, CATEGORY_MAP, resolveCategory, type CategoryKey } from "../design/categories";
import { COMPOSITIONS, type CompositionKey, type PosterCopy } from "../design/compositions";
import {
  designFromBrief,
  nextDesign,
  type BriefInput,
  type DesignSpec,
} from "../design/engine";
import { paletteFor } from "../design/palettes";
import { MOTION_PRESETS, type MotionPresetKey } from "../design/timeline";
import type { ArtPlan } from "../design/artLibrary";
import { englishOnly } from "../design/type";

export type DecorationLevel = "quiet" | "balanced" | "rich";

export const DECORATION_LEVELS: Array<{ key: DecorationLevel; label: string; note: string }> = [
  { key: "quiet", label: "Quiet", note: "Hairlines only — the type carries the page" },
  { key: "balanced", label: "Balanced", note: "Ornament in the margins, never behind the words" },
  { key: "rich", label: "Rich", note: "Full ornament: emblems, garlands, engraved plates" },
];

export interface PosterFormat {
  id: string;
  label: string;
  note: string;
  width: number;
  height: number;
  /** What this ratio is actually for, so the picker is not a list of numbers. */
  use: string;
}

export const FORMATS: PosterFormat[] = [
  { id: "ig-post", label: "IG portrait", note: "4:5", width: 1080, height: 1350, use: "Instagram and Facebook feed — the default" },
  { id: "ig-square", label: "Square", note: "1:1", width: 1080, height: 1080, use: "Grid-friendly feed post, WhatsApp forward" },
  { id: "story", label: "Story", note: "9:16", width: 1080, height: 1920, use: "Story, Reel cover, Status — also the reel size" },
  { id: "fb-post", label: "FB post", note: "4:5 tall", width: 1200, height: 1500, use: "Facebook feed at full width" },
  { id: "print", label: "A4 print", note: "300 dpi", width: 2480, height: 3508, use: "Handbill and framed print, 210 × 297 mm" },
];

export const formatById = (id: string): PosterFormat => FORMATS.find((f) => f.id === id) ?? FORMATS[0];

/* ------------------------------- composition picker ------------------------ */

export interface CompositionChoice {
  key: CompositionKey;
  name: string;
  structure: string;
  note: string;
  bestFor: string[];
}

/** Every composition, in canvas order, with the structure line the UI shows. */
export const COMPOSITION_CHOICES: CompositionChoice[] = COMPOSITIONS.map((c) => ({
  key: c.key,
  name: c.name,
  structure: c.structure,
  note: c.note,
  bestFor: c.bestFor,
}));

export const compositionName = (key: string) =>
  COMPOSITION_CHOICES.find((c) => c.key === key)?.name ?? key;

/* --------------------------------- the state ------------------------------ */

export interface StudioDesignState {
  category: CategoryKey;
  /** Artwork id from `ART_CHOICES`, or null to follow the category. */
  artId: string | null;
  /** Locks. `null` means "let the engine decide". */
  composition: CompositionKey | null;
  palette: DesignSpec["palette"] | null;
  face: DesignSpec["face"] | null;
  motion: MotionPresetKey | null;
  decoration: DecorationLevel;
  formatId: string;
  copy: PosterCopy;
  showLogo: boolean;
  /** Bumped by Generate another design, to vary detail seeds. */
  nonce: number;
  /** Recently shown compositions, newest first — powers the anti-repeat rule. */
  recent: CompositionKey[];
  /** The design currently on the canvas. */
  design: DesignSpec;
}

const DEFAULT_CATEGORY: CategoryKey = "festival-greeting";

/** The copy a category opens with, in English, with the contact line normalised. */
export const copyForCategory = (key: CategoryKey): PosterCopy => {
  const category = CATEGORY_MAP[key] ?? CATEGORY_MAP[DEFAULT_CATEGORY];
  return {
    kicker: category.sample.kicker,
    headline: category.sample.headline,
    subline: category.sample.subline,
    cta: category.sample.cta || "astrosivam.com",
    footer: category.sample.footer || "astrosivam.com",
    badge: category.sample.badge,
  };
};

const artFor = (artId: string | null, category: CategoryKey): ArtPlan | undefined => {
  if (!artId) return undefined;
  return ART_BY_ID[artId]?.plan ?? CATEGORY_MAP[category]?.art;
};

/** Build the brief implied by a state, honouring every lock that is set. */
export const briefFor = (state: StudioDesignState, format?: PosterFormat): BriefInput => {
  const shape = format ?? formatById(state.formatId);
  return {
    category: state.category,
    headline: state.copy.headline,
    subline: state.copy.subline,
    width: shape.width,
    height: shape.height,
    recent: state.recent.slice(0, 4),
    composition: state.composition,
    palette: state.palette,
    face: state.face,
    art: artFor(state.artId, state.category),
    nonce: state.nonce,
  };
};

export function createStudioDesign(input: {
  category?: CategoryKey;
  formatId?: string;
  copy?: Partial<PosterCopy>;
  artId?: string | null;
  composition?: CompositionKey | null;
  palette?: DesignSpec["palette"] | null;
  face?: DesignSpec["face"] | null;
  motion?: MotionPresetKey | null;
  decoration?: DecorationLevel;
  recent?: CompositionKey[];
  nonce?: number;
  showLogo?: boolean;
} = {}): StudioDesignState {
  const category = input.category ?? DEFAULT_CATEGORY;
  const format = formatById(input.formatId ?? "ig-post");
  const copy = { ...copyForCategory(category), ...(input.copy ?? {}) };
  const base: StudioDesignState = {
    category,
    artId: input.artId ?? null,
    composition: input.composition ?? null,
    palette: input.palette ?? null,
    face: input.face ?? null,
    motion: input.motion ?? null,
    decoration: input.decoration ?? "balanced",
    formatId: format.id,
    copy,
    showLogo: input.showLogo ?? true,
    nonce: input.nonce ?? 0,
    recent: input.recent ?? [],
    design: null as unknown as DesignSpec,
  };
  const spec = designFromBrief(briefFor(base, format));
  return { ...base, design: { ...spec, motion: base.motion ?? spec.motion } };
}

/**
 * Apply one change, then re-resolve. Because only the touched field is locked,
 * a palette change keeps the composition and an art change keeps the layout.
 */
export function applyChange(
  state: StudioDesignState,
  change: Partial<StudioDesignState>,
): StudioDesignState {
  const next: StudioDesignState = { ...state, ...change };
  const format = formatById(next.formatId);
  const spec = designFromBrief(briefFor(next, format));
  return { ...next, design: { ...spec, motion: next.motion ?? spec.motion } };
}

/** Choose a category: copy follows it, locks stay, and the art resets to the category's. */
export function selectCategory(state: StudioDesignState, key: CategoryKey): StudioDesignState {
  const category = CATEGORY_MAP[key];
  if (!category) return state;
  const fresh = copyForCategory(key);
  const previous = copyForCategory(state.category);
  // Field by field: anything the client wrote survives, anything that was still
  // the old brief's boilerplate is replaced by the new brief's.
  const keep = <K extends keyof PosterCopy>(field: K): PosterCopy[K] =>
    (state.copy[field] ?? "") !== (previous[field] ?? "") ? state.copy[field] : fresh[field];
  return applyChange(state, {
    category: key,
    artId: null,
    copy: {
      kicker: keep("kicker"),
      headline: keep("headline"),
      subline: keep("subline"),
      cta: keep("cta"),
      footer: keep("footer"),
      badge: keep("badge"),
    },
  });
}

/**
 * Generate another design: a structurally different composition, never one of
 * the last four, with a new detail seed and a palette rotation that does not
 * fight the new composition.
 */
export function generateAnother(state: StudioDesignState): StudioDesignState {
  const format = formatById(state.formatId);
  const recent = Array.from(new Set<CompositionKey>([state.design.composition, ...state.recent])).slice(0, 5);
  const spec = nextDesign(state.design, {
    ...briefFor({ ...state, recent }, format),
    // Generate Another exists to change the structure, so the lock is released.
    composition: null,
    nonce: state.nonce + 1,
  });
  return {
    ...state,
    composition: null,
    nonce: state.nonce + 1,
    recent,
    design: { ...spec, motion: state.motion ?? spec.motion },
  };
}

/** All composition families, for the "browse every structure" gallery. */
export const compositionCount = COMPOSITION_CHOICES.length;

export const motionChoices = MOTION_PRESETS.map((preset) => ({
  key: preset.key,
  name: preset.name,
  note: preset.note,
  seconds: preset.seconds,
}));

/** Categories, with the copy each one carries — used by the category rail. */
export const categoryChoices = CATEGORIES.map((category) => ({
  key: category.key,
  name: category.name,
  direction: category.direction,
}));

/** Artwork options grouped for the illustration picker. */
export const artGroups = CATEGORIES.length
  ? Array.from(new Set(Object.values(ART_BY_ID).map((a) => a.group))).map((group) => ({
      group,
      items: Object.values(ART_BY_ID).filter((a) => a.group === group),
    }))
  : [];

/* ------------------------------ preview helpers --------------------------- */

/** The palette object behind a design — the studio shows its swatches. */
export const designPalette = (design: DesignSpec) => paletteFor(design.palette);

/** Non-English text in the user's copy, field by field. */
export function copyFlags(copy: PosterCopy) {
  const fields: Array<{ field: keyof PosterCopy; label: string; value: string }> = [
    { field: "kicker", label: "Kicker", value: copy.kicker ?? "" },
    { field: "headline", label: "Headline", value: copy.headline ?? "" },
    { field: "subline", label: "Subline", value: copy.subline ?? "" },
    { field: "cta", label: "Call to action", value: copy.cta ?? "" },
    { field: "footer", label: "Contact line", value: copy.footer ?? "" },
  ];
  return fields
    .map((entry) => ({ ...entry, clean: englishOnly(entry.value) }))
    .filter((entry) => entry.clean !== entry.value);
}

/** A category-safe default state for a brand-new studio visit. */
export const starterState = (formatId = "ig-post") => createStudioDesign({ category: DEFAULT_CATEGORY, formatId });

export { resolveCategory };
