import type { DisplayFontKey, ThemeKey } from "../types";
import type { CompositionKey, DesignCategory } from "./designBriefs";
import { BRAND } from "./brand";

/* ==========================================================================
   The plain-words campaign.
   ==========================================================================
   Astro Sivam is a new service, and the first question a stranger asks is not
   "what does my chart say" — it is "what is this, and what do I do next?".

   Every plate here answers that in three lines: what the service is, why it
   helps someone who cannot reach their own priest, and the one price or action
   that follows. Nothing is a metaphor. If a sentence could be misunderstood by
   someone reading it for the first time, it does not belong in this file.

   The hooks (a busy priest, no time to visit the temple, a family abroad) are
   the real reasons people search for an online jathagam. They lead the plate;
   the service explains itself underneath.

   Prices, dates and deliverables are quoted from `src/data/services` — never
   typed here — so a price change moves the campaign with it.
   ========================================================================== */

export interface PlainWordsCopy {
  kicker: string;
  serviceTitle: string;
  headline: string;
  subline: string;
  facts: string[];
  cta: string;
}

export interface PlainWordsPoster {
  id: string;
  /** Short name for the gallery tile. */
  label: string;
  /** The one sentence this plate has to land. */
  message: string;
  category: DesignCategory;
  occasion: string;
  composition: CompositionKey;
  theme: ThemeKey;
  display: DisplayFontKey;
  image: string;
  width: number;
  height: number;
  copy: PlainWordsCopy;
  /** The caption that goes under the post — same plain voice, no poetry. */
  caption: string;
}

const CTA_URL = BRAND.website;

export const PLAIN_WORDS: PlainWordsPoster[] = [
  {
    id: "priest-is-busy",
    label: "Your priest is busy",
    message: "Our priests are ready — the lead plate of the whole campaign.",
    category: "birth",
    occasion: "discover",
    composition: "diagonal",
    theme: "kumkum",
    display: "cormorant",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "Jathagam service, online",
      serviceTitle: "Astro Sivam",
      headline: "Your priest is busy. Our priests are ready.",
      subline:
        "Astro Sivam prepares your jathagam online. Send your birth details and our priest team reads the chart before your report is sent.",
      facts: ["Prepared by priests", "Sent as a PDF", "7 days of chat"],
      cta: "Order at astrosivam.com",
    },
    caption:
      "Your family priest cannot take another appointment this month. You still deserve a clear reading of your chart.\n\nAstro Sivam is an online jathagam service from Tamil Nadu. You send your birth date, time and place, our India-based priest team reviews the chart, and your report arrives by email as a PDF. Seven days of chat come with every report, so you can ask what it means for you.",
  },
  {
    id: "no-time-to-visit",
    label: "No time to visit",
    message: "No travel, no appointment, no queue — send three details instead.",
    category: "birth",
    occasion: "discover",
    composition: "editorial",
    theme: "midnight",
    display: "cormorant",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "No visit needed",
      serviceTitle: "Birth Jathagam",
      headline: "No time to visit the temple? Send your details instead.",
      subline:
        "Birth date, birth time and birth place. That is all we need. We prepare the report and email it to you.",
      facts: ["No travel", "No appointment", "No queue"],
      cta: "Start your jathagam",
    },
    caption:
      "Work, children, distance, traffic — there are many reasons you cannot sit at the temple this week.\n\nAstro Sivam does the same work online. Send your birth date, time and place. Our priest team checks the chart and prepares a written report, which reaches your email as a PDF. You do not need to travel anywhere or wait in a queue.",
  },
  {
    id: "three-details",
    label: "Three details",
    message: "What you send, who checks it, what arrives — in that order.",
    category: "birth",
    occasion: "precision",
    composition: "infographic",
    theme: "ivory",
    display: "inter",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "How it works",
      serviceTitle: "Three steps",
      headline: "Three details. One clear report.",
      subline:
        "You send the details. A priest checks the chart. Your PDF report and tax invoice arrive by email.",
      facts: ["1 · Date, time, place", "2 · Priest review", "3 · PDF by email"],
      cta: "See how it works",
    },
    caption:
      "This is the whole process, in three lines.\n\n1. Send three details: birth date, birth time and birth place.\n2. Our India-based priest team checks the chart every six hours.\n3. Your PDF report and tax invoice are emailed to you after approval.\n\nNo office visit, no phone call, no waiting room.",
  },
  {
    id: "what-we-do",
    label: "What we do",
    message: "The explainer plate: what Astro Sivam is, in one breath.",
    category: "birth",
    occasion: "discover",
    composition: "split",
    theme: "midnight",
    display: "cinzel",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "In plain words",
      serviceTitle: "What we do",
      headline: "We calculate your chart and explain what it says.",
      subline:
        "Not a computer printout. Our priest team reviews every chart before the report is sent to you.",
      facts: ["Birth Jathagam", "Marriage matching", "Muhurtham dates"],
      cta: "See all services",
    },
    caption:
      "Astro Sivam is a Vedic astrology service. We calculate your birth chart and then explain it in everyday language — eight life areas, your dasa periods, and what they mean for the years ahead.\n\nOur priest team checks each chart before the report leaves us. You get a PDF in English, Tamil or Hindi, plus seven days of chat to ask your own questions.",
  },
  {
    id: "one-price",
    label: "One price",
    message: "US$5 once. No subscription, no renewal — the objection a new customer always raises.",
    category: "birth",
    occasion: "discover",
    composition: "infographic",
    theme: "midnight",
    display: "playfair",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "Plain pricing",
      serviceTitle: "One report, one price",
      headline: "US$5 for one report. No subscription.",
      subline:
        "Birth Jathagam US$5, Bhava or Varga US$10, Wedding matching US$5, Muhurtham US$10. You pay once.",
      facts: ["Basic US$5", "Bhava and Varga US$10", "Muhurtham US$10"],
      cta: "Order at astrosivam.com",
    },
    caption:
      "There is no monthly plan and no auto-renewal. You pay once for one report.\n\nBirth Jathagam is US$5 (₹470 in India). Bhava and Varga reports are US$10. Wedding matching is US$5 for both charts. Subha Muhurtham is US$10 for a six-month calendar. Your first report is free while we are in beta, and 90% is refundable before the report is approved.",
  },
  {
    id: "read-before-pay",
    label: "Read before you pay",
    message: "Kills the fear of paying a stranger online: a full sample PDF, free.",
    category: "birth",
    occasion: "discover",
    composition: "asymmetric",
    theme: "sand",
    display: "cormorant",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "Before you pay",
      serviceTitle: "Free sample report",
      headline: "Read the full report before you pay.",
      subline:
        "Every service has a complete sample PDF — the same pages, language and detail you will receive.",
      facts: ["Free sample PDF", "Every service", "Real layout"],
      cta: "Open a sample",
    },
    caption:
      "You should not have to pay to find out what a report looks like.\n\nEvery Astro Sivam service page has an 'Open sample PDF' button. It opens a full report built from fixed sample details — the same layout, the same sections and the same language you will receive. Read it first, then decide.",
  },
  {
    id: "living-abroad",
    label: "Living abroad",
    message: "The temple is far away — the report is not. Also prints the three languages.",
    category: "birth",
    occasion: "discover",
    composition: "devotional",
    theme: "obsidian",
    display: "inter",
    image: "/art/navagraha.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "For families abroad",
      serviceTitle: "Astro Sivam",
      headline: "The temple is far. Your jathagam is not.",
      subline:
        "Wherever you live, order online. Your report arrives by email in English, Tamil or Hindi.",
      facts: ["Order from any country", "PDF by email", "3 languages"],
      cta: "Order from your phone",
    },
    caption:
      "If you live away from home, your family priest may be thousands of kilometres away — and a phone call cannot produce a written chart.\n\nAstro Sivam works wherever you are. You order online, pay in US dollars, and receive the finished PDF in English, Tamil or Hindi. The priest review is the same one our customers in India get.",
  },
  {
    id: "inside-jathagam",
    label: "Inside a jathagam",
    message: "Answers the beginner's question: what is actually in it?",
    category: "birth",
    occasion: "discover",
    composition: "story",
    theme: "ivory",
    display: "inter",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "Inside the report",
      serviceTitle: "Birth Jathagam",
      headline: "What does a jathagam tell you?",
      subline:
        "Your Rasi and Navamsa charts, planet positions, dasa periods and eight life areas, written in everyday language.",
      facts: ["Rasi + Navamsa charts", "Dasa timeline", "Eight life areas"],
      cta: "Open a sample",
    },
    caption:
      "A jathagam is a written reading of the sky at the moment you were born.\n\nOurs opens with your Rasi and Navamsa charts and your planet positions. Then it explains your Vimshottari dasa periods — the timeline of your life — and reads eight life areas in plain language. It ends with what to do next, not with a warning.",
  },
  {
    id: "marriage-matching",
    label: "Marriage matching",
    message: "Ten poruthams, one verdict — in words both families can follow.",
    category: "wedding",
    occasion: "matching",
    composition: "diagonal",
    theme: "rose",
    display: "cormorant",
    image: "/art/wedding-matching.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "Marriage matching",
      serviceTitle: "10 Poruthams",
      headline: "Marriage matching, explained in plain words.",
      subline:
        "We read both charts on all ten poruthams and say clearly what is strong and what needs care.",
      facts: ["All 10 poruthams", "Rajju and Vedha", "One clear verdict"],
      cta: "Check a match",
    },
    caption:
      "A single score does not help a family decide. A clear explanation does.\n\nWe read both charts together on all ten poruthams, check Rajju, Vedha and Kuja dosha, and write one honest verdict: what is strong, what needs care and what to ask about. US$5 for both charts, with seven days of chat after the report.",
  },
  {
    id: "muhurtham-dates",
    label: "Need a date",
    message: "Six months of dates, with the reasons printed.",
    category: "muhurtham",
    occasion: "auspicious",
    composition: "mandala",
    theme: "saffron",
    display: "cinzel",
    image: "/art/subha-muhurtham.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "Dates that suit your family",
      serviceTitle: "Subha Muhurtham",
      headline: "Need a date? We check six months for you.",
      subline:
        "Wedding, housewarming or naming ceremony — with Nalla Neram, Rahu Kalam and Tara Balam marked.",
      facts: ["18 ceremonies", "Six-month window", "Nalla Neram listed"],
      cta: "Find your date",
    },
    caption:
      "Finding a muhurtham should not mean calling four people and comparing three calendars.\n\nOne report covers six months and eighteen ceremonies. Every suitable window is printed with its Nalla Neram, Rahu Kalam and Tara Balam, so the whole family can plan around one page. US$10, reviewed by our priest team.",
  },
  {
    id: "ask-after",
    label: "Ask afterwards",
    message: "The report is not the end — seven days of chat is included.",
    category: "birth",
    occasion: "family",
    composition: "editorial",
    theme: "ivory",
    display: "playfair",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "Included in every report",
      serviceTitle: "Seven days of chat",
      headline: "You can ask questions after the report arrives.",
      subline:
        "Every report includes seven days of chat with our astrologer team, so you can ask what it means for you.",
      facts: ["7 days included", "No extra charge", "Plain answers"],
      cta: "Read what is included",
    },
    caption:
      "A report can answer the general question. Your own question usually comes after reading it.\n\nThat is why every Astro Sivam report includes seven days of personal chat with our astrologer team, at no extra charge. Ask what a dasa means for your work, what a porutham means for a match, or what to do next.",
  },
  {
    id: "right-age",
    label: "Right report for the age",
    message: "Explains the five plans without a pricing table — one form picks the right one.",
    category: "birth",
    occasion: "family",
    composition: "story",
    theme: "saffron",
    display: "inter",
    image: "/art/birth-jathagam.jpg",
    width: 1080,
    height: 1350,
    copy: {
      kicker: "One form, five plans",
      serviceTitle: "The right report",
      headline: "The right report for every age.",
      subline:
        "Enter the birth date once. Children 0–10 get Kids Jadagam, 11–18 get Students Jadagam, adults choose Basic, Bhava or Varga.",
      facts: ["Kids 0–10", "Students 11–18", "Adults: Basic, Bhava, Varga"],
      cta: "Order for your family",
    },
    caption:
      "You do not have to work out which report to buy. The form does it from the birth date.\n\nA child aged 0–10 receives the Kids Jadagam, written for parents. A teenager aged 11–18 receives the Students Jadagam, focused on study and exam years. Adults choose Basic, Bhava or Varga. All five plans start at US$5.",
  },
];

/* --------------------------------- helpers -------------------------------- */

const HASHTAGS = ["#AstroSivam", "#VedicAstrology", "#Jathagam", "#TamilAstrology", "#BirthChart"];

/** The caption block: the plate's caption, then the link, then five tags. */
export const plainWordsCaption = (poster: PlainWordsPoster): string =>
  `${poster.caption}\n\nOrder at ${CTA_URL} · questions: ${BRAND.email}\n\n${HASHTAGS.join(" ")}`;

/** Instagram is tighter: shorter caption, the same tags, held under 2,200. */
export const plainWordsInstagram = (poster: PlainWordsPoster): string => {
  const first = poster.caption.split("\n\n")[0];
  const body = `${first}\n\n${poster.copy.subline}\n\n${poster.copy.facts.map((f) => `· ${f}`).join("\n")}\n\n${poster.copy.cta} — link in bio.\n\n${HASHTAGS.join(" ")}`;
  return body.slice(0, 2190);
};

export const plainWordsById = (id: string): PlainWordsPoster | undefined =>
  PLAIN_WORDS.find((poster) => poster.id === id);
