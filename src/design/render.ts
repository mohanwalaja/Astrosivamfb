/**
 * Astrosivam Design System · render entry
 *
 * One function paints a poster. Static export is `renderDesign(...)` with the
 * default (still) motion; an animation frame is the same call with a
 * `motionState`. Because both go through the identical composition code, the
 * video can never drift from the PNG.
 */

import type { Palette } from "./palettes";
import { paletteFor } from "./palettes";
import { paintComposition, STILL, type CompositionContext, type MotionState, type PosterCopy } from "./compositions";
import { resolveComposition } from "./compositions";
import type { DesignSpec } from "./engine";
import { normaliseCopy } from "./engine";
import type { ArtPlan } from "./artLibrary";
import { auditEnglish, englishOnly } from "./type";
import { createCanvas, ensureFonts, loadLogo } from "../lib/canvas";

export interface RenderRequest {
  spec: DesignSpec;
  copy: PosterCopy;
  width: number;
  height: number;
  /** Device-pixel multiplier. Preview uses a fraction, export uses 1. */
  scale?: number;
  showLogo?: boolean;
  motion?: MotionState;
  /** `1`-based position of this card in a carousel. */
  index?: number;
  total?: number;
  /** Skip the global logo fetch (tools render without a network). */
  logo?: HTMLImageElement | null;
  art?: ArtPlan;
  /** Ornament budget: `quiet` thins the ground and drops the emblem's garland. */
  detail?: "quiet" | "balanced" | "rich";
}

export interface RenderResult {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  palette: Palette;
}

/**
 * Paint into an existing context. Used by every caller that needs a canvas it
 * already owns (the studio preview, the reel recorder, the sample tools).
 */
export function paintDesign(ctx: CanvasRenderingContext2D, request: RenderRequest): RenderResult {
  const { spec, width: W, height: H, scale = 1, showLogo = true, motion = STILL } = request;
  const palette = paletteFor(spec.palette);
  const copy = withoutIndic(normaliseCopy(request.copy));
  const composition = resolveComposition(spec.composition);

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const scene: CompositionContext = {
    ctx,
    W,
    H,
    palette,
    face: spec.face,
    copy,
    logo: request.logo ?? null,
    art: request.art ?? spec.art,
    motion,
    showLogo,
    seed: spec.seed,
    detail: request.detail ?? "balanced",
    index: request.index,
    total: request.total,
  };
  paintComposition(scene, composition);
  ctx.restore();
  return { ctx, W, H, palette };
}

/** Strip any non-English run before it can reach a canvas. */
function withoutIndic(copy: PosterCopy): PosterCopy {
  const clean = (value: string) => {
    const audit = auditEnglish(value);
    return audit.ok ? value : englishOnly(value);
  };
  return {
    kicker: clean(copy.kicker),
    headline: clean(copy.headline) || "Astro Sivam",
    subline: clean(copy.subline),
    cta: clean(copy.cta) || "astrosivam.com",
    footer: clean(copy.footer) || clean(copy.cta) || "astrosivam.com",
    badge: copy.badge ? clean(copy.badge) : undefined,
  };
}

/** Full asynchronous render: fonts, logo, canvas. */
export async function renderDesign(request: RenderRequest): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const { width, height, scale = 1 } = request;
  const { canvas, ctx } = createCanvas(width, height, scale);
  const logo = request.logo !== undefined ? request.logo : request.showLogo === false ? null : await loadLogo().catch(() => null);
  paintDesign(ctx, { ...request, logo });
  return canvas;
}

/**
 * Paint a design into a fresh canvas synchronously. Used by the reel recorder,
 * which cannot await an image per frame and therefore keeps the logo it loaded
 * on the first pass.
 */
export function paintDesignToCanvas(request: RenderRequest & { logo?: HTMLImageElement | null }) {
  const { canvas, ctx } = createCanvas(request.width, request.height, request.scale ?? 1);
  paintDesign(ctx, request);
  return canvas;
}

/** Which copy fields in a draft contain non-English script. */
export function copyAudit(copy: Partial<PosterCopy>) {
  const fields: Array<keyof PosterCopy> = ["kicker", "headline", "subline", "cta", "footer", "badge"];
  const flagged = fields
    .map((field) => ({ field, value: (copy[field] as string) ?? "" }))
    .map((entry) => ({ ...entry, audit: auditEnglish(entry.value) }))
    .filter((entry) => !entry.audit.ok);
  return { ok: flagged.length === 0, flagged };
}
