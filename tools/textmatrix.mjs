/**
 * Multilingual text audit.
 *
 * Renders every canvas engine in English, Tamil, Hindi and a mixed stress
 * string, and reports what the canvases actually did — not what they were
 * supposed to do. Every `fillText` is captured through a proxy around the 2D
 * context, then replayed on a scratch canvas to find the real ink box, so the
 * report can answer four questions per drawn string:
 *
 *   1. is every character in the font stack (no tofu)?
 *   2. does the ink match the advance `measureText` reported?
 *   3. does the ink stay inside the canvas (no clipping)?
 *   4. does any string's ink overlap another string's ink?
 *
 * Run: npx tsx tmp/textmatrix.mjs [--engine=fb|ig|ads|fest|templates] [--json]
 */
import { installCanvasEnv, makeCanvas } from "./canvas-env.mjs";
import { writeFileSync } from "node:fs";

installCanvasEnv();

const { renderFbCreative, FB_LAYOUTS } = await import("../src/lib/fbCreative.ts");
const { renderIgCreative, IG_LAYOUTS } = await import("../src/lib/igCreative.ts");
const { renderServiceAd, AD_LAYOUTS } = await import("../src/lib/serviceAds.ts");
const { renderFestivalCard, CARD_STYLES, CARD_FORMATS } = await import("../src/lib/festivalCreative.ts");
const { renderCreative } = await import("../src/lib/templates.ts");
const { FORMAT_MAP } = await import("../src/data/formats.ts");
const { SERVICES } = await import("../src/data/services/index.ts");
const { getFestival } = await import("../src/data/festivals.ts");
const { festivalCopy, festivalDateView } = await import("../src/lib/festivalKit.ts");
const { missingGlyphs } = await import("../src/lib/script.ts");

/* ------------------------------ instrumentation ---------------------------- */

let records = [];
const originals = new Map();

const originalCreate = globalThis.document.createElement.bind(globalThis.document);
globalThis.document.createElement = (tag) => {
  const canvas = originalCreate(tag);
  if (tag !== "canvas") return canvas;
  const get = canvas.getContext.bind(canvas);
  canvas.getContext = (type, attrs) => {
    const ctx = get(type, attrs);
    return ctx && type === "2d" ? instrument(ctx, canvas) : ctx;
  };
  return canvas;
};

function instrument(ctx, canvas) {
  originals.set(ctx, ctx);
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === "fillText" || prop === "strokeText") {
        return (text, x, y, maxWidth) => {
          // Report the point in canvas space: labels are drawn inside
          // translate/rotate blocks, and an untransformed coordinate reads as
          // "off canvas" when it is nothing of the kind.
          const m = target.getTransform?.();
          const px = m ? m.a * x + m.c * y + m.e : x;
          const py = m ? m.b * x + m.d * y + m.f : y;
          records.push({
            text: String(text),
            x: px,
            y: py,
            scale: m ? Math.hypot(m.a, m.b) : 1,
            font: target.font,
            align: target.textAlign,
            baseline: target.textBaseline,
            fill: String(target.fillStyle),
            stroke: prop === "strokeText",
            canvas,
          });
          if (maxWidth === undefined) return target[prop](text, x, y);
          return target[prop](text, x, y, maxWidth);
        };
      }
      if (prop === "measureText") return (text) => target.measureText(String(text));
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

/* -------------------------------- ink probe -------------------------------- */

const probeCache = new Map();

/** Real ink box of one string, in canvas coordinates, measured from pixels. */
function inkBox(record) {
  const key = [record.font, record.text, record.align, record.baseline, record.fill, record.stroke].join("\u0000");
  const cached = probeCache.get(key);
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(record.font)?.[1] ?? 40);
  if (!cached) {
    const probe = makeCanvas(1, 1);
    const measure = probe.getContext("2d");
    measure.font = record.font;
    const advance = measure.measureText(record.text).width;
    const pad = Math.ceil(size * 2.5) + 24;
    // Centred and right-aligned text needs its own width on both sides of the
    // anchor, or the probe canvas clips it and the measured box is a lie.
    const width = Math.ceil(advance * 2 + pad * 2 + size * 4);
    const height = Math.ceil(size * 5);
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.font = record.font;
    ctx.fillStyle = "#000000";
    ctx.textAlign = record.align;
    ctx.textBaseline = record.baseline;
    const anchorX = width / 2;
    if (record.stroke) {
      ctx.lineWidth = 1;
      ctx.strokeText(record.text, anchorX, height / 2, advance + size);
    } else {
      ctx.fillText(record.text, anchorX, height / 2, advance + size);
    }
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const result =
      maxX < 0
        ? { empty: true, advance, size }
        : { empty: false, advance, size, left: minX - anchorX, top: minY - height / 2, width: maxX - minX + 1, height: maxY - minY + 1 };
    const stored = { result, anchor: { pad: anchorX, cy: height / 2 } };
    probeCache.set(key, stored);
    return stored;
  }
  return cached;
}

/* --------------------------------- content -------------------------------- */

const EN = {
  kicker: "Jathagam · Birth chart",
  headline: "Your life, mapped",
  subline: "A practising priest reads the chart. Nothing here is generated.",
  tamil: "",
  hindi: "",
  chips: ["10 poruthams", "Priest review", "24-hour delivery"],
  price: "FROM US$5 · ₹470",
  cta: "Order your jathagam",
  footer: "astrosivam.com · first report free",
};

const TA = {
  kicker: "ஜாதகம் · பிறப்பு சாரம்",
  headline: "உங்கள் வாழ்க்கை, வரையப்பட்டது",
  subline: "பயிற்சி பெற்ற அர்ச்சகர் சாரத்தை வாசிக்கிறார்.",
  tamil: "இனிய தீபாவளி வாழ்த்துக்கள்",
  hindi: "",
  chips: ["பத்து பொருத்தங்கள்", "அர்ச்சகர் சரிபார்ப்பு", "24 மணி நேரம்"],
  price: "US$5 · ₹470",
  cta: "ஜாதகம் பெறுங்கள்",
  footer: "astrosivam.com",
};

const HI = {
  kicker: "जन्म कुंडली",
  headline: "आपका जीवन, मानचित्रित",
  subline: "एक प्रशिक्षित पुरोहित कुंडली पढ़ते हैं।",
  tamil: "",
  hindi: "दीपावली की हार्दिक शुभकामनाएँ",
  chips: ["दस मेल", "पुरोहित समीक्षा", "24 घंटे"],
  price: "US$5 · ₹470",
  cta: "कुंडली मंगाएँ",
  footer: "astrosivam.com",
};

/** Long, punctuation-heavy, mixed script, multi-paragraph. */
const STRESS = {
  kicker: "தமிழ் · हिंदी · ENGLISH — mixed",
  headline: "இனிய தீபாவளி வாழ்த்துக்கள் — दीपावली की शुभकामनाएँ",
  subline:
    "A single line that runs long enough to wrap twice at the column width (with parentheses, “quotes”, dashes — and an ellipsis…), followed by தமிழ் and हिंदी in the same paragraph.\nA second paragraph, on its own line, long enough to wrap again at Tamil: இனிய தீபாவளி வாழ்த்துக்கள், உங்கள் குடும்பத்திற்கு நல்வாழ்த்துக்கள்.",
  tamil: "இனிய தீபாவளி வாழ்த்துக்கள், உங்கள் குடும்பத்திற்கு நல்வாழ்த்துக்கள்.",
  hindi: "दीपावली की हार्दिक शुभकामनाएँ, आपके परिवार को मंगलमय शुभकामनाएँ।",
  chips: ["₹470 · US$5", "1st name free", "90% refund"],
  price: "FROM US$5 · ₹470",
  cta: "Order your jathagam (24 h)",
  footer: "astrosivam.com · Lahiri sidereal · Chennai",
};

const SCRIPTS = { en: EN, ta: TA, hi: HI, mixed: STRESS };

/**
 * Deliberately hostile copy, run once per engine: a thirty-two character Tamil
 * word with no break opportunity, a Devanagari compound, straight and curly
 * quotes, an em dash, a rupee amount, and a multi-paragraph offer.
 */
const LONG = {
  ...STRESS,
  kicker: "பஞ்சாங்கம் · पंचांग · PANCHANGAM",
  headline: "திருவான்மியூர்த்திருச்சிற்றம்பலம்திருவண்ணாமலை",
  subline:
    "The panchangam runs from sunrise (சூரியோதயம்) to the next sunrise — nakshatra, tithi, yoga and karana — with “quoted” terms, (parentheses), ₹470 / US$5 pricing…\nA second paragraph in Tamil: நட்சத்திரம், திதி, யோகம், கரணம் ஆகியவை கணிக்கப்படுகின்றன.",
  tamil: "திருவான்மியூர்த்திருச்சிற்றம்பலம் — மங்கள வாழ்த்துக்கள்",
  hindi: "दीपावली की हार्दिक शुभकामनाएँ, आपके परिवार को मंगलमय शुभकामनाएँ।",
};

const service = SERVICES[0];
const festival = getFestival("deepavali");

const festivalCard = (copy, language) =>
  festivalCopy(festival, festivalDateView("deepavali", 2026), {
    greetings: {
      en: copy.headline,
      ta: copy.tamil || festival.greetingTa,
      hi: copy.hindi || festival.greetingHi,
    },
    subline: copy.subline,
    footer: "ASTROSIVAM.COM",
  });

/* --------------------------------- matrix --------------------------------- */

const wanted = (process.argv.find((arg) => arg.startsWith("--engine=")) ?? "--engine=all").split("=")[1].split(",");
const runAll = wanted.includes("all");
const jobs = [];

if (runAll || wanted.includes("fb")) {
  for (const [script, copy] of Object.entries(SCRIPTS)) {
    for (const layout of FB_LAYOUTS) {
      jobs.push({
        engine: "fb",
        layout: layout.key,
        script,
        run: () =>
          renderFbCreative({
            layout: layout.key,
            themeKey: "midnight",
            style: "signature",
            content: { ...copy, chips: [...copy.chips] },
            art: null,
          }),
      });
    }
  }
}

if (runAll || wanted.includes("ig")) {
  for (const [script, copy] of Object.entries(SCRIPTS)) {
    for (const layout of IG_LAYOUTS) {
      jobs.push({
        engine: "ig",
        layout: layout.key,
        script,
        run: () =>
          renderIgCreative({
            layout: layout.key,
            themeKey: "midnight",
            style: "signature",
            content: { ...copy, chips: [...copy.chips], index: "01 / 07", glyph: "sun", attribution: "Brihat Parashara Hora Shastra" },
            art: null,
          }),
      });
    }
  }
}

if (runAll || wanted.includes("ads")) {
  for (const script of ["en", "ta", "hi"]) {
    for (const layout of AD_LAYOUTS) {
      const copy = SCRIPTS[script];
      jobs.push({
        engine: "ads",
        layout: layout.key,
        script,
        run: () =>
          renderServiceAd({
            layout: layout.key,
            theme: "midnight",
            style: "signature",
            lang: script,
            copy: {
              kicker: copy.kicker,
              headline: copy.headline,
              subline: copy.subline,
              cta: copy.cta,
              facts: [...copy.chips],
              tamil: copy.tamil,
              hindi: copy.hindi,
              body: copy.subline,
              source: "Lahiri sidereal",
            },
            price: copy.price,
            url: "astrosivam.com",
            motif: "sun",
            art: null,
          }),
      });
    }
  }
}

if (runAll || wanted.includes("fest")) {
  for (const script of ["en", "ta", "hi"]) {
    for (const style of CARD_STYLES) {
      for (const format of CARD_FORMATS.filter((entry) => entry.key === "ig-post" || entry.key === "ig-story")) {
        const copy = SCRIPTS[script];
        jobs.push({
          engine: "fest",
          layout: `${style.key}/${format.key}`,
          script,
          run: () =>
            renderFestivalCard({
              format: format.key,
              style: style.key,
              theme: style.defaultTheme,
              display: style.defaultDisplay,
              script: style.defaultScript,
              logo: style.defaultLogo,
              language: script,
              copy: festivalCard(copy, script),
              art: null,
              motif: festival.motif,
            }),
        });
      }
    }
  }
}

if (runAll || wanted.includes("templates")) {
  const format = FORMAT_MAP["ig-post"];
  // Every one of the twelve art directions the studio ships.
  for (const script of ["en", "ta", "hi"]) {
    for (const style of ["signature", "thanjavur", "kolam", "silk", "gopuram", "deepam", "mono", "paper", "ephemeris", "aurum", "glass", "orbit"]) {
      const copy = SCRIPTS[script];
      jobs.push({
        engine: "templates",
        layout: `${style}/${format.key}`,
        script,
        run: async () => {
          const canvas = await renderCreative({
            format,
            style,
            themeKey: "midnight",
            service,
            content: { kicker: copy.kicker, headline: copy.headline, subline: copy.subline, tamil: copy.tamil, chips: [...copy.chips], price: copy.price, cta: copy.cta },
          });
          return { canvas, layout: { key: `${style}/${format.id}` } };
        },
      });
    }
  }
}

if (runAll || wanted.includes("long")) {
  const jobsFor = [
    [
      "fb",
      "educational",
      () =>
        renderFbCreative({
          layout: "educational",
          themeKey: "midnight",
          style: "signature",
          content: { ...LONG, chips: [...LONG.chips] },
          art: null,
        }),
    ],
    [
      "ig",
      "ig-education",
      () =>
        renderIgCreative({
          layout: "ig-education",
          themeKey: "midnight",
          style: "signature",
          content: { ...LONG, chips: [...LONG.chips], index: "01 / 07", glyph: "sun", attribution: "Brihat Parashara Hora Shastra" },
          art: null,
        }),
    ],
    [
      "ads",
      "ad-statement",
      () =>
        renderServiceAd({
          layout: "ad-statement",
          theme: "midnight",
          style: "signature",
          lang: "ta",
          copy: { kicker: LONG.kicker, headline: LONG.headline, subline: LONG.subline, cta: LONG.cta, facts: [...LONG.chips], tamil: LONG.tamil, hindi: LONG.hindi, body: LONG.subline, source: "Lahiri sidereal" },
          price: LONG.price,
          url: "astrosivam.com",
          motif: "sun",
          art: null,
        }),
    ],
    [
      "fest",
      "traditional/ig-post",
      () =>
        renderFestivalCard({
          format: "ig-post",
          style: "traditional",
          theme: CARD_STYLES.find((entry) => entry.key === "traditional").defaultTheme,
          display: CARD_STYLES.find((entry) => entry.key === "traditional").defaultDisplay,
          script: CARD_STYLES.find((entry) => entry.key === "traditional").defaultScript,
          logo: CARD_STYLES.find((entry) => entry.key === "traditional").defaultLogo,
          language: "ta",
          copy: festivalCard(LONG, "ta"),
          art: null,
          motif: festival.motif,
        }),
    ],
    [
      "templates",
      "mono/ig-post",
      async () => {
        const canvas = await renderCreative({
          format: FORMAT_MAP["ig-post"],
          style: "mono",
          themeKey: "midnight",
          service,
          content: { kicker: LONG.kicker, headline: LONG.headline, subline: LONG.subline, tamil: LONG.tamil, chips: [...LONG.chips], price: LONG.price, cta: LONG.cta },
        });
        return { canvas, layout: { key: "mono/ig-post" } };
      },
    ],
  ];
  jobsFor.forEach(([engine, layout, run]) => jobs.push({ engine, layout, script: "long", run }));
}

/* --------------------------------- report --------------------------------- */

const rows = [];
const findings = [];

for (const job of jobs) {
  records = [];
  let canvas;
  let meta = null;
  let error = null;
  try {
    const out = await job.run();
    canvas = out.canvas;
    meta = out.layout ?? null;
  } catch (cause) {
    error = cause;
  }
  if (error) {
    rows.push({ engine: job.engine, layout: job.layout, script: job.script, error: String(error.message ?? error) });
    continue;
  }

  const W = canvas.width;
  const H = canvas.height;
  const boxes = [];
  const tofu = new Set();
  const clipped = [];
  let maxRatio = 0;
  let maxTop = 0;
  let maxBottom = 0;
  let draws = 0;
  let empty = 0;
  let minPx = Number.POSITIVE_INFINITY;

  for (const record of records) {
    // Ignore the glyph probes canvas.ts runs while rendering (hasGlyph draws a
    // single reference character at 4,4 on its own throw-away canvas).
    if (record.canvas !== canvas) continue;
    if (!record.text.trim() || record.text.includes("\uFFFF")) continue;
    draws += 1;
    const missing = missingGlyphs(record.font, record.text).filter((char) => !/[\s\u200C\u200D]/.test(char));
    missing.forEach((char) => tofu.add(`${char} in ${record.font.replace(/"|px/g, "").slice(0, 34)}`));

    const { result, anchor } = inkBox(record);
    if (result.empty) {
      empty += 1;
      continue;
    }
    const scale = record.scale ?? 1;
    const left = record.x + result.left * scale;
    const right = left + result.width * scale;
    const top = record.y + result.top * scale;
    const bottom = top + result.height * scale;
    boxes.push({ record, left, right, top, bottom, size: result.size });
    maxRatio = Math.max(maxRatio, result.width / Math.max(1, result.advance));
    if (result.size) minPx = Math.min(minPx, result.size);
    maxTop = Math.max(maxTop, -result.top / result.size);
    maxBottom = Math.max(maxBottom, (result.top + result.height) / result.size);
    if (left < -1 || top < -1 || right > W + 1 || bottom > H + 1) {
      clipped.push(`${record.text.slice(0, 20)} @${Math.round(record.x)},${Math.round(record.y)} ${record.font.split("px")[0]} [${Math.round(left)}→${Math.round(right)} / ${W}]`);
    }
  }

  // Safe area for *text*. A layout's `safeArea` is a crop guide (the circle a
  // profile photo is shown in, the mobile banner crop) and text is allowed to
  // sit outside it — that is why the guide is drawn. What text may not do is
  // bleed off the canvas, or sit under the Stories UI chrome at the top and
  // bottom of a 9:16 surface. One per cent is a bleed tolerance, not a design
  // rule: a full-width header bar is allowed to reach the edge.
  const story = job.engine === "ig" && job.layout === "ig-story";
  const safe = story
    ? { x: W * 0.02, y: H * 0.14, w: W * 0.96, h: H * 0.72 }
    : { x: W * 0.01, y: H * 0.01, w: W * 0.98, h: H * 0.98 };
  const unsafe = [];
  if (job.engine === "fb" || job.engine === "ig") {
    for (const box of boxes) {
      if (box.record.text.trim().length < 2) continue;
      const outside =
        box.left < safe.x - 1 || box.top < safe.y - 1 || box.right > safe.x + safe.w + 1 || box.bottom > safe.y + safe.h + 1;
      if (outside) {
        unsafe.push(`“${box.record.text.slice(0, 16)}” [${Math.round(box.left)},${Math.round(box.top)}] vs ${Math.round(safe.x)},${Math.round(safe.y)} ${Math.round(safe.w)}×${Math.round(safe.h)}`);
      }
    }
  }

  let overlaps = 0;
  const overlapSamples = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      // A display numeral at 2.5× the text size is a background watermark (the
      // chapter index), not two lines colliding.
      if (Math.max(a.size, b.size) / Math.min(a.size, b.size) > 2.5) continue;
      // A text shadow / echo pass paints the same string at the same anchor.
      if (a.record.text === b.record.text && Math.abs(a.record.x - b.record.x) < 1 && Math.abs(a.record.y - b.record.y) < 1) continue;
      // Two letters of one tracked word: adjacent glyph boxes are allowed to
      // touch, that is what tracking is.
      if (Array.from(a.record.text).length === 1 && Array.from(b.record.text).length === 1) continue;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w <= 0 || h <= 0) continue;
      const area = w * h;
      const smaller = Math.min((a.right - a.left) * (a.bottom - a.top), (b.right - b.left) * (b.bottom - b.top));
      if (area / smaller > 0.3) {
        overlaps += 1;
        if (overlapSamples.length < 2) overlapSamples.push(`“${a.record.text.slice(0, 14)}” × “${b.record.text.slice(0, 14)}” ${Math.round((area / smaller) * 100)}%`);
      }
    }
  }

  if (!Number.isFinite(minPx)) minPx = 0;
  rows.push({
    engine: job.engine,
    layout: job.layout,
    script: job.script,
    draws,
    tofu: [...tofu],
    clipped,
    overlaps,
    overlapSamples,
    empty,
    unsafe,
    minPx: Number(minPx.toFixed(1)),
    maxRatio: Number(maxRatio.toFixed(2)),
    inkTop: Number(maxTop.toFixed(2)),
    inkBottom: Number(maxBottom.toFixed(2)),
    size: `${W}×${H}`,
  });
  if (tofu.size)
    findings.push(`${job.engine}/${job.layout}/${job.script}: missing glyphs → ${[...tofu].slice(0, 4).join(", ")}`);
  if (clipped.length) findings.push(`${job.engine}/${job.layout}/${job.script}: ${clipped.length} clipped → ${clipped.slice(0, 2).join(" | ")}`);
  if (overlaps) findings.push(`${job.engine}/${job.layout}/${job.script}: ${overlaps} text overlaps → ${overlapSamples.join(" | ")}`);
  if (unsafe.length) findings.push(`${job.engine}/${job.layout}/${job.script}: ${unsafe.length} outside the safe area → ${unsafe.join(" | ")}`);
}

/* -------------------------------- printing -------------------------------- */

const pad = (value, width) => String(value).padEnd(width);
console.log(`\n${rows.length} renders\n`);
const header = `${pad("engine", 10)}${pad("layout", 30)}${pad("script", 7)}${pad("draws", 6)}${pad("tofu", 5)}${pad("clip", 5)}${pad("ovlp", 5)}${pad("safe", 5)}${pad("min px", 7)}${pad("ink/adv", 8)}${pad("top em", 8)}${pad("bot em", 7)}`;
console.log(header);
console.log("-".repeat(header.length));
for (const row of rows) {
  if (row.error) {
    console.log(`${pad(row.engine, 10)}${pad(row.layout, 30)}${pad(row.script, 7)}ERROR ${row.error}`);
    continue;
  }
  console.log(
    `${pad(row.engine, 10)}${pad(row.layout, 30)}${pad(row.script, 7)}${pad(row.draws, 6)}${pad(row.tofu.length, 5)}${pad(row.clipped.length, 5)}${pad(row.overlaps, 5)}${pad(row.unsafe?.length ?? 0, 5)}${pad(row.minPx, 7)}${pad(row.maxRatio, 8)}${pad(row.inkTop, 8)}${pad(row.inkBottom, 7)}`,
  );
}

console.log(`\n${"".padEnd(10)}summary by script (worst case across engines)`);
for (const script of Object.keys(SCRIPTS)) {
  const subset = rows.filter((row) => row.script === script && !row.error);
  const tofu = subset.reduce((sum, row) => sum + row.tofu.length, 0);
  const clip = subset.reduce((sum, row) => sum + row.clipped.length, 0);
  const unsafe = subset.reduce((sum, row) => sum + (row.unsafe?.length ?? 0), 0);
  const overlap = subset.reduce((sum, row) => sum + row.overlaps, 0);
  const top = Math.max(0, ...subset.map((row) => row.inkTop));
  const bottom = Math.max(0, ...subset.map((row) => row.inkBottom));
  console.log(`${pad(script, 10)}renders ${pad(subset.length, 5)}tofu ${pad(tofu, 4)}clipped ${pad(clip, 4)}overlaps ${pad(overlap, 4)}outside safe ${pad(unsafe, 4)}tallest ink above baseline ${top} em, below ${bottom} em`);
}

if (findings.length) {
  console.log(`\n${findings.length} findings`);
  findings.slice(0, 80).forEach((line) => console.log(`  · ${line}`));
} else {
  console.log("\nNo findings.");
}

if (process.argv.includes("--json")) {
  writeFileSync(".samples/textmatrix.json", JSON.stringify({ rows, findings }, null, 2));
  console.log("\nwrote .samples/textmatrix.json");
}
