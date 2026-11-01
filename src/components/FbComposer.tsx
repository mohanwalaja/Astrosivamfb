import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrandPlacementVersion } from "../lib/brandPlacement";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  Eye,
  Facebook,
  Hash,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  RefreshCw,
  Smartphone,
  Upload,
} from "lucide-react";
import type { ThemeKey } from "../types";
import { DEITIES } from "../data/deities";
import { FB_CATEGORIES, FB_COPY_ENTRIES, composePost, type FbCategory, type FbCopyEntry } from "../data/fbCopy";
import { renderFbCreative, auditLegibility, FB_LAYOUT_MAP, type FbLayout, type FbRender } from "../lib/fbCreative";
import { validateCaption, validateImageFile, prepareImage, type Platform } from "../lib/imageValidate";
import { downloadCanvas } from "../lib/export";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { fileToImageSource } from "../lib/imageUpload";
import { Button, Callout, CopyButton, Panel, SectionLabel, Segmented, Select, Textarea, useToast } from "./ui";

/**
 * Compose a Facebook post from a library entry.
 *
 * The point of this screen is that nothing is a mock-up: the preview is the real
 * canvas renderer at the real export size, the legibility report is measured from
 * the type that was actually drawn, and the caption validator runs the same rules
 * the publisher and the PHP endpoint enforce.
 */

type PreviewBackground = "feed" | "checker" | "dark";

/** Themes offered in the composer — the full renderer set, minus editor-only ones. */
const THEME_KEYS: ThemeKey[] = ["kumkum", "midnight", "granite", "ivory", "forest", "sand", "saffron", "jade", "ink"];

/** Blit a rendered canvas into the DOM without React ever owning the pixels. */
function Blit({ source, width }: { source: HTMLCanvasElement; width?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.width = width ?? source.width;
    node.height = Math.round((node.width / source.width) * source.height);
    const context = node.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, node.width, node.height);
    context.drawImage(source, 0, 0, node.width, node.height);
  }, [source, width]);
  return <canvas ref={ref} style={{ width: "100%", height: "auto", display: "block" }} />;
}

export function FbComposer() {
  const toast = useToast();
  const [category, setCategory] = useState<FbCategory>("service");
  const [entryId, setEntryId] = useState(FB_COPY_ENTRIES[0].id);
  const [theme, setTheme] = useState<ThemeKey>(FB_COPY_ENTRIES[0].theme);
  const [art, setArt] = useState<string | null>(DEITIES[0]?.file ?? null);
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [caption, setCaption] = useState(FB_COPY_ENTRIES[0].captions.facebook);
  const [background, setBackground] = useState<PreviewBackground>("feed");
  const [showMobile, setShowMobile] = useState(true);
  const [render, setRender] = useState<FbRender | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [upload, setUpload] = useState<{ name: string; note: string; ok: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const entries = useMemo(
    () => FB_COPY_ENTRIES.filter((entry) => entry.category === category),
    [category],
  );
  const entry: FbCopyEntry = FB_COPY_ENTRIES.find((item) => item.id === entryId) ?? entries[0] ?? FB_COPY_ENTRIES[0];
  const layout = FB_LAYOUT_MAP[entry.layout];

  // Category switch lands on that category's first entry.
  useEffect(() => {
    if (!entries.some((item) => item.id === entryId) && entries[0]) {
      setEntryId(entries[0].id);
    }
  }, [entries, entryId]);

  // An entry switch replaces theme and caption, but keeps the chosen artwork:
  // the photographer's upload is the person's work, not the library's.
  const selectEntry = (nextId: string) => {
    const next = FB_COPY_ENTRIES.find((item) => item.id === nextId);
    if (!next) return;
    setEntryId(nextId);
    setTheme(next.theme);
    setCaption(next.captions[platform]);
    setUpload(null);
  };

  useEffect(() => {
    setCaption(entry.captions[platform]);
  }, [entry, platform]);

  const brandVersion = useBrandPlacementVersion();

  const draw = useCallback(async () => {
    setRendering(true);
    setRenderError("");
    try {
      const result = await renderFbCreative({
        layout: entry.layout,
        themeKey: theme,
        style: styleFor(entry.category),
        content: entry.content,
        art,
        scale: Math.min(1, 720 / layout.width),
      });
      setRender(result);
    } catch (error) {
      setRender(null);
      setRenderError(error instanceof Error ? error.message : "The preview could not be rendered.");
    } finally {
      setRendering(false);
    }
  }, [entry, theme, art, layout.width, brandVersion]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const audit = useMemo(
    () => (render ? auditLegibility(render.typography, layout.auditWidth, layout.mobileWidth) : null),
    [render, layout],
  );
  const text = useMemo(() => validateCaption(caption, [platform]), [caption, platform]);
  const fullCaption = useMemo(() => composePost(caption, entry, platform), [caption, entry, platform]);
  const publishCaptions = useMemo(
    () => ({
      facebook: composePost(platform === "facebook" ? caption : entry.captions.facebook, entry, "facebook"),
      instagram: composePost(platform === "instagram" ? caption : entry.captions.instagram, entry, "instagram"),
    }),
    [caption, entry, platform],
  );
  const composedText = useMemo(() => validateCaption(fullCaption, [platform]), [fullCaption, platform]);

  const onUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const validation = await validateImageFile(file, [platform]);
      const blocking = validation.issues.filter((issue) => issue.severity === "error");
      if (blocking.length) {
        setUpload({ name: file.name, note: blocking.map((issue) => issue.message).join(" "), ok: false });
        toast(blocking[0].message, "error");
        return;
      }
      const prepared = await prepareImage(file, validation);
      const src = await fileToImageSource(prepared);
      setArt(src);
      const meta = validation.meta!;
      setUpload({
        name: file.name,
        ok: true,
        note: `${meta.kind.toUpperCase()} ${meta.width} × ${meta.height}${prepared !== file ? ` · converted to ${validation.uploadMime}` : ""}`,
      });
    } catch (error) {
      setUpload({ name: file.name, note: error instanceof Error ? error.message : "That file could not be read.", ok: false });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportPng = async () => {
    try {
      const full = await renderFbCreative({
        layout: entry.layout,
        themeKey: theme,
        style: styleFor(entry.category),
        content: entry.content,
        art,
        scale: 1,
      });
      const name = `astrosivam_${entry.id}_${layout.width}x${layout.height}.png`;
      await downloadCanvas(full.canvas, name, {
        formatId: `fb-${entry.layout}`,
        caption: fullCaption,
      });
      toast(`Exported ${layout.width} × ${layout.height} — no crop guides in the file.`);
    } catch {
      toast("Export failed. Try a smaller artwork file.", "error");
    }
  };

  const feedWidth = 500;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Panel>
          <SectionLabel right={<span className="text-[10px] text-[#A2937D]">{layout.width} × {layout.height}</span>}>
            Post library
          </SectionLabel>
          <Segmented
            label="Content category"
            value={category}
            onChange={(next) => setCategory(next)}
            options={FB_CATEGORIES.map((item) => ({
              value: item.id,
              label: item.label,
              count: FB_COPY_ENTRIES.filter((copy) => copy.category === item.id).length,
            }))}
          />
          <p className="mt-2 text-[10px] leading-relaxed text-[#A2937D]">
            {FB_CATEGORIES.find((item) => item.id === category)?.note}
          </p>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {entries.map((item) => {
              const active = item.id === entry.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectEntry(item.id)}
                  aria-pressed={active}
                  className={`choice flex flex-col gap-0.5 px-2.5 py-2 text-left ${active ? "choice-active" : ""}`}
                >
                  <span className="text-[11px] font-medium text-cream">{item.label}</span>
                  <span className="truncate text-[9.5px] text-[#A2937D]">
                    {FB_LAYOUT_MAP[item.layout].name} · {item.content.kicker}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel padded={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-cream">
              <Eye className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> Feed preview
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Preview background"
                value={background}
                onChange={setBackground}
                options={[
                  { value: "feed", label: "Feed" },
                  { value: "checker", label: "Crop" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </div>
          </div>

          <div
            className={`px-3 py-4 ${background === "feed" ? "bg-[#121011]" : background === "checker" ? "checker" : "bg-[#050505]"}`}
          >
            <div className="mx-auto" style={{ maxWidth: `${feedWidth}px` }}>
              {/* Facebook feed card: avatar, page name, time, then the image. */}
              <div className="overflow-hidden rounded-lg bg-[#1c1b1d] shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#24060F] ring-1 ring-[rgba(199,154,60,0.35)]">
                    <span className="font-display text-[10px] text-gold-soft">AS</span>
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-[#E4E6EB]">Astro Sivam | Vedic Astrology</div>
                    <div className="text-[10px] text-[#B0B3B8]">Just now · 🌐</div>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 text-[#B0B3B8]" aria-hidden="true" />
                </div>
                <div className="px-3 pb-2 text-[12px] leading-[1.35] text-[#E4E6EB]">
                  <p className="whitespace-pre-line">
                    {(() => {
                      const first = caption.split("\n")[0] ?? "";
                      return first.length > 125 ? `${first.slice(0, 125)}…` : first;
                    })()}
                  </p>
                  {caption.split("\n").length > 1 || caption.length > 125 ? (
                    <span className="text-[#B0B3B8]">See more</span>
                  ) : null}
                </div>

                {rendering && !render ? (
                  <div className="aspect-[4/5] w-full animate-pulse bg-[#2a282b]" role="status">
                    <span className="sr-only">Rendering the creative</span>
                  </div>
                ) : render ? (
                  <div role="img" aria-label={`${entry.label} preview at ${layout.width} by ${layout.height} pixels`}>
                    <Blit source={render.canvas} />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center bg-[#2a282b] p-6 text-center text-[11px] text-[#B0B3B8]">
                    {renderError || "No preview"}
                  </div>
                )}

                <div className="flex items-center justify-between px-3 py-2 text-[10px] text-[#B0B3B8]">
                  <span>👍❤️😊 124</span>
                  <span>3 comments · 11 shares</span>
                </div>
              </div>
              <p className="mt-1.5 text-center text-[9px] text-[#8A7D6B]">
                Community reactions shown are placeholder chrome, not fetched from Meta.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
            <span className="text-[10px] text-[#A2937D]">
              {layout.crop === "circle" ? "Circular crop" : "Rectangular crop"} · shown at {layout.mobileWidth} px on a
              phone
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" size="sm" onClick={() => void exportPng()} icon={<Download className="h-3.5 w-3.5" />}>
                Export {layout.width} × {layout.height}
              </Button>
              <PublishCanvasButton
                render={async () => (await renderFbCreative({
                  layout: entry.layout,
                  themeKey: theme,
                  style: styleFor(entry.category),
                  content: entry.content,
                  art,
                  scale: 1,
                })).canvas}
                filename={`astrosivam_${entry.id}_${layout.width}x${layout.height}.png`}
                captions={publishCaptions}
                sourceLabel={`Facebook post studio · ${entry.label}`}
                label="Publish now"
              />
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <SectionLabel right={<Smartphone className="h-3.5 w-3.5 text-gold" />}>Mobile readability</SectionLabel>
            <p className="text-[10px] leading-relaxed text-[#A2937D]">{layout.cropNote}</p>
            {audit ? (
              <>
                <div className="mt-2.5 flex items-center justify-between rounded-lg border border-line-soft bg-wash px-3 py-2">
                  <span className="text-[10.5px] text-[#C7B9A3]">
                    Smallest headline at {audit.mobileWidth} px
                  </span>
                  <span className={`text-[12px] font-semibold ${audit.passes ? "text-jade" : "text-[#E0B48C]"}`}>
                    {audit.smallestHeadline} px
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {audit.findings.slice(0, 6).map((finding, index) => (
                    <div key={`${finding.role}-${index}`} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="min-w-0 truncate text-[#A2937D]">
                        <span className="uppercase tracking-[0.1em]">{finding.role}</span> · {finding.text}
                      </span>
                      <span className={finding.passes ? "text-jade" : "text-[#E0B48C]"}>
                        {finding.effective} / {finding.minimum}
                      </span>
                    </div>
                  ))}
                </div>
                <Callout tone={audit.passes ? "quiet" : "warn"}>
                  {audit.passes
                    ? "Every line of type clears the mobile floor for its role."
                    : `Below the mobile floor: ${audit.failing.map((finding) => finding.role).join(", ")}. Increase the size or move that line into the safe area.`}
                </Callout>
              </>
            ) : (
              <div className="skeleton mt-2 h-20 w-full rounded-lg" />
            )}
            <div className="mt-3 flex items-center gap-2">
              <input
                id="safe-toggle"
                type="checkbox"
                checked={showMobile}
                onChange={(event) => setShowMobile(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#c79a3c]"
              />
              <label htmlFor="safe-toggle" className="text-[10.5px] text-[#B4A58F]">
                Show this creative at the size a phone actually renders it
              </label>
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<ImageIcon className="h-3.5 w-3.5 text-gold" />}>Artwork</SectionLabel>
            <div className="grid grid-cols-6 gap-1.5">
              {DEITIES.slice(0, 12).map((deity) => (
                <button
                  key={deity.key}
                  type="button"
                  onClick={() => {
                    setArt(deity.file);
                    setUpload(null);
                  }}
                  aria-pressed={art === deity.file}
                  aria-label={deity.name}
                  className={`choice overflow-hidden p-0 ${art === deity.file ? "choice-active" : ""}`}
                >
                  <img src={deity.thumb} alt="" loading="lazy" decoding="async" className="h-10 w-full object-cover" />
                </button>
              ))}
            </div>

            <label
              htmlFor="fb-art-upload"
              className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2.5 text-[10.5px] text-[#C7B9A3] transition-colors hover:border-[rgba(216,177,100,0.55)]"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
              {uploading ? "Checking the file…" : "Upload artwork"}
            </label>
            <input
              ref={fileRef}
              id="fb-art-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/bmp,image/tiff"
              className="sr-only"
              onChange={(event) => void onUpload(event.target.files?.[0])}
            />
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#A2937D]">
              JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP and TIFF are read from the file's own bytes. Anything outside the
              accepted formats is converted before it reaches Meta.
            </p>
            {upload ? (
              <div className={`mt-2 rounded-lg border px-2.5 py-2 text-[10px] leading-relaxed ${upload.ok ? "border-[rgba(143,191,165,0.28)] text-[#C7E5D5]" : "border-[rgba(216,130,111,0.3)] text-[#F0C3A2]"}`}>
                <span className="font-semibold">{upload.ok ? "Accepted" : "Rejected"}</span> · {upload.name} — {upload.note}
              </div>
            ) : null}
            {art ? (
              <button
                type="button"
                onClick={() => setArt(null)}
                className="mt-2 text-[10px] text-[#C7B9A3] underline decoration-[#948772] underline-offset-4 hover:text-cream"
              >
                Remove artwork
              </button>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Select
                label="Theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemeKey)}
                hint="Palette only — the composition stays with the category."
              >
                {THEME_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </Select>
              <div>
                <span className="label">Artwork source</span>
                <div className="mt-1 rounded-lg border border-line-soft bg-wash px-2.5 py-2 text-[10px] text-[#B4A58F]">
                  {art ? (art.startsWith("data:") || art.startsWith("blob:") ? "Your upload" : art.split("/").pop()) : "No art — motif fallback"}
                </div>
              </div>
            </div>

            {showMobile && render ? (
              <div className="mt-3 rounded-lg border border-line-soft bg-[#121011] p-3">
                <div
                  className="mx-auto max-w-full overflow-hidden"
                  style={{ width: Math.min(layout.mobileWidth, 360) }}
                  aria-hidden="true"
                >
                  {/* Drawn at exactly the feed width in CSS px from the full-resolution
                      canvas, so this is the size a phone renders — not a shrunk thumbnail. */}
                  <Blit source={render.canvas} width={layout.mobileWidth} />
                </div>
                <p className="mt-1.5 text-center text-[9px] text-[#8A7D6B]">
                  {layout.mobileWidth} px wide — what a phone feed actually shows
                </p>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>

      <div className="space-y-4">
        <Panel>
          <SectionLabel
            right={
              <Segmented
                label="Preview for"
                value={platform}
                onChange={setPlatform}
                options={[
                  { value: "facebook", label: <Facebook className="h-3 w-3" aria-hidden="true" /> },
                  { value: "instagram", label: "IG" },
                ]}
              />
            }
          >
            Caption
          </SectionLabel>
          <Textarea
            label={`${platform === "facebook" ? "Facebook" : "Instagram"} caption`}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={9}
            maxLength={platform === "instagram" ? 2200 : 5000}
            hint={`${Array.from(caption).length} / ${platform === "instagram" ? 2200 : 5000} characters · first line ${text.hookLength}`}
          />

          <div className="mt-2 space-y-1">
            {text.issues.map((issue) => (
              <div
                key={issue.code}
                className={`flex items-start gap-1.5 text-[10px] leading-relaxed ${issue.severity === "error" ? "text-[#F0C3A2]" : "text-[#E0D4C0]"}`}
              >
                {issue.severity === "error" ? (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                )}
                <span>
                  {issue.message}
                  {issue.fix ? <span className="block text-[#A2937D]">{issue.fix}</span> : null}
                </span>
              </div>
            ))}
            {text.issues.length === 0 ? (
              <div className="flex items-center gap-1.5 text-[10px] text-jade">
                <Check className="h-3 w-3" aria-hidden="true" /> Caption fits {platform === "instagram" ? "Instagram" : "Facebook"}{" "}
                and opens in the first 125 characters.
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={caption} label="Copy caption" compact />
            <CopyButton text={fullCaption} label="Copy with hashtags" compact />
          </div>
        </Panel>

        <Panel>
          <SectionLabel
            right={
              <span className="inline-flex items-center gap-1 text-[10px] text-[#A2937D]">
                <Hash className="h-3 w-3" aria-hidden="true" /> {composedText.hashtagCount}/{composedText.hashtagLimit}
              </span>
            }
          >
            Hashtags
          </SectionLabel>
          {(["core", "local", "service"] as const).map((group) => (
            <div key={group} className="mb-2">
              <div className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#A2937D]">{group}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {entry.hashtags[group].map((tag) => (
                  <CopyButton key={tag} text={tag} label={tag} compact />
                ))}
              </div>
            </div>
          ))}
          <Callout tone="quiet">
            Meta recommends 3–5 hashtags. The library keeps {entry.hashtags.service.length + entry.hashtags.core.length} in
            the caption and leaves the rest for the first comment.
          </Callout>
        </Panel>

        <Panel>
          <SectionLabel right={<MessageSquare className="h-3.5 w-3.5 text-gold" />}>Call to action</SectionLabel>
          <div className="space-y-2">
            <div className="rounded-lg border border-line-soft bg-wash px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.14em] text-[#A2937D]">Button text</div>
              <div className="text-[11.5px] font-medium text-cream">{entry.cta.line}</div>
            </div>
            <div className="rounded-lg border border-line-soft bg-wash px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.14em] text-[#A2937D]">Link</div>
              <div className="break-all text-[11px] text-gold-soft">{entry.cta.url}</div>
            </div>
            <div className="rounded-lg border border-line-soft bg-wash px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.14em] text-[#A2937D]">Messenger quick reply</div>
              <div className="text-[11px] text-[#C7B9A3]">{entry.cta.quickReply}</div>
            </div>
            <CopyButton text={entry.cta.url} label="Copy link" compact />
          </div>
        </Panel>

        <Panel>
          <SectionLabel right={<RefreshCw className="h-3.5 w-3.5 text-gold" />}>Before you publish</SectionLabel>
          <ul className="space-y-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
              Tap Publish now beside the preview to post this exact full-resolution render immediately; no download or attachment step is needed.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
              {platform === "instagram"
                ? "Instagram accepts JPEG only; the publisher converts automatically."
                : "Facebook accepts JPEG and PNG directly."}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
              Never claim an outcome. The caption validator flags guarantee language before it reaches Meta.
            </li>
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyButton text={composePost(caption, entry, "facebook")} label="Copy FB post" compact />
            <CopyButton text={composePost(caption, entry, "instagram")} label="Copy IG post" compact />
          </div>
          <p className="mt-2 text-[9.5px] text-[#948772]">
            Publish now sends this image with its separate platform captions/hashtags after validation; no review click or schedule is involved.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/** Each content category gets its own art direction, matching the renderer. */
function styleFor(category: FbCategory) {
  switch (category) {
    case "festival":
      return "deepam" as const;
    case "educational":
      return "mono" as const;
    case "trust":
      return "signature" as const;
    default:
      return "gopuram" as const;
  }
}
