/**
 * Astrosivam Design System · devotional emblems
 *
 * Every deity emblem is authored in a fixed **1000-unit square** with the symbol
 * centred on the origin. Authors in that space get three things a size-relative
 * drawing cannot:
 *
 *   · stroke weights that hold their optical value at any output size, because
 *     a 16-unit stroke is always 1.6 % of the emblem;
 *   · real brush character — every major contour is a *filled tapered strip*,
 *     not a uniform stroke, which is what separates an illustration from a
 *     clip-art glyph;
 *   · geometry that composes: halo, torana arch, plate, lotus and lamps are
 *     separate layers a motion preset can reveal in order.
 *
 * Iconography is kept correct and restrained: each deity carries its own
 * attributes (Ganesha's trunk and modaka, Shiva's trishul and damaru, Murugan's
 * vel and peacock fan, Lakshmi's kalash, Saraswati's veena and swan, Durga's
 * shield, Rama's bow, Hanuman's gada, Venkateswara's chakra and namam). No
 * invented forms, no faces drawn as cartoons.
 */

import type { Palette } from "./palettes";
import { rand, withAlpha } from "../lib/canvas";

export type Point = { x: number; y: number };

/* -------------------------------- primitives ------------------------------ */

/** A filled strip that follows a sampled path, tapering from w0 to w1. */
export function tapered(ctx: CanvasRenderingContext2D, path: Point[], w0: number, w1: number) {
  if (path.length < 2) return;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < path.length; i += 1) {
    const t = i / (path.length - 1);
    const half = (w0 + (w1 - w0) * t) / 2;
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push({ x: path[i].x + nx * half, y: path[i].y + ny * half });
    right.push({ x: path[i].x - nx * half, y: path[i].y - ny * half });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i -= 1) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();
}

/** Sample a cubic bezier into `steps` points. */
export function cubic(p0: Point, c1: Point, c2: Point, p1: Point, steps = 24): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    });
  }
  return out;
}

/** A quadratic sampled to points. */
export function quad(p0: Point, c: Point, p1: Point, steps = 18): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    out.push({ x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y });
  }
  return out;
}

export function ringPath(points: Point[]) {
  const ctxPath = new Path2D();
  points.forEach((p, i) => (i === 0 ? ctxPath.moveTo(p.x, p.y) : ctxPath.lineTo(p.x, p.y)));
  return ctxPath;
}

/** A petal: two mirrored arcs meeting at a tip. */
export function petal(ctx: CanvasRenderingContext2D, base: Point, tip: Point, width: number) {
  const mx = (base.x + tip.x) / 2;
  const my = (base.y + tip.y) / 2;
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo(mx + nx * width, my + ny * width, tip.x, tip.y);
  ctx.quadraticCurveTo(mx - nx * width, my - ny * width, base.x, base.y);
  ctx.closePath();
}

/** Metal ramp in emblem space (y from -500 to 500). */
function ramps(ctx: CanvasRenderingContext2D, p: Palette) {
  const body = ctx.createLinearGradient(0, -500, 0, 500);
  if (p.light) {
    body.addColorStop(0, p.goldDeep);
    body.addColorStop(0.26, p.gold);
    body.addColorStop(0.46, p.goldSoft);
    body.addColorStop(0.7, p.gold);
    body.addColorStop(1, p.goldDeep);
  } else {
    body.addColorStop(0, p.goldDeep);
    body.addColorStop(0.2, p.gold);
    body.addColorStop(0.42, p.goldSoft);
    body.addColorStop(0.6, p.gold);
    body.addColorStop(0.85, p.goldDeep);
    body.addColorStop(1, p.gold);
  }
  const soft = ctx.createLinearGradient(0, -500, 0, 500);
  soft.addColorStop(0, withAlpha(p.goldSoft, 0.9));
  soft.addColorStop(0.5, withAlpha(p.light ? p.gold : p.goldSoft, 0.55));
  soft.addColorStop(1, withAlpha(p.goldDeep, 0.8));
  return { body, soft };
}

/* -------------------------------- layers --------------------------------- */

/** Radiating halo: two rings, a bead chain, and a fan of filled tapered rays. */
export function halo(ctx: CanvasRenderingContext2D, p: Palette, o: { radius: number; rays?: number; reveal?: number; inner?: number }) {
  const R = o.radius;
  const rv = o.reveal ?? 1;
  const rays = o.rays ?? 40;
  const inner = o.inner ?? R * 1.02;
  const { body, soft } = ramps(ctx, p);
  if (rv <= 0.01) return;

  // ray fan, drawn as tapered wedges so it reads as a carved sunburst
  ctx.save();
  ctx.globalAlpha = rv * 0.85;
  for (let i = 0; i < rays; i += 1) {
    const a = (Math.PI * 2 * i) / rays - Math.PI / 2;
    const long = i % 2 === 0;
    const outer = R * (long ? 1.62 : 1.34);
    const halfW = (Math.PI / rays) * (long ? 0.44 : 0.3);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - halfW) * inner, Math.sin(a - halfW) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a + halfW) * inner, Math.sin(a + halfW) * inner);
    ctx.closePath();
    ctx.fillStyle = long ? withAlpha(p.gold, 0.4) : withAlpha(p.gold, 0.16);
    ctx.fill();
  }
  ctx.restore();

  // rings
  ctx.save();
  ctx.globalAlpha = rv;
  [1.0, 1.1].forEach((k, i) => {
    ctx.beginPath();
    ctx.arc(0, 0, R * k, 0, Math.PI * 2);
    ctx.strokeStyle = i === 0 ? body : soft;
    ctx.lineWidth = i === 0 ? 7 : 3;
    ctx.stroke();
  });
  // bead chain on the outer ring
  const beads = 56;
  for (let i = 0; i < beads; i += 1) {
    const a = (Math.PI * 2 * i) / beads;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05, i % 4 === 0 ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i % 4 === 0 ? p.goldSoft : withAlpha(p.gold, 0.7);
    ctx.fill();
  }
  ctx.restore();
}

/** Cusped temple arch band — the torana behind a sanctum emblem. */
export function torana(ctx: CanvasRenderingContext2D, p: Palette, o: { radius: number; reveal?: number }) {
  const R = o.radius;
  const rv = o.reveal ?? 1;
  if (rv <= 0.01) return;
  const { body } = ramps(ctx, p);
  ctx.save();
  ctx.globalAlpha = rv;
  const steps = 9;
  ctx.beginPath();
  const start = Math.PI * 1.06;
  const end = Math.PI * -0.06;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = start + (end - start) * t;
    const rr = R * (i % 2 === 0 ? 1.24 : 1.34);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = body;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.stroke();
  // inner hairline
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = start + (end - start) * t;
    const rr = R * (i % 2 === 0 ? 1.15 : 1.24);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.6);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // finial at the apex
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.42);
  ctx.quadraticCurveTo(R * 0.1, -R * 1.32, 0, -R * 1.18);
  ctx.quadraticCurveTo(-R * 0.1, -R * 1.32, 0, -R * 1.42);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.restore();
}

/** Layered lotus pedestal: three arcs of petals, drawn as a seat. */
export function lotusSeat(ctx: CanvasRenderingContext2D, p: Palette, o: { radius: number; y: number; reveal?: number }) {
  const R = o.radius;
  const rv = o.reveal ?? 1;
  if (rv <= 0.01) return;
  const { body } = ramps(ctx, p);
  ctx.save();
  ctx.globalAlpha = rv;
  const rows: Array<[number, number, number, number]> = [
    [9, 0.78, 0.34, 0],
    [7, 0.56, 0.26, 26],
    [5, 0.36, 0.2, 48],
  ];
  rows.forEach(([count, spreadScale, alpha, dy]) => {
    for (let i = 0; i < count; i += 1) {
      const u = count === 1 ? 0 : (i - (count - 1) / 2) / ((count - 1) / 2);
      const baseX = u * R * 0.66 * spreadScale;
      const baseY = o.y + dy;
      petal(ctx, { x: baseX, y: baseY }, { x: baseX + u * R * 0.1, y: baseY + R * 0.3 * spreadScale }, R * 0.11 * spreadScale);
      ctx.fillStyle = withAlpha(p.gold, alpha);
      ctx.fill();
      ctx.strokeStyle = withAlpha(p.goldSoft, 0.85);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
  ctx.restore();
}

/** A standing lamp with a lit flame — the flanking pair. */
export function standingLamp(ctx: CanvasRenderingContext2D, p: Palette, o: { x: number; y: number; scale: number; flame?: number }) {
  const s = o.scale;
  const { body } = ramps(ctx, p);
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s, s);
  // stem
  tapered(ctx, [{ x: 0, y: 0 }, { x: 0, y: -150 }], 16, 10);
  ctx.fillStyle = body;
  ctx.fill();
  // base
  ctx.beginPath();
  ctx.moveTo(-46, 6);
  ctx.quadraticCurveTo(0, 26, 46, 6);
  ctx.lineTo(36, -8);
  ctx.lineTo(-36, -8);
  ctx.closePath();
  ctx.fill();
  // bowl
  ctx.beginPath();
  ctx.moveTo(-54, -150);
  ctx.quadraticCurveTo(0, -108, 54, -150);
  ctx.quadraticCurveTo(0, -186, -54, -150);
  ctx.closePath();
  ctx.fill();
  // flame
  const flame = o.flame ?? 1;
  if (flame > 0.01) {
    const fh = 96 * flame;
    const g = ctx.createLinearGradient(0, -150 - fh, 0, -150);
    g.addColorStop(0, "#FFFCE8");
    g.addColorStop(0.5, p.goldSoft);
    g.addColorStop(1, withAlpha(p.accent, 0.95));
    ctx.beginPath();
    ctx.moveTo(0, -150 - fh);
    ctx.quadraticCurveTo(26, -150 - fh * 0.4, 0, -146);
    ctx.quadraticCurveTo(-26, -150 - fh * 0.4, 0, -150 - fh);
    ctx.fillStyle = g;
    ctx.shadowColor = withAlpha(p.goldSoft, 0.9);
    ctx.shadowBlur = 34 * flame;
    ctx.fill();
  }
  ctx.restore();
}

/** A slim marigold arc hugging the top of the plate. */
export function garland(ctx: CanvasRenderingContext2D, p: Palette, o: { radius: number; seed?: number; reveal?: number }) {
  const rv = o.reveal ?? 1;
  if (rv <= 0.01) return;
  const rng = rand(o.seed ?? 9);
  ctx.save();
  ctx.globalAlpha = rv * 0.9;
  for (let i = 0; i <= 26; i += 1) {
    const t = i / 26;
    const a = Math.PI * (0.14 + 0.72 * t);
    const x = -Math.cos(a) * o.radius * 0.94;
    const y = -Math.sin(a) * o.radius * 0.94;
    ctx.beginPath();
    ctx.arc(x, y, 4 + rng() * 3, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(i % 4 === 0 ? p.accentSoft : p.accent, 0.8);
    ctx.fill();
  }
  ctx.restore();
}

/* -------------------------------- symbols -------------------------------- */
/* Authored in the 1000-unit space; the symbol occupies roughly ±360. */

export type SymbolPainter = (ctx: CanvasRenderingContext2D, p: Palette, reveal: number) => void;

/**
 * Ganesha: the elephant head, built the way a temple relief is built — a wide
 * bell dome, two great fans for ears, a curling trunk that holds the modaka, and
 * a tiered crown seated *on* the dome rather than floating above it.
 */
const ganesha: SymbolPainter = (ctx, p, reveal) => {
  const { body, soft } = ramps(ctx, p);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // --- ears: two swept fans, widest at the cheek, tilted outward ------------
  [-1, 1].forEach((dir) => {
    ctx.save();
    ctx.scale(dir, 1);
    // outer edge: from the brow, out and down, then back to the jaw
    const outer = cubic({ x: 120, y: -300 }, { x: 430, y: -330 }, { x: 470, y: 90 }, { x: 210, y: 220 }, 28);
    const inner = cubic({ x: 210, y: 220 }, { x: 70, y: 170 }, { x: 78, y: -180 }, { x: 120, y: -300 }, 20);
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    outer.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    inner.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.closePath();
    const earFill = ctx.createLinearGradient(120, -320, 440, 220);
    earFill.addColorStop(0, withAlpha(p.gold, 0.34));
    earFill.addColorStop(0.55, withAlpha(p.goldSoft, 0.14));
    earFill.addColorStop(1, withAlpha(p.goldDeep, 0.26));
    ctx.fillStyle = earFill;
    ctx.fill();
    ctx.strokeStyle = body;
    ctx.lineWidth = 13;
    ctx.stroke();
    // three curved fold lines that echo the outer edge
    [0.34, 0.58, 0.8].forEach((k) => {
      const fold = cubic(
        { x: 214 + 26 * k, y: -282 + 52 * k },
        { x: 250 + 150 * k, y: -286 + 120 * k },
        { x: 244 + 176 * k, y: 96 - 20 * k },
        { x: 268 - 14 * k, y: 176 - 44 * k },
        20,
      );
      tapered(ctx, fold, 7, 2);
      ctx.fillStyle = withAlpha(p.light ? p.gold : p.goldSoft, 0.5);
      ctx.fill();
    });
    // inner ear shadow
    ctx.beginPath();
    ctx.arc(250, -40, 96, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.deep, 0.16);
    ctx.fill();
    ctx.restore();
  });

  // --- head: a bell dome, widest at the cheeks ------------------------------
  const head = cubic({ x: -186, y: 150 }, { x: -216, y: -300 }, { x: 216, y: -300 }, { x: 186, y: 150 }, 30);
  ctx.beginPath();
  ctx.moveTo(head[0].x, head[0].y);
  head.forEach((pt) => ctx.lineTo(pt.x, pt.y));
  // jaw: a soft curve closing the bell
  const jaw = quad({ x: 186, y: 150 }, { x: 0, y: 232 }, { x: -186, y: 150 }, 20);
  jaw.forEach((pt) => ctx.lineTo(pt.x, pt.y));
  ctx.closePath();
  const headFill = ctx.createRadialGradient(-70, -140, 24, 0, -20, 380);
  headFill.addColorStop(0, withAlpha(p.goldSoft, 0.44));
  headFill.addColorStop(0.62, withAlpha(p.gold, 0.24));
  headFill.addColorStop(1, withAlpha(p.goldDeep, 0.3));
  ctx.fillStyle = headFill;
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 14;
  ctx.stroke();

  // --- crown: three tapering tiers with a lotus finial ----------------------
  [
    { w: 236, y: -286, h: 54 },
    { w: 186, y: -338, h: 44 },
    { w: 132, y: -382, h: 34 },
  ].forEach((tier) => {
    ctx.beginPath();
    ctx.moveTo(-tier.w / 2, tier.y);
    ctx.quadraticCurveTo(0, tier.y - 16, tier.w / 2, tier.y);
    ctx.lineTo(tier.w * 0.32, tier.y + tier.h);
    ctx.quadraticCurveTo(0, tier.y + tier.h + 12, -tier.w * 0.32, tier.y + tier.h);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.goldDeep, 0.55);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });
  // finial: a bud on a stem
  ctx.beginPath();
  ctx.moveTo(0, -470);
  ctx.quadraticCurveTo(30, -432, 0, -404);
  ctx.quadraticCurveTo(-30, -432, 0, -470);
  ctx.fillStyle = body;
  ctx.fill();
  tapered(ctx, [{ x: 0, y: -404 }, { x: 0, y: -384 }], 8, 8);
  ctx.fillStyle = body;
  ctx.fill();

  // --- brow band and tilak ------------------------------------------------
  const brow = quad({ x: -164, y: -128 }, { x: 0, y: -190 }, { x: 164, y: -128 }, 22);
  tapered(ctx, brow, 15, 15);
  ctx.fillStyle = soft;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -138, 26, 42, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.accent, 0.95);
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.85);
  ctx.lineWidth = 4;
  ctx.stroke();

  // --- eyes: almond lenses with a lash line and a pupil ---------------------
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(dir * 46, -48);
    ctx.quadraticCurveTo(dir * 104, -92, dir * 146, -46);
    ctx.quadraticCurveTo(dir * 100, -18, dir * 46, -48);
    ctx.closePath();
    ctx.fillStyle = withAlpha(p.deep, 0.5);
    ctx.fill();
    ctx.strokeStyle = soft;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dir * 96, -50, 8, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.ink, 0.95);
    ctx.fill();
  });

  // --- tusks: tapered crescents, one whole and one broken -------------------
  const rightTusk = quad({ x: 120, y: 4 }, { x: 196, y: 152 }, { x: 116, y: 238 }, 18);
  tapered(ctx, rightTusk, 38, 5);
  ctx.fillStyle = "#FFFDF3";
  ctx.fill();
  const leftTusk = quad({ x: -120, y: 4 }, { x: -184, y: 104 }, { x: -138, y: 152 }, 14);
  tapered(ctx, leftTusk, 34, 10);
  ctx.fillStyle = "#FFFDF3";
  ctx.fill();

  // --- trunk: one continuous S-curve ending in a curl ----------------------
  const trunk = cubic({ x: 0, y: 40 }, { x: -28, y: 268 }, { x: 214, y: 306 }, { x: 200, y: 118 }, 34).concat(
    cubic({ x: 200, y: 118 }, { x: 198, y: 42 }, { x: 148, y: 34 }, { x: 134, y: 96 }, 22).slice(1),
  );
  const upto = Math.max(2, Math.floor(trunk.length * Math.max(0.06, reveal)));
  const ink = trunk.slice(0, upto);
  tapered(ctx, ink, 70, 34);
  ctx.fillStyle = body;
  ctx.fill();
  // ridge highlight along the trunk
  tapered(ctx, ink.map((pt) => ({ x: pt.x - 14, y: pt.y - 10 })), 14, 6);
  ctx.fillStyle = withAlpha("#FFF9E2", 0.42);
  ctx.fill();
  // trunk tip band
  const tip = ink[ink.length - 1];
  if (tip) {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 17, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.goldDeep, 0.9);
    ctx.fill();
  }

  // --- modaka, held in the curl -------------------------------------------
  ctx.beginPath();
  ctx.arc(126, 150, 46, 0, Math.PI * 2);
  const sweet = ctx.createRadialGradient(110, 132, 6, 126, 150, 48);
  sweet.addColorStop(0, "#FFFCEB");
  sweet.addColorStop(0.55, p.accentSoft);
  sweet.addColorStop(1, p.accent);
  ctx.fillStyle = sweet;
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.9);
  ctx.lineWidth = 5;
  ctx.stroke();
};

/** Shiva: trishul with damaru, crescent and a nandi band. */
const shiva: SymbolPainter = (ctx, p, reveal) => {
  const { body, soft } = ramps(ctx, p);
  ctx.lineCap = "round";
  // shaft
  tapered(ctx, [{ x: 0, y: -260 }, { x: 0, y: 380 * Math.max(0.1, reveal) }], 30, 22);
  ctx.fillStyle = body;
  ctx.fill();
  // prongs
  [-1, 0, 1].forEach((dir) => {
    const tip = { x: dir * (dir === 0 ? 0 : 210), y: dir === 0 ? -470 : -400 };
    const path =
      dir === 0
        ? quad({ x: 0, y: -180 }, { x: 0, y: -360 }, tip, 20)
        : quad({ x: dir * 190, y: -150 }, { x: dir * 250, y: -330 }, tip, 22);
    tapered(ctx, path, dir === 0 ? 34 : 26, 6);
    ctx.fillStyle = body;
    ctx.fill();
    if (dir !== 0) {
      // shoulder of the prong
      tapered(ctx, quad({ x: dir * 190, y: -150 }, { x: dir * 220, y: -60 }, { x: dir * 150, y: -20 }, 12), 22, 8);
      ctx.fillStyle = body;
      ctx.fill();
    }
  });
  // cross bar
  tapered(ctx, [{ x: -190, y: -160 }, { x: 190, y: -160 }], 22, 22);
  ctx.fillStyle = body;
  ctx.fill();
  // damaru
  ctx.save();
  ctx.translate(0, 90);
  ctx.beginPath();
  ctx.moveTo(-96, -52);
  ctx.quadraticCurveTo(0, -20, 96, -52);
  ctx.lineTo(52, 56);
  ctx.quadraticCurveTo(0, 84, -52, 56);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.gold, 0.35);
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-96, -52);
  ctx.lineTo(96, -52);
  ctx.strokeStyle = soft;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // crescent moon at the shaft crown
  ctx.beginPath();
  ctx.arc(150, -300, 78, Math.PI * 0.24, Math.PI * 1.72);
  ctx.strokeStyle = withAlpha(p.ink, 0.92);
  ctx.lineWidth = 20;
  ctx.stroke();
  // tripundra three lines
  [0, 30, 60].forEach((dy, i) => {
    tapered(ctx, [{ x: -110, y: 220 + dy }, { x: 110, y: 220 + dy }], 14 - i * 3, 14 - i * 3);
    ctx.fillStyle = withAlpha("#FFF9EA", 0.85 - i * 0.2);
    ctx.fill();
  });
};

/** Murugan: the vel blade with a peacock eye fan and a spear crossbar. */
const murugan: SymbolPainter = (ctx, p, reveal) => {
  const { body } = ramps(ctx, p);
  // peacock fan
  for (let i = -5; i <= 5; i += 1) {
    const a = (i / 5) * 0.72 - Math.PI / 2;
    const len = 330 + Math.cos(i * 0.36) * 74;
    ctx.save();
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-70, -len * 0.6, 0, -len);
    ctx.quadraticCurveTo(70, -len * 0.6, 0, 0);
    ctx.closePath();
    const feather = ctx.createLinearGradient(0, 0, 0, -len);
    feather.addColorStop(0, withAlpha(p.accent, 0.1));
    feather.addColorStop(0.55, withAlpha(p.accent, 0.28));
    feather.addColorStop(1, withAlpha(p.accentSoft, 0.5));
    ctx.fillStyle = feather;
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.accentSoft, 0.6);
    ctx.lineWidth = 3;
    ctx.stroke();
    // the eye of the feather
    ctx.beginPath();
    ctx.ellipse(0, -len * 0.8, 22, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.goldSoft, 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -len * 0.8, 11, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.deep, 0.85);
    ctx.fill();
    ctx.restore();
  }
  // shaft
  tapered(ctx, [{ x: 0, y: 400 * Math.max(0.1, reveal) }, { x: 0, y: -190 }], 34, 24);
  ctx.fillStyle = body;
  ctx.fill();
  // blade
  const blade = ctx.createLinearGradient(-110, -470, 110, -140);
  blade.addColorStop(0, "#FFFDF4");
  blade.addColorStop(0.45, p.goldSoft);
  blade.addColorStop(1, p.goldDeep);
  ctx.beginPath();
  ctx.moveTo(0, -500);
  ctx.quadraticCurveTo(112, -330, 0, -150);
  ctx.quadraticCurveTo(-112, -330, 0, -500);
  ctx.closePath();
  ctx.fillStyle = blade;
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldDeep, 0.9);
  ctx.lineWidth = 5;
  ctx.stroke();
  // blade ridge
  tapered(ctx, [{ x: 0, y: -468 }, { x: 0, y: -190 }], 12, 4);
  ctx.fillStyle = withAlpha("#FFFFFF", 0.75);
  ctx.fill();
  // crossbar with two small spheres
  tapered(ctx, [{ x: -170, y: -140 }, { x: 170, y: -140 }], 22, 22);
  ctx.fillStyle = body;
  ctx.fill();
  [-170, 170].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -140, 26, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.goldSoft, 0.9);
    ctx.fill();
  });
};

/** Lakshmi: kalash with coconut, mango leaves and a coin band. */
const lakshmi: SymbolPainter = (ctx, p, reveal) => {
  const { body, soft } = ramps(ctx, p);
  // pot
  const pot = cubic({ x: -230, y: -60 }, { x: -330, y: 320 }, { x: 330, y: 320 }, { x: 230, y: -60 }, 26);
  ctx.beginPath();
  ctx.moveTo(pot[0].x, pot[0].y);
  pot.forEach((pt) => ctx.lineTo(pt.x, pt.y));
  ctx.closePath();
  const fill = ctx.createRadialGradient(-110, 20, 20, 0, 140, 360);
  fill.addColorStop(0, withAlpha(p.goldSoft, 0.5));
  fill.addColorStop(0.6, withAlpha(p.gold, 0.32));
  fill.addColorStop(1, withAlpha(p.goldDeep, 0.4));
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 13;
  ctx.stroke();
  // neck band
  ctx.beginPath();
  ctx.moveTo(-230, -60);
  ctx.lineTo(-196, -136);
  ctx.lineTo(196, -136);
  ctx.lineTo(230, -60);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.accent, 0.4);
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 8;
  ctx.stroke();
  // coin band
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6;
    const x = -190 + 380 * t;
    const y = 150 + Math.sin(Math.PI * t) * 46;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.strokeStyle = soft;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  // mango leaves
  [-2, -1, 0, 1, 2].forEach((i) => {
    const baseX = i * 44;
    petal(ctx, { x: baseX, y: -140 }, { x: baseX + i * 44, y: -420 + Math.abs(i) * 42 }, 54);
    ctx.fillStyle = withAlpha(p.accent, 0.34);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.accentSoft, 0.9);
    ctx.lineWidth = 4;
    ctx.stroke();
  });
  // coconut
  ctx.beginPath();
  ctx.ellipse(0, -420, 86, 104, 0, 0, Math.PI * 2);
  const nut = ctx.createRadialGradient(-28, -456, 10, 0, -420, 110);
  nut.addColorStop(0, withAlpha(p.goldSoft, 0.95));
  nut.addColorStop(1, withAlpha(p.goldDeep, 0.85));
  ctx.fillStyle = nut;
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 6;
  ctx.stroke();
  // reveal-scaled lotus base
  lotusSeat(ctx, p, { radius: 250, y: 300, reveal });
};

/** Saraswati: veena with strings, and the swan at its neck. */
const saraswati: SymbolPainter = (ctx, p, reveal) => {
  const { body } = ramps(ctx, p);
  ctx.save();
  ctx.rotate(-0.16);
  ctx.translate(0, -20);
  ctx.scale(1.08, 1.08);
  // neck
  ctx.beginPath();
  ctx.moveTo(-72, -400);
  ctx.lineTo(72, -400);
  ctx.lineTo(112, 90);
  ctx.lineTo(-112, 90);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.gold, 0.26);
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 11;
  ctx.stroke();
  // frets
  for (let i = 0; i < 5; i += 1) {
    const y = -340 + i * 84;
    tapered(ctx, [{ x: -60 - i * 8, y }, { x: 60 + i * 8, y }], 8, 8);
    ctx.fillStyle = withAlpha(p.goldSoft, 0.5);
    ctx.fill();
  }
  // resonator
  ctx.beginPath();
  ctx.ellipse(0, 236, 232, 208, 0, 0, Math.PI * 2);
  const res = ctx.createRadialGradient(-80, 160, 20, 0, 236, 240);
  res.addColorStop(0, withAlpha(p.goldSoft, 0.5));
  res.addColorStop(1, withAlpha(p.goldDeep, 0.45));
  ctx.fillStyle = res;
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 236, 116, 100, 0, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.8);
  ctx.lineWidth = 4;
  ctx.stroke();
  // strings, inked progressively
  for (let i = 0; i < 4; i += 1) {
    const x = -48 + (96 * i) / 3;
    tapered(ctx, [{ x, y: -380 }, { x: x * 1.5, y: -60 + 440 * Math.max(0.08, reveal) }], 4, 3);
    ctx.fillStyle = withAlpha(p.ink, 0.55);
    ctx.fill();
  }
  ctx.restore();
  // swan
  ctx.save();
  ctx.translate(-300, 250);
  ctx.beginPath();
  ctx.moveTo(-90, 40);
  ctx.quadraticCurveTo(-30, -20, 10, -40);
  ctx.quadraticCurveTo(60, -60, 62, -8);
  ctx.quadraticCurveTo(60, 20, 30, 4);
  ctx.moveTo(-90, 40);
  ctx.quadraticCurveTo(-20, 76, 70, 40);
  ctx.strokeStyle = withAlpha(p.ink, 0.85);
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(62, -34);
  ctx.lineTo(104, -24);
  ctx.lineTo(62, -12);
  ctx.fillStyle = withAlpha(p.accent, 0.9);
  ctx.fill();
  ctx.restore();
};

/** Durga: a lotus shield with crossed trishul and sword behind it. */
const durga: SymbolPainter = (ctx, p, reveal) => {
  const { body } = ramps(ctx, p);
  // crossed weapons
  [
    [0.5, 1],
    [-0.5, -1],
  ].forEach(([rot, dir]) => {
    ctx.save();
    ctx.rotate(rot);
    tapered(ctx, [{ x: 0, y: -430 }, { x: 0, y: 340 * Math.max(0.1, reveal) }], 20, 14);
    ctx.fillStyle = body;
    ctx.fill();
    if (dir > 0) {
      [-1, 1].forEach((d) => {
        tapered(ctx, quad({ x: 0, y: -330 }, { x: d * 92, y: -420 }, { x: d * 76, y: -490 }, 12), 16, 4);
        ctx.fillStyle = body;
        ctx.fill();
      });
      tapered(ctx, quad({ x: 0, y: -330 }, { x: 0, y: -430 }, { x: 0, y: -500 }, 12), 20, 4);
      ctx.fillStyle = body;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -500);
      ctx.lineTo(-46, -400);
      ctx.lineTo(46, -400);
      ctx.closePath();
      ctx.fillStyle = withAlpha("#FFFDF2", 0.9);
      ctx.fill();
    }
    ctx.restore();
  });
  // shield
  const shield = cubic({ x: 0, y: -360 }, { x: 320, y: -210 }, { x: 268, y: 150 }, { x: 0, y: 372 }, 22).concat(
    cubic({ x: 0, y: 372 }, { x: -268, y: 150 }, { x: -320, y: -210 }, { x: 0, y: -360 }, 22),
  );
  ctx.beginPath();
  ctx.moveTo(shield[0].x, shield[0].y);
  shield.forEach((pt) => ctx.lineTo(pt.x, pt.y));
  ctx.closePath();
  const fill = ctx.createRadialGradient(-70, -120, 20, 0, 0, 430);
  fill.addColorStop(0, withAlpha(p.field, 0.95));
  fill.addColorStop(1, withAlpha(p.deep, 0.95));
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 14;
  ctx.stroke();
  // lotus on the shield
  for (let i = 0; i < 16; i += 1) {
    const a = (Math.PI * 2 * i) / 16;
    petal(ctx, { x: Math.cos(a) * 60, y: Math.sin(a) * 60 }, { x: Math.cos(a) * 250, y: Math.sin(a) * 250 }, 44);
    ctx.strokeStyle = withAlpha(p.goldSoft, i % 2 ? 0.35 : 0.7);
    ctx.lineWidth = i % 2 ? 3 : 5;
    ctx.stroke();
  }
  // trishul of the goddess: a small third eye at the centre
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 52, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.accent, 0.95);
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.9);
  ctx.lineWidth = 5;
  ctx.stroke();
};

/** Rama: the bow with drawn string and a nocked arrow. */
const rama: SymbolPainter = (ctx, p, reveal) => {
  const { body } = ramps(ctx, p);
  // bow limbs, drawn as tapered arcs
  tapered(ctx, cubic({ x: -150, y: -420 }, { x: 300, y: -200 }, { x: 300, y: 200 }, { x: -150, y: 420 }, 30), 34, 34);
  ctx.fillStyle = body;
  ctx.fill();
  // grip
  tapered(ctx, [{ x: 96, y: -70 }, { x: 96, y: 70 }], 56, 56);
  ctx.fillStyle = withAlpha(p.goldDeep, 0.9);
  ctx.fill();
  // string, tensioned by the reveal
  const pull = 60 * Math.max(0, Math.min(1, reveal));
  tapered(ctx, [{ x: -150, y: -420 }, { x: -60 - pull, y: 0 }, { x: -150, y: 420 }], 7, 7);
  ctx.fillStyle = withAlpha(p.ink, 0.85);
  ctx.fill();
  // arrow
  tapered(ctx, [{ x: -300, y: 0 }, { x: 360, y: 0 }], 14, 10);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(420, 0);
  ctx.lineTo(330, -44);
  ctx.lineTo(330, 44);
  ctx.closePath();
  ctx.fillStyle = withAlpha("#FFFDF2", 0.95);
  ctx.fill();
  // fletching
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(-300, 0);
    ctx.lineTo(-210, dir * 68);
    ctx.lineTo(-150, dir * 12);
    ctx.closePath();
    ctx.fillStyle = withAlpha(p.accent, 0.85);
    ctx.fill();
  });
};

/** Hanuman: the gada with ribbed head and a mountain silhouette. */
const hanuman: SymbolPainter = (ctx, p, reveal) => {
  const { body } = ramps(ctx, p);
  // mountain range behind the gada
  ctx.save();
  ctx.globalAlpha *= 0.42;
  ctx.beginPath();
  ctx.moveTo(-360, 330);
  ctx.lineTo(-210, 130);
  ctx.lineTo(-90, 280);
  ctx.lineTo(60, 70);
  ctx.lineTo(200, 290);
  ctx.lineTo(360, 160);
  ctx.lineTo(360, 360);
  ctx.lineTo(-360, 360);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.field, 0.9);
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.gold, 0.55);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.scale(0.82, 0.82);
  ctx.rotate(0.14);
  tapered(ctx, [{ x: 0, y: 420 * Math.max(0.1, reveal) }, { x: 0, y: -110 }], 40, 30);
  ctx.fillStyle = body;
  ctx.fill();
  // head
  const head = ctx.createLinearGradient(-160, -420, 160, -40);
  head.addColorStop(0, p.goldDeep);
  head.addColorStop(0.32, p.goldSoft);
  head.addColorStop(0.62, p.gold);
  head.addColorStop(1, p.goldDeep);
  ctx.beginPath();
  ctx.ellipse(0, -250, 180, 236, 0, 0, Math.PI * 2);
  ctx.fillStyle = head;
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldDeep, 0.9);
  ctx.lineWidth = 6;
  ctx.stroke();
  // ribs
  [-120, -40, 40, 120].forEach((dy) => {
    ctx.beginPath();
    ctx.ellipse(0, -250 + dy, 176, 30, 0, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(p.goldDeep, 0.6);
    ctx.lineWidth = 5;
    ctx.stroke();
  });
  // finial
  ctx.beginPath();
  ctx.moveTo(0, -540);
  ctx.quadraticCurveTo(58, -490, 0, -430);
  ctx.quadraticCurveTo(-58, -490, 0, -540);
  ctx.fillStyle = withAlpha(p.goldSoft, 0.95);
  ctx.fill();
  ctx.restore();
};

/** Venkateswara: the namam, the chakra and the conch. */
const venkateswara: SymbolPainter = (ctx, p, reveal) => {
  const { body } = ramps(ctx, p);
  // namam
  ctx.save();
  [-1, 1].forEach((dir) => {
    tapered(ctx, quad({ x: dir * 210, y: 60 }, { x: dir * 230, y: -190 }, { x: dir * 150, y: -300 }, 18), 46, 26);
    ctx.fillStyle = withAlpha("#FFFBEC", 0.95);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.ellipse(0, -70, 62, 118, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.accent, 0.95);
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.9);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  // chakra
  ctx.save();
  ctx.translate(-280, 210);
  ctx.beginPath();
  ctx.arc(0, 0, 170 * Math.max(0.1, reveal), 0, Math.PI * 2);
  ctx.strokeStyle = body;
  ctx.lineWidth = 18;
  ctx.stroke();
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12;
    tapered(ctx, [{ x: Math.cos(a) * 54, y: Math.sin(a) * 54 }, { x: Math.cos(a) * 168, y: Math.sin(a) * 168 }], 14, 6);
    ctx.fillStyle = body;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.goldSoft, 0.9);
  ctx.fill();
  ctx.restore();
  // conch
  ctx.save();
  ctx.translate(290, 210);
  ctx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const a = (i / 120) * Math.PI * 4;
    const r = (168 * i) / 120;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.78;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = body;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-120, 40);
  ctx.quadraticCurveTo(-40, 130, 60, 96);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.75);
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
};

/** Ayyappa: the mala bead ring around a dharma sastha spear. */
const ayyappa: SymbolPainter = (ctx, p, reveal) => {
  const { body } = ramps(ctx, p);
  // mala ring behind
  for (let i = 0; i < 28; i += 1) {
    const a = (Math.PI * 2 * i) / 28;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 340, Math.sin(a) * 340 * 0.9 - 20, 17, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(i % 2 ? p.gold : p.accent, 0.85);
    ctx.fill();
  }
  tapered(ctx, [{ x: 0, y: 420 * Math.max(0.1, reveal) }, { x: 0, y: -420 }], 34, 22);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -540);
  ctx.quadraticCurveTo(104, -440, 0, -330);
  ctx.quadraticCurveTo(-104, -440, 0, -540);
  ctx.fillStyle = withAlpha("#FFFDF2", 0.95);
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldDeep, 0.6);
  ctx.lineWidth = 4;
  ctx.stroke();
};

const SYMBOLS: Record<string, SymbolPainter> = {
  ganesha,
  shiva,
  murugan,
  lakshmi,
  saraswati,
  durga,
  rama,
  hanuman,
  venkateswara,
  ayyappa,
  krishna: saraswati,
  meenakshi: durga,
};

export const SYMBOL_KEYS = Object.keys(SYMBOLS);
export const resolveSymbol = (key?: string): SymbolPainter => SYMBOLS[key ?? "ganesha"] ?? ganesha;

/* ------------------------------ the full emblem --------------------------- */

export interface EmblemOptions {
  palette: Palette;
  /** Emblem radius in output pixels (the symbol space is 1000 units wide). */
  radius: number;
  reveal?: number;
  variant?: number;
  subject?: string;
  seed?: number;
  /** Draw the flanking lamps and garland. */
  ornate?: boolean;
  /** `rich` closes the ornament into a full frame; `quiet` is handled by `ornate`. */
  detail?: "quiet" | "balanced" | "rich";
}

/**
 * Compose a devotional emblem. Layers in reveal order:
 *   plate → halo → torana → symbol → lotus → lamps → garland.
 */
export function drawEmblem(ctx: CanvasRenderingContext2D, o: EmblemOptions) {
  const p = o.palette;
  const reveal = Math.max(0, Math.min(1, o.reveal ?? 1));
  if (reveal <= 0.001) return;
  const R = o.radius;
  // author in a 1000-unit space scaled to the requested radius (R = 500 units)
  const scale = R / 500;
  const ornate = o.ornate ?? true;
  const stage = (a: number, b: number) => Math.max(0, Math.min(1, (reveal - a) / (b - a)));

  ctx.save();
  ctx.scale(scale, scale);

  // 1 · halo
  halo(ctx, p, { radius: 470, rays: o.variant ? 48 : 40, reveal: stage(0, 0.32), inner: 468 });

  // 2 · torana arch
  torana(ctx, p, { radius: 470, reveal: stage(0.12, 0.44) });

  // 3 · painted plate
  const plateStage = stage(0.02, 0.24);
  if (plateStage > 0) {
    ctx.save();
    ctx.globalAlpha = plateStage;
    const rng = rand(o.seed ?? 7);
    ctx.beginPath();
    const pts = 26;
    for (let i = 0; i <= pts; i += 1) {
      const a = (Math.PI * 2 * i) / pts;
      const r = 460 * (0.98 + rng() * 0.03);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const fill = ctx.createRadialGradient(-140, -180, 20, 0, 0, 520);
    if (p.light) {
      fill.addColorStop(0, withAlpha("#FFFFFF", 0.96));
      fill.addColorStop(0.6, withAlpha(p.field, 0.4));
      fill.addColorStop(1, withAlpha(p.deepAlt, 0.5));
    } else {
      fill.addColorStop(0, withAlpha(p.field, 0.98));
      fill.addColorStop(0.62, withAlpha(p.deepAlt, 0.96));
      fill.addColorStop(1, withAlpha(p.deep, 0.94));
    }
    ctx.fillStyle = fill;
    ctx.fill();
    // ink blooms
    for (let i = 0; i < 5; i += 1) {
      const bx = (rng() - 0.5) * 700;
      const by = (rng() - 0.5) * 700;
      const br = 160 + rng() * 220;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, withAlpha(i % 2 ? p.gold : p.accent, 0.13));
      g.addColorStop(1, withAlpha(i % 2 ? p.gold : p.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    ctx.restore();
  }

  // 4 · the symbol, scaled to the plate
  const symStage = stage(0.2, 0.86);
  if (symStage > 0) {
    ctx.save();
    ctx.scale(0.86, 0.86);
    ctx.translate(0, 30);
    resolveSymbol(o.subject)(ctx, p, symStage);
    ctx.restore();
  }

  // 5 · lotus pedestal (drawn over the symbol's base, like a seat)
  lotusSeat(ctx, p, { radius: 470, y: 292, reveal: stage(0.6, 0.92) });

  // 6 · flanking lamps
  if (ornate) {
    [-1, 1].forEach((dir) => {
      standingLamp(ctx, p, { x: dir * 424, y: 356, scale: 0.62, flame: stage(0.72, 1) });
    });
  }

  // 7 · garland
  if (ornate) garland(ctx, p, { radius: 470, seed: (o.seed ?? 7) + 5, reveal: stage(0.78, 1) });

  // 8 · rich cards close the ornament into a full frame, so the decoration reads
  // as a finished border rather than a row of dots down the margin.
  if (ornate && o.detail === "rich") {
    ctx.save();
    ctx.globalAlpha *= stage(0.12, 0.9);
    ctx.strokeStyle = withAlpha(p.gold, 0.3);
    ctx.lineWidth = Math.max(1, 5);
    ctx.beginPath();
    ctx.arc(0, 0, 528, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
