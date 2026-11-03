import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv, makeCanvas } from "./tools/canvas-env.mjs";
installCanvasEnv();
const { renderLibraryDesign } = await import("./src/lib/libraryRender.ts");
const { DESIGN_LIBRARY } = await import("./src/data/library.ts");
const { loadImage } = await import("@napi-rs/canvas");
mkdirSync("tmp/layouts", { recursive: true });
const seen = new Set(); const picks = [];
for (const d of DESIGN_LIBRARY) { if (!seen.has(d.layout)) { seen.add(d.layout); picks.push(d); } }
const files = [];
for (const d of picks) {
  const c = await renderLibraryDesign({ design: d, width: 1080, height: 1350, scale: 1 });
  const p = `tmp/layouts/${d.layout}-${d.number}.png`;
  writeFileSync(p, c.toBuffer("image/png")); files.push([p, d.layout]);
}
const cols = 4, tile = 380, th = 475, gap = 16;
const sheet = makeCanvas(cols * (tile + gap) + gap, Math.ceil(files.length / cols) * (th + gap) + gap);
const ctx = sheet.getContext("2d");
ctx.fillStyle = "#141011"; ctx.fillRect(0, 0, sheet.width, sheet.height);
for (const [i, [p]] of files.entries()) {
  const img = await loadImage(p);
  const x = gap + (i % cols) * (tile + gap), y = gap + Math.floor(i / cols) * (th + gap);
  ctx.drawImage(img, x, y, tile, th);
}
writeFileSync("tmp/layouts/sheet.jpg", sheet.toBuffer("image/jpeg", 90));
console.log("layouts:", files.map((f) => f[1]).join(", "));
