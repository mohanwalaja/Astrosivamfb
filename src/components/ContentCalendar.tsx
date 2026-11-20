import React, { useMemo, useState } from "react";
import { CalendarDays, Download, Filter, Sunrise } from "lucide-react";
import { CALENDAR, CALENDAR_WEEKS, PILLARS } from "../data/calendar";
import { FORMAT_MAP } from "../data/formats";
import { getService } from "../data/services";
import { calendarCsv } from "../lib/packs";
import { datedFestivals } from "../lib/festivalKit";
import { downloadText } from "../lib/export";
import { Badge, Button, CopyButton, PageHeader, Panel, SectionLabel, Segmented, Toolbar, useToast } from "./ui";

const platformOptions = [
  { value: "all", label: "All" },
  { value: "Both", label: "Both" },
  { value: "FB", label: "Facebook" },
  { value: "IG", label: "Instagram" },
] as const;

type PlatformFilter = (typeof platformOptions)[number]["value"];

export const ContentCalendar: React.FC = () => {
  const toast = useToast();
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [pillar, setPillar] = useState("all");

  const filtered = useMemo(
    () =>
      CALENDAR.filter(
        (entry) =>
          (platform === "all" || entry.platform === platform) &&
          (pillar === "all" || entry.pillar === pillar),
      ),
    [platform, pillar],
  );

  const pillars = useMemo(() => Array.from(new Set(CALENDAR.map((entry) => entry.pillar))), []);

  return (
    <div>
      <PageHeader
        eyebrow="Publishing calendar"
        title="Thirty days, already decided."
        description="Four phases: establish the identity, earn trust with matrimony content, capture planning intent, then scale with transits and paid support. Every day names the platform, the pillar, the asset and the hour."
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                downloadText(calendarCsv(), "astrosivam-30-day-calendar.csv", "text/csv;charset=utf-8");
                toast("Calendar CSV downloaded.");
              }}
            >
              <Download className="h-3.5 w-3.5" /> Calendar .csv
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                const text = CALENDAR.map(
                  (entry) => `Day ${entry.day} · ${entry.platform} — ${entry.title}\n${entry.hook}`,
                ).join("\n\n");
                navigator.clipboard?.writeText(text);
                toast("All 30 hooks copied.");
              }}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Copy all hooks
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CALENDAR_WEEKS.map((week) => (
          <Panel key={week.week} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Week {week.week}</span>
              <span className="font-mono text-[9px] text-[#A2937D]">
                {String((week.week - 1) * 7 + 1).padStart(2, "0")}–{String(week.week * 7).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-1.5 font-display text-[14px] text-cream">{week.title}</div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">{week.focus}</p>
          </Panel>
        ))}
      </div>

      <FestivalLane />

      <Toolbar className="mt-5">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.16em] text-[#A2937D]">
          <Filter className="h-3 w-3" aria-hidden="true" /> Platform
        </span>
        <Segmented
          label="Filter by platform"
          options={platformOptions.map((option) => ({ ...option }))}
          value={platform}
          onChange={(value) => setPlatform(value as PlatformFilter)}
        />
        <span className="ml-1 text-[9.5px] uppercase tracking-[0.16em] text-[#A2937D]">Pillar</span>
        <div className="flex flex-wrap gap-1.5">
          {["all", ...pillars].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={pillar === item}
              onClick={() => setPillar(item)}
              className={`choice px-2.5 py-1 text-[10.5px] font-medium ${pillar === item ? "choice-active" : ""}`}
            >
              {item === "all" ? "All pillars" : item}
            </button>
          ))}
        </div>
        <Badge className="ml-auto" tone="default">
          {filtered.length} entries
        </Badge>
      </Toolbar>

      <div className="mt-5 space-y-8">
        {CALENDAR_WEEKS.map((week) => {
          const days = filtered.filter((entry) => Math.ceil(entry.day / 7) === week.week);
          if (!days.length) return null;
          return (
            <div key={week.week}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Week {week.week}</div>
                  <h2 className="font-display text-[18px] text-cream">{week.title}</h2>
                </div>
                <div className="hidden text-[10.5px] text-[#A2937D] sm:block">{days.length} posts</div>
              </div>

              <div className="space-y-2">
                {days.map((entry) => {
                  const service = entry.serviceId ? getService(entry.serviceId) : null;
                  const asset = FORMAT_MAP[entry.asset];
                  return (
                    <div
                      key={entry.day}
                      className="card card-hover grid gap-3 p-4 sm:grid-cols-[58px_minmax(0,1fr)_150px] sm:items-start sm:p-[18px]"
                    >
                      <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0.5">
                        <div className="font-display text-[25px] leading-none text-gold-soft">
                          {String(entry.day).padStart(2, "0")}
                        </div>
                        <span className="text-[8.5px] uppercase tracking-[0.16em] text-[#A2937D]">Day</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`chip ${
                              entry.platform === "FB"
                                ? "chip-saffron"
                                : entry.platform === "IG"
                                  ? "chip-gold"
                                  : "chip-jade"
                            }`}
                          >
                            {entry.platform === "Both" ? "FB + IG" : entry.platform}
                          </span>
                          <span className="chip">{entry.pillar}</span>
                          <span className="text-[10px] text-[#A2937D]">{entry.format}</span>
                        </div>
                        <h3 className="mt-1.5 font-display text-[14px] leading-snug text-cream">{entry.title}</h3>
                        <p className="mt-1 text-[11.5px] leading-[1.65] text-[#C7B9A3]">{entry.hook}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#A2937D]">
                          {service ? <span>{service.name}</span> : null}
                          {asset ? <span>· {asset.label}</span> : null}
                          <span className="inline-flex items-center gap-1">
                            <Sunrise className="h-3 w-3" /> {entry.bestTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <CopyButton text={`${entry.title}\n\n${entry.hook}`} label="Hook" compact />
                        {service ? <CopyButton text={service.url} label="Link" compact /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10">
        <SectionLabel>Pillar mix</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((item) => (
            <Panel key={item.name} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-cream">{item.name}</span>
                <span className="font-display text-[15px] text-gold-soft">{item.share}</span>
              </div>
              <div
                className="mt-2 h-1 overflow-hidden rounded-full bg-track"
                role="img"
                aria-label={`${item.name}: ${item.share} of the plan`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E3CA99] to-[#A87C2C]"
                  style={{ width: item.share }}
                />
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#B4A58F]">{item.detail}</p>
            </Panel>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-wash px-4 py-3 text-[11px] leading-relaxed text-[#B4A58F]">
        Publish times are IST. Load the plan into Meta Business Suite a week at a time, not a month, so timely transits
        and festivals can replace scheduled posts without gaps.
      </div>
    </div>
  );
};

/* ------------------------------ festival lane ----------------------------- */

const LANE_WINDOW_DAYS = 90;

/**
 * The calendar's festival lane. It reads the verified date table directly, so a
 * provisional date is shown as provisional and a festival without a date is not
 * in the lane at all — the lane only ever states what the panchang table knows.
 */
const FestivalLane: React.FC = () => {
  const toast = useToast();
  const rows = useMemo(() => datedFestivals(new Date(), LANE_WINDOW_DAYS / 366).slice(0, 6), []);

  const csv = () =>
    [
      "festival,date,confidence,days_away,traditional_rule",
      ...rows.map(
        (row) =>
          `"${row.festival.name}","${row.entry.date}","${row.entry.confidence}",${row.daysAway},"${row.festival.when}"`,
      ),
    ].join("\n");

  return (
    <Panel className="mt-5">
      <SectionLabel
        right={
          <button
            type="button"
            className="copy-inline"
            onClick={() => {
              downloadText(csv(), "astrosivam-festival-lane.csv", "text/csv;charset=utf-8");
              toast("Festival lane downloaded.");
            }}
          >
            <Download className="h-3 w-3" /> .csv
          </button>
        }
      >
        Festival lane · next {LANE_WINDOW_DAYS} days
      </SectionLabel>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div key={row.entry.festivalId + row.entry.date} className="rounded-lg border border-line-soft bg-wash px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[11.5px] font-medium text-cream">{row.festival.name}</span>
              <span className="shrink-0 font-mono text-[9.5px] text-gold-soft">
                {row.entry.date.slice(5).replace("-", " · ")}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-[#A2937D]">
              <span className={row.entry.confidence === "confirmed" ? "text-jade" : "text-gold-soft"}>
                {row.entry.confidence}
              </span>
              <span>·</span>
              <span>{row.daysAway === 0 ? "today" : `${row.daysAway} days`}</span>
              <span>·</span>
              <span className="truncate">{row.festival.region}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-[#A2937D]">
        Dates come from the verified panchang table, with provisional days marked. A festival with no stored date is
        deliberately absent rather than estimated — open Festival wishes to see the rule it follows instead.
      </p>
    </Panel>
  );
};
