import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installCanvasEnv, makeCanvas } from "../tools/canvas-env.mjs";
import { FORMAT_MAP } from "../src/data/formats.ts";
import { SERVICES } from "../src/data/services/index.ts";
import { STYLES } from "../src/data/brand.ts";

installCanvasEnv();

/**
 * Price cards are removed from every poster (see PR #14 and the follow-up that
 * retired the price pill in the twelve art directions). Testing the copy is not
 * enough: the layouts draw `content.price` and `service.priceNote` directly, so
 * these tests spy on the canvas itself and fail on any currency glyph that
 * reaches the paint surface.
 */

const MONEY = /US\$|₹|\$\s?\d|€|£|\bUSD\b|\bINR\b/;

/** Every painted string for one render, read off the canvas context. */
async function paintedText(render: () => Promise<unknown>): Promise<string[]> {
  const proto = Object.getPrototypeOf(makeCanvas(10, 10).getContext("2d"));
  const original = proto.fillText;
  const drawn: string[] = [];
  proto.fillText = function (this: unknown, text: string, ...rest: unknown[]) {
    drawn.push(String(text));
    return original.call(this, text, ...rest);
  };
  try {
    await render();
  } finally {
    proto.fillText = original;
  }
  return drawn;
}

test("no art direction paints a price on a feed post or square", async () => {
  const { renderCreative, defaultContent } = await import("../src/lib/templates.ts");
  const offenders: string[] = [];
  for (const format of [FORMAT_MAP["ig-post"], FORMAT_MAP["ig-square"]]) {
    for (const service of SERVICES) {
      const content = defaultContent(format, service);
      for (const style of STYLES) {
        const drawn = await paintedText(() =>
          renderCreative({ format, style: style.key, service, content, scale: 0.2 }),
        );
        for (const line of drawn) {
          if (MONEY.test(line)) offenders.push(`${format.id} · ${service.id} · ${style.key} · “${line}”`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `prices still painted:\n${offenders.join("\n")}`);
});

test("no story, reel cover or carousel slide paints a price", async () => {
  const { renderCreative, defaultContent } = await import("../src/lib/templates.ts");
  const offenders: string[] = [];
  const formats = ["ig-story", "ig-reel-cover", "ig-carousel"].map((id) => FORMAT_MAP[id]).filter(Boolean);
  assert.ok(formats.length >= 2, "the story, reel cover and carousel formats must exist");
  for (const format of formats) {
    for (const service of SERVICES) {
      const content = defaultContent(format, service);
      for (const style of ["signature", "kolam", "mono"]) {
        const drawn = await paintedText(() =>
          renderCreative({ format, style: style as never, service, content, scale: 0.2 }),
        );
        for (const line of drawn) {
          if (MONEY.test(line)) offenders.push(`${format.id} · ${service.id} · ${style} · “${line}”`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `prices still painted:\n${offenders.join("\n")}`);
});

test("the copy that feeds the canvas carries no price either", async () => {
  // A price can also arrive through a chip or a subline, not just `price`.
  const offenders: string[] = [];
  for (const service of SERVICES) {
    const fields = [service.creative.kicker, service.creative.headline, service.creative.subline, ...service.creative.chips];
    for (const field of fields) {
      if (MONEY.test(field)) offenders.push(`${service.id}: “${field}”`);
    }
  }
  assert.deepEqual(offenders, [], `poster copy still quotes money:\n${offenders.join("\n")}`);
});

test("no service ad, Facebook creative or Instagram creative paints a price", async () => {
  const { renderServiceAd, AD_LAYOUTS } = await import("../src/lib/serviceAds.ts");
  const { renderFbCreative, FB_LAYOUT_MAP } = await import("../src/lib/fbCreative.ts");
  const { renderIgCreative, IG_LAYOUT_MAP } = await import("../src/lib/igCreative.ts");
  const { SERVICE_ADS } = await import("../src/data/serviceAds.ts");
  const offenders: string[] = [];

  const check = async (label: string, render: () => Promise<unknown>) => {
    for (const line of await paintedText(render)) {
      if (MONEY.test(line)) offenders.push(`${label} · “${line}”`);
    }
  };

  for (const ad of SERVICE_ADS.slice(0, 3)) {
    const service = SERVICES.find((entry) => entry.id === ad.serviceId);
    assert.ok(service, `${ad.serviceId} must exist`);
    const content = {
      ...service.creative,
      ...ad.copy,
      price: service.price,
      footer: "astrosivam.com",
    };
    for (const layout of AD_LAYOUTS) {
      await check(`ad ${ad.id} / ${layout.key}`, () =>
        renderServiceAd({
          layout: layout.key,
          themeKey: "midnight",
          style: "signature",
          copy: content,
          price: service.price,
          priceNote: service.priceNote,
          url: service.url,
          service: service.id,
          motif: service.motif,
          scale: 0.3,
        } as never),
      );
    }
    const fbCopy = { ...content, tamil: "", chips: service.creative.chips };
    for (const key of Object.keys(FB_LAYOUT_MAP)) {
      await check(`fb ${ad.id} / ${key}`, () =>
        renderFbCreative({ layout: key, themeKey: "midnight", style: "signature", content: fbCopy, scale: 0.3 } as never),
      );
    }
    for (const key of Object.keys(IG_LAYOUT_MAP)) {
      await check(`ig ${ad.id} / ${key}`, () =>
        renderIgCreative({ layout: key, themeKey: "midnight", style: "signature", content: fbCopy, scale: 0.3 } as never),
      );
    }
  }
  assert.deepEqual(offenders, [], `prices still painted:\n${offenders.join("\n")}`);
});

test("the price painters stay retired at the source level", () => {

  // The cheapest guard against a regression: the layouts must not read the
  // price fields at all, so a future edit cannot quietly re-enable a card.
  const stylePosts = readFileSync(new URL("../src/lib/stylePosts.ts", import.meta.url), "utf8");
  assert.equal(/c\.content\.price/.test(stylePosts), false, "stylePosts must not read content.price");
  assert.equal(/service\.priceNote/.test(stylePosts), false, "stylePosts must not print the fee note");

  const templates = readFileSync(new URL("../src/lib/templates.ts", import.meta.url), "utf8");
  assert.equal(/content\.price/.test(templates), false, "templates must not read content.price");
  assert.equal(/service\.price\b/.test(templates), false, "templates must not print service.price");
});
