#!/usr/bin/env node
/**
 * Renders the 150-design library to PNG and audits every plate.
 *
 *   npx tsx tools/design-library.mjs
 *
 * Output, under `posters/design-library/`:
 *   <category>/<number>-<slug>.png   one file per design at 1080 × 1350
 *   contact-sheet-<category>.jpg     one sheet per category for sign-off
 *   contact-sheet-all.jpg            the whole library on one page
 *   index.md                         the catalogue: every design and its recipe
 *   audit.json                       legibility, overflow and contrast per plate
 *
 * Generated posters are deliverables, not build output — `posters/` is kept in
 * the repo on purpose so the library can be posted without running the studio.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv, makeCanvas } from "./canvas-env.mjs";

installCanvasEnv();
const { renderLibraryDesign, getLibraryAudit } = await import("../src/lib/libraryRender.ts");
const { DESIGN_LIBRARY, CATEGORY_META, LAYOUT_LABEL, TYPE_LABEL } = await import("../src/data/library.ts");
const { THEMES } = await import("../src/data/brand.ts");
const { loadImage } = await import("@napi-rs/canvas");

const OUT = "posters/design-library";
const FEED = { width: 1080, height: 1350 };

mkdirSync(OUT, { recursive: true });

const rows = [];
const files = new Map();

for (const design of DESIGN_LIBRARY) {
  const dir = `${OUT}/${design.category}`;
  mkdirSync(dir, { recursive: true });
  const started = Date.now();
  const canvas = await renderLibraryDesign({ design, ...FEED, scale: 1 });
  const audit = getLibraryAudit(canvas);
  const name = `${String(design.number).padStart(3, "0")}-${design.id.split("-").slice(2).join("-")}`;
  writeFileSync(`${dir}/${name}.png`, canvas.toBuffer("image/png"));
  files.set(design.id, { dir, name });
  const row = {
    number: design.number,
    id: design.id,
    name: design.name,
    category: design.category,
    register: design.register,
    layout: design.layout,
    theme: design.theme,
    type: design.type,
    background: design.background,
    frame: design.frame,
    ornament: design.ornament,
    art: design.art,
    ms: Date.now() - started,
    smallest: Math.round((audit?.smallest ?? 0) * 10) / 10,
    passes: audit?.passes ?? false,
    overflow: audit?.overflow ?? [],
    lowContrast: audit?.lowContrast ?? [],
  };
  rows.push(row);
  if (!row.passes) {
    const reasons = [...row.overflow, ...row.lowContrast.map((item) => `contrast ${item.ratio} ${item.role}: ${item.text}`)];
    console.log(`FAIL ${name}  ${reasons.join(" | ")}`);
  }
}

/* --------------------------------- sheets --------------------------------- */
async function sheet(list, path, cols, tile) {
  const gap = 14;
  const th = Math.round(tile * 1.25);
  const label = 26;
  const canvas = makeCanvas(cols * (tile + gap) + gap, Math.ceil(list.length / cols) * (th + label + gap) + gap);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#141011";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [index, design] of list.entries()) {
    const entry = files.get(design.id);
    const img = await loadImage(`${entry.dir}/${entry.name}.png`);
    const x = gap + (index % cols) * (tile + gap);
    const y = gap + Math.floor(index / cols) * (th + label + gap);
    const scale = Math.min(tile / img.width, th / img.height);
    ctx.drawImage(img, x + (tile - img.width * scale) / 2, y, img.width * scale, img.height * scale);
    ctx.fillStyle = "#E8DDCB";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${design.number} ${design.name}`.slice(0, 42), x, y + th + 16);
  }
  writeFileSync(path, canvas.toBuffer("image/jpeg", 88));
}

for (const category of Object.keys(CATEGORY_META)) {
  await sheet(DESIGN_LIBRARY.filter((item) => item.category === category), `${OUT}/contact-sheet-${category}.jpg`, 5, 220);
}
await sheet(DESIGN_LIBRARY, `${OUT}/contact-sheet-all.jpg`, 10, 200);

/* --------------------------------- index ---------------------------------- */
const md = [
  "# The design library — 150 art directions",
  "",
  "Two registers, one brand: 75 traditional and 75 modern designs, grouped by the service they were drawn for.",
  "A design is a curated recipe — layout × palette × type × background × frame × ornament × art treatment.",
  "Prices, promises and facts come from `src/data/services`; nothing on a plate is invented by the renderer.",
  "",
  `**Total:** ${DESIGN_LIBRARY.length} · **Traditional:** ${rows.filter((r) => r.register === "traditional").length} · **Modern:** ${rows.filter((r) => r.register === "modern").length} · **Audit failures:** ${rows.filter((r) => !r.passes).length}`,
  "",
];
for (const category of Object.keys(CATEGORY_META)) {
  const list = rows.filter((row) => row.category === category);
  md.push(`## ${CATEGORY_META[category].label} — ${list.length} designs`, "");
  md.push("| # | Design | Register | Layout | Palette | Type | Background | Frame | Ornament | Art |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of list) {
    md.push(
      `| ${row.number} | ${row.name} | ${row.register} | ${LAYOUT_LABEL[row.layout]} | ${THEMES[row.theme].name} | ${TYPE_LABEL[row.type].split(" · ")[0]} | ${row.background} | ${row.frame} | ${row.ornament} | ${row.art} |`,
    );
  }
  md.push("");
}
writeFileSync(`${OUT}/index.md`, md.join("\n"));

const failures = rows.filter((row) => !row.passes);
writeFileSync(`${OUT}/audit.json`, JSON.stringify({ count: rows.length, failures: failures.length, designs: rows }, null, 2));
console.log(`\nRendered ${rows.length} designs to ${OUT}. Failures: ${failures.length}`);
if (failures.length) process.exitCode = 1;
