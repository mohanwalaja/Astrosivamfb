/**
 * Astrosivam Design System · compositions
 *
 * Fifteen composition families. Each one owns the whole page: where the ground's
 * mass sits, where the artwork goes and at what scale, where type lives and how
 * it is aligned, how much of the sheet stays empty, which ornaments are legal,
 * and where the CTA and the lockup land.
 *
 * The contract every composition honours:
 *   · it is built from `scene.frame` metrics, never from pixel constants, so a
 *     540 px preview and a 2480 px A4 export are the same design;
 *   · it measures before it paints, so nothing collides;
 *   · it draws only through this design system, so a palette swap recolours it
 *     without moving a single element;
 *   · it consumes `MotionState` so the animated renderer can build it up layer
 *     by layer instead of fading a finished picture.
 *
 * The one thing they deliberately do NOT share is a grid.
 */

import type { Palette } from "./palettes";
import {
  drawChip,
  drawCta,
  drawDots,
  drawFooter,
  drawIndexCard,
  drawLeader,
  drawLockup,
  drawPanel,
  drawSwipe,
  diamondRule,
  rounded,
  toPoints,
} from "./components";
import { paintGround, type GroundKey } from "./ground";
import { paintArt, type ArtKind, type ArtPlan } from "./artLibrary";
import {
  englishOnly,
  serifFor,
  fitDisplay,
  fontFor,
  measure,
  paintLine,
  sansFor,
  toPoints as points,
  wrapText,
  type DisplayFace,
  type Measured,
} from "./type";
import {
  chromeHeight,
  metrics,
  paintChrome,
  paintCopy,
  planChrome,
  planCopy,
} from "./layout";
import { withAlpha } from "../lib/canvas";

/* --------------------------------- scene --------------------------------- */

export interface PosterCopy {
  kicker: string;
  headline: string;
  subline: string;
  cta: string;
  footer: string;
  /** Optional supporting word shown in a band or sticker. */
  badge?: string;
}

/** Every animated value a composition may read. `1` / `0` is the static poster. */
export interface MotionState {
  ground: number;
  art: number;
  artReveal: number;
  kicker: number;
  headline: number;
  sub: number;
  cta: number;
  logo: number;
  sweep: number;
  /** Fraction of the canvas, applied to the art layer. */
  parallaxX: number;
  parallaxY: number;
  /** Uniform camera scale about the centre; 1 = no move. */
  scale: number;
}

export const STILL: MotionState = {
  ground: 1,
  art: 1,
  artReveal: 1,
  kicker: 1,
  headline: 1,
  sub: 1,
  cta: 1,
  logo: 1,
  sweep: 0,
  parallaxX: 0,
  parallaxY: 0,
  scale: 1,
};

export interface CompositionContext {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  palette: Palette;
  face: DisplayFace;
  copy: PosterCopy;
  logo: HTMLImageElement | null;
  art: ArtPlan;
  motion: MotionState;
  showLogo: boolean;
  /** Seed derived from the design id, so "generate another" can vary detail. */
  seed: number;
  /** How much ornament the ground and the emblem may use. Default `balanced`. */
  detail?: "quiet" | "balanced" | "rich";
  /** Section index for carousels, 1-based. */
  index?: number;
  /** Total slides, for page dots. */
  total?: number;
}

export interface Composition {
  key: CompositionKey;
  name: string;
  /** The page structure in one line — used by the gallery and the docs. */
  structure: string;
  /** What makes it different, for the composition picker. */
  note: string;
  ground: GroundKey;
  usesArt: boolean;
  /** Where the focal point sits, 0–1 of each axis. Drives ground spotlights. */
  focus: { x: number; y: number };
  /** Categories this family is the natural lead for. */
  bestFor: string[];
  paint: (scene: CompositionContext) => void;
}

export type CompositionKey =
  | "hero-illustration"
  | "luxury-editorial"
  | "circular-mandala"
  | "diagonal-dynamic"
  | "luxury-framed"
  | "cosmic-astrology"
  | "typography-dominant"
  | "educational-infographic"
  | "commercial-ad"
  | "illustrated-story"
  | "collage-asymmetric"
  | "minimal-luxury"
  | "festival-celebration"
  | "split-panel"
  | "geometric-astrology";

/* -------------------------------- utilities ------------------------------- */

/**
 * The face a composition sets its headline in. Compositions override the
 * studio's choice when the page demands a specific voice, but only where the
 * design breaks without it.
 */
/**
 * The typeface the page is set in. The studio's choice always wins; `preferred`
 * is only the face the composition was drawn for, which the engine hands back
 * as the scene face when the user has not locked one. A composition that
 * hard-codes a face therefore steals the typeface control — so every page-level
 * setting goes through here, and only sub-labels use a fixed face.
 */
const scene_face = (scene: CompositionContext, preferred: DisplayFace): DisplayFace => scene.face ?? preferred;

/** Truncate at a word boundary — a chip that ends mid-word reads as a bug. */
const truncateWords = (text: string, max: number) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

/** Hard truncation for single-line plates where the copy is decoration. */
const truncateTo = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

const margin = (W: number, H: number) => {
  const square = H / W <= 1.06;
  const story = H / W > 1.5;
  const base = W * (square ? 0.075 : story ? 0.08 : 0.078);
  return {
    m: Math.round(base),
    top: Math.round(base * (story ? 1.5 : 1)),
    bottom: Math.round(base * (story ? 1.9 : 1.5)),
    safeW: W - Math.round(base) * 2,
    safeH: H - Math.round(base * (story ? 3.4 : 2.5)),
  };
};

/** Paint the art plan into a box with the scene's reveal + parallax. */
function art(scene: CompositionContext, box: { x: number; y: number; w: number; h: number }, overrides: Partial<ArtPlan> = {}) {
  const { ctx, palette, motion, seed } = scene;
  const plan = { ...scene.art, ...overrides };
  ctx.save();
  ctx.translate(motion.parallaxX * scene.W, motion.parallaxY * scene.H);
  paintArt(plan.kind, {
    ctx,
    box,
    palette,
    reveal: motion.artReveal,
    seed: plan.seed ?? seed,
    subject: plan.subject,
    variant: plan.variant,
    text: scene.copy.headline,
    detail: scene.detail ?? "balanced",
  });
  ctx.restore();
}

interface HeadlineOptions {
  x: number;
  y: number;
  w: number;
  align?: CanvasTextAlign;
  size?: number;
  maxLines?: number;
  weight?: number;
  tracking?: number;
  leading?: number;
  uppercase?: boolean;
  color?: string;
  face?: DisplayFace;
  maxWidth?: number;
  reveal?: number;
}

/** Measure + paint a headline block in one call. Returns the measured block. */
function headline(scene: CompositionContext, o: HeadlineOptions): Measured & { bottom: number } {
  const { ctx, palette: p, face, motion } = scene;
  const reveal = (o.reveal ?? 1) * motion.headline;
  const text = englishOnly(scene.copy.headline);
  ctx.save();
  const measured = fitDisplay(ctx, text, {
    maxWidth: o.maxWidth ?? o.w,
    maxLines: o.maxLines ?? 3,
    startSize: o.size ?? o.w * 0.16,
    weight: o.weight ?? (face === "inter" ? 700 : 600),
    face: o.face ?? face,
    tracking: o.tracking ?? 0,
    leading: o.leading ?? (face === "inter" ? 1.08 : 1.04),
    uppercase: o.uppercase ?? false,
  });
  const shown = measured.size * (0.96 + 0.04 * reveal);
  let cursor = o.y;
  measured.lines.forEach((line, i) => {
    const lineReveal = Math.max(0, Math.min(1, reveal * measured.lines.length - i));
    paintLine(ctx, line, {
      x: o.align === "center" ? o.x + o.w / 2 : o.align === "right" ? o.x + o.w : o.x,
      y: cursor + shown * 0.94,
      font: fontFor(o.face ?? face, shown, o.weight ?? (face === "inter" ? 700 : 600)),
      tracking: ((o.tracking ?? 0) * shown) / measured.size,
      color: o.color ?? p.ink,
      align: o.align ?? "left",
      alpha: 1,
      reveal: lineReveal,
    });
    cursor += measured.leading * (shown / measured.size);
  });
  ctx.restore();
  return { ...measured, size: shown, bottom: cursor };
}

/** Kicker: tracked caps with an optional leading rule. */
function kicker(
  scene: CompositionContext,
  o: { x: number; y: number; align?: CanvasTextAlign; size?: number; color?: string; rule?: "left" | "right" | "both" | "none"; width?: number },
) {
  const { ctx, palette: p, motion } = scene;
  const value = englishOnly(scene.copy.kicker).toUpperCase();
  if (!value || motion.kicker <= 0) return;
  const size = o.size ?? Math.max(11, scene.W * 0.0195);
  const tracking = size * 0.24;
  ctx.save();
  ctx.globalAlpha *= motion.kicker;
  ctx.font = sansFor(size, 600);
  const w = measure(ctx, value, tracking);
  const align = o.align ?? "left";
  const anchorX = align === "center" ? o.x : align === "right" ? o.x : o.x;
  paintLine(ctx, value, {
    x: anchorX,
    y: o.y,
    font: sansFor(size, 600),
    tracking,
    color: o.color ?? withAlpha(p.goldSoft, 0.95),
    align,
  });
  if (o.rule && o.rule !== "none") {
    const ruleW = o.width ?? size * 3.4;
    const gap = size * 0.7;
    ctx.fillStyle = withAlpha(p.gold, 0.7);
    if (align === "left" && (o.rule === "left" || o.rule === "both")) {
      ctx.fillRect(anchorX - gap - ruleW, o.y - size * 0.32, ruleW, Math.max(1.2, size * 0.07));
    }
    if (align === "left" && o.rule === "right") {
      ctx.fillRect(anchorX + w + gap, o.y - size * 0.32, ruleW, Math.max(1.2, size * 0.07));
    }
    if (align === "center") {
      if (o.rule === "left" || o.rule === "both") ctx.fillRect(anchorX - w / 2 - gap - ruleW, o.y - size * 0.32, ruleW, Math.max(1.2, size * 0.07));
      if (o.rule === "right" || o.rule === "both") ctx.fillRect(anchorX + w / 2 + gap, o.y - size * 0.32, ruleW, Math.max(1.2, size * 0.07));
    }
  }
  ctx.restore();
}

/** Body text: a short measure of sans copy, measured so it never overruns. */
function body(scene: CompositionContext, o: { x: number; y: number; w: number; align?: CanvasTextAlign; size?: number; maxLines?: number; color?: string; leading?: number }) {
  const text = englishOnly(scene.copy.subline);
  if (!text || scene.motion.sub <= 0) return 0;
  const { ctx, palette: p, motion } = scene;
  const size = o.size ?? Math.max(12, scene.W * 0.0255);
  const leading = size * (o.leading ?? 1.52);
  ctx.save();
  ctx.font = sansFor(size, 400);
  const lines = wrapText(ctx, text, o.w).slice(0, o.maxLines ?? 4);
  lines.forEach((line, i) => {
    const lineReveal = Math.max(0, Math.min(1, motion.sub * lines.length - i));
    paintLine(ctx, line, {
      x: o.align === "center" ? o.x + o.w / 2 : o.align === "right" ? o.x + o.w : o.x,
      y: o.y + i * leading,
      font: sansFor(size, 400),
      color: o.color ?? withAlpha(p.ink, 0.72),
      align: o.align ?? "left",
      alpha: 1,
      reveal: lineReveal,
    });
  });
  ctx.restore();
  return lines.length * leading;
}

function cta(scene: CompositionContext, o: { x: number; y: number; align?: "left" | "center" | "right"; variant?: "solid" | "outline" | "ghost" | "ribbon" | "underline"; size?: number; width?: number }) {
  return drawCta({
    ctx: scene.ctx,
    palette: scene.palette,
    x: o.x,
    y: o.y,
    label: scene.copy.cta,
    variant: o.variant ?? "solid",
    align: o.align ?? "left",
    size: o.size ?? Math.max(12, scene.W * 0.0215),
    face: "inter",
    alpha: scene.motion.cta,
    width: o.width,
  });
}

function lockup(scene: CompositionContext, o: { x: number; y: number; size: number; align?: "left" | "center" | "right"; wordmark?: boolean }) {
  if (!scene.showLogo) return;
  drawLockup({
    ctx: scene.ctx,
    logo: scene.logo,
    palette: scene.palette,
    x: o.x,
    y: o.y,
    size: o.size,
    align: o.align ?? "left",
    wordmark: o.wordmark ?? true,
    alpha: scene.motion.logo,
  });
}

function footer(scene: CompositionContext, o: { x: number; y: number; w: number; align?: "left" | "center" | "right"; rule?: boolean; size?: number }) {
  drawFooter({
    ctx: scene.ctx,
    palette: scene.palette,
    x: o.x,
    y: o.y,
    width: o.w,
    text: scene.copy.footer || scene.copy.cta,
    align: o.align ?? "left",
    rule: o.rule ?? true,
    size: o.size,
    alpha: scene.motion.cta,
  });
}

/** The light sweep that the Luxury Gold preset drives. */
function lightSweep(scene: CompositionContext, o: { x: number; y: number; w: number; h: number; angle?: number }) {
  const { ctx, palette: p, motion } = scene;
  if (motion.sweep <= 0.001) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.w, o.h);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  const bandW = o.w * 0.28;
  const cx = o.x - bandW + (o.w + bandW * 2) * motion.sweep;
  const g = ctx.createLinearGradient(cx - bandW, 0, cx + bandW, 0);
  g.addColorStop(0, withAlpha(p.goldSoft, 0));
  g.addColorStop(0.45, withAlpha(p.goldSoft, 0.34));
  g.addColorStop(0.5, withAlpha("#FFFFFF", 0.5));
  g.addColorStop(0.55, withAlpha(p.goldSoft, 0.3));
  g.addColorStop(1, withAlpha(p.goldSoft, 0));
  ctx.fillStyle = g;
  ctx.save();
  ctx.translate(cx, o.y + o.h / 2);
  ctx.rotate(o.angle ?? -0.35);
  ctx.translate(-cx, -(o.y + o.h / 2));
  ctx.fillRect(cx - bandW, o.y - o.h, bandW * 2, o.h * 3);
  ctx.restore();
  ctx.restore();
}

/* ============================== 1 · hero ================================= */

/**
 * Premium Hero Illustration — the emblem owns the upper two-thirds on a symmetric
 * axis and the copy sits beneath it in a centred stack. Silhouette: a tall bright
 * crown over a dark type plinth.
 */
const heroIllustration: Composition = {
  key: "hero-illustration",
  name: "Premium Hero Illustration",
  structure: "Centred emblem crown · symmetric halo · copy plinth below",
  note: "One large illustrated focal subject with a balanced headline beneath it.",
  ground: "sanctum",
  usesArt: true,
  focus: { x: 0.5, y: 0.34 },
  bestFor: ["devotional", "festival", "birth-jathagam"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "sanctum", W, H, p, { seed: s.seed, focusX: 0.5, focusY: 0.3, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const chromeTop = H - planChrome(s, { cta: "outline", align: "center", inset: met.bottom });
    const squarePage = H / W <= 1.06;
    const artSize = Math.min(W * (squarePage ? 0.56 : 0.66), (chromeTop - met.top) * (squarePage ? 0.52 : 0.62));
    const artBox = { x: (W - artSize) / 2 + motion.parallaxX * W * 0.4, y: met.top + H * 0.03 + motion.parallaxY * H * 0.3, w: artSize, h: artSize };
    art(s, artBox);

    const copyTop = artBox.y + artSize;
    const plan = planCopy(s, {
      w: met.colW * 0.94,
      align: "center",
      headSize: W * 0.115,
      maxHeadLines: 3,
      face: scene_face(s, "cinzel"),
      kickerSize: Math.max(10, W * 0.0195),
      bodySize: Math.max(12, W * 0.0245),
      maxBodyLines: 2,
      maxHeight: chromeTop - copyTop - H * 0.01,
      gaps: { body: H * 0.016 },
    });
    paintCopy(s, plan, { x: (W - met.colW * 0.94) / 2, y: copyTop + H * 0.02, align: "center" });
    diamondRule(ctx, W / 2, Math.min(chromeTop - H * 0.012, copyTop + plan.height + H * 0.028), W * 0.22, p.gold, 0.7);
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "center", cta: "outline", inset: met.bottom });
    lightSweep(s, { x: 0, y: 0, w: W, h: H * 0.62 });
    ctx.restore();
  },
};

/* ============================== 2 · editorial ============================ */

/**
 * Luxury Editorial — a matted plate on the right, a huge left-aligned headline on
 * the left with a wide measure of whitespace, and a vertical kicker rail.
 * Silhouette: heavy right column against an asymmetric type block.
 */
const luxuryEditorial: Composition = {
  key: "luxury-editorial",
  name: "Luxury Editorial",
  structure: "Vertical rail · asymmetric type left · matted plate right",
  note: "Magazine page: oversized type, generous whitespace, one refined plate.",
  ground: "editorial-rule",
  usesArt: true,
  focus: { x: 0.74, y: 0.34 },
  bestFor: ["editorial", "birth-jathagam", "education"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "editorial-rule", W, H, p, { seed: s.seed, focusX: 0.76, focusY: 0.26, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const chromeTop = H - planChrome(s, { cta: "underline", align: "left", inset: met.bottom });
    // Narrow pages stack instead of sitting side by side: a 9:16 story that kept
    // the two-column split ran the headline one word per line and left the foot
    // of the sheet empty. Same composition, different proportion response.
    const narrow = H / W > 1.45;
    const plateW = Math.min(W * (narrow ? 0.52 : 0.37), met.colW * 0.46 * (narrow ? 1.4 : 1));
    const plateH = Math.min(H * (narrow ? 0.34 : 0.44), plateW * 1.2);
    const plateX = narrow ? W - met.side - plateW : W - met.side - plateW;
    const plateY = met.top + H * 0.055;

    drawPanel({ ctx, palette: p, x: plateX - W * 0.024, y: plateY - W * 0.024, w: plateW + W * 0.048, h: plateH + W * 0.048, radius: 2, fill: p.light ? 0.9 : 0.34, stroke: false });
    ctx.strokeStyle = withAlpha(p.gold, 0.55);
    ctx.lineWidth = Math.max(1, W * 0.0025);
    ctx.strokeRect(plateX - W * 0.013, plateY - W * 0.013, plateW + W * 0.026, plateH + W * 0.026);
    art(s, { x: plateX, y: plateY, w: plateW, h: plateH });

    // vertical kicker rail in the gutter
    const railLabel = englishOnly(s.copy.kicker).toUpperCase();
    if (railLabel) {
      ctx.save();
      ctx.globalAlpha *= motion.kicker;
      ctx.translate(met.side * 0.44, met.top);
      ctx.rotate(-Math.PI / 2);
      paintLine(ctx, railLabel, {
        x: 0,
        y: 0,
        font: sansFor(Math.max(10, W * 0.0175), 600),
        tracking: W * 0.0042,
        color: withAlpha(p.goldSoft, 0.9),
        baseline: "middle",
      });
      ctx.restore();
    }

    const typeX = narrow ? met.side : met.side + W * 0.042;
    const typeW = narrow ? met.colW : plateX - typeX - W * 0.045;
    const planTop = narrow ? plateY + plateH + H * 0.05 : met.top + H * 0.09;
    const plan = planCopy(s, {
      w: typeW,
      align: "left",
      headSize: narrow ? W * 0.115 : typeW * 0.2,
      maxHeadLines: 4,
      face: scene_face(s, "cormorant"),
      weight: 600,
      headLeading: 1.02,
      includeKicker: false,
      bodySize: Math.max(12, W * 0.0245),
      maxBodyLines: 4,
      maxHeight: chromeTop - planTop - H * 0.03,
      gaps: { body: H * 0.022 },
    });
    paintCopy(s, plan, { x: typeX, y: planTop });
    const ruleY = planTop + plan.height + H * 0.022;
    ctx.fillStyle = withAlpha(p.gold, 0.75);
    ctx.fillRect(typeX, ruleY, W * 0.1, Math.max(2, H * 0.003));
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "left", cta: "underline", inset: met.bottom });
    lightSweep(s, { x: plateX, y: plateY, w: plateW, h: plateH });
    ctx.restore();
  },
};

/* ============================== 3 · mandala ============================== */

/**
 * Circular Mandala — a rose window fills the field and the artwork sits at its
 * centre; the type is anchored inside the rose beneath the disc. Silhouette:
 * concentric, symmetrical, edge-to-edge rings.
 */
const circularMandala: Composition = {
  key: "circular-mandala",
  name: "Circular Mandala",
  structure: "Full-bleed rose window · central emblem · type beneath the disc",
  note: "Radial geometry with the headline set inside the mandala's lower quadrant.",
  ground: "mandala-rose",
  usesArt: true,
  focus: { x: 0.5, y: 0.4 },
  bestFor: ["devotional", "navagraha", "festival"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "mandala-rose", W, H, p, { seed: s.seed, focusY: 0.4, detail: s.detail });
    const chromeTopM = H - planChrome(s, { cta: "none", inset: met.bottom });
    // The disc and the copy share the sheet: reserve the type bay first, then fit
    // the rose into what is left, so the headline never lands on a ring.
    const cx = W / 2;
    // One column, measured bottom-up: the painted chrome at the foot, the copy
    // above it, and the disc in whatever is left. The copy is planned first, so
    // the disc can never take space the headline needs.
    const chromeTopPainted = H - met.bottom - chromeHeight(s, { cta: "none", stacked: true });
    const copyProbe = planCopy(s, {
      w: met.colW,
      align: "center",
      headSize: W * 0.095,
      maxHeadLines: 2,
      face: scene_face(s, "cinzel"),
      bodySize: Math.max(12, W * 0.024),
      maxBodyLines: 2,
      maxHeight: H * 0.26,
      gaps: { body: H * 0.018 },
    });
    const R = Math.max(
      W * 0.2,
      Math.min(W * 0.42, H * 0.34, (chromeTopPainted - met.top - copyProbe.height - H * 0.05) / 2),
    );
    const cy = met.top + H * 0.01 + R;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-cx, -cy);

    const disc = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.25, 0, cx, cy, R * 1.02);
    disc.addColorStop(0, withAlpha(p.field, 0.96));
    disc.addColorStop(1, withAlpha(p.deep, 0.92));
    ctx.beginPath();
    ctx.arc(cx + motion.parallaxX * W * 0.25, cy + motion.parallaxY * H * 0.25, R, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.gold, 0.75);
    ctx.lineWidth = Math.max(1.6, W * 0.0035);
    ctx.stroke();

    const artSize = R * 1.06;
    art(s, { x: cx - artSize / 2 + motion.parallaxX * W * 0.25, y: cy - artSize / 2 + motion.parallaxY * H * 0.25, w: artSize, h: artSize });

    const chromeTop = chromeTopPainted;
    const copyTop = cy + R + H * 0.03;
    const plan = copyProbe;
    paintCopy(s, plan, { x: met.side, y: copyTop, align: "center" });
    diamondRule(ctx, cx, Math.min(chromeTop - H * 0.008, copyTop + plan.height + H * 0.02), W * 0.24, p.goldSoft, 0.85);
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "center", cta: "none", inset: met.bottom, stacked: true });
    lightSweep(s, { x: 0, y: 0, w: W, h: H });
    ctx.restore();
  },
};

/* ============================== 4 · diagonal ============================= */

/**
 * Diagonal Dynamic — an angular wedge field with the artwork pinned top right and
 * the headline set on the low-left diagonal, closed by a full-width ribbon.
 * Silhouette: an aggressive diagonal split with a heavy band.
 */
const diagonalDynamic: Composition = {
  key: "diagonal-dynamic",
  name: "Diagonal Dynamic",
  structure: "Wedge field · low-left headline · diagonal ribbon band",
  note: "Angular colour fields and energetic diagonal placement for campaigns.",
  ground: "diagonal-motion",
  usesArt: true,
  focus: { x: 0.78, y: 0.24 },
  bestFor: ["advertisement", "carousel", "transits"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "diagonal-motion", W, H, p, { seed: s.seed, focusX: 0.8, focusY: 0.2, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const bandTop = H * 0.74;
    const artSize = Math.min(W * 0.46, H * 0.3);
    art(s, { x: W - met.side - artSize + motion.parallaxX * W * 0.3, y: met.top + motion.parallaxY * H * 0.3, w: artSize, h: artSize });

    const plan = planCopy(s, {
      w: met.colW * 0.86,
      align: "left",
      headSize: W * 0.12,
      maxHeadLines: 3,
      face: scene_face(s, "inter"),
      weight: 700,
      headLeading: 1.0,
      kickerSize: Math.max(10, W * 0.0185),
      bodySize: Math.max(11, W * 0.023),
      maxBodyLines: 2,
      maxHeight: bandTop - (met.top + H * 0.13) - H * 0.02,
      gaps: { body: H * 0.018 },
    });
    const planTop = met.top + H * 0.14;
    paintCopy(s, plan, { x: met.side, y: planTop });
    const slashY = planTop + plan.height + H * 0.018;
    ctx.save();
    ctx.strokeStyle = withAlpha(p.gold, 0.9);
    ctx.lineWidth = Math.max(2, W * 0.0045);
    ctx.beginPath();
    ctx.moveTo(met.side, slashY + H * 0.006);
    ctx.lineTo(met.side + W * 0.22, slashY - H * 0.006);
    ctx.stroke();
    ctx.restore();

    // the ribbon band carries the CTA and the lockup, edge to edge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, bandTop + H * 0.03);
    ctx.lineTo(W, bandTop - H * 0.02);
    ctx.lineTo(W, bandTop + H * 0.12);
    ctx.lineTo(0, bandTop + H * 0.17);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, bandTop, W, bandTop + H * 0.1);
    g.addColorStop(0, withAlpha(p.gold, 0.95));
    g.addColorStop(0.55, withAlpha(p.goldSoft, 0.88));
    g.addColorStop(1, withAlpha(p.gold, 0.55));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    const inkOnBand = p.light ? "#1B1206" : "#241706";
    drawCta({ ctx, palette: p, x: met.side, y: bandTop + H * 0.045, label: s.copy.cta, align: "left", variant: "ghost", size: Math.max(12, W * 0.025) });
    void inkOnBand;
    lockup(s, { x: W - met.side, y: bandTop + H * 0.05, size: W * 0.044, align: "right", wordmark: true });
    drawFooter({ ctx, palette: p, x: met.side, y: H - met.bottom * 0.55, width: met.colW, text: s.copy.footer || s.copy.cta, align: "left", rule: false, size: Math.max(10, W * 0.019), alpha: motion.cta });
    lightSweep(s, { x: W * 0.4, y: 0, w: W * 0.6, h: H });
    ctx.restore();
  },
};

/* ============================== 5 · framed =============================== */

/**
 * Luxury Framed Artwork — a wide gallery mat with a double gold rule, the plate
 * centred and a small centred caption beneath. Silhouette: a framed picture in a
 * large quiet field.
 */
const luxuryFramed: Composition = {
  key: "luxury-framed",
  name: "Luxury Framed Artwork",
  structure: "Wide gallery mat · double gold rule · centred plate + caption",
  note: "An heirloom frame with restrained typography beneath the artwork.",
  ground: "framed-matte",
  usesArt: true,
  focus: { x: 0.5, y: 0.4 },
  bestFor: ["devotional", "festival", "naming"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "framed-matte", W, H, p, { seed: s.seed, focusX: 0.5, focusY: 0.4, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const chromeTop = H - planChrome(s, { cta: "none", align: "center", inset: met.bottom });
    const frameX = W * 0.11;
    const frameW = W * 0.78;
    const frameY = H * 0.12;
    const frameH = Math.min(H * 0.5, frameW * 1.16);
    drawPanel({ ctx, palette: p, x: frameX, y: frameY, w: frameW, h: frameH, radius: 3, fill: 0.32, stroke: true, shadow: true });
    art(s, { x: frameX + W * 0.028, y: frameY + W * 0.028, w: frameW - W * 0.056, h: frameH - W * 0.056 });

    const capTop = frameY + frameH + H * 0.045;
    const plan = planCopy(s, {
      w: W * 0.76,
      align: "center",
      headSize: W * 0.1,
      maxHeadLines: 2,
      face: scene_face(s, "cormorant"),
      weight: 600,
      bodySize: Math.max(11, W * 0.0225),
      maxBodyLines: 2,
      maxHeight: chromeTop - capTop - H * 0.02,
      gaps: { body: H * 0.014 },
    });
    paintCopy(s, plan, { x: W * 0.12, y: capTop, align: "center" });
    diamondRule(ctx, W / 2, Math.min(chromeTop - H * 0.006, capTop + plan.height + H * 0.022), W * 0.2, p.gold, 0.75);
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "center", cta: "none", inset: met.bottom, stacked: true });
    lightSweep(s, { x: frameX, y: frameY, w: frameW, h: frameH });
    ctx.restore();
  },
};

/* ============================== 6 · cosmic =============================== */

/**
 * Cosmic Astrology — a full-bleed sky with the headline anchored low left and a
 * celestial construction crossing behind it. Silhouette: bottom-weighted type
 * over a deep field with orbital arcs.
 */
const cosmicAstrology: Composition = {
  key: "cosmic-astrology",
  name: "Cosmic Astrology",
  structure: "Full-bleed sky · orbital arcs · low-left type stack",
  note: "Layered planets and zodiac geometry with atmospheric depth.",
  ground: "cosmic-depth",
  usesArt: true,
  focus: { x: 0.55, y: 0.32 },
  bestFor: ["transits", "astrology", "panchangam"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "cosmic-depth", W, H, p, { seed: s.seed, focusX: 0.52, focusY: 0.34, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const artSize = Math.min(W * 0.6, H * 0.31);
    art(s, { x: W * 0.42 + motion.parallaxX * W * 0.3, y: met.top + H * 0.03 + motion.parallaxY * H * 0.3, w: artSize, h: artSize });

    // top coordinates strip
    ctx.save();
    ctx.globalAlpha *= motion.kicker;
    ctx.fillStyle = withAlpha(p.gold, 0.55);
    ctx.fillRect(met.side, met.top - H * 0.014, W * 0.06, Math.max(1.4, H * 0.0024));
    paintLine(ctx, `${englishOnly(s.copy.kicker).toUpperCase() || "JYOTISH"} · PLANETARY RECORD`, {
      x: met.side,
      y: met.top + H * 0.012,
      font: sansFor(Math.max(9, W * 0.0155), 500),
      tracking: W * 0.0026,
      color: withAlpha(p.ink, 0.6),
    });
    ctx.restore();

    const chromeTop = H - planChrome(s, { cta: "outline", align: "left", inset: met.bottom });
    const copyTop = H * 0.5;
    const plan = planCopy(s, {
      w: met.colW * 0.88,
      align: "left",
      headSize: W * 0.125,
      maxHeadLines: 3,
      face: scene_face(s, "cormorant"),
      weight: 600,
      includeKicker: false,
      bodySize: Math.max(12, W * 0.0245),
      maxBodyLines: 2,
      maxHeight: chromeTop - copyTop - H * 0.03,
      gaps: { body: H * 0.02 },
    });
    paintCopy(s, plan, { x: met.side, y: copyTop });
    ctx.fillStyle = withAlpha(p.gold, 0.8);
    ctx.fillRect(met.side, copyTop + plan.height + H * 0.016, W * 0.14, Math.max(2, H * 0.003));
    lockup(s, { x: W - met.side, y: met.top * 0.5, size: W * 0.044, align: "right", wordmark: false });
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "left", cta: "outline", inset: met.bottom });
    lightSweep(s, { x: 0, y: H * 0.4, w: W, h: H * 0.6 });
    ctx.restore();
  },
};

/* ============================== 7 · typographic ========================== */

/**
 * Typography Dominant — the headline is the artwork. One oversized setting, one
 * gold rule, a margin numeral and a deliberate void. Silhouette: type filling the
 * sheet with almost no image mass.
 */
const typographyDominant: Composition = {
  key: "typography-dominant",
  name: "Typography Dominant",
  structure: "Oversized headline · margin index · vast negative space",
  note: "Restrained artwork and an editorial type setting with real hierarchy.",
  ground: "type-field",
  usesArt: false,
  focus: { x: 0.5, y: 0.3 },
  bestFor: ["editorial", "education", "consultation"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "type-field", W, H, p, { seed: s.seed, focusX: 0.5, focusY: 0.3, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    // margin numeral, deliberately cropped by the right edge
    ctx.save();
    ctx.globalAlpha *= motion.art * 0.16;
    paintLine(ctx, String(s.index ?? 1).padStart(2, "0"), {
      x: W - met.side * 0.4,
      y: H * 0.42,
      font: fontFor(s.face === "inter" ? "inter" : "cormorant", Math.round(H * 0.34), 700),
      color: p.gold,
      align: "right",
    });
    ctx.restore();

    const chromeTop = H - planChrome(s, { cta: "underline", align: "left", inset: met.bottom });
    // Anchor the block in the optical middle. Anchoring it to the top left the
    // foot of a 9:16 story empty; the margin numeral now sits inside the block.
    const planTop = H * 0.3;
    const plan = planCopy(s, {
      w: met.colW,
      align: "left",
      headSize: W * 0.2,
      maxHeadLines: 4,
      face: scene_face(s, "cormorant"),
      weight: 600,
      headLeading: 0.98,
      kickerSize: Math.max(10, W * 0.019),
      bodySize: Math.max(13, W * 0.027),
      maxBodyLines: 3,
      maxHeight: chromeTop - planTop - H * 0.04,
      gaps: { body: H * 0.026 },
    });
    paintCopy(s, plan, { x: met.side, y: planTop });
    ctx.fillStyle = withAlpha(p.gold, 0.85);
    ctx.fillRect(met.side, planTop + plan.height + H * 0.032, W * 0.16, Math.max(2, H * 0.0035));
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "left", cta: "underline", inset: met.bottom });
    ctx.restore();
  },
};

/* ============================== 8 · infographic ========================== */

/**
 * Educational Infographic — a header band, numbered teaching rows and a diagram
 * rail with leader lines. Silhouette: a structured information page with a strong
 * header rule and a labelled footer diagram.
 */
const educationalInfographic: Composition = {
  key: "educational-infographic",
  name: "Educational Infographic",
  structure: "Header band · numbered teaching rows · labelled diagram rail",
  note: "Structured panels, labelled rows and a clear reading order.",
  ground: "panel-grid",
  usesArt: true,
  focus: { x: 0.5, y: 0.16 },
  bestFor: ["education", "navagraha", "panchangam"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "panel-grid", W, H, p, { seed: s.seed, focusX: 0.5, focusY: 0.1, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const artSize = Math.min(W * 0.22, H * 0.14);
    const plan = planCopy(s, {
      w: met.colW - artSize - W * 0.04,
      align: "left",
      headSize: W * 0.082,
      maxHeadLines: 2,
      face: scene_face(s, "inter"),
      weight: 700,
      headLeading: 1.02,
      kickerSize: Math.max(10, W * 0.0175),
      includeBody: false,
      unit: met.colW,
    });
    const headTop = met.top + H * 0.02;
    paintCopy(s, plan, { x: met.side, y: headTop });
    art(s, { x: W - met.side - artSize, y: headTop + H * 0.004, w: artSize, h: artSize });

    const ruleY = Math.max(headTop + plan.height, headTop + artSize) + H * 0.028;
    ctx.fillStyle = withAlpha(p.gold, 0.6);
    ctx.fillRect(met.side, ruleY, met.colW, Math.max(1.4, H * 0.0022));

    // diagram rail sits above the chrome band and is measured first
    const chromeTop = H - planChrome(s, { cta: "solid", align: "left", inset: met.bottom });
    const railH = H * 0.1;
    const railY = chromeTop - railH - H * 0.03;

    // teaching rows fill the space between the rule and the rail
    const rows = points(englishOnly(s.copy.subline), 3);
    const rowRegion = railY - ruleY - H * 0.05;
    let rowY = ruleY + H * 0.04;
    const rowH = Math.min(H * 0.09, rowRegion / Math.max(1, rows.length));
    rows.forEach((row, i) => {
      const a = Math.max(0, Math.min(1, motion.sub * rows.length - i));
      drawPanel({ ctx, palette: p, x: met.side, y: rowY, w: met.colW, h: rowH * 0.92, radius: 12, fill: 0.26, stroke: false, shadow: false });
      drawIndexCard({
        ctx,
        palette: p,
        x: met.side + W * 0.028,
        y: rowY + rowH * 0.1,
        w: met.colW - W * 0.056,
        index: String(i + 1).padStart(2, "0"),
        title: row,
        face: "inter",
        titleSize: Math.max(13, W * 0.028),
        alpha: a,
      });
      rowY += rowH;
    });

    // diagram rail with leader lines
    drawPanel({ ctx, palette: p, x: met.side, y: railY, w: met.colW, h: railH, radius: 12, fill: 0.3 });
    const nodes = 5;
    for (let i = 0; i < nodes; i += 1) {
      const nx = met.side + W * 0.08 + ((met.colW - W * 0.16) * i) / (nodes - 1);
      const ny = railY + railH * 0.62;
      ctx.beginPath();
      ctx.arc(nx, ny, W * 0.011, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(p.gold, 0.9);
      ctx.fill();
      drawLeader(ctx, { x: nx, y: ny - W * 0.011 }, { x: nx, y: railY + railH * 0.16 }, withAlpha(p.goldSoft, 0.6), 0.6);
      if (i < nodes - 1) {
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx + (met.colW - W * 0.16) / (nodes - 1), ny);
        ctx.strokeStyle = withAlpha(p.gold, 0.35);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    lockup(s, { x: met.side, y: railY + railH * 0.2, size: W * 0.036, align: "left", wordmark: true });
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "left", cta: "solid", inset: met.bottom });
    ctx.restore();
  },
};

/* ============================== 9 · commercial =========================== */

/**
 * Commercial Advertisement — a heavy angled offer band carrying the headline, an
 * artwork seal, benefit chips and a filled CTA footer block. Silhouette: banded,
 * product-led, CTA dominated.
 */
const commercialAd: Composition = {
  key: "commercial-ad",
  name: "Commercial Advertisement",
  structure: "Angled offer band · artwork seal · chip row · filled CTA block",
  note: "Strong headline, service visual and a prominent call to action.",
  ground: "commercial-band",
  usesArt: true,
  focus: { x: 0.7, y: 0.5 },
  bestFor: ["advertisement", "consultation", "carousel"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "commercial-band", W, H, p, { seed: s.seed, focusX: 0.75, focusY: 0.5, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const ctaSize = Math.max(13, W * 0.026);
    const chromeTop = H - planChrome(s, { cta: "none", inset: met.bottom });
    const seal = Math.min(W * 0.34, H * 0.22);

    const planTop = met.top + H * 0.03;
    // The headline shares its band with the seal, so its measure stops short of
    // it. At full column width the last word ran behind the artwork on every
    // format — the art is a block on the page, not a backdrop for type.
    art(s, { x: W - met.side - seal + motion.parallaxX * W * 0.22, y: planTop + motion.parallaxY * H * 0.25, w: seal, h: seal });
    const plan = planCopy(s, {
      w: met.colW - seal - W * 0.035,
      align: "left",
      headSize: W * 0.1,
      maxHeadLines: 4,
      face: scene_face(s, "inter"),
      weight: 700,
      headLeading: 1.0,
      kickerSize: Math.max(10, W * 0.0185),
      includeBody: false,
      maxHeight: seal + H * 0.02,
    });
    paintCopy(s, plan, { x: met.side, y: planTop });

    // benefit chips, wrapped and measured
    const chips = points(englishOnly(s.copy.subline), 3);
    let chipY = Math.max(planTop + Math.max(plan.height, seal) + H * 0.03, H * 0.36);
    let chipX = met.side;
    const chipSize = Math.max(10, W * 0.019);
    chips.forEach((chip, i) => {
      const label = truncateWords(chip, Math.round((W * 0.42) / (chipSize * 0.5)));
      ctx.font = sansFor(chipSize, 600);
      const cw = measure(ctx, englishOnly(label), chipSize * 0.04) + chipSize * 1.7;
      if (chipX + cw > W - met.side && chipX > met.side) {
        chipX = met.side;
        chipY += chipSize * 2.6;
      }
      const used = drawChip(ctx, chipX, chipY, label, p, chipSize, { filled: i === 0 });
      chipX += used + W * 0.018;
    });

    // service plate
    const blockHc = ctaSize * 2.9;
    const blockYc = chromeTop - blockHc - H * 0.012;
    const plateY = Math.min(chipY + chipSize * 3.2, blockYc - H * 0.2);
    const plateH = Math.max(H * 0.12, Math.min(H * 0.17, blockYc - plateY - H * 0.03));
    drawPanel({ ctx, palette: p, x: met.side, y: plateY, w: met.colW, h: plateH, radius: 16, fill: 0.34, accent: true });
    paintLine(ctx, truncateTo(englishOnly(s.copy.badge ?? s.copy.headline), 42), {
      x: met.side + W * 0.045,
      y: plateY + plateH * 0.42,
      font: fontFor(s.face === "inter" ? "cinzel" : s.face, W * 0.04, 600),
      color: withAlpha(p.ink, 0.96),
    });
    paintLine(ctx, truncateTo(englishOnly(s.copy.footer), 52), {
      x: met.side + W * 0.045,
      y: plateY + plateH * 0.74,
      font: sansFor(W * 0.021, 500),
      color: withAlpha(p.ink, 0.62),
    });

    // filled CTA block above the chrome row
    const blockH = ctaSize * 2.9;
    const blockY = chromeTop - blockH - H * 0.012;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, motion.cta);
    const g = ctx.createLinearGradient(met.side, blockY, W - met.side, blockY + blockH);
    g.addColorStop(0, withAlpha(p.gold, 0.97));
    g.addColorStop(1, withAlpha(p.goldDeep, 0.97));
    rounded(ctx, met.side, blockY, met.colW, blockH, blockH * 0.24);
    ctx.fillStyle = g;
    ctx.fill();
    paintLine(ctx, truncateTo(englishOnly(s.copy.cta).toUpperCase(), 34) || "BOOK NOW", {
      x: W / 2,
      y: blockY + blockH / 2,
      font: fontFor("inter", ctaSize, 700),
      tracking: W * 0.005,
      color: p.light ? "#FFFFFF" : "#20140A",
      align: "center",
      baseline: "middle",
    });
    ctx.restore();
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "left", cta: "none", inset: met.bottom });
    lightSweep(s, { x: met.side, y: blockY, w: met.colW, h: blockH });
    ctx.restore();
  },
};

/* ============================== 10 · story =============================== */

/**
 * Illustrated Storytelling — a scene occupies the upper half and is cut by a
 * rounded copy card that overlaps it. Silhouette: image mass above, a floating
 * card below that breaks its own edge.
 */
const illustratedStory: Composition = {
  key: "illustrated-story",
  name: "Illustrated Storytelling",
  structure: "Full-bleed scene above · overlapping copy card below",
  note: "A visual narrative with the story pill, scene and card in sequence.",
  ground: "narrative-layers",
  usesArt: true,
  focus: { x: 0.55, y: 0.3 },
  bestFor: ["astrology", "festival", "carousel"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "narrative-layers", W, H, p, { seed: s.seed, focusX: 0.6, focusY: 0.24, detail: s.detail });

    const sceneH = H * 0.5;
    ctx.save();
    ctx.translate(motion.parallaxX * W * 0.25, motion.parallaxY * H * 0.25);
    paintArt(s.art.kind === "deity-emblem" ? "narrative-scene" : s.art.kind, {
      ctx,
      box: { x: -W * 0.02, y: 0, w: W * 1.04, h: sceneH },
      palette: p,
      reveal: motion.artReveal,
      seed: s.seed,
      subject: s.art.subject,
      variant: s.art.variant,
      detail: s.detail ?? "balanced",
    });
    ctx.restore();

    const scrimG = ctx.createLinearGradient(0, sceneH * 0.45, 0, sceneH);
    scrimG.addColorStop(0, withAlpha(p.deep, 0));
    scrimG.addColorStop(1, withAlpha(p.deep, 0.94));
    ctx.fillStyle = scrimG;
    ctx.fillRect(0, sceneH * 0.45, W, sceneH * 0.55);

    // top chrome: kicker left, lockup right
    ctx.save();
    ctx.globalAlpha *= motion.kicker;
    paintLine(ctx, englishOnly(s.copy.kicker).toUpperCase(), {
      x: met.side,
      y: met.top + W * 0.02,
      font: sansFor(Math.max(10, W * 0.0185), 600),
      tracking: W * 0.0042,
      color: withAlpha(p.ink, 0.92),
    });
    ctx.restore();
    lockup(s, { x: W - met.side, y: met.top * 0.55, size: W * 0.05, align: "right", wordmark: false });

    // copy card, sized from the chrome band upward
    const chromeTop = H - planChrome(s, { cta: "underline", inset: met.bottom });
    const cardX = met.side * 0.5;
    const cardW = W - met.side;
    const cardTop = sceneH - H * 0.075;
    const cardH = chromeTop - cardTop - H * 0.01;
    ctx.save();
    ctx.shadowColor = withAlpha("#000000", 0.5);
    ctx.shadowBlur = W * 0.07;
    const card = ctx.createLinearGradient(0, cardTop, 0, cardTop + cardH);
    if (p.light) {
      card.addColorStop(0, withAlpha("#FFFFFF", 0.98));
      card.addColorStop(1, withAlpha(p.deepAlt, 0.97));
    } else {
      card.addColorStop(0, withAlpha(p.deepAlt, 0.99));
      card.addColorStop(1, withAlpha(p.deep, 0.99));
    }
    ctx.fillStyle = card;
    rounded(ctx, cardX, cardTop, cardW, cardH, W * 0.055);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = withAlpha(p.gold, 0.45);
    ctx.lineWidth = 1.4;
    rounded(ctx, cardX, cardTop, cardW, cardH, W * 0.055);
    ctx.stroke();

    const innerX = cardX + W * 0.055;
    const innerW = cardW - W * 0.11;
    const pillLabel = englishOnly(s.copy.badge ?? s.copy.kicker) || "STORY";
    const pillW = drawChip(ctx, innerX, cardTop - H * 0.026, pillLabel, p, Math.max(10, W * 0.0175), { filled: true });
    void pillW;
    const plan = planCopy(s, {
      w: innerW,
      align: "left",
      headSize: W * 0.095,
      maxHeadLines: 2,
      face: scene_face(s, "playfair"),
      weight: 700,
      includeKicker: false,
      bodySize: Math.max(11, W * 0.022),
      maxBodyLines: 2,
      maxHeight: cardH - H * 0.13,
      gaps: { body: H * 0.018 },
    });
    paintCopy(s, plan, { x: innerX, y: cardTop + H * 0.045 });
    paintChrome(s, { x: innerX, y: chromeTop - H * 0.005, w: innerW, align: "left", cta: "underline", inset: met.bottom });
    ctx.restore();
  },
};

/* ============================== 11 · collage ============================= */

/**
 * Asymmetric Graphic Collage — an editorial collage: one tall plate on the left
 * edge, one small square floating over it, a headline that threads between them,
 * and a horizontal band of type across the foot. No centred axis anywhere.
 */
const collageAsymmetric: Composition = {
  key: "collage-asymmetric",
  name: "Asymmetric Graphic Collage",
  structure: "Tall left plate · floating square · threaded headline · foot band",
  note: "Overlapping graphic layers with deliberately unequal visual weight.",
  ground: "collage-blocks",
  usesArt: true,
  focus: { x: 0.34, y: 0.32 },
  bestFor: ["carousel", "editorial", "festival"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "collage-blocks", W, H, p, { seed: s.seed, focusX: 0.34, focusY: 0.32, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const tile = (box: { x: number; y: number; w: number; h: number }, rot: number, variant: number, delay: number, kind?: ArtPlan["kind"]) => {
      const a = Math.max(0, Math.min(1, motion.art * 1.6 - delay));
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha *= a;
      const cx = box.x + box.w / 2 + motion.parallaxX * W * 0.14;
      const cy = box.y + box.h / 2 + motion.parallaxY * H * 0.14;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);
      drawPanel({ ctx, palette: p, x: box.x, y: box.y, w: box.w, h: box.h, radius: W * 0.016, fill: 0.42 });
      const pad = Math.min(box.w, box.h) * 0.05;
      art(s, { x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 }, kind ? { variant, kind } : { variant });
      ctx.restore();
    };

    const chromeTop = H - planChrome(s, { cta: "outline", align: "right", inset: met.bottom });

    // 1 · tall plate bleeding off the left edge
    const tallW = W * 0.4;
    const tallH = Math.min(H * 0.6, tallW * 1.5);
    tile({ x: -W * 0.08, y: met.top + H * 0.02, w: tallW, h: tallH }, -0.02, 0, 0);

    // 2 · small square floating over its lower right corner
    const sq = W * 0.24;
    tile({ x: tallW - W * 0.2, y: met.top + tallH - sq * 0.5, w: sq, h: sq }, 0.055, 1, 0.22, "zodiac-medallion");

    // 3 · headline threaded between the plate and the right margin
    const typeX = W * 0.47;
    const typeW = W - typeX - met.side;
    const plan = planCopy(s, {
      w: typeW,
      align: "left",
      headSize: typeW * 0.19,
      maxHeadLines: 4,
      face: scene_face(s, "cinzel"),
      includeKicker: false,
      includeBody: false,
      maxHeight: H * 0.3,
    });
    const planTop = met.top + H * 0.07;
    paintCopy(s, plan, { x: typeX, y: planTop });
    // vertical kicker rule in the gap
    const kLabel = englishOnly(s.copy.kicker).toUpperCase();
    if (kLabel) {
      ctx.save();
      ctx.globalAlpha *= motion.kicker;
      ctx.translate(typeX - W * 0.045, planTop + H * 0.2);
      ctx.rotate(-Math.PI / 2);
      paintLine(ctx, kLabel, {
        x: 0,
        y: 0,
        font: sansFor(Math.max(9, W * 0.0155), 600),
        tracking: W * 0.0034,
        color: withAlpha(p.goldSoft, 0.9),
        baseline: "middle",
      });
      ctx.restore();
    }

    // 4 · the supporting copy as a pull-quote block anchored to the lower left
    const bodyText = englishOnly(s.copy.subline);
    if (bodyText) {
      const bandY = H * 0.74;
      const bandW = W * 0.62;
      ctx.fillStyle = withAlpha(p.gold, 0.45);
      ctx.fillRect(met.side, bandY - H * 0.03, W * 0.14, Math.max(2, H * 0.0026));
      ctx.save();
      ctx.globalAlpha *= Math.min(1, motion.sub);
      ctx.font = serifFor(Math.max(13, W * 0.028), 400);
      const lines = wrapText(ctx, bodyText, bandW).slice(0, 3);
      lines.forEach((line, i) => {
        paintLine(ctx, line, {
          x: met.side,
          y: bandY + W * 0.028 * 1.1 + i * W * 0.028 * 1.5,
          font: serifFor(Math.max(13, W * 0.028), 400),
          color: withAlpha(p.ink, 0.78),
        });
      });
      ctx.restore();
    }
    // 5 · a rule across the foot, so the collage is anchored to the page edge
    const bandY2 = chromeTop - H * 0.045;
    ctx.fillStyle = withAlpha(p.gold, 0.3);
    ctx.fillRect(met.side, bandY2, met.colW, Math.max(1, H * 0.0018));
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "right", cta: "outline", inset: met.bottom });
    ctx.restore();
  },
};

/* ============================== 12 · minimal ============================= */

/**
 * Minimal Luxury — an off-centre paper layout: the emblem is a small plate high
 * on the right, the type sits on the lower left, and the empty middle is the
 * point. Silhouette: two small masses with a large calm diagonal between them.
 */
const minimalLuxury: Composition = {
  key: "minimal-luxury",
  name: "Minimal Luxury",
  structure: "Off-centre plate · diagonal calm · low-set single column",
  note: "Very few elements, beautiful typography, one strong accent.",
  ground: "quiet-paper",
  usesArt: true,
  focus: { x: 0.72, y: 0.24 },
  bestFor: ["editorial", "consultation", "naming"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "quiet-paper", W, H, p, { seed: s.seed, focusX: 0.72, focusY: 0.24, detail: s.detail });
    // one warm wash behind the plate so the paper has light on it
    const wash = ctx.createRadialGradient(W * 0.74, H * 0.22, 0, W * 0.74, H * 0.22, W * 0.72);
    wash.addColorStop(0, withAlpha(p.gold, 0.16));
    wash.addColorStop(0.55, withAlpha(p.gold, 0.05));
    wash.addColorStop(1, withAlpha(p.gold, 0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    // A tall page carries a taller plate, so the sheet does not open with a
    // small picture above a large emptiness.
    const tall = H / W > 1.45;
    const artSize = Math.min(W * (tall ? 0.5 : 0.46), H * (tall ? 0.3 : 0.34));
    art(s, { x: W - met.side - artSize + motion.parallaxX * W * 0.2, y: met.top + H * 0.05 + motion.parallaxY * H * 0.2, w: artSize, h: artSize });
    lockup(s, { x: met.side, y: met.top + H * 0.02, size: W * 0.048, align: "left", wordmark: true });

    // hairline that steps from the upper-left margin across to the type block
    const ruleY = met.top + H * (tall ? 0.115 : 0.13);
    ctx.save();
    ctx.strokeStyle = withAlpha(p.gold, 0.45);
    ctx.lineWidth = Math.max(1, W * 0.0016);
    ctx.beginPath();
    ctx.moveTo(met.side, ruleY);
    ctx.lineTo(met.side + W * 0.26, ruleY);
    ctx.moveTo(met.side, ruleY);
    ctx.lineTo(met.side, tall ? H * 0.44 : H * 0.47);
    ctx.stroke();
    ctx.restore();

    const chromeTop = H - planChrome(s, { cta: "underline", align: "left", inset: met.bottom });
    const planTop = H * (tall ? 0.44 : 0.5);
    const plan = planCopy(s, {
      w: W * 0.7,
      align: "left",
      headSize: W * (tall ? 0.12 : 0.108),
      maxHeadLines: 3,
      face: scene_face(s, "cormorant"),
      weight: 600,
      headLeading: 1.05,
      bodySize: Math.max(12, W * 0.024),
      maxBodyLines: 2,
      maxHeight: chromeTop - planTop - H * 0.02,
      gaps: { body: H * 0.024 },
    });
    paintCopy(s, plan, { x: met.side, y: planTop });
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "left", cta: "underline", inset: met.bottom });
    ctx.restore();
  },
};

/* ============================== 13 · festival ============================ */

/**
 * Festival Celebration — garland architecture top and bottom, a medallion at the
 * centre and the greeting set as the dominant line. Silhouette: ceremonial,
 * symmetrical, decorated at the edges.
 */
const festivalCelebration: Composition = {
  key: "festival-celebration",
  name: "Festival Celebration",
  structure: "Garland frame · radiant medallion · greeting-first hierarchy",
  note: "Festive decoration, warm colour and expressive greeting typography.",
  ground: "festival-burst",
  usesArt: true,
  focus: { x: 0.5, y: 0.42 },
  bestFor: ["festival", "devotional", "muhurtham"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "festival-burst", W, H, p, { seed: s.seed, detail: s.detail });

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const chromeTop = H - planChrome(s, { cta: "ribbon", align: "center", inset: met.bottom });
    const square = H / W <= 1.06;
    // A square page has ~20% less height at the same width, so the medallion is
    // sized from the height budget rather than the width one.
    // A square page carries the same width in 20% less height, so the medallion
    // gives way: the greeting and its supporting line must still fit whole.
    const medallionR = Math.min(W * (square ? 0.22 : 0.29), H * (square ? 0.155 : 0.2));
    const cx = W / 2;
    const cy = met.top + H * 0.09 + medallionR;

    ctx.save();
    ctx.translate(cx, cy);
    for (let ring = 0; ring < 2; ring += 1) {
      const petals = ring === 0 ? 16 : 24;
      const r = medallionR * (ring === 0 ? 1.06 : 1.24);
      for (let i = 0; i < petals; i += 1) {
        const a = (Math.PI * 2 * i) / petals + ring * 0.14;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -r, r * 0.088, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(ring === 0 ? p.goldSoft : p.accent, ring === 0 ? 0.16 : 0.1);
        ctx.fill();
        ctx.strokeStyle = withAlpha(p.gold, ring === 0 ? 0.5 : 0.28);
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }
    }
    const disc = ctx.createRadialGradient(-medallionR * 0.3, -medallionR * 0.35, 0, 0, 0, medallionR);
    disc.addColorStop(0, withAlpha(p.field, 0.96));
    disc.addColorStop(1, withAlpha(p.deep, 0.94));
    ctx.beginPath();
    ctx.arc(0, 0, medallionR, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.goldSoft, 0.85);
    ctx.lineWidth = Math.max(1.6, W * 0.004);
    ctx.stroke();
    ctx.restore();

    const artSize = medallionR * 1.56;
    art(s, { x: cx - artSize / 2 + motion.parallaxX * W * 0.18, y: cy - artSize / 2 + motion.parallaxY * H * 0.18, w: artSize, h: artSize });

    const planTop = cy + medallionR * (square ? 1.12 : 1.34);
    const plan = planCopy(s, {
      w: W * 0.82,
      align: "center",
      // A square page has ~20% less height for the same width, so the greeting
      // steps down a tier and lifts onto the medallion's shoulder.
      headSize: W * (square ? 0.082 : 0.108),
      maxHeadLines: 2,
      face: scene_face(s, "cormorant"),
      weight: 600,
      kickerSize: Math.max(10, W * 0.018),
      bodySize: Math.max(11, W * 0.0225),
      maxBodyLines: 2,
      maxHeight: chromeTop - planTop - H * 0.02,
      gaps: { body: H * 0.016 },
    });
    paintCopy(s, plan, { x: W * 0.09, y: planTop, align: "center" });
    diamondRule(ctx, cx, Math.min(chromeTop - H * 0.004, planTop + plan.height + H * 0.018), W * 0.26, p.goldSoft, 0.9);
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "center", cta: "ribbon", inset: met.bottom });
    lightSweep(s, { x: 0, y: 0, w: W, h: H * 0.7 });
    ctx.restore();
  },
};

/* ============================== 14 · split =============================== */

/**
 * Split-Panel Composition — a hard horizontal split: artwork above the seam, type
 * below, with the seam carrying the kicker. Silhouette: two fields with a gold
 * rule through the middle.
 */
const splitPanel: Composition = {
  key: "split-panel",
  name: "Split-Panel Composition",
  structure: "Hard horizontal split · art above · type below · seam kicker",
  note: "Two deliberate fields, one carrying image and one carrying the message.",
  ground: "split-panels",
  usesArt: true,
  focus: { x: 0.5, y: 0.28 },
  bestFor: ["carousel", "naming", "muhurtham"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    const seam = H * 0.5;
    paintGround(ctx, "split-panels", W, H, p, { seed: s.seed, focusX: 0.5, focusY: 0.25, detail: s.detail });

    ctx.save();
    ctx.translate(motion.parallaxX * W * 0.2, motion.parallaxY * H * 0.2);
    const upper = ctx.createLinearGradient(0, 0, 0, seam);
    upper.addColorStop(0, withAlpha(p.deepAlt, 0.92));
    upper.addColorStop(1, withAlpha(p.field, 0.7));
    ctx.fillStyle = upper;
    ctx.fillRect(0, 0, W, seam);
    const artSize = Math.min(W * 0.72, seam * 1.0);
    art(s, { x: (W - artSize) / 2, y: (seam - artSize) / 2, w: artSize, h: artSize });
    ctx.restore();

    const seamH = Math.max(6, H * 0.014);
    const seamGrad = ctx.createLinearGradient(0, 0, W, 0);
    seamGrad.addColorStop(0, withAlpha(p.goldDeep, 0.2));
    seamGrad.addColorStop(0.5, withAlpha(p.goldSoft, 1));
    seamGrad.addColorStop(1, withAlpha(p.goldDeep, 0.2));
    ctx.fillStyle = seamGrad;
    ctx.fillRect(0, seam - seamH / 2, W, seamH);

    const lower = ctx.createLinearGradient(0, seam, 0, H);
    if (p.light) {
      lower.addColorStop(0, p.deep);
      lower.addColorStop(1, p.deepAlt);
    } else {
      lower.addColorStop(0, p.deepAlt);
      lower.addColorStop(1, p.deep);
    }
    ctx.fillStyle = lower;
    ctx.fillRect(0, seam + seamH / 2, W, H - seam);

    // seam kicker capsule
    const kLabel = englishOnly(s.copy.kicker).toUpperCase();
    if (kLabel) {
      ctx.save();
      ctx.font = sansFor(Math.max(10, W * 0.018), 700);
      const kw = measure(ctx, kLabel, W * 0.004);
      const padX = W * 0.03;
      const capW = kw + padX * 2;
      const capH = H * 0.046;
      const capX = W / 2 - capW / 2;
      const capBg = ctx.createLinearGradient(capX, 0, capX + capW, 0);
      capBg.addColorStop(0, withAlpha(p.deep, 0.94));
      capBg.addColorStop(0.5, withAlpha(p.deepAlt, 0.98));
      capBg.addColorStop(1, withAlpha(p.deep, 0.94));
      ctx.fillStyle = capBg;
      rounded(ctx, capX, seam - capH / 2, capW, capH, capH / 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(p.gold, 0.6);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      paintLine(ctx, kLabel, {
        x: W / 2,
        y: seam,
        font: sansFor(Math.max(10, W * 0.018), 700),
        tracking: W * 0.004,
        color: withAlpha(p.goldSoft, Math.max(0.25, motion.kicker)),
        align: "center",
        baseline: "middle",
      });
      ctx.restore();
    }

    const chromeTop = H - planChrome(s, { cta: "outline", align: "center", inset: met.bottom });
    const planTop = seam + H * 0.055;
    const plan = planCopy(s, {
      w: met.colW,
      align: "center",
      headSize: W * 0.105,
      maxHeadLines: 2,
      face: scene_face(s, "cinzel"),
      weight: 600,
      includeKicker: false,
      bodySize: Math.max(11, W * 0.023),
      maxBodyLines: 2,
      maxHeight: chromeTop - planTop - H * 0.015,
      gaps: { body: H * 0.016 },
    });
    paintCopy(s, plan, { x: met.side, y: planTop, align: "center" });
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "center", cta: "outline", inset: met.bottom });
    ctx.restore();
  },
};

/* ============================== 15 · geometric =========================== */

/**
 * Modern Geometric Astrology — an abstract polygon constellation as the hero with
 * the type set inside the geometric field and a zodiac ring to the side.
 * Silhouette: an angular overlay across a deep field with type interlaced by lines.
 */
const geometricAstrology: Composition = {
  key: "geometric-astrology",
  name: "Modern Geometric Astrology",
  structure: "Polygon constellation · zodiac ring · interlaced type",
  note: "Abstract planetary geometry and zodiac symbolism in a modern grid.",
  ground: "geometric-astro",
  usesArt: true,
  focus: { x: 0.62, y: 0.3 },
  bestFor: ["astrology", "navagraha", "transits"],
  paint: (s) => {
    const { ctx, W, H, palette: p, motion } = s;
    const met = metrics(W, H);
    paintGround(ctx, "geometric-astro", W, H, p, { seed: s.seed, focusX: 0.6, focusY: 0.34, detail: s.detail });
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-W / 2, -H / 2);

    const squarePage = H / W <= 1.06;
    const ring = Math.min(W * (squarePage ? 0.3 : 0.34), H * (squarePage ? 0.2 : 0.24));
    art(s, { x: W - met.side - ring + motion.parallaxX * W * 0.28, y: met.top + H * 0.02 + motion.parallaxY * H * 0.28, w: ring, h: ring }, { kind: "zodiac-medallion" });

    // margin tick strip
    ctx.save();
    ctx.globalAlpha *= motion.ground * 0.55;
    ctx.strokeStyle = withAlpha(p.gold, 0.6);
    for (let i = 0; i < 20; i += 1) {
      const y = met.top + (i * (H * 0.42)) / 20;
      const len = i % 5 === 0 ? W * 0.022 : W * 0.012;
      ctx.lineWidth = i % 5 === 0 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(met.side * 0.45, y);
      ctx.lineTo(met.side * 0.45 + len, y);
      ctx.stroke();
    }
    ctx.restore();

    const chromeTop = H - planChrome(s, { cta: "ribbon", align: "left", inset: met.bottom });
    // A square page has no room for a band of type under a full-width ring: the
    // block starts below the artwork instead of under a heading it would cross.
    const planTop = squarePage ? met.top + H * 0.02 + ring + H * 0.05 : H * 0.48;
    const plan = planCopy(s, {
      w: met.colW * (squarePage ? 1 : 0.92),
      align: "left",
      headSize: W * (squarePage ? 0.1 : 0.125),
      maxHeadLines: 3,
      face: scene_face(s, "playfair"),
      weight: 700,
      headLeading: 1.0,
      bodySize: Math.max(12, W * 0.0235),
      maxBodyLines: 2,
      maxHeight: chromeTop - planTop - H * 0.03,
      gaps: { body: H * 0.02 },
    });
    paintCopy(s, plan, { x: met.side, y: planTop });
    ctx.fillStyle = withAlpha(p.gold, 0.8);
    ctx.fillRect(met.side, planTop + plan.height + H * 0.018, W * 0.18, Math.max(1.6, H * 0.0026));
    paintChrome(s, { x: met.side, y: chromeTop, w: met.colW, align: "left", cta: "ribbon", inset: met.bottom });
    lightSweep(s, { x: 0, y: 0, w: W, h: H * 0.5 });
    ctx.restore();
  },
};

export const COMPOSITIONS: Composition[] = [
  heroIllustration,
  luxuryEditorial,
  circularMandala,
  diagonalDynamic,
  luxuryFramed,
  cosmicAstrology,
  typographyDominant,
  educationalInfographic,
  commercialAd,
  illustratedStory,
  collageAsymmetric,
  minimalLuxury,
  festivalCelebration,
  splitPanel,
  geometricAstrology,
];

export const COMPOSITION_MAP: Record<string, Composition> = Object.fromEntries(
  COMPOSITIONS.map((c) => [c.key, c]),
);

export const resolveComposition = (key: string | undefined | null): Composition =>
  (key && COMPOSITION_MAP[key]) || COMPOSITIONS[0];

/** Paint one composition (ground → art → type → chrome). */
export function paintComposition(scene: CompositionContext, composition: Composition) {
  const { ctx, W, H, palette: p } = scene;
  ctx.save();
  // Ground reveal: the field comes up from the deep tone during animation. The
  // base field is always laid down first so no frame is ever transparent, even
  // one captured mid-fade by a video recorder.
  // A fade that starts from an empty sheet reads as a blank first frame in the
  // recorded file, so the opening floor is half-way up, never zero.
  const eased = Math.max(0, Math.min(1, scene.motion.ground));
  const fieldStrength = 0.5 + eased * 0.5;
  if (fieldStrength < 1) {
    const pre = ctx.createLinearGradient(0, 0, 0, H);
    pre.addColorStop(0, p.deep);
    pre.addColorStop(1, p.deepAlt);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * fieldStrength;
    ctx.fillStyle = pre;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fieldStrength;
    composition.paint({ ...scene, motion: { ...scene.motion, ground: 1 } });
    ctx.restore();
  } else {
    composition.paint(scene);
  }

  // The light sweep is a page-level layer, not a composition detail: every
  // preset that asks for one gets it, wherever the painter happens to live.
  if (scene.motion.sweep > 0.001) lightSweep(scene, { x: 0, y: 0, w: W, h: H });
  ctx.restore();
}

/** Draw the design's index + carousel chrome, shared by carousel compositions. */
export function paintCarouselChrome(
  scene: CompositionContext,
  o: { x: number; y: number; w: number; total: number; active: number },
) {
  const { ctx, palette: p } = scene;
  if (!o.total || o.total < 2) return;
  drawDots(ctx, o.x, o.y, o.total, o.active, p.gold, Math.max(4, scene.W * 0.006), "left");
  drawSwipe(ctx, o.x + o.w, o.y, Math.max(9, scene.W * 0.017), withAlpha(p.ink, 0.7), "right");
}
