import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Clapperboard,
  Download,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { HERITAGE_STYLES, MODERN_STYLES, STYLE_MAP, STYLE_PALETTES, type StyleFamily } from "../data/brand";
import { DEITIES, DEITY_MAP, DEITY_USAGE_NOTE } from "../data/deities";
import type {
  DeityKey,
  DisplayFontKey,
  ImageFit,
  PosterLayout,
  PosterTemplate,
  ScriptFontKey,
  StyleKey,
  ThemeKey,
} from "../types";
import { TEMPLATES, layoutForTemplate, templateForLayout } from "../data/posterTemplates";
import { TemplateGlyph } from "./TemplateGlyph";
import {
  DISPLAY_FONTS,
  SCRIPT_FONTS,
  renderPoster,
  type PosterOptions,
} from "../lib/poster";
import { downloadCanvas, exportFileName, saveBlob, slugify } from "../lib/export";
import { brandPostCaptions } from "../lib/publishCaptions";
import { fileToImageSource } from "../lib/imageUpload";
import { Button, Callout, CopyButton, Field, Input, PageHeader, Panel, PreviewFrame, SectionLabel, Textarea, Toggle, useToast } from "./ui";
import { ExportLibrary } from "./ExportLibrary";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { recordReel, reelFileName, reelSupport, type ReelStage } from "../lib/reel";
import { recordExport } from "../lib/exportLibrary";
import {
  clearStudioPreset,
  loadPreset,
  peekStudioPreset,
  savePreset,
  type PosterState,
} from "../lib/studioState";

const FORMATS = [
  { id: "ig-post", label: "IG post", width: 1080, height: 1350 },
  { id: "ig-square", label: "Square", width: 1080, height: 1080 },
  { id: "fb-post", label: "FB post", width: 1200, height: 1500 },
  { id: "story", label: "Story", width: 1080, height: 1920 },
  { id: "print", label: "A4 print", width: 2480, height: 3508 },
];

/**
 * The five legacy frame choices, kept because they are the fastest way to change
 * a composition and because saved presets reference them. Each one selects the
 * template painted for that frame, so the two controls never disagree.
 */
const LAYOUTS: Array<{ id: PosterLayout; label: string; note: string }> = [
  { id: "portrait-arch", label: "Arch", note: "Heritage doorway" },
  { id: "full-bleed", label: "Bleed", note: "Image under the type" },
  { id: "split", label: "Split", note: "Copy left, plate right" },
  { id: "medallion", label: "Round", note: "Greeting medallion" },
  { id: "type-only", label: "Type", note: "No image at all" },
];

const FITS: Array<{ id: ImageFit; label: string }> = [
  { id: "arch", label: "Arch" },
  { id: "circle", label: "Circle" },
  { id: "square", label: "Square" },
  { id: "full", label: "Full" },
];

/** The twelve art directions, in their two families. */
const STYLE_GROUPS: Array<{ family: StyleFamily; styles: typeof HERITAGE_STYLES }> = [
  { family: "Heritage", styles: HERITAGE_STYLES },
  { family: "Modern", styles: MODERN_STYLES },
];

/**
 * Twelve palettes — one per art direction, each the palette that direction was
 * designed on. Picking a palette does not change the style, so a Thanjavur
 * composition can be printed on the Ephemeris lagoon if the client asks.
 */
const PALETTES = STYLE_PALETTES;

/** Open the studio on a finished card, not an empty one — everything stays editable. */
const STARTER_DEITY = DEITY_MAP.ganesha;

const DEFAULT: Omit<PosterOptions, "scale"> = {
  width: 1080,
  height: 1350,
  themeKey: "saffron",
  style: "gopuram",
  layout: "portrait-arch",
  template: "mandapam",
  display: "cinzel",
  script: "serif",
  image: STARTER_DEITY.file,
  imageFit: "arch",
  kicker: STARTER_DEITY.name,
  headline: "Begin with a blessing.",
  tamil: STARTER_DEITY.tamil,
  hindi: STARTER_DEITY.hindi,
  subline: STARTER_DEITY.epithet,
  cta: "astrosivam.com",
  footer: "astrosivam.com · Email: admin@astrosivam.com",
  showLogo: true,
};

interface StudioInit {
  state: PosterState;
  formatId: string;
  deityKey: DeityKey | null;
  note?: string;
}

/**
 * Where the studio opens: a one-shot preset from another screen wins, then the
 * poster you were last working on, then the starter card.
 */
const readInitial = (): StudioInit => {
  const preset = peekStudioPreset();
  const saved = loadPreset();
  const formatId = preset?.formatId ?? saved?.formatId ?? "ig-post";
  const format = FORMATS.find((item) => item.id === formatId) ?? FORMATS[0];
  return {
    state: {
      ...DEFAULT,
      ...(saved?.state ?? {}),
      ...(preset?.state ?? {}),
      width: format.width,
      height: format.height,
    },
    formatId: format.id,
    deityKey: preset ? (preset.deityKey ?? null) : (saved?.deityKey ?? "ganesha"),
    note: preset?.note,
  };
};

/** What the library card calls this export — the copy that went into it. */
const studioCaption = (state: PosterState) =>
  [state.headline, state.subline, state.tamil, state.hindi, state.cta].filter(Boolean).join("\n\n");

const STAGE_LABEL: Record<ReelStage, string> = {
  rendering: "Rendering the poster",
  recording: "Recording 1080 × 1920",
  encoding: "Finishing the file",
};

export const PosterStudio: React.FC = () => {
  const toast = useToast();
  const [initial] = useState<StudioInit>(readInitial);
  const [state, setState] = useState<PosterState>(initial.state);
  const [formatId, setFormatId] = useState(initial.formatId);
  const [busy, setBusy] = useState(false);
  const [deityKey, setDeityKey] = useState<DeityKey | null>(initial.deityKey);
  const [libraryKey, setLibraryKey] = useState(0);
  const [reel, setReel] = useState<{ progress: number; stage: ReelStage } | null>(null);
  const reelAbort = useRef<AbortController | null>(null);
  const announced = useRef(false);
  const support = useRef(reelSupport()).current;
  const fileInput = useRef<HTMLInputElement>(null);

  // Announce a hand-off from another screen exactly once, then retire it so a
  // later visit opens on whatever the user last edited instead.
  useEffect(() => {
    clearStudioPreset();
    if (!initial.note || announced.current) return;
    announced.current = true;
    toast(initial.note);
  }, [initial.note, toast]);

  // Remember the poster, so a reload comes back to it instead of to Ganesha.
  useEffect(() => {
    const timer = window.setTimeout(() => savePreset({ state, formatId, deityKey }), 350);
    return () => window.clearTimeout(timer);
  }, [state, formatId, deityKey]);

  const set = <K extends keyof typeof state>(key: K, value: (typeof state)[K]) =>
    setState((current) => ({ ...current, [key]: value }));

  const activeTemplate =
    TEMPLATES.find((template) => template.key === state.template) ??
    TEMPLATES.find((template) => template.key === templateForLayout(state.layout)) ??
    TEMPLATES[0];
  const activeTemplateKey = activeTemplate.key;

  /**
   * Switching template changes the composition only. Theme, art, copy and fonts
   * are the client's work and are never thrown away.
   */
  const selectTemplate = (key: PosterTemplate) => {
    setState((current) => (current.template === key ? current : { ...current, template: key }));
  };

  const chooseFormat = (id: string) => {
    const format = FORMATS.find((item) => item.id === id)!;
    setFormatId(id);
    setState((current) => ({ ...current, width: format.width, height: format.height }));
  };

  const useDeity = (key: DeityKey) => {
    const deity = DEITY_MAP[key];
    setDeityKey(key);
    setState((current) => ({
      ...current,
      image: deity.file,
      kicker: deity.name,
      tamil: deity.tamil,
      hindi: deity.hindi,
      subline: deity.epithet,
      // A deity painting needs somewhere to sit: move off the imageless template,
      // but never override a composition the user chose on purpose.
      ...(current.template === "manifesto"
        ? { template: "mandapam" as PosterTemplate, layout: "portrait-arch" as PosterLayout }
        : {}),
    }));
  };

  const clearImage = () => {
    setDeityKey(null);
    set("image", null);
  };

  const onUpload = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose a PNG or JPG image.", "error");
      return;
    }
    try {
      const src = await fileToImageSource(file);
      setDeityKey(null);
      setState((current) => ({
        ...current,
        image: src,
        ...(current.template === "manifesto"
          ? { template: "nocturne" as PosterTemplate, layout: "full-bleed" as PosterLayout }
          : {}),
      }));
      toast("Image added — it stays in this browser only.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "That file could not be read.", "error");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const canvas = await renderPoster({ ...state, scale: 1 });
      const name = `${exportFileName(["astrosivam", "poster", slugify(state.headline).slice(0, 40), formatId])}_${state.width}x${state.height}.png`;
      const saved = await downloadCanvas(canvas, name, {
        formatId,
        caption: studioCaption(state),
      });
      if (saved) setLibraryKey((key) => key + 1);
      toast(
        saved
          ? `Downloaded ${state.width} × ${state.height} — kept in your exports`
          : `Downloaded ${state.width} × ${state.height} PNG`,
      );
    } catch {
      toast("Export failed — try a smaller format or another image.", "error");
    } finally {
      setBusy(false);
    }
  };

  /** 15 s story-format reel of the poster, recorded live from a capture stream. */
  const record = async () => {
    if (reel) return;
    const controller = new AbortController();
    reelAbort.current = controller;
    setReel({ progress: 0, stage: "rendering" });
    try {
      const result = await recordReel({
        poster: state,
        signal: controller.signal,
        onProgress: (progress, stage) => setReel({ progress, stage }),
      });
      const name = reelFileName(state.headline || "astrosivam-reel");
      saveBlob(result.blob, name);
      try {
        const saved = await recordExport({
          canvas: result.thumbnailCanvas,
          blob: result.blob,
          name,
          formatId: "reel",
          width: result.thumbnailCanvas.width,
          height: result.thumbnailCanvas.height,
          caption: studioCaption(state),
        });
        if (saved) setLibraryKey((key) => key + 1);
      } catch {
        // Reel download remains successful even if browser storage is unavailable.
      }
      toast(
        `Recorded ${Math.round(result.durationMs / 1000)} s · ${result.frames} frames · ${(result.blob.size / 1048576).toFixed(1)} MB`,
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Video export failed.", "error");
    } finally {
      reelAbort.current = null;
      setReel(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Poster studio · freeform"
        title={
          <>
            Write it yourself.{" "}
            <span className="gold-text">Eight compositions, any font, any image.</span>
          </>
        }
        description="A blank canvas that still obeys the brand. Start from one of eight compositions — temple mandapam, gallery plate, manifesto, glass nocturne, guide slide, offer card, festival blessing or series cover — pick a deity painting or upload your own photo, set the English, Tamil and Hindi lines, then export at platform size. Switching template keeps every word and image you have already written."
        actions={
          <>
            <PublishCanvasButton
              render={() => renderPoster({ ...state, scale: 1 })}
              filename={`${exportFileName(["astrosivam", "poster", slugify(state.headline).slice(0, 40), formatId])}_${state.width}x${state.height}.png`}
              captions={brandPostCaptions(studioCaption(state))}
              sourceLabel={state.width / state.height >= 0.8 && state.width / state.height <= 1.91
                ? "Custom poster · Facebook/Instagram feed image"
                : "Custom poster · Facebook feed image (not an Instagram Story or Reel)"}
              platforms={state.width / state.height >= 0.8 && state.width / state.height <= 1.91 ? undefined : ["facebook"]}
              disabled={busy || Boolean(reel)}
              label="Publish poster now"
            />
            <Button
              variant="ghost"
              onClick={download}
              loading={busy}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Download PNG
            </Button>
            <Button
              variant="ghost"
              onClick={record}
              disabled={Boolean(reel) || !support.ok}
              icon={reel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
              title={support.ok ? "Records a 15 s 1080 × 1920 story version of this poster" : support.reason}
            >
              {reel ? "Recording…" : "15 s reel"}
            </Button>
            <Button
              variant="quiet"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                setState(DEFAULT);
                setFormatId("ig-post");
                setDeityKey("ganesha");
                toast("Reset to the starting layout.");
              }}
            >
              Reset
            </Button>
          </>
        }
      />

      {reel ? (
        <div className="card mb-5 p-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-cream">
              <Clapperboard className="h-3.5 w-3.5 text-gold" />
              {STAGE_LABEL[reel.stage]}
            </span>
            <span className="font-display text-[13px] text-gold-soft">{Math.round(reel.progress * 100)}%</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-track"
            role="progressbar"
            aria-valuenow={Math.round(reel.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Reel recording progress"
          >
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-150"
              style={{ width: `${Math.max(2, reel.progress * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] leading-relaxed text-[#B4A58F]">
              Recording happens in real time, so this takes about 15 seconds. Keep this tab visible until it finishes —
              the file downloads on its own.
            </p>
            <button type="button" className="btn btn-quiet" onClick={() => reelAbort.current?.abort()}>
              <X className="h-3.5 w-3.5" /> Stop
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* ------------------------------ controls ------------------------------ */}
        <div className="space-y-4">
          <Panel>
            <SectionLabel right={<ImageIcon className="h-3.5 w-3.5 text-gold" />}>Image</SectionLabel>

            <div className="grid grid-cols-5 gap-1.5">
              {DEITIES.map((deity) => (
                <button
                  key={deity.key}
                  type="button"
                  onClick={() => useDeity(deity.key)}
                  title={`${deity.name} · ${deity.epithet}`}
                  aria-pressed={deityKey === deity.key}
                  className={`choice overflow-hidden p-0 ${
                    deityKey === deity.key ? "choice-active" : ""
                  }`}
                >
                  <img src={deity.thumb} alt={deity.name} loading="lazy" decoding="async" className="h-12 w-full object-cover" />
                  <span className="block truncate bg-black/40 px-1 py-1 text-[8.5px] text-[#D9CDBA]">{deity.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Button variant="ghost" className="flex-1" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => fileInput.current?.click()}>
                Upload image
              </Button>
              {state.image ? (
                <Button variant="quiet" onClick={clearImage} aria-label="Remove image" icon={<X className="h-3.5 w-3.5" />} />
              ) : null}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onUpload(event.target.files?.[0])}
            />

            <div className="mt-3">
              <div className="label">Crop shape</div>
              <div className="flex flex-wrap gap-1.5">
                {FITS.map((fit) => (
                  <button
                    key={fit.id}
                    type="button"
                    onClick={() => set("imageFit", fit.id)}
                    aria-pressed={state.imageFit === fit.id}
                    className={`chip ${state.imageFit === fit.id ? "chip-gold" : ""}`}
                  >
                    {fit.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<span className="text-[9.5px] text-[#A2937D]">{activeTemplate.name}</span>}>
              Template
            </SectionLabel>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Poster template">
              {TEMPLATES.map((template) => {
                const active = state.template === template.key;
                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => selectTemplate(template.key)}
                    aria-pressed={active}
                    aria-label={`${template.name} — ${template.tagline}. ${template.bestFor}`}
                    title={`${template.description}\n\nBest for: ${template.bestFor}`}
                    className={`choice flex flex-col gap-1 px-2 py-2 text-left ${active ? "choice-active" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <TemplateGlyph
                        template={template.key}
                        className={`h-8 w-[26px] shrink-0 ${active ? "text-gold-soft" : "text-[#A2937D]"}`}
                      />
                      <span className="min-w-0">
                        <span className={`block truncate text-[10.5px] font-medium ${active ? "text-cream" : "text-cream/85"}`}>
                          {template.name}
                        </span>
                        <span className="block truncate text-[8.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                          {template.family}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[#A2937D]">{activeTemplate.composition}</p>
            {!activeTemplate.usesImage && state.image ? (
              <Callout tone="quiet">
                This template sets no image. Your photo is kept — switch back and it returns.
              </Callout>
            ) : null}
          </Panel>

          <Panel>
            <SectionLabel>Frame &amp; format</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {LAYOUTS.map((layout) => {
                const active = layoutForTemplate(activeTemplateKey) === layout.id;
                return (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() =>
                      setState((current) => ({ ...current, layout: layout.id, template: templateForLayout(layout.id) }))
                    }
                    aria-pressed={active}
                    className={`chip ${active ? "chip-gold" : ""}`}
                    title={layout.note}
                  >
                    {layout.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
              {FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => chooseFormat(format.id)}
                  aria-pressed={formatId === format.id}
                  className={`chip ${formatId === format.id ? "chip-gold" : ""}`}
                  title={`${format.width} × ${format.height}`}
                >
                  {format.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-[#A2937D]">
              {state.width} × {state.height} px
              {formatId === "print" ? (
                <span className="mt-1 block text-[#A2937D]">
                  A4 at 300 dpi. Stock deity art is 1200 px, so it prints at roughly 200 ppi — sharp on a
                  desk, soft under a loupe. For prestige print, upload a 2000 px+ image.
                </span>
              ) : null}
            </p>
          </Panel>

          <Panel>
            <SectionLabel right={<Sparkles className="h-3.5 w-3.5 text-gold" />}>Style &amp; font</SectionLabel>
            <div className="space-y-2">
              {STYLE_GROUPS.map((group) => (
                <div key={group.family}>
                  <div className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#A2937D]">
                    {group.family}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.styles.map((style) => (
                      <button
                        key={style.key}
                        type="button"
                        onClick={() => {
                          set("style", style.key as StyleKey);
                          set("themeKey", STYLE_MAP[style.key].defaultTheme);
                        }}
                        aria-pressed={state.style === style.key}
                        title={style.tagline}
                        className={`chip ${state.style === style.key ? "chip-gold" : ""}`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <div className="label">Headline font</div>
              <div className="grid grid-cols-2 gap-1.5">
                {DISPLAY_FONTS.map((font) => (
                  <button
                    key={font.key}
                    type="button"
                    onClick={() => set("display", font.key as DisplayFontKey)}
                    aria-pressed={state.display === font.key}
                    className={`choice px-2 py-1.5 text-left ${state.display === font.key ? "choice-active" : ""}`}
                  >
                    <span className="block text-[11px] text-cream">{font.label}</span>
                    <span className="block truncate text-[9px] text-[#A2937D]">{font.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="label">Tamil &amp; Hindi font</div>
              <div className="space-y-1">
                {SCRIPT_FONTS.map((font) => (
                  <button
                    key={font.key}
                    type="button"
                    onClick={() => set("script", font.key as ScriptFontKey)}
                    aria-pressed={state.script === font.key}
                    className={`choice flex w-full items-baseline justify-between gap-2 px-2 py-1.5 text-left ${
                      state.script === font.key ? "choice-active" : ""
                    }`}
                  >
                    <span className="text-[10.5px] text-cream">{font.label}</span>
                    <span className="truncate text-[9px] text-[#A2937D]">{font.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<span className="text-[10px] text-[#A2937D]">12 palettes</span>}>Palette</SectionLabel>
            <div className="space-y-2">
              {PALETTES.map((group) => (
                <div key={group.family}>
                  <div className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#A2937D]">{group.family}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.entries.map(({ style, theme }) => {
                      const active = state.themeKey === theme.key;
                      return (
                        <button
                          key={style.key}
                          type="button"
                          onClick={() => set("themeKey", theme.key as ThemeKey)}
                          aria-pressed={active}
                          title={`${theme.name} — designed for ${style.name}`}
                          className={`choice flex items-center gap-2 px-2 py-1.5 text-left ${active ? "choice-active" : ""}`}
                        >
                          <span className="flex shrink-0 overflow-hidden rounded">
                            {theme.swatch.map((color) => (
                              <span key={color} className="h-5 w-1.5" style={{ background: color }} />
                            ))}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] text-cream">{theme.name}</span>
                            <span className="block truncate text-[8.5px] text-[#A2937D]">{style.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ------------------------------- preview ------------------------------ */}
        <div className="space-y-4">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <span className="inline-flex items-center gap-2 font-display text-[12px] tracking-[0.02em] text-cream">
                <span className="h-1.5 w-1.5 rotate-45 bg-gold" aria-hidden="true" />
                Live preview
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#A2937D]">
                {state.width} × {state.height}
              </span>
            </div>
            <div className="checker flex justify-center p-4 sm:p-7">
              <PreviewFrame
                className="w-full max-w-[560px]"
                label="Poster"
                meta={`${state.width} × ${state.height} px`}
              >
                <LivePoster options={state} />
              </PreviewFrame>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <SectionLabel>Copy</SectionLabel>
              <Input label="Kicker" value={state.kicker} onChange={(event) => set("kicker", event.target.value)} maxLength={48} />
              <Textarea
                label="Headline"
                rows={3}
                value={state.headline}
                onChange={(event) => set("headline", event.target.value)}
                maxLength={140}
                hint={`${state.headline.length} / 140 characters`}
              />
              <Textarea
                label="Subline"
                rows={2}
                value={state.subline}
                onChange={(event) => set("subline", event.target.value)}
                maxLength={160}
              />
            </Panel>

            <Panel>
              <SectionLabel right={<CopyButton text={`${state.tamil}\n${state.hindi}`} label="Copy" compact />}>
                தமிழ் / हिंदी
              </SectionLabel>
              <Input
                label="Tamil line"
                className="font-tamil"
                value={state.tamil}
                onChange={(event) => set("tamil", event.target.value)}
                maxLength={80}
                placeholder="தமிழ் வாழ்த்துக்கள்"
              />
              <Input
                label="Hindi line"
                style={{ fontFamily: '"Noto Sans Devanagari", sans-serif' }}
                value={state.hindi}
                onChange={(event) => set("hindi", event.target.value)}
                maxLength={80}
                placeholder="हिंदी शुभकामनाएँ"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="CTA" value={state.cta} onChange={(event) => set("cta", event.target.value)} maxLength={48} />
                <Input label="Footer" value={state.footer} onChange={(event) => set("footer", event.target.value)} maxLength={72} />
              </div>
              <div className="mt-3 border-t border-line-soft pt-3">
                <Toggle
                  checked={state.showLogo}
                  onChange={(checked) => set("showLogo", checked)}
                  label="Show the Astro Sivam logo"
                  hint="Placed inside the safe area on every format."
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Panel>
              <SectionLabel right={<span className="text-[10px] text-[#A2937D]">{DEITIES.length} in library</span>}>
                Deity library
              </SectionLabel>
              <div className="grid grid-cols-5 gap-1.5">
                {DEITIES.map((deity) => (
                  <button
                    key={deity.key}
                    type="button"
                    onClick={() => useDeity(deity.key)}
                    aria-pressed={deityKey === deity.key}
                    className={`choice overflow-hidden p-0 ${
                      deityKey === deity.key ? "choice-active" : ""
                    }`}
                  >
                    <img src={deity.thumb} alt={deity.name} loading="lazy" decoding="async" className="h-14 w-full object-cover" />
                  </button>
                ))}
              </div>
              {deityKey ? (
                <div className="mt-3 rounded-lg border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[13px] text-cream">{DEITY_MAP[deityKey].name}</span>
                    <span className="font-tamil text-[11px] text-gold-soft">{DEITY_MAP[deityKey].tamil}</span>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#B4A58F]">{DEITY_MAP[deityKey].blessing}</p>
                  <p className="mt-1.5 text-[10px] text-[#A2937D]">{DEITY_MAP[deityKey].mantra}</p>
                </div>
              ) : null}
              <Callout>{DEITY_USAGE_NOTE}</Callout>
            </Panel>

            <div className="space-y-4">
            <ExportLibrary refreshKey={libraryKey} />
            <Panel>
              <SectionLabel right={<Check className="h-3.5 w-3.5 text-jade" />}>Before you post</SectionLabel>
              <ul className="space-y-2 text-[11px] leading-relaxed text-[#B4A58F]">
                <li>
                  <span className="text-gold-soft">Face clearance.</span> Keep the eyes free — no kicker, badge or price
                  across the deity's face.
                </li>
                <li>
                  <span className="text-gold-soft">Contrast.</span> Devotional paintings are already high-contrast. Use
                  Cinematic and full-bleed compositions only when the source image is clean at the edges.
                </li>
                <li>
                  <span className="text-gold-soft">Language check.</span> Tamil and Hindi counters, not English
                  transliterations, wherever the card is meant for that audience.
                </li>
                <li>
                  <span className="text-gold-soft">Keep the file.</span> Uploaded images live in this browser tab only,
                  and a library entry keeps only a thumbnail when the full PNG is very large. Download the PNG — that is
                  the asset you keep.
                </li>
              </ul>
            </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ live preview ------------------------------ */

const LivePoster: React.FC<{ options: Omit<PosterOptions, "scale"> }> = ({ options }) => {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const scale = Math.min(1, 880 / options.width);
      renderPoster({ ...options, scale })
        .then((canvas) => {
          if (cancelled || !holder.current) return;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          holder.current.replaceChildren(canvas);
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) setReady(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    options.width,
    options.height,
    options.themeKey,
    options.style,
    options.layout,
    options.display,
    options.script,
    options.image,
    options.imageFit,
    options.kicker,
    options.headline,
    options.tamil,
    options.hindi,
    options.subline,
    options.cta,
    options.footer,
    options.showLogo,
  ]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${options.width} / ${options.height}` }}
      aria-busy={!ready}
    >
      <div ref={holder} className="absolute inset-0" />
      {!ready ? (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-[#1D1618] text-[11px] tracking-[0.18em] text-[#A2937D]">
          RENDERING
        </div>
      ) : null}
    </div>
  );
};
