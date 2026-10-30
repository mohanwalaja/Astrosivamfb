import { FESTIVALS, FESTIVAL_MAP, type Festival } from "./festivals";

/**
 * Real civil dates for each festival, so the library can answer "what is coming
 * up?" instead of only "what exists?".
 *
 * Source of truth: Tamil panchang for Chennai / Tamil Nadu (Drik Panchang,
 * Prokerala, Tamil calendar listings), cross-checked against at least two
 * independent 2026/2027 calendars.
 *
 * `confidence` is not decoration. Where the calendars disagree by a day the
 * entry is "provisional" and the UI shows a "check panchang" marker — a wrong
 * countdown is worse than an honest one. Where they disagree by more than a
 * week (Karthigai Deepam and Vaikunta Ekadasi 2027), no date is stored at all
 * and the card says the date is still to confirm.
 *
 * Festivals observed in Tamil Nadu that fall on a star/nakshatra can differ by a
 * day between temples and between years, so the plan is always: this card is a
 * reminder, the panchang is the authority.
 */

export type DateConfidence = "confirmed" | "provisional";

export interface FestivalDateEntry {
  festivalId: string;
  /** ISO calendar date in IST (Asia/Kolkata) — no time component, no UTC shift. */
  date: string;
  /** Which day of a multi-day festival this is, e.g. "Bhogi", "Soorasamharam". */
  label?: string;
  confidence: DateConfidence;
}

export const FESTIVAL_DATES: FestivalDateEntry[] = [
  /* ---------------------------------- 2026 --------------------------------- */
  { festivalId: "new-year", date: "2026-01-01", confidence: "confirmed" },
  { festivalId: "arudra-darshan", date: "2026-01-03", confidence: "confirmed" },
  { festivalId: "pongal", date: "2026-01-14", label: "Thai Pongal", confidence: "confirmed" },
  { festivalId: "rathasaptami", date: "2026-01-25", confidence: "confirmed" },
  { festivalId: "vasant-panchami", date: "2026-01-23", confidence: "confirmed" },
  { festivalId: "thaipusam", date: "2026-02-01", confidence: "confirmed" },
  { festivalId: "valentines-day", date: "2026-02-14", confidence: "confirmed" },
  { festivalId: "shivaratri", date: "2026-02-15", confidence: "confirmed" },
  { festivalId: "womens-day", date: "2026-03-08", confidence: "confirmed" },
  { festivalId: "rama-navami", date: "2026-03-27", confidence: "confirmed" },
  { festivalId: "panguni-uthiram", date: "2026-04-01", confidence: "provisional" },
  { festivalId: "hanuman-jayanti", date: "2026-04-02", confidence: "provisional" },
  { festivalId: "puthandu", date: "2026-04-14", confidence: "confirmed" },
  { festivalId: "akshaya-tritiya", date: "2026-04-19", confidence: "confirmed" },
  { festivalId: "chitra-pournami", date: "2026-05-01", confidence: "confirmed" },
  // Chithirai Thiruvizha has a multi-day observance; omit a single 2026 date
  // until the specific event day is confirmed instead of conflating it with Pournami.
  { festivalId: "mothers-day", date: "2026-05-10", confidence: "confirmed" },
  { festivalId: "vaikasi-visakam", date: "2026-05-30", confidence: "confirmed" },
  { festivalId: "fathers-day", date: "2026-06-21", confidence: "confirmed" },
  { festivalId: "aani-uthiram", date: "2026-06-22", confidence: "provisional" },
  { festivalId: "guru-purnima", date: "2026-07-29", confidence: "confirmed" },
  { festivalId: "friendship-day", date: "2026-08-02", confidence: "confirmed" },
  { festivalId: "aadi-perukku", date: "2026-08-03", confidence: "confirmed" },
  { festivalId: "aadi-pooram", date: "2026-08-14", confidence: "confirmed" },
  { festivalId: "nag-panchami", date: "2026-08-17", confidence: "confirmed" },
  { festivalId: "onam", date: "2026-08-26", confidence: "confirmed" },
  { festivalId: "raksha-bandhan", date: "2026-08-28", confidence: "confirmed" },
  { festivalId: "varalakshmi", date: "2026-08-28", confidence: "confirmed" },
  { festivalId: "krishna-jayanthi", date: "2026-09-04", confidence: "confirmed" },
  { festivalId: "teachers-day", date: "2026-09-05", confidence: "confirmed" },
  { festivalId: "vinayaka-chaturthi", date: "2026-09-14", confidence: "confirmed" },
  { festivalId: "mahalaya-amavasya", date: "2026-10-10", confidence: "confirmed" },
  { festivalId: "navaratri", date: "2026-10-11", label: "Day one", confidence: "confirmed" },
  { festivalId: "saraswati-puja", date: "2026-10-19", label: "Maha Navami", confidence: "provisional" },
  { festivalId: "vijayadashami", date: "2026-10-20", confidence: "confirmed" },
  { festivalId: "ugadi", date: "2026-03-19", confidence: "confirmed" },
  { festivalId: "holi", date: "2026-03-03", label: "Holika Dahan", confidence: "confirmed" },
  { festivalId: "holi", date: "2026-03-04", label: "Rangwali Holi", confidence: "confirmed" },
  { festivalId: "aadi-krithigai", date: "2026-08-07", confidence: "confirmed" },
  { festivalId: "sharad-purnima", date: "2026-10-25", confidence: "confirmed" },
  { festivalId: "karva-chauth", date: "2026-10-29", confidence: "confirmed" },
  { festivalId: "ahoi-ashtami", date: "2026-10-30", confidence: "confirmed" },
  { festivalId: "dhanteras", date: "2026-11-06", confidence: "confirmed" },
  { festivalId: "naraka-chaturdashi", date: "2026-11-07", confidence: "confirmed" },
  { festivalId: "deepavali", date: "2026-11-08", confidence: "confirmed" },
  { festivalId: "bhai-dooj", date: "2026-11-11", confidence: "confirmed" },
  { festivalId: "govardhan-puja", date: "2026-11-09", confidence: "provisional" },
  { festivalId: "childrens-day", date: "2026-11-14", confidence: "confirmed" },
  { festivalId: "skanda-sashti", date: "2026-11-15", label: "Soorasamharam", confidence: "provisional" },
  { festivalId: "ayyappa-mandala", date: "2026-11-25", label: "Mandala puja begins", confidence: "provisional" },
  { festivalId: "karthigai-deepam", date: "2026-11-24", confidence: "provisional" },
  { festivalId: "vaikunta-ekadasi", date: "2026-12-20", confidence: "provisional" },
  { festivalId: "arudra-darshan", date: "2026-12-24", confidence: "confirmed" },
  { festivalId: "christmas", date: "2026-12-25", confidence: "confirmed" },

  /* ---------------------------------- 2027 --------------------------------- */
  { festivalId: "new-year", date: "2027-01-01", confidence: "confirmed" },
  { festivalId: "arudra-darshan", date: "2027-01-03", confidence: "provisional" },
  { festivalId: "pongal", date: "2027-01-15", label: "Thai Pongal", confidence: "confirmed" },
  { festivalId: "thaipusam", date: "2027-01-22", confidence: "confirmed" },
  { festivalId: "valentines-day", date: "2027-02-14", confidence: "confirmed" },
  { festivalId: "rathasaptami", date: "2027-02-13", confidence: "provisional" },
  { festivalId: "vasant-panchami", date: "2027-02-11", confidence: "confirmed" },
  { festivalId: "shivaratri", date: "2027-03-06", confidence: "confirmed" },
  { festivalId: "womens-day", date: "2027-03-08", confidence: "confirmed" },
  { festivalId: "panguni-uthiram", date: "2027-03-22", confidence: "confirmed" },
  { festivalId: "holi", date: "2027-03-22", confidence: "confirmed" },
  { festivalId: "ugadi", date: "2027-04-07", confidence: "confirmed" },
  { festivalId: "puthandu", date: "2027-04-14", confidence: "confirmed" },
  { festivalId: "chithirai", date: "2027-04-20", confidence: "provisional" },
  { festivalId: "chitra-pournami", date: "2027-05-01", confidence: "provisional" },
  { festivalId: "mothers-day", date: "2027-05-09", confidence: "confirmed" },
  { festivalId: "vaikasi-visakam", date: "2027-05-20", confidence: "confirmed" },
  { festivalId: "fathers-day", date: "2027-06-20", confidence: "confirmed" },
  { festivalId: "aani-uthiram", date: "2027-07-09", confidence: "provisional" },
  { festivalId: "friendship-day", date: "2027-08-01", confidence: "confirmed" },
  { festivalId: "aadi-perukku", date: "2027-08-03", confidence: "confirmed" },
  { festivalId: "aadi-pooram", date: "2027-08-05", confidence: "provisional" },
  { festivalId: "varalakshmi", date: "2027-08-13", confidence: "confirmed" },
  { festivalId: "krishna-jayanthi", date: "2027-08-25", confidence: "provisional" },
  { festivalId: "vinayaka-chaturthi", date: "2027-09-04", confidence: "confirmed" },
  { festivalId: "teachers-day", date: "2027-09-05", confidence: "confirmed" },
  { festivalId: "vijayadashami", date: "2027-10-10", confidence: "provisional" },
  { festivalId: "deepavali", date: "2027-10-28", confidence: "provisional" },
  { festivalId: "dhanteras", date: "2027-10-26", confidence: "provisional" },
  { festivalId: "naraka-chaturdashi", date: "2027-10-27", confidence: "provisional" },
  { festivalId: "childrens-day", date: "2027-11-14", confidence: "confirmed" },
  { festivalId: "arudra-darshan", date: "2027-12-23", confidence: "provisional" },
  { festivalId: "christmas", date: "2027-12-25", confidence: "confirmed" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse "yyyy-mm-dd" as a local calendar day — never through UTC, or IST evenings shift back a day. */
export function parseCalendarDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function toCalendarIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Whole calendar days between today and the event. 0 = today, negative = past. */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const target = parseCalendarDate(iso).getTime();
  return Math.round((target - start) / DAY_MS);
}

export interface UpcomingEvent {
  festival: Festival;
  entry: FestivalDateEntry;
  daysAway: number;
}

/** Events in the next `window` days (inclusive of today), soonest first. */
export function upcomingFestivals(window = 14, from: Date = new Date()): UpcomingEvent[] {
  return FESTIVAL_DATES.map((entry) => ({
    entry,
    festival: FESTIVAL_MAP[entry.festivalId],
    daysAway: daysUntil(entry.date, from),
  }))
    .filter((item) => item.festival && item.daysAway >= 0 && item.daysAway <= window)
    .sort((a, b) => a.daysAway - b.daysAway);
}

/** The next occurrence of one festival, or null if it has no future date on file. */
export function nextOccurrence(festivalId: string, from: Date = new Date()): UpcomingEvent | null {
  const candidates = FESTIVAL_DATES.filter((entry) => entry.festivalId === festivalId)
    .map((entry) => ({ entry, daysAway: daysUntil(entry.date, from) }))
    .filter((item) => item.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway);
  const first = candidates[0];
  if (!first) return null;
  const festival = FESTIVAL_MAP[festivalId];
  return festival ? { festival, entry: first.entry, daysAway: first.daysAway } : null;
}

/** The soonest dated festival of any kind, or null if the table runs out. */
export function nextFestival(from: Date = new Date()): UpcomingEvent | null {
  return FESTIVAL_DATES.map((entry) => ({
    entry,
    festival: FESTIVAL_MAP[entry.festivalId],
    daysAway: daysUntil(entry.date, from),
  }))
    .filter((item) => item.festival && item.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)[0] ?? null;
}

/** Festivals with no date on file for the current or next calendar year. */
export function undatedFestivals(from: Date = new Date()): Festival[] {
  const years = [from.getFullYear(), from.getFullYear() + 1];
  const dated = new Set(
    FESTIVAL_DATES.filter((entry) => years.includes(parseCalendarDate(entry.date).getFullYear())).map(
      (entry) => entry.festivalId,
    ),
  );
  return FESTIVALS.filter((festival) => !dated.has(festival.id));
}

export const DATE_COVERAGE = {
  years: [...new Set(FESTIVAL_DATES.map((entry) => entry.date.slice(0, 4)))].sort(),
  total: FESTIVAL_DATES.length,
  provisional: FESTIVAL_DATES.filter((entry) => entry.confidence === "provisional").length,
};
