import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { TEMPLATES, TEMPLATE_MAP, LEGACY_TEMPLATES } from "../src/data/posterTemplates.ts";
import { COMPOSITIONS } from "../src/data/designBriefs.ts";
import { LAYOUT_TEMPLATE, layoutForTemplate, templateForLayout } from "../src/data/posterTemplates.ts";
import { STYLES, THEMES } from "../src/data/brand.ts";
import type { PosterLayout, PosterTemplate } from "../src/types.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const camel = (key: string) => key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const TEMPLATE_SOURCE = read("src/lib/posterTemplates.ts");
const COMPOSITION_SOURCE = read("src/lib/compositionRender.ts");
const POSTER_SOURCE = read("src/lib/poster.ts");
const KIT_SOURCE = read("src/lib/posterKit.ts");
const STUDIO_SOURCE = read("src/components/PosterStudio.tsx");

/* ------------------------------- the eight -------------------------------- */

const REQUIRED: PosterTemplate[] = ["mandapam", "gallery", "manifesto", "nocturne", "lesson", "offer", "blessing", "sequence"];

test("the studio keeps the eight legacy templates and adds twelve composition systems", () => {
  assert.deepEqual(LEGACY_TEMPLATES.map((t) => t.key).sort(), [...REQUIRED].sort());
  assert.equal(COMPOSITIONS.length, 12);
  assert.equal(TEMPLATES.length, REQUIRED.length + COMPOSITIONS.length);
  // Every template has its own painter — not a branch inside a shared skeleton.
  for (const key of REQUIRED) {
    const painter = TEMPLATE_SOURCE.match(new RegExp(`function ${camel(key)}\\(`));
    assert.ok(painter, `${key} has no painter function of its own`);
  }
  assert.equal(new Set(TEMPLATES.map((template) => template.key)).size, TEMPLATES.length);
  for (const item of COMPOSITIONS) assert.match(COMPOSITION_SOURCE, new RegExp(`function paint${item.key[0].toUpperCase()}${item.key.slice(1)}\\(`), `${item.key} needs its own painter`);
});

test("each template documents a distinct composition", () => {
  const compositions = TEMPLATES.map((template) => template.composition);
  assert.equal(new Set(compositions).size, TEMPLATES.length, "two templates share a composition description");
  for (const template of TEMPLATES) {
    assert.ok(template.name.length > 3, `${template.key} needs a name`);
    assert.ok(template.description.length > 60, `${template.key} needs a real description`);
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

test("the studio keeps every editing control and hands layout to the design library", () => {
  for (const control of [
    'set("headline"',
    'set("subline"',
    'set("kicker"',
    'set("cta"',
    'set("footer"',
    'set("themeKey"',
    'set("style"',
    'set("display"',
    'set("serviceTitle"',
    'set("facts"',
    'set("showLogo"',
  ]) {
    assert.ok(STUDIO_SOURCE.includes(control), `the studio lost its ${control} control`);
  }
  assert.ok(STUDIO_SOURCE.includes("useDeity"), "the deity library must stay");
  assert.ok(STUDIO_SOURCE.includes("onUpload"), "image upload must stay");
  assert.ok(STUDIO_SOURCE.includes("chooseFormat"), "format switching must stay");
  assert.ok(STUDIO_SOURCE.includes("renderPoster({ ...state, scale: 1 })"), "full-resolution export must stay");
  // The twelve art directions are gone; the 150-design library owns layout.
  assert.doesNotMatch(STUDIO_SOURCE, /COMPOSITIONS\.map/, "the twelve composition picker must be gone");
  assert.ok(STUDIO_SOURCE.includes("getDesign"), "the studio must read the chosen library design");
  assert.ok(STUDIO_SOURCE.includes('onNavigate?.("designs")'), "the studio must link to the design library");
  assert.ok(STUDIO_SOURCE.includes("designId"), "library designs must be addressable from studio state");
  assert.ok(STUDIO_SOURCE.includes("LEGACY_TEMPLATES.map"), "legacy templates remain reachable");
  assert.ok(STUDIO_SOURCE.includes("aria-pressed"), "template choices must expose their pressed state");
  assert.ok(STUDIO_SOURCE.includes("TemplateGlyph"), "templates need a visual wireframe, not just a label");
});

test("a template switch never discards the client's work", () => {
  const match = STUDIO_SOURCE.match(/const selectTemplate = \(key: PosterTemplate\) => ([^\n]+);/);
  assert.ok(match, "selectTemplate is missing");
  // Only the template and the legacy layout may change on a template switch.
  assert.match(match[1], /template: key/);
  assert.doesNotMatch(match[1], /themeKey|image:|headline:|tamil:|hindi:|subline:/);
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
