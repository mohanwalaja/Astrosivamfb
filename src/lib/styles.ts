import type { StyleKey, Theme } from "../types";
import { STYLE_BACKDROPS, STYLE_FRAMES, type ArtBox } from "./styleArt";

/**
 * Style dispatcher. Every one of the twelve art directions carries its own
 * backdrop and frame painter in `styleArt.ts`; this module is the single
 * entry point the post layouts, poster templates and festival cards call.
 */

/** Every style ships its own artwork, so a poster never needs an uploaded image. */
export const hasStyleArt = (style: StyleKey) => Boolean(STYLE_BACKDROPS[style]);

export interface StyleOptions {
  seed?: number;
  glowX?: number;
  glowY?: number;
  frameInset?: number;
  stars?: boolean;
  /** The picture area, so a backdrop can compose its hero art around it. */
  art?: ArtBox | null;
}

export function paintStyledBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  style: StyleKey,
  options: StyleOptions = {},
) {
  const painter = STYLE_BACKDROPS[style] ?? STYLE_BACKDROPS.signature;
  painter(ctx, W, H, theme, { seed: 7, glowX: 0.5, glowY: 0.34, frameInset: 26, stars: true, art: null, ...options });
}

export function drawStyleFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  style: StyleKey,
  inset = 26,
) {
  const painter = STYLE_FRAMES[style] ?? STYLE_FRAMES.signature;
  painter(ctx, W, H, theme, inset);
}
