import type { Faq } from "../types";

export const FB_PAGE_FIELDS = [
  { field: "Page name", value: "Astro Sivam | Vedic Astrology & Jathagam", note: "42 / 75 characters. Searchable service keyword after the brand." },
  { field: "Username", value: "@astrosivamofficial", note: "Claim on both platforms. Verify availability before publishing; alternates below." },
  { field: "Category", value: "Astrologist", note: "Add Astrology service and Spiritual consultant as secondary categories." },
  { field: "Website", value: "https://astrosivam.com", note: "Use the clean URL, no UTM on the profile field." },
  { field: "Location", value: "Walajapet, Ranipet District, Tamil Nadu, India", note: "Registered office per astrosivam.com/contact; reports are delivered online worldwide." },
  { field: "Hours", value: "Always open · replies as soon as possible", note: "The six-hour cadence is for report review; the live contact page does not promise a six-hour Messenger reply." },
  { field: "Price range", value: "US$5–10 · ₹470–940", note: "Paid reports as listed at astrosivam.com/services. Daily Panjangam is free; Rasi Palan is available to read online." },
  { field: "Languages", value: "English · தமிழ் · हिंदी", note: "Add in About and Services copy too." },
  { field: "CTA button", value: "Book Now → https://astrosivam.com", note: "One action. Never split between DM and website." },
];

export const FB_BIO_OPTIONS = [
  {
    label: "Primary — 200 characters",
    text: "Authentic Vedic astrology from Tamil Nadu temple priests. Birth Jathagam, Marriage Compatibility, Baby Naming & Subha Muhurtham. First order free. PDF in English, Tamil & Hindi. Order: astrosivam.com",
    note: "Fits Facebook's 255-character bio with room to spare.",
  },
  {
    label: "Method-first — 208 characters",
    text: "Lahiri sidereal charts, reviewed by an India-based priest team every 6 hours. Birth Jathagam, Marriage Compatibility, Baby Naming, Subha Muhurtham. First order free. 7 days of astrologer chat. astrosivam.com",
    note: "Use when the audience is comparison shopping against apps.",
  },
  {
    label: "Tamil + English — 188 characters",
    text: "துல்லிய லஹிரி ஜாதகம் 🪔 Birth Jathagam, 10-Porutham matching, Baby Naming & Subha Muhurtham by Tamil Nadu Vedic priests. Reports in தமிழ், English & हिंदी. First order FREE in Beta. astrosivam.com",
    note: "For campaigns targeting Tamil-speaking audiences.",
  },
  {
    label: "Free reading — Panjangam + Rasi Palan",
    text: "Daily Panjangam for any location, plus Daily, Weekly, Monthly & Yearly Rasi Palan for all 12 Moon signs. Personalised reports in English, Tamil & Hindi. First order free in Beta. astrosivam.com",
    note: "Use when the campaign leads with the two public reading pages rather than a paid report.",
  },
];

export const FB_ABOUT = [
  "Astro Sivam is an online Vedic astrology service built around one idea: a chart should be calculated properly and read by a person. Every report is cast in the sidereal zodiac using the Chitra Paksha Lahiri ayanamsa, then reviewed by our India-based team of Vedic scholars and South Indian temple priests in Tamil Nadu before it is emailed to you.",
  "Choose a Birth Jathagam for your full chart, Rasi and Navamsa diagrams, Vimshottari dasa timeline, Sade Sati status and remedies. Choose Marriage Compatibility for the ten classical poruthams, Rajju and Vedha checks, Kuja dosha balancing and Dasa Sandhi. Baby Naming gives your child's birth-star syllables, a curated name shortlist and a printable naming certificate. Subha Muhurtham returns six months of auspicious windows for eighteen ceremonies, with Nalla Neram and Rahu Kalam timings. Daily Panjangam is available for any location, and Rasi Palan offers Daily, Weekly, Monthly and Yearly readings for all 12 Moon signs.",
  "Reports are available in English, Tamil and Hindi, and include seven days of personal astrologer chat after delivery. Our priest team checks reports every six hours; once approved, your PDF and tax invoice are emailed to your registered address, with order history in the Customer Dashboard. Basic/Kids/Students, Marriage Compatibility and Baby Naming are US$5 · ₹470; Bhava/Varga and Subha Muhurtham are US$10 · ₹940. Your first order is free during the Beta — one per account, email address and IP address — later orders use the standard price, and 90% is refundable before approval.",
  "We do not sell fear. Difficult planetary periods are described as seasons, with the traditional pariharams that address them. Astrology is guidance, not a guarantee, and never a substitute for medical, legal or financial advice.",
];

export const FB_TABS = [
  { tab: "Home", action: "Cover + pinned Jathagam post + featured services.", note: "Default landing." },
  { tab: "About", action: "Long about copy, website, email, hours, languages.", note: "Keep the full four paragraphs." },
  { tab: "Services", action: "Four paid items with prices and links — Jathagam, Porutham, Baby Naming, Muhurtham.", note: "Add Daily Panjangam and Rasi Palan as public reading links. Paid prices are US$5–10 · ₹470–940 by plan." },
  { tab: "Reviews", action: "On. Ask for a review after every delivered report.", note: "Invite past customers to review; publish authentic feedback only with permission." },
  { tab: "Photos", action: "Brand pack cover, profile, carousel covers.", note: "Albums: Brand, Jathagam, Porutham, Panchangam." },
  { tab: "Reels", action: "Cross-post every Instagram reel.", note: "Native upload only, no watermark." },
];

export const FB_PINNED_POST = {
  serviceId: "jathagam",
  reason:
    "The flagship report carries the price, the method and the free offer in one post. Pin it until the first 100 orders, then rotate to the highest-performing carousel.",
  firstNine: [
    "Birth Jathagam — flagship (pinned)",
    "10 Poruthams carousel",
    "What each report costs — sample report",
    "Daily Panchangam card",
    "Rasi Palan — Daily, Weekly, Monthly & Yearly",
    "Baby Naming — birth-star syllables",
    "Subha Muhurtham — six-month calendar",
    "Permissioned customer review card",
    "Free first order — offer card",
  ],
};

export const FB_MESSENGER = {
  greeting:
    "Namaste 🙏 Welcome to Astro Sivam. Tell us what you need — Jathagam, Porutham, Baby Naming, Muhurtham, today's Panjangam or Rasi Palan — and we will send the right link.",
  away:
    "Thank you for writing. Our team will respond as soon as possible. Meanwhile you can read Panjangam or Rasi Palan, or order a report at astrosivam.com — your first order is free during Beta.",
  instantReplies: [
    { label: "Birth Jathagam", reply: "Order here: astrosivam.com/birth-jathagam — Basic US$5 · ₹470; Bhava/Varga US$10 · ₹940. First order FREE (Beta). Keep your date, exact time and place of birth ready." },
    { label: "Porutham matching", reply: "We need the same four details for both people: astrosivam.com/marriage-compatibility — US$5 · ₹470 for both charts, first order FREE (Beta)." },
    { label: "Baby Naming", reply: "Send the birth date, exact time and place — we calculate all four pada syllables: astrosivam.com/baby-naming (US$5 · ₹470, certificate included)." },
    { label: "Muhurtham dates", reply: "Tell us the ceremony and we will send six months of windows: astrosivam.com/muhurtham (US$10 · ₹940)." },
    { label: "Sample report", reply: "Open a full sample before paying: astrosivam.com/services — every order page has one." },
    { label: "Rasi Palan", reply: "Read Daily, Weekly, Monthly or Yearly Rasi Palan for any of the 12 Moon signs: astrosivam.com/rasipalan. Choose your sign and period for the current summary and full palan." },
  ],
};

export const FB_FAQS: Faq[] = [
  {
    question: "When and how will I receive my report?",
    quickReply: "Delivery time",
    answer:
      "Our India-based priest team checks reports every 6 hours. Once a report is reviewed and the administrator approves it, your official PDF report and tax invoice are emailed to your registered address. Order history and live delivery tracking are available in your Customer Dashboard.",
  },
  {
    question: "What birth details do you need?",
    quickReply: "Details needed",
    answer:
      "The person's name, date of birth, exact time of birth and birth place. Marriage Compatibility needs the same four details for both people. An accurate birth time and place improve the chart calculation.",
  },
  {
    question: "Which calculation system do you use?",
    quickReply: "Method",
    answer:
      "The sidereal zodiac with Chitra Paksha Lahiri ayanamsa — the South Indian temple standard. Reports can be prepared in English, Tamil or Hindi.",
  },
  {
    question: "Can I see the report before ordering?",
    quickReply: "Samples",
    answer:
      "Yes. Each service page has an 'Open sample PDF' option with a full example made from fixed sample details. No customer data is used in a sample.",
  },
  {
    question: "How much does a report cost?",
    quickReply: "Price",
    answer:
      "Basic/Kids/Students Jathagam, Marriage Compatibility and Baby Naming are US$5 · ₹470; Bhava/Varga Jathagam and Subha Muhurtham are US$10 · ₹940. Your first order is FREE during the Beta — one per account, email address and IP address — and later orders use these standard prices. Daily Panjangam is free; Rasi Palan is available to read online.",
  },
  {
    question: "Where can I read Rasi Palan?",
    quickReply: "Rasi Palan",
    answer:
      "Open astrosivam.com/rasipalan and choose Daily, Weekly, Monthly or Yearly, then select any of the 12 Moon signs. Your sign card shows the current star summary, period label and focus highlight, with an option to read the full palan.",
  },
  {
    question: "Which payments do you accept?",
    quickReply: "Payments",
    answer:
      "PayPal (VISA, Mastercard, American Express, Discover and more), credit or debit cards, and Google Pay / UPI for India. Available options are shown at checkout.",
  },
  {
    question: "What is the refund policy?",
    quickReply: "Refund",
    answer:
      "90% refund before the report is approved, processed within 3 working days to your original payment method. Once a personalised report has been approved and delivered, it cannot be refunded because it is prepared specifically for you.",
  },
  {
    question: "Is astrologer chat included?",
    quickReply: "Astrologer chat",
    answer:
      "Yes — every delivery includes 7 days of personal astrologer chat so you can ask follow-up questions about your report.",
  },
  {
    question: "How are birth details and analytics handled?",
    quickReply: "Privacy",
    answer:
      "Birth details are used to provide the requested calculation, report, support and order history; they are not included in analytics or advertising events. Optional GA4 and Meta Pixel require consent. An unfinished form may remain in this browser tab's session storage for up to 30 minutes. Read astrosivam.com/privacy-policy for the full policy.",
  },
];

export const FB_REVIEW_TEMPLATES = [
  {
    scenario: "Five-star review",
    reply:
      "Thank you for taking the time to write this 🙏 Our priest team will be glad to hear it. If anything in the report needs clarification, reply here within your 7-day chat window and we will help.",
  },
  {
    scenario: "Question inside a review",
    reply:
      "Thank you for the trust. We have sent you a DM with the specific answer so your birth details stay private. You can always reach us via astrosivam.com as well.",
  },
  {
    scenario: "Critical review about timing",
    reply:
      "We are sorry the delivery took longer than expected. Every report goes through a priest review before it is emailed, and occasionally that queue runs late. Please message us with your order email so we can locate it immediately.",
  },
  {
    scenario: "Disagreement with the reading",
    reply:
      "Thank you for the honest feedback. Astrology is interpretive, and we welcome the conversation. Our team has sent a note offering a follow-up chat within your 7-day window so you can discuss the specific chart with the astrologer.",
  },
];

export const FB_ADS = [
  {
    name: "Free first order — flagship",
    objective: "Messages or Website conversions",
    budget: "US$8–10 / day × 7 days",
    audience:
      "India metros + Tamil diaspora in Singapore, Malaysia, UAE, UK, US, Canada. Interests: Vedic astrology, jyotish, Tamil culture, Hindu festivals.",
    creative: "Offer card + Jathagam post. Lead with the free report, not the price.",
    guardrail:
      "Never imply the viewer has a bad chart or an urgent problem — Meta prohibits ads that assert personal attributes.",
  },
  {
    name: "Porutham — wedding season",
    objective: "Website traffic to marriage compatibility",
    budget: "US$10 / day from 45 days before wedding season",
    audience:
      "25–40, India + diaspora, interests: matrimony, Tamil wedding, jewellery, wedding photography. Exclude existing customers.",
    creative: "Rajju reel + Porutham carousel. Hook: 'A 9/10 match can still miss Rajju.'",
    guardrail: "No claims about guaranteeing a marriage or predicting a specific partner.",
  },
  {
    name: "Panchangam — reach & follows",
    objective: "Page follows / engagement",
    budget: "US$5 / day ongoing",
    audience:
      "Chennai + Tamil Nadu + Tamil diaspora, 28–60, interests: temples, bhakti, panchangam, festivals.",
    creative: "Daily panchangam card. CTA: follow for tomorrow's timings.",
    guardrail: "Keep the daily card factual — timings only, no fear framing.",
  },
  {
    name: "Rasi Palan — Moon-sign readers",
    objective: "Website traffic to Rasi Palan",
    budget: "US$5 / day × 7 days after an organic winner",
    audience:
      "Tamil Nadu + Tamil diaspora, interests: Vedic astrology, Moon sign, rashifal and Tamil astrology.",
    creative: "Four-timeframe explainer. CTA: choose a Moon sign and read the current full palan.",
    guardrail: "Do not turn one period's rating into an evergreen promise or use fear-based prediction copy.",
  },
];

export const FB_COMPLIANCE = [
  {
    title: "Personal-attribute rule",
    body:
      "Never write ad or boosted copy that asserts something about the viewer ('Your marriage is at risk', 'You are Sade Sati affected'). Speak about the service, and let the reader self-select.",
  },
  {
    title: "No guaranteed outcomes",
    body:
      "Avoid 'guaranteed marriage', '100% accurate', 'will remove your dosha'. Use 'traditional guidance', 'reviewed by our priest team', 'auspicious windows'.",
  },
  {
    title: "Not medical, legal or financial advice",
    body:
      "State this in About and in any health or career-related post. Astrology complements, never replaces, professional advice.",
  },
  {
    title: "Birth details are sensitive",
    body:
      "Never ask for date, time and place in a public comment. Move to DM or the website form and say why. Publish a short privacy note in About.",
  },
  {
    title: "Price and offer accuracy",
    body:
      "Keep prices identical everywhere: bio, About, posts, ads and website. Basic/Kids/Students, Marriage and Baby Naming are US$5 · ₹470; Bhava/Varga and Subha Muhurtham are US$10 · ₹940. The first free Beta order is limited to one per account, email address and IP address.",
  },
  {
    title: "Analytics and advertising need consent",
    body:
      "Optional visitor statistics, GA4 and Meta Pixel stay off until Accept all. Never send birth details or report contents in analytics or advertising events. Honour footer cookie settings and Reject all.",
  },
  {
    title: "Sample reports contain no customer data",
    body:
      "Confirm every sample PDF uses fixed sample details before sharing it in a post or a Messenger reply.",
  },
];

export const FB_CROSSPOST = [
  "Publish through Meta Business Suite so the same creative reaches both pages with separate captions.",
  "Facebook captions can be longer and more narrative; Instagram needs the hook in the first 125 characters.",
  "Put hashtags in the Instagram caption; use only 3–5 on Facebook.",
  "Never upload a file with a TikTok or CapCut watermark — re-export the reel natively.",
  "Share the Instagram reel to Facebook Reels, then add a Facebook-specific first line.",
  "Keep link-in-bio on Instagram and a direct link in the Facebook post — Facebook does not restrict links.",
];

export const FB_CHECKLIST = [
  { id: "fb-name", label: "Claim the page name and vanity username on both platforms", group: "Identity" },
  { id: "fb-category", label: "Set primary and secondary categories", group: "Identity" },
  { id: "fb-bio", label: "Paste the 200-character primary bio", group: "Identity" },
  { id: "fb-about", label: "Publish the four-paragraph About copy", group: "Identity" },
  { id: "fb-contact", label: "Add email, website, hours, languages, price range", group: "Identity" },
  { id: "fb-cta", label: "Set the Book Now button to astrosivam.com", group: "Conversion" },
  { id: "fb-services", label: "Add four paid services plus Panjangam and Rasi Palan links", group: "Conversion" },
  { id: "fb-profile", label: "Upload the 1080×1080 profile photo", group: "Creative" },
  { id: "fb-cover", label: "Upload the 1640×624 cover, check the mobile crop", group: "Creative" },
  { id: "fb-pinned", label: "Publish and pin the Birth Jathagam post", group: "Content" },
  { id: "fb-nine", label: "Queue the first nine posts from the plan", group: "Content" },
  { id: "fb-reviews", label: "Turn Reviews on and request reviews from past customers", group: "Trust" },
  { id: "fb-messenger", label: "Load the greeting, away message and every instant reply", group: "Trust" },
  { id: "fb-faqs", label: "Add every Messenger FAQ, including Rasi Palan and privacy", group: "Trust" },
  { id: "fb-compliance", label: "Add the astrology disclaimer and privacy note", group: "Trust" },
  { id: "fb-meta", label: "Connect Instagram to Meta Business Suite", group: "Growth" },
  { id: "fb-boost", label: "Launch the free-report boost at US$8–10/day", group: "Growth" },
];
