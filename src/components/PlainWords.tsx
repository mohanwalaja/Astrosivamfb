import React, { useEffect, useRef, useState } from "react";
import { Download, PenLine, ShieldCheck } from "lucide-react";
import type { PosterOptions } from "../lib/poster";
import { renderPoster } from "../lib/poster";
import { downloadCanvas } from "../lib/export";
import { requestStudio, type PosterState } from "../lib/studioState";
import {
  PLAIN_WORDS,
  plainWordsCaption,
  plainWordsInstagram,
  type PlainWordsPoster,
} from "../data/plainWords";
import { BRAND } from "../data/brand";
import { Button, Callout, CopyButton, PageHeader, Panel, PreviewFrame, SectionLabel, useToast } from "./ui";

/* ==========================================================================
   Plain-words campaign.
   ==========================================================================
   The brief: Astro Sivam is new, and a stranger cannot tell from the artwork
   what is being sold. So this screen leads with the explanation, shows the
   twelve plates that carry it, and keeps the caption beside each plate.

   Every plate here is the same renderer the poster studio uses — the preview,
   the download and the studio hand-off all come from one `PosterState`, so the
   plate you see is the file you post.
   ========================================================================== */

const PREVIEW_WIDTH = 340;

const toState = (poster: PlainWordsPoster): PosterState => ({
  width: poster.width,
  height: poster.height,
  themeKey: poster.theme,
  style: "signature",
  layout: "split",
  template: poster.composition,
  display: poster.display,
  script: "serif",
  image: poster.image,
  imageIsLibrary: true,
  imageFit: "full",
  category: poster.category,
  occasion: poster.occasion,
  serviceTitle: poster.copy.serviceTitle,
  kicker: poster.copy.kicker,
  headline: poster.copy.headline,
  tamil: "",
  hindi: "",
  subline: poster.copy.subline,
  facts: poster.copy.facts,
  cta: poster.copy.cta,
  footer: BRAND.website,
  showLogo: true,
  seed: 101,
  useGlobalBrandPlacement: false,
});

const toOptions = (poster: PlainWordsPoster, scale: number): PosterOptions => ({ ...toState(poster), scale });

/** One plate, rendered at the width it is shown at. */
const Plate: React.FC<{ poster: PlainWordsPoster; onOpen: () => void }> = ({ poster, onOpen }) => {
  const toast = useToast();
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
    setState("loading");
    renderPoster(toOptions(poster, Math.min(1, (PREVIEW_WIDTH / poster.width) * dpr)))
      .then((canvas) => {
        if (cancelled || !holder.current) return;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        holder.current.replaceChildren(canvas);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [poster]);

  const download = async () => {
    setBusy(true);
    try {
      const canvas = await renderPoster(toOptions(poster, 1));
      await downloadCanvas(canvas, `astrosivam_plain_${poster.id}_${poster.width}x${poster.height}.png`);
      toast(`Downloaded ${poster.label} · ${poster.width} × ${poster.height}`);
    } catch {
      toast("That plate could not be rendered — reload and try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-col gap-3">
      <PreviewFrame
        label={poster.label}
        meta={`${poster.width} × ${poster.height}`}
        caption={poster.message}
        innerClassName="bg-[#0B0708]"
      >
        <div ref={holder} data-state={state} aria-busy={state === "loading" || undefined} role="img" aria-label={poster.copy.headline} />
      </PreviewFrame>

      <div>
        <p className="text-[13px] font-semibold leading-snug text-[#F1E4CE]">{poster.copy.headline}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#A2937D]">{poster.copy.subline}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button variant="gold" size="sm" onClick={download} loading={busy} icon={<Download className="h-3.5 w-3.5" />}>
          PNG
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpen} icon={<PenLine className="h-3.5 w-3.5" />}>
          Open in studio
        </Button>
        <CopyButton text={plainWordsCaption(poster)} label="Caption" />
      </div>

      <details className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C7B9A3]">
          Caption &amp; Instagram cut
        </summary>
        <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-[#A2937D]">{plainWordsCaption(poster)}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#8F8272]">Instagram · {plainWordsInstagram(poster).length} characters</span>
          <CopyButton text={plainWordsInstagram(poster)} label="IG cut" />
        </div>
      </details>
    </Panel>
  );
};

const ONE_LINE = `${BRAND.name} prepares your jathagam online. You send your birth date, birth time and birth place. Our India-based priest team reviews the chart, and your PDF report and tax invoice arrive by email. Every report includes seven days of chat. Birth Jathagam is US$5 (₹470), and your first report is free while we are in beta.`;

export const PlainWords: React.FC<{ onNavigate?: (id: string) => void }> = ({ onNavigate }) => {
  const open = (poster: PlainWordsPoster) => {
    requestStudio({
      state: toState(poster),
      formatId: poster.height > 1500 ? "story" : "ig-post",
      deityKey: null,
      note: `“${poster.label}” loaded — edit the words, then export.`,
    });
    onNavigate?.("poster");
  };

  return (
    <div>
      <PageHeader
        eyebrow="New service · explain first"
        title={
          <>
            Twelve posters that say what Astro Sivam is.{" "}
            <span className="gold-text">No metaphor required.</span>
          </>
        }
        description="Astro Sivam is new, so the first job of a poster is not atmosphere — it is comprehension. Each plate below answers three questions before it decorates anything: what the service is, why someone who cannot reach their own priest should use it, and what happens after they pay. Prices and deliverables are quoted from the service records, never typed by hand."
        actions={
          <Button variant="quiet" onClick={() => onNavigate?.("poster")} icon={<PenLine className="h-3.5 w-3.5" />}>
            Poster studio
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel>
          <SectionLabel right={<CopyButton text={ONE_LINE} label="Copy the answer" />}>
            If someone asks “what is Astro Sivam?”
          </SectionLabel>
          <p className="text-[13px] leading-relaxed text-[#E7D9C1]">{ONE_LINE}</p>
        </Panel>
        <Panel>
          <SectionLabel>The three-line rule</SectionLabel>
          <ul className="space-y-2 text-[12px] leading-relaxed text-[#B6A892]">
            <li>
              <strong className="text-[#E3CA99]">Line 1 — what it is.</strong> A jathagam service you use from home.
            </li>
            <li>
              <strong className="text-[#E3CA99]">Line 2 — what you send.</strong> Birth date, birth time, birth place.
            </li>
            <li>
              <strong className="text-[#E3CA99]">Line 3 — what arrives.</strong> A priest-reviewed PDF, an invoice and seven days of chat.
            </li>
          </ul>
        </Panel>
      </div>

      <Callout icon={<ShieldCheck className="h-4 w-4" />} title="The hook that does the most work">
        <strong className="text-[#F1E4CE]">“Your priest is busy. Our priests are ready.”</strong> It names the real problem —
        no appointment, no time to visit, a temple thousands of kilometres away — and answers it in the same breath. Use it as
        the first plate of every campaign, then follow with <em>No time to visit the temple?</em> and <em>Three details. One clear
        report.</em> so the campaign explains itself in sequence.
      </Callout>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PLAIN_WORDS.map((poster) => (
          <Plate key={poster.id} poster={poster} onOpen={() => open(poster)} />
        ))}
      </div>

      <Panel className="mt-6">
        <SectionLabel right={<span className="text-[10px] uppercase tracking-[0.14em] text-[#8F8272]">posters/plain-words/</span>}>
          Ready-made files
        </SectionLabel>
        <p className="text-[12px] leading-relaxed text-[#A2937D]">
          The same twelve plates ship as PNGs in <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">posters/plain-words/</code>,
          with the two lead hooks re-cut at 1080 × 1920 for stories, a contact sheet for sign-off, and a captions file
          holding both the Facebook caption and the Instagram cut for every plate. Regenerate them with{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">npx tsx tools/plain-words.mjs</code>.
        </p>
      </Panel>
    </div>
  );
};
