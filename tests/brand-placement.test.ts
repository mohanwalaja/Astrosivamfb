import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_SCALE_MAX,
  BRAND_SCALE_MIN,
  DEFAULT_BRAND_PLACEMENT,
  brandSize,
  brandSpot,
  getBrandPlacement,
  setBrandPlacement,
  subscribeBrandPlacement,
} from "../src/lib/brandPlacement.ts";

test("brand placement defaults to the top-left brand rule at 100%", () => {
  const placement = getBrandPlacement();
  assert.equal(placement.position, "top-left");
  assert.equal(placement.scale, 1);
  assert.equal(brandSize(80), 80);
});

test("brand placement clamps scale and rejects unknown positions", () => {
  setBrandPlacement({ scale: 9 });
  assert.equal(getBrandPlacement().scale, BRAND_SCALE_MAX);
  setBrandPlacement({ scale: -3 });
  assert.equal(getBrandPlacement().scale, BRAND_SCALE_MIN);
  setBrandPlacement({ position: "middle-somewhere" as never });
  assert.equal(getBrandPlacement().position, DEFAULT_BRAND_PLACEMENT.position);
  setBrandPlacement({ position: "bottom-center", scale: 1.25 });
  assert.equal(brandSize(80), 100);
  setBrandPlacement({ ...DEFAULT_BRAND_PLACEMENT });
});

test("brand spot honours all six corners, the bands and the pinned row", () => {
  const W = 1080;
  const H = 1350;
  const size = 100;

  setBrandPlacement({ position: "top-left" });
  let spot = brandSpot(W, H, size, { pad: 70, topBand: 40, bottomBand: 90 });
  assert.deepEqual(spot, { x: 70, y: 40 + size * 0.3, align: "left" });

  setBrandPlacement({ position: "top-right" });
  spot = brandSpot(W, H, size, { pad: 70, topBand: 40, bottomBand: 90 });
  assert.deepEqual(spot, { x: W - 70, y: 40 + size * 0.3, align: "right" });

  setBrandPlacement({ position: "bottom-center" });
  spot = brandSpot(W, H, size, { pad: 70, topBand: 40, bottomBand: 90 });
  assert.deepEqual(spot, { x: W / 2, y: H - 90 - size * 1.3, align: "center" });

  // A pinned row (header bars) keeps its vertical position for every corner.
  setBrandPlacement({ position: "bottom-left" });
  spot = brandSpot(W, H, size, { pad: 70, lockY: 12 });
  assert.deepEqual(spot, { x: 70, y: 12, align: "left" });

  setBrandPlacement({ ...DEFAULT_BRAND_PLACEMENT });
});

test("brand placement notifies subscribers and stops after unsubscribe", () => {
  let calls = 0;
  const unsubscribe = subscribeBrandPlacement(() => {
    calls += 1;
  });
  setBrandPlacement({ position: "top-center" });
  assert.equal(calls, 1);
  unsubscribe();
  setBrandPlacement({ position: "top-left" });
  assert.equal(calls, 1);
  assert.deepEqual(getBrandPlacement(), DEFAULT_BRAND_PLACEMENT);
});
