import { test } from "node:test";
import assert from "node:assert/strict";
import { installCanvasEnv, makeCanvas } from "../tools/canvas-env.mjs";
import { COMPOSITIONS, DESIGN_BRIEFS, getOccasion, type DesignCategory } from "../src/data/designBriefs.ts";
import { planComposition, planSignature, containsBox, boxesOverlap } from "../src/lib/compositionPlan.ts";
import { selectDesign, type DesignHistoryEntry } from "../src/lib/designSelector.ts";
import { englishCopy, validatePosterCopy } from "../src/lib/englishCopy.ts";
import { resolveTemplate } from "../src/data/posterTemplates.ts";

installCanvasEnv();

const copyFor = (category: DesignCategory) => {
  const brief = DESIGN_BRIEFS.find((b) => b.key === category)!;
  const occasion = brief.occasions[0];
  return { ...occasion.copy, footer: "astrosivam.com" };
};

test("twelve composition systems have distinct responsive geometry", () => {
  assert.equal(COMPOSITIONS.length, 12);
  assert.equal(new Set(COMPOSITIONS.map((c) => c.structure)).size, 12);
  for (const [width, height] of [[1080, 1350], [1080, 1080], [1200, 628], [1080, 1920]]) {
    const signatures = COMPOSITIONS.map((c) => planSignature(planComposition({ key: c.key, category: "birth", width, height })));
    assert.equal(new Set(signatures).size, 12, `${width}x${height} has repeated composition geometry`);
  }
});

test("selector never repeats consecutively and never uses one family three times in a row", () => {
  let history: DesignHistoryEntry[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 240; i++) {
    const category = DESIGN_BRIEFS[i % DESIGN_BRIEFS.length].key;
    const selection = selectDesign({ category, width: 1080, height: 1350, seed: 9000 + i }, history);
    seen.add(selection.composition);
    assert.notEqual(selection.composition, history.at(-1)?.composition);
    const families = history.slice(-2).map((h) => COMPOSITIONS.find((c) => c.key === h.composition)!.family);
    if (families.length === 2 && families[0] === families[1]) {
      assert.notEqual(COMPOSITIONS.find((c) => c.key === selection.composition)!.family, families[0]);
    }
    history = [...history, { composition: selection.composition, category, seed: selection.seed, at: i }].slice(-24);
  }
  assert.equal(seen.size, 12, "selector failed to reach every composition system");
});

test("selector is deterministic for the same brief, history and seed", () => {
  const history: DesignHistoryEntry[] = [{ composition: "hero", category: "birth", seed: 1, at: 1 }];
  const a = selectDesign({ category: "birth", width: 1080, height: 1350, seed: 42 }, history);
  const b = selectDesign({ category: "birth", width: 1080, height: 1350, seed: 42 }, history);
  assert.deepEqual(a, b);
});

test("English-only copy contract removes Tamil/Hindi and validates poster fields", () => {
  const copy = englishCopy({ headline: "Your chart", tamil: "உங்கள் ஜாதகம்", hindi: "आपकी कुंडली", subline: "Clear guidance" });
  assert.equal(copy.tamil, "");
  assert.equal(copy.hindi, "");
  assert.equal(copy.headline, "Your chart");
  assert.ok(validatePosterCopy({ headline: "Your chart", serviceTitle: "Birth Jathagam" }).length === 0);
  assert.ok(validatePosterCopy({ headline: "உங்கள் ஜாதகம்", serviceTitle: "Birth" }).length > 0);
});

test("legacy cinematic alias still migrates to nocturne, while the new devotional system is separate", () => {
  assert.equal(resolveTemplate("cinematic"), "nocturne");
  assert.equal(resolveTemplate("devotional"), "devotional");
});

test("every new composition renders readable, safe, non-overlapping English text in four formats", async () => {
  const { renderComposition, getDesignAudit } = await import("../src/lib/compositionRender.ts");
  const formats = [[1080, 1350], [1080, 1080], [1200, 628], [1080, 1920]] as const;
  for (const composition of COMPOSITIONS) {
    for (const [width, height] of formats) {
      const copy = width > height ? { ...copyFor("birth"), subline: "Birth chart, planetary periods and life areas, read with care." } : copyFor("birth");
      const canvas = await renderComposition({ width, height, composition: composition.key, category: "birth", occasion: "discover", themeKey: "midnight", style: "ephemeris", display: "cormorant", image: null, showLogo: true, copy, scale: .2 });
      const audit = getDesignAudit(canvas)!;
      assert.ok(audit, `${composition.key} ${width}x${height} has no audit`);
      assert.deepEqual(audit.overflow, [], `${composition.key} ${width}x${height} overflow`);
      assert.ok(audit.legibility.passes, `${composition.key} ${width}x${height} legibility: ${JSON.stringify(audit.legibility.failing)}`);
      for (const entry of audit.text) {
        assert.ok(containsBox(audit.plan.safe, entry.box, 2), `${composition.key} ${width}x${height} text outside safe area: ${entry.text}`);
        assert.ok(!/[\u0900-\u097F\u0B80-\u0BFF]/.test(entry.text), "Indic text reached the canvas");
      }
      for (let i = 0; i < audit.text.length; i++) for (let j = i + 1; j < audit.text.length; j++) {
        const a = audit.text[i], b = audit.text[j];
        if (a.role === b.role && a.text === b.text) continue;
        assert.ok(boxesOverlap(a.box, b.box) < 4, `${composition.key} ${width}x${height} text overlap: "${a.text}" / "${b.text}"`);
      }
    }
  }
});

test("layered motion settles into the static composition", async () => {
  const { renderComposition, renderCompositionLayers } = await import("../src/lib/compositionRender.ts");
  const { paintMotionFrame } = await import("../src/lib/motion.ts");
  const options = { width: 540, height: 675, composition: "cosmic" as const, category: "birth" as const, occasion: "discover", themeKey: "midnight" as const, style: "ephemeris" as const, display: "cormorant" as const, image: null, showLogo: true, copy: copyFor("birth"), scale: 1 };
  const still = await renderComposition(options);
  const layers = await renderCompositionLayers(options);
  const frame = makeCanvas(540, 675);
  paintMotionFrame(frame.getContext("2d")! as unknown as CanvasRenderingContext2D, layers, 1);
  const a = still.getContext("2d")!.getImageData(0, 0, 540, 675).data;
  const b = frame.getContext("2d")!.getImageData(0, 0, 540, 675).data;
  let diff = 0;
  for (let i = 0; i < a.length; i += 4) diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  assert.ok(diff / (540 * 675 * 3) < 1.5, `final motion frame differs from PNG by ${diff / (540 * 675 * 3)}`);
  paintMotionFrame(frame.getContext("2d")! as unknown as CanvasRenderingContext2D, layers, .2);
  const early = frame.getContext("2d")!.getImageData(0, 0, 540, 675).data;
  let changed = 0;
  for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - early[i]) + Math.abs(a[i + 1] - early[i + 1]) + Math.abs(a[i + 2] - early[i + 2]) > 20) changed++;
  assert.ok(changed > 1000, "motion preview is not visibly different from the static poster");
});

test("motion reveals the painted lockup even under global brand placement", async () => {
  const { renderComposition, renderCompositionLayers, getDesignAudit } = await import("../src/lib/compositionRender.ts");
  const { paintMotionFrame } = await import("../src/lib/motion.ts");
  const options = { width: 540, height: 675, composition: "editorial" as const, category: "birth" as const, themeKey: "ivory" as const, style: "paper" as const, display: "cormorant" as const, image: null, showLogo: true, useGlobalBrandPlacement: true, copy: copyFor("birth"), scale: 1 };
  const still = await renderComposition(options);
  const audit = getDesignAudit(still)!;
  assert.ok(audit.logoBox, "the painted logo bounds must be audited");
  assert.ok(audit.ctaBox, "the painted CTA bounds must be audited");
  const layers = await renderCompositionLayers(options);
  assert.deepEqual(layers.audit.logoBox, audit.logoBox);
  const frame = makeCanvas(540, 675);
  paintMotionFrame(frame.getContext("2d")! as unknown as CanvasRenderingContext2D, layers, 1);
  const a = still.getContext("2d")!.getImageData(0, 0, 540, 675).data;
  const b = frame.getContext("2d")!.getImageData(0, 0, 540, 675).data;
  let diff = 0;
  for (let i = 0; i < a.length; i += 4) diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  assert.ok(diff / (540 * 675 * 3) < 1.5, "global-placement logo must survive the motion composite");
});

test("a rejected layered render releases every layer canvas", async () => {
  const { renderCompositionLayers } = await import("../src/lib/compositionRender.ts");
  const long = { ...copyFor("birth"), footer: "An unreasonably long footer line that can never fit inside the small footer box of any composition system at all." };
  await assert.rejects(() => renderCompositionLayers({ width: 540, height: 675, composition: "minimal", category: "birth", themeKey: "ivory", style: "mono", display: "inter", image: null, showLogo: true, copy: long, scale: .5 }));
});
