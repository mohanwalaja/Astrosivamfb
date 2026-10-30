import type { GridSlot, HighlightPlan } from "../types";

export const IG_BIO_OPTIONS = [
  {
    label: "Primary — services + proof",
    text: "Authentic Vedic astrology by Tamil Nadu temple priests 🪔 Jathagam · Porutham · Baby Naming · Muhurtham. First report free. PDF: EN / தமிழ் / हिंदी.",
    note: "All four services, the free offer and the languages inside Instagram's 150-character limit.",
  },
  {
    label: "Method-led — for a discerning audience",
    text: "Lahiri sidereal charts, reviewed by Tamil Nadu Vedic priests. Birth Jathagam · 10 Poruthams · Subha Muhurtham. First report free · 7 days of chat.",
    note: "Leads with the calculation method. Use if the audience already knows astrology.",
  },
  {
    label: "Tamil-first — for the diaspora",
    text: "துல்லிய லஹிரி ஜாதகம் 🪔 Birth Jathagam, 10 Poruthams, Baby Naming & Muhurtham by Tamil Nadu priests. First report free. PDF in தமிழ் / EN / हिंदी.",
    note: "Tamil first line, English keywords after — strong for Malaysia, Singapore and Gulf audiences.",
  },
];

export const IG_NAME_OPTIONS = [
  { text: "Astro Sivam | Vedic Jyotish", chars: 27, note: "Searchable keyword with the brand intact." },
  { text: "Astro Sivam | Vedic Astrology", chars: 29, note: "Closest to the 30-character limit." },
  { text: "Astro Sivam | Jathagam", chars: 22, note: "Only if jathagam is the single hero service." },
];

export const IG_LINK_STACK = [
  { label: "Birth Jathagam · US$5 · ₹470", url: "https://astrosivam.com/birth-jathagam", note: "Flagship. First link. 1st report FREE (Beta)." },
  {
    label: "Marriage Compatibility — 10 Poruthams",
    url: "https://astrosivam.com/marriage-compatibility",
    note: "Highest-intent service for families · US$5 · ₹470 for both charts.",
  },
  { label: "Baby Naming — Namakaranam · US$5 · ₹470", url: "https://astrosivam.com/baby-naming", note: "High-save content." },
  { label: "Subha Muhurtham — 6 months · US$10 · ₹940", url: "https://astrosivam.com/muhurtham", note: "Seasonal spikes." },
  { label: "Compare services, prices & samples", url: "https://astrosivam.com/services", note: "The trust link — every order page opens a full sample PDF." },
  { label: "Free Daily Panjangam", url: "https://astrosivam.com/panjangam", note: "The daily habit link — any location & timezone." },
];

export const IG_HIGHLIGHTS: HighlightPlan[] = [
  {
    id: "jathagam",
    label: "Jathagam",
    glyph: "jathagam",
    theme: "midnight",
    purpose: "What the flagship report contains and who it is for.",
    stories: [
      "What is inside the 2-page report — page-by-page screenshots.",
      "Why the exact birth minute changes the Lagna.",
      "Sample PDF link sticker + 'first report free'.",
    ],
  },
  {
    id: "porutham",
    label: "Porutham",
    glyph: "porutham",
    theme: "jade",
    purpose: "Matrimony education without fear — the ten checks in plain language.",
    stories: [
      "The ten poruthams in ten frames.",
      "Rajju and Vedha, explained in one frame each.",
      "Both-charts checklist: name, date, exact time, place.",
    ],
  },
  {
    id: "baby",
    label: "Baby Names",
    glyph: "namakaranam",
    theme: "ivory",
    purpose: "A gentle, saveable set for expecting parents.",
    stories: [
      "How the birth star gives the naming syllable.",
      "10 names with meanings that start with the syllable.",
      "Naming certificate preview + link.",
    ],
  },
  {
    id: "muhurtham",
    label: "Muhurtham",
    glyph: "muhurtham",
    theme: "saffron",
    purpose: "Planning content for weddings, housewarmings and new ventures.",
    stories: [
      "Four things checked before a Griha Pravesam date.",
      "This month's auspicious windows — teaser only.",
      "Six-month calendar walkthrough + link.",
    ],
  },
  {
    id: "panchangam",
    label: "Panjangam",
    glyph: "panchangam",
    theme: "lagoon",
    purpose: "The daily habit loop — every morning, free.",
    stories: [
      "Today's Rahu Kalam and Shubh Hora.",
      "How to read a panchangam in five lines.",
      "Weekly recap: festivals and vratas ahead.",
    ],
  },
  {
    id: "reviews",
    label: "Reviews",
    glyph: "star",
    theme: "obsidian",
    purpose: "Social proof and the delivery promise.",
    stories: [
      "Customer review screenshot and city, shared only with permission.",
      "Priest review process, six-hourly.",
      "Refund policy, written plainly.",
    ],
  },
  {
    id: "order",
    label: "Order",
    glyph: "chat",
    theme: "lunar",
    purpose: "Everything needed to buy with confidence.",
    stories: [
      "What details to keep ready — 4 fields.",
      "Payment methods: PayPal, cards, GPay/UPI.",
      "What happens after you order, in 4 steps.",
    ],
  },
];

export const IG_GRID: GridSlot[] = [
  {
    serviceId: "jathagam",
    theme: "midnight",
    type: "Carousel",
    caption: "Jathagam 101 — save this before you read another sun-sign post.",
  },
  {
    serviceId: "marriage",
    theme: "saffron",
    type: "Single",
    caption: "A 9/10 match can still miss Rajju. Here is what to check.",
  },
  {
    serviceId: "panchangam",
    theme: "ivory",
    type: "Single",
    caption: "Today's Panchangam — tithi, nakshatra, Rahu Kalam, free.",
  },
  {
    serviceId: "baby-naming",
    theme: "ivory",
    type: "Single",
    caption: "Your baby's first syllable is written in the sky.",
  },
  {
    serviceId: "transits",
    theme: "jade",
    type: "Reel",
    caption: "Sade Sati is a season, not a sentence. Here is the end date.",
  },
  {
    serviceId: "muhurtham",
    theme: "saffron",
    type: "Carousel",
    caption: "Find the date the sky agrees with — six months of windows.",
  },
  {
    serviceId: "trust",
    theme: "midnight",
    type: "Offer",
    caption: "First report free. Read a full sample before you pay anything.",
  },
  {
    serviceId: "jathagam",
    theme: "midnight",
    type: "Reel",
    caption: "3 things your Jathagam knows that a horoscope app does not.",
  },
  {
    serviceId: "trust",
    theme: "midnight",
    type: "Quote",
    caption: "“Ancient Jyotish. Ephemeris precision.” — the line we work by.",
  },
];

export const IG_DM_KEYWORDS = [
  {
    keyword: "JATHAGAM",
    intent: "Order the birth chart",
    reply:
      "Namaste 🙏 For your Birth Jathagam we need: name, date of birth, exact time of birth, and birth place. Order here — astrosivam.com/birth-jathagam (US$5 · ₹470). First report FREE (Beta). Your PDF arrives by email after priest review, with 7 days of chat.",
    link: "https://astrosivam.com/birth-jathagam",
  },
  {
    keyword: "PORUTHAM",
    intent: "Marriage matching",
    reply:
      "For the 10-Porutham report we need those four details for both people. We check Rajju, Vedha, Kuja dosha and Dasa Sandhi, then send one clear verdict. astrosivam.com/marriage-compatibility (US$5 · ₹470 for both charts).",
    link: "https://astrosivam.com/marriage-compatibility",
  },
  {
    keyword: "BABY",
    intent: "Baby naming",
    reply:
      "Congratulations 🌙 If you know the birth star, send it; if not, send the date, exact time and place and we will calculate all four pada syllables. Certificate included — astrosivam.com/baby-naming (US$5 · ₹470).",
    link: "https://astrosivam.com/baby-naming",
  },
  {
    keyword: "MUHURTHAM",
    intent: "Auspicious dates",
    reply:
      "Tell us which ceremony — wedding, Griha Pravesam, Bhoomi Pooja, business opening or Annaprasanam — and we will send six months of windows with Nalla Neram and Rahu Kalam — astrosivam.com/muhurtham (US$10 · ₹940).",
    link: "https://astrosivam.com/muhurtham",
  },
  {
    keyword: "SAMPLE",
    intent: "Trust / hesitation",
    reply:
      "Of course — open a complete sample PDF before you spend anything: astrosivam.com/services. Every service page has one, made with fixed sample details.",
    link: "https://astrosivam.com/services",
  },
  {
    keyword: "PRICE",
    intent: "Pricing question",
    reply:
      "Birth Jathagam, Porutham & Baby Naming: US$5 · ₹470 each · Subha Muhurtham: US$10 · ₹940. Your first report is FREE during the Beta, one per customer. 90% refund before approval. No subscription, no auto-renewal. 🪔",
    link: "https://astrosivam.com/services",
  },
  {
    keyword: "PANCHANGAM",
    intent: "Free daily habit",
    reply:
      "Today's Panjangam is free for any place and date: astrosivam.com/panjangam. Follow the page — we post the Chennai card every morning. 🌅",
    link: "https://astrosivam.com/panjangam",
  },
  {
    keyword: "SADE SATI",
    intent: "Transit worry",
    reply:
      "Sade Sati is a transit phase with a beginning and an end. A transit reading checks the stage against your own chart and gives you the date it lifts, plus traditional pariharams — astrosivam.com/birth-jathagam.",
    link: "https://astrosivam.com/birth-jathagam",
  },
];

export const IG_REEL_FORMATS = [
  {
    title: "Myth → correction",
    hook: "“A 9/10 match is a good match.” — Not if Rajju was skipped.",
    structure: "Claim (3s) → why it is incomplete (12s) → what to check instead (12s) → CTA (3s).",
    use: "Monthly, one per service.",
  },
  {
    title: "Read this before…",
    hook: "Before you book the movers, check these four things for your Griha Pravesam.",
    structure: "Checklist on screen, one item every 6 seconds, CTA at the end.",
    use: "Evergreen, high saves.",
  },
  {
    title: "Chart explainer",
    hook: "This square is your entire life. Let me show you how to read it.",
    structure: "Screen-recorded chart, slow zoom, one house per beat.",
    use: "Builds authority; 45–60 seconds.",
  },
  {
    title: "From the priest desk",
    hook: "This report arrived at 6 AM. Here is what our priest checks first.",
    structure: "B-roll of the desk, chart, lamp; voiceover explains the six-hourly review.",
    use: "Trust builder, 20 seconds.",
  },
  {
    title: "Comment reply",
    hook: "Someone asked why their rasi forecast never comes true. Here is the honest answer.",
    structure: "Read the comment, answer in three points, invite the next question.",
    use: "Weekly; drives comments.",
  },
  {
    title: "Festival / transit timing",
    hook: "Saturn changes sign this month. What that actually means for your rasi.",
    structure: "Context, one chart graphic, practical dates, CTA.",
    use: "Publish within 48 hours of the event.",
  },
];

export const IG_CADENCE = [
  { day: "Monday", feed: "Carousel — service deep dive", stories: "3 (poll + explainer + link)", reel: "—" },
  { day: "Tuesday", feed: "Single — service post", stories: "2 (question box)", reel: "1 — myth correction" },
  { day: "Wednesday", feed: "Daily Panchangam", stories: "3 (panchangam, quiz, link)", reel: "—" },
  { day: "Thursday", feed: "Carousel — second service", stories: "2 (review + link)", reel: "1 — comment reply" },
  { day: "Friday", feed: "Quote or review", stories: "2 (behind the scenes)", reel: "1 — read this before" },
  { day: "Saturday", feed: "Offer / free beta", stories: "2 (poll + countdown)", reel: "—" },
  { day: "Sunday", feed: "Panchangam weekly recap", stories: "2 (week ahead)", reel: "1 — festival/transit" },
];

export const IG_TIMES = [
  {
    slot: "6:30–7:30 AM IST",
    audience: "India morning routine",
    best: "Panchangam, Rahu Kalam, festival cards",
    note: "The daily habit slot. Consistency matters more than the exact minute.",
  },
  {
    slot: "11:00 AM–1:00 PM IST",
    audience: "India lunch · Gulf mid-morning",
    best: "Carousels, service education",
    note: "Good for saves during a work break.",
  },
  {
    slot: "7:30–9:30 PM IST",
    audience: "India evening · UK afternoon · Gulf evening",
    best: "Reels, offers, matrimony posts",
    note: "Highest engagement window for this niche.",
  },
  {
    slot: "9:00–11:00 PM IST",
    audience: "US East morning · Canada morning",
    best: "Reviews, stories, diaspora-facing Tamil posts",
    note: "Use 2× per week to reach the North American diaspora.",
  },
];

export const IG_STORY_IDEAS = [
  "Rahu Kalam check with a countdown sticker.",
  "This-or-that: Gana porutham vs Rajju porutham.",
  "Anonymous question box: 'What is worrying you about your chart?'",
  "Poll: Do you know your Lagna? Yes / No idea.",
  "Behind the desk: a chart being checked at 6 AM.",
  "Countdown to the next muhurtham window.",
  "Swipe-up sample PDF — no email required.",
  "Quiz: which zodiac is sidereal?",
];

export const IG_GROWTH_ACTIONS = [
  "Pin three posts: Jathagam (authority), Porutham (intent), Offer (conversion).",
  "Use Instagram Collab posts with Tamil wedding photographers, nadaswaram artists and baby boutiques — one per fortnight.",
  "Always geotag Tamil Nadu (Walajapet / Chennai), even when the audience is global.",
  "Reply to every comment within the first hour for the first 30 days.",
  "Launch #MySivamChart and repost one customer story per week (with consent).",
  "Cross-post every reel to Facebook Reels, but rewrite the caption for Facebook.",
  "Never buy followers or engagement — it destroys the account's reach baseline.",
  "Keep the link-in-bio set to the current campaign, not a permanent menu.",
];

export const IG_ALT_TEXT_RULES = [
  "Describe the chart or symbol, not the marketing line.",
  "Include the service name and 'Astro Sivam' once.",
  "Keep it under 125 characters — long alt text gets truncated by screen readers.",
  "Never repeat the caption verbatim; alt text is for people who cannot see the image.",
];
