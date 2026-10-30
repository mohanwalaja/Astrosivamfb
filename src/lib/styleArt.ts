import type { StyleKey, Theme } from "../types";
import { drawMotif, rand, withAlpha } from "./canvas";
import { cloudLayer, flame, lightShaft, particleBudget, silkSheen, starField } from "./artKit";
import { ART, PREMIUM, foilGradient } from "./premium";

/**
 * Backdrops and frames for the twelve art directions.
 *
 * Every painter is procedural — bands, silhouettes, lattices, rings, glows —
 * so the artwork stays crisp from a 360 px thumbnail to an A4 sheet. Each
 * backdrop fills the whole canvas and leaves `options.art` (the plate box)
 * visually calm so the service plate can sit on it.
 */

export interface ArtBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArtOptions {
  seed?: number;
  glowX?: number;
  glowY?: number;
  frameInset?: number;
  stars?: boolean;
  art?: ArtBox | null;
}

export type BackdropPainter = (ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme, options: ArtOptions) => void;
export type FramePainter = (ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme, inset: number) => void;

/* --------------------------------- shared ---------------------------------- */

const box = (W: number, H: number, options: ArtOptions): ArtBox =>
  options.art ?? { x: W * 0.3, y: H * 0.16, w: W * 0.4, h: H * 0.28 };

const centre = (b: ArtBox) => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2 });

function ground(ctx: CanvasRenderingContext2D, W: number, H: number, from: string, mid: string, to: string, angle = 0.6) {
  const bg = ctx.createLinearGradient(0, 0, W * angle, H);
  bg.addColorStop(0, from);
  bg.addColorStop(0.5, mid);
  bg.addColorStop(1, to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, strength: number, cy = 0.45) {
  const g = ctx.createRadialGradient(W * 0.5, H * cy, Math.min(W, H) * 0.22, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.65, `rgba(0,0,0,${strength * 0.36})`);
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(0.45, withAlpha(color, alpha * 0.36));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function hairline(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** Bevelled metal band with a bright upper-left and dark lower-right edge. */
function metalBand(ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, w: number, h: number, dark: string) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = Math.max(2, Math.min(w, h) * 1.4);
  ctx.shadowOffsetY = Math.max(1, Math.min(w, h) * 0.35);
  ctx.fillStyle = dark;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.fillStyle = foilGradient(ctx, theme, x, y, Math.max(h, w * 0.05));
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = withAlpha("#FFF4C8", ART.highlightAlpha);
  ctx.lineWidth = Math.max(0.7, Math.min(w, h) * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.strokeStyle = withAlpha("#0A0603", 0.6);
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.stroke();
}

function railFrame(ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme, inset: number, rail: number, dark: string) {
  metalBand(ctx, theme, inset, inset, W - inset * 2, rail, dark);
  metalBand(ctx, theme, inset, H - inset - rail, W - inset * 2, rail, dark);
  metalBand(ctx, theme, inset, inset, rail, H - inset * 2, dark);
  metalBand(ctx, theme, W - inset - rail, inset, rail, H - inset * 2, dark);
}

/* ================================ heritage ================================= */

/* 01 · Signature Gold — midnight, medallion halo, star field. */
const signatureBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const seed = options.seed ?? 7;
  const b = box(W, H, options);
  const { cx, cy } = centre(b);
  ground(ctx, W, H, theme.light ? "#F6ECD6" : "#07101F", theme.light ? "#E8D8B6" : theme.bgTo, theme.light ? "#D5C094" : "#030812", 0.7);
  if (options.stars !== false) starField(ctx, W, H, seed + 11, Math.round((W * H) / 14000));
  cloudLayer(ctx, W * 0.5, H * 0.3, W * 0.62, H * 0.4, theme.gold, theme.light ? 0.12 : 0.16);
  // medallion halo behind the plate
  const r = Math.max(b.w, b.h) * 0.62;
  glow(ctx, cx, cy, r * 1.5, theme.gold, theme.light ? 0.22 : 0.34);
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.34);
  ctx.lineWidth = Math.max(1, W * 0.0016);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([W * 0.004, W * 0.012]);
  ctx.strokeStyle = withAlpha(theme.gold, 0.5);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // twelve rasi ticks on the outer ring
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const inner = r * 0.96;
    const outer = r * 1.06;
    hairline(ctx, cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * outer, cy + Math.sin(a) * outer, withAlpha(theme.goldSoft, 0.7), Math.max(1, W * 0.0018));
  }
  ctx.restore();
  vignette(ctx, W, H, theme.light ? 0.16 : 0.5);
};

const signatureFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const rail = Math.max(3, W * 0.012);
  railFrame(ctx, W, H, theme, inset, rail, "#12100B");
  const inner = inset + rail + Math.max(3, W * 0.008);
  ctx.strokeStyle = withAlpha(theme.light ? "#6A4A18" : "#E7C877", 0.5);
  ctx.lineWidth = Math.max(0.8, W * 0.0014);
  ctx.strokeRect(inner, inner, W - inner * 2, H - inner * 2);
  const size = W * 0.07;
  (
    [
      [inner, inner, 1, 1],
      [W - inner, inner, -1, 1],
      [inner, H - inner, 1, -1],
      [W - inner, H - inner, -1, -1],
    ] as Array<[number, number, number, number]>
  ).forEach(([x, y, sx, sy]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    drawMotif(ctx, "corner", 0, 0, size, theme, 0.9);
    ctx.restore();
  });
};

/* 02 · Thanjavur Relief — maroon, gesso arch, gem border. */
function gemStud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#FFFFFF");
  g.addColorStop(0.22, hue);
  g.addColorStop(1, withAlpha("#000000", 0.75));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#8A5A14";
  ctx.lineWidth = Math.max(0.6, r * 0.22);
  ctx.stroke();
}

const thanjavurBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const seed = options.seed ?? 7;
  const b = box(W, H, options);
  const { cx, cy } = centre(b);
  ground(ctx, W, H, "#5A0F10", "#3A0909", "#1A0505", 0.75);
  silkSheen(ctx, { x: 0, y: 0, w: W, h: H }, "#FFB45A", 0.1);
  // soft kumkum glow around the arch
  glow(ctx, cx, cy, W * 0.6, "#F0702E", 0.3);
  // gesso-raised prabhavali arch
  const aw = Math.max(b.w, b.h) * 1.7;
  const r = aw / 2;
  const top = b.y - b.h * 0.42;
  const bottom = b.y + b.h + H * 0.06;
  const arch = (scale: number) => {
    const p = new Path2D();
    const rr = r * scale;
    p.moveTo(cx - rr, bottom);
    p.lineTo(cx - rr, top + r - rr + rr);
    p.arc(cx, top + r, rr, Math.PI, 0);
    p.lineTo(cx + rr, bottom);
    p.closePath();
    return p;
  };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.7)";
  ctx.shadowBlur = W * 0.03;
  ctx.shadowOffsetY = W * 0.01;
  ctx.fillStyle = foilGradient(ctx, theme, cx, top, bottom - top);
  ctx.fill(arch(1));
  ctx.restore();
  // scalloped flame edge on the arch
  ctx.save();
  const flames = 15;
  for (let i = 0; i <= flames; i += 1) {
    const a = Math.PI + (i / flames) * Math.PI;
    const fx = cx + Math.cos(a) * r * 1.02;
    const fy = top + r + Math.sin(a) * r * 1.02;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = foilGradient(ctx, theme, -r * 0.05, -r * 0.14, r * 0.14);
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, 0);
    ctx.quadraticCurveTo(0, -r * 0.14, r * 0.05, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // dark inner niche
  const inner = arch(0.86);
  const niche = ctx.createLinearGradient(0, top, 0, bottom);
  niche.addColorStop(0, "#2A0707");
  niche.addColorStop(1, "#4F1010");
  ctx.fillStyle = niche;
  ctx.fill(inner);
  ctx.strokeStyle = withAlpha("#FFE7A5", 0.5);
  ctx.lineWidth = Math.max(1, W * 0.0016);
  ctx.stroke(inner);
  // lotus pedestal line at the arch base
  ctx.fillStyle = foilGradient(ctx, theme, cx, bottom - H * 0.01, H * 0.02);
  ctx.fillRect(cx - r * 1.12, bottom - H * 0.004, r * 2.24, H * 0.012);
  ctx.fillStyle = withAlpha("#1A0505", 0.9);
  ctx.fillRect(cx - r * 1.06, bottom + H * 0.008, r * 2.12, H * 0.008);
  ctx.fillStyle = foilGradient(ctx, theme, cx, bottom + H * 0.014, H * 0.012);
  ctx.fillRect(cx - r * 1.0, bottom + H * 0.016, r * 2.0, H * 0.006);
  // gem studs along the arch
  const studs = 11;
  const hues = ["#E0332F", "#1DA66B", "#E0332F", "#2E6FD9"];
  for (let i = 0; i <= studs; i += 1) {
    const a = Math.PI + (i / studs) * Math.PI;
    gemStud(ctx, cx + Math.cos(a) * r * 0.93, top + r + Math.sin(a) * r * 0.93, Math.max(2.5, W * 0.0075), hues[i % hues.length]);
  }
  // falling ember particles
  const rng = rand(seed + 41);
  for (let i = 0; i < particleBudget(70); i += 1) {
    ctx.fillStyle = withAlpha(i % 2 ? "#FFD27A" : "#FF9A4A", 0.08 + rng() * 0.2);
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, W * (0.001 + rng() * 0.0025), 0, Math.PI * 2);
    ctx.fill();
  }
  vignette(ctx, W, H, 0.5);
};

const thanjavurFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const rail = Math.max(4, W * 0.016);
  railFrame(ctx, W, H, theme, inset, rail, "#3A0A0A");
  // gem studs on the rails
  const step = W * 0.085;
  const hues = ["#E0332F", "#1DA66B", "#2E6FD9"];
  const r = Math.max(2, rail * 0.3);
  let k = 0;
  for (let x = inset + step; x < W - inset - step * 0.5; x += step, k += 1) {
    gemStud(ctx, x, inset + rail / 2, r, hues[k % 3]);
    gemStud(ctx, x, H - inset - rail / 2, r, hues[(k + 1) % 3]);
  }
  for (let y = inset + step; y < H - inset - step * 0.5; y += step, k += 1) {
    gemStud(ctx, inset + rail / 2, y, r, hues[k % 3]);
    gemStud(ctx, W - inset - rail / 2, y, r, hues[(k + 2) % 3]);
  }
  const inner = inset + rail + Math.max(3, W * 0.007);
  ctx.strokeStyle = withAlpha("#FFE2A0", 0.42);
  ctx.lineWidth = Math.max(0.8, W * 0.0014);
  ctx.strokeRect(inner, inner, W - inner * 2, H - inner * 2);
};

/* 03 · Kolam Morning — light terracotta ivory, dot lattice, looped corners. */
/** A sikku kolam: a 5 × 5 pulli grid with smooth closed loops woven around the dots. */
function kolamLoop(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.018);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size / 6;
  // rotated rounded squares, nested, each threading between dot rows
  for (let ring = 1; ring <= 3; ring += 1) {
    const r = s * ring;
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.42);
    ctx.stroke();
    ctx.restore();
  }
  // four lobed loops around the diagonal dots
  for (let k = 0; k < 4; k += 1) {
    ctx.save();
    ctx.rotate((k * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.bezierCurveTo(s * 1.6, -s * 2.4, s * 3.4, -s * 1.2, s * 2.2, 0);
    ctx.bezierCurveTo(s * 3.4, s * 1.2, s * 1.6, s * 2.4, 0, s * 0.6);
    ctx.stroke();
    ctx.restore();
  }
  // pulli dots
  ctx.fillStyle = color;
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      ctx.beginPath();
      ctx.arc(c * s, r * s, Math.max(1, size * 0.012), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const kolamBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const b = box(W, H, options);
  ground(ctx, W, H, "#F8F0E1", "#F1E4CC", "#E6D2B2", 0.5);
  // morning light from top-right
  glow(ctx, W * 0.9, H * 0.05, W * 0.8, "#FFD9A6", 0.5);
  // pulli lattice that fades toward the centre so type stays clean
  const spacing = W * 0.052;
  ctx.save();
  for (let y = spacing; y < H; y += spacing) {
    for (let x = spacing; x < W; x += spacing) {
      const dx = (x - W * 0.5) / (W * 0.5);
      const dy = (y - H * 0.6) / (H * 0.45);
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const alpha = 0.06 + d * d * 0.26;
      ctx.fillStyle = withAlpha("#8A4A26", alpha);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, W * 0.0022), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // looped kolam in the top-right and bottom-left corners
  const loopSize = W * 0.3;
  kolamLoop(ctx, W - W * 0.02 - loopSize, H * 0.015, loopSize, withAlpha("#9A4A22", 0.5));
  kolamLoop(ctx, W * 0.6, H - H * 0.01 - loopSize * 0.72, loopSize * 0.72, withAlpha("#9A4A22", 0.22));
  // Royal Ivory & 24k Gold Temple Plaque behind the service art (only when an art box is explicitly provided)
  if (options.art) {
    const pad = Math.min(b.w, b.h) * 0.16;
    const plate = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
    ctx.save();
    ctx.shadowColor = theme.light ? "rgba(120,70,18,.22)" : "rgba(0,0,0,.6)";
    ctx.shadowBlur = W * 0.025;
    ctx.shadowOffsetY = W * 0.008;

    // Luminous ivory parchment field or deep lacquer
    const plaqueGrad = ctx.createLinearGradient(plate.x, plate.y, plate.x + plate.w, plate.y + plate.h);
    if (theme.light || theme.key === "ivory") {
      plaqueGrad.addColorStop(0, "#FFFDF8");
      plaqueGrad.addColorStop(0.35, "#FFF9EB");
      plaqueGrad.addColorStop(0.75, "#FBF0D6");
      plaqueGrad.addColorStop(1, "#F3E3BF");
    } else {
      plaqueGrad.addColorStop(0, "#2A1507");
      plaqueGrad.addColorStop(0.5, "#1C0D03");
      plaqueGrad.addColorStop(1, "#0D0501");
    }
    ctx.fillStyle = plaqueGrad;
    ctx.beginPath();
    ctx.roundRect(plate.x, plate.y, plate.w, plate.h, 6);
    ctx.fill();
    ctx.restore();

    // Outer 24k gold leaf filigree border
    const goldBorder = ctx.createLinearGradient(plate.x, plate.y, plate.x + plate.w, plate.y + plate.h);
    goldBorder.addColorStop(0, "#FFF7D6");
    goldBorder.addColorStop(0.25, "#E5B342");
    goldBorder.addColorStop(0.5, "#FFFCE2");
    goldBorder.addColorStop(0.75, "#AF7316");
    goldBorder.addColorStop(1, "#E8BA48");
    ctx.strokeStyle = goldBorder;
    ctx.lineWidth = Math.max(1.8, W * 0.0024);
    ctx.beginPath();
    ctx.roundRect(plate.x + 2, plate.y + 2, plate.w - 4, plate.h - 4, 5);
    ctx.stroke();

    // Inner hairline gold accent frame
    ctx.strokeStyle = withAlpha(theme.gold, 0.45);
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.beginPath();
    ctx.roundRect(plate.x + pad * 0.4, plate.y + pad * 0.4, plate.w - pad * 0.8, plate.h - pad * 0.8, 3);
    ctx.stroke();

    // Corner quadrant filigree florets
    const cornerFloret = (fx: number, fy: number) => {
      ctx.fillStyle = goldBorder;
      ctx.beginPath();
      ctx.arc(fx, fy, Math.max(1.5, W * 0.0022), 0, Math.PI * 2);
      ctx.fill();
    };
    cornerFloret(plate.x + pad * 0.4, plate.y + pad * 0.4);
    cornerFloret(plate.x + plate.w - pad * 0.4, plate.y + pad * 0.4);
    cornerFloret(plate.x + pad * 0.4, plate.y + plate.h - pad * 0.4);
    cornerFloret(plate.x + plate.w - pad * 0.4, plate.y + plate.h - pad * 0.4);
  }
  // turmeric rule across the top of the page
  ctx.fillStyle = withAlpha("#D9A441", 0.9);
  ctx.fillRect(0, 0, W, Math.max(3, H * 0.006));
};

const kolamFrame: FramePainter = (ctx, W, H, _theme, inset) => {
  const m = inset * 0.9;
  ctx.strokeStyle = withAlpha("#9A4A22", 0.5);
  ctx.lineWidth = Math.max(1, W * 0.0014);
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  ctx.fillStyle = withAlpha("#9A4A22", 0.8);
  const d = Math.max(2, W * 0.004);
  [
    [m, m],
    [W - m, m],
    [m, H - m],
    [W - m, H - m],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, d, 0, Math.PI * 2);
    ctx.fill();
  });
};

/* 04 · Kanchipuram Silk — peacock body, zari borders, korvai band. */
function zariBorder(ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, w: number, h: number, vertical: boolean) {
  ctx.save();
  ctx.fillStyle = foilGradient(ctx, theme, x, y, vertical ? w * 2 : h);
  ctx.fillRect(x, y, w, h);
  // woven stripe
  ctx.fillStyle = withAlpha("#3A2206", 0.4);
  const step = Math.max(3, (vertical ? w : h) * 0.22);
  if (vertical) for (let yy = y; yy < y + h; yy += step * 2) ctx.fillRect(x + w * 0.3, yy, w * 0.4, step);
  else for (let xx = x; xx < x + w; xx += step * 2) ctx.fillRect(xx, y + h * 0.3, step, h * 0.4);
  // temple-tooth (rekku) edge on the inner side
  ctx.fillStyle = foilGradient(ctx, theme, x, y, vertical ? w * 2 : h);
  const tooth = Math.max(4, (vertical ? w : h) * 0.5);
  ctx.beginPath();
  if (vertical) {
    const edge = x + w;
    for (let yy = y; yy < y + h; yy += tooth * 2) {
      ctx.moveTo(edge, yy);
      ctx.lineTo(edge + tooth, yy + tooth);
      ctx.lineTo(edge, yy + tooth * 2);
    }
  } else {
    const edge = y;
    for (let xx = x; xx < x + w; xx += tooth * 2) {
      ctx.moveTo(xx, edge);
      ctx.lineTo(xx + tooth, edge - tooth);
      ctx.lineTo(xx + tooth * 2, edge);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const silkBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const b = box(W, H, options);
  const { cx, cy } = centre(b);
  ground(ctx, W, H, "#06352B", "#0A4A3A", "#04231C", 0.4);
  // diagonal weave sheen
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#8FE3C8";
  ctx.lineWidth = 1;
  const step = Math.max(6, W * 0.009);
  for (let d = -H; d < W + H; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d - H, H);
    ctx.stroke();
  }
  ctx.restore();
  silkSheen(ctx, { x: 0, y: 0, w: W, h: H }, "#D7F5E6", 0.14);
  lightShaft(ctx, W * 0.3, 0, W * 0.55, H * 0.7, W * 0.22, theme.goldSoft, PREMIUM.glow.shaft);
  // scattered buttas (small woven motifs) across the body, avoiding the type zone
  const rng = rand((options.seed ?? 7) + 5);
  ctx.save();
  for (let i = 0; i < 26; i += 1) {
    const x = W * 0.14 + rng() * W * 0.72;
    const y = H * 0.06 + rng() * H * 0.86;
    const inType = y > H * 0.48 && y < H * 0.84;
    const inArt = Math.abs(x - cx) < b.w * 0.7 && Math.abs(y - cy) < b.h * 0.7;
    if (inType || inArt) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = withAlpha(theme.gold, 0.32);
    const s = W * 0.009;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
  }
  ctx.restore();
  // brooch glow behind the plate
  glow(ctx, cx, cy, Math.max(b.w, b.h) * 0.9, theme.gold, 0.26);
  // korvai band across the bottom
  const bandH = H * 0.085;
  const bandY = H - bandH - H * 0.03;
  ctx.fillStyle = "#4E0E12";
  ctx.fillRect(0, bandY, W, bandH);
  zariBorder(ctx, theme, 0, bandY + bandH * 0.08, W, bandH * 0.16, false);
  zariBorder(ctx, theme, 0, bandY + bandH * 0.76, W, bandH * 0.16, false);
  // mango buttas along the band
  for (let x = W * 0.08; x < W; x += W * 0.12) {
    drawMotif(ctx, "peacock", x, bandY + bandH * 0.5, bandH * 0.42, theme, 0.55);
  }
  vignette(ctx, W, H, 0.34);
};

const silkFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const w = Math.max(10, W * 0.045);
  zariBorder(ctx, theme, inset, inset, w, H - inset * 2, true);
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  zariBorder(ctx, theme, inset, inset, w, H - inset * 2, true);
  ctx.restore();
  ctx.fillStyle = foilGradient(ctx, theme, 0, inset, W * 0.01);
  ctx.fillRect(inset, inset, W - inset * 2, Math.max(2, W * 0.004));
};

/* 05 · Gopuram Dusk — tiered skyline against a setting sun. */
function gopuramSilhouette(ctx: CanvasRenderingContext2D, x: number, baseY: number, w: number, h: number, tiers: number, color: string) {
  ctx.fillStyle = color;
  const tierH = h / (tiers + 1.6);
  for (let i = 0; i < tiers; i += 1) {
    const tw = w * (1 - i * (0.78 / tiers));
    const y = baseY - tierH * (i + 1);
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, y + tierH);
    ctx.lineTo(x - tw / 2 + tierH * 0.18, y);
    ctx.lineTo(x + tw / 2 - tierH * 0.18, y);
    ctx.lineTo(x + tw / 2, y + tierH);
    ctx.closePath();
    ctx.fill();
    // tiny shrine niches (lighter cutouts)
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#FFB76A";
    const n = Math.max(1, Math.round(tw / (tierH * 1.3)));
    for (let k = 0; k < n; k += 1) {
      const nx = x - tw / 2 + (tw * (k + 0.5)) / n;
      ctx.beginPath();
      ctx.roundRect(nx - tierH * 0.12, y + tierH * 0.3, tierH * 0.24, tierH * 0.45, tierH * 0.12);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = color;
  }
  // barrel-vault crown and kalasam finials
  const topY = baseY - tierH * tiers;
  const crownW = w * (1 - tiers * (0.78 / tiers)) * 1.1;
  ctx.beginPath();
  ctx.ellipse(x, topY, crownW / 2, tierH * 0.6, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  const finials = Math.max(1, Math.round(crownW / (tierH * 0.9)));
  for (let k = 0; k < finials; k += 1) {
    const fx = x - crownW / 2 + (crownW * (k + 0.5)) / finials;
    ctx.beginPath();
    ctx.moveTo(fx, topY - tierH * 1.4);
    ctx.lineTo(fx + tierH * 0.14, topY - tierH * 0.6);
    ctx.lineTo(fx - tierH * 0.14, topY - tierH * 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

const gopuramBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const b = box(W, H, options);
  // dusk sky: indigo top, saffron horizon
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1A0C2A");
  sky.addColorStop(0.22, "#4A1B2C");
  sky.addColorStop(0.4, "#B8471E");
  sky.addColorStop(0.5, "#F2A23A");
  sky.addColorStop(0.56, "#3A1810");
  sky.addColorStop(1, "#140906");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  if (options.stars !== false) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    starField(ctx, W, H * 0.3, (options.seed ?? 7) + 3, Math.round((W * H) / 30000));
    ctx.restore();
  }
  // sun disk behind the tower
  const sunY = H * (H / W > 1.15 ? 0.455 : 0.43);
  glow(ctx, W * 0.5, sunY, W * 0.7, "#FFB24A", 0.5);
  ctx.fillStyle = "#FFD98A";
  ctx.beginPath();
  ctx.arc(W * 0.5, sunY, W * 0.13, 0, Math.PI * 2);
  ctx.fill();
  // skyline: a tall central gopuram with two shorter flanking towers and walls
  const tall = H / W > 1.15;
  const horizon = H * (tall ? 0.53 : 0.5);
  gopuramSilhouette(ctx, W * 0.14, horizon, W * 0.24, H * (tall ? 0.15 : 0.12), 4, "#1C0B08");
  gopuramSilhouette(ctx, W * 0.86, horizon, W * 0.24, H * (tall ? 0.15 : 0.12), 4, "#1C0B08");
  gopuramSilhouette(ctx, W * 0.5, horizon, W * 0.4, H * (tall ? 0.24 : 0.19), 6, "#140806");
  ctx.fillStyle = "#140806";
  ctx.fillRect(0, horizon - H * 0.02, W, H * 0.05);
  // temple-street ground
  const street = ctx.createLinearGradient(0, horizon, 0, H);
  street.addColorStop(0, "#1C0C08");
  street.addColorStop(1, "#0D0604");
  ctx.fillStyle = street;
  ctx.fillRect(0, horizon + H * 0.03, W, H);
  // warm reflection of the sun on the street
  glow(ctx, W * 0.5, horizon + H * 0.08, W * 0.5, "#FF9A3C", 0.18);
  // street lamps
  flame(ctx, W * 0.1, horizon + H * 0.075, W * 0.016, "#FFB127");
  flame(ctx, W * 0.9, horizon + H * 0.075, W * 0.016, "#FFB127");
  // keep the plate zone readable
  glow(ctx, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 0.9, "#FFE4A8", 0.2);
  vignette(ctx, W, H, 0.3, 0.4);
  void theme;
};

const gopuramFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const rail = Math.max(3, W * 0.011);
  railFrame(ctx, W, H, theme, inset, rail, "#2A120A");
  const inner = inset + rail + Math.max(3, W * 0.007);
  ctx.strokeStyle = withAlpha("#FFC46A", 0.35);
  ctx.lineWidth = Math.max(0.8, W * 0.0013);
  ctx.strokeRect(inner, inner, W - inner * 2, H - inner * 2);
};

/* 06 · Karthigai Deepam — a sea of agal lamps. */
function agal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const bowl = ctx.createLinearGradient(x, y - size * 0.1, x, y + size * 0.4);
  bowl.addColorStop(0, "#9A5A2A");
  bowl.addColorStop(1, "#3A1B0A");
  ctx.fillStyle = bowl;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.55, y);
  ctx.quadraticCurveTo(x, y + size * 0.55, x + size * 0.55, y);
  ctx.quadraticCurveTo(x, y + size * 0.12, x - size * 0.55, y);
  ctx.closePath();
  ctx.fill();
  flame(ctx, x, y - size * 0.3, size * 0.42, "#FF9A2A");
  ctx.restore();
}

const deepamBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const seed = options.seed ?? 7;
  const b = box(W, H, options);
  ground(ctx, W, H, "#0B0908", "#171210", "#060403", 0.6);
  // rising warm glow from the lamp field
  const rise = ctx.createLinearGradient(0, H * 0.45, 0, H);
  rise.addColorStop(0, withAlpha("#FF8A2A", 0));
  rise.addColorStop(0.6, withAlpha("#FF8A2A", 0.16));
  rise.addColorStop(1, withAlpha("#FFB45A", 0.42));
  ctx.fillStyle = rise;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  // smoke haze
  cloudLayer(ctx, W * 0.5, H * 0.72, W * 0.7, H * 0.2, "#FFB45A", 0.1);
  // lamp rows: far rows small and dim, near rows large and bright
  const rng = rand(seed + 9);
  const rows = 5;
  for (let r = 0; r < rows; r += 1) {
    const t = r / (rows - 1);
    const y = H * (0.8 + t * 0.15);
    const size = W * (0.022 + t * 0.03);
    const count = Math.round(W / (size * 2.1));
    for (let i = 0; i <= count; i += 1) {
      const x = (i / count) * W + (rng() - 0.5) * size * 0.8 + (r % 2 ? size : 0);
      agal(ctx, x, y, size, 0.55 + t * 0.45);
    }
  }
  // ember particles drifting up
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < particleBudget(90); i += 1) {
    const x = rng() * W;
    const y = H * 0.3 + rng() * H * 0.6;
    ctx.fillStyle = withAlpha(i % 3 ? "#FFC46A" : "#FF8A3A", 0.1 + rng() * 0.35);
    ctx.beginPath();
    ctx.arc(x, y, W * (0.0008 + rng() * 0.002), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // halo for the plate
  glow(ctx, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 0.95, "#FFB45A", 0.22);
  vignette(ctx, W, H, 0.42, 0.55);
  void theme;
};

const deepamFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const rail = Math.max(3, W * 0.01);
  railFrame(ctx, W, H, theme, inset, rail, "#1A0E06");
  const inner = inset + rail + Math.max(3, W * 0.007);
  ctx.strokeStyle = withAlpha("#FFC46A", 0.3);
  ctx.lineWidth = Math.max(0.8, W * 0.0013);
  ctx.strokeRect(inner, inner, W - inner * 2, H - inner * 2);
};

/* ================================= modern ================================= */

/* 07 · Mono Ink — black, baseline grid, vermilion index. */
const monoBackdrop: BackdropPainter = (ctx, W, H) => {
  ground(ctx, W, H, "#0B0B0C", "#111113", "#09090A", 0.3);
  // baseline grid
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const step = H / 24;
  for (let y = step; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // column rules
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  [0.08, 0.92].forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(W * f, 0);
    ctx.lineTo(W * f, H);
    ctx.stroke();
  });
  ctx.restore();
  // a soft top-left light so the black is not flat
  glow(ctx, W * 0.1, H * 0.05, W * 0.8, "#FFFFFF", 0.05);
};

const monoFrame: FramePainter = (ctx, W, H, _theme, inset) => {
  // registration marks at the corners and a vermilion index block
  const m = inset * 0.85;
  const len = W * 0.035;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = Math.max(1, W * 0.0012);
  [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * len, y);
    ctx.stroke();
  });
  ctx.fillStyle = "#E4572E";
  ctx.fillRect(W * 0.08, m, Math.max(3, W * 0.006), H * 0.06);
};

/* 08 · Paper Editorial — warm paper, column rules, ink footer bar. */
const paperBackdrop: BackdropPainter = (ctx, W, H, _theme, options) => {
  const b = box(W, H, options);
  ground(ctx, W, H, "#FBF7F0", "#F4EDE0", "#ECE3D2", 0.4);
  // paper grain
  const rng = rand((options.seed ?? 7) + 21);
  ctx.save();
  for (let i = 0; i < Math.round((W * H) / 1600); i += 1) {
    ctx.fillStyle = withAlpha("#3A2F1E", rng() * 0.06);
    ctx.fillRect(rng() * W, rng() * H, 1.2, 1.2);
  }
  ctx.restore();
  // column rules
  ctx.strokeStyle = "rgba(60,45,25,0.16)";
  ctx.lineWidth = 1;
  [0.5].forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(W * f, H * 0.17);
    ctx.lineTo(W * f, H * 0.78);
    ctx.stroke();
  });
  // framed plate panel
  const pad = Math.min(b.w, b.h) * 0.14;
  const panel = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  ctx.save();
  ctx.shadowColor = "rgba(40,25,10,.22)";
  ctx.shadowBlur = W * 0.02;
  ctx.shadowOffsetY = W * 0.008;
  ctx.fillStyle = "#FFFDF8";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.restore();
  ctx.strokeStyle = "rgba(60,45,25,0.35)";
  ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = "rgba(60,45,25,0.18)";
  ctx.strokeRect(panel.x + pad * 0.4, panel.y + pad * 0.4, panel.w - pad * 0.8, panel.h - pad * 0.8);
  // ink footer bar
  ctx.fillStyle = "#15120E";
  ctx.fillRect(0, H * 0.89, W, H * 0.11);
};

const paperFrame: FramePainter = (ctx, W, H, _theme, inset) => {
  const m = inset * 0.8;
  ctx.strokeStyle = "rgba(60,45,25,0.5)";
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.beginPath();
  ctx.moveTo(m, m);
  ctx.lineTo(W - m, m);
  ctx.stroke();
  ctx.fillStyle = "#B4531F";
  ctx.fillRect(m, m, W * 0.08, Math.max(3, H * 0.004));
};

/* 09 · Ephemeris Blueprint — teal grid and a degree dial. */
const ephemerisBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const b = box(W, H, options);
  const { cx, cy } = centre(b);
  ground(ctx, W, H, "#041A22", "#07303B", "#031419", 0.55);
  // technical grid
  ctx.save();
  const step = W * 0.05;
  ctx.strokeStyle = "rgba(111,217,230,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // bolder grid every 5
  ctx.strokeStyle = "rgba(111,217,230,0.13)";
  for (let x = 0; x <= W; x += step * 5) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step * 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, cx, cy, W * 0.55, theme.gold, 0.2);
  // degree dial
  const R = Math.max(b.w, b.h) * 0.98;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = withAlpha(theme.gold, 0.55);
  ctx.lineWidth = Math.max(1, W * 0.0014);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(theme.gold, 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  for (let d = 0; d < 360; d += 2) {
    const a = (d / 180) * Math.PI;
    const major = d % 30 === 0;
    const mid = d % 10 === 0;
    const len = major ? R * 0.1 : mid ? R * 0.06 : R * 0.03;
    ctx.strokeStyle = withAlpha(major ? theme.goldSoft : theme.gold, major ? 0.9 : 0.45);
    ctx.lineWidth = major ? Math.max(1.2, W * 0.002) : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.lineTo(Math.cos(a) * (R - len), Math.sin(a) * (R - len));
    ctx.stroke();
  }
  // crosshair
  ctx.strokeStyle = withAlpha(theme.gold, 0.35);
  ctx.setLineDash([W * 0.006, W * 0.006]);
  ctx.beginPath();
  ctx.moveTo(-R * 1.18, 0);
  ctx.lineTo(R * 1.18, 0);
  ctx.moveTo(0, -R * 1.18);
  ctx.lineTo(0, R * 1.18);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  vignette(ctx, W, H, 0.4);
};

const ephemerisFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const m = inset * 0.85;
  ctx.strokeStyle = withAlpha(theme.gold, 0.45);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  // edge ticks like a drafting sheet
  ctx.strokeStyle = withAlpha(theme.gold, 0.5);
  const tick = W * 0.012;
  for (let x = m; x <= W - m; x += (W - m * 2) / 20) {
    ctx.beginPath();
    ctx.moveTo(x, m);
    ctx.lineTo(x, m + tick);
    ctx.moveTo(x, H - m);
    ctx.lineTo(x, H - m - tick);
    ctx.stroke();
  }
  for (let y = m; y <= H - m; y += (H - m * 2) / 25) {
    ctx.beginPath();
    ctx.moveTo(m, y);
    ctx.lineTo(m + tick, y);
    ctx.moveTo(W - m, y);
    ctx.lineTo(W - m - tick, y);
    ctx.stroke();
  }
};

/* 10 · Aurum Minimal — obsidian, one sweeping gold arc. */
const aurumBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const b = box(W, H, options);
  ground(ctx, W, H, "#0A0A0B", "#121110", "#060606", 0.5);
  glow(ctx, W * 0.85, H * 0.2, W * 0.9, theme.gold, 0.08);
  // one wide arc, lower-left to upper-right
  const acx = W * 1.08;
  const acy = H * 0.98;
  const R = Math.hypot(W * 0.95, H * 0.62);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = withAlpha(theme.gold, 0.12);
  ctx.lineWidth = W * 0.09;
  ctx.beginPath();
  ctx.arc(acx, acy, R, Math.PI * 1.02, Math.PI * 1.52);
  ctx.stroke();
  ctx.strokeStyle = foilGradient(ctx, theme, 0, H * 0.2, H * 0.8);
  ctx.lineWidth = Math.max(2, W * 0.007);
  ctx.beginPath();
  ctx.arc(acx, acy, R, Math.PI * 1.02, Math.PI * 1.52);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(theme.gold, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(acx, acy, R * 0.9, Math.PI * 1.02, Math.PI * 1.52);
  ctx.stroke();
  ctx.restore();
  // a quiet pool of light under the plate
  glow(ctx, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 1.1, theme.gold, 0.16);
  vignette(ctx, W, H, 0.4);
};

const aurumFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const m = inset * 0.9;
  const len = W * 0.05;
  ctx.strokeStyle = withAlpha(theme.gold, 0.6);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * len, y);
    ctx.stroke();
  });
};

/* 11 · Nocturne Glass — frosted card over colour-light. */
export function glassCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = w * 0.06;
  ctx.shadowOffsetY = w * 0.02;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  const fill = ctx.createLinearGradient(x, y, x + w, y + h);
  fill.addColorStop(0, "rgba(255,255,255,0.14)");
  fill.addColorStop(0.5, "rgba(255,255,255,0.07)");
  fill.addColorStop(1, "rgba(255,255,255,0.1)");
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  // specular sweep
  const sweep = ctx.createLinearGradient(x, y, x + w * 0.6, y + h * 0.5);
  sweep.addColorStop(0, "rgba(255,255,255,0.16)");
  sweep.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = sweep;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // edge highlight
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  const edge = ctx.createLinearGradient(x, y, x + w, y + h);
  edge.addColorStop(0, "rgba(255,255,255,0.7)");
  edge.addColorStop(0.4, "rgba(255,255,255,0.16)");
  edge.addColorStop(1, "rgba(255,255,255,0.45)");
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, w * 0.0025);
  ctx.stroke();
}

const glassBackdrop: BackdropPainter = (ctx, W, H) => {
  ground(ctx, W, H, "#0B0E16", "#161B29", "#080A10", 0.5);
  // twin light sources
  glow(ctx, W * 0.18, H * 0.2, W * 0.75, "#7C5CFF", 0.5);
  glow(ctx, W * 0.86, H * 0.78, W * 0.8, "#E0A450", 0.42);
  glow(ctx, W * 0.7, H * 0.12, W * 0.4, "#48C8E8", 0.22);
  // fine noise so the gradients do not band
  const rng = rand(53);
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < particleBudget(160); i += 1) {
    ctx.fillStyle = withAlpha("#FFFFFF", rng() * 0.3);
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, rng() * 1.4 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const glassFrame: FramePainter = () => {
  /* the card is the frame */
};

/* 12 · Orbit Lines — concentric rings, twelve houses, nine grahas. */
const orbitBackdrop: BackdropPainter = (ctx, W, H, theme, options) => {
  const seed = options.seed ?? 7;
  const b = box(W, H, options);
  const { cx, cy } = centre(b);
  ground(ctx, W, H, "#0A0618", "#1F0E3E", "#060312", 0.6);
  if (options.stars !== false) starField(ctx, W, H, seed + 17, Math.round((W * H) / 12000));
  glow(ctx, cx, cy, W * 0.6, "#B79CFF", 0.3);
  const R = Math.max(b.w, b.h) * 1.25;
  ctx.save();
  ctx.translate(cx, cy);
  // orbits
  const rings = [0.5, 0.64, 0.78, 0.9, 1];
  rings.forEach((f, i) => {
    ctx.strokeStyle = withAlpha(theme.gold, i === rings.length - 1 ? 0.6 : 0.26);
    ctx.lineWidth = i === rings.length - 1 ? Math.max(1.2, W * 0.0018) : 1;
    ctx.beginPath();
    ctx.arc(0, 0, R * f, 0, Math.PI * 2);
    ctx.stroke();
  });
  // house ticks and labels on the outer ring
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.85);
    ctx.lineWidth = Math.max(1.2, W * 0.002);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96);
    ctx.lineTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05);
    ctx.stroke();
  }
  // nine graha points with trailing arcs
  const rng = rand(seed + 23);
  const palette = ["#FFD98A", "#E8E8FF", "#FF8A6A", "#9AE6B4", "#F6D06F", "#C9B3FF", "#8FD3FF", "#B0B0C8", "#FFB3D1"];
  for (let i = 0; i < 9; i += 1) {
    const f = rings[i % (rings.length - 1)];
    const a = rng() * Math.PI * 2;
    const r = R * f;
    ctx.strokeStyle = withAlpha(palette[i], 0.55);
    ctx.lineWidth = Math.max(1.2, W * 0.002);
    ctx.beginPath();
    ctx.arc(0, 0, r, a - 0.55, a);
    ctx.stroke();
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    glow(ctx, px, py, W * 0.03, palette[i], 0.5);
    ctx.fillStyle = palette[i];
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2, W * 0.0045), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  vignette(ctx, W, H, 0.45);
};

const orbitFrame: FramePainter = (ctx, W, H, theme, inset) => {
  const m = inset * 0.9;
  ctx.strokeStyle = withAlpha(theme.gold, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(m, m, W - m * 2, H - m * 2, W * 0.03);
  ctx.stroke();
};

/* -------------------------------- registry -------------------------------- */

export const STYLE_BACKDROPS: Record<StyleKey, BackdropPainter> = {
  signature: signatureBackdrop,
  thanjavur: thanjavurBackdrop,
  kolam: kolamBackdrop,
  silk: silkBackdrop,
  gopuram: gopuramBackdrop,
  deepam: deepamBackdrop,
  mono: monoBackdrop,
  paper: paperBackdrop,
  ephemeris: ephemerisBackdrop,
  aurum: aurumBackdrop,
  glass: glassBackdrop,
  orbit: orbitBackdrop,
};

export const STYLE_FRAMES: Record<StyleKey, FramePainter> = {
  signature: signatureFrame,
  thanjavur: thanjavurFrame,
  kolam: kolamFrame,
  silk: silkFrame,
  gopuram: gopuramFrame,
  deepam: deepamFrame,
  mono: monoFrame,
  paper: paperFrame,
  ephemeris: ephemerisFrame,
  aurum: aurumFrame,
  glass: glassFrame,
  orbit: orbitFrame,
};
