import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  FB_LAYOUTS,
  FB_LAYOUT_MAP,
  LEGIBILITY_MINIMUMS,
  auditLegibility,
  type FbLayout,
  type TypedDraw,
} from "../src/lib/fbCreative.ts";
import { FB_COPY_ENTRIES } from "../src/data/fbCopy.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const READ = (path: string) => readFileSync(join(ROOT, path), "utf8");
const SOURCE = READ("src/lib/fbCreative.ts");

const EXPECTED: FbLayout[] = ["profile-seal", "cover-lockup", "service-promo", "educational", "festival-greeting"];

/* ------------------------------ the five assets --------------------------- */

test("the suite ships exactly the five briefed asset layouts", () => {
  assert.deepEqual(FB_LAYOUTS.map((layout) => layout.key).sort(), [...EXPECTED].sort());
  for (const key of EXPECTED) assert.ok(FB_LAYOUT_MAP[key], `${key} is missing from the layout map`);
});

test("each layout has its own painter, not a branch in a shared skeleton", () => {
  const names: Record<FbLayout, string> = {
    "profile-seal": "profileSeal",
    "cover-lockup": "coverLockup",
    "service-promo": "servicePromo",
    educational: "educational",
    "festival-greeting": "festivalGreeting",
  };
  for (const [key, fn] of Object.entries(names)) {
    assert.match(SOURCE, new RegExp(`function ${fn}\\(`), `${key} needs its own painter function`);
  }
  // The dispatcher must be a map, so adding a category cannot silently reuse one.
  assert.match(SOURCE, /const PAINTERS\s*:/);
});

test("the export sizes match Meta's published asset specs", () => {
  const sizes = Object.fromEntries(FB_LAYOUTS.map((layout) => [layout.key, `${layout.width}x${layout.height}`]));
  assert.equal(sizes["profile-seal"], "1080x1080", "profile pictures export square");
  assert.equal(sizes["cover-lockup"], "1640x624", "the Page cover is 1640 × 624");
  for (const layout of FB_LAYOUTS) {
    assert.ok(layout.mobileWidth > 0, `${layout.key} needs a mobile display width`);
    assert.ok(layout.mobileWidth <= layout.width, `${layout.key} cannot be seen larger than it is drawn`);
    assert.ok(
      layout.auditWidth >= layout.mobileWidth && layout.auditWidth <= layout.width,
      `${layout.key} audit width must sit between the mobile size and the canvas size`,
    );
    assert.ok(layout.cropNote.trim().length > 20, `${layout.key} needs a crop note for the editor`);
    assert.ok(layout.purpose.trim().length > 10, `${layout.key} needs a stated purpose`);
  }
});

test("a cropped asset is audited against the part that survives the crop", () => {
  const cover = FB_LAYOUT_MAP["cover-lockup"];
  // A cover is 1640 px wide but a phone shows its centre 640 px.
  assert.equal(cover.auditWidth, 640);
  assert.ok(cover.auditWidth < cover.width);
  assert.ok(cover.safeArea, "a cropped cover must declare its safe area");

  const seal = FB_LAYOUT_MAP["profile-seal"];
  assert.equal(seal.crop, "circle");
  assert.ok(seal.safeArea, "a circular avatar needs a safe circle");
  // 70 % of a 1080 px square, centred.
  assert.equal(seal.safeArea!.x + seal.safeArea!.w / 2, seal.width / 2);
  assert.equal(seal.safeArea!.y + seal.safeArea!.h / 2, seal.height / 2);
});

/* ------------------------------ the audit maths --------------------------- */

const draw = (role: TypedDraw["role"], size: number): TypedDraw => ({ role, size, text: "sample" });

test("effective size is measured against the visible crop, not the canvas", () => {
  const poster = FB_LAYOUT_MAP["cover-lockup"];
  const audit = auditLegibility([draw("headline", 30)], poster.auditWidth, poster.mobileWidth);
  // 30 px seen at 360/640 is 16.9 px — legible. Against 1640 it would be a false 6.6.
  assert.equal(audit.scale, poster.mobileWidth / poster.auditWidth);
  assert.ok(audit.smallestHeadline > 16 && audit.smallestHeadline < 18);
  assert.equal(audit.passes, true);
});

test("the headline floor is enforced exactly at the boundary", () => {
  const { auditWidth, mobileWidth } = FB_LAYOUT_MAP["service-promo"];
  const floor = LEGIBILITY_MINIMUMS.headline;
  const passing = auditLegibility([draw("headline", floor * (auditWidth / mobileWidth))], auditWidth, mobileWidth);
  assert.ok(passing.smallestHeadline >= floor, `expected ${floor}, measured ${passing.smallestHeadline}`);
  assert.equal(passing.passes, true);

  const failing = auditLegibility([draw("headline", floor * (auditWidth / mobileWidth) - 4)], auditWidth, mobileWidth);
  assert.equal(failing.passes, false);
  assert.equal(failing.failing.length, 1);
  assert.equal(failing.failing[0].role, "headline");
});

test("decorative desktop type is never held to a mobile floor", () => {
  assert.equal(LEGIBILITY_MINIMUMS.desktop, 0);
  const audit = auditLegibility([draw("desktop", 6)], 1080, 360);
  assert.equal(audit.passes, true);
});

test("every non-decorative role has a floor above the readable minimum", () => {
  for (const role of ["headline", "cta", "body", "kicker", "footer"] as const) {
    assert.ok(LEGIBILITY_MINIMUMS[role] >= 8, `${role} floor is too low to read on a phone`);
  }
  assert.ok(LEGIBILITY_MINIMUMS.headline >= 16, "the headline must clear 16 CSS px");
});

test("the audit reports every failing line so the fix can be targeted", () => {
  const audit = auditLegibility([draw("headline", 40), draw("body", 8), draw("footer", 4)], 1080, 360);
  assert.equal(audit.passes, false);
  assert.deepEqual(
    audit.failing.map((finding) => finding.role).sort(),
    ["body", "footer", "headline"],
  );
});

/* ------------------------- categories use their layout -------------------- */

test("every library post uses the layout its category is built around", () => {
  const expected: Record<string, FbLayout> = {
    service: "service-promo",
    educational: "educational",
    festival: "festival-greeting",
    trust: "educational",
  };
  for (const entry of FB_COPY_ENTRIES) {
    assert.equal(entry.layout, expected[entry.category], `${entry.id} uses ${entry.layout} for ${entry.category}`);
  }
});

test("no post layout reuses the profile or cover composition", () => {
  for (const entry of FB_COPY_ENTRIES) {
    assert.notEqual(entry.layout, "profile-seal", `${entry.id} is a post, not an avatar`);
    assert.notEqual(entry.layout, "cover-lockup", `${entry.id} is a post, not a cover`);
  }
});

/* ------------------------- render and audit for real ---------------------- */
// The Node canvas shim is a devDependency; if it is missing (a bare checkout)
// the static checks above still run, but a skipped test must be visible.

test("all five layouts render and pass the mobile legibility audit", async (t) => {
  let env: { installCanvasEnv: () => void } | null = null;
  try {
    env = await import("../tools/canvas-env.mjs");
  } catch {
    t.skip("canvas shim not installed");
    return;
  }
  env.installCanvasEnv();
  const { renderFbCreative } = await import("../src/lib/fbCreative.ts");

  for (const layout of FB_LAYOUTS) {
    const entry =
      FB_COPY_ENTRIES.find((item) => item.layout === layout.key && item.category !== "trust") ??
      FB_COPY_ENTRIES.find((item) => item.layout === layout.key);
    const content = entry?.content ?? {
      kicker: "Birth Jathagam",
      headline: "Your life, mapped to the minute.",
      subline: "Lahiri sidereal charts · 7 days of astrologer chat.",
      tamil: "பிறப்பு ஜாதகம்",
      chips: ["Rasi + Navamsa", "Dasa timeline", "Pariharams"],
      price: "US$5 · ₹470",
      cta: "astrosivam.com",
      footer: "Astro Sivam · Vedic astrology, Tamil Nadu",
    };
    const out = await renderFbCreative({
      layout: layout.key,
      themeKey: entry?.theme ?? "kumkum",
      style: layout.key === "educational" ? "mono" : layout.key === "festival-greeting" ? "deepam" : "gopuram",
      content,
      art: "/deities/ganesha.jpg",
      scale: 0.25,
    });
    assert.equal(out.canvas.width, Math.round(layout.width * 0.25), `${layout.key} rendered at the wrong width`);
    const audit = auditLegibility(out.typography, layout.auditWidth, layout.mobileWidth);
    assert.ok(
      audit.passes,
      `${layout.key}: ${audit.failing.map((finding) => `${finding.role} ${finding.effective}<${finding.minimum}`).join(", ")}`,
    );
    assert.ok(audit.smallestHeadline >= LEGIBILITY_MINIMUMS.headline, `${layout.key} headline too small`);
  }
});
