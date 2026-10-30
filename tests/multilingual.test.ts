import assert from "node:assert/strict";
import test from "node:test";
import { DISPLAY, DEVA, HINDI_DISPLAY, ROUND, SANS, SERIF, TAMIL, drawTracked } from "../src/lib/canvas.ts";
import { readFileSync } from "node:fs";
import { breakWord, clusters, safeSlice, splitByScript } from "../src/lib/script.ts";
import { blockHeight, fitLine, leadOffsets, lineHop, wrapAll } from "../src/lib/typeset.ts";

/**
 * The audit harness proves the shipped layouts; these tests hold the primitives
 * it depends on. A fake 2D context keeps them deterministic: every character
 * advances half an em, so expected widths can be stated exactly.
 */
function fakeContext() {
  const drawn: Array<{ text: string; x: number; y: number }> = [];
  const ctx = {
    font: "400 40px sans-serif",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    fillStyle: "#000",
    save() {},
    restore() {},
    measureText(text: string) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? 40);
      return { width: Array.from(text).length * size * 0.5 } as TextMetrics;
    },
    fillText(text: string, x: number, y: number) {
      drawn.push({ text, x, y });
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, drawn };
}

const TAMIL_LONG = "திருவான்மியூர்த்திருச்சிற்றம்பலம்திருவண்ணாமலை";
const HINDI = "दीपावली की हार्दिक शुभकामनाएँ";

test("wrapAll never lets an unbreakable Tamil word exceed the column", () => {
  const { ctx } = fakeContext();
  ctx.font = "400 40px sans-serif";
  const lines = wrapAll(ctx, TAMIL_LONG, 200);
  for (const line of lines) {
    ctx.font = "400 40px sans-serif";
    assert.ok(ctx.measureText(line).width <= 200, `${line} is ${ctx.measureText(line).width}px wide`);
  }
  assert.equal(lines.join(""), TAMIL_LONG, "no character is lost when a word is broken");
});

test("wrapping never starts a line on a combining vowel sign", () => {
  const { ctx } = fakeContext();
  const lines = wrapAll(ctx, `${TAMIL_LONG} ${HINDI}`, 180);
  for (const line of lines) {
    const first = line[0] ?? "";
    assert.ok(!/[\u0900-\u0903\u093A-\u094F\u0BBE-\u0BCD]/.test(first), `line starts with a mark: ${line}`);
  }
});

test("breakWord keeps every cluster intact", () => {
  const { ctx } = fakeContext();
  const pieces = breakWord(ctx, TAMIL_LONG, 150);
  assert.equal(pieces.join(""), TAMIL_LONG);
  assert.ok(pieces.length > 1, "a word wider than the column is split");
});

test("clusters keep vowel signs and joiners with their base letter", () => {
  assert.deepEqual(clusters("கா"), ["கா"]);
  assert.deepEqual(clusters("क्ष"), ["क्ष"]);
});

test("lineHop leaves Latin alone and floors Indic typesetting", () => {
  assert.equal(lineHop(40, 1.1, "Your life, mapped"), 44);
  assert.equal(lineHop(40, 1.1, "தமிழ்"), 40 * 1.46);
  assert.equal(lineHop(40, 1.6, "தமிழ்"), 64, "a generous factor is respected");
});

test("a Tamil block is taller than the same block set in Latin", () => {
  const latin = blockHeight(["one", "two", "three"], 40, 1.1);
  const tamil = blockHeight(["ஒன்று", "இரண்டு", "மூன்று"], 40, 1.1);
  assert.equal(latin, 132);
  assert.ok(tamil > latin);
  assert.deepEqual(leadOffsets(["ஒன்று", "இரண்டு"], 40, 1.1), [0, 58.4]);
});

test("fitLine pays for tracking in Latin and skips it for Indic", () => {
  const { ctx } = fakeContext();
  const latin = fitLine(ctx, "ASTRO SIVAM", 400, 60, 20, (size) => `600 ${size}px sans-serif`, 8);
  const tamil = fitLine(ctx, "அஸ்ட்ரோ சிவம்", 400, 60, 20, (size) => `600 ${size}px sans-serif`, 8);
  assert.ok(latin < 60, "tracking is deducted from the budget");
  assert.equal(tamil, 60, "no tracking is applied to Tamil, so the start size stands");
});

test("fitLine never drops below the legibility floor", () => {
  const { ctx } = fakeContext();
  const size = fitLine(ctx, "x".repeat(400), 100, 60, 24, (value) => `400 ${value}px sans-serif`);
  assert.equal(size, 24);
});

test("safeSlice never ends inside a cluster", () => {
  const text = "இனிய தீபாவளி";
  const cut = safeSlice(text, 7);
  assert.ok(text.startsWith(cut), "the slice is a prefix");
  assert.ok(cut.length <= 7, "the slice respects the limit");
  // Every cluster in the slice must be a whole cluster of the source — that is
  // what proves the cut did not land between a letter and its vowel sign.
  const source = clusters(text);
  const sliced = clusters(cut);
  assert.deepEqual(sliced, source.slice(0, sliced.length));
  assert.equal(safeSlice("short", 10), "short");
});

test("splitByScript separates Tamil, Devanagari and Latin runs", () => {
  const runs = splitByScript("Diwali — தீபாவளி — दिवाली");
  assert.equal(runs.map((run) => run.script).join(","), "latin,tamil,latin,devanagari");
  assert.equal(runs.map((run) => run.text).join(""), "Diwali — தீபாவளி — दिवाली");
});

test("drawTracked paints Tamil in one call so the shaper sees the cluster", () => {
  const { ctx, drawn } = fakeContext();
  drawTracked(ctx, "தீபாவளி", 10, 10, 6, "left");
  assert.equal(drawn.length, 1, "letter-spacing must not split an Indic run");
  assert.equal(drawn[0].text, "தீபாவளி");
});

test("drawTracked still letterspaces Latin", () => {
  const { ctx, drawn } = fakeContext();
  drawTracked(ctx, "ABC", 0, 0, 5, "left");
  assert.equal(drawn.length, 3);
  assert.deepEqual(drawn.map((entry) => Math.round(entry.x)), [0, 25, 50]);
});

test("every canvas stack names a hosted Indic face and none a missing family", () => {
  const stacks = [DISPLAY(40), SERIF(40), SANS(40), ROUND(40), TAMIL(40), DEVA(40), HINDI_DISPLAY(40)];
  for (const stack of stacks) {
    assert.ok(/Tiro Tamil/.test(stack), `${stack} has no Tamil face`);
    assert.ok(/Noto Sans Devanagari/.test(stack), `${stack} has no Devanagari face`);
    assert.ok(!/Noto Sans Tamil/.test(stack), `${stack} names a family the studio does not ship`);
  }
});

const CSS = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const FONTS = readFileSync(new URL("../src/fonts.css", import.meta.url), "utf8");

test("the stylesheet names the hosted Indic faces in every text stack", () => {
  for (const stack of ["--font-display", "--font-serif", "--font-sans", "--font-tamil", "--font-hindi"]) {
    const line = CSS.split("\n").find((entry) => entry.trim().startsWith(`${stack}:`)) ?? "";
    assert.ok(/Tiro Tamil|Noto Sans Devanagari/.test(line), `${stack} has no Indic face: ${line.trim()}`);
  }
});

test("Tamil and Devanagari opt out of tracking and uppercase in CSS", () => {
  const guard = CSS.slice(CSS.indexOf(".font-tamil,"));
  assert.ok(/:lang\(ta\)/.test(guard), ":lang(ta) is not covered by the tracking guard");
  assert.ok(/:lang\(hi\)/.test(guard), ":lang(hi) is not covered by the tracking guard");
  assert.ok(/letter-spacing:\s*normal\s*!important/.test(guard), "tracking is not neutralised");
  assert.ok(/text-transform:\s*none\s*!important/.test(guard), "uppercase is not neutralised");
});

test("every @font-face loads a hosted file and declares its unicode range", () => {
  const blocks = FONTS.split("@font-face").slice(1);
  assert.ok(blocks.length >= 20, `only ${blocks.length} @font-face rules`);
  for (const block of blocks) {
    assert.ok(/src:\s*url\("\.\/assets\/fonts\/[^"]+\.woff2"\)/.test(block), `a face has no self-hosted woff2: ${block.trim().split("\n")[0]}`);
    assert.ok(/unicode-range:/.test(block), "a face declares no unicode-range");
    assert.ok(/font-display:\s*swap/.test(block), "a face can block text on a slow network");
  }
});
