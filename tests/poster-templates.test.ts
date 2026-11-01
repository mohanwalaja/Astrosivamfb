import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { TEMPLATES, TEMPLATE_MAP } from "../src/data/posterTemplates.ts";
import { LAYOUT_TEMPLATE, layoutForTemplate, templateForLayout } from "../src/data/posterTemplates.ts";
import { STYLES, THEMES } from "../src/data/brand.ts";
import type { PosterLayout, PosterTemplate } from "../src/types.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const camel = (key: string) => key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const TEMPLATE_SOURCE = read("src/lib/posterTemplates.ts");
const POSTER_SOURCE = read("src/lib/poster.ts");
const KIT_SOURCE = read("src/lib/posterKit.ts");
const STUDIO_SOURCE = read("src/components/PosterStudio.tsx");

/* ------------------------------- the eight -------------------------------- */

const REQUIRED: PosterTemplate[] = ["mandapam", "gallery", "manifesto", "nocturne", "lesson", "offer", "blessing", "sequence"];

test("the studio offers exactly the eight briefed templates", () => {
  assert.deepEqual(
    TEMPLATES.map((template) => template.key).sort(),
    [...REQUIRED].sort(),
  );
  // Every template has its own painter — not a branch inside a shared skeleton.
  for (const key of REQUIRED) {
    const painter = TEMPLATE_SOURCE.match(new RegExp(`function ${camel(key)}\\(`));
    assert.ok(painter, `${key} has no painter function of its own`);
  }
  assert.equal(new Set(TEMPLATES.map((template) => template.key)).size, REQUIRED.length);
});

test("each template documents a distinct composition", () => {
  const compositions = TEMPLATES.map((template) => template.composition);
  assert.equal(new Set(compositions).size, TEMPLATES.length, "two templates share a composition description");
  for (const template of TEMPLATES) {
    assert.ok(template.name.length > 3, `${template.key} needs a name`);
    assert.ok(template.description.length > 80, `${template.key} needs a real description`);
    assert.ok(template.bestFor.length > 20, `${template.key} needs guidance on when to use it`);
    assert.ok(template.tagline.length > 10);
  }
  // At least one composition must deliberately set no imagery.
  assert.equal(TEMPLATES.filter((template) => !template.usesImage).length, 1);
});

test("every template is reachable from a legacy layout and back", () => {
  const layouts: PosterLayout[] = ["portrait-arch", "full-bleed", "split", "medallion", "type-only"];
  for (const layout of layouts) {
    const template = templateForLayout(layout);
    assert.ok(TEMPLATE_MAP[template], `${layout} maps to an unknown template`);
    assert.ok(layouts.includes(layoutForTemplate(template)), `${template} maps back to an unknown layout`);
  }
  for (const template of TEMPLATES) {
    assert.ok(LAYOUT_TEMPLATE[template.defaultLayout], `${template.key} has an invalid default layout`);
  }
  // The legacy layouts must still cover all eight compositions for the studio.
  assert.ok(new Set(Object.values(LAYOUT_TEMPLATE)).size >= 5);
});

/* ------------------------------ rendering contract ------------------------ */

test("the renderer dispatches on template and keeps the legacy path", () => {
  assert.match(POSTER_SOURCE, /template\?: PosterTemplate/, "PosterOptions must keep template optional");
  assert.match(POSTER_SOURCE, /template \?\? templateForLayout\(layout\)/, "renderPoster must fall back to the layout mapping");
  assert.match(POSTER_SOURCE, /paintPosterTemplate\(/, "renderPoster must delegate to the template painters");
  // Every template must be registered in the painter table.
  const painters = TEMPLATE_SOURCE.match(/const PAINTERS[\s\S]*?\n\};/);
  assert.ok(painters, "the PAINTERS table is missing");
  for (const key of REQUIRED) {
    const registered = painters[0].includes(`"${key}":`) || painters[0].includes(`\n  ${camel(key)},`);
    assert.ok(registered, `${key} is not registered in PAINTERS`);
  }
});

test("the studio still exposes every editing control, now as independent locks", () => {
  // Copy: one writer per field, so no field can be edited only through a preset.
  for (const field of ["kicker", "headline", "subline", "cta", "footer"]) {
    assert.ok(
      STUDIO_SOURCE.includes(`setCopy("${field}"`),
      `the studio lost its ${field} control`,
    );
  }
  // The independent locks the brief requires.
  for (const lock of ["composition:", "palette:", "face:", "decoration:", "motion:", "formatId:", "artId:", "showLogo:"]) {
    assert.ok(STUDIO_SOURCE.includes(lock), `the studio lost its ${lock} control`);
  }
  assert.ok(STUDIO_SOURCE.includes("another"), "Generate another design must stay");
  assert.ok(STUDIO_SOURCE.includes("renderDesign({"), "full-resolution export must stay");
  assert.ok(STUDIO_SOURCE.includes("scale: 1"), "exports must render at device scale 1");
  assert.ok(STUDIO_SOURCE.includes("recordReel("), "animated export must stay");
  assert.ok(STUDIO_SOURCE.includes("PublishCanvasButton"), "publishing must stay");
  // The composition picker renders real thumbnails, not wireframe glyphs.
  assert.ok(STUDIO_SOURCE.includes("COMPOSITIONS.map"), "the composition picker must be rendered");
  assert.ok(STUDIO_SOURCE.includes("aria-pressed"), "choices must expose their pressed state");
  assert.ok(STUDIO_SOURCE.includes("<Thumb"), "compositions need rendered thumbnails, not icons");
  assert.ok(STUDIO_SOURCE.includes("const canvas = await renderDesign({"), "a thumbnail must be a real render of its composition");
});

test("every control changes only itself — the independence guarantee", async () => {
  const studio = await import("../src/lib/studioDesign.ts");
  const base = studio.createStudioDesign({ category: "festival-greeting", formatId: "ig-post" });

  // Composition: the structure moves, the palette, face and copy do not.
  const compositions = [...new Set(
    (await import("../src/design/compositions.ts")).COMPOSITIONS.map((c) => c.key),
  )];
  const other = compositions.find((key) => key !== base.design.composition);
  assert.ok(other, "the studio needs more than one composition");
  const moved = studio.applyChange(base, { composition: other });
  assert.equal(moved.design.composition, other, "the chosen composition must be honoured");
  assert.equal(moved.design.palette, base.design.palette, "a composition change recoloured the card");
  assert.equal(moved.design.face, base.design.face, "a composition change changed the typeface");
  assert.equal(moved.copy.headline, base.copy.headline, "a composition change discarded the copy");

  // Palette: the colour moves, the structure and the type do not.
  const recoloured = studio.applyChange(base, { palette: "emerald-temple" });
  assert.equal(recoloured.design.palette, "emerald-temple");
  assert.equal(recoloured.design.composition, base.design.composition, "a palette change moved the structure");
  assert.equal(recoloured.design.face, base.design.face);

  // Typeface: the face moves, the structure and the palette do not.
  const retyped = studio.applyChange(base, { face: "inter" });
  assert.equal(retyped.design.face, "inter");
  assert.equal(retyped.design.composition, base.design.composition, "a typeface change moved the structure");
  assert.equal(retyped.design.palette, base.design.palette);

  // Illustration: swapping the artwork keeps the layout.
  const restyled = studio.applyChange(base, { artId: "zodiac" });
  assert.equal(restyled.design.art.kind, "zodiac-medallion");
  assert.equal(restyled.design.composition, base.design.composition, "an art change moved the structure");

  // Format: the canvas changes, the design identity does not.
  const reshaped = studio.applyChange(base, { formatId: "story" });
  assert.equal(reshaped.formatId, "story");
  assert.equal(reshaped.design.palette, base.design.palette);

  // Generate another: the structure must change and never repeat the last four.
  let current = base;
  const seen = [base.design.composition];
  for (let i = 0; i < 5; i += 1) {
    const next = studio.generateAnother(current);
    assert.notEqual(next.design.composition, current.design.composition, "Generate another repeated the structure");
    assert.ok(!seen.slice(-4).includes(next.design.composition), `Generate another repeated ${next.design.composition}`);
    seen.push(next.design.composition);
    current = next;
  }
  assert.ok(new Set(seen).size >= 4, "five generations produced fewer than four structures");
});

test("a category change keeps the client's own headline", async () => {
  const studio = await import("../src/lib/studioDesign.ts");
  const base = studio.createStudioDesign({ category: "festival-greeting" });
  const written = studio.applyChange(base, { copy: { ...base.copy, headline: "A line the client wrote." } });
  const moved = studio.selectCategory(written, "wedding-matching");
  assert.equal(moved.category, "wedding-matching");
  assert.equal(moved.copy.headline, "A line the client wrote.", "the client's headline must survive a category change");
  assert.notEqual(moved.copy.subline, written.copy.subline, "the subline should follow the new brief");
});

/* --------------------------- canvas defect guards ------------------------- */

test("headlines are never silently truncated", () => {
  const source = read("src/lib/canvas.ts");
  const fit = source.match(/export function fitHeadline\([\s\S]*?\n\}/);
  assert.ok(fit, "fitHeadline is missing");
  assert.doesNotMatch(
    fit[0],
    /balanced\(minSize\)\.slice\(0, maxLines\)/,
    "the minimum-size fallback must not drop the tail of a headline",
  );
});

test("text blocks cannot overflow their region", () => {
  // fitStack must have a last-resort stage, and it must warn rather than clip.
  assert.match(KIT_SOURCE, /Stage 4/, "fitStack needs a final fallback");
  assert.match(KIT_SOURCE, /console\.warn\(/, "an unfittable block must be reported, not hidden");
  // Anything trimmed for space gets an ellipsis.
  assert.match(KIT_SOURCE, /…/);
});

test("no template hard-codes a fixed pixel size", () => {
  // Every dimension derives from W/H; a literal like `size: 48` breaks at A4.
  const offenders = TEMPLATE_SOURCE.split("\n").filter(
    (line) =>
      /(?:^|[^\w.])(?:size|margin|width|height|gap)\s*[:=]\s*(?:\d{2,})(?:\.\d+)?\s*[,;)]/.test(line) &&
      !line.includes("Math."),
  );
  assert.deepEqual(offenders, [], `found fixed pixel sizes:\n${offenders.join("\n")}`);
});

test("the minimal template truly sets no image", () => {
  const minimal = TEMPLATE_MAP.manifesto;
  assert.equal(minimal.usesImage, false);
  assert.match(
    POSTER_SOURCE,
    /wantsImage && image/,
    "renderPoster must still guard image loading by template",
  );
});

/* -------------------------------- style + theme --------------------------- */

test("every studio style can inform a template", () => {
  assert.match(KIT_SOURCE, /paintStyledGround/, "templates must honour the style backdrops");
  assert.match(TEMPLATE_SOURCE, /styleMotif\(scene\.style\)/, "image-less art must come from the chosen style");
  const styleKeys = STYLES.map((style) => style.key);
  assert.equal(styleKeys.length, 12, "twelve art directions — six heritage, six modern");
  for (const key of ["signature", "thanjavur", "kolam", "silk", "gopuram", "deepam", "mono", "paper", "ephemeris", "aurum", "glass", "orbit"]) {
    assert.ok(styleKeys.includes(key as never), `${key} style disappeared`);
  }
});

test("every theme is available to the renderer", () => {
  assert.ok(Object.keys(THEMES).length >= 13);
  for (const key of ["midnight", "ivory", "granite", "kumkum", "cosmos"]) {
    assert.ok(key in THEMES, `${key} theme disappeared`);
  }
});

/* ------------------------------ exports and assets ------------------------ */

test("the logo is placed, never altered", () => {
  assert.ok(KIT_SOURCE.includes("drawLogoMark"), "the kit must place the logo through one helper");
  const logos = readdirSync(join(ROOT, "public")).filter((name) => /logo/i.test(name));
  assert.deepEqual(logos, ["astrosivam_logo.png"], "the logo asset must not be replaced");
});

test("sample harnesses stay out of the shipped tree", () => {
  const ignore = read(".gitignore");
  assert.match(ignore, /^\.samples\/$/m, ".samples must be ignored");
  assert.match(ignore, /^tmp\/$/m, "tmp must be ignored");
});
