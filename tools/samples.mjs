/**
 * Render one representative poster per template to `.samples/`.
 *
 *   npm run samples
 *
 * Legacy-template contact sheet: eight 1080 × 1350 posts, plus a story and an
 * A4 sheet. The twelve new composition systems are audited by
 * `npx tsx tools/design-samples.mjs`.
 * Output is git-ignored — it is a review tool, not a shipped asset.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv } from "./canvas-env.mjs";

installCanvasEnv();
const { renderPoster } = await import("../src/lib/poster.ts");
const { LEGACY_TEMPLATES: TEMPLATES } = await import("../src/data/posterTemplates.ts");

const OUT = ".samples/samples";
mkdirSync(OUT, { recursive: true });

const copy = {
  kicker: "Jathagam",
  headline: "Your life, mapped from the moment you were born.",
  tamil: "",
  hindi: "",
  subline: "Lahiri sidereal calculations · reviewed by a priest · 7 days of chat support.",
  cta: "astrosivam.com",
  footer: "Astro Sivam · Vedic astrology, Chennai",
};

const THEME_FOR = {
  mandapam: "saffron",
  gallery: "sand",
  manifesto: "ink",
  nocturne: "lunar",
  lesson: "sand",
  offer: "kumkum",
  blessing: "granite",
  sequence: "midnight",
};

const STYLE_FOR = {
  mandapam: "gopuram",
  gallery: "paper",
  manifesto: "mono",
  nocturne: "glass",
  lesson: "paper",
  offer: "thanjavur",
  blessing: "deepam",
  sequence: "signature",
};

const render = async (name, options) => {
  const started = Date.now();
  const canvas = await renderPoster(options);
  writeFileSync(`${OUT}/${name}.png`, canvas.toBuffer("image/png"));
  console.log(`${name.padEnd(30)} ${`${canvas.width}×${canvas.height}`.padEnd(11)} ${Date.now() - started} ms`);
  return canvas;
};

for (const template of TEMPLATES) {
  await render(`${template.key}-1080x1350`, {
    width: 1080,
    height: 1350,
    themeKey: THEME_FOR[template.key],
    style: STYLE_FOR[template.key],
    layout: template.defaultLayout,
    template: template.key,
    display: template.key === "gallery" || template.key === "manifesto" ? "cormorant" : template.key === "lesson" || template.key === "offer" ? "inter" : template.key === "nocturne" ? "playfair" : "cinzel",
    script: "serif",
    image: template.usesImage ? "/deities/ganesha.jpg" : null,
    imageFit: template.key === "festival" ? "circle" : "arch",
    ...copy,
    showLogo: true,
    scale: 1,
  });
}

// Two proof sheets: the composition must survive a story and a print format.
for (const [template, width, height, tag] of [
  ["mandapam", 1080, 1920, "story"],
  ["gallery", 2480, 3508, "a4"],
]) {
  await render(`${template}-${tag}`, {
    width,
    height,
    themeKey: THEME_FOR[template],
    style: STYLE_FOR[template],
    layout: template === "mandapam" ? "portrait-arch" : "split",
    template,
    display: "cinzel",
    script: "serif",
    image: "/deities/ganesha.jpg",
    imageFit: "arch",
    ...copy,
    showLogo: true,
    scale: 1,
  });
}

console.log(`\nWrote ${TEMPLATES.length + 2} posters to ${OUT}/`);
