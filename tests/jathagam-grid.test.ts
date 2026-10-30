import { test } from "node:test";
import assert from "node:assert/strict";
import { installCanvasEnv, makeCanvas } from "../tools/canvas-env.mjs";
import { THEMES } from "../src/data/brand.ts";
import { jathagam } from "../src/data/services/jathagam.ts";
import { drawServiceArt } from "../src/lib/stylePosts.ts";

installCanvasEnv();

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number) {
  return [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3);
}

function colorDistance(a: number[], b: number[]) {
  return a.reduce((sum, channel, index) => sum + Math.abs(channel - b[index]), 0);
}

test("Kolam Jathagam art keeps the South Indian chart's central field open", () => {
  const canvas = makeCanvas(400, 400);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  drawServiceArt(ctx, jathagam, "kolam", 200, 200, 280, THEMES.dawn, 1);

  // At nine local units from center the bindu is out of range. A crossed grid
  // would paint a bright separator through these two samples; the correct
  // twelve-house layout leaves them visually continuous with adjacent pixels.
  const verticalCenter = pixel(ctx, 200, 225);
  const verticalLeft = pixel(ctx, 195, 225);
  const verticalRight = pixel(ctx, 205, 225);
  assert.ok(colorDistance(verticalCenter, verticalLeft) < 24);
  assert.ok(colorDistance(verticalCenter, verticalRight) < 24);

  const horizontalCenter = pixel(ctx, 225, 200);
  const horizontalTop = pixel(ctx, 225, 195);
  const horizontalBottom = pixel(ctx, 225, 205);
  assert.ok(colorDistance(horizontalCenter, horizontalTop) < 24);
  assert.ok(colorDistance(horizontalCenter, horizontalBottom) < 24);

  // The divisions that define the twelve perimeter houses remain visible.
  assert.ok(colorDistance(pixel(ctx, 151, 225), pixel(ctx, 156, 225)) > 24);
  assert.ok(colorDistance(pixel(ctx, 225, 151), pixel(ctx, 225, 156)) > 24);
});
