import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Facebook,
  Film,
  Hash,
  ImageDown,
  Instagram,
  Layers,
  LayoutGrid,
  Link2,
  MessageCircle,
  Palette,
  Sparkles,
} from "lucide-react";
import { FORMAT_MAP } from "../data/formats";
import { SERVICES } from "../data/services";
import { HERITAGE_STYLES, MODERN_STYLES, STYLES, STYLE_MAP, STYLE_TAG_SETS, THEMES } from "../data/brand";
import { buildMix, type MixKind } from "../data/hashtags";
import type { CreativeContent, DownloadFile, Service, StyleKey } from "../types";
import { defaultContent, renderCreative } from "../lib/templates";
import { fbCaption, fullIgCaption, igCaption } from "../lib/pack";
import { canvasToBytesAndRelease, downloadCanvas, downloadZip, slugify } from "../lib/export";
import { servicePublishCaptions } from "../lib/publishCaptions";
import { CreativeCanvas } from "./CreativeCanvas";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { ServiceAds } from "./ServiceAds";
import { Button, Callout, CopyButton, ExternalLink, PageHeader, Panel, PillTabs, SectionLabel, useToast } from "./ui";
import { ScriptText } from "./ScriptText";

interface Props {
  onNavigate: (section: string) => void;
}

const TABS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "carousel", label: "Carousel" },
  { id: "reel", label: "Reel" },
  { id: "stories", label: "Stories" },
  { id: "hashtags", label: "Hashtags" },
  { id: "ads", label: "Ads" },
  { id: "brief", label: "Brief" },
];

const FORMAT_OPTIONS = [
  { id: "ig-post", label: "4:5 feed", note: "1080 × 1350" },
  { id: "ig-square", label: "1:1 square", note: "1080 × 1080" },
  { id: "fb-post", label: "FB 4:5", note: "1200 × 1500" },
] as const;

type PostFormatId = (typeof FORMAT_OPTIONS)[number]["id"];

const MIX_KINDS: Array<{ id: MixKind; label: string; note: string }> = [
  { id: "instagram", label: "IG feed · 15", note: "The default set" },
  { id: "niche", label: "IG niche · 12", note: "Highest intent" },
  { id: "full", label: "IG max · 30", note: "Pillar posts only" },
  { id: "reel", label: "Reels · 8", note: "Precise" },
  { id: "facebook", label: "Facebook · 5", note: "Clean" },
  { id: "story", label: "Stories · 4", note: "Local" },
];

/** The system a service is published in by default — one heritage anchor per service. */
const DEFAULT_STYLE: Record<string, StyleKey> = {
  jathagam: "signature",
  marriage: "silk",
  "baby-naming": "kolam",
  muhurtham: "gopuram",
  panchangam: "kolam",
  transits: "ephemeris",
  trust: "aurum",
};

const storyContent = (service: Service, index: number): CreativeContent => {
  const frame = service.stories[index];
  return {
    ...service.creative,
    kicker: `Story ${index + 1} of ${service.stories.length}`,
    headline: frame.title,
    subline: frame.body,
    tamil: "",
    chips: [frame.sticker],
    cta: service.creative.cta,
  };
};

const fileFor = (service: Service, style: StyleKey, formatId: string) =>
  `astrosivam_${slugify(service.id)}_${style}_${formatId}.png`;

export const ServicePosts: React.FC<Props> = ({ onNavigate }) => {
  const toast = useToast();
  const [serviceId, setServiceId] = useState("jathagam");
  const [tab, setTab] = useState("facebook");
  const [storyIndex, setStoryIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [style, setStyle] = useState<StyleKey>("signature");
  const [formatId, setFormatId] = useState<PostFormatId>("ig-post");
  const [busy, setBusy] = useState<string | null>(null);

  const service = SERVICES.find((item) => item.id === serviceId) ?? SERVICES[0];
  const format = FORMAT_MAP[formatId];
  const carouselFormat = FORMAT_MAP["ig-carousel"];
  const storyFormat = FORMAT_MAP["ig-story"];
  const reelFormat = FORMAT_MAP["ig-reel-cover"];
  const content = useMemo(() => defaultContent(format, service), [format, service]);
  const styleMeta = STYLE_MAP[style];
  const theme = THEMES[styleMeta.defaultTheme];

  const pickService = (id: string) => {
    setServiceId(id);
    setStoryIndex(0);
    setCarouselIndex(0);
    setStyle(DEFAULT_STYLE[id] ?? "signature");
  };

  const render = (key: StyleKey) => renderCreative({ format, style: key, service, content, scale: 1 });

  const downloadOne = async () => {
    setBusy("one");
    try {
      await downloadCanvas(await render(style), fileFor(service, style, formatId));
      toast(`Downloaded ${styleMeta.name} · ${format.width} × ${format.height}`);
    } catch {
      toast("Export failed — reload and try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy("all");
    try {
      const files: DownloadFile[] = [];
      for (const item of STYLES) {
        files.push({ name: fileFor(service, item.key, formatId), data: await canvasToBytesAndRelease(await render(item.key)) });
      }
      downloadZip(files, `astrosivam_${slugify(service.id)}_${formatId}_12-styles.zip`);
      toast(`Zipped ${files.length} art directions for ${service.shortName}`);
    } catch {
      toast("ZIP failed — export the styles one at a time.", "error");
    } finally {
      setBusy(null);
    }
  };

  const downloadSheet = async () => {
    setBusy("sheet");
    try {
      const sheet = FORMAT_MAP["style-sheet"];
      const canvas = await renderCreative({ format: sheet, style: "signature", service, content: defaultContent(sheet, service), scale: 1 });
      await downloadCanvas(canvas, `astrosivam_${slugify(service.id)}_style-sheet.png`);
      toast(`Downloaded contact sheet · ${sheet.width} × ${sheet.height}`);
    } catch {
      toast("Sheet export failed — reload and try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const styleChip = (item: (typeof STYLES)[number]) => {
    const active = item.key === style;
    const swatch = THEMES[item.defaultTheme].swatch;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => setStyle(item.key)}
        aria-pressed={active}
        title={item.tagline}
        className={`choice flex items-center gap-2 px-2 py-1.5 text-left ${active ? "choice-active" : ""}`}
      >
        <span className="flex h-5 w-5 shrink-0 overflow-hidden rounded-md ring-1 ring-line">
          {swatch.slice(0, 3).map((color) => (
            <span key={color} className="h-full flex-1" style={{ background: color }} />
          ))}
        </span>
        <span className="min-w-0">
          <span className={`block truncate text-[11px] font-semibold ${active ? "text-cream" : "text-[#C7B9A3]"}`}>{item.name}</span>
          <span className="block truncate text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">{item.composition}</span>
        </span>
      </button>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Service posts · 12 art directions"
        title="Seven services. One copy contract. Twelve ways to dress it."
        description="Pick a service, then dress the same kicker, headline, Tamil line, chips, price and CTA in any of the twelve art directions — six rooted in Tamil heritage, six modern. The copy is final; the artwork rotates."
        actions={
          <>
            <CopyButton text={fullIgCaption(service)} label="Copy IG caption" />
            <CopyButton text={fbCaption(service)} label="Copy FB caption" />
            <PublishCanvasButton
              render={() => render(style)}
              filename={fileFor(service, style, formatId)}
              captions={servicePublishCaptions(service, style)}
              sourceLabel={`${service.shortName} · ${styleMeta.name}`}
              disabled={busy !== null}
            />
            <Button variant="ghost" icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />} onClick={downloadOne} loading={busy === "one"} disabled={busy !== null}>
              Download creative
            </Button>
          </>
        }
      />

      {/* service switcher */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {SERVICES.map((item) => {
          const active = item.id === serviceId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => pickService(item.id)}
              aria-pressed={active}
              className={`choice flex flex-col gap-0.5 px-3 py-2.5 text-left ${active ? "choice-active" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`truncate text-[12px] font-semibold ${active ? "text-cream" : "text-[#C7B9A3]"}`}>{item.shortName}</span>
                {active ? <CheckCircle2 className="h-3 w-3 shrink-0 text-gold" aria-hidden="true" /> : null}
              </span>
              <span className="truncate font-tamil text-[10.5px] text-[#A2937D]">{item.tamilName}</span>
              <span className="truncate text-[9.5px] uppercase tracking-[0.1em] text-[#A2937D]">{item.price}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* ------------------------------ creative ------------------------------ */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-cream">{styleMeta.name}</span>
                <span className={`chip ${styleMeta.family === "Heritage" ? "chip-gold" : ""}`}>{styleMeta.family}</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#A2937D]">
                {format.width} × {format.height}
              </span>
            </div>
            <div className="checker p-3">
              <div className="mx-auto max-w-[360px] overflow-hidden rounded-md ring-1 ring-line">
                <CreativeCanvas format={format} themeKey={styleMeta.defaultTheme} style={style} service={service} content={content} previewWidth={720} />
              </div>
            </div>
            <div className="border-t border-line px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-[#B4A58F]">{styleMeta.tagline}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[#A2937D]">
                <span className="text-gold-soft">Best for:</span> {styleMeta.bestFor}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {FORMAT_OPTIONS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setFormatId(item.id)} aria-pressed={formatId === item.id} className={`chip ${formatId === item.id ? "chip-gold" : ""}`} title={item.note}>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <PublishCanvasButton
                  render={() => render(style)}
                  filename={fileFor(service, style, formatId)}
                  captions={servicePublishCaptions(service, style)}
                  sourceLabel={`${service.shortName} · ${styleMeta.name}`}
                  disabled={busy !== null}
                />
                <Button variant="ghost" size="sm" icon={<Download className="h-3 w-3" />} onClick={downloadOne} loading={busy === "one"} disabled={busy !== null}>
                  PNG
                </Button>
                <Button variant="ghost" size="sm" icon={<ImageDown className="h-3 w-3" />} onClick={downloadAll} loading={busy === "all"} disabled={busy !== null}>
                  All 12 · ZIP
                </Button>
                <Button variant="ghost" size="sm" icon={<LayoutGrid className="h-3 w-3" />} onClick={downloadSheet} loading={busy === "sheet"} disabled={busy !== null}>
                  Contact sheet
                </Button>
                <button type="button" className="copy-inline ml-auto" onClick={() => onNavigate("assets")}>
                  Edit copy <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </Panel>

          <Panel className="mt-3">
            <SectionLabel right={<span className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">{STYLES.length} systems</span>}>
              Art direction
            </SectionLabel>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold-soft">Heritage</div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">{HERITAGE_STYLES.map(styleChip)}</div>
            <div className="mt-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#9DB3D4]">Modern</div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">{MODERN_STYLES.map(styleChip)}</div>
            <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
              {STYLE_TAG_SETS[style].slice(0, 4).map((tag) => (
                <span key={tag} className="rounded border border-line px-1.5 py-0.5 text-[9.5px] text-[#A2937D]">
                  {tag}
                </span>
              ))}
              <CopyButton text={STYLE_TAG_SETS[style].join(" ")} label="Copy style tags" compact />
            </div>
          </Panel>
        </div>

        {/* -------------------------------- copy -------------------------------- */}
        <div className="min-w-0">
          <Panel className="mb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip chip-gold">{service.badge}</span>
                  <span className="chip">{service.price}</span>
                  <span className="chip">{service.kind}</span>
                </div>
                <h2 className="mt-3 font-display text-[22px] text-cream">{service.name}</h2>
                <div className="font-tamil text-[13px] text-gold-soft/80">{service.tamilName}</div>
                <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[#C7B9A3]">{service.promise}</p>
              </div>
              <div className="shrink-0 space-y-2 text-[11px] text-[#B4A58F]">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gold" /> FB {service.bestTime.fb}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gold" /> IG {service.bestTime.ig}
                </div>
                <ExternalLink href={service.url}>{service.url.replace("https://", "")}</ExternalLink>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
              {service.deliverables.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-[11px] text-[#B4A58F]">
                  <span className="h-1 w-1 rounded-full bg-gold/70" />
                  {item}
                </span>
              ))}
            </div>
          </Panel>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <PillTabs items={TABS} value={tab} onChange={setTab} />
            <span className="text-[10.5px] uppercase tracking-[0.12em] text-[#A2937D]">
              {service.carousel.slides.length} slides · {service.stories.length} stories
            </span>
          </div>

          {tab === "facebook" ? (
            <Panel>
              <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{fbCaption(service).length} chars</span>}>Facebook caption</SectionLabel>
              <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-[rgba(157,179,212,0.22)] bg-[rgba(157,179,212,0.06)] px-3 py-2.5">
                <Facebook className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9DB3D4]" />
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#9DB3D4]">Opening line · shown first</div>
                  <div className="mt-1 text-[12.5px] font-medium leading-relaxed text-cream">{service.fb.hook}</div>
                </div>
              </div>
              <div className="whitespace-pre-wrap text-[12.5px] leading-[1.75] text-[#C7B9A3]">
                <ScriptText text={fbCaption(service)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <CopyButton text={fbCaption(service)} label="Copy caption" compact />
                <CopyButton text={service.fb.hashtags.join(" ")} label="Copy tags" compact />
                {service.fb.pinned ? <span className="chip chip-jade">Pin this post</span> : null}
                <span className="ml-auto text-[10.5px] text-[#A2937D]">Best time: {service.bestTime.fb} · export the creative as FB 4:5</span>
              </div>
            </Panel>
          ) : null}

          {tab === "instagram" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
              <Panel>
                <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{igCaption(service).length} / 2200 chars</span>}>Instagram caption</SectionLabel>
                <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-[rgba(208,168,184,0.22)] bg-[rgba(208,168,184,0.06)] px-3 py-2.5">
                  <Instagram className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D0A8B8]" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[#D0A8B8]">First {service.ig.hook.length} chars before “more”</div>
                    <div className="mt-1 text-[12.5px] font-medium leading-relaxed text-cream">{service.ig.hook}</div>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-[12.5px] leading-[1.75] text-[#C7B9A3]">
                  <ScriptText text={igCaption(service)} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <CopyButton text={igCaption(service)} label="Copy caption" compact />
                  <CopyButton text={fullIgCaption(service)} label="Copy + 30 tags" compact />
                  <CopyButton text={service.ig.firstComment} label="Copy first comment" compact />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-line-soft bg-wash p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">First comment</div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#C7B9A3]">{service.ig.firstComment}</p>
                  </div>
                  <div className="rounded-lg border border-line-soft bg-wash p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Alt text</div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#C7B9A3]">{service.altText}</p>
                  </div>
                </div>
              </Panel>
              <div className="rounded-xl border border-line bg-wash p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Caption structure</div>
                <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[#B4A58F]">
                  <li>1. Hook — a specific claim, never a greeting.</li>
                  <li>2. Proof — the method, the review, the timing.</li>
                  <li>3. Offer — price, free report, what is included.</li>
                  <li>4. CTA — “link in bio”, one action only.</li>
                  <li>5. Hashtags — 15 recommended, 30 maximum.</li>
                </ol>
                <div className="mt-3 border-t border-line pt-3 text-[10.5px] leading-relaxed text-[#A2937D]">
                  Add the two style tags for <span className="text-gold-soft">{styleMeta.name}</span> to the service set — never more than twelve tags on a non-pillar post.
                </div>
              </div>
            </div>
          ) : null}

          {tab === "carousel" ? (
            <div className="space-y-4">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Carousel</div>
                    <h3 className="mt-1 font-display text-[19px] text-cream">{service.carousel.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton text={service.carousel.slides.map((slide, index) => `${index + 1}. ${slide.headline}\n${slide.body}`).join("\n\n")} label="Copy script" />
                    <Button variant="gold" icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => onNavigate("assets")}>
                      Export {service.carousel.slides.length} slides
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-7">
                  {service.carousel.slides.map((slide, index) => (
                    <button key={slide.headline} type="button" onClick={() => setCarouselIndex(index)} aria-pressed={carouselIndex === index} className={`choice overflow-hidden p-0 text-left ${carouselIndex === index ? "choice-active" : ""}`}>
                      <CreativeCanvas format={carouselFormat} themeKey={service.theme} service={service} content={defaultContent(carouselFormat, service)} slideIndex={index} previewWidth={150} />
                    </button>
                  ))}
                </div>
              </Panel>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-3 md:grid-cols-2">
                  {service.carousel.slides.map((slide, index) => (
                    <button key={slide.headline} type="button" onClick={() => setCarouselIndex(index)} className={`rounded-xl border p-3.5 text-left transition ${carouselIndex === index ? "border-gold/50 bg-[rgba(199,154,62,0.06)]" : "border-line bg-wash"}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[11px] text-gold-soft">{String(index + 1).padStart(2, "0")}</span>
                        <span className="text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">{slide.kicker}</span>
                      </div>
                      <div className="mt-1.5 font-display text-[14px] leading-snug text-cream">{slide.headline}</div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#B4A58F]">{slide.body}</p>
                    </button>
                  ))}
                </div>
                <Panel padded={false} className="overflow-hidden self-start lg:sticky lg:top-4">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <span className="text-[11px] font-semibold text-cream">Slide {carouselIndex + 1} of {service.carousel.slides.length}</span>
                    <div className="flex gap-1">
                      {service.carousel.slides.map((slide, index) => (
                        <button key={slide.headline} type="button" onClick={() => setCarouselIndex(index)} className={`h-1.5 w-4 rounded-full ${carouselIndex === index ? "bg-gold" : "bg-track"}`} aria-label={`Slide ${index + 1}`} />
                      ))}
                    </div>
                  </div>
                  <div className="checker p-3">
                    <div className="mx-auto max-w-[330px] overflow-hidden rounded-md ring-1 ring-line">
                      <CreativeCanvas format={carouselFormat} themeKey={service.theme} service={service} content={defaultContent(carouselFormat, service)} slideIndex={carouselIndex} previewWidth={660} />
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          ) : null}

          {tab === "reel" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <Panel>
                <SectionLabel right={<span className="chip chip-gold">{service.reel.duration}</span>}>Reel script</SectionLabel>
                <h3 className="font-display text-[18px] leading-snug text-cream">{service.reel.title}</h3>
                <div className="mt-3 rounded-lg border border-[rgba(199,154,62,0.22)] bg-[rgba(199,154,62,0.05)] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Hook · first 3 seconds</div>
                  <div className="mt-1 font-display text-[16px] leading-snug text-cream">{service.reel.hook}</div>
                </div>
                <div className="mt-4 space-y-2">
                  {service.reel.beats.map((beat, index) => (
                    <div key={beat} className="flex gap-3 rounded-lg border border-line-soft bg-wash px-3 py-2.5">
                      <span className="mt-0.5 font-display text-[11px] text-gold-soft">{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-[11.5px] leading-relaxed text-[#C7B9A3]">{beat}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-line p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">On-screen text</div>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-[#C7B9A3]">
                      {service.reel.onScreen.map((line) => (
                        <li key={line}>· {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-line p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Audio &amp; delivery</div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#C7B9A3]">{service.reel.audio}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[11px] text-[#B4A58F]">{service.reel.cta}</span>
                  <CopyButton text={[service.reel.title, "", `Hook: ${service.reel.hook}`, "", ...service.reel.beats, "", `CTA: ${service.reel.cta}`].join("\n")} label="Copy script" compact />
                </div>
              </Panel>
              <div>
                <Panel padded={false} className="overflow-hidden">
                  <CreativeCanvas format={reelFormat} themeKey={service.theme} service={service} content={defaultContent(reelFormat, service)} previewWidth={300} />
                  <div className="border-t border-line px-3 py-2 text-[10.5px] text-[#B4A58F]">1080 × 1920 · cover stays legible in the grid crop</div>
                </Panel>
                <div className="mt-3">
                  <Callout title="Reels rule">Never re-upload a file with a watermark from another app. Export the cover from the Asset Studio, film vertically, and keep every on-screen line inside the middle third.</Callout>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "stories" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-3">
                {service.stories.map((story, index) => (
                  <Panel key={story.title} className={storyIndex === index ? "ring-1 ring-gold/40" : ""}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Story {index + 1} of {service.stories.length}</div>
                        <div className="mt-1 font-display text-[16px] text-cream">{story.title}</div>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#C7B9A3]">{story.body}</p>
                      </div>
                      <button type="button" className="copy-inline shrink-0" onClick={() => setStoryIndex(index)}>
                        Preview
                      </button>
                    </div>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-[rgba(199,154,62,0.3)] bg-[rgba(199,154,62,0.08)] px-2.5 py-1 text-[10.5px] text-gold-soft">
                      <Sparkles className="h-3 w-3" /> {story.sticker}
                    </div>
                  </Panel>
                ))}
                <Panel>
                  <SectionLabel right={<span className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">Daily</span>}>Story rhythm</SectionLabel>
                  <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-[#C7B9A3]">
                    <li>· 6:30 AM — today&apos;s panchangam card and Rahu Kalam.</li>
                    <li>· 1:00 PM — one educational frame from the current carousel.</li>
                    <li>· 8:30 PM — a poll, question box or link sticker.</li>
                    <li>· Keep the brand mark out of the top 250px and bottom 320px.</li>
                  </ul>
                </Panel>
              </div>
              <div>
                <Panel padded={false} className="overflow-hidden">
                  <div className="checker p-4">
                    <div className="mx-auto max-w-[220px] overflow-hidden rounded-xl ring-1 ring-line">
                      <CreativeCanvas format={storyFormat} themeKey={service.theme} service={service} content={storyContent(service, storyIndex)} previewWidth={440} />
                    </div>
                  </div>
                  <div className="border-t border-line px-3 py-2 text-[10.5px] text-[#B4A58F]">Story {storyIndex + 1} · 1080 × 1920</div>
                </Panel>
                <div className="mt-3 space-y-2">
                  <CopyButton text={storyContent(service, storyIndex).headline} label="Copy story line" compact />
                  <CopyButton text={storyContent(service, storyIndex).subline} label="Copy story body" compact />
                </div>
              </div>
            </div>
          ) : null}

          {tab === "hashtags" ? (
            <div className="space-y-4">
              <Panel>
                <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{service.ig.hashtags.length + service.ig.extendedHashtags.length} tags for this service</span>}>
                  <span className="inline-flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-gold" /> Hashtag sets
                  </span>
                </SectionLabel>
                <div className="grid gap-3 md:grid-cols-2">
                  {MIX_KINDS.map((mix) => {
                    const tags = buildMix(service, mix.id);
                    return (
                      <div key={mix.id} className="rounded-xl border border-line bg-wash p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-cream">{mix.label}</span>
                          <CopyButton text={tags.join(" ")} label="Copy" compact />
                        </div>
                        <div className="mt-1 text-[10px] text-[#A2937D]">{mix.note} · {tags.length} tags</div>
                        <p className="mt-2 break-words text-[11px] leading-relaxed text-[#B4A58F]">{tags.join(" ")}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <CopyButton text={service.ig.firstComment} label="Copy first comment" compact />
                  <CopyButton text={service.altText} label="Copy alt text" compact />
                  <CopyButton text={STYLE_TAG_SETS[style].join(" ")} label={`Copy ${styleMeta.name} tags`} compact />
                  <button type="button" className="copy-inline" onClick={() => onNavigate("hashtags")}>
                    Open hashtag lab <ArrowRight className="h-3 w-3" />
                  </button>
                  <span className="ml-auto text-[10.5px] text-[#A2937D]">IG max 30 · FB 3–5 · rotate sets</span>
                </div>
              </Panel>
              <Panel>
                <SectionLabel>Extended set · for pillar posts only</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {service.ig.extendedHashtags.map((tag) => (
                    <span key={tag} className="rounded-md border border-line bg-wash px-2 py-1 text-[10.5px] text-[#B4A58F]">
                      {tag}
                    </span>
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}

          {tab === "ads" ? <ServiceAds service={service} /> : null}

          {tab === "brief" ? (
            <div className="space-y-4">
              <Panel>
                <SectionLabel right={<span className="chip chip-gold">{service.motif} motif</span>}>Art direction brief</SectionLabel>
                <p className="text-[12.5px] leading-relaxed text-[#C7B9A3]">{service.artDirection}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton text={service.artDirection} label="Copy prompt" compact />
                  <CopyButton text={service.creative.headline} label="Copy headline" compact />
                  <CopyButton text={`${styleMeta.name} — ${styleMeta.description}`} label={`Copy ${styleMeta.name} note`} compact />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-line p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Copy contract · every system</div>
                    <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-[#C7B9A3]">
                      <li>· Kicker, headline, Tamil line, one subline.</li>
                      <li>· Three detail chips, one price, one CTA.</li>
                      <li>· The service plate is the only illustration.</li>
                      <li>· Lockup top-left; contact line in the footer.</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-line p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">What to avoid</div>
                    <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-[#C7B9A3]">
                      <li>· Fear imagery: skulls, broken hearts, dark curses.</li>
                      <li>· Stock zodiac wheels and Western sun-sign art.</li>
                      <li>· More than three text sizes per creative.</li>
                      <li>· Paragraphs of copy inside the image.</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-line-soft bg-wash p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Metadata</div>
                  <div className="mt-2 grid gap-2 text-[11.5px] text-[#C7B9A3] sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3 w-3 text-gold" /> {service.url}
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3 w-3 text-gold" /> {service.kpi}
                    </div>
                    <div className="flex items-center gap-2">
                      <Instagram className="h-3 w-3 text-[#D0A8B8]" /> {service.bestTime.ig}
                    </div>
                    <div className="flex items-center gap-2">
                      <Facebook className="h-3 w-3 text-[#9DB3D4]" /> {service.bestTime.fb}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-[rgba(143,191,165,0.2)] bg-[rgba(143,191,165,0.05)] p-3.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#C7E5D5]">
                    <Film className="h-3 w-3" /> Proof line for captions
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#A8C6B6]">{service.proof}</p>
                </div>
              </Panel>

              <Panel>
                <SectionLabel right={<button type="button" className="copy-inline" onClick={() => onNavigate("styles")}>Open style engine <ArrowRight className="h-3 w-3" /></button>}>
                  {service.shortName} in all twelve systems
                </SectionLabel>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {STYLES.map((item, index) => (
                    <button key={item.key} type="button" onClick={() => setStyle(item.key)} aria-pressed={item.key === style} className={`choice overflow-hidden p-0 text-left ${item.key === style ? "choice-active" : ""}`}>
                      <CreativeCanvas format={FORMAT_MAP["ig-post"]} themeKey={item.defaultTheme} style={item.key} service={service} content={defaultContent(FORMAT_MAP["ig-post"], service)} previewWidth={300} />
                      <div className="px-2 py-1.5">
                        <div className="truncate text-[10px] font-semibold text-cream">
                          <span className="mr-1 text-gold">{String(index + 1).padStart(2, "0")}</span>
                          {item.name}
                        </div>
                        <div className="truncate text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">{item.family}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2 text-[10.5px] text-[#A2937D]">
            <Layers className="h-3 w-3 text-gold" />
            Palette {theme.name} · {styleMeta.ornaments.join(" · ")}
          </div>
        </div>
      </div>
    </div>
  );
};
