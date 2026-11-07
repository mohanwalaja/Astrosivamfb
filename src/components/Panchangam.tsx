import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Copy,
  Download,
  Info,
  Loader2,
  Moon,
  RotateCcw,
  Sunrise,
  Sunset,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LIMBS, PANCHANGAM_ROWS, PLANET_NAMES, type LimbKey } from "../data/panchangam";
import { CHENNAI, OBSERVERS, computePanchangam, durationText, timeText, type Panchangam as Day } from "../lib/panchang";
import { cardChips, cardDateLine, cardSubline } from "../lib/panchangCard";
import { renderCreative } from "../lib/templates";
import { downloadCanvas, exportFileName } from "../lib/export";
import { brandPostCaptions } from "../lib/publishCaptions";
import { FORMAT_MAP } from "../data/formats";
import { getService } from "../data/services";
import { copyText } from "../lib/export";
import { Callout, CopyButton, PageHeader, Panel, SectionLabel, useToast } from "./ui";
import { PublishCanvasButton } from "./PublishCanvasButton";

/**
 * The panchangam screen.
 *
 * A panchangam is more than the five classical limbs, and a printed Tamil
 * almanac says so: it opens with the year, the half-year, the season and the
 * solar month before it reaches the day. This screen prints all ten, computed
 * for the chosen city and date, and hands them to the poster card.
 */

const ISO = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const today = () => {
  // Use the browser's own civil date. Pinning this to Asia/Kolkata made the
  // card show yesterday for anyone east of India (e.g. Fiji, UTC+12).
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(value("year"), value("month") - 1, value("day"));
};

const shift = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const longDate = (date: Date) => {
  // `date` carries a browser-local civil date, not an instant in IST.
  const calendarDay = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(calendarDay);
};

/** One row of the ten-limb table. */
const LimbRow: React.FC<{ day: Day; limbKey: LimbKey }> = ({ day, limbKey }) => {
  const meta = LIMBS.find((limb) => limb.key === limbKey)!;
  const limb = day.limbs[limbKey];
  const lord = limb.primary.lord ? PLANET_NAMES[limb.primary.lord] : null;

  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <span className="w-5 shrink-0 font-display text-[10px] text-gold/60">{String(meta.index).padStart(2, "0")}</span>
      <span className="min-w-[86px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B4A58F]">
        {meta.english}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[13.5px] text-cream">{limb.primary.en}</span>
        {limb.counter ? <span className="ml-2 text-[10px] text-[#A2937D]">{limb.counter}</span> : null}
      </span>
      <span className="flex shrink-0 items-baseline gap-2 text-right">
        {limb.detail ? <span className="text-[10.5px] text-[#B4A58F]">{limb.detail}</span> : null}
        {lord ? <span className="text-[10.5px] text-jade/80">{lord.ta}</span> : null}
        {limb.endsAt ? (
          <span className="text-[10.5px] text-gold-soft/80">
            till {timeText(limb.endsAt)}
            {limb.next ? <span className="text-[#A2937D]"> → {limb.next}</span> : null}
          </span>
        ) : null}
      </span>
    </li>
  );
};

export const Panchangam: React.FC = () => {
  const toast = useToast();
  const [iso, setIso] = useState(() => ISO(today()));
  const [place, setPlace] = useState(CHENNAI.name ?? "Chennai");
  const [busy, setBusy] = useState(false);

  const observer = OBSERVERS.find((item) => item.name === place) ?? CHENNAI;

  const day = useMemo(() => {
    const [y, m, d] = iso.split("-").map(Number);
    return computePanchangam(new Date(y, (m ?? 1) - 1, d ?? 1), observer);
  }, [iso, observer]);

  const chips = useMemo(() => cardChips(day), [day]);

  const renderPanchangamCard = () => renderCreative({
    format: FORMAT_MAP["panchangam-card"],
    style: "signature",
    service: getService("panchangam"),
    content: {
      kicker: "Daily Panchangam",
      headline: cardDateLine(day),
      subline: cardSubline(day),
      chips,
      price: "Free",
      cta: "astrosivam.com",
    },
    scale: 1,
  });

  const panchangamCaptions = brandPostCaptions(
    `Daily Panchangam · ${longDate(day.date)} · ${place}\n\n${cardSubline(day)}`,
  );

  const downloadCard = async () => {
    setBusy(true);
    try {
      const canvas = await renderPanchangamCard();
      // The place name is free text and may contain "/" or spaces; slug it so the
      // browser does not quietly rename or refuse the file.
      const name = `${exportFileName(["astrosivam", "panchangam", iso, place])}_${canvas.width}x${canvas.height}.png`;
      await downloadCanvas(canvas, name, { formatId: "panchangam-card" });
      toast(`Panchangam card downloaded — ${canvas.width} × ${canvas.height}.`);
    } catch (error) {
      toast(error instanceof Error && error.message ? error.message : "The card could not be rendered. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const copyAll = async () => {
    const ok = await copyText(`${longDate(day.date)} · ${place}\n\n${chips.map((c) => c.replace(" | ", " — ")).join("\n")}`);
    toast(ok ? "All ten limbs copied." : "Copy blocked — select the text manually.", ok ? undefined : "error");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Panchangam · ten limbs"
        title={
          <>
            The whole day, not just five limbs.{" "}
            <span className="gold-text">Calculated for your city.</span>
          </>
        }
        description="A panchangam is five limbs in name and ten in practice: a printed Tamil almanac opens with the year, half-year, season and solar month before it ever reaches the tithi. These values are computed from the Sun and Moon for the chosen city, on the Lahiri ayanamsa — the same seven limbs your panchangam.rf.gd site prints, now in English and ready to post."
        actions={
          <>
            <PublishCanvasButton
              render={renderPanchangamCard}
              filename={`${exportFileName(["astrosivam", "panchangam", iso, place])}_${FORMAT_MAP["panchangam-card"].width}x${FORMAT_MAP["panchangam-card"].height}.png`}
              captions={panchangamCaptions}
              sourceLabel={`Daily Panchangam · ${place} · ${iso}`}
              disabled={busy}
              label="Publish card now"
            />
            <button type="button" className="btn btn-ghost" onClick={downloadCard} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Panchangam card
            </button>
            <button type="button" className="btn btn-ghost" onClick={copyAll}>
              <Copy className="h-3.5 w-3.5" /> Copy all ten
            </button>
          </>
        }
      />

      {/* ------------------------------- controls ------------------------------- */}
      <Panel className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="panchang-date" className="label">Date</label>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                id="panchang-date"
                type="date"
                className="field w-auto text-[12px]"
                value={iso}
                onChange={(event) => setIso(event.target.value || ISO(today()))}
              />
              <button
                type="button"
                className="btn btn-quiet btn-icon"
                onClick={() => setIso(ISO(shift(day.date, -1)))}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIso(ISO(today()))}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Today
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-icon"
                onClick={() => setIso(ISO(shift(day.date, 1)))}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="panchang-place" className="label">Place</label>
            <select
              id="panchang-place"
              className="field w-auto text-[12px]"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            >
              {OBSERVERS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B4A58F]">Solar month</div>
            <div className="font-display text-[15px] text-gold-soft">
              {day.tamilDate.month.en} {day.tamilDate.day}
            </div>
            <div className="text-[10.5px] text-[#A2937D]">
              {day.sunSign.en}
            </div>
          </div>
        </div>
      </Panel>

      {/* ------------------------- sun, moon and the ten ------------------------ */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel>
          <SectionLabel
            right={
              <span className="text-[10px] text-[#A2937D]">
                {LIMBS.length} limbs · Lahiri {day.caveats[0].match(/[\d.]+°/)?.[0] ?? ""}
              </span>
            }
          >
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gold" />
              {longDate(day.date)}
            </span>
          </SectionLabel>

          <ul className="mt-1">
            {PANCHANGAM_ROWS.map((row) => (
              <LimbRow key={row.key} day={day} limbKey={row.key} />
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionLabel right={<Sunrise className="h-3.5 w-3.5 text-gold" />}>The day</SectionLabel>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
              {[
                ["Sunrise", timeText(day.sunrise)],
                ["Sunset", timeText(day.sunset)],
                ["Midday", timeText(day.midday)],
                ["Day length", durationText(day.dayLengthMs)],
                ["Moonrise", timeText(day.moonrise)],
                ["Moonset", timeText(day.moonset)],
                ["Moon", `${Math.round(day.moonIllumination * 100)}% lit`],
                ["Night", durationText(day.nightLengthMs)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A2937D]">{label}</dt>
                  <dd className="mt-0.5 font-display text-[13.5px] text-cream">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-[#B4A58F]">
              <Moon className="h-3.5 w-3.5 text-gold-soft" />
              Moon in <span className="text-cream">{day.moonSign.en}</span>
              <span className="text-[#6E6357]">·</span>
              Sun in <span className="text-cream">{day.sunSign.en}</span>
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<Sunset className="h-3.5 w-3.5 text-saffron" />}>Auspicious</SectionLabel>
            <ul className="space-y-2">
              {day.auspicious.map((w) => (
                <li key={w.label} className="flex items-baseline justify-between gap-3 text-[11.5px]">
                  <span className="text-[#DCCFBA]">{w.label}</span>
                  <span className="shrink-0 font-display text-[12px] text-jade">
                    {timeText(w.start)} – {timeText(w.end)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3">
              <SectionLabel>Inauspicious</SectionLabel>
              <ul className="space-y-2">
                {day.inauspicious.map((w) => (
                  <li key={w.label} className="flex items-baseline justify-between gap-3 text-[11.5px]">
                  <span className="text-[#DCCFBA]">{w.label}</span>
                  <span className="shrink-0 font-display text-[12px] text-saffron">
                    {timeText(w.start)} – {timeText(w.end)}
                  </span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <SectionLabel right={<Info className="h-3.5 w-3.5 text-[#B4A58F]" />}>What the card prints</SectionLabel>
          <ol className="space-y-1.5">
            {chips.map((chip, index) => {
              const [value, tail] = chip.split(" | ");
              return (
                <li key={index} className="flex items-baseline justify-between gap-3 border-t border-line-soft py-1.5 text-[11.5px] first:border-t-0">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A2937D]">
                    {PANCHANGAM_ROWS[index]?.en}
                  </span>
                  <span className="text-[#DCCFBA]">
                    {value}
                    {tail ? <span className="ml-2 text-[#A2937D]">· {tail}</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex gap-2">
            <CopyButton text={chips.join("\n")} label="Copy all ten limbs" />
          </div>
        </Panel>

        <div className="space-y-4">
          <Callout>
            <span className="font-semibold text-gold-soft">Why ten and not five.</span> Panchangam means “five limbs” —
            tithi, vara, nakshatra, yoga, karana — but every printed Tamil almanac also carries the year, the half-year,
            the season, the solar month and the paksha. Those five are what tell you a muhurtham is in Aippasi rather
            than in Chithirai.
          </Callout>
          <Panel>
            <SectionLabel>Time zone and accuracy</SectionLabel>
            <ul className="space-y-2 text-[11px] leading-relaxed text-[#B4A58F]">
              <li>
                <span className="text-gold-soft">Location matters.</span> Sunrise moves about 5 minutes between Chennai
                and Coimbatore, and every Rahu Kalam with it. Choose the city you are posting for.
              </li>
              <li>
                <span className="text-gold-soft">Sunrise-based.</span> Each limb is read at sunrise, the way a printed
                panchangam reckons the day, then given the time it ends.
              </li>
              {day.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </Panel>
          <div className="flex items-center justify-end">
            <button type="button" className="btn btn-quiet" onClick={downloadCard} disabled={busy}>
              Open the card <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
