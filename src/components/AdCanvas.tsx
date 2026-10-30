import React, { useEffect, useRef, useState } from "react";
import { useBrandPlacementVersion } from "../lib/brandPlacement";
import { downloadCanvas } from "../lib/export";
import { AD_LAYOUT_MAP, renderServiceAd, type ServiceAdInput } from "../lib/serviceAds";

/**
 * Browser wrapper for the advertising painters.
 *
 * Same contract as the Instagram wrapper: the preview is rendered at the width
 * it is shown at (times the device pixel ratio, capped at 2) and the download
 * always re-renders at 1:1, so the exported file is the plate you saw.
 */
export type AdScene = Omit<ServiceAdInput, "scale">;

export function useAdCanvas(input: AdScene, previewWidth: number) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const key = JSON.stringify({
    layout: input.layout,
    theme: input.theme,
    style: input.style,
    art: input.art ?? null,
    lang: input.lang ?? "en",
    copy: input.copy,
    price: input.price,
    url: input.url,
    width: previewWidth,
  });
  const brandVersion = useBrandPlacementVersion();

  useEffect(() => {
    let cancelled = false;
    const meta = AD_LAYOUT_MAP[input.layout];
    const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(1, (previewWidth / meta.width) * dpr);
    setState("loading");
    renderServiceAd({ ...input, scale })
      .then(({ canvas }) => {
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
    // The serialised key covers every field the painter reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, brandVersion]);

  return { holder, state };
}

export const AdCanvas: React.FC<{
  input: AdScene;
  previewWidth?: number;
  className?: string;
}> = ({ input, previewWidth = 300, className = "" }) => {
  const { holder, state } = useAdCanvas(input, previewWidth);
  return (
    <div
      ref={holder}
      className={`ig-canvas ${className}`}
      data-state={state}
      aria-busy={state === "loading" || undefined}
      role="img"
      aria-label={`${AD_LAYOUT_MAP[input.layout].name} plate`}
    />
  );
};

/** Append the exact pixel size unless the caller already put it in the name. */
const withSize = (filename: string, canvas: HTMLCanvasElement): string => {
  if (/_\d+x\d+\.png$/i.test(filename)) return filename;
  return `${filename.replace(/\.png$/i, "")}_${canvas.width}x${canvas.height}.png`;
};

/** Re-render at full resolution and hand the file to the browser. */
export async function exportAd(input: AdScene, filename: string): Promise<boolean> {
  try {
    const { canvas, layout } = await renderServiceAd({ ...input, scale: 1 });
    await downloadCanvas(canvas, withSize(filename, canvas), {
      formatId: layout.key,
      caption: [input.copy.headline, input.copy.subline].filter(Boolean).join(" "),
    });
    return true;
  } catch {
    return false;
  }
}
