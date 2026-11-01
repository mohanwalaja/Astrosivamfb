/**
 * Render the redesigned poster system into a review gallery.
 *
 *   npm run gallery
 *
 * Writes to `.samples/premium/` (git-ignored): the eight compositions at feed
 * size, every composition variation, the category art directions, stress
 * cases (long copy, Tamil-only, missing fields), the other aspect ratios and
 * four-frame motion strips proving the animation pipeline. A review tool, not
 * a shipped asset.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv } from "./canvas-env.mjs";

installCanvasEnv();
const { renderPoster, renderPosterLayers } = await import("../src/lib/poster.ts");
const { TEMPLATES } = await import("../src/data/posterTemplates.ts");
const { CATEGORY_DIRECTIONS } = await import("../src/data/categoryDirection.ts");
const { paintMotionFrame } = await import("../src/lib/motion.ts");
const { THEMES } = await import("../src/data/brand.ts");

const OUT = ".samples/premium";
mkdirSync(OUT, { recursive: true });

const copy = {
  kicker: "Jathagam",
  headline: "Your life, mapped from the moment you were born.",
  tamil: "உங்கள் ஜாதகம்",
  hindi: "आपकी जन्म कुंडली",
  subline: "Lahiri sidereal calculations · reviewed by a priest · 7 days of chat support.",
  cta: "astrosivam.com",
  footer: "Astro Sivam · Vedic astrology, Chennai",
};

const save = (canvas, name) => writeFileSync(`${OUT}/${name}.png`, canvas.toBuffer("image/png"));

const render = async (name, options) => {
  const started = Date.now();
  const canvas = await renderPoster({ scale: 1, showLogo: true, ...copy, ...options });
  save(canvas, name);
  console.log(`${name.padEnd(42)} ${`${canvas.width}×${canvas.height}`.padEnd(11)} ${Date.now() - started} ms`);
  return canvas;
};

/* 1 — the eight compositions, each on its own direction */
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
for (const template of TEMPLATES) {
  await render(`01-${template.key}`, {
    width: 1080,
    height: 1350,
    themeKey: THEME_FOR[template.key],
    style: "signature",
    layout: template.defaultLayout,
    template: template.key,
    display: template.key === "lesson" || template.key === "offer" ? "inter" : template.key === "gallery" ? "cormorant" : "cinzel",
    script: "serif",
    image: template.usesImage ? "/deities/ganesha.jpg" : null,
    imageFit: "arch",
  });
}

/* 2 — every variation of every composition */
for (const template of TEMPLATES) {
  for (let variation = 1; variation < template.variations; variation += 1) {
    await render(`02-${template.key}-v${variation}`, {
      width: 1080,
      height: 1350,
      themeKey: THEME_FOR[template.key],
      style: "signature",
      layout: template.defaultLayout,
      template: template.key,
      display: "cinzel",
      script: "serif",
      image: template.usesImage ? "/deities/lakshmi.jpg" : null,
      imageFit: "arch",
      variation,
    });
  }
}

/* 3 — category art directions */
for (const direction of CATEGORY_DIRECTIONS) {
  await render(`03-cat-${direction.key}`, {
    width: 1080,
    height: 1350,
    themeKey: direction.themeKey,
    style: "signature",
    layout: "split",
    template: direction.template,
    display: direction.display,
    script: direction.script,
    variation: direction.variation,
    artScene: direction.artScene,
    category: direction.key,
    image: direction.template === "manifesto" ? null : "/deities/murugan.jpg",
    imageFit: "arch",
    kicker: direction.label,
  });
}

/* 4 — stress cases */
await render("04-stress-long", {
  width: 1080,
  height: 1350,
  themeKey: "kumkum",
  style: "signature",
  layout: "split",
  template: "offer",
  display: "inter",
  script: "sans",
  image: "/deities/durga.jpg",
  imageFit: "arch",
  headline: "Comprehensive marriage compatibility reading with porutham analysis, remedial guidance and a follow-up consultation scheduled around your family's convenience.",
  subline: "Ten-point porutham score · dasha overlap review · muhurtham window shortlist · remedial gemstone and mantra guidance · priest-reviewed report · lifetime record access.",
});
await render("04-stress-tamil", {
  width: 1080,
  height: 1350,
  themeKey: "saffron",
  style: "signature",
  layout: "portrait-arch",
  template: "mandapam",
  display: "cinzel",
  script: "serif",
  image: "/deities/meenakshi.jpg",
  imageFit: "arch",
  kicker: "திருமண பொருத்தம்",
  headline: "திருமண பொருத்தம் பத்து விதமான பொருத்தங்களுடன் முழுமையாக ஆய்வு செய்யப்படும்.",
  tamil: "உங்கள் ஜாதக பொருத்தம்",
  hindi: "",
  subline: "லஹிரி சிடீரியல் கணக்கீடு · பூசாரியால் சரிபார்க்கப்பட்டது · ஏழு நாள் ஆதரவு.",
  cta: "astrosivam.com",
});
await render("04-stress-missing", {
  width: 1080,
  height: 1350,
  themeKey: "midnight",
  style: "signature",
  layout: "full-bleed",
  template: "nocturne",
  display: "playfair",
  script: "serif",
  image: null,
  imageFit: "full",
  headline: "Saturn turns direct.",
  tamil: "",
  hindi: "",
  subline: "",
  cta: "",
  footer: "",
  showLogo: false,
});
await render("04-stress-square-lesson", {
  width: 1080,
  height: 1080,
  themeKey: "sand",
  style: "signature",
  layout: "split",
  template: "lesson",
  display: "inter",
  script: "sans",
  image: null,
  imageFit: "circle",
});
await render("04-stress-story-blessing", {
  width: 1080,
  height: 1920,
  themeKey: "granite",
  style: "signature",
  layout: "medallion",
  template: "blessing",
  display: "baloo",
  script: "festive",
  image: "/deities/lakshmi.jpg",
  imageFit: "circle",
  headline: "Deepavali Nalvazhthukal",
  tamil: "தீபாவளி நல்வாழ்த்துகள்",
  hindi: "दीपावली शुभकामनाएँ",
});
await render("04-stress-a4-gallery", {
  width: 2480,
  height: 3508,
  themeKey: "sand",
  style: "signature",
  layout: "split",
  template: "gallery",
  display: "cormorant",
  script: "serif",
  image: "/deities/shiva.jpg",
  imageFit: "square",
});

/* 5 — motion strips: four frames across the choreography */
const motionCases = [
  ["nocturne", "lunar", "cosmic", null],
  ["blessing", "granite", "aura", "/deities/lakshmi.jpg"],
  ["offer", "kumkum", "deco", "/deities/ganesha.jpg"],
];
for (const [template, themeKey, artScene, image] of motionCases) {
  const poster = {
    width: 540,
    height: 675,
    themeKey,
    style: "signature",
    layout: "split",
    template,
    display: "cinzel",
    script: "serif",
    image,
    imageFit: "arch",
    artScene,
    ...copy,
    showLogo: true,
  };
  const { layers, manifest } = await renderPosterLayers(poster);
  const times = [0.15, 0.8, 1.6, 3.4];
  for (const t of times) {
    const canvas = document.createElement("canvas");
    canvas.width = 540;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");
    paintMotionFrame({ ctx, layers, manifest, template, theme: THEMES[themeKey], t });
    save(canvas, `05-motion-${template}-t${String(t).replace(".", "_")}`);
  }
  console.log(`05-motion-${template} · 4 frames`);
}

console.log(`\nGallery written to ${OUT}/`);
