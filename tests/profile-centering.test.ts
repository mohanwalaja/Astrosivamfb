import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { installCanvasEnv } from "../tools/canvas-env.mjs";
import { FORMAT_MAP } from "../src/data/formats.ts";
import { SERVICES } from "../src/data/services/index.ts";
import { defaultContent, renderCreative } from "../src/lib/templates.ts";

installCanvasEnv();
const ROOT = new URL("..", import.meta.url).pathname;
const TEMPLATES = readFileSync(join(ROOT, "src/lib/templates.ts"), "utf8");

test("Facebook and Instagram avatar marks are vertically centered in the square crop", async () => {
  for (const id of ["fb-profile", "ig-profile"] as const) {
    const format = FORMAT_MAP[id];
    const canvas = await renderCreative({
      format,
      themeKey: "midnight",
      service: SERVICES[0],
      content: defaultContent(format, SERVICES[0]),
      scale: 1,
    });
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let total = 0;
    let ySum = 0;
    // Isolate the bright gold logo glyph from the surrounding low-opacity orbit.
    for (let y = Math.round(canvas.height * 0.2); y < Math.round(canvas.height * 0.75); y += 1) {
      for (let x = Math.round(canvas.width * 0.25); x < Math.round(canvas.width * 0.75); x += 1) {
        const index = (y * canvas.width + x) * 4;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        if (red > 140 && green > 90 && blue < 120 && red - green > 20) {
          total += 1;
          ySum += y;
        }
      }
    }
    const normalizedCenterY = ySum / total / canvas.height;
    assert.ok(total > 10_000, `${id} logo mask was not found`);
    assert.ok(
      Math.abs(normalizedCenterY - 0.5) < 0.006,
      `${id} gold mark centroid is at y=${normalizedCenterY.toFixed(4)}, not the photo center`,
    );
  }
});

test("the Open Graph rasi chart keeps a clear margin inside its 1200×630 canvas", () => {
  const link = TEMPLATES.slice(TEMPLATES.indexOf("function renderLink("), TEMPLATES.indexOf("/* ---------------------------------- story"));
  assert.match(link, /const chartSize = H \* 0\.58/);
  assert.match(link, /const chartCenterX = W \* 0\.79/);
  const { width, height } = FORMAT_MAP["link-card"];
  const size = height * 0.58;
  // The jathagam motif's outermost line reaches 44 units from its 100-unit center.
  const extent = size * 0.45; // includes stroke and shadow clearance
  const cx = width * 0.79;
  const cy = height * 0.5;
  assert.ok(cx - extent >= 24, "chart has a left safety margin");
  assert.ok(width - (cx + extent) >= 24, "chart is fully inside the right edge");
  assert.ok(cy - extent >= 24, "chart has a top safety margin");
  assert.ok(height - (cy + extent) >= 24, "chart has a bottom safety margin");
});
