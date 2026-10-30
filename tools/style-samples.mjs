/**
 * Render every service-post art direction to `.samples/styles/` for review.
 *   npx tsx tools/style-samples.mjs [serviceId] [formatId]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv } from "./canvas-env.mjs";

installCanvasEnv();
const { renderCreative, defaultContent } = await import("../src/lib/templates.ts");
const { STYLES } = await import("../src/data/brand.ts");
const { FORMAT_MAP } = await import("../src/data/formats.ts");
const { getService } = await import("../src/data/services/index.ts");

const serviceId = process.argv[2] ?? "jathagam";
const formatId = process.argv[3] ?? "ig-post";
const only = process.argv[4];
const OUT = ".samples/styles";
mkdirSync(OUT, { recursive: true });
const service = getService(serviceId);
const format = FORMAT_MAP[formatId];
const content = defaultContent(format, service);

for (const style of STYLES) {
  if (only && style.key !== only) continue;
  const t = Date.now();
  const canvas = await renderCreative({ format, style: style.key, service, content, scale: 0.5 });
  writeFileSync(`${OUT}/${serviceId}_${style.key}_${formatId}.png`, canvas.toBuffer("image/png"));
  console.log(style.key.padEnd(14), Date.now() - t, "ms");
}
if (!only && process.argv.includes("--sheet")) {
  const sheet = FORMAT_MAP["style-sheet"];
  const canvas = await renderCreative({ format: sheet, style: STYLES[0].key, service, content: defaultContent(sheet, service), scale: 0.5 });
  writeFileSync(`${OUT}/${serviceId}_sheet.png`, canvas.toBuffer("image/png"));
  console.log("sheet done");
}
