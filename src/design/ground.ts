/**
 * Astrosivam Design System · grounds
 *
 * Fifteen background architectures. A ground is not a texture applied to a
 * gradient: it decides where mass sits on the page, where light falls, which
 * edges are hard and which are soft, and how much of the sheet is left empty.
 * Two compositions with the same palette but different grounds are already
 * visibly different posters at thumbnail size.
 *
 * Every painter here is pure canvas 2D, deterministic from a seed, and free of
 * document access so it renders identically in the browser and in Node.
 */

import type { Palette } from "./palettes";
import { rand, withAlpha } from "../lib/canvas";

export interface GroundOptions {
  seed?: number;
  /** Where the composition's focal point sits, 0–1 of each axis. */
  focusX?: number;
  focusY?: number;
  /**
   * How much ornament the ground may use. `quiet` keeps only the field, its
   * light and its structural rules; `rich` adds the full ornamental layer.
   * The ground always draws at least its base field, so a quiet card is still a
   * designed card rather than a flat colour.
   */
  detail?: GroundDetail;
}

export type GroundDetail = "quiet" | "balanced" | "rich";

/**
 * The decoration control, threaded through the ornament helpers rather than
 * duplicated in fifteen painters. A quiet ground keeps its field, its light and
 * its structural rules but drops most of the countable ornament; a rich ground
 * earns all of it. The value is set by `paintGround` and read by the helpers, so
 * every ground responds to the same control without a per-painter parameter.
 */
let activeDetail: GroundDetail = "balanced";
const ornamentCount = (count: number) => {
  if (activeDetail === "quiet") return Math.max(3, Math.round(count * 0.3));
  if (activeDetail === "rich") return Math.round(count * 1.25);
  return count;
};

/* ------------------------------- primitives ------------------------------- */

export function linearField(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  stops: Array<[number, string]>,
  angle: "v" | "h" | "d" | "d-rev" = "v",
) {
  const g =
    angle === "v"
      ? ctx.createLinearGradient(0, 0, 0, H)
      : angle === "h"
        ? ctx.createLinearGradient(0, 0, W, 0)
        : angle === "d"
          ? ctx.createLinearGradient(0, 0, W, H)
          : ctx.createLinearGradient(W, 0, 0, H);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return g;
}

export function radialGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  strength = 0.5,
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, radius));
  g.addColorStop(0, withAlpha(color, strength));
  g.addColorStop(0.42, withAlpha(color, strength * 0.34));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

/** Fine deterministic film grain. Cheap: one blit of a cached noise canvas. */
const noiseTiles = new Map<string, HTMLCanvasElement>();
function noiseTile(seed: number) {
  const key = `noise-${seed}`;
  const cached = noiseTiles.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  const size = 256;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext("2d");
  if (!tctx) return null;
  const image = tctx.createImageData(size, size);
  const rng = rand(seed);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 128 + (rng() - 0.5) * 190;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  noiseTiles.set(key, tile);
  if (noiseTiles.size > 6) noiseTiles.delete(noiseTiles.keys().next().value!);
  return tile;
}

export function grain(ctx: CanvasRenderingContext2D, W: number, H: number, seed = 11, alpha = 0.055) {
  const tile = noiseTile(seed);
  if (!tile) return;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = alpha;
  const pattern = ctx.createPattern(tile, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/** A fan of soft light rays from a point — sanctum backlight. */
export function rays(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  count = 24,
  alpha = 0.16,
  spread = Math.PI * 2,
  startAngle = -Math.PI / 2,
  seed = 5,
) {
  const rng = rand(seed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = "screen";
  // The ray count responds to the decoration control: a quiet card keeps a few
  // broad shafts of light, a rich one gets the full fan.
  const beams = ornamentCount(count);
  for (let i = 0; i < beams; i += 1) {
    const a = startAngle + (spread * i) / beams;
    const width = (spread / beams) * (0.28 + rng() * 0.4);
    const len = radius * (0.72 + rng() * 0.42);
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, withAlpha(color, alpha * (0.5 + rng() * 0.6)));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, a - width / 2, a + width / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Orbital ellipse with a moving highlight — the celestial register. */
export function orbitRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  color: string,
  alpha = 0.4,
  width = 1.5,
  dash?: number[],
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
}

/** A bead of light on an orbit. */
export function orbitBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  angle: number,
  radius: number,
  color: string,
  glow = 26,
) {
  const px = cx + Math.cos(angle) * rx * Math.cos(rotation) - Math.sin(angle) * ry * Math.sin(rotation);
  const py = cy + Math.cos(angle) * rx * Math.sin(rotation) + Math.sin(angle) * ry * Math.cos(rotation);
  ctx.save();
  ctx.shadowColor = withAlpha(color, 0.9);
  ctx.shadowBlur = glow;
  const g = ctx.createRadialGradient(px - radius * 0.3, py - radius * 0.35, radius * 0.1, px, py, radius);
  g.addColorStop(0, "#FFFDF4");
  g.addColorStop(0.45, color);
  g.addColorStop(1, withAlpha(color, 0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return { x: px, y: py };
}

/** Starfield with three magnitude bands and a couple of soft nebula washes. */
export function starfield(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  color: string,
  count = 130,
  seed = 3,
  maxY = H,
) {
  const rng = rand(seed);
  ctx.save();
  const stars = ornamentCount(count);
  for (let i = 0; i < stars; i += 1) {
    const x = rng() * W;
    const y = rng() * maxY;
    const magnitude = rng();
    const r = magnitude > 0.94 ? 2.4 : magnitude > 0.78 ? 1.5 : 0.9;
    ctx.globalAlpha = 0.25 + magnitude * 0.65;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (magnitude > 0.96) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - r * 4, y);
      ctx.lineTo(x + r * 4, y);
      ctx.moveTo(x, y - r * 4);
      ctx.lineTo(x, y + r * 4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Petal ring around a centre — the mandala vocabulary, reusable at any size. */
export function petalRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  petals: number,
  color: string,
  options: { alpha?: number; fill?: boolean; inner?: number; tilt?: number; lineWidth?: number } = {},
) {
  const { alpha = 0.55, fill = false, inner = 0.55, tilt = 0, lineWidth = 1.4 } = options;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = withAlpha(color, 0.12);
  ctx.lineWidth = lineWidth;
  const total = ornamentCount(petals);
  for (let i = 0; i < total; i += 1) {
    const a = tilt + (Math.PI * 2 * i) / total;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(radius * inner, 0);
    ctx.quadraticCurveTo(radius * 0.82, radius * 0.3, radius, 0);
    ctx.quadraticCurveTo(radius * 0.82, -radius * 0.3, radius * inner, 0);
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Concentric geometry: rings, tick marks, dotted band. */
export function compassRose(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha = 0.4,
  ticks = 48,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.8, radius * 0.004);
  [0.42, 0.68, 0.88, 1].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });
  const marks = ornamentCount(ticks);
  for (let i = 0; i < marks; i += 1) {
    const a = (Math.PI * 2 * i) / marks;
    const long = i % 4 === 0;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * (long ? 0.86 : 0.92), Math.sin(a) * radius * (long ? 0.86 : 0.92));
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.lineWidth = long ? Math.max(0.9, radius * 0.006) : Math.max(0.5, radius * 0.003);
    ctx.stroke();
  }
  ctx.restore();
}

/** Kolam-style dot lattice, subtle enough to read as paper weave. */
export function kolamLattice(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha = 0.16,
  step = 34,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const cols = Math.max(2, Math.floor(w / step));
  const rows = Math.max(2, Math.floor(h / step));
  for (let r = 0; r <= rows; r += 1) {
    for (let c = 0; c <= cols; c += 1) {
      const px = x + (c * w) / cols;
      const py = y + (r * h) / rows;
      ctx.beginPath();
      ctx.arc(px, py, step * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if ((r + c) % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(px - step * 0.3, py);
        ctx.quadraticCurveTo(px, py - step * 0.26, px + step * 0.3, py);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** A pointed temple arch silhouette. */
export function archSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | CanvasGradient,
  shoulders = 0.62,
) {
  const cx = x + w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * shoulders);
  ctx.quadraticCurveTo(x, y + h * (shoulders - 0.28), cx, y);
  ctx.quadraticCurveTo(x + w, y + h * (shoulders - 0.28), x + w, y + h * shoulders);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Stepped temple gopuram profile, drawn as a silhouette band. */
export function gopuramProfile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  steps = 6,
) {
  ctx.save();
  ctx.fillStyle = color;
  const tiers = steps;
  for (let i = 0; i < tiers; i += 1) {
    const t = i / tiers;
    const tierW = w * (1 - t * 0.62);
    const tierH = h / tiers;
    const tx = x + (w - tierW) / 2;
    const ty = y + i * tierH;
    ctx.fillRect(tx, ty, tierW, tierH * 0.82);
    ctx.beginPath();
    ctx.moveTo(tx - tierW * 0.05, ty + tierH * 0.82);
    ctx.quadraticCurveTo(tx + tierW * 0.5, ty + tierH * 0.5, tx + tierW * 1.05, ty + tierH * 0.82);
    ctx.lineTo(tx + tierW * 1.05, ty);
    ctx.lineTo(tx - tierW * 0.05, ty);
    ctx.closePath();
    ctx.fill();
  }
  const apexX = x + w / 2;
  ctx.beginPath();
  ctx.moveTo(apexX - w * 0.1, y);
  ctx.quadraticCurveTo(apexX, y - h * 0.16, apexX + w * 0.1, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A pair of fluted columns flanking a field. */
export function columns(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  color: string,
  options: { inset?: number; width?: number; from?: number; to?: number; alpha?: number } = {},
) {
  const { inset = W * 0.055, width = W * 0.052, from = 0, to = H, alpha = 0.5 } = options;
  ctx.save();
  ctx.globalAlpha = alpha;
  [inset, W - inset - width].forEach((x, index) => {
    const g = ctx.createLinearGradient(x, 0, x + width, 0);
    g.addColorStop(0, withAlpha(color, 0.05));
    g.addColorStop(0.35, withAlpha(color, 0.85));
    g.addColorStop(0.62, withAlpha(color, 0.35));
    g.addColorStop(1, withAlpha(color, 0.06));
    ctx.fillStyle = g;
    ctx.fillRect(x, from, width, to - from);
    ctx.strokeStyle = withAlpha(color, 0.5);
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + (width * i) / 5, from);
      ctx.lineTo(x + (width * i) / 5, to);
      ctx.stroke();
    }
    // capital
    ctx.fillStyle = withAlpha(color, 0.55);
    ctx.fillRect(x - width * 0.14, from, width * 1.28, H * 0.022);
    if (index === 0) return;
  });
  ctx.restore();
}

/** Diagonal hard-edged colour field. */
export function diagonalField(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  color: string,
  options: { from?: "left" | "right"; angle?: number; alpha?: number; offset?: number } = {},
) {
  const { from = "left", angle = 0.32, alpha = 1, offset = 0 } = options;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (from === "left") {
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H * angle + offset);
    ctx.lineTo(0, H * (angle + 0.28) + offset);
  } else {
    ctx.moveTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H * (1 - angle) + offset);
    ctx.lineTo(0, H * (1 - angle - 0.28) + offset);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A rectangle with a fine double rule — the framing vocabulary. */
export function doubleRule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  options: { weight?: number; gap?: number; alpha?: number; corners?: boolean } = {},
) {
  const { weight = 1.6, gap = 8, alpha = 0.62, corners = false } = options;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = weight * 0.45;
  ctx.strokeRect(x + gap, y + gap, w - gap * 2, h - gap * 2);
  if (corners) {
    const c = Math.min(w, h) * 0.06;
    ctx.lineWidth = weight * 1.6;
    const corner = [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ];
    corner.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * c, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * c);
      ctx.stroke();
    });
  }
  ctx.restore();
}

/* --------------------------------- grounds -------------------------------- */

export type GroundKey =
  | "sanctum"
  | "editorial-rule"
  | "mandala-rose"
  | "diagonal-motion"
  | "framed-matte"
  | "cosmic-depth"
  | "type-field"
  | "panel-grid"
  | "commercial-band"
  | "narrative-layers"
  | "collage-blocks"
  | "quiet-paper"
  | "festival-burst"
  | "split-panels"
  | "geometric-astro";

export type GroundPainter = (ctx: CanvasRenderingContext2D, W: number, H: number, p: Palette, o: GroundOptions) => void;

/** 1 · Sanctum: dark radial sanctum, ray backlight, stone columns, kolam footing. */
const sanctum: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [0.5, p.deepAlt],
    [1, p.deep],
  ]);
  const cx = W * (o.focusX ?? 0.5);
  const cy = H * (o.focusY ?? 0.32);
  radialGlow(ctx, cx, cy, Math.max(W, H) * 0.72, p.gold, 0.2);
  rays(ctx, cx, cy, Math.max(W, H) * 0.62, p.goldSoft, 30, 0.14, Math.PI * 2, -Math.PI / 2, o.seed ?? 5);
  columns(ctx, W, H, p.gold, { alpha: 0.28, to: H * 0.94 });
  // stone plinth
  const plinth = ctx.createLinearGradient(0, H * 0.88, 0, H);
  plinth.addColorStop(0, withAlpha(p.goldDeep, 0.16));
  plinth.addColorStop(1, withAlpha(p.deep, 0.6));
  ctx.fillStyle = plinth;
  ctx.fillRect(0, H * 0.88, W, H * 0.12);
  kolamLattice(ctx, 0, H * 0.9, W, H * 0.1, p.gold, 0.14, W * 0.05);
  grain(ctx, W, H, o.seed ?? 11, 0.06);
};

/** 2 · Editorial rule: paper ground, hairline grid, generous top whitespace. */
const editorialRule: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [0.62, p.deepAlt],
    [1, p.deep],
  ]);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = withAlpha(p.light ? p.ink : p.gold, 0.16);
  ctx.lineWidth = 1;
  const cols = 5;
  for (let i = 1; i < cols; i += 1) {
    ctx.beginPath();
    ctx.moveTo((W * i) / cols, 0);
    ctx.lineTo((W * i) / cols, H);
    ctx.stroke();
  }
  ctx.restore();
  // a single heavy rule at the top third
  ctx.fillStyle = withAlpha(p.gold, 0.5);
  ctx.fillRect(W * 0.07, H * 0.2, W * 0.14, Math.max(3, H * 0.004));
  radialGlow(ctx, W * 0.78, H * 0.24, W * 0.7, p.gold, 0.12);
  grain(ctx, W, H, (o.seed ?? 4) + 3, 0.04);
};

/** 3 · Mandala rose: full radial geometry centred, folded quadrants. */
const mandalaRose: GroundPainter = (ctx, W, H, p, o) => {
  const cx = W * 0.5;
  const cy = H * (o.focusY ?? 0.4);
  const R = Math.max(W, H) * 0.62;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, p.field);
  g.addColorStop(0.42, p.deepAlt);
  g.addColorStop(1, p.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // radial spokes
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = withAlpha(p.gold, 0.5);
  ctx.lineWidth = 1;
  for (let i = 0; i < 36; i += 1) {
    const a = (Math.PI * 2 * i) / 36;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.16, Math.sin(a) * R * 0.16);
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.stroke();
  }
  ctx.restore();
  petalRing(ctx, cx, cy, R * 0.78, 24, p.gold, { alpha: 0.24, lineWidth: 1.2 });
  petalRing(ctx, cx, cy, R * 0.56, 16, p.goldSoft, { alpha: 0.2, fill: true, tilt: Math.PI / 16 });
  compassRose(ctx, cx, cy, R * 0.44, p.gold, 0.3, 64);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = withAlpha(p.gold, 0.6);
  ctx.lineWidth = Math.max(1.4, W * 0.0035);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  radialGlow(ctx, cx, cy, R * 0.5, p.gold, 0.22);
  grain(ctx, W, H, (o.seed ?? 6) + 7, 0.05);
};

/** 4 · Diagonal motion: hard diagonal colour fields with a light slash. */
const diagonalMotion: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [1, p.deepAlt],
  ]);
  diagonalField(ctx, W, H, p.field, { from: "left", angle: 0.28, offset: -H * 0.12 });
  diagonalField(ctx, W, H, withAlpha(p.gold, 0.16), { from: "left", angle: 0.46, offset: -H * 0.05 });
  ctx.save();
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.55);
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.beginPath();
  ctx.moveTo(W * 0.06, H * 0.66);
  ctx.lineTo(W * 1.02, H * 0.42);
  ctx.stroke();
  ctx.restore();
  radialGlow(ctx, W * 0.82, H * 0.2, W * 0.55, p.accent, 0.16);
  grain(ctx, W, H, (o.seed ?? 8) + 2, 0.05);
};

/** 5 · Framed matte: a heavy gallery mat with a plate aperture shadow. */
const framedMatte: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deepAlt],
    [1, p.deep],
  ]);
  const pad = Math.min(W, H) * 0.055;
  ctx.save();
  const mat = ctx.createLinearGradient(0, 0, W, H);
  mat.addColorStop(0, p.light ? "#FFFFFF" : withAlpha(p.deepAlt, 0.9));
  mat.addColorStop(1, p.light ? p.deepAlt : withAlpha(p.deep, 0.9));
  ctx.fillStyle = mat;
  ctx.fillRect(pad, pad, W - pad * 2, H - pad * 2);
  ctx.restore();
  doubleRule(ctx, pad, pad, W - pad * 2, H - pad * 2, p.gold, { weight: Math.max(2, W * 0.004), gap: W * 0.014, alpha: 0.75, corners: true });
  // subtle vignette inside the mat
  radialGlow(ctx, W * 0.5, H * 0.36, W * 0.7, p.gold, 0.1);
  grain(ctx, W, H, (o.seed ?? 9) + 5, 0.04);
};

/** 6 · Cosmic depth: nebula fields, starfield, orbit rings, planet limb. */
const cosmicDepth: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [0.55, p.deepAlt],
    [1, p.deep],
  ]);
  radialGlow(ctx, W * 0.22, H * 0.18, W * 0.9, p.accent, 0.2);
  radialGlow(ctx, W * 0.86, H * 0.62, W * 0.8, p.gold, 0.14);
  starfield(ctx, W, H, p.ink, 150, (o.seed ?? 12) + 1);
  const cx = W * (o.focusX ?? 0.5);
  const cy = H * (o.focusY ?? 0.38);
  orbitRing(ctx, cx, cy, W * 0.44, H * 0.2, -0.32, p.gold, 0.34, Math.max(1.2, W * 0.0022));
  orbitRing(ctx, cx, cy, W * 0.36, H * 0.15, 0.24, p.goldSoft, 0.2, Math.max(1, W * 0.0016), [8, 12]);
  orbitRing(ctx, cx, cy, W * 0.52, H * 0.26, 0.08, p.accent, 0.16, Math.max(1, W * 0.0014));
  orbitBody(ctx, cx, cy, W * 0.44, H * 0.2, -0.32, Math.PI * 0.62, W * 0.016, p.accent, 30);
  orbitBody(ctx, cx, cy, W * 0.36, H * 0.15, 0.24, Math.PI * 1.3, W * 0.011, p.goldSoft, 22);
  grain(ctx, W, H, (o.seed ?? 2) + 9, 0.05);
};

/** 7 · Type field: near-flat paper with one oversized ghost glyph and a rule. */
const typeField: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [1, p.deepAlt],
  ]);
  // A Latin transliteration watermark, not a Devanagari glyph: the suite paints
  // English only, and a Sanskrit term is written out in English letters.
  ctx.save();
  ctx.globalAlpha = p.light ? 0.055 : 0.085;
  ctx.fillStyle = p.gold;
  ctx.font = `700 ${Math.round(H * 0.34)}px Cinzel, Georgia, serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillText("OM", W * 0.94, H * 0.8);
  ctx.restore();
  radialGlow(ctx, W * 0.5, H * 0.28, W * 0.8, p.gold, 0.1);
  ctx.fillStyle = withAlpha(p.gold, 0.4);
  ctx.fillRect(W * 0.07, H * 0.16, W * 0.02, H * 0.1);
  grain(ctx, W, H, (o.seed ?? 14) + 4, 0.045);
};

/** 8 · Panel grid: stacked information panels, header zone, hairline dividers. */
const panelGrid: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [1, p.deepAlt],
  ]);
  // header band
  const header = ctx.createLinearGradient(0, 0, W, H * 0.22);
  header.addColorStop(0, withAlpha(p.field, 0.92));
  header.addColorStop(1, withAlpha(p.deepAlt, 0.5));
  ctx.fillStyle = header;
  ctx.fillRect(0, 0, W, H * 0.2);
  ctx.fillStyle = withAlpha(p.gold, 0.7);
  ctx.fillRect(0, H * 0.2, W, Math.max(1.5, H * 0.0022));
  // panel chrome lines
  ctx.save();
  ctx.strokeStyle = withAlpha(p.gold, 0.14);
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, H * 0.2 + ((H * 0.8) / 5) * i);
    ctx.lineTo(W, H * 0.2 + ((H * 0.8) / 5) * i);
    ctx.stroke();
  }
  ctx.restore();
  radialGlow(ctx, W * 0.14, H * 0.1, W * 0.5, p.gold, 0.16);
  grain(ctx, W, H, (o.seed ?? 15) + 6, 0.04);
};

/** 9 · Commercial band: bold top block, light middle, heavy CTA footer. */
const commercialBand: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deepAlt],
    [1, p.deep],
  ]);
  const bandH = H * 0.44;
  const band = ctx.createLinearGradient(0, 0, W * 0.4, bandH);
  band.addColorStop(0, p.field);
  band.addColorStop(0.6, withAlpha(p.field, 0.85));
  band.addColorStop(1, withAlpha(p.deep, 0.9));
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, bandH * 0.82);
  ctx.lineTo(0, bandH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = withAlpha(p.gold, 0.55);
  ctx.fillRect(0, bandH, W, Math.max(2, H * 0.003));
  // footer block
  const footerH = H * 0.13;
  const footer = ctx.createLinearGradient(0, H - footerH, 0, H);
  footer.addColorStop(0, withAlpha(p.deepAlt, 0.2));
  footer.addColorStop(1, withAlpha(p.field, 0.7));
  ctx.fillStyle = footer;
  ctx.fillRect(0, H - footerH, W, footerH);
  radialGlow(ctx, W * 0.78, H * 0.62, W * 0.5, p.gold, 0.13);
  grain(ctx, W, H, (o.seed ?? 16) + 8, 0.05);
};

/** 10 · Narrative layers: overlapping mountain/wave silhouettes in recession. */
const narrativeLayers: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deepAlt],
    [0.45, p.deep],
    [1, p.deepAlt],
  ]);
  radialGlow(ctx, W * 0.68, H * 0.24, W * 0.6, p.accent, 0.18);
  // sun disc
  ctx.save();
  ctx.globalAlpha = 0.5;
  const disc = ctx.createLinearGradient(0, H * 0.16, 0, H * 0.4);
  disc.addColorStop(0, p.goldSoft);
  disc.addColorStop(1, withAlpha(p.gold, 0.2));
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(W * 0.68, H * 0.28, W * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const bands = 4;
  for (let i = 0; i < bands; i += 1) {
    const baseY = H * (0.52 + i * 0.11);
    const amp = H * (0.05 - i * 0.008);
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    const rng = rand((o.seed ?? 7) + i * 13);
    for (let x = 0; x <= W; x += W / 12) {
      ctx.lineTo(x, baseY - Math.sin((x / W) * Math.PI * (1.4 + i * 0.4) + i) * amp * (0.6 + rng() * 0.8));
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    const shade = ctx.createLinearGradient(0, baseY - amp, 0, H);
    shade.addColorStop(0, withAlpha(p.field, 0.85 - i * 0.16));
    shade.addColorStop(1, withAlpha(p.deep, 0.95));
    ctx.fillStyle = shade;
    ctx.fill();
  }
  grain(ctx, W, H, (o.seed ?? 17) + 3, 0.05);
};

/** 11 · Collage blocks: asymmetric rectangles of tone, offset and overlapping. */
const collageBlocks: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [1, p.deepAlt],
  ]);
  const rng = rand(o.seed ?? 21);
  const blocks = [
    { x: -0.06, y: 0.06, w: 0.62, h: 0.34, fill: withAlpha(p.field, 0.9), rot: -0.03 },
    { x: 0.5, y: 0.02, w: 0.56, h: 0.22, fill: withAlpha(p.gold, 0.14), rot: 0.02 },
    { x: 0.44, y: 0.56, w: 0.62, h: 0.4, fill: withAlpha(p.field, 0.55), rot: 0.015 },
    { x: -0.04, y: 0.72, w: 0.4, h: 0.3, fill: withAlpha(p.accent, 0.16), rot: -0.02 },
  ];
  blocks.forEach((b) => {
    ctx.save();
    ctx.translate(W * (b.x + b.w / 2), H * (b.y + b.h / 2));
    ctx.rotate(b.rot);
    ctx.fillStyle = b.fill;
    ctx.fillRect((-W * b.w) / 2, (-H * b.h) / 2, W * b.w, H * b.h);
    ctx.strokeStyle = withAlpha(p.gold, 0.22);
    ctx.lineWidth = 1;
    ctx.strokeRect((-W * b.w) / 2, (-H * b.h) / 2, W * b.w, H * b.h);
    ctx.restore();
  });
  for (let i = 0; i < 5; i += 1) {
    radialGlow(ctx, rng() * W, rng() * H, W * 0.3, p.gold, 0.07);
  }
  grain(ctx, W, H, (o.seed ?? 22) + 1, 0.05);
};

/** 12 · Quiet paper: near-empty, one gold hairline, one deep tonal shift. */
const quietPaper: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [0.72, p.deep],
    [1, p.deepAlt],
  ]);
  // The frame is ornament, so it follows the decoration control: a quiet card is
  // pure field, a rich one wears the full rule and its corner tick.
  if (activeDetail !== "quiet") {
    ctx.save();
    ctx.strokeStyle = withAlpha(p.gold, activeDetail === "rich" ? 0.6 : 0.5);
    ctx.lineWidth = Math.max(1, W * (activeDetail === "rich" ? 0.0022 : 0.0016));
    ctx.strokeRect(W * 0.08, H * 0.07, W * 0.84, H * 0.86);
    if (activeDetail === "rich") {
      ctx.strokeRect(W * 0.09, H * 0.08, W * 0.82, H * 0.84);
    }
    ctx.restore();
  }
  if (activeDetail !== "quiet") {
    ctx.fillStyle = withAlpha(p.gold, 0.85);
    ctx.fillRect(W * 0.08, H * 0.07, W * 0.1, Math.max(2, H * 0.0026));
  }
  radialGlow(ctx, W * 0.12, H * 0.92, W * 0.7, p.gold, 0.1);
  grain(ctx, W, H, (o.seed ?? 23) + 2, activeDetail === "rich" ? 0.045 : 0.03);
};

/** 13 · Festival burst: hanging garlands, radiating festive geometry, warm base. */
const festivalBurst: GroundPainter = (ctx, W, H, p, o) => {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.8);
  g.addColorStop(0, p.field);
  g.addColorStop(0.5, p.deepAlt);
  g.addColorStop(1, p.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  rays(ctx, W * 0.5, H * 0.42, Math.max(W, H) * 0.7, p.goldSoft, 20, 0.2, Math.PI * 2, -Math.PI / 2, 3);
  // toran swags along the top
  const swags = Math.max(2, Math.round((ornamentCount(6) * 5) / 6));
  ctx.save();
  ctx.strokeStyle = withAlpha(p.gold, 0.7);
  ctx.lineWidth = Math.max(1.4, W * 0.0026);
  for (let i = 0; i < swags; i += 1) {
    const x0 = (W / swags) * i;
    const x1 = (W / swags) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(x0, H * 0.03);
    ctx.quadraticCurveTo((x0 + x1) / 2, H * 0.105, x1, H * 0.03);
    ctx.stroke();
    for (let d = 1; d < 6; d += 1) {
      const t = d / 6;
      const bx = x0 + (x1 - x0) * t;
      const by = H * 0.03 + Math.sin(Math.PI * t) * H * 0.055;
      ctx.fillStyle = withAlpha(p.goldSoft, 0.8);
      ctx.beginPath();
      ctx.arc(bx, by + H * 0.008, W * 0.0055, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // marigold garland columns
  ctx.save();
  ctx.globalAlpha = 0.28;
  [0.055, 0.945].forEach((fx) => {
    const rng = rand((o.seed ?? 31) + fx * 100);
    for (let y = H * 0.12; y < H * 0.95; y += H * 0.028) {
      ctx.fillStyle = rng() > 0.5 ? p.accent : p.goldSoft;
      ctx.beginPath();
      ctx.arc(W * fx, y, W * 0.008 + rng() * W * 0.003, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
  radialGlow(ctx, W * 0.5, H * 0.42, W * 0.45, p.gold, 0.2);
  grain(ctx, W, H, (o.seed ?? 32) + 7, 0.05);
};

/** 14 · Split panels: hard vertical division with a differing tonal field. */
const splitPanels: GroundPainter = (ctx, W, H, p, o) => {
  const split = o.focusX ?? 0.46;
  const left = ctx.createLinearGradient(0, 0, 0, H);
  left.addColorStop(0, p.deep);
  left.addColorStop(1, p.deepAlt);
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, W * split, H);
  const right = ctx.createLinearGradient(W * split, 0, W, H);
  right.addColorStop(0, p.field);
  right.addColorStop(1, p.deepAlt);
  ctx.fillStyle = right;
  ctx.fillRect(W * split, 0, W * (1 - split), H);
  // seam
  ctx.fillStyle = withAlpha(p.gold, 0.8);
  ctx.fillRect(W * split - Math.max(1.5, W * 0.0018), 0, Math.max(3, W * 0.0036), H);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(W * split + W * 0.02 + i * W * 0.014, H * 0.06);
    ctx.lineTo(W * split + W * 0.02 + i * W * 0.014, H * 0.94);
    ctx.stroke();
  }
  ctx.restore();
  radialGlow(ctx, W * (split + (1 - split) / 2), H * 0.3, W * 0.4, p.gold, 0.14);
  grain(ctx, W, H, (o.seed ?? 33) + 4, 0.045);
};

/** 15 · Geometric astrology: polygon constellation, grid, chart quadrants. */
const geometricAstro: GroundPainter = (ctx, W, H, p, o) => {
  linearField(ctx, W, H, [
    [0, p.deep],
    [0.5, p.deepAlt],
    [1, p.deep],
  ]);
  const cx = W * 0.5;
  const cy = H * (o.focusY ?? 0.4);
  // chart quadrant grid — the kundali register, abstracted
  ctx.save();
  ctx.translate(cx, cy);
  const R = Math.min(W, H) * 0.42;
  ctx.strokeStyle = withAlpha(p.gold, 0.28);
  ctx.lineWidth = Math.max(1, W * 0.0016);
  ctx.strokeRect(-R, -R, R * 2, R * 2);
  ctx.strokeStyle = withAlpha(p.gold, 0.18);
  [-R / 3, R / 3].forEach((v) => {
    ctx.beginPath();
    ctx.moveTo(v, -R);
    ctx.lineTo(v, R);
    ctx.moveTo(-R, v);
    ctx.lineTo(R, v);
    ctx.stroke();
  });
  // diagonal house lines
  ctx.strokeStyle = withAlpha(p.accentSoft, 0.2);
  [
    [-R, 0],
    [0, -R],
    [0, R],
    [R, 0],
  ].forEach(([x, y], i) => {
    const to = [
      [0, -R],
      [R, 0],
      [0, R],
      [-R, 0],
    ][i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  });
  ctx.restore();
  // constellation polygon
  const rng = rand(o.seed ?? 41);
  const points = Array.from({ length: 7 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 7 + rng() * 0.2;
    const r = Math.min(W, H) * (0.24 + rng() * 0.14);
    return { x: W * 0.5 + Math.cos(a) * r, y: H * 0.42 + Math.sin(a) * r * 0.9 };
  });
  ctx.save();
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.4);
  ctx.lineWidth = Math.max(1, W * 0.0015);
  ctx.beginPath();
  points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
  ctx.closePath();
  ctx.stroke();
  points.forEach((pt, i) => {
    const r = i % 3 === 0 ? W * 0.012 : W * 0.007;
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 3);
    g.addColorStop(0, withAlpha(p.goldSoft, 0.95));
    g.addColorStop(1, withAlpha(p.gold, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.goldSoft;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  starfield(ctx, W, H, p.ink, 70, (o.seed ?? 42) + 1);
  grain(ctx, W, H, (o.seed ?? 43) + 1, 0.05);
};

export const GROUNDS: Record<GroundKey, GroundPainter> = {
  sanctum,
  "editorial-rule": editorialRule,
  "mandala-rose": mandalaRose,
  "diagonal-motion": diagonalMotion,
  "framed-matte": framedMatte,
  "cosmic-depth": cosmicDepth,
  "type-field": typeField,
  "panel-grid": panelGrid,
  "commercial-band": commercialBand,
  "narrative-layers": narrativeLayers,
  "collage-blocks": collageBlocks,
  "quiet-paper": quietPaper,
  "festival-burst": festivalBurst,
  "split-panels": splitPanels,
  "geometric-astro": geometricAstro,
};

export function paintGround(ctx: CanvasRenderingContext2D, key: GroundKey, W: number, H: number, palette: Palette, options: GroundOptions = {}) {
  const painter = GROUNDS[key] ?? GROUNDS.sanctum;
  const previous = activeDetail;
  activeDetail = options.detail ?? "balanced";
  ctx.save();
  try {
    painter(ctx, W, H, palette, options);
  } finally {
    ctx.restore();
    activeDetail = previous;
  }
}
