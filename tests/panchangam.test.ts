import assert from "node:assert/strict";
import test from "node:test";
import { CHENNAI, computePanchangam, timeText, type Panchangam } from "../src/lib/panchang";
import { cardChips } from "../src/lib/panchangCard";

/**
 * The panchangam audit, pinned against published Lahiri panchangams
 * (Drik Panchang / Prokerala, Chennai) in November 2026.
 *
 * Names must match exactly; end-times get a few minutes of tolerance because
 * no two almanacs share an ephemeris. The calendar pins (Thai 1, Chithirai 1,
 * Aani 1) follow the printed Tamil almanacs — they are the dates a reader
 * will check the poster against.
 */

const at = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return computePanchangam(new Date(y, (m ?? 1) - 1, d ?? 1), CHENNAI);
};

const minutesOf = (text: string) => {
  const match = text.match(/(\d+):(\d+)\s*(am|pm)/i);
  assert.ok(match, `unparseable time ${text}`);
  let hours = Number(match[1]) % 12;
  if (/pm/i.test(match[3])) hours += 12;
  return hours * 60 + Number(match[2]);
};

const endsNear = (day: Panchangam, key: "tithi" | "nakshatram" | "yogam" | "karanam", expected: string) => {
  const endsAt = day.limbs[key].endsAt;
  assert.ok(endsAt, `${key} should end`);
  const diff = Math.abs(minutesOf(timeText(endsAt)) - minutesOf(expected));
  assert.ok(diff <= 6, `${key} ends ${timeText(endsAt)}, published ${expected}`);
};

test("20 Nov 2026 (Chennai) matches the published panchangam", () => {
  const day = at("2026-11-20");
  assert.equal(day.limbs.vasaram.primary.en, "Friday");
  assert.equal(day.tamilDate.month.en, "Karthigai");
  assert.equal(day.tamilDate.day, 4);
  assert.equal(day.limbs.samvatsara.primary.en, "Parabhava");
  assert.equal(day.limbs.samvatsara.counter, "40 / 60");
  assert.equal(day.limbs.paksham.primary.en.startsWith("Shukla"), true);

  assert.equal(day.limbs.tithi.primary.en, "Dashami");
  endsNear(day, "tithi", "7:15 AM"); // published: Dashami upto 7:15 AM
  assert.equal(day.limbs.tithi.next, "Ekadashi");

  assert.equal(day.limbs.nakshatram.primary.en, "Purva Bhadrapada");
  endsNear(day, "nakshatram", "6:55 AM");

  assert.equal(day.limbs.yogam.primary.en, "Harshana");
  endsNear(day, "yogam", "6:38 AM");

  assert.equal(day.limbs.karanam.primary.en, "Gara");
  endsNear(day, "karanam", "7:15 AM");

  assert.ok(Math.abs(minutesOf(timeText(day.sunrise)) - minutesOf("6:09 AM")) <= 2);
  assert.ok(Math.abs(minutesOf(timeText(day.sunset)) - minutesOf("5:38 PM")) <= 2);
  assert.ok(Math.abs(minutesOf(timeText(day.moonrise)) - minutesOf("2:09 PM")) <= 3);
});

test("the eighth-of-daylight windows match the published Chennai segments", () => {
  const day = at("2026-11-20");
  const byLabel = new Map([...day.auspicious, ...day.inauspicious].map((w) => [w.label, w]));
  const window = (label: string, start: string, end: string) => {
    const w = byLabel.get(label);
    assert.ok(w, `${label} present`);
    assert.ok(Math.abs(minutesOf(timeText(w.start)) - minutesOf(start)) <= 3, `${label} starts ${timeText(w.start)}`);
    assert.ok(Math.abs(minutesOf(timeText(w.end)) - minutesOf(end)) <= 3, `${label} ends ${timeText(w.end)}`);
  };
  window("Rahu Kalam", "10:28 AM", "11:54 AM");
  window("Yamagandam", "2:46 PM", "4:12 PM");
  window("Gulika Kalam", "7:35 AM", "9:02 AM");
  window("Brahma Muhurta", "4:33 AM", "5:21 AM");
  // Abhijit is one muhurta (day length / 15) centred on solar noon.
  window("Abhijit Muhurta", "11:31 AM", "12:17 PM");
});

test("Tamil month openings follow the printed almanacs", () => {
  // Afternoon Makara sankranti on the 14th: Thai opens on Pongal morning.
  const thai = at("2026-01-15");
  assert.equal(thai.tamilDate.text, "தை 1");
  assert.equal(thai.limbs.tithi.primary.en, "Dwadashi"); // Theipirai Dwadashi
  assert.equal(thai.limbs.nakshatram.primary.en, "Jyeshtha");
  endsNear(thai, "nakshatram", "5:47 AM");

  // Morning Mesha sankranti: Tamil New Year is Chithirai 1 the same day.
  const chithirai = at("2026-04-14");
  assert.equal(chithirai.tamilDate.text, "சித்திரை 1");
  assert.equal(chithirai.limbs.tithi.primary.en, "Dwadashi");
  assert.equal(chithirai.limbs.ritu.primary.en.startsWith("Vasanta"), true);

  // Mithuna sankranti just past midday still opens Aani that day.
  assert.equal(at("2026-06-15").tamilDate.text, "ஆனி 1");
  // And the day before each opening belongs to the old month.
  assert.equal(at("2026-01-14").tamilDate.month.en, "Margazhi");
  assert.equal(at("2026-04-13").tamilDate.month.en, "Panguni");
});

test("the samvatsara belongs to the Tamil year the date falls in", () => {
  // The old walk-back returned the *next* year from about October to April.
  assert.equal(at("2026-01-15").limbs.samvatsara.primary.en, "Vishvavasu");
  assert.equal(at("2026-01-15").limbs.samvatsara.counter, "39 / 60");
  assert.equal(at("2026-04-13").limbs.samvatsara.primary.en, "Vishvavasu");
  assert.equal(at("2026-04-14").limbs.samvatsara.primary.en, "Parabhava");
  assert.equal(at("2026-11-20").limbs.samvatsara.primary.en, "Parabhava");
});

test("Abhijit is not printed on a Wednesday", () => {
  const wednesday = at("2026-11-18");
  assert.equal(wednesday.limbs.vasaram.primary.en, "Wednesday");
  assert.equal(wednesday.auspicious.some((w) => w.label === "Abhijit Muhurta"), false);
  assert.ok(wednesday.caveats.some((c) => c.includes("Wednesday")));
  assert.equal(at("2026-11-20").auspicious.some((w) => w.label === "Abhijit Muhurta"), true);
});

test("card chips name the ritu by its two signs, from the season's start", () => {
  // Sun in Vrischika: Sharad runs Tula – Vrischika, not Vrischika – Dhanus.
  const chips = cardChips(at("2026-11-20"));
  assert.equal(chips[2], "Sharad (autumn) | Tula – Vrischika");
  // On Tamil New Year the calendar limbs follow Chithirai, not the sunrise sign.
  const newYear = cardChips(at("2026-04-14"));
  assert.equal(newYear[2], "Vasanta (spring) | Mesha – Rishabha");
  assert.equal(newYear[3], "Chithirai | day 1");
});
