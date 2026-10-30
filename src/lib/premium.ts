import type { Theme } from "../types";
import { rand } from "./random";

/** Central knobs for procedural art. Values are deliberately conservative for mobile. */
export type PremiumQuality = "low" | "medium" | "high";

export const PREMIUM = {
  quality: "medium" as PremiumQuality,
  glow: { halo: 0.34, lamp: 0.42, shaft: 0.11 },
  shadow: { blur: 16, offsetX: 0, offsetY: 9, alpha: 0.42 },
  grain: { amount: 0.035, countPerMegapixel: 1200 },
  particles: { low: 28, medium: 56, high: 96 },
  foil: {
    shadow: "#5B310B",
    dark: "#9B5D12",
    mid: "#D9A63D",
    light: "#FFF0B0",
    bright: "#FFF9DD",
    antique: "#76501F",
  },
  materials: {
    granite: ["#171719", "#3C3933", "#686056", "#282725"] as const,
    sandstone: ["#5B3721", "#A46A3B", "#D9AE76", "#70462D"] as const,
    brass: ["#68420F", "#C68A25", "#FFF0A1", "#A96B18"] as const,
    peacock: ["#073E47", "#0A807A", "#48B5A2", "#D7BC5A"] as const,
  },
};

export const ART = {
  bevelWidth: 0.075,
  carvingAlpha: 0.28,
  highlightAlpha: 0.48,
  textureDensity: 0.00019,
  rimLightAlpha: 0.55,
};

/** Resolve a useful foil ramp against both light and dark theme backgrounds. */
export function foilColors(theme: Theme) {
  return theme.light
    ? [PREMIUM.foil.shadow, PREMIUM.foil.dark, PREMIUM.foil.mid, PREMIUM.foil.dark]
    : ["#58300D", "#B87717", "#FFE7A0", "#D19A30"];
}

export function foilGradient(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  y: number,
  height: number,
) {
  const colors = foilColors(theme);
  const gradient = ctx.createLinearGradient(x, y, x, y + Math.max(1, height));
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.24, colors[1]);
  gradient.addColorStop(0.49, theme.light ? PREMIUM.foil.light : "#FFF4C4");
  gradient.addColorStop(0.68, colors[2]);
  gradient.addColorStop(1, colors[3]);
  return gradient;
}

export function materialQualityCount(area: number) {
  const quality = PREMIUM.quality;
  const multiplier = quality === "low" ? 0.45 : quality === "high" ? 1.5 : 1;
  return Math.max(12, Math.round(area * ART.textureDensity * multiplier));
}

export interface FoilTextOptions {
  alpha?: number;
  outlineWidth?: number;
  shadowBlur?: number;
  emboss?: boolean;
}

/** Vertically-lit metallic text; it preserves the browser's script shaping. */
export function foilText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  theme: Theme,
  options: FoilTextOptions = {},
) {
  const { alpha = 1, outlineWidth, shadowBlur = 2, emboss = true } = options;
  if (!text) return;
  const size = Number(ctx.font.match(/([\d.]+)px/)?.[1] ?? 32);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = "round";
  ctx.lineWidth = outlineWidth ?? Math.max(0.8, size * 0.025);
  ctx.strokeStyle = withAlphaLocal(theme.light ? "#4D310E" : "#2A1608", 0.78);
  ctx.shadowColor = "rgba(0,0,0,.62)";
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = Math.max(0.6, size * 0.018);
  ctx.shadowOffsetY = Math.max(1, size * 0.035);
  ctx.strokeText(text, x, y);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = foilGradient(ctx, theme, x, y - size * 0.92, size * 1.16);
  ctx.fillText(text, x, y);
  if (emboss) {
    ctx.globalAlpha *= 0.26;
    ctx.strokeStyle = withAlphaLocal(theme.light ? "#FFF7DB" : "#FFF0B0", 0.72);
    ctx.lineWidth = Math.max(0.45, size * 0.008);
    ctx.strokeText(text, x - Math.max(0.45, size * 0.008), y - Math.max(0.45, size * 0.008));
  }
  ctx.restore();
}

function withAlphaLocal(color: string, alpha: number) {
  const value = color.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Bounded cache of deterministic grain tiles, keyed by output dimensions. */
const grainTiles = new Map<string, HTMLCanvasElement>();

export function setPremiumQuality(quality: PremiumQuality) {
  if (PREMIUM.quality === quality) return;
  PREMIUM.quality = quality;
  grainTiles.clear();
}

function grainTile(width: number, height: number, seed: number) {
  if (typeof document === "undefined") return null;
  const w = Math.max(1, Math.min(960, Math.round(width)));
  const h = Math.max(1, Math.min(1600, Math.round(height)));
  const key = `${w}x${h}:${seed}:${PREMIUM.quality}`;
  const cached = grainTiles.get(key);
  if (cached) {
    grainTiles.delete(key);
    grainTiles.set(key, cached);
    return cached;
  }
  const tile = document.createElement("canvas");
  tile.width = w;
  tile.height = h;
  const tileCtx = tile.getContext("2d");
  if (!tileCtx) return null;
  const random = rand(seed);
  const scale = PREMIUM.quality === "low" ? 0.42 : PREMIUM.quality === "high" ? 1.35 : 0.75;
  const count = Math.round((w * h / 1_000_000) * PREMIUM.grain.countPerMegapixel * scale);
  for (let i = 0; i < count; i += 1) {
    const x = random() * w;
    const y = random() * h;
    const radius = random() > 0.94 ? 1.25 : 0.55;
    tileCtx.fillStyle = random() > 0.52 ? "rgba(255,244,210,.52)" : "rgba(0,0,0,.38)";
    tileCtx.fillRect(x, y, radius, radius);
  }
  grainTiles.set(key, tile);
  if (grainTiles.size > 4) grainTiles.delete(grainTiles.keys().next().value!);
  return tile;
}

/** Fine deterministic film grain, rendered from a cached low-cost tile. */
export function drawGrain(ctx: CanvasRenderingContext2D, width: number, height: number, seed = 31) {
  const tile = grainTile(width, height, seed);
  if (!tile) return;
  const qualityAlpha = PREMIUM.quality === "low" ? 0.65 : PREMIUM.quality === "high" ? 1.2 : 1;
  ctx.save();
  ctx.globalAlpha *= PREMIUM.grain.amount * qualityAlpha;
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(tile, 0, 0, width, height);
  ctx.restore();
}

/** A style-neutral beveled gold frame for every export format. */
export function drawPremiumFrame(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme) {
  const inset = Math.max(13, Math.min(width, height) * 0.018);
  const band = Math.max(2, Math.min(width, height) * 0.0045);
  const dark = theme.family === "Nature" ? "#15291E" : theme.family === "Temple" ? "#261A10" : "#110C08";
  const fillBand = (x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = band * 1.8;
    ctx.shadowOffsetX = band * 0.2;
    ctx.shadowOffsetY = band * 0.42;
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    const g = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
    g.addColorStop(0, "#FFF4C5");
    g.addColorStop(0.22, theme.gold);
    g.addColorStop(0.66, theme.gold);
    g.addColorStop(1, "#55310D");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = withAlphaLocal("#FFF6D4", 0.72);
    ctx.lineWidth = Math.max(0.65, band * 0.16);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.strokeStyle = withAlphaLocal(dark, 0.82);
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  };
  fillBand(inset, inset, width - inset * 2, band);
  fillBand(inset, height - inset - band, width - inset * 2, band);
  fillBand(inset, inset, band, height - inset * 2);
  fillBand(width - inset - band, inset, band, height - inset * 2);
  const inner = inset + band + Math.max(2, band * 0.8);
  ctx.strokeStyle = withAlphaLocal(theme.light ? "#6A4A1C" : "#F2D28A", 0.48);
  ctx.lineWidth = Math.max(0.65, band * 0.14);
  ctx.strokeRect(inner, inner, width - inner * 2, height - inner * 2);
  // Four raised beads catch the common upper-left key light.
  const beadRadius = Math.max(1.2, band * 0.42);
  [[inset + band * 1.7, inset + band * 1.7], [width - inset - band * 1.7, inset + band * 1.7], [inset + band * 1.7, height - inset - band * 1.7], [width - inset - band * 1.7, height - inset - band * 1.7]].forEach(([x, y]) => {
    const bead = ctx.createRadialGradient(x - beadRadius * 0.35, y - beadRadius * 0.4, 0.2, x, y, beadRadius);
    bead.addColorStop(0, "#FFF9D9");
    bead.addColorStop(0.38, theme.goldSoft);
    bead.addColorStop(1, "#704510");
    ctx.fillStyle = bead;
    ctx.beginPath();
    ctx.arc(x, y, beadRadius, 0, Math.PI * 2);
    ctx.fill();
  });
}
