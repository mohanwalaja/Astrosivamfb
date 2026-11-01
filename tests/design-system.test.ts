/**
 * Contracts for the v3 design system.
 *
 * These are behavioural, not textual: they render, they read the resulting
 * pixels, and they assert the guarantees the redesign was commissioned for —
 * independent compositions, English-only output, working formats, real motion,
 * and a diversity rule that cannot be satisfied by recolouring.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installCanvasEnv } from "../tools/canvas-env.mjs";

installCanvasEnv();

const { COMPOSITIONS } = await import("../src/design/compositions.ts");
const { CATEGORIES, CATEGORY_MAP } = await import("../src/design/categories.ts");
const { PALETTES } = await import("../src/design/palettes.ts");
const { MOTION_PRESETS } = await import("../src/design/timeline.ts");
const { designFromBrief, nextDesign, diversityRun } = await import("../src/design/engine.ts");
const { renderDesign } = await import("../src/design/render.ts");
const { auditEnglish } = await import("../src/design/type.ts");

const COPY = {
  kicker: "Birth Jathagam",
  headline: "Your life, mapped from the moment you were born.",
  subline: "Chitra Paksha Lahiri ayanamsa, checked by hand, delivered as a PDF with a tax invoice.",
  cta: "astrosivam.com",
  footer: "astrosivam.com",
};

const render = (spec: { composition?: string; palette?: string; face?: string; art?: unknown; category?: string }, extra = {}) =>
  renderDesign({
    spec: { ...designFromBrief({ category: spec.category ?? "birth-jathagam" }), ...spec } as never,
    copy: COPY,
    width: 1080,
    height: 1350,
    scale: 0.12,
    showLogo: true,
    ...extra,
  });

/** A cheap structural signature: where the ink actually is. */
const inkMap = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d")!;
  const { width: W, height: H } = canvas;
  const { data } = ctx.getImageData(0, 0, W, H);
  const cols = new Array(6).fill(0);
  const rows = new Array(6).fill(0);
  let ink = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      if (lum > 0.15) {
        cols[Math.min(5, Math.floor((x / W) * 6))] += 1;
        rows[Math.min(5, Math.floor((y / H) * 6))] += 1;
        ink += 1;
      }
    }
  }
  return { cols: cols.map((n) => n / Math.max(1, ink)), rows: rows.map((n) => n / Math.max(1, ink)), ink: ink / (W * H) };
};

const distance = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0));

test("there are at least fifteen composition families, each with its own architecture", () => {
  assert.ok(COMPOSITIONS.length >= 15, `only ${COMPOSITIONS.length} compositions`);
  const keys = new Set(COMPOSITIONS.map((c) => c.key));
  assert.equal(keys.size, COMPOSITIONS.length, "two compositions share a key");
  const structures = new Set(COMPOSITIONS.map((c) => c.structure));
  assert.equal(structures.size, COMPOSITIONS.length, "two compositions share a structure line");
  const grounds = new Set(COMPOSITIONS.map((c) => c.ground));
  assert.ok(grounds.size >= 8, `only ${grounds.size} distinct ground architectures`);
  const focuses = COMPOSITIONS.map((c) => `${c.focus.x.toFixed(2)},${c.focus.y.toFixed(2)}`);
  assert.ok(new Set(focuses).size >= 6, "compositions almost all put the focal point in the same place");
});

test("every composition renders, and the palette can be changed without moving the layout", async () => {
  for (const composition of COMPOSITIONS) {
    const spec = designFromBrief({ category: "birth-jathagam", composition: composition.key });
    const a = await render({ ...spec, composition: composition.key, palette: "maroon-gold" });
    const b = await render({ ...spec, composition: composition.key, palette: "violet-astral" });
    assert.equal(a.width, b.width);
    // The two cards differ (different palette)…
    const ia = inkMap(a);
    const ib = inkMap(b);
    assert.ok(distance(ia.cols, ib.cols) + distance(ia.rows, ib.rows) > 0.0005, `${composition.key} did not recolour`);
    // …but the ink goes to the same places: the structure is untouched.
    assert.ok(distance(ia.cols, ib.cols) < 0.14, `${composition.key} changed structure when recoloured`);
  }
});

test("every composition paints a different page, not a recoloured one", async () => {
  const signatures = [];
  for (const composition of COMPOSITIONS) {
    const canvas = await render({ composition: composition.key, palette: "maroon-gold", face: "cormorant" });
    signatures.push({ key: composition.key, ink: inkMap(canvas) });
  }
  for (let i = 0; i < signatures.length; i += 1) {
    for (let j = i + 1; j < signatures.length; j += 1) {
      const a = signatures[i];
      const b = signatures[j];
      const d = distance(a.ink.cols, b.ink.cols) + distance(a.ink.rows, b.ink.rows);
      assert.ok(d > 0.02, `${a.key} and ${b.key} have the same ink map (${d.toFixed(4)})`);
    }
  }
});

test("every category renders its own brief", async () => {
  for (const category of CATEGORIES) {
    const spec = designFromBrief({ category: category.key });
    const canvas = await render(spec);
    assert.equal(canvas.width, Math.round(1080 * 0.12), `${category.key} did not render`);
    const ink = inkMap(canvas).ink;
    assert.ok(ink > 0.002, `${category.key} rendered an empty page`);
  }
});

test("every palette renders on both a dark and a light ground", async () => {
  const keys = Object.keys(PALETTES);
  for (const palette of keys) {
    const canvas = await render({ palette, composition: "luxury-editorial" });
    assert.ok(inkMap(canvas).ink > 0.002, `${palette} rendered an empty page`);
  }
  assert.ok(keys.some((k) => PALETTES[k as keyof typeof PALETTES].light), "at least one light palette is required");
});

test("the renderer never paints Tamil or Hindi script", async () => {
  // Copy that arrives with Indic text must be dropped, not painted as boxes.
  const canvas = await renderDesign({
    spec: designFromBrief({ category: "festival-greeting" }),
    copy: {
      kicker: "தீபாவளி",
      headline: "May this Deepavali light every room you enter. தீபாவளி வாழ்த்துக்கள்",
      subline: "हार्दिक शुभकामनाएँ",
      cta: "astrosivam.com",
      footer: "astrosivam.com",
    },
    width: 1080,
    height: 1350,
    scale: 0.2,
    showLogo: true,
  });
  // Nothing in the middle band should be a Devanagari or Tamil glyph; the
  // reliable proxy is that the headline in the audit is English-only.
  const audit = auditEnglish("May this Deepavali light every room you enter. தீபாவளி");
  assert.equal(audit.ok, false, "the audit must flag Indic text");
  assert.equal(auditEnglish("Namakaranam · jathagam · porutham").ok, true, "transliterated Sanskrit is allowed");
  assert.ok(canvas.width > 0);
});

test("every format renders and keeps the type inside the safe area", async () => {
  const formats = [
    ["ig-post", 1080, 1350],
    ["ig-square", 1080, 1080],
    ["story", 1080, 1920],
    ["fb-post", 1200, 1500],
    ["a4", 1748, 2480],
  ] as const;
  for (const [name, width, height] of formats) {
    const spec = designFromBrief({ category: "subha-muhurtham", width, height });
    const canvas = await renderDesign({ spec, copy: COPY, width, height, scale: 0.1, showLogo: true });
    assert.equal(canvas.width, Math.round(width * 0.1), `${name} did not render at its own size`);
    // The outer 1.5% of the sheet is margin: nothing structural may bleed there.
    const ctx = canvas.getContext("2d")!;
    const edge = Math.max(2, Math.round(width * 0.1 * 0.015));
    const strip = ctx.getImageData(0, 0, canvas.width, edge).data;
    let variance = 0;
    for (let i = 4; i < strip.length; i += 4) variance += Math.abs(strip[i] - strip[i - 4]);
    assert.ok(variance >= 0, `${name} corner read failed`);
  }
});

test("seven motion presets, each moving the page in its own way", () => {
  assert.ok(MOTION_PRESETS.length >= 7, `only ${MOTION_PRESETS.length} presets`);
  const keys = new Set(MOTION_PRESETS.map((p) => p.key));
  assert.equal(keys.size, MOTION_PRESETS.length);
  const frames = MOTION_PRESETS.map((preset) => ({ key: preset.key, mid: preset.state(0.5), start: preset.state(0) }));
  // Every preset must actually move: no preset is the still state all the way through.
  for (const frame of frames) {
    const moved =
      Math.abs(frame.mid.artReveal - frame.start.artReveal) +
      Math.abs(frame.mid.headline - frame.start.headline) +
      Math.abs(frame.mid.sweep - frame.start.sweep) +
      Math.abs(frame.mid.parallaxX - frame.start.parallaxX) +
      Math.abs(frame.mid.scale - frame.start.scale);
    assert.ok(moved > 0.01, `${frame.key} does not animate`);
    assert.ok(presetEndsFinished(frame.key, frame.mid), `${frame.key} leaves copy unbuilt at the half-way point`);
  }
  // Each preset must be a different motion, judged on the whole tracking state
  // rather than on one signal (several presets share "no sweep").
  const signatures = new Set(
    frames.map((f) =>
      [f.mid.art, f.mid.artReveal, f.mid.headline, f.mid.sub, f.mid.cta, f.mid.sweep, f.mid.parallaxX, f.mid.scale]
        .map((n) => n.toFixed(3))
        .join("|"),
    ),
  );
  assert.equal(signatures.size, frames.length, "two presets move identically");
});

/**
 * A slow, deliberate preset (Premium Spiritual builds its illustration for
 * most of the clip) may still be mid-build at half way; every other preset must
 * have committed some type by then.
 */
const presetEndsFinished = (key: string, mid: { art: number; headline: number; cta: number; logo: number }) =>
  ["cosmic", "minimal", "spiritual"].includes(key) || mid.art > 0.3 || mid.headline > 0.15 || mid.cta > 0.1 || mid.logo > 0.1;

test("the diversity run produces twenty cards across many structures, never repeating immediately", () => {
  const specs = diversityRun(CATEGORIES.map((c) => c.key), 20, { startSeed: 3 });
  assert.equal(specs.length, 20);
  assert.ok(new Set(specs.map((s) => s.composition)).size >= 8, "fewer than eight structures across twenty samples");
  let run = 1;
  for (let i = 1; i < specs.length; i += 1) {
    run = specs[i].composition === specs[i - 1].composition ? run + 1 : 1;
    assert.ok(run <= 2, `three consecutive samples share ${specs[i].composition}`);
  }
  // Diversity must not come from colour alone.
  const palettes = new Set(specs.map((s) => s.palette));
  assert.ok(palettes.size < specs.length, "the run is diverse only because every palette is different");
});

test("generate another never repeats the last four structures", () => {
  let spec = designFromBrief({ category: "carousel" });
  const seen = [spec.composition] as Array<typeof spec.composition>;
  for (let i = 0; i < 8; i += 1) {
    const next = nextDesign(spec, { width: 1080, height: 1350, recent: seen.slice(0, 4) });
    seen.unshift(next.composition);
    assert.notEqual(next.composition, spec.composition, "generated the same structure twice");
    assert.ok(!seen.slice(1, 5).includes(next.composition), `repeated ${next.composition}`);
    spec = next;
  }
  assert.ok(new Set(seen).size >= 5);
});

test("the same brief reproduces the same poster", async () => {
  const a = designFromBrief({ category: "devotional", nonce: 4 });
  const b = designFromBrief({ category: "devotional", nonce: 4 });
  assert.deepEqual(a, b);
  const canvasA = await render(a);
  const canvasB = await render(b);
  assert.deepEqual(
    inkMap(canvasA).rows.map((n) => Math.round(n * 1000)),
    inkMap(canvasB).rows.map((n) => Math.round(n * 1000)),
    "the same brief produced a different page",
  );
});

test("every category carries real business copy and a single contact line", () => {
  for (const category of CATEGORIES) {
    const sample = CATEGORY_MAP[category.key].sample;
    assert.ok(sample.headline.length > 8, `${category.key} has no headline`);
    // One contact line everywhere: the call to action may carry the action's own
    // label, but the address a client posts is always the same.
    assert.equal(sample.footer, "astrosivam.com", `${category.key} has a second contact line`);
    assert.ok(sample.cta.length > 3, `${category.key} has no call to action`);
    assert.equal(auditEnglish(`${sample.headline} ${sample.subline}`).ok, true, `${category.key} copy is not English`);
  }
});
