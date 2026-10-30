import React, { useEffect, useRef, useState } from "react";
import { useBrandPlacementVersion } from "../lib/brandPlacement";
import { downloadCanvas } from "../lib/export";
import { IG_LAYOUT_MAP, renderIgCreative, type IgCreativeInput } from "../lib/igCreative";

/**
 * Browser wrapper for the Instagram painters.
 *
 * `renderIgCreative` is async because it has to load the logo plate and the
 * painting behind the card. The preview renders at the width it is drawn at
 * (times the device pixel ratio, capped at 2) and the export always re-renders
 * at 1:1, so the file you download is the file you saw.
 */
export type IgScene = Omit<IgCreativeInput, "scale">;

export function useIgCanvas(input: IgScene, previewWidth: number) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "ready" | "failed" | "loading">("idle");
  const [inView, setInView] = useState(false);
  const key = JSON.stringify({
    layout: input.layout,
    theme: input.themeKey,
    style: input.style,
    art: input.art ?? null,
    safe: Boolean(input.showSafeArea),
    content: input.content,
    width: previewWidth,
  });
  const brandVersion = useBrandPlacementVersion();

  useEffect(() => {
    const target = holder.current;
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
    const meta = IG_LAYOUT_MAP[input.layout];
    const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(1, (previewWidth / meta.width) * dpr);
    setState("loading");
    const timer = window.setTimeout(() => {
      renderIgCreative({ ...input, scale })
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
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // The serialised key covers every field the painter reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, inView, brandVersion]);

  return { holder, state };
}

export const IgCanvas: React.FC<{
  input: IgScene;
  previewWidth?: number;
  className?: string;
}> = ({ input, previewWidth = 320, className = "" }) => {
  const { holder, state } = useIgCanvas(input, previewWidth);
  return (
    <div
      ref={holder}
      className={`ig-canvas ${className}`}
      data-state={state}
      aria-busy={state === "loading" || undefined}
      role="img"
      aria-label={`${IG_LAYOUT_MAP[input.layout].name} creative`}
      style={{ aspectRatio: `${IG_LAYOUT_MAP[input.layout].width} / ${IG_LAYOUT_MAP[input.layout].height}`, background: "#1D1618" }}
    />
  );
};

/** Append the exact pixel size unless the caller already put it in the name. */
const withSize = (filename: string, canvas: HTMLCanvasElement): string => {
  if (/_\d+x\d+\.png$/i.test(filename)) return filename;
  return `${filename.replace(/\.png$/i, "")}_${canvas.width}x${canvas.height}.png`;
};

/** Re-render at full resolution and hand the file to the browser. */
export async function exportIg(input: IgScene, filename: string, caption = ""): Promise<boolean> {
  try {
    const { canvas, layout } = await renderIgCreative({ ...input, scale: 1 });
    await downloadCanvas(canvas, withSize(filename, canvas), { formatId: layout.key, caption });
    return true;
  } catch {
    return false;
  }
}
