import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FB_CATEGORIES,
  FB_COPY_BY_ID,
  FB_COPY_ENTRIES,
  FB_PAGE_ASSETS,
  composePost,
} from "../src/data/fbCopy.ts";
import { FB_COMPLIANCE, FB_PAGE_FIELDS, FB_TABS } from "../src/data/facebook.ts";
import { SERVICE_MAP } from "../src/data/services/index.ts";
import { validateCaption } from "../src/lib/imageValidate.ts";

const HASHTAG = /#[\p{L}\p{N}_]+/gu;
const UNIVERSAL_TAGS = new Set(["#AstroSivam"]);

/* -------------------------------- the library ---------------------------- */

test("every content category has at least two ready posts", () => {
  for (const category of FB_CATEGORIES) {
    const count = FB_COPY_ENTRIES.filter((entry) => entry.category === category.id).length;
    assert.ok(count >= 2, `${category.label} has only ${count} post(s)`);
    assert.ok(category.note.trim().length > 10, `${category.label} needs an editor note`);
  }
});

test("ids are unique and the index matches the library", () => {
  const ids = FB_COPY_ENTRIES.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.equal(FB_COPY_BY_ID[id]?.id, id);
});

test("service posts point at a real service in the catalogue", () => {
  for (const entry of FB_COPY_ENTRIES) {
    if (!entry.serviceId) continue;
    assert.ok(SERVICE_MAP[entry.serviceId], `${entry.id} references unknown service ${entry.serviceId}`);
    if (entry.category === "service") assert.ok(SERVICE_MAP[entry.serviceId].kind === "Paid report");
  }
});

test("no post leaves the brand line or the call to action empty", () => {
  for (const entry of FB_COPY_ENTRIES) {
    assert.ok(/astrosivam/i.test(entry.content.footer), `${entry.id} loses the brand in transit`);
    assert.ok(entry.cta.line.trim().length > 3, `${entry.id} has no CTA line`);
    assert.ok(entry.cta.url.trim().length > 3, `${entry.id} has no CTA url`);
    assert.ok(entry.cta.quickReply.trim().length > 3, `${entry.id} has no Messenger quick reply`);
    assert.match(entry.cta.url, /astrosivam\.com/, `${entry.id} must link to the site`);
  }
});

test("the price on a service ad is a price the catalogue charges", () => {
  // Guards against a stale price surviving a catalogue change.
  for (const entry of FB_COPY_ENTRIES.filter((item) => item.category === "service")) {
    const price = entry.content.price;
    assert.ok(/\d/.test(price), `${entry.id} has no number in its price`);
    assert.ok(price.includes("₹") || price.includes("US$"), `${entry.id} price is missing a currency`);
  }
  const priced = FB_COPY_ENTRIES.filter((entry) => entry.category === "educational" || entry.category === "festival");
  for (const entry of priced) {
    assert.equal(entry.content.price, "", `${entry.id} should not put a price on an education or festival image`);
  }
});

/* -------------------------------- captions ------------------------------- */

test("every caption fits the platform and is written for the feed", () => {
  for (const entry of FB_COPY_ENTRIES) {
    for (const platform of ["facebook", "instagram"] as const) {
      const caption = entry.captions[platform];
      const result = validateCaption(caption, [platform]);
      assert.equal(result.ok, true, `${entry.id} ${platform}: ${result.issues.map((issue) => issue.message).join(" ")}`);
      const firstLine = caption.split("\n")[0];
      assert.ok(firstLine.length <= 125, `${entry.id} ${platform} opens with ${firstLine.length} characters`);
      assert.ok(firstLine.length >= 12, `${entry.id} ${platform} opens with no hook at all`);
      assert.ok(!firstLine.includes("#"), `${entry.id} ${platform} starts with hashtags instead of a hook`);
    }
  }
});

test("the two platforms get genuinely different captions", () => {
  for (const entry of FB_COPY_ENTRIES) {
    assert.notEqual(
      entry.captions.facebook,
      entry.captions.instagram,
      `${entry.id} reuses the Facebook caption on Instagram`,
    );
    assert.ok(
      entry.captions.instagram.length <= entry.captions.facebook.length + 40,
      `${entry.id} Instagram caption should be the tighter of the two`,
    );
  }
});

test("no caption promises an outcome or claims accuracy", () => {
  const banned = /\b(guarantee|guaranteed|100% accurate|will cure|destiny will|assured result)\b/i;
  for (const entry of FB_COPY_ENTRIES) {
    for (const platform of ["facebook", "instagram"] as const) {
      assert.doesNotMatch(entry.captions[platform], banned, `${entry.id} ${platform} breaches the compliance rule`);
    }
  }
});

test("composed posts stay inside Meta's hashtag guidance", () => {
  for (const entry of FB_COPY_ENTRIES) {
    for (const platform of ["facebook", "instagram"] as const) {
      const post = composePost(entry.captions[platform], entry, platform);
      const tags = post.match(HASHTAG) ?? [];
      assert.ok(tags.length >= 3, `${entry.id} ${platform} has only ${tags.length} hashtags`);
      assert.ok(tags.length <= 9, `${entry.id} ${platform} has ${tags.length} hashtags — too many for a feed post`);
      assert.equal(new Set(tags).size, tags.length, `${entry.id} ${platform} repeats a hashtag`);
      assert.equal(post.split("\n\n").at(-1), tags.join(" "), "hashtags belong on one trailing line");
      assert.ok(post.startsWith(entry.captions[platform].trim()), "the caption must not be rewritten");
    }
  }
});

test("every post carries the brand tag", () => {
  for (const entry of FB_COPY_ENTRIES) {
    const tags = [entry.hashtags.core, entry.hashtags.local, entry.hashtags.service].flat();
    assert.ok(
      tags.some((tag) => UNIVERSAL_TAGS.has(tag)),
      `${entry.id} is missing #AstroSivam`,
    );
  }
});

test("hashtags are shaped like hashtags and are not duplicated across groups", () => {
  for (const entry of FB_COPY_ENTRIES) {
    const groups = [entry.hashtags.core, entry.hashtags.local, entry.hashtags.service];
    const tags = groups.flat();
    for (const tag of tags) assert.match(tag, /^#[\p{L}\p{N}_]+$/u, `${entry.id}: ${tag} is not a hashtag`);
    assert.equal(new Set(tags).size, tags.length, `${entry.id} repeats a hashtag across groups`);
  }
});

/* ------------------------------- page assets ----------------------------- */

test("profile and cover assets exist, are distinct, and keep the brand line", () => {
  assert.deepEqual(FB_PAGE_ASSETS.map((asset) => asset.id).sort(), ["cover-lockup", "profile-seal"]);
  const seal = FB_PAGE_ASSETS.find((asset) => asset.id === "profile-seal")!;
  const cover = FB_PAGE_ASSETS.find((asset) => asset.id === "cover-lockup")!;
  assert.equal(seal.layout, "profile-seal");
  assert.equal(cover.layout, "cover-lockup");
  assert.ok(seal.content.tamil.trim().length > 0, "the profile seal keeps the Tamil line");
  assert.ok(cover.content.headline.length > 20, "the cover needs a promise");
  assert.ok(cover.content.cta.trim().length > 0, "the cover needs a call to action");
  assert.ok(cover.content.chips.length === 3, "the cover's left wing shows three deliverables");
  assert.notEqual(seal.content.headline, cover.content.headline);
});

/* ------------------------- page kit stays coherent ------------------------ */

test("the page kit still ships bio fields, tabs and the compliance rules", () => {
  assert.ok(FB_PAGE_FIELDS.length >= 6);
  assert.ok(FB_TABS.length >= 3);
  assert.ok(FB_COMPLIANCE.length >= 4);
  for (const rule of FB_COMPLIANCE) {
    assert.ok(rule.title.trim() && rule.body.trim(), "every compliance rule needs a title and a body");
  }
});
