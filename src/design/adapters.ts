/**
 * Astrosivam Design System · adapters
 *
 * Two directions of translation, so the new engine and the existing app can
 * share one canvas pipeline:
 *
 *   fromLegacyPoster()  the v2 poster options (template + style + theme + Indic
 *                       script lines) are mapped onto a v3 design. Saved presets,
 *                       festival hand-offs and the export audit all keep working,
 *                       and anything Indic is dropped before it reaches a canvas.
 *
 *   toLegacyLayout()    a v3 composition is mapped back onto one of the five legacy
 *                       layout names, for callers that only understand those.
 */

import type {
  DisplayFontKey,
  ImageFit,
  PosterLayout,
  PosterTemplate,
  ScriptFontKey,
  StyleKey,
  ThemeKey,
} from "../types";
import { designId, type DesignSpec } from "./engine";
import type { CategoryKey } from "./categories";
import type { CompositionKey } from "./compositions";
import type { PaletteKey } from "./palettes";
import type { ArtPlan } from "./artLibrary";
import type { DisplayFace } from "./type";

/** The v2 palette name → v3 palette. */
const THEME_TO_PALETTE: Record<string, PaletteKey> = {
  midnight: "indigo-cosmos",
  ivory: "ivory-sand",
  saffron: "saffron-ember",
  jade: "emerald-temple",
  granite: "granite-brass",
  forest: "emerald-temple",
  kumkum: "kumkum-red",
  sand: "champagne-slate",
  ink: "granite-brass",
  dawn: "saffron-ember",
  lagoon: "midnight-lagoon",
  cosmos: "indigo-cosmos",
  lunar: "violet-astral",
  obsidian: "granite-brass",
  terracotta: "maroon-gold",
};

/** The v2 template name → the v3 composition closest in intent. */
const TEMPLATE_TO_COMPOSITION: Record<PosterTemplate, CompositionKey> = {
  mandapam: "hero-illustration",
  gallery: "luxury-editorial",
  manifesto: "typography-dominant",
  nocturne: "cosmic-astrology",
  lesson: "educational-infographic",
  offer: "commercial-ad",
  blessing: "festival-celebration",
  sequence: "collage-asymmetric",
};

/** The v2 layout name → the v3 composition it becomes when no template is set. */
const LAYOUT_TO_COMPOSITION: Record<PosterLayout, CompositionKey> = {
  "portrait-arch": "hero-illustration",
  "full-bleed": "cosmic-astrology",
  split: "luxury-editorial",
  medallion: "festival-celebration",
  "type-only": "typography-dominant",
};

/** The v2 art-direction name → the illustration program it implies. */
const STYLE_ART: Record<string, ArtPlan> = {
  signature: { kind: "deity-emblem", subject: "ganesha" },
  thanjavur: { kind: "deity-emblem", subject: "lakshmi" },
  kolam: { kind: "mandala-rose" },
  silk: { kind: "festive-altar" },
  gopuram: { kind: "deity-emblem", subject: "murugan" },
  deepam: { kind: "festive-altar" },
  mono: { kind: "mandala-rose" },
  paper: { kind: "jathagam-chart" },
  ephemeris: { kind: "jathagam-chart" },
  aurum: { kind: "zodiac-medallion", subject: "aries" },
  glass: { kind: "celestial-scene" },
  orbit: { kind: "navagraha-grid" },
};

const FONT_TO_FACE: Record<string, DisplayFace> = {
  cinzel: "cinzel",
  cormorant: "cormorant",
  playfair: "playfair",
  inter: "inter",
  marcellus: "marcellus",
  baloo: "cormorant",
  jakarta: "inter",
};

/** What the v2 caller hands us. Every field is optional so presets can be partial. */
export interface LegacyPoster {
  themeKey?: ThemeKey;
  style?: StyleKey;
  layout?: PosterLayout;
  template?: PosterTemplate;
  display?: DisplayFontKey;
  script?: ScriptFontKey;
  image?: string | null;
  imageFit?: ImageFit;
  kicker?: string;
  headline?: string;
  subline?: string;
  cta?: string;
  footer?: string;
  /** Deity key, when the v2 preset came from the deity picker. */
  deity?: string;
}

const DEITY_ART: Record<string, ArtPlan> = {
  ganesha: { kind: "deity-emblem", subject: "ganesha" },
  shiva: { kind: "deity-emblem", subject: "shiva" },
  murugan: { kind: "deity-emblem", subject: "murugan" },
  lakshmi: { kind: "deity-emblem", subject: "lakshmi" },
  saraswati: { kind: "deity-emblem", subject: "saraswati" },
  durga: { kind: "deity-emblem", subject: "durga" },
  krishna: { kind: "deity-emblem", subject: "krishna" },
  rama: { kind: "deity-emblem", subject: "rama" },
  hanuman: { kind: "deity-emblem", subject: "hanuman" },
  venkateswara: { kind: "deity-emblem", subject: "venkateswara" },
  ayyappa: { kind: "deity-emblem", subject: "ayyappa" },
  meenakshi: { kind: "deity-emblem", subject: "meenakshi" },
};

/**
 * Which category a legacy poster most resembles, judged from its template and
 * art direction. Used so a saved poster keeps a sensible creative direction.
 */
export function inferCategory(legacy: LegacyPoster): CategoryKey {
  if (legacy.deity) return "devotional";
  if (legacy.template === "blessing") return "festival-greeting";
  if (legacy.template === "lesson") return "astrology-education";
  if (legacy.template === "offer") return "service-ad";
  if (legacy.template === "sequence") return "carousel";
  if (legacy.template === "gallery" || legacy.template === "nocturne") return "birth-jathagam";
  if (legacy.style === "ephemeris" || legacy.style === "orbit") return "navagraha";
  if (legacy.style === "paper") return "birth-jathagam";
  if (legacy.style === "deepam") return "festival-greeting";
  return "birth-jathagam";
}

/** Resolve a v3 design from a v2 poster. Deterministic: same input, same poster. */
export function fromLegacyPoster(legacy: LegacyPoster, nonce = 0): DesignSpec {
  const composition: CompositionKey =
    (legacy.template && TEMPLATE_TO_COMPOSITION[legacy.template]) ||
    (legacy.layout && LAYOUT_TO_COMPOSITION[legacy.layout]) ||
    "hero-illustration";
  const palette = (legacy.themeKey && THEME_TO_PALETTE[legacy.themeKey]) || "maroon-gold";
  const face = (legacy.display && FONT_TO_FACE[legacy.display]) || "cinzel";
  const art =
    (legacy.deity && DEITY_ART[legacy.deity]) ||
    (legacy.style && STYLE_ART[legacy.style]) ||
    ({ kind: "deity-emblem", subject: "ganesha" } as ArtPlan);
  const category = inferCategory(legacy);
  const draft = {
    category,
    composition,
    palette,
    face,
    motion: "spiritual" as const,
    art,
    seed: Math.abs((nonce + 1) * 7919 + (legacy.headline?.length ?? 0) * 31 || 11) % 99991,
  };
  return { id: designId(draft), ...draft };
}

/** Map a v3 composition onto a legacy layout name. */
export function toLegacyLayout(composition: CompositionKey): PosterLayout {
  switch (composition) {
    case "hero-illustration":
    case "split-panel":
      return "portrait-arch";
    case "circular-mandala":
    case "festival-celebration":
      return "medallion";
    case "typography-dominant":
    case "minimal-luxury":
      return "type-only";
    case "cosmic-astrology":
    case "geometric-astrology":
    case "illustrated-story":
    case "diagonal-dynamic":
      return "full-bleed";
    default:
      return "split";
  }
}

/** Map a v3 composition onto a legacy template name. */
export function toLegacyTemplate(composition: CompositionKey): PosterTemplate {
  const entry = Object.entries(TEMPLATE_TO_COMPOSITION).find(([, value]) => value === composition);
  return (entry?.[0] as PosterTemplate) ?? "mandapam";
}
