/**
 * Astrosivam Design System · layout solver
 *
 * The v2 engine failed partly because every block was placed at a hard-coded
 * fraction of the page, so a three-line headline ran into the CTA and a two-line
 * one left a hole. This module replaces those fractions with measurement.
 *
 * A composition now:
 *   1. reserves a chrome band at the foot (`planChrome`), so the CTA, footer and
 *      lockup can never be crossed by body copy;
 *   2. plans its copy stack against the region it actually has (`planCopy`),
 *      shrinking type only when the region genuinely cannot hold it;
 *   3. paints from the plan (`paintCopy`), so what was measured is what is drawn.
 */

import type { CompositionContext } from "./compositions";
import { drawCta, drawFooter, drawLockup, diamondRule } from "./components";
import {
  englishOnly,
  fitDisplay,
  fontFor,
  paintLine,
  sansFor,
  wrapText,
  type DisplayFace,
  type Measured,
} from "./type";
import { withAlpha } from "../lib/canvas";

export type Align = "left" | "center" | "right";

const alignX = (x: number, w: number, align: Align) => (align === "center" ? x + w / 2 : align === "right" ? x + w : x);
const clampAlpha = (v: number) => Math.max(0, Math.min(1, v));

/* --------------------------------- metrics -------------------------------- */

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Frame margins, scale-derived so every format keeps the same proportions. */
export function metrics(W: number, H: number) {
  const ratio = H / W;
  const story = ratio > 1.5;
  const square = ratio <= 1.06;
  const print = W >= 2000;
  const base = W * (square ? 0.075 : 0.078);
  const m = Math.round(base);
  const side = m;
  const top = Math.round(base * (story ? 1.35 : 1));
  const bottom = Math.round(base * (story ? 1.6 : 1.2));
  return {
    W,
    H,
    m,
    side,
    top,
    bottom,
    story,
    square,
    print,
    ratio,
    /** Usable column. */
    colW: W - side * 2,
    /** Reference unit for type ramps: the narrower of width and a print ceiling. */
    unit: Math.min(W, 1200),
  };
}

export type Metrics = ReturnType<typeof metrics>;

export type CtaVariant = "solid" | "outline" | "ghost" | "ribbon" | "underline";

export interface ChromeOptions {
  align?: Align;
  cta?: CtaVariant | "none";
  /** Put the lockup on its own line above the footer instead of beside it. */
  stacked?: boolean;
  rule?: boolean;
  /** Extra bottom padding. */
  inset?: number;
  /** CTA type size. Commercial layouts set this larger. */
  ctaSize?: number;
}

/* --------------------------------- chrome --------------------------------- */

interface ChromeRow {
  kind: "cta" | "logo" | "footer" | "pair";
  height: number;
  gapAfter: number;
}

/**
 * The chrome layout, resolved once. `planChrome` and `paintChrome` both read
 * this, which is why the reserved space and the painted space can never
 * disagree — the bug that let a footer print through a lockup in the first
 * build of this system.
 */
function chromeRows(scene: CompositionContext, options: ChromeOptions): ChromeRow[] {
  const cta = options.cta ?? "solid";
  const ctaSize = options.ctaSize ?? Math.max(12, scene.W * 0.0215);
  const ctaH = cta === "none" ? 0 : cta === "underline" || cta === "ghost" ? ctaSize * 1.9 : ctaSize * 2.9;
  const logo = Math.max(18, scene.W * 0.048);
  const footerSize = chromeFooterSize(scene);
  const footerH = footerSize * 2;
  const gap = scene.W * 0.024;
  const rows: ChromeRow[] = [];
  if (cta !== "none") rows.push({ kind: "cta", height: ctaH, gapAfter: gap });
  if (options.stacked || options.align === "center") {
    if (!footerRepeatsCta(scene)) rows.push({ kind: "footer", height: footerH, gapAfter: scene.showLogo ? gap * 0.5 : 0 });
    if (scene.showLogo) rows.push({ kind: "logo", height: logo, gapAfter: 0 });
  } else {
    rows.push({ kind: "pair", height: Math.max(logo, footerH), gapAfter: 0 });
  }
  return rows;
}

const chromeFooterSize = (scene: CompositionContext) => Math.max(11, scene.W * 0.0215);

/**
 * A contact line that says the same thing as the call to action is not a second
 * line, it is a repeat — printing both makes every card look like a template.
 */
function footerRepeatsCta(scene: CompositionContext): boolean {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const footer = norm(scene.copy.footer || "");
  const cta = norm(scene.copy.cta || "");
  return Boolean(footer) && footer === cta;
}

/** How much vertical room the foot of the design needs. Plan this *first*. */
export function planChrome(scene: CompositionContext, options: ChromeOptions = {}): number {
  const met = metrics(scene.W, scene.H);
  const rows = chromeRows(scene, options);
  const total = rows.reduce((sum, row) => sum + row.height + row.gapAfter, 0);
  return Math.round(total + (options.inset ?? met.bottom));
}

/**
 * Paint the foot of the design at `y`: CTA, then the lockup and the contact line.
 * Returns the bottom edge it reached.
 */
export function paintChrome(scene: CompositionContext, options: ChromeOptions & { x: number; y: number; w: number }): number {
  const align = options.align ?? "left";
  const cta = options.cta ?? "solid";
  const ctaSize = options.ctaSize ?? Math.max(12, scene.W * 0.0215);
  const logo = Math.max(18, scene.W * 0.048);
  const footerSize = chromeFooterSize(scene);
  const met = metrics(scene.W, scene.H);
  const inset = options.inset ?? met.bottom;
  const rows = chromeRows(scene, options);
  // Anchor the block so its *inset* lands on met.bottom, not its last pixel.
  let cursor = options.y;

  rows.forEach((row) => {
    if (row.kind === "cta") {
      drawCta({
        ctx: scene.ctx,
        palette: scene.palette,
        x: alignX(options.x, options.w, align),
        y: cursor,
        label: scene.copy.cta,
        variant: cta === "none" ? "solid" : cta,
        align,
        size: ctaSize,
        face: "inter",
        alpha: scene.motion.cta,
      });
    }
    if (row.kind === "footer") {
      drawFooter({
        ctx: scene.ctx,
        palette: scene.palette,
        x: options.x,
        y: cursor + footerSize,
        width: options.w,
        text: scene.copy.footer || scene.copy.cta,
        align,
        rule: options.rule ?? false,
        size: footerSize,
        alpha: scene.motion.cta,
      });
    }
    if (row.kind === "logo") {
      drawLockup({
        ctx: scene.ctx,
        logo: scene.logo,
        palette: scene.palette,
        x: alignX(options.x, options.w, align),
        y: cursor,
        size: logo,
        align,
        wordmark: true,
        alpha: scene.motion.logo,
      });
    }
    if (row.kind === "pair") {
      // Mark on the aligned edge, contact line on the opposite edge.
      if (scene.showLogo) {
        drawLockup({
          ctx: scene.ctx,
          logo: scene.logo,
          palette: scene.palette,
          x: align === "right" ? options.x + options.w : align === "center" ? options.x + options.w / 2 : options.x,
          y: cursor + (row.height - logo) / 2,
          size: logo,
          align,
          wordmark: false,
          alpha: scene.motion.logo,
        });
      }
      // The contact line always takes the edge the mark does not use.
      const contactAlign: Align = align === "left" ? (scene.showLogo ? "right" : "left") : align === "right" ? (scene.showLogo ? "left" : "right") : "center";
      if (!footerRepeatsCta(scene)) drawFooter({
        ctx: scene.ctx,
        palette: scene.palette,
        x: options.x,
        y: cursor + row.height - footerSize * 0.35,
        width: options.w,
        text: scene.copy.footer || scene.copy.cta,
        align: contactAlign,
        rule: false,
        size: footerSize,
        alpha: scene.motion.cta,
      });
    }
    cursor += row.height + row.gapAfter;
  });
  void inset;
  return cursor;
}

/* ------------------------------- copy stack ------------------------------- */

export interface CopyPlanOptions {
  w: number;
  align: Align;
  /** Reference size for the headline before fitting. */
  headSize: number;
  maxHeadLines?: number;
  face?: DisplayFace;
  weight?: number;
  headLeading?: number;
  headTracking?: number;
  uppercase?: boolean;
  bodySize?: number;
  maxBodyLines?: number;
  bodyLeading?: number;
  includeKicker?: boolean;
  includeBody?: boolean;
  kickerSize?: number;
  /** Vertical rhythm unit; defaults to the width. */
  unit?: number;
  /** Shrink the whole stack (never below the floors) so it fits this height. */
  maxHeight?: number;
  gaps?: { kicker?: number; body?: number };
}

export interface CopyPlan {
  options: CopyPlanOptions;
  kicker: { text: string; size: number; height: number } | null;
  head: Measured;
  headSize: number;
  body: { lines: string[]; size: number; leading: number; height: number } | null;
  gaps: { kicker: number; body: number };
  height: number;
}

/** Measure a copy stack; shrink proportionally only if `maxHeight` demands it. */
export function planCopy(scene: CompositionContext, options: CopyPlanOptions): CopyPlan {
  const { ctx, face } = scene;
  const unit = options.unit ?? options.w;
  const minScale = 0.68;
  const build = (k: number): CopyPlan => {
    const headSize = options.headSize * k;
    const headFace = options.face ?? face;
    const weight = options.weight ?? (headFace === "inter" ? 700 : 600);
    ctx.save();
    const head = fitDisplay(ctx, englishOnly(scene.copy.headline), {
      maxWidth: options.w,
      maxLines: options.maxHeadLines ?? 3,
      startSize: headSize,
      minSize: headSize * 0.55,
      weight,
      face: headFace,
      tracking: options.headTracking ?? 0,
      leading: options.headLeading ?? (headFace === "inter" ? 1.06 : 1.04),
      uppercase: options.uppercase ?? false,
    });
    ctx.restore();
    const kickerText = englishOnly(scene.copy.kicker).toUpperCase();
    const kicker =
      options.includeKicker === false || !kickerText
        ? null
        : { text: kickerText, size: (options.kickerSize ?? Math.max(10, scene.W * 0.0195)) * k, height: (options.kickerSize ?? Math.max(10, scene.W * 0.0195)) * k * 2.2 };
    const bodySize = (options.bodySize ?? Math.max(12, scene.W * 0.0255)) * k;
    const bodyLeading = bodySize * (options.bodyLeading ?? 1.52);
    // The supporting copy yields before the headline does. Work out how many
    // body lines the height budget can actually hold at this scale and take no
    // more: a card whose subline overlaps the call to action is worse than one
    // whose subline runs to a single line.
    let allowedBody = options.maxBodyLines ?? 4;
    if (options.maxHeight) {
      const withoutBody = (() => {
        const kk = options.includeKicker === false || !englishOnly(scene.copy.kicker) ? 0 : (options.kickerSize ?? Math.max(10, scene.W * 0.0195)) * k * 2.2;
        const gapK = options.gaps?.kicker ?? (options.kickerSize ?? scene.W * 0.0195) * 1.1 * k;
        return (kk ? kk + gapK : 0) + head.lines.length * head.leading;
      })();
      const gapBody = options.gaps?.body ?? unit * 0.028;
      const room = options.maxHeight - withoutBody - gapBody;
      allowedBody = Math.max(0, Math.min(allowedBody, Math.floor(room / Math.max(1, bodyLeading))));
    }
    let body: CopyPlan["body"] = null;
    if (options.includeBody !== false && allowedBody > 0 && englishOnly(scene.copy.subline)) {
      ctx.save();
      ctx.font = sansFor(bodySize, 400);
      const lines = wrapText(ctx, englishOnly(scene.copy.subline), options.w).slice(0, allowedBody);
      ctx.restore();
      if (lines.length) body = { lines, size: bodySize, leading: bodyLeading, height: lines.length * bodyLeading };
    }
    const gaps = {
      kicker: options.gaps?.kicker ?? (options.kickerSize ?? scene.W * 0.0195) * 1.1 * k,
      body: options.gaps?.body ?? unit * 0.028,
    };
    const height =
      (kicker ? kicker.height + gaps.kicker : 0) + head.lines.length * head.leading + (body ? gaps.body + body.height : 0);
    return { options, kicker, head, headSize, body, gaps, height };
  };

  let plan = build(1);
  if (options.maxHeight) {
    // The supporting copy is business copy (what the report contains, what the
    // service costs), so a stack that fits only by dropping it is not a fit.
    // Shrink first, and only give up lines once the type is at its floor.
    const wantsBody = options.includeBody !== false && Boolean(englishOnly(scene.copy.subline));
    const targetLines = Math.min(2, options.maxBodyLines ?? 4);
    let k = 1;
    while (
      k > minScale &&
      (plan.height > options.maxHeight || (wantsBody && (plan.body?.lines.length ?? 0) < targetLines))
    ) {
      k = Math.max(minScale, k - 0.03);
      plan = build(k);
    }
  }
  return plan;
}

/** Paint a plan at an anchor. Returns the height consumed. */
export function paintCopy(scene: CompositionContext, plan: CopyPlan, anchor: { x: number; y: number; align?: Align }): number {
  const { ctx, palette: p, motion } = scene;
  const align = anchor.align ?? plan.options.align;
  const width = plan.options.w;
  const face = plan.options.face ?? scene.face;
  const weight = plan.options.weight ?? (face === "inter" ? 700 : 600);
  let cursor = anchor.y;
  const ax = alignX(anchor.x, width, align);

  if (plan.kicker) {
    ctx.save();
    ctx.globalAlpha *= clampAlpha(motion.kicker);
    paintLine(ctx, plan.kicker.text, {
      x: ax,
      y: cursor + plan.kicker.size,
      font: sansFor(plan.kicker.size, 600),
      tracking: plan.kicker.size * 0.22,
      color: withAlpha(p.goldSoft, 0.95),
      align,
    });
    ctx.restore();
    cursor += plan.kicker.height + plan.gaps.kicker;
  }

  const head = plan.head;
  head.lines.forEach((line, i) => {
    const lineReveal = clampAlpha(motion.headline * head.lines.length - i);
    paintLine(ctx, line, {
      x: ax,
      y: cursor + head.size * 0.94 + i * head.leading,
      font: fontFor(face, head.size, weight),
      tracking: ((plan.options.headTracking ?? 0) * head.size) / Math.max(1, plan.headSize),
      color: p.ink,
      align,
      reveal: lineReveal,
    });
  });
  cursor += head.lines.length * head.leading;

  if (plan.body) {
    const opacityPerLine = clampAlpha(motion.sub);
    plan.body.lines.forEach((line, i) => {
      const lineReveal = clampAlpha(motion.sub * plan.body!.lines.length - i);
      ctx.save();
      ctx.globalAlpha *= 1;
      paintLine(ctx, line, {
        x: ax,
        y: cursor + plan.gaps.body + plan.body!.size * 0.95 + i * plan.body!.leading,
        font: sansFor(plan.body!.size, 400),
        color: withAlpha(p.ink, 0.72 * opacityPerLine + 0.28),
        align,
        reveal: lineReveal,
      });
      ctx.restore();
    });
    cursor += plan.gaps.body + plan.body.height;
  }
  return cursor - anchor.y;
}

/** A scrim shaped to the copy region, so type always clears its background. */
export function scrim(
  scene: CompositionContext,
  box: Region & { from?: "bottom" | "top" | "left" | "right"; strength?: number },
) {
  const { ctx, palette: p } = scene;
  const strength = box.strength ?? (p.light ? 0.55 : 0.82);
  const color = p.light ? "#FFFFFF" : p.deep;
  const from = box.from ?? "bottom";
  const spread = from === "bottom" || from === "top" ? box.h * 1.5 : box.w * 1.5;
  let g: CanvasGradient;
  if (from === "bottom") g = ctx.createLinearGradient(0, box.y + box.h - spread, 0, box.y + box.h);
  else if (from === "top") g = ctx.createLinearGradient(0, box.y, 0, box.y + spread);
  else if (from === "left") g = ctx.createLinearGradient(box.x, 0, box.x + spread, 0);
  else g = ctx.createLinearGradient(box.x + box.w, 0, box.x + box.w - spread, 0);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.62, withAlpha(color, strength * 0.6));
  g.addColorStop(1, withAlpha(color, strength));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}
