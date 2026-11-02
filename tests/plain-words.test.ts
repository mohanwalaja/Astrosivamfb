import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { PLAIN_WORDS, plainWordsCaption, plainWordsInstagram } from "../src/data/plainWords.ts";
import { englishCopy, validatePosterCopy } from "../src/lib/englishCopy.ts";
import { COMPOSITION_MAP, BRIEF_MAP } from "../src/data/designBriefs.ts";
import { THEMES } from "../src/data/brand.ts";

const root = process.cwd();

test("the campaign has a plate for each hook a new customer actually arrives with", () => {
  const ids = PLAIN_WORDS.map((poster) => poster.id);
  assert.equal(new Set(ids).size, ids.length, "poster ids must be unique");
  for (const id of ["priest-is-busy", "no-time-to-visit", "three-details", "what-we-do", "one-price"]) {
    assert.ok(ids.includes(id), `missing the ${id} plate`);
  }
});

test("every plate explains the service in English, with at most three facts", () => {
  for (const poster of PLAIN_WORDS) {
    const errors = validatePosterCopy(poster.copy);
    assert.deepEqual(errors, [], `${poster.id}: ${errors.join(" ")}`);
    assert.ok(poster.copy.subline.length >= 60, `${poster.id} needs a real explanation under the hook`);
    assert.ok(poster.copy.subline.length <= 150, `${poster.id} subline is too long for the smallest format`);
    assert.ok(poster.copy.facts.length <= 3, `${poster.id} has more facts than the renderer will print`);
    assert.ok(poster.copy.facts.every((fact) => fact.length <= 34), `${poster.id} has a fact that will wrap badly`);
  }
});

test("the hook is a plain sentence, not a metaphor", () => {
  const lead = PLAIN_WORDS[0];
  assert.equal(lead.id, "priest-is-busy");
  assert.match(lead.copy.headline, /priest/i);
  assert.match(lead.copy.subline, /birth details|birth date|jathagam/i);
  for (const poster of PLAIN_WORDS) {
    assert.ok(poster.copy.headline.length <= 72, `${poster.id} headline is longer than the safe maximum`);
    assert.ok(!/^(Explore|Discover|Embark)/.test(poster.copy.cta), `${poster.id} CTA should name the action`);
  }
});

test("every plate renders through a real composition, category, theme and artwork", () => {
  for (const poster of PLAIN_WORDS) {
    assert.ok(COMPOSITION_MAP[poster.composition], `${poster.id} uses an unknown composition`);
    assert.ok(BRIEF_MAP[poster.category], `${poster.id} uses an unknown category`);
    assert.ok(BRIEF_MAP[poster.category].occasions.some((item) => item.key === poster.occasion), `${poster.id} occasion is not in the brief`);
    assert.ok(THEMES[poster.theme], `${poster.id} uses an unknown theme`);
    assert.ok(poster.image.startsWith("/"), `${poster.id} artwork must be a public path`);
    assert.ok(existsSync(path.join(root, "public", poster.image.slice(1))), `${poster.id} artwork is missing`);
    assert.equal(poster.width, 1080);
    assert.ok([1350, 1920].includes(poster.height), `${poster.id} must render at a feed or story size`);
  }
});

test("the renderer contract holds: facts are trimmed and nothing non-English reaches the canvas", () => {
  for (const poster of PLAIN_WORDS) {
    const copy = englishCopy(poster.copy);
    assert.equal(copy.headline, poster.copy.headline);
    assert.equal(copy.subline, poster.copy.subline);
    assert.deepEqual(copy.facts, poster.copy.facts.slice(0, 3));
  }
});

test("captions carry the price-free explanation and stay inside Instagram's limit", () => {
  for (const poster of PLAIN_WORDS) {
    const fb = plainWordsCaption(poster);
    const ig = plainWordsInstagram(poster);
    assert.ok(fb.includes("astrosivam.com"), `${poster.id} caption has no link`);
    assert.ok(ig.length <= 2200, `${poster.id} Instagram caption is ${ig.length} characters`);
    assert.ok(ig.includes("#AstroSivam"), `${poster.id} Instagram caption has no brand tag`);
  }
});
