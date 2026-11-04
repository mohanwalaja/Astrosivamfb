import { test } from "node:test";
import assert from "node:assert/strict";

import { installCanvasEnv } from "../tools/canvas-env.mjs";
import { BRAND } from "../src/data/brand.ts";
import { getDeity } from "../src/data/deities.ts";
import { FB_COPY_ENTRIES } from "../src/data/fbCopy.ts";
import { IG_COPY_ENTRIES, IG_STORY_ENTRIES } from "../src/data/igCopy.ts";
import { IG_DM_KEYWORDS, IG_LINK_STACK } from "../src/data/instagram.ts";
import { CALENDAR } from "../src/data/calendar.ts";
import { adsFor, referencePlates } from "../src/data/serviceAds.ts";
import { AD_LAYOUT_MAP, renderServiceAd } from "../src/lib/serviceAds.ts";
import { auditLegibility } from "../src/lib/legibility.ts";
import { SERVICES, getService } from "../src/data/services/index.ts";
import {
  RASI_PALAN_HIGHLIGHTS,
  RASI_PALAN_PERIODS,
  RASI_PALAN_PERIOD_LABELS,
  RASI_PALAN_SIGNS,
} from "../src/data/services/rasipalan.ts";

installCanvasEnv();

test("Rasi Palan is one complete service, without removing age-gated Birth plans", () => {
  const matches = SERVICES.filter((service) => service.id === "rasipalan");
  assert.equal(matches.length, 1);
  assert.ok(getService("kids-jathagam"));
  assert.ok(getService("students-jathagam"));
  assert.ok(SERVICES.some((service) => service.id === "kids-jathagam"));
  assert.ok(SERVICES.some((service) => service.id === "students-jathagam"));

  const service = matches[0];
  assert.equal(service.path, "/rasipalan");
  assert.equal(service.url, "https://astrosivam.com/rasipalan");
  assert.equal(service.kind, "Free daily");
  assert.equal(service.price, "Read online");
  assert.equal(service.creative.cta, "astrosivam.com/rasipalan");
});

test("the live Rasi Palan structure covers four periods and twelve Moon signs", () => {
  assert.deepEqual(RASI_PALAN_PERIODS, ["Daily", "Weekly", "Monthly", "Yearly"]);
  assert.equal(RASI_PALAN_SIGNS.length, 12);
  assert.equal(new Set(RASI_PALAN_SIGNS).size, 12);
  assert.equal(RASI_PALAN_SIGNS[0], "Aries");
  assert.equal(RASI_PALAN_SIGNS.at(-1), "Pisces");
  assert.deepEqual(RASI_PALAN_PERIOD_LABELS, ["Extra caution", "Care needed", "Normal period"]);
  assert.deepEqual(RASI_PALAN_HIGHLIGHTS, ["Money & Wealth", "Career & Business", "Love & Relations", "Travel"]);

  const service = getService("rasipalan");
  for (const period of RASI_PALAN_PERIODS) {
    assert.ok(service.promise.includes(period) || service.creative.subline.includes(period));
  }
  assert.match(service.proof, /stores no forecast body or dated prediction/);
});

test("Rasi Palan has selling, teaching and social coverage", () => {
  assert.equal(adsFor("rasipalan").length, 4);
  assert.ok(referencePlates("rasipalan").length >= 2);
  assert.ok(FB_COPY_ENTRIES.some((entry) => entry.serviceId === "rasipalan" && entry.cta.url.endsWith("/rasipalan")));
  assert.ok(IG_STORY_ENTRIES.some((entry) => entry.id === "story-rasi-palan"));
  assert.ok(IG_LINK_STACK.some((entry) => entry.url.endsWith("/rasipalan")));
  assert.ok(IG_DM_KEYWORDS.some((entry) => entry.link.endsWith("/rasipalan")));
  assert.ok(CALENDAR.filter((entry) => entry.serviceId === "rasipalan").length >= 2);
});

test("all four Rasi Palan advertisements pass the mobile legibility audit", async () => {
  const service = getService("rasipalan");
  for (const ad of adsFor(service.id)) {
    const layout = AD_LAYOUT_MAP[ad.layout];
    const rendered = await renderServiceAd({
      layout: ad.layout,
      theme: ad.theme,
      style: ad.layout === "ad-statement" ? "mono" : "gopuram",
      copy: ad.copy,
      lang: "en",
      price: service.price,
      url: service.url.replace(/^https?:\/\//, ""),
      motif: service.motif,
      art: ad.art ? getDeity(ad.art)?.file ?? null : null,
      scale: 0.25,
    });
    const audit = auditLegibility(rendered.typography, layout.auditWidth, layout.mobileWidth);
    assert.ok(
      audit.passes,
      `${ad.id}: ${audit.failing.map((finding) => `${finding.role} ${finding.effective}<${finding.minimum}`).join(", ")}`,
    );
  }
});

test("current public copy does not use retired service URLs", () => {
  const serviceText = SERVICES.map((service) => `${service.url} ${service.creative.cta}`).join("\n");
  const facebookText = FB_COPY_ENTRIES.flatMap((entry) => [
    entry.cta.url,
    entry.content.cta,
    entry.captions.facebook,
    entry.captions.instagram,
  ]).join("\n");
  const instagramText = IG_COPY_ENTRIES.flatMap((entry) => [
    entry.cta.url,
    entry.content.cta,
    entry.captions.facebook,
    entry.captions.instagram,
  ]).join("\n");
  for (const text of [serviceText, facebookText, instagramText]) {
    assert.doesNotMatch(text, /astrosivam\.com\/panchangam(?:\b|$)/);
    assert.doesNotMatch(text, /astrosivam\.com\/transits(?:\b|$)/);
  }
});

test("Beta and Birth plan prices state the current limits and tiers", () => {
  assert.match(BRAND.firstReport, /one per account, email address and IP address/);
  assert.match(BRAND.firstReport, /later orders at standard price/);
  const birth = getService("jathagam");
  assert.match(birth.priceNote, /Bhava\/Varga US\$10 · ₹940/);
  assert.ok(FB_COPY_ENTRIES.find((entry) => entry.id === "jathagam-flagship")?.captions.facebook.includes("Bhava or Varga Jathagam US$10 · ₹940"));
});
