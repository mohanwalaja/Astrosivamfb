import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  CATEGORY_META,
  DESIGN_LIBRARY,
  LIBRARY_COUNTS,
  LAYOUT_LABEL,
  getDesign,
  type Design,
} from "../src/data/library.ts";
import { THEMES } from "../src/data/brand.ts";
import { SERVICES } from "../src/data/services/index.ts";
import { validatePosterCopy } from "../src/lib/englishCopy.ts";

/* ==========================================================================
   The 150-design library.
   ==========================================================================
   These tests hold the catalogue to the promise made in the studio: 150 real
   designs, split 75/75, grouped by service, each a complete recipe rather than
   a recolour, each printable, and each quoting the price that lives in the
   service record rather than a number typed into ad copy.
   ========================================================================== */

const priceOf = (category: Design["category"]) => {
  const serviceId = CATEGORY_META[category].serviceId;
  const service = SERVICES.find((item) => item.id === serviceId);
  assert.ok(service, `no service record for ${category} → ${serviceId}`);
  return service.price.split(" · ")[0];
};

test("the library is exactly 150 designs, split evenly between the two registers", () => {
  assert.equal(DESIGN_LIBRARY.length, 150);
  assert.equal(LIBRARY_COUNTS.total, 150);
  assert.equal(LIBRARY_COUNTS.traditional, 75);
  assert.equal(LIBRARY_COUNTS.modern, 75);
});

test("numbers and ids are unique and the catalogue is numbered 1–150", () => {
  assert.deepEqual(
    DESIGN_LIBRARY.map((item) => item.number).sort((a, b) => a - b),
    Array.from({ length: 150 }, (_, index) => index + 1),
  );
  const ids = DESIGN_LIBRARY.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "design ids must be unique");
});

test("every service carries both a traditional and a modern half", () => {
  for (const category of Object.keys(CATEGORY_META) as Array<Design["category"]>) {
    const traditional = DESIGN_LIBRARY.filter((item) => item.category === category && item.register === "traditional").length;
    const modern = DESIGN_LIBRARY.filter((item) => item.category === category && item.register === "modern").length;
    assert.ok(traditional >= 10, `${category} needs at least ten traditional designs, has ${traditional}`);
    assert.ok(modern >= 10, `${category} needs at least ten modern designs, has ${modern}`);
    assert.equal(LIBRARY_COUNTS.byCategory[category], traditional + modern);
  }
});

test("no design is a recolour: every complete recipe is unique", () => {
  const recipes = DESIGN_LIBRARY.map((item) =>
    [item.layout, item.theme, item.type, item.background, item.frame, item.ornament, item.art].join("|"),
  );
  assert.equal(new Set(recipes).size, recipes.length, "two designs share a complete recipe");
  for (const design of DESIGN_LIBRARY) {
    assert.ok(THEMES[design.theme], `${design.id} uses an unknown palette`);
    assert.ok(LAYOUT_LABEL[design.layout], `${design.id} uses an unknown layout`);
  }
});

test("all ten layouts ship, each used by several designs", () => {
  const counts = new Map<string, number>();
  for (const design of DESIGN_LIBRARY) counts.set(design.layout, (counts.get(design.layout) ?? 0) + 1);
  assert.equal(counts.size, 10, "all ten layouts must ship");
  for (const [layout, count] of counts) assert.ok(count >= 8, `${layout} has only ${count} designs`);
});

test("copy is valid, fits the smallest format, and prices come from the service record", () => {
  for (const design of DESIGN_LIBRARY) {
    const errors = validatePosterCopy({
      kicker: design.copy.kicker,
      serviceTitle: design.copy.serviceTitle,
      headline: design.copy.headline,
      subline: design.copy.subline,
      cta: design.copy.cta,
      footer: "astrosivam.com",
      facts: design.copy.facts,
    });
    assert.deepEqual(errors, [], `${design.id}: ${errors.join(" ")}`);
    assert.ok(design.copy.headline.length <= 72, `${design.id} headline is too long for the plate`);
    assert.ok(design.copy.subline.length <= 120, `${design.id} subline is too long for the smallest format`);
    assert.ok(design.copy.subline.length >= 60, `${design.id} needs a real explanation under the hook`);
    assert.ok(design.copy.facts.every((fact) => fact.length <= 34), `${design.id} has a fact that will wrap badly`);
    const quoted = JSON.stringify(design.copy).match(/US\$\d+/g) ?? [];
    for (const amount of quoted) {
      assert.equal(amount, priceOf(design.category), `${design.id} quotes ${amount}, but the service price is ${priceOf(design.category)}`);
    }
  }
});

test("artwork exists on disk and matches the service it advertises", () => {
  for (const design of DESIGN_LIBRARY) {
    assert.ok(design.image.startsWith("/art/"), `${design.id} has no artwork path`);
    assert.ok(existsSync(`public${design.image}`), `${design.id} artwork ${design.image} is missing`);
  }
  // A naming poster must not carry a Pongal pot, and a Karthigai wish must not
  // carry Deepavali lamps: the picture follows the copy, not the catalogue slot.
  const mismatched = DESIGN_LIBRARY.filter((design) => {
    if (design.category === "festival") return !/deepavali|pongal|karthigai/.test(design.image);
    return /deepavali|pongal|karthigai/.test(design.image);
  });
  assert.deepEqual(mismatched.map((item) => item.id), []);
});

test("getDesign resolves ids and refuses unknown ones", () => {
  assert.equal(getDesign("birth-traditional-jathagam-sanctum")?.category, "birth");
  assert.equal(getDesign(undefined), undefined);
  assert.equal(getDesign("not-a-design"), undefined);
});
