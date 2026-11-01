/**
 * categoryDirection — subject-specific art direction.
 *
 * A wedding-matching campaign must not read like a planetary-transit poster,
 * and a festival greeting must not read like a paid advert. Each campaign
 * register the studio supports gets a deliberate default direction: which
 * composition, palette family, graphic scene and type pairing it opens with.
 * The studio applies these as one-tap defaults; every control stays
 * overridable, and no astrological claim or service is invented here — the
 * copy still comes from the service definitions.
 */
import type { DisplayFontKey, ScriptFontKey, ThemeKey } from "../types";
import type { PosterTemplate } from "../types";
import type { GraphicSceneKey } from "../lib/graphicKit";

export type CategoryKey =
  | "jathagam"
  | "marriage"
  | "baby-naming"
  | "muhurtham"
  | "education"
  | "navagraha"
  | "festival"
  | "devotional"
  | "promo"
  | "campaign";

export interface CategoryDirection {
  key: CategoryKey;
  label: string;
  note: string;
  template: PosterTemplate;
  /** Alternate compositions worth trying for this register. */
  alternates: PosterTemplate[];
  themeKey: ThemeKey;
  artScene: GraphicSceneKey;
  display: DisplayFontKey;
  script: ScriptFontKey;
  variation: number;
}

export const CATEGORY_DIRECTIONS: CategoryDirection[] = [
  {
    key: "jathagam",
    label: "Birth Jathagam",
    note: "Flagship reading — editorial gravitas with an ephemeris accent",
    template: "gallery",
    alternates: ["nocturne", "mandapam", "sequence"],
    themeKey: "midnight",
    artScene: "orbit",
    display: "cormorant",
    script: "serif",
    variation: 0,
  },
  {
    key: "marriage",
    label: "Wedding matching",
    note: "Two families, one silk — heritage warmth, never a transit chart",
    template: "mandapam",
    alternates: ["blessing", "gallery"],
    themeKey: "kumkum",
    artScene: "silk",
    display: "cormorant",
    script: "serif",
    variation: 0,
  },
  {
    key: "baby-naming",
    label: "Baby naming letters",
    note: "Soft devotional aura, greeting-first hierarchy",
    template: "blessing",
    alternates: ["gallery", "manifesto"],
    themeKey: "ivory",
    artScene: "aura",
    display: "playfair",
    script: "serif",
    variation: 0,
  },
  {
    key: "muhurtham",
    label: "Subha Muhurtham dates",
    note: "Auspicious timing — kolam geometry and temple silk",
    template: "mandapam",
    alternates: ["lesson", "sequence"],
    themeKey: "saffron",
    artScene: "kolam",
    display: "cinzel",
    script: "serif",
    variation: 1,
  },
  {
    key: "education",
    label: "Astrology education",
    note: "Explainer grid: numbered rows, chart tile, calm palette",
    template: "lesson",
    alternates: ["sequence", "manifesto"],
    themeKey: "sand",
    artScene: "chart",
    display: "inter",
    script: "sans",
    variation: 0,
  },
  {
    key: "navagraha",
    label: "Navagraha series",
    note: "Nine planets — orbit diagram leads, carousel cover opens",
    template: "sequence",
    alternates: ["lesson", "nocturne"],
    themeKey: "cosmos",
    artScene: "orbit",
    display: "cinzel",
    script: "serif",
    variation: 0,
  },
  {
    key: "festival",
    label: "Festival greetings",
    note: "Greeting-first, devotional medallion, lamp light",
    template: "blessing",
    alternates: ["mandapam", "sequence"],
    themeKey: "granite",
    artScene: "aura",
    display: "baloo",
    script: "festive",
    variation: 0,
  },
  {
    key: "devotional",
    label: "Devotional & spiritual",
    note: "Quiet reverence — aura field, script-first blessing",
    template: "blessing",
    alternates: ["mandapam", "nocturne"],
    themeKey: "midnight",
    artScene: "aura",
    display: "cormorant",
    script: "serif",
    variation: 1,
  },
  {
    key: "promo",
    label: "Service advertisement",
    note: "Commercial clarity: hero band, benefit ticks, one CTA",
    template: "offer",
    alternates: ["gallery", "sequence"],
    themeKey: "kumkum",
    artScene: "deco",
    display: "inter",
    script: "sans",
    variation: 0,
  },
  {
    key: "campaign",
    label: "FB / IG campaign",
    note: "Feed-stopping cover with a cinematic cosmos open",
    template: "nocturne",
    alternates: ["sequence", "offer"],
    themeKey: "lunar",
    artScene: "cosmic",
    display: "playfair",
    script: "sans",
    variation: 0,
  },
];

export const CATEGORY_MAP: Record<CategoryKey, CategoryDirection> = Object.fromEntries(
  CATEGORY_DIRECTIONS.map((direction) => [direction.key, direction]),
) as Record<CategoryKey, CategoryDirection>;

export const resolveCategory = (key: string | null | undefined): CategoryDirection | undefined =>
  key ? CATEGORY_MAP[key as CategoryKey] : undefined;
