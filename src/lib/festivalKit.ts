import { BRAND } from "../data/brand";
import { DEITY_MAP } from "../data/deities";
import { FESTIVAL_DATES, parseCalendarDate, type DateConfidence, type FestivalDateEntry } from "../data/festivalDates";
import { FESTIVAL_MAP, type Festival } from "../data/festivals";
import type { DisplayFontKey, ScriptFontKey, ThemeKey } from "../types";
import {
  CARD_STYLE_MAP,
  type CardFormat,
  type CardLanguage,
  type FestivalCopyBlock,
  type FestivalStyle,
  type LogoPlacement,
} from "./festivalCreative";

/* ==========================================================================
   The bridge between the festival library and the card engine.

   Dates come from FESTIVAL_DATES and nowhere else. If a festival has no row
   for the chosen year the card is still rendered — with its traditional rule
   instead of a date, and the editor told why. No function here invents a date,
   a name, or a sentence that is not already in the data layer.
   ========================================================================== */

export interface FestivalDateView {
  entry: FestivalDateEntry | null;
  /** "Wednesday, 14 January 2026" — built from the IST calendar row. */
  label: string | null;
  /** The day inside a multi-day festival, e.g. "Thai Pongal". */
  note: string | null;
  confidence: DateConfidence | null;
  year: number | null;
  /** Whole days from today, negative when past. Null when undated. */
  daysAway: number | null;
}

const formatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** A verified date, formatted. Never called with a guessed string. */
export function formatFestivalDate(iso: string): string {
  return formatter.format(parseCalendarDate(iso));
}

/** Every stored year for one festival, newest last, with no duplicates. */
export function festivalYears(festivalId: string): number[] {
  const years = FESTIVAL_DATES.filter((entry) => entry.festivalId === festivalId).map((entry) =>
    Number(entry.date.slice(0, 4)),
  );
  return [...new Set(years)].sort();
}

/**
 * The date to print for a festival. Prefers the requested year; otherwise the
 * next upcoming row; otherwise nothing at all. `undefined` year = "next".
 */
export function festivalDateView(festivalId: string, year?: number | "next", from: Date = new Date()): FestivalDateView {
  const rows = FESTIVAL_DATES.filter((entry) => entry.festivalId === festivalId).sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const withDays = rows.map((entry) => ({
    entry,
    days: Math.round((parseCalendarDate(entry.date).getTime() - today) / 86_400_000),
  }));
  const picked =
    year === undefined || year === "next"
      ? (withDays.find((item) => item.days >= 0) ?? withDays[withDays.length - 1])
      : withDays.find((item) => item.entry.date.startsWith(`${year}-`));
  if (!picked) {
    return { entry: null, label: null, note: null, confidence: null, year: year === "next" ? null : (year ?? null), daysAway: null };
  }
  return {
    entry: picked.entry,
    label: formatFestivalDate(picked.entry.date),
    note: picked.entry.label ?? null,
    confidence: picked.entry.confidence,
    year: Number(picked.entry.date.slice(0, 4)),
    daysAway: picked.days,
  };
}

/** True when the festival has no stored date for the requested year. */
export function isUndated(festivalId: string, year: number): boolean {
  return !FESTIVAL_DATES.some((entry) => entry.festivalId === festivalId && entry.date.startsWith(`${year}-`));
}

/**
 * The English greeting line. The library's first sentence already *is* the
 * greeting ("Happy Thaipusam.", "Pongal greetings — …"), so it is reused
 * rather than rewritten. Anything longer than a greeting is not promoted.
 */
export function englishGreeting(festival: Festival): string {
  const raw = festival.wish.en;
  const cut = raw.split(/\s+—\s+|[.!\n]/)[0]?.trim() ?? "";
  const words = cut.split(/\s+/).filter(Boolean);
  if (!cut || cut.length > 46 || words.length > 7) return `Happy ${festival.name}`;
  return cut;
}

export interface FestivalOverrides {
  names?: Partial<{ en: string; ta: string; hi: string }>;
  greetings?: Partial<{ en: string; ta: string; hi: string }>;
  subline?: string;
  footer?: string;
  site?: string;
}

/** Assemble exactly what the painter may draw — nothing more. */
export function festivalCopy(
  festival: Festival,
  date: FestivalDateView,
  overrides: FestivalOverrides = {},
): FestivalCopyBlock {
  return {
    name: {
      en: overrides.names?.en ?? festival.name,
      ta: overrides.names?.ta ?? festival.tamil,
      hi: overrides.names?.hi ?? festival.hindi,
    },
    greeting: {
      en: overrides.greetings?.en ?? englishGreeting(festival),
      ta: overrides.greetings?.ta ?? festival.greetingTa,
      hi: overrides.greetings?.hi ?? festival.greetingHi,
    },
    subline: overrides.subline ?? festival.headline,
    dateLabel: date.label,
    // "Thai Pongal" is the festival's own name; the plate does not repeat it.
    dateNote: date.note && date.note.toLowerCase() !== festival.name.toLowerCase() ? date.note : null,
    provisional: date.confidence === "provisional",
    traditional: festival.when,
    footer: overrides.footer ?? BRAND.website,
    site: overrides.site ?? BRAND.website,
  };
}

/** The bundled deity art for a festival, or null — never a placeholder face. */
export function festivalArt(festival: Festival): string | null {
  if (!festival.deity) return null;
  return DEITY_MAP[festival.deity]?.file ?? null;
}

export interface FestivalSkin {
  theme: ThemeKey;
  display: DisplayFontKey;
  script: ScriptFontKey;
  logo: LogoPlacement;
}

/**
 * A style family carries its own type pairing, palette and logo placement, so
 * switching style changes the design rather than the tint. The festival's own
 * palette is offered as an override, not forced.
 */
export function skinFor(style: FestivalStyle, festival: Festival, format: CardFormat): FestivalSkin {
  const meta = CARD_STYLE_MAP[style] ?? CARD_STYLE_MAP.traditional;
  const useFestivalTheme = style === "traditional" || style === "sanctum" || style === "tanjore-heirloom";
  return {
    theme: useFestivalTheme ? festival.theme : meta.defaultTheme,
    display: meta.defaultDisplay,
    script: meta.defaultScript,
    logo: style === "contemporary" && format === "ig-square" ? "plaque" : meta.defaultLogo,
  };
}

/* -------------------------------- captions -------------------------------- */

export interface FestivalCaptionOptions {
  date: FestivalDateView;
  language?: CardLanguage;
  /** Verified date or the traditional rule, already formatted. */
  dateLine: string;
}

const clamp = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/** Trim a wish to whole sentences under `max`, never mid-word. */
function sentences(text: string, max: number): string {
  if (text.length <= max) return text;
  const parts = text.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const part of parts) {
    if (out && out.length + part.length + 1 > max) break;
    out = out ? `${out} ${part}` : part;
  }
  return out ? clamp(out, max) : clamp(text, max);
}

/**
 * Facebook and Instagram are written differently on purpose: Facebook gets a
 * short paragraph you can read without tapping "See more"; Instagram gets a
 * hook, the greeting in all three languages, a save prompt and a longer tag
 * set. Neither is the other with a tag removed.
 */
export function festivalCaptions(
  festival: Festival,
  options: FestivalCaptionOptions,
): { facebook: string; instagram: string } {
  const { date, language = "en", dateLine } = options;
  const when = date.label ? `${date.label}${date.confidence === "provisional" ? " (provisional — confirm on the panchang)" : ""}` : `${festival.when} — the civil date awaits this year's panchang`;
  const lead = language === "ta" ? festival.greetingTa : language === "hi" ? festival.greetingHi : englishGreeting(festival);

  const facebook = [
    `${lead} — ${festival.name}.`,
    "",
    sentences(festival.wish.en, 520),
    "",
    `📅 ${when}`,
    "",
    festival.greetingTa,
    festival.greetingHi,
    "",
    `${BRAND.tagline} Every report is prepared by a practising priest and reviewed before it reaches you.`,
    `${BRAND.website} · ${BRAND.languages}`,
    "",
    festival.hashtags.slice(0, 4).join(" "),
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();

  const instagram = [
    `${lead} ✨`,
    "",
    sentences(festival.wish.en, 300),
    "",
    `தமிழ் · ${festival.greetingTa}`,
    `हिंदी · ${festival.greetingHi}`,
    "",
    `📅 ${when}`,
    "",
    `Save this for ${festival.name}${date.note ? ` · ${date.note}` : ""}.`,
    "Jathagam, porutham and muhurtham reports — link in bio.",
    "",
    festival.hashtags.slice(0, 12).join(" "),
  ].join("\n").trim();

  return { facebook, instagram };
}

/** Character counts the platform actually enforces. */
export const CAPTION_LIMITS = { facebook: 5000, instagram: 2200 } as const;

export function captionWarnings(captions: { facebook: string; instagram: string }): string[] {
  const warnings: string[] = [];
  if (captions.instagram.length > CAPTION_LIMITS.instagram) {
    warnings.push(`Instagram caption is ${captions.instagram.length} characters — the API rejects anything over ${CAPTION_LIMITS.instagram}.`);
  }
  if (captions.facebook.length > CAPTION_LIMITS.facebook) {
    warnings.push(`Facebook caption is ${captions.facebook.length} characters — over the ${CAPTION_LIMITS.facebook} limit.`);
  }
  return warnings;
}

/** The rows the calendar and export surfaces use, in date order. */
export interface DatedFestival {
  festival: Festival;
  entry: FestivalDateEntry;
  daysAway: number;
}

export function datedFestivals(from: Date = new Date(), windowYears = 1): DatedFestival[] {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const horizon = today + windowYears * 366 * 86_400_000;
  return FESTIVAL_DATES.map((entry) => {
    const festival = FESTIVAL_MAP[entry.festivalId];
    return festival
      ? { festival, entry, daysAway: Math.round((parseCalendarDate(entry.date).getTime() - today) / 86_400_000) }
      : null;
  })
    .filter((item): item is DatedFestival => item !== null)
    .filter((item) => {
      const time = parseCalendarDate(item.entry.date).getTime();
      return time >= today && time <= horizon;
    })
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date));
}
