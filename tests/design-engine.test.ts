import { test } from "node:test";
import assert from "node:assert/strict";
import { installCanvasEnv } from "../tools/canvas-env.mjs";
import { COMPOSITIONS, DESIGN_BRIEFS, getOccasion, type DesignCategory } from "../src/data/designBriefs.ts";
import { planComposition, planSignature, containsBox, boxesOverlap } from "../src/lib/compositionPlan.ts";
import { englishCopy, validatePosterCopy } from "../src/lib/englishCopy.ts";

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



test("English-only copy contract removes Tamil/Hindi and validates poster fields", () => {
  const copy = englishCopy({ headline: "Your chart", tamil: "உங்கள் ஜாதகம்", hindi: "आपकी कुंडली", subline: "Clear guidance" });
  assert.equal(copy.tamil, "");
  assert.equal(copy.hindi, "");
  assert.equal(copy.headline, "Your chart");
  assert.ok(validatePosterCopy({ headline: "Your chart", serviceTitle: "Birth Jathagam" }).length === 0);
  assert.ok(validatePosterCopy({ headline: "உங்கள் ஜாதகம்", serviceTitle: "Birth" }).length > 0);
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



