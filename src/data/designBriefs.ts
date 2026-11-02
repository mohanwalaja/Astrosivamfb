import type { DisplayFontKey, StyleKey, ThemeKey } from "../types";

export type DesignCategory = "birth" | "wedding" | "baby" | "muhurtham" | "navagraha" | "festival" | "murugan";
export type CompositionKey = "hero" | "editorial" | "asymmetric" | "mandala" | "diagonal" | "cosmic" | "split" | "story" | "minimal" | "infographic" | "collage" | "devotional";
export type CompositionFamily = "immersive" | "editorial" | "geometric" | "narrative" | "information";

export interface CompositionMeta {
  key: CompositionKey;
  name: string;
  family: CompositionFamily;
  description: string;
  structure: string;
  imageRole: "bleed" | "plate" | "inset" | "cutout" | "none";
}

/** Twelve independently planned grids. Style and colour never select a grid. */
export const COMPOSITIONS: CompositionMeta[] = [
  { key: "hero", name: "Hero illustration", family: "immersive", description: "Artwork owns the canvas; a measured scrim protects a bottom-led headline.", structure: "Full-bleed art / bottom title / upper-right identity", imageRole: "bleed" },
  { key: "editorial", name: "Type-led editorial", family: "editorial", description: "Oversized typography leads an open page, with a small artwork colophon.", structure: "Large left title / lower-right art / generous negative space", imageRole: "inset" },
  { key: "asymmetric", name: "Luxury magazine", family: "editorial", description: "An off-centre art column meets an intentionally unequal text column.", structure: "Narrow left label / wide art / offset lower-right headline", imageRole: "plate" },
  { key: "mandala", name: "Celestial mandala", family: "geometric", description: "A circular artwork aperture and orbital linework organise the whole page.", structure: "Central circular art / upper title / radial service label", imageRole: "cutout" },
  { key: "diagonal", name: "Diagonal modern", family: "geometric", description: "Interlocking angled fields separate the message from the artwork.", structure: "Diagonal art field / opposing title / angled action", imageRole: "cutout" },
  { key: "cosmic", name: "Cosmic atlas", family: "immersive", description: "A dark celestial field, offset planetary artwork and an orbital reading path.", structure: "Upper-left title / lower-right planetary art / orbital background", imageRole: "plate" },
  { key: "split", name: "Gallery split", family: "geometric", description: "Two unequal fields give copy and artwork their own uninterrupted space.", structure: "Left copy / right art / independent identity and action", imageRole: "plate" },
  { key: "story", name: "Visual storytelling", family: "narrative", description: "A broad opening illustration leads to a quiet, book-like reading panel.", structure: "Wide illustrated opening / lower reading panel / numbered details", imageRole: "plate" },
  { key: "minimal", name: "Quiet luxury", family: "editorial", description: "A precise typographic interval and one small art object, without a frame.", structure: "Small centred art / spacious centred title / no border", imageRole: "inset" },
  { key: "infographic", name: "Service infographic", family: "information", description: "A compact visual anchor and three readable facts replace a decorative body block.", structure: "Art and title header / three fact rows / action rail", imageRole: "inset" },
  { key: "collage", name: "Artist's collage", family: "narrative", description: "Overlapping paper, artwork and type create a crafted editorial collage.", structure: "Offset paper layers / torn-edge artwork / overlapping title plate", imageRole: "cutout" },
  { key: "devotional", name: "Devotional cinema", family: "immersive", description: "A widescreen artwork aperture sits between a quiet invocation and a final action.", structure: "Top invocation / panoramic art / bottom title and action", imageRole: "plate" },
];
export const COMPOSITION_MAP = Object.fromEntries(COMPOSITIONS.map((item) => [item.key, item])) as Record<CompositionKey, CompositionMeta>;
export const isComposition = (key: string | undefined): key is CompositionKey => Boolean(key && key in COMPOSITION_MAP);

export interface DesignCopy {
  kicker: string;
  serviceTitle: string;
  headline: string;
  subline: string;
  cta: string;
  facts: string[];
}
export interface DesignOccasion {
  key: string;
  name: string;
  copy: DesignCopy;
  image?: string;
  motif: "chart" | "union" | "cradle" | "calendar" | "planets" | "lamps" | "harvest" | "vel" | "sun";
}
export interface DesignBrief {
  key: DesignCategory;
  name: string;
  shortName: string;
  serviceId: string;
  direction: string;
  image: string;
  imageAlt: string;
  theme: ThemeKey;
  style: StyleKey;
  display: DisplayFontKey;
  weights: Partial<Record<CompositionKey, number>>;
  occasions: DesignOccasion[];
}

export const DESIGN_BRIEFS: DesignBrief[] = [
  {
    key: "birth", name: "Birth Jathagam", shortName: "Birth chart", serviceId: "jathagam",
    direction: "Celestial diagrams, fine engraved lines and editorial clarity. The chart is the hero, never a decorative mandala.",
    image: "/art/birth-jathagam.jpg", imageAlt: "Gold geometric birth chart and zodiac orbits on midnight blue",
    theme: "midnight", style: "ephemeris", display: "cormorant",
    weights: { editorial: 10, cosmic: 10, asymmetric: 8, infographic: 8, split: 7, minimal: 6, mandala: 6, diagonal: 4 },
    occasions: [
      { key: "discover", name: "Discover your chart", motif: "chart", copy: { kicker: "A clearer view of you", serviceTitle: "Birth Jathagam", headline: "Your life, seen as a whole.", subline: "Your birth chart, planetary periods and life areas, carefully read by our astrologer team.", cta: "Explore your chart", facts: ["Rasi and Navamsa charts", "Vimshottari dasa timeline", "Personal astrologer chat"] } },
      { key: "family", name: "A reading for every age", motif: "chart", copy: { kicker: "From childhood to adulthood", serviceTitle: "Birth Jathagam", headline: "The right reading. At every age.", subline: "Gentle children's readings, student guidance and in-depth adult reports. Your birth date helps select the right plan.", cta: "Find your reading", facts: ["Children: gentle guidance", "Students: learning and focus", "Adults: Basic, Bhava and Varga"] } },
      { key: "precision", name: "Why birth time matters", motif: "chart", copy: { kicker: "Precision before interpretation", serviceTitle: "Your birth chart", headline: "A few minutes can change the picture.", subline: "Birth time and place shape your ascendant. We use sidereal calculations, then bring human insight to the reading.", cta: "Start your chart", facts: ["Date, time and place", "Chitra Paksha Lahiri", "Astrologer-reviewed report"] } },
    ],
  },
  {
    key: "wedding", name: "Wedding Matching", shortName: "Wedding", serviceId: "marriage",
    direction: "Complementary figures, jasmine, wine-red paper and refined romantic typography. A conversation, not a guarantee.",
    image: "/art/wedding-matching.jpg", imageAlt: "Elegant complementary wedding figures beneath a jasmine canopy",
    theme: "rose", style: "silk", display: "cormorant",
    weights: { asymmetric: 10, split: 10, story: 9, minimal: 8, editorial: 7, collage: 7, devotional: 5, hero: 4 },
    occasions: [
      { key: "matching", name: "Wedding compatibility", motif: "union", copy: { kicker: "Two stories. A shared future.", serviceTitle: "Wedding Matching", headline: "Look beyond a single score.", subline: "A thoughtful comparison of two birth charts, explained with context by an experienced astrologer.", cta: "Explore compatibility", facts: ["Traditional porutham factors", "Both charts in context", "Clear, personal guidance"] } },
      { key: "families", name: "For the families", motif: "union", copy: { kicker: "A conversation worth having", serviceTitle: "Marriage Porutham", headline: "Clarity for an important decision.", subline: "Understand the traditional matching factors together, with a readable report for both families.", cta: "Explore matching", facts: ["Share both birth details", "Receive a clear comparison", "Ask your questions afterwards"] } },
      { key: "anniversary", name: "A shared journey", motif: "union", copy: { kicker: "Celebrate your journey", serviceTitle: "Astro Sivam", headline: "Growing together. Understanding more.", subline: "May your shared journey be guided by patience, understanding and care.", cta: "astrosivam.com", facts: ["Understanding", "Companionship", "Shared growth"] } },
    ],
  },
  {
    key: "baby", name: "Baby Naming Letters", shortName: "Baby naming", serviceId: "baby-naming",
    direction: "Soft ivory, sage botanical forms, a protective cradle and elegant letter-led typography. Warm, never childish.",
    image: "/art/baby-naming.jpg", imageAlt: "Ivory cradle held by a gentle hand among sage botanical forms",
    theme: "ivory", style: "paper", display: "playfair",
    weights: { story: 10, minimal: 10, editorial: 9, split: 8, asymmetric: 7, infographic: 7, collage: 6, hero: 4 },
    occasions: [
      { key: "naming", name: "Naming ceremony", motif: "cradle", copy: { kicker: "A name to grow into", serviceTitle: "Baby Naming Letters", headline: "A beautiful beginning starts with a name.", subline: "Discover auspicious starting letters based on your baby's birth star, with guidance for your naming ceremony.", cta: "Find naming letters", facts: ["Birth-star calculation", "Suggested starting letters", "Naming ceremony guidance"] } },
      { key: "welcome", name: "Welcome, little one", motif: "cradle", copy: { kicker: "To the newest little star", serviceTitle: "A warm welcome", headline: "Small hands. Endless possibility.", subline: "Wishing your family a gentle beginning and a lifetime of wonderful discoveries.", cta: "astrosivam.com", facts: ["A joyful welcome", "A meaningful name", "A bright beginning"] } },
      { key: "guide", name: "How it works", motif: "cradle", copy: { kicker: "Simple, personal, considered", serviceTitle: "Naming guidance", headline: "From birth star to first letter.", subline: "Share the birth date, time and place. We calculate the naming letters and explain the traditional basis.", cta: "Find naming letters", facts: ["Enter birth details", "Review naming letters", "Choose a name you love"] } },
    ],
  },
  {
    key: "muhurtham", name: "Subha Muhurtham", shortName: "Muhurtham", serviceId: "muhurtham",
    direction: "Calendar folios, ceremonial geometry, banana leaf and brass. A clear purpose and date, not a wall of panchangam data.",
    image: "/art/subha-muhurtham.jpg", imageAlt: "Blank ceremonial calendar folio with banana leaves and a brass kalash",
    theme: "ivory", style: "kolam", display: "cinzel",
    weights: { infographic: 10, diagonal: 9, editorial: 8, split: 8, minimal: 7, asymmetric: 7, mandala: 5, story: 4 },
    occasions: [
      { key: "auspicious", name: "Find an auspicious time", motif: "calendar", copy: { kicker: "Begin with intention", serviceTitle: "Subha Muhurtham", headline: "Make room for an auspicious beginning.", subline: "Traditional time selection for your important occasion, considered alongside your purpose and birth details.", cta: "Plan your muhurtham", facts: ["Tell us your occasion", "Review suitable windows", "Receive clear guidance"] } },
      { key: "wedding-date", name: "Wedding date selection", motif: "calendar", copy: { kicker: "A considered beginning", serviceTitle: "Wedding Muhurtham", headline: "A date for your next chapter.", subline: "Explore traditional wedding time windows with a clear explanation of the factors behind each suggestion.", cta: "Explore wedding dates", facts: ["Purpose-led selection", "Traditional calculations", "Personal consultation"] } },
      { key: "new-home", name: "New home ceremony", motif: "calendar", copy: { kicker: "A home filled with promise", serviceTitle: "Griha Pravesam", headline: "A thoughtful start in a new home.", subline: "Choose a time for your housewarming ceremony with traditional guidance tailored to your family.", cta: "Plan your housewarming", facts: ["Your family's details", "Auspicious time windows", "Ceremony guidance"] } },
    ],
  },
  {
    key: "navagraha", name: "Navagraha", shortName: "Navagraha", serviceId: "transits",
    direction: "Nine planetary bodies, an engraved cosmic atlas and restrained light. Powerful celestial art without science-fiction glare.",
    image: "/art/navagraha.jpg", imageAlt: "Nine engraved planetary spheres on intersecting gold orbital paths",
    theme: "midnight", style: "orbit", display: "inter",
    weights: { cosmic: 10, hero: 9, mandala: 8, diagonal: 8, devotional: 7, infographic: 7, split: 5, editorial: 5 },
    occasions: [
      { key: "nine", name: "The nine grahas", motif: "planets", copy: { kicker: "A traditional celestial framework", serviceTitle: "Navagraha", headline: "Nine grahas. One connected sky.", subline: "Understand the traditional roles of the nine grahas and how they are interpreted in your birth chart.", cta: "Explore the nine grahas", facts: ["Sun, Moon and Mars", "Mercury, Jupiter, Venus", "Saturn, Rahu and Ketu"] } },
      { key: "transit", name: "Planetary transits", motif: "planets", copy: { kicker: "Context, not prediction", serviceTitle: "Planetary transits", headline: "See the movement behind the moment.", subline: "Read planetary movement alongside your own birth chart, with thoughtful context from an astrologer.", cta: "Explore transits", facts: ["Current planetary movement", "Your natal chart in context", "A considered interpretation"] } },
      { key: "saturn", name: "Understanding Saturn", motif: "planets", copy: { kicker: "Beyond the headlines", serviceTitle: "Sade Sati guidance", headline: "Understand Saturn without fear.", subline: "A measured look at Saturn's traditional significance, its timing and the context unique to your chart.", cta: "Understand Saturn", facts: ["Check the actual timing", "Understand the tradition", "Ask informed questions"] } },
    ],
  },
  {
    key: "festival", name: "Festival Greetings", shortName: "Festivals", serviceId: "trust",
    direction: "Occasion-specific illustration: lamps for Deepavali, harvest forms for Pongal, light for Karthigai. Never one generic holiday frame.",
    image: "/art/deepavali.jpg", imageAlt: "Brass Deepavali lamps and jasmine on a burgundy kolam",
    theme: "kumkum", style: "deepam", display: "playfair",
    weights: { hero: 10, devotional: 9, story: 8, collage: 8, mandala: 7, minimal: 7, asymmetric: 5, split: 4 },
    occasions: [
      { key: "deepavali", name: "Deepavali", motif: "lamps", image: "/art/deepavali.jpg", copy: { kicker: "The festival of lights", serviceTitle: "Deepavali greetings", headline: "May your home be filled with light.", subline: "Wishing you and your family warmth, togetherness and a bright new beginning.", cta: "Warm Deepavali wishes", facts: ["Light", "Togetherness", "New beginnings"] } },
      { key: "pongal", name: "Thai Pongal", motif: "harvest", image: "/art/pongal.jpg", copy: { kicker: "Gratitude for the harvest", serviceTitle: "Thai Pongal greetings", headline: "Abundance, shared with gratitude.", subline: "Celebrating the harvest, the sun and the hands that bring us together.", cta: "Warm Pongal wishes", facts: ["Harvest", "Gratitude", "Abundance"] } },
      { key: "karthigai", name: "Karthigai Deepam", motif: "lamps", image: "/art/karthigai.jpg", copy: { kicker: "A celebration of sacred light", serviceTitle: "Karthigai Deepam", headline: "Let a little light lead the way.", subline: "May the lamps of Karthigai bring warmth, clarity and peace to your home.", cta: "Warm Deepam wishes", facts: ["Clarity", "Warmth", "Peace"] } },
    ],
  },
  {
    key: "murugan", name: "Murugan Devotional", shortName: "Murugan", serviceId: "trust",
    direction: "Respectful Vel and peacock artwork, emerald depth and quiet devotion. No invented scripture or text inside the illustration.",
    image: "/art/murugan-devotional.jpg", imageAlt: "Respectful golden Vel and emerald peacock devotional illustration",
    theme: "jade", style: "signature", display: "cinzel",
    weights: { devotional: 10, hero: 10, mandala: 8, minimal: 8, asymmetric: 7, collage: 6, story: 5, split: 4 },
    occasions: [
      { key: "devotion", name: "A moment of devotion", motif: "vel", copy: { kicker: "Courage. Clarity. Devotion.", serviceTitle: "Lord Murugan", headline: "May your intention stay clear.", subline: "In quiet devotion, may you find the courage to take your next step with care.", cta: "Astro Sivam", facts: ["Clear intention", "Quiet courage", "Thoughtful action"] } },
      { key: "skanda", name: "Skanda Sashti", motif: "vel", copy: { kicker: "A day of sacred dedication", serviceTitle: "Skanda Sashti", headline: "Devotion in every thoughtful act.", subline: "Wishing you a peaceful Skanda Sashti, inspired by courage, discipline and compassion.", cta: "Warm devotional wishes", facts: ["Courage", "Discipline", "Compassion"] } },
      { key: "karthigai", name: "Karthigai Deepam", motif: "sun", image: "/art/karthigai.jpg", copy: { kicker: "The light within", serviceTitle: "Karthigai Deepam", headline: "A flame. A prayer. A new clarity.", subline: "May the sacred light of Karthigai guide your home with peace and devotion.", cta: "With reverence", facts: ["Sacred light", "Peace", "Devotion"] } },
    ],
  },
];
export const BRIEF_MAP = Object.fromEntries(DESIGN_BRIEFS.map((brief) => [brief.key, brief])) as Record<DesignCategory, DesignBrief>;
export const resolveCategory = (key: unknown): DesignCategory => typeof key === "string" && key in BRIEF_MAP ? key as DesignCategory : "birth";
export const getOccasion = (category: DesignCategory, key: string | undefined) => BRIEF_MAP[category].occasions.find((item) => item.key === key) ?? BRIEF_MAP[category].occasions[0];

export const STUDIO_PALETTES: Array<{ key: ThemeKey; name: string; colors: string[] }> = [
  { key: "midnight", name: "Midnight & gold", colors: ["#0D1930", "#D9AE5F", "#F8F2E4"] },
  { key: "ivory", name: "Ivory & ink", colors: ["#F9F3E7", "#A9721F", "#152036"] },
  { key: "jade", name: "Emerald & brass", colors: ["#0A2B21", "#D8B36A", "#F3F5EE"] },
  { key: "kumkum", name: "Deep red & gold", colors: ["#4C130D", "#F3B44F", "#FFF4E3"] },
  { key: "rose", name: "Rose & sandstone", colors: ["#F7E9E2", "#A85E48", "#352322"] },
  { key: "sand", name: "Paper & terracotta", colors: ["#FAF7F1", "#B4531F", "#302722"] },
];
