import assert from "node:assert/strict";
import test from "node:test";
import { CHENNAI, computePanchangam } from "../src/lib/panchang";
import { FESTIVAL_DATES } from "../src/data/festivalDates";
import { FESTIVALS, festivalsForYearPack } from "../src/data/festivals";

test("Panchangam civil date is independent of the browser time zone", () => {
  const originalTimezone = process.env.TZ;
  try {
    let baseline: unknown;
    for (const timezone of ["UTC", "Asia/Kolkata", "Pacific/Fiji", "Pacific/Honolulu", "Asia/Tokyo"]) {
      process.env.TZ = timezone;
      const day = computePanchangam(new Date(2026, 0, 15), CHENNAI);
      assert.equal(day.tamilDate.month.en, "Thai", `${timezone}: Tamil solar month`);
      assert.equal(day.tamilDate.day, 1, `${timezone}: Tamil solar day`);
      assert.equal(day.tamilDate.text, "தை 1", `${timezone}: formatted Tamil date`);
      const result = {
        tamilDate: day.tamilDate,
        samvatsara: day.limbs.samvatsara.primary.en,
        weekday: day.limbs.vasaram.primary.en,
      };
      if (baseline === undefined) baseline = result;
      else assert.deepEqual(result, baseline, `${timezone}: civil-calendar result`);
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("whole-year festival export contains the complete catalog despite browse filters", () => {
  const exportItems = festivalsForYearPack();
  assert.equal(exportItems.length, FESTIVALS.length);
  assert.deepEqual(
    new Set(exportItems.map((festival) => festival.id)),
    new Set(FESTIVALS.map((festival) => festival.id)),
  );
});


test("unconfirmed Chithirai Thiruvizha date is not presented as a fixed 2026 day", () => {
  assert.equal(
    FESTIVAL_DATES.some((entry) => entry.festivalId === "chithirai" && entry.date.startsWith("2026-")),
    false,
  );
});
