import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { installCanvasEnv } from "../tools/canvas-env.mjs";
import { TEMPLATES, LEGACY_TEMPLATE, resolveTemplate } from "../src/data/posterTemplates.ts";
import { HERITAGE_STYLES, MODERN_STYLES, THEMES } from "../src/data/brand.ts";
import { DISPLAY_FONTS, SCRIPT_FONTS } from "../src/lib/poster.ts";
import { migrateState } from "../src/lib/studioState.ts";

installCanvasEnv();

const ROOT = new URL("..", import.meta.url).pathname;
const CSS = readFileSync(`${ROOT}src/fonts.css`, "utf8");

test("the curated headline and script sets ship their font files locally", () => {
  assert.deepEqual(DISPLAY_FONTS.map((f) => f.key), ["cinzel", "cormorant", "playfair", "inter"]);
  assert.deepEqual(SCRIPT_FONTS.map((f) => f.key), ["serif", "sans", "festive"]);
  for (const family of ["Cormorant Garamond", "Playfair Display", "Inter Tight", "Noto Serif Tamil", "Noto Serif Devanagari", "Hind Madurai", "Hind"]) {
    assert.match(CSS, new RegExp(`font-family: "${family}"`), `${family} needs an @font-face`);
  }
  const files = [...CSS.matchAll(/url\("\.\/assets\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
  for (const file of files) assert.ok(existsSync(`${ROOT}src/assets/fonts/${file}`), `${file} is referenced but missing`);
});

test("the poster studio offers twelve palettes — one per art direction", () => {
  const keys = [...HERITAGE_STYLES, ...MODERN_STYLES].map((s) => s.defaultTheme);
  assert.equal(keys.length, 12);
  assert.equal(new Set(keys).size, 12, "two directions share a palette");
  for (const key of keys) assert.ok(THEMES[key], `${key} palette missing`);
});

test("saved posters from the previous studio migrate forward", () => {
  for (const [legacy, next] of Object.entries(LEGACY_TEMPLATE)) {
    assert.equal(resolveTemplate(legacy), next);
    assert.ok(TEMPLATES.some((t) => t.key === next), `${legacy} maps to unknown ${next}`);
  }
  const migrated = migrateState({ template: "heritage" as never, script: "classic" as never, display: "marcellus" as never, headline: "Keep me" });
  assert.equal(migrated.template, "mandapam");
  assert.equal(migrated.script, "serif");
  assert.equal(migrated.display, "cormorant");
  assert.equal(migrated.headline, "Keep me");
});

test("every template renders in every format with every curated font pairing", async () => {
  const { renderPoster } = await import("../src/lib/poster.ts");
  const formats = [
    [1080, 1350],
    [1080, 1080],
    [1080, 1920],
  ] as const;
  for (const template of TEMPLATES) {
    for (const [width, height] of formats) {
      for (const display of DISPLAY_FONTS) {
        const canvas = await renderPoster({
          width,
          height,
          themeKey: template.defaultTheme,
          style: template.family === "Heritage" ? "gopuram" : "mono",
          layout: template.defaultLayout,
          template: template.key,
          display: display.key,
          script: "serif",
          image: null,
          imageFit: "arch",
          category: "birth",
          occasion: "discover",
          serviceTitle: "Birth Jathagam",
          facts: ["Rasi and Navamsa charts", "Vimshottari dasa timeline", "Personal astrologer chat"],
          kicker: "Jathagam",
          headline: "Your life, mapped from the moment you were born.",
          tamil: "",
          hindi: "",
          subline: "Lahiri sidereal calculations · reviewed by a priest · 7 days of chat support.",
          cta: "astrosivam.com",
          footer: "astrosivam.com",
          showLogo: true,
          scale: 0.25,
        });
        assert.equal(canvas.width, Math.round(width * 0.25), `${template.key} ${width}×${height} ${display.key}`);
      }
    }
  }
});
