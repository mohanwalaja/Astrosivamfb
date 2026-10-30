import {
  DEG,
  jdToDate,
  julianDay,
  lahiriAyanamsa,
  moonPosition,
  moonRiseSet,
  norm360,
  sunLongitude,
  sunRiseSet,
  type Observer,
} from "./astro";
import {
  AYANA_NAMES,
  LIMBS,
  PAKSHA_NAMES,
  RASI_NAMES,
  RITUS,
  TAMIL_MONTHS,
  ayanaIndex,
  karanaName,
  nakshatraName,
  rituIndex,
  samvatsaraName,
  tithiName,
  varaName,
  yogaName,
  type LimbKey,
  type NamedValue,
} from "../data/panchangam";

/**
 * A complete Tamil panchangam for one day and one place.
 *
 * Every value is derived from the Sun and Moon positions in `astro.ts`; nothing
 * is a table of "expected" answers. The day is reckoned the traditional way, so
 * each limb is taken as it stands **at sunrise** and then given the moment it
 * ends — which is what a printed panchangam prints.
 */

export const CHENNAI: Observer = {
  latitude: 13.0827,
  longitude: 80.2707,
  name: "Chennai",
  tzOffset: 5.5,
};

/** Places the studio offers. All Tamil-country, all IST. */
export const OBSERVERS: Observer[] = [
  CHENNAI,
  { latitude: 9.9252, longitude: 78.1198, name: "Madurai", tzOffset: 5.5 },
  { latitude: 11.0168, longitude: 76.9558, name: "Coimbatore", tzOffset: 5.5 },
  { latitude: 8.7139, longitude: 77.7567, name: "Tirunelveli", tzOffset: 5.5 },
  { latitude: 10.7905, longitude: 78.7047, name: "Trichy", tzOffset: 5.5 },
  { latitude: 11.9416, longitude: 79.8083, name: "Puducherry", tzOffset: 5.5 },
];

const NAKSHATRA_SPAN = 360 / 27; // 13°20′
const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const MINUTE_MS = 60000;

export interface Window {
  label: string;
  tamil: string;
  start: Date;
  end: Date;
  /** Short guidance shown on the card. */
  note: string;
}

export interface LimbValue {
  key: LimbKey;
  /** The name as it stands at sunrise. */
  primary: NamedValue;
  /** Position in the cycle, e.g. "13 / 30". */
  counter?: string;
  /** Extra computed detail — pada, lord, month day, rasi. */
  detail?: string;
  /** When this value gives way to the next. */
  endsAt?: Date | null;
  /** Name of the value that follows, for "…then Revati". */
  next?: string;
}

export interface Panchangam {
  date: Date;
  observer: Observer;
  sunrise: Date;
  sunset: Date;
  midday: Date;
  dayLengthMs: number;
  nightLengthMs: number;
  moonrise: Date | null;
  moonset: Date | null;
  /** 0–1, from the Moon-Sun elongation. */
  moonIllumination: number;
  sunSign: NamedValue;
  moonSign: NamedValue;
  /** e.g. "Aippasi 7" — the Tamil solar date. */
  tamilDate: { month: NamedValue; day: number; text: string };
  limbs: Record<LimbKey, LimbValue>;
  limbsInOrder: LimbValue[];
  auspicious: Window[];
  inauspicious: Window[];
  /** Human-readable notes about anything deliberately not computed. */
  caveats: string[];
}

/* ------------------------------- helpers ---------------------------------- */

const elongation = (jd: number) => norm360(moonPosition(jd).longitude - sunLongitude(jd));
const siderealMoon = (jd: number) => norm360(moonPosition(jd).longitude - lahiriAyanamsa(jd));
const siderealSun = (jd: number) => norm360(sunLongitude(jd) - lahiriAyanamsa(jd));
/** Sun + Moon in the sidereal frame — the basis of the 27 yogas. */
const yogaSum = (jd: number) => norm360(moonPosition(jd).longitude + sunLongitude(jd) - 2 * lahiriAyanamsa(jd));

const tithiIndex = (jd: number) => Math.floor(elongation(jd) / 12);
const karanaIndex = (jd: number) => Math.floor(elongation(jd) / 6);
const nakshatraIndex = (jd: number) => Math.floor(siderealMoon(jd) / NAKSHATRA_SPAN);
const yogaIndex = (jd: number) => Math.floor(yogaSum(jd) / NAKSHATRA_SPAN);
const sunSignIndex = (jd: number) => Math.floor(siderealSun(jd) / 30);

/**
 * The next moment the limb's index changes. The index advances one step at a
 * time, so a coarse scan to find the bracket plus a bisection is exact and
 * cheap. Returns null if it does not change within `maxDays`.
 */
function nextChange(
  fromJd: number,
  indexOf: (jd: number) => number,
  maxDays = 2.5,
  stepMinutes = 30,
): number | null {
  const target = indexOf(fromJd);
  const step = stepMinutes / (60 * 24);
  let previous = fromJd;
  let jd = fromJd;
  const end = fromJd + maxDays;
  while (jd < end) {
    jd += step;
    if (indexOf(jd) !== target) {
      let lo = previous;
      let hi = jd;
      for (let i = 0; i < 40; i += 1) {
        const mid = (lo + hi) / 2;
        if (indexOf(mid) === target) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    previous = jd;
  }
  return null;
}

/** The moment the Sun entered its current sidereal sign. */
function lastSankranti(jd: number): number {
  const sign = sunSignIndex(jd);
  const step = 0.25; // six hours
  let later = jd;
  let earlier = jd;
  for (let i = 0; i < 800; i += 1) {
    earlier -= step;
    if (sunSignIndex(earlier) !== sign) break;
    later = earlier;
  }
  let lo = earlier;
  let hi = later;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (sunSignIndex(mid) === sign) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Sunrise on the civil day that contains `jd`, in the observer's zone. */
function sunriseOf(jd: number, observer: Observer): Date | null {
  return sunRiseSet(observerCivilDay(jdToDate(jd), observer), observer).rise;
}

const startOfCivilDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Represent the observer's civil date as a local-midnight Date. Date inputs to
 * this module are civil dates, while astronomy results are absolute instants;
 * shift the instant by the observer offset and read its UTC fields to bridge
 * those representations without depending on the browser's time zone.
 */
function observerCivilDay(date: Date, observer: Observer): Date {
  const observerLocal = new Date(date.getTime() + observer.tzOffset * HOUR_MS);
  return new Date(observerLocal.getUTCFullYear(), observerLocal.getUTCMonth(), observerLocal.getUTCDate());
}

/* ------------------------------- the engine ------------------------------- */

export function computePanchangam(date: Date, observer: Observer = CHENNAI): Panchangam {
  const day = startOfCivilDay(date);
  const sun = sunRiseSet(day, observer);
  const sunrise = sun.rise ?? new Date(day.getTime() + 6 * 3600000);
  const sunset = sun.set ?? new Date(day.getTime() + 18 * 3600000);
  const dayLengthMs = sunset.getTime() - sunrise.getTime();
  const midday = new Date(sunrise.getTime() + dayLengthMs / 2);

  const jd = julianDay(sunrise);
  const ayanamsa = lahiriAyanamsa(jd);

  /* ---- the ten limbs ---- */
  const tIndex = tithiIndex(jd);
  const tithiEnd = nextChange(jd, tithiIndex);
  const paksha = tIndex >= 15 ? 1 : 0;

  const nIndex = nakshatraIndex(jd);
  const nakshatraEnd = nextChange(jd, nakshatraIndex);
  const moonSid = siderealMoon(jd);
  const withinNakshatra = moonSid - nIndex * NAKSHATRA_SPAN;
  const pada = Math.floor(withinNakshatra / (NAKSHATRA_SPAN / 4)) + 1;

  const yIndex = yogaIndex(jd);
  const yogaEnd = nextChange(jd, yogaIndex);

  const kIndex = karanaIndex(jd);
  const karanaEnd = nextChange(jd, karanaIndex);

  const signIndex = sunSignIndex(jd);
  const sankranti = lastSankranti(jd);
  // The month's day is counted in sunrises: a sankranti before sunrise makes
  // that day day 1, a sankranti after sunrise makes the next day day 1.
  const sankrantiSunrise = sunriseOf(sankranti, observer);
  let firstDay: Date;
  if (!sankrantiSunrise) {
    firstDay = observerCivilDay(jdToDate(sankranti), observer);
  } else {
    const sankrantiDay = observerCivilDay(sankrantiSunrise, observer);
    firstDay =
      sankranti <= julianDay(sankrantiSunrise)
        ? sankrantiDay
        : new Date(sankrantiDay.getTime() + DAY_MS);
  }
  const tamilDay = Math.round((day.getTime() - firstDay.getTime()) / DAY_MS) + 1;

  // The Tamil year turns at Mesha sankranti, so the samvatsara is looked up from
  // the Shaka year of the most recent Mesha crossing.
  const meshaSankranti = lastMeshaSankranti(jd);
  const yearStart = observerCivilDay(jdToDate(meshaSankranti), observer);
  const shakaYear = yearStart.getFullYear() - 78;
  const samvatsara = samvatsaraName(shakaYear);

  const vara = varaName(day.getDay());
  const moon = moonPosition(jd);
  const illum = (1 - Math.cos(((moon.longitude - sunLongitude(jd)) * DEG))) / 2;

  const limb = (key: LimbKey, primary: NamedValue): LimbValue => ({ key, primary });

  const limbs: Record<LimbKey, LimbValue> = {
    samvatsara: {
      ...limb("samvatsara", samvatsara),
      counter: `${((shakaYear + 11) % 60) + 1} / 60`,
      detail: `Shaka ${shakaYear}`,
    },
    ayana: { ...limb("ayana", AYANA_NAMES[ayanaIndex(signIndex)]), detail: RASI_NAMES[signIndex].en },
    ritu: { ...limb("ritu", RITUS[rituIndex(signIndex)]), detail: "Two solar months" },
    masam: {
      ...limb("masam", TAMIL_MONTHS[signIndex]),
      detail: `${RASI_NAMES[signIndex].en} · day ${tamilDay}`,
      counter: `${tamilDay}`,
    },
    paksham: { ...limb("paksham", PAKSHA_NAMES[paksha]), detail: paksha === 0 ? "Waxing to Purnima" : "Waning to Amavasya" },
    tithi: {
      ...limb("tithi", tithiName(tIndex)),
      counter: `${tIndex + 1} / 30`,
      endsAt: tithiEnd ? jdToDate(tithiEnd) : null,
      next: tithiName(tIndex + 1).en,
    },
    vasaram: { ...limb("vasaram", vara), detail: `Lord: ${vara.lord ?? "—"}` },
    nakshatram: {
      ...limb("nakshatram", nakshatraName(nIndex)),
      counter: `${nIndex + 1} / 27`,
      detail: `Pada ${pada} · Lord: ${nakshatraName(nIndex).lord ?? "—"}`,
      endsAt: nakshatraEnd ? jdToDate(nakshatraEnd) : null,
      next: nakshatraName(nIndex + 1).en,
    },
    yogam: {
      ...limb("yogam", yogaName(yIndex)),
      counter: `${yIndex + 1} / 27`,
      detail: `${yogaName(yIndex).quality ?? ""} yoga`.replace(/^ /, ""),
      endsAt: yogaEnd ? jdToDate(yogaEnd) : null,
      next: yogaName(yIndex + 1).en,
    },
    karanam: {
      ...limb("karanam", karanaName(kIndex)),
      counter: `Karana ${kIndex + 1} / 60`,
      detail: `${karanaName(kIndex).quality ?? ""} karana`.replace(/^ /, ""),
      endsAt: karanaEnd ? jdToDate(karanaEnd) : null,
      next: karanaName(kIndex + 1).en,
    },
  };

  /* ---- the day's windows ---- */
  const muhurta = dayLengthMs / 15;
  const segment = dayLengthMs / 8;
  const offset = (n: number) => new Date(sunrise.getTime() + n * segment);

  // Rahu, Yama and Gulika each own one eighth of the daylight, by weekday.
  const RAHU_SEGMENT = [7, 1, 6, 4, 5, 3, 2];
  const YAMA_SEGMENT = [4, 3, 2, 1, 0, 6, 5];
  const GULIKA_SEGMENT = [6, 5, 4, 3, 2, 1, 0];
  const weekday = day.getDay();

  const inauspicious: Window[] = [
    {
      label: "Rahu Kalam",
      tamil: "ராகு காலம்",
      start: offset(RAHU_SEGMENT[weekday]),
      end: offset(RAHU_SEGMENT[weekday] + 1),
      note: "Avoid beginning journeys, weddings or new ventures.",
    },
    {
      label: "Yamagandam",
      tamil: "எமகண்டம்",
      start: offset(YAMA_SEGMENT[weekday]),
      end: offset(YAMA_SEGMENT[weekday] + 1),
      note: "Avoid signing and starting anything binding.",
    },
    {
      label: "Gulika Kalam",
      tamil: "குளிகை காலம்",
      start: offset(GULIKA_SEGMENT[weekday]),
      end: offset(GULIKA_SEGMENT[weekday] + 1),
      note: "Avoid auspicious beginnings; routine work is fine.",
    },
  ];

  const auspicious: Window[] = [
    {
      label: "Brahma Muhurta",
      tamil: "பிரம்ம முஹூர்த்தம்",
      start: new Date(sunrise.getTime() - 96 * MINUTE_MS),
      end: new Date(sunrise.getTime() - 48 * MINUTE_MS),
      note: "The hour before dawn — japa, study and prayer.",
    },
    {
      label: "Abhijit Muhurta",
      tamil: "அபிஜித் முஹூர்த்தம்",
      // one muhurta wide, centred on noon: half of the 1/15th muhurta
      start: new Date(midday.getTime() - muhurta / 2),
      end: new Date(midday.getTime() + muhurta / 2),
      note: "The eighth muhurta of the day — good for most beginnings.",
    },
    {
      label: "Godhuli Muhurta",
      tamil: "கோதூளி முஹூர்த்தம்",
      start: new Date(sunset.getTime() - 24 * MINUTE_MS),
      end: new Date(sunset.getTime() + 12 * MINUTE_MS),
      note: "The dust-and-cattle hour at sunset.",
    },
  ];

  const moonSet = moonRiseSet(day, observer);

  return {
    date: day,
    observer,
    sunrise,
    sunset,
    midday,
    dayLengthMs,
    nightLengthMs: DAY_MS - dayLengthMs,
    moonrise: moonSet.rise,
    moonset: moonSet.set,
    moonIllumination: illum,
    sunSign: RASI_NAMES[signIndex],
    moonSign: RASI_NAMES[Math.floor(moonSid / 30)],
    tamilDate: {
      month: TAMIL_MONTHS[signIndex],
      day: tamilDay,
      text: `${TAMIL_MONTHS[signIndex].ta} ${tamilDay}`,
    },
    limbs,
    limbsInOrder: LIMBS.map((meta) => limbs[meta.key]),
    auspicious,
    inauspicious,
    caveats: [
      `Lahiri ayanamsa ${ayanamsa.toFixed(4)}° used for all sidereal positions.`,
      "Durmuhurtam, Varjyam and Amrita Kalam are ghati-based and vary between traditions — not printed here rather than printed wrong.",
    ],
  };
}

/** The most recent Mesha (Aries) sankranti — the start of the Tamil year. */
function lastMeshaSankranti(jd: number): number {
  // Mesha sankranti is around 14 April. Walk back in days until the Sun's
  // sidereal longitude is just under 0°, then bisect.
  let probe = jd;
  for (let i = 0; i < 400; i += 1) {
    probe -= 1;
    const sidereal = siderealSun(probe);
    if (sidereal > 180) {
      // we have crossed back past Mesha into Meena
      let lo = probe;
      let hi = probe + 1;
      for (let k = 0; k < 40; k += 1) {
        const mid = (lo + hi) / 2;
        if (siderealSun(mid) > 180) lo = mid;
        else hi = mid;
      }
      return hi;
    }
  }
  return jd;
}

/* ------------------------------- formatting ------------------------------- */

/** IST clock time for a Date; the suite only ever deals with IST cities. */
export function timeText(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** "5h 45m" — used for day and night lengths. */
export function durationText(ms: number): string {
  const total = Math.max(0, Math.round(ms / MINUTE_MS));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${minutes}m`;
}

export const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MINUTE_MS);
