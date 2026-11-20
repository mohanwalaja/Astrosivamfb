import React, { useState } from "react";
import {
  AtSign,
  Bookmark,
  Camera,
  ChevronDown,
  Download,
  Grid3x3,
  ImageIcon,
  Instagram,
  Link2,
  MessageCircle,
  Repeat2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { BRAND } from "../data/brand";
import { FORMAT_MAP } from "../data/formats";
import {
  IG_ALT_TEXT_RULES,
  IG_BIO_OPTIONS,
  IG_CADENCE,
  IG_DM_KEYWORDS,
  IG_GROWTH_ACTIONS,
  IG_HIGHLIGHTS,
  IG_LINK_STACK,
  IG_NAME_OPTIONS,
  IG_REEL_FORMATS,
  IG_STORY_IDEAS,
  IG_TIMES,
} from "../data/instagram";
import {
  composeIgCaption,
  gridOrder,
  IG_COPY_ENTRIES,
  IG_GRID_NOTES,
  IG_GRID_PLAN,
  IG_HIGHLIGHT_COVERS,
  IG_REEL_ENTRIES,
  IG_STORY_ENTRIES,
  igArt,
  type IgCategory,
  type IgCopyEntry,
} from "../data/igCopy";
import {
  IG_API_SOURCES,
  IG_CAPABILITIES,
  IG_LIMITS,
  IG_MEDIA_SPECS,
  IG_PERMISSIONS,
  IG_PUBLISHER_COVERAGE,
} from "../data/igApi";
import { getService } from "../data/services";
import { IG_LAYOUT_MAP, renderIgCreative, type IgLayout } from "../lib/igCreative";
import { withHashtags } from "../lib/publishCaptions";
import type { StyleKey } from "../types";
import { defaultContent } from "../lib/templates";
import { CreativeCanvas } from "./CreativeCanvas";
import { exportIg, IgCanvas, type IgScene } from "./IgCanvas";
import { Button, Callout, CopyButton, ExternalLink, PageHeader, Panel, PillTabs, SectionLabel, Segmented, useToast } from "./ui";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { ScriptText } from "./ScriptText";

/* ==========================================================================
   Instagram Suite
   --------------------------------------------------------------------------
   Seven surfaces, one type system. The grid is composed as a whole, each post
   stands on its own, and every claim about what Instagram will accept is
   checked against Meta's documentation — including the things that cannot be
   done through the API at all.
   ========================================================================== */

const avatarFormat = FORMAT_MAP["fb-profile"];
const jathagam = getService("jathagam");

type Tab = "profile" | "grid" | "feed" | "stories" | "highlights" | "playbook" | "api";

const TABS: Array<{ value: Tab; label: string; count?: number }> = [
  { value: "profile", label: "Profile" },
  { value: "grid", label: "Grid", count: 9 },
  { value: "feed", label: "Feed posts", count: 9 },
  { value: "stories", label: "Stories & Reels", count: 5 },
  { value: "highlights", label: "Highlights", count: 7 },
  { value: "playbook", label: "Playbook" },
  { value: "api", label: "API limits" },
];

/** Each register gets the art direction that carries it without shouting. */
const styleFor = (category: IgCategory): StyleKey => {
  if (category === "education" || category === "quote") return "mono";
  if (category === "story" || category === "reel") return "deepam";
  return "gopuram";
};

const sceneFor = (entry: IgCopyEntry, safeArea = false): IgScene => ({
  layout: entry.layout,
  themeKey: entry.theme,
  style: styleFor(entry.category),
  content: entry.content,
  art: igArt(entry.art),
  showSafeArea: safeArea,
});

/** Centre-square crop of a taller creative — what Instagram shows in the grid. */
const SquareCrop: React.FC<{ ratio: number; children: React.ReactNode }> = ({ ratio, children }) => {
  const shift = ratio > 1 ? ((ratio - 1) / 2 / ratio) * 100 : 0;
  return (
    <div className="aspect-square overflow-hidden bg-black/20">
      <div style={{ transform: `translateY(-${shift}%)` }}>{children}</div>
    </div>
  );
};

const surfaceTone: Record<string, string> = {
  Feed: "chip chip-gold",
  Carousel: "chip chip-gold",
  Story: "chip chip-jade",
  Reels: "chip chip-jade",
  Highlights: "chip chip-maroon",
};

const DownloadButton: React.FC<{ scene: IgScene; name: string; caption?: string; label?: string }> = ({
  scene,
  name,
  caption,
  label = "PNG",
}) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const meta = IG_LAYOUT_MAP[scene.layout];
  return (
    <Button
      size="sm"
      variant="ghost"
      icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const ok = await exportIg(scene, name, caption);
        setBusy(false);
        toast(
          ok ? `Exported ${name} at ${meta.width} × ${meta.height}.` : "The browser blocked the export. Try again.",
          ok ? "success" : "error",
        );
      }}
    >
      {label}
    </Button>
  );
};

/* -------------------------------- profile --------------------------------- */

const PhonePreview: React.FC<{ bioText: string }> = ({ bioText }) => {
  const tiles = gridOrder();
  return (
    <div className="mx-auto max-w-[330px] px-3 pb-4 pt-3">
      <div className="overflow-hidden rounded-[26px] border border-line bg-[#160F11] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-[#B4A58F]">
          <span>9:41</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2 w-3 rounded-sm border border-[#B4A58F]" />
            <span className="h-2 w-3 rounded-sm border border-[#B4A58F]" />
            <span className="h-2 w-4 rounded-sm border border-[#B4A58F]" />
          </span>
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <span className="font-display text-[13px] tracking-[0.14em] text-cream">{BRAND.handle.replace("@", "")}</span>
          <span className="text-[14px] text-[#B4A58F]">···</span>
        </div>

        <div className="flex items-center gap-4 px-4">
          <div className="rounded-full p-[2px] ring-1 ring-[rgba(199,154,62,0.45)]">
            <div className="h-[74px] w-[74px] overflow-hidden rounded-full">
              <CreativeCanvas
                format={avatarFormat}
                themeKey="midnight"
                service={jathagam}
                content={defaultContent(avatarFormat, jathagam)}
                previewWidth={148}
              />
            </div>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-1 text-center">
            {[
              ["9", "posts"],
              ["—", "followers"],
              ["—", "following"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-[13px] font-semibold text-cream">{value}</div>
                <div className="text-[9px] uppercase tracking-[0.08em] text-[#B4A58F]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pt-2.5">
          <div className="text-[11.5px] font-semibold text-cream">{BRAND.igName}</div>
          <div className="text-[9.5px] uppercase tracking-[0.1em] text-[#B4A58F]">Astrologer</div>
          <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-[1.5] text-[#DCCFBA]">
            <ScriptText text={bioText} />
          </p>
          <div className="mt-1 flex items-center gap-1 text-[10.5px] text-[#A9C6D6]">
            <Link2 className="h-2.5 w-2.5" /> astrosivam.com
          </div>
        </div>

        <div className="mt-2 flex gap-1.5 px-4" aria-hidden="true">
          <span className="flex-1 rounded-md bg-[#C79A3C] py-1 text-center text-[10px] font-semibold text-[#241706]">
            Following
          </span>
          <span className="flex-1 rounded-md border border-line py-1 text-center text-[10px] font-semibold text-cream">
            Message
          </span>
          <span className="flex items-center rounded-md border border-line px-2 py-1 text-[10px] text-cream">
            <ChevronDown className="h-3 w-3" />
          </span>
        </div>

        <div className="mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 scroll-thin">
          {IG_HIGHLIGHT_COVERS.map((cover, index) => (
            <div key={cover.id} className="w-[46px] shrink-0">
              <div className="h-[46px] w-[46px] overflow-hidden rounded-full border border-[rgba(199,154,62,0.4)] p-[1.5px]">
                <div className="h-full w-full overflow-hidden rounded-full">
                  <IgCanvas
                    input={{
                      layout: "ig-highlight",
                      themeKey: cover.theme,
                      style: "deepam",
                      content: {
                        kicker: "",
                        headline: "",
                        subline: "",
                        tamil: "",
                        chips: [],
                        price: "",
                        cta: "",
                        footer: "",
                        glyph: cover.glyph,
                      },
                    }}
                    previewWidth={46}
                  />
                </div>
              </div>
              <div className="mt-1 truncate text-center text-[8px] text-[#C7B9A3]">{cover.label}</div>
              <span className="sr-only">Highlight {index + 1}</span>
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex border-t border-line" aria-hidden="true">
          <div className="flex flex-1 items-center justify-center border-b border-cream py-2">
            <Grid3x3 className="h-3.5 w-3.5 text-cream" />
          </div>
          <div className="flex flex-1 items-center justify-center py-2">
            <Repeat2 className="h-3.5 w-3.5 text-[#A2937D]" />
          </div>
          <div className="flex flex-1 items-center justify-center py-2">
            <Bookmark className="h-3.5 w-3.5 text-[#A2937D]" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[2px] pb-3">
          {tiles.map((entry, index) => {
            const meta = IG_LAYOUT_MAP[entry.layout];
            return (
              <div key={entry.id} className="relative">
                <SquareCrop ratio={meta.height / meta.width}>
                  <IgCanvas input={sceneFor(entry)} previewWidth={110} />
                </SquareCrop>
                <span className="sr-only">
                  Post {index + 1}: {entry.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ProfileTab: React.FC<{ bioIndex: number; setBioIndex: (index: number) => void }> = ({ bioIndex, setBioIndex }) => {
  const bio = IG_BIO_OPTIONS[bioIndex];
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Panel padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cream">
            <Instagram className="h-3.5 w-3.5 text-[#D0A8B8]" /> Profile preview
          </span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#A2937D]">390 × 844</span>
        </div>
        <PhonePreview bioText={bio.text} />
        <div className="border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-[#B4A58F]">
          Follower counts stay blank — this studio never shows an invented number. The nine tiles are the real plan, in
          publishing order.
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel>
          <SectionLabel right={<span className="chip chip-gold">30 characters</span>}>Name field</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-3">
            {IG_NAME_OPTIONS.map((option) => (
              <div key={option.text} className="rounded-lg border border-line bg-wash p-3">
                <div className="text-[12px] font-semibold text-cream">{option.text}</div>
                <div className="mt-1 text-[10px] text-[#A2937D]">{option.text.length} / 30 characters</div>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">{option.note}</p>
                <div className="mt-2">
                  <CopyButton text={option.text} label="Copy" compact />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#B4A58F]">
            The name field is searchable; the username is not. Keep “Vedic” in it and keep the brand first. Instagram
            allows 30 characters and strips most emoji from search.
          </p>
        </Panel>

        <Panel>
          <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{bio.text.length} / 150 characters</span>}>
            Bio
          </SectionLabel>
          <PillTabs
            items={IG_BIO_OPTIONS.map((option, index) => ({
              id: String(index),
              label: option.label.split("—")[0].trim(),
            }))}
            value={String(bioIndex)}
            onChange={(id) => setBioIndex(Number(id))}
          />
          <div className="mt-3 rounded-lg border border-line bg-wash p-3.5">
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#DCCFBA]">
              <ScriptText text={bio.text} />
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10.5px] text-[#A2937D]">{bio.note}</span>
              <CopyButton text={bio.text} label="Copy bio" compact />
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-line-soft px-3 py-2 text-[11px] text-[#C7B9A3]">
              <span className="text-[#A2937D]">Account type:</span> Professional · Category “Astrologer”
            </div>
            <div className="rounded-lg border border-line-soft px-3 py-2 text-[11px] text-[#C7B9A3]">
              <span className="text-[#A2937D]">Website:</span> {BRAND.website}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionLabel
            right={<CopyButton text={IG_LINK_STACK.map((link) => `${link.label} — ${link.url}`).join("\n")} label="Copy all" compact />}
          >
            <span className="inline-flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-gold" /> Link in bio stack
            </span>
          </SectionLabel>
          <div className="space-y-1.5">
            {IG_LINK_STACK.map((link, index) => (
              <div key={link.url} className="flex items-center justify-between gap-2 rounded-lg border border-line-soft bg-wash px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[11.5px] font-medium text-cream">
                    {index + 1}. {link.label}
                  </div>
                  <div className="truncate text-[10px] text-[#A2937D]">{link.url.replace("https://", "")}</div>
                </div>
                <CopyButton text={link.url} label="URL" compact />
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
            Order matters: flagship first, trust link fifth, daily habit last. The API cannot set the link field, so this
            is a copy-paste step in the app.
          </p>
        </Panel>

        <Panel>
          <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">Uploaded in the app</span>}>
            <span className="inline-flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-gold" /> Profile photo
            </span>
          </SectionLabel>
          <div className="flex flex-wrap items-center gap-5">
            <div className="h-[110px] w-[110px] shrink-0 overflow-hidden rounded-full ring-1 ring-[rgba(199,154,62,0.45)]">
              <CreativeCanvas
                format={avatarFormat}
                themeKey="midnight"
                service={jathagam}
                content={defaultContent(avatarFormat, jathagam)}
                previewWidth={220}
              />
            </div>
            <div className="h-[32px] w-[32px] shrink-0 overflow-hidden rounded-full ring-1 ring-[rgba(199,154,62,0.45)]">
              <CreativeCanvas
                format={avatarFormat}
                themeKey="midnight"
                service={jathagam}
                content={defaultContent(avatarFormat, jathagam)}
                previewWidth={64}
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="text-[11.5px] font-semibold text-cream">Shown at 110 px and 32 px</div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[#B4A58F]">
                1080 × 1080 JPEG. Instagram crops it to a circle, so the seal sits inside the middle 70% — no type, no
                text ring. There is no profile-picture endpoint; upload it from the app.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};

/* ---------------------------------- grid ---------------------------------- */

const GridTab: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const ordered = gridOrder();
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel>
        <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">Publishing order · newest last</span>}>
          The first nine posts
        </SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {ordered.map((entry, index) => {
            const meta = IG_LAYOUT_MAP[entry.layout];
            const slot = IG_GRID_PLAN.find((item) => item.entryId === entry.id);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpen(entry.id)}
                className="group relative overflow-hidden rounded-md border border-line-soft text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label={`Open ${entry.label} — slot ${index + 1}`}
              >
                <SquareCrop ratio={meta.height / meta.width}>
                  <IgCanvas input={sceneFor(entry)} previewWidth={200} />
                </SquareCrop>
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-cream backdrop-blur">
                  {String(index + 1).padStart(2, "0")} · {meta.surface}
                </span>
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.1em] text-[#E9D5A8] backdrop-blur">
                  {slot?.register} · {slot?.focal}
                </span>
                <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-transparent transition group-hover:ring-[rgba(199,154,62,0.5)]" />
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#B4A58F]">
          Thumbnails show the centre 1:1 crop. Instagram has used 1:1 in the profile grid for a decade and 4:5
          thumbnails on some accounts since 2025 — the centre square is the only crop that survives both, so every
          headline here lives inside it.
        </p>
      </Panel>

      <div className="space-y-4">
        <Panel>
          <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">Read as a profile, not a feed</span>}>
            Why this order
          </SectionLabel>
          <ol className="space-y-2">
            {ordered.map((entry, index) => (
              <li key={`${entry.id}-why`} className="flex items-start gap-2.5">
                <span className="mt-0.5 font-display text-[10.5px] text-gold-soft">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-[0.1em] text-[#A2937D]">{entry.label}</span>
                    <span className={surfaceTone[IG_LAYOUT_MAP[entry.layout].surface]}>{entry.category}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#C7B9A3]">
                <ScriptText text={entry.placement} />
              </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <SectionLabel>Composition rules</SectionLabel>
          <ul className="space-y-1.5">
            {IG_GRID_NOTES.map((note) => (
              <li key={note} className="flex gap-2 text-[11px] leading-relaxed text-[#C7B9A3]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                {note}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Callout title="Publishing, not arranging">
              The grid is a publishing order because Instagram has no grid-order API and pinning is app-only. Post these
              nine in this sequence and the profile composes itself.
            </Callout>
          </div>
        </Panel>
      </div>
    </div>
  );
};

/* ---------------------------------- feed ---------------------------------- */

const FeedCard: React.FC<{ entry: IgCopyEntry; open: boolean; onToggle: () => void }> = ({ entry, open, onToggle }) => {
  const meta = IG_LAYOUT_MAP[entry.layout];
  const caption = composeIgCaption(entry.captions.instagram, entry);
  const facebookCaption = withHashtags(entry.captions.facebook, entry.hashtags.slice(0, 5), 5);
  const scene = sceneFor(entry);
  return (
    <Panel padded={false} className="overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="w-full shrink-0 sm:w-[240px]">
          <div className="overflow-hidden rounded-lg border border-line-soft">
            <IgCanvas input={scene} previewWidth={240} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[9.5px] uppercase tracking-[0.1em] text-[#A2937D]">
            <span>
              {meta.width} × {meta.height}
            </span>
            <span>{meta.surface}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[15px] tracking-[0.02em] text-cream">{entry.label}</h3>
            <span className={surfaceTone[meta.surface]}>{meta.name}</span>
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-[#A2937D]">{meta.cropNote}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-line-soft bg-wash p-2.5">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold">CTA</div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#DCCFBA]">
                <ScriptText text={entry.cta.line} />
              </p>
              <p className="mt-0.5 text-[10.5px] text-[#A2937D]">{entry.cta.url}</p>
            </div>
            <div className="rounded-lg border border-[rgba(143,191,165,0.24)] bg-[rgba(143,191,165,0.05)] p-2.5">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#A8C6B6]">DM keyword</div>
              <p className="mt-1 font-mono text-[12px] tracking-wide text-[#CFE5D8]">{entry.cta.dmKeyword}</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#A8C6B6]">Saved reply answers it.</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <CopyButton text={caption} label="Copy caption + tags" compact />
            <CopyButton text={entry.captions.facebook} label="Copy Facebook caption" compact />
            {meta.surface === "Feed" ? (
              <PublishCanvasButton
                render={async () => (await renderIgCreative({ ...scene, scale: 1 })).canvas}
                filename={`astrosivam_ig_${entry.id}_${meta.width}x${meta.height}.png`}
                captions={{ facebook: facebookCaption, instagram: caption }}
                sourceLabel={`Instagram feed · ${entry.label}`}
                label="Publish now"
              />
            ) : (
              <span className="inline-flex items-center rounded-md border border-line px-2 py-1 text-[9.5px] text-[#A2937D]">
                Carousel cover · export only
              </span>
            )}
            <DownloadButton scene={scene} name={`astrosivam_ig_${entry.id}.png`} caption={entry.captions.instagram} label="Export PNG" />
          </div>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={`ig-feed-${entry.id}`}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-[10.5px] text-[#B4A58F] transition-colors hover:bg-wash hover:text-cream"
          >
            {open ? "Hide caption, alt text and tags" : `Caption, alt text and ${entry.hashtags.length} hashtags`}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {open ? (
            <div id={`ig-feed-${entry.id}`} className="mt-2 space-y-2">
              <div className="rounded-lg border border-line-soft bg-wash p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold">Instagram caption</span>
                  <span className="text-[10px] text-[#A2937D]">
                    {caption.length} / 2,200 · {entry.hashtags.length} / 30 tags
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[#C7B9A3]"><ScriptText text={caption} /></p>
              </div>
              <div className="rounded-lg border border-line-soft bg-wash p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold">Alt text</span>
                  <span className="text-[10px] text-[#A2937D]">{entry.altText.length} / 1,000</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#C7B9A3]">
                  <ScriptText text={entry.altText} />
                </p>
                <div className="mt-2">
                  <CopyButton text={entry.altText} label="Copy alt text" compact />
                </div>
              </div>
              <div className="rounded-lg border border-line-soft bg-wash p-3">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold">Hashtags</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#C7B9A3]">
                  <ScriptText text={entry.hashtags.join(" ")} />
                </p>
                <div className="mt-2">
                  <CopyButton text={entry.hashtags.join(" ")} label="Copy tags" compact />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
};

const FeedTab: React.FC<{ selected: string; setSelected: (id: string) => void }> = ({ selected, setSelected }) => {
  const [filter, setFilter] = useState<"all" | IgCategory>("all");
  const entries = IG_COPY_ENTRIES.filter((entry) => filter === "all" || entry.category === filter);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Filter posts by register"
          options={[
            { value: "all", label: "All nine", count: IG_COPY_ENTRIES.length },
            { value: "service", label: "Service", count: IG_COPY_ENTRIES.filter((entry) => entry.category === "service").length },
            { value: "education", label: "Education", count: IG_COPY_ENTRIES.filter((entry) => entry.category === "education").length },
            { value: "quote", label: "Quote", count: IG_COPY_ENTRIES.filter((entry) => entry.category === "quote").length },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as "all" | IgCategory)}
        />
        <span className="text-[10.5px] text-[#A2937D]">Exports are 1:1 with the preview — same painter, same scale.</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {entries.map((entry) => (
          <FeedCard
            key={entry.id}
            entry={entry}
            open={selected === entry.id}
            onToggle={() => setSelected(selected === entry.id ? "" : entry.id)}
          />
        ))}
      </div>
    </div>
  );
};

/* -------------------------------- stories --------------------------------- */

const StoriesTab: React.FC = () => {
  const [safeArea, setSafeArea] = useState(false);
  const storyMeta = IG_LAYOUT_MAP["ig-story"];
  const reelMeta = IG_LAYOUT_MAP["ig-reel-cover"];

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold text-cream">Story and Reel frames</div>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
              1080 × 1920. The top 250 px and bottom 340 px belong to Instagram — the reply bar, the header, the
              progress line. Content stays inside the middle 1330 px.
            </p>
          </div>
          <Button size="sm" variant={safeArea ? "gold" : "ghost"} onClick={() => setSafeArea((value) => !value)} aria-pressed={safeArea}>
            {safeArea ? "Hiding safe areas" : "Show safe areas"}
          </Button>
        </div>
      </Panel>

      <div>
        <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">3 frames · story</span>}>Stories</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {IG_STORY_ENTRIES.map((entry) => (
            <Panel key={entry.id} padded={false} className="overflow-hidden">
              <IgCanvas
                input={{
                  layout: "ig-story",
                  themeKey: entry.theme,
                  style: "deepam",
                  content: entry.content,
                  art: igArt(entry.art),
                  showSafeArea: safeArea,
                }}
                previewWidth={240}
              />
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-cream">{entry.label}</span>
                  <span className="chip chip-jade">Story</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#B4A58F]">{entry.caption}</p>
                <p className="rounded-md border border-line-soft bg-wash px-2 py-1.5 text-[10px] leading-relaxed text-[#C7B9A3]">
                  {entry.sticker}
                </p>
                <DownloadButton
                  scene={{
                    layout: "ig-story",
                    themeKey: entry.theme,
                    style: "deepam",
                    content: entry.content,
                    art: igArt(entry.art),
                  }}
                  name={`astrosivam_ig_${entry.id}_story.png`}
                  label="Export story"
                />
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">2 covers · 9:16</span>}>Reel covers</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {IG_REEL_ENTRIES.map((entry) => (
            <Panel key={entry.id} padded={false} className="overflow-hidden">
              <IgCanvas
                input={{
                  layout: "ig-reel-cover",
                  themeKey: entry.theme,
                  style: "deepam",
                  content: entry.content,
                  art: igArt(entry.art),
                  showSafeArea: safeArea,
                }}
                previewWidth={260}
              />
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-cream">{entry.label}</span>
                  <span className="chip chip-gold">Reel</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#B4A58F]">“{entry.hook}”</p>
                <p className="whitespace-pre-wrap text-[10.5px] leading-relaxed text-[#A2937D]"><ScriptText text={entry.caption} /></p>
                <div className="flex flex-wrap gap-1.5">
                  <DownloadButton
                    scene={{
                      layout: "ig-reel-cover",
                      themeKey: entry.theme,
                      style: "deepam",
                      content: entry.content,
                      art: igArt(entry.art),
                    }}
                    name={`${entry.id}.png`}
                    label="Export cover"
                  />
                  <CopyButton text={entry.caption} label="Copy caption" compact />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Callout title="Stories take no caption" tone="warn">
          Meta&apos;s Story container accepts one image or a 3–60 s video and nothing else: no caption, no alt text, no
          tags, no location, no collaborators, no carousel. Every word you want read has to be painted into the frame —
          which is what these are. Interactive stickers can only be added by hand in the app, so the sticker slot stays
          empty in the export and is marked in the editor.
        </Callout>
        <Callout title="A Reel cover is not a post" tone="warn">
          Reels are video. This 1080 × 1920 still is only useful as <span className="font-mono text-[11px]">cover_url</span>{" "}
          when the video is published; the profile grid shows the centre {reelMeta.safeArea?.w ?? 1080} ×{" "}
          {reelMeta.safeArea?.h ?? 1080} of it, which is why the type sits in that square and the frame is audited at{" "}
          {reelMeta.mobileWidth} px — the size of a grid thumbnail.
        </Callout>
      </div>

      <Panel>
        <SectionLabel>Frame sizes</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["Story canvas", `${storyMeta.width} × ${storyMeta.height}`, "JPEG ≤ 8 MB · or MP4/MOV ≤ 60 s, 100 MB"],
            ["Story content band", `${storyMeta.safeArea?.w} × ${storyMeta.safeArea?.h}`, "Below the header, above the reply bar"],
            ["Reel cover canvas", `${reelMeta.width} × ${reelMeta.height}`, "Sent as cover_url with the video"],
            ["Grid crop", `${reelMeta.safeArea?.w} × ${reelMeta.safeArea?.h}`, "The only part of the cover people see first"],
          ].map(([label, size, note]) => (
            <div key={label} className="rounded-lg border border-line-soft bg-wash px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-cream">{label}</span>
                <span className="font-mono text-[10.5px] text-gold-soft">{size}</span>
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[#A2937D]">{note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

/* ------------------------------- highlights -------------------------------- */

const HighlightsTab: React.FC = () => {
  const [open, setOpen] = useState<string | null>(IG_HIGHLIGHTS[0].id);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {IG_HIGHLIGHT_COVERS.map((cover) => {
          const isOpen = open === cover.id;
          const scene: IgScene = {
            layout: "ig-highlight",
            themeKey: cover.theme,
            style: "deepam",
            content: {
              kicker: "",
              headline: "",
              subline: "",
              tamil: "",
              chips: [],
              price: "",
              cta: "",
              footer: "",
              glyph: cover.glyph,
            },
          };
          return (
            <div key={cover.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 p-3.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[rgba(199,154,62,0.35)]">
                  <IgCanvas input={scene} previewWidth={56} />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-cream">{cover.label}</div>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#B4A58F]">{cover.purpose}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 pb-3">
                <DownloadButton scene={scene} name={`astrosivam_ig_highlight_${cover.id}.png`} label="PNG" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : cover.id)}
                aria-expanded={isOpen}
                aria-controls={`ig-highlight-${cover.id}`}
                className="flex w-full items-center justify-between border-t border-line px-3.5 py-2 text-[10.5px] text-[#B4A58F] transition-colors hover:bg-wash hover:text-cream"
              >
                Story plan · 3 frames
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {isOpen ? (
                <ul id={`ig-highlight-${cover.id}`} className="space-y-1.5 border-t border-line-soft px-3.5 py-3">
                  {cover.stories.map((story) => (
                    <li key={story} className="flex gap-2 text-[10.5px] leading-relaxed text-[#C7B9A3]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                      {story}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}

        <div className="card flex flex-col justify-between p-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
              <Camera className="h-3 w-3" /> Cover rules
            </div>
            <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-[#C7B9A3]">
              <li>· Symbol only — Instagram draws the label under the circle.</li>
              <li>· The glyph sits inside a 70% circle, safe at 64 px.</li>
              <li>· One motif per highlight, never a photo of a document.</li>
              <li>· Keep the first five for the paid services.</li>
            </ul>
          </div>
          <div className="mt-3 rounded-lg border border-[rgba(216,130,111,0.24)] bg-[rgba(216,130,111,0.05)] px-2.5 py-2 text-[10px] leading-relaxed text-[#E7BBAE]">
            There is no Highlights API. Export the seven covers here, then create the highlights in the app: profile →
            ＋ → Story highlight → choose the cover.
          </div>
        </div>
      </div>

      <Panel>
        <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">1080 × 1080 · displayed at 64 px</span>}>
          How a highlight is actually built
        </SectionLabel>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1 · Add to a Story", "Post the three plan frames as stories, in order."],
            ["2 · Create the highlight", "Profile → ＋ on the Highlights row → select those stories."],
            ["3 · Upload this cover", "Choose the exported PNG and crop it to the circle."],
            ["4 · Name it short", "Jathagam, not “Birth Jathagam report 2026” — the label truncates."],
          ].map(([title, note]) => (
            <div key={title} className="rounded-lg border border-line-soft bg-wash p-3">
              <div className="text-[11px] font-semibold text-cream">{title}</div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[#B4A58F]">{note}</p>
            </div>
          ))}
        </ol>
      </Panel>
    </div>
  );
};

/* -------------------------------- playbook -------------------------------- */

const PlaybookTab: React.FC = () => (
  <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <Panel>
        <SectionLabel right={<span className="chip chip-jade">{IG_DM_KEYWORDS.length} keywords</span>}>
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-gold" /> DM automation
          </span>
        </SectionLabel>
        <div className="space-y-2">
          {IG_DM_KEYWORDS.map((dm) => (
            <div key={dm.keyword} className="rounded-lg border border-line-soft bg-wash p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[rgba(199,154,62,0.35)] bg-[rgba(199,154,62,0.1)] px-2 py-0.5 font-mono text-[10.5px] tracking-wide text-gold-soft">
                    {dm.keyword}
                  </span>
                  <span className="text-[10.5px] text-[#A2937D]">{dm.intent}</span>
                </div>
                <CopyButton text={dm.reply} label="Copy" compact />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#C7B9A3]">
                <ScriptText text={dm.reply} />
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-[#A2937D]">
          Load these as saved replies in Meta Business Suite. Never ask for birth details in a public comment. The
          keyword is printed on each post above so the reply is already matched to the post.
        </p>
      </Panel>

      <Panel>
        <SectionLabel>
          <span className="inline-flex items-center gap-2">
            <Repeat2 className="h-3.5 w-3.5 text-gold" /> Reels playbook
          </span>
        </SectionLabel>
        <div className="space-y-2">
          {IG_REEL_FORMATS.map((format) => (
            <div key={format.title} className="rounded-lg border border-line-soft p-3">
              <div className="text-[11.5px] font-semibold text-cream">{format.title}</div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[#B4A58F]">“{format.hook}”</p>
              <p className="mt-1 text-[10px] leading-relaxed text-[#A2937D]">{format.structure}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-[#A2937D]">
          3 seconds to 15 minutes, 300 MB, 23–60 fps, ≤ 1920 px wide, MP4 or MOV with the moov atom at the front. The
          cover can be set at publish time with <span className="font-mono">cover_url</span> or a millisecond{" "}
          <span className="font-mono">thumb_offset</span>; it cannot be changed afterwards.
        </p>
      </Panel>
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Panel>
        <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">4–5 feed posts · 3 reels · daily stories</span>}>
          Weekly cadence
        </SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                <th className="pb-2 pr-3 font-semibold">Day</th>
                <th className="pb-2 pr-3 font-semibold">Feed</th>
                <th className="pb-2 pr-3 font-semibold">Stories</th>
                <th className="pb-2 font-semibold">Reel</th>
              </tr>
            </thead>
            <tbody>
              {IG_CADENCE.map((day) => (
                <tr key={day.day} className="border-t border-line-soft align-top">
                  <td className="py-2 pr-3 text-[11px] font-semibold text-cream">{day.day}</td>
                  <td className="py-2 pr-3 text-[10.5px] leading-relaxed text-[#C7B9A3]">{day.feed}</td>
                  <td className="py-2 pr-3 text-[10.5px] leading-relaxed text-[#B4A58F]">{day.stories}</td>
                  <td className="py-2 text-[10.5px] leading-relaxed text-[#B4A58F]">{day.reel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <SectionLabel>Best times · IST</SectionLabel>
        <div className="space-y-2">
          {IG_TIMES.map((time) => (
            <div key={time.slot} className="rounded-lg border border-line-soft bg-wash p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-cream">{time.slot}</span>
                <span className="text-[9.5px] uppercase tracking-[0.1em] text-[#A2937D]">{time.audience}</span>
              </div>
              <div className="mt-1 text-[10.5px] text-gold-soft/80">{time.best}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-[#B4A58F]">{time.note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Panel>
        <SectionLabel>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Story ideas
          </span>
        </SectionLabel>
        <ul className="space-y-1.5">
          {IG_STORY_IDEAS.map((idea) => (
            <li key={idea} className="flex gap-2 text-[11px] leading-relaxed text-[#C7B9A3]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
              {idea}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionLabel>
          <span className="inline-flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-gold" /> Growth actions
          </span>
        </SectionLabel>
        <ul className="space-y-1.5">
          {IG_GROWTH_ACTIONS.map((action) => (
            <li key={action} className="flex gap-2 text-[11px] leading-relaxed text-[#C7B9A3]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-jade/70" />
              {action}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionLabel>
          <span className="inline-flex items-center gap-2">
            <AtSign className="h-3.5 w-3.5 text-gold" /> Alt text &amp; tags
          </span>
        </SectionLabel>
        <ul className="space-y-1.5">
          {IG_ALT_TEXT_RULES.map((rule) => (
            <li key={rule} className="flex gap-2 text-[11px] leading-relaxed text-[#C7B9A3]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
              {rule}
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Callout title="UGC loop">
            Ask customers to post their report line with {BRAND.ugcTag}. Repost one per week with credit — it is the
            cheapest trust asset the page has.
          </Callout>
        </div>
      </Panel>
    </div>
  </div>
);

/* ----------------------------------- api ---------------------------------- */

const supportTone: Record<string, string> = {
  api: "chip chip-jade",
  manual: "chip chip-gold",
  none: "chip chip-maroon",
};

const supportLabel: Record<string, string> = {
  api: "API",
  manual: "Manual",
  none: "Not possible",
};

const ApiTab: React.FC = () => (
  <div className="space-y-4">
    <Callout title="What this studio can publish today" icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}>
      The publisher in this app posts one image at a time to a Facebook Page and its linked Instagram professional
      account. Everything else on this page is either exported here and posted by hand, or genuinely impossible through
      the Instagram Platform API. Nothing on this page invents a successful publish.
    </Callout>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {IG_PUBLISHER_COVERAGE.map((item) => (
        <div key={item.surface} className="rounded-lg border border-line-soft bg-wash p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-cream">{item.surface}</span>
            <span className={item.supported ? "chip chip-jade" : "chip chip-maroon"}>
              {item.supported ? "Publisher" : "Export"}
            </span>
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-[#A2937D]">{item.note}</p>
        </div>
      ))}
    </div>

    <Panel>
      <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">Checked 26 Oct 2026 · Graph v26.0</span>}>
        Hard limits
      </SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
              <th className="pb-2 pr-3 font-semibold">Limit</th>
              <th className="pb-2 font-semibold">Value / behaviour</th>
            </tr>
          </thead>
          <tbody>
            {IG_LIMITS.map((limit) => (
              <tr key={limit.label} className="border-t border-line-soft align-top">
                <td className="py-2 pr-3 text-[11px] font-semibold text-cream">{limit.label}</td>
                <td className="py-2">
                  <div className="text-[11px] text-[#DCCFBA]">{limit.value}</div>
                  {limit.note ? <div className="mt-0.5 text-[10px] leading-relaxed text-[#A2937D]">{limit.note}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel>
      <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">Task by task</span>}>
        <span className="inline-flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-gold" /> What the API will and will not do
        </span>
      </SectionLabel>
      <div className="grid gap-2 lg:grid-cols-2">
        {IG_CAPABILITIES.map((capability) => (
          <div key={capability.task} className="rounded-lg border border-line-soft bg-wash p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11.5px] font-semibold text-cream">{capability.task}</span>
              <span className={supportTone[capability.support]}>{supportLabel[capability.support]}</span>
            </div>
            {capability.endpoint ? (
              <div className="mt-1 break-all font-mono text-[10px] text-[#A8C6B6]">{capability.endpoint}</div>
            ) : null}
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#B4A58F]">{capability.note}</p>
            {capability.fallback ? (
              <p className="mt-1 text-[10px] text-[#A2937D]">Instead: {capability.fallback}</p>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>

    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <SectionLabel>Permissions</SectionLabel>
        <div className="space-y-1.5">
          {IG_PERMISSIONS.map((permission) => (
            <div key={permission.scope} className="rounded-lg border border-line-soft px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-gold-soft">{permission.scope}</span>
                {permission.scope === "instagram_content_publish" ? <span className="chip chip-gold">required</span> : null}
              </div>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#A2937D]">{permission.why}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
          Plus an Instagram <strong className="text-[#DCCFBA]">Business or Creator</strong> account linked to a Facebook
          Page you administer. A personal account cannot publish through the API at all.
        </p>
      </Panel>

      <Panel>
        <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">Meta&apos;s own specs</span>}>Media sizes</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                <th className="pb-2 pr-3 font-semibold">Surface</th>
                <th className="pb-2 pr-3 font-semibold">Pixels</th>
                <th className="pb-2 pr-3 font-semibold">Ratio</th>
                <th className="pb-2 font-semibold">Formats</th>
              </tr>
            </thead>
            <tbody>
              {IG_MEDIA_SPECS.map((spec) => (
                <tr key={spec.surface} className="border-t border-line-soft align-top">
                  <td className="py-2 pr-3">
                    <div className="text-[11px] font-semibold text-cream">{spec.surface}</div>
                    <div className="mt-0.5 text-[10px] leading-relaxed text-[#A2937D]">{spec.notes}</div>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap font-mono text-[10.5px] text-[#DCCFBA]">{spec.px}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-[10.5px] text-[#C7B9A3]">{spec.ratio}</td>
                  <td className="py-2 text-[10.5px] text-[#C7B9A3]">{spec.formats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>

    <Panel>
      <SectionLabel>Sources</SectionLabel>
      <ul className="space-y-1.5">
        {IG_API_SOURCES.map((source) => (
          <li key={source.url} className="flex flex-wrap items-baseline gap-2 text-[11px] text-[#C7B9A3]">
            <ExternalLink href={source.url}>{source.label}</ExternalLink>
            <span className="text-[10px] text-[#A2937D]">developers.facebook.com</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10.5px] leading-relaxed text-[#A2937D]">
        The PHP backend is pinned to Graph v26.0. Check Meta's supported-version schedule before upgrades and
        re-verify the publish limits before a launch week — Meta has published both 50 and 100 posts per 24 hours
        on the same page, so the app reads the account&apos;s own quota instead of trusting either number.
      </p>
    </Panel>
  </div>
);

/* --------------------------------- shell ---------------------------------- */

export const InstagramSuite: React.FC<{ initialTab?: Tab }> = ({ initialTab = "profile" }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selected, setSelected] = useState<string>(IG_COPY_ENTRIES[0].id);
  const [bioIndex, setBioIndex] = useState(0);
  const bio = IG_BIO_OPTIONS[bioIndex];

  return (
    <div>
      <PageHeader
        eyebrow="Social suite · Instagram"
        title="A profile that reads like a studio, not a hobby."
        description="Nine posts composed as one grid, each judged on its own at phone width; stories and reels that keep clear of Instagram's own chrome; seven highlight seals; and an honest map of what the Graph API will and will not publish."
        actions={
          <>
            <CopyButton text={bio.text} label="Copy bio" />
            <CopyButton
              text={IG_LINK_STACK.map((link) => `${link.label} — ${link.url}`).join("\n")}
              label="Copy link stack"
            />
          </>
        }
      />

      <div className="mb-4">
        <Segmented<Tab> label="Social suite · Instagram sections" options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "profile" ? <ProfileTab bioIndex={bioIndex} setBioIndex={setBioIndex} /> : null}

      {tab === "grid" ? (
        <GridTab
          onOpen={(id) => {
            setSelected(id);
            setTab("feed");
          }}
        />
      ) : null}

      {tab === "feed" ? <FeedTab selected={selected} setSelected={setSelected} /> : null}

      {tab === "stories" ? <StoriesTab /> : null}
      {tab === "highlights" ? <HighlightsTab /> : null}
      {tab === "playbook" ? <PlaybookTab /> : null}
      {tab === "api" ? <ApiTab /> : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-wash px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[11px] text-[#B4A58F]">
          <ImageIcon className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
          Feed post cards can be published as one image with their captions prefilled. Stories, Reels, carousels and highlight covers remain export-only.
        </span>
        <ExternalLink href={BRAND.url}>{BRAND.website}</ExternalLink>
      </div>
    </div>
  );
};
