/**
 * Astrosivam Design System · illustration library
 *
 * Everything here is drawn, not photographed. The artwork language is temple
 * relief: symmetric construction, layered metal ramps, fine line work, and a
 * deliberate absence of rendered skin or photographic shading. At any size it
 * reads as printed graphic illustration rather than a cropped photo.
 *
 * Each program takes a box and a `reveal` (0–1) so the motion engine can build
 * an illustration up layer by layer: halo → crest → symbol → lotus → spark.
 *
 * Programs are pure canvas: no fonts beyond the Google-safe stacks already
 * shipped, no DOM, deterministic from `seed`.
 */

import type { Palette } from "./palettes";
import { rand, withAlpha } from "../lib/canvas";
import { drawEmblem } from "./emblems";

export type ArtKind =
  | "deity-emblem"
  | "celestial-scene"
  | "zodiac-medallion"
  | "jathagam-chart"
  | "couple-seal"
  | "letter-bloom"
  | "auspicious-date"
  | "navagraha-grid"
  | "festive-altar"
  | "service-badge"
  | "narrative-scene"
  | "mandala-rose";

/** What a composition asks the library to draw. */
export interface ArtPlan {
  kind: ArtKind;
  subject?: string;
  variant?: number;
  seed?: number;
}

export interface ArtBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArtRequest {
  ctx: CanvasRenderingContext2D;
  box: ArtBox;
  palette: Palette;
  /** 0–1 build-up, used by the animation engine. */
  reveal?: number;
  seed?: number;
  /** Which emblem / glyph / scene. */
  subject?: string;
  /** 0–3 art direction variant: tighter line work, different ring counts, … */
  variant?: number;
  /** Optional headline letters for the typographic art programs. */
  text?: string;
  /**
   * Multiplier for every stroke weight in the program. Programs are authored at
   * a nominal 1000 px box, so a detail drawn for a thumbnail keeps the same
   * optical weight as one drawn for a print plate.
   */
  strokeScale?: number;
  /** How much ornament the program may draw. Defaults to `balanced`. */
  detail?: "quiet" | "balanced" | "rich";
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * The line weight for fine ornament. On a light ground a hairline is invisible,
 * so line work thickens and darkens as the palette gets lighter.
 */
export const lineWeight = (p: Palette, size: number, weight = 1) => Math.max(p.light ? 1.2 : 0.8, size * 0.0055 * weight);

/** The stroke colour for fine ornament, contrast-corrected for the palette. */
export const lineColor = (p: Palette, alpha = 0.55) => withAlpha(p.light ? p.goldDeep : p.goldSoft, alpha);

/**
 * Normalise stroke weights against a nominal authoring size. A program written
 * for a 1000 px box draws with a 1.7 multiplier inside a 500 px box so the line
 * weight stays the same on the page.
 */
export const strokeAt = (size: number, factor: number, extra = 1) =>
  Math.max(0.7, size * factor * extra);

/* ------------------------------- metal ramps ------------------------------ */

/** Vertical brass ramp that stays legible on light and dark grounds. */
export function metal(ctx: CanvasRenderingContext2D, p: Palette, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  if (p.light) {
    // On paper the ramp must stay dark enough to read: mid to deep, with one
    // narrow highlight rather than a full bright swing.
    g.addColorStop(0, p.goldDeep);
    g.addColorStop(0.3, p.gold);
    g.addColorStop(0.48, p.goldSoft);
    g.addColorStop(0.66, p.gold);
    g.addColorStop(1, p.goldDeep);
  } else {
    g.addColorStop(0, p.goldDeep);
    g.addColorStop(0.22, p.gold);
    g.addColorStop(0.46, p.goldSoft);
    g.addColorStop(0.62, p.gold);
    g.addColorStop(0.86, p.goldDeep);
    g.addColorStop(1, p.gold);
  }
  return g;
}

/** Horizontal ramp for rings and bands. */
function metalH(ctx: CanvasRenderingContext2D, p: Palette, x0: number, x1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, p.goldDeep);
  g.addColorStop(0.3, p.gold);
  g.addColorStop(0.52, p.goldSoft);
  g.addColorStop(0.74, p.gold);
  g.addColorStop(1, p.goldDeep);
  return g;
}

function softGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, strength = 0.5) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
  g.addColorStop(0, withAlpha(color, strength));
  g.addColorStop(0.5, withAlpha(color, strength * 0.3));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

/* ------------------------------ mandala engine ---------------------------- */

export interface MandalaOptions {
  cx: number;
  cy: number;
  radius: number;
  petals?: number;
  rings?: number;
  reveal?: number;
  variant?: number;
  /** Draw the petals as filled foil rather than line work. */
  filled?: boolean;
}

/**
 * Procedural mandala. Six variants differ in petal count, ring rhythm and the
 * fill/outline ratio, so a Navagraha poster and a Diwali poster never share the
 * same rose window.
 */
export function drawMandala(ctx: CanvasRenderingContext2D, p: Palette, o: MandalaOptions) {
  const { cx, cy, radius: R } = o;
  const reveal = clamp01(o.reveal ?? 1);
  const variant = (o.variant ?? 0) % 6;
  const petals = o.petals ?? [24, 16, 32, 20, 12, 28][variant];
  const rings = o.rings ?? [3, 4, 2, 5, 3, 4][variant];
  if (reveal <= 0.001) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // halo wash
  softGlow(ctx, 0, 0, R * 1.32, p.gold, 0.16 * reveal);

  const stage = (from: number, to: number) => clamp01((reveal - from) / (to - from));

  // 1 · outer bead ring
  const s1 = stage(0, 0.28);
  if (s1 > 0) {
    ctx.save();
    ctx.globalAlpha = s1;
    ctx.strokeStyle = metal(ctx, p, -R, R);
    ctx.lineWidth = Math.max(1.2, R * 0.012);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2 * s1);
    ctx.stroke();
    const beads = petals * 2;
    const beadR = Math.max(1.1, R * 0.009);
    for (let i = 0; i < beads; i += 1) {
      const a = (Math.PI * 2 * i) / beads;
      if (a > Math.PI * 2 * s1) break;
      ctx.fillStyle = withAlpha(p.goldSoft, 0.8);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94, beadR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 2 · concentric rings
  const s2 = stage(0.1, 0.5);
  if (s2 > 0) {
    ctx.save();
    ctx.globalAlpha = s2 * 0.75;
    for (let r = 1; r <= rings; r += 1) {
      const rr = R * (0.24 + (0.66 * r) / rings);
      ctx.strokeStyle = withAlpha(p.light ? p.goldDeep : p.gold, 0.55);
      ctx.lineWidth = Math.max(p.light ? 1.1 : 0.8, R * (r === rings ? 0.009 : 0.005));
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2 * s2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3 · petal bands
  const s3 = stage(0.22, 0.85);
  if (s3 > 0) {
    ctx.save();
    ctx.globalAlpha = s3;
    const bands: Array<[number, number, number]> = [
      [0.5, 0.86, petals],
      [0.32, 0.52, Math.round(petals * 0.66)],
      [0.16, 0.3, Math.round(petals * 0.4)],
    ];
    bands.forEach(([inner, outer, count], bandIndex) => {
      if (bandIndex >= rings - 1 && rings < 4) return;
      for (let i = 0; i < count; i += 1) {
        const a = (Math.PI * 2 * i) / count + (bandIndex % 2 ? Math.PI / count : 0);
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        const ri = R * inner;
        const ro = R * outer;
        const width = ((Math.PI * 2) / count) * ro * 0.52;
        ctx.moveTo(ri, 0);
        ctx.quadraticCurveTo(ro * 0.72, width, ro, 0);
        ctx.quadraticCurveTo(ro * 0.72, -width, ri, 0);
        ctx.closePath();
        if (o.filled && bandIndex === 0) {
          ctx.fillStyle = withAlpha(p.gold, 0.1 * s3);
          ctx.fill();
        }
        ctx.strokeStyle = bandIndex === 0 ? metal(ctx, p, -ro, ro) : withAlpha(p.light ? p.goldDeep : p.goldSoft, 0.6);
        ctx.lineWidth = Math.max(0.8, R * (bandIndex === 0 ? 0.008 : 0.005));
        ctx.stroke();
        ctx.restore();
      }
    });
    ctx.restore();
  }

  // 4 · centre jewel
  const s4 = stage(0.7, 1);
  if (s4 > 0) {
    ctx.save();
    ctx.globalAlpha = s4;
    const core = ctx.createRadialGradient(-R * 0.04, -R * 0.05, 0, 0, 0, R * 0.2);
    core.addColorStop(0, "#FFF9E4");
    core.addColorStop(0.4, p.goldSoft);
    core.addColorStop(1, withAlpha(p.goldDeep, 0.9));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.16 * s4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.9);
    ctx.lineWidth = Math.max(1, R * 0.008);
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.18, Math.sin(a) * R * 0.18);
      ctx.lineTo(Math.cos(a) * R * 0.26 * s4, Math.sin(a) * R * 0.26 * s4);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* --------------------------------- emblem --------------------------------- */

/** The crest every deity emblem stands in: tiered crown + lotus + halo arc. */
function emblemFrame(ctx: CanvasRenderingContext2D, p: Palette, R: number, reveal: number, variant: number) {
  const s = clamp01(reveal / 0.4);
  ctx.save();
  ctx.globalAlpha = s;
  // lotus base
  const lotusY = R * 0.82;
  for (let i = 0; i < 9; i += 1) {
    const a = -Math.PI / 2 + (Math.PI * i) / 8;
    const rx = R * 0.16;
    ctx.save();
    ctx.translate(0, lotusY);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-rx, R * 0.14, 0, R * 0.34);
    ctx.quadraticCurveTo(rx, R * 0.14, 0, 0);
    ctx.closePath();
    ctx.fillStyle = withAlpha(p.gold, 0.16);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.75);
    ctx.lineWidth = Math.max(1, R * 0.008);
    ctx.stroke();
    ctx.restore();
  }
  // tiered crown finial above the symbol
  const top = -R * 1.02;
  ctx.fillStyle = metal(ctx, p, top, top + R * 0.3);
  [0.16, 0.12, 0.08].forEach((size, i) => {
    const w = R * size * 2;
    const y = top + i * R * 0.13;
    ctx.beginPath();
    ctx.moveTo(-w / 2, y);
    ctx.lineTo(w / 2, y);
    ctx.lineTo(w * 0.32, y + R * 0.1);
    ctx.lineTo(-w * 0.32, y + R * 0.1);
    ctx.closePath();
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(-R * 0.05, top);
  ctx.quadraticCurveTo(0, top - R * 0.18, R * 0.05, top);
  ctx.closePath();
  ctx.fill();
  if (variant >= 1) {
    // flanking florets
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * R * 0.82, -R * 0.1);
      ctx.rotate(dir * 0.4);
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.05 * i, R * 0.03, R * 0.06, 0, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(p.goldSoft, 0.6 - i * 0.08);
        ctx.lineWidth = Math.max(0.8, R * 0.006);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
  ctx.restore();
}

/** Elephant-head relief: the Ganesha emblem, built symmetrically. */
function ganeshaRelief(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  ctx.lineJoin = "round";
  // ears
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(dir * R * 0.18, -R * 0.42);
    ctx.quadraticCurveTo(dir * R * 0.92, -R * 0.5, dir * R * 0.86, R * 0.08);
    ctx.quadraticCurveTo(dir * R * 0.8, R * 0.42, dir * R * 0.2, R * 0.3);
    ctx.closePath();
    ctx.fillStyle = withAlpha(p.gold, 0.18);
    ctx.fill();
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1.4, R * 0.016);
    ctx.stroke();
    // inner ear line
    ctx.beginPath();
    ctx.moveTo(dir * R * 0.28, -R * 0.28);
    ctx.quadraticCurveTo(dir * R * 0.66, -R * 0.3, dir * R * 0.66, R * 0.08);
    ctx.quadraticCurveTo(dir * R * 0.6, R * 0.3, dir * R * 0.3, R * 0.22);
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.55);
    ctx.lineWidth = Math.max(0.9, R * 0.008);
    ctx.stroke();
  });
  // head dome
  ctx.beginPath();
  ctx.moveTo(-R * 0.2, R * 0.18);
  ctx.quadraticCurveTo(-R * 0.22, -R * 0.56, 0, -R * 0.58);
  ctx.quadraticCurveTo(R * 0.22, -R * 0.56, R * 0.2, R * 0.18);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.goldSoft, 0.16);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.6, R * 0.018);
  ctx.stroke();
  // brow band + third eye
  ctx.beginPath();
  ctx.moveTo(-R * 0.17, -R * 0.3);
  ctx.quadraticCurveTo(0, -R * 0.36, R * 0.17, -R * 0.3);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.9);
  ctx.lineWidth = Math.max(1.2, R * 0.012);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.28, R * 0.035, R * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.accent, 0.9);
  ctx.fill();
  // eyes
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.ellipse(dir * R * 0.085, -R * 0.16, R * 0.055, R * 0.032, dir * 0.1, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.85);
    ctx.lineWidth = Math.max(1, R * 0.01);
    ctx.stroke();
  });
  // tusks
  [-1, 1].forEach((dir, index) => {
    ctx.beginPath();
    ctx.moveTo(dir * R * 0.1, R * 0.06);
    ctx.quadraticCurveTo(dir * R * 0.16, R * 0.24, dir * (index === 0 ? R * 0.1 : R * 0.13), R * 0.34);
    ctx.strokeStyle = "#FFF8E6";
    ctx.lineWidth = Math.max(1.4, R * 0.02);
    ctx.lineCap = "round";
    ctx.stroke();
  });
  // trunk curve, drawn progressively so the animation can ink it
  const trunkProgress = clamp01(t);
  ctx.beginPath();
  ctx.moveTo(0, R * 0.06);
  const path = new Path2D();
  path.moveTo(0, R * 0.06);
  path.bezierCurveTo(-R * 0.02, R * 0.34, R * 0.28, R * 0.42, R * 0.26, R * 0.2);
  path.bezierCurveTo(R * 0.25, R * 0.08, R * 0.16, R * 0.06, R * 0.12, R * 0.14);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(3, R * 0.07);
  ctx.setLineDash([R * 2.1 * trunkProgress, R * 2.1]);
  ctx.stroke(path);
  ctx.setLineDash([]);
  // modaka in the curl
  ctx.beginPath();
  ctx.arc(R * 0.14, R * 0.2, R * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.accentSoft, 0.9);
  ctx.fill();
  ctx.restore();
}

/** Trident with damaru and crescent — the Shiva emblem. */
function trishul(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  ctx.strokeStyle = g;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // shaft
  ctx.lineWidth = Math.max(2.4, R * 0.045);
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.42);
  ctx.lineTo(0, R * 0.86 * clamp01(t));
  ctx.stroke();
  // prongs
  ctx.lineWidth = Math.max(2, R * 0.036);
  [-1, 0, 1].forEach((dir, i) => {
    const tipY = -R * (i === 1 ? 1.0 : 0.84);
    ctx.beginPath();
    ctx.moveTo(dir * R * 0.36, -R * 0.1);
    ctx.quadraticCurveTo(dir * R * 0.4, tipY * 0.7, dir * R * 0.06, tipY);
    if (dir !== 0) {
      ctx.quadraticCurveTo(dir * R * 0.3, tipY * 0.66, dir * R * 0.2, -R * 0.02);
    }
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-R * 0.36, -R * 0.08);
  ctx.lineTo(R * 0.36, -R * 0.08);
  ctx.stroke();
  // crescent moon
  ctx.beginPath();
  ctx.arc(R * 0.3, -R * 0.62, R * 0.11, Math.PI * 0.2, Math.PI * 1.6);
  ctx.strokeStyle = withAlpha(p.ink, 0.85);
  ctx.lineWidth = Math.max(1.6, R * 0.02);
  ctx.stroke();
  // damaru at the shaft
  ctx.save();
  ctx.translate(-R * 0.0, R * 0.42);
  ctx.beginPath();
  ctx.moveTo(-R * 0.14, -R * 0.1);
  ctx.quadraticCurveTo(0, -R * 0.02, R * 0.14, -R * 0.1);
  ctx.lineTo(R * 0.07, R * 0.1);
  ctx.quadraticCurveTo(0, R * 0.16, -R * 0.07, R * 0.1);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.gold, 0.35);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.2, R * 0.014);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** Vel spear with a peacock fan — the Murugan emblem. */
function velSpear(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  // peacock eye fan
  for (let i = -4; i <= 4; i += 1) {
    const a = (i / 4) * 0.55 - Math.PI / 2;
    const len = R * (0.5 + Math.cos(i * 0.32) * 0.16);
    ctx.save();
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-R * 0.13, -len * 0.6, 0, -len);
    ctx.quadraticCurveTo(R * 0.13, -len * 0.6, 0, 0);
    ctx.closePath();
    ctx.fillStyle = withAlpha(i % 2 ? p.accent : p.accentSoft, 0.13);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.accentSoft, 0.5);
    ctx.lineWidth = Math.max(0.9, R * 0.007);
    ctx.stroke();
    // eye
    ctx.beginPath();
    ctx.ellipse(0, -len * 0.82, R * 0.035, R * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.goldSoft, 0.75);
    ctx.fill();
    ctx.restore();
  }
  // spear
  ctx.strokeStyle = g;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2.2, R * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, R * 0.9 * clamp01(t));
  ctx.lineTo(0, -R * 0.34);
  ctx.stroke();
  // leaf blade
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.98);
  ctx.quadraticCurveTo(R * 0.14, -R * 0.56, 0, -R * 0.32);
  ctx.quadraticCurveTo(-R * 0.14, -R * 0.56, 0, -R * 0.98);
  ctx.closePath();
  const blade = ctx.createLinearGradient(-R * 0.14, -R, R * 0.14, R * 0.2);
  blade.addColorStop(0, "#FFFDF2");
  blade.addColorStop(0.5, p.goldSoft);
  blade.addColorStop(1, p.goldDeep);
  ctx.fillStyle = blade;
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldDeep, 0.9);
  ctx.lineWidth = Math.max(1, R * 0.01);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.9);
  ctx.lineTo(0, -R * 0.38);
  ctx.strokeStyle = withAlpha("#FFFFF2", 0.8);
  ctx.lineWidth = Math.max(0.8, R * 0.008);
  ctx.stroke();
  // cross bar
  ctx.beginPath();
  ctx.moveTo(-R * 0.24, -R * 0.3);
  ctx.lineTo(R * 0.24, -R * 0.3);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.6, R * 0.026);
  ctx.stroke();
  ctx.restore();
}

/** Kalash with coconut and mango leaves — Lakshmi / auspicious emblem. */
function kalash(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  // pot body
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, -R * 0.16);
  ctx.quadraticCurveTo(-R * 0.52, R * 0.42, 0, R * 0.6);
  ctx.quadraticCurveTo(R * 0.52, R * 0.42, R * 0.3, -R * 0.16);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.gold, 0.3);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.8, R * 0.02);
  ctx.stroke();
  // neck bands
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, -R * 0.16);
  ctx.lineTo(-R * 0.24, -R * 0.28);
  ctx.lineTo(R * 0.24, -R * 0.28);
  ctx.lineTo(R * 0.3, -R * 0.16);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.accent, 0.35);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.2, R * 0.012);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-R * 0.26, R * 0.24);
  ctx.quadraticCurveTo(0, R * 0.34, R * 0.26, R * 0.24);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.7);
  ctx.lineWidth = Math.max(1, R * 0.009);
  ctx.stroke();
  // mango leaves
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(i * R * 0.1, -R * 0.3);
    ctx.rotate(i * 0.36);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-R * 0.08, -R * 0.24, 0, -R * 0.44);
    ctx.quadraticCurveTo(R * 0.08, -R * 0.24, 0, 0);
    ctx.closePath();
    ctx.fillStyle = withAlpha(p.accent, 0.3);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.accentSoft, 0.8);
    ctx.lineWidth = Math.max(0.8, R * 0.007);
    ctx.stroke();
    ctx.restore();
  }
  // coconut
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.52, R * 0.13, R * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.goldSoft, 0.55);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.2, R * 0.014);
  ctx.stroke();
  // lotus seat
  for (let i = -3; i <= 3; i += 1) {
    ctx.save();
    ctx.translate(i * R * 0.1, R * 0.6);
    ctx.rotate(i * 0.24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-R * 0.09, R * 0.1, 0, R * 0.24 * clamp01(t));
    ctx.quadraticCurveTo(R * 0.09, R * 0.1, 0, 0);
    ctx.closePath();
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.8);
    ctx.lineWidth = Math.max(0.9, R * 0.008);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Veena and swan — Saraswati. */
function veena(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  ctx.rotate(-0.24);
  // neck
  ctx.beginPath();
  ctx.moveTo(-R * 0.1, -R * 0.9);
  ctx.lineTo(R * 0.1, -R * 0.9);
  ctx.lineTo(R * 0.16, R * 0.2);
  ctx.lineTo(-R * 0.16, R * 0.2);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.gold, 0.22);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.4, R * 0.016);
  ctx.stroke();
  // resonator
  ctx.beginPath();
  ctx.ellipse(0, R * 0.5, R * 0.34, R * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.gold, 0.3);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.6, R * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, R * 0.5, R * 0.18, R * 0.15, 0, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.8);
  ctx.lineWidth = Math.max(0.9, R * 0.008);
  ctx.stroke();
  // strings with a progress wipe
  const strings = 4;
  for (let i = 0; i < strings; i += 1) {
    const x = -R * 0.09 + (R * 0.18 * i) / (strings - 1);
    ctx.beginPath();
    ctx.moveTo(x, -R * 0.86);
    ctx.lineTo(x * 1.1, R * 0.72 * clamp01(t));
    ctx.strokeStyle = withAlpha(p.ink, 0.5);
    ctx.lineWidth = Math.max(0.6, R * 0.005);
    ctx.stroke();
  }
  ctx.restore();
  // swan silhouette to the side
  ctx.save();
  ctx.translate(-R * 0.5, R * 0.46);
  ctx.strokeStyle = withAlpha(p.ink, 0.75);
  ctx.lineWidth = Math.max(1.1, R * 0.012);
  ctx.beginPath();
  ctx.moveTo(-R * 0.16, R * 0.06);
  ctx.quadraticCurveTo(-R * 0.02, -R * 0.12, R * 0.04, -R * 0.16);
  ctx.quadraticCurveTo(R * 0.12, -R * 0.16, R * 0.12, -R * 0.06);
  ctx.quadraticCurveTo(R * 0.1, -R * 0.02, R * 0.06, -R * 0.06);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(R * 0.12, -R * 0.15);
  ctx.lineTo(R * 0.2, -R * 0.13);
  ctx.stroke();
  ctx.restore();
}

/** Bow, arrow and quiver — Rama. */
function bowArrow(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  ctx.strokeStyle = g;
  ctx.lineCap = "round";
  // bow
  ctx.lineWidth = Math.max(2, R * 0.032);
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, -R * 0.86);
  ctx.quadraticCurveTo(R * 0.46, 0, -R * 0.3, R * 0.86);
  ctx.stroke();
  // string, drawn progressively
  const s = clamp01(t);
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, -R * 0.86);
  ctx.lineTo(-R * 0.3 + R * 0.1 * s, 0);
  ctx.lineTo(-R * 0.3, R * 0.86 * s);
  ctx.strokeStyle = withAlpha(p.ink, 0.7);
  ctx.lineWidth = Math.max(1, R * 0.009);
  ctx.stroke();
  // arrow
  ctx.beginPath();
  ctx.moveTo(-R * 0.72, 0);
  ctx.lineTo(R * 0.5, 0);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.8, R * 0.024);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(R * 0.5, 0);
  ctx.lineTo(R * 0.3, -R * 0.1);
  ctx.lineTo(R * 0.3, R * 0.1);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, p, -R * 0.1, R * 0.1);
  ctx.fill();
  // fletching
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.72, 0);
    ctx.lineTo(-R * 0.56, dir * R * 0.14);
    ctx.lineTo(-R * 0.44, dir * R * 0.02);
    ctx.closePath();
    ctx.fillStyle = withAlpha(p.accent, 0.65);
    ctx.fill();
  });
  ctx.restore();
}

/** Gada mace and mountain — Hanuman. */
function mace(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  ctx.rotate(0.18);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(2.2, R * 0.038);
  ctx.beginPath();
  ctx.moveTo(0, R * 0.9 * clamp01(t));
  ctx.lineTo(0, -R * 0.2);
  ctx.stroke();
  // head
  const head = ctx.createLinearGradient(-R * 0.34, -R, R * 0.34, 0);
  head.addColorStop(0, p.goldDeep);
  head.addColorStop(0.35, p.goldSoft);
  head.addColorStop(0.62, p.gold);
  head.addColorStop(1, p.goldDeep);
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.52, R * 0.3, R * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = head;
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.goldDeep, 0.9);
  ctx.lineWidth = Math.max(1.2, R * 0.012);
  ctx.stroke();
  // ribs
  [-0.3, -0.1, 0.1].forEach((dy) => {
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.52 + R * dy, R * 0.3, R * 0.08, 0, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(p.goldDeep, 0.55);
    ctx.lineWidth = Math.max(0.8, R * 0.007);
    ctx.stroke();
  });
  // finial
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.92);
  ctx.quadraticCurveTo(R * 0.1, -R * 0.82, 0, -R * 0.7);
  ctx.quadraticCurveTo(-R * 0.1, -R * 0.82, 0, -R * 0.92);
  ctx.fillStyle = withAlpha(p.goldSoft, 0.9);
  ctx.fill();
  ctx.restore();
}

/** Chakra, conch and namam — Venkateswara. */
function chakraConch(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  const s = clamp01(t);
  // namam: two uprights + centre
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, -R * 0.3);
  ctx.quadraticCurveTo(0, -R * 0.24, R * 0.3, -R * 0.3);
  ctx.strokeStyle = withAlpha("#FFF9EA", 0.9);
  ctx.lineWidth = Math.max(2, R * 0.028);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.32, R * 0.045, R * 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.accent, 0.95);
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.3, R * 0.05, R * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  // chakra: ring with spokes
  ctx.save();
  ctx.translate(-R * 0.4, R * 0.3);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.4, R * 0.018);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.24 * s, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1);
    ctx.lineTo(Math.cos(a) * R * 0.24 * s, Math.sin(a) * R * 0.24 * s);
    ctx.lineWidth = Math.max(0.8, R * 0.008);
    ctx.stroke();
  }
  ctx.restore();
  // conch: spiral
  ctx.save();
  ctx.translate(R * 0.42, R * 0.3);
  ctx.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const a = (i / 60) * Math.PI * 4;
    const r = (R * 0.22 * i) / 60;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.8;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1, R * 0.012) * s;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** Crossed sword, trishul and shield — Durga. */
function shaktiArms(ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) {
  const g = metal(ctx, p, -R, R);
  ctx.save();
  const s = clamp01(t);
  // shield
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.84);
  ctx.quadraticCurveTo(R * 0.62, -R * 0.5, R * 0.52, R * 0.16);
  ctx.quadraticCurveTo(R * 0.3, R * 0.74, 0, R * 0.9);
  ctx.quadraticCurveTo(-R * 0.3, R * 0.74, -R * 0.52, R * 0.16);
  ctx.quadraticCurveTo(-R * 0.62, -R * 0.5, 0, -R * 0.84);
  ctx.closePath();
  ctx.fillStyle = withAlpha(p.field, 0.55);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.8, R * 0.022);
  ctx.stroke();
  // inner lotus on the shield
  for (let i = 0; i < 8; i += 1) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 8);
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.1);
    ctx.quadraticCurveTo(R * 0.09, -R * 0.3, 0, -R * 0.46);
    ctx.quadraticCurveTo(-R * 0.09, -R * 0.3, 0, -R * 0.1);
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.6);
    ctx.lineWidth = Math.max(0.8, R * 0.007);
    ctx.stroke();
    ctx.restore();
  }
  // crossed trishul and sword behind the shield
  [
    [-0.5, 1],
    [0.5, -1],
  ].forEach(([rot, dir]) => {
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1.8, R * 0.022);
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.02);
    ctx.lineTo(0, R * (0.3 + 0.5 * s));
    ctx.stroke();
    if (dir > 0) {
      // trident head
      [-1, 1].forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(0, -R * 0.72);
        ctx.quadraticCurveTo(d * R * 0.2, -R * 0.9, d * R * 0.16, -R * 1.04);
        ctx.stroke();
      });
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -R * 1.02);
      ctx.lineTo(-R * 0.09, -R * 0.86);
      ctx.lineTo(R * 0.09, -R * 0.86);
      ctx.closePath();
      ctx.fillStyle = withAlpha(p.goldSoft, 0.85);
      ctx.fill();
    }
    ctx.restore();
  });
  ctx.restore();
}

const EMBLEMS: Record<string, (ctx: CanvasRenderingContext2D, p: Palette, R: number, t: number) => void> = {
  ganesha: ganeshaRelief,
  shiva: trishul,
  murugan: velSpear,
  lakshmi: kalash,
  saraswati: veena,
  durga: shaktiArms,
  krishna: veena,
  rama: bowArrow,
  hanuman: mace,
  venkateswara: chakraConch,
  ayyappa: mace,
  meenakshi: velSpear,
};

/**
 * A brush-stroke plate: an irregular painted field that turns a gold line drawing
 * into a picture. Seeded, so the same design always gets the same brush work.
 */
function inkPlate(ctx: CanvasRenderingContext2D, p: Palette, R: number, seed: number, strength = 1) {
  const rng = rand(seed);
  ctx.save();
  ctx.beginPath();
  const points = 18;
  for (let i = 0; i <= points; i += 1) {
    const a = (Math.PI * 2 * i) / points;
    const r = R * (0.9 + rng() * 0.16);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const pa = (Math.PI * 2 * (i - 1)) / points;
      const pr = R * (0.9 + rng() * 0.16);
      ctx.quadraticCurveTo(Math.cos((a + pa) / 2) * r * 1.06, Math.sin((a + pa) / 2) * r * 1.06, x, y);
      void pr;
    }
  }
  ctx.closePath();
  const fill = ctx.createRadialGradient(-R * 0.25, -R * 0.3, 0, 0, 0, R * 1.15);
  if (p.light) {
    fill.addColorStop(0, withAlpha("#FFFFFF", 0.92 * strength));
    fill.addColorStop(0.55, withAlpha(p.field, 0.5 * strength));
    fill.addColorStop(1, withAlpha(p.deepAlt, 0.42 * strength));
  } else {
    fill.addColorStop(0, withAlpha(p.field, 0.95 * strength));
    fill.addColorStop(0.6, withAlpha(p.deepAlt, 0.92 * strength));
    fill.addColorStop(1, withAlpha(p.deep, 0.9 * strength));
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.gold, 0.22);
  ctx.lineWidth = Math.max(1, R * 0.006);
  ctx.stroke();
  // inks: soft tonal blooms so the plate is never a flat disc
  for (let i = 0; i < 5; i += 1) {
    const bx = (rng() - 0.5) * R * 1.4;
    const by = (rng() - 0.5) * R * 1.4;
    const br = R * (0.24 + rng() * 0.3);
    softGlow(ctx, bx, by, br, i % 2 ? p.gold : p.accent, 0.1 * strength);
  }
  ctx.restore();
}

/**
 * A deity emblem: crest, halo, symbol relief, lotus footing. Composition-safe —
 * it always fills its box and never relies on an external image.
 */
export function drawDeityEmblem(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, variant = 0, seed = 7, subject } = r;
  const R = Math.min(box.w, box.h) * 0.5;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  drawEmblem(ctx, { palette: p, radius: R, reveal, variant, subject, seed, ornate: r.detail !== "quiet" && box.w > 220, detail: r.detail });
  ctx.restore();
}

/* ------------------------------ celestial scene --------------------------- */

/** Layered planets, orbital rings and a nebula — the astrology register. */
export function drawCelestialScene(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, seed = 7, variant = 0 } = r;
  const R = Math.min(box.w, box.h) * 0.46;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const rng = rand(seed);
  ctx.save();
  ctx.translate(cx, cy);
  const stage = (a: number, b: number) => clamp01((reveal - a) / (b - a));

  // nebula washes
  const neb = stage(0, 0.4);
  if (neb > 0) {
    ctx.save();
    ctx.globalAlpha = neb * 0.5;
    for (let i = 0; i < 4; i += 1) {
      const gx = (rng() - 0.5) * R * 2.4;
      const gy = (rng() - 0.5) * R * 2;
      softGlow(ctx, gx, gy, R * (0.7 + rng() * 0.5), i % 2 ? p.accent : p.gold, 0.3);
    }
    ctx.restore();
  }

  // orbit rings
  const orb = stage(0.15, 0.7);
  if (orb > 0) {
    ctx.save();
    ctx.globalAlpha = orb;
    const orbits = 3 + variant;
    for (let i = 1; i <= orbits; i += 1) {
      ctx.save();
      ctx.rotate(-0.42 + i * 0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * (0.5 + i * 0.22) * orb, R * (0.2 + i * 0.1) * orb, 0, 0, Math.PI * 2);
      ctx.strokeStyle = withAlpha(i % 2 ? p.gold : p.accentSoft, i % 2 ? 0.45 : 0.3);
      ctx.lineWidth = Math.max(0.9, R * (i === 1 ? 0.009 : 0.005));
      ctx.setLineDash(i % 2 ? [] : [R * 0.06, R * 0.05]);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // central planet with terminator
  const planet = stage(0.2, 0.75);
  if (planet > 0) {
    const pr = R * 0.52 * planet;
    const g = ctx.createRadialGradient(-pr * 0.34, -pr * 0.4, pr * 0.1, 0, 0, pr);
    g.addColorStop(0, p.light ? "#FFFFFF" : withAlpha(p.goldSoft, 0.98));
    g.addColorStop(0.42, p.gold);
    g.addColorStop(0.78, p.goldDeep);
    g.addColorStop(1, p.light ? p.field : withAlpha(p.deep, 0.96));
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    // latitude bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.clip();
    [-0.4, -0.05, 0.3, 0.62].forEach((dy, i) => {
      ctx.beginPath();
      ctx.ellipse(0, pr * dy, pr * 1.05, pr * 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(i % 2 ? p.goldSoft : p.deep, 0.16);
      ctx.fill();
    });
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.55);
    ctx.lineWidth = Math.max(1, R * 0.008);
    ctx.stroke();
  }

  // ringed planet to the side (Saturn register)
  const side = stage(0.5, 1);
  if (side > 0) {
    ctx.save();
    ctx.translate(R * 0.86, -R * 0.62);
    const sr = R * 0.2 * side;
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.accentSoft, 0.5);
    ctx.fill();
    ctx.save();
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, sr * 1.9, sr * 0.42, 0, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.7);
    ctx.lineWidth = Math.max(1, sr * 0.16);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    // small moon
    ctx.save();
    ctx.translate(-R * 0.9, R * 0.7);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.09 * side, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.ink, 0.75);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(R * 0.035 * side, -R * 0.02 * side, R * 0.085 * side, 0, Math.PI * 2);
    ctx.fillStyle = p.deep;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------ zodiac medallion -------------------------- */

const ZODIAC_GLYPHS: Record<string, (ctx: CanvasRenderingContext2D, R: number) => void> = {
  aries: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.5, R * 0.4);
    ctx.quadraticCurveTo(-R * 0.4, -R * 0.5, 0, -R * 0.12);
    ctx.quadraticCurveTo(R * 0.4, -R * 0.5, R * 0.5, R * 0.4);
    ctx.moveTo(0, -R * 0.12);
    ctx.lineTo(0, R * 0.4);
    ctx.stroke();
  },
  taurus: (ctx, R) => {
    ctx.beginPath();
    ctx.arc(0, R * 0.16, R * 0.36, 0, Math.PI * 2);
    ctx.moveTo(-R * 0.46, -R * 0.5);
    ctx.quadraticCurveTo(-R * 0.2, -R * 0.2, 0, -R * 0.18);
    ctx.quadraticCurveTo(R * 0.2, -R * 0.2, R * 0.46, -R * 0.5);
    ctx.stroke();
  },
  gemini: (ctx, R) => {
    ctx.beginPath();
    [-1, 1].forEach((d) => {
      ctx.moveTo(d * R * 0.3, -R * 0.5);
      ctx.lineTo(d * R * 0.22, R * 0.5);
    });
    ctx.moveTo(-R * 0.44, -R * 0.5);
    ctx.lineTo(R * 0.44, -R * 0.5);
    ctx.moveTo(-R * 0.4, R * 0.5);
    ctx.lineTo(R * 0.4, R * 0.5);
    ctx.stroke();
  },
  cancer: (ctx, R) => {
    ctx.beginPath();
    ctx.arc(-R * 0.2, -R * 0.16, R * 0.18, 0, Math.PI * 2);
    ctx.arc(R * 0.2, R * 0.16, R * 0.18, 0, Math.PI * 2);
    ctx.moveTo(-R * 0.36, -R * 0.16);
    ctx.lineTo(-R * 0.5, -R * 0.36);
    ctx.moveTo(R * 0.36, R * 0.16);
    ctx.lineTo(R * 0.5, R * 0.36);
    ctx.stroke();
  },
  leo: (ctx, R) => {
    ctx.beginPath();
    ctx.arc(-R * 0.14, R * 0.22, R * 0.16, 0, Math.PI * 2);
    ctx.moveTo(-R * 0.02, R * 0.1);
    ctx.quadraticCurveTo(R * 0.3, -R * 0.1, R * 0.24, -R * 0.42);
    ctx.quadraticCurveTo(R * 0.1, 0, -R * 0.02, R * 0.1);
    ctx.stroke();
  },
  virgo: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.42, -R * 0.4);
    ctx.lineTo(-R * 0.42, R * 0.2);
    ctx.moveTo(-R * 0.14, -R * 0.4);
    ctx.lineTo(-R * 0.14, R * 0.2);
    ctx.moveTo(R * 0.14, -R * 0.4);
    ctx.lineTo(R * 0.14, R * 0.2);
    ctx.quadraticCurveTo(R * 0.4, R * 0.5, R * 0.46, R * 0.1);
    ctx.moveTo(-R * 0.42, -R * 0.4);
    ctx.quadraticCurveTo(-R * 0.2, -R * 0.2, 0.14 * R, -R * 0.2);
    ctx.stroke();
  },
  libra: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.5, R * 0.34);
    ctx.lineTo(R * 0.5, R * 0.34);
    ctx.moveTo(-R * 0.44, R * 0.1);
    ctx.lineTo(R * 0.44, R * 0.1);
    ctx.moveTo(-R * 0.44, R * 0.1);
    ctx.lineTo(-R * 0.2, -R * 0.3);
    ctx.moveTo(R * 0.44, R * 0.1);
    ctx.lineTo(R * 0.2, -R * 0.3);
    ctx.stroke();
  },
  scorpio: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.44, -R * 0.36);
    ctx.lineTo(-R * 0.44, R * 0.2);
    for (let i = -1; i <= 1; i += 1) {
      ctx.moveTo(i * R * 0.24, -R * 0.36);
      ctx.lineTo(i * R * 0.24, R * 0.2);
    }
    ctx.moveTo(R * 0.24, R * 0.2);
    ctx.lineTo(R * 0.42, R * 0.2);
    ctx.lineTo(R * 0.46, R * 0.02);
    ctx.stroke();
  },
  sagittarius: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.4, R * 0.44);
    ctx.lineTo(R * 0.4, -R * 0.4);
    ctx.moveTo(R * 0.16, -R * 0.44);
    ctx.lineTo(R * 0.44, -R * 0.44);
    ctx.lineTo(R * 0.44, -R * 0.16);
    ctx.moveTo(-R * 0.28, -R * 0.12);
    ctx.lineTo(R * 0.12, R * 0.28);
    ctx.stroke();
  },
  capricorn: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.46, -R * 0.32);
    ctx.lineTo(-R * 0.24, R * 0.1);
    ctx.quadraticCurveTo(R * 0.02, R * 0.44, R * 0.2, R * 0.1);
    ctx.quadraticCurveTo(R * 0.36, -R * 0.16, R * 0.46, R * 0.16);
    ctx.stroke();
  },
  aquarius: (ctx, R) => {
    ctx.beginPath();
    [-0.2, 0.16].forEach((dy) => {
      for (let i = 0; i < 3; i += 1) {
        const x = -R * 0.44 + i * R * 0.34;
        ctx.moveTo(x, R * dy);
        ctx.lineTo(x + R * 0.16, R * (dy - 0.18));
        ctx.lineTo(x + R * 0.3, R * dy);
      }
    });
    ctx.stroke();
  },
  pisces: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.4, -R * 0.44);
    ctx.quadraticCurveTo(-R * 0.12, 0, -R * 0.4, R * 0.44);
    ctx.moveTo(R * 0.4, -R * 0.44);
    ctx.quadraticCurveTo(R * 0.12, 0, R * 0.4, R * 0.44);
    ctx.moveTo(-R * 0.32, 0);
    ctx.lineTo(R * 0.32, 0);
    ctx.stroke();
  },
};

export const ZODIAC_KEYS = Object.keys(ZODIAC_GLYPHS);

export function drawZodiacMedallion(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, subject = "aries", variant = 0 } = r;
  const R = Math.min(box.w, box.h) * 0.46;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  drawMandala(ctx, p, { cx: 0, cy: 0, radius: R, reveal: clamp01(reveal / 0.6), variant: 2 + variant, filled: true });
  const glyphStage = clamp01((reveal - 0.3) / 0.7);
  if (glyphStage > 0) {
    ctx.save();
    const scale = 0.86 + 0.14 * glyphStage;
    ctx.scale(scale, scale);
    ctx.globalAlpha = glyphStage;
    ctx.strokeStyle = metal(ctx, p, -R * 0.5, R * 0.5);
    ctx.lineWidth = Math.max(2.4, R * 0.055);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    (ZODIAC_GLYPHS[subject] ?? ZODIAC_GLYPHS.aries)(ctx, R * 0.52);
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------- jathagam chart --------------------------- */

/**
 * South Indian square chart. Houses are geometry; the marks inside are abstract
 * diamonds, never invented placements — the poster must not imply a real reading.
 */
export function drawJathagamChart(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1 } = r;
  const side = Math.min(box.w, box.h) * 0.94;
  const x = box.x + (box.w - side) / 2;
  const y = box.y + (box.h - side) / 2;
  const stage = clamp01(reveal / 0.7);
  ctx.save();
  ctx.globalAlpha = stage;

  // plate
  const plate = ctx.createLinearGradient(x, y, x + side, y + side);
  plate.addColorStop(0, withAlpha(p.field, 0.55));
  plate.addColorStop(1, withAlpha(p.deepAlt, 0.75));
  ctx.fillStyle = plate;
  ctx.fillRect(x, y, side, side);

  // grid
  ctx.strokeStyle = withAlpha(p.gold, 0.85);
  ctx.lineWidth = Math.max(1.4, side * 0.006);
  ctx.strokeRect(x, y, side, side);
  ctx.lineWidth = Math.max(1, side * 0.004);
  ctx.beginPath();
  const third = side / 3;
  for (let i = 1; i <= 2; i += 1) {
    ctx.moveTo(x + third * i, y);
    ctx.lineTo(x + third * i, y + side);
    ctx.moveTo(x, y + third * i);
    ctx.lineTo(x + side, y + third * i);
  }
  ctx.stroke();
  // diagonals of the four corner cells (South Indian convention)
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.6);
  ctx.lineWidth = Math.max(0.9, side * 0.0034);
  [
    [x, y, x + third, y + third],
    [x + side, y, x + side - third, y + third],
    [x, y + side, x + third, y + side - third],
    [x + side, y + side, x + side - third, y + side - third],
  ].forEach(([x0, y0, x1, y1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  });

  // abstract planetary marks
  const marks = [
    [0.5, 0.5],
    [1.5, 0.5],
    [0.5, 1.5],
    [2.5, 1.5],
    [1.5, 2.5],
  ];
  const markStage = clamp01((reveal - 0.45) / 0.55);
  marks.forEach(([mx, my], i) => {
    const px = x + third * mx;
    const py = y + third * my;
    const rr = side * 0.035 * markStage;
    ctx.beginPath();
    ctx.moveTo(px, py - rr);
    ctx.lineTo(px + rr, py);
    ctx.lineTo(px, py + rr);
    ctx.lineTo(px - rr, py);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? withAlpha(p.accentSoft, 0.85) : withAlpha(p.goldSoft, 0.9);
    ctx.fill();
  });
  // centre emblem
  ctx.beginPath();
  ctx.arc(x + side / 2, y + side / 2, side * 0.06 * markStage, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.8);
  ctx.lineWidth = Math.max(1, side * 0.005);
  ctx.stroke();
  ctx.restore();
}

/* --------------------------------- couple seal ---------------------------- */

/** Two interlocking medallions: the wedding-matching mark. */
export function drawCoupleSeal(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1 } = r;
  const R = Math.min(box.w, box.h) * 0.3;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const stage = clamp01(reveal / 0.8);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = stage;
  // A true interlock: each medallion is centred a radius and a half outside the
  // other's centre, so the discs cross by a third rather than sitting apart.
  const gap = R * 1.42;
  [-1, 1].forEach((dir, index) => {
    const x = dir * gap * 0.5;
    ctx.save();
    ctx.translate(x, 0);
    // outer ring
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(index === 0 ? p.field : p.deepAlt, 0.9);
    ctx.fill();
    ctx.strokeStyle = metal(ctx, p, -R, R);
    ctx.lineWidth = Math.max(1.6, R * 0.05);
    ctx.stroke();
    // lotus half
    for (let i = 0; i < 7; i += 1) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 7 + index * 0.3);
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.2);
      ctx.quadraticCurveTo(R * 0.28, -R * 0.5, 0, -R * 0.78);
      ctx.quadraticCurveTo(-R * 0.28, -R * 0.5, 0, -R * 0.2);
      ctx.strokeStyle = withAlpha(p.goldSoft, 0.55);
      ctx.lineWidth = Math.max(0.9, R * 0.03);
      ctx.stroke();
      ctx.restore();
    }
    // centre
    const core = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 0, 0, 0, R * 0.32);
    core.addColorStop(0, "#FFF8E0");
    core.addColorStop(0.5, p.goldSoft);
    core.addColorStop(1, p.goldDeep);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();
    ctx.restore();
  });
  // the vesica where the two discs meet: a diamond, the porutham mark
  ctx.save();
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.85);
  ctx.lineWidth = Math.max(1.4, R * 0.035);
  const d = R * 0.26;
  ctx.strokeRect(-d / 2, -d / 2, d, d);
  ctx.restore();
  ctx.restore();
}

/* -------------------------------- letter bloom --------------------------- */

/** An illuminated initial with a floral frame — baby-naming letter artwork. */
export function drawLetterBloom(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, text = "A", variant = 0 } = r;
  const R = Math.min(box.w, box.h) * 0.46;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const letter = (text || "A").trim().charAt(0).toUpperCase() || "A";
  ctx.save();
  ctx.translate(cx, cy);
  drawMandala(ctx, p, { cx: 0, cy: 0, radius: R, reveal: clamp01(reveal / 0.55), variant: 4 + variant, filled: true });
  const stage = clamp01((reveal - 0.25) / 0.75);
  if (stage > 0) {
    ctx.save();
    ctx.globalAlpha = stage;
    ctx.font = `700 ${Math.round(R * 0.92)}px Cinzel, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = metal(ctx, p, -R * 0.5, R * 0.5);
    ctx.shadowColor = withAlpha(p.deep, 0.6);
    ctx.shadowBlur = R * 0.12;
    ctx.fillText(letter, 0, R * 0.04);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.7);
    ctx.lineWidth = Math.max(0.8, R * 0.012);
    ctx.strokeText(letter, 0, R * 0.04);
    ctx.restore();
    // leaf sprigs
    ctx.save();
    ctx.globalAlpha = stage * 0.8;
    [-1, 1].forEach((dir) => {
      for (let i = 0; i < 4; i += 1) {
        ctx.save();
        ctx.rotate(dir * (0.5 + i * 0.16) + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -R * (0.72 + i * 0.05), R * 0.05, R * 0.14, 0, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(p.accentSoft, 0.5);
        ctx.lineWidth = Math.max(0.8, R * 0.008);
        ctx.stroke();
        ctx.restore();
      }
    });
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------ auspicious date --------------------------- */

/** A calendar plate: month rail, date numeral block, auspicious marks. */
export function drawDateBlock(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, text = "" } = r;
  const w = box.w;
  const h = box.h;
  const stage = clamp01(reveal / 0.75);
  ctx.save();
  ctx.globalAlpha = stage;

  // plate with cut corner
  const cut = Math.min(w, h) * 0.14;
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + cut);
  ctx.lineTo(box.x + cut, box.y);
  ctx.lineTo(box.x + w, box.y);
  ctx.lineTo(box.x + w, box.y + h - cut);
  ctx.lineTo(box.x + w - cut, box.y + h);
  ctx.lineTo(box.x, box.y + h);
  ctx.closePath();
  const plate = ctx.createLinearGradient(box.x, box.y, box.x + w, box.y + h);
  plate.addColorStop(0, withAlpha(p.deepAlt, 0.95));
  plate.addColorStop(1, withAlpha(p.field, 0.85));
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.strokeStyle = withAlpha(p.gold, 0.8);
  ctx.lineWidth = Math.max(1.6, Math.min(w, h) * 0.008);
  ctx.stroke();

  // header rail
  ctx.fillStyle = withAlpha(p.gold, 0.9);
  ctx.fillRect(box.x, box.y, w, Math.max(6, h * 0.1));
  // numeral placeholder geometry (real text is set by the composition)
  const numeralH = h * 0.46;
  ctx.fillStyle = withAlpha(p.goldSoft, 0.12);
  ctx.fillRect(box.x + w * 0.08, box.y + h * 0.2, w * 0.84, numeralH);
  // moon-phase strip
  const phases = 7;
  for (let i = 0; i < phases; i += 1) {
    const px = box.x + w * 0.12 + (w * 0.76 * i) / (phases - 1);
    const py = box.y + h * 0.82;
    const rr = Math.min(w, h) * 0.028;
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.6);
    ctx.lineWidth = Math.max(0.8, rr * 0.2);
    ctx.stroke();
    if (i < phases - 1 && i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(px, py, rr * 0.92, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fillStyle = withAlpha(p.goldSoft, 0.6);
      ctx.fill();
    }
  }
  void text;
  ctx.restore();
}

/* ------------------------------- navagraha grid --------------------------- */

export const NINE_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;

function planetGlyph(ctx: CanvasRenderingContext2D, name: string, R: number, p: Palette) {
  ctx.save();
  ctx.strokeStyle = metal(ctx, p, -R, R);
  ctx.fillStyle = metal(ctx, p, -R, R);
  ctx.lineWidth = Math.max(1.4, R * 0.09);
  ctx.lineCap = "round";
  switch (name) {
    case "Sun": {
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i += 1) {
        const a = (Math.PI * 2 * i) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56);
        ctx.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
        ctx.stroke();
      }
      break;
    }
    case "Moon": {
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.6, Math.PI * 0.35, Math.PI * 1.65);
      ctx.stroke();
      break;
    }
    case "Mars": {
      ctx.beginPath();
      ctx.arc(0, R * 0.2, R * 0.34, 0, Math.PI * 2);
      ctx.moveTo(R * 0.24, -R * 0.04);
      ctx.lineTo(R * 0.62, -R * 0.42);
      ctx.moveTo(R * 0.34, -R * 0.46);
      ctx.lineTo(R * 0.64, -R * 0.46);
      ctx.lineTo(R * 0.64, -R * 0.16);
      ctx.stroke();
      break;
    }
    case "Mercury": {
      ctx.beginPath();
      ctx.arc(0, -R * 0.24, R * 0.26, 0, Math.PI * 2);
      ctx.moveTo(0, R * 0.02);
      ctx.lineTo(0, R * 0.6);
      ctx.moveTo(-R * 0.24, R * 0.3);
      ctx.lineTo(R * 0.24, R * 0.3);
      ctx.moveTo(-R * 0.2, -R * 0.56);
      ctx.lineTo(R * 0.2, -R * 0.56);
      ctx.stroke();
      break;
    }
    case "Jupiter": {
      ctx.beginPath();
      ctx.moveTo(-R * 0.28, -R * 0.52);
      ctx.quadraticCurveTo(-R * 0.5, 0, -R * 0.24, R * 0.2);
      ctx.moveTo(R * 0.24, -R * 0.52);
      ctx.lineTo(R * 0.24, R * 0.5);
      ctx.moveTo(R * 0.02, R * 0.24);
      ctx.lineTo(R * 0.48, R * 0.24);
      ctx.stroke();
      break;
    }
    case "Venus": {
      ctx.beginPath();
      ctx.arc(0, -R * 0.24, R * 0.3, 0, Math.PI * 2);
      ctx.moveTo(0, R * 0.06);
      ctx.lineTo(0, R * 0.64);
      ctx.moveTo(-R * 0.22, R * 0.4);
      ctx.lineTo(R * 0.22, R * 0.4);
      ctx.stroke();
      break;
    }
    case "Saturn": {
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.72, R * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "Rahu": {
      ctx.beginPath();
      ctx.moveTo(-R * 0.5, R * 0.3);
      ctx.quadraticCurveTo(-R * 0.2, -R * 0.6, R * 0.4, -R * 0.34);
      ctx.quadraticCurveTo(R * 0.2, R * 0.5, -R * 0.5, R * 0.3);
      ctx.stroke();
      break;
    }
    default: {
      // Ketu: comet with a tail
      ctx.beginPath();
      ctx.arc(R * 0.24, -R * 0.24, R * 0.22, 0, Math.PI * 2);
      ctx.moveTo(R * 0.06, -R * 0.06);
      ctx.lineTo(-R * 0.5, R * 0.44);
      ctx.moveTo(-R * 0.12, -R * 0.1);
      ctx.lineTo(-R * 0.46, -R * 0.14);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Nine planets as a 3 × 3 grid of house tiles. */
export function drawNavagrahaGrid(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1 } = r;
  const side = Math.min(box.w, box.h);
  const cell = side / 3.4;
  const startX = box.x + (box.w - cell * 3) / 2;
  const startY = box.y + (box.h - cell * 3) / 2;
  NINE_PLANETS.forEach((planet, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const stage = clamp01((reveal - i * 0.055) / 0.35);
    if (stage <= 0) return;
    const cx = startX + col * cell + cell / 2;
    const cy = startY + row * cell + cell / 2;
    ctx.save();
    ctx.globalAlpha = stage;
    ctx.translate(cx, cy);
    ctx.scale(0.9 + 0.1 * stage, 0.9 + 0.1 * stage);
    ctx.beginPath();
    ctx.arc(0, 0, cell * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.deepAlt, 0.65);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.gold, 0.45);
    ctx.lineWidth = Math.max(0.9, cell * 0.012);
    ctx.stroke();
    planetGlyph(ctx, planet, cell * 0.34, p);
    ctx.restore();
  });
}

/* -------------------------------- festive altar -------------------------- */

/** Diya row, kalash and marigold — festival artwork without a photograph. */
export function drawFestiveAltar(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, variant = 0 } = r;
  const W = box.w;
  const H = box.h;
  const cx = box.x + W / 2;
  const baseY = box.y + H * 0.72;
  ctx.save();
  // kalash on a lotus
  const kalR = Math.min(W, H) * 0.16;
  if (reveal > 0.05) {
    ctx.save();
    ctx.globalAlpha = clamp01(reveal / 0.5);
    ctx.translate(cx, box.y + H * 0.44);
    kalash(ctx, p, kalR, clamp01(reveal / 0.7));
    ctx.restore();
  }
  // diya row
  const count = variant >= 2 ? 7 : 5;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const x = box.x + W * (0.12 + 0.76 * t);
    const stage = clamp01((reveal - 0.25 - i * 0.04) / 0.35);
    if (stage <= 0) continue;
    const size = Math.min(W, H) * 0.052;
    ctx.save();
    ctx.globalAlpha = stage;
    // lamp bowl
    ctx.beginPath();
    ctx.moveTo(x - size, baseY);
    ctx.quadraticCurveTo(x, baseY + size * 0.9, x + size, baseY);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, p, baseY - size, baseY + size);
    ctx.fill();
    // flame
    const fh = size * (1.5 + Math.sin(i) * 0.12) * stage;
    const flame = ctx.createLinearGradient(x, baseY - fh, x, baseY - size * 0.1);
    flame.addColorStop(0, "#FFF6D2");
    flame.addColorStop(0.4, p.goldSoft);
    flame.addColorStop(1, withAlpha(p.accent, 0.9));
    ctx.beginPath();
    ctx.moveTo(x, baseY - fh);
    ctx.quadraticCurveTo(x + size * 0.42, baseY - fh * 0.4, x, baseY - size * 0.1);
    ctx.quadraticCurveTo(x - size * 0.42, baseY - fh * 0.4, x, baseY - fh);
    ctx.fillStyle = flame;
    ctx.shadowColor = withAlpha(p.goldSoft, 0.9);
    ctx.shadowBlur = size * 1.6;
    ctx.fill();
    ctx.restore();
  }
  // marigold garland arc
  ctx.save();
  ctx.globalAlpha = clamp01((reveal - 0.35) / 0.5);
  const rng = rand(19);
  for (let i = 0; i <= 26; i += 1) {
    const a = Math.PI * (0.06 + (0.88 * i) / 26);
    const rx = W * 0.42;
    const ry = H * 0.2;
    const x = cx - Math.cos(a) * rx;
    const y = box.y + H * 0.3 + Math.sin(a) * ry;
    ctx.beginPath();
    ctx.arc(x, y, Math.min(W, H) * (0.012 + rng() * 0.006), 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(i % 3 === 0 ? p.accentSoft : p.accent, 0.7);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

/* --------------------------------- service badge ------------------------- */

const BADGE_SHAPES: Record<string, (ctx: CanvasRenderingContext2D, R: number) => void> = {
  report: (ctx, R) => {
    ctx.strokeRect(-R * 0.5, -R * 0.62, R, R * 1.24);
    [-0.3, -0.05, 0.2, 0.42].forEach((t) => {
      ctx.beginPath();
      ctx.moveTo(-R * 0.32, R * t);
      ctx.lineTo(R * (0.32 - Math.abs(t) * 0.4), R * t);
      ctx.stroke();
    });
  },
  matching: (ctx, R) => {
    ctx.beginPath();
    ctx.arc(-R * 0.22, 0, R * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(R * 0.22, 0, R * 0.34, 0, Math.PI * 2);
    ctx.stroke();
  },
  naming: (ctx, R) => {
    ctx.font = `700 ${Math.round(R * 0.9)}px Cinzel, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("A", 0, 0);
  },
  muhurtham: (ctx, R) => {
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.3);
    ctx.lineTo(0, 0);
    ctx.lineTo(R * 0.26, R * 0.14);
    ctx.stroke();
  },
  education: (ctx, R) => {
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.5);
    ctx.lineTo(R * 0.56, -R * 0.2);
    ctx.lineTo(0, R * 0.1);
    ctx.lineTo(-R * 0.56, -R * 0.2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-R * 0.3, -R * 0.04);
    ctx.lineTo(-R * 0.3, R * 0.4);
    ctx.stroke();
  },
  festival: (ctx, R) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      const r = i % 2 ? R * 0.26 : R * 0.6;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  },
  consultation: (ctx, R) => {
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-R * 0.2, -R * 0.1);
    ctx.quadraticCurveTo(-R * 0.2, R * 0.3, R * 0.16, R * 0.28);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -R * 0.06, R * 0.07, 0, Math.PI * 2);
    ctx.fill();
  },
};

/** A circular service seal with a pictogram. */
export function drawServiceBadge(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, subject = "report" } = r;
  const R = Math.min(box.w, box.h) * 0.46;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const stage = clamp01(reveal / 0.7);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = stage;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  const disc = ctx.createRadialGradient(-R * 0.3, -R * 0.35, 0, 0, 0, R);
  disc.addColorStop(0, withAlpha(p.field, 0.95));
  disc.addColorStop(1, withAlpha(p.deep, 0.95));
  ctx.fillStyle = disc;
  ctx.fill();
  ctx.strokeStyle = metal(ctx, p, -R, R);
  ctx.lineWidth = Math.max(1.6, R * 0.045);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.86, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(p.goldSoft, 0.45);
  ctx.lineWidth = Math.max(0.8, R * 0.014);
  ctx.stroke();
  ctx.save();
  ctx.scale(0.86 + stage * 0.14, 0.86 + stage * 0.14);
  ctx.strokeStyle = metal(ctx, p, -R * 0.6, R * 0.6);
  ctx.fillStyle = metal(ctx, p, -R * 0.6, R * 0.6);
  ctx.lineWidth = Math.max(1.6, R * 0.055);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  (BADGE_SHAPES[subject] ?? BADGE_SHAPES.report)(ctx, R * 0.78);
  ctx.restore();
  ctx.restore();
}

/* ------------------------------- narrative scene ------------------------- */

/**
 * A layered illustrative scene: horizon, celestial body, seated silhouette with
 * a chart, and a rising path. Used by storytelling compositions.
 */
export function drawNarrativeScene(r: ArtRequest) {
  const { ctx, box, palette: p, reveal = 1, seed = 5 } = r;
  const { x, y, w, h } = box;
  ctx.save();
  // sky
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, withAlpha(p.deepAlt, 0.95));
  sky.addColorStop(0.6, withAlpha(p.field, 0.6));
  sky.addColorStop(1, withAlpha(p.deep, 0.98));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // stars
  const rng = rand(seed);
  for (let i = 0; i < 60; i += 1) {
    ctx.globalAlpha = 0.2 + rng() * 0.6;
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(x + rng() * w, y + rng() * h * 0.6, rng() * w * 0.004 + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // sun / moon disc
  const discStage = clamp01(reveal / 0.5);
  const discR = Math.min(w, h) * 0.16 * discStage;
  const dx = x + w * 0.68;
  const dy = y + h * 0.3;
  const glow = ctx.createRadialGradient(dx, dy, 0, dx, dy, discR * 3.2);
  glow.addColorStop(0, withAlpha(p.goldSoft, 0.55));
  glow.addColorStop(0.4, withAlpha(p.gold, 0.18));
  glow.addColorStop(1, withAlpha(p.gold, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  ctx.arc(dx, dy, discR, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(p.goldSoft, 0.9);
  ctx.fill();

  // layered hills
  const layers = 3;
  for (let i = 0; i < layers; i += 1) {
    const stage = clamp01((reveal - 0.1 - i * 0.12) / 0.5);
    if (stage <= 0) continue;
    const baseY = y + h * (0.62 + i * 0.12);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, baseY);
    for (let step = 0; step <= 10; step += 1) {
      const t = step / 10;
      const hx = x + w * t;
      const hy = baseY - Math.sin(t * Math.PI * (1 + i * 0.4) + i) * h * 0.07 * stage;
      ctx.lineTo(hx, hy);
    }
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    const shade = ctx.createLinearGradient(0, baseY - h * 0.1, 0, y + h);
    shade.addColorStop(0, withAlpha(p.field, 0.9 - i * 0.22));
    shade.addColorStop(1, withAlpha(p.deep, 0.98));
    ctx.fillStyle = shade;
    ctx.fill();
  }

  // seated figure silhouette with an open chart
  const figStage = clamp01((reveal - 0.4) / 0.6);
  if (figStage > 0) {
    ctx.save();
    ctx.globalAlpha = figStage;
    const fx = x + w * 0.32;
    const fy = y + h * 0.78;
    const s = Math.min(w, h) * 0.3;
    ctx.fillStyle = withAlpha(p.deep, 0.98);
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.6);
    ctx.lineWidth = Math.max(1, s * 0.012);
    // torso
    ctx.beginPath();
    ctx.moveTo(fx - s * 0.26, fy);
    ctx.quadraticCurveTo(fx - s * 0.3, fy - s * 0.5, fx, fy - s * 0.58);
    ctx.quadraticCurveTo(fx + s * 0.3, fy - s * 0.5, fx + s * 0.26, fy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // head
    ctx.beginPath();
    ctx.arc(fx, fy - s * 0.7, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // chart in hands
    ctx.save();
    ctx.translate(fx + s * 0.14, fy - s * 0.34);
    ctx.rotate(-0.12);
    ctx.fillStyle = withAlpha(p.goldSoft, 0.9);
    ctx.fillRect(-s * 0.16, -s * 0.11, s * 0.32, s * 0.22);
    ctx.strokeStyle = withAlpha(p.goldDeep, 0.8);
    ctx.lineWidth = Math.max(0.7, s * 0.008);
    ctx.strokeRect(-s * 0.16, -s * 0.11, s * 0.32, s * 0.22);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.11);
    ctx.lineTo(0, s * 0.11);
    ctx.moveTo(-s * 0.16, 0);
    ctx.lineTo(s * 0.16, 0);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

/* --------------------------------- dispatcher ---------------------------- */

export function paintArt(kind: ArtKind, r: ArtRequest) {
  ctxSafe(r.ctx, () => {
    switch (kind) {
      case "deity-emblem":
        drawDeityEmblem(r);
        return;
      case "celestial-scene":
        drawCelestialScene(r);
        return;
      case "zodiac-medallion":
        drawZodiacMedallion(r);
        return;
      case "jathagam-chart":
        drawJathagamChart(r);
        return;
      case "couple-seal":
        drawCoupleSeal(r);
        return;
      case "letter-bloom":
        drawLetterBloom(r);
        return;
      case "auspicious-date":
        drawDateBlock(r);
        return;
      case "navagraha-grid":
        drawNavagrahaGrid(r);
        return;
      case "festive-altar":
        drawFestiveAltar(r);
        return;
      case "service-badge":
        drawServiceBadge(r);
        return;
      case "narrative-scene":
        drawNarrativeScene(r);
        return;
      default:
        drawMandala(r.ctx, r.palette, {
          cx: r.box.x + r.box.w / 2,
          cy: r.box.y + r.box.h / 2,
          radius: Math.min(r.box.w, r.box.h) * 0.44,
          reveal: r.reveal ?? 1,
          variant: r.variant ?? 0,
        });
    }
  });
}

/** A failing art program must never take the whole poster down. */
function ctxSafe(ctx: CanvasRenderingContext2D, paint: () => void) {
  ctx.save();
  try {
    paint();
  } catch {
    /* a single bad glyph or path should not lose the poster */
  } finally {
    ctx.restore();
  }
}
