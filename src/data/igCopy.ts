import type { DeityKey, ThemeKey } from "../types";
import type { IgContent, IgLayout } from "../lib/igCreative";
import { getDeity } from "./deities";
import { IG_HIGHLIGHTS } from "./instagram";

/**
 * The nine-post grid, plus the story and reel entries.
 *
 * The grid is composed as a whole before any single post is written:
 *
 *     art    ·  type   ·  quote
 *     type   ·  art    ·  type
 *     quote  ·  type   ·  art
 *
 * Art posts take the main diagonal, quote plates take the anti-diagonal, and
 * educational notes fill the edges. Several posts share a layout — that is the
 * point: a grid of nine different layouts reads as nine different brands.
 * What changes between two notes is the subject, the register and the art
 * direction, never the type system.
 */

export type IgCategory = "service" | "education" | "quote" | "story" | "reel";

export interface IgCopyEntry {
  id: string;
  category: IgCategory;
  layout: IgLayout;
  label: string;
  /** Which service the post sells, if any. */
  serviceId: string | null;
  theme: ThemeKey;
  /** The painting behind the art-led layouts. Omitted where the painter has no art. */
  art?: DeityKey;
  content: IgContent;
  captions: {
    instagram: string;
    facebook: string;
  };
  /** Alt text is sent to Meta with the container; 1,000 characters is the API cap. */
  altText: string;
  hashtags: string[];
  cta: {
    line: string;
    url: string;
    /** The saved reply that answers the DM this post invites. */
    dmKeyword: string;
  };
  /** Why this post is in this slot. Shown in the grid planner. */
  placement: string;
}

export interface IgGridSlot {
  entryId: string;
  row: number;
  col: number;
  /** Light or dark ground — the checker rhythm of the grid. */
  register: "dark" | "light";
  /** What the eye lands on first. */
  focal: "art" | "type";
}

const FOOTER = "astrosivam.com";
const TAGS_CORE = ["#AstroSivam", "#VedicAstrology", "#Jyotish"];
const TAGS_LOCAL = ["#TamilNadu", "#Chennai"];
const tags = (...extra: string[]) => [...TAGS_CORE, ...extra.slice(0, 2)];

export const IG_COPY_ENTRIES: IgCopyEntry[] = [
  /* ------------------------------- 1 · service ---------------------------- */
  {
    id: "ig-jathagam",
    category: "service",
    layout: "ig-service",
    label: "Birth Jathagam",
    serviceId: "jathagam",
    theme: "kumkum",
    art: "ganesha",
    content: {
      kicker: "Birth Jathagam",
      headline: "Your life, mapped to the minute.",
      subline: "",
      tamil: "பிறப்பு ஜாதகம்",
      chips: ["Rasi + Navamsa charts", "Vimshottari dasa timeline", "Sade Sati & pariharams"],
      price: "US$5 · ₹470 · first report free",
      cta: "astrosivam.com/birth-jathagam",
      footer: FOOTER,
    },
    captions: {
      instagram:
        "The minute you were born fixes the Lagna. Everything else follows.\n\nOur Birth Jathagam is cast on the Lahiri sidereal zodiac, reviewed by Tamil Nadu temple priests, and written in plain language — English, தமிழ் or हिंदी.\n\nInside: Rasi and Navamsa charts, the Vimshottari dasa timeline, and the Sade Sati periods with the pariharams that tradition actually prescribes.\n\nUS$5 · ₹470 · first report free during the Beta.\n\nastrosivam.com/birth-jathagam",
      facebook:
        "The minute you were born fixes the Lagna. Everything else follows.\n\nA full Birth Jathagam, cast sidereally and read by our temple-priest team: Rasi and Navamsa charts, the Vimshottari dasa timeline, Sade Sati periods and pariharams.\n\nUS$5 · ₹470 · first report free during the Beta. astrosivam.com/birth-jathagam",
    },
    altText:
      "Maroon card for the Birth Jathagam. A gilded Ganesha portrait fills the right panel; on the left, the headline 'Your life, mapped to the minute', the Tamil words பிறப்பு ஜாதகம், three deliverable lines, a price panel reading US$5 and ₹470, and the site address.",
    hashtags: tags("#Jathagam", "#BirthChart"),
    cta: { line: "Order the jathagam", url: "astrosivam.com/birth-jathagam", dmKeyword: "JATHAGAM" },
    placement: "Top-left corner: the flagship, so the first thing the eye meets is the paid service.",
  },
  {
    id: "ig-porutham",
    category: "education",
    layout: "ig-education",
    label: "What a porutham score hides",
    serviceId: "marriage",
    theme: "ivory",
    art: "meenakshi",
    content: {
      kicker: "Marriage compatibility",
      headline: "A 9 out of 10 can still miss Rajju.",
      subline:
        "Ten classical poruthams · Rajju and Vedha checked separately · both running dashas read together · one verdict, in plain language.",
      tamil: "திருமணப் பொருத்தம்",
      chips: [],
      price: "",
      cta: "Read the ten poruthams",
      footer: FOOTER,
      index: "02",
    },
    captions: {
      instagram:
        "A 9/10 match can still miss Rajju — and Rajju is the one that matters.\n\nMatching apps score the ten poruthams and stop. We read all ten, then check Rajju, Vedha, Kuja dosha balancing and the running dasha of both people. The verdict comes in one paragraph, not a chart you have to interpret.\n\nBoth charts, one fee: US$5 · ₹470.\n\nastrosivam.com/marriage-compatibility",
      facebook:
        "A 9/10 porutham score can still miss Rajju.\n\nWe check all ten classical poruthams, then the four things a score hides: Rajju, Vedha, Kuja dosha balancing and both running dashas.\n\nBoth charts, one fee: US$5 · ₹470. astrosivam.com/marriage-compatibility",
    },
    altText:
      "Ivory guide page. Headline 'A 9 out of 10 can still miss Rajju', a paragraph explaining the ten poruthams and the extra checks, the Tamil words திருமணப் பொருத்தம், and a link to read the ten poruthams.",
    hashtags: tags("#Porutham", "#MarriageMatching"),
    cta: { line: "Read the ten poruthams", url: "astrosivam.com/marriage-compatibility", dmKeyword: "PORUTHAM" },
    placement: "Second tile: a light note straight after the dark service card starts the checker.",
  },

  /* --------------------------------- 2 · quote ---------------------------- */
  {
    id: "ig-quote-method",
    category: "quote",
    layout: "ig-quote",
    label: "Type plate — method",
    serviceId: null,
    theme: "midnight",
    content: {
      kicker: "Method",
      headline: "Ancient Jyotish. Ephemeris precision.",
      subline: "",
      tamil: "",
      chips: [],
      price: "",
      cta: "",
      footer: FOOTER,
      attribution: "Astro Sivam · Walajapet",
    },
    captions: {
      instagram:
        "Ancient Jyotish. Ephemeris precision.\n\nThe calculation is Swiss Ephemeris, sidereal and Lahiri-corrected. The reading is a person. We do not let either one pretend to be the other.\n\nastrosivam.com/services",
      facebook:
        "Ancient Jyotish. Ephemeris precision.\n\nThe calculation is Swiss Ephemeris, sidereal and Lahiri-corrected. The reading is a person. astrosivam.com/services",
    },
    altText: "Charcoal type plate reading 'Ancient Jyotish. Ephemeris precision.' above the Astro Sivam mark.",
    hashtags: tags(),
    cta: { line: "Read the method", url: "astrosivam.com/services", dmKeyword: "SAMPLE" },
    placement: "Top-right corner: a type plate closes the first row and gives the grid its first breath.",
  },
  {
    id: "ig-baby-naming",
    category: "education",
    layout: "ig-education",
    label: "Baby naming — the syllable",
    serviceId: "baby-naming",
    theme: "sand",
    art: "krishna",
    content: {
      kicker: "Namakaranam",
      headline: "The first syllable is already written.",
      subline:
        "The birth star gives four pada syllables · parents choose the name inside them · the certificate records the pronunciation in Tamil script.",
      tamil: "நாமகரணம்",
      chips: [],
      price: "",
      cta: "See a naming certificate",
      footer: FOOTER,
      index: "04",
    },
    captions: {
      instagram:
        "Your baby's first syllable is not a guess.\n\nThe birth star (nakshatra) carries four padas, and each pada gives a starting syllable. We calculate all four from the date, exact time and place — then you choose the name inside them.\n\nThe certificate records the name in Tamil script with the pronunciation, so the family and the temple agree.\n\nUS$5 · ₹470 · astrosivam.com/baby-naming",
      facebook:
        "Your baby's first syllable is not a guess.\n\nThe nakshatra carries four padas, each with a starting syllable. We calculate all four and send the naming certificate in Tamil script.\n\nUS$5 · ₹470 · astrosivam.com/baby-naming",
    },
    altText:
      "Warm sand-coloured guide page. Headline 'The first syllable is already written', a line about the four pada syllables and the naming certificate, and the Tamil words நாமகரணம்.",
    hashtags: tags("#BabyNaming", "#Namakaranam"),
    cta: { line: "See a naming certificate", url: "astrosivam.com/baby-naming", dmKeyword: "BABY" },
    placement: "First tile of the middle row: light again, but a different light — sand rather than ivory.",
  },
  {
    id: "ig-muhurtham",
    category: "service",
    layout: "ig-carousel-cover",
    label: "Carousel — muhurtham dates",
    serviceId: "muhurtham",
    theme: "kumkum",
    art: "meenakshi",
    content: {
      kicker: "Subha Muhurtham",
      headline: "Six months. Every date that agrees with the sky.",
      subline: "Wedding, Griha Pravesam, Bhoomi Pooja, business opening — checked against Nalla Neram and Rahu Kalam.",
      tamil: "சுப முகூர்த்தம்",
      chips: [],
      price: "US$10 · ₹940",
      cta: "",
      footer: FOOTER,
      index: "01 / 07",
    },
    captions: {
      instagram:
        "Six months of dates, already checked against the sky.\n\nSwipe through the seven slides: how a muhurtham is chosen, what Nalla Neram and Rahu Kalam actually rule out, and the four details we need from you.\n\nUS$10 · ₹940 for the full six-month set.\n\nastrosivam.com/muhurtham",
      facebook:
        "Six months of dates, already checked against the sky.\n\nA Subha Muhurtham set covers weddings, Griha Pravesam, Bhoomi Pooja and business openings, filtered by Nalla Neram and Rahu Kalam.\n\nUS$10 · ₹940 · astrosivam.com/muhurtham",
    },
    altText:
      "Carousel cover with an arched Ganesha portrait above the headline 'Six months. Every date that agrees with the sky.', a slide index of 01 of 07, a swipe cue and the price US$10 and ₹940.",
    hashtags: tags("#Muhurtham", "#WeddingDate"),
    cta: { line: "Open the date set", url: "astrosivam.com/muhurtham", dmKeyword: "MUHURTHAM" },
    placement: "Centre tile: the carousel is the most valuable post, so it takes the focal position.",
  },
  {
    id: "ig-panchangam",
    category: "education",
    layout: "ig-education",
    label: "Panchangam — five limbs",
    serviceId: "panchangam",
    theme: "ivory",
    art: "murugan",
    content: {
      kicker: "Daily Panchangam",
      headline: "Five limbs, every single day.",
      subline:
        "Tithi names the lunar day · Nakshatra the star · Yoga and Karana refine the hour · Varam is the weekday itself.",
      tamil: "பஞ்சாங்கம்",
      chips: [],
      price: "",
      cta: "Read today's panchangam",
      footer: FOOTER,
      index: "06",
    },
    captions: {
      instagram:
        "Panchangam means five limbs. Each answers a different question about today.\n\nTithi — the lunar day. Nakshatra — the star the moon sits in. Yoga and Karana — the quality of the hour. Varam — the weekday itself.\n\nRead it free, every morning, with your own city and timezone: astrosivam.com/panchangam",
      facebook:
        "Panchangam means five limbs: Tithi, Nakshatra, Yoga, Karana and Varam. Each answers a different question about the same day.\n\nFree every morning — astrosivam.com/panchangam",
    },
    altText:
      "Ivory guide page titled 'Five limbs, every single day', listing Tithi, Nakshatra, Yoga, Karana and Varam, with the Tamil word பஞ்சாங்கம் and a link to today's panchangam.",
    hashtags: tags("#Panchangam", "#DailyPanchangam"),
    cta: { line: "Read today's panchangam", url: "astrosivam.com/panchangam", dmKeyword: "PANCHANGAM" },
    placement: "Sixth tile: the daily habit sits beside the carousel, where a profile visitor is still reading.",
  },

  /* ---------------------------------- 3 · quote --------------------------- */
  {
    id: "ig-quote-trust",
    category: "quote",
    layout: "ig-quote",
    label: "Type plate — samples",
    serviceId: null,
    theme: "kumkum",
    content: {
      kicker: "Before you pay",
      headline: "Read the whole report before you order.",
      subline: "",
      tamil: "",
      chips: [],
      price: "",
      cta: "",
      footer: FOOTER,
      attribution: "A full sample on every order page",
    },
    captions: {
      instagram:
        "You should not have to pay to find out what you are paying for.\n\nEvery order page links a complete sample — same layout, same depth, same languages. Read it before you spend anything.\n\nastrosivam.com/services",
      facebook:
        "You should not have to pay to find out what you are paying for.\n\nEvery order page links a complete sample report — same layout, same depth. astrosivam.com/services",
    },
    altText: "Maroon type plate reading 'Read the whole report before you order.' with a note that a full sample is on every order page.",
    hashtags: tags("#SampleReport"),
    cta: { line: "Open a sample", url: "astrosivam.com/services", dmKeyword: "SAMPLE" },
    placement: "Bottom-left corner: the second type plate answers the objection the profile has just raised.",
  },
  {
    id: "ig-sade-sati",
    category: "education",
    layout: "ig-education",
    label: "Sade Sati — the season",
    serviceId: "transits",
    theme: "sand",
    art: "hanuman",
    content: {
      kicker: "Transits",
      headline: "Sade Sati is a season, not a sentence.",
      subline:
        "Saturn crosses three signs around your Moon · each phase lasts about seven and a half years · pariharams are traditional remedies, not guarantees.",
      tamil: "சனி பெயர்ச்சி",
      chips: [],
      price: "",
      cta: "Read the transit guide",
      footer: FOOTER,
      index: "08",
    },
    captions: {
      instagram:
        "Sade Sati is a season, not a sentence.\n\nSaturn crosses three signs around your natal Moon; each phase runs about seven and a half years. What changes is the house it transits, and what that house rules in your chart.\n\nThe guide explains the phases, the pariharams tradition actually prescribes, and why the end date is calculable.\n\nastrosivam.com/transits",
      facebook:
        "Sade Sati is a season, not a sentence. Saturn crosses three signs around your Moon, roughly seven and a half years each. The guide explains the phases and the traditional pariharams. astrosivam.com/transits",
    },
    altText:
      "Sand-coloured guide page titled 'Sade Sati is a season, not a sentence', explaining the three Saturn transits, their duration and the traditional pariharams.",
    hashtags: tags("#SadeSati", "#Transits"),
    cta: { line: "Read the transit guide", url: "astrosivam.com/transits", dmKeyword: "JATHAGAM" },
    placement: "Eighth tile: light again before the closing dark card, so the grid ends on a strong corner.",
  },
  {
    id: "ig-first-free",
    category: "service",
    layout: "ig-service",
    label: "First report free",
    serviceId: "trust",
    theme: "midnight",
    art: "krishna",
    content: {
      kicker: "Beta offer",
      headline: "The first report is free. Genuinely.",
      subline: "",
      tamil: "முதல் அறிக்கை இலவசம்",
      chips: ["One per customer", "No card, no subscription", "90% refund before approval"],
      price: "US$5 · ₹470 · after your first report",
      cta: "astrosivam.com/services",
      footer: FOOTER,
    },
    captions: {
      instagram:
        "The first report is free. No card, no subscription, no trial that renews itself.\n\nOrder a Birth Jathagam, Porutham or Baby Naming report and read the whole thing before you pay anything. One free report per customer, during the Beta.\n\nAfter that: US$5 · ₹470. 90% refund before approval.\n\nastrosivam.com/services",
      facebook:
        "The first report is free — no card, no subscription. One per customer during the Beta. After that US$5 · ₹470, with a 90% refund before approval.\n\nastrosivam.com/services",
    },
    altText:
      "Midnight-blue service card for the free first report, with the Tamil words முதல் அறிக்கை இலவசம், three lines about the offer and the price US$5 and ₹470 afterwards.",
    hashtags: tags("#FreeReport", "#AstrologyReport"),
    cta: { line: "Claim the free report", url: "astrosivam.com/services", dmKeyword: "PRICE" },
    placement: "Bottom-right corner: the offer closes the grid on the main diagonal with the flagship.",
  },
];

export const IG_COPY_BY_ID: Record<string, IgCopyEntry> = Object.fromEntries(
  IG_COPY_ENTRIES.map((entry) => [entry.id, entry]),
);

/** The 3 × 3 composition, row by row. */
export const IG_GRID_PLAN: IgGridSlot[] = [
  { entryId: "ig-jathagam", row: 0, col: 0, register: "dark", focal: "art" },
  { entryId: "ig-porutham", row: 0, col: 1, register: "light", focal: "type" },
  { entryId: "ig-quote-method", row: 0, col: 2, register: "dark", focal: "type" },
  { entryId: "ig-baby-naming", row: 1, col: 0, register: "light", focal: "type" },
  { entryId: "ig-muhurtham", row: 1, col: 1, register: "dark", focal: "art" },
  { entryId: "ig-panchangam", row: 1, col: 2, register: "light", focal: "type" },
  { entryId: "ig-quote-trust", row: 2, col: 0, register: "dark", focal: "type" },
  { entryId: "ig-sade-sati", row: 2, col: 1, register: "light", focal: "type" },
  { entryId: "ig-first-free", row: 2, col: 2, register: "dark", focal: "art" },
];

export const IG_GRID_NOTES = [
  "Art posts sit on the main diagonal, so the eye travels corner → centre → corner without reading a tile.",
  "Quote plates sit on the anti-diagonal: two type posts, one line each, giving the grid its pauses.",
  "Education posts fill the four edges and alternate ivory and sand, so no two neighbours share a ground.",
  "No two tiles side by side share both register and focal — the checker holds in every direction.",
];

/* --------------------------------- stories -------------------------------- */

export interface IgStoryEntry {
  id: string;
  label: string;
  theme: ThemeKey;
  art?: DeityKey;
  content: IgContent;
  /** What the sticker slot should contain when the frame is posted from the app. */
  sticker: string;
  caption: string;
}

export const IG_STORY_ENTRIES: IgStoryEntry[] = [
  {
    id: "story-panchangam",
    label: "Morning panchangam",
    theme: "midnight",
    art: "murugan",
    content: {
      kicker: "Today",
      headline: "Today's panchangam, in five lines.",
      subline: "Tithi, nakshatra, Rahu Kalam and the next festival — calculated for your city, not Chennai's.",
      tamil: "இன்றைய பஞ்சாங்கம்",
      chips: [],
      price: "",
      cta: "Read it free",
      footer: FOOTER,
    },
    sticker: "Link sticker → astrosivam.com/panchangam",
    caption: "Story frame for the daily panchangam. The link sticker replaces the CTA line when posted from the app.",
  },
  {
    id: "story-sample",
    label: "Sample-before-you-pay",
    theme: "kumkum",
    art: "ganesha",
    content: {
      kicker: "Before you pay",
      headline: "Look at the whole report first.",
      subline: "Every order page opens a full sample PDF. Same layout, same depth, no email wall.",
      tamil: "மாதிரி அறிக்கை",
      chips: [],
      price: "",
      cta: "Open a sample",
      footer: FOOTER,
    },
    sticker: "Link sticker → astrosivam.com/services",
    caption: "Trust story. Ask for the tap, never for the order, in the first frame.",
  },
  {
    id: "story-festival",
    label: "Festival greeting",
    theme: "kumkum",
    art: "lakshmi",
    content: {
      kicker: "Deepavali",
      headline: "May this Deepavali light every corner of your home.",
      subline: "From all of us at Astro Sivam.",
      tamil: "தீபாவளி வாழ்த்துக்கள்",
      chips: [],
      price: "",
      cta: "",
      footer: FOOTER,
    },
    sticker: "Poll sticker → what are you praying for this year?",
    caption: "Greeting story. No CTA, no link — the one story that asks for nothing.",
  },
];

/* ---------------------------------- reels --------------------------------- */

export interface IgReelEntry {
  id: string;
  label: string;
  theme: ThemeKey;
  art?: DeityKey;
  content: IgContent;
  /** The hook spoken or captioned in the Reel itself. */
  hook: string;
  caption: string;
}

export const IG_REEL_ENTRIES: IgReelEntry[] = [
  {
    id: "reel-sade-sati",
    label: "Sade Sati — the end date",
    theme: "midnight",
    art: "hanuman",
    content: {
      kicker: "Transits",
      headline: "Sade Sati ends.",
      subline: "",
      tamil: "சனி பெயர்ச்சி",
      chips: [],
      price: "",
      cta: "Ask for dates",
      footer: FOOTER,
    },
    hook: "Your Sade Sati has an end date. It is printed in your chart.",
    caption:
      "Your Sade Sati has an end date, and it is printed in your chart.\n\nSaturn crosses three signs around your natal Moon; the last phase ends on a calculable date. Send your birth details and we will tell you when.",
  },
  {
    id: "reel-three-things",
    label: "Three things a horoscope app cannot",
    theme: "kumkum",
    art: "saraswati",
    content: {
      kicker: "Jathagam",
      headline: "Three things.",
      subline: "",
      tamil: "ஜாதகம்",
      chips: [],
      price: "",
      cta: "See the method",
      footer: FOOTER,
    },
    hook: "Three things your jathagam knows that a horoscope app does not.",
    caption:
      "Three things your jathagam knows that a sun-sign app does not: your Lagna, your running dasha, and the exact date a transit ends.\n\nOne needs your birth minute. The app does not have it. We do.",
  },
];

/* ------------------------------- highlights -------------------------------- */

/**
 * Highlight covers reuse the seven planned highlights but keep only the symbol,
 * because Instagram renders the label itself under a 64 px circle.
 */
export const IG_HIGHLIGHT_COVERS = IG_HIGHLIGHTS.map((highlight) => ({
  id: highlight.id,
  label: highlight.label,
  glyph: highlight.glyph,
  theme: highlight.theme,
  purpose: highlight.purpose,
  stories: highlight.stories,
}));

/* --------------------------------- helpers -------------------------------- */

/** The painting file for an entry, or null when the painter draws a motif instead. */
export const igArt = (key?: DeityKey | null): string | null => getDeity(key)?.file ?? null;

export function composeIgCaption(caption: string, entry: { hashtags: string[] }): string {
  return `${caption.trim()}\n\n${entry.hashtags.slice(0, 5).join(" ")}`;
}

export function gridOrder(): IgCopyEntry[] {
  return [...IG_GRID_PLAN]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map((slot) => IG_COPY_BY_ID[slot.entryId]);
}
