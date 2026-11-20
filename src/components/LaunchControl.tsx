import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  Download,
  Facebook,
  Globe,
  Hash,
  Instagram,
  Share2,
  Layers,
  Palette,
  PartyPopper,
  TrendingUp,
} from "lucide-react";
import { BRAND } from "../data/brand";
import { FESTIVALS } from "../data/festivals";
import { IG_BIO_OPTIONS } from "../data/instagram";
import { FB_BIO_OPTIONS } from "../data/facebook";
import { LAUNCH_CHECKLIST, LAUNCH_STATS, NEVER_DO, VERIFIED_FACTS, QUICK_LINKS } from "../data/launch";
import { SERVICES } from "../data/services";
import { CALENDAR } from "../data/calendar";
import { HASHTAG_BANK } from "../data/hashtags";
import { FORMATS } from "../data/formats";
import { fullPackMarkdown } from "../lib/packs";
import { downloadText } from "../lib/export";
import { Badge, Button, Chip, CopyButton, ExternalLink, Panel, PageHeader, SectionLabel, Stat, useToast } from "./ui";
import { UpcomingFestivals } from "./UpcomingFestivals";

interface Props {
  onNavigate: (section: string) => void;
}

const STORAGE_KEY = "astrosivam.launch.checklist.v2";

const sectionCards = [
  {
    id: "creative",
    title: "Creative studio",
    body: "One studio, three views: every asset at exact platform sizes, the identity set (profile, covers, highlights), and the per-service post desk with final captions.",
    icon: Layers,
    meta: `${FORMATS.length} formats · ${SERVICES.length} services`,
  },
  {
    id: "festivals",
    title: "Festival wishes",
    body: "Hindu, Tamil and global festival cards with finished greetings in English, Tamil and Hindi, matching art direction, captions and hashtag sets — plus a whole-year ZIP.",
    icon: PartyPopper,
    meta: `${FESTIVALS.length} festivals`,
  },
  {
    id: "social",
    title: "Social suite",
    body: "Facebook and Instagram in one place: Page fields, About and Messenger copy, the Instagram profile and grid plan, publishing state and API limits.",
    icon: Share2,
    meta: "Page + profile",
  },
  {
    id: "calendar",
    title: "30-day calendar",
    body: "A day-by-day launch plan across four phases, with platform, pillar, asset and best time.",
    icon: CalendarDays,
    meta: `${CALENDAR.length} days`,
  },
  {
    id: "hashtags",
    title: "Hashtag lab",
    body: "Tiered hashtag bank plus ready mixes for feed, reels, stories and Facebook — with rotation rules.",
    icon: Hash,
    meta: `${HASHTAG_BANK.length} tags`,
  },
];

export const LaunchControl: React.FC<Props> = ({ onNavigate }) => {
  const toast = useToast();
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) setChecked(stored.filter((id) => typeof id === "string"));
    } catch {
      setChecked([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // Checklist persistence is optional (for example, in private browsing).
    }
  }, [checked]);

  const progress = Math.round((checked.length / LAUNCH_CHECKLIST.length) * 100);

  const groups = useMemo(() => {
    const map = new Map<string, typeof LAUNCH_CHECKLIST>();
    LAUNCH_CHECKLIST.forEach((item) => {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    });
    return Array.from(map.entries());
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Creative studio · Studio home"
        title={
          <>
            A publishing house for <span className="gold-text">Astro Sivam</span>, not a folder of templates.
          </>
        }
        description={
          <>
            One visual language, one voice and one publishing rhythm for Facebook and Instagram. Every creative is
            rendered at the exact platform size, every caption is written, and every claim is traced back to
            {" "}
            <ExternalLink href={BRAND.url} className="align-baseline">
              astrosivam.com
            </ExternalLink>
            .
          </>
        }
        meta={
          <>
            <Chip tone="gold">Two platforms</Chip>
            <Chip>{SERVICES.length} service systems</Chip>
            <Chip>Reports US$5–10 · ₹470–940</Chip>
            <Chip tone="jade">First order free · Beta</Chip>
          </>
        }
        actions={
          <>
            <Button variant="gold" icon={<Layers className="h-4 w-4" />} onClick={() => onNavigate("creative")}>
              Open Creative Studio
            </Button>
            <Button
              variant="ghost"
              icon={<Download className="h-4 w-4" />}
              onClick={() => {
                downloadText(fullPackMarkdown(), "astrosivam-social-suite.md", "text/markdown;charset=utf-8");
                toast("Master copy pack downloaded as Markdown.");
              }}
            >
              Master copy pack
            </Button>
          </>
        }
      />

      {/* hero — the first impression of the studio */}
      <div className="fade-rise grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel variant="featured" className="relative overflow-hidden p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(199,154,62,0.18),transparent_66%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                  <img src="/astrosivam_logo.png" alt="Astro Sivam" className="h-9 w-9 object-contain" />
                </span>
                <div>
                  <div className="font-display text-[13px] tracking-[0.18em] text-cream">ASTRO SIVAM</div>
                  <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.22em] text-[#B4A58F]">
                    Vedic astrology · Walajapet, Tamil Nadu
                  </div>
                </div>
              </div>
              <Badge tone="gold" dot>
                Studio open
              </Badge>
            </div>

            <h2 className="mt-7 max-w-[19ch] font-display text-[27px] leading-[1.12] tracking-[-0.01em] text-cream sm:text-[35px]">
              Ancient Jyotish, <span className="gold-text">ephemeris precision</span> — and a presence to match.
            </h2>
            <p className="mt-4 max-w-[54ch] text-[13px] leading-[1.75] text-[#DCCFBA]">
              Replace ad-hoc posting with a system. Every image leaves this studio at the exact pixels Facebook and
              Instagram expect; every caption is written for the service, the season and the platform.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="gold" size="lg" iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => onNavigate("creative")}>
                Build the brand pack
              </Button>
              <Button variant="quiet" onClick={() => onNavigate("calendar")}>
                See the 30-day plan
              </Button>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {LAUNCH_STATS.map((stat) => (
            <Stat key={stat.label} value={stat.value} label={stat.label} sub={stat.sub} />
          ))}
        </div>
      </div>

      {/* the reason to open this page on a Monday morning */}
      <div className="mt-9">
        <UpcomingFestivals onNavigate={onNavigate} />
      </div>

      {/* platform identity */}
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-[#241C1E]">
                <Facebook className="h-4 w-4 text-[#9DB3D4]" aria-hidden="true" />
              </span>
              <div>
                <div className="font-display text-[13px] tracking-[0.02em] text-cream">Facebook page</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-[#A2937D]">Page identity</div>
              </div>
            </div>
            <CopyButton text={`${BRAND.fbPageName}\n${BRAND.handle}\n${FB_BIO_OPTIONS[0].text}`} label="Copy setup" compact />
          </div>
          <dl className="divide-y divide-line-soft text-[12.5px]">
            <div className="flex justify-between gap-4 py-2.5 first:pt-0">
              <dt className="text-[#B4A58F]">Page name</dt>
              <dd className="text-right font-medium text-cream">{BRAND.fbPageName}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-[#B4A58F]">Username</dt>
              <dd className="text-right font-medium text-gold-soft">{BRAND.handle}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-[#B4A58F]">Category</dt>
              <dd className="text-right text-cream">Astrologist · Vedic astrology</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5 last:pb-0">
              <dt className="text-[#B4A58F]">CTA</dt>
              <dd className="text-right text-cream">Book Now → astrosivam.com</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-[#B4A58F]">
            {FB_BIO_OPTIONS[0].text}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#A2937D]">255-character bio</span>
            <button type="button" className="copy-inline" onClick={() => onNavigate("social")}>
              Social suite <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-[#241C1E]">
                <Instagram className="h-4 w-4 text-[#D0A8B8]" aria-hidden="true" />
              </span>
              <div>
                <div className="font-display text-[13px] tracking-[0.02em] text-cream">Instagram profile</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-[#A2937D]">Profile identity</div>
              </div>
            </div>
            <CopyButton text={`${BRAND.igName}\n${BRAND.handle}\n${IG_BIO_OPTIONS[0].text}`} label="Copy setup" compact />
          </div>
          <dl className="divide-y divide-line-soft text-[12.5px]">
            <div className="flex justify-between gap-4 py-2.5 first:pt-0">
              <dt className="text-[#B4A58F]">Name field</dt>
              <dd className="text-right font-medium text-cream">{BRAND.igName}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-[#B4A58F]">Username</dt>
              <dd className="text-right font-medium text-gold-soft">{BRAND.handle}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-[#B4A58F]">Bio</dt>
              <dd className="text-right text-cream">{IG_BIO_OPTIONS[0].text.length} / 150 chars</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5 last:pb-0">
              <dt className="text-[#B4A58F]">Link in bio</dt>
              <dd className="text-right text-cream">6 stacked destinations</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-[#B4A58F]">
            {IG_BIO_OPTIONS[0].text}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#A2937D]">150-character bio</span>
            <button type="button" className="copy-inline" onClick={() => onNavigate("social")}>
              Social suite <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Panel>
      </div>

      {/* what's inside */}
      <div className="mt-10">
        <SectionLabel
          eyebrow="The working library"
          right={<span className="text-[10px] uppercase tracking-[0.16em] text-[#A2937D]">Nine sections</span>}
        >
          What is inside
        </SectionLabel>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {sectionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigate(card.id)}
                className="card card-hover group flex flex-col p-5 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong bg-[#241C1E] transition-colors group-hover:border-[rgba(216,177,100,0.45)]">
                    <Icon className="h-[18px] w-[18px] text-gold" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#A2937D]">
                    {card.meta}
                  </span>
                </div>
                <div className="mt-4 font-display text-[16px] leading-snug text-cream">{card.title}</div>
                <p className="mt-1.5 text-[12px] leading-[1.65] text-[#B4A58F]">{card.body}</p>
                <span className="mt-auto flex items-center gap-2 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-soft">
                  Open
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line transition-all group-hover:border-[rgba(216,177,100,0.5)] group-hover:bg-[rgba(199,154,62,0.12)]">
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* checklist + facts */}
      <div className="mt-10 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Panel>
          <SectionLabel
            eyebrow="Before you publish"
            right={
              <Badge tone={progress === 100 ? "jade" : "default"}>
                {checked.length} / {LAUNCH_CHECKLIST.length} complete
              </Badge>
            }
          >
            Launch checklist
          </SectionLabel>

          <div className="mb-5">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Launch checklist progress"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E3CA99] via-[#C79A3C] to-[#A87C2C] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 text-right text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
              {progress}% ready
            </div>
          </div>

          <div className="space-y-4">
            {groups.map(([group, items]) => (
              <div key={group}>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A2937D]">{group}</div>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const isChecked = checked.includes(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setChecked((current) =>
                              current.includes(item.id)
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id],
                            )
                          }
                          aria-pressed={isChecked}
                          className="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-wash"
                        >
                          <span className="checkmark mt-0.5" data-checked={isChecked} aria-hidden="true">
                            {isChecked ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span
                            className={`text-[12px] leading-relaxed ${
                              isChecked ? "text-[#A2937D] line-through decoration-[#948772]/70" : "text-[#DCCFBA]"
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-[10.5px] text-[#A2937D]">Saved in this browser.</span>
            <button type="button" className="copy-inline" onClick={() => setChecked([])}>
              Reset
            </button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionLabel>Verified brand facts</SectionLabel>
            <ul className="space-y-0">
              {VERIFIED_FACTS.map((fact) => (
                <li
                  key={fact.label}
                  className="grid grid-cols-[82px_minmax(0,1fr)] gap-3 border-b border-line-soft py-2.5 text-[12px] leading-relaxed first:pt-0 last:border-0 last:pb-0"
                >
                  <span className="text-[9.5px] uppercase tracking-[0.12em] text-[#A2937D]">{fact.label}</span>
                  <span className="text-[#DCCFBA]">{fact.value}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3">
              {QUICK_LINKS.slice(0, 5).map((link) => (
                <ExternalLink key={link.url} href={link.url}>
                  {link.label}
                </ExternalLink>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>Never do this</SectionLabel>
            <ul className="space-y-2">
              {NEVER_DO.slice(0, 5).map((item) => (
                <li key={item} className="flex gap-2 text-[11.5px] leading-relaxed text-[#C7B9A3]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#D8826F]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg border border-[rgba(143,191,165,0.2)] bg-[rgba(143,191,165,0.05)] px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#C7E5D5]">
                <BadgeCheck className="h-3.5 w-3.5" />
                Same facts everywhere
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#A8C6B6]">
                Paid reports US$5–10 · ₹470–940 · first order free in Beta · 90% refund before approval. If one platform
                says something different, fix it the same day.
              </p>
            </div>
          </Panel>

          <Panel variant="inset">
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-gold">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Launch rhythm
            </div>
            <div className="mt-3 space-y-3">
              {[
                ["Week 1", "Identity, pinned Jathagam, daily Panchangam"],
                ["Week 2", "Ten poruthams, Rajju explainer, first offer"],
                ["Week 3", "Muhurtham dates and birth-star naming"],
                ["Week 4", "Sade Sati authority, UGC, paid boost"],
              ].map(([week, text]) => (
                <div key={week} className="flex gap-3">
                  <span className="w-12 shrink-0 font-display text-[11px] text-gold-soft">{week}</span>
                  <span className="text-[11.5px] leading-relaxed text-[#C7B9A3]">{text}</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" full className="mt-4" icon={<CalendarDays className="h-3.5 w-3.5" />} onClick={() => onNavigate("calendar")}>
              Open the calendar
            </Button>
          </Panel>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-wash px-4 py-3">
        <div className="flex items-center gap-2 text-[11.5px] text-[#B4A58F]">
          <Globe className="h-3.5 w-3.5 text-gold" />
          {BRAND.website}
        </div>
        <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.14em] text-[#A2937D]">
          <span className="inline-flex items-center gap-1.5">
            <span className="status-dot" /> Lahiri sidereal
          </span>
          <span>·</span>
          <span>Reviewed by Tamil Nadu priests</span>
        </div>
      </div>
    </div>
  );
};
