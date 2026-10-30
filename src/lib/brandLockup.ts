import type { Theme } from "../types";
import { drawLogoMark } from "./posterKit";

export type BrandOrientation = "horizontal" | "vertical" | "circular";
export type BrandAlign = "left" | "center" | "right";

export interface BrandLockupOptions {
  x: number;
  y: number;
  markSize: number;
  textSize: number;
  orientation: BrandOrientation;
  align?: BrandAlign;
  name?: string;
  font: string;
  theme: Theme;
  opacity?: number;
}

export interface BrandLockupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const trackedWidth = (ctx: CanvasRenderingContext2D, text: string, tracking: number) =>
  ctx.measureText(text).width + Math.max(0, Array.from(text).length - 1) * tracking;

function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  const chars = Array.from(text);
  const total = trackedWidth(ctx, text, tracking);
  let cursor = x - total / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const char of chars) {
    const width = ctx.measureText(char).width;
    ctx.fillText(char, cursor + width / 2, y);
    cursor += width + tracking;
  }
}

function drawArcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, tracking: number) {
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width + tracking);
  const totalAngle = widths.reduce((sum, width) => sum + width, 0) / radius;
  let angle = -totalAngle / 2;
  for (let index = 0; index < chars.length; index += 1) {
    const step = widths[index] / radius;
    const middle = angle + step / 2;
    ctx.save();
    ctx.translate(cx + radius * Math.sin(middle), cy - radius * Math.cos(middle));
    ctx.rotate(middle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(chars[index], 0, 0);
    ctx.restore();
    angle += step;
  }
}

/** Draw the transparent brand mark with an editable wordmark lockup — no seal. */
export function drawBrandLockup(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  options: BrandLockupOptions,
): BrandLockupBounds {
  const {
    x,
    y,
    markSize,
    textSize,
    orientation,
    align = "center",
    name = "ASTRO SIVAM",
    font,
    theme,
    opacity = 1,
  } = options;
  const label = name.trim().slice(0, 32);
  const tracking = textSize * 0.13;
  ctx.save();
  ctx.font = font;
  const textWidth = trackedWidth(ctx, label, tracking);
  const gap = markSize * 0.28;
  let width: number;
  let height: number;

  if (orientation === "horizontal") {
    width = markSize + gap + textWidth;
    height = Math.max(markSize, textSize * 1.4);
  } else if (orientation === "vertical") {
    width = Math.max(markSize, textWidth);
    height = markSize + gap + textSize * 1.45;
  } else {
    width = height = markSize * 2.18;
  }
  const left = align === "left" ? x : align === "right" ? x - width : x - width / 2;
  const top = y - height / 2;
  const textColor = theme.ink;

  if (orientation === "horizontal") {
    const markY = top + (height - markSize) / 2;
    drawLogoMark(ctx, logo, { x: left, y: markY, size: markSize, theme, variant: "bare", opacity });
    ctx.fillStyle = textColor;
    ctx.globalAlpha *= opacity;
    drawTracked(ctx, label, left + markSize + gap + textWidth / 2, y, tracking);
  } else if (orientation === "vertical") {
    const markX = left + (width - markSize) / 2;
    const markY = top + (height - markSize - gap - textSize * 1.45) / 2;
    drawLogoMark(ctx, logo, { x: markX, y: markY, size: markSize, theme, variant: "bare", opacity });
    ctx.fillStyle = textColor;
    ctx.globalAlpha *= opacity;
    drawTracked(ctx, label, left + width / 2, markY + markSize + gap + textSize * 0.68, tracking);
  } else {
    const cx = left + width / 2;
    const cy = top + height / 2 + markSize * 0.06;
    drawLogoMark(ctx, logo, { x: cx - markSize / 2, y: cy - markSize / 2, size: markSize, theme, variant: "bare", opacity });
    const arcSize = Math.min(textSize, markSize * 0.22);
    ctx.font = font.replace(/[\d.]+px/, `${arcSize}px`);
    ctx.fillStyle = textColor;
    ctx.globalAlpha *= opacity;
    drawArcText(ctx, label, cx, cy, markSize * 0.94, arcSize * 0.055);
  }
  ctx.restore();
  return { x: left, y: top, width, height };
}
