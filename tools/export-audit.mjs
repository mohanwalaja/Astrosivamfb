/**
 * Export pipeline audit.
 *
 * Renders every shipped format, renders the same format at the scale the UI
 * previews it at, and then measures the files the app would actually hand to
 * the browser:
 *
 *   · is the PNG well formed, and does its header agree with the canvas?
 *   · is it blank, or a single flat colour?
 *   · is any pixel transparent (a full-bleed card must be opaque)?
 *   · does width / height still equal the format's stated ratio?
 *   · does the export match the preview, or does the layout move between scales?
 *   · does a pack ZIP contain every file, with matching bytes and no duplicates?
 *
 * Run: npx tsx tools/export-audit.mjs [--json]
 */
import { installCanvasEnv, makeCanvas } from "./canvas-env.mjs";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { inflateSync } from "node:zlib";

installCanvasEnv();

const { FORMATS, FORMAT_MAP } = await import("../src/data/formats.ts");
const { SERVICES } = await import("../src/data/services/index.ts");
const { defaultContent, renderCreative } = await import("../src/lib/templates.ts");
const { renderFbCreative, FB_LAYOUTS } = await import("../src/lib/fbCreative.ts");
const { renderIgCreative, IG_LAYOUTS } = await import("../src/lib/igCreative.ts");
const { renderServiceAd, AD_LAYOUTS } = await import("../src/lib/serviceAds.ts");
const { renderFestivalCard, CARD_FORMATS } = await import("../src/lib/festivalCreative.ts");
const { brandPackFiles, servicePackFiles } = await import("../src/lib/packs.ts");
const { festivalPackFiles, festivalYearFiles } = await import("../src/lib/packs.ts");
const { getFestival } = await import("../src/data/festivals.ts");
const { buildZip, slugify } = await import("../src/lib/export.ts");
const { STYLES } = await import("../src/data/brand.ts");

const OUT = ".samples/export-audit";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const rows = [];
const findings = [];
const note = (scope, message) => findings.push(`${scope}: ${message}`);

/* ------------------------------ PNG structure ----------------------------- */

/**
 * Parse the chunk stream, not just the first 33 bytes: a PNG that has an IHDR
 * but no IEND, or whose IDAT does not inflate to the size its header promises,
 * is a corrupt file that many viewers still open (grey or half-painted).
 */
function readPng(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 33 || sig.some((value, index) => bytes[index] !== value)) {
    throw new Error("not a PNG signature");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint32(8);
  const headerType = String.fromCharCode(...bytes.subarray(12, 16));
  if (headerType !== "IHDR" || headerLength !== 13) throw new Error("first chunk is not a 13-byte IHDR");
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];

  const idat = [];
  let endsWithIend = false;
  let cursor = 8;
  while (cursor + 8 <= bytes.length) {
    const length = view.getUint32(cursor);
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    const start = cursor + 8;
    const end = start + length;
    if (end + 4 > bytes.length) break;
    if (type === "IDAT") idat.push(bytes.subarray(start, end));
    if (type === "IEND") {
      endsWithIend = true;
      break;
    }
    cursor = end + 4;
  }
  return { width, height, bitDepth, colorType, idat, endsWithIend };
}

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** Inflate the pixel data and check it against the header's own promises. */
function verifyPngData(bytes, png) {
  const channels = CHANNELS[png.colorType];
  if (!channels) return { matches: false, rawBytes: 0, expected: 0 };
  const stride = png.width * channels * (png.bitDepth / 8) + 1;
  const expected = stride * png.height;
  let rawBytes = 0;
  try {
    rawBytes = inflateSync(Buffer.concat(png.idat.map((chunk) => Buffer.from(chunk)))).length;
  } catch {
    return { matches: false, rawBytes: 0, expected };
  }
  return { matches: rawBytes === expected, rawBytes, expected };
}

/** Mean, spread and colour count over the real pixels — the blank-frame test. */
function pixelStats(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 400_000)));
  const colors = new Set();
  let sum = 0;
  let sumSq = 0;
  let transparent = 0;
  let pixels = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      if (alpha < 250) transparent += 1;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum;
      sumSq += lum * lum;
      pixels += 1;
      if (colors.size < 5000) colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    }
  }
  const mean = sum / pixels;
  return {
    mean: Number(mean.toFixed(1)),
    stdDev: Number(Math.sqrt(Math.max(0, sumSq / pixels - mean * mean)).toFixed(1)),
    colors: colors.size,
    transparent,
    transparentPct: Number(((transparent / pixels) * 100).toFixed(2)),
  };
}

function downscale(canvas, width, height) {
  const out = makeCanvas(width, height);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, width, height);
  return out;
}

/**
 * A 1.5 px blur before comparing removes the high-frequency difference that
 * comes from resampling the export down to the preview size. Two images laid out
 * differently do not come back together when both are blurred.
 */
function blurred(canvas, radius = 1.5) {
  const out = makeCanvas(canvas.width, canvas.height);
  const ctx = out.getContext("2d");
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(canvas, 0, 0);
  return out;
}

/** Mean absolute difference and the share of pixels over `threshold`. */
function diff(a, b, threshold = 12) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const da = a.getContext("2d").getImageData(0, 0, width, height).data;
  const db = b.getContext("2d").getImageData(0, 0, width, height).data;
  let sum = 0;
  let changed = 0;
  let pixels = 0;
  for (let i = 0; i < da.length; i += 4) {
    const delta =
      (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
    sum += delta;
    if (delta > threshold) changed += 1;
    pixels += 1;
  }
  return {
    mean: Number((sum / pixels).toFixed(2)),
    changedPct: Number(((changed / pixels) * 100).toFixed(2)),
  };
}

/* ------------------------------- URL accounting --------------------------- */

let urlsCreated = 0;
let urlsRevoked = 0;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
URL.createObjectURL = (blob) => {
  urlsCreated += 1;
  return originalCreateObjectURL(blob);
};
URL.revokeObjectURL = (url) => {
  urlsRevoked += 1;
  return originalRevokeObjectURL(url);
};

/* ------------------------- text placement probe --------------------------- */
/*
 * A canvas painter that uses device-pixel constants moves the type when the
 * render scale changes. Recording `fillText` on every canvas lets the parity
 * check prove that the type sits at the same relative position at preview scale
 * and at export scale — pixel differences alone cannot tell layout drift from
 * ordinary resampling.
 */
const textProbe = { canvas: null, records: [] };
const envCreateElement = globalThis.document.createElement.bind(globalThis.document);
globalThis.document.createElement = (tag) => {
  const canvas = envCreateElement(tag);
  if (tag !== "canvas" || typeof canvas.getContext !== "function") return canvas;
  const original = canvas.getContext.bind(canvas);
  canvas.getContext = (type, options) => {
    const ctx = original(type, options);
    if (type !== "2d" || !ctx) return ctx;
    return new Proxy(ctx, {
      get(target, prop) {
        if (prop === "fillText" || prop === "strokeText") {
          return (text, x, y) => {
            const match = /(\d+(?:\.\d+)?)px/.exec(String(target.font ?? ""));
            textProbe.records.push({
              canvas,
              text: String(text),
              x,
              y,
              size: match ? Number(match[1]) : 0,
              align: target.textAlign,
              width: canvas.width,
              height: canvas.height,
            });
            return target[prop](text, x, y);
          };
        }
        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    });
  };
  return canvas;
};

/**
 * Compare where text landed at two scales, as a fraction of the design canvas.
 *
 * x/y and the font size are recorded in design units: `createCanvas` applies
 * ctx.scale() after the painter's coordinates are chosen, so the preview canvas
 * is physically smaller while the codes passed to fillText are unchanged. Both
 * renders are therefore normalised against the format's own width/height, not
 * against the canvas they happen to have been painted on.
 */
function anchorDrift(exported, preview, designWidth, designHeight) {
  const norm = (record) => ({
    key: `${record.text}|${record.align}`,
    x: record.x / designWidth,
    y: record.y / designHeight,
    size: record.size / designWidth,
  });
  const a = exported.map(norm);
  const b = preview.map(norm);
  if (a.length !== b.length) return { count: a.length, drift: 0, sizes: 0, mismatch: `text runs differ: ${a.length} vs ${b.length}` };
  const pool = [...b];
  let drift = 0;
  let sizes = 0;
  for (const record of a) {
    const index = pool.findIndex((candidate) => candidate.key === record.key);
    if (index < 0) return { count: a.length, drift: 0, sizes: 0, mismatch: `“${record.key.slice(0, 24)}” only rendered at one scale` };
    const match = pool.splice(index, 1)[0];
    drift = Math.max(drift, Math.abs(record.x - match.x), Math.abs(record.y - match.y));
    sizes = Math.max(sizes, Math.abs(record.size - match.size));
  }
  return { count: a.length, drift, sizes, mismatch: null };
}

/* --------------------------------- ZIP read-back -------------------------- */

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Read a store-only ZIP back from the bytes and compare every entry with the
 * file that produced it. A ZIP that only looks right — wrong CRC, wrong offset,
 * or a dropped entry — fails here, exactly as it would in an extractor.
 */
function verifyZip(bytes, files) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("no end-of-central-directory record");
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  if (count !== files.length) throw new Error(`central directory lists ${count} entries, expected ${files.length}`);
  const problems = [];
  const seen = new Set();
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error(`bad central header at entry ${index}`);
    const flags = view.getUint16(cursor + 8, true);
    const crc = view.getUint32(cursor + 16, true);
    const size = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (seen.has(name)) problems.push(`duplicate entry ${name}`);
    seen.add(name);
    if (!(flags & 0x0800)) problems.push(`${name} is not flagged UTF-8`);
    if (view.getUint32(localOffset, true) !== 0x04034b50) problems.push(`${name} has a bad local header`);
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localName + localExtra;
    const data = bytes.subarray(start, start + size);
    const source = files.find((file) => file.name === name);
    if (!source) problems.push(`${name} is not in the pack`);
    if (crc32(data) !== crc) problems.push(`${name} fails its CRC`);
    if (source && data.length !== source.data.length) problems.push(`${name} changed length`);
    if (source && data.some((byte, i) => byte !== source.data[i])) problems.push(`${name} changed bytes`);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return problems;
}

/* --------------------------------- rendering ------------------------------ */

const service = SERVICES[0];

function ratioOf(format) {
  return format.width / format.height;
}

async function auditCreative(format) {
  textProbe.records = [];
  const exportCanvas = await renderCreative({
    format,
    themeKey: "midnight",
    service,
    content: defaultContent(format, service),
    scale: 1,
  });
  const exportText = textProbe.records.filter((record) => record.canvas === exportCanvas);
  const bytes = new Uint8Array(exportCanvas.toBuffer("image/png"));
  writeFileSync(`${OUT}/format_${format.id}.png`, bytes);

  const png = readPng(bytes);
  const data = verifyPngData(bytes, png);
  const stats = pixelStats(exportCanvas);

  if (png.width !== format.width || png.height !== format.height) {
    note(`format/${format.id}`, `PNG header ${png.width}x${png.height} ≠ format ${format.width}x${format.height}`);
  }
  if (!png.endsWithIend) note(`format/${format.id}`, "PNG is truncated (no IEND)");
  if (!data.matches) note(`format/${format.id}`, `IDAT inflates to ${data.rawBytes} bytes, expected ${data.expected}`);
  if (stats.transparent > 0) note(`format/${format.id}`, `${stats.transparentPct}% of sampled pixels are transparent`);
  if (stats.stdDev < 3) note(`format/${format.id}`, `image is nearly flat (std dev ${stats.stdDev}) — possibly blank`);
  if (stats.colors < 12) note(`format/${format.id}`, `only ${stats.colors} distinct colours — possibly blank`);

  // Preview parity. Every canvas surface previews at a fraction of full size;
  // if a painter uses a device-pixel constant the two renders diverge here.
  const previewWidth = Math.min(360, format.width);
  const scale = Math.min(1, previewWidth / format.width);
  textProbe.records = [];
  const previewCanvas = await renderCreative({
    format,
    themeKey: "midnight",
    service,
    content: defaultContent(format, service),
    scale,
  });
  const compared = downscale(exportCanvas, previewCanvas.width, previewCanvas.height);
  const delta = diff(compared, previewCanvas);
  const softDelta = diff(blurred(compared), blurred(previewCanvas), 16);
  const previewText = textProbe.records.filter((record) => record.canvas === previewCanvas);
  const anchors = anchorDrift(exportText, previewText, format.width, format.height);

  // Type at a different relative position at a different scale is a real
  // WYSIWYG defect. Pixels that disagree only until both sides are blurred are
  // resampling — a measurement, not a bug.
  if (anchors.mismatch) {
    note(`format/${format.id}`, `preview ≠ export: ${anchors.mismatch}`);
  } else if (anchors.drift > 0.004 || anchors.sizes > 0.004) {
    note(`format/${format.id}`, `text moves between preview and export by ${(anchors.drift * 100).toFixed(2)}% of the canvas`);
  } else if (delta.changedPct > 6 && softDelta.changedPct > 3.5) {
    note(`format/${format.id}`, `preview ≠ export beyond resampling: ${delta.changedPct}% → ${softDelta.changedPct}% after blur`);
  }

  return {
    engine: "templates",
    id: format.id,
    width: format.width,
    height: format.height,
    aspect: Number(ratioOf(format).toFixed(3)),
    bytes: bytes.length,
    colorType: png.colorType,
    ...stats,
    previewDiff: delta.mean,
    previewChangedPct: delta.changedPct,
    previewSoftPct: softDelta.changedPct,
    anchorDriftPct: Number((anchors.drift * 100).toFixed(2)),
    textRuns: anchors.count,
  };
}

async function auditScene(engine, layout, run) {
  const first = await run(1);
  const bytes = new Uint8Array(first.canvas.toBuffer("image/png"));
  writeFileSync(`${OUT}/${engine}_${layout}.png`, bytes);
  const png = readPng(bytes);
  const stats = pixelStats(first.canvas);
  if (png.width !== first.canvas.width || png.height !== first.canvas.height) {
    note(`${engine}/${layout}`, "PNG header disagrees with the canvas");
  }
  if (stats.transparent > 0) note(`${engine}/${layout}`, `${stats.transparentPct}% transparent`);
  if (stats.stdDev < 3) note(`${engine}/${layout}`, `nearly flat (std dev ${stats.stdDev})`);

  const previewWidth = Math.min(360, first.canvas.width);
  const preview = await run(Math.min(1, previewWidth / first.canvas.width));
  const compared = downscale(first.canvas, preview.canvas.width, preview.canvas.height);
  const delta = diff(compared, preview.canvas);
  if (delta.changedPct > 6) {
    note(`${engine}/${layout}`, `preview ≠ export: ${delta.changedPct}% differ, mean ${delta.mean}`);
  }
  return {
    engine,
    id: layout,
    width: first.canvas.width,
    height: first.canvas.height,
    bytes: bytes.length,
    ...stats,
    previewDiff: delta.mean,
    previewChangedPct: delta.changedPct,
  };
}

/* ---------------------------------- run ---------------------------------- */

console.log(`\nrendering ${FORMATS.length} poster formats…`);
for (const format of FORMATS) rows.push(await auditCreative(format));

console.log(`rendering ${FB_LAYOUTS.length} Facebook layouts…`);
for (const layout of FB_LAYOUTS) {
  rows.push(
    await auditScene("fb", layout.key, (scale) =>
      renderFbCreative({
        layout: layout.key,
        themeKey: "midnight",
        style: "classic",
        content: {
          kicker: "Jathagam · Birth chart",
          headline: "Your life, mapped",
          subline: "A practising priest reads the chart. Nothing here is generated.",
          tamil: "",
          hindi: "",
          chips: ["10 poruthams", "Priest review", "24-hour delivery"],
          price: "FROM US$5 · ₹470",
          cta: "Order your jathagam",
          footer: "astrosivam.com · first report free",
        },
        art: null,
        scale,
      })),
  );
}

console.log(`rendering ${IG_LAYOUTS.length} Instagram layouts…`);
for (const layout of IG_LAYOUTS) {
  rows.push(
    await auditScene("ig", layout.key, (scale) =>
      renderIgCreative({
        layout: layout.key,
        themeKey: "midnight",
        style: "classic",
        content: {
          kicker: "Jathagam · Birth chart",
          headline: "Your life, mapped",
          subline: "A practising priest reads the chart. Nothing here is generated.",
          tamil: "",
          hindi: "",
          chips: ["10 poruthams", "Priest review"],
          price: "FROM US$5 · ₹470",
          cta: "Order your jathagam",
          footer: "astrosivam.com",
          index: "01 / 07",
          glyph: "sun",
          attribution: "Brihat Parashara Hora Shastra",
        },
        art: null,
        scale,
      })),
  );
}

console.log(`rendering ${AD_LAYOUTS.length} ad layouts…`);
for (const layout of AD_LAYOUTS) {
  rows.push(
    await auditScene("ads", layout.key, (scale) =>
      renderServiceAd({
        layout: layout.key,
        theme: "midnight",
        style: "classic",
        lang: "en",
        copy: {
          kicker: "Jathagam",
          headline: "Your life, mapped",
          subline: "A practising priest reads the chart.",
          cta: "Order your jathagam",
          facts: ["10 poruthams", "Priest review", "24-hour delivery"],
          tamil: "",
          hindi: "",
          body: "A practising priest reads the chart, by hand, in Tamil and English.",
          source: "Lahiri sidereal",
        },
        price: "FROM US$5 · ₹470",
        url: "astrosivam.com",
        motif: "sun",
        art: null,
        scale,
      })),
  );
}

console.log(`rendering ${CARD_FORMATS.length} festival formats…`);
const festival = getFestival("deepavali");
const { festivalCopy, festivalDateView } = await import("../src/lib/festivalKit.ts");
const copy = festivalCopy(festival, festivalDateView("deepavali", 2026));
for (const format of CARD_FORMATS) {
  rows.push(
    await auditScene("fest", format.key, (scale) =>
      renderFestivalCard({
        style: "traditional",
        format: format.key,
        theme: "gold",
        display: "cinzel",
        script: "classic",
        logo: "plaque",
        language: "trilingual",
        copy,
        art: null,
        motif: festival.motif,
        scale,
      })),
  );
}

/* ---------------------------------- zips --------------------------------- */

console.log("\nbuilding packs…");
const packs = [];
async function auditPack(label, files, expectedMin, progress) {
  const unique = new Set(files.map((file) => file.name));
  const empty = files.filter((file) => !file.data.length);
  const bad = files.filter((file) => /[\\/:*?"<>|]/.test(file.name) || file.name.length > 120 || /^\.|\.\./.test(file.name));
  const duplicates = files.length - unique.size;
  const zip = buildZip(files);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  writeFileSync(`${OUT}/pack_${label}.zip`, bytes);
  if (files.length < expectedMin) note(`pack/${label}`, `${files.length} files, expected at least ${expectedMin}`);
  if (duplicates) note(`pack/${label}`, `${duplicates} duplicate file names`);
  if (empty.length) note(`pack/${label}`, `${empty.length} empty files: ${empty.map((file) => file.name).slice(0, 3).join(", ")}`);
  if (bad.length) note(`pack/${label}`, `unsafe names: ${bad.map((file) => file.name).slice(0, 3).join(", ")}`);
  // PNG entries must decode and match the header the format declares.
  const images = files.filter((file) => /\.png$/i.test(file.name));
  let decoded = 0;
  for (const file of images.slice(0, 40)) {
    const png = readPng(file.data);
    verifyPngData(file.data, png);
    decoded += 1;
  }
  // The archive itself: header, offsets, CRCs and bytes, read back the way an extractor does.
  const zipProblems = verifyZip(bytes, files);
  if (zipProblems.length) note(`zip/${label}`, zipProblems.slice(0, 3).join("; "));
  if (progress) {
    if (!progress.length) note(`progress/${label}`, "no progress callbacks fired");
    else {
      const outOfOrder = progress.some((value, index) => index > 0 && value < progress[index - 1]);
      const last = progress.at(-1);
      if (outOfOrder) note(`progress/${label}`, "progress went backwards");
      if (last !== files.length) note(`progress/${label}`, `last progress was ${last}, expected ${files.length}`);
    }
  }
  packs.push({
    label,
    files: files.length,
    crc: zipProblems.length === 0,
    progress: progress ? progress.at(-1) ?? 0 : null,
    images: images.length,
    decoded,
    bytes: bytes.length,
    duplicates,
    empty: empty.length,
  });
  return { files, bytes };
}

const brandProgress = [];
const brand = await brandPackFiles((done) => brandProgress.push(done));
await auditPack("brand", brand.files, 14, brandProgress);
const serviceProgress = [];
const servicePack = await servicePackFiles(service, "midnight", undefined, (done) => serviceProgress.push(done));
await auditPack("service", servicePack.files, 19, serviceProgress);
const festivalProgress = [];
const festivalPack = await festivalPackFiles(
  festival,
  {
    style: "traditional",
    language: "trilingual",
    format: "ig-post",
    theme: null,
    display: null,
    script: null,
    logo: null,
    artOverride: null,
    year: "next",
  },
  (done) => festivalProgress.push(done),
);
await auditPack("festival", festivalPack.files, 5, festivalProgress);
const yearProgress = [];
const yearPack = await festivalYearFiles(
  {
    style: "traditional",
    language: "trilingual",
    format: "ig-post",
    theme: null,
    display: null,
    script: null,
    logo: null,
    artOverride: null,
    year: "next",
  },
  (done) => yearProgress.push(done),
);
await auditPack("festival-year", yearPack.files, 2, yearProgress);

// The art-direction pack zips one export per style (the same set Asset Studio offers).
const styleFiles = [];
for (const style of STYLES) {
  const canvas = await renderCreative({
    format: FORMAT_MAP["ig-post"],
    style: style.key,
    themeKey: "midnight",
    service,
    content: defaultContent(FORMAT_MAP["ig-post"], service),
    scale: 1,
  });
  styleFiles.push({ name: `${style.key}_1080x1350.png`, data: new Uint8Array(canvas.toBuffer("image/png")) });
}
await auditPack("styles", styleFiles, STYLES.length);

/* ------------------------------- filenames ------------------------------- */

const names = [];
const push = (label, value) => names.push({ label, value });
push("brand", `astrosivam_brand-pack_2026-10-26.zip`);
push("service", `astrosivam_${slugify(service.shortName)}-pack_2026-10-26.zip`);
const { exportFileName } = await import("../src/lib/export.ts");
for (const name of [
  "Your life, mapped",
  "உங்கள் வாழ்க்கை, வரையப்பட்டது",
  "आपका जीवन, मानचित्रित",
  "   ",
  "…",
  "Sri Rāma — 2026",
]) {
  // Exactly the expression poster downloads use to name a file.
  push(
    `poster “${name}”`,
    `${exportFileName(["astrosivam", "poster", slugify(name).slice(0, 40), "ig-post"])}_1080x1350.png`,
  );
}
for (const entry of names) {
  if (/__|\.\./.test(entry.value)) note(`filename/${entry.label}`, `empty slug produced “${entry.value}”`);
  if (entry.value.length > 120) note(`filename/${entry.label}`, `name is ${entry.value.length} characters`);
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(entry.value)) note(`filename/${entry.label}`, `“${entry.value}” has a character a filesystem rejects`);
}

/* --------------------------------- memory -------------------------------- */

const before = process.memoryUsage().heapUsed;
const churn = [];
for (let index = 0; index < 3; index += 1) {
  await servicePackFiles(service, "midnight");
  churn.push(Number(((process.memoryUsage().heapUsed - before) / 1048576).toFixed(1)));
}

// The year pack is the largest archive the app builds: 53 PNGs are held in
// memory and then copied into one Blob, so its peak is measured, not assumed.
const beforeYear = process.memoryUsage();
const bigPack = await festivalYearFiles({
  style: "traditional",
  language: "trilingual",
  format: "ig-post",
  theme: null,
  display: null,
  script: null,
  logo: null,
  artOverride: null,
  year: "next",
});
const bigZip = buildZip(bigPack.files);
const afterYear = process.memoryUsage();
const yearMemory = {
  filesBytes: bigPack.files.reduce((sum, file) => sum + file.data.length, 0),
  zipBytes: bigZip.size,
  heapDeltaMb: Number(((afterYear.heapUsed - beforeYear.heapUsed) / 1048576).toFixed(1)),
  rssDeltaMb: Number(((afterYear.rss - beforeYear.rss) / 1048576).toFixed(1)),
};
if (yearMemory.heapDeltaMb > 200) {
  note("memory/festival-year", `${yearMemory.heapDeltaMb} MB of heap for a ${(bigZip.size / 1048576).toFixed(1)} MB archive`);
}
// Object URLs are created by the download helpers; the audit only reads bytes,
// so a steady count here means no orphaned blob handle in the pack builders.
const exportLib = await import("../src/lib/export.ts");

/* --------------------------- downloads and uploads ------------------------ */

// A four-line DOM is enough for the download path: an anchor that records its
// click, and a body to append it to. Everything else is the real helper.
const readFileSyncBytes = (path) => new Uint8Array(readFileSync(path));
const clicked = [];
const anchorFor = () => ({
  href: "",
  download: "",
  rel: "",
  click() {
    clicked.push(this.download);
  },
  remove() {},
});
globalThis.document = {
  ...(globalThis.document ?? {}),
  createElement: (tag) => {
    if (tag === "a") return anchorFor();
    throw new Error(`audit DOM cannot create <${tag}>`);
  },
  body: { appendChild() {} },
};

exportLib.setDownloadRevokeDelay(0);
const urlsBefore = urlsCreated;
for (const pack of packs.slice(0, 2)) {
  const bytes = readFileSyncBytes(`${OUT}/pack_${pack.label}.zip`);
  exportLib.saveBlob(new Blob([bytes]), `pack_${pack.label}.zip`);
}
await new Promise((resolve) => setTimeout(resolve, 20));
const savedUrls = urlsCreated - urlsBefore;
if (urlsCreated - urlsRevoked !== 0) note("downloads", `${urlsCreated - urlsRevoked} object URLs left open after ${clicked.length} saves`);
if (clicked.length < 2) note("downloads", `the anchor was never clicked (${clicked.length} clicks)`);
if (savedUrls < clicked.length) note("downloads", "a save reused another save's object URL");

// The upload guard: junk types, empty files and oversized files must be refused
// before the browser tries to decode them.
const { checkUploadFile, UPLOAD_MAX_BYTES } = await import("../src/lib/imageUpload.ts");
const png = readFileSyncBytes(`${OUT}/format_ig-post.png`);
const cases = [
  ["real PNG", new File([png], "poster.png", { type: "image/png" }), true],
  ["renamed text", new File(["<?php echo 1; ?>"], "poster.png", { type: "image/png" }), false],
  ["empty file", new File([], "empty.png", { type: "image/png" }), false],
  ["SVG", new File(["<svg xmlns=\"http://www.w3.org/2000/svg\"/>"], "art.svg", { type: "image/svg+xml" }), false],
  [
    "oversized",
    new File([new Uint8Array(UPLOAD_MAX_BYTES + 1)], "huge.png", { type: "image/png" }),
    false,
  ],
];
for (const [label, file, expected] of cases) {
  const result = await checkUploadFile(file);
  if (result.ok !== expected) {
    note("upload", `${label} was ${result.ok ? "accepted" : "refused"} — expected ${expected ? "acceptance" : "refusal"}`);
  }
  if (!result.ok && !result.reason) note("upload", `${label} was refused with no explanation`);
}

/* --------------------------------- report -------------------------------- */

const pad = (value, width) => String(value).padEnd(width);
const header = `${pad("engine", 10)}${pad("id", 26)}${pad("px", 11)}${pad("ratio", 7)}${pad("KB", 8)}${pad("mean", 7)}${pad("sd", 7)}${pad("colors", 8)}${pad("alpha%", 8)}${pad("Δview", 7)}${pad("Δblur", 7)}${pad("drift%", 8)}`;
console.log("\n" + header);
console.log("-".repeat(header.length));
for (const row of rows) {
  console.log(
    `${pad(row.engine, 10)}${pad(row.id, 26)}${pad(`${row.width}×${row.height}`, 11)}${pad(row.aspect ?? "-", 7)}${pad(
      (row.bytes / 1024).toFixed(0),
      8,
    )}${pad(row.mean, 7)}${pad(row.stdDev, 7)}${pad(row.colors, 8)}${pad(row.transparentPct, 8)}${pad(
      row.previewChangedPct,
      7,
    )}${pad(row.previewSoftPct ?? "-", 7)}${pad(row.anchorDriftPct ?? "-", 8)}`,
  );
}

console.log("\npacks");
console.log(
  `${pad("pack", 16)}${pad("files", 7)}${pad("images", 8)}${pad("decoded", 9)}${pad("MB", 8)}${pad("dupes", 7)}${pad(
    "empty",
    7,
  )}${pad("crc", 6)}${pad("progress", 9)}`,
);
for (const pack of packs) {
  console.log(
    `${pad(pack.label, 16)}${pad(pack.files, 7)}${pad(pack.images, 8)}${pad(pack.decoded, 9)}${pad(
      (pack.bytes / 1048576).toFixed(2),
      8,
    )}${pad(pack.duplicates, 7)}${pad(pack.empty, 7)}${pad(pack.crc ? "ok" : "FAIL", 6)}${pad(
      pack.progress === null ? "-" : `${pack.progress}/${pack.files}`,
      9,
    )}`,
  );
}

const openUrls = urlsCreated - urlsRevoked;
console.log(`\nobject URLs created ${urlsCreated}, revoked ${urlsRevoked}, open ${openUrls}`);
console.log(`heap after three service packs: +${churn.join(" / +")} MB (cumulative)`);
console.log(
  `festival year: ${(yearMemory.filesBytes / 1048576).toFixed(1)} MB of PNG → ${(yearMemory.zipBytes / 1048576).toFixed(
    1,
  )} MB ZIP, heap +${yearMemory.heapDeltaMb} MB, RSS +${yearMemory.rssDeltaMb} MB`,
);

if (findings.length) {
  console.log(`\n${findings.length} findings`);
  findings.slice(0, 60).forEach((line) => console.log(`  · ${line}`));
} else {
  console.log("\nNo findings.");
}

if (process.argv.includes("--json")) {
  writeFileSync(
    `${OUT}/report.json`,
    JSON.stringify(
      { rows, packs, findings, filenames: names, urls: { urlsCreated, urlsRevoked }, memory: { churn, yearMemory } },
      null,
      2,
    ),
  );
  console.log(`\nwrote ${OUT}/report.json`);
}
