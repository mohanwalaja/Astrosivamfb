import type { ThemeKey } from "../types";
import type { FbContent, FbLayout } from "../lib/fbCreative";
import { getService } from "./services";

/**
 * Caption and hashtag library for the Facebook Suite.
 *
 * Every entry is written to the same structure so the composer can assemble a
 * post without the person writing from scratch: a hook inside the feed's 125
 * character cut, the body, one call to action, and a hashtag set that stays
 * within Meta's 3–5 recommendation. Nothing here claims an outcome — the
 * compliance rules in FB_COMPLIANCE are enforced by the tests.
 */

export type FbCategory = "service" | "educational" | "festival" | "trust";

export interface FbCopyEntry {
  id: string;
  category: FbCategory;
  layout: FbLayout;
  label: string;
  /** Which service the post sells, if any. */
  serviceId: string | null;
  theme: ThemeKey;
  content: FbContent;
  captions: {
    facebook: string;
    instagram: string;
  };
  hashtags: {
    core: string[];
    local: string[];
    service: string[];
  };
  cta: {
    /** What the person should do, in the caption's own words. */
    line: string;
    /** Where the button should point. */
    url: string;
    /** The Messenger quick reply that matches this post. */
    quickReply: string;
  };
}

const BASE_FOOTER = "astrosivam.com · Email: admin@astrosivam.com";

const CORE_TAGS = ["#AstroSivam", "#VedicAstrology", "#Jyotish", "#TamilAstrology"];
const LOCAL_TAGS = ["#TamilNadu", "#Chennai", "#Walajapet", "#SouthIndia"];
const SERVICE_TAGS = {
  jathagam: ["#Jathagam", "#BirthChart", "#Kundli", "#Rasi"],
  marriage: ["#Porutham", "#MarriageMatching", "#HoroscopeMatching"],
  babyNaming: ["#BabyNaming", "#Namakaranam", "#TamilNames"],
  muhurtham: ["#Muhurtham", "#SubhaMuhurtham", "#WeddingDate"],
  panchangam: ["#Panchangam", "#DailyPanchangam", "#NallaNeram"],
  transits: ["#SadeSati", "#Gocharam", "#Transits"],
  trust: ["#SampleReport", "#AstrologyReport"],
} as const;

const tags = (serviceId: keyof typeof SERVICE_TAGS | null) => ({
  core: CORE_TAGS,
  local: LOCAL_TAGS,
  service: serviceId ? [...SERVICE_TAGS[serviceId]] : [...SERVICE_TAGS.trust],
});

/* ------------------------------- service ads ----------------------------- */

const jathagam = getService("jathagam");
const marriage = getService("marriage");
const babyNaming = getService("baby-naming");
const muhurtham = getService("muhurtham");

export const FB_COPY_ENTRIES: FbCopyEntry[] = [
  {
    id: "jathagam-flagship",
    category: "service",
    layout: "service-promo",
    label: "Birth Jathagam — flagship",
    serviceId: "jathagam",
    theme: "kumkum",
    content: {
      kicker: jathagam.name,
      headline: "Your life, mapped to the minute.",
      subline: "Lahiri sidereal charts · reviewed by temple priests · 7 days of astrologer chat.",
      tamil: jathagam.tamilName,
      chips: ["Rasi + Navamsa charts", "Vimshottari dasa timeline", "Sade Sati & pariharams"],
      price: "US$5 · ₹470 · first report free",
      cta: "astrosivam.com/birth-jathagam",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "Your birth chart is more than a horoscope column.\n\nA Birth Jathagam is cast on the sidereal zodiac with the Chitra Paksha Lahiri ayanamsa, then read — Rasi and Navamsa charts, the full Vimshottari dasa timeline, Sade Sati status, and the pariharams that address a difficult season. Every chart is checked by our temple-priest team in Tamil Nadu before your PDF is emailed.\n\nBasic Jathagam US$5 · ₹470. Bhava Jathagam for all twelve bhavas, same fee. Reports in English, Tamil or Hindi, with 7 days of astrologer chat after delivery.\n\nYour first report is free during the Beta — one per customer.\n\nRead a full sample, then order: astrosivam.com/birth-jathagam",
      instagram:
        "Your birth chart, read by a person.\n\nSidereal zodiac · Lahiri ayanamsa · temple-priest review · Rasi + Navamsa · Vimshottari dasa · Sade Sati status.\n\nUS$5 · ₹470. First report free during the Beta.\n\nSample and order — astrosivam.com/birth-jathagam",
    },
    hashtags: tags("jathagam"),
    cta: { line: "Read the sample, then order", url: "astrosivam.com/birth-jathagam", quickReply: "Birth Jathagam" },
  },
  {
    id: "marriage-porutham",
    category: "service",
    layout: "service-promo",
    label: "10 Poruthams — matching",
    serviceId: "marriage",
    theme: "saffron",
    content: {
      kicker: marriage.name,
      headline: "Ten poruthams, one honest answer.",
      subline: "Dasa Sandhi and both running dashas · one fee for both charts · PDF in Tamil or English.",
      tamil: marriage.tamilName,
      chips: ["All 10 classical poruthams", "Rajju & Vedha checks", "Kuja dosha balancing"],
      price: "US$5 · ₹470 · both charts",
      cta: "astrosivam.com/marriage-compatibility",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "Matching two charts is not a score out of 36.\n\nWe read all ten classical poruthams — Dina, Gana, Mahendra, Sthree Deergha, Yoni, Rasi, Rasiyathipathi, Vasya, Rajju and Vedha — then the checks most matching apps skip: Kuja dosha balancing, Dasa Sandhi and the running dasha of both people.\n\nBoth charts, one fee: US$5 · ₹470. First report free during the Beta.\n\nSend four details for each person — date, exact time, place, and we take it from there: astrosivam.com/marriage-compatibility",
      instagram:
        "Ten poruthams. Both charts. One fee.\n\nRajju · Vedha · Kuja dosha balancing · Dasa Sandhi.\n\nUS$5 · ₹470. First report free during the Beta.\n\nastrosivam.com/marriage-compatibility",
    },
    hashtags: tags("marriage"),
    cta: { line: "Send both birth details", url: "astrosivam.com/marriage-compatibility", quickReply: "Porutham matching" },
  },
  {
    id: "baby-naming",
    category: "service",
    layout: "service-promo",
    label: "Baby naming — birth star",
    serviceId: "baby-naming",
    theme: "forest",
    content: {
      kicker: babyNaming.name,
      headline: "The syllable your child's name begins with.",
      subline: "All four pada syllables · curated Tamil name shortlist · printable naming certificate.",
      tamil: babyNaming.tamilName,
      chips: ["All four pada syllables", "Curated name shortlist", "Printable certificate"],
      price: "US$5 · ₹470 · certificate included",
      cta: "astrosivam.com/baby-naming",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "In the Tamil tradition, a name begins with the syllable of the birth star's pada — not the star alone.\n\nWe calculate all four padas for the exact minute of birth, then send a shortlist of names that fit the syllable and the family's tradition, with a printable naming certificate for the naming ceremony.\n\nUS$5 · ₹470, certificate included. First report free during the Beta.\n\nSend the birth date, exact time and place: astrosivam.com/baby-naming",
      instagram:
        "The syllable your child's name begins with — calculated from the birth star's pada.\n\nAll four padas · name shortlist · printable certificate.\n\nUS$5 · ₹470. First report free during the Beta.\n\nastrosivam.com/baby-naming",
    },
    hashtags: tags("babyNaming"),
    cta: { line: "Send the birth details", url: "astrosivam.com/baby-naming", quickReply: "Baby Naming" },
  },
  {
    id: "muhurtham-dates",
    category: "service",
    layout: "service-promo",
    label: "Subha Muhurtham — dates",
    serviceId: "muhurtham",
    theme: "granite",
    content: {
      kicker: muhurtham.name,
      headline: "Six months of dates that actually suit you.",
      subline: "Eighteen ceremonies · Nalla Neram and Rahu Kalam timings · matched to both charts.",
      tamil: muhurtham.tamilName,
      chips: ["18 ceremonies covered", "Nalla Neram timings", "Matched to both charts"],
      price: "US$10 · ₹940 · six-month window",
      cta: "astrosivam.com/muhurtham",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "A date is auspicious for a ceremony, not for everyone in the abstract.\n\nSubha Muhurtham returns six months of windows calculated against both charts — for eighteen ceremonies from the naming to the housewarming — with the Nalla Neram and the Rahu Kalam that must be avoided on each day.\n\nUS$10 · ₹940. First report free during the Beta.\n\nTell us the ceremony and the two birth details: astrosivam.com/muhurtham",
      instagram:
        "Dates that suit your charts — not a generic calendar.\n\nSix months of windows · 18 ceremonies · Nalla Neram + Rahu Kalam.\n\nUS$10 · ₹940. First report free during the Beta.\n\nastrosivam.com/muhurtham",
    },
    hashtags: tags("muhurtham"),
    cta: { line: "Tell us the ceremony", url: "astrosivam.com/muhurtham", quickReply: "Muhurtham dates" },
  },

  /* ------------------------------ educational ---------------------------- */

  {
    id: "edu-sade-sati",
    category: "educational",
    layout: "educational",
    label: "Sade Sati, explained",
    serviceId: "transits",
    theme: "ivory",
    content: {
      kicker: "Transits",
      headline: "Sade Sati is a season, not a sentence.",
      subline: "Saturn crosses three signs around your Moon · each phase lasts about seven and a half years · pariharams are traditional remedies, not guarantees.",
      tamil: "சனி பெயர்ச்சி",
      chips: [],
      price: "",
      cta: "Read the full guide",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "Sade Sati frightens people more than it should.\n\nIt begins when Saturn enters the sign before your natal Moon, continues across the Moon sign itself, and ends in the sign after — roughly seven and a half years in each phase. Whether it is felt as difficulty or as discipline depends on Saturn's strength in your own chart, which is why we read it before we name it.\n\nThe traditional pariharams — the lamp, the sesame, the Tuesday observance — are practices of attention, not a promise that nothing will go wrong.\n\nRead the full guide, with a worked example: astrosivam.com/transits",
      instagram:
        "Sade Sati: a season, not a sentence.\n\nThree phases · ~7.5 years each · read against your own Saturn first.\n\nFull guide with a worked example — astrosivam.com/transits",
    },
    hashtags: tags("transits"),
    cta: { line: "Read the full guide", url: "astrosivam.com/transits", quickReply: "Sample report" },
  },
  {
    id: "edu-panchangam",
    category: "educational",
    layout: "educational",
    label: "How to read a panchangam",
    serviceId: "panchangam",
    theme: "sand",
    content: {
      kicker: "Panchangam",
      headline: "Five limbs, every single day.",
      subline: "Tithi is the lunar day · Nakshatra is the star of the Moon · Yoga and Karana refine the hour · Varam sets the weekday tone.",
      tamil: "தினசரி பஞ்சாங்கம்",
      chips: [],
      price: "",
      cta: "Today's panchangam",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "Panchangam means five limbs — and each one answers a different question.\n\nTithi, the lunar day, tells you what the day is for. Nakshatra, the star the Moon occupies, tells you what it favours. Yoga and Karana refine the hour. Varam sets the tone of the weekday itself.\n\nRead together, they explain why a Tuesday morning can be right for one errand and wrong for another. Our daily panchangam is free, always.\n\nToday's panchangam, in Tamil and English: astrosivam.com/panchangam",
      instagram:
        "Panchangam = five limbs.\n\nTithi · Nakshatra · Yoga · Karana · Varam.\n\nEach answers a different question about the same day. Our daily panchangam is free — astrosivam.com/panchangam",
    },
    hashtags: tags("panchangam"),
    cta: { line: "Read today's panchangam", url: "astrosivam.com/panchangam", quickReply: "Sample report" },
  },
  {
    id: "edu-method",
    category: "educational",
    layout: "educational",
    label: "How a chart is calculated",
    serviceId: "trust",
    theme: "midnight",
    content: {
      kicker: "Method",
      headline: "Why the ayanamsa changes your chart.",
      subline: "Sidereal and tropical zodiacs differ by about 24° · the Lahiri ayanamsa is the Indian standard · we cast every chart sidereally, then have a priest read it.",
      tamil: "லஹிரி அயனாம்சம்",
      chips: [],
      price: "",
      cta: "See a sample report",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "If your Sun sign never felt right, the ayanamsa may be why.\n\nMost Western horoscopes use the tropical zodiac. Indian astrology uses the sidereal zodiac, offset by the Lahiri ayanamsa — roughly 24 degrees, which is almost a whole sign. A Vedic Sun in Kumbha is not the same Sun the newspaper means.\n\nWe cast every chart sidereally, then a member of our temple-priest team reads it before it is emailed. That is the whole method; there is nothing else behind it.\n\nSee a full sample report before you pay: astrosivam.com/services",
      instagram:
        "Why your Sun sign never felt right: the ayanamsa.\n\nSidereal, not tropical. Lahiri offset ≈ 24°, almost a whole sign.\n\nSee a full sample before paying — astrosivam.com/services",
    },
    hashtags: tags("trust"),
    cta: { line: "See a full sample", url: "astrosivam.com/services", quickReply: "Sample report" },
  },

  /* -------------------------------- festival ----------------------------- */

  {
    id: "festival-diwalii",
    category: "festival",
    layout: "festival-greeting",
    label: "Deepavali greeting",
    serviceId: null,
    theme: "kumkum",
    content: {
      kicker: "Deepavali",
      headline: "May this Deepavali light every corner of your home.",
      subline: "From all of us at Astro Sivam.",
      tamil: "தீபாவளி வாழ்த்துக்கள்",
      chips: [],
      price: "",
      cta: "astrosivam.com",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "தீபாவளி வாழ்த்துக்கள் 🪔\n\nMay this Deepavali light every corner of your home, and may the year ahead hold more than you expect of it.\n\nFrom all of us at Astro Sivam — the priests who read your charts, and the team who answers your messages.\n\nIf you would like your year read properly before it begins, a Birth Jathagam is US$5 · ₹470, and the first is free during the Beta: astrosivam.com/birth-jathagam",
      instagram:
        "தீபாவளி வாழ்த்துக்கள் 🪔\n\nMay this Deepavali light every corner of your home.\n\n— Astro Sivam",
    },
    hashtags: { core: ["#Deepavali", "#Diwali", "#AstroSivam"], local: LOCAL_TAGS, service: ["#TamilGreetings"] },
    cta: { line: "Send a greeting back", url: "astrosivam.com", quickReply: "Birth Jathagam" },
  },
  {
    id: "festival-pongal",
    category: "festival",
    layout: "festival-greeting",
    label: "Pongal greeting",
    serviceId: null,
    theme: "saffron",
    content: {
      kicker: "Pongal",
      headline: "Pongalo pongal — may the harvest be plenty.",
      subline: "From all of us at Astro Sivam.",
      tamil: "இனிய பொங்கல் நல்வாழ்த்துக்கள்",
      chips: [],
      price: "",
      cta: "astrosivam.com",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "இனிய பொங்கல் நல்வாழ்த்துக்கள் 🌾\n\nMay the pot overflow, may the harvest be plenty, and may the year ahead be kinder than the last.\n\nFrom all of us at Astro Sivam.",
      instagram: "இனிய பொங்கல் நல்வாழ்த்துக்கள் 🌾\n\nPongalo pongal — may the harvest be plenty.\n\n— Astro Sivam",
    },
    hashtags: { core: ["#Pongal", "#ThaiPongal", "#AstroSivam"], local: LOCAL_TAGS, service: ["#TamilGreetings"] },
    cta: { line: "Send a greeting back", url: "astrosivam.com", quickReply: "Birth Jathagam" },
  },

  /* --------------------------------- trust ------------------------------- */

  {
    id: "trust-sample",
    category: "trust",
    layout: "educational",
    label: "See the sample first",
    serviceId: "trust",
    theme: "ivory",
    content: {
      kicker: "Before you pay",
      headline: "Read the whole report before you order.",
      subline: "Every order page links a full sample · same layout, same depth · no payment until you have read one.",
      tamil: "மாதிரி அறிக்கை",
      chips: [],
      price: "",
      cta: "Open a sample",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "You should not have to pay to find out what you are paying for.\n\nEvery order page links a complete sample report — the same layout, the same depth, the same language options you will receive. Read one first.\n\nIf it is not what you expected, tell us before you order. We would rather answer that question now than refund it later.\n\nSamples: astrosivam.com/services",
      instagram:
        "Read the whole report before you pay.\n\nA full sample is linked on every order page — same layout, same depth.\n\nastrosivam.com/services",
    },
    hashtags: tags("trust"),
    cta: { line: "Open a sample report", url: "astrosivam.com/services", quickReply: "Sample report" },
  },
  {
    id: "trust-review",
    category: "trust",
    layout: "educational",
    label: "What the review actually checks",
    serviceId: "trust",
    theme: "granite",
    content: {
      kicker: "Checked by hand",
      headline: "Two people read every chart before it is sent.",
      subline: "The calculation is software · the reading is a person · if the two disagree, the report is rewritten before it leaves.",
      tamil: "இரு வாசிப்பு",
      chips: [],
      price: "",
      cta: "See the review process",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "Software casts the chart. A person checks it.\n\nEvery order is calculated, then read by a member of our temple-priest team before it is emailed. If the reading and the calculation disagree — a wrong nakshatra, a dasa that does not match the birth time — the report is rewritten, not sent with a note.\n\nThat check is why a report takes six hours rather than six minutes.\n\nRead the process: astrosivam.com/services",
      instagram:
        "Software casts it. A person checks it.\n\nEvery chart is read by hand before it is emailed — and rewritten if the reading disagrees with the calculation.\n\nastrosivam.com/services",
    },
    hashtags: tags("trust"),
    cta: { line: "See the review process", url: "astrosivam.com/services", quickReply: "Sample report" },
  },
  {
    id: "trust-price",
    category: "trust",
    layout: "educational",
    label: "One price, written on the page",
    serviceId: "trust",
    theme: "sand",
    content: {
      kicker: "No surprises",
      headline: "The price on the page is the price you pay.",
      subline: "No consultation fee stacked on top · no charge for a Tamil version · no upsell after the report is sent.",
      tamil: "வெளிப்படையான விலை",
      chips: [],
      price: "",
      cta: "See the price list",
      footer: BASE_FOOTER,
    },
    captions: {
      facebook:
        "The price on the page is the price you pay.\n\nThere is no consultation fee stacked on top, no extra charge for the Tamil version, and no upsell waiting after the report is emailed. If something would cost more, it is written on the order page before you pay.\n\nWe would rather lose an order to a clear price than keep one that arrives as a surprise.\n\nPrice list: astrosivam.com/services",
      instagram:
        "The price on the page is the price you pay.\n\nNo consultation fee. No charge for Tamil. No upsell afterwards.\n\nastrosivam.com/services",
    },
    hashtags: tags("trust"),
    cta: { line: "See the price list", url: "astrosivam.com/services", quickReply: "Birth Jathagam" },
  },
];

/* --------------------------- page identity assets ------------------------ */

/**
 * The two assets that represent the Page itself. They are kept separately from
 * post copy: a profile seal is seen at 40 px in a comment, so it carries only the
 * mark and the wordmark, and a cover is cropped by the mobile layout, so its
 * promise must sit inside the 640 px safe box.
 */
export interface FbPageAsset {
  id: "profile-seal" | "cover-lockup";
  label: string;
  note: string;
  layout: FbLayout;
  theme: ThemeKey;
  content: FbContent;
}

export const FB_PAGE_ASSETS: FbPageAsset[] = [
  {
    id: "profile-seal",
    label: "Profile picture",
    note: "Reads at 176 px in the feed and 40 px in a comment: the plate, the wordmark, and nothing that needs squinting.",
    layout: "profile-seal",
    theme: "kumkum",
    content: {
      kicker: "Vedic astrology",
      headline: "Astro Sivam",
      subline: "",
      tamil: "ஜோதிடம்",
      chips: [],
      price: "",
      cta: "",
      footer: "",
    },
  },
  {
    id: "cover-lockup",
    label: "Cover photo",
    note: "1640 × 624, with every word inside the 640 × 360 area that stays visible on a phone.",
    layout: "cover-lockup",
    theme: "kumkum",
    content: {
      kicker: "Vedic Astrology",
      headline: "A full jathagam, written by hand and explained in plain language.",
      subline: "",
      tamil: "",
      chips: ["40-page PDF report", "Tamil or English", "7 days of chat"],
      price: "US$5 · ₹470",
      cta: "Message the Page",
      footer: "",
    },
  },
];

export const FB_COPY_BY_ID: Record<string, FbCopyEntry> = Object.fromEntries(
  FB_COPY_ENTRIES.map((entry) => [entry.id, entry]),
);

export const FB_CATEGORIES: Array<{ id: FbCategory; label: string; note: string }> = [
  { id: "service", label: "Service", note: "Paid-ready promotion with a price and a CTA" },
  { id: "educational", label: "Education", note: "Teaches something; no price on the image" },
  { id: "festival", label: "Festival", note: "Greeting first, brand in the footer" },
  { id: "trust", label: "Trust", note: "Samples, method and proof" },
];

/** Join a caption and its hashtag set the way Meta expects them. */
export function composePost(caption: string, entry: FbCopyEntry, platform: "facebook" | "instagram"): string {
  const tagList = [...entry.hashtags.service.slice(0, platform === "instagram" ? 5 : 3), ...entry.hashtags.core.slice(0, 4)];
  return `${caption.trim()}\n\n${tagList.join(" ")}`;
}
