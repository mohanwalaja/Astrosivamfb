import type { ThemeKey } from "../types";
import { SERVICES } from "./services";

/* ==========================================================================
   The design library — 150 art directions.
   ==========================================================================
   Two registers, one brand.

   · Traditional (75) — sanctum arches, carved pillars, palm-leaf scrolls,
     mandalas, lamp rows, kolam, jasmine and torans. Drawn, not photographed.
   · Modern (75) — modular grids, hard fields, negative space, atlas diagrams,
     halftone and Swiss typography. The heritage palette, used as if by a
     contemporary studio.

   A design is a curated recipe, not a random combination: one of ten structural
   layouts × a palette × a type stack × a background treatment × a frame × an
   ornament kit × an art treatment. Each of the 150 entries below pins one
   recipe, one service category and one piece of copy, so nothing is generated
   at render time that somebody did not choose here.

   Prices are read from the service records, never typed into ad copy: change a
   price in `src/data/services` and every plate that quotes it follows.
   ========================================================================== */

export type DesignCategory = "birth" | "wedding" | "baby" | "muhurtham" | "navagraha" | "festival" | "murugan";
export type Register = "traditional" | "modern";

export type LayoutKey =
  | "sanctum"
  | "pillars"
  | "scroll"
  | "medallion"
  | "horizon"
  | "band"
  | "ledger"
  | "splitField"
  | "corner"
  | "grid";

export type TypeKey =
  | "cinzel"
  | "cormorant"
  | "playfair"
  | "marcellus"
  | "swiss"
  | "modernHeritage"
  | "editorialPair"
  | "technical";

export type BackgroundKey = "flat" | "radial" | "parchment" | "silk" | "starfield" | "marble" | "halftone" | "grid";
export type FrameKey = "none" | "hairline" | "doubleRule" | "cornerTicks" | "topBottomBands" | "pillarRails" | "goldBorder";
export type OrnamentKey = "none" | "kolam" | "lampRow" | "mandalaRings" | "jasmine" | "toran" | "starMap" | "ruleDiamond";
export type ArtKey = "fullBleed" | "arch" | "circle" | "plate" | "sideColumn" | "cornerCrop" | "banner" | "duotone";

export interface DesignCopy {
  kicker: string;
  serviceTitle: string;
  headline: string;
  subline: string;
  facts: [string, string, string];
  cta: string;
}

export interface Design {
  id: string;
  /** 1–150, the position in the catalogue. */
  number: number;
  name: string;
  category: DesignCategory;
  register: Register;
  layout: LayoutKey;
  theme: ThemeKey;
  type: TypeKey;
  background: BackgroundKey;
  frame: FrameKey;
  ornament: OrnamentKey;
  art: ArtKey;
  image: string;
  copy: DesignCopy;
}

type Recipe = Pick<Design, "layout" | "theme" | "type" | "background" | "frame" | "ornament" | "art">;

/* --------------------------------- pricing -------------------------------- */

const priceOf = (serviceId: string): string => {
  const service = SERVICES.find((item) => item.id === serviceId);
  if (!service) return "";
  return service.price.split(" · ")[0];
};

const PRICE = {
  birth: priceOf("jathagam"),
  wedding: priceOf("marriage"),
  baby: priceOf("baby-naming"),
  muhurtham: priceOf("muhurtham"),
  navagraha: priceOf("transits"),
};

/* ---------------------------------- copy ---------------------------------- */

const COPY: Record<DesignCategory, DesignCopy[]> = {
  birth: [
    {
      kicker: `Birth Jathagam · ${PRICE.birth}`,
      serviceTitle: "Before the first line is read",
      headline: "Your chart, drawn before you were a week old.",
      subline: "Send the birth date, time and place. Get the rasi and navamsa charts, planet positions and dasa periods.",
      facts: ["Rasi + Navamsa", "Dasa timeline", "Priest-reviewed"],
      cta: "Order the jathagam",
    },
    {
      kicker: `Vedic Jyotish · ${PRICE.birth}`,
      serviceTitle: "From birth details to a full chart",
      headline: "A few minutes can change the chart.",
      subline: "One reading of the sky at your first breath: nakshatra, padas and the years that follow.",
      facts: ["Nakshatra + padas", "Bhava & varga", "7-day chat"],
      cta: "Send your birth details",
    },
    {
      kicker: `Jathagam · ${PRICE.birth}`,
      serviceTitle: "The whole chart, not a forecast",
      headline: "The whole chart. Not a forecast.",
      subline: "Drawn from your birth time, checked by our priests and delivered as a printable report.",
      facts: ["Drik panchangam", "Lahiri ayanamsa", "Printable report"],
      cta: "Read before you pay",
    },
  ],
  wedding: [
    {
      kicker: `Marriage Matching · ${PRICE.wedding}`,
      serviceTitle: "Ten poruthams, one answer",
      headline: "Two charts. One honest verdict.",
      subline: "Send both birth charts. Get the 10 poruthams, the dosha notes and a straight yes, no or wait.",
      facts: ["10 poruthams", "Dosha notes", "Both families"],
      cta: "Match the two charts",
    },
    {
      kicker: `Porutham · ${PRICE.wedding}`,
      serviceTitle: "A report both families can read",
      headline: "A report both families can read.",
      subline: "Every porutham scored in plain language, with the manglik position explained before a date is fixed.",
      facts: ["Porutham scores", "Manglik check", "Plain language"],
      cta: "Send two charts",
    },
    {
      kicker: "Wedding Muhurtham",
      serviceTitle: "A date the family can plan around",
      headline: "A date the family can plan around.",
      subline: "Send the matching report and we return three workable dates, each with its nalla neram.",
      facts: ["Three dates", "Nalla neram", "Rahu kalam"],
      cta: "Ask for dates",
    },
  ],
  baby: [
    {
      kicker: `Namakaranam · ${PRICE.baby}`,
      serviceTitle: "The first letters, chosen properly",
      headline: "Small hands, a whole chart.",
      subline: "Send the birth details. Get the birth-star syllables, all four padas and a naming certificate.",
      facts: ["Four padas", "Name shortlist", "Certificate"],
      cta: "Get the letters",
    },
    {
      kicker: `Baby Naming · ${PRICE.baby}`,
      serviceTitle: "A name that begins with the right sound",
      headline: "A name that begins with the right sound.",
      subline: "The nakshatra pada decides the first letter; we give you the shortlist and the ceremony order.",
      facts: ["Nakshatra pada", "Ceremony order", "Priest-guided"],
      cta: "Order for your child",
    },
    {
      kicker: "Namakaranam",
      serviceTitle: "The ceremony, arranged",
      headline: "The naming ceremony, arranged.",
      subline: "Send the date you have in mind. We check the nalla neram and hand you the running order.",
      facts: ["Nalla neram", "Running order", "One report"],
      cta: "Plan the naming day",
    },
  ],
  muhurtham: [
    {
      kicker: `Subha Muhurtham · ${PRICE.muhurtham}`,
      serviceTitle: "A date the sky agrees with",
      headline: "Find the date the sky agrees with.",
      subline: "Send the event and the month. Get auspicious dates with nalla neram and rahu kalam marked.",
      facts: ["Auspicious dates", "Nalla neram", "Rahu kalam"],
      cta: "Find my date",
    },
    {
      kicker: `Muhurtham · ${PRICE.muhurtham}`,
      serviceTitle: "Chosen by the chart",
      headline: "A date chosen by the chart, not the calendar.",
      subline: "Six months of windows checked against your chart, so the deposit is paid after the date is sure.",
      facts: ["Six-month view", "Griha Pravesam", "Priest-checked"],
      cta: "Check my dates",
    },
    {
      kicker: "Muhurtham",
      serviceTitle: "Check before the deposit",
      headline: "Check the date before the deposit.",
      subline: "Send the date you have booked. We confirm it or return the nearest three that work.",
      facts: ["Date check", "Three options", "Same day"],
      cta: "Confirm my date",
    },
  ],
  navagraha: [
    {
      kicker: `Navagraha · ${PRICE.navagraha}`,
      serviceTitle: "Nine planets, one sky",
      headline: "Know the timing before the fear.",
      subline: "Send your birth details. Get the current transits, the sade sati stage and the date it lifts.",
      facts: ["Sade sati stage", "Transit dates", "No fear language"],
      cta: "Read my transits",
    },
    {
      kicker: `Transits · ${PRICE.navagraha}`,
      serviceTitle: "Where the planets actually are",
      headline: "A clear reading of the sky.",
      subline: "Sade sati, rahu kalam and the nine grahas, read against your own chart rather than a rasi guess.",
      facts: ["Your chart", "Nine grahas", "Plain explanation"],
      cta: "Ask about transits",
    },
    {
      kicker: "Jyotish",
      serviceTitle: "The sky, connected",
      headline: "Nine grahas, one connected sky.",
      subline: "Each planet read with the others, so a difficult transit arrives with its way through.",
      facts: ["Connected reading", "Dasa context", "Priest notes"],
      cta: "Understand the transit",
    },
  ],
  festival: [
    {
      kicker: "Deepavali",
      serviceTitle: "The festival of lights",
      headline: "May your home be filled with light.",
      subline: "From the Astro Sivam family to yours: warmth, togetherness and a bright new beginning.",
      facts: ["Light", "Togetherness", "New beginnings"],
      cta: "Warm wishes",
    },
    {
      kicker: "Thai Pongal",
      serviceTitle: "Harvest and gratitude",
      headline: "Abundance, shared with gratitude.",
      subline: "Celebrating the harvest, the sun and the hands that bring us together.",
      facts: ["Harvest", "Gratitude", "Abundance"],
      cta: "Warm Pongal wishes",
    },
    {
      kicker: "Karthigai Deepam",
      serviceTitle: "A little light, leading",
      headline: "Let a little light lead the way.",
      subline: "May the lamps of Karthigai bring warmth, clarity and peace to your home.",
      facts: ["Lamps", "Clarity", "Peace"],
      cta: "Karthigai wishes",
    },
  ],
  murugan: [
    {
      kicker: "Lord Murugan",
      serviceTitle: "Skanda Sashti",
      headline: "A name, a prayer, a new clarity.",
      subline: "For the six days of Skanda Sashti: a short prayer, a lamp and a clear intention for the year.",
      facts: ["Six days", "One lamp", "A clear intention"],
      cta: "Begin the six days",
    },
    {
      kicker: "Murugan Devotion",
      serviceTitle: "The Vel",
      headline: "May your devotion find its answer.",
      subline: "Send your intention. We keep the lamp, the vel and the prayer in one simple daily practice.",
      facts: ["Daily practice", "Lamp + vel", "Priest-guided"],
      cta: "Light a lamp",
    },
    {
      kicker: "Skanda",
      serviceTitle: "The turning point",
      headline: "The spear of light at the turning point.",
      subline: "A devotion for the week you must decide — read with your chart, never against it.",
      facts: ["Chart-led", "One decision", "Seven days"],
      cta: "Ask for guidance",
    },
  ],
};

/* ------------------------------- artwork ---------------------------------- */

/**
 * Artwork follows the service, not the catalogue position: a naming poster must
 * not show a Pongal pot, and a Deepavali wish must not show Karthigai lamps.
 * Where a category genuinely has several subjects (festivals) the picture is
 * chosen from the same index as the copy, so word and image always agree.
 */
const ART: Record<Exclude<DesignCategory, "festival">, string> = {
  birth: "/art/birth-jathagam.jpg",
  wedding: "/art/wedding-matching.jpg",
  baby: "/art/baby-naming.jpg",
  muhurtham: "/art/subha-muhurtham.jpg",
  navagraha: "/art/navagraha.jpg",
  murugan: "/art/murugan-devotional.jpg",
};
const FESTIVAL_ART = ["/art/deepavali.jpg", "/art/pongal.jpg", "/art/karthigai.jpg"];

/* ------------------------------- recipes ---------------------------------- */

const TRADITIONAL: Recipe[] = [
  { layout: "sanctum", theme: "midnight", type: "cinzel", background: "parchment", frame: "doubleRule", ornament: "lampRow", art: "arch" },
  { layout: "pillars", theme: "kumkum", type: "cormorant", background: "marble", frame: "pillarRails", ornament: "kolam", art: "plate" },
  { layout: "medallion", theme: "saffron", type: "playfair", background: "radial", frame: "goldBorder", ornament: "mandalaRings", art: "circle" },
  { layout: "scroll", theme: "ivory", type: "marcellus", background: "parchment", frame: "topBottomBands", ornament: "ruleDiamond", art: "circle" },
  { layout: "horizon", theme: "granite", type: "cinzel", background: "marble", frame: "hairline", ornament: "toran", art: "fullBleed" },
  { layout: "sanctum", theme: "jade", type: "cormorant", background: "silk", frame: "cornerTicks", ornament: "jasmine", art: "arch" },
  { layout: "band", theme: "sand", type: "editorialPair", background: "parchment", frame: "hairline", ornament: "kolam", art: "banner" },
  { layout: "pillars", theme: "ivory", type: "cinzel", background: "flat", frame: "pillarRails", ornament: "lampRow", art: "arch" },
  { layout: "medallion", theme: "kumkum", type: "cormorant", background: "silk", frame: "doubleRule", ornament: "ruleDiamond", art: "circle" },
  { layout: "scroll", theme: "forest", type: "playfair", background: "marble", frame: "topBottomBands", ornament: "starMap", art: "duotone" },
  { layout: "horizon", theme: "saffron", type: "modernHeritage", background: "radial", frame: "none", ornament: "lampRow", art: "fullBleed" },
  { layout: "sanctum", theme: "rose", type: "playfair", background: "silk", frame: "cornerTicks", ornament: "jasmine", art: "plate" },
];

const MODERN: Recipe[] = [
  { layout: "ledger", theme: "ivory", type: "swiss", background: "flat", frame: "none", ornament: "ruleDiamond", art: "plate" },
  { layout: "splitField", theme: "obsidian", type: "modernHeritage", background: "halftone", frame: "hairline", ornament: "none", art: "sideColumn" },
  { layout: "corner", theme: "midnight", type: "technical", background: "starfield", frame: "cornerTicks", ornament: "starMap", art: "cornerCrop" },
  { layout: "grid", theme: "sand", type: "swiss", background: "grid", frame: "none", ornament: "none", art: "plate" },
  { layout: "band", theme: "ink", type: "editorialPair", background: "halftone", frame: "topBottomBands", ornament: "ruleDiamond", art: "banner" },
  { layout: "ledger", theme: "jade", type: "technical", background: "flat", frame: "hairline", ornament: "starMap", art: "duotone" },
  { layout: "splitField", theme: "kumkum", type: "swiss", background: "flat", frame: "none", ornament: "none", art: "sideColumn" },
  { layout: "corner", theme: "granite", type: "cinzel", background: "starfield", frame: "none", ornament: "starMap", art: "cornerCrop" },
  { layout: "grid", theme: "terracotta", type: "swiss", background: "grid", frame: "cornerTicks", ornament: "none", art: "plate" },
  { layout: "band", theme: "ivory", type: "modernHeritage", background: "flat", frame: "hairline", ornament: "kolam", art: "banner" },
  { layout: "ledger", theme: "forest", type: "editorialPair", background: "grid", frame: "topBottomBands", ornament: "none", art: "duotone" },
  { layout: "splitField", theme: "dawn", type: "marcellus", background: "halftone", frame: "hairline", ornament: "jasmine", art: "circle" },
];

/* --------------------------------- names ---------------------------------- */

const NAMES: Record<DesignCategory, { traditional: string[]; modern: string[] }> = {
  birth: {
    traditional: [
      "Jathagam Sanctum", "Kolam Dawn", "Pillar of Light", "The Palm-Leaf Reading", "Gold Meridian", "Midnight Mandala",
      "Ivory Astrolabe", "Granite Chart", "Lamp at the Threshold", "Silk Almanac", "Temple Ledger",
    ],
    modern: [
      "Ephemeris Grid", "Quiet Chart", "Orbit No. 5", "Chart in Negative", "Swiss Jyotish", "Paper Ephemeris",
      "Line and Degree", "Night Atlas", "Copper Diagram", "Star Chart Minimal", "Birth Blueprint",
    ],
  },
  wedding: {
    traditional: [
      "Jasmine Sanctum", "Muhurtham Silk", "Rose Kolam", "Two Lamps", "Wedding Mandala", "Kanchipuram Pair",
      "Garland Arch", "Ivory Porutham", "Saffron Union", "Temple Threshold", "Palm-Leaf Promise",
    ],
    modern: [
      "Porutham Grid", "Two Charts, One Field", "Blush Editorial", "Union Diagram", "Modern Mangalyam", "Quiet Vow",
      "Colour Block Wedding", "Orbit of Two", "Metric Match", "Paper Invitation", "Rose Blueprint",
    ],
  },
  baby: {
    traditional: [
      "Cradle Sanctum", "Lotus Cradle", "Naming Lamp", "Ivory Nakshatra", "Kolam Cradle", "Jasmine Cradle",
      "Soft Mandala", "Palm-Leaf Name", "Dawn Cradle", "Grandmother's Kolam",
    ],
    modern: [
      "Nakshatra Grid", "First Letter", "Quiet Nursery", "Cradle Diagram", "Paper Mobile", "Blush Cradle",
      "Star Syllable", "Newborn Atlas", "Modern Namakaranam", "Soft Geometry",
    ],
  },
  muhurtham: {
    traditional: [
      "Muhurtham Sanctum", "Calendar Scroll", "Brass Almanac", "Lamp Calendar", "Six-Month Kolam", "Saffron Date",
      "Temple Calendar", "Ivory Panchangam", "Mandala of Days", "Granite Muhurtham", "Silk Window",
    ],
    modern: [
      "Date Grid", "Six-Month Ledger", "Auspicious Windows", "Calendar Diagram", "Quiet Date", "Swiss Panchangam",
      "Copper Calendar", "Window Atlas", "Time Field", "Paper Planner", "Date Blueprint",
    ],
  },
  navagraha: {
    traditional: [
      "Navagraha Sanctum", "Planetary Mandala", "Temple Orrery", "Lamp of Saturn", "Jade Grahas", "Gold Ephemeris",
      "Sade Sati Scroll", "Granite Sky", "Nine Pillars", "Ivory Orrery", "Cosmic Kolam",
    ],
    modern: [
      "Orbit Grid", "Nine Bodies", "Transit Diagram", "Saturn in Field", "Night Atlas II", "Graha Blueprint",
      "Copper Orbits", "Modern Ephemeris", "Quiet Cosmos", "Data of the Sky", "Sky Ledger",
    ],
  },
  festival: {
    traditional: [
      "Deepavali Sanctum", "Lamp Row", "Karthigai Flame", "Pongal Harvest", "Festival Mandala", "Toran Arch",
      "Kolam Morning", "Saffron Deepam", "Temple Garland", "Ivory Festival", "Lamp Ledger",
    ],
    modern: [
      "Festival Grid", "Modern Deepam", "Colour Field Festival", "Harvest Diagram", "Quiet Wish", "Lamp in Negative",
      "Blush Pongal", "Festival Atlas", "Paper Toran", "Modern Kolam", "Wish Blueprint",
    ],
  },
  murugan: {
    traditional: [
      "Vel Sanctum", "Murugan Mandala", "Peacock Arch", "Emerald Pillars", "Kandha Vel", "Temple Vel",
      "Jade Devotion", "Skanda Scroll", "Lamp for Murugan", "Ivory Vel",
    ],
    modern: [
      "Vel Grid", "Emerald Field", "Peacock Diagram", "Modern Devotion", "Quiet Vel", "Spear of Light",
      "Skanda Blueprint", "Jade Orbit", "Vel Atlas", "Devotion Ledger",
    ],
  },
};

const ORDER: DesignCategory[] = ["birth", "wedding", "baby", "muhurtham", "navagraha", "festival", "murugan"];

export const CATEGORY_META: Record<DesignCategory, { label: string; short: string; serviceId: string }> = {
  birth: { label: "Birth Jathagam", short: "Jathagam", serviceId: "jathagam" },
  wedding: { label: "Wedding Matching", short: "Wedding", serviceId: "marriage" },
  baby: { label: "Baby Naming", short: "Baby", serviceId: "baby-naming" },
  muhurtham: { label: "Subha Muhurtham", short: "Muhurtham", serviceId: "muhurtham" },
  navagraha: { label: "Navagraha & Transits", short: "Navagraha", serviceId: "transits" },
  festival: { label: "Festival Wishes", short: "Festival", serviceId: "trust" },
  murugan: { label: "Murugan Devotional", short: "Murugan", serviceId: "trust" },
};

/* ----------------------------- recipe rotation ----------------------------- */

/**
 * Seven services share one design language but must not share one look. Each
 * category rotates the recipe's palette, type stack, ground, frame, ornament and
 * art treatment by a different stride, so no two categories land on the same
 * complete recipe: the same layout is dressed six different ways. Rotation is
 * deterministic — the catalogue is identical on every machine and reload.
 */
const PALETTES: Record<Register, ThemeKey[]> = {
  traditional: ["midnight", "ivory", "kumkum", "saffron", "sand", "rose", "terracotta", "granite"],
  modern: ["obsidian", "forest", "jade", "ink", "granite", "ivory", "midnight", "dawn"],
};
const TYPES: Record<Register, TypeKey[]> = {
  traditional: ["cinzel", "cormorant", "playfair", "marcellus", "modernHeritage"],
  modern: ["swiss", "technical", "editorialPair", "modernHeritage", "marcellus"],
};
const BACKGROUNDS: BackgroundKey[] = ["flat", "radial", "parchment", "silk", "starfield", "marble", "halftone", "grid"];
const FRAMES: FrameKey[] = ["none", "hairline", "doubleRule", "cornerTicks", "topBottomBands", "pillarRails", "goldBorder"];
const ORNAMENTS: OrnamentKey[] = ["none", "kolam", "lampRow", "mandalaRings", "jasmine", "toran", "starMap", "ruleDiamond"];
const ARTS: ArtKey[] = ["fullBleed", "arch", "circle", "plate", "sideColumn", "cornerCrop", "banner", "duotone"];

const rotate = <T,>(pool: T[], value: T, steps: number): T => {
  const at = pool.indexOf(value);
  return pool[(((at < 0 ? 0 : at) + steps) % pool.length + pool.length) % pool.length];
};

const vary = (recipe: Recipe, categoryIndex: number, register: Register): Recipe => ({
  layout: recipe.layout,
  theme: rotate(PALETTES[register], recipe.theme, categoryIndex * 3),
  type: rotate(TYPES[register], recipe.type, categoryIndex * 2),
  background: rotate(BACKGROUNDS, recipe.background, categoryIndex),
  frame: rotate(FRAMES, recipe.frame, categoryIndex * 2),
  ornament: rotate(ORNAMENTS, recipe.ornament, categoryIndex * 4),
  art: rotate(ARTS, recipe.art, categoryIndex * 3),
});

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

/**
 * Catalogue order: for each service, its traditional designs then its modern
 * ones. The recipe walk uses a stride of five so a category passes through all
 * twelve recipes without repeating one.
 */
function build(): Design[] {
  const designs: Design[] = [];
  let number = 0;
  ORDER.forEach((category, categoryIndex) => {
    (["traditional", "modern"] as const).forEach((register) => {
      const recipes = register === "traditional" ? TRADITIONAL : MODERN;
      const names = NAMES[category][register];
      const offset = categoryIndex * 3 + (register === "modern" ? 5 : 0);
      names.forEach((name, index) => {
        const recipe = vary(recipes[(index * 5 + offset) % recipes.length], categoryIndex, register);
        const copyList = COPY[category];
        const copyIndex = (index + (register === "modern" ? 1 : 0)) % copyList.length;
        number += 1;
        designs.push({
          id: `${category}-${register}-${slug(name)}`,
          number,
          name,
          category,
          register,
          ...recipe,
          image: category === "festival" ? FESTIVAL_ART[copyIndex % FESTIVAL_ART.length] : ART[category],
          copy: copyList[copyIndex],
        });
      });
    });
  });
  return designs;
}

export const DESIGN_LIBRARY: Design[] = build();

export const DESIGN_MAP: Record<string, Design> = Object.fromEntries(DESIGN_LIBRARY.map((item) => [item.id, item]));

export const getDesign = (id: string | undefined | null): Design | undefined => (id ? DESIGN_MAP[id] : undefined);

export const designsFor = (category: DesignCategory, register?: Register): Design[] =>
  DESIGN_LIBRARY.filter((item) => item.category === category && (!register || item.register === register));

export const LIBRARY_COUNTS = {
  total: DESIGN_LIBRARY.length,
  traditional: DESIGN_LIBRARY.filter((item) => item.register === "traditional").length,
  modern: DESIGN_LIBRARY.filter((item) => item.register === "modern").length,
  byCategory: Object.fromEntries(ORDER.map((category) => [category, designsFor(category).length])) as Record<DesignCategory, number>,
};

export const LAYOUT_LABEL: Record<LayoutKey, string> = {
  sanctum: "Sanctum arch",
  pillars: "Carved pillars",
  scroll: "Palm-leaf scroll",
  medallion: "Medallion",
  horizon: "Full-bleed horizon",
  band: "Art band",
  ledger: "Editorial ledger",
  splitField: "Split field",
  corner: "Corner bleed",
  grid: "Modular grid",
};

export const TYPE_LABEL: Record<TypeKey, string> = {
  cinzel: "Cinzel · engraved capitals",
  cormorant: "Cormorant · high-contrast serif",
  playfair: "Playfair · editorial serif",
  marcellus: "Marcellus · quiet serif",
  swiss: "Inter Tight · Swiss sans",
  modernHeritage: "Cinzel + Inter · modern heritage",
  editorialPair: "Playfair + Inter · magazine",
  technical: "Inter Tight · technical",
};
