/**
 * The vocabulary of a Tamil panchangam, in Tamil and English.
 *
 * A "panchangam" classically means five limbs (tithi, vara, nakshatra, yoga,
 * karana), but a printed Tamil almanac has never stopped there: it opens with
 * the year, the half-year, the season and the month before it gets to the day
 * itself. That is the ten-limb structure this file describes, and it is the one
 * the Astro Sivam cards print.
 */

export type LimbKey =
  | "samvatsara"
  | "ayana"
  | "ritu"
  | "masam"
  | "paksham"
  | "tithi"
  | "vasaram"
  | "nakshatram"
  | "yogam"
  | "karanam";

export interface LimbMeta {
  key: LimbKey;
  index: number;
  tamil: string;
  english: string;
  /** What the limb actually measures, in one line. */
  note: string;
  /** How many values the cycle has, for the "n/27" counters. */
  cycle?: number;
}

/** The ten limbs, in the traditional order: year down to half-a-tithi. */
export const LIMBS: LimbMeta[] = [
  {
    key: "samvatsara",
    index: 1,
    tamil: "சம்வத்ஸரம்",
    english: "Samvatsara",
    note: "The year in the 60-year cycle",
    cycle: 60,
  },
  { key: "ayana", index: 2, tamil: "அயனம்", english: "Ayana", note: "The Sun's half-year — north or south", cycle: 2 },
  { key: "ritu", index: 3, tamil: "ருது", english: "Ritu", note: "The season, two solar months long", cycle: 6 },
  {
    key: "masam",
    index: 4,
    tamil: "மாசம்",
    english: "Masam",
    note: "The Tamil solar month, counted from sankranti",
    cycle: 12,
  },
  { key: "paksham", index: 5, tamil: "பக்ஷம்", english: "Paksham", note: "The fortnight — waxing or waning", cycle: 2 },
  { key: "tithi", index: 6, tamil: "திதி", english: "Tithi", note: "The lunar day: 12° of Moon past the Sun", cycle: 30 },
  {
    key: "vasaram",
    index: 7,
    tamil: "வாசரம்",
    english: "Vasaram",
    note: "The weekday and its planetary lord",
    cycle: 7,
  },
  {
    key: "nakshatram",
    index: 8,
    tamil: "நக்ஷத்ரம்",
    english: "Nakshatram",
    note: "The lunar mansion the Moon occupies",
    cycle: 27,
  },
  {
    key: "yogam",
    index: 9,
    tamil: "யோகம்",
    english: "Yogam",
    note: "Sun's longitude added to the Moon's",
    cycle: 27,
  },
  {
    key: "karanam",
    index: 10,
    tamil: "கரணம்",
    english: "Karanam",
    note: "Half a tithi: 6° of Moon past the Sun",
    cycle: 11,
  },
];

export const LIMB_MAP: Record<LimbKey, LimbMeta> = Object.fromEntries(
  LIMBS.map((limb) => [limb.key, limb]),
) as Record<LimbKey, LimbMeta>;

/**
 * Row labels for the printed card, in the traditional order. The poster and the
 * Asset Studio both read this, so the card and the editor can never disagree
 * about how many limbs a panchangam has.
 */
export const PANCHANGAM_ROWS: Array<{ key: LimbKey; ta: string; en: string }> = LIMBS.map((limb) => ({
  key: limb.key,
  ta: limb.tamil,
  en: limb.english,
}));

export interface NamedValue {
  ta: string;
  en: string;
  /** Optional planet / deity lord, used for the "athipathi" line. */
  lord?: string;
  /** Short quality note shown under the value. */
  quality?: string;
}

/* --------------------------------- tithis --------------------------------- */

const TITHI_NAMES: NamedValue[] = [
  { ta: "பிரதமை", en: "Pratipada" },
  { ta: "துவிதியை", en: "Dwitiya" },
  { ta: "திருதியை", en: "Tritiya" },
  { ta: "சதுர்த்தி", en: "Chaturthi" },
  { ta: "பஞ்சமி", en: "Panchami" },
  { ta: "சஷ்டி", en: "Shashthi" },
  { ta: "சப்தமி", en: "Saptami" },
  { ta: "அஷ்டமி", en: "Ashtami" },
  { ta: "நவமி", en: "Navami" },
  { ta: "தசமி", en: "Dashami" },
  { ta: "ஏகாதசி", en: "Ekadashi" },
  { ta: "துவாதசி", en: "Dwadashi" },
  { ta: "திரயோதசி", en: "Trayodashi" },
  { ta: "சதுர்த்தசி", en: "Chaturdashi" },
  { ta: "பௌர்ணமி", en: "Purnima" },
];

/** Tithi 0–29. The fifteenth of each fortnight has its own name. */
export function tithiName(index: number): NamedValue {
  const within = index % 15;
  if (within === 14 && index >= 15) return { ta: "அமாவாசை", en: "Amavasya" };
  return TITHI_NAMES[within] ?? TITHI_NAMES[0];
}

/* ------------------------------- nakshatras ------------------------------- */

const NAKSHATRA_NAMES: NamedValue[] = [
  { ta: "அஸ்வினி", en: "Ashwini", lord: "Ketu" },
  { ta: "பரணி", en: "Bharani", lord: "Venus" },
  { ta: "கார்த்திகை", en: "Krittika", lord: "Sun" },
  { ta: "ரோகிணி", en: "Rohini", lord: "Moon" },
  { ta: "மிருகசீரிடம்", en: "Mrigashira", lord: "Mars" },
  { ta: "திருவாதிரை", en: "Ardra", lord: "Rahu" },
  { ta: "புனர்பூசம்", en: "Punarvasu", lord: "Jupiter" },
  { ta: "பூசம்", en: "Pushya", lord: "Saturn" },
  { ta: "ஆயில்யம்", en: "Ashlesha", lord: "Mercury" },
  { ta: "மகம்", en: "Magha", lord: "Ketu" },
  { ta: "பூரம்", en: "Purva Phalguni", lord: "Venus" },
  { ta: "உத்திரம்", en: "Uttara Phalguni", lord: "Sun" },
  { ta: "அஸ்தம்", en: "Hasta", lord: "Moon" },
  { ta: "சித்திரை", en: "Chitra", lord: "Mars" },
  { ta: "சுவாதி", en: "Swati", lord: "Rahu" },
  { ta: "விசாகம்", en: "Vishakha", lord: "Jupiter" },
  { ta: "அனுஷம்", en: "Anuradha", lord: "Saturn" },
  { ta: "கேட்டை", en: "Jyeshtha", lord: "Mercury" },
  { ta: "மூலம்", en: "Mula", lord: "Ketu" },
  { ta: "பூராடம்", en: "Purva Ashadha", lord: "Venus" },
  { ta: "உத்திராடம்", en: "Uttara Ashadha", lord: "Sun" },
  { ta: "திருவோணம்", en: "Shravana", lord: "Moon" },
  { ta: "அவிட்டம்", en: "Dhanishta", lord: "Mars" },
  { ta: "சதயம்", en: "Shatabhisha", lord: "Rahu" },
  { ta: "பூரட்டாதி", en: "Purva Bhadrapada", lord: "Jupiter" },
  { ta: "உத்திரட்டாதி", en: "Uttara Bhadrapada", lord: "Saturn" },
  { ta: "ரேவதி", en: "Revati", lord: "Mercury" },
];

export const nakshatraName = (index: number): NamedValue => NAKSHATRA_NAMES[((index % 27) + 27) % 27];
export const NAKSHATRAS = NAKSHATRA_NAMES;

/* --------------------------------- yogas ---------------------------------- */

const YOGA_NAMES: NamedValue[] = [
  { ta: "விஷ்கம்பம்", en: "Vishkambha", quality: "inauspicious" },
  { ta: "பிரீதி", en: "Priti", quality: "auspicious" },
  { ta: "ஆயுஷ்மான்", en: "Ayushman", quality: "auspicious" },
  { ta: "சௌபாக்கியம்", en: "Saubhagya", quality: "auspicious" },
  { ta: "சோபனம்", en: "Shobhana", quality: "auspicious" },
  { ta: "அதிகண்டம்", en: "Atiganda", quality: "inauspicious" },
  { ta: "சுகர்மம்", en: "Sukarman", quality: "auspicious" },
  { ta: "திருதி", en: "Dhriti", quality: "auspicious" },
  { ta: "சூலம்", en: "Shula", quality: "inauspicious" },
  { ta: "கண்டம்", en: "Ganda", quality: "inauspicious" },
  { ta: "விருத்தி", en: "Vriddhi", quality: "auspicious" },
  { ta: "துருவம்", en: "Dhruva", quality: "auspicious" },
  { ta: "வியாகாதம்", en: "Vyaghata", quality: "inauspicious" },
  { ta: "ஹர்ஷணம்", en: "Harshana", quality: "auspicious" },
  { ta: "வஜ்ரம்", en: "Vajra", quality: "inauspicious" },
  { ta: "சித்தி", en: "Siddhi", quality: "auspicious" },
  { ta: "வியதிபாதம்", en: "Vyatipata", quality: "inauspicious" },
  { ta: "வரியான்", en: "Variyan", quality: "auspicious" },
  { ta: "பரிகம்", en: "Parigha", quality: "inauspicious" },
  { ta: "சிவம்", en: "Shiva", quality: "auspicious" },
  { ta: "சித்தம்", en: "Siddha", quality: "auspicious" },
  { ta: "சாத்யம்", en: "Sadhya", quality: "auspicious" },
  { ta: "சுபம்", en: "Shubha", quality: "auspicious" },
  { ta: "சுக்லம்", en: "Shukla", quality: "auspicious" },
  { ta: "பிரம்மம்", en: "Brahma", quality: "mixed" },
  { ta: "இந்திரன்", en: "Indra", quality: "mixed" },
  { ta: "வைதிருதி", en: "Vaidhriti", quality: "inauspicious" },
];

export const yogaName = (index: number): NamedValue => YOGA_NAMES[((index % 27) + 27) % 27];

/* -------------------------------- karanas --------------------------------- */

const KARANA_MOVABLE: NamedValue[] = [
  { ta: "பவம்", en: "Bava", quality: "auspicious" },
  { ta: "பாலவம்", en: "Balava", quality: "auspicious" },
  { ta: "கௌலவம்", en: "Kaulava", quality: "auspicious" },
  { ta: "தைதுலம்", en: "Taitila", quality: "auspicious" },
  { ta: "கரஜை", en: "Gara", quality: "auspicious" },
  { ta: "வணிஜை", en: "Vanija", quality: "auspicious" },
  { ta: "விஷ்டி", en: "Vishti", quality: "inauspicious" },
];

const KARANA_FIXED: Record<number, NamedValue> = {
  0: { ta: "கிம்ஸ்துக்னம்", en: "Kimstughna", quality: "auspicious" },
  57: { ta: "சகுனி", en: "Shakuni", quality: "inauspicious" },
  58: { ta: "சதுஷ்பாதம்", en: "Chatushpada", quality: "inauspicious" },
  59: { ta: "நாகவம்", en: "Naga", quality: "inauspicious" },
};

/**
 * Karana 0–59 across the lunar month: one fixed karana at the start, seven
 * movable ones cycling eight times, then three fixed ones around the new moon.
 */
export function karanaName(index: number): NamedValue {
  const fixed = KARANA_FIXED[((index % 60) + 60) % 60];
  if (fixed) return fixed;
  return KARANA_MOVABLE[(index - 1) % 7] ?? KARANA_MOVABLE[0];
}

/* ---------------------------------- vara ---------------------------------- */

const VARA_NAMES: NamedValue[] = [
  { ta: "ஞாயிறு", en: "Sunday", lord: "Sun" },
  { ta: "திங்கள்", en: "Monday", lord: "Moon" },
  { ta: "செவ்வாய்", en: "Tuesday", lord: "Mars" },
  { ta: "புதன்", en: "Wednesday", lord: "Mercury" },
  { ta: "வியாழன்", en: "Thursday", lord: "Jupiter" },
  { ta: "வெள்ளி", en: "Friday", lord: "Venus" },
  { ta: "சனி", en: "Saturday", lord: "Saturn" },
];

export const varaName = (day: number): NamedValue => VARA_NAMES[((day % 7) + 7) % 7];

/* -------------------------------- samvatsara ------------------------------ */

const SAMVATSARA_NAMES: string[] = [
  "பிரபவ", "விபவ", "சுக்ல", "பிரமோதூத", "பிரஜோத்பத்தி", "ஆங்கீரச",
  "ஸ்ரீமுக", "பவ", "யுவ", "தாது", "ஈஸ்வர", "பகுதான்ய",
  "பிரமாதி", "விக்ரம", "விஷு", "சித்ரபானு", "சுபானு", "தாரண",
  "பார்த்திப", "வியய", "சர்வஜித்", "சர்வதாரி", "விரோதி", "விக்ருதி",
  "கர", "நந்தன", "விஜய", "ஜய", "மன்மத", "துர்முகி",
  "ஹேவிளம்பி", "விளம்பி", "விகாரி", "சார்வரி", "பிலவ", "சுபகிருது",
  "சோபகிருது", "குரோதி", "விஸ்வாவசு", "பராபவ", "பிளவங்க", "கீலக",
  "சௌம்ய", "சாதாரண", "விரோதிகிருது", "பரிதாவி", "பிரமாதீச", "ஆனந்த",
  "ராக்ஷச", "அனல", "பிங்கள", "காளயுக்தி", "சித்தார்த்தி", "ரௌத்திர",
  "துர்மதி", "துந்துபி", "ருதிரோத்காரி", "ரக்தாக்ஷி", "குரோதன", "அக்ஷய",
];

const SAMVATSARA_ENGLISH: string[] = [
  "Prabhava", "Vibhava", "Shukla", "Pramodoota", "Prajotpatti", "Angirasa",
  "Shrimukha", "Bhava", "Yuva", "Dhatu", "Ishvara", "Bahudhanya",
  "Pramathi", "Vikrama", "Vishu", "Chitrabhanu", "Subhanu", "Tarana",
  "Parthiva", "Vyaya", "Sarvajit", "Sarvadhari", "Virodhi", "Vikriti",
  "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
  "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakrit",
  "Shobhakrit", "Krodhi", "Vishvavasu", "Parabhava", "Plavanga", "Kilaka",
  "Saumya", "Sadharana", "Virodhikrit", "Paridhavi", "Pramadicha", "Ananda",
  "Rakshasa", "Anala", "Pingala", "Kalayukti", "Siddharthi", "Raudra",
  "Durmati", "Dundubhi", "Rudhirodgari", "Raktakshi", "Krodhana", "Akshaya",
];

/** Shaka year → the 0-based slot in the 60-year cycle. 1948 → Parabhava. */
export const samvatsaraIndex = (shakaYear: number) => ((shakaYear + 11) % 60 + 60) % 60;

export const samvatsaraName = (shakaYear: number): NamedValue => {
  const index = samvatsaraIndex(shakaYear);
  return { ta: SAMVATSARA_NAMES[index], en: SAMVATSARA_ENGLISH[index] };
};

/* ---------------------------------- rasi ---------------------------------- */

export const RASI_NAMES: NamedValue[] = [
  { ta: "மேஷம்", en: "Mesha (Aries)" },
  { ta: "ரிஷபம்", en: "Rishabha (Taurus)" },
  { ta: "மிதுனம்", en: "Mithuna (Gemini)" },
  { ta: "கடகம்", en: "Karka (Cancer)" },
  { ta: "சிம்மம்", en: "Simha (Leo)" },
  { ta: "கன்னி", en: "Kanya (Virgo)" },
  { ta: "துலாம்", en: "Tula (Libra)" },
  { ta: "விருச்சிகம்", en: "Vrischika (Scorpio)" },
  { ta: "தனுசு", en: "Dhanus (Sagittarius)" },
  { ta: "மகரம்", en: "Makara (Capricorn)" },
  { ta: "கும்பம்", en: "Kumbha (Aquarius)" },
  { ta: "மீனம்", en: "Meena (Pisces)" },
];

export const rasiName = (index: number): NamedValue => RASI_NAMES[((index % 12) + 12) % 12];

/* ------------------------------ Tamil months ------------------------------ */

/**
 * Tamil months are solar: each one runs from a sankranti to the next, and takes
 * the name of the sign the Sun is in. Aippasi = Sun in Tula (Libra).
 */
export const TAMIL_MONTHS: NamedValue[] = [
  { ta: "சித்திரை", en: "Chithirai" },
  { ta: "வைகாசி", en: "Vaikasi" },
  { ta: "ஆனி", en: "Aani" },
  { ta: "ஆடி", en: "Aadi" },
  { ta: "ஆவணி", en: "Avani" },
  { ta: "புரட்டாசி", en: "Purattasi" },
  { ta: "ஐப்பசி", en: "Aippasi" },
  { ta: "கார்த்திகை", en: "Karthigai" },
  { ta: "மார்கழி", en: "Margazhi" },
  { ta: "தை", en: "Thai" },
  { ta: "மாசி", en: "Maasi" },
  { ta: "பங்குனி", en: "Panguni" },
];

/* ---------------------------------- ritu ---------------------------------- */

export const RITUS: NamedValue[] = [
  { ta: "வசந்தம்", en: "Vasanta (spring)" },
  { ta: "கிரீஷ்மம்", en: "Grishma (summer)" },
  { ta: "வர்ஷானம்", en: "Varsha (monsoon)" },
  { ta: "சரத்", en: "Sharad (autumn)" },
  { ta: "ஹேமந்தம்", en: "Hemanta (pre-winter)" },
  { ta: "சிசிரம்", en: "Shishira (winter)" },
];

/** Two solar signs per season, starting with Mesha. */
export const rituIndex = (signIndex: number) => Math.floor((((signIndex % 12) + 12) % 12) / 2);

export const AYANA_NAMES: NamedValue[] = [
  { ta: "உத்தராயணம்", en: "Uttarayana" },
  { ta: "தக்ஷிணாயனம்", en: "Dakshinayana" },
];

/** Uttarayana runs from Makara to Mithuna; Dakshinayana from Karka to Dhanus. */
export const ayanaIndex = (signIndex: number) => {
  const sign = ((signIndex % 12) + 12) % 12;
  return sign >= 9 || sign <= 2 ? 0 : 1;
};

export const PAKSHA_NAMES: NamedValue[] = [
  { ta: "சுக்ல பக்ஷம் (வளர்பிறை)", en: "Shukla Paksha (waxing)" },
  { ta: "கிருஷ்ண பக்ஷம் (தேய்பிறை)", en: "Krishna Paksha (waning)" },
];

/* -------------------------------- planets --------------------------------- */

export const PLANET_NAMES: Record<string, NamedValue> = {
  Sun: { ta: "சூரியன்", en: "Sun" },
  Moon: { ta: "சந்திரன்", en: "Moon" },
  Mars: { ta: "செவ்வாய்", en: "Mars" },
  Mercury: { ta: "புதன்", en: "Mercury" },
  Jupiter: { ta: "குரு", en: "Jupiter" },
  Venus: { ta: "சுக்கிரன்", en: "Venus" },
  Saturn: { ta: "சனி", en: "Saturn" },
  Rahu: { ta: "ராகு", en: "Rahu" },
  Ketu: { ta: "கேது", en: "Ketu" },
};
