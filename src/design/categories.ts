/**
 * Astrosivam Design System · campaign categories
 *
 * A category is the creative direction for one kind of campaign. It supplies the
 * illustration program, the palettes that suit it, the compositions that suit it,
 * and English sample copy the studio can drop in as a starting point.
 *
 * Nothing here invents a promise. The copy is either the studio's existing
 * service language or a neutral invitation; there are no testimonials, no
 * guarantees and no invented credentials.
 */

import type { ArtKind, ArtPlan } from "./artLibrary";
import type { CompositionKey } from "./compositions";
import type { PaletteKey } from "./palettes";

export type CategoryKey =
  | "birth-jathagam"
  | "wedding-matching"
  | "baby-naming"
  | "subha-muhurtham"
  | "astrology-education"
  | "navagraha"
  | "festival-greeting"
  | "devotional"
  | "service-ad"
  | "carousel";

/** What the category wants visually, in one line — shown in the studio. */
export interface Category {
  key: CategoryKey;
  name: string;
  /** Short creative direction. */
  direction: string;
  art: ArtPlan;
  /** Palettes the category leads with; the picker still offers all ten. */
  palettes: PaletteKey[];
  /** Compositions, best first. The engine picks from the head of this list. */
  compositions: CompositionKey[];
  sample: {
    kicker: string;
    headline: string;
    subline: string;
    cta: string;
    footer: string;
    badge?: string;
  };
  /** When true the artwork reads as a scene rather than a symbol. */
  scene?: boolean;
}

const FOOTER = "astrosivam.com";
const ISSUED = "astrosivam.com";

export const CATEGORIES: Category[] = [
  {
    key: "birth-jathagam",
    name: "Birth Jathagam",
    direction: "Premium zodiac and planetary graphics with chart-inspired structure.",
    art: { kind: "jathagam-chart" },
    palettes: ["indigo-cosmos", "maroon-gold", "violet-astral"],
    compositions: ["luxury-editorial", "cosmic-astrology", "hero-illustration", "geometric-astrology", "minimal-luxury"],
    sample: {
      kicker: "Birth Jathagam",
      headline: "Your life, mapped from the moment you were born.",
      subline: "Chitra Paksha Lahiri ayanamsa, checked by hand, delivered as a PDF with a tax invoice.",
      cta: "astrosivam.com",
      footer: ISSUED,
      badge: "Kundali · Rasi · Bhava · Varga",
    },
  },
  {
    key: "wedding-matching",
    name: "Wedding Matching",
    direction: "Paired focal points, compatibility geometry, balanced dual medallions.",
    art: { kind: "couple-seal" },
    palettes: ["kumkum-red", "maroon-gold", "ivory-sand"],
    compositions: ["split-panel", "circular-mandala", "festival-celebration", "luxury-framed", "hero-illustration"],
    sample: {
      kicker: "Thirumana Porutham",
      headline: "Match before you promise.",
      subline: "Ten porutham checked against both charts, with the Rasi and Navamsa positions written out.",
      cta: "astrosivam.com",
      footer: ISSUED,
      badge: "Ten Porutham",
    },
  },
  {
    key: "baby-naming",
    name: "Baby Naming Letters",
    direction: "Gentle illuminated initials, floral frames, welcomes.",
    art: { kind: "letter-bloom", subject: "A" },
    palettes: ["ivory-sand", "champagne-slate", "emerald-temple", "saffron-ember"],
    compositions: ["minimal-luxury", "luxury-framed", "split-panel", "typography-dominant", "luxury-editorial"],
    sample: {
      kicker: "Namakaranam",
      headline: "The letter that starts a name.",
      subline: "The nakshatra syllable for your child, with the naming ceremony date and time.",
      cta: "astrosivam.com",
      footer: ISSUED,
      badge: "Namakaranam",
    },
  },
  {
    key: "subha-muhurtham",
    name: "Subha Muhurtham",
    direction: "Calendar architecture, date blocks, auspicious marks, traditional motifs.",
    art: { kind: "auspicious-date" },
    palettes: ["kumkum-red", "saffron-ember", "maroon-gold"],
    compositions: ["split-panel", "diagonal-dynamic", "commercial-ad", "festival-celebration", "luxury-framed"],
    sample: {
      kicker: "Subha Muhurtham",
      headline: "A date the calendar agrees with.",
      subline: "Tithi, nakshatra, yoga and lagna checked for the ceremony you have in mind.",
      cta: "astrosivam.com",
      footer: ISSUED,
      badge: "Muhurtham",
    },
  },
  {
    key: "astrology-education",
    name: "Astrology Education",
    direction: "Structured infographic pages, labelled diagrams, teaching order.",
    art: { kind: "celestial-scene" },
    palettes: ["indigo-cosmos", "granite-brass", "ivory-sand"],
    compositions: ["educational-infographic", "typography-dominant", "luxury-editorial", "geometric-astrology", "split-panel"],
    sample: {
      kicker: "Learn Jyotish",
      headline: "What your chart actually records.",
      subline: "House, sign, nakshatra and dasha — explained in plain English, one idea at a time.",
      cta: "astrosivam.com",
      footer: ISSUED,
      badge: "Explainer",
    },
  },
  {
    key: "navagraha",
    name: "Navagraha Education",
    direction: "Nine planetary symbols, celestial geometry, clear hierarchy.",
    art: { kind: "navagraha-grid" },
    palettes: ["violet-astral", "indigo-cosmos", "granite-brass"],
    compositions: ["circular-mandala", "geometric-astrology", "educational-infographic", "cosmic-astrology", "luxury-editorial"],
    sample: {
      kicker: "Navagraha",
      headline: "Nine planets. Nine signatures.",
      subline: "What each graha governs, where it sits in your chart, and how the dasha period works.",
      cta: "astrosivam.com",
      footer: ISSUED,
      badge: "Graha series",
    },
  },
  {
    key: "festival-greeting",
    name: "Festival Greetings",
    direction: "Illustrated devotional artwork, garlands, celebration typography.",
    art: { kind: "festive-altar" },
    palettes: ["saffron-ember", "kumkum-red", "maroon-gold"],
    compositions: ["festival-celebration", "luxury-framed", "circular-mandala", "hero-illustration", "illustrated-story"],
    sample: {
      kicker: "Deepavali",
      headline: "May this Deepavali light every room you enter.",
      subline: "Wishing you and your family a festival of lamps, sweets and steady good fortune.",
      cta: "astrosivam.com",
      footer: "astrosivam.com",
      badge: "Festival wishes",
    },
  },
  {
    key: "devotional",
    name: "Devotional Posters",
    direction: "Refined deity emblems, mandalas, ornamented devotional compositions.",
    art: { kind: "deity-emblem", subject: "ganesha" },
    palettes: ["maroon-gold", "saffron-ember", "emerald-temple"],
    compositions: ["hero-illustration", "luxury-framed", "circular-mandala", "festival-celebration", "minimal-luxury"],
    sample: {
      kicker: "Ganesha",
      headline: "Begin with a blessing.",
      subline: "Remover of obstacles — the emblem that opens every Astro Sivam report.",
      cta: "astrosivam.com",
      footer: ISSUED,
      badge: "Darshan",
    },
  },
  {
    key: "service-ad",
    name: "Service Advertisements",
    direction: "Commercial graphic advertising, bold headline, clear price line and CTA.",
    art: { kind: "service-badge", subject: "report" },
    palettes: ["maroon-gold", "midnight-lagoon", "saffron-ember"],
    compositions: ["commercial-ad", "diagonal-dynamic", "hero-illustration", "split-panel", "luxury-editorial"],
    sample: {
      kicker: "Consultation",
      headline: "Ask one question. Get a real answer.",
      subline: "A written reading, the reasoning behind it, and seven days of follow-up chat.",
      cta: "Book a reading",
      footer: FOOTER,
      badge: "Astro Sivam",
    },
  },
  {
    key: "carousel",
    name: "Carousel Campaigns",
    direction: "Cover plus varied internal slides with continuous branding.",
    art: { kind: "celestial-scene" },
    palettes: ["indigo-cosmos", "midnight-lagoon", "violet-astral"],
    compositions: ["luxury-editorial", "educational-infographic", "split-panel", "collage-asymmetric", "diagonal-dynamic"],
    sample: {
      kicker: "Carousel · 1 of 5",
      headline: "Five things your chart already tells you.",
      subline: "Swipe for the houses that describe work, family and the years ahead.",
      cta: "Swipe",
      footer: FOOTER,
      badge: "Series",
    },
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

export const resolveCategory = (key: string | null | undefined): Category =>
  (key && CATEGORY_MAP[key]) || CATEGORIES[0];

/** Sample content for the carousel secondary slides (all English). */
export const CAROUSEL_SLIDES: Category["sample"][] = [
  {
    kicker: "Carousel · 1 of 5",
    headline: "Five things your chart already tells you.",
    subline: "Swipe for the houses that describe work, family and the years ahead.",
    cta: "Swipe",
    footer: FOOTER,
    badge: "Series",
  },
  {
    kicker: "Carousel · 2 of 5",
    headline: "The tenth house is your work.",
    subline: "Its lord, its occupant and its dasha timing describe the shape of a career.",
    cta: "Swipe",
    footer: FOOTER,
    badge: "10th house",
  },
  {
    kicker: "Carousel · 3 of 5",
    headline: "The seventh house is your partner.",
    subline: "Marriage timing comes from the seventh lord, Venus and the Navamsa chart.",
    cta: "Swipe",
    footer: FOOTER,
    badge: "7th house",
  },
  {
    kicker: "Carousel · 4 of 5",
    headline: "The dasha is the calendar.",
    subline: "Vimshottari periods place every promise of the chart on a real timeline.",
    cta: "Swipe",
    footer: FOOTER,
    badge: "Vimshottari",
  },
  {
    kicker: "Carousel · 5 of 5",
    headline: "Read the whole chart, not one line.",
    subline: "The report covers all twelve houses, the Navamsa and the dasha sequence.",
    cta: "astrosivam.com",
    footer: FOOTER,
    badge: "Full report",
  },
];

/** Illustrations the studio can swap in regardless of category. */
export interface ArtChoice {
  id: string;
  label: string;
  plan: ArtPlan;
  group: "Deity" | "Celestial" | "Chart" | "Festival" | "Service";
}

export const ART_CHOICES: ArtChoice[] = [
  { id: "ganesha", label: "Ganesha emblem", plan: { kind: "deity-emblem", subject: "ganesha" }, group: "Deity" },
  { id: "shiva", label: "Shiva trishul", plan: { kind: "deity-emblem", subject: "shiva" }, group: "Deity" },
  { id: "murugan", label: "Murugan vel", plan: { kind: "deity-emblem", subject: "murugan" }, group: "Deity" },
  { id: "lakshmi", label: "Lakshmi kalash", plan: { kind: "deity-emblem", subject: "lakshmi" }, group: "Deity" },
  { id: "saraswati", label: "Saraswati veena", plan: { kind: "deity-emblem", subject: "saraswati" }, group: "Deity" },
  { id: "durga", label: "Durga shield", plan: { kind: "deity-emblem", subject: "durga" }, group: "Deity" },
  { id: "rama", label: "Rama bow", plan: { kind: "deity-emblem", subject: "rama" }, group: "Deity" },
  { id: "hanuman", label: "Hanuman gada", plan: { kind: "deity-emblem", subject: "hanuman" }, group: "Deity" },
  { id: "venkateswara", label: "Balaji chakra", plan: { kind: "deity-emblem", subject: "venkateswara" }, group: "Deity" },
  { id: "cosmos", label: "Cosmic planets", plan: { kind: "celestial-scene" }, group: "Celestial" },
  { id: "navagraha", label: "Navagraha grid", plan: { kind: "navagraha-grid" }, group: "Celestial" },
  { id: "zodiac", label: "Zodiac medallion", plan: { kind: "zodiac-medallion", subject: "aries" }, group: "Celestial" },
  { id: "mandala", label: "Mandala rose", plan: { kind: "mandala-rose" }, group: "Celestial" },
  { id: "jathagam", label: "Jathagam chart", plan: { kind: "jathagam-chart" }, group: "Chart" },
  { id: "couple", label: "Matching seal", plan: { kind: "couple-seal" }, group: "Chart" },
  { id: "letter", label: "Naming initial", plan: { kind: "letter-bloom", subject: "A" }, group: "Chart" },
  { id: "date", label: "Date plate", plan: { kind: "auspicious-date" }, group: "Chart" },
  { id: "altar", label: "Festive altar", plan: { kind: "festive-altar" }, group: "Festival" },
  { id: "scene", label: "Narrative scene", plan: { kind: "narrative-scene" }, group: "Festival" },
  { id: "badge", label: "Service seal", plan: { kind: "service-badge", subject: "report" }, group: "Service" },
];

export const ART_BY_ID: Record<string, ArtChoice> = Object.fromEntries(ART_CHOICES.map((a) => [a.id, a]));

export const ZODIAC_SUBJECTS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type ArtKindExport = ArtKind;
