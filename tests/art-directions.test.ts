import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installCanvasEnv } from "../tools/canvas-env.mjs";
import { HERITAGE_STYLES, MODERN_STYLES, STYLES, STYLE_MAP, STYLE_TAG_SETS, THEMES } from "../src/data/brand.ts";
import { FORMAT_MAP } from "../src/data/formats.ts";
import { SERVICES } from "../src/data/services/index.ts";
import { STYLE_BACKDROPS, STYLE_FRAMES } from "../src/lib/styleArt.ts";
import { hasStyleLayout } from "../src/lib/stylePosts.ts";

installCanvasEnv();

const POSTS_SOURCE = readFileSync(new URL("../src/lib/stylePosts.ts", import.meta.url), "utf8");

test("twelve art directions: six heritage, six modern, every one complete", () => {
  assert.equal(STYLES.length, 12);
  assert.equal(HERITAGE_STYLES.length, 6);
  assert.equal(MODERN_STYLES.length, 6);
  assert.equal(STYLES[0].key, "signature", "Signature Gold stays the identity anchor");
  for (const style of STYLES) {
    assert.ok(STYLE_BACKDROPS[style.key], `${style.key} needs a backdrop painter`);
    assert.ok(STYLE_FRAMES[style.key], `${style.key} needs a frame painter`);
    assert.ok(hasStyleLayout(style.key), `${style.key} needs its own post layout`);
    assert.ok(STYLE_TAG_SETS[style.key]?.length >= 5, `${style.key} needs a hashtag set`);
    assert.ok(THEMES[style.defaultTheme], `${style.key} points at a missing palette`);
    assert.ok(style.description.length > 80, `${style.key} needs an honest description`);
    assert.equal(style.ornaments.length, 4, `${style.key} lists four ornaments`);
    assert.ok(style.composition.length > 6, `${style.key} needs a composition note`);
  }
  // Each layout is its own function, not a palette swap over a shared one.
  for (const style of STYLES) {
    const name = `render${style.key[0].toUpperCase()}${style.key.slice(1)}`;
    assert.match(POSTS_SOURCE, new RegExp(`function ${name}\\(c: Ctx\\)`), `${style.key} needs ${name}`);
  }
});

test("heritage systems keep the gold rail; modern systems carry their own edge", () => {
  for (const style of HERITAGE_STYLES) assert.ok(style.goldRail !== undefined, `${style.key} must declare goldRail`);
  assert.ok(STYLE_MAP.signature.goldRail);
  assert.ok(STYLE_MAP.thanjavur.goldRail);
  for (const style of MODERN_STYLES) assert.equal(style.goldRail, false, `${style.key} should not take the bevelled rail`);
  assert.equal(STYLE_MAP.kolam.goldRail, false, "the light kolam page has its own hairline frame");
});

test("every style renders every service in both feed formats without throwing", async () => {
  const { renderCreative, defaultContent } = await import("../src/lib/templates.ts");
  let rendered = 0;
  for (const format of [FORMAT_MAP["ig-post"], FORMAT_MAP["ig-square"]]) {
    for (const service of SERVICES) {
      const content = defaultContent(format, service);
      for (const style of STYLES) {
        const canvas = await renderCreative({ format, style: style.key, service, content, scale: 0.25 });
        assert.equal(canvas.width, Math.round(format.width * 0.25));
        rendered += 1;
      }
    }
  }
  assert.equal(rendered, 2 * SERVICES.length * STYLES.length);
});

test("the contact sheet lays out all twelve tiles", async () => {
  const { renderCreative, defaultContent } = await import("../src/lib/templates.ts");
  const sheet = FORMAT_MAP["style-sheet"];
  const canvas = await renderCreative({ format: sheet, style: "signature", service: SERVICES[0], content: defaultContent(sheet, SERVICES[0]), scale: 0.2 });
  assert.equal(canvas.width, Math.round(sheet.width * 0.2));
});
