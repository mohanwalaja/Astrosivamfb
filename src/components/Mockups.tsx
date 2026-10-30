import React, { useState } from "react";
import {
  Bookmark,
  CheckCircle2,
  Clock,
  Facebook,
  Globe2,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { BRAND } from "../data/brand";
import { FORMATS } from "../data/formats";
import { getService } from "../data/services";
import { fbCaption, igCaption } from "../lib/pack";
import { defaultContent } from "../lib/templates";
import { CreativeCanvas } from "./CreativeCanvas";
import { CopyButton, PageHeader, Panel, SectionLabel, Segmented } from "./ui";
import { ScriptText } from "./ScriptText";
import { safeSlice } from "../lib/script";

const cover = FORMATS.find((format) => format.id === "fb-cover")!;
const profile = FORMATS.find((format) => format.id === "fb-profile")!;
const fbPost = FORMATS.find((format) => format.id === "fb-post")!;
const igPost = FORMATS.find((format) => format.id === "ig-post")!;
const panchangamCard = FORMATS.find((format) => format.id === "panchangam-card")!;

const jathagam = getService("jathagam");
const panchangam = getService("panchangam");

export const Mockups: React.FC = () => {
  const [platform, setPlatform] = useState<"facebook" | "instagram">("facebook");

  return (
    <div>
      <PageHeader
        eyebrow="In-context previews"
        title="See the page before you publish it."
        description="These previews are assembled from the same files the studio exports — not placeholder screenshots. Check the crop, the hierarchy and the caption length in context."
        actions={
          <Segmented
            label="Preview platform"
            value={platform}
            onChange={setPlatform}
            options={[
              {
                value: "facebook",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Facebook className="h-3 w-3" aria-hidden="true" /> Facebook
                  </span>
                ),
              },
              {
                value: "instagram",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Instagram className="h-3 w-3" aria-hidden="true" /> Instagram
                  </span>
                ),
              },
            ]}
          />
        }
      />

      {platform === "facebook" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-[#191314] px-4 py-2">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D8826F1f] ring-1 ring-[#D8826F]/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#C79A3C1f] ring-1 ring-[#C79A3C]/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#8FBFA51f] ring-1 ring-[#8FBFA5]/40" />
              </div>
              <div className="ml-2 flex-1 rounded-md border border-line bg-[#160F11] px-3 py-1 text-[10px] text-[#A2937D]">
                facebook.com/astrosivamofficial
              </div>
            </div>

            <div className="bg-[#1D1618]">
              <div className="relative">
                <CreativeCanvas
                  format={cover}
                  themeKey="midnight"
                  service={jathagam}
                  content={defaultContent(cover, jathagam)}
                  previewWidth={900}
                />
                <div className="absolute -bottom-12 left-5 sm:left-8">
                  <div className="h-[86px] w-[86px] overflow-hidden rounded-full border-[3px] border-[#1D1618] bg-[#160F11] sm:h-[112px] sm:w-[112px]">
                    <CreativeCanvas
                      format={profile}
                      themeKey="midnight"
                      service={jathagam}
                      content={defaultContent(profile, jathagam)}
                      previewWidth={224}
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 pb-4 pt-14 sm:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-[20px] leading-tight text-cream sm:text-[24px]">{BRAND.fbPageName}</h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#B4A58F]">
                      <span>Page · Astrologist</span>
                      <span className="inline-flex items-center gap-1 text-[#9DB3D4]">
                        <CheckCircle2 className="h-3 w-3" /> Professional account
                      </span>
                    </div>
                    <p className="mt-2 max-w-lg text-[11.5px] leading-relaxed text-[#C7B9A3]">{BRAND.tagline}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className="rounded-md bg-[#C79A3C] px-3 py-1.5 text-[11px] font-semibold text-[#241706]">
                      Following
                    </button>
                    <button type="button" className="rounded-md border border-line px-3 py-1.5 text-[11px] text-cream">
                      Message
                    </button>
                    <button type="button" className="rounded-md border border-line px-3 py-1.5 text-[11px] text-cream">
                      Book Now
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-[10.5px] text-[#B4A58F]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Chennai, Tamil Nadu
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Replies within 6 hours
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Globe2 className="h-3 w-3" /> astrosivam.com
                  </span>
                  <span className="text-gold-soft">Reviews · invite customers</span>
                </div>

                <div className="mt-2 flex gap-4 border-b border-line text-[11px] font-semibold" aria-label="Page tabs (preview)">
                  {["Posts", "About", "Reels", "Photos", "Services"].map((tab, index) => (
                    <button
                      key={tab}
                      type="button"
                      aria-pressed={index === 0}
                      tabIndex={index === 0 ? 0 : -1}
                      className={`relative py-2 ${index === 0 ? "text-cream" : "text-[#A2937D]"}`}
                    >
                      {tab}
                      {index === 0 ? <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gold" aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              {/* pinned post */}
              <div className="mx-3 mb-3 rounded-lg border border-line bg-[#191314] sm:mx-5">
                <div className="flex items-center gap-2 px-3.5 pt-3">
                  <div className="h-8 w-8 overflow-hidden rounded-full">
                    <CreativeCanvas
                      format={profile}
                      themeKey="midnight"
                      service={jathagam}
                      content={defaultContent(profile, jathagam)}
                      previewWidth={64}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-semibold text-cream">Astro Sivam</div>
                    <div className="text-[9.5px] text-[#A2937D]">Pinned post · 2 hrs · 🌐</div>
                  </div>
                  <MoreHorizontal className="ml-auto h-4 w-4 text-[#A2937D]" />
                </div>
                <p className="whitespace-pre-wrap px-3.5 pt-2 text-[11px] leading-relaxed text-[#C7B9A3]">
                  <ScriptText text={safeSlice(fbCaption(jathagam), 320)} />… <span className="text-[#B4A58F]">See more</span>
                </p>
                <div className="mt-2 px-3.5 pb-3">
                  <div className="overflow-hidden rounded-md border border-line-soft">
                    <CreativeCanvas
                      format={fbPost}
                      themeKey="midnight"
                      service={jathagam}
                      content={defaultContent(fbPost, jathagam)}
                      previewWidth={620}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-line-soft px-3.5 py-2 text-[10.5px] text-[#B4A58F]">
                  <span className="inline-flex items-center gap-1 text-[#9DB3D4]">
                    <ThumbsUp className="h-3 w-3" /> Customer feedback · with permission
                  </span>
                  <span>Comments · Share</span>
                </div>
                <div className="flex border-t border-line-soft text-[10.5px] text-[#B4A58F]">
                  {[
                    ["Like", ThumbsUp],
                    ["Comment", MessageCircle],
                    ["Share", Share2],
                  ].map(([label, Icon]) => {
                    const Component = Icon as React.ComponentType<{ className?: string }>;
                    return (
                      <button key={String(label)} type="button" className="flex flex-1 items-center justify-center gap-1.5 py-2">
                        <Component className="h-3.5 w-3.5" /> {String(label)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* daily panchangam post */}
              <div className="mx-3 mb-4 rounded-lg border border-line bg-[#191314] sm:mx-5">
                <div className="flex items-center gap-2 px-3.5 pt-3">
                  <div className="h-8 w-8 overflow-hidden rounded-full">
                    <CreativeCanvas
                      format={profile}
                      themeKey="midnight"
                      service={jathagam}
                      content={defaultContent(profile, jathagam)}
                      previewWidth={64}
                    />
                  </div>
                  <div>
                    <div className="text-[11.5px] font-semibold text-cream">Astro Sivam</div>
                    <div className="text-[9.5px] text-[#A2937D]">Today · 🌐</div>
                  </div>
                </div>
                <p className="px-3.5 pt-2 text-[11px] leading-relaxed text-[#C7B9A3]">
                  {panchangam.fb.hook} Tithi, nakshatra, Rahu Kalam and the auspicious windows — free, every morning.
                </p>
                <div className="mt-2 px-3.5 pb-3">
                  <div className="overflow-hidden rounded-md border border-line-soft">
                    <CreativeCanvas
                      format={panchangamCard}
                      themeKey="ivory"
                      service={panchangam}
                      content={defaultContent(panchangamCard, panchangam)}
                      previewWidth={620}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel>
              <SectionLabel>In-context checks</SectionLabel>
              <ul className="space-y-2 text-[11px] leading-relaxed text-[#C7B9A3]">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-jade" />
                  Cover text survives the mobile crop — the mark and wordmark sit inside the centre.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-jade" />
                  The avatar is legible at 86px with the orbit ring intact.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-jade" />
                  The pinned post leads with the promise, not the price.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                  Tighten the first line if it wraps past two lines on mobile.
                </li>
              </ul>
            </Panel>
            <Panel>
              <SectionLabel>Copy from this preview</SectionLabel>
              <div className="flex flex-col gap-2">
                <CopyButton text={fbCaption(jathagam)} label="Pinned post caption" />
                <CopyButton text={panchangam.fb.cta} label="Panchangam CTA" />
                <CopyButton text={BRAND.fbPageName} label="Page name" />
              </div>
            </Panel>
            <Panel>
              <SectionLabel>Real constraints</SectionLabel>
              <ul className="space-y-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
                <li>· Facebook shows ~125 characters before “See more”.</li>
                <li>· Mobile cover crops to 640 × 360.</li>
                <li>· Reviews can only be left by customers — never fake them.</li>
                <li>· Boosted posts must follow Meta&apos;s personal-attribute rules.</li>
              </ul>
            </Panel>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cream">
                <Instagram className="h-3.5 w-3.5 text-[#D0A8B8]" /> Feed post
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#A2937D]">390 px view</span>
            </div>
            <div className="mx-auto max-w-[340px] px-3 py-3">
              <div className="overflow-hidden rounded-[24px] border border-line bg-[#160F11]">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-[rgba(199,154,62,0.4)]">
                    <CreativeCanvas
                      format={profile}
                      themeKey="midnight"
                      service={jathagam}
                      content={defaultContent(profile, jathagam)}
                      previewWidth={64}
                    />
                  </div>
                  <div className="leading-tight">
                    <div className="text-[10.5px] font-semibold text-cream">astrosivamofficial</div>
                    <div className="text-[9px] text-[#A2937D]">Chennai, Tamil Nadu</div>
                  </div>
                  <span className="ml-1 text-[10px] text-[#B4A58F]">· Follow</span>
                  <MoreHorizontal className="ml-auto h-3.5 w-3.5 text-[#B4A58F]" />
                </div>

                <CreativeCanvas
                  format={igPost}
                  themeKey="midnight"
                  service={jathagam}
                  content={defaultContent(igPost, jathagam)}
                  previewWidth={340}
                />

                <div className="flex items-center gap-3 px-3 py-2">
                  <Heart className="h-4 w-4 text-cream" />
                  <MessageCircle className="h-4 w-4 text-cream" />
                  <Send className="h-4 w-4 text-cream" />
                  <Bookmark className="ml-auto h-4 w-4 text-cream" />
                </div>
                <div className="px-3 text-[10px] font-medium text-cream">Reviews · invite customers</div>
                <div className="px-3 pb-3 pt-1">
                  <p className="whitespace-pre-wrap text-[10px] leading-[1.55] text-[#DCCFBA]">
                    <span className="font-semibold text-cream">astrosivamofficial</span>{" "}
                    <ScriptText text={safeSlice(igCaption(jathagam), 280)} />…{" "}
                    <span className="text-[#A2937D]">more</span>
                  </p>
                  <p className="mt-1.5 text-[9.5px] text-[#B4A58F]">
                    {jathagam.ig.hashtags.slice(0, 5).join(" ")}{" "}
                    <span className="text-[#A2937D]">+10 more</span>
                  </p>
                  <div className="mt-2 border-t border-line-soft pt-1.5 text-[9.5px] text-[#A2937D]">
                    Add a comment…
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-[#B4A58F]">
              The hook must land inside the first 125 characters. Hashtags stay in the caption so the set is easy to
              audit.
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2">
            <Panel className="sm:col-span-2">
              <SectionLabel right={<CopyButton text={igCaption(jathagam)} label="Copy caption" compact />}>
                Why this works
              </SectionLabel>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line-soft p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Hook</div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#C7B9A3]">
                    “{jathagam.ig.hook}” — a specific claim, no greeting, no question mark.
                  </p>
                </div>
                <div className="rounded-lg border border-line-soft p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Proof</div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#C7B9A3]">
                    Lahiri method, priest review, 7-day chat — three concrete trust signals.
                  </p>
                </div>
                <div className="rounded-lg border border-line-soft p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">CTA</div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#C7B9A3]">
                    One action: link in bio. No “DM us or visit the site or comment”.
                  </p>
                </div>
              </div>
            </Panel>

            <Panel>
              <SectionLabel>Grid neighbours</SectionLabel>
              <div className="grid grid-cols-3 gap-1">
                {[jathagam, getService("marriage"), getService("panchangam")].map((item, index) => (
                  <div key={item.id} className="overflow-hidden rounded border border-line-soft">
                    <CreativeCanvas
                      format={FORMATS.find((format) => format.id === "ig-square")!}
                      themeKey={index === 1 ? "saffron" : index === 2 ? "ivory" : "midnight"}
                      service={item}
                      content={defaultContent(FORMATS.find((format) => format.id === "ig-square")!, item)}
                      previewWidth={110}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#B4A58F]">
                One dark service post, one warm matrimony card, one light utility card. That rhythm keeps the profile
                from looking repetitive.
              </p>
            </Panel>

            <Panel>
              <SectionLabel>Do not fake</SectionLabel>
              <ul className="space-y-1.5 text-[10.5px] leading-relaxed text-[#C7B9A3]">
                <li>· No invented like or follower counts in mockups.</li>
                <li>· No “verified” check marks on the page.</li>
                <li>· No customer names or birth details in screenshots.</li>
                <li>· Reviews shown only if they exist on the site.</li>
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
};
