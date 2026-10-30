import type { DeityKey, ThemeKey } from "../types";
import type { AdCopy, AdLayout } from "../lib/serviceAds";
import { getService } from "./services";

/* ==========================================================================
   The service advertising system, as data.
   ==========================================================================
   Every advertising plate answers four questions and no more: what it is, why
   it is worth reading, what it costs, and what to do next. Prices and URLs are
   never typed here — they are read from `Service` at render time, so a price
   change in one place moves every ad at once.

   Facts are quoted from the service record (deliverables, promise, proof,
   price note) rather than written fresh, and `tests/service-ads.test.ts`
   refuses any fact that cannot be found in that record.

   The Tamil and Hindi lines are prepared translations, marked as such in the
   interface. They are never machine-generated at render time.
   ========================================================================== */

export interface ServiceAd {
  id: string;
  serviceId: string;
  layout: AdLayout;
  theme: ThemeKey;
  art?: DeityKey;
  /** Verified price comes from the service; this only says how to label it. */
  copy: AdCopy;
  /** One line on when to reach for this composition. */
  use: string;
}

interface LocaleLine {
  tamil: string;
  hindi: string;
  /** "source" = shipped in the service record; "prepared" = needs a native read. */
  review: "source" | "prepared";
}

/**
 * One trilingual line per service, reused by every composition so the six
 * services stay recognisable across a campaign.
 */
export const SERVICE_LOCALES: Record<string, LocaleLine> = {
  jathagam: { tamil: "உங்கள் ஜாதகம் முழுமையாக", hindi: "आपकी कुंडली, पूरी तरह।", review: "prepared" },
  marriage: { tamil: "பத்து பொருத்தங்கள் தெளிவாக", hindi: "दस पोरुथम, साफ़ भाषा में।", review: "prepared" },
  "baby-naming": { tamil: "பிறந்த நட்சத்திரம் பெயரின் முதல் எழுத்து", hindi: "जन्म नक्षत्र, नाम की पहली ध्वनि।", review: "prepared" },
  muhurtham: { tamil: "சுப முகூர்த்தம் ஆறு மாத நாட்கள்", hindi: "शुभ मुहूर्त, छह महीने की तिथियाँ।", review: "prepared" },
  panchangam: { tamil: "இன்றைய பஞ்சாங்கம் இலவசமாக", hindi: "आज का पंचांग, मुफ़्त।", review: "prepared" },
  transits: { tamil: "சனி பெயர்ச்சி தேதியுடன்", hindi: "शनि की चाल, तारीख़ के साथ।", review: "prepared" },
  trust: { tamil: "பணம் செலுத்தும் முன் முழு மாதிரி", hindi: "भुगतान से पहले पूरा नमूना।", review: "prepared" },
};

const locale = (serviceId: string) => {
  const line = SERVICE_LOCALES[serviceId];
  return { tamil: line?.tamil ?? "", hindi: line?.hindi ?? "" };
};

const ad = (
  serviceId: string,
  layout: AdLayout,
  theme: ThemeKey,
  entry: Omit<AdCopy, "tamil" | "hindi">,
  art?: DeityKey,
): ServiceAd => ({
  id: `${serviceId}-${layout}`,
  serviceId,
  layout,
  theme,
  art,
  copy: { ...entry, ...locale(serviceId) },
  use: "",
});

export const SERVICE_ADS: ServiceAd[] = [
  /* ----------------------------- Birth Jathagam --------------------------- */
  {
    ...ad(
      "jathagam",
      "ad-plate",
      "midnight",
      {
        kicker: "Birth Jathagam",
        headline: "Your life, mapped to the minute.",
        subline:
          "Rasi and Navamsa charts, positions and a dasha timeline.",
        cta: "Order the jathagam",
        facts: ["Rasi + Navamsa (D9) charts", "Vimshottari dasa timeline", "PDF in English, Tamil or Hindi"],
      },
      "ganesha",
    ),
    use: "The flagship plate. Pin it, boost it, open every campaign with it.",
  },
  {
    ...ad(
      "jathagam",
      "ad-checklist",
      "ivory",
      {
        kicker: "Birth Jathagam",
        headline: "What actually arrives in a Jathagam.",
        subline: "",
        cta: "See what's included",
        facts: [
          "Rasi + Navamsa (D9) charts",
          "Vimshottari dasa timeline",
          "Sade Sati status & pariharams",
          "7 days of astrologer chat",
        ],
      },
      "ganesha",
    ),
    use: "Retargeting. People who opened the ad but did not order want the contents, not the promise.",
  },
  {
    ...ad(
      "jathagam",
      "ad-statement",
      "kumkum",
      {
        kicker: "Birth Jathagam",
        headline: "The chart is calculated. The reading is explained.",
        subline: "Basic or Bhava tier, both in the Lahiri sidereal zodiac and reviewed by temple priests.",
        cta: "Read a sample",
        facts: ["Basic & Bhava tiers", "Chitra Paksha Lahiri", "PDF in English, Tamil or Hindi"],
      },
      "ganesha",
    ),
    use: "A calm plate for a feed full of zodiac art. Use it between two photographic ads.",
  },
  {
    ...ad(
      "jathagam",
      "ad-split",
      "midnight",
      {
        kicker: "Birth Jathagam",
        headline: "Twelve bhavas. One honest timeline.",
        subline: "Career, wealth, marriage and health — read together, in order.",
        cta: "Order the jathagam",
        facts: ["Twelve bhavas", "Bhava Jathagam tier", "7 days of astrologer chat"],
      },
      "ganesha",
    ),
    use: "Carousel cover or a standalone feed post when the photograph carries the scroll.",
  },

  /* -------------------------- Marriage Compatibility ---------------------- */
  {
    ...ad(
      "marriage",
      "ad-duo",
      "saffron",
      {
        kicker: "10 Poruthams",
        headline: "Two charts. One clear verdict.",
        subline: "All ten poruthams, Rajju, Vedha and a plain verdict.",
        cta: "Check your poruthams",
        facts: ["All 10 poruthams, explained", "Rajju & Vedha checks", "Clear yes / caution verdict"],
      },
      "meenakshi",
    ),
    use: "The two-chart composition the service is actually about — the lead plate.",
  },
  {
    ...ad(
      "marriage",
      "ad-split",
      "ivory",
      {
        kicker: "10 Poruthams",
        headline: "A 9 out of 10 can still miss Rajju.",
        subline: "Ten checks protect ten parts of a marriage. One total hides the risk.",
        cta: "Read the ten checks",
        facts: ["Rajju & Vedha checks", "Kuja (Chevvai) dosha balancing", "Dasa Sandhi comparison"],
      },
      "meenakshi",
    ),
    use: "The educational ad. It positions against score-card compatibility without naming anyone.",
  },
  {
    ...ad(
      "marriage",
      "ad-checklist",
      "kumkum",
      {
        kicker: "10 Poruthams",
        headline: "Ten poruthams, checked one by one.",
        subline: "",
        cta: "See what's included",
        facts: [
          "All 10 poruthams, explained",
          "Rajju & Vedha checks",
          "Kuja (Chevvai) dosha balancing",
          "Clear yes / caution verdict",
        ],
      },
      "meenakshi",
    ),
    use: "Retargeting and story link stickers, where the list does the persuading.",
  },
  {
    ...ad(
      "marriage",
      "ad-band",
      "saffron",
      {
        kicker: "10 Poruthams",
        headline: "Before the families meet, read the poruthams.",
        subline: "The report ends in “yes” or “caution”, with the reasoning printed on the same page.",
        cta: "Check your poruthams",
        facts: ["Both charts read", "Dasa Sandhi compared", "PDF in English, Tamil or Hindi"],
      },
      "meenakshi",
    ),
    use: "The interruption plate — highest thumb-size legibility of the six.",
  },

  /* ----------------------------- Baby Naming ------------------------------ */
  {
    ...ad(
      "baby-naming",
      "ad-plate",
      "ivory",
      {
        kicker: "Namakaranam",
        headline: "Name your child by the stars they arrived under.",
        subline: "Birth-star syllables, four padas, a printable certificate.",
        cta: "Order the naming report",
        facts: ["Syllables for all four padas", "Curated name shortlist", "Printable naming certificate"],
      },
      "krishna",
    ),
    use: "The lead plate for expecting parents — the tenderest art in the set.",
  },
  {
    ...ad(
      "baby-naming",
      "ad-duo",
      "sand",
      {
        kicker: "Namakaranam",
        headline: "One star, four padas, one first sound.",
        subline: "Your nakshatra sets the opening sound.",
        cta: "See the syllables",
        facts: ["Primary starting syllable", "Syllables for all four padas", "Meaning notes in three languages"],
      },
      "krishna",
    ),
    use: "The explainer ad. Pair it with a question-box story about naming.",
  },
  {
    ...ad(
      "baby-naming",
      "ad-statement",
      "sand",
      {
        kicker: "Namakaranam",
        headline: "The syllable comes first. The name is yours.",
        subline: "The birth syllable starts the name; the rest is the family's choice.",
        cta: "Read a sample",
        facts: ["27 nakshatras", "4 padas per star", "English · Tamil · Hindi"],
      },
      "krishna",
    ),
    use: "A quiet plate for the family group chat, where text forwards better than photos.",
  },
  {
    ...ad(
      "baby-naming",
      "ad-checklist",
      "ivory",
      {
        kicker: "Namakaranam",
        headline: "What the naming report includes.",
        subline: "",
        cta: "See what's included",
        facts: [
          "Primary starting syllable",
          "Syllables for all four padas",
          "Curated name shortlist",
          "Printable naming certificate",
        ],
      },
      "krishna",
    ),
    use: "Retargeting parents who saved the first plate and stopped there.",
  },

  /* ----------------------------- Subha Muhurtham -------------------------- */
  {
    ...ad(
      "muhurtham",
      "ad-band",
      "saffron",
      {
        kicker: "Subha Muhurtham",
        headline: "Six months of dates that agree with the sky.",
        subline: "A six-month window with Nalla Neram timings, Tara Balam and the hours to avoid, marked clearly.",
        cta: "Find your dates",
        facts: ["Six-month date window", "Nalla Neram & Rahu Kalam", "18 ceremony profiles"],
      },
      "lakshmi",
    ),
    use: "The lead plate. Dates are the product, so the plate is the promise.",
  },
  {
    ...ad(
      "muhurtham",
      "ad-split",
      "kumkum",
      {
        kicker: "Subha Muhurtham",
        headline: "Fix the date after the sky agrees.",
        subline: "Tithi, nakshatra and the lagna rising at the hour.",
        cta: "Find your dates",
        facts: ["Tithi, nakshatra & lagna", "Tara Balam + Chandrashtama", "PDF in English, Tamil or Hindi"],
      },
      "lakshmi",
    ),
    use: "The argument against picking a hall first. Use it in the booking season.",
  },
  {
    ...ad(
      "muhurtham",
      "ad-checklist",
      "ivory",
      {
        kicker: "Subha Muhurtham",
        headline: "What a muhurtham actually checks.",
        subline: "",
        cta: "See what's included",
        facts: ["Six-month date window", "18 ceremony profiles", "Nalla Neram & Rahu Kalam", "Tara Balam + Chandrashtama"],
      },
      "lakshmi",
    ),
    use: "Retargeting families who are comparing two astrologers on price.",
  },
  {
    ...ad(
      "muhurtham",
      "ad-plate",
      "saffron",
      {
        kicker: "Subha Muhurtham",
        headline: "Eighteen ceremonies. One calendar.",
        subline: "Eighteen ceremonies, each with its own date set.",
        cta: "Find your dates",
        facts: ["18 ceremony profiles", "Six-month date window", "7 days of astrologer chat"],
      },
      "lakshmi",
    ),
    use: "The wide-campaign plate for planners, priests and banquet halls.",
  },

  /* ----------------------------- Daily Panjangam -------------------------- */
  {
    ...ad(
      "panchangam",
      "ad-statement",
      "ivory",
      {
        kicker: "Daily Panjangam",
        headline: "Today's sky, in five lines.",
        subline: "Tithi, nakshatra, Rahu Kalam and sunrise — for your city.",
        cta: "Open today's panchangam",
        facts: ["10 daily elements", "Rahu Kalam · Yamagandam", "Sunrise & sunset"],
      },
      "murugan",
    ),
    use: "The everyday plate. Free, so the only ask is a visit.",
  },
  {
    ...ad(
      "panchangam",
      "ad-band",
      "midnight",
      {
        kicker: "Daily Panjangam",
        headline: "Tithi. Nakshatra. Rahu Kalam.",
        subline: "Sunrise, sunset and the hour worth using — free each morning.",
        cta: "Open today's panchangam",
        facts: ["Calculated for your city", "24 planetary horai", "Free, every morning"],
      },
      "murugan",
    ),
    use: "The morning story and the 6:30 AM feed post.",
  },
  {
    ...ad(
      "panchangam",
      "ad-checklist",
      "ivory",
      {
        kicker: "Daily Panjangam",
        headline: "What the daily card tells you.",
        subline: "",
        cta: "See the daily card",
        facts: ["10 daily elements: tithi to karanam", "Auspicious periods incl. Brahma Muhurtham", "Rahu Kalam · Yamagandam · Gulikai", "HD share card (1080×1350)"],
      },
      "murugan",
    ),
    use: "Explains the free product without asking for money. Use it before a paid campaign.",
  },
  {
    ...ad(
      "panchangam",
      "ad-plate",
      "midnight",
      {
        kicker: "Daily Panjangam",
        headline: "Free, every morning, for your city.",
        subline: "Thirukanitha · True Lahiri, calculated for your city.",
        cta: "Open today's panchangam",
        facts: ["Thirukanitha · True Lahiri", "Sunrise, sunset, moonrise", "Free, every morning"],
      },
      "murugan",
    ),
    use: "The habit-forming plate. Post it at sunrise and pin the story.",
  },

  /* ------------------------ Transits & Sade Sati -------------------------- */
  {
    ...ad(
      "transits",
      "ad-duo",
      "jade",
      {
        kicker: "Transits & Sade Sati",
        headline: "Sade Sati has an end date.",
        subline: "The stage you are in, and how long it runs.",
        cta: "Read your transit",
        facts: ["Sade Sati stage & duration", "Saturn transit vs your rasi", "Practical pariharams"],
      },
      "hanuman",
    ),
    use: "The lead plate. It answers the fear without promising relief.",
  },
  {
    ...ad(
      "transits",
      "ad-plate",
      "midnight",
      {
        kicker: "Transits & Sade Sati",
        headline: "The sky is moving. Here is when.",
        subline: "Saturn against your rasi, with the dates.",
        cta: "Read your transit",
        facts: ["Saturn transit vs your rasi", "Guru transit opportunities", "Rahu–Ketu axis reading"],
      },
      "hanuman",
    ),
    use: "The evergreen plate for people who already own a Jathagam.",
  },
  {
    ...ad(
      "transits",
      "ad-band",
      "jade",
      {
        kicker: "Transits & Sade Sati",
        headline: "Saturn is slow. Read it calmly.",
        subline: "Stages, dates and practical pariharams — with context, never with panic.",
        cta: "Read your transit",
        facts: ["Three stages, dated", "Traditional pariharams", "PDF in English, Tamil or Hindi"],
      },
      "hanuman",
    ),
    use: "The counter-programming plate. Run it against fear-based astrology ads.",
  },
  {
    ...ad(
      "transits",
      "ad-statement",
      "midnight",
      {
        kicker: "Transits & Sade Sati",
        headline: "A season, not a sentence.",
        subline: "Saturn travelling over your Moon — read in your chart.",
        cta: "Read your transit",
        facts: ["About seven and a half years", "Three stages", "Read with your Jathagam"],
      },
      "hanuman",
    ),
    use: "The house line, set as type. Use it as the pinned post on the profile.",
  },

  /* ----------------------------- Samples & Trust -------------------------- */
  {
    ...ad(
      "trust",
      "ad-statement",
      "midnight",
      {
        kicker: "Samples & Trust",
        headline: "Read the whole report before you order.",
        subline: "Every order page opens a full sample PDF — same depth, no email wall.",
        cta: "Open a sample",
        facts: ["Full sample PDF for every report", "Priest review process explained", "90% refund before approval"],
      },
      "ganesha",
    ),
    use: "The trust plate. Run it between two paid ads, never as the first thing a stranger sees.",
  },
  {
    ...ad(
      "trust",
      "ad-checklist",
      "ivory",
      {
        kicker: "Samples & Trust",
        headline: "What you get before you pay.",
        subline: "",
        cta: "Open a sample",
        facts: ["Full sample PDF for every report", "Priest review process explained", "90% refund before approval", "7 days of astrologer chat"],
      },
      "ganesha",
    ),
    use: "Retargeting anyone who has seen a price and hesitated.",
  },
];

/** Ads for one service, in the order they should be tested. */
export const adsFor = (serviceId: string): ServiceAd[] => SERVICE_ADS.filter((item) => item.serviceId === serviceId);

export const adById = (id: string): ServiceAd | undefined => SERVICE_ADS.find((item) => item.id === id);

/** The six briefed services, in the order the studio lists them. */
export const AD_SERVICE_IDS = ["jathagam", "marriage", "baby-naming", "muhurtham", "panchangam", "transits", "trust"];

/* ------------------------------ reference plates -------------------------- */

export interface ReferencePlate {
  id: string;
  serviceId: string;
  layout: "edu-guide" | "edu-step";
  theme: ThemeKey;
  kicker: string;
  headline: string;
  body: string;
  facts: string[];
  step: string;
  source: string;
}

/**
 * Educational plates are derived, not written: they are the service's own
 * explainer slides, with any slide that mentions a price, a URL or an offer
 * removed. That keeps instruction and selling in separate objects — a
 * reference plate cannot carry an offer because it never receives one.
 */
const isSalesSlide = (text: string) => /US\$|₹|\bfree\b|astrosivam\.com|link in bio|order/i.test(text);

export function referencePlates(serviceId: string): ReferencePlate[] {
  const service = getService(serviceId);
  const teaching = service.carousel.slides.filter(
    (slide) => !isSalesSlide(slide.body) && !isSalesSlide(slide.headline) && !isSalesSlide(slide.kicker),
  );
  return teaching.slice(0, 3).map((slide, index) => {
    const others = teaching.filter((_, other) => other !== index).map((item) => item.headline);
    return {
      id: `${serviceId}-ref-${index + 1}`,
      serviceId,
      layout: index % 2 === 0 ? "edu-guide" : "edu-step",
      theme: service.theme,
      kicker: service.shortName,
      headline: slide.headline,
      body: slide.body,
      facts: index % 2 === 0 ? others.slice(0, 3) : [],
      step: `${slide.kicker} · ${index + 1} of ${teaching.length}`,
      source: `Source: “${service.carousel.title}” · slide ${index + 1}`,
    };
  });
}

/* --------------------------------- rules ---------------------------------- */

export const AD_RULES = [
  "One action per plate. If a headline needs a second CTA, it needs a second plate.",
  "Price, URL and tier names come from the service record — never retyped on a layout.",
  "Two or three facts, each traceable to the service data. No testimonials, no counts we cannot show.",
  "No promise of an outcome, no “guaranteed”, no urgency that we invented.",
  "English is the display line. Tamil and Hindi sit beneath it, never competing for the first read.",
  "Reference plates carry no price and no CTA — they teach, they do not sell.",
];
