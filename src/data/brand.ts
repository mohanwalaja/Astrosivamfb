import type { MotifKey, StyleKey, Theme, ThemeKey } from "../types";

export const BRAND = {
  name: "Astro Sivam",
  wordmark: "ASTRO SIVAM",
  descriptor: "Vedic Astrology",
  tagline: "Understand your life through Vedic astrology.",
  secondaryTagline: "Ancient Jyotish. Ephemeris precision.",
  website: "astrosivam.com",
  url: "https://astrosivam.com",
  email: "admin@astrosivam.com",
  location: "Walajapet, Ranipet District, Tamil Nadu, India",
  Address: "No 4 Thiruttani Thettu Street, Kamakshi Puram, Walajapet, Ranipet District, PIN 632513, Tamil Nadu, India",
  registration: "Udyam Reg. No. UDYAM-TN-35-0058124 · Registered MSME, Govt. of India",
  delivery: "Reports checked every 6 hours · PDF + tax invoice emailed after admin approval · order history in the Customer Dashboard",
  ordering: "Google or email sign-in · optional saved profiles/family members · up to 6 orders in cart · place the next order after payment",
  languages: "English · தமிழ் · हिंदी",
  pricing: "Basic/Kids/Students, Marriage & Baby Naming US$5 · ₹470 · Bhava/Varga & Subha Muhurtham US$10 · ₹940 · Daily Panjangam free · Rasi Palan online",
  pricingNote: "All Birth Jathagam plans: Basic US$5 · ₹470 · Bhava US$10 · ₹940 · Varga US$10 · ₹940 · Kids Jadagam (0–10) US$5 · ₹470 · Students Jadagam (11–18) US$5 · ₹470 · auto-selected from birth date",
  ageGating: "Age-gated Birth Jathagam: Kids Jadagam for 0–10 years, Students Jadagam for 11–18 years — auto-selected when birth details are entered; adult reports use Basic/Bhava/Varga",
  firstReport: "First order FREE (Beta) — one per account, email address and IP address; later orders at standard price",
  reviews: "Website reviews are checked · reuse customer words in creative only with permission",
  refund: "90% refund before approval · processed within 3 working days",
  chat: "7 days of personal astrologer chat",
  ephemeris: "Chitra Paksha Lahiri ayanamsa",
  handle: "@astrosivamofficial",
  handleAlternates: ["@astrosivam.official", "@astrosivam_vedic", "@astrosivam.jyotish"],
  fbPageName: "Astro Sivam | Vedic Astrology & Jathagam",
  fbCategory: "Astrologist · Vedic Astrology Service · Spiritual Consultant",
  igName: "Astro Sivam | Vedic Jyotish",
  igNameAlt: "Astro Sivam | Vedic Astrology",
  hashtagCore: ["#AstroSivam", "#AstroSivamOfficial", "#VedicAstrology"],
  ugcTag: "#MySivamChart",
};

export const THEMES: Record<ThemeKey, Theme> = {
  midnight: {
    key: "midnight",
    family: "Gold",
    name: "Midnight Gold",
    bgFrom: "#050A18",
    bgTo: "#0D1930",
    gold: "#D9AE5F",
    goldSoft: "#F3DCA9",
    ink: "#F8F2E4",
    muted: "rgba(248,242,228,0.62)",
    line: "rgba(217,174,95,0.26)",
    light: false,
    swatch: ["#050A18", "#0D1930", "#D9AE5F", "#F8F2E4"],
  },
  ivory: {
    key: "ivory",
    family: "Gold",
    name: "Ivory Temple",
    bgFrom: "#F9F3E7",
    bgTo: "#EFE1C5",
    gold: "#8E5F14",
    goldSoft: "#A9721F",
    ink: "#152036",
    muted: "rgba(21,32,54,0.68)",
    line: "rgba(21,32,54,0.22)",
    light: true,
    swatch: ["#F8F2E5", "#EBDBBD", "#A06F1C", "#152036"],
  },
  saffron: {
    key: "saffron",
    family: "Gold",
    name: "Saffron Ember",
    bgFrom: "#1A0B06",
    bgTo: "#3B1B0C",
    gold: "#F0B45F",
    goldSoft: "#FFD9A0",
    ink: "#FDF3E3",
    muted: "rgba(253,243,227,0.64)",
    line: "rgba(240,180,95,0.28)",
    light: false,
    swatch: ["#1A0B06", "#3B1B0C", "#F0B45F", "#FDF3E3"],
  },
  jade: {
    key: "jade",
    family: "Gold",
    name: "Night Jade",
    bgFrom: "#041410",
    bgTo: "#0A2B21",
    gold: "#D8B36A",
    goldSoft: "#F1DCA7",
    ink: "#F3F5EE",
    muted: "rgba(243,245,238,0.62)",
    line: "rgba(216,179,106,0.26)",
    light: false,
    swatch: ["#041410", "#0A2B21", "#D8B36A", "#F3F5EE"],
  },
  granite: {
    key: "granite",
    family: "Temple",
    name: "Temple Granite",
    bgFrom: "#17140F",
    bgTo: "#2C2519",
    gold: "#E0A84E",
    goldSoft: "#F6D79B",
    ink: "#FAF3E4",
    muted: "rgba(250,243,228,0.63)",
    line: "rgba(224,168,78,0.28)",
    light: false,
    swatch: ["#17140F", "#2C2519", "#E0A84E", "#FAF3E4"],
  },
  forest: {
    key: "forest",
    family: "Nature",
    name: "Backwater Forest",
    bgFrom: "#06170F",
    bgTo: "#0F3323",
    gold: "#E3C079",
    goldSoft: "#F5E3B4",
    ink: "#F6F4E9",
    muted: "rgba(246,244,233,0.66)",
    line: "rgba(227,192,121,0.26)",
    light: false,
    swatch: ["#06170F", "#0F3323", "#E3C079", "#F6F4E9"],
  },
  kumkum: {
    key: "kumkum",
    family: "Devotional",
    name: "Kumkum & Turmeric",
    bgFrom: "#2A0708",
    bgTo: "#4C130D",
    gold: "#F3B44F",
    goldSoft: "#FFDCA3",
    ink: "#FFF4E3",
    muted: "rgba(255,244,227,0.66)",
    line: "rgba(243,180,79,0.3)",
    light: false,
    swatch: ["#2A0708", "#4C130D", "#F3B44F", "#FFF4E3"],
  },
  sand: {
    key: "sand",
    family: "Modern",
    name: "Modern Sand",
    bgFrom: "#FAF7F1",
    bgTo: "#EFE9DD",
    gold: "#B4531F",
    goldSoft: "#8F3D14",
    ink: "#141416",
    muted: "rgba(20,20,22,0.66)",
    line: "rgba(20,20,22,0.2)",
    light: true,
    swatch: ["#FAF7F1", "#EFE9DD", "#B4531F", "#141416"],
  },
  ink: {
    key: "ink",
    family: "Modern",
    name: "Modern Ink",
    bgFrom: "#0A0A0B",
    bgTo: "#17171A",
    gold: "#E4572E",
    goldSoft: "#FFB59C",
    ink: "#F7F5F2",
    muted: "rgba(247,245,242,0.64)",
    line: "rgba(228,87,46,0.3)",
    light: false,
    swatch: ["#0A0A0B", "#17171A", "#E4572E", "#F7F5F2"],
  },
  dawn: {
    key: "dawn",
    family: "Nature",
    name: "Sunrise Dawn",
    bgFrom: "#FFF4E4",
    bgTo: "#FFD9B0",
    gold: "#B7410E",
    goldSoft: "#8C2F08",
    ink: "#2B1409",
    muted: "rgba(43,20,9,0.66)",
    line: "rgba(43,20,9,0.22)",
    light: true,
    swatch: ["#FFF4E4", "#FFD9B0", "#B7410E", "#2B1409"],
  },
  rose: {
    key: "rose",
    family: "Nature",
    name: "Rose & Sandstone",
    bgFrom: "#F7E9E2",
    bgTo: "#EED5CC",
    gold: "#A85E48",
    goldSoft: "#8A4A38",
    ink: "#352322",
    muted: "rgba(53,35,34,0.66)",
    line: "rgba(53,35,34,0.2)",
    light: true,
    swatch: ["#F7E9E2", "#EED5CC", "#A85E48", "#352322"],
  },
  lagoon: {
    key: "lagoon",
    family: "Nature",
    name: "Lagoon Depth",
    bgFrom: "#02161F",
    bgTo: "#07323F",
    gold: "#6FD9E6",
    goldSoft: "#BCF2F8",
    ink: "#ECFBFF",
    muted: "rgba(236,251,255,0.62)",
    line: "rgba(111,217,230,0.26)",
    light: false,
    swatch: ["#02161F", "#07323F", "#6FD9E6", "#ECFBFF"],
  },
  cosmos: {
    key: "cosmos",
    family: "Space",
    name: "Deep Cosmos",
    bgFrom: "#080418",
    bgTo: "#27104B",
    gold: "#B79CFF",
    goldSoft: "#E3D7FF",
    ink: "#F7F2FF",
    muted: "rgba(247,242,255,0.62)",
    line: "rgba(183,156,255,0.26)",
    light: false,
    swatch: ["#080418", "#27104B", "#B79CFF", "#F7F2FF"],
  },
  lunar: {
    key: "lunar",
    family: "Space",
    name: "Lunar Graphite",
    bgFrom: "#0A0D12",
    bgTo: "#242A35",
    gold: "#C7D6E9",
    goldSoft: "#EDF3FC",
    ink: "#F6F9FE",
    muted: "rgba(246,249,254,0.62)",
    line: "rgba(199,214,233,0.26)",
    light: false,
    swatch: ["#0A0D12", "#242A35", "#C7D6E9", "#F6F9FE"],
  },
  obsidian: {
    key: "obsidian",
    family: "Modern",
    name: "Obsidian Gold",
    bgFrom: "#070708",
    bgTo: "#141210",
    gold: "#D4AF5E",
    goldSoft: "#F3E3B4",
    ink: "#F7F2E8",
    muted: "rgba(247,242,232,0.6)",
    line: "rgba(212,175,94,0.22)",
    light: false,
    swatch: ["#070708", "#141210", "#D4AF5E", "#F7F2E8"],
  },
  terracotta: {
    key: "terracotta",
    family: "Temple",
    name: "Terracotta Ivory",
    bgFrom: "#F6EDDD",
    bgTo: "#E9D7BC",
    gold: "#9A4A22",
    goldSoft: "#B8743E",
    ink: "#2C1A10",
    muted: "rgba(44,26,16,0.66)",
    line: "rgba(154,74,34,0.26)",
    light: true,
    swatch: ["#F6EDDD", "#E9D7BC", "#9A4A22", "#2C1A10"],
  },
};

export type StyleFamily = "Heritage" | "Modern";

export interface StyleMeta {
  key: StyleKey;
  name: string;
  family: StyleFamily;
  /** One-line register, shown under the name. */
  tagline: string;
  description: string;
  ornaments: string[];
  bestFor: string;
  defaultTheme: ThemeKey;
  defaultMotif: MotifKey;
  paletteName: string;
  /** Whether the shared bevelled gold rail is painted over the export. Modern systems carry their own edge. */
  goldRail: boolean;
  /** Where the type block sits — a quick read for the gallery. */
  composition: string;
}

/**
 * Twelve art directions. The first six are rooted in Tamil visual culture —
 * Thanjavur painting, kolam, Kanchipuram silk, gopuram skylines and the
 * Karthigai lamp. The second six are modern: editorial, technical, minimal
 * and glass registers. Every one shares a single copy contract — kicker,
 * headline, Tamil line, subline, three chips, price and CTA.
 */
export const STYLES: StyleMeta[] = [
  /* ------------------------------- heritage ------------------------------- */
  {
    key: "signature",
    name: "Signature Gold",
    family: "Heritage",
    tagline: "Midnight, bevelled gold, a medallion of light.",
    description:
      "The identity system. A raised rasi plate rests on a soft medallion halo above centred Cinzel type, with hairline rules and a filled price pill. It is the look every other direction defers to.",
    ornaments: ["Bevelled gold rail", "Medallion halo", "27-star field", "Hairline rules"],
    bestFor: "Pinned offers, flagship Jathagam posts and anything that sits beside the profile photo.",
    defaultTheme: "midnight",
    defaultMotif: "jathagam",
    paletteName: "Midnight Gold",
    goldRail: true,
    composition: "Centred · art above type",
  },
  {
    key: "thanjavur",
    name: "Thanjavur Relief",
    family: "Heritage",
    tagline: "Maroon ground, gold-leaf arch, gem-studded border.",
    description:
      "Borrowed from Tanjore painting: a gesso-raised arch with a scalloped prabhavali edge, the service plate enthroned inside it, and a border of ruby and emerald studs. Warm, devotional and unmistakably Tamil.",
    ornaments: ["Prabhavali arch", "Gem-stud border", "Gold-leaf relief", "Lotus pedestal"],
    bestFor: "Porutham, muhurtham and wedding-season posts; Deepavali and Navaratri windows.",
    defaultTheme: "kumkum",
    defaultMotif: "mandala",
    paletteName: "Kumkum & Turmeric",
    goldRail: true,
    composition: "Centred · art enthroned in an arch",
  },
  {
    key: "kolam",
    name: "Kolam Morning",
    family: "Heritage",
    tagline: "Rice-flour dots on terracotta, a morning threshold.",
    description:
      "A light system built on the pulli kolam: a dot lattice fades across the ground while looped kolam lines curl through two corners. The plate sits inside a terracotta square at the top-left and the type reads left like a letter.",
    ornaments: ["Pulli dot lattice", "Looped kolam corners", "Terracotta plate", "Turmeric rule"],
    bestFor: "Daily panchangam, Margazhi mornings, Pongal and anything scheduled before 8 AM.",
    defaultTheme: "terracotta",
    defaultMotif: "kolam",
    paletteName: "Terracotta Ivory",
    goldRail: false,
    composition: "Left-aligned · art top-left",
  },
  {
    key: "silk",
    name: "Kanchipuram Silk",
    family: "Heritage",
    tagline: "Peacock green body, zari border, woven light.",
    description:
      "The sari as a layout. Two vertical zari borders run down the sides with a woven temple-tooth edge, a wide korvai band anchors the bottom, and a fine diagonal weave sheens across the body. The plate rests on the body like a brooch.",
    ornaments: ["Zari side borders", "Temple-tooth edge", "Korvai band", "Diagonal weave sheen"],
    bestFor: "Marriage porutham, baby naming and auspicious announcements.",
    defaultTheme: "jade",
    defaultMotif: "peacock",
    paletteName: "Night Jade",
    goldRail: true,
    composition: "Centred · bordered like a sari",
  },
  {
    key: "gopuram",
    name: "Gopuram Dusk",
    family: "Heritage",
    tagline: "A tiered skyline against saffron turning to indigo.",
    description:
      "A full-width gopuram silhouette steps across the upper third, lit from behind by a setting sun. The plate hangs in the sky above the tower; the type sits on the darker ground below where the temple street would be.",
    ornaments: ["Tiered gopuram skyline", "Sun disk", "Kalasam finials", "Street-lamp pair"],
    bestFor: "Muhurtham dates, temple-festival tie-ins and transit updates.",
    defaultTheme: "saffron",
    defaultMotif: "gopuram",
    paletteName: "Saffron Ember",
    goldRail: true,
    composition: "Scene above · type below",
  },
  {
    key: "deepam",
    name: "Karthigai Deepam",
    family: "Heritage",
    tagline: "Near-black, a sea of lamps, one warm glow.",
    description:
      "Darkness with hundreds of small agal flames rising from the bottom edge like a temple tank on Karthigai night. The glow climbs under the type; the plate floats small and high. The most devotional of the twelve.",
    ornaments: ["Agal lamp rows", "Rising flame glow", "Ember particles", "Smoke haze"],
    bestFor: "Deepavali, Karthigai Deepam, Sade Sati and remedy posts.",
    defaultTheme: "granite",
    defaultMotif: "diya",
    paletteName: "Temple Granite",
    goldRail: true,
    composition: "Type high · lamps below",
  },

  /* -------------------------------- modern -------------------------------- */
  {
    key: "mono",
    name: "Mono Ink",
    family: "Modern",
    tagline: "Black, hairlines, a vermilion tick, nothing else.",
    description:
      "An editorial poster. The headline runs huge and left-aligned, kicker and Tamil sit on a baseline grid, and the plate is redrawn as a thin-line diagram top-right. One vermilion accent keeps it alive; no gold rail.",
    ornaments: ["Baseline grid", "Hairline rules", "Vermilion index", "Line-art plate"],
    bestFor: "Explainers, carousels, education posts and quote cards.",
    defaultTheme: "ink",
    defaultMotif: "geometry",
    paletteName: "Modern Ink",
    goldRail: false,
    composition: "Left-aligned · oversized type",
  },
  {
    key: "paper",
    name: "Paper Editorial",
    family: "Modern",
    tagline: "Warm paper, magazine columns, a black footer bar.",
    description:
      "A magazine spread: a meta row at the top, a serif headline in the left column, the plate framed on the right, and the three chips as a numbered contents list. The footer is a solid ink bar that carries the price.",
    ornaments: ["Meta row", "Column rules", "Numbered list", "Ink footer bar"],
    bestFor: "Service explainers, pricing posts and anything linking to a long read.",
    defaultTheme: "sand",
    defaultMotif: "scroll",
    paletteName: "Modern Sand",
    goldRail: false,
    composition: "Two columns · list below",
  },
  {
    key: "ephemeris",
    name: "Ephemeris Blueprint",
    family: "Modern",
    tagline: "Deep teal, a degree dial, instrument precision.",
    description:
      "The astronomy behind the astrology. A fine technical grid, a 360° dial with degree ticks and the twelve rasi divisions, and the plate mounted at its centre like an instrument. Labels read as data; the type stays cool and exact.",
    ornaments: ["Technical grid", "Degree dial", "Rasi ticks", "Data labels"],
    bestFor: "Transit reports, Sade Sati timelines and anything that argues from calculation.",
    defaultTheme: "lagoon",
    defaultMotif: "transits",
    paletteName: "Lagoon Depth",
    goldRail: false,
    composition: "Dial above · data block below",
  },
  {
    key: "aurum",
    name: "Aurum Minimal",
    family: "Modern",
    tagline: "Obsidian black, one sweeping gold arc, air.",
    description:
      "Restraint as luxury. A single wide gold arc sweeps up from the lower-left corner, the plate sits small on the arc, and a large headline owns the empty space. Chips are a quiet text row; the CTA is an underlined word.",
    ornaments: ["Single gold arc", "Negative space", "Underlined CTA", "Thin corner marks"],
    bestFor: "Brand statements, launches, testimonials and premium-tier posts.",
    defaultTheme: "obsidian",
    defaultMotif: "star",
    paletteName: "Obsidian Gold",
    goldRail: false,
    composition: "Asymmetric · type left, arc right",
  },
  {
    key: "glass",
    name: "Nocturne Glass",
    family: "Modern",
    tagline: "Frosted card over colour-light, soft and current.",
    description:
      "Two soft light sources — violet and warm gold — glow behind a frosted glass card. The plate and type live on the card with a bright edge highlight; chips become translucent tabs. Reads as a modern app surface.",
    ornaments: ["Frosted glass card", "Twin light sources", "Edge highlight", "Translucent tabs"],
    bestFor: "App-style announcements, chat-support posts and story covers.",
    defaultTheme: "lunar",
    defaultMotif: "chat",
    paletteName: "Lunar Graphite",
    goldRail: false,
    composition: "Centred card · stacked type",
  },
  {
    key: "orbit",
    name: "Orbit Lines",
    family: "Modern",
    tagline: "Concentric rings, twelve houses, nine moving points.",
    description:
      "An astro-tech diagram. Thin concentric orbits ring the plate, the twelve house divisions tick the outer circle and nine graha points sit on their rings. The type sits below the diagram in a cool violet register.",
    ornaments: ["Concentric orbits", "House ticks", "Graha points", "Violet glow"],
    bestFor: "Planetary transits, dasha timelines and reel covers.",
    defaultTheme: "cosmos",
    defaultMotif: "transits",
    paletteName: "Deep Cosmos",
    goldRail: false,
    composition: "Diagram above · type below",
  },
];

export const STYLE_MAP: Record<StyleKey, StyleMeta> = Object.fromEntries(
  STYLES.map((style) => [style.key, style]),
) as Record<StyleKey, StyleMeta>;

export const HERITAGE_STYLES = STYLES.filter((style) => style.family === "Heritage");
export const MODERN_STYLES = STYLES.filter((style) => style.family === "Modern");

/**
 * The studio palette set: twelve palettes, one per art direction, in the two
 * style families. Every palette picker in the suite reads this list so the
 * Poster Studio, Asset Studio and gallery never disagree about what is on offer.
 */
export const STYLE_PALETTES: Array<{ family: StyleFamily; entries: Array<{ style: StyleMeta; theme: Theme }> }> = [
  { family: "Heritage", entries: HERITAGE_STYLES.map((style) => ({ style, theme: THEMES[style.defaultTheme] })) },
  { family: "Modern", entries: MODERN_STYLES.map((style) => ({ style, theme: THEMES[style.defaultTheme] })) },
];

export const STYLE_TAG_SETS: Record<StyleKey, string[]> = {
  signature: ["#AstroSivam", "#VedicAstrology", "#LahiriAyanamsa", "#Jyotish", "#Kundli"],
  thanjavur: ["#ThanjavurPainting", "#TanjorePainting", "#TamilHeritage", "#GoldLeaf", "#Bhakti", "#TempleArt"],
  kolam: ["#Kolam", "#PulliKolam", "#Margazhi", "#TamilCulture", "#MorningRitual", "#Rangoli"],
  silk: ["#Kanchipuram", "#KanchipuramSilk", "#Zari", "#PattuSaree", "#TamilWedding", "#Porutham"],
  gopuram: ["#Gopuram", "#TamilTemple", "#DravidianArchitecture", "#Kovil", "#TempleSkyline", "#Dusk"],
  deepam: ["#KarthigaiDeepam", "#Deepam", "#Deepavali", "#Agal", "#TempleLamps", "#Bhakti"],
  mono: ["#EditorialDesign", "#TypographyDesign", "#MinimalDesign", "#SwissDesign", "#DesignDaily"],
  paper: ["#MagazineDesign", "#EditorialLayout", "#PrintDesign", "#SerifType", "#Explainer"],
  ephemeris: ["#Ephemeris", "#Astronomy", "#SiderealZodiac", "#Blueprint", "#DataDesign", "#Jyotish"],
  aurum: ["#MinimalLuxury", "#ModernLuxury", "#BrandDesign", "#DarkAesthetic", "#LessIsMore"],
  glass: ["#Glassmorphism", "#UIDesign", "#ModernDesign", "#NightMode", "#AppDesign"],
  orbit: ["#PlanetaryTransit", "#Grahas", "#AstroTech", "#Cosmos", "#DashaTimeline", "#Orbit"],
};

export const SEASONAL_NOTES = [
  {
    title: "Margazhi & Pongal",
    body: "Open the year with Kolam Morning. Threshold kolams, early posts and the panchangam card all belong to the light system until Thai ends.",
  },
  {
    title: "Deepavali & Karthigai",
    body: "Switch one week early to Karthigai Deepam, then Thanjavur Relief for the greeting itself. Lamps and verse outperform price-led posts in the festival window.",
  },
  {
    title: "Wedding season",
    body: "Kanchipuram Silk for porutham and baby naming, Gopuram Dusk for muhurtham dates, Aurum Minimal for the retargeting ads.",
  },
  {
    title: "Transit updates",
    body: "Ephemeris Blueprint and Orbit Lines own the Saturn, Jupiter and Rahu–Ketu announcements. Mono Ink carries the explainer carousel that follows.",
  },
];

export const BRAND_COLORS = [
  { name: "Studio Charcoal", hex: "#161011", use: "Interface canvas and dark artwork base" },
  { name: "Deep Maroon", hex: "#4D1023", use: "Identity panels, active navigation, emphasis" },
  { name: "Seal Maroon", hex: "#24060F", use: "The seal tile behind the logo" },
  { name: "Antique Gold", hex: "#C79A3C", use: "Official logo gold and primary actions" },
  { name: "Champagne Gold", hex: "#EDDCB8", use: "Headlines, quotes and highlights on dark" },
  { name: "Warm Ivory", hex: "#F7F1E4", use: "Primary type and light artwork surfaces" },
  { name: "Ivory Parchment", hex: "#E0D4C0", use: "Secondary type on dark surfaces" },
  { name: "Festival Vermilion", hex: "#C4552D", use: "Limited festival artwork accents only" },
];

export const TYPOGRAPHY = [
  {
    name: "Cinzel",
    role: "Display / headlines",
    sample: "Understand your life",
    css: "'Cinzel', Georgia, serif",
    rule: "Use for headlines and section titles. Never below 20px. Track +0.01em.",
  },
  {
    name: "Plus Jakarta Sans",
    role: "UI / body / captions",
    sample: "Every chart reviewed by temple priests.",
    css: "'Plus Jakarta Sans', system-ui, sans-serif",
    rule: "Primary reading face. 300–700 weights; keep body at 90% opacity on dark.",
  },
  {
    name: "Tiro Tamil",
    role: "Tamil lines",
    sample: "பிறப்பு ஜாதகம் · திருமணப் பொருத்தம்",
    css: "'Tiro Tamil', serif",
    rule: "Pair Tamil lines beneath English headlines. Never letterspace Tamil text.",
  },
];

export const VOICE_PRINCIPLES = [
  {
    title: "Precise, never vague",
    body: "Name the method: sidereal zodiac, Chitra Paksha Lahiri ayanamsa, 12 bhavas, 10 poruthams. Specificity is the brand.",
  },
  {
    title: "Warm, never fear-based",
    body: "Describe difficult periods as seasons with context and traditional pariharams. Never sell from anxiety.",
  },
  {
    title: "Priest-reviewed, not app-generated",
    body: "The human review is the product. Say \"our priest team checks every report every 6 hours\" often.",
  },
  {
    title: "Clear about money",
    body: "State the fee in every paid-service post: Basic/Kids/Students, Marriage Compatibility and Baby Naming US$5 · ₹470; Bhava/Varga and Subha Muhurtham US$10 · ₹940 — as listed at astrosivam.com/services. First order FREE (Beta), one per account, email address and IP address. 90% refund before approval. No hidden steps.",
  },
  {
    title: "Bilingual by default",
    body: "English headline with a Tamil line underneath wherever it fits. Reports in English, Tamil and Hindi.",
  },
  {
    title: "Actionable, not fatalistic",
    body: "Every insight ends in something the reader can do: a date to pick, a name to consider, a remedy to follow.",
  },
];

export const SAY_THIS = [
  {
    say: "Sade Sati is a season of pressure and reorganisation — here is what tradition suggests.",
    not: "A terrible curse is active in your chart.",
  },
  {
    say: "Our priest team reviews every chart before the PDF is emailed.",
    not: "Instant AI horoscope generated in seconds.",
  },
  {
    say: "Use the muhurtham window with Nalla Neram timings.",
    not: "This date will guarantee a perfect marriage.",
  },
  {
    say: "First order FREE (Beta) — one per account, email and IP; later orders use the listed US$5 or US$10 price.",
    not: "Free forever, no conditions.",
  },
  {
    say: "Calculated with the Lahiri sidereal zodiac.",
    not: "100% accurate predictions.",
  },
];

export const BOILERPLATES = [
  {
    label: "25 words",
    text: "Astro Sivam casts Vedic horoscopes in the Lahiri sidereal zodiac, reviewed by an India-based priest team and delivered as PDFs in English, Tamil or Hindi.",
  },
  {
    label: "50 words",
    text: "Astro Sivam is an online Vedic astrology service. Charts use the Chitra Paksha Lahiri ayanamsa and are reviewed by our India-based priest team before PDF delivery in English, Tamil or Hindi. Read Daily Panjangam and four-period Rasi Palan online. Paid reports are US$5–10 · ₹470–940; the first order is free in Beta.",
  },
  {
    label: "100 words",
    text: "Astro Sivam helps you understand your life through Vedic astrology. Charts use the Chitra Paksha Lahiri ayanamsa and are reviewed by our India-based priest team every six hours before email delivery and Customer Dashboard tracking. Choose a Birth Jathagam, Marriage Compatibility, Baby Naming or Subha Muhurtham report in English, Tamil or Hindi, with seven days of astrologer chat. Basic/Kids/Students, Marriage and Baby Naming are US$5 · ₹470; Bhava/Varga and Muhurtham are US$10 · ₹940. The first order is free in Beta, limited to one per account, email address and IP address. Daily Panjangam is free, and Rasi Palan offers Daily, Weekly, Monthly and Yearly readings for all 12 Moon signs.",
  },
];

export const LOGO_RULES = {
  do: [
    "Use the official gold mark on midnight, saffron or jade backgrounds.",
    "On ivory surfaces, keep the mark at least 48px wide for contrast.",
    "Maintain clear space equal to the small orbital dot on all sides.",
    "Lock the wordmark to the right of the mark at a 1:3 ratio.",
  ],
  dont: [
    "Do not recolour the mark, add gradients, or outline it.",
    "Do not place the raw mark on a busy photo without a dark scrim.",
    "Do not rotate, stretch, or crop the orbital dots.",
    "Do not add the wordmark inside the mark's orbit.",
  ],
};
