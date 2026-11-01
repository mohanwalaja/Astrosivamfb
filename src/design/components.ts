/**
 * Astrosivam Design System · components
 *
 * Reusable pieces fifteen compositions share, so the suite reads as one brand:
 * the lockup, the footer rail, the CTA variants, information panels, diagram
 * labels, rules and swipes.
 *
 * None of these decide position — they draw at a given anchor and return the
 * space they consumed, which is what lets a composition lay out from the
 * measured result rather than from a guessed offset.
 */

import type { Palette } from "./palettes";
import { englishOnly, fontFor, measure, paintLine, sansFor, toPoints, wrapText, type DisplayFace } from "./type";
import { withAlpha } from "../lib/canvas";

export interface LockupOptions {
  ctx: CanvasRenderingContext2D;
  logo: HTMLImageElement | null;
  palette: Palette;
  x: number;
  y: number;
  /** Mark size in px. */
  size: number;
  align?: "left" | "center" | "right";
  /** Include the wordmark beside the mark. */
  wordmark?: boolean;
  alpha?: number;
}

export const WORDMARK = "ASTRO SIVAM";

/**
 * The studio lockup: the real logo file at its natural transparency, plus an
 * optional tracked wordmark. Never a white plate on a dark ground.
 */
export function drawLockup(o: LockupOptions): number {
  const { ctx, logo, palette: p, x, y, size, align = "left", wordmark = true, alpha = 1 } = o;
  const labelSize = Math.max(9, size * 0.34);
  const gap = size * 0.3;
  const tracking = labelSize * 0.2;
  ctx.save();
  ctx.font = sansFor(labelSize, 600);
  const labelWidth = wordmark ? measure(ctx, WORDMARK, tracking) : 0;
  const blockWidth = wordmark ? size + gap + labelWidth : size;
  const startX = align === "center" ? x - blockWidth / 2 : align === "right" ? x - blockWidth : x;
  ctx.globalAlpha *= alpha;
  if (logo) {
    ctx.drawImage(logo, startX, y, size, size);
  } else {
    // Palette-built mark, so an offline render still carries the brand.
    ctx.strokeStyle = withAlpha(p.gold, 0.95);
    ctx.fillStyle = withAlpha(p.gold, 0.95);
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.beginPath();
    ctx.arc(startX + size / 2, y + size / 2, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(startX + size / 2, y + size / 2, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(startX + size / 2 + Math.cos(a) * size * 0.36, y + size / 2 + Math.sin(a) * size * 0.36);
      ctx.lineTo(startX + size / 2 + Math.cos(a) * size * 0.48, y + size / 2 + Math.sin(a) * size * 0.48);
      ctx.stroke();
    }
  }
  if (wordmark) {
    paintLine(ctx, WORDMARK, {
      x: startX + size + gap,
      y: y + size / 2,
      font: sansFor(labelSize, 600),
      tracking,
      color: withAlpha(p.ink, 0.9),
      baseline: "middle",
    });
  }
  ctx.restore();
  return blockWidth;
}

export interface FooterOptions {
  ctx: CanvasRenderingContext2D;
  palette: Palette;
  x: number;
  y: number;
  width: number;
  /** Website / handle line. */
  text: string;
  align?: "left" | "center" | "right";
  size?: number;
  /** Draw the hairline rule above the text. */
  rule?: boolean;
  alpha?: number;
  accent?: string;
}

/** The single contact rail every poster ends with. */
export function drawFooter(o: FooterOptions) {
  const { ctx, palette: p, x, y, width, text, align = "left", size, rule = true, alpha = 1, accent = p.gold } = o;
  const value = englishOnly(text).trim();
  const fontSize = size ?? Math.max(10, width * 0.022);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (rule) {
    const g = ctx.createLinearGradient(x, 0, x + width, 0);
    g.addColorStop(0, withAlpha(accent, align === "center" ? 0 : 0.5));
    g.addColorStop(0.5, withAlpha(accent, 0.5));
    g.addColorStop(1, withAlpha(accent, align === "center" ? 0 : 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(x, y - fontSize * 1.6, width, Math.max(1, fontSize * 0.06));
  }
  if (value) {
    paintLine(ctx, value, {
      x: align === "center" ? x + width / 2 : align === "right" ? x + width : x,
      y,
      font: sansFor(fontSize, 500),
      tracking: fontSize * 0.06,
      color: withAlpha(p.ink, 0.72),
      align,
    });
  }
  ctx.restore();
}

export type CtaVariant = "solid" | "outline" | "ghost" | "ribbon" | "underline";

export interface CtaOptions {
  ctx: CanvasRenderingContext2D;
  palette: Palette;
  x: number;
  y: number;
  label: string;
  variant?: CtaVariant;
  size?: number;
  align?: "left" | "center" | "right";
  face?: DisplayFace;
  alpha?: number;
  width?: number;
}

export interface CtaResult {
  width: number;
  height: number;
  baseline: number;
}

/** Call to action. Five treatments, all measured, all safe to place anywhere. */
export function drawCta(o: CtaOptions): CtaResult {
  const { ctx, palette: p, x, y, variant = "solid", align = "left", face = "inter", alpha = 1, width } = o;
  const label = englishOnly(o.label).trim().toUpperCase();
  if (!label) return { width: 0, height: 0, baseline: y };
  const size = o.size ?? 20;
  const tracking = size * (face === "inter" ? 0.1 : 0.16);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = fontFor(face, size, 700);
  const textWidth = measure(ctx, label, tracking);
  const padX = size * 1.15;
  const padY = size * 0.82;
  const boxW = width ?? textWidth + padX * 2;
  const boxH = size + padY * 2;
  const bx = align === "center" ? x - boxW / 2 : align === "right" ? x - boxW : x;
  const by = y;
  const baselineY = by + boxH / 2;

  if (variant === "solid") {
    const g = ctx.createLinearGradient(bx, by, bx + boxW, by + boxH);
    g.addColorStop(0, p.goldSoft);
    g.addColorStop(0.5, p.gold);
    g.addColorStop(1, p.goldDeep);
    ctx.fillStyle = g;
    rounded(ctx, bx, by, boxW, boxH, boxH * 0.16);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.8);
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.stroke();
    paintLine(ctx, label, {
      x: bx + boxW / 2,
      y: baselineY,
      font: fontFor(face, size, 700),
      tracking,
      color: p.light ? "#FFFFFF" : "#1A1105",
      align: "center",
      baseline: "middle",
    });
  } else if (variant === "outline") {
    ctx.strokeStyle = withAlpha(p.gold, 0.9);
    ctx.lineWidth = Math.max(1.4, size * 0.07);
    rounded(ctx, bx, by, boxW, boxH, boxH * 0.16);
    ctx.stroke();
    paintLine(ctx, label, {
      x: bx + boxW / 2,
      y: baselineY,
      font: fontFor(face, size, 700),
      tracking,
      color: withAlpha(p.ink, 0.95),
      align: "center",
      baseline: "middle",
    });
  } else if (variant === "ribbon") {
    const notch = boxH * 0.34;
    ctx.beginPath();
    ctx.moveTo(bx + notch, by);
    ctx.lineTo(bx + boxW - notch, by);
    ctx.lineTo(bx + boxW, by + boxH / 2);
    ctx.lineTo(bx + boxW - notch, by + boxH);
    ctx.lineTo(bx + notch, by + boxH);
    ctx.lineTo(bx, by + boxH / 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(bx, by, bx + boxW, by + boxH);
    g.addColorStop(0, withAlpha(p.field, 0.95));
    g.addColorStop(1, withAlpha(p.deep, 0.95));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.gold, 0.9);
    ctx.lineWidth = Math.max(1.2, size * 0.06);
    ctx.stroke();
    paintLine(ctx, label, {
      x: bx + boxW / 2,
      y: baselineY,
      font: fontFor(face, size, 700),
      tracking,
      color: p.goldSoft,
      align: "center",
      baseline: "middle",
    });
  } else if (variant === "underline") {
    paintLine(ctx, label, {
      x: align === "center" ? x : align === "right" ? x : x,
      y: by + size,
      font: fontFor(face, size, 700),
      tracking,
      color: p.goldSoft,
      align,
    });
    ctx.fillStyle = withAlpha(p.gold, 0.9);
    const ux = align === "center" ? x - textWidth / 2 : align === "right" ? x - textWidth : x;
    ctx.fillRect(ux, by + size * 1.32, textWidth, Math.max(1.4, size * 0.055));
  } else {
    paintLine(ctx, label, {
      x,
      y: baselineY,
      font: fontFor(face, size, 700),
      tracking,
      color: p.goldSoft,
      align,
      baseline: "middle",
    });
  }
  ctx.restore();
  return { width: boxW, height: boxH, baseline: baselineY };
}

/** Rounded rectangle path (no fill / stroke — the caller decides). */
export function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/* --------------------------------- panels -------------------------------- */

export interface PanelOptions {
  ctx: CanvasRenderingContext2D;
  palette: Palette;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  /** 0–1 plate opacity. */
  fill?: number;
  stroke?: boolean;
  accent?: boolean;
  shadow?: boolean;
}

/** A tonal information panel — the infographic and commercial vocabulary. */
export function drawPanel(o: PanelOptions) {
  const { ctx, palette: p, x, y, w, h, radius = 14, fill = 0.5, stroke = true, accent = false, shadow = true } = o;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = withAlpha(p.deep, 0.5);
    ctx.shadowBlur = Math.min(w, h) * 0.12;
    ctx.shadowOffsetY = Math.min(w, h) * 0.02;
  }
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  if (p.light) {
    g.addColorStop(0, withAlpha("#FFFFFF", fill));
    g.addColorStop(1, withAlpha(p.deepAlt, fill));
  } else {
    g.addColorStop(0, withAlpha(p.field, fill));
    g.addColorStop(1, withAlpha(p.deepAlt, fill * 0.9));
  }
  ctx.fillStyle = g;
  rounded(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (stroke) {
    ctx.strokeStyle = withAlpha(p.gold, 0.32);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (accent) {
    ctx.fillStyle = withAlpha(p.gold, 0.9);
    rounded(ctx, x, y, Math.max(3, w * 0.014), h, Math.min(radius, 3));
    ctx.fill();
  }
  ctx.restore();
}

export interface IndexCardOptions {
  ctx: CanvasRenderingContext2D;
  palette: Palette;
  x: number;
  y: number;
  w: number;
  /** Numbered step, or a pictogram label. */
  index: string;
  title: string;
  body?: string;
  face?: DisplayFace;
  titleSize?: number;
  bodySize?: number;
  alpha?: number;
  /** Leading pictogram drawn by the caller. */
  glyph?: (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => void;
}

/** One numbered information row. Returns the height used. */
export function drawIndexCard(o: IndexCardOptions) {
  const { ctx, palette: p, x, y, w, index, title, body, face = "inter", alpha = 1 } = o;
  const titleSize = o.titleSize ?? Math.max(13, w * 0.045);
  const bodySize = o.bodySize ?? Math.max(10, w * 0.032);
  const badge = titleSize * 1.9;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = sansFor(titleSize, 700);
  const titleLines = wrapText(ctx, englishOnly(title), w - badge - titleSize * 0.9, titleSize * 0.02);
  ctx.font = sansFor(bodySize, 400);
  const bodyLines = body ? wrapText(ctx, englishOnly(body), w - badge - titleSize * 0.9, bodySize * 0.01) : [];
  const rowH = Math.max(badge, titleLines.length * titleSize * 1.24 + bodyLines.length * bodySize * 1.42);
  // badge
  const g = ctx.createLinearGradient(x, y, x + badge, y + badge);
  g.addColorStop(0, withAlpha(p.gold, 0.95));
  g.addColorStop(1, withAlpha(p.goldDeep, 0.95));
  ctx.fillStyle = g;
  rounded(ctx, x, y + (rowH - badge) / 2, badge, badge, badge * 0.28);
  ctx.fill();
  paintLine(ctx, index, {
    x: x + badge / 2,
    y: y + rowH / 2,
    font: fontFor(face, badge * 0.52, 700),
    color: p.light ? "#FFFFFF" : "#22160A",
    align: "center",
    baseline: "middle",
  });
  const textX = x + badge + titleSize * 0.7;
  titleLines.forEach((line, i) => {
    paintLine(ctx, line, {
      x: textX,
      y: y + (rowH - (titleLines.length * titleSize * 1.24 + bodyLines.length * bodySize * 1.42)) / 2 + titleSize * 0.92 + i * titleSize * 1.24,
      font: sansFor(titleSize, 700),
      tracking: titleSize * 0.02,
      color: withAlpha(p.ink, 0.97),
    });
  });
  bodyLines.forEach((line, i) => {
    paintLine(ctx, line, {
      x: textX,
      y:
        y +
        (rowH - (titleLines.length * titleSize * 1.24 + bodyLines.length * bodySize * 1.42)) / 2 +
        titleLines.length * titleSize * 1.24 +
        bodySize * 1.08 +
        i * bodySize * 1.42,
      font: sansFor(bodySize, 400),
      color: withAlpha(p.ink, 0.62),
    });
  });
  ctx.restore();
  return rowH;
}

/** Dashed leader from a label to a diagram point. */
export function drawLeader(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  alpha = 0.5,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(to.x, to.y, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Small diamond rule — the elephant-foot divider of the suite. */
export function diamondRule(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  width: number,
  color: string,
  alpha = 0.8,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const half = width / 2;
  const grad = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  grad.addColorStop(0, withAlpha(color, 0));
  grad.addColorStop(0.35, withAlpha(color, 0.75));
  grad.addColorStop(0.65, withAlpha(color, 0.75));
  grad.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(cx - half, y - 0.6, width, 1.2);
  ctx.fillStyle = color;
  const d = Math.max(3, width * 0.018);
  ctx.beginPath();
  ctx.moveTo(cx, y - d);
  ctx.lineTo(cx + d, y);
  ctx.lineTo(cx, y + d);
  ctx.lineTo(cx - d, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Swipe affordance for carousel covers. */
export function drawSwipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  align: "left" | "right" = "right",
) {
  const label = "SWIPE";
  ctx.save();
  ctx.font = sansFor(size, 700);
  const tracking = size * 0.18;
  const labelW = measure(ctx, label, tracking);
  const arrowW = size * 1.6;
  const total = labelW + arrowW;
  const startX = align === "right" ? x - total : x;
  paintLine(ctx, label, { x: startX, y, font: sansFor(size, 700), tracking, color, baseline: "middle" });
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.beginPath();
  ctx.moveTo(startX + labelW + size * 0.4, y);
  ctx.lineTo(startX + total, y);
  ctx.moveTo(startX + total - size * 0.4, y - size * 0.32);
  ctx.lineTo(startX + total, y);
  ctx.lineTo(startX + total - size * 0.4, y + size * 0.32);
  ctx.stroke();
  ctx.restore();
}

/** Page dots for a carousel. */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  active: number,
  color: string,
  size = 6,
  align: "left" | "center" | "right" = "left",
) {
  const gap = size * 2.6;
  const total = gap * (count - 1);
  const startX = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    ctx.beginPath();
    ctx.arc(startX + i * gap, y, i === active ? size : size * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(color, i === active ? 0.95 : 0.35);
    ctx.fill();
  }
  ctx.restore();
}

/** A pill chip for service benefits. */
export function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  palette: Palette,
  size: number,
  options: { filled?: boolean; align?: "left" | "center" | "right" } = {},
): number {
  const value = englishOnly(label).trim();
  if (!value) return 0;
  const padding = size * 0.85;
  ctx.save();
  ctx.font = sansFor(size, 600);
  const w = measure(ctx, value, size * 0.04) + padding * 2;
  const h = size * 2;
  const bx = options.align === "right" ? x - w : options.align === "center" ? x - w / 2 : x;
  rounded(ctx, bx, y, w, h, h / 2);
  if (options.filled) {
    const g = ctx.createLinearGradient(bx, y, bx + w, y + h);
    g.addColorStop(0, withAlpha(palette.gold, 0.9));
    g.addColorStop(1, withAlpha(palette.goldDeep, 0.9));
    ctx.fillStyle = g;
    ctx.fill();
  } else {
    ctx.fillStyle = withAlpha(palette.deep, palette.light ? 0.08 : 0.35);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.gold, 0.55);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  paintLine(ctx, value, {
    x: bx + w / 2,
    y: y + h / 2,
    font: sansFor(size, 600),
    tracking: size * 0.04,
    color: options.filled ? (palette.light ? "#FFFFFF" : "#1A1105") : withAlpha(palette.ink, 0.88),
    align: "center",
    baseline: "middle",
  });
  ctx.restore();
  return w;
}

export { toPoints };
