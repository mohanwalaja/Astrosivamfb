import type { ImageFit, PosterTemplate, ScriptFontKey, StyleKey, Theme } from "../types";
import {
  type Copy,
  type FontSet,
  type Frame,
  accent,
  archPath,
  drawArtFallback,
  drawBullets,
  drawCta,
  drawDiya,
  drawDoubleFrame,
  drawImageIn,
  drawIndex,
  drawKolamBase,
  drawLogoMark,
  drawMedallionRing,
  drawPageDots,
  drawSwipe,
  drawToran,
  fitStack,
  fontsFor,
  frameFor,
  hairline,
  ink,
  mutedOn,
  paintGrain,
  paintGround,
  paintScrim,
  planStack,
  paintStack,
  paintStyledGround,
  roundRect,
  safeBox,
  styleMotif,
  themeFor,
  toBullets,
  tracked,
  withAlpha,
} from "./posterKit";
import { brandSize, brandSpot, drawGlobalLockup } from "./brandPlacement";
import { drawMotif, wrapLines } from "./canvas";

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
  /** Script-first templates read the Tamil line above the English headline. */
  scriptFirst: boolean;
}

const goldLine = (theme: Theme, alpha = 0.5) => withAlpha(theme.gold, alpha);

/** Tiny meta row: wordmark left, page marker right. */
function brandRow(scene: Scene, y: number, options: { right?: string } = {}) {
  const { ctx, frame, theme, logo, showLogo } = scene;
  const { m } = frame;
  const size = Math.round(frame.W * 0.045);
  if (showLogo) {
    // Print posters follow the same studio-wide lockup rule: bare mark +
    // wordmark at the configured corner, never the ivory plate.
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
    ctx.font = scene.fonts.sans(Math.round(frame.W * 0.018), 600);
    ctx.fillStyle = withAlpha(theme.ink, 0.66);
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    tracked(ctx, options.right.toUpperCase(), frame.W - m, y + size / 2, frame.W * 0.0032, "right");
    ctx.restore();
  }
  return size;
}

function footerRow(
  scene: Scene,
  text: string,
  options: { color?: string; align?: "left" | "center" | "right"; baselineFromBottom?: number; baseline?: number } = {},
) {
  const { ctx, frame, theme } = scene;
  if (!text.trim()) return;
  const size = Math.max(11, Math.round(frame.W * 0.0165));
  ctx.save();
  ctx.font = scene.fonts.sans(size, 500);
  ctx.fillStyle = options.color ?? withAlpha(theme.ink, 0.6);
  ctx.textBaseline = "alphabetic";
  const y =
    options.baseline ??
    frame.H - frame.safeBottom - (options.baselineFromBottom ?? frame.m * 0.5);
  const align = options.align ?? "left";
  ctx.textAlign = align;
  ctx.fillText(text, align === "center" ? frame.W / 2 : align === "right" ? frame.W - frame.m : frame.m, y);
  ctx.restore();
}

/* ------------------------------ shared pieces ----------------------------- */

/** Copy block options every template starts from; each overrides the grid. */
function stackBase(scene: Scene, x: number, w: number, align: "left" | "center" | "right"): Parameters<typeof planStack>[1] {
  return {
    x,
    w,
    align,
    theme: scene.theme,
    fonts: scene.fonts,
    face: scene.face,
    copy: scene.copy,
    headlineWeight: scene.face === scene.fonts.editorial ? 400 : 700,
    showScript: true,
    kickerMode: "tracked",
    lineHeight: 1.1,
  };
}

/** Art or the style's stand-in motif, clipped to a shape. */
function artIn(scene: Scene, box: { x: number; y: number; w: number; h: number }, options: Parameters<typeof drawImageIn>[3] & { fallbackShape?: "rect" | "arch" | "circle" } = {}) {
  const { ctx, theme } = scene;
  if (scene.img) {
    drawImageIn(ctx, scene.img, box, options);
    return;
  }
  drawArtFallback(ctx, box, theme, styleMotif(scene.style), 0.8, options.fallbackShape ?? "rect");
}

function ctaPill(scene: Scene, x: number, y: number, align: "left" | "center" | "right", variant: "pill" | "outline" | "text" | "ribbon" = "pill") {
  const { ctx, frame, theme } = scene;
  if (!scene.copy.cta.trim()) return { width: 0, height: 0 };
  return drawCta(ctx, {
    x,
    y,
    align,
    theme,
    label: scene.copy.cta.trim(),
    variant,
    size: Math.max(12, frame.W * 0.019),
    opacity: scene.reveal,
  });
}

/** Soft drop shadow under a rounded card. */
function cardShadow(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, radius: number, blur: number, alpha = 0.45) {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = blur * 0.35;
  ctx.fillStyle = "rgba(0,0,0,0.01)";
  roundRect(ctx, box.x, box.y, box.w, box.h, radius);
  ctx.fill();
  ctx.restore();
}

function goldFoil(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#FFF0B5");
  g.addColorStop(0.3, "#C9922E");
  g.addColorStop(0.55, "#FFF4C8");
  g.addColorStop(0.8, "#9C6414");
  g.addColorStop(1, "#F2C95E");
  return g;
}

/* ============================ 1 · temple mandapam ========================= */

function mandapam(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  // Hall geometry. The arch takes the upper half of the page; the pillars run
  // from the lintel to the footing so the copy sits *inside* the hall.
  const hallTop = frame.safeTop + H * (frame.story ? 0.1 : 0.115);
  const footY = H - frame.safeBottom - H * 0.085;
  const pillarW = W * 0.062;
  const pillarX = [m * 0.75, W - m * 0.75 - pillarW];
  const archW = W - (m * 0.75 + pillarW) * 2 - W * 0.09;
  const archX = (W - archW) / 2;
  const archH = Math.min(H * (frame.story ? 0.31 : 0.32), archW * (frame.story ? 1.5 : 1.1));
  const archY = hallTop + H * 0.045;
  paintStyledGround(ctx, frame, theme, scene.style, {
    angle: "vertical",
    glowX: 0.5,
    glowY: 0.3,
    glow: theme.light ? 0.1 : 0.2,
    art: { x: archX, y: archY, w: archW, h: archH },
  });
  paintGrain(ctx, W, H, 17, theme.light ? 0.03 : 0.05);

  brandRow(scene, frame.safeTop + m * 0.1);
  const foil = goldFoil(ctx, 0, hallTop, W, footY - hallTop);

  // Lintel: three stepped courses with a central kalasam.
  ctx.save();
  const lintelH = H * 0.012;
  for (let i = 0; i < 3; i += 1) {
    const inset = i * W * 0.012;
    ctx.fillStyle = i === 1 ? foil : withAlpha(theme.gold, 0.55 - i * 0.12);
    ctx.fillRect(pillarX[0] + inset, hallTop + i * lintelH, pillarX[1] + pillarW - pillarX[0] - inset * 2, lintelH * 0.9);
  }
  // kalasam
  const kx = W / 2;
  const ky = hallTop - H * 0.004;
  ctx.fillStyle = foil;
  ctx.beginPath();
  ctx.moveTo(kx - W * 0.022, ky);
  ctx.quadraticCurveTo(kx - W * 0.026, ky - H * 0.03, kx, ky - H * 0.046);
  ctx.quadraticCurveTo(kx + W * 0.026, ky - H * 0.03, kx + W * 0.022, ky);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawToran(ctx, pillarX[0] + pillarW, hallTop + lintelH * 3, pillarX[1] - pillarX[0] - pillarW, theme, frame.story ? 11 : 13, theme.gold);

  // Pillars: fluted shaft, lotus capital, stepped base.
  const drawPillar = (x: number) => {
    const top = hallTop + lintelH * 3;
    const shaftH = footY - top;
    ctx.save();
    const shaft = ctx.createLinearGradient(x, 0, x + pillarW, 0);
    shaft.addColorStop(0, withAlpha(theme.gold, 0.18));
    shaft.addColorStop(0.5, withAlpha(theme.gold, 0.5));
    shaft.addColorStop(1, withAlpha(theme.gold, 0.14));
    ctx.fillStyle = shaft;
    ctx.fillRect(x, top, pillarW, shaftH);
    ctx.strokeStyle = withAlpha(theme.light ? theme.ink : "#FFF2C2", 0.22);
    ctx.lineWidth = Math.max(1, W * 0.0012);
    for (let i = 1; i < 4; i += 1) {
      const fx = x + (pillarW / 4) * i;
      ctx.beginPath();
      ctx.moveTo(fx, top + shaftH * 0.1);
      ctx.lineTo(fx, top + shaftH * 0.92);
      ctx.stroke();
    }
    // capital
    ctx.fillStyle = foil;
    ctx.beginPath();
    ctx.ellipse(x + pillarW / 2, top + shaftH * 0.08, pillarW * 0.72, H * 0.009, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - pillarW * 0.2, top + shaftH * 0.08 - H * 0.006, pillarW * 1.4, H * 0.008);
    // base
    ctx.fillRect(x - pillarW * 0.25, top + shaftH * 0.92, pillarW * 1.5, H * 0.009);
    ctx.fillRect(x - pillarW * 0.12, top + shaftH * 0.905, pillarW * 1.24, H * 0.006);
    ctx.restore();
  };
  pillarX.forEach(drawPillar);

  // Halo behind the arch, then the art.
  const arch = { x: archX, y: archY, w: archW, h: archH };
  ctx.save();
  const halo = ctx.createRadialGradient(W / 2, archY + archH * 0.45, archW * 0.1, W / 2, archY + archH * 0.45, archW * 0.95);
  halo.addColorStop(0, withAlpha(theme.gold, theme.light ? 0.3 : 0.4));
  halo.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, hallTop, W, archH * 1.6);
  ctx.restore();

  artIn(scene, arch, {
    shape: "arch",
    inset: scene.imageFit === "full" ? 0.01 : 0.05,
    focusY: 0.3,
    vignette: 0.22,
    grade: theme.bgTo,
    gradeAlpha: 0.08,
    fallbackShape: "arch",
  });
  // Double arch moulding.
  ctx.save();
  ctx.strokeStyle = foil;
  ctx.lineWidth = Math.max(2, W * 0.007);
  ctx.stroke(archPath(arch.x, arch.y, arch.w, arch.h));
  ctx.strokeStyle = withAlpha(theme.gold, 0.4);
  ctx.lineWidth = Math.max(1, W * 0.0016);
  const o = W * 0.018;
  ctx.stroke(archPath(arch.x - o, arch.y - o, arch.w + o * 2, arch.h + o));
  ctx.restore();

  // Copy inside the hall, script first.
  const innerX = pillarX[0] + pillarW + W * 0.035;
  const innerW = pillarX[1] - innerX - W * 0.035;
  const copyTop = archY + archH + H * 0.035;
  const ctaReserve = scene.copy.cta.trim() ? H * 0.07 : 0;
  const copyBottom = footY - H * 0.03 - ctaReserve;
  const plan = fitStack(
    ctx,
    {
      ...stackBase(scene, innerX, innerW, "center"),
      scriptFirst: true,
      maxHeadlineLines: 3,
      measure: W * 0.9,
      headlineSize: W * 0.07,
      minHeadlineSize: W * 0.036,
      subMaxLines: 1,
      ornament: false,
      kickerMode: "none",
    },
    copyBottom - copyTop,
    0.6,
  );
  paintStack(ctx, plan, copyTop, scene.reveal);
  if (ctaReserve) ctaPill(scene, W / 2, copyBottom + H * 0.012, "center", "pill");

  // Footing: twin lamps at the pillar bases, kolam line, footer.
  drawDiya(ctx, pillarX[0] + pillarW / 2, footY - H * 0.004, W * 0.075, theme);
  drawDiya(ctx, pillarX[1] + pillarW / 2, footY - H * 0.004, W * 0.075, theme, true);
  drawKolamBase(ctx, W / 2 - W * 0.2, footY + H * 0.022, W * 0.4, theme);
  footerRow(scene, scene.copy.footer, { align: "center", baselineFromBottom: H * 0.02 });
}

/* ============================= 2 · gallery plate ========================== */

function gallery(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  // The plate: a mat the colour of the wall, art inset, hung high.
  const plateTop = frame.safeTop + H * 0.11;
  const plateH = H * (frame.story ? 0.46 : frame.square ? 0.44 : 0.48);
  const mat = { x: m, y: plateTop, w: W - m * 2, h: plateH };
  paintStyledGround(ctx, frame, theme, scene.style, { angle: "vertical", glowX: 0.5, glowY: 0.2, glow: theme.light ? 0.06 : 0.12, art: mat });
  paintGrain(ctx, W, H, 23, theme.light ? 0.03 : 0.045);

  brandRow(scene, frame.safeTop + m * 0.1, { right: scene.copy.cta || "astrosivam.com" });
  cardShadow(ctx, mat, W * 0.003, W * 0.04, theme.light ? 0.28 : 0.5);
  ctx.save();
  ctx.fillStyle = theme.light ? "#FFFDF7" : withAlpha("#F6EEDC", 0.92);
  ctx.fillRect(mat.x, mat.y, mat.w, mat.h);
  ctx.restore();
  const matIn = W * 0.04;
  const art = { x: mat.x + matIn, y: mat.y + matIn, w: mat.w - matIn * 2, h: mat.h - matIn * 2 - H * 0.03 };
  artIn(scene, art, {
    inset: scene.imageFit === "full" ? 0.01 : 0.04,
    focusY: 0.35,
    vignette: 0.12,
    grade: theme.bgTo,
    gradeAlpha: 0.05,
  });
  ctx.save();
  ctx.strokeStyle = withAlpha("#8B6A2A", 0.55);
  ctx.lineWidth = Math.max(1, W * 0.0014);
  ctx.strokeRect(art.x - W * 0.004, art.y - W * 0.004, art.w + W * 0.008, art.h + W * 0.008);
  // plate caption, bottom of the mat
  ctx.font = scene.fonts.sans(Math.max(9, W * 0.0135), 600);
  ctx.fillStyle = withAlpha("#4A3A1E", 0.8);
  ctx.textBaseline = "middle";
  const capY = art.y + art.h + H * 0.016;
  tracked(ctx, "PLATE 01", art.x, capY, W * 0.003, "left");
  if (scene.copy.kicker.trim()) tracked(ctx, scene.copy.kicker.trim().toUpperCase(), art.x + art.w, capY, W * 0.003, "right");
  ctx.restore();

  // Exhibition label beneath.
  const labelTop = mat.y + mat.h + H * 0.045;
  const labelBottom = H - frame.safeBottom - H * 0.07;
  const plan = fitStack(
    ctx,
    {
      ...stackBase(scene, m, W - m * 2, "left"),
      maxHeadlineLines: 3,
      measure: W * 0.95,
      headlineSize: W * 0.074,
      minHeadlineSize: W * 0.034,
      subMaxLines: 2,
      ornament: true,
      kickerMode: "none",
      divider: false,
    },
    labelBottom - labelTop,
    0.5,
  );
  paintStack(ctx, plan, labelTop, scene.reveal);

  hairline(ctx, m, H - frame.safeBottom - H * 0.05, W - m, goldLine(theme, 0.35), Math.max(1, W * 0.0012));
  footerRow(scene, scene.copy.footer, { baselineFromBottom: H * 0.024 });
  if (scene.copy.cta.trim()) ctaPill(scene, W - m, H - frame.safeBottom - H * 0.052, "right", "text");
}

/* =============================== 3 · manifesto ============================ */

function manifesto(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  paintStyledGround(ctx, frame, theme, scene.style, { angle: "diagonal", glowX: 0.8, glowY: 0.1, glow: theme.light ? 0.05 : 0.1, art: "none" });
  paintGrain(ctx, W, H, 29, theme.light ? 0.035 : 0.05);

  // Tamil watermark: the script line set enormous behind the page.
  const mark = (scene.copy.tamil || scene.copy.hindi || scene.copy.kicker || "ஜாதகம்").trim();
  if (mark) {
    ctx.save();
    ctx.globalAlpha = theme.light ? 0.07 : 0.09;
    ctx.fillStyle = theme.gold;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const isIndic = /[\u0900-\u097F\u0B80-\u0BFF]/.test(mark);
    let size = W * 0.42;
    const face = isIndic ? (s: number) => scene.fonts.script(s) : (s: number) => scene.face(s, 700);
    ctx.font = face(size);
    const maxW = W * 1.5;
    while (ctx.measureText(mark).width > maxW && size > W * 0.12) {
      size *= 0.92;
      ctx.font = face(size);
    }
    ctx.fillText(mark, W / 2, H * 0.46);
    ctx.restore();
  }

  brandRow(scene, frame.safeTop + m * 0.1);

  // Margin rule with the index.
  const railX = m * 0.72;
  const railTop = frame.safeTop + H * 0.14;
  const railBottom = H - frame.safeBottom - H * 0.1;
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

  // The statement.
  const colX = m * 1.05;
  const colW = W - colX - m * 0.9;
  // gold slash
  ctx.save();
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.beginPath();
  ctx.moveTo(colX, railTop + H * 0.02);
  ctx.lineTo(colX + W * 0.075, railTop + H * 0.02);
  ctx.stroke();
  ctx.restore();

  const top = railTop + H * 0.06;
  const bottom = railBottom - H * 0.02;
  const plan = fitStack(
    ctx,
    {
      ...stackBase(scene, colX, colW, "left"),
      maxHeadlineLines: frame.story ? 7 : 6,
      measure: W,
      headlineSize: W * 0.112,
      minHeadlineSize: W * 0.052,
      lineHeight: 1.0,
      subMaxLines: 3,
      ornament: false,
      kickerMode: "none",
      showScript: true,
      divider: true,
    },
    bottom - top,
    0.55,
  );
  paintStack(ctx, plan, top, scene.reveal);

  hairline(ctx, railX, railBottom + H * 0.03, W - m * 0.9, goldLine(theme, 0.35), Math.max(1, W * 0.0012));
  footerRow(scene, scene.copy.footer, { baselineFromBottom: H * 0.024 });
  if (scene.copy.cta.trim()) ctaPill(scene, W - m * 0.9, H - frame.safeBottom - H * 0.055, "right", "text");
}

/* ============================== 4 · glass nocturne ======================== */

function nocturne(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const page = { x: 0, y: 0, w: W, h: H };
  if (scene.img) {
    drawImageIn(ctx, scene.img, page, { inset: 0, focusY: 0.3, grade: theme.bgFrom, gradeAlpha: theme.light ? 0.1 : 0.34, vignette: 0.45 });
  } else {
    const fallback = { x: W * 0.15, y: H * 0.12, w: W * 0.7, h: H * 0.46 };
    paintStyledGround(ctx, frame, theme, scene.style, { glowX: 0.5, glowY: 0.35, glow: 0.22, art: fallback });
    drawArtFallback(ctx, fallback, theme, styleMotif(scene.style), 0.75, "circle");
  }
  paintScrim(ctx, { x: 0, y: H * 0.45, w: W, h: H * 0.55 }, { from: "bottom", strength: theme.light ? 0.5 : 0.82, spread: 1.1, color: theme.bgFrom });
  paintScrim(ctx, { x: 0, y: 0, w: W, h: H * 0.22 }, { from: "top", strength: 0.5, spread: 1, color: theme.bgFrom });
  paintGrain(ctx, W, H, 31, 0.04);

  // hairline frame
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.light ? theme.ink : "#FFFFFF", 0.3);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.strokeRect(m * 0.5, frame.safeTop + m * 0.1, W - m, H - frame.safeTop - frame.safeBottom - m * 0.2);
  ctx.restore();

  brandRow(scene, frame.safeTop + m * 0.32, { right: scene.copy.kicker });

  // Frosted card.
  const cardX = m * 0.95;
  const cardW = W - cardX * 2;
  const cardBottom = H - frame.safeBottom - m * 0.95;
  const pad = W * 0.05;
  const ctaH = scene.copy.cta.trim() ? Math.max(12, W * 0.019) * 2.35 + H * 0.028 : 0;
  const maxCopy = H * (frame.story ? 0.3 : 0.34);
  const plan = fitStack(
    ctx,
    {
      ...stackBase(scene, cardX + pad, cardW - pad * 2, "left"),
      maxHeadlineLines: 3,
      measure: W * 0.9,
      headlineSize: W * 0.068,
      minHeadlineSize: W * 0.036,
      subMaxLines: 2,
      ornament: false,
      kickerMode: "tracked",
      divider: false,
    },
    maxCopy,
    0.5,
  );
  const footerH = scene.copy.footer.trim() ? H * 0.03 : 0;
  const cardH = plan.height + pad * 1.7 + ctaH + footerH;
  const card = { x: cardX, y: cardBottom - cardH, w: cardW, h: cardH };
  const r = W * 0.022;
  ctx.save();
  cardShadow(ctx, card, r, W * 0.05, 0.4);
  ctx.fillStyle = withAlpha(theme.light ? "#FFFFFF" : "#0B0C12", theme.light ? 0.62 : 0.5);
  roundRect(ctx, card.x, card.y, card.w, card.h, r);
  ctx.fill();
  const sheen = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
  sheen.addColorStop(0, withAlpha("#FFFFFF", theme.light ? 0.35 : 0.12));
  sheen.addColorStop(0.5, withAlpha("#FFFFFF", 0));
  sheen.addColorStop(1, withAlpha(theme.gold, 0.1));
  ctx.fillStyle = sheen;
  roundRect(ctx, card.x, card.y, card.w, card.h, r);
  ctx.fill();
  ctx.strokeStyle = withAlpha("#FFFFFF", theme.light ? 0.7 : 0.28);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  roundRect(ctx, card.x, card.y, card.w, card.h, r);
  ctx.stroke();
  // gold hair on the top edge
  ctx.strokeStyle = withAlpha(theme.gold, 0.7);
  ctx.beginPath();
  ctx.moveTo(card.x + r, card.y);
  ctx.lineTo(card.x + card.w - r, card.y);
  ctx.stroke();
  ctx.restore();

  paintStack(ctx, plan, card.y + pad * 0.9, scene.reveal);
  if (ctaH) ctaPill(scene, card.x + pad, card.y + pad * 0.9 + plan.height + H * 0.024, "left", "pill");

  if (footerH) {
    ctx.save();
    ctx.font = scene.fonts.sans(Math.max(10, W * 0.0155), 500);
    ctx.fillStyle = withAlpha(theme.light ? theme.ink : "#FFFFFF", 0.6);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(scene.copy.footer.trim(), card.x + pad, card.y + card.h - pad * 0.7);
    ctx.restore();
  }
}

/* =============================== 5 · guide slide ========================== */

function lesson(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const headY = frame.safeTop + H * 0.115;
  const insetR = W * (frame.story ? 0.17 : 0.15);
  const rowTop = headY + H * 0.1;
  const inset = { x: W - m - insetR * 2, y: rowTop, w: insetR * 2, h: insetR * 2 };
  paintStyledGround(ctx, frame, theme, scene.style, { angle: "vertical", glowX: 0.85, glowY: 0.15, glow: theme.light ? 0.06 : 0.12, art: inset });
  paintGrain(ctx, W, H, 37, theme.light ? 0.03 : 0.045);

  brandRow(scene, frame.safeTop + m * 0.1, { right: scene.copy.cta || "astrosivam.com" });

  // Chapter header: numeral + series name.
  drawIndex(ctx, "01", m, headY, W * 0.11, theme, "left");
  ctx.save();
  ctx.font = scene.fonts.sans(Math.max(10, W * 0.016), 600);
  ctx.fillStyle = withAlpha(theme.ink, 0.6);
  ctx.textBaseline = "top";
  tracked(ctx, (scene.copy.kicker || "THE ASTRO SIVAM GUIDE").toUpperCase(), m + W * 0.15, headY + W * 0.012, W * 0.0032, "left");
  ctx.restore();
  hairline(ctx, m + W * 0.15, headY + W * 0.05, W - m - W * 0.34, goldLine(theme, 0.35), Math.max(1, W * 0.0012));

  // Headline beside a round inset.
  ctx.save();
  const ring = ctx.createRadialGradient(inset.x + insetR, inset.y + insetR, insetR * 0.8, inset.x + insetR, inset.y + insetR, insetR * 1.4);
  ring.addColorStop(0, withAlpha(theme.gold, 0.28));
  ring.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = ring;
  ctx.fillRect(inset.x - insetR, inset.y - insetR, insetR * 4, insetR * 4);
  ctx.restore();
  artIn(scene, inset, { shape: "circle", inset: 0.08, focusY: 0.3, vignette: 0.2, fallbackShape: "circle" });
  ctx.save();
  ctx.strokeStyle = goldFoil(ctx, inset.x, inset.y, inset.w, inset.h);
  ctx.lineWidth = Math.max(2, W * 0.005);
  ctx.beginPath();
  ctx.arc(inset.x + insetR, inset.y + insetR, insetR + W * 0.004, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const colW = inset.x - m - W * 0.05;
  const headPlan = fitStack(
    ctx,
    {
      ...stackBase(scene, m, colW, "left"),
      maxHeadlineLines: 4,
      measure: W * 0.78,
      headlineSize: W * 0.06,
      minHeadlineSize: W * 0.032,
      subMaxLines: 0,
      showScript: true,
      ornament: false,
      kickerMode: "none",
      divider: false,
    },
    insetR * 2 + H * 0.06,
    0.5,
  );
  paintStack(ctx, headPlan, rowTop, scene.reveal);

  // Three numbered cards.
  const bullets = toBullets(scene.copy.subline, 3);
  const cardsTop = Math.max(rowTop + headPlan.height, inset.y + inset.h) + H * 0.05;
  const railY = H - frame.safeBottom - H * 0.075;
  const avail = railY - H * 0.035 - cardsTop;
  const gap = H * (frame.story ? 0.028 : 0.014);
  const cardH = Math.min(H * (frame.story ? 0.11 : 0.095), (avail - gap * 2) / Math.max(1, bullets.length));
  const size = Math.max(11, Math.min(W * 0.026, cardH * 0.34));
  ctx.save();
  ctx.globalAlpha = scene.reveal;
  bullets.forEach((line, i) => {
    const y = cardsTop + i * (cardH + gap);
    const r = W * 0.012;
    ctx.fillStyle = withAlpha(theme.light ? "#FFFFFF" : "#FFFFFF", theme.light ? 0.55 : 0.06);
    roundRect(ctx, m, y, W - m * 2, cardH, r);
    ctx.fill();
    ctx.strokeStyle = goldLine(theme, 0.35);
    ctx.lineWidth = Math.max(1, W * 0.001);
    roundRect(ctx, m, y, W - m * 2, cardH, r);
    ctx.stroke();
    // numeral tab
    ctx.fillStyle = theme.gold;
    roundRect(ctx, m, y, W * 0.085, cardH, r);
    ctx.fill();
    ctx.fillStyle = theme.light ? "#1A1206" : "#140F04";
    ctx.font = scene.face(size * 1.25, 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`0${i + 1}`, m + W * 0.0425, y + cardH / 2);
    // text, up to two lines
    ctx.fillStyle = withAlpha(theme.ink, 0.92);
    ctx.font = scene.fonts.sans(size, 500);
    ctx.textAlign = "left";
    const textX = m + W * 0.085 + W * 0.03;
    const lines = wrapLines(ctx, line, W - m * 2 - W * 0.085 - W * 0.06).slice(0, 2);
    const lead = size * 1.3;
    const startY = y + cardH / 2 - ((lines.length - 1) * lead) / 2;
    lines.forEach((l, j) => ctx.fillText(l, textX, startY + j * lead));
  });
  ctx.restore();

  // Progress rail: three segments, the first lit.
  ctx.save();
  const segW = (W - m * 2 - W * 0.02) / 3;
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i === 0 ? theme.gold : withAlpha(theme.ink, 0.18);
    roundRect(ctx, m + i * (segW + W * 0.01), railY, segW, Math.max(2, H * 0.004), H * 0.002);
    ctx.fill();
  }
  ctx.restore();
  footerRow(scene, scene.copy.footer, { baselineFromBottom: H * 0.024 });
  ctx.save();
  ctx.font = scene.fonts.sans(Math.max(9, W * 0.014), 600);
  ctx.fillStyle = withAlpha(theme.ink, 0.6);
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  tracked(ctx, "1 / 3", W - m, H - frame.safeBottom - H * 0.024, W * 0.003, "right");
  ctx.restore();
}

/* ================================ 6 · offer card ========================== */

function offer(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const bandTop = frame.safeTop + H * 0.085;
  const bandH = H * 0.055;
  const skew = W * 0.06;
  const cardW = W * (frame.story ? 0.46 : 0.4);
  const cardH = cardW * (frame.story ? 1.4 : 1.22);
  const card = { x: W - m - cardW, y: bandTop - H * 0.02, w: cardW, h: cardH };
  paintStyledGround(ctx, frame, theme, scene.style, { angle: "diagonal", glowX: 0.2, glowY: 0.85, glow: theme.light ? 0.08 : 0.16, art: card });
  paintGrain(ctx, W, H, 43, theme.light ? 0.03 : 0.045);

  // Diagonal campaign band across the top-left.
  ctx.save();
  ctx.fillStyle = goldFoil(ctx, 0, bandTop, W * 0.6, bandH);
  ctx.beginPath();
  ctx.moveTo(0, bandTop);
  ctx.lineTo(W * 0.58, bandTop);
  ctx.lineTo(W * 0.58 - skew, bandTop + bandH);
  ctx.lineTo(0, bandTop + bandH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1A1206";
  ctx.font = scene.fonts.sans(Math.max(10, W * 0.018), 700);
  ctx.textBaseline = "middle";
  tracked(ctx, (scene.copy.kicker || "BOOKING OPEN").toUpperCase(), m, bandTop + bandH / 2, W * 0.004, "left");
  ctx.restore();

  brandRow(scene, frame.safeTop + m * 0.1);

  // Product card, upper right, overlapping the band.
  const r = W * 0.02;
  cardShadow(ctx, card, r, W * 0.05, 0.5);
  ctx.save();
  ctx.fillStyle = theme.light ? "#FFFFFF" : withAlpha("#FFFFFF", 0.08);
  roundRect(ctx, card.x, card.y, card.w, card.h, r);
  ctx.fill();
  ctx.restore();
  const padC = W * 0.012;
  artIn(scene, { x: card.x + padC, y: card.y + padC, w: card.w - padC * 2, h: card.h - padC * 2 }, { radius: r * 0.7, inset: 0.03, focusY: 0.3, vignette: 0.12 });
  ctx.save();
  ctx.strokeStyle = goldLine(theme, 0.6);
  ctx.lineWidth = Math.max(1, W * 0.0014);
  roundRect(ctx, card.x, card.y, card.w, card.h, r);
  ctx.stroke();
  ctx.restore();

  // Stamp on the card's lower-left corner.
  const stampR = W * 0.062;
  const sx = card.x + card.w - stampR * 0.7;
  const sy = card.y + card.h - stampR * 0.5;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.4)";
  ctx.shadowBlur = W * 0.02;
  ctx.fillStyle = theme.light ? "#7A1F1F" : theme.gold;
  ctx.beginPath();
  ctx.arc(sx, sy, stampR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = withAlpha(theme.light ? "#FFFFFF" : "#1A1206", 0.6);
  ctx.lineWidth = Math.max(1, W * 0.0014);
  ctx.beginPath();
  ctx.arc(sx, sy, stampR * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = theme.light ? "#FFFFFF" : "#1A1206";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = scene.fonts.sans(stampR * 0.26, 700);
  ctx.fillText("BOOKING", sx, sy - stampR * 0.16);
  ctx.font = scene.face(stampR * 0.42, 700);
  ctx.fillText("OPEN", sx, sy + stampR * 0.22);
  ctx.restore();

  // Headline column left of the card, continuing below it.
  const colX = m;
  const colW = card.x - m - W * 0.05;
  const headTop = bandTop + bandH + H * 0.045;
  const headPlan = fitStack(
    ctx,
    {
      ...stackBase(scene, colX, colW, "left"),
      maxHeadlineLines: frame.story ? 6 : 5,
      measure: W * 0.72,
      headlineSize: W * (frame.story ? 0.07 : 0.062),
      minHeadlineSize: W * 0.032,
      subMaxLines: 0,
      showScript: true,
      ornament: false,
      kickerMode: "none",
      divider: false,
    },
    card.y + card.h - headTop + H * 0.02,
    0.5,
  );
  paintStack(ctx, headPlan, headTop, scene.reveal);

  // Benefit chips.
  const chips = toBullets(scene.copy.subline, 3);
  const chipTop = Math.max(headTop + headPlan.height, card.y + card.h) + H * 0.045;
  const chipSize = Math.max(11, W * 0.021);
  ctx.save();
  ctx.globalAlpha = scene.reveal;
  ctx.font = scene.fonts.sans(chipSize, 600);
  let cx = m;
  let cy = chipTop;
  const chipH = chipSize * 2.2;
  for (const chip of chips) {
    const label = chip.length > 30 ? `${chip.slice(0, 28).trim()}…` : chip;
    const w = ctx.measureText(label).width + chipSize * 2;
    if (cx + w > W - m && cx > m) {
      cx = m;
      cy += chipH + H * 0.01;
    }
    ctx.strokeStyle = goldLine(theme, 0.6);
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.fillStyle = withAlpha(theme.gold, 0.08);
    roundRect(ctx, cx, cy, w, chipH, chipH / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = withAlpha(theme.ink, 0.9);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(label, cx + chipSize, cy + chipH / 2);
    cx += w + W * 0.012;
  }
  ctx.restore();
  const chipsBottom = chips.length ? cy + chipH : chipTop;

  // Filled CTA, then the footer.
  const ctaY = Math.min(chipsBottom + H * 0.035, H - frame.safeBottom - H * 0.13);
  ctaPill(scene, m, ctaY, "left", "pill");
  hairline(ctx, m, H - frame.safeBottom - H * 0.05, W - m, goldLine(theme, 0.3), Math.max(1, W * 0.0012));
  footerRow(scene, scene.copy.footer, { baselineFromBottom: H * 0.024 });
}

/* ============================= 7 · festival blessing ====================== */

function blessing(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  const cx = W / 2;
  const radius = W * (frame.story ? 0.23 : 0.165);
  const cy = frame.safeTop + H * (frame.story ? 0.15 : 0.125) + radius;
  paintStyledGround(ctx, frame, theme, scene.style, {
    angle: "vertical",
    glowX: 0.5,
    glowY: 0.32,
    glow: theme.light ? 0.12 : 0.24,
    art: { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 },
  });

  // Rays fanning from the medallion.
  ctx.save();
  ctx.translate(cx, cy);
  const rays = 36;
  for (let i = 0; i < rays; i += 1) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 0.5) / rays) * Math.PI * 2;
    const g = ctx.createRadialGradient(0, 0, radius * 0.9, 0, 0, radius * 2.6);
    g.addColorStop(0, withAlpha(theme.gold, i % 2 ? 0.16 : 0.08));
    g.addColorStop(1, withAlpha(theme.gold, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius * 2.6, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  paintGrain(ctx, W, H, 47, theme.light ? 0.03 : 0.05);

  brandRow(scene, frame.safeTop + m * 0.1);

  // Medallion.
  artIn(scene, { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 }, { shape: "circle", inset: 0.06, focusY: 0.3, vignette: 0.25, fallbackShape: "circle" });
  drawMedallionRing(ctx, cx, cy, radius + W * 0.012, theme, 28);

  // Lamp row.
  const lampY = cy + radius + H * (frame.story ? 0.07 : 0.06);
  const lampN = frame.story ? 5 : 5;
  const lampSpan = W * 0.46;
  for (let i = 0; i < lampN; i += 1) {
    const x = cx - lampSpan / 2 + (lampSpan / (lampN - 1)) * i;
    const s = W * (i === Math.floor(lampN / 2) ? 0.07 : 0.054);
    drawDiya(ctx, x, lampY, s, theme, i > lampN / 2);
  }
  hairline(ctx, cx - lampSpan / 2 - W * 0.04, lampY + H * 0.012, cx + lampSpan / 2 + W * 0.04, goldLine(theme, 0.4), Math.max(1, W * 0.0012));

  // Greeting first, blessing second.
  const copyTop = lampY + H * 0.038;
  const ctaReserve = scene.copy.cta.trim() ? H * 0.07 : 0;
  const copyBottom = H - frame.safeBottom - H * 0.075 - ctaReserve;
  const plan = fitStack(
    ctx,
    {
      ...stackBase(scene, m, W - m * 2, "center"),
      scriptFirst: true,
      maxHeadlineLines: 3,
      measure: W,
      headlineSize: W * 0.07,
      minHeadlineSize: W * 0.036,
      subMaxLines: 1,
      ornament: false,
      kickerMode: "none",
      divider: false,
    },
    copyBottom - copyTop,
    0.6,
  );
  paintStack(ctx, plan, copyTop, scene.reveal);
  if (ctaReserve) ctaPill(scene, cx, copyBottom + H * 0.012, "center", "outline");

  footerRow(scene, scene.copy.footer, { align: "center", baselineFromBottom: H * 0.022 });
}

/* ============================== 8 · series cover ========================== */

function sequence(scene: Scene) {
  const { ctx, frame, theme } = scene;
  const { W, H, m } = frame;
  // Art in the upper page.
  const artBottom = H * (frame.story ? 0.56 : 0.6);
  const artBox = { x: 0, y: 0, w: W, h: artBottom + H * 0.08 };
  const fallback = { x: W * 0.2, y: H * 0.08, w: W * 0.6, h: artBottom - H * 0.12 };
  paintStyledGround(ctx, frame, theme, scene.style, { angle: "vertical", glowX: 0.2, glowY: 0.9, glow: theme.light ? 0.08 : 0.16, art: fallback });
  if (scene.img) {
    drawImageIn(ctx, scene.img, artBox, { inset: 0, focusY: 0.28, grade: theme.bgFrom, gradeAlpha: theme.light ? 0.08 : 0.24, vignette: 0.3 });
  } else {
    drawArtFallback(ctx, fallback, theme, styleMotif(scene.style), 0.8, "circle");
  }
  // Sweeping arc cuts the art into the copy field.
  ctx.save();
  ctx.fillStyle = theme.bgFrom;
  ctx.beginPath();
  ctx.moveTo(0, artBottom + H * 0.02);
  ctx.quadraticCurveTo(W * 0.55, artBottom - H * 0.16, W, artBottom - H * 0.02);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = goldFoil(ctx, 0, artBottom - H * 0.1, W, H * 0.1);
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.beginPath();
  ctx.moveTo(0, artBottom + H * 0.02);
  ctx.quadraticCurveTo(W * 0.55, artBottom - H * 0.16, W, artBottom - H * 0.02);
  ctx.stroke();
  ctx.restore();
  paintScrim(ctx, { x: 0, y: 0, w: W, h: H * 0.2 }, { from: "top", strength: 0.55, spread: 1, color: theme.bgFrom });
  paintGrain(ctx, W, H, 53, theme.light ? 0.03 : 0.045);

  brandRow(scene, frame.safeTop + m * 0.32, { right: scene.copy.kicker });

  // Oversized index bleeding off the left edge, across the seam.
  ctx.save();
  ctx.globalAlpha = 0.95;
  drawIndex(ctx, "01", -W * 0.012, artBottom - H * 0.105, W * 0.26, theme, "left");
  ctx.restore();

  // Headline across the seam, right of the numeral.
  const colX = W * 0.27;
  const colW = W - colX - m;
  const top = artBottom - H * 0.005;
  const dotsY = H - frame.safeBottom - H * 0.07;
  const plan = fitStack(
    ctx,
    {
      ...stackBase(scene, colX, colW, "left"),
      maxHeadlineLines: 4,
      measure: W * 0.8,
      headlineSize: W * 0.066,
      minHeadlineSize: W * 0.034,
      subMaxLines: 2,
      ornament: false,
      kickerMode: "none",
      divider: true,
    },
    dotsY - H * 0.04 - top,
    0.5,
  );
  paintStack(ctx, plan, top, scene.reveal);

  drawPageDots(ctx, m, dotsY, 5, 0, theme, Math.max(4, W * 0.007), "left");
  drawSwipe(ctx, W - m, dotsY, Math.max(12, W * 0.02), theme, "right", "SWIPE");
  footerRow(scene, scene.copy.footer, { baselineFromBottom: H * 0.024 });
}

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

export function paintPosterTemplate(input: TemplateInput) {
  const frame = frameFor(input.W, input.H);
  const theme = themeFor(input.themeKey);
  const fonts = fontsFor(input.script);
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
    scriptFirst: false,
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
