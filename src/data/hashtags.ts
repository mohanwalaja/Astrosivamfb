import type { Service } from "../types";
import { SERVICES } from "./services";

export type HashtagTier = "Broad" | "Mid" | "Niche";
export type HashtagCategory =
  | "Branded"
  | "Service"
  | "Broad"
  | "Regional"
  | "Festival"
  | "Community";

export interface HashtagInfo {
  tag: string;
  category: HashtagCategory;
  tier: HashtagTier;
  services: string[];
}

const BRANDED = new Set([
  "#astrosivam",
  "#astrosivamofficial",
  "#astrosivamreports",
  "#astrosivamreviews",
  "#astrosivampanchangam",
  "#astrosivamsample",
  "#astrosivamtrust",
  "#mysisivamchart",
  "#sivamjyotish",
]);

const BROAD = new Set([
  "#astrology",
  "#vedicastrology",
  "#horoscope",
  "#jyotish",
  "#kundli",
  "#rashifal",
  "#indianastrology",
  "#astrologersofinstagram",
  "#astrologyforlife",
  "#vedicwisdom",
  "#astrologycommunity",
  "#astrologydaily",
  "#astrologyfacts",
  "#hinduastrology",
  "#astrologylovers",
  "#astrologyindia",
  "#onlineastrology",
  "#astrologyconsultation",
  "#astrologyreports",
  "#vedicpredictions",
  "#cosmicguidance",
  "#vediclife",
  "#astrodaily",
  "#astrologyupdate",
  "#astrologyforbabies",
  "#astrologyguidance",
  "#spiritualgrowth",
  "#manifestation",
  "#onlineastrologer",
  "#astrologyforall",
]);

const REGIONAL = new Set([
  "#tamil",
  "#tamilan",
  "#chennai",
  "#tamilnadu",
  "#southindianwedding",
  "#tamilwedding",
  "#tamilbaby",
  "#tamilmatrimony",
  "#tamilbride",
  "#tamilgroom",
  "#tamilcalendar",
  "#tamilastrology",
  "#chennaiastrology",
  "#chennaipanchangam",
  "#tamilpanchangam",
  "#tamilmuhurtham",
  "#tamilbaby",
  "#tamilbabyName",
  "#tamilbaby_name",
  "#tamilcommunity",
  "#tamilwomen",
  "#tamilculture",
  "#tamilheritage",
  "#tamildiaspora",
  "#chennaipriests",
  "#vedicpriests",
  "#vedicscholars",
  "#southindianastrology",
]);

const FESTIVAL = new Set([
  "#diwali",
  "#navratri",
  "#pongal",
  "#tamilnewyear",
  "#varalakshmi",
  "#sankranti",
  "#karthigai",
  "#aadi",
  "#panguni",
  "#chithirai",
  "#amavasya",
  "#pournami",
  "#pradosham",
  "#festivalcalendar",
]);

const COMMUNITY = new Set([
  "#askastrologer",
  "#learnastrology",
  "#jyotishlearning",
  "#astrologyfactsdaily",
  "#astrologyeducation",
  "#vedicastrologyclasses",
  "#horoscopequestions",
  "#astrologyqanda",
  "#astrologerscommunity",
  "#astrologyseeker",
]);

const curatedExtras = [
  "#MySivamChart",
  "#AstroSivamReports",
  "#AstroSivamReviews",
  "#SivamJyotish",
  "#Chennai",
  "#TamilNadu",
  "#TamilDiaspora",
  "#TamilCulture",
  "#TamilHeritage",
  "#SouthIndianAstrology",
  "#ASKastrologer",
  "#LearnAstrology",
  "#JyotishLearning",
  "#AstrologyFacts",
  "#VedicPriests",
  "#VedicScholars",
  "#Pongal",
  "#TamilNewYear",
  "#Navratri",
  "#Diwali",
  "#Karthigai",
  "#Pournami",
  "#Pradosham",
  "#Amavasya",
  "#Varalakshmi",
  "#Aadi",
];

function classify(tag: string): { category: HashtagCategory; tier: HashtagTier } {
  const lower = tag.toLowerCase();
  if (BRANDED.has(lower)) return { category: "Branded", tier: "Niche" };
  if (FESTIVAL.has(lower)) return { category: "Festival", tier: "Broad" };
  if (REGIONAL.has(lower)) return { category: "Regional", tier: "Mid" };
  if (COMMUNITY.has(lower)) return { category: "Community", tier: "Niche" };
  if (BROAD.has(lower)) return { category: "Broad", tier: "Broad" };
  return { category: "Service", tier: "Niche" };
}

function buildBank(): HashtagInfo[] {
  const map = new Map<string, HashtagInfo>();

  const add = (tag: string, services: string[]) => {
    const key = tag.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      if (!existing.services.includes(services[0])) existing.services.push(...services);
      return;
    }
    const { category, tier } = classify(tag);
    map.set(key, { tag, category, tier, services });
  };

  SERVICES.forEach((service) => {
    [...service.ig.hashtags, ...service.ig.extendedHashtags, ...service.fb.hashtags].forEach((tag) =>
      add(tag, [service.shortName]),
    );
  });

  curatedExtras.forEach((tag) => add(tag, ["Brand"]));

  return Array.from(map.values()).sort((a, b) => a.tag.localeCompare(b.tag));
}

export const HASHTAG_BANK = buildBank();

export const HASHTAG_CATEGORIES: HashtagCategory[] = [
  "Branded",
  "Service",
  "Broad",
  "Regional",
  "Festival",
  "Community",
];

export const HASHTAG_RULES = [
  {
    platform: "Instagram feed",
    count: "8–15",
    detail:
      "Instagram lets you use 30, but relevance beats volume. Lead with 2 branded tags, then service-specific, then a local tag. Keep the same set on the post, not scattered between caption and comment.",
  },
  {
    platform: "Instagram Reels",
    count: "5–8",
    detail:
      "Reels are discovered by content, not tags. Use 5–8 precise tags including one branded tag so saves can be traced back.",
  },
  {
    platform: "Instagram Stories",
    count: "1–3",
    detail:
      "Add a hashtag sticker for local discovery (#Chennai, #TamilAstrology) and one branded tag. Stories are for existing followers, not search.",
  },
  {
    platform: "Facebook",
    count: "3–5",
    detail:
      "Facebook hashtags do not drive distribution the way Instagram's do. Three to five are enough; more reads as spam and clutters a long caption.",
  },
  {
    platform: "Rotation",
    count: "2 sets / service",
    detail:
      "Each service ships with an A-set and a B-set. Alternate them post to post so the account never looks automated.",
  },
];

export const HASHTAG_MISTAKES = [
  "Do not use the same 30 tags on every post — vary by service and season.",
  "Avoid engagement-bait tags (#followforfollow, #likeforlike, #f4f, #l4l).",
  "Do not borrow unrelated mega tags (#instagood, #viral) — they dilute relevance.",
  "Never claim #official before the handle is actually reserved.",
  "Do not stack festival tags outside the festival window.",
  "Avoid repeating a tag more than once in the same caption.",
];

export const MIX_PRESETS = [
  { id: "instagram", label: "IG feed · 15", note: "Recommended balance" },
  { id: "niche", label: "IG niche · 12", note: "Highest intent" },
  { id: "full", label: "IG max · 30", note: "Only for pillar posts" },
  { id: "reel", label: "Reels · 8", note: "Precise + branded" },
  { id: "facebook", label: "Facebook · 5", note: "Clean, not spammy" },
  { id: "story", label: "Stories · 4", note: "Local discovery" },
] as const;

export type MixKind = (typeof MIX_PRESETS)[number]["id"];

const chunk = (arr: string[], count: number, offset = 0): string[] => {
  if (arr.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(arr[(i + offset) % arr.length]);
  }
  return out;
};

export function buildMix(service: Service, kind: MixKind, variant: 0 | 1 = 0): string[] {
  const branded = service.ig.hashtags.filter((tag) => /^#AstroSivam/i.test(tag));
  const serviceTags = service.ig.hashtags.filter((tag) => !/^#AstroSivam/i.test(tag));
  const extended = [...service.ig.extendedHashtags];
  const local = ["#Chennai", "#TamilAstrology", "#TamilNadu", "#VedicAstrology"];
  // the local/discovery tags are often already in a service's own set — never ship
  // the same tag twice, it wastes the caption budget and reads as a mistake
  const uniq = (tags: string[]) => [...new Set(tags)];

  switch (kind) {
    case "full":
      return uniq([...service.ig.hashtags, ...extended]).slice(0, 30);
    case "niche":
      return uniq([...branded.slice(0, 2), ...chunk(serviceTags, 10, variant)]);
    case "reel":
      return uniq([
        branded[0] ?? "#AstroSivam",
        ...chunk(serviceTags, 4, variant),
        "#VedicAstrology",
        local[variant],
      ]);
    case "facebook":
      return uniq([
        branded[0] ?? "#AstroSivam",
        ...service.fb.hashtags.filter((tag) => !/^#AstroSivam$/i.test(tag)).slice(0, 3),
        "#VedicAstrology",
      ]);
    case "story":
      return uniq([branded[0] ?? "#AstroSivam", "#Chennai", "#TamilAstrology", serviceTags[variant] ?? "#Jyotish"]);
    case "instagram":
    default:
      return uniq([
        ...branded.slice(0, 2),
        ...chunk(serviceTags, 11, variant),
        "#VedicAstrology",
        local[variant],
      ]).slice(0, 15);
  }
}

export const HASHTAG_TRACKING = [
  "Save the exact set used on each post in a spreadsheet — a column per post.",
  "Meta no longer reports hashtag reach. Track saves, follows and DM keywords instead.",
  "Test one variable at a time: set A vs set B for two weeks, then keep the winner.",
  "Retire festival tags the week after the festival ends.",
];
