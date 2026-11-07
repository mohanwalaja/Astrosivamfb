import { test } from "node:test";
import assert from "node:assert/strict";
import { installCanvasEnv } from "../tools/canvas-env.mjs";
import { renderIgCreative } from "../src/lib/igCreative.ts";

installCanvasEnv();

const content = {
  kicker: "Jathagam · Birth chart",
  headline: "Your life, mapped",
  subline: "A practising priest reads the chart. Nothing here is generated.",
  tamil: "உங்கள் வாழ்க்கை வரைபடம்",
  hindi: "आपका जीवन, एक मानचित्र",
  chips: ["10 poruthams", "Priest review", "24-hour delivery"],
  price: "FROM US$5 · ₹470",
  cta: "Order your jathagam",
  footer: "astrosivam.com · first report free",
};

test("Instagram service-card headlines preserve whole words at feed size", async () => {
  const result = await renderIgCreative({ layout: "ig-service", themeKey: "midnight", style: "signature", content, scale: 0.5 });
  const lines = result.typography
    .filter((entry) => entry.role === "headline" && entry.text !== content.price)
    .map((entry) => entry.text);
  assert.ok(lines.length > 0, "the service card must paint its headline");
  assert.equal(lines.join(" ").toLowerCase(), content.headline.toLowerCase());
  assert.ok(!lines.some((line) => line.length === 1), "a final letter must not be stranded on its own line");
});

test("Instagram service cards carry no price", async () => {
  const result = await renderIgCreative({ layout: "ig-service", themeKey: "midnight", style: "signature", content, scale: 0.5 });
  const price = result.typography.find((entry) => entry.role === "headline" && entry.text === content.price);
  assert.equal(price, undefined, "the price must not be painted on any poster");
});
