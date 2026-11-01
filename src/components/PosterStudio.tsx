/**
 * Astrosivam · Poster studio (v3)
 *
 * The screen is built around one idea: a poster is a *tuple* of independent
 * decisions, and the studio must let a designer change any one of them without
 * the others moving. The left rail is that tuple — category, composition,
 * illustration, palette, typeface, decoration, motion, format — and the right
 * side is the page itself, painted by the same engine that writes the PNG.
 *
 * Every control writes exactly one field. `applyChange` locks only that field
 * and lets the engine re-resolve everything else, so:
 *
 *   · a palette change never touches the composition,
 *   · a composition change never recolours the card,
 *   · a typeface change never moves the artwork.
 *
 * The composition rail is a set of *real thumbnails* — each one is that
 * composition, rendered, not an icon standing in for it.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Clapperboard,
  Download,
  Grid2x2,
  Image as ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  MonitorPlay,
  Palette as PaletteIcon,
  RotateCcw,
  Shuffle,
  Sparkles,
  Type as TypeIcon,
  X,
} from "lucide-react";
import { DEITIES } from "../data/deities";
import type { DeityKey } from "../types";
import { PALETTE_LIST } from "../design/palettes";
import { ART_BY_ID, CATEGORY_MAP } from "../design/categories";
import { COMPOSITIONS, type CompositionKey, type PosterCopy } from "../design/compositions";
import type { DesignSpec } from "../design/engine";
import { paintDesign, renderDesign } from "../design/render";
import { MOTION_PRESETS, type MotionPresetKey } from "../design/timeline";
import { DISPLAY_FACES } from "../design/type";
import { downloadCanvas, exportFileName, saveBlob, slugify } from "../lib/export";
import { brandPostCaptions } from "../lib/publishCaptions";
import { recordExport } from "../lib/exportLibrary";
import { recordReel, reelFileName, reelSupport, type ReelStage } from "../lib/reel";
import {
  DECORATION_LEVELS,
  FORMATS,
  applyChange,
  artGroups,
  categoryChoices,
  copyFlags,
  createStudioDesign,
  formatById,
  generateAnother,
  selectCategory,
  starterState,
  type DecorationLevel,
  type StudioDesignState,
} from "../lib/studioDesign";
import { clearStudioPreset, peekStudioPreset } from "../lib/studioState";
import { Button, Callout, CopyButton, Field, Input, PageHeader, Panel, PreviewFrame, SectionLabel, Textarea, Toggle, useToast } from "./ui";
import { ExportLibrary } from "./ExportLibrary";
import { PublishCanvasButton } from "./PublishCanvasButton";

const STAGE_LABEL: Record<ReelStage, string> = {
  rendering: "Building the layers",
  recording: "Recording 1080 × 1920",
  encoding: "Finishing the file",
};

const STORAGE_KEY = "astrosivam:studio-v3:v1";

/* ------------------------------- persistence ------------------------------ */

interface StoredDesign {
  category: StudioDesignState["category"];
  artId: string | null;
  composition: CompositionKey | null;
  palette: DesignSpec["palette"] | null;
  face: DesignSpec["face"] | null;
  motion: MotionPresetKey | null;
  decoration: DecorationLevel;
  formatId: string;
  copy: PosterCopy;
  showLogo: boolean;
}

const loadStored = (): StoredDesign | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDesign;
    if (!parsed || typeof parsed !== "object" || !parsed.copy) return null;
    return parsed;
  } catch {
    return null;
  }
};

/** Where the studio opens: a hand-off from another screen, then the last design. */
const readInitial = (): StudioDesignState => {
  const preset = peekStudioPreset();
  const stored = loadStored();
  if (preset?.design) {
    return createStudioDesign({
      category: preset.design.category as StudioDesignState["category"],
      formatId: preset.formatId ?? FORMATS[0].id,
      copy: preset.design.copy,
      artId: preset.design.artId ?? null,
      composition: preset.design.composition as CompositionKey | null,
      palette: preset.design.palette as DesignSpec["palette"] | null,
      face: preset.design.face as DesignSpec["face"] | null,
    });
  }
  if (stored) {
    return createStudioDesign(stored);
  }
  return starterState();
};

const captionFor = (state: StudioDesignState) =>
  [state.copy.headline, state.copy.subline, state.copy.cta].filter(Boolean).join("\n\n");

/* ---------------------------------- screen -------------------------------- */

export const PosterStudio: React.FC = () => {
  const toast = useToast();
  const [store] = useState<StudioDesignState>(readInitial);
  const [design, setDesign] = useState<StudioDesignState>(store);
  const [busy, setBusy] = useState(false);
  const [reel, setReel] = useState<{ progress: number; stage: ReelStage } | null>(null);
  const [stage, setStage] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [libraryKey, setLibraryKey] = useState(0);
  const reelAbort = useRef<AbortController | null>(null);
  const support = useRef(reelSupport()).current;
  const format = formatById(design.formatId);
  const preset = useMemo(
    () => MOTION_PRESETS.find((p) => p.key === design.design.motion) ?? MOTION_PRESETS[0],
    [design.design.motion],
  );

  useEffect(() => {
    clearStudioPreset();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const { design: spec, recent, nonce, ...rest } = design;
        void spec;
        void recent;
        void nonce;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      } catch {
        /* private mode — persistence is a convenience */
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [design]);

  // The live preview walks the same timeline the reel records, so what plays on
  // screen is what comes out of the file.
  useEffect(() => {
    if (!playing) {
      setStage(0);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = () => {
      const progress = ((performance.now() - started) / (preset.seconds * 1000)) % 1;
      setStage(progress);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, preset.seconds]);

  const change = (patch: Partial<StudioDesignState>) => setDesign((current) => applyChange(current, patch));
  const setCopy = (key: keyof PosterCopy, value: string) =>
    change({ copy: { ...design.copy, [key]: value } });

  const another = () => {
    setDesign((current) => generateAnother(current));
    toast("New structure — the engine avoids your last four.");
  };

  const download = async () => {
    setBusy(true);
    try {
      const canvas = await renderDesign({
        spec: design.design,
        copy: design.copy,
        width: format.width,
        height: format.height,
        scale: 1,
        showLogo: design.showLogo,
        detail: design.decoration,
      });
      const name = `${exportFileName(["astrosivam", "poster", slugify(design.copy.headline).slice(0, 40), design.formatId])}_${format.width}x${format.height}.png`;
      const saved = await downloadCanvas(canvas, name, { formatId: design.formatId, caption: captionFor(design) });
      if (saved) setLibraryKey((key) => key + 1);
      toast(saved ? `Downloaded ${format.width} × ${format.height} — kept in your exports` : `Downloaded ${format.width} × ${format.height} PNG`);
    } catch {
      toast("Export failed — try another format.", "error");
    } finally {
      setBusy(false);
    }
  };

  const record = async () => {
    if (reel) return;
    const controller = new AbortController();
    reelAbort.current = controller;
    setReel({ progress: 0, stage: "rendering" });
    try {
      const result = await recordReel({
        poster: {
          width: format.width,
          height: format.height,
          themeKey: "saffron",
          style: "gopuram",
          layout: "portrait-arch",
          template: "mandapam",
          display: "cinzel",
          script: "serif",
          image: null,
          imageFit: "arch",
          kicker: design.copy.kicker ?? "",
          headline: design.copy.headline ?? "",
          tamil: "",
          hindi: "",
          subline: design.copy.subline ?? "",
          cta: design.copy.cta ?? "",
          footer: design.copy.footer ?? "",
          showLogo: design.showLogo,
          design: design.design,
        },
        motionPreset: design.design.motion,
        signal: controller.signal,
        onProgress: (progress, next) => setReel({ progress, stage: next }),
      });
      const name = reelFileName(design.copy.headline || "astrosivam-reel");
      saveBlob(result.blob, name);
      try {
        const saved = await recordExport({
          canvas: result.thumbnailCanvas,
          blob: result.blob,
          name,
          formatId: "reel",
          width: result.thumbnailCanvas.width,
          height: result.thumbnailCanvas.height,
          caption: captionFor(design),
        });
        if (saved) {
          setLibraryKey((key) => key + 1);
          toast("Reel saved and kept in your exports.");
        }
      } catch {
        /* the download still stands */
      }
      toast(`Recorded ${Math.round(result.durationMs / 1000)} s · ${result.frames} frames · ${(result.blob.size / 1048576).toFixed(1)} MB`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Video export failed.", "error");
    } finally {
      reelAbort.current = null;
      setReel(null);
    }
  };

  const flags = copyFlags(design.copy);
  const activeComposition = COMPOSITIONS.find((c) => c.key === design.design.composition);
  const activeCategory = CATEGORY_MAP[design.category];
  const activeArt = design.artId ? ART_BY_ID[design.artId] : null;

  return (
    <div className="studio">
      <PageHeader
        eyebrow="Poster studio · design system v3"
        title={
          <>
            Ten briefs.{" "}
            <span className="gold-text">Fifteen page structures.</span> One design system.
          </>
        }
        description="Pick a brief, then change exactly what you want to change. Composition, illustration, palette, typeface, decoration, motion and format are eight independent locks — moving one never moves the others. Every poster is painted by the same engine that writes the export, so the preview on screen is the file you download."
        actions={
          <>
            <Button variant="gold" onClick={another} icon={<Shuffle className="h-3.5 w-3.5" />}>
              Generate another design
            </Button>
            <PublishCanvasButton
              render={() =>
                renderDesign({
                  spec: design.design,
                  copy: design.copy,
                  width: format.width,
                  height: format.height,
                  scale: 1,
                  showLogo: design.showLogo,
                  detail: design.decoration,
                })
              }
              filename={`${exportFileName(["astrosivam", "poster", slugify(design.copy.headline).slice(0, 40), design.formatId])}_${format.width}x${format.height}.png`}
              captions={brandPostCaptions(captionFor(design))}
              sourceLabel="Studio poster · feed image"
              disabled={busy || Boolean(reel)}
              label="Publish"
            />
            <Button variant="ghost" onClick={download} loading={busy} icon={<Download className="h-3.5 w-3.5" />}>
              PNG
            </Button>
            <Button
              variant="ghost"
              onClick={record}
              disabled={Boolean(reel) || !support.ok}
              icon={reel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
              title={support.ok ? `Records ${preset.seconds} s of ${preset.name} at 1080 × 1920` : support.reason}
            >
              {reel ? "Recording…" : "Reel"}
            </Button>
          </>
        }
      />

      {reel ? (
        <div className="card mb-4 p-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-cream">
              <Clapperboard className="h-3.5 w-3.5 text-gold" />
              {STAGE_LABEL[reel.stage]}
            </span>
            <span className="font-display text-[13px] text-gold-soft">{Math.round(reel.progress * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={Math.round(reel.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Reel recording progress">
            <div className="h-full rounded-full bg-gold transition-[width] duration-150" style={{ width: `${Math.max(2, reel.progress * 100)}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] leading-relaxed text-[#B4A58F]">
              Each frame is a full re-paint through the design system, so recording runs in real time
              ({preset.seconds} s). Keep this tab visible — the file downloads when it finishes.
            </p>
            <button type="button" className="btn btn-quiet" onClick={() => reelAbort.current?.abort()}>
              <X className="h-3.5 w-3.5" /> Stop
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ------------------------------- canvas ------------------------------- */}
        <div className="space-y-4">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <span className="inline-flex items-center gap-2 font-display text-[12px] tracking-[0.02em] text-cream">
                <span className="h-1.5 w-1.5 rotate-45 bg-gold" aria-hidden="true" />
                {activeComposition?.name ?? "Composition"}
                <span className="text-[10px] font-normal tracking-[0.1em] text-[#A2937D]">
                  · {design.design.composition}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`chip ${playing ? "chip-gold" : ""}`}
                  onClick={() => setPlaying((value) => !value)}
                  aria-pressed={playing}
                  title={`${preset.name} — ${preset.note}`}
                >
                  <MonitorPlay className="mr-1 inline h-3 w-3" />
                  {playing ? "Stop motion" : "Play motion"}
                </button>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#A2937D]">
                  {format.width} × {format.height}
                </span>
              </div>
            </div>
            <div className="checker flex justify-center p-4 sm:p-6">
              <div className="w-full max-w-[520px]">
                <PreviewFrame label="Poster preview" meta={`${format.width} × ${format.height} px`}>
                  <LivePoster state={design} motion={playing ? stage : null} />
                </PreviewFrame>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
              <span className="text-[10.5px] text-[#A2937D]">
                {activeCategory?.name} · {activeComposition?.structure ?? "—"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">
                {preset.name}
              </span>
            </div>
          </Panel>

          {/* --------------------------- composition rail -------------------------- */}
          <Panel>
            <SectionLabel
              right={
                <button type="button" className="text-[10px] uppercase tracking-[0.14em] text-gold-soft" onClick={() => setShowGallery((v) => !v)}>
                  <Grid2x2 className="mr-1 inline h-3 w-3" />
                  {showGallery ? "Hide all" : "All structures"}
                </button>
              }
            >
              Composition
            </SectionLabel>
            <p className="mb-2 text-[10.5px] leading-relaxed text-[#A2937D]">
              {COMPOSITIONS.length} families. Each thumbnail is that composition, rendered — not an icon.
              Picking one keeps your palette, typeface and artwork.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="Composition">
              {COMPOSITIONS.map((composition, index) => {
                const active = design.design.composition === composition.key;
                // The rail shows the first ten families; "All structures" shows
                // every one. The active card is always visible either way.
                if (!showGallery && index > 9 && !active) return null;
                return (
                  <button
                    key={composition.key}
                    type="button"
                    onClick={() => change({ composition: composition.key })}
                    aria-pressed={active}
                    title={`${composition.name} — ${composition.note}`}
                    className={`choice overflow-hidden p-0 text-left ${active ? "choice-active" : ""}`}
                  >
                    <Thumb spec={design.design} composition={composition.key} copy={design.copy} detail={design.decoration} />
                    <span className={`block truncate px-1.5 py-1 text-[9px] ${active ? "text-cream" : "text-cream/75"}`}>
                      {composition.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <SectionLabel>Copy · English only</SectionLabel>
              <Input label="Kicker" value={design.copy.kicker ?? ""} onChange={(e) => setCopy("kicker", e.target.value)} maxLength={48} />
              <Textarea label="Headline" rows={3} value={design.copy.headline} onChange={(e) => setCopy("headline", e.target.value)} maxLength={140} hint={`${design.copy.headline.length} / 140 characters`} />
              <Textarea label="Subline" rows={2} value={design.copy.subline ?? ""} onChange={(e) => setCopy("subline", e.target.value)} maxLength={180} />
            </Panel>
            <Panel>
              <SectionLabel right={<CopyButton text={captionFor(design)} label="Copy" compact />}>Contact &amp; system</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Call to action" value={design.copy.cta ?? ""} onChange={(e) => setCopy("cta", e.target.value)} maxLength={48} />
                <Input label="Contact line" value={design.copy.footer ?? ""} onChange={(e) => setCopy("footer", e.target.value)} maxLength={72} />
              </div>
              <div className="mt-3">
                <Toggle checked={design.showLogo} onChange={(checked) => change({ showLogo: checked })} label="Show the Astro Sivam mark" hint="Always inside the safe area." />
              </div>
              {flags.length ? (
                <Callout tone="warn">
                  {flags.map((flag) => flag.label).join(", ")} contain{flags.length === 1 ? "s" : ""} non-English
                  characters. The studio paints English only, so the renderer drops those runs — replace
                  them with English (transliterated Sanskrit terms such as <em>jathagam</em> are fine).
                </Callout>
              ) : (
                <p className="mt-3 text-[10px] leading-relaxed text-[#A2937D]">
                  Sanskrit and astrology terms are welcome in English transliteration — jathagam, porutham,
                  muhurtham, nakshatra. Tamil and Hindi script cannot be painted: this suite is English-only so
                  no card ever ships with lettering it cannot render.
                </p>
              )}
            </Panel>
          </div>
        </div>

        {/* ------------------------------ controls ------------------------------ */}
        <div className="space-y-4">
          <Panel>
            <SectionLabel>Brief</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {categoryChoices.map((category) => {
                const active = design.category === category.key;
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setDesign((current) => selectCategory(current, category.key))}
                    aria-pressed={active}
                    title={category.direction}
                    className={`choice px-2 py-2 text-left ${active ? "choice-active" : ""}`}
                  >
                    <span className={`block text-[10.5px] font-medium ${active ? "text-cream" : "text-cream/85"}`}>{category.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[#A2937D]">{activeCategory?.direction}</p>
          </Panel>

          <Panel>
            <SectionLabel
              right={
                design.artId ? (
                  <button type="button" className="text-[9.5px] uppercase tracking-[0.14em] text-gold-soft" onClick={() => change({ artId: null })}>
                    <LockOpen className="mr-1 inline h-2.5 w-2.5" /> Follow brief
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-[#A2937D]">
                    <Lock className="h-2.5 w-2.5" /> Brief
                  </span>
                )
              }
            >
              Illustration
            </SectionLabel>
            <div className="space-y-2">
              {artGroups.map((group) => (
                <div key={group.group}>
                  <div className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#A2937D]">{group.group}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => change({ artId: item.id })}
                        aria-pressed={activeArt?.id === item.id}
                        className={`chip ${activeArt?.id === item.id ? "chip-gold" : ""}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<PaletteIcon className="h-3.5 w-3.5 text-gold" />}>Palette</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE_LIST.map((palette) => {
                const active = design.design.palette === palette.key;
                return (
                  <button
                    key={palette.key}
                    type="button"
                    onClick={() => change({ palette: palette.key })}
                    aria-pressed={active}
                    title={palette.note}
                    className={`choice flex items-center gap-2 px-2 py-1.5 text-left ${active ? "choice-active" : ""}`}
                  >
                    <span className="flex shrink-0 overflow-hidden rounded">
                      {palette.swatch.map((color) => (
                        <span key={color} className="h-5 w-1.5" style={{ background: color }} />
                      ))}
                    </span>
                    <span className="min-w-0 truncate text-[10px] text-cream">{palette.name}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<TypeIcon className="h-3.5 w-3.5 text-gold" />}>Typeface</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {DISPLAY_FACES.map((face) => (
                <button
                  key={face.key}
                  type="button"
                  onClick={() => change({ face: face.key })}
                  aria-pressed={design.design.face === face.key}
                  className={`choice px-2 py-1.5 text-left ${design.design.face === face.key ? "choice-active" : ""}`}
                >
                  <span className="block text-[11px] text-cream" style={{ fontFamily: face.stack }}>
                    {face.label}
                  </span>
                  <span className="block truncate text-[9px] text-[#A2937D]">{face.note}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<Sparkles className="h-3.5 w-3.5 text-gold" />}>Decoration</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {DECORATION_LEVELS.map((level) => (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => change({ decoration: level.key })}
                  aria-pressed={design.decoration === level.key}
                  title={level.note}
                  className={`chip ${design.decoration === level.key ? "chip-gold" : ""}`}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[#A2937D]">
              {DECORATION_LEVELS.find((l) => l.key === design.decoration)?.note}
            </p>
          </Panel>

          <Panel>
            <SectionLabel right={<Clapperboard className="h-3.5 w-3.5 text-gold" />}>Motion</SectionLabel>
            <div className="space-y-1">
              {MOTION_PRESETS.map((motion) => (
                <button
                  key={motion.key}
                  type="button"
                  onClick={() => change({ motion: motion.key })}
                  aria-pressed={design.design.motion === motion.key}
                  className={`choice w-full px-2 py-1.5 text-left ${design.design.motion === motion.key ? "choice-active" : ""}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[10.5px] text-cream">{motion.name}</span>
                    <span className="text-[8.5px] uppercase tracking-[0.12em] text-[#A2937D]">{motion.seconds}s</span>
                  </span>
                  <span className="block truncate text-[9px] text-[#A2937D]">{motion.note}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>Format</SectionLabel>
            <div className="space-y-1">
              {FORMATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => change({ formatId: item.id })}
                  aria-pressed={design.formatId === item.id}
                  className={`choice w-full px-2 py-1.5 text-left ${design.formatId === item.id ? "choice-active" : ""}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[10.5px] text-cream">{item.label}</span>
                    <span className="text-[8.5px] uppercase tracking-[0.12em] text-[#A2937D]">
                      {item.note} · {item.width}×{item.height}
                    </span>
                  </span>
                  <span className="block truncate text-[9px] text-[#A2937D]">{item.use}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<ImageIcon className="h-3.5 w-3.5 text-gold" />}>Deity subject</SectionLabel>
            <p className="mb-2 text-[10px] leading-relaxed text-[#A2937D]">
              Changes the emblem&rsquo;s symbol only. The composition, palette and type stay exactly where they are.
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {DEITIES.slice(0, 10).map((deity) => (
                <button
                  key={deity.key}
                  type="button"
                  onClick={() => change({ artId: deityEmblemId(deity.key) })}
                  aria-pressed={design.design.art.subject === deity.key}
                  title={deity.name}
                  className={`choice px-1 py-1 text-center ${
                    design.design.art.subject === deity.key ? "choice-active" : ""
                  }`}
                >
                  <span className="block truncate text-[9px] text-cream/85">{deity.name}</span>
                </button>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4">
            <ExportLibrary refreshKey={libraryKey} />
            <Panel>
              <SectionLabel>Before you post</SectionLabel>
              <ul className="space-y-2 text-[11px] leading-relaxed text-[#B4A58F]">
                <li>
                  <span className="text-gold-soft">Preview equals export.</span> The canvas above is painted by the same
                  code that writes the PNG and the reel, at the same proportions.
                </li>
                <li>
                  <span className="text-gold-soft">Print.</span> A4 exports at 300 dpi. The illustration is vector-drawn,
                  so it stays sharp at any size — no source image to run out of resolution.
                </li>
                <li>
                  <span className="text-gold-soft">Motion.</span> Play motion walks the exact timeline the recorder
                  captures, so nothing you see differs from the file.
                </li>
                <li>
                  <span className="text-gold-soft">English only.</span> Any Tamil or Hindi you paste is flagged and
                  dropped rather than painted as boxes.
                </li>
              </ul>
            </Panel>
            <Button variant="quiet" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setDesign(starterState(design.formatId))}>
              Reset to the starter design
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** The ArtChoice id for a deity key, so the subject rail writes the art lock. */
function deityEmblemId(key: DeityKey): string {
  const entry = Object.values(ART_BY_ID).find((art) => art.plan.kind === "deity-emblem" && art.plan.subject === key);
  return entry?.id ?? "ganesha";
}

/* ------------------------------- live canvas ------------------------------ */

/**
 * The preview. Renders at a fraction of the export size on a device-pixel
 * density multiplier, and — when `motion` is a number — paints one animation
 * frame instead of the still, using the same `paintDesign` the reel calls.
 */
const LivePoster: React.FC<{ state: StudioDesignState; motion: number | null }> = ({ state, motion }) => {
  const holder = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const format = formatById(state.formatId);
  const preset = MOTION_PRESETS.find((p) => p.key === state.design.motion) ?? MOTION_PRESETS[0];
  const { design, copy, showLogo, decoration } = state;

  useEffect(() => {
    let cancelled = false;
    // Static frames are debounced; animation frames ride the rAF loop.
    const paint = async () => {
      const scale = Math.min(1, 640 / format.width);
      if (motion === null) {
        const canvas = await renderDesign({
          spec: design,
          copy,
          width: format.width,
          height: format.height,
          scale,
          showLogo,
          detail: decoration,
        });
        if (cancelled || !holder.current) return;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        holder.current.replaceChildren(canvas);
        setReady(true);
        return;
      }
      if (!canvasRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(format.width * scale);
        canvas.height = Math.round(format.height * scale);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        canvasRef.current = canvas;
        holder.current?.replaceChildren(canvas);
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      paintDesign(ctx, {
        spec: design,
        copy,
        width: format.width,
        height: format.height,
        scale,
        showLogo,
        detail: decoration,
        motion: preset.state(motion),
      });
      setReady(true);
    };
    if (motion === null) {
      const timer = window.setTimeout(paint, 160);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    void paint();
    return () => {
      cancelled = true;
    };
  }, [design, copy, showLogo, decoration, format.width, format.height, motion, preset]);

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${format.width} / ${format.height}` }} aria-busy={!ready}>
      <div ref={holder} className="absolute inset-0" />
      {!ready ? (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-[#1D1618] text-[11px] tracking-[0.18em] text-[#A2937D]">
          RENDERING
        </div>
      ) : null}
    </div>
  );
};

/* -------------------------------- thumbnails ------------------------------ */

const thumbCache = new Map<string, string>();

/**
 * A real composition thumbnail. Rendered once per (composition, palette, face,
 * decoration) at 190 px and cached as a data URL — cheap enough to show fifteen
 * of them, honest enough to be the actual layout rather than an icon.
 */
const Thumb: React.FC<{
  spec: DesignSpec;
  composition: CompositionKey;
  copy: PosterCopy;
  detail: DecorationLevel;
}> = ({ spec, composition, copy, detail }) => {
  const key = `${composition}|${spec.palette}|${spec.face}|${detail}|${spec.seed % 97}|${copy.headline.length}|${copy.kicker?.length ?? 0}`;
  const [src, setSrc] = useState<string | null>(thumbCache.get(key) ?? null);

  useEffect(() => {
    const cached = thumbCache.get(key);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const canvas = await renderDesign({
          spec: { ...spec, composition },
          copy,
          width: 1080,
          height: 1350,
          scale: 190 / 1080,
          showLogo: false,
          detail,
        });
        const url = canvas.toDataURL("image/jpeg", 0.72);
        thumbCache.set(key, url);
        if (!cancelled) setSrc(url);
      } catch {
        /* a failed thumbnail is a blank tile, never a broken poster */
      }
    }, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, spec, composition, copy, detail]);

  return (
    <span className="relative block w-full overflow-hidden bg-[#1D1618]" style={{ aspectRatio: "4 / 5" }}>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 animate-pulse bg-[#241B1D]" />
      )}
    </span>
  );
};

export default PosterStudio;
