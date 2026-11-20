import React from "react";
import { Check, Download, Globe, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  BOILERPLATES,
  BRAND,
  BRAND_COLORS,
  LOGO_RULES,
  SAY_THIS,
  SEASONAL_NOTES,
  STYLES,
  THEMES,
  TYPOGRAPHY,
  VOICE_PRINCIPLES,
} from "../data/brand";
import { FORMATS } from "../data/formats";
import { getService } from "../data/services";
import { defaultContent } from "../lib/templates";
import { CreativeCanvas } from "./CreativeCanvas";
import { DesignSystem } from "./DesignSystem";
import { LogoLockupStudio } from "./LogoLockupStudio";
import { Callout, CopyButton, ExternalLink, PageHeader, Panel, PreviewFrame, SectionLabel } from "./ui";
import {
  BRAND_POSITIONS,
  BRAND_SCALE_MAX,
  BRAND_SCALE_MIN,
  DEFAULT_BRAND_PLACEMENT,
  getBrandPlacement,
  setBrandPlacement,
  type BrandPosition,
} from "../lib/brandPlacement";

const profileFormat = FORMATS.find((format) => format.id === "fb-profile")!;
const coverFormat = FORMATS.find((format) => format.id === "fb-cover")!;
const storyFormat = FORMATS.find((format) => format.id === "ig-story")!;
const service = getService("jathagam");
const igPostFormat = FORMATS.find((format) => format.id === "ig-post")!;

const POSITION_CLASSES: Record<BrandPosition, string> = {
  "top-left": "items-start justify-start",
  "top-center": "items-start justify-center",
  "top-right": "items-start justify-end",
  "bottom-left": "items-end justify-start",
  "bottom-center": "items-end justify-center",
  "bottom-right": "items-end justify-end",
};

/**
 * The single place the lockup's corner and size are chosen. Every painter —
 * posts, stories, wishes, ads, covers — reads this setting while drawing.
 */
const GlobalLockupPanel: React.FC = () => {
  const [placement, setPlacement] = React.useState(getBrandPlacement);
  const update = (next: Partial<typeof placement>) => setPlacement(setBrandPlacement(next));

  return (
    <Panel>
      <SectionLabel right={<span className="chip chip-gold">Set once · applies everywhere</span>}>
        Lockup position &amp; size
      </SectionLabel>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A2937D]">Position</div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-[360px]">
            {BRAND_POSITIONS.map((option) => {
              const active = placement.position === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ position: option.id })}
                  className={`flex h-14 flex-col rounded-lg border p-1.5 transition-colors ${
                    active ? "border-[#E3CA99] bg-[#241A1C]" : "border-line bg-wash hover:border-[#6d5f4b]"
                  }`}
                >
                  <span className={`flex min-h-0 flex-1 ${POSITION_CLASSES[option.id]}`}>
                    <span className={`h-1.5 w-4 rounded-full ${active ? "bg-gold" : "bg-[#6d5f4b]"}`} aria-hidden="true" />
                  </span>
                  <span className={`mt-1 text-[9.5px] uppercase tracking-[0.1em] ${active ? "text-cream" : "text-[#A2937D]"}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#A2937D]" htmlFor="brand-lockup-scale">
            Size · {Math.round(placement.scale * 100)}%
          </label>
          <div className="mt-2 flex items-center gap-3 sm:max-w-[360px]">
            <input
              id="brand-lockup-scale"
              type="range"
              min={BRAND_SCALE_MIN}
              max={BRAND_SCALE_MAX}
              step={0.05}
              value={placement.scale}
              onChange={(event) => update({ scale: Number(event.target.value) })}
              className="h-1.5 w-full accent-[#E3CA99]"
            />
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              onClick={() => update({ ...DEFAULT_BRAND_PLACEMENT })}
            >
              Reset
            </button>
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
            One setting for the whole studio: every Instagram and Facebook post, story, reel cover, wish card, service
            ad and cover photo draws its mark + wordmark from this corner and scale — previews and exports alike. Wish
            cards keep the lockup below the toran. Saved on this device.
          </p>
        </div>

        <PreviewFrame className="lg:mt-6" label="Live preview · IG post" meta="1080 × 1350">
          <CreativeCanvas
            format={igPostFormat}
            themeKey="midnight"
            service={service}
            content={defaultContent(igPostFormat, service)}
            previewWidth={300}
          />
        </PreviewFrame>
      </div>
    </Panel>
  );
};

export const BrandSystem: React.FC = () => {
  return (
    <div>
      <PageHeader
        eyebrow="Brand & interface"
        title="One identity, two platforms, zero improvisation."
        description="The logo is gold on dark, the type is Cinzel and Plus Jakarta Sans, and the Tamil line always sits beneath the English headline. Everything in this suite follows these rules — including every exported file."
        actions={
          <>
            <a className="btn btn-ghost" href="/astrosivam_logo.png" download>
              <Download className="h-3.5 w-3.5" /> Logo PNG
            </a>
            <a className="btn btn-ghost" href="/astrosivam_og_image.jpg" download>
              <Download className="h-3.5 w-3.5" /> OG image
            </a>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel>
          <SectionLabel right={<span className="chip chip-gold">Official mark</span>}>Logo &amp; lockup</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-[#140F10]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(77,16,35,0.75),transparent_66%)]" aria-hidden="true" />
              <span className="brand-seal relative flex h-[52%] w-[52%] items-center justify-center rounded-2xl">
                <img src="/astrosivam_logo.png" alt="Astro Sivam official logo on the ivory seal" className="w-[76%] object-contain" />
              </span>
              <span className="absolute bottom-3 left-3 text-[9.5px] uppercase tracking-[0.18em] text-[#B4A58F]">
                Seal on charcoal
              </span>
            </div>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#E3CA99] bg-[#F7F1E4]">
              <img src="/astrosivam_logo.png" alt="Astro Sivam logo on warm ivory" className="w-[46%] object-contain" />
              <span className="absolute bottom-3 left-3 text-[9.5px] uppercase tracking-[0.18em] text-[#8a774f]">
                On warm ivory
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
            The supplied mark keeps its original file and square proportions. It is always placed on the ivory seal —
            never recoloured, cropped or stretched.
          </p>
          <LogoLockupStudio />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-jade">Do</div>
              <ul className="space-y-1.5">
                {LOGO_RULES.do.map((rule) => (
                  <li key={rule} className="flex gap-2 text-[11.5px] leading-relaxed text-[#C7B9A3]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-jade" /> {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D8826F]">Don&apos;t</div>
              <ul className="space-y-1.5">
                {LOGO_RULES.dont.map((rule) => (
                  <li key={rule} className="flex gap-2 text-[11.5px] leading-relaxed text-[#C7B9A3]">
                    <X className="mt-0.5 h-3 w-3 shrink-0 text-[#D8826F]" /> {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Callout title="The avatar test" tone="gold">
            Open any exported profile image, shrink it to 40px, and squint. If the sun–moon mark is still recognisable,
            it passes. That is why the wordmark sits low and the mark owns the centre.
          </Callout>
        </Panel>

        <Panel>
          <SectionLabel right={<span className="text-[10.5px] uppercase tracking-[0.14em] text-[#A2937D]">1080 × 1080</span>}>
            Profile avatar
          </SectionLabel>
          <PreviewFrame
            className="mx-auto max-w-[360px]"
            label="Profile photo"
            meta="1080 × 1080"
          >
            <CreativeCanvas
              format={profileFormat}
              themeKey="midnight"
              service={service}
              content={defaultContent(profileFormat, service)}
              previewWidth={360}
            />
          </PreviewFrame>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-wash p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">Minimum size</div>
              <div className="mt-1 font-display text-[15px] text-cream">320 × 320 px</div>
            </div>
            <div className="rounded-lg border border-line bg-wash p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">Upload</div>
              <div className="mt-1 font-display text-[15px] text-cream">1080 × 1080 px</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* global lockup placement */}
      <div className="mt-4">
        <GlobalLockupPanel />
      </div>

      {/* palette */}
      <div className="mt-8">
        <SectionLabel
          eyebrow="Brand colour"
          description="The five families the identity is built from. The exported artwork keeps its own print-safe palettes; this is the mark and the interface around it."
          right={<span className="text-[10.5px] uppercase tracking-[0.14em] text-[#A2937D]">Click to copy hex</span>}
        >
          One warm family
        </SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => navigator.clipboard?.writeText(color.hex)}
              className="card card-hover group overflow-hidden text-left"
            >
              <div className="h-20 w-full border-b border-line-soft" style={{ background: color.hex }} />
              <div className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-cream">{color.name}</span>
                  <span className="font-mono text-[10.5px] uppercase text-[#B4A58F]">{color.hex}</span>
                </div>
                <div className="mt-1 text-[10.5px] leading-relaxed text-[#A2937D]">{color.use}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* interface design system */}
      <div className="mt-12">
        <DesignSystem />
      </div>

      {/* type */}
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {TYPOGRAPHY.map((type) => (
          <Panel key={type.name}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{type.role}</span>
              <span className="text-[10px] text-[#A2937D]">{type.name}</span>
            </div>
            <div
              className={`mt-4 text-cream ${type.name === "Tiro Tamil" ? "font-tamil text-[22px]" : type.name === "Cinzel" ? "font-display text-[26px] leading-tight" : "text-[18px] font-medium leading-snug"}`}
              style={{ fontFamily: type.css }}
            >
              {type.sample}
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-[#B4A58F]">
              {type.rule}
            </p>
          </Panel>
        ))}
      </div>

      {/* design styles */}
      <div className="mt-8">
        <SectionLabel
          right={
            <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-[#A2937D]">
              <Sparkles className="h-3 w-3 text-gold" /> {STYLES.length} art directions · {Object.keys(THEMES).length} palettes
            </span>
          }
        >
          Design styles
        </SectionLabel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {STYLES.map((style) => {
            const theme = THEMES[style.defaultTheme];
            return (
              <Panel key={style.key} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{style.family}</div>
                    <div className="mt-1 font-display text-[15px] text-cream">{style.name}</div>
                  </div>
                  <div className="flex shrink-0 overflow-hidden rounded">
                    {theme.swatch.map((color) => (
                      <span key={color} className="h-8 w-2.5" style={{ background: color }} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-[#C7B9A3]">{style.description}</p>
                <div className="mt-3 space-y-1 border-t border-line pt-3 text-[10.5px] leading-relaxed text-[#A2937D]">
                  <div>
                    <span className="text-gold-soft">Ornaments</span> · {style.ornaments.join(", ")}
                  </div>
                  <div>
                    <span className="text-gold-soft">Best for</span> · {style.bestFor}
                  </div>
                  <div>
                    <span className="text-gold-soft">Palette</span> · {theme.name}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
        <Callout>
          One copy contract, six layouts. A post always carries a kicker, an English headline, the Tamil line, three
          detail chips and a CTA — so a service can move between styles without a single word changing. Prices stay in
          the catalogue and the captions, never on the artwork.
          Keep the signature gold system on profile photos, covers and pinned offers.
        </Callout>
      </div>

      {/* seasonal */}
      <div className="mt-8">
        <SectionLabel>Seasonal overlays</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SEASONAL_NOTES.map((note) => (
            <Panel key={note.title}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[13.5px] text-cream">{note.title}</span>
                <span className="chip chip-gold">Overlay</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#C7B9A3]">{note.body}</p>
            </Panel>
          ))}
        </div>
      </div>

      {/* voice */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionLabel>Voice principles</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {VOICE_PRINCIPLES.map((principle) => (
              <div key={principle.title} className="rounded-lg border border-line-soft bg-wash p-3.5">
                <div className="text-[12px] font-semibold text-cream">{principle.title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#B4A58F]">{principle.body}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Say this · never this</SectionLabel>
          <div className="space-y-2">
            {SAY_THIS.map((row) => (
              <div key={row.not} className="rounded-lg border border-line-soft bg-wash p-3">
                <div className="flex gap-2 text-[11.5px] leading-relaxed text-[#C7E5D5]">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-jade" />
                  {row.say}
                </div>
                <div className="mt-1.5 flex gap-2 text-[11px] leading-relaxed text-[#B9AAA4]">
                  <X className="mt-0.5 h-3 w-3 shrink-0 text-[#D8826F]" />
                  {row.not}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* identity + boilerplate */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel>
          <SectionLabel right={<Globe className="h-3.5 w-3.5 text-gold" />}>Handles &amp; naming</SectionLabel>
          <div className="rounded-lg border border-[rgba(199,154,62,0.2)] bg-[rgba(199,154,62,0.05)] p-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#B4A58F]">Recommended handle</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-display text-[19px] text-gold-soft">{BRAND.handle}</span>
              <CopyButton text={BRAND.handle} label="Copy" compact />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#C7B9A3]">
              Use the same handle on both platforms. Verify availability on Facebook and Instagram before you print or
              publish it anywhere.
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {BRAND.handleAlternates.map((handle) => (
              <div key={handle} className="flex items-center justify-between rounded-lg border border-line-soft px-3 py-2">
                <span className="text-[12px] text-[#DCCFBA]">{handle}</span>
                <CopyButton text={handle} label="Copy" compact />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-line pt-3 text-[11.5px] text-[#C7B9A3]">
            <div className="flex justify-between gap-3">
              <span className="text-[#A2937D]">Facebook name</span>
              <span className="text-right text-cream">{BRAND.fbPageName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#A2937D]">Instagram name</span>
              <span className="text-right text-cream">{BRAND.igName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#A2937D]">UGC tag</span>
              <span className="text-right text-gold-soft">{BRAND.ugcTag}</span>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Ready-to-paste boilerplates</SectionLabel>
          <div className="space-y-3">
            {BOILERPLATES.map((plate) => (
              <div key={plate.label} className="rounded-lg border border-line-soft bg-wash p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{plate.label}</span>
                  <CopyButton text={plate.text} label="Copy" compact />
                </div>
                <p className="text-[11.5px] leading-relaxed text-[#C7B9A3]">{plate.text}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* safe zones */}
      <div className="mt-8">
        <SectionLabel>Platform safe areas</SectionLabel>
        <div className="grid gap-3 lg:grid-cols-3">
          <Panel padded={false} className="overflow-hidden">
            <CreativeCanvas
              format={coverFormat}
              themeKey="midnight"
              service={service}
              content={defaultContent(coverFormat, service)}
              overlay
              previewWidth={640}
            />
            <div className="border-t border-line p-4">
              <div className="text-[12px] font-semibold text-cream">Facebook cover · 1640 × 624</div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#B4A58F]">
                Mobile shows a 640 × 360 centre crop. Keep the mark, wordmark and URL inside the dashed box.
              </p>
            </div>
          </Panel>
          <Panel padded={false} className="overflow-hidden">
            <div className="mx-auto max-w-[230px] bg-[#160F11]">
              <CreativeCanvas
                format={storyFormat}
                themeKey="saffron"
                service={getService("muhurtham")}
                content={defaultContent(storyFormat, getService("muhurtham"))}
                overlay
                previewWidth={230}
              />
            </div>
            <div className="border-t border-line p-4">
              <div className="text-[12px] font-semibold text-cream">Story · 1080 × 1920</div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#B4A58F]">
                The top 250px and bottom 320px carry platform UI. The CTA sits above 1600px.
              </p>
            </div>
          </Panel>
          <Panel>
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Export rules
                </div>
                <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-[#C7B9A3]">
                  <li>PNG, sRGB, no transparency unless the platform needs it.</li>
                  <li>Text never below 13px at final resolution.</li>
                  <li>One idea per creative; no paragraph dumps.</li>
                  <li>Keep the gold frame 26px from the edge.</li>
                  <li>Never stretch a 1:1 into 9:16 — export the native size.</li>
                </ul>
              </div>
              <div className="mt-4 rounded-lg border border-[rgba(143,191,165,0.2)] bg-[rgba(143,191,165,0.05)] p-3 text-[11px] leading-relaxed text-[#A8C6B6]">
                The Creative Studio draws every file at native resolution, so there is no upscaling anywhere in this pack.
              </div>
            </div>
          </Panel>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[#B4A58F]">
          <ExternalLink href={BRAND.url}>{BRAND.website}</ExternalLink>
        </div>
      </div>
    </div>
  );
};
