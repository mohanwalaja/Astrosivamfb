/**
 * Render the v3 design system to `.samples/design/`.
 *
 *   npm run samples:v3              one poster per composition family
 *   npm run samples:v3 -- matrix    one poster per category × format
 *   npm run samples:v3 -- carousel  a five-card carousel
 *   npm run samples:v3 -- diversity 20 cards, anti-repeat audited
 *   npm run samples:v3 -- controls  the eight independent controls, proven
 *   npm run samples:v3 -- motion    one frame grid per animation preset
 *
 * This is the review harness: it writes real PNGs so the artwork can be judged
 * by eye, and it prints the design tuple for every card so a weak sample can be
 * reproduced exactly.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv } from "./canvas-env.mjs";

installCanvasEnv();
const { renderDesign } = await import("../src/design/render.ts");
const { designFromBrief, diversityRun } = await import("../src/design/engine.ts");
const { CATEGORIES, CATEGORY_MAP, CAROUSEL_SLIDES } = await import("../src/design/categories.ts");
const { COMPOSITIONS } = await import("../src/design/compositions.ts");
const { MOTION_PRESETS } = await import("../src/design/timeline.ts");

const OUT = ".samples/design";
mkdirSync(OUT, { recursive: true });

const save = async (name, spec, { width = 1080, height = 1350, copy, index, total, detail, motion } = {}) => {
  const category = CATEGORY_MAP[spec.category];
  const started = Date.now();
  const canvas = await renderDesign({
    spec,
    copy: copy ?? category.sample,
    width,
    height,
    scale: 1,
    showLogo: true,
    index,
    total,
    detail,
    motion,
  });
  writeFileSync(`${OUT}/${name}.png`, canvas.toBuffer("image/png"));
  console.log(
    `${name.padEnd(34)} ${`${width}x${height}`.padEnd(10)} ${spec.composition.padEnd(24)} ${spec.palette.padEnd(16)} ${Date.now() - started}ms`,
  );
};

const mode = process.argv[2] ?? "compositions";

if (mode === "compositions") {
  // One card per composition family, each on a category that suits it.
  const used = new Set();
  for (const composition of COMPOSITIONS) {
    const category = CATEGORIES.find((c) => c.compositions.includes(composition.key));
    const spec = designFromBrief({
      category: category.key,
      composition: composition.key,
      width: 1080,
      height: 1350,
      headline: category.sample.headline,
      subline: category.sample.subline,
      nonce: [...used].length,
    });
    used.add(composition.key);
    await save(`composition-${composition.key}`, spec);
  }
}

if (mode === "matrix") {
  const formats = [
    ["ig-post", 1080, 1350],
    ["ig-square", 1080, 1080],
    ["story", 1080, 1920],
    ["a4", 1748, 2480],
  ];
  let i = 0;
  for (const category of CATEGORIES) {
    for (const [id, width, height] of formats) {
      const spec = designFromBrief({
        category: category.key,
        width,
        height,
        nonce: i,
        headline: category.sample.headline,
        subline: category.sample.subline,
      });
      await save(`${category.key}-${id}`, spec, { width, height });
      i += 1;
    }
  }
}

if (mode === "carousel") {
  const base = designFromBrief({ category: "carousel", width: 1080, height: 1350, headline: CAROUSEL_SLIDES[0].headline });
  for (let i = 0; i < CAROUSEL_SLIDES.length; i += 1) {
    const spec = designFromBrief({
      category: "carousel",
      composition: ["luxury-editorial", "educational-infographic", "split-panel", "collage-asymmetric", "diagonal-dynamic"][i],
      palette: base.palette,
      face: base.face,
      width: 1080,
      height: 1350,
      nonce: i,
      headline: CAROUSEL_SLIDES[i].headline,
      subline: CAROUSEL_SLIDES[i].subline,
    });
    await save(`carousel-${i + 1}`, spec, { copy: CAROUSEL_SLIDES[i], index: i + 1, total: CAROUSEL_SLIDES.length });
  }
}

if (mode === "diversity") {
  const specs = diversityRun(CATEGORIES.map((c) => c.key), 20, { startSeed: 1 });
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    await save(`diversity-${String(i + 1).padStart(2, "0")}-${spec.category}`, spec);
  }
  const runs = specs.reduce((acc, s) => {
    if (!acc.length || acc[acc.length - 1].key !== s.composition) acc.push({ key: s.composition, count: 0 });
    acc[acc.length - 1].count += 1;
    return acc;
  }, []);
  console.log(`\n${specs.length} cards · ${new Set(specs.map((s) => s.composition)).size} distinct compositions`);
  console.log("longest run:", Math.max(...runs.map((r) => r.count)), JSON.stringify(runs));
}

/**
 * The eight independent controls, rendered rather than asserted: one base card,
 * then one card per control with only that control moved. The sheet is the proof
 * that changing a palette does not silently rebuild the composition.
 */
if (mode === "controls") {
  const studio = await import("../src/lib/studioDesign.ts");
  const base = studio.createStudioDesign({ category: "festival-greeting", formatId: "ig-post" });
  const render = async (state, name) => {
    const format = studio.formatById(state.formatId);
    const started = Date.now();
    const canvas = await renderDesign({
      spec: state.design,
      copy: state.copy,
      width: format.width,
      height: format.height,
      scale: 1,
      showLogo: state.showLogo,
      detail: state.decoration,
    });
    writeFileSync(`${OUT}/${name}.png`, canvas.toBuffer("image/png"));
    console.log(
      `${name.padEnd(30)} ${String(format.width + "x" + format.height).padEnd(10)} ${state.design.composition.padEnd(24)} ${state.design.palette.padEnd(16)} ${state.design.face.padEnd(11)} ${state.decoration.padEnd(9)} ${Date.now() - started}ms`,
    );
  };
  const steps = [
    ["controls-00-base", {}],
    ["controls-01-composition", { composition: "luxury-editorial" }],
    ["controls-02-palette", { palette: "emerald-temple" }],
    ["controls-03-face", { face: "inter" }],
    ["controls-04-art", { artId: "zodiac" }],
    ["controls-05-decoration-quiet", { decoration: "quiet" }],
    ["controls-06-decoration-rich", { decoration: "rich" }],
    ["controls-07-motion-cosmic", { motion: "cosmic" }],
    ["controls-08-format-story", { formatId: "story" }],
    ["controls-09-format-square", { formatId: "ig-square" }],
  ];
  for (const [name, patch] of steps) {
    await render(studio.applyChange(base, patch), name);
  }
  console.log("\nbase:", base.design.composition, base.design.palette, base.design.face);
}

/** One row of frames per animation preset, so every motion can be judged. */
if (mode === "motion") {
  const spec = designFromBrief({ category: "devotional", width: 1080, height: 1350, nonce: 3 });
  const category = CATEGORY_MAP[spec.category];
  for (const preset of MOTION_PRESETS) {
    for (const at of [0, 0.2, 0.4, 0.65, 1]) {
      const canvas = await renderDesign({
        spec,
        copy: category.sample,
        width: 1080,
        height: 1350,
        scale: 1,
        showLogo: true,
        motion: preset.state(at),
      });
      writeFileSync(`${OUT}/motion-${preset.key}-${String(Math.round(at * 100)).padStart(3, "0")}.png`, canvas.toBuffer("image/png"));
    }
    console.log(`motion-${preset.key.padEnd(11)} ${preset.seconds}s · ${preset.name} · ${preset.note}`);
  }
}
