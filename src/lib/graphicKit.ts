/**
 * graphicKit — the premium graphic art system.
 *
 * The studio's artwork is deliberately *graphic*, not photographic: layered
 * gradient fields, precise geometric ornament, ephemeris line work and
 * atmospheric silhouettes, drawn with the same care a motion-design studio
 * puts into a title sequence. Every scene is a pure function of
 * `(box, theme, t, seed)` so the same code paints a still poster at a settled
 * `t` and a 30 fps animated poster frame at any other `t` — stills and motion
 * can never drift apart.
 *
 * Craft rules enforced here:
 *  - no flat clip-art: every scene has at least three depth layers
 *    (field, mid structure, light) with atmospheric alpha between them;
 *  - no harsh primary colour: scenes are mixed from the theme's own
 *    ground/gold/ink so a poster never fights its palette;
 *  - geometry is exact — kolam lattices, orbit rings and deco rays are
 *    computed, never approximated with loose blobs;
 *  - motion is ambient and slow (drift, twinkle, shimmer), never bouncy.
 */
import type { Theme } from "../types";
import { withAlpha } from "./posterKit";
import { rand } from "./canvas";

export type GraphicSceneKey =
  | "cosmic"
  | "silk"
  | "deco"
  | "kolam"
  | "orbit"
  | "skyline"
  | "aura"
  | "chart";

export interface GraphicScene {
  key: GraphicSceneKey;
  label: string;
  note: string;
  /** Campaign registers this scene reads naturally in. */
  bestFor: string[];
  /** Scenes that carry their own focal subject (deity art sits on top). */
  supportsArt: boolean;
}

export const GRAPHIC_SCENES: GraphicScene[] = [
  { key: "cosmic", label: "Cosmic Field", note: "Nebula gradients, parallax star layers, constellation line work", bestFor: ["transits", "education", "navagraha", "campaign"], supportsArt: true },
  { key: "orbit", label: "Ephemeris Orbit", note: "Concentric orbit rings with advancing planetary nodes", bestFor: ["education", "navagraha", "jathagam"], supportsArt: true },
  { key: "silk", label: "Silk Waves", note: "Flowing zari silk ribbons with a moving sheen", bestFor: ["marriage", "festival", "muhurtham"], supportsArt: true },
  { key: "deco", label: "Deco Sunburst", note: "Art-deco foil rays and stepped chevrons", bestFor: ["promo", "campaign", "jathagam"], supportsArt: true },
  { key: "kolam", label: "Kolam Lattice", note: "Computed pulli-kolam dot lattice and loop curves", bestFor: ["muhurtham", "festival", "marriage"], supportsArt: true },
  { key: "skyline", label: "Temple Skyline", note: "Layered gopuram silhouettes under a star field", bestFor: ["festival", "devotional", "heritage"], supportsArt: true },
  { key: "aura", label: "Devotional Aura", note: "Concentric halo rings, warm glow and drifting motes", bestFor: ["devotional", "festival", "baby-naming"], supportsArt: true },
  { key: "chart", label: "Star Chart", note: "Engraved-plate zodiac ring and constellation strokes", bestFor: ["education", "jathagam", "navagraha"], supportsArt: false },
];

export const GRAPHIC_SCENE_MAP: Record<GraphicSceneKey, GraphicScene> = Object.fromEntries(
  GRAPHIC_SCENES.map((scene) => [scene.key, scene]),
) as Record<GraphicSceneKey, GraphicScene>;

export interface SceneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Ctx = CanvasRenderingContext2D;

/* --------------------------------- helpers -------------------------------- */

const TAU = Math.PI * 2;

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number) {
  if (r <= 0 || alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(0.55, withAlpha(color, alpha * 0.32));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function nebula(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, alpha: number, rotate = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.scale(1, Math.max(0.15, ry / Math.max(1, rx)));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(0.5, withAlpha(color, alpha * 0.45));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

interface Star {
  x: number;
  y: number;
  r: number;
  ph: number;
  sp: number;
}

function starLayer(rng: () => number, box: SceneBox, count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: box.x + rng() * box.w,
      y: box.y + rng() * box.h,
      r: 0.5 + rng() * 1.5,
      ph: rng() * TAU,
      sp: 0.5 + rng() * 1.4,
    });
  }
  return stars;
}

function paintStars(ctx: Ctx, stars: Star[], t: number, color: string, alpha: number, drift = 0) {
  ctx.save();
  for (const s of stars) {
    const tw = 0.62 + 0.38 * Math.sin(t * s.sp + s.ph);
    const a = alpha * tw;
    const x = s.x + drift;
    ctx.fillStyle = withAlpha(color, a);
    ctx.beginPath();
    ctx.arc(x, s.y, s.r, 0, TAU);
    ctx.fill();
    if (s.r > 1.5) {
      ctx.fillStyle = withAlpha(color, a * 0.28);
      ctx.beginPath();
      ctx.arc(x, s.y, s.r * 2.6, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Diagonal band of light that travels across a box — the foil shimmer. */
export function foilShimmer(ctx: Ctx, box: SceneBox, t: number, color: string, alpha = 0.14, period = 6) {
  const phase = (t % period) / period;
  const travel = box.w + box.h;
  const cx = box.x - box.h * 0.5 + phase * travel;
  const width = Math.max(24, box.w * 0.16);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(cx - width, box.y + box.h, cx + width, box.y);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.5, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** Slow drifting light motes — atmosphere, not confetti. */
export function motes(ctx: Ctx, box: SceneBox, t: number, seed: number, color: string, count = 26, alpha = 0.35) {
  const rng = rand(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  for (let i = 0; i < count; i += 1) {
    const bx = rng();
    const by = rng();
    const sp = 0.25 + rng() * 0.5;
    const ph = rng() * TAU;
    const r = 0.8 + rng() * 2.2;
    const x = box.x + (bx + 0.03 * Math.sin(t * sp + ph)) * box.w;
    const y = box.y + ((by - (t * sp * 0.02) % 1 + 1) % 1) * box.h;
    const a = alpha * (0.4 + 0.6 * Math.sin(t * sp * 1.7 + ph) ** 2);
    ctx.fillStyle = withAlpha(color, a);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* --------------------------------- scenes --------------------------------- */

function paintCosmic(ctx: Ctx, box: SceneBox, theme: Theme, t: number, seed: number) {
  const rng = rand(seed);
  // Field: deep vertical grade with two off-axis nebulae.
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.35, box.y + box.h);
  g.addColorStop(0, theme.bgFrom);
  g.addColorStop(0.6, theme.bgTo);
  g.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  const drift = Math.sin(t * 0.12) * box.w * 0.012;
  nebula(ctx, box.x + box.w * 0.28 + drift, box.y + box.h * 0.3, box.w * 0.55, box.w * 0.3, theme.gold, 0.16, -0.4);
  nebula(ctx, box.x + box.w * 0.78 - drift, box.y + box.h * 0.62, box.w * 0.5, box.w * 0.26, "#3E5C96", 0.24, 0.5);
  nebula(ctx, box.x + box.w * 0.55, box.y + box.h * 0.12, box.w * 0.4, box.w * 0.2, "#6E4E8E", 0.16, 0.2);
  nebula(ctx, box.x + box.w * 0.12, box.y + box.h * 0.78, box.w * 0.34, box.w * 0.18, "#206E6E", 0.12, 0.8);
  ctx.restore();

  // Three parallax star layers.
  const far = starLayer(rng, box, Math.round((box.w * box.h) / 9000));
  const mid = starLayer(rng, box, Math.round((box.w * box.h) / 22000));
  const near = starLayer(rng, box, Math.round((box.w * box.h) / 60000));
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  paintStars(ctx, far, t, theme.ink, 0.35, Math.sin(t * 0.05) * 2);
  paintStars(ctx, mid, t * 1.2, theme.ink, 0.6, Math.sin(t * 0.05) * 5);
  paintStars(ctx, near, t * 1.5, theme.goldSoft, 0.85, Math.sin(t * 0.05) * 9);

  // Constellation line work: a single elegant polyline with node stars.
  const nodes = 6;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < nodes; i += 1) {
    pts.push([box.x + box.w * (0.12 + (i / (nodes - 1)) * 0.76), box.y + box.h * (0.2 + rng() * 0.5)]);
  }
  ctx.strokeStyle = withAlpha(theme.gold, 0.34);
  ctx.lineWidth = Math.max(1, box.w * 0.0012);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  pts.forEach(([x, y], i) => {
    const pulse = 0.6 + 0.4 * Math.sin(t * 1.1 + i);
    glow(ctx, x, y, box.w * 0.02, theme.goldSoft, 0.5 * pulse);
    ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.4, box.w * 0.0035), 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

function paintSilk(ctx: Ctx, box: SceneBox, theme: Theme, t: number, seed: number) {
  const rng = rand(seed);
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  g.addColorStop(0, theme.bgFrom);
  g.addColorStop(0.5, theme.bgTo);
  g.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // Flowing ribbons; each is a bezier band with its own sheen gradient.
  const ribbons = 9;
  for (let i = 0; i < ribbons; i += 1) {
    const p = i / (ribbons - 1);
    const yBase = box.y + box.h * (0.06 + p * 0.94);
    const amp = box.h * (0.035 + rng() * 0.045);
    const phase = t * 0.22 + i * 1.1;
    const thick = box.h * (0.05 + rng() * 0.06);
    ctx.beginPath();
    ctx.moveTo(box.x - box.w * 0.05, yBase);
    ctx.bezierCurveTo(
      box.x + box.w * 0.3,
      yBase - amp * Math.sin(phase),
      box.x + box.w * 0.66,
      yBase + amp * Math.cos(phase * 0.8),
      box.x + box.w * 1.05,
      yBase - amp * 0.4 * Math.sin(phase + 1),
    );
    ctx.lineTo(box.x + box.w * 1.05, yBase + thick);
    ctx.bezierCurveTo(
      box.x + box.w * 0.66,
      yBase + thick + amp * Math.cos(phase * 0.8),
      box.x + box.w * 0.3,
      yBase + thick - amp * Math.sin(phase),
      box.x - box.w * 0.05,
      yBase + thick,
    );
    ctx.closePath();
    const sheen = ctx.createLinearGradient(box.x, yBase - amp, box.x + box.w, yBase + thick + amp);
    const strong = i % 2 === 0;
    sheen.addColorStop(0, withAlpha(theme.gold, strong ? 0.1 : 0.045));
    sheen.addColorStop(0.45, withAlpha(theme.goldSoft, strong ? 0.18 : 0.07));
    sheen.addColorStop(0.75, withAlpha(theme.gold, strong ? 0.08 : 0.03));
    sheen.addColorStop(1, withAlpha(theme.gold, 0.015));
    ctx.fillStyle = sheen;
    ctx.fill();
    // highlight edge — a whisper, not a stripe
    ctx.strokeStyle = withAlpha(theme.goldSoft, strong ? 0.14 : 0.06);
    ctx.lineWidth = Math.max(1, box.w * 0.0011);
    ctx.beginPath();
    ctx.moveTo(box.x - box.w * 0.05, yBase);
    ctx.bezierCurveTo(
      box.x + box.w * 0.3,
      yBase - amp * Math.sin(phase),
      box.x + box.w * 0.66,
      yBase + amp * Math.cos(phase * 0.8),
      box.x + box.w * 1.05,
      yBase - amp * 0.4 * Math.sin(phase + 1),
    );
    ctx.stroke();
  }
  // settle the field with a vertical grade so type always has a quiet floor
  const settle = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  settle.addColorStop(0, withAlpha(theme.bgFrom, 0.1));
  settle.addColorStop(0.5, withAlpha(theme.bgFrom, 0.28));
  settle.addColorStop(1, withAlpha(theme.bgFrom, 0.42));
  ctx.fillStyle = settle;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

function paintDeco(ctx: Ctx, box: SceneBox, theme: Theme, t: number, _seed: number) {
  const g = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  g.addColorStop(0, theme.bgTo);
  g.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  const cx = box.x + box.w / 2;
  const cy = box.y + box.h * 0.42;
  const R = Math.max(box.w, box.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // rays
  const rays = 48;
  const rot = t * 0.012;
  for (let i = 0; i < rays; i += 1) {
    const a0 = (i / rays) * TAU + rot;
    const a1 = ((i + 0.42) / rays) * TAU + rot;
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.7);
    const rg = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R * 0.95);
    rg.addColorStop(0, withAlpha(theme.gold, 0.16 + shimmer * 0.08));
    rg.addColorStop(1, withAlpha(theme.gold, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * 0.95, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  // concentric stepped arcs
  for (let i = 0; i < 5; i += 1) {
    const r = R * (0.16 + i * 0.09);
    ctx.strokeStyle = withAlpha(i % 2 ? theme.goldSoft : theme.gold, 0.3 - i * 0.04);
    ctx.lineWidth = Math.max(1, box.w * (i === 0 ? 0.004 : 0.0016));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }
  // chevrons at the base — art-deco footing
  const steps = 4;
  for (let i = 0; i < steps; i += 1) {
    const y = box.y + box.h - box.h * 0.06 - i * box.h * 0.028;
    const inset = box.w * (0.08 + i * 0.09);
    ctx.strokeStyle = withAlpha(theme.gold, 0.34 - i * 0.06);
    ctx.lineWidth = Math.max(1, box.w * 0.0018);
    ctx.beginPath();
    ctx.moveTo(box.x + inset, y);
    ctx.lineTo(box.x + box.w / 2, y - box.h * 0.03);
    ctx.lineTo(box.x + box.w - inset, y);
    ctx.stroke();
  }
  glow(ctx, cx, cy, R * 0.34, theme.goldSoft, 0.22 + 0.06 * Math.sin(t * 0.9));
  ctx.restore();
}

/** Exact pulli-kolam: dot lattice + the looping curve that threads it. */
function paintKolam(ctx: Ctx, box: SceneBox, theme: Theme, t: number, _seed: number) {
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.2, box.y + box.h);
  g.addColorStop(0, theme.bgFrom);
  g.addColorStop(1, theme.bgTo);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const cols = 9;
  const rows = 7;
  const cell = Math.min(box.w / (cols + 1), box.h / (rows + 1));
  const ox = box.x + box.w / 2 - ((cols - 1) / 2) * cell;
  const oy = box.y + box.h / 2 - ((rows - 1) / 2) * cell;
  const dot = (c: number, r: number): [number, number] => [ox + c * cell, oy + r * cell];

  // draw-on progress for motion; settled stills pass a t where progress = 1
  const progress = Math.min(1, 0.35 + t * 0.12);
  ctx.strokeStyle = withAlpha(theme.gold, 0.4);
  ctx.lineWidth = Math.max(1, cell * 0.055);
  ctx.lineCap = "round";
  const loops: number = Math.floor(cols * rows * progress);
  ctx.beginPath();
  for (let i = 0; i < loops; i += 1) {
    const c = i % (cols - 1);
    const r = Math.floor(i / (cols - 1)) % (rows - 1);
    const [x0, y0] = dot(c, r);
    const [x1, y1] = dot(c + 1, r + 1);
    const [x2, y2] = dot(c + 1, r);
    const [x3, y3] = dot(c, r + 1);
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x2, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    ctx.quadraticCurveTo(x1, y1 - cell * 0.0, x1, y1);
    ctx.moveTo(x2, y2);
    ctx.quadraticCurveTo(x2, (y2 + y3) / 2, (x2 + x3) / 2, (y2 + y3) / 2);
    ctx.quadraticCurveTo(x3, y3, x3, y3);
  }
  ctx.stroke();
  // pulli dots
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const [x, y] = dot(c, r);
      const pulse = 0.55 + 0.45 * Math.sin(t * 0.9 + c * 0.6 + r * 0.8);
      ctx.fillStyle = withAlpha(theme.goldSoft, 0.35 + pulse * 0.35);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.2, cell * 0.07), 0, TAU);
      ctx.fill();
    }
  }
  // corner flourishes: quarter arcs
  ctx.strokeStyle = withAlpha(theme.gold, 0.3);
  ctx.lineWidth = Math.max(1, cell * 0.05);
  const cr = cell * 1.4;
  ([
    [box.x, box.y, 0],
    [box.x + box.w, box.y, Math.PI / 2],
    [box.x + box.w, box.y + box.h, Math.PI],
    [box.x, box.y + box.h, -Math.PI / 2],
  ] as Array<[number, number, number]>).forEach(([x, y, a]) => {
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x, y, cr * (i / 3), a, a + Math.PI / 2);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function paintOrbit(ctx: Ctx, box: SceneBox, theme: Theme, t: number, seed: number) {
  const rng = rand(seed);
  paintCosmic(ctx, box, theme, t * 0.4, seed);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const R = Math.min(box.w, box.h) * 0.44;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const rings = 5;
  for (let i = 1; i <= rings; i += 1) {
    const r = (R * i) / rings;
    ctx.strokeStyle = withAlpha(theme.gold, i === rings ? 0.42 : 0.24);
    ctx.lineWidth = Math.max(1, box.w * 0.0013);
    ctx.setLineDash(i % 2 ? [] : [box.w * 0.012, box.w * 0.012]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.62, -0.32, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // planet node advancing on its ring
    const speed = 0.14 / i + 0.02;
    const a = t * speed * TAU * 0.2 + rng() * TAU;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r * 0.62;
    const rot = -0.32;
    const rx = cx + (px - cx) * Math.cos(rot) - (py - cy) * Math.sin(rot);
    const ry = cy + (px - cx) * Math.sin(rot) + (py - cy) * Math.cos(rot);
    glow(ctx, rx, ry, box.w * 0.03, theme.goldSoft, 0.5);
    ctx.fillStyle = theme.goldSoft;
    ctx.beginPath();
    ctx.arc(rx, ry, Math.max(2, box.w * 0.006), 0, TAU);
    ctx.fill();
  }
  // radial degree ticks on the outer ring
  const ticks = 60;
  for (let i = 0; i < ticks; i += 1) {
    const a = (i / ticks) * TAU;
    const long = i % 5 === 0;
    const r0 = R;
    const r1 = R + (long ? box.w * 0.018 : box.w * 0.009);
    ctx.strokeStyle = withAlpha(theme.gold, long ? 0.5 : 0.26);
    ctx.lineWidth = Math.max(1, box.w * 0.0011);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.62);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.62);
    ctx.stroke();
  }
  // sun at the centre
  glow(ctx, cx, cy, R * 0.3, theme.gold, 0.4);
  ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2.5, box.w * 0.009), 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Layered gopuram silhouettes — atmospheric depth, exact stepped geometry. */
function paintSkyline(ctx: Ctx, box: SceneBox, theme: Theme, t: number, seed: number) {
  const rng = rand(seed);
  const sky = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  sky.addColorStop(0, theme.bgFrom);
  sky.addColorStop(0.62, theme.bgTo);
  sky.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = sky;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  const stars = starLayer(rng, { ...box, h: box.h * 0.62 }, Math.round((box.w * box.h) / 12000));
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  paintStars(ctx, stars, t, theme.ink, 0.5, Math.sin(t * 0.05) * 4);
  glow(ctx, box.x + box.w * 0.5, box.y + box.h * 0.72, box.w * 0.5, theme.gold, 0.16 + 0.04 * Math.sin(t * 0.5));

  const layers = 3;
  for (let l = 0; l < layers; l += 1) {
    const depth = l / (layers - 1);
    const baseY = box.y + box.h * (0.74 + depth * 0.14);
    const alpha = 0.28 + depth * 0.5;
    const towers = 3 - l;
    ctx.fillStyle = withAlpha(theme.bgFrom, alpha);
    // ground band
    ctx.fillRect(box.x, baseY, box.w, box.y + box.h - baseY);
    for (let i = 0; i < towers; i += 1) {
      const tw = box.w * (0.2 - depth * 0.04) * (1 - i * 0.18);
      const th = box.h * (0.3 - depth * 0.07) * (1 - i * 0.22);
      const cxp = box.x + box.w * ((i + 0.5) / towers) + (l - 1) * box.w * 0.06;
      // stepped gopuram: trapezoid tiers + kalasam finial
      const tiers = 5;
      for (let s = 0; s < tiers; s += 1) {
        const p = s / tiers;
        const w = tw * (1 - p * 0.55);
        const y0 = baseY - (th * (s + 1)) / tiers;
        const y1 = baseY - (th * s) / tiers;
        ctx.fillRect(cxp - w / 2, y0, w, y1 - y0 + 1);
      }
      ctx.beginPath();
      ctx.moveTo(cxp - tw * 0.06, baseY - th);
      ctx.quadraticCurveTo(cxp, baseY - th - box.h * 0.035, cxp + tw * 0.06, baseY - th);
      ctx.closePath();
      ctx.fill();
    }
    // rim light on the nearest layer
    if (l === layers - 1) {
      ctx.strokeStyle = withAlpha(theme.gold, 0.3);
      ctx.lineWidth = Math.max(1, box.w * 0.0012);
      ctx.beginPath();
      ctx.moveTo(box.x, baseY);
      ctx.lineTo(box.x + box.w, baseY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paintAura(ctx: Ctx, box: SceneBox, theme: Theme, t: number, seed: number) {
  const g = ctx.createRadialGradient(
    box.x + box.w / 2,
    box.y + box.h * 0.42,
    0,
    box.x + box.w / 2,
    box.y + box.h * 0.42,
    Math.max(box.w, box.h) * 0.8,
  );
  g.addColorStop(0, theme.bgTo);
  g.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  const cx = box.x + box.w / 2;
  const cy = box.y + box.h * 0.42;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const rings = 7;
  for (let i = 0; i < rings; i += 1) {
    const breathe = 1 + 0.015 * Math.sin(t * 0.7 + i * 0.8);
    const r = Math.min(box.w, box.h) * (0.14 + i * 0.075) * breathe;
    ctx.strokeStyle = withAlpha(i % 2 ? theme.goldSoft : theme.gold, 0.34 - i * 0.035);
    ctx.lineWidth = Math.max(1, box.w * (i === 1 ? 0.0035 : 0.0014));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }
  // petal ring: lotus geometry, exact
  const petals = 16;
  const pr = Math.min(box.w, box.h) * 0.3;
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * TAU + t * 0.02;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.strokeStyle = withAlpha(theme.gold, 0.3);
    ctx.lineWidth = Math.max(1, box.w * 0.0013);
    ctx.beginPath();
    ctx.moveTo(0, -pr * 0.72);
    ctx.quadraticCurveTo(pr * 0.12, -pr * 0.9, 0, -pr * 1.06);
    ctx.quadraticCurveTo(-pr * 0.12, -pr * 0.9, 0, -pr * 0.72);
    ctx.stroke();
    ctx.restore();
  }
  glow(ctx, cx, cy, Math.min(box.w, box.h) * 0.42, theme.gold, 0.2 + 0.05 * Math.sin(t * 0.8));
  motes(ctx, box, t, seed, theme.goldSoft, 22, 0.3);
  ctx.restore();
}

/**
 * A wide kolam footing band: the pulli lattice tiled across the full width in
 * three rows, so a footer band reads as woven geometry instead of a stamp.
 */
export function paintKolamBand(ctx: Ctx, box: SceneBox, theme: Theme, t: number, seed = 5) {
  if (box.w <= 1 || box.h <= 1) return;
  const rows = 3;
  const cell = box.h / (rows + 1);
  const cols = Math.max(4, Math.floor(box.w / cell));
  const ox = box.x + box.w / 2 - ((cols - 1) / 2) * cell;
  const oy = box.y + box.h / 2 - ((rows - 1) / 2) * cell;
  const dot = (c: number, r: number): [number, number] => [ox + c * cell, oy + r * cell];
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const progress = Math.min(1, 0.4 + t * 0.1);
  const loops = Math.floor(cols * (rows - 1) * progress);
  ctx.strokeStyle = withAlpha(theme.gold, 0.42);
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < loops; i += 1) {
    const c = i % (cols - 1);
    const r = Math.floor(i / (cols - 1));
    const [x0, y0] = dot(c, r);
    const [x1, y1] = dot(c + 1, r + 1);
    const [x2, y2] = dot(c + 1, r);
    const [x3, y3] = dot(c, r + 1);
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x2, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    ctx.quadraticCurveTo(x1, y1, x1, y1);
    ctx.moveTo(x2, y2);
    ctx.quadraticCurveTo(x2, (y2 + y3) / 2, (x2 + x3) / 2, (y2 + y3) / 2);
    ctx.quadraticCurveTo(x3, y3, x3, y3);
  }
  ctx.stroke();
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const [x, y] = dot(c, r);
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.9 + c * 0.5 + r * 0.9);
      ctx.fillStyle = withAlpha(theme.goldSoft, 0.3 + pulse * 0.35);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.1, cell * 0.075), 0, TAU);
      ctx.fill();
    }
  }
  // fade the band edges into the ground
  const fade = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
  fade.addColorStop(0, withAlpha(theme.bgFrom, 0.9));
  fade.addColorStop(0.18, withAlpha(theme.bgFrom, 0));
  fade.addColorStop(0.82, withAlpha(theme.bgFrom, 0));
  fade.addColorStop(1, withAlpha(theme.bgFrom, 0.9));
  ctx.fillStyle = fade;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
  void seed;
}

function paintChart(ctx: Ctx, box: SceneBox, theme: Theme, t: number, seed: number) {
  const rng = rand(seed);
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  g.addColorStop(0, theme.bgTo);
  g.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // fine engraving grid
  const step = Math.max(14, box.w / 26);
  ctx.strokeStyle = withAlpha(theme.gold, 0.1);
  ctx.lineWidth = 1;
  for (let x = box.x; x < box.x + box.w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.h);
    ctx.stroke();
  }
  for (let y = box.y; y < box.y + box.h; y += step) {
    ctx.beginPath();
    ctx.moveTo(box.x, y);
    ctx.lineTo(box.x + box.w, y);
    ctx.stroke();
  }
  // zodiac ring: 12 segments with alternating fill
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const R = Math.min(box.w, box.h) * 0.42;
  const rot = t * 0.01;
  for (let i = 0; i < 12; i += 1) {
    const a0 = (i / 12) * TAU + rot;
    const a1 = ((i + 1) / 12) * TAU + rot;
    ctx.strokeStyle = withAlpha(theme.gold, 0.4);
    ctx.lineWidth = Math.max(1, box.w * 0.0014);
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, a1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.82, a0, a1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * R * 0.82, cy + Math.sin(a0) * R * 0.82);
    ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.fillStyle = withAlpha(theme.gold, 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.arc(cx, cy, R * 0.82, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }
    // glyph tick
    const am = (a0 + a1) / 2;
    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.6);
    ctx.lineWidth = Math.max(1, box.w * 0.0016);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(am) * R * 0.86, cy + Math.sin(am) * R * 0.86);
    ctx.lineTo(cx + Math.cos(am) * R * 0.96, cy + Math.sin(am) * R * 0.96);
    ctx.stroke();
  }
  // constellation strokes inside the ring
  const nodes = 8;
  let px = cx;
  let py = cy;
  ctx.strokeStyle = withAlpha(theme.goldSoft, 0.5);
  ctx.lineWidth = Math.max(1, box.w * 0.0013);
  ctx.beginPath();
  for (let i = 0; i < nodes; i += 1) {
    const a = rng() * TAU;
    const r = rng() * R * 0.7;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i) {
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
    }
    px = x;
    py = y;
  }
  ctx.stroke();
  ctx.restore();
}

/* -------------------------------- dispatch -------------------------------- */

export function paintGraphicScene(
  ctx: Ctx,
  box: SceneBox,
  key: GraphicSceneKey,
  theme: Theme,
  t = 1.6,
  seed = 7,
) {
  if (box.w <= 1 || box.h <= 1) return;
  switch (key) {
    case "cosmic":
      return paintCosmic(ctx, box, theme, t, seed);
    case "silk":
      return paintSilk(ctx, box, theme, t, seed);
    case "deco":
      return paintDeco(ctx, box, theme, t, seed);
    case "kolam":
      return paintKolam(ctx, box, theme, t, seed);
    case "orbit":
      return paintOrbit(ctx, box, theme, t, seed);
    case "skyline":
      return paintSkyline(ctx, box, theme, t, seed);
    case "aura":
      return paintAura(ctx, box, theme, t, seed);
    case "chart":
      return paintChart(ctx, box, theme, t, seed);
    default:
      return paintCosmic(ctx, box, theme, t, seed);
  }
}

/**
 * Graphic treatment for devotional art: the painting keeps its dignity and
 * recognisability, but sits inside the campaign as designed art — a foil
 * keyline, a halo glow behind it and a unifying colour grade over it.
 */
export function gradeArt(
  ctx: Ctx,
  box: SceneBox,
  theme: Theme,
  options: { halo?: number; grade?: number; color?: string } = {},
) {
  const { halo = 0.4, grade = 0.16, color } = options;
  if (halo > 0) {
    glow(ctx, box.x + box.w / 2, box.y + box.h * 0.42, Math.max(box.w, box.h) * 0.75, theme.gold, halo * 0.5);
  }
  if (grade > 0) {
    ctx.save();
    const g = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
    g.addColorStop(0, withAlpha(color ?? theme.bgFrom, grade * 0.5));
    g.addColorStop(0.55, withAlpha(color ?? theme.bgTo, grade));
    g.addColorStop(1, withAlpha(color ?? theme.bgFrom, grade * 1.4));
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
  }
}
