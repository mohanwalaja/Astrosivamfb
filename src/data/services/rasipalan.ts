import type { Service } from "../../types";

/**
 * Public Rasi Palan service verified at astrosivam.com/rasipalan on 2026-11-04.
 *
 * Forecast text, ratings and highlights are date/period-specific. This record
 * deliberately describes the live service without freezing a reading into an
 * evergreen social post. Copy the current wording from the public page before
 * publishing a dated prediction.
 */
export const RASI_PALAN_PERIODS = ["Daily", "Weekly", "Monthly", "Yearly"] as const;

export const RASI_PALAN_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export const RASI_PALAN_PERIOD_LABELS = ["Extra caution", "Care needed", "Normal period"] as const;

export const RASI_PALAN_HIGHLIGHTS = [
  "Money & Wealth",
  "Career & Business",
  "Love & Relations",
  "Travel",
] as const;

export const rasipalan: Service = {
  id: "rasipalan",
  name: "Rasi Palan — Daily, Weekly, Monthly & Yearly",
  shortName: "Rasi Palan",
  tamilName: "ராசி பலன்",
  kind: "Free daily",
  badge: "New · by Moon sign",
  // The public page has no checkout or price. "Read online" is used instead of
  // making a stronger pricing promise than the live page itself makes.
  price: "Read online",
  priceNote: "Daily · Weekly · Monthly · Yearly · all 12 Moon signs · no checkout on the public page",
  path: "/rasipalan",
  url: "https://astrosivam.com/rasipalan",
  promise:
    "Read the current Rasi Palan for your Moon sign across four timeframes, with a quick period summary and a full palan one tap away.",
  deliverables: [
    "All 12 Moon signs, Aries to Pisces",
    "Daily, Weekly, Monthly & Yearly periods",
    "Five-star period summary for each sign",
    "Period labels including Normal period and Care needed",
    "A highlighted area such as Money & Wealth or Career & Business",
    "Read full palan from each sign card",
  ],
  proof:
    "The public page shows all 12 signs and four period tabs. Each sign card carries a five-star summary, a period label and one highlight, with a Read full palan action. Ratings, labels and highlights change with the selected period; this suite stores no forecast body or dated prediction.",
  motif: "transits",
  theme: "lagoon",
  creative: {
    kicker: "Rasi Palan · Moon sign",
    headline: "Your rasi. Four timeframes. One clear place to read.",
    subline: "Daily · Weekly · Monthly · Yearly — choose your Moon sign and read the current palan.",
    tamil: "ராசி பலன்",
    chips: ["12 Moon signs", "4 timeframes", "Full palan"],
    price: "Read online",
    cta: "astrosivam.com/rasipalan",
  },
  artDirection:
    "A silver Moon above a precise South Indian twelve-house Rasi chart on deep lagoon blue, four quiet orbital rings suggesting daily through yearly cycles, restrained antique-gold lines, no Western zodiac wheel, no text, editorial 4:5.",
  altText:
    "A Moon and twelve-house Rasi chart on deep blue with the line 'Your rasi. Four timeframes. One clear place to read.'",
  fb: {
    hook: "Looking for today's Rasi Palan — or the longer view for your week, month or year?",
    body: [
      "Astro Sivam's Rasi Palan is organised by Moon sign. Choose your rasi from Aries to Pisces, then select Daily, Weekly, Monthly or Yearly.",
      "Each sign card gives a quick summary: a five-star rating, a period label and a highlight such as Money & Wealth, Career & Business, Love & Relations or Travel. Tap your rasi to read the full palan.",
      "The reading belongs to the period you select. Open the live page for the current rating, highlight and full wording rather than relying on an old screenshot.",
    ],
    bullets: [
      "All 12 Moon signs",
      "Daily, Weekly, Monthly and Yearly readings",
      "Star rating, period label and focus highlight",
      "Full palan from every sign card",
    ],
    cta: "Choose your Moon sign and read the current Rasi Palan at astrosivam.com/rasipalan.",
    hashtags: ["#AstroSivam", "#RasiPalan", "#MoonSign", "#Rashifal", "#TamilAstrology"],
  },
  ig: {
    hook: "Your Moon sign. Your current palan. Four timeframes in one place.",
    body: [
      "Choose Daily, Weekly, Monthly or Yearly, then tap your rasi from Aries to Pisces.",
      "The sign card shows the period's star summary, guidance label and one focus highlight; open it for the full palan.",
      "Check the live page for the current reading — ratings and highlights belong to their selected period.",
    ],
    cta: "Read your Rasi Palan → link in bio · astrosivam.com/rasipalan",
    hashtags: [
      "#AstroSivam",
      "#RasiPalan",
      "#Rasipalan",
      "#MoonSign",
      "#Rashifal",
      "#DailyRasiPalan",
      "#DailyHoroscope",
      "#WeeklyHoroscope",
      "#MonthlyHoroscope",
      "#YearlyHoroscope",
      "#TamilAstrology",
      "#VedicAstrology",
      "#Jyotish",
      "#Rasi",
      "#AstroSivamOfficial",
    ],
    extendedHashtags: [
      "#AstroSivamRasiPalan",
      "#RasiPalanToday",
      "#MoonSignAstrology",
      "#VedicHoroscope",
      "#HoroscopeToday",
      "#DailyAstrology",
      "#WeeklyRasiPalan",
      "#MonthlyRasiPalan",
      "#YearlyRasiPalan",
      "#TamilHoroscope",
      "#RasiPhal",
      "#IndianAstrology",
      "#AstrologyGuidance",
      "#AstrologyOnline",
      "#AstroSivamOfficial",
    ],
    firstComment:
      "Which timeframe do you check most — Daily, Weekly, Monthly or Yearly? Read your Moon sign at astrosivam.com/rasipalan. 🌙",
  },
  carousel: {
    title: "How to read Rasi Palan on Astro Sivam",
    slides: [
      {
        kicker: "Start here",
        headline: "Choose your Moon sign.",
        body: "Rasi Palan is organised by rasi, from Aries through Pisces. Tap your sign rather than reading a generic feed for everyone.",
      },
      {
        kicker: "Timeframe",
        headline: "Daily to yearly, in four views.",
        body: "Switch between Daily, Weekly, Monthly and Yearly to choose the length of guidance you want to read.",
      },
      {
        kicker: "Quick summary",
        headline: "A five-star period snapshot.",
        body: "Every sign card begins with a star summary for the selected period, so you can scan the twelve signs before opening one.",
      },
      {
        kicker: "Context",
        headline: "Read the label, not only the stars.",
        body: "Labels such as Normal period, Care needed and Extra caution add context to the summary. They describe the selected period, not a permanent fate.",
      },
      {
        kicker: "Focus",
        headline: "See the area being highlighted.",
        body: "Cards can highlight Money & Wealth, Career & Business, Love & Relations or Travel for the sign and timeframe selected.",
      },
      {
        kicker: "Current reading",
        headline: "Open the live palan.",
        body: "For the current wording, choose your sign and period at astrosivam.com/rasipalan. Do not reuse an old rating for a new date.",
      },
    ],
  },
  reel: {
    title: "Find your Rasi Palan in four taps",
    hook: "Daily, weekly, monthly or yearly — where do you read your Moon sign's palan?",
    duration: "20–25 seconds",
    beats: [
      "0–4s: Show the four period tabs and ask which timeframe the viewer uses.",
      "4–10s: Scroll the twelve Moon-sign cards without reading a prediction aloud.",
      "10–17s: Point to the star summary, period label and highlight on one card.",
      "17–23s: Tap Read full palan, then show the public /rasipalan address.",
    ],
    onScreen: ["Choose a period", "Choose your Moon sign", "Read the summary", "Open the full palan"],
    cta: "Read the current Rasi Palan — link in bio.",
    audio: "Light tanpura with a clean screen-recorded walkthrough. No alarm sounds or fear-based music.",
  },
  stories: [
    {
      title: "Which timeframe?",
      body: "Daily, Weekly, Monthly and Yearly Rasi Palan are all on the same public page.",
      sticker: "Poll — Daily / Weekly",
    },
    {
      title: "Choose your rasi",
      body: "All twelve Moon signs are listed. Your card shows the current summary and focus highlight.",
      sticker: "Question box — What is your Moon sign?",
    },
    {
      title: "Read the full palan",
      body: "Open the live page for the current period and wording instead of relying on an old screenshot.",
      sticker: "Link sticker → astrosivam.com/rasipalan",
    },
  ],
  bestTime: { fb: "Daily · 6:30–8:00 AM IST", ig: "Daily · 6:30–8:00 AM IST" },
  kpi: "Rasi Palan link clicks, return visits and saves on period explainers",
};
