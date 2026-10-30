import React, { useState } from "react";
import { Download, Eye, EyeOff, ImageDown, Info, Smartphone, Monitor, Loader2 } from "lucide-react";
import { FORMAT_MAP } from "../data/formats";
import { IG_HIGHLIGHTS } from "../data/instagram";
import { getService } from "../data/services";
import { THEMES } from "../data/brand";
import type { CreativeFormat, ThemeKey } from "../types";
import { defaultContent, renderCreative } from "../lib/templates";
import { canvasToBytes, downloadCanvas, downloadZip } from "../lib/export";
import { CreativeCanvas } from "./CreativeCanvas";
import { Badge, Button, Callout, CopyButton, PageHeader, Panel, PreviewFrame, SectionLabel, useToast } from "./ui";

const jathagam = getService("jathagam");

const PROFILES: Array<{ id: string; label: string; platform: string; note: string }> = [
  {
    id: "fb-profile",
    label: "Facebook profile",
    platform: "1080 × 1080",
    note: "Displays as a circle at 176px on desktop and 60px on mobile. The mark owns the centre; the wordmark sits inside the ring.",
  },
  {
    id: "ig-profile",
    label: "Instagram profile",
    platform: "1080 × 1080",
    note: "Same artwork. Instagram renders it smaller than Facebook, so never add more detail than this.",
  },
];

const COVERS: Array<{ id: string; label: string; platform: string; note: string }> = [
  {
    id: "fb-cover",
    label: "Facebook cover — lockup",
    platform: "1640 × 624",
    note: "Desktop shows 820 × 312; mobile crops to 640 × 360 in the centre. Everything you must keep is inside the dashed safe area.",
  },
  {
    id: "fb-cover-statement",
    label: "Facebook cover — statement",
    platform: "1640 × 624",
    note: "Use when the page has no pinned offer. The promise leads and the URL closes.",
  },
];

export const ProfileCover: React.FC = () => {
  const toast = useToast();
  const [themeKey, setThemeKey] = useState<ThemeKey>("midnight");
  const [guides, setGuides] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const grab = async (formatId: string, index = 0) => {
    const format = FORMAT_MAP[formatId];
    setBusy(`${formatId}-${index}`);
    try {
      const canvas = await renderCreative({
        format,
        themeKey: format.template === "highlight" ? IG_HIGHLIGHTS[index].theme : themeKey,
        service: jathagam,
        content: defaultContent(format, jathagam),
        scale: 1,
        highlightIndex: index,
      });
      await downloadCanvas(canvas, `astrosivam_${formatId}${format.template === "highlight" ? `_${IG_HIGHLIGHTS[index].id}` : ""}_${format.width}x${format.height}.png`);
      toast(`${format.label} downloaded · ${format.width} × ${format.height}`);
    } catch {
      toast("Export failed. Reload and try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const grabAllBrand = async () => {
    setBusy("all");
    try {
      const formats: CreativeFormat[] = [
        FORMAT_MAP["fb-profile"],
        FORMAT_MAP["ig-profile"],
        FORMAT_MAP["fb-cover"],
        FORMAT_MAP["fb-cover-statement"],
        FORMAT_MAP["link-card"],
      ];
      const files = [];
      for (const format of formats) {
        const canvas = await renderCreative({
          format,
          themeKey,
          service: jathagam,
          content: defaultContent(format, jathagam),
          scale: 1,
        });
        files.push({
          name: `${format.id}_${format.width}x${format.height}.png`,
          data: await canvasToBytes(canvas),
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const highlight = FORMAT_MAP["ig-highlights"];
      for (let index = 0; index < IG_HIGHLIGHTS.length; index += 1) {
        const canvas = await renderCreative({
          format: highlight,
          themeKey: IG_HIGHLIGHTS[index].theme,
          service: jathagam,
          content: defaultContent(highlight, jathagam),
          scale: 1,
          highlightIndex: index,
        });
        files.push({
          name: `highlight_${IG_HIGHLIGHTS[index].id}_${highlight.width}x${highlight.height}.png`,
          data: await canvasToBytes(canvas),
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      downloadZip(files, `astrosivam_identity-set_${new Date().toISOString().slice(0, 10)}.zip`);
      toast(`Identity set downloaded · ${files.length} files`);
    } catch {
      toast("Pack failed. Download the files one at a time.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Profile & covers"
        title="The first three seconds of the brand."
        description="A visitor sees the avatar and the cover before they read a single word. These files are drawn at platform resolution, with the mobile crops already accounted for — upload them as they are."
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setGuides((value) => !value)}
              icon={guides ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            >
              {guides ? "Hide crop guides" : "Show crop guides"}
            </Button>
            <Button
              variant="gold"
              disabled={Boolean(busy)}
              loading={busy === "all"}
              onClick={grabAllBrand}
              icon={<ImageDown className="h-3.5 w-3.5" />}
            >
              Download identity set
            </Button>
          </>
        }
      />

      {/* palette control */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-[#191314]/70 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.16em] text-[#A2937D]">
          Palette
        </span>
        {Object.values(THEMES).map((theme) => (
          <button
            key={theme.key}
            type="button"
            onClick={() => setThemeKey(theme.key)}
            aria-pressed={themeKey === theme.key}
            className={`choice flex items-center gap-2 px-2.5 py-1.5 text-[10.5px] ${
              themeKey === theme.key ? "choice-active" : ""
            }`}
          >
            <span className="flex overflow-hidden rounded">
              {theme.swatch.map((color) => (
                <span key={color} className="h-4 w-1.5" style={{ background: color }} />
              ))}
            </span>
            {theme.name}
          </button>
        ))}
        <span className="ml-auto text-[10.5px] text-[#A2937D]">
          Changing the palette re-renders every file below.
        </span>
      </div>

      {/* profiles */}
      <div className="grid gap-4 lg:grid-cols-2">
        {PROFILES.map((profile) => {
          const format = FORMAT_MAP[profile.id];
          return (
            <Panel key={profile.id} padded={false} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <div>
                  <div className="font-display text-[12.5px] text-cream">{profile.label}</div>
                  <div className="text-[10px] text-[#A2937D]">{profile.platform}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => grab(profile.id)}
                  disabled={Boolean(busy)}
                  loading={busy === `${profile.id}-0`}
                  icon={<Download className="h-3 w-3" />}
                >
                  PNG
                </Button>
              </div>
              <div className="checker flex items-center justify-center p-5">
                <PreviewFrame
                  className="w-full max-w-[300px]"
                  innerClassName="rounded-full"
                  label="Avatar"
                  meta="1080 × 1080"
                >
                  <CreativeCanvas
                    format={format}
                    themeKey={themeKey}
                    service={jathagam}
                    content={defaultContent(format, jathagam)}
                    overlay={guides}
                    previewWidth={320}
                  />
                </PreviewFrame>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
                <p className="max-w-[70%] text-[10.5px] leading-relaxed text-[#B4A58F]">{profile.note}</p>
                <span className="chip">min 320 px</span>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* covers */}
      <div className="mt-4 grid gap-4">
        {COVERS.map((cover) => {
          const format = FORMAT_MAP[cover.id];
          return (
            <Panel key={cover.id} padded={false} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <div>
                  <div className="font-display text-[12.5px] text-cream">{cover.label}</div>
                  <div className="text-[10px] text-[#A2937D]">{cover.platform} · mobile crop 640 × 360</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#A2937D]">
                    <Monitor className="h-3 w-3" /> desktop
                    <Smartphone className="ml-1 h-3 w-3" /> mobile
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => grab(cover.id)}
                    disabled={Boolean(busy)}
                    loading={busy === `${cover.id}-0`}
                    icon={<Download className="h-3 w-3" />}
                  >
                    PNG
                  </Button>
                </div>
              </div>
              <div className="checker p-4">
                <PreviewFrame
                  className="mx-auto w-full max-w-[820px]"
                  label="Cover"
                  meta={`${format.width} × ${format.height} px`}
                  caption={
                    guides
                      ? "Dashed box = the 820 × 312 desktop area Facebook actually shows · shaded = cropped on phones"
                      : undefined
                  }
                >
                  <CreativeCanvas
                    format={format}
                    themeKey={themeKey}
                    service={jathagam}
                    content={defaultContent(format, jathagam)}
                    overlay={guides}
                    previewWidth={820}
                  />
                </PreviewFrame>
              </div>
              <div className="border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-[#B4A58F]">
                {cover.note}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* link card + highlights */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <Panel padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div>
              <div className="font-display text-[12.5px] text-cream">Link share card</div>
              <div className="text-[10px] text-[#A2937D]">1200 × 630 · Open Graph</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => grab("link-card")}
              disabled={Boolean(busy)}
              loading={busy === "link-card-0"}
              icon={<Download className="h-3 w-3" />}
            >
              PNG
            </Button>
          </div>
          <div className="checker p-4">
            <PreviewFrame label="Open Graph card" meta="1200 × 630 px">
              <CreativeCanvas
                format={FORMAT_MAP["link-card"]}
                themeKey={themeKey}
                service={jathagam}
                content={defaultContent(FORMAT_MAP["link-card"], jathagam)}
                previewWidth={560}
              />
            </PreviewFrame>
          </div>
          <div className="border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-[#B4A58F]">
            This is what appears when astrosivam.com is pasted into WhatsApp, Messenger, a group or a link-in-bio.
          </div>
        </Panel>

        <Panel>
          <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">7 covers · 1080 × 1080</span>}>
            Instagram highlight covers
          </SectionLabel>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {IG_HIGHLIGHTS.map((highlight, index) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => grab("ig-highlights", index)}
                className="group relative overflow-hidden rounded-full ring-1 ring-[rgba(199,154,62,0.28)] transition-transform hover:scale-[1.04]"
                title={`Download ${highlight.label}`}
              >
                <CreativeCanvas
                  format={FORMAT_MAP["ig-highlights"]}
                  themeKey={highlight.theme}
                  service={jathagam}
                  content={defaultContent(FORMAT_MAP["ig-highlights"], jathagam)}
                  highlightIndex={index}
                  previewWidth={110}
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-[7.5px] uppercase tracking-[0.08em] text-cream opacity-0 transition-opacity group-hover:opacity-100">
                  {busy === `ig-highlights-${index}` ? "…" : "Get"}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {IG_HIGHLIGHTS.slice(0, 4).map((highlight) => (
              <div key={highlight.id} className="text-[10px] text-[#B4A58F]">
                <span className="text-gold-soft">{highlight.label}</span> — {highlight.purpose}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-[10px] text-[#A2937D]">Tap a cover to download it individually.</span>
            <CopyButton text={IG_HIGHLIGHTS.map((item) => item.label).join(" · ")} label="Labels" compact />
          </div>
        </Panel>
      </div>

      {/* specs */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel padded={false}>
          <div className="border-b border-line px-5 py-3 text-[12px] font-semibold text-cream">
            Dimension sheet
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.12em] text-[#A2937D]">
                <th className="px-4 py-2 font-semibold">Asset</th>
                <th className="px-2 py-2 font-semibold">Upload</th>
                <th className="px-2 py-2 font-semibold">Displayed</th>
                <th className="px-4 py-2 font-semibold">Crop</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["FB profile", "1080 × 1080", "176 × 176", "circle"],
                ["IG profile", "1080 × 1080", "110 × 110", "circle"],
                ["FB cover", "1640 × 624", "820 × 312", "640 × 360 mobile"],
                ["Link card", "1200 × 630", "auto", "1.91:1"],
                ["Highlight", "1080 × 1080", "88 × 88", "circle"],
                ["Feed post", "1080 × 1350", "1080 wide", "4:5"],
                ["Story / reel", "1080 × 1920", "full screen", "9:16"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-line-soft">
                  {row.map((cell, index) => (
                    <td
                      key={`${row[0]}-${index}`}
                      className={`px-2 py-2 text-[10.5px] ${index === 0 ? "px-4 font-medium text-cream" : "text-[#B4A58F]"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="space-y-3">
          <Callout title="Upload order" tone="gold">
            Profile photo first, cover second, highlights third. Uplifting the avatar after the cover lets you confirm
            the ring aligns with the cover's logo column.
          </Callout>
          <Callout title="Do not crop in-app" tone="warn">
            Upload the exported file as-is. Cropping inside Facebook or Instagram re-compresses the image and softens
            the thin gold hairlines that hold the whole identity together.
          </Callout>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
              <Info className="h-3 w-3" /> Integrity check
            </div>
            <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
              <li>· The sun–moon mark is centred, never cropped.</li>
              <li>· The wordmark never overlaps the orbital dots.</li>
              <li>· Every file is PNG at 1× (no upscaling).</li>
              <li>· Text is at least 13px at final resolution.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
