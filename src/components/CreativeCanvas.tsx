import React, { useEffect, useRef, useState } from "react";
import { useBrandPlacementVersion } from "../lib/brandPlacement";
import type { CreativeContent, CreativeFormat, Service, StyleKey, ThemeKey } from "../types";
import { renderCreative } from "../lib/templates";

interface Props {
  format: CreativeFormat;
  themeKey: ThemeKey;
  style?: StyleKey;
  service: Service;
  content: CreativeContent;
  overlay?: boolean;
  slideIndex?: number;
  highlightIndex?: number;
  quoteIndex?: number;
  reviewIndex?: number;
  previewWidth?: number;
  className?: string;
  onRendered?: () => void;
}

/**
 * Browser wrapper for the social creative painters. Off-screen canvases wait
 * until they approach the viewport, and repeated parent renders with identical
 * inputs are skipped. This matters on mobile screens containing a grid of cards.
 */
export const CreativeCanvas = React.memo(function CreativeCanvas({
  format,
  themeKey,
  style,
  service,
  content,
  overlay = false,
  slideIndex = 0,
  highlightIndex = 0,
  quoteIndex = 0,
  reviewIndex = 0,
  previewWidth = 620,
  className = "",
  onRendered,
}: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const brandVersion = useBrandPlacementVersion();

  useEffect(() => {
    const target = holder.current?.parentElement;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "280px 0px", threshold: 0.01 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const scale = Math.min(1, previewWidth / format.width);
    setReady(false);
    const timer = window.setTimeout(() => {
      renderCreative({
        format,
        themeKey,
        style,
        service,
        content,
        scale,
        overlay,
        slideIndex,
        highlightIndex,
        quoteIndex,
        reviewIndex,
      })
        .then((canvas) => {
          if (cancelled || !holder.current) return;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          holder.current.replaceChildren(canvas);
          setReady(true);
          onRendered?.();
        })
        .catch(() => {
          if (!cancelled) setReady(false);
        });
    }, 90);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inView,
    format.id,
    format.width,
    format.height,
    themeKey,
    style,
    service.id,
    content.headline,
    content.kicker,
    content.subline,
    content.tamil,
    content.price,
    content.cta,
    content.chips.join("|"),
    overlay,
    slideIndex,
    highlightIndex,
    quoteIndex,
    reviewIndex,
    previewWidth,
    brandVersion,
  ]);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${format.width} / ${format.height}` }}
      aria-busy={inView && !ready}
    >
      {/* Keep imperative canvas nodes in an empty React-owned host. This avoids
          React trying to remove a loading placeholder that replaceChildren removed. */}
      <div ref={holder} className="absolute inset-0" />
      {!ready ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1D1618] text-center text-[9.5px] uppercase tracking-[0.18em] text-[#A2937D]">
          <span className="h-2 w-2 rotate-45 animate-pulse bg-gold/60" aria-hidden="true" />
          {inView ? "Rendering preview" : "Preview loads as you scroll"}
        </div>
      ) : null}
    </div>
  );
});
