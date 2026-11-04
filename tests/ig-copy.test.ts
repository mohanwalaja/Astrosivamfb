import { HIGHLIGHT_STYLE } from "../src/lib/highlightSeal.ts";
import { STYLE_MAP } from "../src/data/brand.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

import { THEMES } from "../src/data/brand.ts";
import {
  composeIgCaption,
  gridOrder,
  IG_COPY_BY_ID,
  IG_COPY_ENTRIES,
  IG_GRID_NOTES,
  IG_GRID_PLAN,
  IG_HIGHLIGHT_COVERS,
  IG_REEL_ENTRIES,
  IG_STORY_ENTRIES,
} from "../src/data/igCopy.ts";
import { IG_CAPABILITIES, IG_LIMITS, IG_MEDIA_SPECS, IG_PUBLISHER_COVERAGE } from "../src/data/igApi.ts";
import { IG_HIGHLIGHTS } from "../src/data/instagram.ts";
import { IG_LAYOUT_MAP } from "../src/lib/igCreative.ts";

const BANNED = /\bguarantee(s|d)?\b|100% accurate|will cure|destiny will|assured result/gi;

/** "not guarantees" is a denial, not a claim — only flag unnegated promises. */
const claimsIn = (line: string) =>
  [...line.matchAll(BANNED)]
    .filter((match) => !/(\bnot|\bno|\bnever)\s+$/i.test(line.slice(Math.max(0, (match.index ?? 0) - 12), match.index)))
    .map((match) => match[0]);
const ART_LAYOUTS = new Set(["ig-service", "ig-carousel-cover"]);

/* ------------------------------ grid integrity ---------------------------- */

test("the plan is a real 3 × 3 with nine distinct posts", () => {
  assert.equal(IG_GRID_PLAN.length, 9);
  assert.equal(new Set(IG_GRID_PLAN.map((slot) => slot.entryId)).size, 9, "no post is placed twice");
  assert.equal(new Set(IG_GRID_PLAN.map((slot) => `${slot.row}:${slot.col}`)).size, 9, "no two posts share a cell");
  for (const slot of IG_GRID_PLAN) {
    assert.ok(slot.row >= 0 && slot.row < 3 && slot.col >= 0 && slot.col < 3, "cells stay inside the grid");
    assert.ok(IG_COPY_BY_ID[slot.entryId], `${slot.entryId} is not in the copy file`);
  }
});

test("the declared register matches the theme's actual ground", () => {
  for (const slot of IG_GRID_PLAN) {
    const entry = IG_COPY_BY_ID[slot.entryId];
    const theme = THEMES[entry.theme];
    assert.ok(theme, `${entry.id} uses unknown theme ${entry.theme}`);
    const register = theme.light ? "light" : "dark";
    assert.equal(slot.register, register, `${entry.id} claims ${slot.register} but ${entry.theme} is ${register}`);
  }
});

test("focal matches the layout: art layouts are art, type layouts are type", () => {
  for (const slot of IG_GRID_PLAN) {
    const entry = IG_COPY_BY_ID[slot.entryId];
    const expected = ART_LAYOUTS.has(entry.layout) ? "art" : "type";
    assert.equal(slot.focal, expected, `${entry.id} (${entry.layout}) should be a ${expected} tile`);
  }
});

test("the composition rules hold: art on the diagonal, quotes on the anti-diagonal", () => {
  for (const slot of IG_GRID_PLAN) {
    const entry = IG_COPY_BY_ID[slot.entryId];
    if (slot.focal === "art") assert.equal(slot.row, slot.col, `${entry.id} should sit on the main diagonal`);
    if (entry.category === "quote") assert.equal(slot.row + slot.col, 2, `${entry.id} should sit on the anti-diagonal`);
  }
});

test("no two neighbours share both register and focal", () => {
  const at = (row: number, col: number) => IG_GRID_PLAN.find((slot) => slot.row === row && slot.col === col);
  for (const slot of IG_GRID_PLAN) {
    for (const [dRow, dCol] of [
      [0, 1],
      [1, 0],
    ]) {
      const neighbour = at(slot.row + dRow, slot.col + dCol);
      if (!neighbour) continue;
      const clash = neighbour.register === slot.register && neighbour.focal === slot.focal;
      assert.equal(clash, false, `${slot.entryId} and ${neighbour.entryId} are the same tile twice`);
    }
  }
});

test("the grid runs in publishing order and covers all three registers", () => {
  const ordered = gridOrder();
  assert.equal(ordered.length, 9);
  assert.deepEqual(
    ordered.map((entry) => entry.id),
    [...IG_GRID_PLAN].sort((a, b) => a.row - b.row || a.col - b.col).map((slot) => slot.entryId),
  );
  const categories = new Set(ordered.map((entry) => entry.category));
  assert.deepEqual([...categories].sort(), ["education", "quote", "service"]);
  assert.ok(IG_GRID_NOTES.length >= 3, "the plan has to explain itself");
});

/* -------------------------------- captions -------------------------------- */

test("every caption fits the API limits", () => {
  for (const entry of IG_COPY_ENTRIES) {
    assert.ok(entry.captions.instagram.length <= 2200, `${entry.id} exceeds Instagram's 2,200 characters`);
    assert.ok(entry.captions.facebook.length <= 5000, `${entry.id} exceeds Facebook's 5,000 characters`);
    assert.ok(entry.captions.instagram.trim().length > 80, `${entry.id} caption is too thin to be useful`);
  }
});

test("hashtags stay inside the limit and carry the brand", () => {
  for (const entry of IG_COPY_ENTRIES) {
    assert.ok(entry.hashtags.length <= 30, `${entry.id} has too many hashtags`);
    assert.ok(entry.hashtags.length >= 3, `${entry.id} needs a usable tag set`);
    assert.equal(new Set(entry.hashtags.map((tag) => tag.toLowerCase())).size, entry.hashtags.length, `${entry.id} repeats a tag`);
    for (const tag of entry.hashtags) assert.match(tag, /^#[A-Za-z0-9]+$/, `${tag} is not a valid hashtag`);
    assert.ok(entry.hashtags.includes("#AstroSivam"), `${entry.id} should carry the brand tag`);
  }
});

test("alt text is written, descriptive and inside Meta's 1,000 characters", () => {
  for (const entry of IG_COPY_ENTRIES) {
    assert.ok(entry.altText.length > 40 && entry.altText.length <= 1000, `${entry.id} alt text is ${entry.altText.length} chars`);
    assert.doesNotMatch(entry.altText, /^image of/i, `${entry.id} should not start with "image of"`);
  }
});

test("the composed caption ends with tags and uses real newlines", () => {
  for (const entry of IG_COPY_ENTRIES) {
    const composed = composeIgCaption(entry.captions.instagram, entry);
    assert.ok(composed.includes("\n\n"), `${entry.id} should separate the tag line with a blank line`);
    assert.equal(composed.includes("\\n"), false, `${entry.id} contains a literal backslash-n — the classic escape bug`);
    assert.ok(composed.length <= 2200, `${entry.id} overflows 2,200 once tags are added`);
    for (const tag of entry.hashtags.slice(0, 5)) assert.ok(composed.includes(tag), `${tag} went missing from the caption`);
  }
});

test("no post promises an outcome astrology cannot promise", () => {
  const corpus = IG_COPY_ENTRIES.flatMap((entry) => [
    entry.captions.instagram,
    entry.captions.facebook,
    entry.altText,
    entry.content.headline,
    entry.content.subline,
    entry.content.cta,
  ]);
  for (const line of corpus) {
    assert.deepEqual(claimsIn(line), [], `banned claim in: ${line.slice(0, 70)}`);
  }
});

test("prices are the real ones, and only where a price belongs", () => {
  const priced = IG_COPY_ENTRIES.filter((entry) => entry.content.price.trim().length > 0);
  assert.ok(priced.length >= 2, "at least the service cards carry a price");
  for (const entry of priced) {
    assert.match(entry.content.price, /US\$\d+ · ₹\d{3}/, `${entry.id} must quote both currencies`);
  }
  for (const entry of IG_COPY_ENTRIES.filter((item) => item.category !== "service")) {
    assert.equal(entry.content.price, "", `${entry.id} is not a sales post and should not carry a price`);
  }
});

test("every post has a call to action, a URL and a DM keyword that exists", () => {
  for (const entry of IG_COPY_ENTRIES) {
    assert.ok(entry.cta.line.trim().length > 3, `${entry.id} has no CTA line`);
    assert.match(entry.cta.url, /^astrosivam\.com\//, `${entry.id} must link into the site`);
    assert.match(entry.cta.dmKeyword, /^[A-Z]+$/, `${entry.id} DM keyword must be one shouty word`);
  }
  assert.equal(new Set(IG_COPY_ENTRIES.map((entry) => entry.id)).size, 9);
});

/* -------------------------------- stories --------------------------------- */

test("stories carry their words in pixels, because the API takes no caption", () => {
  for (const entry of IG_STORY_ENTRIES) {
    assert.ok(entry.content.headline.trim().length > 0, `${entry.id} must bake its message into the frame`);
    assert.ok(entry.sticker.trim().length > 0, `${entry.id} must tell the editor which sticker to add`);
    assert.ok(entry.content.kicker.length <= 24, `${entry.id} kicker must fit the field note`);
  }
  assert.equal(IG_STORY_ENTRIES.length, 4);
  assert.ok(IG_STORY_ENTRIES.some((entry) => entry.id === "story-rasi-palan" && entry.sticker.includes("astrosivam.com/rasipalan")));
  assert.ok(
    IG_STORY_ENTRIES.some((entry) => entry.content.cta === ""),
    "one story should ask for nothing at all",
  );
});

test("reel covers name a cover-sized promise and a caption inside the limit", () => {
  assert.equal(IG_REEL_ENTRIES.length, 2);
  for (const entry of IG_REEL_ENTRIES) {
    assert.ok(entry.hook.trim().length > 10, `${entry.id} needs a spoken hook`);
    assert.ok(entry.caption.length <= 2200, `${entry.id} caption overflows`);
  }
});

/* ------------------------------- highlights ------------------------------- */

test("highlight covers are symbol-only and reuse the planned highlights", () => {
  assert.equal(IG_HIGHLIGHT_COVERS.length, IG_HIGHLIGHTS.length);
  assert.equal(IG_HIGHLIGHT_COVERS.length, 7);
  assert.deepEqual(
    IG_HIGHLIGHT_COVERS.map((cover) => cover.id).sort(),
    IG_HIGHLIGHTS.map((highlight) => highlight.id).sort(),
  );
  for (const cover of IG_HIGHLIGHT_COVERS) {
    assert.ok(cover.purpose.trim().length > 10, `${cover.id} needs a purpose`);
    assert.ok(cover.stories.length >= 1, `${cover.id} needs a story plan`);
    assert.equal(cover.label.toLowerCase().includes("cover"), false, "the label is drawn by Instagram");
  }
});

test("every highlight plan is drawn from one of the twelve art directions", () => {
  for (const highlight of IG_HIGHLIGHTS) {
    const style = HIGHLIGHT_STYLE[highlight.id];
    assert.ok(style, `${highlight.id} needs an art direction`);
    assert.ok(STYLE_MAP[style.style], `${highlight.id} points at a missing style`);
    assert.equal(highlight.theme, STYLE_MAP[style.style].defaultTheme, `${highlight.id} theme must follow its style`);
  }
  const used = new Set(IG_HIGHLIGHTS.map((h) => HIGHLIGHT_STYLE[h.id].style));
  assert.equal(used.size, IG_HIGHLIGHTS.length, "each cover in the profile row shows a different direction");
});

/* ------------------------------ api honesty ------------------------------- */

test("the API notes never claim publishing power the platform does not have", () => {
  const impossible = IG_CAPABILITIES.filter((capability) => capability.support === "none").map((capability) => capability.task);
  assert.ok(impossible.some((task) => /highlight/i.test(task)), "highlights must be listed as impossible");
  assert.ok(impossible.some((task) => /profile photo|bio/i.test(task)), "profile fields must be listed as impossible");
  assert.ok(impossible.some((task) => /alt text on a reel/i.test(task)), "reel/story alt text must be listed as impossible");
  for (const capability of IG_CAPABILITIES) {
    assert.ok(capability.note.length > 20, `${capability.task} needs an honest explanation`);
    if (capability.support === "api") assert.ok(capability.endpoint, `${capability.task} claims API support without an endpoint`);
  }
});

test("the publish limit is presented as something to query, never as a fixed number", () => {
  const limit = IG_LIMITS.find((item) => item.label === "API-published posts");
  assert.ok(limit, "the daily cap has to be stated");
  assert.match(limit!.value, /query/i);
  assert.match(limit!.note ?? "", /50/);
  assert.match(limit!.note ?? "", /100/);
});

test("media specs cover every surface the studio exports for", () => {
  const surfaces = IG_MEDIA_SPECS.map((spec) => spec.surface.toLowerCase()).join(" | ");
  for (const word of ["feed", "carousel", "story", "reel", "highlight", "profile"]) {
    assert.ok(surfaces.includes(word), `media specs are missing ${word}`);
  }
});

test("the publisher coverage tells the truth about this app", () => {
  const feed = IG_PUBLISHER_COVERAGE.find((item) => item.surface.includes("Feed"));
  assert.equal(feed?.supported, true, "the one-image publisher does work");
  for (const item of IG_PUBLISHER_COVERAGE.filter((row) => row.surface !== "Feed image (single)")) {
    assert.equal(item.supported, false, `${item.surface} is not wired into this app's publisher yet`);
    assert.ok(item.note.length > 20, `${item.surface} needs to say what to do instead`);
  }
});

test("every layout named by the suite is a real layout", () => {
  for (const entry of IG_COPY_ENTRIES) assert.ok(IG_LAYOUT_MAP[entry.layout], `${entry.id} uses ${entry.layout}`);
});
