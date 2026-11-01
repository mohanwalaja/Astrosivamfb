import { test } from "node:test";
import assert from "node:assert/strict";
import * as zlib from "node:zlib";

import {
  buildZip,
  exportFileName,
  pendingObjectUrlCount,
  revokePendingObjectUrls,
  saveBlob,
  setDownloadRevokeDelay,
  slugify,
  uniqueFileNames,
} from "../src/lib/export.ts";
import {
  BRAND_FORMAT_IDS,
  SERVICE_FORMAT_IDS,
  brandImageFileName,
  carouselFileName,
  highlightFileName,
  serviceImageFileName,
} from "../src/lib/packBuilder.ts";
import { FORMATS, FORMAT_MAP } from "../src/data/formats.ts";
import { SERVICES } from "../src/data/services/index.ts";
import { IG_HIGHLIGHTS } from "../src/data/instagram.ts";
import { fbCaption, igCaption, fullIgCaption } from "../src/lib/pack.ts";
import { CARD_FORMATS } from "../src/lib/festivalCreative.ts";
import type { DownloadFile } from "../src/types.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ==========================================================================
   The export pipeline, checked the way a download is checked: does the file
   exist, is it the right size, does it open, and does anything collide?
   ========================================================================== */

const encoder = new TextEncoder();

/* --------------------------- file naming -------------------------------- */

test("slugify folds accents and never returns an empty name", () => {
  assert.equal(slugify("Facebook Cover — Lockup"), "facebook-cover-lockup");
  assert.equal(slugify("  Ārambam  "), "arambam");
  assert.equal(slugify("Tamil · Tamil"), "tamil-tamil");

  // The bug: pure Tamil/Hindi headlines slugged to "" and produced `poster__1080x1350.png`.
  const tamil = slugify("ஜாதகம் பலன்");
  assert.ok(tamil.length > 0, "a Tamil headline must still produce a name");
  assert.match(tamil, /^item-[0-9a-z]{7}$/);
  assert.equal(tamil, slugify("ஜாதகம் பலன்"), "the fallback must be deterministic");
  assert.notEqual(tamil, slugify("ராசி பலன்"), "different headlines must not share a name");
  assert.equal(slugify("ஜாதகம்", "jathagam"), "jathagam", "an explicit fallback wins");

  assert.equal(slugify(""), "", "blank input stays blank so callers can drop the fragment");
  assert.equal(slugify("  "), "");
  assert.equal(slugify("!!! ###"), "");
});

test("exportFileName joins fragments without double separators and stays bounded", () => {
  assert.equal(exportFileName(["astrosivam", "poster", ""]), "astrosivam_poster");
  assert.equal(exportFileName(["astrosivam", null, "Jathagam", "fb-post"]), "astrosivam_jathagam_fb-post");
  // The pixel suffix has to survive verbatim — it is how the team picks a file.
  assert.equal(exportFileName(["Cover", "fb-cover"], "x") + "_1640x624", "cover_fb-cover_1640x624");
  assert.equal(exportFileName([]), "astrosivam", "a name may never be empty");
  assert.equal(exportFileName(["", "  "], "fallback"), "fallback");
  assert.ok(exportFileName(["x".repeat(400)]).length <= 96, "a 400-character headline must not break Windows paths");
});

test("no two files in a pack share a name", () => {
  for (const service of SERVICES) {
    const names = [
      ...SERVICE_FORMAT_IDS.map((id) => serviceImageFileName(service, id)),
      ...service.carousel.slides.map((_, index) => carouselFileName(index)),
      "COPY.md",
      "instagram-caption.txt",
    ];
    assert.equal(new Set(names).size, names.length, `${service.id} pack has a duplicate file name`);
    for (const name of names) {
      assert.doesNotMatch(name, /__|\.\./, `${name} has an empty name fragment`);
      assert.ok(name.length <= 120, `${name} is too long`);
    }
  }

  const brand = [
    ...BRAND_FORMAT_IDS.map((id) => brandImageFileName(id)),
    ...IG_HIGHLIGHTS.map((_, index) => highlightFileName(index)),
    "READ-ME.txt",
  ];
  assert.equal(new Set(brand).size, brand.length, "the brand pack has a duplicate file name");

  // The exact collision the audit found: five formats, three pixel sizes.
  const collided = SERVICE_FORMAT_IDS.filter((id) => {
    const size = `${FORMAT_MAP[id].width}x${FORMAT_MAP[id].height}`;
    return SERVICE_FORMAT_IDS.filter((other) => {
      const otherSize = `${FORMAT_MAP[other].width}x${FORMAT_MAP[other].height}`;
      return other !== id && otherSize === size;
    }).length > 0;
  });
  assert.ok(collided.length >= 5, "the size-collision fixtures must still exist for this test to mean anything");
});

test("the pixel suffix always matches the format's real size", () => {
  for (const format of FORMATS) {
    assert.match(format.id, /^[a-z-]+$/);
    assert.match(brandImageFileName(format.id), new RegExp(`${format.width}x${format.height}\\.png$`));
    assert.match(serviceImageFileName(SERVICES[0], format.id), new RegExp(`${format.width}x${format.height}\\.png$`));
  }
});

test("uniqueFileNames only renames the second, third, fourth copy", () => {
  const files: DownloadFile[] = [
    { name: "a.png", data: new Uint8Array([1]) },
    { name: "a.png", data: new Uint8Array([2]) },
    { name: "a-2.png", data: new Uint8Array([3]) },
    { name: "a.png", data: new Uint8Array([4]) },
    { name: "b.txt", data: new Uint8Array([5]) },
  ];
  const names = uniqueFileNames(files).map((file) => file.name);
  assert.deepEqual(names, ["a.png", "a-3.png", "a-2.png", "a-4.png", "b.txt"]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(files[0].name, "a.png", "the input must not be mutated");
});

/* ------------------------------- the zip -------------------------------- */

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  utf8: boolean;
}

/** Reads a store-only ZIP back the way an extractor does, straight from the bytes. */
function readZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.ok(eocd >= 0, "no end-of-central-directory record");
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);

  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, "bad central-directory signature");
    const flags = view.getUint16(cursor + 8, true);
    const crc = view.getUint32(cursor + 16, true);
    const size = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    assert.equal(view.getUint32(localOffset, true), 0x04034b50, `bad local header for ${name}`);
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localName + localExtra;
    const data = bytes.slice(dataStart, dataStart + size);
    entries.push({ name, data, crc, utf8: (flags & 0x0800) !== 0 });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const crcOf = (data: Uint8Array): number => {
  const fn = (zlib as unknown as { crc32?: (input: Uint8Array) => number }).crc32;
  if (typeof fn === "function") return fn(data) >>> 0;
  // Minimal fallback so the test does not depend on a Node version.
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let k = 0; k < 8; k += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
};

test("a built ZIP opens, keeps every byte, and checksums correctly", async () => {
  const files: DownloadFile[] = [
    { name: "astrosivam_fb-post_1200x1500.png", data: new Uint8Array([137, 80, 78, 71, 0, 1, 2, 3]) },
    { name: "astrosivam_ig-square_1200x1500.png", data: encoder.encode("second file") },
    { name: "தமிழ்-caption.txt", data: encoder.encode("வணக்கம்") },
    { name: "empty.txt", data: new Uint8Array(0) },
  ];
  const blob = buildZip(files);
  assert.equal(blob.type, "application/zip");
  assert.ok(blob.size > 0);

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const entries = readZip(bytes);
  assert.deepEqual(
    entries.map((entry) => entry.name),
    files.map((file) => file.name),
  );
  for (const [index, entry] of entries.entries()) {
    assert.deepEqual(Array.from(entry.data), Array.from(files[index].data), `${entry.name} came back corrupted`);
    assert.equal(entry.crc, crcOf(files[index].data), `${entry.name} has a bad CRC`);
    assert.ok(entry.utf8, `${entry.name} must be flagged UTF-8 for non-Latin names`);
  }
  // Locating every entry by its own offset proves the archive is not just header-shaped.
  assert.equal(bytes[bytes.length - 22], 0x50);
});

test("buildZip refuses an empty pack and de-duplicates names itself", async () => {
  assert.throws(() => buildZip([]), /empty/i);

  const blob = buildZip([
    { name: "same.png", data: new Uint8Array([1]) },
    { name: "same.png", data: new Uint8Array([2]) },
  ]);
  const entries = readZip(new Uint8Array(await blob.arrayBuffer()));
  assert.deepEqual(entries.map((entry) => entry.name), ["same.png", "same-2.png"]);
  assert.deepEqual(Array.from(entries[1].data), [2], "the second file must keep its own bytes");
});

/* --------------------------- download plumbing --------------------------- */

test("a download creates one object URL and revokes it", async () => {
  const originalDocument = (globalThis as { document?: unknown }).document;
  const clicked: string[] = [];
  const revoked: string[] = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  const anchor = {
    href: "",
    download: "",
    rel: "",
    click() {
      clicked.push(this.download);
    },
    remove() {},
  };
  (globalThis as { document?: unknown }).document = {
    createElement: () => anchor,
    body: { appendChild() {} },
  };
  URL.createObjectURL = () => `blob:test/${clicked.length + revoked.length}`;
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };
  setDownloadRevokeDelay(5);
  revokePendingObjectUrls();

  try {
    saveBlob(new Blob(["png"]), "astrosivam_test_1080x1080.png");
    assert.deepEqual(clicked, ["astrosivam_test_1080x1080.png"]);
    assert.equal(pendingObjectUrlCount(), 1, "the URL must be tracked until it is revoked");
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(revoked.length, 1, "the object URL must be revoked");
    assert.equal(pendingObjectUrlCount(), 0, "no object URL may be left behind");

    // A blank name is still a download; it must not produce `undefined`.
    saveBlob(new Blob(["png"]), "   ");
    assert.equal(clicked.at(-1), "astrosivam-export", "a blank file name needs a fallback");
    revokePendingObjectUrls();
    assert.equal(pendingObjectUrlCount(), 0, "revoking pending URLs must clear the registry");
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    (globalThis as { document?: unknown }).document = originalDocument;
    setDownloadRevokeDelay(4000);
  }
});

/* ------------------------------ the images ------------------------------- */

interface PngInfo {
  width: number;
  height: number;
  bytes: number;
}

/** Signature + IHDR + IEND: the three things a truncated or mislabelled PNG loses. */
function readPng(bytes: Uint8Array): PngInfo {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  signature.forEach((byte, index) => assert.equal(bytes[index], byte, "not a PNG"));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(8), 13, "the IHDR chunk must come first and be 13 bytes");
  assert.equal(view.getUint32(12), 0x49484452, "IHDR must be the first chunk");
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const tail = new TextDecoder().decode(bytes.slice(-8));
  assert.match(tail, /IEND/, "the PNG is truncated — no IEND chunk");
  return { width, height, bytes: bytes.length };
}

/** Mean and spread of the luminance, so a black or flat frame cannot pass as art. */
function frameStats(ctx: { getImageData: (x: number, y: number, w: number, h: number) => ImageData }, width: number, height: number) {
  const data = ctx.getImageData(0, 0, width, height).data;
  let sum = 0;
  let sumSq = 0;
  let transparent = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 250) transparent += 1;
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
  }
  const pixels = data.length / 4;
  const mean = sum / pixels;
  return {
    mean,
    sd: Math.sqrt(Math.max(0, sumSq / pixels - mean * mean)),
    transparentRatio: transparent / pixels,
  };
}

const ratioOf = (ratio: string): number => {
  const [width, height] = ratio.split(":").map(Number);
  return width / height;
};

test("every format exports a PNG at its exact pixel size", async (t) => {
  let env: { installCanvasEnv: () => void } | null = null;
  try {
    env = await import("../tools/canvas-env.mjs");
  } catch {
    t.skip("canvas shim not installed");
    return;
  }
  env.installCanvasEnv();
  const { renderCreative, defaultContent } = await import("../src/lib/templates.ts");
  const { canvasToBytes } = await import("../src/lib/export.ts");

  assert.equal(FORMATS.length, 18, "the format list is part of the contract");

  for (const format of FORMATS) {
    const canvas = await renderCreative({
      format,
      themeKey: "midnight",
      service: SERVICES[0],
      content: defaultContent(format, SERVICES[0]),
      scale: 1,
    });
    assert.equal(canvas.width, format.width, `${format.id} exported the wrong width`);
    assert.equal(canvas.height, format.height, `${format.id} exported the wrong height`);
    assert.ok(
      Math.abs(canvas.width / canvas.height - ratioOf(format.ratio)) < 0.02,
      `${format.id} is ${format.width}x${format.height} but declares ${format.ratio} — the export would crop`,
    );

    const ctx = canvas.getContext("2d");
    assert.ok(ctx);
    const stats = frameStats(ctx, canvas.width, canvas.height);
    assert.equal(stats.transparentRatio, 0, `${format.id} exported transparent pixels where the design is opaque`);
    assert.ok(stats.sd > 8, `${format.id} looks blank or flat (sd ${stats.sd.toFixed(1)})`);
    assert.ok(stats.mean > 8 && stats.mean < 247, `${format.id} is blown out or black (mean ${stats.mean.toFixed(1)})`);

    const png = await canvasToBytes(canvas);
    const info = readPng(png);
    assert.equal(info.width, format.width);
    assert.equal(info.height, format.height);
    // A flat frame compresses to almost nothing; real type and art do not.
    assert.ok(info.bytes > 20_000, `${format.id} PNG is only ${info.bytes} bytes — unexpectedly compressed`);
  }
});

test("the festival cards keep their four sizes, and their pack names stay unique", () => {
  assert.deepEqual(
    CARD_FORMATS.map((format) => `${format.width}x${format.height}`),
    ["1080x1350", "1080x1080", "1080x1920", "1200x1500"],
  );
  const names = CARD_FORMATS.map(
    (format) => `${exportFileName(["deepavali", "traditional"])}_${format.width}x${format.height}.png`,
  );
  assert.equal(new Set(names).size, names.length);
  for (const [index, name] of names.entries()) {
    assert.match(name, new RegExp(`_${CARD_FORMATS[index].width}x${CARD_FORMATS[index].height}\\.png$`));
  }
});

/* ------------------------------- the copy -------------------------------- */

test("every pack caption fits the platform limits it will be published into", () => {
  for (const service of SERVICES) {
    const facebook = fbCaption(service);
    const instagram = fullIgCaption(service);
    assert.ok(facebook.length > 80, `${service.id} Facebook caption is empty`);
    assert.ok(facebook.length <= 63_206, `${service.id} Facebook caption exceeds the post limit`);
    assert.ok(instagram.length <= 2200, `${service.id} Instagram caption is ${instagram.length} chars — over 2,200`);
    assert.ok((instagram.match(/#[\p{L}\w]+/gu) ?? []).length <= 30, `${service.id} has more than 30 hashtags`);
    assert.match(igCaption(service), /#/, `${service.id} has no hashtags at all`);
    assert.doesNotMatch(instagram, /\n{4,}/, `${service.id} caption has runaway blank lines`);
  }
});


/* ---------------------------- upload validation --------------------------- */

test("the poster upload accepts real images and refuses everything else", async () => {
  const { checkUploadFile, UPLOAD_MAX_BYTES, fileToImageSource } = await import("../src/lib/imageUpload.ts");

  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
  const good = new File([pngHeader, new Uint8Array(64)], "poster.png", { type: "image/png" });
  assert.equal((await checkUploadFile(good)).ok, true);

  const text = await checkUploadFile(new File(["<?php echo 1; ?>"], "poster.png", { type: "image/png" }));
  assert.equal(text.ok, false, "a renamed script must not be decoded as an image");
  assert.match(text.reason ?? "", /not an image/i);

  const empty = await checkUploadFile(new File([], "empty.png", { type: "image/png" }));
  assert.equal(empty.ok, false);
  assert.match(empty.reason ?? "", /empty/i);

  const huge = new File([new Uint8Array(UPLOAD_MAX_BYTES + 1)], "huge.png", { type: "image/png" });
  const oversized = await checkUploadFile(huge);
  assert.equal(oversized.ok, false);
  assert.match(oversized.reason ?? "", /limit/i);

  // The guard runs before decoding, so it must reject without touching Image/FileReader.
  await assert.rejects(() => fileToImageSource(new File(["not an image"], "notes.txt", { type: "text/plain" })));
});

/* ------------------------------ font loading ------------------------------ */

test("every render entry point awaits the webfonts before it paints", () => {
  // A missing await here is invisible in the browser until a Tamil headline lays
  // out in a fallback face — which then overflows in the full-resolution export.
  const ROOT = new URL("..", import.meta.url).pathname;
  const modules = [
    "src/lib/templates.ts",
    "src/lib/fbCreative.ts",
    "src/lib/igCreative.ts",
    "src/lib/serviceAds.ts",
    "src/lib/festivalCreative.ts",
    "src/lib/poster.ts",
  ];
  for (const path of modules) {
    const source = readFileSync(join(ROOT, path), "utf8");
    assert.match(source, /await ensureFonts\(\)/, `${path} must await ensureFonts()`);
  }
});

test("slow self-hosted fonts get a longer warmup and the warning rechecks late loads", () => {
  const ROOT = new URL("..", import.meta.url).pathname;
  const canvas = readFileSync(join(ROOT, "src/lib/canvas.ts"), "utf8");
  const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  assert.match(canvas, /setTimeout\(resolve, 10_000\)/, "mobile/shared hosts need more than a 4-second font timeout");
  assert.match(app, /addEventListener\("loadingdone"/, "clear the warning after late font faces finish loading");
  assert.match(app, /addEventListener\("loadingerror"/, "recheck health after a failed font request");
});


/* ------------------------------- safe areas ------------------------------- */

test("every declared safe area fits inside its format, so nothing crops it", () => {
  for (const format of FORMATS) {
    for (const zone of format.safeZones ?? []) {
      const left = zone.left ?? 0;
      const right = zone.right ?? 0;
      const top = zone.top ?? 0;
      const bottom = zone.bottom ?? 0;
      assert.ok(left >= 0 && top >= 0, `${format.id} safe area starts outside the canvas`);
      assert.ok(
        left + right < format.width,
        `${format.id} safe area is ${left + right}px wide inside a ${format.width}px canvas`,
      );
      assert.ok(
        top + bottom < format.height,
        `${format.id} safe area is ${top + bottom}px tall inside a ${format.height}px canvas`,
      );
      assert.ok(zone.label.length > 4, `${format.id} safe area needs a label`);
    }
  }
});
