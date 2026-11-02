export type Platform = "facebook" | "instagram" | "both";

export type ThemeKey =
  | "midnight"
  | "ivory"
  | "saffron"
  | "jade"
  | "granite"
  | "forest"
  | "kumkum"
  | "sand"
  | "ink"
  // nature register
  | "dawn"
  | "rose"
  | "lagoon"
  // space register
  | "cosmos"
  | "lunar"
  // modern register
  | "obsidian"
  | "terracotta";

export type DeityKey =
  | "ganesha"
  | "shiva"
  | "murugan"
  | "lakshmi"
  | "saraswati"
  | "durga"
  | "krishna"
  | "rama"
  | "hanuman"
  | "venkateswara"
  | "ayyappa"
  | "meenakshi";

/**
 * Headline faces. The first four are the Poster Studio's curated set; the last
 * three remain valid so festival presets and saved posters keep rendering.
 */
export type DisplayFontKey = "cinzel" | "cormorant" | "playfair" | "inter" | "marcellus" | "baloo" | "jakarta";
/** Tamil + Hindi pairings. `serif`, `sans` and `festive` are the studio set; the rest are legacy aliases. */
export type ScriptFontKey = "serif" | "sans" | "festive" | "classic" | "rounded" | "bold";

export type PosterLayout = "portrait-arch" | "full-bleed" | "split" | "medallion" | "type-only";
export type ImageFit = "arch" | "circle" | "full" | "square";

/**
 * Poster compositions. Each template is a different piece of design work — a
 * different grid, typographic hierarchy, image treatment and CTA — not a recolour
 * of the same layout. `legacyLayoutFor` maps the old layout names onto them so
 * every existing caller keeps working.
 */
export type PosterTemplate =
  | "hero" | "editorial" | "asymmetric" | "mandala" | "diagonal" | "cosmic"
  | "split" | "story" | "minimal" | "infographic" | "collage" | "devotional"
  | "mandapam"
  | "gallery"
  | "manifesto"
  | "nocturne"
  | "lesson"
  | "offer"
  | "blessing"
  | "sequence";

export interface TemplateMeta {
  key: PosterTemplate;
  name: string;
  family: "Editorial" | "Heritage" | "Modern" | "Campaign" | "Immersive" | "Geometric" | "Narrative" | "Information";
  tagline: string;
  description: string;
  bestFor: string;
  /** What makes the composition different, in one line. */
  composition: string;
  usesImage: boolean;
  defaultTheme: ThemeKey;
  defaultLayout: PosterLayout;
}

/**
 * The twelve art directions. Six heritage systems rooted in Tamil visual
 * culture and six modern systems — every one is a real layout with its own
 * backdrop, frame, type arrangement and ornament vocabulary.
 */
export type StyleKey =
  // heritage
  | "signature"
  | "thanjavur"
  | "kolam"
  | "silk"
  | "gopuram"
  | "deepam"
  // modern
  | "mono"
  | "paper"
  | "ephemeris"
  | "aurum"
  | "glass"
  | "orbit";

export type MotifKey =
  | "jathagam"
  | "porutham"
  | "namakaranam"
  | "muhurtham"
  | "panchangam"
  | "transits"
  | "scroll"
  | "chat"
  | "sun"
  | "star"
  // South Indian temple vocabulary
  | "gopuram"
  | "kalash"
  | "lamp"
  | "bell"
  | "kolam"
  | "mandala"
  | "diya"
  | "om"
  | "rangoli"
  | "sparkles"
  | "divider"
  | "corner"
  | "toran"
  | "vel"
  | "peacock"
  | "conch"
  | "elephant"
  // nature vocabulary
  | "lotus"
  | "flower"
  | "marigold"
  | "garland"
  | "palm"
  | "banana"
  | "jasmine"
  | "waves"
  | "hills"
  // modern vocabulary
  | "geometry"
  | "sunburst"
  | "trishul"
  // temple register
  | "chola-pillar"
  | "kandha-vel"
  | "nandi"
  | "tamil-letter"
  | "dwaram-gate"
  // nature register
  | "sunrise"
  | "wave-curl"
  | "pine"
  | "rain"
  | "blossom"
  // space register
  | "spiral"
  | "nebula-cloud"
  | "rocket"
  | "moon"
  | "saturn";

export type ServiceKind = "Paid report" | "Free daily" | "Lead magnet";

export interface CarouselSlide {
  kicker: string;
  headline: string;
  body: string;
}

export interface StoryFrame {
  title: string;
  body: string;
  sticker: string;
}

export interface ReelScript {
  title: string;
  hook: string;
  duration: string;
  beats: string[];
  onScreen: string[];
  cta: string;
  audio: string;
}

export interface ServiceCreative {
  kicker: string;
  headline: string;
  subline: string;
  tamil: string;
  chips: string[];
  price: string;
  cta: string;
}

export interface Service {
  id: string;
  name: string;
  shortName: string;
  tamilName: string;
  kind: ServiceKind;
  badge: string;
  price: string;
  priceNote: string;
  path: string;
  url: string;
  promise: string;
  deliverables: string[];
  proof: string;
  motif: MotifKey;
  theme: ThemeKey;
  creative: ServiceCreative;
  artDirection: string;
  altText: string;
  fb: {
    hook: string;
    body: string[];
    bullets: string[];
    cta: string;
    hashtags: string[];
    pinned?: boolean;
  };
  ig: {
    hook: string;
    body: string[];
    cta: string;
    hashtags: string[];
    extendedHashtags: string[];
    firstComment: string;
  };
  carousel: {
    title: string;
    slides: CarouselSlide[];
  };
  reel: ReelScript;
  stories: StoryFrame[];
  bestTime: { fb: string; ig: string };
  kpi: string;
}

export interface CreativeFormat {
  id: string;
  label: string;
  platform: "facebook" | "instagram" | "both";
  group: "brand" | "posts" | "utility";
  width: number;
  height: number;
  template:
    | "profile"
    | "cover"
    | "cover-statement"
    | "link"
    | "post"
    | "square"
    | "carousel"
    | "story"
    | "reel-cover"
    | "highlight"
    | "quote"
    | "offer"
    | "panchangam"
    | "review"
    | "style-sheet"
    | "festival";
  ratio: string;
  usage: string;
  safeZones?: { top?: number; bottom?: number; left?: number; right?: number; label: string }[];
  fixedService?: string;
  notes?: string;
}

export interface Theme {
  key: ThemeKey;
  name: string;
  family: "Gold" | "Temple" | "Nature" | "Devotional" | "Modern" | "Space";
  bgFrom: string;
  bgTo: string;
  gold: string;
  goldSoft: string;
  ink: string;
  muted: string;
  line: string;
  light: boolean;
  swatch: string[];
}

export interface CreativeContent {
  kicker: string;
  headline: string;
  subline: string;
  tamil: string;
  chips: string[];
  price: string;
  cta: string;
}

export interface CalendarEntry {
  day: number;
  platform: "FB" | "IG" | "Both";
  pillar: string;
  format: string;
  title: string;
  hook: string;
  serviceId: string | null;
  asset: string;
  bestTime: string;
}

export interface HighlightPlan {
  id: string;
  label: string;
  glyph: MotifKey;
  theme: ThemeKey;
  purpose: string;
  stories: string[];
}

export interface GridSlot {
  serviceId: string;
  theme: ThemeKey;
  type: "Reel" | "Carousel" | "Single" | "Quote" | "Offer";
  caption: string;
}

export interface Faq {
  question: string;
  quickReply: string;
  answer: string;
}

export interface DownloadFile {
  name: string;
  data: Uint8Array;
}
