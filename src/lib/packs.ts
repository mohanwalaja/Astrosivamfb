import { BRAND, BOILERPLATES, SAY_THIS, STYLES, STYLE_MAP, STYLE_TAG_SETS, VOICE_PRINCIPLES } from "../data/brand";
import { CALENDAR, CALENDAR_WEEKS, PILLARS } from "../data/calendar";
import {
  FB_ABOUT,
  FB_ADS,
  FB_BIO_OPTIONS,
  FB_COMPLIANCE,
  FB_FAQS,
  FB_MESSENGER,
  FB_PAGE_FIELDS,
  FB_PINNED_POST,
  FB_REVIEW_TEMPLATES,
} from "../data/facebook";
import { FORMATS, FORMAT_MAP } from "../data/formats";
import { FESTIVALS, type Festival } from "../data/festivals";
import {
  HASHTAG_MISTAKES,
  HASHTAG_RULES,
  buildMix,
  type MixKind,
} from "../data/hashtags";
import {
  IG_ALT_TEXT_RULES,
  IG_BIO_OPTIONS,
  IG_CADENCE,
  IG_DM_KEYWORDS,
  IG_GRID,
  IG_GROWTH_ACTIONS,
  IG_HIGHLIGHTS,
  IG_LINK_STACK,
  IG_NAME_OPTIONS,
  IG_REEL_FORMATS,
  IG_STORY_IDEAS,
  IG_TIMES,
} from "../data/instagram";
import { KPI_TARGETS, LAUNCH_CHECKLIST, NEVER_DO, QUOTES, REVIEWS, VERIFIED_FACTS } from "../data/launch";
import { SERVICES, getService } from "../data/services";
import type { CreativeContent, DisplayFontKey, DownloadFile, ScriptFontKey, Service, StyleKey, ThemeKey } from "../types";
import { canvasToBytes, canvasToBytesAndRelease, exportFileName } from "./export";
import { CARD_FORMATS, renderFestivalCard, type BrandLockupSettings, type CardFormat, type CardLanguage, type FestivalStyle, type LogoPlacement, type PictureSettings } from "./festivalCreative";
import { captionWarnings, festivalArt, festivalCaptions, festivalCopy, festivalDateView, skinFor, type FestivalDateView } from "./festivalKit";
import { defaultContent, renderCreative } from "./templates";

/**
 * The one pack module.
 *
 * Three pack builders used to live side by side — copy packs (`pack.ts`),
 * ZIP file packs for the creative formats (`packBuilder.ts`) and festival
 * packs (`festivalPack.ts`) — and Export Center had to know all three.
 * Everything that assembles a downloadable pack now lives here:
 *
 *  - copy:      captions, service markdown, CSVs, the full pack markdown
 *  - creative:  brand pack, per-service pack, text pack (ZIP file lists)
 *  - festival:  one festival in every format, or the whole festival year
 *
 * Builders return file lists; saving the ZIP stays with the caller
 * (`downloadZip` / `buildZip` in `./export`).
 */

/* ================================ copy packs ================================ */

export function fbCaption(service: Service): string {
  return [
    service.fb.hook,
    "",
    ...service.fb.body.flatMap((paragraph) => [paragraph, ""]),
    ...service.fb.bullets.map((bullet) => `• ${bullet}`),
    "",
    service.fb.cta,
    "",
    service.fb.hashtags.join(" "),
  ].join("\n");
}

export function igCaption(service: Service, withHashtags = true): string {
  return [
    service.ig.hook,
    "",
    ...service.ig.body.flatMap((paragraph) => [paragraph, ""]),
    service.ig.cta,
    ...(withHashtags ? ["", service.ig.hashtags.join(" ")] : []),
  ].join("\n");
}

export function fullIgCaption(service: Service): string {
  return [igCaption(service, false), "", [...service.ig.hashtags, ...service.ig.extendedHashtags].join(" ")].join("\n");
}

export function serviceMarkdown(service: Service): string {
  const lines: string[] = [];
  lines.push(`## ${service.name} — ${service.tamilName}`);
  lines.push("");
  lines.push(`**Badge:** ${service.badge} · **Price:** ${service.price} · **Link:** ${service.url}`);
  lines.push("");
  lines.push(`**Promise:** ${service.promise}`);
  lines.push("");
  lines.push(`**Best time:** Facebook ${service.bestTime.fb} · Instagram ${service.bestTime.ig}`);
  lines.push("");
  lines.push("### Facebook caption");
  lines.push("");
  lines.push("```text");
  lines.push(fbCaption(service));
  lines.push("```");
  lines.push("");
  lines.push("### Instagram caption (recommended 15 hashtags)");
  lines.push("");
  lines.push("```text");
  lines.push(igCaption(service));
  lines.push("```");
  lines.push("");
  lines.push("### Instagram first comment");
  lines.push("");
  lines.push(service.ig.firstComment);
  lines.push("");
  lines.push("### Hashtag sets");
  lines.push("");
  (["instagram", "niche", "full", "reel", "facebook", "story"] as MixKind[]).forEach((kind) => {
    lines.push(`- **${kind}:** ${buildMix(service, kind).join(" ")}`);
  });
  lines.push("");
  lines.push("### Carousel — " + service.carousel.title);
  lines.push("");
  service.carousel.slides.forEach((slide, index) => {
    lines.push(`${index + 1}. **${slide.headline}** _(${slide.kicker})_ — ${slide.body}`);
  });
  lines.push("");
  lines.push("### Reel script — " + service.reel.title);
  lines.push("");
  lines.push(`**Hook:** ${service.reel.hook}`);
  lines.push("");
  lines.push(`**Duration:** ${service.reel.duration}`);
  lines.push("");
  service.reel.beats.forEach((beat) => lines.push(`- ${beat}`));
  lines.push("");
  lines.push(`**On-screen text:** ${service.reel.onScreen.join(" · ")}`);
  lines.push("");
  lines.push(`**CTA:** ${service.reel.cta}`);
  lines.push("");
  lines.push(`**Audio:** ${service.reel.audio}`);
  lines.push("");
  lines.push("### Story frames");
  lines.push("");
  service.stories.forEach((story, index) => {
    lines.push(`${index + 1}. **${story.title}** — ${story.body} _(${story.sticker})_`);
  });
  lines.push("");
  lines.push("### Alt text");
  lines.push("");
  lines.push(service.altText);
  lines.push("");
  lines.push("### Art direction (for a photographer or image model)");
  lines.push("");
  lines.push(service.artDirection);
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

export function calendarCsv(): string {
  const escape = (value: string | number | null) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ["Day", "Platform", "Pillar", "Format", "Title", "Hook", "Service", "Asset", "Best time (IST)"];
  const rows = CALENDAR.map((entry) => [
    entry.day,
    entry.platform,
    entry.pillar,
    entry.format,
    entry.title,
    entry.hook,
    entry.serviceId ? getService(entry.serviceId).name : "Brand",
    entry.asset,
    entry.bestTime,
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export function assetsCsv(): string {
  const header = ["Format", "Platform", "Width", "Height", "Ratio", "Group", "Usage"];
  const rows = FORMATS.map((format) => [
    format.label,
    format.platform,
    format.width,
    format.height,
    format.ratio,
    format.group,
    format.usage,
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function hashtagMarkdown(): string {
  const lines: string[] = ["## Hashtag system", ""];
  HASHTAG_RULES.forEach((rule) => {
    lines.push(`- **${rule.platform} (${rule.count})** — ${rule.detail}`);
  });
  lines.push("");
  lines.push("### Sets by service");
  lines.push("");
  SERVICES.forEach((service) => {
    lines.push(`#### ${service.name}`);
    lines.push("");
    (["instagram", "niche", "full", "reel", "facebook", "story"] as MixKind[]).forEach((kind) => {
      lines.push(`- **${kind}:** ${buildMix(service, kind).join(" ")}`);
    });
    lines.push("");
  });
  lines.push("### Avoid");
  lines.push("");
  HASHTAG_MISTAKES.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  return lines.join("\n");
}

export function facebookMarkdown(): string {
  const lines = ["## Facebook page setup", ""];
  lines.push("### Fields");
  lines.push("");
  FB_PAGE_FIELDS.forEach((field) => lines.push(`- **${field.field}:** ${field.value} — _${field.note}_`));
  lines.push("");
  lines.push("### Bio");
  lines.push("");
  FB_BIO_OPTIONS.forEach((bio) => {
    lines.push(`**${bio.label}**`);
    lines.push("");
    lines.push(bio.text);
    lines.push("");
  });
  lines.push("### About");
  lines.push("");
  FB_ABOUT.forEach((paragraph) => {
    lines.push(paragraph);
    lines.push("");
  });
  lines.push("### Pinned post");
  lines.push("");
  lines.push(`${getService(FB_PINNED_POST.serviceId).name} — ${FB_PINNED_POST.reason}`);
  lines.push("");
  lines.push("### Messenger");
  lines.push("");
  lines.push(`**Greeting:** ${FB_MESSENGER.greeting}`);
  lines.push("");
  lines.push(`**Away:** ${FB_MESSENGER.away}`);
  lines.push("");
  FB_MESSENGER.instantReplies.forEach((reply) => lines.push(`- **${reply.label}:** ${reply.reply}`));
  lines.push("");
  lines.push("### FAQs");
  lines.push("");
  FB_FAQS.forEach((faq) => {
    lines.push(`**${faq.question}**`);
    lines.push("");
    lines.push(faq.answer);
    lines.push("");
  });
  lines.push("### Review replies");
  lines.push("");
  FB_REVIEW_TEMPLATES.forEach((template) => {
    lines.push(`**${template.scenario}**`);
    lines.push("");
    lines.push(template.reply);
    lines.push("");
  });
  lines.push("### Boost plan");
  lines.push("");
  FB_ADS.forEach((ad) => {
    lines.push(`**${ad.name}** — ${ad.objective} · ${ad.budget}`);
    lines.push("");
    lines.push(`Audience: ${ad.audience}`);
    lines.push("");
    lines.push(`Creative: ${ad.creative}`);
    lines.push("");
    lines.push(`Guardrail: ${ad.guardrail}`);
    lines.push("");
  });
  lines.push("### Compliance");
  lines.push("");
  FB_COMPLIANCE.forEach((rule) => lines.push(`- **${rule.title}:** ${rule.body}`));
  lines.push("");
  return lines.join("\n");
}

export function instagramMarkdown(): string {
  const lines = ["## Instagram suite", ""];
  lines.push("### Name field");
  lines.push("");
  IG_NAME_OPTIONS.forEach((option) => lines.push(`- **${option.text}** (${option.chars} chars) — ${option.note}`));
  lines.push("");
  lines.push("### Bio");
  lines.push("");
  IG_BIO_OPTIONS.forEach((bio) => {
    lines.push(`**${bio.label}** (${bio.text.length} chars)`);
    lines.push("");
    lines.push(bio.text);
    lines.push("");
  });
  lines.push("### Link in bio");
  lines.push("");
  IG_LINK_STACK.forEach((link) => lines.push(`- [${link.label}](${link.url}) — ${link.note}`));
  lines.push("");
  lines.push("### Highlights");
  lines.push("");
  IG_HIGHLIGHTS.forEach((highlight) => {
    lines.push(`**${highlight.label}** — ${highlight.purpose}`);
    highlight.stories.forEach((story) => lines.push(`  - ${story}`));
    lines.push("");
  });
  lines.push("### Grid plan");
  lines.push("");
  IG_GRID.forEach((slot, index) => {
    lines.push(`${index + 1}. ${getService(slot.serviceId).name} · ${slot.type} — ${slot.caption}`);
  });
  lines.push("");
  lines.push("### DM keywords");
  lines.push("");
  IG_DM_KEYWORDS.forEach((dm) => {
    lines.push(`**${dm.keyword}** (${dm.intent})`);
    lines.push("");
    lines.push(dm.reply);
    lines.push("");
  });
  lines.push("### Reel formats");
  lines.push("");
  IG_REEL_FORMATS.forEach((format) => {
    lines.push(`**${format.title}** — ${format.hook}`);
    lines.push("");
    lines.push(`${format.structure} _${format.use}_`);
    lines.push("");
  });
  lines.push("### Weekly cadence");
  lines.push("");
  IG_CADENCE.forEach((day) => lines.push(`- **${day.day}:** ${day.feed} · Stories: ${day.stories} · Reels: ${day.reel}`));
  lines.push("");
  lines.push("### Best times (IST)");
  lines.push("");
  IG_TIMES.forEach((time) => lines.push(`- **${time.slot}** — ${time.audience} · ${time.best} _${time.note}_`));
  lines.push("");
  lines.push("### Story ideas");
  lines.push("");
  IG_STORY_IDEAS.forEach((idea) => lines.push(`- ${idea}`));
  lines.push("");
  lines.push("### Growth actions");
  lines.push("");
  IG_GROWTH_ACTIONS.forEach((action) => lines.push(`- ${action}`));
  lines.push("");
  lines.push("### Alt text");
  lines.push("");
  IG_ALT_TEXT_RULES.forEach((rule) => lines.push(`- ${rule}`));
  lines.push("");
  return lines.join("\n");
}

export function calendarMarkdown(): string {
  const lines = ["## 30-day content calendar", ""];
  CALENDAR_WEEKS.forEach((week) => {
    lines.push(`### Week ${week.week} — ${week.title}`);
    lines.push("");
    lines.push(week.focus);
    lines.push("");
    CALENDAR.filter((entry) => Math.ceil(entry.day / 7) === week.week).forEach((entry) => {
      lines.push(
        `- **Day ${entry.day} · ${entry.platform} · ${entry.pillar}** — ${entry.title} (${entry.format}) · ${entry.bestTime}`,
      );
      lines.push(`  - Hook: ${entry.hook}`);
    });
    lines.push("");
  });
  lines.push("### Pillar mix");
  lines.push("");
  PILLARS.forEach((pillar) => lines.push(`- **${pillar.name} (${pillar.share})** — ${pillar.detail}`));
  lines.push("");
  return lines.join("\n");
}

export function fullPackMarkdown(): string {
  const lines: string[] = [];
  lines.push(`# ${BRAND.name} — Official Facebook & Instagram Suite`);
  lines.push("");
  lines.push(`Prepared for [${BRAND.website}](${BRAND.url}) · version 2.0`);
  lines.push("");
  lines.push("## Contents");
  lines.push("");
  lines.push("1. Brand system");
  lines.push("2. Verified facts");
  lines.push("3. Service post systems");
  lines.push("4. Facebook page setup");
  lines.push("5. Instagram suite");
  lines.push("6. 30-day calendar");
  lines.push("7. Hashtag system");
  lines.push("7b. Design styles & style tags");
  lines.push("8. Launch checklist");
  lines.push("9. Creative export manifest");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Brand system");
  lines.push("");
  lines.push(`**Positioning:** ${BRAND.tagline}`);
  lines.push("");
  lines.push(`**Handle:** ${BRAND.handle} (verify availability before claiming)`);
  lines.push("");
  lines.push("### Voice");
  lines.push("");
  VOICE_PRINCIPLES.forEach((principle) => lines.push(`- **${principle.title}** — ${principle.body}`));
  lines.push("");
  lines.push("### Say / never say");
  lines.push("");
  SAY_THIS.forEach((item) => {
    lines.push(`- Say: ${item.say}`);
    lines.push(`  - Never: ${item.not}`);
  });
  lines.push("");
  lines.push("### Boilerplates");
  lines.push("");
  BOILERPLATES.forEach((item) => {
    lines.push(`**${item.label}**`);
    lines.push("");
    lines.push(item.text);
    lines.push("");
  });
  lines.push("### Quotes");
  lines.push("");
  QUOTES.forEach((quote) => lines.push(`- “${quote.text.replace(/\n/g, " ")}” — ${quote.attribution}`));
  lines.push("");
  lines.push("### Customer review template — replace with a permissioned source before publishing");
  lines.push("");
  REVIEWS.forEach((review) => {
    lines.push(`- “${review.quote}” — ${review.name}, ${review.place} _(${review.service})_`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Verified facts");
  lines.push("");
  VERIFIED_FACTS.forEach((fact) => lines.push(`- **${fact.label}:** ${fact.value}`));
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("# Service post systems");
  lines.push("");
  SERVICES.forEach((service) => lines.push(serviceMarkdown(service)));
  lines.push("---");
  lines.push("");
  lines.push(facebookMarkdown());
  lines.push("---");
  lines.push("");
  lines.push(instagramMarkdown());
  lines.push("---");
  lines.push("");
  lines.push(calendarMarkdown());
  lines.push("---");
  lines.push("");
  lines.push(hashtagMarkdown());
  lines.push("---");
  lines.push("");
  lines.push("## Design styles");
  lines.push("");
  lines.push("Twelve art directions share one copy contract — six heritage, six modern. Signature Gold stays on identity assets; the other eleven rotate across feed posts.");
  lines.push("");
  lines.push("| Style | Family | Palette | Best for |");
  lines.push("| --- | --- | --- | --- |");
  STYLES.forEach((style) => {
    lines.push(`| ${style.name} | ${style.family} | ${STYLE_MAP[style.key].paletteName} | ${style.bestFor} |`);
  });
  lines.push("");
  lines.push("### Style tag sets");
  lines.push("");
  STYLES.forEach((style) => {
    lines.push(`**${style.name}** — ${STYLE_TAG_SETS[style.key].join(" ")}`);
    lines.push("");
  });
  lines.push("Pick two tags from the style set, then trim the service set so the post stays inside the platform limit.");
  lines.push("");
  lines.push("## Launch checklist");
  lines.push("");
  LAUNCH_CHECKLIST.forEach((item) => lines.push(`- [ ] ${item.label} _(${item.group})_`));
  lines.push("");
  lines.push("## KPI targets");
  lines.push("");
  KPI_TARGETS.forEach((kpi) =>
    lines.push(`- **${kpi.horizon}:** ${kpi.reach} reach · ${kpi.followers} · ${kpi.saves} · ${kpi.orders} · ${kpi.health}`),
  );
  lines.push("");
  lines.push("## Guardrails");
  lines.push("");
  NEVER_DO.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  lines.push("## Creative export manifest");
  lines.push("");
  lines.push("| Format | Platform | Pixels | Ratio | Usage |");
  lines.push("| --- | --- | --- | --- | --- |");
  FORMATS.forEach((format) => {
    lines.push(`| ${format.label} | ${format.platform} | ${format.width}×${format.height} | ${format.ratio} | ${format.usage} |`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`Prepared for ${BRAND.name} · ${BRAND.website}`);
  lines.push("");
  return lines.join("\n");
}

/* =============================== creative packs ============================== */

/** The brand pack's fixed contents, in ZIP order. */
export const BRAND_FORMAT_IDS = ["fb-profile", "ig-profile", "fb-cover", "fb-cover-statement", "link-card", "style-sheet"];
/** The service pack's fixed contents, in ZIP order. */
export const SERVICE_FORMAT_IDS = [
  "fb-post",
  "ig-post",
  "ig-square",
  "fb-story",
  "ig-story",
  "ig-reel-cover",
  "panchangam-card",
  "quote-card",
  "offer-card",
  "review-card",
];

const encoder = new TextEncoder();

/* ------------------------------ file naming ------------------------------- */
/*
 * Every image name carries the format id as well as its pixels. Sizes alone are
 * ambiguous — fb-post/ig-square are both 1200x1500, and ig-story, fb-story and
 * ig-reel-cover are all 1080x1920 — so a size-only name put two or three files
 * under the same name in one ZIP and extractors silently kept the first.
 */

export const brandImageFileName = (formatId: string): string => {
  const format = FORMAT_MAP[formatId];
  return `${exportFileName([format.label, formatId])}_${format.width}x${format.height}.png`;
};

export const highlightFileName = (index: number): string => {
  const format = FORMAT_MAP["ig-highlights"];
  const highlight = IG_HIGHLIGHTS[index];
  return `instagram_highlight_${exportFileName([highlight.label], String(index + 1))}_${format.width}x${format.height}.png`;
};

export const serviceImageFileName = (service: Service, formatId: string): string => {
  const format = FORMAT_MAP[formatId];
  return `${exportFileName([service.shortName, formatId])}_${format.width}x${format.height}.png`;
};

export const carouselFileName = (index: number): string => {
  const format = FORMAT_MAP["ig-carousel"];
  return `carousel_${String(index + 1).padStart(2, "0")}_${format.width}x${format.height}.png`;
};

const bytesFor = async (formatId: string, options: {
  themeKey: ThemeKey;
  style?: StyleKey;
  service: Service;
  content?: CreativeContent;
  slideIndex?: number;
  highlightIndex?: number;
}) => {
  const format = FORMAT_MAP[formatId];
  const canvas = await renderCreative({
    format,
    themeKey: options.themeKey,
    style: options.style,
    service: options.service,
    content: options.content ?? defaultContent(format, options.service),
    scale: 1,
    slideIndex: options.slideIndex,
    highlightIndex: options.highlightIndex,
  });
  return { format, bytes: await canvasToBytesAndRelease(canvas) };
};

export async function brandPackFiles(
  onProgress?: (done: number, total: number) => void,
): Promise<{ files: DownloadFile[]; total: number }> {
  const total = BRAND_FORMAT_IDS.length + IG_HIGHLIGHTS.length + 1;
  const files: DownloadFile[] = [];
  const service = getService("jathagam");

  for (const id of BRAND_FORMAT_IDS) {
    const { bytes } = await bytesFor(id, { themeKey: service.theme, service });
    files.push({ name: brandImageFileName(id), data: bytes });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  for (let index = 0; index < IG_HIGHLIGHTS.length; index += 1) {
    const highlight = IG_HIGHLIGHTS[index];
    const { bytes } = await bytesFor("ig-highlights", {
      themeKey: highlight.theme,
      service,
      highlightIndex: index,
    });
    files.push({ name: highlightFileName(index), data: bytes });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  files.push({
    name: "READ-ME.txt",
    data: encoder.encode(
      [
        "ASTRO SIVAM — BRAND PACK",
        "=========================",
        `Generated ${new Date().toISOString()}`,
        "",
        "Contents",
        "• Facebook profile photo — 1080×1080",
        "• Instagram profile photo — 1080×1080",
        "• Facebook cover (lockup) — 1640×624",
        "• Facebook cover (statement) — 1640×624",
        "• Link share card — 1200×630",
        "• Twelve-style contact sheet",
        "• Seven Instagram highlight covers — 1080×1080",
        "",
        "Upload notes",
        "1. Facebook cover: keep the mark and wordmark inside the central 820×312 area.",
        "2. Profile photos are square; both platforms crop them to a circle.",
        "3. Highlight covers are symbol-only — Instagram renders the label itself.",
        "4. Do not recolour, outline or rotate the logo.",
        "",
        "Palette: #05070E · #0D1930 · #C9962C · #D9AE5F · #F3DCA9 · #F8F2E5",
        "Type: Cinzel (display) · Plus Jakarta Sans (UI) · Tiro Tamil (Tamil)",
        "",
        "astrosivam.com",
      ].join("\n"),
    ),
  });
  onProgress?.(files.length, total);

  return { files, total };
}

export async function servicePackFiles(
  service: Service,
  themeKey: ThemeKey,
  content?: CreativeContent,
  onProgress?: (done: number, total: number) => void,
  style?: StyleKey,
): Promise<{ files: DownloadFile[]; total: number }> {
  const slides = service.carousel.slides.length;
  const total = SERVICE_FORMAT_IDS.length + slides + 2;
  const files: DownloadFile[] = [];

  for (const id of SERVICE_FORMAT_IDS) {
    const { bytes } = await bytesFor(id, {
      themeKey,
      style,
      service,
      content: content && id === "ig-post" ? content : undefined,
    });
    files.push({ name: serviceImageFileName(service, id), data: bytes });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  for (let index = 0; index < slides; index += 1) {
    const format = FORMAT_MAP["ig-carousel"];
    const canvas = await renderCreative({
      format,
      themeKey,
      style,
      service,
      content: defaultContent(format, service),
      scale: 1,
      slideIndex: index,
    });
    files.push({ name: carouselFileName(index), data: await canvasToBytesAndRelease(canvas) });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  files.push({ name: "COPY.md", data: encoder.encode(serviceMarkdown(service)) });
  files.push({ name: "instagram-caption.txt", data: encoder.encode(fullIgCaption(service)) });
  onProgress?.(files.length, total);

  return { files, total };
}

export function textPackFiles(): DownloadFile[] {
  return [
    { name: "astrosivam-social-suite.md", data: encoder.encode(fullPackMarkdown()) },
    { name: "service-captions.txt", data: encoder.encode(igCaption(getService("jathagam"))) },
  ];
}

export const PACK_SUMMARY = {
  brand: BRAND_FORMAT_IDS.length + IG_HIGHLIGHTS.length + 1,
  service: SERVICE_FORMAT_IDS.length + 7 + 2,
};

/* =============================== festival packs ============================== */

export interface FestivalPackConfig {
  style: FestivalStyle;
  language: CardLanguage;
  format: CardFormat;
  /** null = use the style's own palette seeded by the festival. */
  theme: ThemeKey | null;
  display: DisplayFontKey | null;
  script: ScriptFontKey | null;
  logo: LogoPlacement | null;
  brandLockup?: BrandLockupSettings;
  /** A user-uploaded data URL; overrides the bundled deity art. */
  artOverride: string | null;
  pictureSettings?: PictureSettings;
  year: number | "next";
}

export const DEFAULT_PACK: FestivalPackConfig = {
  style: "traditional",
  language: "en",
  format: "ig-post",
  theme: null,
  display: null,
  script: null,
  logo: null,
  artOverride: null,
  year: "next",
};

function packTheme(festival: Festival, config: FestivalPackConfig, format: CardFormat): ThemeKey {
  const skin = skinFor(config.style, festival, format);
  return config.theme ?? skin.theme;
}

export function captionFileText(festival: Festival, date: FestivalDateView, page: { facebook: string; instagram: string }): string {
  return [
    `${festival.name} · ${festival.tamil} · ${festival.hindi}`,
    `Verified date: ${date.label ?? "not on file"}${date.confidence ? ` (${date.confidence})` : ""}`,
    `Traditional: ${festival.when}`,
    "",
    "FACEBOOK",
    page.facebook,
    "",
    "INSTAGRAM",
    page.instagram,
    "",
    "TAMIL WISH",
    festival.wish.ta,
    "",
    "HINDI WISH",
    festival.wish.hi,
    "",
    "HASHTAGS",
    festival.hashtags.join(" "),
  ].join("\n");
}

export async function festivalPackFiles(
  festival: Festival,
  config: FestivalPackConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<{ files: DownloadFile[]; warnings: string[] }> {
  const date = festivalDateView(festival.id, config.year === "next" ? undefined : config.year);
  const copy = festivalCopy(festival, date);
  const skin = skinFor(config.style, festival, config.format);
  const files: DownloadFile[] = [];
  const warnings: string[] = [];

  for (const [index, format] of CARD_FORMATS.entries()) {
    const out = await renderFestivalCard({
      style: config.style,
      format: format.key,
      theme: packTheme(festival, config, format.key),
      display: config.display ?? skin.display,
      script: config.script ?? skin.script,
      logo: config.logo ?? skinFor(config.style, festival, format.key).logo,
      brandLockup: config.brandLockup,
      language: config.language,
      copy,
      art: config.artOverride ?? festivalArt(festival),
      pictureSettings: config.pictureSettings,
    });
    warnings.push(...out.warnings);
    files.push({
      name: `${exportFileName([festival.name, config.style])}_${format.width}x${format.height}.png`,
      data: await canvasToBytesAndRelease(out.canvas),
    });
    onProgress?.(index + 1, CARD_FORMATS.length + 1);
  }

  const captions = festivalCaptions(festival, {
    date,
    language: config.language,
    dateLine: date.label ?? festival.when,
  });
  warnings.push(...captionWarnings(captions));
  files.push({
    name: "CAPTIONS.txt",
    data: new TextEncoder().encode(captionFileText(festival, date, captions)),
  });
  // The last step still reports, so the progress bar reaches 100% instead of stopping at 4/5.
  onProgress?.(files.length, CARD_FORMATS.length + 1);
  return { files, warnings };
}

/** One card per festival, for the year pack. */
export async function festivalYearFiles(
  config: FestivalPackConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<{ files: DownloadFile[]; warnings: string[]; undated: string[] }> {
  const files: DownloadFile[] = [];
  const warnings: string[] = [];
  const undated: string[] = [];

  for (const [index, festival] of FESTIVALS.entries()) {
    const date = festivalDateView(festival.id, config.year === "next" ? undefined : config.year);
    if (!date.label) undated.push(festival.name);
    const copy = festivalCopy(festival, date);
    const skin = skinFor(config.style, festival, "ig-post");
    const out = await renderFestivalCard({
      style: config.style,
      format: "ig-post",
      theme: config.theme ?? skin.theme,
      display: config.display ?? skin.display,
      script: config.script ?? skin.script,
      logo: config.logo ?? skin.logo,
      brandLockup: config.brandLockup,
      language: config.language,
      copy,
      art: festivalArt(festival),
    });
    warnings.push(...out.warnings);
    files.push({
      name: `${String(index + 1).padStart(2, "0")}_${exportFileName([festival.id, festival.name])}.png`,
      data: await canvasToBytesAndRelease(out.canvas),
    });
    onProgress?.(index + 1, FESTIVALS.length + 1);
  }

  const calendar = [
    "# Astro Sivam — festival wishes",
    "",
    `Style: ${config.style} · Language: ${config.language}`,
    "Dates come from the verified calendar only; anything without one says so.",
    "",
    ...FESTIVALS.map((festival) => {
      const date = festivalDateView(festival.id, config.year === "next" ? undefined : config.year);
      const when = date.label
        ? `${date.label}${date.confidence === "provisional" ? " (provisional — confirm on the panchang)" : ""}`
        : `No civil date on file — ${festival.when}`;
      return `## ${festival.name}\n\n${when}\n\n${festival.wish.en}\n\nTags: ${festival.hashtags.join(" ")}\n`;
    }),
  ].join("\n");
  files.push({ name: "FESTIVAL-CALENDAR.md", data: new TextEncoder().encode(calendar) });
  onProgress?.(files.length, FESTIVALS.length + 1);
  return { files, warnings, undated };
}
