import type { Theme } from "../types";
import { withAlpha, rand } from "./canvas";
import { ART, PREMIUM, foilGradient, materialQualityCount } from "./premium";

export type Rect = { x: number; y: number; w: number; h: number };

function fillRamp(ctx: CanvasRenderingContext2D, r: Rect, colors: readonly string[]) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.22, r.y + r.h);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.34, colors[1]);
  g.addColorStop(0.58, colors[2]);
  g.addColorStop(1, colors[3]);
  return g;
}

// Tiny bounded LRU cache: texture-only tiles are reusable between cards of equal geometry.
const grainCache = new Map<string, HTMLCanvasElement>();
function graniteGrain(width: number, height: number, seed: number, sandstone: boolean) {
  if (typeof document === "undefined") return null;
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const key = `${w}x${h}:${seed}:${sandstone ? 1 : 0}:${PREMIUM.quality}`;
  const cached = grainCache.get(key);
  if (cached) {
    grainCache.delete(key);
    grainCache.set(key, cached);
    return cached;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const grainCtx = canvas.getContext("2d");
  if (!grainCtx) return null;
  const rng = rand(seed);
  const count = materialQualityCount(w * h);
  for (let i = 0; i < count; i += 1) {
    const x = rng() * w, y = rng() * h;
    const size = Math.max(0.55, Math.min(w, h) * (0.0008 + rng() * 0.002));
    grainCtx.fillStyle = withAlpha(rng() > 0.5 ? (sandstone ? "#F6DEB1" : "#F4D9A0") : "#080808", rng() * 0.18);
    grainCtx.fillRect(x, y, size * (1 + rng() * 2), size);
  }
  grainCache.set(key, canvas);
  if (grainCache.size > 24) grainCache.delete(grainCache.keys().next().value!);
  return canvas;
}

/** Carved granite slab with a consistent upper-left key, lower-right falloff and seeded grain. */
export function graniteFill(ctx: CanvasRenderingContext2D, r: Rect, seed = 7, sandstone = false) {
  const colors = sandstone ? PREMIUM.materials.sandstone : PREMIUM.materials.granite;
  ctx.save();
  const shadow = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  shadow.addColorStop(0, colors[2]);
  shadow.addColorStop(0.42, colors[1]);
  shadow.addColorStop(1, colors[0]);
  ctx.fillStyle = shadow;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const sheen = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.7, r.y + r.h * 0.72);
  sheen.addColorStop(0, withAlpha("#FFF1D1", 0.23));
  sheen.addColorStop(0.24, withAlpha(colors[2], 0.08));
  sheen.addColorStop(1, withAlpha("#000000", 0.36));
  ctx.fillStyle = sheen;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const grain = graniteGrain(r.w, r.h, seed, sandstone);
  if (grain) ctx.drawImage(grain, r.x, r.y, r.w, r.h);
  else {
    const rng = rand(seed);
    const count = materialQualityCount(r.w * r.h);
    for (let i = 0; i < count; i += 1) {
      const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
      const size = Math.max(0.55, Math.min(r.w, r.h) * (0.0008 + rng() * 0.002));
      ctx.fillStyle = withAlpha(rng() > 0.5 ? "#F4D9A0" : "#080808", rng() * 0.18);
      ctx.fillRect(x, y, size * (1 + rng() * 2), size);
    }
  }
  ctx.restore();
  // bevel: soft dark lower/right edge and narrow reflected upper/left edge
  ctx.strokeStyle = withAlpha("#050505", 0.46);
  ctx.lineWidth = Math.max(1, Math.min(r.w, r.h) * 0.012);
  ctx.strokeRect(r.x + ctx.lineWidth / 2, r.y + ctx.lineWidth / 2, r.w - ctx.lineWidth, r.h - ctx.lineWidth);
  ctx.strokeStyle = withAlpha("#FFF0CB", ART.highlightAlpha);
  ctx.lineWidth = Math.max(0.7, Math.min(r.w, r.h) * 0.0035);
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h);
  ctx.lineTo(r.x, r.y);
  ctx.lineTo(r.x + r.w, r.y);
  ctx.stroke();
  ctx.restore();
}

/** Polished gold/brass with a narrow white-gold reflection. */
export function brassFill(ctx: CanvasRenderingContext2D, r: Rect, theme: Theme, seed = 7) {
  ctx.save();
  ctx.fillStyle = fillRamp(ctx, r, PREMIUM.materials.brass);
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const shine = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  shine.addColorStop(0, withAlpha("#FFF9D9", 0.6));
  shine.addColorStop(0.2, withAlpha("#FFF2BB", 0.15));
  shine.addColorStop(0.58, withAlpha("#5C310C", 0.19));
  shine.addColorStop(1, withAlpha("#130B05", 0.38));
  ctx.fillStyle = shine;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = withAlpha(theme.light ? "#FFF8DB" : "#FFEAB0", 0.76);
  ctx.lineWidth = Math.max(0.7, Math.min(r.w, r.h) * 0.025);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  const rng = rand(seed);
  const count = Math.min(36, Math.max(4, Math.round((r.w + r.h) * 0.012)));
  for (let i = 0; i < count; i += 1) {
    const x = r.x + rng() * r.w;
    const y = r.y + rng() * r.h;
    ctx.fillStyle = withAlpha("#FFF7D4", rng() * 0.36);
    ctx.fillRect(x, y, Math.max(0.7, r.w * 0.002), Math.max(0.7, r.h * 0.002));
  }
  ctx.restore();
}

/** A cut-glass jewel, built from shaded facets and a small specular glint. */
export function glassGem(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, hue = "#39D6C8") {
  ctx.save();
  ctx.shadowColor = withAlpha(hue, 0.7);
  ctx.shadowBlur = radius * 0.8;
  const g = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.05, cx, cy, radius);
  g.addColorStop(0, "#FFFFFF");
  g.addColorStop(0.16, hue);
  g.addColorStop(0.68, "#126A70");
  g.addColorStop(1, "#082B3A");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius * 0.78, cy - radius * 0.25);
  ctx.lineTo(cx + radius * 0.58, cy + radius * 0.67);
  ctx.lineTo(cx, cy + radius);
  ctx.lineTo(cx - radius * 0.58, cy + radius * 0.67);
  ctx.lineTo(cx - radius * 0.78, cy - radius * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = withAlpha("#E6FFFF", 0.88);
  ctx.lineWidth = Math.max(0.8, radius * 0.045);
  ctx.stroke();
  ctx.fillStyle = withAlpha("#FFFFFF", 0.88);
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.28, cy - radius * 0.46, radius * 0.13, radius * 0.075, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function silkSheen(ctx: CanvasRenderingContext2D, r: Rect, color: string, alpha = 0.18) {
  ctx.save();
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h * 0.2);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.43, withAlpha(color, alpha));
  g.addColorStop(0.51, withAlpha("#FFFFFF", alpha * 0.55));
  g.addColorStop(0.61, withAlpha(color, alpha * 0.35));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

const cloudCache = new Map<string, HTMLCanvasElement>();

/** Cached, softly shaded cloud sprite. Oversized layers cap their source resolution. */
export function cloudLayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, alpha = 0.18) {
  const qualityScale = PREMIUM.quality === "low" ? 0.5 : PREMIUM.quality === "high" ? 1 : 0.75;
  const spriteWidth = Math.max(32, Math.min(512, Math.ceil((rx * 2 * qualityScale) / 8) * 8));
  const spriteHeight = Math.max(32, Math.min(384, Math.ceil((ry * 2 * qualityScale) / 8) * 8));
  const key = `${spriteWidth}x${spriteHeight}:${color}:${Math.round(alpha * 100)}:${PREMIUM.quality}`;
  let sprite = cloudCache.get(key);
  if (!sprite && typeof document !== "undefined") {
    sprite = document.createElement("canvas");
    sprite.width = spriteWidth;
    sprite.height = spriteHeight;
    const spriteCtx = sprite.getContext("2d");
    if (spriteCtx) {
      const sx = spriteWidth / 2, sy = spriteHeight / 2;
      const gradient = spriteCtx.createRadialGradient(sx - spriteWidth * 0.12, sy - spriteHeight * 0.15, 0, sx, sy, spriteWidth * 0.52);
      gradient.addColorStop(0, withAlpha(color, alpha));
      gradient.addColorStop(0.6, withAlpha(color, alpha * 0.42));
      gradient.addColorStop(1, withAlpha(color, 0));
      spriteCtx.fillStyle = gradient;
      spriteCtx.beginPath();
      spriteCtx.ellipse(sx, sy, spriteWidth * 0.5, spriteHeight * 0.5, 0, 0, Math.PI * 2);
      spriteCtx.fill();
      cloudCache.set(key, sprite);
      if (cloudCache.size > 20) cloudCache.delete(cloudCache.keys().next().value!);
    } else sprite = undefined;
  }
  if (sprite) {
    cloudCache.delete(key);
    cloudCache.set(key, sprite);
    ctx.drawImage(sprite, cx - rx, cy - ry, rx * 2, ry * 2);
    return;
  }
  ctx.save();
  const gradient = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.2, 0, cx, cy, rx);
  gradient.addColorStop(0, withAlpha(color, alpha));
  gradient.addColorStop(0.6, withAlpha(color, alpha * 0.42));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const starCache = new Map<string, HTMLCanvasElement>();

/** Scale particle counts down for gallery cards; seed + size keep exports deterministic. */
export function particleBudget(count: number) {
  const factor = PREMIUM.quality === "low" ? 0.35 : PREMIUM.quality === "high" ? 1.35 : 0.72;
  return Math.max(8, Math.round(count * factor));
}

export function starField(ctx: CanvasRenderingContext2D, w: number, h: number, seed = 7, count = 80) {
  if (typeof document === "undefined") return;
  const width = Math.max(1, Math.round(w)), height = Math.max(1, Math.round(h));
  const actualCount = particleBudget(count);
  const key = `${width}x${height}:${seed}:${actualCount}:${PREMIUM.quality}`;
  let layer = starCache.get(key);
  if (!layer) {
    layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    const starCtx = layer.getContext("2d");
    if (!starCtx) return;
    const rng = rand(seed);
    for (let i = 0; i < actualCount; i += 1) {
      const x = rng() * width, y = rng() * height;
      const radius = rng() * 1.5 + 0.35;
      starCtx.fillStyle = withAlpha("#FFF0B0", rng() * 0.6 + 0.12);
      starCtx.beginPath();
      starCtx.arc(x, y, radius, 0, Math.PI * 2);
      starCtx.fill();
    }
    starCache.set(key, layer);
    if (starCache.size > 24) starCache.delete(starCache.keys().next().value!);
  } else {
    starCache.delete(key);
    starCache.set(key, layer);
  }
  ctx.drawImage(layer, 0, 0, w, h);
}

/** Upper-left key light beam with softly feathered edges. */
export function lightShaft(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, width: number, color: string, alpha = PREMIUM.glow.shaft) {
  ctx.save();
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(0.55, withAlpha(color, alpha * 0.32));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0 - width * 0.12, y0);
  ctx.lineTo(x0 + width * 0.12, y0);
  ctx.lineTo(x1 + width, y1);
  ctx.lineTo(x1 - width, y1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A translucent five-lobed petal; included for later nature phase reuse. */
export function petal(ctx: CanvasRenderingContext2D, cx: number, cy: number, length: number, width: number, color: string, angle = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.shadowColor = withAlpha("#120A08", 0.3);
  ctx.shadowBlur = length * 0.12;
  const g = ctx.createLinearGradient(0, -length, 0, 0);
  g.addColorStop(0, withAlpha("#FFF5E8", 0.72));
  g.addColorStop(0.25, withAlpha(color, 0.78));
  g.addColorStop(1, withAlpha(color, 0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-width, -length * 0.24, -width * 0.56, -length, 0, -length);
  ctx.bezierCurveTo(width * 0.62, -length, width, -length * 0.24, 0, 0);
  ctx.fill();
  ctx.restore();
}

export function flame(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color = "#FFB127") {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(cx, cy - size * 0.38, 0, cx, cy - size * 0.38, size * 2.4);
  halo.addColorStop(0, withAlpha(color, PREMIUM.glow.lamp));
  halo.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.3, size * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createLinearGradient(cx, cy - size, cx, cy + size * 0.3);
  g.addColorStop(0, "#FFFCE0");
  g.addColorStop(0.42, "#FFD44E");
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.bezierCurveTo(cx + size * 0.95, cy - size * 0.08, cx + size * 0.35, cy + size * 0.36, cx, cy + size * 0.32);
  ctx.bezierCurveTo(cx - size * 0.56, cy + size * 0.22, cx - size * 0.8, cy - size * 0.16, cx, cy - size);
  ctx.fill();
  ctx.restore();
}

export function foilMedallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, theme: Theme) {
  ctx.fillStyle = foilGradient(ctx, theme, cx - radius, cy - radius, radius * 2);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}
