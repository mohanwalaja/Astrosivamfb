import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PLATFORM_RULES,
  captionLimit,
  sniffImage,
  validateCaption,
  validateImage,
} from "../src/lib/imageValidate.ts";

/* ------------------------------- magic bytes ----------------------------- */

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new Uint8Array([...text].map((character) => character.charCodeAt(0)));

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d);
const GIF = concat(ascii("GIF89a"), bytes(0x0a, 0x00, 0x0a, 0x00));
const WEBP = concat(ascii("RIFF"), bytes(0x24, 0x00, 0x00, 0x00), ascii("WEBPVP8 "));
const BMP = concat(ascii("BM"), bytes(0x3a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00));
const TIFF_LE = bytes(0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00);
const TIFF_BE = bytes(0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08);
const HEIC = concat(bytes(0x00, 0x00, 0x00, 0x18), ascii("ftypheic"), bytes(0x00, 0x00, 0x00, 0x00), ascii("mif1heic"));
const AVIF = concat(bytes(0x00, 0x00, 0x00, 0x1c), ascii("ftypavif"), bytes(0x00, 0x00, 0x00, 0x00), ascii("avifmif1"));
const PDF = ascii("%PDF-1.7\n");

test("the sniffer reads the file's own bytes, not its extension", () => {
  const cases: Array<[Uint8Array, string]> = [
    [JPEG, "jpeg"],
    [PNG, "png"],
    [GIF, "gif"],
    [WEBP, "webp"],
    [BMP, "bmp"],
    [TIFF_LE, "tiff"],
    [TIFF_BE, "tiff"],
    [HEIC, "heic"],
    [AVIF, "avif"],
    [PDF, "unknown"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(sniffImage(input).kind, expected, `expected ${expected}`);
  }
});

test("a truncated or empty file is unknown rather than guessed", () => {
  assert.equal(sniffImage(new Uint8Array()).kind, "unknown");
  assert.equal(sniffImage(bytes(0xff)).kind, "unknown");
  assert.equal(sniffImage(bytes(0x89, 0x50)).kind, "unknown");
});

/* -------------------------------- the rules ------------------------------ */

test("Facebook accepts every common photo format; Instagram accepts JPEG only", () => {
  for (const kind of ["jpeg", "png", "gif", "bmp", "tiff", "webp"] as const) {
    assert.equal(PLATFORM_RULES.facebook.native.includes(kind), true, `Facebook should accept ${kind}`);
  }
  assert.equal(PLATFORM_RULES.facebook.requiresJpeg, false);
  assert.deepEqual(PLATFORM_RULES.instagram.native, ["jpeg"]);
  assert.equal(PLATFORM_RULES.instagram.requiresJpeg, true);
  assert.equal(PLATFORM_RULES.instagram.maxWidth, 1440);
  assert.equal(PLATFORM_RULES.facebook.maxBytes, 8 * 1024 * 1024);
  assert.equal(PLATFORM_RULES.instagram.maxBytes, 8 * 1024 * 1024);
});

test("a PNG is accepted for Facebook and converted for Instagram", () => {
  const facebook = validateImage(PNG, { width: 1080, height: 1350 }, ["facebook"]);
  assert.equal(facebook.ok, true);
  assert.equal(facebook.needsConversion, false);
  assert.equal(facebook.uploadMime, "image/png");
  assert.equal(facebook.targetWidth, null);

  const instagram = validateImage(PNG, { width: 1080, height: 1350 }, ["instagram"]);
  assert.equal(instagram.ok, true);
  assert.equal(instagram.needsConversion, true, "Instagram must receive JPEG");
  assert.equal(instagram.uploadMime, "image/jpeg");
});

test("an oversized photo is downscaled to Instagram's 1440 px width", () => {
  const result = validateImage(JPEG, { width: 4096, height: 4096 }, ["instagram"]);
  assert.equal(result.ok, true);
  assert.equal(result.targetWidth, 1440);
  assert.equal(
    result.issues.some((issue) => issue.code === "width-instagram-large"),
    true,
    "the person should be told the file will be resized",
  );
});

test("an unsupported file is rejected with a reason, not a generic failure", () => {
  const result = validateImage(PDF, { width: 100, height: 100 }, ["facebook"]);
  assert.equal(result.ok, false);
  const issue = result.issues.find((entry) => entry.code === "format-unknown");
  assert.ok(issue, "a PDF must produce a format-unknown error");
  assert.equal(issue!.severity, "error");
  assert.match(issue!.fix ?? "", /JPEG|PNG|WebP/i, "the error must say which formats do work");
});

test("aspect ratio outside Meta's window is a blocking error", () => {
  // A 4:1 panorama is fine on Facebook but wrong for an Instagram feed.
  const wide = validateImage(JPEG, { width: 1600, height: 400 }, ["instagram"]);
  assert.equal(wide.ok, false);
  assert.ok(wide.issues.some((issue) => issue.code === "aspect-instagram" && issue.severity === "error"));

  const fine = validateImage(JPEG, { width: 1080, height: 1350 }, ["instagram"]);
  assert.equal(fine.ok, true);
});

test("files over 8 MB are rejected before upload", () => {
  const big = new Uint8Array(9 * 1024 * 1024);
  big.set(JPEG);
  const huge = validateImage(big, { width: 1000, height: 1000 }, ["facebook"]);
  assert.equal(huge.ok, false);
  assert.ok(huge.issues.some((issue) => issue.code === "size-facebook" && issue.severity === "error"));
  assert.equal(huge.meta?.bytes, big.length);

  const fine = validateImage(JPEG, { width: 1000, height: 1000 }, ["facebook"]);
  assert.equal(fine.ok, true);
});

test("a tiny image warns instead of publishing a blurry post silently", () => {
  const small = validateImage(JPEG, { width: 120, height: 120 }, ["facebook"]);
  assert.equal(small.ok, false);
  assert.ok(small.issues.some((issue) => issue.code === "width-facebook" && issue.severity === "error"));
});

test("an unreadable header is reported, never assumed", () => {
  const result = validateImage(JPEG, null, ["facebook"]);
  assert.ok(result.issues.some((issue) => issue.code === "dimensions-unreadable"));
});

/* -------------------------------- captions ------------------------------- */

test("the caption limit is the strictest target's limit", () => {
  assert.equal(captionLimit(["facebook"]), 5000);
  assert.equal(captionLimit(["instagram"]), 2200);
  assert.equal(captionLimit(["facebook", "instagram"]), 2200);
  assert.equal(captionLimit([]), 5000, "no target falls back to the widest limit");
});

test("an over-length caption is an error, and the first line is measured", () => {
  const tooLong = "a".repeat(2300);
  const instagram = validateCaption(tooLong, ["instagram"]);
  assert.equal(instagram.ok, false);
  assert.ok(instagram.issues.some((issue) => issue.code === "caption-length" && issue.severity === "error"));

  const hooky = `${"word ".repeat(30)}the rest`;
  const facebook = validateCaption(hooky, ["facebook"]);
  assert.ok(facebook.issues.some((issue) => issue.code === "caption-hook" && issue.severity === "warning"));
  assert.ok(facebook.hookLength > 125);
});

test("counts hashtags and caps them at the platform limit", () => {
  const tags = Array.from({ length: 31 }, (_, index) => `#tag${index}`).join(" ");
  const result = validateCaption(`Read the report ${tags}`, ["facebook"]);
  assert.equal(result.hashtagCount, 31);
  assert.equal(result.hashtagLimit, 30);
  assert.ok(result.issues.some((issue) => issue.code === "hashtag-count"));
});

test("guarantee language is flagged before Meta sees it", () => {
  const phrases = ["100% accurate readings", "guaranteed muhurtham", "destiny will change", "will cure your worry"];
  for (const phrase of phrases) {
    const result = validateCaption(`Astro Sivam ${phrase}`, ["facebook"]);
    assert.ok(
      result.issues.some((issue) => issue.code === "caption-policy"),
      `${phrase} should be flagged`,
    );
  }
  const clean = validateCaption("A 40-page report, reviewed by hand, in Tamil or English.", ["facebook"]);
  assert.equal(clean.issues.some((issue) => issue.code === "caption-policy"), false);
});
