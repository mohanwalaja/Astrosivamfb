import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Facebook,
  ImageIcon,
  Instagram,
  Layers,
  Loader2,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { FORMATS, FORMAT_MAP, GROUP_LABEL, PLATFORM_LABEL } from "../data/formats";
import { PANCHANGAM_ROWS } from "../data/panchangam";
import { IG_HIGHLIGHTS } from "../data/instagram";
import { QUOTES, REVIEWS } from "../data/launch";
import { SERVICES, getService } from "../data/services";
import { HERITAGE_STYLES, MODERN_STYLES, STYLE_MAP, STYLE_PALETTES } from "../data/brand";
import type { CreativeContent, CreativeFormat, DownloadFile, StyleKey, ThemeKey } from "../types";
import { defaultContent, editorConfig, renderCreative } from "../lib/templates";
import { downloadCanvas, downloadZip, slugify } from "../lib/export";
import { igCaption } from "../lib/pack";
import { brandPackFiles, servicePackFiles } from "../lib/packBuilder";
import { CreativeCanvas } from "./CreativeCanvas";
import { Badge, Button, Callout, CopyButton, ExportProgress, Input, PageHeader, Panel, PreviewFrame, SectionLabel, Textarea, useToast } from "./ui";

type Group = "brand" | "posts" | "utility";

const PANCHANGAM_CHIP_LABELS = PANCHANGAM_ROWS.map((row) => `${row.en} · ${row.ta}`);
const STYLE_GROUPS = [
  { family: "Heritage", styles: HERITAGE_STYLES },
  { family: "Modern", styles: MODERN_STYLES },
] as const;

const platformIcon = (platform: CreativeFormat["platform"]) => {
  if (platform === "facebook") return <Facebook className="h-3 w-3 text-[#9DB3D4]" />;
  if (platform === "instagram") return <Instagram className="h-3 w-3 text-[#D0A8B8]" />;
  return <Layers className="h-3 w-3 text-gold" />;
};

const stamp = () => new Date().toISOString().slice(0, 10);

export const AssetStudio: React.FC = () => {
  const toast = useToast();
  const [formatId, setFormatId] = useState("fb-post");
  const [serviceId, setServiceId] = useState("jathagam");
  const [themeKey, setThemeKey] = useState<ThemeKey>("midnight");
  const [style, setStyle] = useState<StyleKey>("signature");
  const [content, setContent] = useState<CreativeContent>(() =>
    defaultContent(FORMAT_MAP["fb-post"], getService("jathagam")),
  );
  const [overlay, setOverlay] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);

  const format = FORMAT_MAP[formatId];
  const service = getService(serviceId);
  const config = useMemo(() => editorConfig(format), [format]);
  const isCarousel = format.template === "carousel";
  const isHighlight = format.template === "highlight";
  const slides = service.carousel.slides;

  useEffect(() => {
    if (!isCarousel) setSlideIndex(0);
  }, [isCarousel]);

  const selectFormat = (id: string) => {
    const next = FORMAT_MAP[id];
    setFormatId(id);
    setSlideIndex(0);
    setHighlightIndex(0);
    setContent(defaultContent(next, service, { quoteIndex, reviewIndex }));
  };

  const selectStyle = (next: StyleKey) => {
    setStyle(next);
    setThemeKey(STYLE_MAP[next].defaultTheme);
  };

  const selectService = (id: string) => {
    const next = getService(id);
    setServiceId(id);
    setThemeKey(next.theme);
    setContent(defaultContent(format, next, { quoteIndex, reviewIndex }));
  };

  const reset = () => {
    setContent(defaultContent(format, service, { quoteIndex, reviewIndex }));
    setThemeKey(service.theme);
  };

  const update = (key: keyof CreativeContent, value: string) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const updateChip = (index: number, value: string) => {
    setContent((current) => {
      const chips = [...current.chips];
      chips[index] = value;
      return { ...current, chips };
    });
  };

  const filename = (target: CreativeFormat, suffix = "") => {
    const parts = ["astrosivam", slugify(service.shortName), target.id, themeKey];
    if (suffix) parts.push(suffix);
    return `${parts.join("_")}.png`;
  };

  const downloadCurrent = async () => {
    setBusy("current");
    try {
      const canvas = await renderCreative({
        format,
        themeKey,
        style,
        service,
        content,
        scale: 1,
        slideIndex,
        highlightIndex,
        quoteIndex,
        reviewIndex,
        overlay: false,
      });
      const suffix = isCarousel
        ? `slide-${String(slideIndex + 1).padStart(2, "0")}`
        : isHighlight
          ? IG_HIGHLIGHTS[highlightIndex].id
          : "";
      const name = filename(format, suffix).replace(`_${themeKey}.png`, `_${style}_${themeKey}.png`);
      await downloadCanvas(canvas, name);
      toast(`Downloaded ${name} · ${format.width} × ${format.height}`);
    } catch {
      toast("Export failed. Try a smaller format or reload the page.", "error");
    } finally {
      setBusy(null);
    }
  };

  const buildPack = async (kind: "brand" | "service") => {
    setBusy(kind);
    const label = kind === "brand" ? "Building brand pack" : `Building ${service.name} pack`;
    setProgress({ label, done: 0, total: 1 });

    try {
      if (kind === "brand") {
        const { files, total } = await brandPackFiles((done, count) =>
          setProgress({ label, done, total: count }),
        );
        downloadZip(files, `astrosivam_brand-pack_${stamp()}.zip`);
        toast(`Brand pack downloaded · ${files.length} files · ${total} rendered`);
      } else {
        const { files } = await servicePackFiles(
          service,
          themeKey,
          content,
          (done, count) => setProgress({ label, done, total: count }),
          style,
        );
        downloadZip(files, `astrosivam_${slugify(service.shortName)}-pack_${stamp()}.zip`);
        toast(`${service.name} pack downloaded · ${files.length} files`);
      }
    } catch (error) {
      toast(
        error instanceof Error && error.message
          ? `Pack export failed — ${error.message}`
          : "Pack export failed. Try a single download first.",
        "error",
      );
    } finally {
      setProgress(null);
      setBusy(null);
    }
  };

  const groups: Group[] = ["brand", "posts", "utility"];
  const formatsInGroup = FORMATS.filter((item) => item.group === format.group);
  const canOverlay = Boolean(format.safeZones?.length) || ["profile", "cover", "cover-statement"].includes(format.template);

  return (
    <div>
      <PageHeader
        eyebrow="Asset studio"
        title="Every asset, drawn at export resolution."
        description="Pick a format, a service and a palette. The canvas renders at the exact platform size — download a single PNG or the whole pack as a ZIP with captions included."
        actions={
          <>
            <Button
              variant="ghost"
              disabled={Boolean(busy)}
              onClick={() => buildPack("brand")}
              icon={<ImageIcon className="h-3.5 w-3.5" />}
            >
              Brand pack .zip
            </Button>
            <Button
              variant="gold"
              disabled={Boolean(busy)}
              onClick={() => buildPack("service")}
              loading={busy === "service" || Boolean(progress)}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              {service.shortName} pack .zip
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[248px_minmax(0,1fr)_312px]">
        {/* formats */}
        <div className="xl:sticky xl:top-[76px] xl:self-start">
          <Panel padded={false} className="overflow-hidden">
            <div className="border-b border-line p-3">
              <div className="tab-seg w-full justify-between">
                {groups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    data-active={format.group === group}
                    onClick={() => selectFormat(FORMATS.find((item) => item.group === group)!.id)}
                    className="flex-1"
                  >
                    {group === "brand" ? "Brand" : group === "posts" ? "Posts" : "Utility"}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto p-2 scroll-thin">
              <div className="px-2 pb-1.5 pt-2 text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#A2937D]">
                {GROUP_LABEL[format.group]}
              </div>
              {formatsInGroup.map((item) => {
                const active = item.id === formatId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectFormat(item.id)}
                    aria-pressed={active}
                    className={`flex w-full items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                      active
                        ? "border-[rgba(216,177,100,0.5)] bg-[rgba(77,16,35,0.45)] text-cream"
                        : "border-transparent text-[#C7B9A3] hover:border-line hover:bg-wash"
                    }`}
                  >
                    <span>
                      <span className="flex items-center gap-1.5 text-[11.5px] font-medium leading-snug">
                        {platformIcon(item.platform)}
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-[#A2937D]">
                        {item.width} × {item.height} · {item.ratio}
                      </span>
                    </span>
                    {active ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-gold" /> : null}
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* preview */}
        <div className="min-w-0">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-cream">
                  {platformIcon(format.platform)}
                  {format.label}
                </div>
                <div className="mt-0.5 text-[10.5px] text-[#A2937D]">
                  {format.width} × {format.height} px · {PLATFORM_LABEL[format.platform]} · {format.ratio}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {canOverlay ? (
                  <button
                    type="button"
                    className={`btn btn-quiet px-2.5 py-1.5 text-[11px] ${overlay ? "text-gold-soft" : ""}`}
                    onClick={() => setOverlay((value) => !value)}
                  >
                    {overlay ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {overlay ? "Hide guides" : "Safe zones"}
                  </button>
                ) : null}
                <button type="button" className="btn btn-gold" onClick={downloadCurrent} disabled={Boolean(busy)}>
                  {busy === "current" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PNG
                </button>
              </div>
            </div>

            <div className="checker flex items-center justify-center p-4 sm:p-7">
              <PreviewFrame
                className="w-full max-w-[600px]"
                label={format.label}
                meta={`${format.width} × ${format.height} px`}
              >
                <CreativeCanvas
                  format={format}
                  themeKey={themeKey}
                  style={style}
                  service={service}
                  content={content}
                  overlay={overlay}
                  slideIndex={slideIndex}
                  highlightIndex={highlightIndex}
                  quoteIndex={quoteIndex}
                  reviewIndex={reviewIndex}
                  previewWidth={900}
                />
              </PreviewFrame>
            </div>

            {isCarousel ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                <button
                  type="button"
                  className="btn btn-quiet px-2 py-1"
                  onClick={() => setSlideIndex((index) => Math.max(0, index - 1))}
                  disabled={slideIndex === 0}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex flex-wrap gap-1">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.headline}
                      type="button"
                      onClick={() => setSlideIndex(index)}
                      aria-pressed={slideIndex === index}
                      className={`choice h-7 min-w-7 px-1.5 text-[10.5px] font-semibold ${
                        slideIndex === index ? "choice-active" : ""
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-quiet px-2 py-1"
                  onClick={() => setSlideIndex((index) => Math.min(slides.length - 1, index + 1))}
                  disabled={slideIndex === slides.length - 1}
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="ml-auto text-[10.5px] text-[#A2937D]">
                  Slide {slideIndex + 1} of {slides.length} · {slides[slideIndex].headline}
                </span>
              </div>
            ) : null}

            {isHighlight ? (
              <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3">
                {IG_HIGHLIGHTS.map((highlight, index) => (
                  <button
                    key={highlight.id}
                    type="button"
                    onClick={() => setHighlightIndex(index)}
                    aria-pressed={highlightIndex === index}
                    className={`choice px-2.5 py-1.5 text-[11px] font-medium ${highlightIndex === index ? "choice-active" : ""}`}
                  >
                    {highlight.label}
                  </button>
                ))}
              </div>
            ) : null}

            {format.template === "quote" ? (
              <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3">
                {QUOTES.map((quote, index) => (
                  <button
                    key={quote.text}
                    type="button"
                    aria-pressed={quoteIndex === index}
                    onClick={() => {
                      setQuoteIndex(index);
                      setContent({ ...content, headline: quote.text, subline: quote.attribution });
                    }}
                    className={`choice max-w-[220px] truncate px-2.5 py-1.5 text-[11px] ${
                      quoteIndex === index ? "choice-active" : ""
                    }`}
                  >
                    {index + 1}. {quote.text.replace(/\n/g, " ")}
                  </button>
                ))}
              </div>
            ) : null}

            {format.template === "review" ? (
              <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3">
                {REVIEWS.map((review, index) => (
                  <button
                    key={review.name}
                    type="button"
                    onClick={() => {
                      setReviewIndex(index);
                      setContent({
                        ...content,
                        headline: review.quote,
                        subline: `${review.name} · ${review.place}`,
                        chips: [review.service],
                      });
                    }}
                    className={`choice px-2.5 py-1.5 text-[11px] ${reviewIndex === index ? "choice-active" : ""}`}
                  >
                    {review.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-[#B4A58F]">
              {format.notes ?? format.usage}
            </div>
          </Panel>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={igCaption(service)} label="Copy IG caption" compact />
            <CopyButton text={service.fb.hashtags.join(" ")} label="Copy FB tags" compact />
            <CopyButton text={service.url} label="Copy service link" compact />
            <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-[#A2937D]">
              <Smartphone className="h-3 w-3" /> Preview is scaled · downloads are full size
            </span>
          </div>

          {format.template === "panchangam" || format.template === "review" ? (
            <div className="mt-3">
              <Callout tone="warn" title="Check before publishing">
                {format.template === "panchangam"
                  ? "The timings on this card are placeholders. Replace them with the calculated tithi, nakshatra, Rahu Kalam and Shubh Hora for the day — an incorrect panchangam costs more trust than a missed post."
                  : "This is placeholder content, not a customer review. Replace it with a genuine quote and get the customer’s permission before exporting or publishing."}
              </Callout>
            </div>
          ) : null}
        </div>

        {/* editor */}
        <div className="space-y-3 xl:sticky xl:top-[76px] xl:self-start">
          <Panel>
            <SectionLabel right={<span className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">Content</span>}>
              Editor
            </SectionLabel>

            {config.fields.length ? (
              <div className="space-y-3">
                {config.fields.map((field) =>
                  field.multiline ? (
                    <Textarea
                      key={field.key}
                      label={field.label}
                      rows={3}
                      value={String(content[field.key] ?? "")}
                      maxLength={field.max}
                      onChange={(event) => update(field.key, event.target.value)}
                    />
                  ) : (
                    <Input
                      key={field.key}
                      label={field.label}
                      value={String(content[field.key] ?? "")}
                      maxLength={field.max}
                      onChange={(event) => update(field.key, event.target.value)}
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-[#B4A58F]">
                {config.message ?? "This layout is locked."}
              </p>
            )}

            {config.chips ? (
              <div className="mt-3 space-y-2">
                <div className="label">
                  {format.template === "panchangam" ? "Panchangam values" : config.chips.label}
                </div>
                {Array.from({ length: config.chips.count }).map((_, index) => (
                  <Input
                    key={index}
                    aria-label={
                      format.template === "panchangam" ? PANCHANGAM_CHIP_LABELS[index] : `Detail ${index + 1}`
                    }
                    className="text-[12px]"
                    value={content.chips[index] ?? ""}
                    placeholder={
                      format.template === "panchangam" ? PANCHANGAM_CHIP_LABELS[index] : `Detail ${index + 1}`
                    }
                    onChange={(event) => updateChip(index, event.target.value)}
                  />
                ))}
              </div>
            ) : null}

            {config.message && config.fields.length ? (
              <p className="mt-3 rounded-lg border border-[rgba(208,138,90,0.3)] bg-[rgba(208,138,90,0.06)] px-3 py-2 text-[10.5px] leading-relaxed text-[#F0C3A2]">
                {config.message}
              </p>
            ) : null}

            <Button variant="quiet" full className="mt-3" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}>
              Reset this layout
            </Button>
          </Panel>

          <Panel>
            <SectionLabel
              right={
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">
                  {STYLE_MAP[style].family} · {STYLE_MAP[style].paletteName}
                </span>
              }
            >
              Art direction
            </SectionLabel>
            <div className="space-y-2.5">
              {STYLE_GROUPS.map((group) => (
                <div key={group.family}>
                  <div className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#A2937D]">{group.family}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.styles.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectStyle(item.key)}
                        title={item.tagline}
                        aria-pressed={style === item.key}
                        className={`choice px-2.5 py-2 text-left ${style === item.key ? "choice-active" : ""}`}
                      >
                        <div className="text-[10.5px] font-semibold text-cream">{item.name}</div>
                        <div className="mt-0.5 truncate text-[9px] uppercase tracking-[0.12em] text-[#A2937D]">
                          {item.paletteName}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
              {STYLE_MAP[style].tagline} Applies to feed posts and squares — covers, profile photos and stories stay in the signature system.
            </p>

            <div className="mt-4 border-t border-line pt-3">
              <SectionLabel right={<span className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">Palette</span>}>
                Theme
              </SectionLabel>
              <div className="space-y-2.5">
                {STYLE_PALETTES.map((group) => (
                  <div key={group.family}>
                    <div className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#A2937D]">{group.family}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.entries.map(({ style: paletteStyle, theme }) => (
                        <button
                          key={paletteStyle.key}
                          type="button"
                          onClick={() => setThemeKey(theme.key)}
                          aria-pressed={themeKey === theme.key}
                          title={`${theme.name} — designed for ${paletteStyle.name}`}
                          className={`choice flex items-center gap-2 p-1.5 text-left ${
                            themeKey === theme.key ? "choice-active" : ""
                          }`}
                        >
                          <span className="flex shrink-0 overflow-hidden rounded">
                            {theme.swatch.map((color) => (
                              <span key={color} className="h-5 w-1.5" style={{ background: color }} />
                            ))}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-medium leading-tight text-cream">{theme.name}</span>
                            <span className="block truncate text-[8.5px] text-[#A2937D]">{paletteStyle.name}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <div className="label">Service</div>
              <div className="grid grid-cols-2 gap-1.5">
                {SERVICES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectService(item.id)}
                    aria-pressed={serviceId === item.id}
                    className={`choice px-2 py-1.5 text-left text-[10.5px] leading-tight ${
                      serviceId === item.id ? "choice-active text-cream" : ""
                    }`}
                  >
                    {item.shortName}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {progress ? <ExportProgress label={progress.label} done={progress.done} total={progress.total} noun="files rendered" /> : null}
    </div>
  );
};
