import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { installCanvasEnv, makeCanvas } from "../tools/canvas-env.mjs";
import { THEMES } from "../src/data/brand.ts";
import { drawBrandLockup, type BrandOrientation } from "../src/lib/brandLockup.ts";
import { ensureFonts, loadLogo } from "../src/lib/canvas.ts";

installCanvasEnv();

function digest(canvas: ReturnType<typeof makeCanvas>) {
  return createHash("sha256").update(canvas.toBuffer("image/png")).digest("hex");
}

test("logo lockups render horizontal, stacked and circular arrangements inside their bounds", async () => {
  await ensureFonts();
  const logo = await loadLogo();
  const rendered = new Map<BrandOrientation, string>();
  for (const orientation of ["horizontal", "vertical", "circular"] as const) {
    const canvas = makeCanvas(440, 320);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = "#11131C";
    ctx.fillRect(0, 0, 440, 320);
    const bounds = drawBrandLockup(ctx, logo, {
      x: 220,
      y: 160,
      markSize: 92,
      textSize: 25,
      orientation,
      align: "center",
      name: "ASTRO SIVAM",
      font: '600 25px "Cinzel", Georgia, serif',
      theme: THEMES.midnight,
    });
    assert.ok(bounds.x >= 0 && bounds.y >= 0, `${orientation} starts outside the preview`);
    assert.ok(bounds.x + bounds.width <= canvas.width, `${orientation} extends beyond the right edge`);
    assert.ok(bounds.y + bounds.height <= canvas.height, `${orientation} extends beyond the bottom edge`);
    rendered.set(orientation, digest(canvas));
  }
  assert.equal(new Set(rendered.values()).size, 3, "each arrangement should produce a distinct composition");
});
