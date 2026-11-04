import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { IG_LAYOUTS, IG_LAYOUT_MAP, type IgLayout } from "../src/lib/igCreative.ts";
import { auditLegibility, LEGIBILITY_MINIMUMS, type TypedDraw } from "../src/lib/legibility.ts";
import { IG_COPY_ENTRIES, IG_HIGHLIGHT_COVERS, IG_REEL_ENTRIES, IG_STORY_ENTRIES } from "../src/data/igCopy.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const READ = (path: string) => readFileSync(join(ROOT, path), "utf8");
const SOURCE = READ("src/lib/igCreative.ts");

const EXPECTED: IgLayout[] = [
  "ig-service",
  "ig-education",
  "ig-quote",
  "ig-carousel-cover",
  "ig-story",
  "ig-reel-cover",
  "ig-highlight",
];

/* ------------------------------ the surfaces ------------------------------ */

test("the suite ships exactly the seven briefed Instagram surfaces", () => {
  assert.deepEqual(IG_LAYOUTS.map((layout) => layout.key).sort(), [...EXPECTED].sort());
  for (const key of EXPECTED) assert.ok(IG_LAYOUT_MAP[key], `${key} is missing from the layout map`);
});

test("every surface has its own painter, not a branch in a shared skeleton", () => {
  const names: Record<IgLayout, string> = {
    "ig-service": "igService",
    "ig-education": "igEducation",
    "ig-quote": "igQuote",
    "ig-carousel-cover": "igCarouselCover",
    "ig-story": "igStory",
    "ig-reel-cover": "igReelCover",
    "ig-highlight": "igHighlight",
  };
  for (const [key, fn] of Object.entries(names)) {
    assert.match(SOURCE, new RegExp(`function ${fn}\\(`), `${key} needs its own painter function`);
  }
  // The dispatcher is a map, so a new category cannot silently reuse a layout.
  assert.match(SOURCE, /const PAINTERS\s*:/);
});

test("the canvas sizes match the dimensions Meta accepts", () => {
  const sizes = Object.fromEntries(IG_LAYOUTS.map((layout) => [layout.key, `${layout.width}x${layout.height}`]));
  assert.equal(sizes["ig-service"], "1080x1350"); // feed portrait, 4:5
  assert.equal(sizes["ig-education"], "1080x1350");
  assert.equal(sizes["ig-quote"], "1080x1080"); // square plate
  assert.equal(sizes["ig-carousel-cover"], "1080x1350");
  assert.equal(sizes["ig-story"], "1080x1920"); // 9:16
  assert.equal(sizes["ig-reel-cover"], "1080x1920");
  assert.equal(sizes["ig-highlight"], "1080x1080"); // circular crop
});

test("safe zones follow Instagram's own chrome", () => {
  const story = IG_LAYOUT_MAP["ig-story"];
  assert.equal(story.uiZones?.top, 250);
  assert.equal(story.uiZones?.bottom, 340);
  assert.equal(story.safeArea?.y, 250);
  assert.equal(story.safeArea?.h, 1920 - 250 - 340, "the content band is what is left between the bars");
  assert.equal(story.crop, "rect");

  const reel = IG_LAYOUT_MAP["ig-reel-cover"];
  assert.equal(reel.crop, "square");
  assert.deepEqual(reel.safeArea, { x: 0, y: 420, w: 1080, h: 1080, label: "Grid crop 1:1" });
  assert.equal(reel.mobileWidth, 124, "a reel cover is judged at grid-thumbnail size");

  const highlight = IG_LAYOUT_MAP["ig-highlight"];
  assert.equal(highlight.crop, "circle");
  assert.equal(highlight.safeArea?.w, 756, "the 70 % safe circle");
  assert.equal(highlight.mobileWidth, 64, "highlights render at about 64 px");
});

test("audit width never exceeds the canvas and mobile width is what a phone shows", () => {
  for (const layout of IG_LAYOUTS) {
    assert.ok(layout.auditWidth > 0, `${layout.key} needs an audit width`);
    assert.ok(layout.auditWidth <= layout.width, `${layout.key} audits a wider canvas than it has`);
    assert.ok(layout.mobileWidth > 0 && layout.mobileWidth <= 430, `${layout.key} mobile width must be a phone width`);
    assert.ok(layout.cropNote.length > 20, `${layout.key} must explain what Instagram does to the file`);
  }
});

/* ------------------------------- legibility ------------------------------- */

const draw = (role: TypedDraw["role"], size: number, text = "text"): TypedDraw => ({ role, size, text });

test("the audit converts canvas px to the size a phone actually shows", () => {
  // 36 px on a 1080-wide art beats a 360-wide phone as 12 px.
  const audit = auditLegibility([draw("headline", 36)], 1080, 360);
  assert.equal(audit.smallestHeadline, 12);
  assert.equal(audit.failing.length, 1);
  assert.equal(audit.passes, false);
});

test("passing type passes, and the smallest headline is reported", () => {
  const audit = auditLegibility([draw("headline", 60), draw("body", 36), draw("footer", 30)], 1080, 360);
  assert.equal(audit.passes, true);
  assert.equal(audit.smallestHeadline, 20);
  assert.equal(audit.failing.length, 0);
});

test("the minimums are CSS pixels a phone reader needs", () => {
  assert.equal(LEGIBILITY_MINIMUMS.headline, 16);
  assert.equal(LEGIBILITY_MINIMUMS.cta, 11.5);
  assert.equal(LEGIBILITY_MINIMUMS.body, 11);
  assert.equal(LEGIBILITY_MINIMUMS.kicker, 8.5);
  assert.equal(LEGIBILITY_MINIMUMS.footer, 8);
});

test("a highlight seal carries no type at all", () => {
  const highlight = IG_LAYOUT_MAP["ig-highlight"];
  assert.equal(highlight.mobileWidth, 64);
  // A 12 px canvas line would be 0.7 px at 64 px — the audit must refuse it.
  const audit = auditLegibility([draw("headline", 12, "JATHAGAM")], highlight.auditWidth, highlight.mobileWidth);
  assert.equal(audit.passes, false);
});

/* --------------------------------- copy ---------------------------------- */

test("every grid, story and reel entry names a layout that exists", () => {
  const entries: Array<{ id: string; layout: IgLayout; headline: string }> = [
    ...IG_COPY_ENTRIES.map((entry) => ({ id: entry.id, layout: entry.layout, headline: entry.content.headline })),
    ...IG_STORY_ENTRIES.map((entry) => ({ id: entry.id, layout: "ig-story" as IgLayout, headline: entry.content.headline })),
    ...IG_REEL_ENTRIES.map((entry) => ({ id: entry.id, layout: "ig-reel-cover" as IgLayout, headline: entry.content.headline })),
  ];
  assert.equal(entries.length, 15, "nine grid posts, four stories, two covers");
  for (const entry of entries) {
    assert.ok(IG_LAYOUT_MAP[entry.layout], `${entry.id} points at unknown layout ${entry.layout}`);
    assert.ok(entry.headline.trim().length > 0, `${entry.id} needs a headline`);
  }
});

test("the copy never puts a headline in a highlight seal", () => {
  for (const cover of IG_HIGHLIGHT_COVERS) {
    assert.ok(cover.glyph, `${cover.id} needs a motif`);
    assert.ok(cover.label.length > 0);
  }
  assert.doesNotMatch(SOURCE, /drawText\(scene,\s*"headline"[^)]*igHighlight/s);
});
