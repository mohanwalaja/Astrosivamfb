import React, { useEffect, useRef, useState } from "react";
import { useBrandPlacementVersion } from "../lib/brandPlacement";
import { Download, Loader2, Monitor, Smartphone } from "lucide-react";
import type { ThemeKey } from "../types";
import { FB_PAGE_ASSETS, type FbPageAsset } from "../data/fbCopy";
import { renderFbCreative, type FbRender } from "../lib/fbCreative";
import { downloadCanvas } from "../lib/export";
import { DEITIES } from "../data/deities";
import { Button, Callout, Panel, SectionLabel, Segmented, useToast } from "./ui";

/**
 * Profile and cover assets shown in the two places people actually see them:
 * the feed header on desktop, and the cropped header on a phone.
 *
 * The phone view is a real crop of the exported canvas, not a separate mock-up,
 * so a promise that falls outside the safe box visibly disappears here too.
 */

type CoverView = "desktop" | "mobile";

function blitTo(node: HTMLCanvasElement | null, source: HTMLCanvasElement, crop?: { x: number; y: number; w: number; h: number }, targetWidth = 0) {
  if (!node) return;
  const region = crop ?? { x: 0, y: 0, w: source.width, h: source.height };
  const width = targetWidth || region.w;
  node.width = Math.round(width);
  node.height = Math.round((width / region.w) * region.h);
  const context = node.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, node.width, node.height);
  context.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, node.width, node.height);
}

export function FbAssets() {
  const toast = useToast();
  const [theme, setTheme] = useState<ThemeKey>("kumkum");
  const [seal, setSeal] = useState<FbRender | null>(null);
  const [cover, setCover] = useState<FbRender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coverView, setCoverView] = useState<CoverView>("desktop");

  const sealFull = useRef<HTMLCanvasElement>(null);
  const sealFeed = useRef<HTMLCanvasElement>(null);
  const sealComment = useRef<HTMLCanvasElement>(null);
  const coverFull = useRef<HTMLCanvasElement>(null);
  const coverPhone = useRef<HTMLCanvasElement>(null);

  const art = DEITIES[0]?.file ?? null;
  const brandVersion = useBrandPlacementVersion();

  const render = async () => {
    setBusy(true);
    setError("");
    try {
      const [nextSeal, nextCover] = await Promise.all(
        FB_PAGE_ASSETS.map((asset) =>
          renderFbCreative({
            layout: asset.layout,
            themeKey: theme,
            style: "gopuram",
            content: asset.content,
            art,
            scale: 1,
          }),
        ),
      );
      setSeal(nextSeal);
      setCover(nextCover);
    } catch (caught) {
      setSeal(null);
      setCover(null);
      setError(caught instanceof Error ? caught.message : "The assets could not be rendered.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, brandVersion]);

  // Blit after every successful render: the refs exist by then.
  useEffect(() => {
    if (!seal) return;
    blitTo(sealFull.current, seal.canvas, undefined, 240);
    blitTo(sealFeed.current, seal.canvas, undefined, 176);
    blitTo(sealComment.current, seal.canvas, undefined, 40);
  }, [seal]);

  useEffect(() => {
    if (!cover) return;
    blitTo(coverFull.current, cover.canvas, undefined, 820);
    // Facebook shows the centre 640 × 360 of the cover on a phone.
    const safe = cover.layout.safeArea!;
    blitTo(coverPhone.current, cover.canvas, { x: safe.x, y: safe.y, w: safe.w, h: safe.h }, 360);
  }, [cover, coverView]);

  const exportAsset = async (asset: FbPageAsset, rendered: FbRender | null) => {
    if (!rendered) return;
    await downloadCanvas(rendered.canvas, `astrosivam_${asset.id}_${rendered.canvas.width}x${rendered.canvas.height}.png`, {
      formatId: `fb-${asset.id}`,
      caption: `${asset.label} — Astro Sivam`,
    });
    toast(`${asset.label} exported at ${rendered.canvas.width} × ${rendered.canvas.height}.`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Panel>
        <SectionLabel right={<span className="chip chip-gold">Identity</span>}>Page assets</SectionLabel>
        <p className="text-[10.5px] leading-relaxed text-[#A2937D]">
          The logo is used exactly as supplied — the plate behind it keeps the wordmark readable over the dark ground
          without redrawing either.
        </p>
        <div className="mt-3">
          <span className="label">Theme</span>
          <Segmented
            label="Theme"
            value={theme === "midnight" ? "midnight" : "kumkum"}
            onChange={(next) => setTheme(next as ThemeKey)}
            options={[
              { value: "kumkum", label: "Kumkum" },
              { value: "midnight", label: "Midnight" },
            ]}
          />
        </div>

        {FB_PAGE_ASSETS.map((asset) => {
          const rendered = asset.id === "profile-seal" ? seal : cover;
          return (
            <div key={asset.id} className="mt-3 rounded-lg border border-line-soft bg-wash p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-cream">{asset.label}</div>
                  <div className="text-[9.5px] text-[#A2937D]">
                    {rendered ? `${rendered.canvas.width} × ${rendered.canvas.height}` : "Rendering…"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!rendered || busy}
                  onClick={() => void exportAsset(asset, rendered)}
                  icon={<Download className="h-3 w-3" />}
                >
                  PNG
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#B4A58F]">{asset.note}</p>
            </div>
          );
        })}

        <Button variant="quiet" size="sm" className="mt-3 w-full" onClick={() => void render()} loading={busy} icon={!busy ? <Loader2 className="h-3 w-3" /> : undefined}>
          Re-render assets
        </Button>
        {error ? <Callout tone="warn">{error}</Callout> : null}
      </Panel>

      <div className="space-y-4">
        <Panel>
          <SectionLabel right={<Segmented label="Cover preview" value={coverView} onChange={setCoverView} options={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Phone" }]} />}>
            <span className="inline-flex items-center gap-2">
              {coverView === "desktop" ? <Monitor className="h-3.5 w-3.5 text-gold" /> : <Smartphone className="h-3.5 w-3.5 text-gold" />} Page header
            </span>
          </SectionLabel>

          {/* Facebook page header chrome, drawn in the same dark feed palette. */}
          <div className="overflow-hidden rounded-lg border border-[#2c2a2d] bg-[#1c1b1d]">
            <div className="relative">
              {coverView === "desktop" ? (
                <div className="relative aspect-[1640/624] w-full overflow-hidden bg-[#2a282b]">
                  <canvas ref={coverFull} className="absolute inset-0 h-full w-full object-cover" aria-label="Cover photo as it appears on a desktop Page header" role="img" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-[rgba(0,0,0,0.55)] to-transparent px-4 pb-3 pt-8">
                    <div className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-full border-[3px] border-[#1c1b1d] bg-[#24060F]">
                      <canvas ref={sealFeed} className="h-full w-full object-cover" aria-label="Profile picture in the Page header" role="img" />
                    </div>
                    <div className="pb-1">
                      <div className="text-[13px] font-semibold leading-tight text-[#E4E6EB]">Astro Sivam · Vedic Astrology</div>
                      <div className="text-[10px] text-[#B0B3B8]">@astrosivam · 12K followers</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-[#141314] px-4 py-5">
                  <div className="relative mx-auto max-w-[360px]">
                    <canvas
                      ref={coverPhone}
                      className="w-full rounded-sm"
                      aria-label="The part of the cover that stays visible on a phone"
                      role="img"
                    />
                    <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-[rgba(120,220,190,0.5)]" />
                  </div>
                  <div className="mt-2 text-center text-[8.5px] uppercase tracking-[0.12em] text-[#8FBFA5]">
                    The only part of the cover a phone shows
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#A2937D]">
            {coverView === "desktop"
              ? "On a desktop the full 1640 px cover is shown. The art panel and the deliverables column fill the wings; every word still sits inside the mobile safe box."
              : "Facebook crops the cover to its centre on a phone. Only what is inside this dashed box survives — check that the promise and the call to action are both here."}
          </p>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <Panel>
            <SectionLabel>Profile picture</SectionLabel>
            <div className="flex items-end gap-4">
              <div className="rounded-full bg-[#24060F] p-1 ring-1 ring-[rgba(199,154,60,0.35)]">
                <canvas ref={sealFull} className="h-[120px] w-[120px] rounded-full object-cover" aria-label="Profile picture at 120 px" role="img" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <canvas ref={sealFeed} className="h-[56px] w-[56px] rounded-full object-cover ring-1 ring-[rgba(199,154,60,0.28)]" aria-label="Profile picture at 56 px, the feed size" role="img" />
                  <span className="text-[9.5px] text-[#A2937D]">56 px · feed</span>
                </div>
                <div className="flex items-center gap-2">
                  <canvas ref={sealComment} className="h-[28px] w-[28px] rounded-full object-cover ring-1 ring-[rgba(199,154,60,0.2)]" aria-label="Profile picture at 28 px, the comment size" role="img" />
                  <span className="text-[9.5px] text-[#A2937D]">28 px · comment</span>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-[#A2937D]">
              A circle crops the corners of the artwork, so nothing sits outside the 70 % safe circle. The wordmark is
              the only line of type — it stays legible at the 28 px comment size.
            </p>
          </Panel>

          <Panel>
            <SectionLabel>What changed</SectionLabel>
            <ul className="space-y-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
                Profile: seal form — plate, wordmark, Tamil line, twin lamps — instead of a cropped poster.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
                Cover: the promise and the call to action are inside the mobile crop, not centred on a 1640 px
                canvas.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
                Wings are decorative: an arch-cropped art panel and a ticked deliverables column, so the desktop cover is
                not a small lockup floating in empty space.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
                Both exported at native size — the phone crop above is a crop of the same file, so what you approve is what
                is posted.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
