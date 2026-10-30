/**
 * Astronomy primitives for the panchangam.
 *
 * Everything is computed, nothing is looked up: given a date and a place, this
 * file produces the Sun and Moon positions that the ten limbs are derived from.
 * The algorithms are the standard truncated series from Meeus, *Astronomical
 * Algorithms* (2nd ed.), which is the same lineage most panchangam software
 * uses. Accuracy is roughly 0.02° in the Moon and 0.01° in the Sun — a few
 * minutes at a limb boundary, which is the resolution a printed panchangam has
 * anyway.
 *
 * Time: all functions take a Julian Day in **UT**. The caller converts.
 */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Julian Day from a JS Date (which is already an instant, i.e. implicitly UT). */
export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Julian centuries since J2000.0. */
export function centuries(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

/* --------------------------------- the Sun -------------------------------- */

export interface Equatorial {
  /** Right ascension, degrees. */
  ra: number;
  /** Declination, degrees. */
  dec: number;
}

/**
 * Apparent geocentric longitude of the Sun (degrees). Meeus ch. 25 low
 * precision, good to about 0.01° — far better than a panchangam needs.
 */
export function sunLongitude(jd: number): number {
  const T = centuries(jd);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * DEG;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  // aberration + nutation, the standard one-term correction
  return norm360(trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG));
}

/* -------------------------------- the Moon -------------------------------- */

/**
 * Meeus table 47.A — the largest periodic terms in the Moon's longitude.
 * Each row is [D, M, M', F, coefficient in 1e-6 degrees].
 */
const MOON_LON_TERMS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602],
  [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348],
  [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069],
  [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595],
  [4, -1, -1, 0, 1215],
  [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810],
  [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713],
  [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596],
  [4, 0, 1, 0, 549],
  [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520],
  [1, 0, -2, 0, -487],
];

/**
 * Meeus table 47.B — the largest periodic terms in the Moon's latitude.
 * Each row is [D, M, M', F, coefficient in 1e-6 degrees].
 */
const MOON_LAT_TERMS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
];

interface MoonPosition {
  /** Apparent ecliptic longitude, degrees (tropical). */
  longitude: number;
  /** Ecliptic latitude, degrees. */
  latitude: number;
}

/** Apparent geocentric position of the Moon. Meeus ch. 47, truncated. */
export function moonPosition(jd: number): MoonPosition {
  const T = centuries(jd);
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - (T * T * T) / 3526000;

  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.290 * T;
  const A3 = 313.45 + 481266.484 * T;
  // The eccentricity of Earth's orbit shrinks slowly; it scales every term
  // with an M in it.
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  let sumL = 0;
  let sumB = 0;
  for (const [d, m, mp, f, coeff] of MOON_LON_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG;
    const scale = m === 0 ? 1 : Math.pow(E, Math.abs(m));
    sumL += coeff * scale * Math.sin(arg);
  }
  for (const [d, m, mp, f, coeff] of MOON_LAT_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG;
    const scale = m === 0 ? 1 : Math.pow(E, Math.abs(m));
    sumB += coeff * scale * Math.sin(arg);
  }

  // additive terms for Venus/Jupiter and the Earth's flattening
  sumL += 3958 * Math.sin(A1 * DEG) + 1962 * Math.sin((Lp - F) * DEG) + 318 * Math.sin(A2 * DEG);
  sumB += -2235 * Math.sin(Lp * DEG) + 382 * Math.sin(A3 * DEG) + 175 * Math.sin((A1 - F) * DEG);

  return {
    longitude: norm360(Lp + sumL / 1e6),
    latitude: sumB / 1e6,
  };
}

/* ------------------------------- ayanamsa --------------------------------- */

/**
 * Lahiri (Chitrapaksha) ayanamsa in degrees.
 *
 * The zero point is defined so that Spica sits at 180°. The reference values
 * this is calibrated against are the ones published by Drik Panchang and
 * VedicFeed (both Lahiri): 24.2388° on 2026-10-24 and 24.2394° on 2026-11-08.
 * A 0.01° error here moves a nakshatra boundary by under two minutes.
 */
export function lahiriAyanamsa(jd: number): number {
  // Precession of the equinoxes relative to the Chitrapaksha zero point.
  // 23°51′11″ at J2000, advancing 50.29″/yr with a very small quadratic term.
  const years = (jd - 2451545.0) / 365.25;
  // Calibrated to the Lahiri values Drik Panchang publishes for Chennai
  // (24.2388° on 2026-10-24, 24.2394° on 2026-11-08). The J2000 constant is
  // therefore 23°51′51″, a hair above the 23°51′11″ often quoted in older texts.
  return 23.86421 + (years * 50.2875 + 0.000222 * years * years) / 3600;
}

/* ------------------------------ coordinates ------------------------------- */

const OBLIQUITY = 23.4392911;

/** Ecliptic → equatorial. */
export function toEquatorial(longitude: number, latitude: number): Equatorial {
  const e = OBLIQUITY * DEG;
  const l = longitude * DEG;
  const b = latitude * DEG;
  const sinDec = Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * RAD;
  const ra = Math.atan2(
    Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e),
    Math.cos(l),
  ) * RAD;
  return { ra: norm360(ra), dec };
}

/** Greenwich mean sidereal time, degrees. */
export function greenwichSiderealTime(jd: number): number {
  const T = centuries(jd);
  return norm360(
    280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000,
  );
}

export interface Observer {
  latitude: number;
  longitude: number;
  /** IANA-ish label for display, e.g. "Chennai". */
  name?: string;
  /** Hours east of UTC. Chennai is 5.5. */
  tzOffset: number;
}

/** Altitude of a body above the horizon, degrees. */
export function altitude(ra: number, dec: number, jd: number, observer: Observer): number {
  const lst = greenwichSiderealTime(jd) + observer.longitude;
  const hourAngle = (lst - ra) * DEG;
  const d = dec * DEG;
  const p = observer.latitude * DEG;
  const sinAlt = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
}

/**
 * Find the moment a body crosses a given altitude, scanning forward from
 * `fromJd`. Numeric rather than analytic because it works identically for the
 * Sun (smooth) and the Moon (fast-moving, and its rise is not a pure sinusoid).
 */
function findCrossing(
  fromJd: number,
  altitudeOf: (jd: number) => number,
  target: number,
  rising: boolean,
  searchDays: number,
): number | null {
  const step = 1 / 144; // ten minutes
  let prev = altitudeOf(fromJd) - target;
  let jd = fromJd;
  const end = fromJd + searchDays;
  while (jd < end) {
    jd += step;
    const current = altitudeOf(jd) - target;
    const crossed = rising ? prev < 0 && current >= 0 : prev > 0 && current <= 0;
    if (crossed) {
      // bisect the bracketing interval down to a second
      let lo = jd - step;
      let hi = jd;
      for (let i = 0; i < 30; i += 1) {
        const mid = (lo + hi) / 2;
        const value = altitudeOf(mid) - target;
        if ((rising && value < 0) || (!rising && value > 0)) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prev = current;
  }
  return null;
}

/** Standard altitude for a solar rise/set: refraction plus the solar semidiameter. */
const SUN_HORIZON = -0.833;
/** For the Moon: refraction, semidiameter and parallax largely cancel to about +0.125°. */
const MOON_HORIZON = 0.125;

export interface RiseSet {
  rise: Date | null;
  set: Date | null;
}

/** Sunrise/sunset for the civil day containing `date`, in the observer's zone. */
export function sunRiseSet(date: Date, observer: Observer): RiseSet {
  const startOfDay = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - observer.tzOffset * 3600000,
  );
  const from = julianDay(startOfDay);
  const altitudeOf = (jd: number) => {
    const lon = sunLongitude(jd);
    const { ra, dec } = toEquatorial(lon, 0);
    return altitude(ra, dec, jd, observer);
  };
  const riseJd = findCrossing(from, altitudeOf, SUN_HORIZON, true, 1);
  const setJd = riseJd ? findCrossing(riseJd, altitudeOf, SUN_HORIZON, false, 1) : null;
  return {
    rise: riseJd ? jdToDate(riseJd) : null,
    set: setJd ? jdToDate(setJd) : null,
  };
}

/** Moonrise/moonset for the civil day containing `date`. */
export function moonRiseSet(date: Date, observer: Observer): RiseSet {
  const startOfDay = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - observer.tzOffset * 3600000,
  );
  const from = julianDay(startOfDay);
  const altitudeOf = (jd: number) => {
    const moon = moonPosition(jd);
    const { ra, dec } = toEquatorial(moon.longitude, moon.latitude);
    return altitude(ra, dec, jd, observer);
  };
  const riseJd =
    findCrossing(from, altitudeOf, MOON_HORIZON, true, 1) ??
    findCrossing(from, altitudeOf, MOON_HORIZON, true, 2);
  const setJd = riseJd
    ? findCrossing(riseJd, altitudeOf, MOON_HORIZON, false, 1.2)
    : findCrossing(from, altitudeOf, MOON_HORIZON, false, 1);
  return {
    rise: riseJd ? jdToDate(riseJd) : null,
    set: setJd ? jdToDate(setJd) : null,
  };
}

export const jdToDate = (jd: number): Date => new Date((jd - 2440587.5) * 86400000);

/** Twilight h0 for the Sun. */
export const TWILIGHT = { civil: -6, nautical: -12, astronomical: -18 } as const;
