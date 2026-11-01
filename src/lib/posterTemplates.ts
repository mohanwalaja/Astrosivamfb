/**
 * posterTemplates — the eight poster compositions, redesigned.
 *
 * Art direction notes (the redesign brief, in code):
 *  - Every composition is *graphic*, not photographic: layered gradient fields,
 *    computed kolam/orbit/deco geometry, atmospheric silhouettes and foil light
 *    from `graphicKit`. Devotional paintings keep their dignity inside foil
 *    keylines and halos; nothing is clip-art and nothing is a glass card.
 *  - Every template owns a genuinely different grid, and each ships 2–3
 *    variations that change the composition (art plane, type column, cut line)
 *    rather than recolouring one skeleton.
 *  - Copy is laid out by measure, never by fixed pixels: `copyStack` plans the
 *    block against the space that is actually left after the art plane and the
 *    brand/footer reserves, so long headlines reflow instead of colliding.
 *  - The painter is stage-routed (ground → art → copy → brand). A still export
 *    runs all four stages onto one canvas; the motion engine runs them onto
 *    four layers and animates the composite. Same code, so stills and reels
 *    are the same artwork.
 */
import type { ImageFit, PosterTemplate, ScriptFontKey, StyleKey, Theme } from "../types";
import {
  type Copy,
  type FontSet,
  type Frame,
  type StackOptions,
  type StackPlan,
  accent,
  drawArtFallback,
  drawCta,
  drawImageIn,
  drawIndex,
  drawLogoMark,
  drawMedallionRing,
  drawPageDots,
  drawSwipe,
  fitStack,
  fontsFor,
  frameFor,
  hairline,
  mutedOn,
  paintGrain,
  paintGround,
  paintScrim,
  paintStyledGround,
  planStack,
  paintStack,
  roundRect,
  safeBox,
  styleMotif,
  themeFor,
  toBullets,
  tracked,
  withAlpha,
} from "./posterKit";
import { drawGlobalLockup } from "./brandPlacement";
import { drawMotif, wrapLines } from "./canvas";
import { type GraphicSceneKey, type SceneBox, gradeArt, paintGraphicScene, paintKolamBand } from "./graphicKit";

export interface TemplateInput {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  themeKey: Parameters<typeof themeFor>[0];
  template: PosterTemplate;
  imageFit: ImageFit;
  style: StyleKey;
  copy: Copy;
  img: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  display: (size: number, weight?: number) => string;
  script: ScriptFontKey;
  showLogo: boolean;
  reveal: number;
  /** Ambient time in seconds. Stills settle at 1.6 s; motion frames pass any t. */
  t?: number;
  /** Composition variation index — genuinely different grids, not recolours. */
  variation?: number;
  /** The graphic scene used wherever a template needs designed artwork. */
  artScene?: GraphicSceneKey | "style";
  /** Campaign register, so accents can follow the subject. */
  category?: string | null;
  /**
   * Stage isolation for the motion engine: paint only one depth plane onto the
   * given context. Omitted (or "full") paints the finished poster.
   */
  layer?: "full" | "ground" | "art" | "copy" | "brand";
  /** Filled with the rectangles the motion compositor animates. */
  marks?: Partial<Record<"art" | "copy" | "brand", SceneBox>>;
}

interface Scene {
  ctx: CanvasRenderingContext2D;
  frame: Frame;
  theme: Theme;
  fonts: FontSet;
  face: (size: number, weight?: number) => string;
  copy: Copy;
  img: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  imageFit: ImageFit;
  style: StyleKey;
  reveal: number;
  showLogo: boolean;
  t: number;
  variation: number;
  artScene: GraphicSceneKey | "style";
  category: string | null;
  scriptFirst: boolean;
  seed: number;
  /** Stage routers — a painter declares which depth plane each draw belongs to. */
  ground: (cb: () => void) => void;
  art: (cb: () => void) => void;
  type: (cb: () => void) => void;
  brand: (cb: () => void) => void;
  mark: (name: "art" | "copy" | "brand", box: SceneBox) => void;
}

const goldLine = (theme: Theme, alpha = 0.5) => withAlpha(theme.gold, alpha);

/* ------------------------------ shared pieces ----------------------------- */

/** Soft lamp light — a glow, never a cartoon lamp. */
function lampGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, theme: Theme, t: number, phase = 0) {
  const flicker = 0.82 + 0.18 * Math.sin(t * 2.1 + phase) * Math.sin(t * 3.7 + phase * 2);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha("#FFD9A0", 0.5 * flicker));
  g.addColorStop(0.35, withAlpha(theme.gold, 0.22 * flicker));
  g.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // flame core
  ctx.fillStyle = withAlpha("#FFF3CF", 0.85 * flicker);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.05, r * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The graphic ground: a designed field, dimmed to keep type contrast. */
function graphicGround(scene: Scene, key: GraphicSceneKey | "style", options: { dim?: number; box?: SceneBox; art?: SceneBox | "none" } = {}) {
  const { ctx, frame, theme } = scene;
  if (key === "style") {
    paintStyledGround(ctx, frame, theme, scene.style, {
      angle: "vertical",
      glowX: 0.5,
      glowY: 0.3,
      glow: theme.light ? 0.08 : 0.16,
      art: options.art ?? "none",
    });
    return;
  }
  const box = options.box ?? { x: 0, y: 0, w: frame.W, h: frame.H };
  paintGraphicScene(ctx, box, key, theme, scene.t, scene.seed);
  const dim = options.dim ?? (theme.light ? 0.5 : 0.24);
  if (dim > 0) {
    ctx.save();
    ctx.fillStyle = withAlpha(theme.bgFrom, dim);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
  }
}

/** Artwork plane: the user's image, the chosen graphic scene, or the style motif. */
function artPlane(
  scene: Scene,
  box: SceneBox,
  options: {
    shape?: ImageFit;
    radius?: number;
    inset?: number;
    focusY?: number;
    keyline?: boolean;
    halo?: number;
    sceneKey?: GraphicSceneKey | "style";
    scrim?: number;
    grade?: number;
    /** Clip the art plane to an arbitrary path (diagonal seams, bands). */
    clip?: (ctx: CanvasRenderingContext2D) => void;
  } = {},
) {
  const { ctx, theme } = scene;
  scene.art(() => {
    const key = options.sceneKey ?? scene.artScene;
    ctx.save();
    if (options.clip) {
      ctx.beginPath();
      options.clip(ctx);
      ctx.clip();
    }
    if (scene.img) {
      drawImageIn(ctx, scene.img, box, {
        shape: options.shape ?? "square",
        radius: options.radius ?? 0,
        inset: options.inset ?? (scene.imageFit === "full" ? 0.01 : 0.04),
        focusY: options.focusY ?? 0.34,
        vignette: 0.2,
        grade: theme.bgTo,
        gradeAlpha: 0.1,
      });
      gradeArt(ctx, box, theme, { halo: options.halo ?? 0.35, grade: options.grade ?? 0.14 });
    } else if (key === "style") {
      drawArtFallback(ctx, box, theme, styleMotif(scene.style), 0.8, options.shape === "circle" ? "circle" : options.shape === "arch" ? "arch" : "rect");
    } else {
      ctx.save();
      if (options.shape === "arch" || options.shape === "circle" || options.radius) {
        ctx.beginPath();
        if (options.shape === "circle") ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2);
        else if (options.shape === "arch") {
          const r = box.w / 2;
          ctx.moveTo(box.x, box.y + box.h);
          ctx.lineTo(box.x, box.y + r);
          ctx.arc(box.x + r, box.y + r, r, Math.PI, 0);
          ctx.lineTo(box.x + box.w, box.y + box.h);
          ctx.closePath();
        } else roundRect(ctx, box.x, box.y, box.w, box.h, options.radius ?? 0);
        ctx.clip();
      }
      paintGraphicScene(ctx, box, key, theme, scene.t, scene.seed + 3);
      ctx.restore();
      gradeArt(ctx, box, theme, { halo: options.halo ?? 0.25, grade: options.grade ?? 0.1 });
    }
    if (options.keyline) {
      ctx.save();
      ctx.strokeStyle = goldLine(theme, 0.65);
      ctx.lineWidth = Math.max(1.2, scene.frame.W * 0.0016);
      if (options.shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (options.shape === "arch") {
        const r = box.w / 2;
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + box.h);
        ctx.lineTo(box.x, box.y + r);
        ctx.arc(box.x + r, box.y + r, r, Math.PI, 0);
        ctx.lineTo(box.x + box.w, box.y + box.h);
        ctx.stroke();
      } else {
        ctx.strokeRect(box.x, box.y, box.w, box.h);
      }
      ctx.restore();
    }
    if (options.scrim) {
      paintScrim(ctx, box, { from: "bottom", strength: options.scrim, spread: 1.1, color: theme.bgFrom });
    }
    ctx.restore();
    scene.mark("art", box);
  });
}

interface CopySpec {
  x: number;
  y: number;
  w: number;
  maxH: number;
  align: "left" | "center" | "right";
  headlineSize: number;
  minHeadlineSize: number;
  maxHeadlineLines?: number;
  subMaxLines?: number;
  scriptFirst?: boolean;
  showScript?: boolean;
  kickerMode?: "tracked" | "plain" | "none";
  divider?: boolean;
  ornament?: boolean;
  lineHeight?: number;
  /** Extra bottom reserve inside the copy mark (CTA row). */
  ctaReserve?: number;
  /** Centre the measured block inside this band instead of pinning to `y`. */
  center?: { top: number; bottom: number };
}

/**
 * Measure a copy block against the space actually left, without drawing it.
 * Painters call this once so every plane (copy rows, seals, camera manifest)
 * agrees on the block's real height — measurement is pure `measureText`, so
 * it is identical on every layer context.
 */
function planCopy(scene: Scene, spec: CopySpec): StackPlan {
  const { ctx, theme, fonts } = scene;
  return fitStack(
    ctx,
    {
      x: spec.x,
      w: spec.w,
      align: spec.align,
      theme,
      fonts,
      face: scene.face,
      copy: scene.copy,
      headlineWeight: scene.face === fonts.editorial ? 400 : 700,
      showScript: spec.showScript !== false,
      kickerMode: spec.kickerMode ?? "tracked",
      lineHeight: spec.lineHeight ?? 1.1,
      scriptFirst: spec.scriptFirst ?? scene.scriptFirst,
      divider: spec.divider ?? false,
      ornament: spec.ornament ?? false,
      measure: scene.frame.W,
      maxHeadlineLines: spec.maxHeadlineLines ?? 3,
      subMaxLines: spec.subMaxLines ?? 3,
      headlineSize: spec.headlineSize,
      minHeadlineSize: spec.minHeadlineSize,
    },
    spec.maxH,
    0.58,
  );
}

/**
 * The layout engine's copy pass: paint a pre-measured plan (or measure here
 * when the painter does not need the height elsewhere).
 */
function copyStack(scene: Scene, spec: CopySpec, pre?: StackPlan) {
  const { ctx } = scene;
  scene.type(() => {
    const plan = pre ?? planCopy(scene, spec);
    const y = spec.center
      ? spec.center.top + Math.max(0, (spec.center.bottom - spec.center.top - plan.height) / 2)
      : spec.y;
    paintStack(ctx, plan, y, scene.reveal);
    scene.mark("copy", { x: spec.x, y: spec.y, w: spec.w, h: (spec.center ? spec.center.bottom - spec.center.top : plan.height) + (spec.ctaReserve ?? 0) });
  });
}

function ctaRow(scene: Scene, x: number, y: number, align: "left" | "center" | "right", variant: "pill" | "outline" | "text" = "pill") {
  const { ctx, frame, theme } = scene;
  if (!scene.copy.cta.trim()) return;
  scene.type(() => {
    drawCta(ctx, {
      x,
      y,
      align,
      theme,
      label: scene.copy.cta.trim(),
      variant,
      size: Math.max(12, frame.W * 0.019),
      opacity: scene.reveal,
    });
  });
}

/** Brand signature + footer live on their own plane so motion can land them last. */
function brandPlane(scene: Scene, y: number, options: { right?: string; footer?: string; footerAlign?: "left" | "center" | "right"; footerY?: number } = {}) {
  const { ctx, frame, theme, logo, showLogo } = scene;
  const { m } = frame;
  const size = Math.round(frame.W * 0.042);
  scene.brand(() => {
    if (showLogo) {
      drawGlobalLockup(ctx, logo, {
        W: frame.W,
        H: frame.H,
        theme,
        baseSize: size,
        pad: m,
        topBand: y - size * 0.3,
        bottomBand: frame.H * 0.06,
      });
    }
    if (options.right) {
      ctx.save();
      ctx.font = scene.fonts.sans(Math.round(frame.W * 0.017), 600);
      ctx.fillStyle = withAlpha(theme.ink, 0.7);
      tracked(ctx, options.right.toUpperCase(), frame.W - m, y + size / 2, frame.W * 0.0032, "right");
      ctx.restore();
    }
    const foot = options.footer ?? scene.copy.footer;
    if (foot.trim()) {
      ctx.save();
      ctx.font = scene.fonts.sans(Math.max(11, Math.round(frame.W * 0.016)), 500);
      ctx.fillStyle = withAlpha(theme.ink, 0.74);
      ctx.textBaseline = "alphabetic";
      const align = options.footerAlign ?? "left";
      ctx.textAlign = align;
      ctx.fillText(foot.trim(), align === "center" ? frame.W / 2 : align === "right" ? frame.W - m : m, options.footerY ?? frame.H - frame.safeBottom - m * 0.5);
      ctx.restore();
    }
    scene.mark("brand", { x: m * 0.6, y: Math.max(0, y - size * 0.2), w: frame.W - m * 1.2, h: size * 1.5 });
  });
}

/** A quiet kolam footing band — computed geometry at low alpha, not clip-art. */
function kolamBand(scene: Scene, box: SceneBox, alpha = 0.5) {
  const { ctx, theme } = scene;
  scene.ground(() => {
    ctx.save();
    ctx.globalAlpha = alpha;
    paintKolamBand(ctx, box, theme, scene.t, scene.seed + 11);
    ctx.restore();
  });
}

/* ============================ 1 · luxury editorial ========================= */

function gallery(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  let v = scene.variation % 3;
  if (v === 0 && frame.story) v = 2;

  if (v === 2) {
    // Plate above, type below — the magazine cover grid.
    const artH = H * 0.54;
    scene.ground(() => {
      paintGround(ctx, frame, theme, { angle: "vertical", glowX: 0.5, glowY: 0.9, glow: theme.light ? 0.06 : 0.1 });
      paintGrain(ctx, W, H, 21, theme.light ? 0.03 : 0.045);
    });
    artPlane(scene, { x: 0, y: 0, w: W, h: artH }, { inset: 0.02, focusY: 0.4, scrim: theme.light ? 0.35 : 0.55, halo: 0 });
    brandPlane(scene, frame.safeTop + m * 0.2, { right: scene.copy.kicker || undefined });
    const top = artH + H * 0.045;
    const ctaH = scene.copy.cta.trim() ? H * 0.062 : 0;
    const bottom = H - frame.safeBottom - H * 0.075 - ctaH;
    copyStack(scene, {
      x: m,
      y: top,
      w: W - m * 2,
      maxH: bottom - top,
      align: "left",
      headlineSize: W * 0.082,
      minHeadlineSize: W * 0.04,
      maxHeadlineLines: 3,
      subMaxLines: 3,
      divider: true,
      ctaReserve: ctaH,
    });
    ctaRow(scene, m, bottom + H * 0.018, "left", "text");
    return;
  }

  const flip = v === 1;
  const colW = W * 0.44;
  const typeX = flip ? W - colW : 0;
  const artX = flip ? 0 : colW;
  scene.ground(() => {
    paintGround(ctx, frame, theme, { angle: "horizontal", glowX: flip ? 0.8 : 0.2, glowY: 0.25, glow: theme.light ? 0.05 : 0.1 });
    paintGrain(ctx, W, H, 23, theme.light ? 0.03 : 0.045);
    // the column rule — the editorial spine
    ctx.save();
    ctx.strokeStyle = goldLine(theme, 0.4);
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.beginPath();
    ctx.moveTo(artX, 0);
    ctx.lineTo(artX, H);
    ctx.stroke();
    ctx.restore();
  });
  const key = m * 0.42;
  artPlane(scene, { x: artX + (flip ? 0 : key), y: 0, w: (flip ? colW : W - colW) - key, h: H }, { inset: 0.02, focusY: 0.38, halo: 0 });
  scene.ground(() => {
    // foil keyline inset on the plate
    ctx.save();
    ctx.strokeStyle = goldLine(theme, 0.55);
    ctx.lineWidth = Math.max(1, W * 0.0014);
    ctx.strokeRect(artX + (flip ? key : key * 2), key, (flip ? colW : W - colW) - key * 3, H - key * 2);
    ctx.restore();
  });

  const pad = m * 0.9;
  const tx = typeX + (flip ? pad * 0.6 : pad);
  const tw = colW - pad * 1.6;
  brandPlane(scene, frame.safeTop + m * 0.15, {});
  const top = frame.safeTop + H * 0.13;
  const ctaH = scene.copy.cta.trim() ? H * 0.06 : 0;
  const bottom = H - frame.safeBottom - H * 0.09 - ctaH;
  copyStack(scene, {
    x: tx,
    y: top,
    w: tw,
    maxH: bottom - top,
    align: "left",
    headlineSize: W * 0.056,
    minHeadlineSize: W * 0.03,
    maxHeadlineLines: 4,
    subMaxLines: 4,
    divider: true,
    ctaReserve: ctaH,
  });
  ctaRow(scene, tx, bottom + H * 0.016, "left", "text");
}

/* ========================= 2 · south indian heritage ====================== */

function mandapam(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const v = scene.variation % 2;

  scene.ground(() => {
    graphicGround(scene, "silk", { dim: theme.light ? 0.5 : 0.26 });
    paintGrain(ctx, W, H, 17, theme.light ? 0.03 : 0.05);
  });

  if (v === 0) {
    const archW = W * 0.62;
    const archX = (W - archW) / 2;
    const archY = frame.safeTop + H * 0.075;
    const archH = H * (frame.story ? 0.34 : 0.36);
    brandPlane(scene, frame.safeTop + m * 0.1, { footer: "" });
    artPlane(scene, { x: archX, y: archY, w: archW, h: archH }, { shape: "arch", inset: 0.03, focusY: 0.32, keyline: true, halo: 0.4 });
    scene.ground(() => {
      // outer moulding, one hairline — restraint over ornament
      ctx.save();
      ctx.strokeStyle = goldLine(theme, 0.35);
      ctx.lineWidth = Math.max(1, W * 0.0012);
      const o = W * 0.02;
      ctx.beginPath();
      const r = archW / 2 + o;
      ctx.moveTo(archX - o, archY + archH);
      ctx.lineTo(archX - o, archY + r);
      ctx.arc(archX + archW / 2, archY + r, r, Math.PI, 0);
      ctx.lineTo(archX + archW + o, archY + archH);
      ctx.stroke();
      ctx.restore();
    });
    const copyTop = archY + archH + H * 0.045;
    const bandH = H * 0.085;
    const ctaH = scene.copy.cta.trim() ? H * 0.065 : 0;
    const copyBottom = H - frame.safeBottom - bandH - H * 0.045 - ctaH;
    const mandapamSpec: CopySpec = {
      x: m,
      y: copyTop,
      w: W - m * 2,
      maxH: copyBottom - copyTop,
      align: "center",
      headlineSize: W * 0.072,
      minHeadlineSize: W * 0.036,
      maxHeadlineLines: 3,
      subMaxLines: 2,
      scriptFirst: true,
      kickerMode: "tracked",
      ctaReserve: ctaH,
      center: { top: copyTop, bottom: copyBottom },
    };
    copyStack(scene, mandapamSpec, planCopy(scene, mandapamSpec));
    ctaRow(scene, W / 2, copyBottom + H * 0.014, "center", "outline");
    kolamBand(scene, { x: W * 0.14, y: H - frame.safeBottom - bandH, w: W * 0.72, h: bandH }, 0.55);
    scene.ground(() => {
      lampGlow(ctx, W * 0.08, H - frame.safeBottom - bandH * 0.5, W * 0.13, theme, scene.t, 0);
      lampGlow(ctx, W * 0.92, H - frame.safeBottom - bandH * 0.5, W * 0.13, theme, scene.t, 2.2);
    });
    brandPlane(scene, frame.safeTop + m * 0.1, { footerAlign: "center", footerY: H - frame.safeBottom - bandH - m * 0.3 });
    return;
  }

  // v1 — arch to the right, Tamil-first type column to the left.
  const archW = W * 0.46;
  const archX = W - m * 0.7 - archW;
  const archY = frame.safeTop + H * 0.1;
  const archH = H * (frame.story ? 0.4 : 0.44);
  brandPlane(scene, frame.safeTop + m * 0.1, {});
  artPlane(scene, { x: archX, y: archY, w: archW, h: archH }, { shape: "arch", inset: 0.03, focusY: 0.32, keyline: true, halo: 0.35 });
  const colW = archX - m - W * 0.05;
  const copyTop = archY + H * 0.02;
  const ctaH = scene.copy.cta.trim() ? H * 0.062 : 0;
  const copyBottom = archY + archH + H * 0.06;
  copyStack(scene, {
    x: m,
    y: copyTop,
    w: colW,
    maxH: copyBottom - copyTop,
    align: "left",
    headlineSize: W * 0.058,
    minHeadlineSize: W * 0.03,
    maxHeadlineLines: 5,
    subMaxLines: 3,
    scriptFirst: true,
    ctaReserve: ctaH,
  });
  ctaRow(scene, m, copyBottom + H * 0.012, "left", "outline");
  const bandH = H * 0.08;
  kolamBand(scene, { x: m, y: H - frame.safeBottom - bandH - H * 0.02, w: W - m * 2, h: bandH }, 0.5);
  scene.ground(() => {
    lampGlow(ctx, W / 2, H - frame.safeBottom - bandH * 0.5 - H * 0.02, W * 0.08, theme, scene.t, 1.1);
  });
}

/* ========================== 3 · minimal typography ======================== */

function manifesto(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const v = scene.variation % 3;
  const mark = (scene.copy.tamil || scene.copy.hindi || scene.copy.kicker || "ஜாதகம்").trim();

  scene.ground(() => {
    paintGround(ctx, frame, theme, { angle: "diagonal", glowX: v === 1 ? 0.5 : 0.82, glowY: 0.12, glow: theme.light ? 0.05 : 0.1 });
    paintGrain(ctx, W, H, 29, theme.light ? 0.035 : 0.05);
    if (mark) {
      ctx.save();
      ctx.globalAlpha = theme.light ? 0.06 : 0.08;
      ctx.fillStyle = theme.gold;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const isIndic = /[ऀ-ॿ஀-௿]/.test(mark);
      let size = W * 0.4;
      ctx.font = isIndic ? scene.fonts.script(size) : scene.face(size, 700);
      while (ctx.measureText(mark).width > W * 1.4 && size > W * 0.12) {
        size *= 0.92;
        ctx.font = isIndic ? scene.fonts.script(size) : scene.face(size, 700);
      }
      const gx = v === 2 ? W * 0.72 : W / 2;
      const gy = v === 2 ? H * 0.24 : H * 0.46;
      ctx.fillText(mark, gx, gy);
      ctx.restore();
    }
  });

  brandPlane(scene, frame.safeTop + m * 0.1, {});

  if (v === 1) {
    const top = frame.safeTop + H * 0.16;
    const ctaH = scene.copy.cta.trim() ? H * 0.06 : 0;
    const bottom = H - frame.safeBottom - H * 0.1 - ctaH;
    const maniSpec: CopySpec = {
      x: m,
      y: top,
      w: W - m * 2,
      maxH: bottom - top,
      align: "center",
      headlineSize: W * 0.105,
      minHeadlineSize: W * 0.05,
      maxHeadlineLines: 5,
      subMaxLines: 3,
      ornament: true,
      kickerMode: "tracked",
      lineHeight: 1.04,
      ctaReserve: ctaH,
      center: { top, bottom },
    };
    copyStack(scene, maniSpec, planCopy(scene, maniSpec));
    ctaRow(scene, W / 2, bottom + H * 0.016, "center", "text");
    return;
  }

  if (v === 2) {
    // bottom-weighted statement with a rule above — poster-as-billboard
    const ruleY = H * 0.42;
    scene.ground(() => {
      ctx.save();
      ctx.strokeStyle = goldLine(theme, 0.55);
      ctx.lineWidth = Math.max(1.5, W * 0.003);
      ctx.beginPath();
      ctx.moveTo(m, ruleY);
      ctx.lineTo(m + W * 0.2, ruleY);
      ctx.stroke();
      ctx.restore();
    });
    const top = ruleY + H * 0.05;
    const ctaH = scene.copy.cta.trim() ? H * 0.06 : 0;
    const bottom = H - frame.safeBottom - H * 0.1 - ctaH;
    copyStack(scene, {
      x: m,
      y: top,
      w: W - m * 2,
      maxH: bottom - top,
      align: "left",
      headlineSize: W * 0.118,
      minHeadlineSize: W * 0.055,
      maxHeadlineLines: 4,
      subMaxLines: 2,
      kickerMode: "tracked",
      lineHeight: 1.0,
      ctaReserve: ctaH,
    });
    ctaRow(scene, m, bottom + H * 0.016, "left", "text");
    return;
  }

  // v0 — left rail manifesto
  const railX = m * 0.72;
  const railTop = frame.safeTop + H * 0.14;
  const railBottom = H - frame.safeBottom - H * 0.1;
  scene.ground(() => {
    ctx.save();
    ctx.strokeStyle = goldLine(theme, 0.5);
    ctx.lineWidth = Math.max(1, W * 0.0014);
    ctx.beginPath();
    ctx.moveTo(railX, railTop);
    ctx.lineTo(railX, railBottom);
    ctx.stroke();
    ctx.font = scene.fonts.sans(Math.max(9, W * 0.014), 600);
    ctx.fillStyle = withAlpha(theme.ink, 0.55);
    ctx.textBaseline = "top";
    ctx.translate(railX - W * 0.014, railTop);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "right";
    tracked(ctx, (scene.copy.kicker || "ASTRO SIVAM").toUpperCase(), 0, 0, W * 0.003, "right");
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = theme.gold;
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.beginPath();
    ctx.moveTo(m * 1.05, railTop + H * 0.02);
    ctx.lineTo(m * 1.05 + W * 0.075, railTop + H * 0.02);
    ctx.stroke();
    ctx.restore();
  });
  const colX = m * 1.05;
  const colW = W - colX - m * 0.9;
  const top = railTop + H * 0.06;
  const ctaH = scene.copy.cta.trim() ? H * 0.06 : 0;
  const bottom = railBottom - H * 0.02 - ctaH;
  copyStack(scene, {
    x: colX,
    y: top,
    w: colW,
    maxH: bottom - top,
    align: "left",
    headlineSize: W * 0.112,
    minHeadlineSize: W * 0.052,
    maxHeadlineLines: frame.story ? 7 : 6,
    subMaxLines: 3,
    kickerMode: "none",
    divider: true,
    lineHeight: 1.0,
    ctaReserve: ctaH,
  });
  ctaRow(scene, W - m * 0.9, bottom + H * 0.014, "right", "text");
}

/* ========================== 4 · cinematic astrology ======================= */

function nocturne(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const v = scene.variation % 2;
  const page = { x: 0, y: 0, w: W, h: H };

  scene.ground(() => {
    paintGround(ctx, frame, theme, { angle: "vertical", glowX: 0.5, glowY: 0.35, glow: theme.light ? 0.06 : 0.12 });
    paintGrain(ctx, W, H, 31, 0.04);
  });
  // art plane: the photograph, or the cosmic field when there is none
  const cosmos: GraphicSceneKey =
    scene.artScene === "orbit" || scene.artScene === "chart" || scene.artScene === "cosmic" ? scene.artScene : "cosmic";
  artPlane(scene, page, { inset: 0, focusY: 0.32, halo: 0, scrim: 0, grade: theme.light ? 0.12 : 0.3, sceneKey: cosmos });
  // letterbox scrims ride the art plane — cinematic, and they carry the type
  scene.art(() => {
    if (v === 0) {
      paintScrim(ctx, { x: 0, y: H * 0.34, w: W, h: H * 0.66 }, { from: "bottom", strength: theme.light ? 0.72 : 0.96, spread: 1.5, color: theme.bgFrom });
      paintScrim(ctx, { x: 0, y: 0, w: W, h: H * 0.22 }, { from: "top", strength: 0.65, spread: 1, color: theme.bgFrom });
    } else {
      paintScrim(ctx, { x: 0, y: H * 0.28, w: W, h: H * 0.46 }, { from: "bottom", strength: theme.light ? 0.65 : 0.88, spread: 1.1, color: theme.bgFrom });
      paintScrim(ctx, { x: 0, y: H * 0.28, w: W, h: H * 0.46 }, { from: "top", strength: theme.light ? 0.6 : 0.82, spread: 1.1, color: theme.bgFrom });
    }
  });
  scene.ground(() => {
    // hairline frame
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.light ? theme.ink : "#FFFFFF", 0.28);
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.strokeRect(m * 0.5, frame.safeTop + m * 0.1, W - m, H - frame.safeTop - frame.safeBottom - m * 0.2);
    ctx.restore();
  });

  brandPlane(scene, frame.safeTop + m * 0.32, { right: scene.copy.kicker || undefined });

  if (v === 0) {
    const ctaH = scene.copy.cta.trim() ? H * 0.062 : 0;
    const footH = H * 0.055;
    const bottom = H - frame.safeBottom - footH - ctaH;
    const top = bottom - H * (frame.story ? 0.3 : 0.34);
    // readability scrim seated exactly under the copy block
    scene.art(() => {
      const g = ctx.createLinearGradient(0, top - H * 0.12, 0, top + H * 0.05);
      g.addColorStop(0, withAlpha(theme.bgFrom, 0));
      g.addColorStop(1, withAlpha(theme.bgFrom, theme.light ? 0.78 : 0.9));
      ctx.fillStyle = g;
      ctx.fillRect(0, top - H * 0.12, W, H * 0.17);
      ctx.fillStyle = withAlpha(theme.bgFrom, theme.light ? 0.78 : 0.9);
      ctx.fillRect(0, top + H * 0.05, W, H - top - H * 0.05);
    });
    const headSpec: CopySpec = {
      x: m,
      y: top,
      w: W - m * 2,
      maxH: bottom - top,
      align: "left",
      headlineSize: W * 0.078,
      minHeadlineSize: W * 0.038,
      maxHeadlineLines: 3,
      subMaxLines: 2,
      kickerMode: "none",
      ctaReserve: ctaH,
    };
    const plan = planCopy(scene, headSpec);
    copyStack(scene, headSpec, plan);
    ctaRow(scene, m, top + plan.height + H * 0.018, "left", "pill");
  } else {
    const bandTop = H * 0.34;
    const ctaH = scene.copy.cta.trim() ? H * 0.062 : 0;
    const bottom = bandTop + H * 0.36 - ctaH;
    const headSpec: CopySpec = {
      x: m,
      y: bandTop,
      w: W - m * 2,
      maxH: bottom - bandTop,
      align: "center",
      headlineSize: W * 0.07,
      minHeadlineSize: W * 0.036,
      maxHeadlineLines: 3,
      subMaxLines: 2,
      kickerMode: "tracked",
      ctaReserve: ctaH,
    };
    const plan = planCopy(scene, headSpec);
    copyStack(scene, headSpec, plan);
    ctaRow(scene, W / 2, bandTop + plan.height + H * 0.018, "center", "pill");
  }
  // ephemeris accent, lower right — a fragment of orbit ring work
  scene.ground(() => {
    ctx.save();
    ctx.strokeStyle = goldLine(theme, 0.4);
    ctx.lineWidth = Math.max(1, W * 0.0012);
    const cx = W - m * 0.4;
    const cy = H - frame.safeBottom - m * 0.4;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, W * 0.028 * i, Math.PI * 0.72, Math.PI * 1.28);
      ctx.stroke();
    }
    const a = Math.PI * 1.0 + Math.sin(scene.t * 0.4) * 0.2;
    ctx.fillStyle = withAlpha(theme.goldSoft, 0.9);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * W * 0.056, cy + Math.sin(a) * W * 0.056, Math.max(1.6, W * 0.004), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/* =========================== 5 · educational graphic ====================== */

function lesson(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const v = scene.variation % 2;
  const bullets = toBullets(scene.copy.subline, 3);

  scene.ground(() => {
    paintGround(ctx, frame, theme, { angle: "vertical", glowX: 0.85, glowY: 0.12, glow: theme.light ? 0.06 : 0.12 });
    paintGrain(ctx, W, H, 37, theme.light ? 0.03 : 0.045);
  });
  brandPlane(scene, frame.safeTop + m * 0.1, { right: scene.copy.cta || undefined });

  const headY = frame.safeTop + H * 0.1;
  // series header: numeral + rule
  scene.type(() => {
    drawIndex(ctx, "01", m, headY, W * 0.085, theme, "left", W * 0.2);
    ctx.save();
    ctx.font = scene.fonts.sans(Math.max(10, W * 0.016), 600);
    ctx.fillStyle = withAlpha(theme.ink, 0.62);
    tracked(ctx, (scene.copy.kicker || "THE ASTRO SIVAM GUIDE").toUpperCase(), m + W * 0.13, headY + W * 0.012, W * 0.0032, "left");
    ctx.restore();
  });
  scene.ground(() => {
    hairline(ctx, m + W * 0.13, headY + W * 0.045, W - m - W * 0.2, goldLine(theme, 0.35), Math.max(1, W * 0.0012));
  });

  const tileR = W * (frame.story ? 0.16 : 0.14);
  const rowTop = headY + H * 0.095;
  let planHeight: () => number = () => H * 0.18;
  if (v === 0) {
    const tile = { x: W - m - tileR * 2, y: rowTop, w: tileR * 2, h: tileR * 2 };
    artPlane(scene, tile, { shape: "circle", inset: 0.06, focusY: 0.34, keyline: true, halo: 0.3, sceneKey: scene.img ? scene.artScene : "chart" });
    const colW = tile.x - m - W * 0.05;
    const headSpec: CopySpec = {
      x: m,
      y: rowTop,
      w: colW,
      maxH: tileR * 2 + H * 0.05,
      align: "left",
      headlineSize: W * 0.058,
      minHeadlineSize: W * 0.032,
      maxHeadlineLines: 4,
      subMaxLines: 0,
      showScript: true,
      kickerMode: "none",
      ctaReserve: H * 0.42,
    };
    const plan = planCopy(scene, headSpec);
    copyStack(scene, headSpec, plan);
    planHeight = () => Math.max(plan.height, tileR * 2);
  } else {
    const tile = { x: W - m - tileR * 1.7, y: rowTop - H * 0.01, w: tileR * 1.7, h: tileR * 1.7 };
    artPlane(scene, tile, { shape: "circle", inset: 0.06, focusY: 0.34, keyline: true, halo: 0.3, sceneKey: scene.img ? scene.artScene : "orbit" });
    const headSpec: CopySpec = {
      x: m,
      y: rowTop,
      w: tile.x - m - W * 0.05,
      maxH: H * 0.2,
      align: "left",
      headlineSize: W * 0.062,
      minHeadlineSize: W * 0.034,
      maxHeadlineLines: 3,
      subMaxLines: 0,
      showScript: true,
      kickerMode: "none",
      ctaReserve: H * 0.42,
    };
    const plan = planCopy(scene, headSpec);
    copyStack(scene, headSpec, plan);
    planHeight = () => plan.height;
  }

  // numbered editorial rows — hairline separated, never UI cards
  const railY = H - frame.safeBottom - H * 0.075;
  scene.type(() => {
    const rowsTop = rowTop + planHeight() + H * 0.045;
    const avail = railY - H * 0.03 - rowsTop;
    const rowH = Math.min(H * 0.11, avail / Math.max(1, bullets.length));
    const size = Math.max(11, Math.min(W * 0.024, rowH * 0.3));
    ctx.save();
    ctx.globalAlpha = scene.reveal;
    bullets.forEach((line, i) => {
      const y = rowsTop + i * rowH;
      const numR = size * 1.15;
      ctx.strokeStyle = goldLine(theme, 0.7);
      ctx.lineWidth = Math.max(1, W * 0.0012);
      ctx.beginPath();
      ctx.arc(m + numR, y + rowH * 0.42, numR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = theme.gold;
      ctx.font = scene.face(size * 0.95, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${i + 1}`, m + numR, y + rowH * 0.42 + size * 0.05);
      ctx.fillStyle = withAlpha(theme.ink, 0.92);
      ctx.font = scene.fonts.sans(size, 500);
      ctx.textAlign = "left";
      const textX = m + numR * 2 + W * 0.03;
      const lines = wrapLines(ctx, line, W - textX - m).slice(0, 2);
      const lead = size * 1.35;
      const startY = y + rowH * 0.42 - ((lines.length - 1) * lead) / 2;
      lines.forEach((l, j) => ctx.fillText(l, textX, startY + j * lead));
      ctx.strokeStyle = goldLine(theme, 0.25);
      ctx.lineWidth = Math.max(1, W * 0.0009);
      ctx.beginPath();
      ctx.moveTo(m, y + rowH * 0.88);
      ctx.lineTo(W - m, y + rowH * 0.88);
      ctx.stroke();
    });
    ctx.restore();
  });
  scene.ground(() => {
    const segW = (W - m * 2 - W * 0.02) / 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i === 0 ? theme.gold : withAlpha(theme.ink, 0.18);
      roundRect(ctx, m + i * (segW + W * 0.01), railY, segW, Math.max(2, H * 0.004), H * 0.002);
      ctx.fill();
    }
  });
  scene.brand(() => {
    ctx.save();
    ctx.font = scene.fonts.sans(Math.max(9, W * 0.014), 600);
    ctx.fillStyle = withAlpha(theme.ink, 0.6);
    ctx.textAlign = "right";
    tracked(ctx, "1 / 3", W - m, H - frame.safeBottom - m * 0.42, W * 0.003, "right");
    ctx.restore();
  });
}

/* =========================== 6 · service advertisement ==================== */

function offer(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const v = scene.variation % 2;
  const chips = toBullets(scene.copy.subline, 3);

  if (v === 0) {
    const artH = H * (frame.story ? 0.4 : chips.length >= 3 ? 0.42 : 0.46);
    scene.ground(() => {
      paintGround(ctx, frame, theme, { angle: "vertical", glowX: 0.5, glowY: 0.2, glow: theme.light ? 0.06 : 0.12 });
      paintGrain(ctx, W, H, 43, theme.light ? 0.03 : 0.045);
    });
    artPlane(scene, { x: 0, y: 0, w: W, h: artH }, { inset: 0.02, focusY: 0.36, scrim: theme.light ? 0.5 : 0.75, halo: 0, sceneKey: scene.img ? scene.artScene : "deco" });
    // campaign kicker chip on the art, top-right — the lockup keeps the left
    scene.type(() => {
      const label = (scene.copy.kicker || "BOOKING OPEN").toUpperCase();
      ctx.save();
      ctx.font = scene.fonts.sans(Math.max(10, W * 0.017), 700);
      const tw = ctx.measureText(label).width + W * 0.05;
      const ch = W * 0.045;
      const cx = W - m - tw;
      ctx.fillStyle = withAlpha(theme.bgFrom, 0.72);
      roundRect(ctx, cx, frame.safeTop + m * 0.2, tw, ch, ch / 2);
      ctx.fill();
      ctx.strokeStyle = goldLine(theme, 0.7);
      ctx.lineWidth = Math.max(1, W * 0.0012);
      roundRect(ctx, cx, frame.safeTop + m * 0.2, tw, ch, ch / 2);
      ctx.stroke();
      ctx.fillStyle = theme.goldSoft;
      ctx.textBaseline = "middle";
      tracked(ctx, label, cx + W * 0.025, frame.safeTop + m * 0.2 + ch / 2, W * 0.0035, "left");
      ctx.restore();
    });
    brandPlane(scene, frame.safeTop + m * 0.2, {});

    const top = artH + H * 0.035;
    const footH = H * 0.05;
    const ctaH = H * 0.062;
    const rowsH = chips.length ? chips.length * H * 0.048 + H * 0.01 : 0;
    const bottom = H - frame.safeBottom - footH - ctaH - rowsH;
    const headSpec: CopySpec = {
      x: m,
      y: top,
      w: W - m * 2,
      maxH: bottom - top,
      align: "left",
      headlineSize: W * 0.07,
      minHeadlineSize: W * 0.036,
      maxHeadlineLines: 3,
      subMaxLines: 0,
      showScript: true,
      kickerMode: "none",
      ctaReserve: rowsH + ctaH + H * 0.05,
    };
    const plan = planCopy(scene, headSpec);
    copyStack(scene, headSpec, plan);
    // benefit rows flow from the copy's measured height — no dead air
    const rowsTop = top + plan.height + H * 0.006;
    // benefit checklist rows with foil ticks
    scene.type(() => {
      ctx.save();
      ctx.globalAlpha = scene.reveal;
      const rowH = H * 0.048;
      const size = Math.max(11, W * 0.021);
      chips.forEach((line, i) => {
        const y = rowsTop + i * rowH;
        ctx.strokeStyle = accent(theme);
        ctx.lineWidth = Math.max(1.6, W * 0.0022);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m, y + rowH * 0.5);
        ctx.lineTo(m + size * 0.5, y + rowH * 0.5 + size * 0.42);
        ctx.lineTo(m + size * 1.1, y + rowH * 0.5 - size * 0.42);
        ctx.stroke();
        ctx.fillStyle = withAlpha(theme.ink, 0.9);
        ctx.font = scene.fonts.sans(size, 500);
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(line, m + size * 1.7, y + rowH * 0.5);
      });
      ctx.restore();
    });
    const ctaY = Math.min(rowsTop + rowsH + H * 0.01, H - frame.safeBottom - footH - ctaH);
    ctaRow(scene, m, ctaY, "left", "pill");
    // foil seal, right of the CTA — the trust signature
    scene.brand(() => {
      if (!scene.logo) return;
      const r = W * 0.045;
      const sx = W - m - r;
      const sy = ctaY + H * 0.018;
      ctx.save();
      ctx.strokeStyle = goldLine(theme, 0.8);
      ctx.lineWidth = Math.max(1.4, W * 0.0018);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      drawLogoMark(ctx, scene.logo, { x: sx, y: sy - r * 0.52, size: r * 1.04, theme, variant: "bare", align: "center" });
      ctx.restore();
    });
    scene.ground(() => {
      hairline(ctx, m, H - frame.safeBottom - footH * 1.5, W - m, goldLine(theme, 0.3), Math.max(1, W * 0.0012));
    });
    return;
  }

  // v1 — art column right, selling column left
  const colW = W * 0.4;
  scene.ground(() => {
    paintGround(ctx, frame, theme, { angle: "horizontal", glowX: 0.25, glowY: 0.5, glow: theme.light ? 0.06 : 0.12 });
    paintGrain(ctx, W, H, 43, theme.light ? 0.03 : 0.045);
  });
  artPlane(scene, { x: W - colW, y: 0, w: colW, h: H }, { inset: 0.02, focusY: 0.35, halo: 0, sceneKey: scene.img ? scene.artScene : "deco" });
  scene.ground(() => {
    ctx.save();
    ctx.strokeStyle = goldLine(theme, 0.6);
    ctx.lineWidth = Math.max(1.2, W * 0.0016);
    ctx.beginPath();
    ctx.moveTo(W - colW, 0);
    ctx.lineTo(W - colW, H);
    ctx.stroke();
    ctx.restore();
  });
  brandPlane(scene, frame.safeTop + m * 0.15, {});
  const tw = W - colW - m * 2.2;
  const top = frame.safeTop + H * 0.12;
  const footH = H * 0.06;
  const ctaH = H * 0.07;
  const rowsH = chips.length ? chips.length * H * 0.055 : 0;
  const bottom = H - frame.safeBottom - footH - ctaH - rowsH;
  const headSpec: CopySpec = {
    x: m,
    y: top,
    w: tw,
    maxH: bottom - top,
    align: "left",
    headlineSize: W * 0.056,
    minHeadlineSize: W * 0.03,
    maxHeadlineLines: 5,
    subMaxLines: 2,
    kickerMode: "tracked",
    ctaReserve: rowsH + ctaH + H * 0.05,
  };
  const plan = planCopy(scene, headSpec);
  copyStack(scene, headSpec, plan);
  const rowsTop = top + plan.height + H * 0.03;
  scene.type(() => {
    ctx.save();
    ctx.globalAlpha = scene.reveal;
    const rowH = H * 0.055;
    const size = Math.max(11, W * 0.019);
    chips.forEach((line, i) => {
      const y = rowsTop + i * rowH;
      ctx.fillStyle = theme.gold;
      ctx.beginPath();
      ctx.moveTo(m, y + rowH * 0.5);
      ctx.lineTo(m + size * 0.5, y + rowH * 0.5 + size * 0.4);
      ctx.lineTo(m + size * 1.05, y + rowH * 0.5 - size * 0.4);
      ctx.strokeStyle = accent(theme);
      ctx.lineWidth = Math.max(1.4, W * 0.002);
      ctx.stroke();
      ctx.fillStyle = withAlpha(theme.ink, 0.9);
      ctx.font = scene.fonts.sans(size, 500);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const lines = wrapLines(ctx, line, tw - size * 1.6).slice(0, 2);
      lines.forEach((l, j) => ctx.fillText(l, m + size * 1.6, y + rowH * 0.32 + j * size * 1.3));
    });
    ctx.restore();
  });
  ctaRow(scene, m, Math.min(rowsTop + rowsH + H * 0.02, H - frame.safeBottom - footH - ctaH), "left", "pill");
}

/* ============================ 7 · festival greeting ======================= */

function blessing(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const v = scene.variation % 2;

  scene.ground(() => {
    graphicGround(scene, v === 0 ? "aura" : "silk", { dim: theme.light ? 0.55 : 0.3 });
    paintGrain(ctx, W, H, 47, theme.light ? 0.03 : 0.05);
  });
  brandPlane(scene, frame.safeTop + m * 0.1, { footer: "" });

  if (v === 0) {
    const radius = W * (frame.story ? 0.2 : 0.16);
    const cx = W / 2;
    const cy = frame.safeTop + H * (frame.story ? 0.13 : 0.11) + radius;
    artPlane(scene, { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 }, { shape: "circle", inset: 0.05, focusY: 0.32, keyline: false, halo: 0.45, sceneKey: scene.img ? scene.artScene : "aura" });
    scene.art(() => drawMedallionRing(ctx, cx, cy, radius + W * 0.012, theme, 28));
    const copyTop = cy + radius + H * 0.05;
    const bandH = H * 0.075;
    const ctaH = scene.copy.cta.trim() ? H * 0.065 : 0;
    const copyBottom = H - frame.safeBottom - bandH - H * 0.05 - ctaH;
    const blessSpec: CopySpec = {
      x: m,
      y: copyTop,
      w: W - m * 2,
      maxH: copyBottom - copyTop,
      align: "center",
      headlineSize: W * 0.075,
      minHeadlineSize: W * 0.038,
      maxHeadlineLines: 3,
      subMaxLines: 2,
      scriptFirst: true,
      kickerMode: "tracked",
      ctaReserve: ctaH,
      center: { top: copyTop, bottom: copyBottom },
    };
    copyStack(scene, blessSpec, planCopy(scene, blessSpec));
    ctaRow(scene, cx, copyBottom + H * 0.012, "center", "outline");
    kolamBand(scene, { x: W * 0.16, y: H - frame.safeBottom - bandH, w: W * 0.64, h: bandH }, 0.5);
    scene.ground(() => {
      lampGlow(ctx, W * 0.1, H - frame.safeBottom - bandH * 0.5, W * 0.085, theme, scene.t, 0.4);
      lampGlow(ctx, W * 0.9, H - frame.safeBottom - bandH * 0.5, W * 0.085, theme, scene.t, 1.7);
    });
    brandPlane(scene, frame.safeTop + m * 0.1, { footerAlign: "center", footerY: H - frame.safeBottom - bandH - m * 0.3 });
    return;
  }

  // v1 — medallion left, greeting right
  const radius = W * 0.17;
  const cx = m + radius + W * 0.02;
  const cy = frame.safeTop + H * 0.16 + radius;
  artPlane(scene, { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 }, { shape: "circle", inset: 0.05, focusY: 0.32, halo: 0.4, sceneKey: scene.img ? scene.artScene : "aura" });
  scene.art(() => drawMedallionRing(ctx, cx, cy, radius + W * 0.01, theme, 24));
  const colX = cx + radius + W * 0.06;
  const colW = W - colX - m;
  const ctaH = scene.copy.cta.trim() ? H * 0.062 : 0;
  const copyBottom = cy + radius + H * 0.08;
  copyStack(scene, {
    x: colX,
    y: frame.safeTop + H * 0.14,
    w: colW,
    maxH: copyBottom - (frame.safeTop + H * 0.14),
    align: "left",
    headlineSize: W * 0.06,
    minHeadlineSize: W * 0.032,
    maxHeadlineLines: 4,
    subMaxLines: 3,
    scriptFirst: true,
    ctaReserve: ctaH,
  });
  ctaRow(scene, colX, copyBottom + H * 0.01, "left", "outline");
  const bandH = H * 0.07;
  kolamBand(scene, { x: m, y: H - frame.safeBottom - bandH - H * 0.015, w: W - m * 2, h: bandH }, 0.45);
  scene.ground(() => {
    lampGlow(ctx, W / 2, H - frame.safeBottom - bandH * 0.5 - H * 0.015, W * 0.11, theme, scene.t, 2.6);
  });
  brandPlane(scene, frame.safeTop + m * 0.1, { footer: "", });
  scene.brand(() => {
    ctx.save();
    ctx.font = scene.fonts.sans(Math.max(11, Math.round(W * 0.016)), 500);
    ctx.fillStyle = withAlpha(theme.ink, 0.74);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(scene.copy.footer.trim(), m, H - frame.safeBottom - bandH - H * 0.015 - m * 0.3);
    ctx.restore();
  });
}

/* ============================= 8 · carousel cover ========================= */

function sequence(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const v = scene.variation % 2;
  const cut = H * (v === 0 ? 0.56 : 0.5);

  scene.ground(() => {
    paintGround(ctx, frame, theme, { angle: "vertical", glowX: 0.3, glowY: 0.85, glow: theme.light ? 0.07 : 0.14 });
    paintGrain(ctx, W, H, 53, theme.light ? 0.03 : 0.045);
  });
  artPlane(scene, { x: 0, y: 0, w: W, h: cut + H * 0.06 }, {
    inset: 0.02,
    focusY: 0.3,
    scrim: 0.25,
    halo: 0,
    clip: (c) => {
      if (v === 0) {
        c.moveTo(0, 0);
        c.lineTo(W, 0);
        c.lineTo(W, cut - H * 0.05);
        c.lineTo(0, cut + H * 0.05);
      } else {
        c.rect(0, 0, W, cut);
      }
      c.closePath();
    },
  });
  // the cut: a clean diagonal (v0) or a ruled horizontal seam (v1)
  scene.ground(() => {
    ctx.save();
    ctx.strokeStyle = goldLine(theme, 0.75);
    ctx.lineWidth = Math.max(1.6, W * 0.0028);
    ctx.beginPath();
    if (v === 0) {
      ctx.moveTo(0, cut + H * 0.05);
      ctx.lineTo(W, cut - H * 0.05);
    } else {
      ctx.moveTo(m * 0.5, cut);
      ctx.lineTo(W - m * 0.5, cut);
    }
    ctx.stroke();
    if (v === 1) {
      ctx.strokeStyle = goldLine(theme, 0.35);
      ctx.lineWidth = Math.max(1, W * 0.0012);
      ctx.beginPath();
      ctx.moveTo(m * 0.5, cut + W * 0.012);
      ctx.lineTo(W - m * 0.5, cut + W * 0.012);
      ctx.stroke();
    }
    ctx.restore();
    paintScrim(ctx, { x: 0, y: 0, w: W, h: H * 0.2 }, { from: "top", strength: 0.5, spread: 1, color: theme.bgFrom });
  });
  brandPlane(scene, frame.safeTop + m * 0.32, { right: scene.copy.kicker || undefined });

  const seam = v === 0 ? cut + H * 0.02 : cut + H * 0.05;
  const numW = W * 0.2;
  const numX = v === 0 ? m : W - m - numW;
  const colX = v === 0 ? m + numW + W * 0.02 : m;
  const colW = v === 0 ? W - colX - m : numX - m - W * 0.04;
  scene.type(() => {
    drawIndex(ctx, "01", numX, seam - H * 0.015, W * 0.17, theme, "left", numW);
  });
  const dotsY = H - frame.safeBottom - H * 0.075;
  copyStack(scene, {
    x: colX,
    y: seam + H * 0.012,
    w: colW,
    maxH: dotsY - H * 0.035 - (seam + H * 0.012),
    align: "left",
    headlineSize: W * 0.062,
    minHeadlineSize: W * 0.034,
    maxHeadlineLines: 4,
    subMaxLines: 2,
    kickerMode: "none",
    divider: true,
    ctaReserve: H * 0.1,
  });
  scene.ground(() => {
    drawPageDots(ctx, m, dotsY, 5, 0, theme, Math.max(4, W * 0.007), "left");
  });
  scene.type(() => {
    drawSwipe(ctx, W - m, dotsY, Math.max(12, W * 0.02), theme, "right", "SWIPE");
  });
}

/* --------------------------------- dispatch ------------------------------- */

const PAINTERS: Record<PosterTemplate, (scene: Scene) => void> = {
  mandapam,
  gallery,
  manifesto,
  nocturne,
  lesson,
  offer,
  blessing,
  sequence,
};

const SEEDS: Record<PosterTemplate, number> = {
  mandapam: 7,
  gallery: 13,
  manifesto: 19,
  nocturne: 23,
  lesson: 29,
  offer: 31,
  blessing: 37,
  sequence: 41,
};

export function paintPosterTemplate(input: TemplateInput) {
  const frame = frameFor(input.W, input.H);
  const theme = themeFor(input.themeKey);
  const fonts = fontsFor(input.script);
  const mode = input.layer ?? "full";
  const active = (stage: "ground" | "art" | "copy" | "brand") => mode === "full" || mode === stage;
  const route = (stage: "ground" | "art" | "copy" | "brand") => (cb: () => void) => {
    if (active(stage)) cb();
  };
  const scene: Scene = {
    ctx: input.ctx,
    frame,
    theme,
    fonts,
    face: input.display,
    copy: input.copy,
    img: input.img,
    logo: input.logo,
    imageFit: input.imageFit,
    style: input.style,
    reveal: input.reveal,
    showLogo: input.showLogo,
    t: input.t ?? 1.6,
    variation: input.variation ?? 0,
    artScene: input.artScene ?? "cosmic",
    category: input.category ?? null,
    scriptFirst: false,
    seed: SEEDS[input.template] ?? 7,
    ground: route("ground"),
    art: route("art"),
    type: route("copy"),
    brand: route("brand"),
    mark: (name, box) => {
      if (input.marks && !input.marks[name]) input.marks[name] = box;
    },
  };
  const painter = PAINTERS[input.template] ?? gallery;
  ctxSaveGuarded(input.ctx, () => painter(scene));
}

/**
 * A painter that throws halfway through must not leave the 2D state dirty for
 * the next render on the same context (the reel renderer reuses one).
 */
function ctxSaveGuarded(ctx: CanvasRenderingContext2D, fn: () => void) {
  const root = ctx.getTransform?.();
  try {
    fn();
  } finally {
    if (root) {
      // restore is not reliable across an exception, so reset the transform explicitly
      ctx.setTransform(root.a, root.b, root.c, root.d, root.e, root.f);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.setLineDash([]);
  }
}

/* --------------------------------- exports -------------------------------- */

export { drawMotif, roundRect, safeBox, planStack };
