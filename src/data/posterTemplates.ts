import type { PosterLayout, PosterTemplate, TemplateMeta } from "../types";
import { COMPOSITIONS } from "./designBriefs";

/**
 * The eight poster compositions, rebuilt for the twelve-style system.
 *
 * Each entry is a genuinely different piece of layout work — a different grid,
 * image treatment, typographic hierarchy and call-to-action — not a recolour.
 * The style chips supply the ground, frame and motif; the template owns where
 * everything sits.
 */
export const LEGACY_TEMPLATES: TemplateMeta[] = [
  {
    key: "mandapam",
    name: "Temple Mandapam",
    family: "Heritage",
    tagline: "Pillared hall: fluted columns, lit arch, lamps at the footing.",
    description:
      "A sanctum doorway. Two fluted pillars with lotus capitals carry a stepped lintel, the artwork glows inside a tall arch with a brass halo behind it, and the Tamil line leads above the English headline. Twin lamps and a kolam baseline close the composition.",
    bestFor: "Muhurtham, Griha Pravesam, temple festivals, deity blessings.",
    composition: "Pillared arch · script-first copy · lamps and kolam footing",
    usesImage: true,
    defaultTheme: "saffron",
    defaultLayout: "portrait-arch",
  },
  {
    key: "gallery",
    name: "Gallery Plate",
    family: "Editorial",
    tagline: "Exhibition label: tall plate above, catalogue caption below.",
    description:
      "A museum wall. The artwork is a tall matted plate occupying the upper two-thirds with a numbered plate caption, and the copy sits beneath it as an exhibition label: kicker rule, headline, a short measure of body text and a hairline footer.",
    bestFor: "Flagship service launches, sample-report reveals, brand credibility posts.",
    composition: "Matted plate on top · exhibition label below · plate number",
    usesImage: true,
    defaultTheme: "sand",
    defaultLayout: "split",
  },
  {
    key: "manifesto",
    name: "Manifesto",
    family: "Editorial",
    tagline: "Type as the artwork, with a Tamil watermark behind it.",
    description:
      "No picture. The headline is set as large as the page allows, left-ragged on a strict grid, with the Tamil line rendered as a huge translucent watermark behind it. A numbered margin rule, one gold slash and a bottom-anchored footer finish the page.",
    bestFor: "Quotes, method statements, 'why exact birth time matters' posts.",
    composition: "Typographic only · Tamil watermark · margin rule",
    usesImage: false,
    defaultTheme: "ink",
    defaultLayout: "type-only",
  },
  {
    key: "nocturne",
    name: "Glass Nocturne",
    family: "Modern",
    tagline: "Full-bleed photograph, frosted copy card floating at the base.",
    description:
      "A night scene. The photograph fills the whole page under a dark colour grade, a frosted glass card floats across the lower third carrying the copy, and the call to action sits inside the card as a filled pill. A single hairline frame holds the edges.",
    bestFor: "Transits, eclipses, retrogrades, reel covers and cinematic announcements.",
    composition: "Full-bleed art · frosted glass card · hairline frame",
    usesImage: true,
    defaultTheme: "lunar",
    defaultLayout: "full-bleed",
  },
  {
    key: "lesson",
    name: "Guide Slide",
    family: "Editorial",
    tagline: "Chapter numeral, headline, three numbered cards, progress rail.",
    description:
      "Built to teach. A chapter numeral and series name head the page, the headline sits beside a round art inset, and the subline becomes three numbered cards stacked beneath. A progress rail with the page marker and a link line close the slide.",
    bestFor: "Explainers, panchangam notes, 'what is Sade Sati' carousels.",
    composition: "Chapter header · round inset · three cards · progress rail",
    usesImage: true,
    defaultTheme: "sand",
    defaultLayout: "split",
  },
  {
    key: "offer",
    name: "Offer Card",
    family: "Campaign",
    tagline: "Diagonal campaign band, product card, stamp and filled button.",
    description:
      "A commercial layout. A diagonal campaign band sweeps across the top carrying the kicker, the artwork sits in a rounded product card with a soft shadow and a circular 'booking open' stamp, and the headline, three benefit chips and a filled booking button fill the lower half.",
    bestFor: "Paid boosts, offer posts, consultation drives, price announcements.",
    composition: "Diagonal band · product card · benefit chips · filled CTA",
    usesImage: true,
    defaultTheme: "kumkum",
    defaultLayout: "split",
  },
  {
    key: "blessing",
    name: "Festival Blessing",
    family: "Heritage",
    tagline: "Radiant medallion, lamp row, the wish before the brand.",
    description:
      "A ceremonial greeting. Rays fan out behind a petal medallion holding the artwork, a row of five lamps sits beneath it, the Tamil wish leads at full size with the English blessing under it, and the brand is reduced to a footer line.",
    bestFor: "Diwali, Pongal, Navaratri, Karthigai Deepam, Varalakshmi greetings.",
    composition: "Radiant medallion · lamp row · greeting-first hierarchy",
    usesImage: true,
    defaultTheme: "granite",
    defaultLayout: "medallion",
  },
  {
    key: "sequence",
    name: "Series Cover",
    family: "Campaign",
    tagline: "Art under a sweeping arc, oversized index, swipe prompt.",
    description:
      "The first slide of a swipe sequence. The artwork fills the upper page and is cut by a sweeping arc into the copy field, an oversized index numeral bleeds off the left edge, the headline crosses the seam, and page dots plus a swipe arrow tell the viewer what to do.",
    bestFor: "First slide of any carousel, story sequences, series covers.",
    composition: "Arc-cut art · oversized index · swipe affordance",
    usesImage: true,
    defaultTheme: "midnight",
    defaultLayout: "full-bleed",
  },
];

const NEW_TEMPLATES: TemplateMeta[] = COMPOSITIONS.map((item) => ({
  key: item.key, name: item.name, family: item.family === "immersive" ? "Immersive" : item.family === "editorial" ? "Editorial" : item.family === "geometric" ? "Geometric" : item.family === "narrative" ? "Narrative" : "Information",
  tagline: item.description, description: item.description, bestFor: "Category-aware social posters in portrait, square, landscape and story formats.",
  composition: item.structure, usesImage: item.imageRole !== "none", defaultTheme: "midnight", defaultLayout: "split",
}));
/** New composition systems first; the eight legacy painters remain available. */
export const TEMPLATES: TemplateMeta[] = [...NEW_TEMPLATES, ...LEGACY_TEMPLATES];

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
