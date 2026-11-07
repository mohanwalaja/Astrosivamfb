import type { Panchangam } from "./panchang";
import { timeText } from "./panchang";
import { RASI_NAMES } from "../data/panchangam";

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

  // Ritu spans two signs: "Tula – Vrischika".
  const signIndex = RASI_NAMES.findIndex((rasi) => rasi.en === panchangam.sunSign.en);
  const rituSigns =
    signIndex >= 0
      ? `${RASI_NAMES[signIndex].en.split(" (")[0]} – ${RASI_NAMES[(signIndex + 1) % 12].en.split(" (")[0]}`
      : "";

  const rows: Array<[string, string]> = [
    [limbs.samvatsara.primary.en, limbs.samvatsara.detail ?? ""],
    [limbs.ayana.primary.en, `Sun in ${panchangam.sunSign.en.split(" (")[0]}`],
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

/** The sub-line: "Aippasi 7 · Chennai · Saturday". */
export function cardSubline(panchangam: Panchangam): string {
  return `${panchangam.tamilDate.month.en} ${panchangam.tamilDate.day} · ${panchangam.observer.name ?? "Chennai"} · ${panchangam.limbs.vasaram.primary.en}`;
}
