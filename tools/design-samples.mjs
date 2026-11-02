/** Real render audit for the upgraded composition engine. Outputs git-ignored PNGs + JSON. */
import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv, makeCanvas } from "./canvas-env.mjs";
installCanvasEnv();
const { renderPoster } = await import("../src/lib/poster.ts");
const { getDesignAudit } = await import("../src/lib/compositionRender.ts");
const { DESIGN_BRIEFS, COMPOSITIONS, getOccasion } = await import("../src/data/designBriefs.ts");
const { selectDesign } = await import("../src/lib/designSelector.ts");
const { planSignature } = await import("../src/lib/compositionPlan.ts");
const OUT = ".samples/design-upgrade";
mkdirSync(OUT, { recursive: true });
const samples = [];
let history = [];
const base = (brief, occasion, width = 1080, height = 1350) => ({
  width, height, themeKey: brief.theme, style: brief.style, display: brief.display, script: "serif", layout: "split",
  category: brief.key, occasion: occasion.key, image: occasion.image ?? brief.image, imageIsLibrary: true, imageFit: "full",
  kicker: occasion.copy.kicker, serviceTitle: occasion.copy.serviceTitle, headline: occasion.copy.headline, tamil: "", hindi: "",
  subline: occasion.copy.subline, facts: occasion.copy.facts, cta: occasion.copy.cta, footer: "astrosivam.com", showLogo: true,
});
async function render(name, options) {
  const start = Date.now();
  const canvas = await renderPoster({ ...options, scale: 1 });
  const audit = getDesignAudit(canvas);
  writeFileSync(`${OUT}/${name}.png`, canvas.toBuffer("image/png"));
  const row = { name, composition: options.template, category: options.category, occasion: options.occasion, width: options.width, height: options.height,
    ms: Date.now() - start, signature: planSignature(audit.plan), textLines: audit.text.length,
    smallestHeadline: audit.legibility.smallestHeadline, legibilityPass: audit.legibility.passes,
    failing: audit.legibility.failing, overflow: audit.overflow };
  samples.push(row);
  console.log(`${name.padEnd(42)} ${options.template.padEnd(12)} ${row.legibilityPass ? "PASS" : "FAIL"} ${row.ms}ms`);
  return canvas;
}
for (const brief of DESIGN_BRIEFS) {
  for (const occasion of brief.occasions) {
    const selection = selectDesign({ category: brief.key, occasion: occasion.key, width: 1080, height: 1350, headline: occasion.copy.headline, subline: occasion.copy.subline, seed: 1000 + samples.length * 73 }, history);
    history = [...history, { composition: selection.composition, category: brief.key, seed: selection.seed, at: samples.length }];
    await render(`${String(samples.length + 1).padStart(2, "0")}-${brief.key}-${occasion.key}`, { ...base(brief, occasion), template: selection.composition, seed: selection.seed });
  }
}
// Extra format proofs.
for (const [briefKey, occasionKey, width, height] of [["birth", "discover", 1200, 628], ["wedding", "matching", 1080, 1080], ["murugan", "devotion", 1080, 1920]]) {
  const brief = DESIGN_BRIEFS.find((b) => b.key === briefKey), occasion = getOccasion(briefKey, occasionKey);
  const selection = selectDesign({ category: briefKey, occasion: occasionKey, width, height, seed: 5000 + samples.length }, history);
  history = [...history, { composition: selection.composition, category: briefKey, seed: selection.seed, at: samples.length }];
  await render(`${String(samples.length + 1).padStart(2, "0")}-${briefKey}-${width}x${height}`, { ...base(brief, occasion, width, height), template: selection.composition, seed: selection.seed });
}
// Every composition system, same brief, to compare structure rather than colour.
const brief = DESIGN_BRIEFS[0], occasion = brief.occasions[0];
for (const composition of COMPOSITIONS) {
  await render(`system-${composition.key}`, { ...base(brief, occasion), template: composition.key, seed: 42 });
}
writeFileSync(`${OUT}/audit.json`, JSON.stringify({ count: samples.length, failures: samples.filter((s) => !s.legibilityPass || s.overflow.length), samples }, null, 2));
// Contact sheets from the actual exported PNGs.
const { loadImage } = await import("@napi-rs/canvas");
async function sheet(files, name, cols = 4) {
  const tw = 300, th = 375, gap = 16, label = 34;
  const rows = Math.ceil(files.length / cols);
  const canvas = makeCanvas(cols * (tw + gap) + gap, rows * (th + label + gap) + gap);
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#141011"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < files.length; i++) {
    const img = await loadImage(`${OUT}/${files[i]}.png`);
    const x = gap + (i % cols) * (tw + gap), y = gap + Math.floor(i / cols) * (th + label + gap);
    const scale = Math.min(tw / img.width, th / img.height); const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, x + (tw - w) / 2, y + (th - h) / 2, w, h);
    ctx.fillStyle = "#E8DDCB"; ctx.font = "13px sans-serif"; ctx.fillText(files[i].slice(0, 40), x, y + th + 20);
  }
  writeFileSync(`${OUT}/${name}`, canvas.toBuffer("image/jpeg", 88));
}
await sheet(samples.slice(0, 24).map((s) => s.name), "contact-sheet-24.jpg");
await sheet(COMPOSITIONS.map((c) => `system-${c.key}`), "contact-sheet-12-systems.jpg");
console.log(`\nWrote ${samples.length} posters. Failures: ${samples.filter((s) => !s.legibilityPass || s.overflow.length).length}`);
