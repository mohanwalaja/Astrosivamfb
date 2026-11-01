import { test } from "node:test";
import assert from "node:assert/strict";
import { getService } from "../src/data/services/index.ts";
import { countHashtags, servicePublishCaptions, withHashtags } from "../src/lib/publishCaptions.ts";

test("withHashtags replaces the trailing tag block, removes duplicates, and applies the cap", () => {
  const caption = withHashtags("A useful caption.\n\n#Old #Old", ["#New", "#New", "#Tamil"], 2);
  assert.equal(caption, "A useful caption.\n\n#New #Tamil");
  assert.equal(countHashtags(caption), 2);
});

test("service publishing copy fills distinct Facebook and Instagram captions with bounded tags", () => {
  const captions = servicePublishCaptions(getService("jathagam"), "silk");
  assert.match(captions.facebook, /Birth Jathagam/i);
  assert.match(captions.instagram, /Birth Jathagam/i);
  assert.notEqual(captions.facebook, captions.instagram);
  assert.ok(countHashtags(captions.facebook) <= 5);
  assert.ok(countHashtags(captions.instagram) <= 30);
  assert.match(captions.facebook, /#Kanchipuram/, "the selected design's style tags are added to Facebook copy");
  assert.match(captions.instagram, /#Kanchipuram/, "the selected design's style tags are added to Instagram copy");
});
