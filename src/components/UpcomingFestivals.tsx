import React, { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { festivalCaption } from "../data/festivals";
import {
  DATE_COVERAGE,
  nextFestival,
  parseCalendarDate,
  upcomingFestivals,
  type UpcomingEvent,
} from "../data/festivalDates";
import { Badge, Button, CopyButton, EmptyState, SectionLabel } from "./ui";

/**
 * The home screen's answer to "what am I posting this week?".
 *
 * The festival library is sorted by month, which is fine for browsing and
 * useless when Dhanteras is six days away. This reads the panchang table and
 * shows the next fortnight, with every card linking to the festival card
 * library where the finished card can be rendered.
 */

interface Props {
  onNavigate: (section: string) => void;
  /** 14 by default — the fortnight the user asked for. */
  window?: number;
  /** Fixed "today", for previews and tests. Defaults to the real clock. */
  now?: Date;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const countdown = (days: number) => {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
};

const dateLabel = (iso: string) => {
  const date = parseCalendarDate(iso);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

const DayLeaf: React.FC<{ iso: string; soon: boolean }> = ({ iso, soon }) => {
  const date = parseCalendarDate(iso);
  return (
    <div
      className={`flex w-[60px] shrink-0 flex-col items-center justify-center rounded-xl border px-2 py-2.5 ${
        soon ? "border-gold/55 bg-[rgba(77,16,35,0.55)]" : "border-line bg-[#140f10]"
      }`}
      aria-hidden="true"
    >
      <span className={`text-[9px] font-bold uppercase tracking-[0.16em] ${soon ? "text-champagne" : "text-[#A2937D]"}`}>
        {WEEKDAYS[date.getDay()]}
      </span>
      <span className={`font-display text-[23px] leading-none ${soon ? "text-cream" : "text-[#DCCFBA]"}`}>
        {date.getDate()}
      </span>
      <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#A2937D]">
        {MONTHS[date.getMonth()]}
      </span>
    </div>
  );
};

const EventCard: React.FC<{ event: UpcomingEvent; onNavigate: (section: string) => void }> = ({ event, onNavigate }) => {
  const { festival, entry, daysAway } = event;
  const soon = daysAway <= 7;
  return (
    <article className="card card-hover flex flex-col gap-4 p-4 sm:p-[18px]">
      <div className="flex items-start gap-3.5">
        <DayLeaf iso={entry.date} soon={soon} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={soon ? "gold" : "default"} dot={soon}>
              {countdown(daysAway)}
            </Badge>
            {entry.confidence === "provisional" ? <Badge tone="saffron">Panchang to confirm</Badge> : null}
          </div>
          <h3 className="mt-2.5 font-display text-[16px] leading-tight text-cream">{festival.name}</h3>
          <p className="mt-1 truncate text-[12px] text-[#B4A58F]" lang="ta">
            {festival.tamil}
            {festival.hindi ? <span lang="hi"> · {festival.hindi}</span> : null}
          </p>
        </div>
      </div>

      <div>
        <p className="text-[12.5px] leading-[1.6] text-[#E8DDCB]">{festival.headline}</p>
        <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.1em] text-[#A2937D]">
          {entry.label ? `${entry.label} · ` : ""}
          {dateLabel(entry.date)}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line-soft pt-3.5">
        <Button
          variant="gold"
          size="sm"
          onClick={() => onNavigate("festivals")}
          aria-label={`Open ${festival.name} in the festival card library`}
        >
          Festival cards
        </Button>
        <CopyButton text={festivalCaption(festival, "instagram")} label="Caption" compact />
      </div>
    </article>
  );
};

export const UpcomingFestivals: React.FC<Props> = ({ onNavigate, window = 14, now }) => {
  // One date for the whole render keeps every countdown consistent.
  const [today] = useState(() => now ?? new Date());
  const events = useMemo(() => upcomingFestivals(window, today), [window, today]);
  const next = useMemo(() => nextFestival(today), [today]);

  const provisional = events.filter((event) => event.entry.confidence === "provisional").length;
  const span = window === 1 ? "day" : "days";

  return (
    <section aria-labelledby="upcoming-heading" className="fade-rise">
      <SectionLabel
        eyebrow="What is coming"
        description={`Occasions dated against the Chennai panchang — the next ${window} ${span}.`}
        right={
          <Button
            variant="quiet"
            size="sm"
            iconRight={<ArrowRight className="h-3.5 w-3.5" />}
            onClick={() => onNavigate("festivals")}
          >
            Festival library
          </Button>
        }
      >
        <span id="upcoming-heading" className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gold" aria-hidden="true" />
          The next {window} {span}
        </span>
      </SectionLabel>

      {events.length ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={`${event.festival.id}-${event.entry.date}`} event={event} onNavigate={onNavigate} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="A quiet fortnight"
          description={
            next
              ? `Nothing in the next ${window} ${span}. The next card is ${next.festival.name} — ${dateLabel(next.entry.date)}, in ${next.daysAway} days.`
              : "Nothing in the next fortnight."
          }
          action={
            next ? (
              <Button
                variant="gold"
                size="sm"
                onClick={() => onNavigate("festivals")}
              >
                Start {next.festival.name} early
              </Button>
            ) : undefined
          }
        />
      )}

      <p className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10.5px] leading-relaxed text-[#A2937D]">
        <Sparkles className="h-3 w-3 text-gold/80" aria-hidden="true" />
        <span>
          {DATE_COVERAGE.total} dated occasions across {DATE_COVERAGE.years.join(" and ")} — Tamil panchang, Chennai.
        </span>
        {provisional ? (
          <span className="text-saffron/90">
            {provisional === 1 ? "One card is" : `${provisional} cards are`} awaiting a final panchang check this fortnight.
          </span>
        ) : null}
      </p>
    </section>
  );
};
