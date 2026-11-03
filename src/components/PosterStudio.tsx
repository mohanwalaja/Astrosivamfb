import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clapperboard, Download, Image as ImageIcon, Layers, Loader2, Pause, Play, RotateCcw, Shuffle, Sparkles, Upload, X } from "lucide-react";
import { HERITAGE_STYLES, MODERN_STYLES, STYLES } from "../data/brand";
import { DEITIES, DEITY_MAP, DEITY_USAGE_NOTE } from "../data/deities";
import type { DeityKey, DisplayFontKey, PosterLayout, PosterTemplate, ThemeKey } from "../types";
import { TEMPLATES, LEGACY_TEMPLATES, layoutForTemplate, templateForLayout } from "../data/posterTemplates";
import { BRIEF_MAP, COMPOSITIONS, COMPOSITION_MAP, DESIGN_BRIEFS, STUDIO_PALETTES, getOccasion, isComposition, resolveCategory, type CompositionKey, type DesignCategory } from "../data/designBriefs";
import { DISPLAY_FONTS, renderPoster, type PosterOptions } from "../lib/poster";
import { downloadCanvas, exportFileName, saveBlob, slugify, releaseCanvas } from "../lib/export";
import { brandPostCaptions } from "../lib/publishCaptions";
import { fileToImageSource } from "../lib/imageUpload";
import { Button, Callout, Field, Input, PageHeader, Panel, PreviewFrame, SectionLabel, Select, Textarea, Toggle, useToast } from "./ui";
import { ExportLibrary } from "./ExportLibrary";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { recordReel, reelFileName, reelSupport, type ReelStage } from "../lib/reel";
import { recordExport } from "../lib/exportLibrary";
import { clearStudioPreset, loadPreset, peekStudioPreset, savePreset, migrateState, type PosterState } from "../lib/studioState";
import { appendHistory, loadHistory, newSeed, saveHistory, selectDesign } from "../lib/designSelector";
import { englishCopy, validatePosterCopy } from "../lib/englishCopy";
import { renderCompositionLayers, type CompositionLayers } from "../lib/compositionRender";
import { paintMotionFrame, MOTION_SECONDS } from "../lib/motion";
import { TemplateGlyph } from "./TemplateGlyph";
import { useBrandPlacementVersion } from "../lib/brandPlacement";
import { LAYOUT_LABEL, designsFor, getDesign } from "../data/library";

const FORMATS = [
  { id: "ig-post", label: "Portrait", width: 1080, height: 1350 },
  { id: "ig-square", label: "Square", width: 1080, height: 1080 },
  { id: "fb-post", label: "FB portrait", width: 1200, height: 1500 },
  { id: "landscape", label: "Landscape", width: 1200, height: 628 },
  { id: "story", label: "Story / Reel", width: 1080, height: 1920 },
  { id: "print", label: "A4 print", width: 2480, height: 3508 },
];
const startBrief = BRIEF_MAP.birth;
const startOccasion = startBrief.occasions[0];
const DEFAULT: PosterState = {
  width: 1080, height: 1350, themeKey: startBrief.theme, style: startBrief.style, layout: "split", template: "editorial",
  designId: "birth-traditional-jathagam-sanctum",
  display: startBrief.display, script: "serif", image: startBrief.image, imageIsLibrary: true, imageFit: "full",
  category: "birth", occasion: startOccasion.key, serviceTitle: startOccasion.copy.serviceTitle,
  kicker: startOccasion.copy.kicker, headline: startOccasion.copy.headline, tamil: "", hindi: "",
  subline: startOccasion.copy.subline, facts: startOccasion.copy.facts, cta: startOccasion.copy.cta,
  footer: "astrosivam.com", showLogo: true, seed: 17, useGlobalBrandPlacement: false,
};
interface StudioInit { state: PosterState; formatId: string; deityKey: DeityKey | null; note?: string }
const readInitial = (): StudioInit => {
  const preset = peekStudioPreset(), saved = loadPreset();
  const formatId = preset?.formatId ?? saved?.formatId ?? "ig-post";
  const format = FORMATS.find((item) => item.id === formatId) ?? FORMATS[0];
  const state = migrateState({ ...DEFAULT, ...(saved?.state ?? {}), ...(preset?.state ?? {}), width: format.width, height: format.height });
  state.category = resolveCategory(state.category);
  return { state, formatId: format.id, deityKey: preset ? (preset.deityKey ?? null) : (saved?.deityKey ?? null), note: preset?.note };
};
const studioCaption = (state: PosterState) => [state.headline, state.subline, state.cta].map((v) => englishCopy({ headline: v }).headline).filter(Boolean).join("\n\n");
const STAGE_LABEL: Record<ReelStage, string> = { rendering: "Preparing motion layers", recording: "Recording layered animation", encoding: "Finishing the video" };
type Tab = "content" | "design" | "artwork" | "export";

export const PosterStudio: React.FC<{ onNavigate?: (id: string) => void }> = ({ onNavigate }) => {
  const toast = useToast();
  const [initial] = useState(readInitial);
  const [state, setState] = useState<PosterState>(initial.state);
  const [formatId, setFormatId] = useState(initial.formatId);
  const [deityKey, setDeityKey] = useState<DeityKey | null>(initial.deityKey);
  const [tab, setTab] = useState<Tab>("content");
  const [mode, setMode] = useState<"static" | "motion">("static");
  const [playing, setPlaying] = useState(true);
  const [busy, setBusy] = useState(false);
  const [libraryKey, setLibraryKey] = useState(0);
  const [reason, setReason] = useState("A category-aware composition, ready to edit.");
  const [reel, setReel] = useState<{ progress: number; stage: ReelStage } | null>(null);
  const reelAbort = useRef<AbortController | null>(null);
  const announced = useRef(false);
  const support = useRef(reelSupport()).current;
  const fileInput = useRef<HTMLInputElement>(null);
  const brandVersion = useBrandPlacementVersion();
  const category = resolveCategory(state.category);
  const brief = BRIEF_MAP[category];
  const occasion = getOccasion(category, state.occasion);
  const design = getDesign(state.designId);
  const activeComposition = design ? null : isComposition(state.template) ? state.template : null;
  const activeTemplate = TEMPLATES.find((item) => item.key === state.template) ?? TEMPLATES[0];
  const errors = validatePosterCopy(state);
  const canExport = errors.length === 0 && !busy && !reel;

  useEffect(() => { clearStudioPreset(); if (!initial.note || announced.current) return; announced.current = true; toast(initial.note); }, [initial.note, toast]);
  useEffect(() => { const timer = window.setTimeout(() => savePreset({ state, formatId, deityKey }), 350); return () => window.clearTimeout(timer); }, [state, formatId, deityKey]);
  useEffect(() => () => reelAbort.current?.abort(), []);

  const set = <K extends keyof PosterState>(key: K, value: PosterState[K]) => setState((current) => ({ ...current, [key]: value }));
  const chooseFormat = (id: string) => { const format = FORMATS.find((item) => item.id === id)!; setFormatId(id); setState((current) => ({ ...current, width: format.width, height: format.height })); };
  const selectTemplate = (key: PosterTemplate) => setState((current) => ({ ...current, template: key, layout: layoutForTemplate(key), designId: undefined }));

  const applyBrief = (nextCategory: DesignCategory, occasionKey?: string) => {
    const nextBrief = BRIEF_MAP[nextCategory];
    const nextOccasion = getOccasion(nextCategory, occasionKey);
    const selection = selectDesign({ category: nextCategory, occasion: nextOccasion.key, width: state.width, height: state.height, headline: nextOccasion.copy.headline, subline: nextOccasion.copy.subline, seed: newSeed() }, loadHistory());
    saveHistory(appendHistory(loadHistory(), selection, nextCategory));
    setDeityKey(null);
    // Moving service keeps the register and picks a design drawn for the new brief.
    const register = getDesign(state.designId)?.register ?? "traditional";
    const pool = designsFor(nextCategory, register);
    const design = pool[selection.seed % pool.length];
    setReason(`${design.name} — ${LAYOUT_LABEL[design.layout]}.`);
    setDeityKey(null);
    setState((current) => ({ ...current, category: nextCategory, occasion: nextOccasion.key, themeKey: design.theme, style: nextBrief.style, display: nextBrief.display,
      image: design.image, imageIsLibrary: true, template: selection.composition, layout: layoutForTemplate(selection.composition), seed: selection.seed,
      designId: design.id,
      kicker: design.copy.kicker, serviceTitle: design.copy.serviceTitle, headline: design.copy.headline, subline: design.copy.subline,
      cta: design.copy.cta, facts: design.copy.facts, tamil: "", hindi: "" }));
  };
  const generate = () => {
    const currentDesign = getDesign(state.designId);
    if (currentDesign) {
      const pool = designsFor(currentDesign.category, currentDesign.register).filter((item) => item.id !== currentDesign.id);
      const next = pool[Math.floor(Math.random() * pool.length)];
      setState((current) => ({ ...current, designId: next.id, seed: next.number }));
      setReason(`${next.name} — ${LAYOUT_LABEL[next.layout]}. Your words are kept.`);
      setMode("static");
      toast(`${next.name} — your words and artwork are kept.`);
      return;
    }
    const selection = selectDesign({ category, occasion: occasion.key, width: state.width, height: state.height, headline: state.headline, subline: state.subline, hasArtwork: Boolean(state.image), seed: newSeed() }, loadHistory());
    saveHistory(appendHistory(loadHistory(), selection, category));
    setState((current) => ({ ...current, template: selection.composition, layout: layoutForTemplate(selection.composition), seed: selection.seed }));
    setReason(selection.reason); setMode("static");
    toast(`${COMPOSITION_MAP[selection.composition].name} — your copy and artwork are kept.`);
  };
  const useDeity = (key: DeityKey) => {
    const deity = DEITY_MAP[key]; setDeityKey(key);
    const nextCategory: DesignCategory = key === "murugan" ? "murugan" : "festival";
    setState((current) => ({ ...current, category: nextCategory, occasion: key === "murugan" ? "devotion" : "deepavali", image: deity.file, imageIsLibrary: true,
      serviceTitle: deity.name, kicker: "A moment of devotion", headline: deity.blessing, subline: deity.epithet, tamil: "", hindi: "",
      template: current.template && isComposition(current.template) ? current.template : "devotional" }));
  };
  const clearImage = () => { setDeityKey(null); set("image", null); };
  const onUpload = async (file?: File | null) => {
    if (!file) return;
    try { const src = await fileToImageSource(file); setDeityKey(null); setState((current) => ({ ...current, image: src, imageIsLibrary: false })); toast("Image added — it stays in this browser only."); }
    catch (error) { toast(error instanceof Error ? error.message : "That file could not be read.", "error"); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  };
  const download = async () => {
    setBusy(true);
    try {
      const canvas = await renderPoster({ ...state, scale: 1 });
      const name = `${exportFileName(["astrosivam", "poster", slugify(state.headline).slice(0, 40), formatId])}_${state.width}x${state.height}.png`;
      const saved = await downloadCanvas(canvas, name, { formatId, caption: studioCaption(state) });
      if (saved) setLibraryKey((key) => key + 1);
      toast(`Downloaded ${state.width} × ${state.height} PNG`);
    } catch (error) { toast(error instanceof Error ? error.message : "Export failed — try another image or shorter copy.", "error"); }
    finally { setBusy(false); }
  };
  const record = async () => {
    if (reel || !activeComposition || design) return;
    const controller = new AbortController(); reelAbort.current = controller; setReel({ progress: 0, stage: "rendering" });
    const width = formatId === "print" ? 1080 : state.width, height = formatId === "print" ? 1350 : state.height;
    try {
      const result = await recordReel({ poster: state, width, height, signal: controller.signal, onProgress: (progress, stage) => setReel({ progress, stage }) });
      const name = reelFileName(state.headline || "astrosivam-motion", new Date(), width, height);
      saveBlob(result.blob, name);
      try { const saved = await recordExport({ canvas: result.thumbnailCanvas, blob: result.blob, name, formatId: "reel", width, height, caption: studioCaption(state) }); if (saved) setLibraryKey((key) => key + 1); } catch { /* download already succeeded */ }
      toast(`Recorded ${Math.round(result.durationMs / 1000)} s · ${result.frames} frames · ${(result.blob.size / 1048576).toFixed(1)} MB`);
    } catch (error) { toast(error instanceof Error ? error.message : "Video export failed.", "error"); }
    finally { reelAbort.current = null; setReel(null); }
  };
  const reset = () => { setState(DEFAULT); setFormatId("ig-post"); setDeityKey(null); setMode("static"); setReason("Reset to the starting brief."); toast("Reset to the starting brief."); };
  const filename = `${exportFileName(["astrosivam", "poster", slugify(state.headline).slice(0, 40), formatId])}_${state.width}x${state.height}.png`;
  const feedSafe = state.width / state.height >= .8 && state.width / state.height <= 1.91;

  return (
    <div className="poster-studio-v3">
      <PageHeader eyebrow="Astrosivam · Social design studio" title={<>One brief. <span className="gold-text">A different point of view.</span></>} description="A library of 150 curated designs — seventy-five traditional, seventy-five modern — plus layered motion for the legacy systems. English-only posters, planned for the way Facebook and Instagram actually crop."
        actions={<><Button variant="gold" icon={<Shuffle className="h-4 w-4" />} onClick={generate} disabled={Boolean(reel)}>Generate a new design</Button><Button variant="quiet" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}>Reset</Button></>}
        meta={<><span className="chip chip-gold">English only</span><span className="chip">150 designs</span><span className="chip">Static + layered motion</span></>}
      />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 scroll-thin" role="group" aria-label="Poster category">
        {DESIGN_BRIEFS.map((item) => <button key={item.key} type="button" onClick={() => applyBrief(item.key)} aria-pressed={category === item.key} className={`choice shrink-0 px-4 py-3 text-left ${category === item.key ? "choice-active" : ""}`}><span className="block text-[12px] font-semibold text-cream">{item.name}</span><span className="mt-0.5 block text-[10px] text-[#A2937D]">{item.occasions.length} creative briefs</span></button>)}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4 lg:sticky lg:top-5">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rotate-45 bg-gold" /><span className="font-display text-[13px] text-cream">{design ? design.name : activeTemplate.name}</span></div>
              <div className="flex items-center gap-1 rounded-lg border border-line p-1" role="group" aria-label="Preview mode">
                <button type="button" className={`px-3 py-1.5 text-[11px] ${mode === "static" ? "rounded-md bg-gold/15 text-gold-soft" : "text-[#A2937D]"}`} aria-pressed={mode === "static"} onClick={() => setMode("static")}>Static</button>
                <button type="button" className={`px-3 py-1.5 text-[11px] ${mode === "motion" ? "rounded-md bg-gold/15 text-gold-soft" : "text-[#A2937D]"}`} aria-pressed={mode === "motion"} onClick={() => { setMode("motion"); setPlaying(true); }} disabled={!activeComposition} title={design ? "Library designs export as stills." : undefined}>Motion</button>
              </div>
            </div>
            <div className="checker flex justify-center p-4 sm:p-7">
              <PreviewFrame className="w-full max-w-[560px]" label={mode === "motion" ? "Layered motion preview" : "Live poster preview"} meta={`${state.width} × ${state.height} px`}>
                <LivePoster key={`${state.template}-${mode}-${brandVersion}`} options={state} mode={mode} playing={playing} />
              </PreviewFrame>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="max-w-[46ch] text-[11px] leading-relaxed text-[#B4A58F]">{reason}</p>
              {mode === "motion" ? <Button size="sm" variant="ghost" icon={playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</Button> : <span className="inline-flex items-center gap-1.5 text-[10px] text-jade"><Check className="h-3.5 w-3.5" /> Safe-area planned</span>}
            </div>
          </Panel>
          {errors.length ? <Callout tone="warn" title="Copy needs attention">{errors.join(" ")}</Callout> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel className="!p-4"><div className="eyebrow mb-1">Art direction</div><p className="text-[11px] leading-relaxed text-[#B4A58F]">{brief.direction}</p></Panel>
            <Panel className="!p-4"><div className="eyebrow mb-1">Design</div><p className="text-[11px] leading-relaxed text-[#B4A58F]">{design ? `${LAYOUT_LABEL[design.layout]} · design ${design.number} of 150 · ${design.register}` : activeComposition ? COMPOSITION_MAP[activeComposition].structure : "Legacy composition."}</p></Panel>
            <Panel className="!p-4"><div className="eyebrow mb-1">Export</div><p className="text-[11px] leading-relaxed text-[#B4A58F]">Full-resolution PNG. 15-second video in your selected format, MP4 where the browser supports it.</p></Panel>
          </div>
        </div>

        <div className="space-y-4">
          <div className="tab-seg max-w-full overflow-x-auto scroll-thin" role="group" aria-label="Studio controls">
            {(["content", "design", "artwork", "export"] as Tab[]).map((item) => <button key={item} type="button" data-active={tab === item} aria-pressed={tab === item} onClick={() => setTab(item)} className="capitalize">{item}</button>)}
          </div>

          {tab === "content" ? <>
            <Panel>
              <SectionLabel eyebrow={brief.name}>The brief</SectionLabel>
              <Select label="Occasion" value={occasion.key} onChange={(event) => applyBrief(category, event.target.value)}>{brief.occasions.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</Select>
              <div className="mt-4 space-y-4">
                <Input label="Service title" value={state.serviceTitle ?? ""} onChange={(event) => set("serviceTitle", event.target.value)} maxLength={48} />
                <Input label="Kicker" value={state.kicker} onChange={(event) => set("kicker", event.target.value)} maxLength={56} />
                <Textarea label="Headline" rows={3} value={state.headline} onChange={(event) => set("headline", event.target.value)} maxLength={100} hint={`${state.headline.length} / 100 · English only`} />
                <Textarea label="Supporting text" rows={3} value={state.subline} onChange={(event) => set("subline", event.target.value)} maxLength={180} hint={`${state.subline.length} / 180`} />
                <Input label="Call to action" value={state.cta} onChange={(event) => set("cta", event.target.value)} maxLength={42} />
                <Input label="Footer" value={state.footer} onChange={(event) => set("footer", event.target.value)} maxLength={60} />
              </div>
            </Panel>
            <Panel><SectionLabel>Infographic facts</SectionLabel><p className="mb-3 text-[11px] text-[#A2937D]">Used by the infographic composition. Keep each fact short and factual.</p>{[0, 1, 2].map((index) => <Input key={index} label={`Fact ${index + 1}`} value={state.facts?.[index] ?? ""} maxLength={52} onChange={(event) => { const facts = [...(state.facts ?? ["", "", ""])]; facts[index] = event.target.value; set("facts", facts); }} />)}</Panel>
          </> : null}

          {tab === "design" ? <>
            <Panel>
              <SectionLabel right={<span className="text-[10px] text-[#A2937D]">150 designs</span>}>{design ? "Your design" : "Design"}</SectionLabel>
              {design ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-[15px] text-cream">{design.name}</p>
                      <p className="mt-1 text-[11px] text-[#A2937D]">{LAYOUT_LABEL[design.layout]} · design {design.number} of 150 · {design.register} · {design.category}</p>
                    </div>
                    <span className="chip chip-gold shrink-0">№ {String(design.number).padStart(3, "0")}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button className="flex-1" variant="gold" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={generate}>Another design</Button>
                    <Button className="flex-1" variant="ghost" icon={<Layers className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("designs")}>Library</Button>
                  </div>
                  <Button className="mt-2 w-full" variant="quiet" icon={<X className="h-3.5 w-3.5" />} onClick={() => set("designId", undefined)}>Leave the design library</Button>
                  <p className="mt-3 text-[10.5px] leading-relaxed text-[#A2937D]">This design owns the layout, palette, type and artwork. Your words, footer and format still apply — edit them under Content. Library designs export as stills.</p>
                </>
              ) : (
                <>
                  <p className="text-[11.5px] leading-relaxed text-[#B4A58F]">You are on a legacy composition. The 150-design library is the studio's default; open it to pick a design, or stay here for layered motion.</p>
                  <Button className="mt-3 w-full" variant="gold" icon={<Layers className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("designs")}>Browse the 150 designs</Button>
                </>
              )}
            </Panel>
            <Panel>
              <SectionLabel>Format</SectionLabel>
              <div className="flex flex-wrap gap-1.5">{FORMATS.map((format) => <button key={format.id} type="button" onClick={() => chooseFormat(format.id)} aria-pressed={formatId === format.id} className={`chip ${formatId === format.id ? "chip-gold" : ""}`} title={`${format.width} × ${format.height}`}>{format.label}</button>)}</div>
              <p className="mt-2 text-[10px] text-[#A2937D]">{state.width} × {state.height} px{formatId === "print" ? " · A4 at 300 dpi" : ""}</p>
              <div className="mt-5"><SectionLabel>Colour palette</SectionLabel><div className="grid grid-cols-2 gap-2">{STUDIO_PALETTES.map((palette) => <button key={palette.key} type="button" onClick={() => set("themeKey", palette.key)} aria-pressed={state.themeKey === palette.key} className={`choice flex items-center gap-2 p-2 ${state.themeKey === palette.key ? "choice-active" : ""}`}><span className="flex overflow-hidden rounded">{palette.colors.map((color) => <span key={color} className="h-6 w-2" style={{ background: color }} />)}</span><span className="text-[10px] text-cream">{palette.name}</span></button>)}</div></div>
              <div className="mt-5 grid gap-3">
                <Select label="Headline face" value={state.display} onChange={(event) => set("display", event.target.value as DisplayFontKey)}>{DISPLAY_FONTS.map((font) => <option key={font.key} value={font.key}>{font.label}</option>)}</Select>
                <Select label="Art finish" value={state.style} onChange={(event) => set("style", event.target.value as PosterState["style"])}>{[...HERITAGE_STYLES, ...MODERN_STYLES].map((style) => <option key={style.key} value={style.key}>{style.name}</option>)}</Select>
                <Toggle checked={state.showLogo} onChange={(checked) => set("showLogo", checked)} label="Show Astro Sivam logo" hint="Composition-led placement keeps the mark clear of the message." />
                <Toggle checked={Boolean(state.useGlobalBrandPlacement)} onChange={(checked) => set("useGlobalBrandPlacement", checked)} label="Use global logo position" hint="Overrides the composition's own logo placement." />
              </div>
            </Panel>
            <Panel><SectionLabel>Legacy compositions</SectionLabel><Select label="Previous template set" value={isComposition(state.template) ? "" : state.template} onChange={(event) => { if (event.target.value) { selectTemplate(event.target.value as PosterTemplate); setMode("static"); } }}><option value="">Choose a legacy template</option>{LEGACY_TEMPLATES.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</Select><div className="mt-3 flex items-center gap-3 text-[#A2937D]">{!isComposition(state.template) ? <TemplateGlyph template={state.template ?? "editorial"} className="h-12 w-9" /> : null}<p className="text-[10.5px] leading-relaxed">The eight previous painters are preserved for saved presets. New compositions add responsive geometry and layered motion.</p></div></Panel>
          </> : null}

          {tab === "artwork" ? <>
            <Panel>
              <SectionLabel right={<ImageIcon className="h-3.5 w-3.5 text-gold" />}>Artwork</SectionLabel>
              <div className="overflow-hidden rounded-xl border border-line bg-black/20">{state.image ? <img src={state.image} alt={brief.imageAlt} className="max-h-64 w-full object-contain" /> : <div className="flex h-40 items-center justify-center text-[12px] text-[#A2937D]">No image — the category vector is used.</div>}</div>
              <div className="mt-3 flex gap-2"><Button variant="ghost" className="flex-1" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => fileInput.current?.click()}>Upload image</Button>{state.image ? <Button variant="quiet" aria-label="Remove image" onClick={clearImage} icon={<X className="h-3.5 w-3.5" />} /> : null}</div>
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} />
              <Button className="mt-2 w-full" variant="quiet" onClick={() => { setDeityKey(null); setState((current) => ({ ...current, image: occasion.image ?? brief.image, imageIsLibrary: true })); }}>Restore category artwork</Button>
              <p className="mt-3 text-[10.5px] leading-relaxed text-[#A2937D]">Bundled illustrations are text-free. Uploaded images stay in this browser. The composition chooses the crop; faces stay clear of the reading zone.</p>
            </Panel>
            <Panel><SectionLabel>Devotional artwork library</SectionLabel><div className="grid grid-cols-4 gap-2">{DEITIES.map((deity) => <button key={deity.key} type="button" onClick={() => useDeity(deity.key)} aria-pressed={deityKey === deity.key} title={deity.name} className={`choice overflow-hidden p-0 ${deityKey === deity.key ? "choice-active" : ""}`}><img src={deity.thumb} alt={deity.name} loading="lazy" decoding="async" className="h-16 w-full object-cover" /><span className="block truncate px-1 py-1 text-[8.5px] text-[#D9CDBA]">{deity.name}</span></button>)}</div><Callout tone="quiet">{DEITY_USAGE_NOTE}</Callout></Panel>
          </> : null}

          {tab === "export" ? <>
            <Panel>
              <SectionLabel eyebrow="Ready when you are">Export &amp; publish</SectionLabel>
              <div className="space-y-3">
                <Button full variant="gold" icon={<Download className="h-4 w-4" />} loading={busy} disabled={!canExport} onClick={download}>Download PNG · {state.width} × {state.height}</Button>
                <Button full variant="ghost" icon={reel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />} disabled={!canExport || !support.ok || !activeComposition} onClick={record} title={support.ok ? "15 seconds of layered motion in the selected format" : support.reason}>{reel ? "Recording…" : "Export 15 s motion"}</Button>
                <PublishCanvasButton full render={() => renderPoster({ ...state, scale: 1 })} filename={filename} captions={brandPostCaptions(studioCaption(state))} sourceLabel={feedSafe ? "Custom poster · Facebook/Instagram feed image" : "Custom poster · Facebook feed image"} platforms={feedSafe ? undefined : ["facebook"]} disabled={!canExport} label="Publish poster now" />
              </div>
              {reel ? <div className="mt-4 rounded-lg border border-line p-3" role="status"><div className="flex justify-between text-[11px] text-cream"><span>{STAGE_LABEL[reel.stage]}</span><span>{Math.round(reel.progress * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track"><div className="h-full bg-gold" style={{ width: `${Math.max(2, reel.progress * 100)}%` }} /></div><div className="mt-2 flex items-center justify-between gap-2"><p className="text-[10px] text-[#A2937D]">Keep this tab visible for about 15 seconds.</p><Button size="sm" variant="quiet" onClick={() => reelAbort.current?.abort()}>Stop</Button></div></div> : null}
              <Callout tone="quiet" title="Video format">MP4 is used when your browser can encode it; otherwise the file is WebM. Instagram and Facebook publishing from this studio currently accepts images; download the video and upload it in the platform app. Meta publishing connections are unchanged.</Callout>
            </Panel>
            <Panel><SectionLabel>Before you post</SectionLabel><ul className="space-y-2 text-[11px] leading-relaxed text-[#B4A58F]"><li>English copy is checked before rendering. No Tamil or Hindi text is placed on the poster.</li><li>Story previews reserve the top and bottom platform UI bands.</li><li>Generate again to change the composition without losing your words or artwork.</li><li>Download the file you want to keep. Browser export history is a convenience, not a backup.</li></ul></Panel>
            <ExportLibrary refreshKey={libraryKey} />
          </> : null}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ live preview ------------------------------ */
const LivePoster: React.FC<{ options: PosterState; mode: "static" | "motion"; playing: boolean }> = ({ options, mode, playing }) => {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  const signature = JSON.stringify({ ...options, image: options.image?.startsWith("data:") ? options.image.slice(0, 80) + options.image.length : options.image });
  useEffect(() => {
    let cancelled = false, frame = 0;
    let layers: CompositionLayers | null = null;
    let canvas: HTMLCanvasElement | null = null;
    setReady(false); setError(null);
    const timer = window.setTimeout(async () => {
      const scale = Math.min(1, 720 / options.width);
      try {
        if (mode === "motion" && isComposition(options.template)) {
          layers = await renderCompositionLayers({ width: options.width, height: options.height, composition: options.template, category: resolveCategory(options.category), occasion: options.occasion, themeKey: options.themeKey, style: options.style, display: options.display, image: options.image, imageIsLibrary: options.imageIsLibrary, showLogo: options.showLogo, seed: options.seed, scale, useGlobalBrandPlacement: options.useGlobalBrandPlacement, copy: { kicker: options.kicker, serviceTitle: options.serviceTitle ?? options.kicker, headline: options.headline, subline: options.subline, cta: options.cta, footer: options.footer, facts: options.facts ?? [] } });
          if (cancelled || !holder.current) return;
          canvas = document.createElement("canvas"); canvas.width = Math.round(options.width * scale); canvas.height = Math.round(options.height * scale);
          canvas.style.width = "100%"; canvas.style.height = "auto"; canvas.style.display = "block";
          holder.current.replaceChildren(canvas); setReady(true);
          const ctx = canvas.getContext("2d")!;
          let start = performance.now(), elapsed = 0, last = 0, lastPaint = 0;
          const loop = (now: number) => {
            if (cancelled || !layers || !canvas) return;
            if (playingRef.current) elapsed += Math.min(.1, (now - start) / 1000);
            start = now;
            const t = (elapsed % MOTION_SECONDS) / MOTION_SECONDS;
            if (now - lastPaint >= 1000 / 30) { paintMotionFrame(ctx, layers, t); lastPaint = now; }
            if (now - last > 120) { setProgress(t); last = now; }
            frame = requestAnimationFrame(loop);
          };
          frame = requestAnimationFrame(loop);
        } else {
          const rendered = await renderPoster({ ...options, scale });
          if (cancelled || !holder.current) { releaseCanvas(rendered); return; }
          canvas = rendered; canvas.style.width = "100%"; canvas.style.height = "auto"; canvas.style.display = "block";
          holder.current.replaceChildren(canvas); setReady(true);
        }
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Preview could not be rendered."); }
    }, 160);
    return () => { cancelled = true; clearTimeout(timer); cancelAnimationFrame(frame); if (layers) [layers.background, layers.art, layers.effects, layers.type, layers.brand].forEach(releaseCanvas); };
  }, [signature, mode]);
  return <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${options.width} / ${options.height}` }} aria-busy={!ready}>
    <div ref={holder} className="absolute inset-0" />
    {!ready && !error ? <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-[#1D1618] text-[11px] tracking-[0.18em] text-[#A2937D]">RENDERING</div> : null}
    {error ? <div className="absolute inset-0 flex items-center justify-center bg-[#1D1618] p-6 text-center text-[12px] leading-relaxed text-[#F0C3A2]" role="alert">{error}</div> : null}
    {mode === "motion" && ready ? <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30"><div className="h-full bg-gold/80" style={{ width: `${progress * 100}%` }} /></div> : null}
  </div>;
};
