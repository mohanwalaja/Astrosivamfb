import type { Panchangam, Window } from "./panchang";
import { timeText } from "./panchang";
import { RASI_NAMES, TAMIL_MONTHS } from "../data/panchangam";

/**
 * Turns a computed panchangam into the ten strings the poster prints.
 *
 * Each string is "value | tail": the poster puts the value on the left in the
 * card's ink colour and the tail on the right in muted type, so a row reads
 * "Trayodashi … till 1:38 PM" without needing two fields in the editor.
 */

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

/** "Krishna Paksha (waning)" → "Krishna Paksha" — the parenthetical is the tail's job. */
const shortName = (english: string) => clean(english.split("(")[0]);

export function cardChips(panchangam: Panchangam): string[] {
  const { limbs, tamilDate } = panchangam;

  const till = (date: Date | null | undefined) => (date ? `till ${timeText(date)}` : "");

  // Calendar signs follow the month reckoning, not the sunrise sign: on
  // Tamil New Year the Sun crosses into Mesha mid-morning, and the card must
  // not print "Vasanta · Kumbha – Meena" next to "Chithirai 1".
  const monthSign = TAMIL_MONTHS.findIndex((month) => month.en === limbs.masam.primary.en);
  // Ritu spans two signs, counted from the season's first sign: with the Sun
  // in Vrischika the season is still "Tula – Vrischika", not "Vrischika –
  // Dhanus" (the pair used to start at the Sun's own sign, which put every
  // second month of a season one sign ahead).
  const rituStart = monthSign >= 0 ? monthSign - (monthSign % 2) : -1;
  const rituSigns =
    rituStart >= 0
      ? `${RASI_NAMES[rituStart].en.split(" (")[0]} – ${RASI_NAMES[(rituStart + 1) % 12].en.split(" (")[0]}`
      : "";

  const rows: Array<[string, string]> = [
    [limbs.samvatsara.primary.en, limbs.samvatsara.detail ?? ""],
    [limbs.ayana.primary.en, monthSign >= 0 ? `Sun in ${RASI_NAMES[monthSign].en.split(" (")[0]}` : ""],
    [limbs.ritu.primary.en, rituSigns],
    [limbs.masam.primary.en, `day ${tamilDate.day}`],
    [shortName(limbs.paksham.primary.en), limbs.paksham.primary.en.includes("waxing") ? "to Purnima" : "to Amavasya"],
    [limbs.tithi.primary.en, till(limbs.tithi.endsAt)],
    [limbs.vasaram.primary.en, limbs.vasaram.detail?.replace("Lord: ", "") ?? ""],
    [limbs.nakshatram.detail?.match(/Pada (\d)/) ? `${limbs.nakshatram.primary.en} ${limbs.nakshatram.detail.match(/Pada (\d)/)![1]}` : limbs.nakshatram.primary.en, till(limbs.nakshatram.endsAt)],
    [limbs.yogam.primary.en, till(limbs.yogam.endsAt)],
    [limbs.karanam.primary.en, till(limbs.karanam.endsAt)],
  ];

  return rows.map(([value, tail]) => (tail ? `${value} | ${tail}` : value));
}

/** The headline line for the card: "Saturday, 24 October 2026". */
export function cardDateLine(panchangam: Panchangam): string {
  // The panchangam date is a civil date, not an instant. Format it at UTC
  // noon so a Fiji or US browser cannot shift it onto the previous day.
  const calendarDay = new Date(
    Date.UTC(panchangam.date.getFullYear(), panchangam.date.getMonth(), panchangam.date.getDate(), 12),
  );
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(calendarDay);
}

/** The sub-line: "Aippasi 7 · Parabhava · Saturday" (place rides in the timings). */
export function cardSubline(panchangam: Panchangam): string {
  return `${panchangam.tamilDate.month.en} ${panchangam.tamilDate.day} · ${panchangam.limbs.samvatsara.primary.en} · ${panchangam.limbs.vasaram.primary.en}`;
}

/** Everything beyond the ten limbs that the redesigned poster prints. */
export interface CardTimings {
  place: string;
  sunMoon: Array<{ label: string; value: string }>;
  /** "Abhijit Muhurta · 11:31 AM – 12:17 PM" */
  good: string[];
  avoid: string[];
}

const windowLine = (w: Window) => `${w.label} · ${timeText(w.start)} – ${timeText(w.end)}`;

export function cardTimings(panchangam: Panchangam): CardTimings {
  return {
    place: panchangam.observer.name ?? "Chennai",
    sunMoon: [
      { label: "Sunrise", value: timeText(panchangam.sunrise) },
      { label: "Sunset", value: timeText(panchangam.sunset) },
      { label: "Moonrise", value: timeText(panchangam.moonrise) },
      { label: "Moonset", value: timeText(panchangam.moonset) },
    ],
    good: panchangam.auspicious.map(windowLine),
    avoid: panchangam.inauspicious.map(windowLine),
  };
}
