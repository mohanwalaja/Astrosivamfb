#!/usr/bin/env node
/**
 * Renders the plain-words campaign to PNG.
 *
 *   npx tsx tools/plain-words.mjs
 *
 * Writes, under `posters/plain-words/`:
 *   <n>-<id>.png        every plate at its feed size (1080×1350)
 *   <n>-<id>-story.png  the two lead hooks, re-cut for stories and reels
 *   contact-sheet.jpg   the whole campaign on one page for sign-off
 *   captions.md         the caption, the Instagram cut and the tags per plate
 *   audit.json          legibility floor + overflow per plate
 *
 * Generated posters are deliverables, not build output — `posters/` is kept in
 * the repo on purpose so the campaign can be posted without running the studio.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { installCanvasEnv, makeCanvas } from "./canvas-env.mjs";
installCanvasEnv();
const { renderPoster } = await import("../src/lib/poster.ts");
const { getDesignAudit } = await import("../src/lib/compositionRender.ts");
const { PLAIN_WORDS, plainWordsCaption, plainWordsInstagram } = await import("../src/data/plainWords.ts");

const OUT = "posters/plain-words";
mkdirSync(OUT, { recursive: true });

/** The two hooks that earn a full-screen story, not just a feed tile. */
const STORY = new Set(["priest-is-busy", "no-time-to-visit"]);

const rows = [];
const files = [];

async function plate(name, poster, width, height, seed) {
  const started = Date.now();
  const canvas = await renderPoster({
    width,
    height,
    themeKey: poster.theme,
    style: "signature",
    layout: "split",
    template: poster.composition,
    display: poster.display,
    script: "serif",
    image: poster.image,
    imageIsLibrary: true,
    imageFit: "full",
    category: poster.category,
    occasion: poster.occasion,
    serviceTitle: poster.copy.serviceTitle,
    kicker: poster.copy.kicker,
    headline: poster.copy.headline,
    tamil: "",
    hindi: "",
    subline: poster.copy.subline,
    facts: poster.copy.facts,
    cta: poster.copy.cta,
    footer: "astrosivam.com",
    showLogo: true,
    seed,
    scale: 1,
  });
  const audit = getDesignAudit(canvas);
  writeFileSync(`${OUT}/${name}.png`, canvas.toBuffer("image/png"));
  files.push(name);
  const row = {
    name,
    id: poster.id,
    composition: poster.composition,
    width,
    height,
    ms: Date.now() - started,
    smallestHeadline: audit?.legibility?.smallestHeadline ?? null,
    legibilityPass: audit?.legibility?.passes ?? null,
    failing: audit?.legibility?.failing ?? [],
    overflow: audit?.overflow ?? [],
  };
  rows.push(row);
  console.log(`${name.padEnd(30)} ${poster.composition.padEnd(12)} ${width}×${height} ${row.legibilityPass ? "PASS" : "FAIL"} ${row.ms}ms`);
}

for (const [index, poster] of PLAIN_WORDS.entries()) {
  const n = String(index + 1).padStart(2, "0");
  await plate(`${n}-${poster.id}`, poster, poster.width, poster.height, 101 + index);
  if (STORY.has(poster.id)) await plate(`${n}-${poster.id}-story`, poster, 1080, 1920, 401 + index);
}

/* Contact sheet, built from the files that were just written. */
const { loadImage } = await import("@napi-rs/canvas");
const cols = 4;
const tw = 320, th = 400, gap = 18, label = 36;
const sheet = makeCanvas(cols * (tw + gap) + gap, Math.ceil(files.length / cols) * (th + label + gap) + gap);
const sctx = sheet.getContext("2d");
sctx.fillStyle = "#141011";
sctx.fillRect(0, 0, sheet.width, sheet.height);
for (const [i, name] of files.entries()) {
  const img = await loadImage(`${OUT}/${name}.png`);
  const x = gap + (i % cols) * (tw + gap);
  const y = gap + Math.floor(i / cols) * (th + label + gap);
  const scale = Math.min(tw / img.width, th / img.height);
  const w = img.width * scale, h = img.height * scale;
  sctx.drawImage(img, x + (tw - w) / 2, y + (th - h) / 2, w, h);
  sctx.fillStyle = "#E8DDCB";
  sctx.font = "14px sans-serif";
  sctx.fillText(name.replace(/^\d+-/, ""), x, y + th + 22);
}
writeFileSync(`${OUT}/contact-sheet.jpg`, sheet.toBuffer("image/jpeg", 90));

/* Captions next to the plates, so posting needs no second document. */
const md = [
  "# Plain-words campaign — captions",
  "",
  "Every plate explains the service in one breath: what it is, what you send, what arrives.",
  "Prices and deliverables are quoted from the service records in `src/data/services`.",
  "",
  ...PLAIN_WORDS.flatMap((poster, index) => [
    `## ${index + 1}. ${poster.copy.headline}`,
    "",
    `_${poster.message}_`,
    "",
    `**Poster:** \`${String(index + 1).padStart(2, "0")}-${poster.id}.png\` · ${poster.width}×${poster.height}${STORY.has(poster.id) ? ` · story cut \`${String(index + 1).padStart(2, "0")}-${poster.id}-story.png\` · 1080×1920` : ""}`,
    "",
    "**Caption**",
    "",
    plainWordsCaption(poster),
    "",
    "**Instagram cut**",
    "",
    plainWordsInstagram(poster),
    "",
  ]),
].join("\n");
writeFileSync(`${OUT}/captions.md`, md);

const failures = rows.filter((row) => row.legibilityPass === false || row.overflow.length);
writeFileSync(`${OUT}/audit.json`, JSON.stringify({ count: rows.length, failures: failures.length, plates: rows }, null, 2));
console.log(`\nWrote ${rows.length} plates to ${OUT}. Failures: ${failures.length}`);
if (failures.length) {
  for (const row of failures) console.log(`  ${row.name}: ${JSON.stringify(row.failing)} ${JSON.stringify(row.overflow)}`);
  process.exitCode = 1;
}
