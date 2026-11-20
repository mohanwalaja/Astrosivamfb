import React, { useState } from "react";
import {
  Archive,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Hash,
  ImageDown,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";
import { FORMATS, GROUP_LABEL, PLATFORM_LABEL } from "../data/formats";
import { SERVICES } from "../data/services";
import { THEMES } from "../data/brand";
import type { DownloadFile, ThemeKey } from "../types";
import { buildZip, downloadText, downloadZip, saveBlob, slugify } from "../lib/export";
import { PACK_SUMMARY, assetsCsv, brandPackFiles, calendarCsv, fbCaption, festivalPackFiles, festivalYearFiles, fullPackMarkdown, hashtagMarkdown, igCaption, servicePackFiles } from "../lib/packs";
import { CARD_LANGUAGES, CARD_STYLES, type CardLanguage, type FestivalStyle } from "../lib/festivalCreative";

import { FESTIVALS, getFestival } from "../data/festivals";
import { festivalDateView } from "../lib/festivalKit";
import { Callout, CopyButton, ExportProgress, PageHeader, Panel, SectionLabel, useToast } from "./ui";

const stamp = () => new Date().toISOString().slice(0, 10);
const encoder = new TextEncoder();

/** Why an export failed, in words the person can act on. */
const reason = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "an unexpected error";

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Build the archive before announcing it, so a pack that fails midway leaves the
 * browser with no half-download, and the toast can quote the real file count and size.
 */
const zipAndSave = (files: DownloadFile[], filename: string) => {
  const blob = buildZip(files);
  saveBlob(blob, filename);
  return { bytes: blob.size, count: files.length };
};

type Progress = (done: number, total: number) => void;

export const ExportCenter: React.FC = () => {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [festivalId, setFestivalId] = useState("deepavali");
  const [festivalStyle, setFestivalStyle] = useState<FestivalStyle>("traditional");
  const festivalLanguage: CardLanguage = "en";

  /** One runner for every pack: build the file list, zip it, toast the result. */
  const runPack = async (args: {
    busyKey: string;
    label: string;
    total: number;
    build: (onProgress?: Progress) => Promise<{ files: DownloadFile[]; warnings?: string[] } & object>;
    zipName: string;
    done: string;
    /** Failure toast reads `${failed} — ${reason}. ${failedHint}`. */
    failed: string;
    failedHint: string;
  }) => {
    setBusy(args.busyKey);
    setProgress({ label: args.label, done: 0, total: args.total });
    try {
      const built = await args.build((done, total) => setProgress({ label: args.label, done, total }));
      const { count, bytes } = zipAndSave(built.files, args.zipName);
      toast(`${args.done} · ${count} files · ${megabytes(bytes)}`);
      if (built.warnings?.length) toast(built.warnings[0], "error");
    } catch (error) {
      toast(`${args.failed} — ${reason(error)}. ${args.failedHint}`, "error");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const runBrand = () =>
    runPack({
      busyKey: "brand",
      label: "Building brand pack",
      total: 1,
      build: (onProgress) => brandPackFiles(onProgress),
      zipName: `astrosivam_brand-pack_${stamp()}.zip`,
      done: "Brand pack downloaded",
      failed: "Brand pack failed",
      failedHint: "Try one format from the Creative Studio.",
    });

  const runService = (serviceId: string) => {
    const service = SERVICES.find((item) => item.id === serviceId);
    if (!service) return;
    return runPack({
      busyKey: serviceId,
      label: `Building ${service.shortName} pack`,
      total: 1,
      build: (onProgress) => servicePackFiles(service, service.theme, undefined, onProgress),
      zipName: `astrosivam_${slugify(service.shortName)}-pack_${stamp()}.zip`,
      done: `${service.name} pack downloaded`,
      failed: `${service.name} pack failed`,
      failedHint: "Try again, or download one format from the Creative Studio.",
    });
  };

  /** The festival pack config Export Center renders with. */
  const festivalConfig: Parameters<typeof festivalPackFiles>[1] = {
    style: festivalStyle,
    language: festivalLanguage,
    format: "ig-post",
    theme: null,
    display: null,
    script: null,
    logo: null,
    artOverride: null,
    year: "next",
  };

  const runFestival = () => {
    const festival = getFestival(festivalId);
    return runPack({
      busyKey: `festival-${festival.id}`,
      label: `Rendering ${festival.name}`,
      total: 5,
      build: (onProgress) => festivalPackFiles(festival, festivalConfig, onProgress),
      zipName: `astrosivam_${slugify(festival.id)}_${festivalStyle}_festival.zip`,
      done: `${festival.name} pack downloaded`,
      failed: "Festival pack failed",
      failedHint: "Try again.",
    });
  };

  const runFestivalYear = () =>
    runPack({
      busyKey: "festival-year",
      label: "Rendering the festival year",
      total: FESTIVALS.length + 1,
      build: (onProgress) => festivalYearFiles(festivalConfig, onProgress),
      zipName: `astrosivam_festival-year_${festivalStyle}.zip`,
      done: "Festival year downloaded",
      failed: "Festival year failed",
      failedHint: "The year pack is large; close other tabs and try again.",
    });

  const download = (content: string, filename: string, type: string, message: string) => {
    downloadText(content, filename, type);
    toast(message);
  };

  const copyPack: DownloadFile[] = [
    { name: "astrosivam-social-suite.md", data: encoder.encode(fullPackMarkdown()) },
    {
      name: "service-captions.txt",
      data: encoder.encode(
        SERVICES.map(
          (service) =>
            `=== ${service.name} ===\n\nFACEBOOK\n${fbCaption(service)}\n\nINSTAGRAM\n${igCaption(service)}\n`,
        ).join("\n\n"),
      ),
    },
    { name: "calendar.csv", data: encoder.encode(calendarCsv()) },
    { name: "asset-manifest.csv", data: encoder.encode(assetsCsv()) },
    { name: "hashtags.md", data: encoder.encode(hashtagMarkdown()) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Export library"
        title="Download the pack. Hand it to the team."
        description="Packs are split by purpose so downloads stay reliable on mobile: one brand pack, one pack per service, and a copy pack with every caption, calendar and hashtag set. Each PNG is rendered at native platform resolution."
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={Boolean(busy)}
              onClick={() => {
                downloadZip(copyPack, `astrosivam_copy-pack_${stamp()}.zip`);
                toast("Copy pack downloaded.");
              }}
            >
              <FileText className="h-3.5 w-3.5" /> Copy pack .zip
            </button>
            <button type="button" className="btn btn-gold" disabled={Boolean(busy)} onClick={runBrand}>
              {busy === "brand" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
              Brand pack .zip
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel>
          <SectionLabel right={<span className="chip chip-gold">{THEMES.midnight.name}</span>}>Brand pack</SectionLabel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center">
              <img src="/astrosivam_logo.png" alt="" className="h-[62%] w-[62%] object-contain" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-cream">Identity, covers, link card and highlights</div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#B4A58F]">
                Facebook + Instagram profile photos (1080×1080), two Facebook covers (1640×624), the 1200×630 link
                card, seven highlight covers, and an upload README.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">{PACK_SUMMARY.brand} files</span>
                <span className="chip">PNG + README</span>
                <span className="chip chip-jade">Ready to upload</span>
              </div>
            </div>
            <button type="button" className="btn btn-gold" onClick={runBrand} disabled={Boolean(busy)}>
              <Archive className="h-3.5 w-3.5" /> Download
            </button>
          </div>
        </Panel>

        <Panel>
          <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">5 files</span>}>Copy &amp; data</SectionLabel>
          <div className="space-y-1.5">
            {[
              {
                label: "Master suite (.md)",
                detail: "Every caption, calendar, FAQ and hashtag in one document.",
                icon: FileText,
                action: () =>
                  download(fullPackMarkdown(), "astrosivam-social-suite.md", "text/markdown;charset=utf-8", "Master suite downloaded."),
              },
              {
                label: "30-day calendar (.csv)",
                detail: "Day, platform, pillar, hook, asset and best time.",
                icon: CalendarDays,
                action: () =>
                  download(calendarCsv(), "astrosivam-30-day-calendar.csv", "text/csv;charset=utf-8", "Calendar downloaded."),
              },
              {
                label: "Asset manifest (.csv)",
                detail: "Every format with exact pixels and usage notes.",
                icon: FileSpreadsheet,
                action: () =>
                  download(assetsCsv(), "astrosivam-asset-manifest.csv", "text/csv;charset=utf-8", "Manifest downloaded."),
              },
              {
                label: "Hashtag system (.md)",
                detail: "Rules, six mixes per service, and the avoid list.",
                icon: Hash,
                action: () =>
                  download(hashtagMarkdown(), "astrosivam-hashtags.md", "text/markdown;charset=utf-8", "Hashtags downloaded."),
              },
              {
                label: "All captions (.txt)",
                detail: `Facebook and Instagram captions for all ${SERVICES.length} services.`,
                icon: Sparkles,
                action: () =>
                  download(
                    SERVICES.map(
                      (service) =>
                        `=== ${service.name} ===\n\nFACEBOOK\n${fbCaption(service)}\n\nINSTAGRAM\n${igCaption(service)}\n`,
                    ).join("\n\n"),
                    "astrosivam-captions.txt",
                    "text/plain;charset=utf-8",
                    "Captions downloaded.",
                  ),
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-line-soft bg-wash px-3 py-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-medium text-cream">{item.label}</div>
                    <div className="text-[10px] text-[#A2937D]">{item.detail}</div>
                  </div>
                  <button type="button" className="copy-inline" onClick={item.action}>
                    <ImageDown className="h-3 w-3" /> Get
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionLabel right={<span className="chip chip-jade">{festivalStyle}</span>}>Festival packs</SectionLabel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Festival</span>
              <select
                value={festivalId}
                onChange={(event) => setFestivalId(event.target.value)}
                className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream"
              >
                {FESTIVALS.map((festival) => (
                  <option key={festival.id} value={festival.id}>
                    {festival.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Style</span>
              <select
                value={festivalStyle}
                onChange={(event) => setFestivalStyle(event.target.value as FestivalStyle)}
                className="rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream"
              >
                {CARD_STYLES.map((style) => (
                  <option key={style.key} value={style.key}>
                    {style.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="btn btn-gold" onClick={runFestival} disabled={Boolean(busy)}>
              {busy === `festival-${festivalId}` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Package className="h-3.5 w-3.5" />
              )}
              Festival pack
            </button>
            <button type="button" className="btn btn-ghost" onClick={runFestivalYear} disabled={Boolean(busy)}>
              {busy === "festival-year" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
              Whole year
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
            <span className="chip">4 formats + captions</span>
            <span className="chip">Verified dates only</span>
            <span className="chip chip-jade">{festivalDateView(festivalId, 2027).label ?? "date to confirm"}</span>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#B4A58F]">
            Festival packs render the selected style in 4:5, square, 9:16 and Facebook sizes, plus a captions file that
            keeps the Facebook and Instagram versions separate. A festival without a verified date prints the rule it
            follows instead of a guessed day.
          </p>
        </Panel>

      </div>

      <div className="mt-5">
        <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{PACK_SUMMARY.service} files · PNG + copy</span>}>
          Service packs
        </SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((service) => (
            <Panel key={service.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-[15px] text-cream">{service.name}</div>
                    <div className="font-tamil text-[11px] text-gold-soft/75">{service.tamilName}</div>
                  </div>
                  <span className="chip">{service.kind}</span>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-[#B4A58F]">{service.badge} · {service.price}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="chip">FB post</span>
                  <span className="chip">IG post</span>
                  <span className="chip">Square</span>
                  <span className="chip">Story</span>
                  <span className="chip">Reel cover</span>
                  <span className="chip chip-gold">7 carousel slides</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-[10px] text-[#A2937D]">{THEMES[service.theme as ThemeKey]?.name}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => runService(service.id)}
                  disabled={Boolean(busy)}
                >
                  {busy === service.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                  Download
                </button>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel padded={false}>
          <div className="border-b border-line px-5 py-3 text-[12px] font-semibold text-cream">Export manifest</div>
          <div className="max-h-[420px] overflow-y-auto scroll-thin">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-[#191314]">
                <tr className="text-[9px] uppercase tracking-[0.12em] text-[#A2937D]">
                  <th className="px-4 py-2 font-semibold">Format</th>
                  <th className="px-2 py-2 font-semibold">Platform</th>
                  <th className="px-2 py-2 font-semibold">Pixels</th>
                  <th className="px-4 py-2 font-semibold">Group</th>
                </tr>
              </thead>
              <tbody>
                {FORMATS.map((format) => (
                  <tr key={format.id} className="border-t border-line-soft">
                    <td className="px-4 py-2 text-[10.5px] text-cream">{format.label}</td>
                    <td className="px-2 py-2 text-[10px] text-[#B4A58F]">{PLATFORM_LABEL[format.platform]}</td>
                    <td className="px-2 py-2 font-mono text-[10px] text-[#B4A58F]">
                      {format.width}×{format.height}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-[#B4A58F]">{GROUP_LABEL[format.group]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-3">
          <Callout title="Why packs are split">
            A single archive of every creative would exceed 100 MB and fail on phones. Download the brand pack once, then
            a service pack when that campaign begins.
          </Callout>
          <Callout title="Upload order" tone="warn">
            1. Profile photo → 2. Cover → 3. Highlights → 4. Pinned post → 5. Bio and About → 6. Messenger replies →
            7. First nine posts. Changing the identity after posting confuses the algorithm and the audience.
          </Callout>
          <Panel>
            <SectionLabel right={<CopyButton text={fullPackMarkdown()} label="Copy" compact />}>One-page brief</SectionLabel>
            <p className="text-[11px] leading-relaxed text-[#B4A58F]">
              Send the master suite to whoever runs the account. It contains the price, the claim boundaries, the
              calendar and every caption — enough to work without asking a question mid-campaign.
            </p>
          </Panel>
        </div>
      </div>

      {progress ? (
        <ExportProgress
          label={progress.label}
          done={progress.done}
          total={progress.total}
          note="Rendering at full platform resolution — keep this tab open."
        />
      ) : null}
    </div>
  );
};
