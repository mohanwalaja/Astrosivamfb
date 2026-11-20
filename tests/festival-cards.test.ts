import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { FESTIVALS, getFestival } from "../src/data/festivals.ts";
import { FESTIVAL_DATES, DATE_COVERAGE } from "../src/data/festivalDates.ts";
import {
  DEFAULT_PACK,
  captionFileText,
  festivalPackFiles,
} from "../src/lib/packs.ts";
import {
  CAPTION_LIMITS,
  captionWarnings,
  englishGreeting,
  festivalCaptions,
  festivalCopy,
  festivalDateView,
  festivalYears,
  isUndated,
  skinFor,
} from "../src/lib/festivalKit.ts";
import {
  CARD_FORMATS,
  CARD_STYLES,
  CARD_STYLE_MAP,
  type CardFormat,
  type FestivalStyle,
} from "../src/lib/festivalCreative.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE = readFileSync(join(ROOT, "src/lib/festivalCreative.ts"), "utf8");

const STYLES: FestivalStyle[] = CARD_STYLES.map((s) => s.key);

/* ------------------------------- the library ------------------------------ */

test("every festival carries a name and a greeting in all three languages", () => {
  for (const festival of FESTIVALS) {
    for (const field of [festival.name, festival.tamil, festival.hindi] as const) {
      assert.ok(field.trim().length > 2, `${festival.id} is missing a name`);
    }
    for (const field of [festival.greetingTa, festival.greetingHi] as const) {
      assert.ok(field.trim().length > 3, `${festival.id} is missing a greeting`);
      assert.doesNotMatch(field, /\?{2,}|TODO|lorem/i, `${festival.id} has placeholder copy`);
    }
    assert.ok(englishGreeting(festival).trim().length > 2, `${festival.id} has no English greeting`);
    assert.ok(englishGreeting(festival).length <= 46, `${festival.id} English greeting is too long to lead`);
    assert.ok(festival.hashtags.length >= 4, `${festival.id} needs a usable tag set`);
  }
});

/* -------------------------------- the dates ------------------------------- */

test("dates exist only for known festivals, once per year, in ISO form", () => {
  const ids = new Set(FESTIVALS.map((festival) => festival.id));
  const seen = new Map<string, string>();
  for (const entry of FESTIVAL_DATES) {
    assert.ok(ids.has(entry.festivalId), `${entry.festivalId} is not in the festival library`);
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `${entry.festivalId} has a malformed date`);
    assert.ok(["confirmed", "provisional"].includes(entry.confidence), `${entry.festivalId} has no confidence`);
    // A festival can legitimately fall twice in one Gregorian year (Arudra
    // Darshan lands in early January and again in late December), but the same
    // day must never be written twice.
    const key = `${entry.festivalId}:${entry.date}`;
    assert.ok(!seen.has(key), `${key} is duplicated in the calendar`);
    seen.set(key, entry.date);
  }
  assert.ok(DATE_COVERAGE.years.length >= 2, "the calendar should cover more than one year");
  assert.ok(DATE_COVERAGE.provisional > 0, "provisional dates must stay visible, not be relabelled");
});

test("a festival with no stored date renders without inventing one", () => {
  // Chithirai Thiruvizha 2026 is deliberately left dateless: the calendars
  // disagree on the event day, so the library stores no row for that year.
  assert.equal(isUndated("chithirai", 2026), true);
  assert.equal(isUndated("chithirai", 2027), false);
  const festival = getFestival("chithirai");
  const view = festivalDateView(festival.id, 2026);
  assert.equal(view.label, null);
  assert.equal(view.confidence, null);
  const copy = festivalCopy(festival, view);
  assert.equal(copy.dateLabel, null);
  assert.equal(copy.traditional, festival.when);
});

test("undated renders print the rule, never a date", async () => {
  const env = await import("../tools/canvas-env.mjs").catch(() => null);
  if (!env) return;
  env.installCanvasEnv();
  const { renderFestivalCard } = await import("../src/lib/festivalCreative.ts");
  const festival = getFestival("chithirai");
  const view = festivalDateView(festival.id, 2026);
  assert.equal(view.label, null);
  for (const style of STYLES) {
    const skin = skinFor(style, festival, "ig-square");
    const out = await renderFestivalCard({
      style,
      format: "ig-square",
      theme: skin.theme,
      display: skin.display,
      script: skin.script,
      logo: skin.logo,
      language: "trilingual",
      copy: festivalCopy(festival, view),
      art: null,
      scale: 0.2,
    });
    const text = out.typography.map((entry) => entry.text).join(" ");
    assert.match(text, /DATE AWAITS THE PANCHANG/, `${style} must say the date is not settled`);
    assert.doesNotMatch(text, /\b20\d\d\b/, `${style} printed a year it does not have`);
  }
});

test("a stored date is printed exactly as the calendar formats it", () => {
  const view = festivalDateView("deepavali", 2026);
  assert.ok(view.label, "Deepavali 2026 is on file");
  assert.equal(view.confidence, "confirmed");
  assert.equal(view.label, "Sunday, 8 November 2026");
  assert.deepEqual(festivalYears("deepavali").sort(), [2026, 2027]);
});

/* ------------------------------- the styles ------------------------------- */

test("the four families are four compositions, not four tints", () => {
  assert.deepEqual(CARD_STYLES.map((style) => style.key), STYLES);
  for (const style of STYLES) {
    const fnName = style.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    assert.match(SOURCE, new RegExp(`function ${fnName}\\(scene: Scene\\)`), `${style} needs its own painter`);
  }
  const palettes = new Set(CARD_STYLES.map((style) => style.defaultTheme));
  const displays = new Set(CARD_STYLES.map((style) => style.defaultDisplay));
  const logos = new Set(CARD_STYLES.map((style) => style.defaultLogo));
  assert.ok(palettes.size >= 3, "each family should open with a different palette");
  assert.ok(displays.size >= 3, "each family should open with a different display face");
  assert.ok(logos.size >= 3, "logo placement belongs to the composition");
  for (const style of CARD_STYLES) assert.ok(style.purpose.length > 30, `${style.key} needs an honest purpose`);
});

test("every format adapts, and stories reserve their chrome", () => {
  assert.deepEqual(
    CARD_FORMATS.map((format) => `${format.width}x${format.height}`),
    ["1080x1350", "1080x1080", "1080x1920", "1200x1500"],
  );
  const story = CARD_FORMATS.find((format) => format.key === "ig-story");
  assert.ok(story?.uiZones && story.uiZones.top > 200 && story.uiZones.bottom > 300);
  for (const format of CARD_FORMATS) {
    assert.ok(format.mobileWidth >= 320, `${format.key} needs a real mobile width`);
    assert.ok(format.cropNote.length > 20, `${format.key} needs a crop note`);
  }
});

/* ------------------------------- the captions ----------------------------- */

test("Facebook and Instagram are written, not cloned", () => {
  const festival = getFestival("deepavali");
  const date = festivalDateView(festival.id, 2026);
  const captions = festivalCaptions(festival, { date, dateLine: date.label ?? festival.when });

  assert.notEqual(captions.facebook, captions.instagram);
  assert.ok(captions.instagram.length <= CAPTION_LIMITS.instagram);
  assert.ok(captions.facebook.length <= CAPTION_LIMITS.facebook);
  assert.ok(captions.facebook.length > captions.instagram.length * 0.8, "Facebook should carry the full wish");
  assert.doesNotMatch(captions.instagram, /தமிழ் · /, "the English caption stays English-only");
  assert.doesNotMatch(captions.instagram, /हिंदी · /, "the English caption stays English-only");
  assert.match(captions.instagram, /Save this/);
  assert.doesNotMatch(captions.facebook, /✨/, "the Instagram hook is not a Facebook line");

  const tagsOf = (text: string) => (text.match(/#[\p{L}\w]+/gu) ?? []).length;
  assert.ok(tagsOf(captions.instagram) > tagsOf(captions.facebook), "Instagram carries the larger tag set");
  assert.ok(tagsOf(captions.instagram) <= 30, "Instagram allows at most 30 tags");

  assert.deepEqual(captionWarnings(captions), []);
  assert.ok(captions.instagram.includes("Sunday, 8 November 2026"), "the verified date must reach the caption");
});

test("Tamil and Hindi captions keep their own greeting", () => {
  const festival = getFestival("deepavali");
  const date = festivalDateView(festival.id, 2026);
  const tamil = festivalCaptions(festival, { date, language: "ta", dateLine: date.label ?? festival.when });
  const hindi = festivalCaptions(festival, { date, language: "hi", dateLine: date.label ?? festival.when });
  assert.match(tamil.instagram, /தமிழ் · /);
  assert.match(hindi.instagram, /हिंदी · /);
});

test("a provisional date is labelled provisional in the caption", () => {
  const festival = getFestival("panguni-uthiram");
  const date = festivalDateView(festival.id, 2026);
  assert.equal(date.confidence, "provisional");
  const captions = festivalCaptions(festival, { date, dateLine: date.label ?? festival.when });
  assert.match(captions.facebook, /provisional/i);
  assert.match(captions.instagram, /provisional/i);
});

test("the caption file names the date source and keeps the languages apart", () => {
  const festival = getFestival("pongal");
  const date = festivalDateView(festival.id, 2026);
  const text = captionFileText(festival, date, { facebook: "FB", instagram: "IG" });
  assert.match(text, /Verified date: /);
  assert.match(text, /FACEBOOK\nFB/);
  assert.match(text, /INSTAGRAM\nIG/);
  assert.match(text, /TAMIL WISH/);
  assert.match(text, /HINDI WISH/);
});

/* -------------------------- render and audit for real --------------------- */

test("every style renders every format, legibly and without missing glyphs", async (t) => {
  let env: { installCanvasEnv: () => void } | null = null;
  try {
    env = await import("../tools/canvas-env.mjs");
  } catch {
    t.skip("canvas shim not installed");
    return;
  }
  env.installCanvasEnv();
  const { renderFestivalCard } = await import("../src/lib/festivalCreative.ts");
  const { auditLegibility } = await import("../src/lib/legibility.ts");

  let rendered = 0;
  for (const festivalId of ["deepavali", "pongal", "chithirai"]) {
    const festival = getFestival(festivalId);
    const date = festivalDateView(festival.id, 2026);
    const copy = festivalCopy(festival, date);
    for (const style of CARD_STYLES) {
      for (const format of CARD_FORMATS) {
        const skin = skinFor(style.key, festival, format.key);
        const out = await renderFestivalCard({
          style: style.key,
          format: format.key,
          theme: skin.theme,
          display: skin.display,
          script: skin.script,
          logo: skin.logo,
          language: "trilingual",
          copy,
          art: festival.deity ? `/deities/${festival.deity}.jpg` : null,
          scale: 0.25,
        });
        const label = `${festival.id}/${style.key}/${format.key}`;
        assert.equal(out.canvas.width, Math.round(format.width * 0.25), `${label} rendered at the wrong width`);
        assert.equal(out.canvas.height, Math.round(format.height * 0.25), `${label} rendered at the wrong height`);
        const audit = auditLegibility(out.typography, format.auditWidth, format.mobileWidth);
        assert.ok(
          audit.passes,
          `${label}: ${audit.failing.map((finding) => `${finding.role} ${finding.effective}<${finding.minimum}`).join(", ")}`,
        );
        assert.ok(audit.smallestHeadline >= 16, `${label} headline is too small on a phone`);
        assert.deepEqual(out.warnings, [], `${label} reported a script problem`);
        rendered += 1;
      }
    }
  }
  assert.equal(rendered, 3 * STYLES.length * CARD_FORMATS.length);
});

test("logo placement is honoured, including the absence of a logo", async (t) => {
  let env: { installCanvasEnv: () => void } | null = null;
  try {
    env = await import("../tools/canvas-env.mjs");
  } catch {
    t.skip("canvas shim not installed");
    return;
  }
  env.installCanvasEnv();
  const { renderFestivalCard } = await import("../src/lib/festivalCreative.ts");
  const festival = getFestival("deepavali");
  const copy = festivalCopy(festival, festivalDateView(festival.id, 2026));
  const render = (logo: "plaque" | "wordmark" | "corner" | "none") =>
    renderFestivalCard({
      style: "tanjore-heirloom",
      format: "ig-square",
      theme: "midnight",
      display: "cinzel",
      script: "classic",
      logo,
      language: "en",
      copy,
      art: null,
      scale: 0.2,
    });

  const withMark = await render("wordmark");
  const without = await render("none");
  const wordmark = withMark.typography.filter((entry) => entry.text === "ASTRO SIVAM");
  const removed = without.typography.filter((entry) => entry.text === "ASTRO SIVAM");
  assert.ok(wordmark.length >= 1, "the wordmark placement prints the name");
  assert.equal(removed.length, 0, "the none placement draws no logo");
  // The two cards must be different pixels, not just different metadata.
  const digest = (canvas: HTMLCanvasElement) => {
    const bytes = (canvas as unknown as { toBuffer: (type: string) => Uint8Array }).toBuffer("image/png");
    return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  };
  assert.notEqual(digest(withMark.canvas), digest(without.canvas));
});

test("festival wishes support service-header, custom and rotated wordmark arrangements", async (t) => {
  let env: { installCanvasEnv: () => void } | null = null;
  try {
    env = await import("../tools/canvas-env.mjs");
  } catch {
    t.skip("canvas shim not installed");
    return;
  }
  env.installCanvasEnv();
  const { renderFestivalCard } = await import("../src/lib/festivalCreative.ts");
  const festival = getFestival("arudra-darshan");
  const copy = festivalCopy(festival, festivalDateView(festival.id, 2026));
  const render = (logo: "service-top-right" | "custom", orientation: "horizontal" | "vertical" | "circular", customX = 86) =>
    renderFestivalCard({
      style: "tanjore-heirloom",
      format: "ig-post",
      theme: "midnight",
      display: "cinzel",
      script: "classic",
      logo,
      brandLockup: { orientation, markScale: 1.1, textScale: 1.15, offsetX: 0, offsetY: 0, customX, customY: 11, name: "ASTRO SIVAM" },
      language: "trilingual",
      copy,
      art: null,
      scale: 0.25,
    });
  const serviceHeader = await render("service-top-right", "horizontal");
  const customVertical = await render("custom", "vertical");
  const customCircular = await render("custom", "circular", 74);
  const digest = (canvas: HTMLCanvasElement) => {
    const bytes = (canvas as unknown as { toBuffer: (type: string) => Uint8Array }).toBuffer("image/png");
    return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  };
  assert.ok(serviceHeader.typography.some((entry) => entry.text === "ASTRO SIVAM"));
  assert.ok(customVertical.typography.some((entry) => entry.text === "ASTRO SIVAM"));
  assert.ok(customCircular.typography.some((entry) => entry.text === "ASTRO SIVAM"));
  assert.notEqual(digest(serviceHeader.canvas), digest(customVertical.canvas));
  assert.notEqual(digest(customVertical.canvas), digest(customCircular.canvas));
});

/* --------------------------------- the pack ------------------------------- */

test("a festival pack ships four formats plus captions", async (t) => {
  let env: { installCanvasEnv: () => void } | null = null;
  try {
    env = await import("../tools/canvas-env.mjs");
  } catch {
    t.skip("canvas shim not installed");
    return;
  }
  env.installCanvasEnv();
  const festival = getFestival("pongal");
  const { files } = await festivalPackFiles(festival, DEFAULT_PACK);
  assert.equal(files.length, CARD_FORMATS.length + 1);
  const pngs = files.filter((file) => file.name.endsWith(".png"));
  assert.equal(pngs.length, CARD_FORMATS.length);
  for (const png of pngs) assert.ok(png.data.length > 8_000, `${png.name} looks empty`);
  const captions = files.find((file) => file.name === "CAPTIONS.txt");
  assert.ok(captions);
  const text = new TextDecoder().decode(captions.data);
  assert.match(text, /FACEBOOK/);
  assert.match(text, /INSTAGRAM/);
  assert.match(text, /Verified date: /);
});

test("each style family is selectable per festival without breaking the others", () => {
  for (const festival of FESTIVALS.slice(0, 12)) {
    for (const style of STYLES) {
      const skin = skinFor(style, festival, "ig-post" as CardFormat);
      assert.ok(CARD_STYLE_MAP[style], `${style} is not registered`);
      assert.ok(skin.theme, `${festival.id}/${style} has no palette`);
      assert.ok(skin.logo, `${festival.id}/${style} has no logo placement`);
    }
  }
});
