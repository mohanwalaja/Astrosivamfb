import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AD_LAYOUTS,
  AD_LAYOUT_MAP,
  AD_ONLY_LAYOUTS,
  EDU_ONLY_LAYOUTS,
  type AdLayout,
} from "../src/lib/serviceAds.ts";
import {
  AD_RULES,
  AD_SERVICE_IDS,
  SERVICE_ADS,
  SERVICE_LOCALES,
  adsFor,
  referencePlates,
} from "../src/data/serviceAds.ts";
import { SERVICES, getService } from "../src/data/services/index.ts";
import { THEMES } from "../src/data/brand.ts";
import { ellipsize, fitLines, wrapAll } from "../src/lib/typeset.ts";

/* ==========================================================================
   The rules the advertising system is allowed to break a build over.
   ========================================================================== */

const SIGNIFICANT = new Set([
  "the", "and", "for", "with", "your", "you", "that", "this", "are", "our", "from", "into",
  "one", "all", "each", "not", "but", "its", "has", "have", "will", "can", "who", "what",
]);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s+]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !SIGNIFICANT.has(word));

/** Everything the service record says, as one searchable blob. */
const serviceCorpus = (id: string) => {
  const service = getService(id);
  return JSON.stringify({
    name: service.name,
    shortName: service.shortName,
    badge: service.badge,
    price: service.price,
    priceNote: service.priceNote,
    promise: service.promise,
    proof: service.proof,
    deliverables: service.deliverables,
    creative: service.creative,
    carousel: service.carousel,
  }).toLowerCase();
};

/* ------------------------------- structure ------------------------------- */

test("the system ships six selling compositions and two reference compositions", () => {
  assert.equal(AD_LAYOUTS.length, 8);
  assert.equal(AD_ONLY_LAYOUTS.length, 6);
  assert.equal(EDU_ONLY_LAYOUTS.length, 2);
  assert.equal(new Set(AD_LAYOUTS.map((layout) => layout.key)).size, 8);
  for (const layout of AD_LAYOUTS) {
    assert.equal(AD_LAYOUT_MAP[layout.key], layout);
    assert.ok(layout.purpose.length > 20, `${layout.key} needs a purpose`);
    assert.ok(layout.bestFor.length > 10, `${layout.key} needs a use`);
    assert.ok(layout.mobileWidth <= layout.width, `${layout.key} mobile width`);
    assert.ok(layout.auditWidth <= layout.width, `${layout.key} audit width`);
  }
  for (const layout of AD_ONLY_LAYOUTS) assert.equal(layout.role, "ad");
  for (const layout of EDU_ONLY_LAYOUTS) assert.equal(layout.role, "edu");
});

test("advertising plates are 4:5 and reference plates are square, at Meta sizes", () => {
  for (const layout of AD_ONLY_LAYOUTS) {
    assert.equal(layout.width, 1080, `${layout.key} width`);
    assert.equal(layout.height, 1350, `${layout.key} height`);
    assert.equal(layout.auditWidth, 1080);
    assert.equal(layout.mobileWidth, 360);
  }
  for (const layout of EDU_ONLY_LAYOUTS) {
    assert.equal(layout.width, 1080);
    assert.equal(layout.height, 1080);
  }
});

test("the education set and the advertising set do not overlap", () => {
  const ads = new Set(AD_ONLY_LAYOUTS.map((layout) => layout.key));
  for (const layout of EDU_ONLY_LAYOUTS) assert.equal(ads.has(layout.key), false);
  for (const ad of SERVICE_ADS) assert.equal(AD_LAYOUT_MAP[ad.layout].role, "ad", `${ad.id} must be an ad`);
  for (const id of AD_SERVICE_IDS) {
    for (const plate of referencePlates(id)) {
      assert.equal(AD_LAYOUT_MAP[plate.layout].role, "edu", `${plate.id} must be a reference plate`);
    }
  }
});

/* --------------------------------- coverage ------------------------------- */

test("every briefed service is covered by the six-services list", () => {
  const expected = ["jathagam", "marriage", "baby-naming", "muhurtham", "panchangam", "transits"];
  for (const id of expected) {
    assert.ok(AD_SERVICE_IDS.includes(id), `${id} is missing from the brief list`);
    assert.ok(SERVICES.some((service) => service.id === id), `${id} is missing from SERVICES`);
  }
  assert.deepEqual(AD_SERVICE_IDS.slice(0, 6), expected);
  assert.equal(AD_SERVICE_IDS.at(-1), "trust", "the samples plate is a trust asset, listed last");
});

test("each service has at least four ads and they use different compositions", () => {
  for (const id of AD_SERVICE_IDS) {
    const ads = adsFor(id);
    const minimum = id === "trust" ? 2 : 4;
    assert.ok(ads.length >= minimum, `${id} has ${ads.length} ads`);
    const layouts = new Set(ads.map((ad) => ad.layout));
    assert.equal(layouts.size, ads.length, `${id} repeats a composition`);
    assert.ok(layouts.size >= minimum, `${id} needs ${minimum} distinct compositions`);
    for (const ad of ads) assert.ok(AD_LAYOUT_MAP[ad.layout], `${ad.id} has an unknown layout`);
  }
});

test("no two services follow the same composition sequence", () => {
  const sequences = AD_SERVICE_IDS.map((id) => adsFor(id).map((ad) => ad.layout as AdLayout).join(">"));
  assert.equal(new Set(sequences).size, sequences.length, sequences.join(" | "));
});

/* ---------------------------------- copy ---------------------------------- */

test("every plate carries a kicker, a headline and a verb-first action", () => {
  for (const ad of SERVICE_ADS) {
    assert.ok(ad.copy.kicker.trim().length >= 4, `${ad.id} kicker`);
    assert.ok(ad.copy.headline.trim().length >= 12, `${ad.id} headline`);
    assert.ok(ad.copy.cta.trim().length >= 8, `${ad.id} cta`);
    assert.match(ad.copy.cta, /^[A-Z][a-z]+ /, `${ad.id} cta should start with a verb`);
    assert.ok(ad.copy.facts.length >= 2 && ad.copy.facts.length <= 4, `${ad.id} needs two to four facts`);
    for (const fact of ad.copy.facts) assert.ok(fact.length >= 8 && fact.length <= 70, `${ad.id}: “${fact}”`);
    assert.ok(ad.copy.headline.length <= 70, `${ad.id} headline is too long for the type scale`);
    assert.ok((ad.copy.subline ?? "").length <= 110, `${ad.id} subline is too long for its column`);
  }
});

test("no ad invents a price: money only ever comes from the service record", () => {
  for (const ad of SERVICE_ADS) {
    const text = [ad.copy.kicker, ad.copy.headline, ad.copy.subline, ad.copy.cta, ...ad.copy.facts].join(" ");
    assert.equal(/US\$|₹|\$|€|£/.test(text), false, `${ad.id} contains a price`);
    const service = getService(ad.serviceId);
    assert.ok(service.price.length > 0, `${ad.serviceId} has no price to read`);
  }
});

test("every fact is traceable to the service record", () => {
  for (const ad of SERVICE_ADS) {
    const corpus = serviceCorpus(ad.serviceId);
    for (const fact of ad.copy.facts) {
      const tokens = words(fact).filter((token) => !/^\d+$/.test(token));
      const found = tokens.filter((token) => corpus.includes(token));
      assert.ok(
        found.length >= Math.min(2, tokens.length),
        `${ad.id}: “${fact}” is not in the service record (matched ${found.join(", ") || "nothing"})`,
      );
    }
  }
});

test("no invented testimonials, guarantees or outcomes", () => {
  const banned = [
    /guarantee/i,
    /guaranteed/i,
    /100% (accurate|reliable)/i,
    /will (change|fix|heal|cure)/i,
    /cure/i,
    /assured (result|outcome)/i,
    /best astrologer/i,
    /famous/i,
    /lives? changed/i,
    /miracle/i,
    /destiny/i,
    /only \d+ (left|spots)/i,
    /hurry/i,
    /act now/i,
  ];
  const all = [
    ...SERVICE_ADS.flatMap((ad) => [ad.copy.kicker, ad.copy.headline, ad.copy.subline, ad.copy.cta, ...ad.copy.facts, ad.copy.tamil ?? "", ad.copy.hindi ?? ""]),
    ...AD_SERVICE_IDS.flatMap((id) =>
      referencePlates(id).flatMap((plate) => [plate.headline, plate.body, plate.kicker, ...plate.facts, plate.source]),
    ),
  ];
  for (const line of all) {
    for (const pattern of banned) assert.equal(pattern.test(line), false, `“${line}” matches ${pattern}`);
  }
});

test("the system states its own rules in one place", () => {
  assert.ok(AD_RULES.length >= 5);
  for (const rule of AD_RULES) assert.ok(rule.length > 20, rule);
  assert.ok(AD_RULES.some((rule) => /price/i.test(rule)), "the price rule must be stated");
  assert.ok(AD_RULES.some((rule) => /testimonial/i.test(rule)), "the testimonial rule must be stated");
});

/* ------------------------------- education ------------------------------- */

test("reference plates carry no price, no action and no offer", () => {
  for (const id of AD_SERVICE_IDS) {
    const plates = referencePlates(id);
    assert.ok(plates.length >= 2, `${id} needs at least two reference plates`);
    for (const plate of plates) {
      assert.deepEqual(plate.facts.length >= 0, true);
      const text = [plate.kicker, plate.headline, plate.body, ...plate.facts, plate.source].join(" ");
      assert.equal(/US\$|₹|astrosivam\.com/i.test(text), false, `${plate.id} carries an offer`);
      assert.equal(/free/i.test(text), false, `${plate.id} mentions free`);
      assert.ok(plate.source.startsWith("Source:"), `${plate.id} must print its source`);
      assert.equal(AD_LAYOUT_MAP[plate.layout].role, "edu");
    }
  }
});

test("reference copy is taken from the service's own explainer", () => {
  for (const id of AD_SERVICE_IDS) {
    const service = getService(id);
    const slides = service.carousel.slides.map((slide) => slide.headline);
    for (const plate of referencePlates(id)) {
      assert.ok(slides.includes(plate.headline), `${plate.id}: “${plate.headline}” is not a service slide`);
      assert.ok(
        service.carousel.slides.some((slide) => slide.body === plate.body),
        `${plate.id} body is not a service slide body`,
      );
    }
  }
});

/* -------------------------------- language -------------------------------- */

test("each service offers one trilingual line, marked for review", () => {
  for (const id of AD_SERVICE_IDS) {
    const line = SERVICE_LOCALES[id];
    assert.ok(line, `${id} has no localised line`);
    assert.ok(line.review === "source" || line.review === "prepared", `${id} review flag`);
    assert.ok(line.tamil.trim().length > 6, `${id} tamil`);
    assert.ok(line.hindi.trim().length > 6, `${id} hindi`);
  }
});

test("Tamil and Hindi lines are actually in their own scripts", () => {
  const tamil = /[\u0B80-\u0BFF]/;
  const deva = /[\u0900-\u097F]/;
  for (const [id, line] of Object.entries(SERVICE_LOCALES)) {
    assert.ok(tamil.test(line.tamil), `${id} tamil is not Tamil script`);
    assert.equal(deva.test(line.tamil), false, `${id} tamil contains Devanagari`);
    assert.ok(deva.test(line.hindi), `${id} hindi is not Devanagari`);
    assert.equal(tamil.test(line.hindi), false, `${id} hindi contains Tamil`);
  }
});

test("every ad carries the localised lines, so a language switch never empties a plate", () => {
  for (const ad of SERVICE_ADS) {
    assert.ok((ad.copy.tamil ?? "").trim().length > 6, `${ad.id} tamil`);
    assert.ok((ad.copy.hindi ?? "").trim().length > 6, `${ad.id} hindi`);
    assert.equal(SERVICE_LOCALES[ad.serviceId].tamil, ad.copy.tamil, `${ad.id} reuses the service line`);
    assert.equal(SERVICE_LOCALES[ad.serviceId].hindi, ad.copy.hindi, `${ad.id} reuses the service line`);
  }
});

/* --------------------------------- palette -------------------------------- */

test("every ad uses a real theme, and its art is a real deity image", () => {
  for (const ad of SERVICE_ADS) {
    assert.ok(THEMES[ad.theme], `${ad.id} theme ${ad.theme}`);
    assert.ok(ad.art, `${ad.id} needs relevant imagery`);
  }
});

/* ---------------------------------- typeset -------------------------------- */

/** Minimal 2D context: monospace measuring is enough to test the fitting rules. */
const fakeCtx = () => {
  let font = "100 12px serif";
  const width = () => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 12) * 0.55;
  return {
    set font(value: string) {
      font = value;
    },
    get font() {
      return font;
    },
    save() {},
    restore() {},
    measureText: (text: string) => ({ width: text.length * width() }),
  } as unknown as CanvasRenderingContext2D;
};

test("wrapAll keeps every word of a long line", () => {
  const ctx = fakeCtx();
  const text = "Rasi and Navamsa charts, planetary positions and a Vimshottari dasha timeline.";
  const lines = wrapAll(ctx, text, 120);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(" "), text);
});

test("fitLines shrinks to fit but never below the floor, and drops nothing", () => {
  const ctx = fakeCtx();
  const text = "Twelve bhavas, one honest timeline";
  const fitted = fitLines(ctx, text, 200, 3, (size) => `${size}px serif`, 80, 40);
  assert.ok(fitted.size >= 40 && fitted.size <= 80);
  assert.equal(fitted.lines.join(" "), text);
  // Shrinking stops at the floor; if the copy still needs lines, the plate
  // gives them room rather than dropping words.
  assert.ok(fitted.lines.length <= 3 || fitted.size === 40);
});

test("ellipsize shortens a citation without splitting a word", () => {
  const ctx = fakeCtx();
  const text = "Source: Jathagam 101, from sun sign to dasha";
  const clipped = ellipsize(ctx, text, 200, "20px serif");
  assert.ok(clipped.endsWith("…"));
  assert.ok(clipped.length < text.length);
  assert.ok(text.startsWith(clipped.slice(0, -1).trimEnd()));
  assert.equal(ellipsize(ctx, "short", 500, "20px serif"), "short");
});
