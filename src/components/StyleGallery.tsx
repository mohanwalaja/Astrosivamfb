import React, { useMemo, useState } from "react";
import {
  Layers,
  Loader2,
  Download,
  Hash,
  ImageDown,
  Sparkles,
  Check,
  Info,
} from "lucide-react";
import { HERITAGE_STYLES, MODERN_STYLES, STYLES, STYLE_MAP, STYLE_TAG_SETS, THEMES, type StyleFamily, type StyleMeta } from "../data/brand";
import { FORMAT_MAP } from "../data/formats";
import { SERVICES, getService } from "../data/services";
import type { DownloadFile, StyleKey } from "../types";
import { defaultContent, renderCreative } from "../lib/templates";
import { canvasToBytesAndRelease, downloadCanvas, downloadZip, slugify } from "../lib/export";
import { servicePublishCaptions } from "../lib/publishCaptions";
import { CreativeCanvas } from "./CreativeCanvas";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { PREMIUM, setPremiumQuality, type PremiumQuality } from "../lib/premium";
import { Button, Callout, CopyButton, PageHeader, Panel, SectionLabel, useToast } from "./ui";

const FORMAT_OPTIONS = ["ig-post", "ig-square", "fb-post"] as const;

const ASPECT_NOTE: Record<string, string> = {
  "ig-post": "1080 × 1350 · 4:5 feed",
  "ig-square": "1080 × 1080 · 1:1 feed",
  "fb-post": "1200 × 1500 · 4:5 feed",
};

const filenameFor = (style: StyleKey, serviceId: string, formatId: string) =>
  `astrosivam_${slugify(serviceId)}_${style}_${formatId}.png`;

const buildTagBlock = (style: StyleKey) => {
  const meta = STYLE_MAP[style];
  return [
    `${meta.name} — ${meta.paletteName}`,
    "",
    "Use with:",
    ...meta.ornaments.map((item) => `• ${item}`),
    "",
    "Hashtags:",
    STYLE_TAG_SETS[style].join(" "),
  ].join("\n");
};

export const StyleGallery: React.FC<{ onNavigate?: (id: string) => void }> = ({ onNavigate }) => {
  const toast = useToast();
  const [serviceId, setServiceId] = useState("jathagam");
  const [formatId, setFormatId] = useState<(typeof FORMAT_OPTIONS)[number]>("ig-post");
  const [previewWidth, setPreviewWidth] = useState(300);
  const [quality, setQuality] = useState<PremiumQuality>(PREMIUM.quality);
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<StyleKey | null>(null);
  const [family, setFamily] = useState<StyleFamily | "all">("all");

  const service = getService(serviceId);
  const format = FORMAT_MAP[formatId];
  const content = useMemo(() => defaultContent(format, service), [format, service]);

  const visible: StyleMeta[] = family === "all" ? STYLES : STYLES.filter((style) => style.family === family);

  const render = (style: StyleKey) =>
    renderCreative({
      format,
      style,
      service,
      content,
      scale: 1,
    });

  const grab = async (style: StyleKey) => {
    setBusy(style);
    try {
      const canvas = await render(style);
      const name = filenameFor(style, service.id, formatId);
      await downloadCanvas(canvas, name);
      toast(`Downloaded ${STYLE_MAP[style].name} · ${format.width} × ${format.height}`);
    } catch {
      toast("Export failed — try a different format or reload.", "error");
    } finally {
      setBusy(null);
    }
  };

  const grabAll = async () => {
    setBusy("all");
    try {
      const files: DownloadFile[] = [];
      for (const style of STYLES) {
        const canvas = await render(style.key);
        files.push({ name: filenameFor(style.key, service.id, formatId), data: await canvasToBytesAndRelease(canvas) });
      }
      downloadZip(files, `astrosivam_${slugify(service.id)}_${formatId}_styles.zip`);
      toast(`Zipped ${files.length} style exports`);
    } catch {
      toast("ZIP failed — export the styles one at a time.", "error");
    } finally {
      setBusy(null);
    }
  };

  const grabSheet = async () => {
    setBusy("sheet");
    try {
      const sheet = FORMAT_MAP["style-sheet"];
      const canvas = await renderCreative({
        format: sheet,
        style: "signature",
        service,
        content: defaultContent(sheet, service),
        scale: 1,
      });
      const name = `astrosivam_${slugify(service.id)}_style-sheet.png`;
      await downloadCanvas(canvas, name);
      toast(`Downloaded contact sheet · ${sheet.width} × ${sheet.height}`);
    } catch {
      toast("Sheet export failed — reload and try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const copyTags = async (style: StyleKey) => {
    const text = buildTagBlock(style);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStyle(style);
      window.setTimeout(() => setCopiedStyle(null), 1800);
    } catch {
      toast("Clipboard blocked — select the tag line and copy manually.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Style engine · 12 systems"
        title={
          <>
            Twelve art directions, one brand.{" "}
            <span className="gold-text">Six heritage, six modern.</span>
          </>
        }
        description="Every service post is rebuilt in twelve distinct design systems. The heritage six are rooted in Tamil visual culture — Thanjavur relief, kolam, Kanchipuram silk, gopuram skylines and the Karthigai lamp beside the Signature Gold identity. The modern six are editorial, technical, minimal and glass registers. Each one is a real layout, not a colour swap, and each ships with its own ornament vocabulary and hashtag set."
        actions={
          <>
            <Button
              variant="gold"
              onClick={grabAll}
              disabled={busy !== null}
              loading={busy === "all"}
              icon={<ImageDown className="h-3.5 w-3.5" />}
            >
              Download all twelve
            </Button>
            <Button
              variant="ghost"
              onClick={grabSheet}
              disabled={busy !== null}
              loading={busy === "sheet"}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Contact sheet
            </Button>
            <Button variant="quiet" onClick={() => onNavigate?.("services")} icon={<Layers className="h-3.5 w-3.5" />}>
              Service posts
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Panel className="mb-5">
            <SectionLabel right={<span className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">Live preview</span>}>
              Service + format
            </SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {SERVICES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setServiceId(item.id)}
                  aria-pressed={serviceId === item.id}
                  className={`chip ${serviceId === item.id ? "chip-gold" : ""}`}
                >
                  {item.shortName}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {FORMAT_OPTIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormatId(id)}
                  aria-pressed={formatId === id}
                  className={`chip ${formatId === id ? "chip-gold" : ""}`}
                >
                  {ASPECT_NOTE[id]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="label mb-0 mr-1">Family</span>
              {(
                [
                  { id: "all", label: `All · ${STYLES.length}` },
                  { id: "Heritage", label: `Heritage · ${HERITAGE_STYLES.length}` },
                  { id: "Modern", label: `Modern · ${MODERN_STYLES.length}` },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFamily(item.id)}
                  aria-pressed={family === item.id}
                  className={`chip ${family === item.id ? "chip-gold" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="label mb-0 mr-1">Render quality</span>
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setPremiumQuality(level);
                    setQuality(level);
                  }}
                  aria-pressed={quality === level}
                  className={`chip ${quality === level ? "chip-gold" : ""}`}
                >
                  {level[0].toUpperCase() + level.slice(1)}
                </button>
              ))}
              <span className="ml-1 text-[10px] text-[#A2937D]">Lower is faster for multi-card previews.</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="label mb-0">Preview size</span>
              <input
                type="range"
                min={220}
                max={420}
                step={10}
                value={previewWidth}
                onChange={(event) => setPreviewWidth(Number(event.target.value))}
                className="h-1 flex-1 accent-[#C79A3C]"
                aria-label="Preview size"
              />
              <span className="w-14 text-right text-[11px] tabular-nums text-[#B4A58F]">{previewWidth}px</span>
            </div>
          </Panel>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${previewWidth}px), 1fr))` }}
          >
            {visible.map((style) => {
              const theme = THEMES[style.defaultTheme];
              return (
                <article key={style.key} className="card card-hover overflow-hidden">
                  <div className="border-b border-line-soft px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[13.5px] text-cream">{style.name}</h3>
                        <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.16em] text-[#A2937D]">
                          {String(STYLES.indexOf(style) + 1).padStart(2, "0")} · {style.family} · {style.paletteName}
                        </div>
                        <div className="mt-0.5 text-[9.5px] text-[#A2937D]">{style.composition}</div>
                      </div>
                      <span className="flex shrink-0 overflow-hidden rounded">
                        {theme.swatch.map((color) => (
                          <span key={color} className="h-4 w-1.5" style={{ background: color }} />
                        ))}
                      </span>
                    </div>
                  </div>

                  <CreativeCanvas
                    key={quality}
                    format={format}
                    themeKey={style.defaultTheme}
                    style={style.key}
                    service={service}
                    content={content}
                    previewWidth={Math.min(format.width, Math.max(480, previewWidth * 2))}
                  />

                  <div className="border-t border-line-soft px-3.5 py-3">
                    <p className="text-[11px] leading-relaxed text-[#B4A58F]">{style.tagline}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <PublishCanvasButton
                        render={() => render(style.key)}
                        filename={filenameFor(style.key, service.id, formatId)}
                        captions={servicePublishCaptions(service, style.key)}
                        sourceLabel={`${service.shortName} · ${style.name}`}
                        disabled={busy !== null}
                      />
                      <button type="button" className="btn btn-quiet" onClick={() => grab(style.key)} disabled={busy !== null}>
                        {busy === style.key ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        PNG
                      </button>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        onClick={() => copyTags(style.key)}
                        title={buildTagBlock(style.key)}
                      >
                        {copiedStyle === style.key ? (
                          <Check className="h-3 w-3 text-jade" />
                        ) : (
                          <Hash className="h-3 w-3" />
                        )}
                        Tags
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STYLE_TAG_SETS[style.key].slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded border border-line px-1.5 py-0.5 text-[9.5px] text-[#A2937D]">
                          {tag}
                        </span>
                      ))}
                      <span className="px-1 py-0.5 text-[9.5px] text-[#A2937D]">
                        +{STYLE_TAG_SETS[style.key].length - 3} more
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <Panel>
            <SectionLabel right={<Sparkles className="h-3.5 w-3.5 text-gold" />}>The twelve systems</SectionLabel>
            <div className="space-y-3">
              {STYLES.map((style, index) => (
                <div key={style.key} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[12.5px] text-cream">
                      <span className="mr-1.5 text-[10px] text-gold">{String(index + 1).padStart(2, "0")}</span>
                      {style.name}
                    </span>
                    <span className={`text-[9px] uppercase tracking-[0.14em] ${style.family === "Heritage" ? "text-gold-soft" : "text-[#9DB3D4]"}`}>{style.family}</span>
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">{style.description}</p>
                  <div className="mt-2 text-[9.5px] leading-relaxed text-[#A2937D]">
                    <span className="text-gold-soft">Ornaments:</span> {style.ornaments.join(" · ")}
                  </div>
                  <div className="mt-1 text-[9.5px] leading-relaxed text-[#A2937D]">
                    <span className="text-gold-soft">Best for:</span> {style.bestFor}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>How to rotate</SectionLabel>
            <ol className="space-y-2.5 text-[11px] leading-relaxed text-[#B4A58F]">
              <li>
                <span className="text-gold-soft">01 · Anchor.</span> Keep Signature Gold for profile photos, covers and
                the pinned offer. It is the identity other styles defer to.
              </li>
              <li>
                <span className="text-gold-soft">02 · Alternate.</span> Follow every heritage post with a modern one —
                Thanjavur → Mono → Silk → Paper — so a nine-post grid never reads as one texture.
              </li>
              <li>
                <span className="text-gold-soft">03 · Match the message.</span> Ephemeris and Orbit for transits and
                timelines, Paper and Mono for explainers, Deepam and Thanjavur for the festival window, Aurum for ads.
              </li>
              <li>
                <span className="text-gold-soft">04 · Tag.</span> Add the two style hashtags to the service hashtags —
                never more than twelve tags per post.
              </li>
            </ol>
            <Callout icon={<Info className="h-3.5 w-3.5" />} tone="quiet">
              Each style keeps the same copy contract: kicker, headline, Tamil line, three detail chips, price and CTA.
              Change the service and every style re-renders together.
            </Callout>
          </Panel>

          <Panel>
            <SectionLabel>Palettes used</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((style) => {
                const theme = THEMES[style.defaultTheme];
                return (
                  <div key={style.key} className="rounded-lg border border-line p-2">
                    <div className="flex overflow-hidden rounded">
                      {theme.swatch.map((color) => (
                        <span key={color} className="h-5 flex-1" style={{ background: color }} />
                      ))}
                    </div>
                    <div className="mt-1.5 text-[9.5px] leading-tight text-[#B4A58F]">{theme.name}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
};
