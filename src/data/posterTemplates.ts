import type { PosterLayout, PosterTemplate, TemplateMeta } from "../types";

/**
 * The eight poster compositions, redesigned as a graphic campaign system.
 *
 * Every entry is its own piece of art direction — grid, artwork treatment,
 * typographic hierarchy, motion grammar and call-to-action — and each ships
 * several genuinely different composition variations (recorded in
 * `variations`), so one campaign can produce a family of posters instead of
 * one layout in eight colours.
 */
export const TEMPLATES: TemplateMeta[] = [
  {
    key: "mandapam",
    name: "South Indian Heritage",
    family: "Heritage",
    tagline: "Temple-silk field, foiled arch window, Tamil-first greeting.",
    description:
      "A heritage plate: flowing zari-silk gradients form the ground, the devotional artwork sits inside a foiled arch window with a halo behind it, and the Tamil line leads above the English headline. A computed pulli-kolam band and two lamp glows close the page — restraint instead of clip-art ornament.",
    bestFor: "Muhurtham, Griha Pravesam, temple festivals, deity blessings, wedding matching.",
    composition: "Silk field · foiled arch window · script-first copy · kolam footing",
    usesImage: true,
    defaultTheme: "saffron",
    defaultLayout: "portrait-arch",
    variations: 2,
    defaultArtScene: "silk",
  },
  {
    key: "gallery",
    name: "Luxury Editorial",
    family: "Editorial",
    tagline: "Magazine split: full-height art plate against a type column.",
    description:
      "A magazine spread. The artwork runs full-height as a plate with an inset foil keyline while the type column carries masthead, kicker, display headline and a catalogue caption on a strict rule; a third variation stacks the plate above the type for story formats. Whitespace and alignment do the work.",
    bestFor: "Flagship service launches, sample-report reveals, brand credibility posts.",
    composition: "Full-height plate · ruled type column · catalogue caption",
    usesImage: true,
    defaultTheme: "sand",
    defaultLayout: "split",
    variations: 3,
    defaultArtScene: "orbit",
  },
  {
    key: "manifesto",
    name: "Minimal Typography",
    family: "Editorial",
    tagline: "Type as the artwork, set as large as the format allows.",
    description:
      "No picture at all. The headline is measured and set as large as the page allows on one of three grids — margin rail, centred statement or bottom-weighted billboard — with a translucent Tamil watermark, a single gold slash and generous negative space. Pure typographic impact.",
    bestFor: "Quotes, method statements, 'why exact birth time matters' posts.",
    composition: "Typographic only · Tamil watermark · three type grids",
    usesImage: false,
    defaultTheme: "ink",
    defaultLayout: "type-only",
    variations: 3,
    defaultArtScene: "style",
  },
  {
    key: "nocturne",
    name: "Cinematic Astrology",
    family: "Modern",
    tagline: "Full-bleed cosmos, letterbox scrims, headline in the lower third.",
    description:
      "A film still. A cosmic field of nebula gradients, parallax stars and constellation line work (or the user's photograph under a cinematic grade) fills the page; letterbox scrims carry the headline in the lower third or across a horizon band, with an ephemeris arc accent in the corner. No cards, no glass.",
    bestFor: "Transits, eclipses, retrogrades, reel covers and cinematic announcements.",
    composition: "Full-bleed cosmos · letterbox scrim · lower-third headline",
    usesImage: true,
    defaultTheme: "lunar",
    defaultLayout: "full-bleed",
    variations: 2,
    defaultArtScene: "cosmic",
  },
  {
    key: "lesson",
    name: "Educational Graphic",
    family: "Editorial",
    tagline: "Series header, chart tile, numbered editorial rows.",
    description:
      "Built to teach. A series numeral and kicker rule head the page, the headline sits beside a circular star-chart or orbit tile, and the supporting points become numbered editorial rows separated by hairlines — an information hierarchy that reads like a printed explainer, not a UI list.",
    bestFor: "Explainers, panchangam notes, 'what is Sade Sati' carousels, navagraha series.",
    composition: "Series header · chart tile · numbered rows · progress rail",
    usesImage: true,
    defaultTheme: "sand",
    defaultLayout: "split",
    variations: 2,
    defaultArtScene: "chart",
  },
  {
    key: "offer",
    name: "Service Advertisement",
    family: "Campaign",
    tagline: "Hero band, benefit checklist, one CTA and a foil seal.",
    description:
      "A commercial layout with advertising discipline: a hero band of deco foil rays or the service photograph carries the campaign kicker chip, then a measured headline, a benefit checklist with foil ticks, a single filled call-to-action and a foiled brand seal — every row flowing from the last, nothing colliding.",
    bestFor: "Paid boosts, offer posts, consultation drives, price announcements.",
    composition: "Hero band · kicker chip · benefit ticks · CTA and foil seal",
    usesImage: true,
    defaultTheme: "kumkum",
    defaultLayout: "split",
    variations: 2,
    defaultArtScene: "deco",
  },
  {
    key: "blessing",
    name: "Festival Greeting",
    family: "Heritage",
    tagline: "Devotional medallion in an aura field, greeting first.",
    description:
      "A ceremonial greeting. Concentric halo rings and drifting motes form a devotional aura behind a foiled medallion holding the deity, the Tamil or Hindi wish leads at full festive size with the English blessing beneath, and a kolam band with lamp glows closes the page in celebratory colour.",
    bestFor: "Diwali, Pongal, Navaratri, Karthigai Deepam, Varalakshmi greetings.",
    composition: "Aura field · foiled medallion · greeting-first hierarchy",
    usesImage: true,
    defaultTheme: "granite",
    defaultLayout: "medallion",
    variations: 2,
    defaultArtScene: "aura",
  },
  {
    key: "sequence",
    name: "Carousel Cover",
    family: "Campaign",
    tagline: "Art cut by a foil seam, index numeral, swipe prompt.",
    description:
      "The first slide of a swipe sequence. The artwork fills the upper page and is cut by a clean foil-edged diagonal (or ruled seam) into the copy field, an oversized index numeral sits fully inside the margin beside the headline, and page dots plus a swipe arrow tell the viewer what to do next.",
    bestFor: "First slide of any carousel, story sequences, series covers.",
    composition: "Seam-cut art · contained index numeral · swipe affordance",
    usesImage: true,
    defaultTheme: "midnight",
    defaultLayout: "full-bleed",
    variations: 2,
    defaultArtScene: "cosmic",
  },
];

export const TEMPLATE_MAP: Record<string, TemplateMeta> = Object.fromEntries(
  TEMPLATES.map((template) => [template.key, template]),
);

export const TEMPLATE_FAMILIES = ["Editorial", "Heritage", "Modern", "Campaign"] as const;

/** The composition each legacy layout maps onto, for saved presets and callers. */
export const LAYOUT_TEMPLATE: Record<PosterLayout, PosterTemplate> = {
  "portrait-arch": "mandapam",
  "full-bleed": "nocturne",
  split: "gallery",
  medallion: "blessing",
  "type-only": "manifesto",
};

/** Saved posters and presets from the previous template set keep opening. */
export const LEGACY_TEMPLATE: Record<string, PosterTemplate> = {
  "editorial-luxe": "gallery",
  heritage: "mandapam",
  "minimal-type": "manifesto",
  cinematic: "nocturne",
  educational: "lesson",
  "service-ad": "offer",
  festival: "blessing",
  "carousel-cover": "sequence",
};

export const resolveTemplate = (key: string | undefined | null): PosterTemplate | undefined =>
  key ? (TEMPLATE_MAP[key] ? (key as PosterTemplate) : LEGACY_TEMPLATE[key]) : undefined;

export const templateForLayout = (layout: PosterLayout): PosterTemplate =>
  LAYOUT_TEMPLATE[layout] ?? "gallery";

export const layoutForTemplate = (template: PosterTemplate): PosterLayout =>
  TEMPLATE_MAP[template]?.defaultLayout ?? "split";
