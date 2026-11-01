import React, { useMemo, useState } from "react";
import { useBrandPlacementVersion } from "../lib/brandPlacement";
import {
  CalendarHeart,
  Check,
  Copy,
  Download,
  Facebook,
  Hash,
  ImageDown,
  Instagram,
  Layers,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { FESTIVALS, FESTIVAL_MONTHS, getFestival } from "../data/festivals";
import { DEITIES, DEITY_MAP } from "../data/deities";
import { THEMES } from "../data/brand";
import type { DeityKey, DisplayFontKey, ScriptFontKey, ThemeKey } from "../types";
import { copyText, downloadCanvas, downloadZip, slugify } from "../lib/export";
import {
  CARD_FORMATS,
  CARD_FORMAT_MAP,
  CARD_LANGUAGES,
  CARD_PALETTES,
  CARD_STYLES,
  CARD_STYLE_MAP,
  CARD_TYPE,
  type CardFormat,
  type CardLanguage,
  type FestivalCardRender,
  type FestivalStyle,
  type LogoPlacement,
  type BrandLockupSettings,
  type PictureSettings,
  type PictureShape,
  type PictureTreatment,
  DEFAULT_BRAND_LOCKUP,
} from "../lib/festivalCreative";
import { festivalArt, festivalCaptions, festivalCopy, festivalDateView, festivalYears, skinFor } from "../lib/festivalKit";
import { festivalPackFiles, festivalYearFiles } from "../lib/festivalPack";
import { Button, Callout, CopyButton, PageHeader, Panel, SectionLabel, useToast } from "./ui";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { ScriptText } from "./ScriptText";

const MONTH_INDEX = (month: string) => FESTIVAL_MONTHS.indexOf(month);

const REGION_CHIPS: Array<{ value: string; label: string }> = [
  { value: "All", label: "Whole calendar" },
  { value: "Tamil", label: "Tamil" },
  { value: "Pan-Indian", label: "Pan-Indian" },
  { value: "North Indian", label: "North Indian" },
  { value: "Kerala", label: "Kerala" },
  { value: "Global", label: "Global days" },
];

const LOGO_CHIPS: Array<{ value: LogoPlacement; label: string; note: string }> = [
  { value: "plaque", label: "Plaque", note: "Seal in the corner of the composition" },
  { value: "wordmark", label: "Wordmark", note: "Seal + name, centred at the foot" },
  { value: "corner", label: "Corner seal", note: "Small seal, opposite the site line" },
  { value: "service-top-right", label: "Services · top-right", note: "Brand lockup in the services-suite header position" },
  { value: "custom", label: "Custom position", note: "Place the lockup using the X and Y controls" },
  { value: "none", label: "No logo", note: "For collabs and guest takeovers" },
];

export const FestivalWishes: React.FC = () => {
  const toast = useToast();
  const [festivalId, setFestivalId] = useState("deepavali");
  const [formatId, setFormatId] = useState<CardFormat>("ig-post");
  const [style, setStyle] = useState<FestivalStyle>("traditional");
  const [language, setLanguage] = useState<CardLanguage>("trilingual");
  const [theme, setTheme] = useState<ThemeKey | null>(null);
  const [display, setDisplay] = useState<DisplayFontKey | null>(null);
  const [script, setScript] = useState<ScriptFontKey | null>(null);
  const [logo, setLogo] = useState<LogoPlacement | null>(null);
  const [brandLockup, setBrandLockup] = useState<BrandLockupSettings>({ ...DEFAULT_BRAND_LOCKUP });
  const [artMode, setArtMode] = useState<"deity" | "library" | "none" | "upload">("deity");
  const [selectedDeity, setSelectedDeity] = useState<DeityKey | null>(null);
  const [artOverride, setArtOverride] = useState<string | null>(null);
  const [pictureShape, setPictureShape] = useState<PictureShape>("default");
  const [pictureScale, setPictureScale] = useState<number>(100);
  const [pictureFocusY, setPictureFocusY] = useState<number>(34);
  const [pictureTreatment, setPictureTreatment] = useState<PictureTreatment>("natural");
  const [beadedBorder, setBeadedBorder] = useState<boolean>(true);
  const [showAura, setShowAura] = useState<boolean>(true);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [month, setMonth] = useState<string>("All");
  const [region, setRegion] = useState<string>("All");
  const [year, setYear] = useState<number | "next">("next");
  const [greetings, setGreetings] = useState<Partial<{ en: string; ta: string; hi: string }>>({});
  const [subline, setSubline] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const festival = getFestival(festivalId);
  const format = CARD_FORMAT_MAP[formatId] ?? CARD_FORMAT_MAP["ig-post"];
  const styleMeta = CARD_STYLE_MAP[style];
  const dealer = festival.deity ? DEITY_MAP[festival.deity] : null;

  const filtered = useMemo(() => {
    const list = FESTIVALS.filter(
      (item) => (month === "All" || item.month === month) && (region === "All" || item.region === region),
    );
    return [...list].sort((a, b) => MONTH_INDEX(a.month) - MONTH_INDEX(b.month));
  }, [month, region]);

  const date = festivalDateView(festival.id, year === "next" ? undefined : year);
  const skin = skinFor(style, festival, formatId);
  const effectiveTheme = theme ?? skin.theme;
  const effectiveDisplay = display ?? skin.display;
  const effectiveScript = script ?? skin.script;
  const effectiveLogo = logo ?? skin.logo;
  const activeDeityKey = selectedDeity ?? (festival.deity as DeityKey | null);
  const art =
    artMode === "upload"
      ? artOverride
      : artMode === "none"
      ? null
      : artMode === "library" && activeDeityKey
      ? DEITY_MAP[activeDeityKey]?.file ?? null
      : festivalArt(festival) ?? (activeDeityKey ? DEITY_MAP[activeDeityKey]?.file ?? null : null);

  const pictureSettings: PictureSettings = useMemo(
    () => ({
      shape: pictureShape,
      scale: pictureScale / 100,
      focusY: pictureFocusY / 100,
      treatment: pictureTreatment,
      beadedBorder,
      showAura,
    }),
    [pictureShape, pictureScale, pictureFocusY, pictureTreatment, beadedBorder, showAura],
  );

  const copy = festivalCopy(festival, date, {
    greetings,
    subline: subline.trim() || undefined,
  });

  // A stylesheet-free signature of everything the card depends on, so the
  // preview only re-renders when something that matters changed.
  const signature = JSON.stringify({
    style,
    formatId,
    language,
    effectiveTheme,
    effectiveDisplay,
    effectiveScript,
    effectiveLogo,
    brandLockup,
    art,
    pictureSettings,
    artMode,
    selectedDeity,
    showSafeArea,
    greetings,
    subline,
    date: date.label,
    dateNote: date.note,
    festival: festival.id,
  });

  const captions = festivalCaptions(festival, {
    date,
    language,
    dateLine: date.label ?? festival.when,
  });

  const renderSelected = async () => {
    const { renderFestivalCard } = await import("../lib/festivalCreative");
    return renderFestivalCard({
      style,
      format: formatId,
      theme: effectiveTheme,
      display: effectiveDisplay,
      script: effectiveScript,
      logo: effectiveLogo,
      brandLockup,
      language,
      copy,
      art,
      pictureSettings,
    });
  };

  const resetLook = () => {
    setTheme(null);
    setDisplay(null);
    setScript(null);
    setLogo(null);
    setBrandLockup({ ...DEFAULT_BRAND_LOCKUP });
    setArtMode("deity");
    setSelectedDeity(null);
    setArtOverride(null);
    setPictureShape("default");
    setPictureScale(100);
    setPictureFocusY(34);
    setPictureTreatment("natural");
    setBeadedBorder(true);
    setShowAura(true);
    setShowSafeArea(false);
    setGreetings({});
    setSubline("");
  };

  const doCopy = async (text: string, key: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1800);
    } else {
      toast("Copy blocked — select the text manually.", "error");
    }
  };

  const uploadArt = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setArtOverride(String(reader.result));
      setArtMode("upload");
    };
    reader.onerror = () => toast("That image could not be read.", "error");
    reader.readAsDataURL(file);
  };

  const downloadOne = async () => {
    setBusy("one");
    try {
      const out = await renderSelected();
      await downloadCanvas(out.canvas, `astrosivam_${slugify(festival.id)}_${style}_${format.width}x${format.height}.png`);
      toast(`${festival.name} · ${style} · ${format.width} × ${format.height}`);
      if (out.warnings.length) toast(out.warnings[0], "error");
    } catch {
      toast("Export failed — reload the page and try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const runPack = async () => {
    setBusy("pack");
    setProgress({ label: "Rendering four formats", done: 0, total: 5 });
    try {
      const { files, warnings } = await festivalPackFiles(
        festival,
        {
          style,
          language,
          format: formatId,
          theme,
          display,
          script,
          logo,
          brandLockup,
          artOverride: artMode === "upload" ? artOverride : artMode === "library" && activeDeityKey ? DEITY_MAP[activeDeityKey]?.file ?? null : null,
          pictureSettings,
          year,
        },
        (done, total) => setProgress({ label: "Rendering four formats", done, total }),
      );
      downloadZip(files, `astrosivam_${slugify(festival.id)}_${style}_festival.zip`);
      toast(`${festival.name} pack · ${files.length} files`);
      if (warnings.length) toast(warnings[0], "error");
    } catch {
      toast("Pack failed — download the single card instead.", "error");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const runYear = async () => {
    setBusy("year");
    setProgress({ label: "Rendering the festival year", done: 0, total: FESTIVALS.length + 1 });
    try {
      const { files, undated } = await festivalYearFiles(
        {
          style,
          language,
          format: "ig-post",
          theme,
          display,
          script,
          logo,
          brandLockup,
          artOverride: null,
          year,
        },
        (done, total) => setProgress({ label: "Rendering the festival year", done, total }),
      );
      downloadZip(files, `astrosivam_festival-year_${style}.zip`);
      toast(`Year pack · ${files.length} files${undated.length ? ` · ${undated.length} undated` : ""}`);
    } catch {
      toast("Year pack failed — try a single festival first.", "error");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  // Every year the calendar covers is offered, so an empty year is visible
  // rather than silently replaced by the next year that happens to have a row.
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [...new Set([...festivalYears(festival.id), now, now + 1])].sort();
  }, [festival.id]);

  const themeSwatch = THEMES[effectiveTheme];

  return (
    <div>
      <PageHeader
        eyebrow={`Festival wishes · ${FESTIVALS.length} occasions · ${CARD_STYLES.length} style families`}
        title={
          <>
            Every festival, ready to post —{" "}
            <span className="gold-text">
              <ScriptText text="English, தமிழ் and हिंदी." />
            </span>
          </>
        }
        description="Four genuine treatments — traditional, minimal, luxury, contemporary — each with its own grid, type pairing and palette. Pick a festival, a language, a palette, the type faces and where the logo sits. Dates come only from the verified panchang table: a festival with no stored date is printed as waiting, never guessed."
        actions={
          <>
            <PublishCanvasButton
              render={async () => (await renderSelected()).canvas}
              filename={`astrosivam_${slugify(festival.id)}_${style}_${format.width}x${format.height}.png`}
              captions={captions}
              sourceLabel={formatId === "ig-story" ? `${festival.name} · vertical image (Facebook feed only)` : `${festival.name} · ${format.ratio}`}
              platforms={formatId === "ig-story" ? ["facebook"] : undefined}
              disabled={busy !== null}
            />
            <Button
              variant="gold"
              onClick={runPack}
              disabled={busy !== null}
              loading={busy === "pack"}
              icon={<ImageDown className="h-3.5 w-3.5" />}
            >
              {festival.name} pack
            </Button>
            <Button
              variant="ghost"
              onClick={runYear}
              disabled={busy !== null}
              loading={busy === "year"}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Whole year ZIP
            </Button>
          </>
        }
      />

      {progress ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-[#191314]/70 px-3.5 py-2.5 text-[11px] text-[#C7B9A3]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
          {progress.label} · {progress.done}/{progress.total}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* controls */}
        <div className="space-y-4">
          <Panel>
            <SectionLabel right={<CalendarHeart className="h-3.5 w-3.5 text-gold" />}>Month</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setMonth("All")} className={`chip ${month === "All" ? "chip-gold" : ""}`}>
                All year
              </button>
              {FESTIVAL_MONTHS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMonth(item)}
                  className={`chip ${month === item ? "chip-gold" : ""}`}
                  title={`${FESTIVALS.filter((festivalItem) => festivalItem.month === item).length} festivals`}
                >
                  {item.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-line pt-3">
              <SectionLabel>Tradition</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {REGION_CHIPS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRegion(item.value)}
                    className={`chip ${region === item.value ? "chip-gold" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <SectionLabel right={<span className="text-[10px] text-[#A2937D]">{filtered.length} cards</span>}>
                Festival
              </SectionLabel>
              <div className="max-h-[300px] space-y-1 overflow-y-auto pr-1 scroll-thin">
                {filtered.map((item) => {
                  const active = item.id === festivalId;
                  const years = festivalYears(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFestivalId(item.id);
                        setGreetings({});
                        setSubline("");
                        setYear("next");
                      }}
                      aria-pressed={active}
                      className={`choice flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left ${active ? "choice-active" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-cream">{item.name}</span>
                        <span className="block truncate text-[9.5px] text-[#A2937D]">
                          {years.length ? years.join(" · ") : "date to confirm"} · {item.when}
                        </span>
                      </span>
                      {item.deity ? (
                        <img src={DEITY_MAP[item.deity].thumb} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="h-7 w-7 shrink-0 rounded-full border border-line" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<Layers className="h-3.5 w-3.5 text-gold" />}>Style family</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {CARD_STYLES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setStyle(item.key);
                    setTheme(null);
                    setDisplay(null);
                    setScript(null);
                    setLogo(null);
                  }}
                  aria-pressed={style === item.key}
                  className={`choice px-2.5 py-2 text-left ${style === item.key ? "choice-active" : ""}`}
                >
                  <span className="block text-[11.5px] font-semibold text-cream">{item.name}</span>
                  <span className="mt-0.5 block text-[9.5px] leading-snug text-[#A2937D]">{item.purpose}</span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
              {styleMeta.bestFor}
            </p>

            <div className="mt-4 border-t border-line pt-3">
              <SectionLabel>Format</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {CARD_FORMATS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFormatId(item.key)}
                    className={`chip ${formatId === item.key ? "chip-jade" : ""}`}
                    title={`${item.width} × ${item.height} · ${item.cropNote}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[#A2937D]">{format.cropNote}</p>
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <SectionLabel>Language on the card</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {CARD_LANGUAGES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLanguage(item.key)}
                    aria-pressed={language === item.key}
                    className={`chip ${language === item.key ? "chip-gold" : ""}`}
                    title={item.note}
                    lang={item.key === "ta" ? "ta" : item.key === "hi" ? "hi" : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<span className="text-[10px] text-[#A2937D]">{themeSwatch.name}</span>}>Palette</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTheme(null)}
                className={`chip ${theme === null ? "chip-gold" : ""}`}
                title={`Style default · ${THEMES[skin.theme].name}`}
              >
                Style default
              </button>
              {CARD_PALETTES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTheme(item.key)}
                  aria-pressed={theme === item.key}
                  className={`chip ${theme === item.key ? "chip-gold" : ""}`}
                  title={THEMES[item.key].name}
                >
                  <span className="mr-1.5 inline-flex overflow-hidden rounded-sm align-middle">
                    {THEMES[item.key].swatch.slice(0, 3).map((color) => (
                      <span key={color} className="h-2.5 w-1.5" style={{ background: color }} />
                    ))}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Display face</span>
                <select
                  value={effectiveDisplay}
                  onChange={(event) => setDisplay(event.target.value as DisplayFontKey)}
                  className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream"
                >
                  {CARD_TYPE.display.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Script face</span>
                <select
                  value={effectiveScript}
                  onChange={(event) => setScript(event.target.value as ScriptFontKey)}
                  className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream"
                >
                  {CARD_TYPE.script.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3">
              <SectionLabel>Logo placement</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {LOGO_CHIPS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLogo(item.value)}
                    aria-pressed={effectiveLogo === item.value}
                    className={`chip ${effectiveLogo === item.value ? "chip-gold" : ""}`}
                    title={item.note}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Lockup shape</span>
                  <select
                    value={brandLockup.orientation}
                    onChange={(event) => setBrandLockup((value) => ({ ...value, orientation: event.target.value as BrandLockupSettings["orientation"] }))}
                    className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Stacked vertical</option>
                    <option value="circular">Circular wordmark</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Logo size · {Math.round(brandLockup.markScale * 100)}%</span>
                  <input type="range" min={50} max={160} value={Math.round(brandLockup.markScale * 100)} aria-label="Logo size" onChange={(event) => setBrandLockup((value) => ({ ...value, markScale: Number(event.target.value) / 100 }))} className="w-full accent-[#C79A3C]" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Brand text · {Math.round(brandLockup.textScale * 100)}%</span>
                  <input type="range" min={60} max={180} value={Math.round(brandLockup.textScale * 100)} aria-label="Brand text size" onChange={(event) => setBrandLockup((value) => ({ ...value, textScale: Number(event.target.value) / 100 }))} className="w-full accent-[#C79A3C]" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Move left / right · {Math.round(brandLockup.offsetX * 100)}%</span>
                  <input type="range" min={-12} max={12} value={Math.round(brandLockup.offsetX * 100)} aria-label="Move logo and wordmark left or right" onChange={(event) => setBrandLockup((value) => ({ ...value, offsetX: Number(event.target.value) / 100 }))} className="w-full accent-[#C79A3C]" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Move up / down · {Math.round(brandLockup.offsetY * 100)}%</span>
                  <input type="range" min={-12} max={12} value={Math.round(brandLockup.offsetY * 100)} aria-label="Move logo and wordmark up or down" onChange={(event) => setBrandLockup((value) => ({ ...value, offsetY: Number(event.target.value) / 100 }))} className="w-full accent-[#C79A3C]" />
                </label>
                {effectiveLogo === "custom" ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Custom X · {brandLockup.customX}%</span>
                      <input type="range" min={6} max={94} value={brandLockup.customX} aria-label="Custom logo horizontal position" onChange={(event) => setBrandLockup((value) => ({ ...value, customX: Number(event.target.value) }))} className="w-full accent-[#C79A3C]" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Custom Y · {brandLockup.customY}%</span>
                      <input type="range" min={6} max={94} value={brandLockup.customY} aria-label="Custom logo vertical position" onChange={(event) => setBrandLockup((value) => ({ ...value, customY: Number(event.target.value) }))} className="w-full accent-[#C79A3C]" />
                    </label>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <SectionLabel right={<Sparkles className="h-3.5 w-3.5 text-gold" />}>Picture & Sacred Art Studio</SectionLabel>
              
              {/* Picture Source Selection */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setArtMode("deity")}
                  className={`chip ${artMode === "deity" ? "chip-gold" : ""}`}
                  title={dealer ? dealer.name : "Default festival deity"}
                >
                  {dealer ? dealer.name : "Festival deity"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArtMode("library");
                    if (!selectedDeity && dealer) setSelectedDeity(dealer.key);
                    else if (!selectedDeity) setSelectedDeity("ganesha");
                  }}
                  className={`chip ${artMode === "library" ? "chip-gold" : ""}`}
                  title="Choose from all 11 consecrated temple deities in the library"
                >
                  11 Temple Deities
                </button>
                <button type="button" onClick={() => setArtMode("none")} className={`chip ${artMode === "none" ? "chip-gold" : ""}`}>
                  Motif only
                </button>
                <label className={`chip cursor-pointer ${artMode === "upload" ? "chip-gold" : ""}`}>
                  <Upload className="mr-1 inline h-3 w-3" />
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadArt(event.target.files?.[0] ?? null)} />
                </label>
              </div>

              {/* 11 Temple Deities Interactive Gallery */}
              {artMode === "library" ? (
                <div className="mt-2.5 rounded-xl border border-line bg-[#161011] p-2">
                  <span className="mb-1.5 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Select Sacred Deity</span>
                  <div className="max-h-[175px] space-y-1 overflow-y-auto pr-1 scroll-thin">
                    {DEITIES.map((d) => {
                      const isSel = (selectedDeity ?? festival.deity) === d.key;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDeity(d.key)}
                          className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left transition-all ${
                            isSel ? "bg-[#2E1E12] border border-gold" : "hover:bg-[#20181A] border border-transparent"
                          }`}
                        >
                          <img src={d.thumb} alt={d.name} className="h-7 w-7 rounded-full object-cover shrink-0 border border-gold/40" />
                          <div className="min-w-0 flex-1">
                            <span className="block text-[11px] font-medium text-cream">{d.name}</span>
                            <span className="block text-[9.5px] font-tamil text-[#A2937D]">{d.tamil} · {d.epithet}</span>
                          </div>
                          {isSel ? <Check className="h-3.5 w-3.5 text-gold shrink-0" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Frame Geometry */}
              <div className="mt-3">
                <span className="mb-1.5 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Picture Frame Shape</span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: "default", label: "Auto (Style default)" },
                      { key: "arch", label: "Temple Arch" },
                      { key: "circle", label: "Sacred Circle" },
                      { key: "oval", label: "Cameo Oval" },
                      { key: "square", label: "Square Window" },
                      { key: "bleed", label: "Full Bleed" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPictureShape(item.key)}
                      className={`chip ${pictureShape === item.key ? "chip-gold" : ""}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale & Vertical Focus Sliders */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                    Picture size · {pictureScale}%
                  </span>
                  <input
                    type="range"
                    min={75}
                    max={140}
                    value={pictureScale}
                    onChange={(event) => setPictureScale(Number(event.target.value))}
                    className="w-full accent-[#C79A3C]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                    Vertical crop focus · {pictureFocusY}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={pictureFocusY}
                    onChange={(event) => setPictureFocusY(Number(event.target.value))}
                    className="w-full accent-[#C79A3C]"
                  />
                </label>
              </div>

              {/* Artistic Treatment */}
              <div className="mt-3">
                <span className="mb-1.5 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Artistic Treatment</span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: "natural", label: "Natural Devotional" },
                      { key: "divine-aura", label: "Divine Halo Aura" },
                      { key: "temple-glow", label: "Temple Candlelight Glow" },
                      { key: "antique-gold", label: "Antique Gold Tint" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPictureTreatment(item.key)}
                      className={`chip ${pictureTreatment === item.key ? "chip-gold" : ""}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBeadedBorder((val) => !val)}
                  className={`chip ${beadedBorder ? "chip-gold" : ""}`}
                >
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  Beaded pearl border
                </button>
                <button
                  type="button"
                  onClick={() => setShowAura((val) => !val)}
                  className={`chip ${showAura ? "chip-gold" : ""}`}
                >
                  Radiant solar aura
                </button>
                <button
                  type="button"
                  onClick={() => setShowSafeArea((val) => !val)}
                  className={`chip ${showSafeArea ? "chip-jade" : ""}`}
                >
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  Safe-area guides
                </button>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionLabel
              right={
                <button
                  type="button"
                  onClick={() => {
                    setGreetings({});
                    setSubline("");
                  }}
                  className="inline-flex items-center gap-1 text-[10px] text-[#A2937D] transition-colors hover:text-gold-soft"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              }
            >
              Words
            </SectionLabel>
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">English greeting</span>
                <input
                  value={greetings.en ?? copy.greeting.en}
                  onChange={(event) => setGreetings((value) => ({ ...value, en: event.target.value }))}
                  className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream"
                />
              </label>
              <label className="block">
                <span lang="ta" className="mb-1 block font-tamil text-[10.5px] text-[#A2937D]">தமிழ்</span>
                <input
                  value={greetings.ta ?? copy.greeting.ta}
                  onChange={(event) => setGreetings((value) => ({ ...value, ta: event.target.value }))}
                  className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 font-tamil text-[12px] text-cream"
                />
              </label>
              <label className="block">
                <span lang="hi" className="mb-1 block font-hindi text-[10.5px] text-[#A2937D]">हिंदी</span>
                <input
                  value={greetings.hi ?? copy.greeting.hi}
                  onChange={(event) => setGreetings((value) => ({ ...value, hi: event.target.value }))}
                  lang="hi"
                  className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 font-hindi text-[12px] text-cream"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Supporting line</span>
                <input
                  value={subline || copy.subline}
                  onChange={(event) => setSubline(event.target.value)}
                  className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream"
                />
              </label>
            </div>
            <PublishCanvasButton
              render={async () => (await renderSelected()).canvas}
              filename={`astrosivam_${slugify(festival.id)}_${style}_${format.width}x${format.height}.png`}
              captions={captions}
              sourceLabel={formatId === "ig-story" ? `${festival.name} · vertical image (Facebook feed only)` : `${festival.name} · ${format.ratio}`}
              platforms={formatId === "ig-story" ? ["facebook"] : undefined}
              full
              className="mt-3"
              disabled={busy !== null}
              label="Publish card now"
            />
            <Button
              variant="gold"
              full
              className="mt-2"
              onClick={downloadOne}
              disabled={busy !== null}
              loading={busy === "one"}
              icon={<ImageDown className="h-3.5 w-3.5" />}
            >
              Download this card
            </Button>
            <button
              type="button"
              onClick={resetLook}
              className="mt-2 w-full text-center text-[10px] text-[#A2937D] transition-colors hover:text-gold-soft"
            >
              Reset style, palette, artwork and words
            </button>
          </Panel>
        </div>

        {/* preview + copy */}
        <div className="space-y-4">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-cream">{festival.name}</span>
                <span className="text-[10px] text-[#A2937D]">{styleMeta.name} · {format.ratio}</span>
              </div>
              <span className="text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                {format.width} × {format.height}
              </span>
            </div>
            <FestivalPreview signature={signature} input={{ style, format: formatId, theme: effectiveTheme, display: effectiveDisplay, script: effectiveScript, logo: effectiveLogo, brandLockup, language, copy, art, showSafeArea, pictureSettings }} />
          </Panel>

          <Panel>
            <SectionLabel right={<CalendarHeart className="h-3.5 w-3.5 text-gold" />}>Verified date</SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
              {date.label ? (
                <>
                  <span className="text-[13px] font-medium text-cream">{date.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.12em] ${
                      date.confidence === "confirmed" ? "bg-[rgba(143,191,165,0.16)] text-jade" : "bg-[rgba(216,177,100,0.14)] text-gold-soft"
                    }`}
                  >
                    {date.confidence}
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-[#F0C3A2]">No civil date on file for {year === "next" ? "this year" : year} — the card says so.</span>
              )}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
              {festival.when} · the panchang is the authority; this table is the reminder.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setYear("next")} className={`chip ${year === "next" ? "chip-gold" : ""}`}>
                Next up
              </button>
              {yearOptions.map((item) => {
                const stored = festivalYears(festival.id).includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setYear(item)}
                    className={`chip ${year === item ? "chip-gold" : ""} ${stored ? "" : "opacity-70"}`}
                    title={stored ? `Verified row on file for ${item}` : `No date on file for ${item} — the card says so`}
                  >
                    {item}
                    {stored ? "" : " · none"}
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <SectionLabel right={<Facebook className="h-3.5 w-3.5 text-[#9DB3D4]" />}>Facebook caption</SectionLabel>
              <pre className="max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[#C7B9A3] scroll-thin">
                <ScriptText text={captions.facebook} />
              </pre>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9.5px] text-[#A2937D]">{captions.facebook.length} chars</span>
                <CopyButton text={captions.facebook} label="Copy FB" compact />
              </div>
            </Panel>
            <Panel>
              <SectionLabel right={<Instagram className="h-3.5 w-3.5 text-[#D0A8B8]" />}>Instagram caption</SectionLabel>
              <pre className="max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[#C7B9A3] scroll-thin">
                <ScriptText text={captions.instagram} />
              </pre>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9.5px] text-[#A2937D]">{captions.instagram.length} / 2200</span>
                <CopyButton text={captions.instagram} label="Copy IG" compact />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <SectionLabel right={<Copy className="h-3.5 w-3.5 text-gold" />}>
                Wishes · <span lang="ta" className="font-tamil">தமிழ்</span>
              </SectionLabel>
              <p lang="ta" className="font-tamil text-[12.5px] leading-relaxed text-[#D9CDBA]">{festival.greetingTa}</p>
              <p lang="ta" className="mt-2 font-tamil text-[11px] leading-relaxed text-[#B4A58F]">{festival.wish.ta}</p>
              <CopyButton text={festival.greetingTa} label="Copy Tamil" className="mt-3 w-full" />
            </Panel>
            <Panel>
              <SectionLabel right={<Copy className="h-3.5 w-3.5 text-gold" />}>
                Wishes · <span lang="hi" className="font-hindi">हिंदी</span>
              </SectionLabel>
              <p lang="hi" className="font-hindi text-[12.5px] leading-relaxed text-[#D9CDBA]">
                {festival.greetingHi}
              </p>
              <p lang="hi" className="mt-2 font-hindi text-[11px] leading-relaxed text-[#B4A58F]">{festival.wish.hi}</p>
              <CopyButton text={festival.greetingHi} label="Copy Hindi" className="mt-3 w-full" />
            </Panel>
          </div>

          <Panel>
            <SectionLabel right={<Hash className="h-3.5 w-3.5 text-gold" />}>Hashtags</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {festival.hashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => doCopy(tag, tag)}
                  // A Tamil or Hindi hashtag is still a script run: mark it so
                  // it keeps its own face and never inherits chip tracking.
                  lang={/[\u0B80-\u0BFF]/.test(tag) ? "ta" : /[\u0900-\u097F]/.test(tag) ? "hi" : undefined}
                  className="rounded border border-line px-2 py-1 text-[10.5px] text-[#C7B9A3] transition-colors hover:border-[rgba(199,154,62,0.4)] hover:text-gold-soft"
                >
                  {copied === tag ? <Check className="mr-1 inline h-2.5 w-2.5 text-jade" /> : null}
                  {tag}
                </button>
              ))}
            </div>
            <CopyButton text={festival.hashtags.join(" ")} label="Copy all tags" className="mt-3 w-full" />
          </Panel>

          <Callout title="Posting order that works" icon={<Sparkles className="h-3.5 w-3.5" />}>
            Publish the greeting 24–36 hours before the festival — the feed is already saturated on the day itself. Keep
            the greeting post free of selling; put the muhurtham or report offer in the comment, or in the carousel&apos;s
            final slide. Story cards keep type inside the top and bottom safe areas, because Instagram draws its own
            controls there.
          </Callout>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ live preview ------------------------------ */

const FestivalPreview: React.FC<{
  input: Parameters<typeof import("../lib/festivalCreative").renderFestivalCard>[0];
  signature: string;
}> = ({ input, signature }) => {
  const holder = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const brandVersion = useBrandPlacementVersion();

  React.useEffect(() => {
    let cancelled = false;
    setReady(false);
    import("../lib/festivalCreative")
      .then(({ renderFestivalCard, CARD_FORMAT_MAP }) => {
        const format = CARD_FORMAT_MAP[input.format];
        const scale = Math.min(1, 860 / format.width);
        return renderFestivalCard({ ...input, scale });
      })
      .then((out: FestivalCardRender) => {
        if (cancelled || !holder.current) return;
        out.canvas.style.width = "100%";
        out.canvas.style.height = "auto";
        out.canvas.style.display = "block";
        holder.current.replaceChildren(out.canvas);
        setWarnings(out.warnings);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, brandVersion]);

  return (
    <div>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: `${CARD_FORMAT_MAP[input.format].width} / ${CARD_FORMAT_MAP[input.format].height}` }}
        aria-busy={!ready}
      >
        <div ref={holder} className="absolute inset-0" />
        {!ready ? (
          <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-[#1D1618] text-[11px] tracking-[0.18em] text-[#A2937D]">
            RENDERING
          </div>
        ) : null}
      </div>
      {warnings.length ? (
        <p className="border-t border-line px-4 py-2 text-[10px] leading-relaxed text-[#F0C3A2]">{warnings.join(" ")}</p>
      ) : null}
    </div>
  );
};
