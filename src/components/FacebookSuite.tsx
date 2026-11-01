import React, { useState } from "react";
import {
  AlertTriangle,
  BookmarkCheck,
  Facebook,
  Flag,
  LayoutList,
  MessageSquare,
  ShieldCheck,
  Star,
  Target,
} from "lucide-react";
import { BRAND } from "../data/brand";
import { FB_ABOUT, FB_ADS, FB_BIO_OPTIONS, FB_CHECKLIST, FB_COMPLIANCE, FB_CROSSPOST, FB_FAQS, FB_MESSENGER, FB_PAGE_FIELDS, FB_PINNED_POST, FB_REVIEW_TEMPLATES, FB_TABS } from "../data/facebook";
import { FORMAT_MAP } from "../data/formats";
import { getService } from "../data/services";
import { defaultContent } from "../lib/templates";
import { CreativeCanvas } from "./CreativeCanvas";
import { Accordion, Callout, CopyButton, ExternalLink, PageHeader, Panel, PreviewFrame, SectionLabel, Segmented } from "./ui";
import { FbComposer } from "./FbComposer";
import { FbAssets } from "./FbAssets";
import { useOpenPublisher } from "../lib/publishContext";
import { MetaStatus } from "./MetaStatus";

const pinnedService = getService(FB_PINNED_POST.serviceId);
const pinnedFormat = FORMAT_MAP["fb-post"];

type SuiteView = "studio" | "assets" | "publish" | "kit";

const SUITE_VIEWS: Array<{ value: SuiteView; label: string; note: string }> = [
  { value: "studio", label: "Post studio", note: "Compose a post and read the mobile audit" },
  { value: "assets", label: "Profile & cover", note: "The two assets that represent the Page" },
  { value: "publish", label: "Publish", note: "Live Page connection and real Meta errors" },
  { value: "kit", label: "Page kit", note: "About, FAQs, reviews, boost guardrails" },
];

export const FacebookSuite: React.FC = () => {
  const [view, setView] = useState<SuiteView>("studio");
  const openPublisher = useOpenPublisher();

  return (
    <div>
      <PageHeader
        eyebrow="Facebook suite"
        title="A page that answers questions before they are asked."
        description="Facebook is where families research before they trust. Compose a post, check it at phone size, prepare the profile and cover, then publish — with Meta's own responses on screen, never a simulated success."
        actions={
          <>
            <CopyButton text={FB_BIO_OPTIONS[0].text} label="Copy bio" />
            <CopyButton text={FB_ABOUT.join("\n\n")} label="Copy About" />
          </>
        }
      />

      <div className="mb-4">
        <Segmented
          label="Facebook suite section"
          value={view}
          onChange={setView}
          options={SUITE_VIEWS.map((item) => ({ value: item.value, label: item.label }))}
        />
        <p className="mt-1.5 text-[10.5px] text-[#A2937D]">
          {SUITE_VIEWS.find((item) => item.value === view)?.note}
        </p>
      </div>

      {view === "studio" ? <FbComposer /> : null}
      {view === "assets" ? <FbAssets /> : null}
      {view === "publish" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <MetaStatus />
          <Panel>
            <SectionLabel right={<span className="chip chip-gold">One-click post</span>}>Publishing</SectionLabel>
            <ol className="space-y-2 text-[11px] leading-relaxed text-[#C7B9A3]">
              <li>
                <span className="font-display text-[10px] text-gold-soft">01 · </span>
                On a supported single-image design, tap <strong>Publish now</strong> once. Its rendered image and separate Facebook/Instagram captions/hashtags are sent immediately after the Page and media checks.
              </li>
              <li>
                <span className="font-display text-[10px] text-gold-soft">02 · </span>
                Read the per-platform result in the publisher. No download, copy, review click, draft, or schedule is involved.
              </li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-gold btn-sm" onClick={() => openPublisher()}>
                Open publisher
              </button>
              <a href="/api/meta/connect" className="btn btn-ghost btn-sm">
                Authorize a Page
              </a>
            </div>
            <Callout tone="quiet">
              Nothing publishes in the background. Tapping a design's <strong>Publish now</strong> is the explicit action that starts an immediate post after account and image checks; manual uploads retain a review step. A host without the PHP service reports "not deployed" rather than faking success.
            </Callout>
            <p className="mt-2 text-[10px] leading-relaxed text-[#948772]">
              Accepted uploads: JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP and TIFF (everything except JPEG and PNG is converted
              in the browser). Instagram requires JPEG and a 4:5–1.91:1 shape; both platforms cap the file at 8 MB.
            </p>
          </Panel>
        </div>
      ) : null}
      {view === "kit" ? <PageKit /> : null}

    </div>
  );
};

/** The original suite content, unchanged: page identity, copy and policy. */
const PageKit: React.FC = () => {
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel>
          <SectionLabel right={<span className="chip chip-gold">Page identity</span>}>
            <span className="inline-flex items-center gap-2">
              <Facebook className="h-3.5 w-3.5 text-[#9DB3D4]" /> Fields
            </span>
          </SectionLabel>
          <div className="divide-y divide-line-soft">
            {FB_PAGE_FIELDS.map((field) => (
              <div key={field.field} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#A2937D]">{field.field}</div>
                  <div className="mt-0.5 text-[12px] font-medium leading-snug text-cream">{field.value}</div>
                  <div className="mt-0.5 text-[10.5px] leading-relaxed text-[#A2937D]">{field.note}</div>
                </div>
                <CopyButton text={field.value} label="Copy" compact />
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">255-character limit</span>}>Bio options</SectionLabel>
            <div className="space-y-2">
              {FB_BIO_OPTIONS.map((bio, index) => (
                <div key={bio.label} className="rounded-lg border border-line-soft bg-wash p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">{bio.label}</span>
                    <CopyButton text={bio.text} label="Copy" compact />
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#DCCFBA]">{bio.text}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#A2937D]">
                    <span>{bio.text.length} / 255 characters</span>
                    {index === 0 ? <span className="text-jade">Recommended</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-[11px] font-semibold text-cream">Pinned post preview</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#A2937D]">1200 × 1500</span>
            </div>
            <div className="checker p-3">
              <PreviewFrame label={pinnedService.shortName} meta={`${pinnedFormat.width} × ${pinnedFormat.height} px`}>
                <CreativeCanvas
                  format={pinnedFormat}
                  themeKey={pinnedService.theme}
                  service={pinnedService}
                  content={defaultContent(pinnedFormat, pinnedService)}
                  previewWidth={380}
                />
              </PreviewFrame>
            </div>
            <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-[#B4A58F]">
              {FB_PINNED_POST.reason}
            </div>
          </Panel>
        </div>
      </div>

      {/* about + tabs */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <SectionLabel right={<CopyButton text={FB_ABOUT.join("\n\n")} label="Copy About" compact />}>
            About · four paragraphs
          </SectionLabel>
          <div className="space-y-3">
            {FB_ABOUT.map((paragraph, index) => (
              <p key={paragraph.slice(0, 24)} className="flex gap-2.5 text-[11.5px] leading-relaxed text-[#C7B9A3]">
                <span className="mt-0.5 font-display text-[10px] text-gold-soft">{String(index + 1).padStart(2, "0")}</span>
                {paragraph}
              </p>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionLabel>
            <span className="inline-flex items-center gap-2">
              <LayoutList className="h-3.5 w-3.5 text-gold" /> Tabs &amp; order
            </span>
          </SectionLabel>
          <div className="space-y-1.5">
            {FB_TABS.map((tab) => (
              <div key={tab.tab} className="rounded-lg border border-line-soft px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-cream">{tab.tab}</span>
                  <span className="text-[9.5px] uppercase tracking-[0.1em] text-[#A2937D]">{tab.note}</span>
                </div>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#B4A58F]">{tab.action}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* first nine */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionLabel right={<span className="chip chip-gold">Launch order</span>}>The first nine posts</SectionLabel>
          <ol className="space-y-1.5">
            {FB_PINNED_POST.firstNine.map((post, index) => (
              <li key={post} className="flex items-center gap-3 rounded-lg border border-line-soft bg-wash px-3 py-2">
                <span className="font-display text-[11px] text-gold-soft">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-[11.5px] text-[#C7B9A3]">{post}</span>
                {index === 0 ? <BookmarkCheck className="ml-auto h-3.5 w-3.5 text-jade" /> : null}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <SectionLabel>
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-gold" /> Messenger setup
            </span>
          </SectionLabel>
          <div className="space-y-2">
            <div className="rounded-lg border border-line-soft bg-wash p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Greeting</span>
                <CopyButton text={FB_MESSENGER.greeting} label="Copy" compact />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#C7B9A3]">{FB_MESSENGER.greeting}</p>
            </div>
            <div className="rounded-lg border border-line-soft bg-wash p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Away message</span>
                <CopyButton text={FB_MESSENGER.away} label="Copy" compact />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#C7B9A3]">{FB_MESSENGER.away}</p>
            </div>
            <div className="space-y-1.5">
              {FB_MESSENGER.instantReplies.map((reply) => (
                <div key={reply.label} className="flex items-center justify-between gap-2 rounded-lg border border-line-soft px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-semibold text-cream">{reply.label}</div>
                    <div className="truncate text-[10px] text-[#A2937D]">{reply.reply}</div>
                  </div>
                  <CopyButton text={reply.reply} label="Copy" compact />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* FAQs */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel>
          <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{FB_FAQS.length} saved replies</span>}>
            Messenger FAQs
          </SectionLabel>
          <div className="space-y-1.5">
            {FB_FAQS.map((faq) => (
              <div key={faq.question} className="rounded-lg border border-line bg-wash">
                <Accordion question={faq.question}>
                  <div className="flex items-start justify-between gap-2">
                    <p>{faq.answer}</p>
                    <CopyButton text={faq.answer} label="Copy" compact />
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.1em] text-gold">Quick reply: {faq.quickReply}</div>
                </Accordion>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionLabel>
              <span className="inline-flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-gold" /> Review replies
              </span>
            </SectionLabel>
            <div className="space-y-1.5">
              {FB_REVIEW_TEMPLATES.map((template) => (
                <div key={template.scenario} className="rounded-lg border border-line">
                  <Accordion question={template.scenario}>
                    <div className="flex items-start justify-between gap-2">
                      <p>{template.reply}</p>
                      <CopyButton text={template.reply} label="Copy" compact />
                    </div>
                  </Accordion>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
              Ask for a review inside the 7-day chat window, after the customer has read the report. Never incentivise
              reviews.
            </p>
          </Panel>

          <Panel>
            <SectionLabel>
              <span className="inline-flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-gold" /> Boost plan
              </span>
            </SectionLabel>
            <div className="space-y-2">
              {FB_ADS.map((ad) => (
                <div key={ad.name} className="rounded-lg border border-line-soft bg-wash p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-cream">{ad.name}</span>
                    <span className="shrink-0 text-[9.5px] uppercase tracking-[0.1em] text-gold-soft">{ad.budget}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[#A2937D]">{ad.objective}</div>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#C7B9A3]">{ad.audience}</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#B4A58F]">{ad.creative}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#D8B7A6]">{ad.guardrail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* compliance + crosspost */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <SectionLabel right={<span className="chip chip-saffron">Policy</span>}>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Compliance
            </span>
          </SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {FB_COMPLIANCE.map((rule) => (
              <div key={rule.title} className="rounded-lg border border-line-soft bg-wash p-3">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-cream">
                  <AlertTriangle className="h-3 w-3 text-[#E0B48C]" />
                  {rule.title}
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#C7B9A3]">{rule.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Callout tone="warn" title="Advertising astrology on Meta">
              Meta restricts ads that imply personal attributes or guarantee outcomes. Sell the service and the sample —
              never tell a viewer what their chart says about them in an ad.
            </Callout>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionLabel>
              <span className="inline-flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-gold" /> Cross-posting rules
              </span>
            </SectionLabel>
            <ul className="space-y-1.5">
              {FB_CROSSPOST.map((rule) => (
                <li key={rule} className="flex gap-2 text-[11px] leading-relaxed text-[#C7B9A3]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                  {rule}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{FB_CHECKLIST.length} items</span>}>
              Page checklist
            </SectionLabel>
            <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1 scroll-thin">
              {FB_CHECKLIST.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-[10.5px] leading-relaxed text-[#C7B9A3]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
                  <span className="flex-1">{item.label}</span>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.08em] text-[#A2937D]">{item.group}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-wash px-4 py-3">
        <span className="text-[11px] text-[#B4A58F]">
          Delivery promise: reports checked every 6 hours · PDF + tax invoice emailed after approval · 7 days of astrologer chat.
        </span>
        <ExternalLink href={BRAND.url}>{BRAND.website}</ExternalLink>
      </div>
    </div>
  );
};
