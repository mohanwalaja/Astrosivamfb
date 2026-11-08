import type { StyleKey, ThemeKey } from "../types";
import { englishCopy, englishText } from "./englishCopy";
import {
  type ImageOptions,
  type ImageBox,
  accent,
  drawArtFallback,
  drawBullets,
  drawContactLine,
  drawCta,
  drawDiya,
  drawDoubleFrame,
  drawImageIn,
  drawLogoMark,
  drawMedallionRing,
  drawToran,
  fontsFor,
  frameFor,
  hairline,
  mutedOn,
  paintGrain,
  paintStyledGround,
  roundRect,
  styleMotif,
  themeFor,
  toBullets,
  tracked,
  withAlpha,
} from "./posterKit";
import { brandSize, brandSpot, drawGlobalLockup } from "./brandPlacement";
import { ensureFonts, loadImageSource, loadLogo } from "./canvas";
import { TypeLog, auditLegibility, LEGIBILITY_MINIMUMS, type TypedDraw, type TypeRole } from "./legibility";
import { ellipsize, lineHop, wrapAll as wrapAllShared } from "./typeset";

// Re-exported so existing imports keep working; the implementation lives in the
// shared module now that the Instagram renderer measures the same way.
export { auditLegibility, LEGIBILITY_MINIMUMS };
export type { TypeRole, TypedDraw, LegibilityAudit, LegibilityFinding } from "./legibility";

/**
 * Facebook-specific creatives.
 *
 * The Facebook Suite does not use the poster templates: a Page avatar is cropped
 * to a circle, a cover is cropped to 640 × 360 on phones, and a feed post has to
 * survive a 360 px column. Each of those constraints changes the composition, so
 * each category gets its own painter here — sharing the palette, the logo plate,
 * the type scale and the footer line, but not the grid.
 */

export type FbLayout = "profile-seal" | "cover-lockup" | "service-promo" | "educational" | "festival-greeting";

export interface FbLayoutMeta {
  key: FbLayout;
  name: string;
  category: string;
  purpose: string;
  width: number;
  height: number;
  /** Width the asset is actually seen at in the mobile feed. */
  mobileWidth: number;
  /**
   * Canvas px that remain visible in that mobile view. A cover is cropped, so its
   * effective scale is mobileWidth / 640 — not mobileWidth / 1640.
   */
  auditWidth: number;
  /** Meta's own display note, so the editor knows the crop before exporting. */
  cropNote: string;
  /** Circle or rectangle crop the platform applies. */
  crop: "circle" | "rect";
  safeArea?: { x: number; y: number; w: number; h: number; label: string };
}

export const FB_LAYOUTS: FbLayoutMeta[] = [
  {
    key: "profile-seal",
    name: "Profile seal",
    category: "Profile",
    purpose: "Page avatar that is still legible as a 40 px circle in comments.",
    width: 1080,
    height: 1080,
    mobileWidth: 176,
    auditWidth: 1080,
    crop: "circle",
    cropNote: "Facebook crops the avatar to a circle. All artwork sits inside the inner 70% circle.",
    safeArea: { x: 162, y: 162, w: 756, h: 756, label: "Inner 70% — visible circle" },
  },
  {
    key: "cover-lockup",
    name: "Cover lockup",
    category: "Cover",
    purpose: "Cover where the promise and the action survive the 640 × 360 mobile crop.",
    width: 1640,
    height: 624,
    mobileWidth: 360,
    auditWidth: 640,
    crop: "rect",
    cropNote: "Desktop shows 820 × 312; phones show the centre 640 × 360. Nothing important lives outside it.",
    safeArea: { x: 500, y: 132, w: 640, h: 360, label: "640 × 360 mobile crop" },
  },
  {
    key: "service-promo",
    name: "Service promotion",
    category: "Service",
    purpose: "Paid-ready service card: what it is, what it costs, what is delivered.",
    width: 1200,
    height: 1500,
    mobileWidth: 360,
    auditWidth: 1200,
    crop: "rect",
    cropNote: "4:5 feed portrait. Facebook shows the full frame in feed; the top edge is cropped in some placements.",
  },
  {
    key: "educational",
    name: "Educational post",
    category: "Education",
    purpose: "Teaching slide with three numbered points and no sales pressure.",
    width: 1080,
    height: 1350,
    mobileWidth: 360,
    auditWidth: 1080,
    crop: "rect",
    cropNote: "4:5 feed. Text stays above the 360 px mobile column's 11 px readability floor.",
  },
  {
    key: "festival-greeting",
    name: "Festival greeting",
    category: "Festival",
    purpose: "Greeting that leads with the blessing and keeps the brand to a footer.",
    width: 1200,
    height: 1200,
    mobileWidth: 360,
    auditWidth: 1200,
    crop: "rect",
    cropNote: "Square greeting. Tamil leads, English follows, brand sits in the footer band.",
  },
];

export const FB_LAYOUT_MAP: Record<FbLayout, FbLayoutMeta> = Object.fromEntries(
  FB_LAYOUTS.map((layout) => [layout.key, layout]),
) as Record<FbLayout, FbLayoutMeta>;

export interface FbContent {
  kicker: string;
  headline: string;
  subline: string;
  tamil: string;
  chips: string[];
  price: string;
  cta: string;
  footer: string;
}

export interface FbCreativeInput {
  layout: FbLayout;
  themeKey: ThemeKey;
  style: StyleKey;
  content: FbContent;
  art?: string | null;
  showSafeArea?: boolean;
  scale?: number;
}

export interface FbRender {
  canvas: HTMLCanvasElement;
  layout: FbLayoutMeta;
  typography: TypedDraw[];
  /** Copy decisions the painter had to make, e.g. an optional line it left off. */
  warnings: string[];
}

/* --------------------------------- shared -------------------------------- */

interface Scene {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  theme: ReturnType<typeof themeFor>;
  fonts: ReturnType<typeof fontsFor>;
  content: FbContent;
  art: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  log: TypeLog;
  style: StyleKey;
  /** Editor-only crop guide; suppressed on export. */
  showSafeArea: boolean;
  /** Copy decisions the painter had to make, surfaced to the editor. */
  warnings: string[];
}

const drawText = (
  scene: Scene,
  role: TypeRole,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  options: { align?: CanvasTextAlign; baseline?: CanvasTextBaseline; tracking?: number } = {},
) => {
  const { ctx } = scene;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = options.baseline ?? "top";
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 0);
  if (options.tracking) {
    tracked(ctx, text, x, y, options.tracking, options.align ?? "left");
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
  scene.log.add(role, size, text);
};

const px = (font: string) => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 0);

/**
 * Wrap by measured width, never dropping a word.
 *
 * The earlier version stopped at `maxLines` and silently discarded the rest —
 * "Ten poruthams, one honest answer." lost "answer." and still passed the
 * legibility audit, because the audit measures the type that was drawn. This
 * returns every line; `fitHeadline` then finds a size that fits the cap.
 */
function wrapAll(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  return wrapAllShared(ctx, text, width);
}

/** Chords that must stay together, so a fit never leaves an orphan word. */
function fitHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines: number,
  font: (size: number) => string,
  start: number,
  min: number,
): { size: number; lines: string[] } {
  let size = start;
  ctx.save();
  for (;;) {
    ctx.font = font(size);
    const lines = wrapAll(ctx, text, width);
    if (lines.length <= maxLines || size <= min) {
      ctx.restore();
      return { size, lines };
    }
    size = Math.max(min, size - Math.max(1, Math.round(start * 0.04)));
  }
}

function paintScene(scene: Scene, options: Parameters<typeof paintStyledGround>[4] = {}) {
  const { ctx, W, H, theme, style } = scene;
  paintStyledGround(ctx, frameFor(W, H), theme, style, options);
  paintGrain(ctx, W, H, 23, theme.light ? 0.025 : 0.035);
}

function drawArtCard(scene: Scene, box: ImageBox, options: ImageOptions = {}) {
  const { ctx, theme, art, style } = scene;
  if (art) {
    drawImageIn(ctx, art, box, {
      inset: 0.04,
      focusY: 0.36,
      radius: Math.min(box.w, box.h) * 0.03,
      outline: withAlpha(theme.gold, 0.55),
      outlineWidth: Math.max(1.5, box.w * 0.0035),
      vignette: 0.16,
      grade: theme.bgTo,
      gradeAlpha: 0.08,
      ...options,
    });
  } else {
    drawArtFallback(ctx, box, theme, styleMotif(style), 0.82);
  }
}

const footerLine = (scene: Scene, y: number) => {
  const { W, H, ctx, theme } = scene;
  hairline(ctx, W * 0.06, y - W * 0.015, W * 0.94, withAlpha(theme.gold, 0.32), Math.max(1, W * 0.0012));
  drawContactLine(ctx, W, H, theme, { y: y + W * 0.012, size: Math.max(11, W * 0.019) });
};

/* ----------------------------- 1 · profile seal -------------------------- */

function profileSeal(scene: Scene) {
  const { ctx, W, H, theme, content } = scene;
  const cx = W / 2;
  const cy = H / 2;

  paintScene(scene, { angle: "vertical", glowX: 0.5, glowY: 0.35, glow: 0.22 });

  // Brass ground behind the mark, clipped to the visible circle so the avatar
  // crop never reveals a hard edge.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, W * 0.5, 0, Math.PI * 2);
  ctx.clip();
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.46);
  halo.addColorStop(0, withAlpha(theme.gold, 0.3));
  halo.addColorStop(0.62, withAlpha(theme.gold, 0.08));
  halo.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Two rings: the outer is trimmed by the crop, the inner defines the safe area.
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.55);
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.beginPath();
  ctx.arc(cx, cy, W * 0.455, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(theme.gold, 0.28);
  ctx.lineWidth = Math.max(1, W * 0.0018);
  ctx.beginPath();
  ctx.arc(cx, cy, W * 0.375, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const plate = W * 0.24;
  drawLogoMark(ctx, scene.logo, {
    x: cx,
    y: cy - W * 0.235,
    size: plate,
    align: "center",
    theme,
    variant: "plate",
  });

  // Wordmark — sized so it is still readable when the avatar renders at 176 px.
  drawText(
    scene,
    "headline",
    "ASTRO SIVAM",
    cx,
    cy + W * 0.055,
    scene.fonts.display(W * 0.093, 600),
    withAlpha(theme.ink, 0.95),
    { align: "center", tracking: W * 0.006 },
  );
  drawText(
    scene,
    "kicker",
    "VEDIC ASTROLOGY",
    cx,
    cy + W * 0.172,
    scene.fonts.sans(W * 0.049, 600),
    accent(theme),
    { align: "center", tracking: W * 0.006 },
  );
  if (content.tamil.trim()) {
    // Fitted, not fixed: a Tamil greeting long enough to run past the ring was
    // drawn straight off the right edge at W * 0.068. Two lines are allowed and
    // the size steps down to the legibility floor before anything is clipped.
    const tamil = fitHeadline(ctx, content.tamil, W * 0.62, 2, (size) => scene.fonts.script(size), W * 0.068, W * 0.03);
    let ty = cy + W * 0.255;
    tamil.lines.forEach((line) => {
      drawText(scene, "body", line, cx, ty, scene.fonts.script(tamil.size), withAlpha(theme.ink, 0.9), { align: "center" });
      ty += lineHop(tamil.size, 1.24, line);
    });
  }

  /**
   * No lamps inside the seal. At 40 px — the size a comment avatar actually
   * renders — the flames collided with the Tamil descenders and read as grit.
   * The rings carry the ornament instead.
   */
}

/* ----------------------------- 2 · cover lockup -------------------------- */

function coverLockup(scene: Scene) {
  const { ctx, W, H, theme, content } = scene;
  const meta = FB_LAYOUT_MAP["cover-lockup"];
  const safe = meta.safeArea!;

  paintScene(scene, { angle: "horizontal", glowX: 0.5, glowY: 0.5, glow: 0.18 });
  drawToran(ctx, safe.x - 40, H * 0.06, safe.w + 80, theme, 15, theme.gold);

  /**
   * Wings: decoration only — anything that must be read lives in the safe box.
   * They are deliberately substantial (art panel right, service list left) so the
   * 1640 px desktop cover does not look like a small lockup on a large canvas.
   */
  ctx.save();
  const wingArt = { x: W - 296, y: H * 0.5 - 148, w: 252, h: 296 };
  ctx.globalAlpha = 0.5;
  if (scene.art) {
    drawImageIn(ctx, scene.art, wingArt, {
      inset: 0.03,
      shape: "arch",
      focusY: 0.34,
      outline: withAlpha(theme.gold, 0.6),
      outlineWidth: 2,
      vignette: 0.24,
      grade: theme.bgTo,
      gradeAlpha: 0.1,
    });
  } else {
    drawArtFallback(ctx, wingArt, theme, styleMotif(scene.style), 0.5, "arch");
  }
  ctx.restore();

  // Left wing: the three deliverables as a quiet column.
  const wingX = 118;
  let wingY = H * 0.5 - 96;
  scene.content.chips.slice(0, 3).forEach((chip) => {
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.gold, 0.65);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(wingX, wingY + 6);
    ctx.lineTo(wingX + 9, wingY + 15);
    ctx.lineTo(wingX + 23, wingY - 8);
    ctx.stroke();
    ctx.restore();
    drawText(scene, "desktop", chip, wingX + 34, wingY - 6, scene.fonts.sans(17, 500), withAlpha(theme.ink, 0.72));
    wingY += 46;
  });
  drawDiya(ctx, W - 296 + 126, H - 76, 56, theme, true);
  drawDiya(ctx, 132, H - 76, 56, theme);

  if (scene.showSafeArea) {
    ctx.save();
    ctx.setLineDash([14, 12]);
    ctx.strokeStyle = "rgba(120,220,190,0.72)";
    ctx.lineWidth = 3;
    ctx.strokeRect(safe.x, safe.y, safe.w, safe.h);
    ctx.restore();
  }

  // Lockup inside the mobile crop: plate, wordmark, promise, price, CTA.
  const padX = safe.x + 26;
  const plate = 104;
  const plateY = safe.y + 34;
  const coverSize = brandSize(plate);
  const coverSpot = brandSpot(W, H, coverSize, {
    pad: padX,
    topBand: plateY - plate * 0.3,
    bottomBand: H - safe.y - safe.h + 20,
  });
  drawGlobalLockup(ctx, scene.logo, {
    W,
    H,
    theme,
    baseSize: plate,
    pad: padX,
    topBand: plateY - plate * 0.3,
    bottomBand: H - safe.y - safe.h + 20,
  });

  // Promise — two measured lines, never a third and never a dropped word.
  const promise = fitHeadline(
    ctx,
    content.headline,
    safe.w - 52,
    2,
    (size) => scene.fonts.display(size, 500),
    34,
    22,
  );
  // The promise starts under the lockup when it sits on top, and at the top of
  // the crop when the studio setting parks the lockup at the foot.
  let cursor = coverSpot.y < H / 2 ? coverSpot.y + coverSize + 36 : safe.y + 24;
  promise.lines.forEach((line) => {
    drawText(scene, "headline", line, padX, cursor, scene.fonts.display(promise.size, 500), withAlpha(theme.ink, 0.9));
    cursor += lineHop(promise.size, 1.24, line);
  });

  // CTA on the lower baseline. Price cards are intentionally removed from
  // every poster; the space is left for the action alone.
  const chipY = safe.y + safe.h - 76;

  if (content.cta.trim()) {
    const size = 22;
    drawCta(ctx, {
      x: padX,
      y: chipY,
      align: "left",
      theme,
      label: content.cta.trim(),
      variant: "outline",
      size,
    });
    scene.log.add("cta", px(scene.fonts.sans(size, 600)), content.cta);
  }
}

/* ---------------------------- 3 · service promo ------------------------- */

function servicePromo(scene: Scene) {
  const { ctx, W, H, theme, content, style } = scene;
  paintScene(scene, { angle: "vertical", glowX: 0.18, glowY: 0.12, glow: 0.16 });

  // Header rule + kicker
  const bandH = H * 0.075;
  ctx.save();
  ctx.fillStyle = withAlpha(theme.gold, theme.light ? 0.9 : 0.14);
  ctx.fillRect(0, 0, W, bandH);
  ctx.restore();
  const bandSize = brandSize(bandH * 0.62);
  const bandLock = drawGlobalLockup(ctx, scene.logo, {
    W,
    H,
    theme,
    baseSize: bandH * 0.62,
    pad: W * 0.055,
    lockY: bandH / 2 - bandSize / 2,
  });
  const bandSpot = brandSpot(W, H, bandSize, { pad: W * 0.055, lockY: bandH / 2 - bandSize / 2 });
  drawText(
    scene,
    "kicker",
    (content.kicker || "Astro Sivam").toUpperCase(),
    bandSpot.align === "left" ? W * 0.055 + bandLock + W * 0.03 : W * 0.055,
    bandH / 2,
    scene.fonts.sans(W * 0.0285, 700),
    theme.light ? "#1B1206" : accent(theme),
    { baseline: "middle", tracking: W * 0.0034 },
  );

  // Art card right
  const cardW = W * 0.44;
  const cardH = Math.min(cardW * 1.18, H * 0.36);
  const card = { x: W - W * 0.055 - cardW, y: bandH + H * 0.06, w: cardW, h: cardH };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = W * 0.03;
  ctx.shadowOffsetY = W * 0.012;
  roundRect(ctx, card.x, card.y, card.w, card.h, W * 0.028);
  ctx.fillStyle = theme.bgTo;
  ctx.fill();
  ctx.restore();
  drawArtCard(scene, card);

  // Headline left — fitted, so a long headline shrinks instead of losing a word.
  const headWidth = W - W * 0.11 - cardW - W * 0.04;
  const head = fitHeadline(
    ctx,
    content.headline,
    headWidth,
    4,
    (size) => scene.fonts.display(size, 600),
    W * 0.075,
    W * 0.045,
  );
  let y = card.y + H * 0.01;
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, W * 0.055, y, scene.fonts.display(head.size, 600), withAlpha(theme.ink, 0.97));
    y += lineHop(head.size, 1.09, line);
  });

  // Deliverables — ticked list, then the CTA. Price cards are intentionally
  // removed from every poster, so the list starts directly under the headline.
  const chips = content.chips.length ? content.chips : toBullets(content.subline, 3);
  const listTop = y + H * 0.035;
  chips.slice(0, 3).forEach((chip, index) => {
    const rowY = listTop + index * H * 0.052;
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.gold, 0.8);
    ctx.lineWidth = Math.max(2, W * 0.0032);
    ctx.beginPath();
    ctx.moveTo(W * 0.058, rowY + W * 0.016);
    ctx.lineTo(W * 0.068, rowY + W * 0.026);
    ctx.lineTo(W * 0.084, rowY + W * 0.004);
    ctx.stroke();
    ctx.restore();
    drawText(
      scene,
      "body",
      chip,
      W * 0.1,
      rowY + W * 0.004,
      scene.fonts.sans(W * 0.0335, 500),
      mutedOn(theme, 0.92),
    );
  });

  if (content.subline.trim()) {
    const sub = fitHeadline(ctx, content.subline, W * 0.86, 2, (size) => scene.fonts.sans(size, 400), W * 0.0315, W * 0.024);
    const subTop = listTop + H * 0.17;
    sub.lines.forEach((line, index) => {
      drawText(scene, "body", line, W * 0.055, subTop + index * sub.size * 1.34, scene.fonts.sans(sub.size, 400), mutedOn(theme, 0.75));
    });
  }

  const ctaSize = W * 0.032;
  const ctaY = H - H * 0.16;
  if (content.cta.trim()) {
    drawCta(ctx, {
      x: W * 0.055,
      y: ctaY,
      align: "left",
      theme,
      label: content.cta.trim(),
      variant: "pill",
      size: ctaSize,
    });
    scene.log.add("cta", ctaSize, content.cta);
  }

  footerLine(scene, H - H * 0.05);
}

/* ---------------------------- 4 · educational --------------------------- */

function educational(scene: Scene) {
  const { ctx, W, H, theme, content } = scene;
  paintScene(scene, { angle: "vertical", glowX: 0.82, glowY: 0.08, glow: 0.1 });

  // Header bar
  const barH = H * 0.062;
  ctx.save();
  ctx.fillStyle = withAlpha(theme.ink, theme.light ? 0.05 : 0.06);
  ctx.fillRect(0, 0, W, barH);
  ctx.restore();
  hairline(ctx, 0, barH, W, withAlpha(theme.gold, 0.4), Math.max(1, W * 0.0012));
  const plate = W * 0.042;
  const barSize = brandSize(plate);
  const barLock = drawGlobalLockup(ctx, scene.logo, { W, H, theme, baseSize: plate, pad: W * 0.055, lockY: barH / 2 - barSize / 2 });
  const barSpot = brandSpot(W, H, barSize, { pad: W * 0.055, lockY: barH / 2 - barSize / 2 });
  drawText(
    scene,
    "kicker",
    "GUIDE",
    barSpot.align === "left" ? W * 0.055 + barLock + W * 0.014 : W * 0.055,
    barH / 2,
    scene.fonts.sans(W * 0.0255, 600),
    withAlpha(theme.ink, 0.8),
    { baseline: "middle", tracking: W * 0.0028 },
  );

  // Slide index chip
  ctx.save();
  const chipW = W * 0.09;
  const chipH = barH * 0.5;
  roundRect(ctx, W - W * 0.055 - chipW, barH / 2 - chipH / 2, chipW, chipH, chipH / 2);
  ctx.fillStyle = withAlpha(theme.gold, 0.14);
  ctx.fill();
  ctx.strokeStyle = withAlpha(theme.gold, 0.5);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.stroke();
  ctx.restore();
  drawText(
    scene,
    "kicker",
    // `slice(0, 12)` counts UTF-16 units: on Tamil copy it can land between a
    // consonant and its vowel sign and paint a dotted circle. Measure instead,
    // and cut on a cluster boundary.
    ellipsize(ctx, content.kicker || "01 / 03", chipW - W * 0.018, scene.fonts.sans(W * 0.0255, 600)),
    W - W * 0.055 - chipW / 2,
    barH / 2,
    scene.fonts.sans(W * 0.0255, 700),
    accent(theme),
    { align: "center", baseline: "middle" },
  );

  // Title + art inset
  const artSize = W * 0.3;
  const art = { x: W - W * 0.055 - artSize, y: barH + H * 0.045, w: artSize, h: artSize };
  drawArtCard(scene, art, { radius: artSize * 0.5 });

  const textW = W - W * 0.11 - artSize - W * 0.04;
  const title = fitHeadline(ctx, content.headline, textW, 4, (size) => scene.fonts.display(size, 600), W * 0.062, W * 0.038);
  let y = barH + H * 0.05;
  title.lines.forEach((line) => {
    drawText(scene, "headline", line, W * 0.055, y, scene.fonts.display(title.size, 600), withAlpha(theme.ink, 0.97));
    y += lineHop(title.size, 1.1, line);
  });

  /**
   * The Tamil line is pushed below the art inset when the title is short. Track
   * where it actually landed, not where `y` was, or the panel is drawn over its
   * descenders on exactly those posts.
   */
  let tamilBottom = y;
  const tamilSize = W * 0.032;
  if (content.tamil.trim()) {
    const tamilY = Math.max(y + 6, art.y + art.h + H * 0.02);
    const tamil = fitHeadline(ctx, content.tamil, textW, 2, (size) => scene.fonts.script(size), tamilSize, W * 0.022);
    let ty = tamilY;
    tamil.lines.forEach((line) => {
      drawText(scene, "body", line, W * 0.055, ty, scene.fonts.script(tamil.size), accent(theme));
      ty += lineHop(tamil.size, 1.24, line);
    });
    tamilBottom = ty;
    y = tamilBottom;
  }

  // Teaching panel
  const panelTop = Math.max(y + H * 0.03, art.y + art.h + H * 0.06, tamilBottom + H * 0.02);
  const footY = H - H * 0.055;
  const panelBottom = footY - H * 0.075;
  const points = toBullets(content.subline, 3);
  const pointSize = W * 0.0335;
  const naturalLead = pointSize * 2.5;
  const contentH = points.length * naturalLead + H * 0.05;
  /**
   * The panel breathes with its points instead of hugging them: a card that ends
   * a third of the way down the page leaves the call to action orphaned at the
   * foot. Capped at 1.8× the content height so a single-point post cannot become
   * a mostly-empty box, and the leading spreads to fill whatever that gives.
   */
  const panel = {
    x: W * 0.04,
    y: panelTop,
    w: W * 0.92,
    h: Math.min(panelBottom - panelTop, contentH * 1.8),
  };
  const lead = Math.min(Math.max(naturalLead, (panel.h - H * 0.05) / Math.max(1, points.length)), pointSize * 4);
  ctx.save();
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, W * 0.014);
  ctx.fillStyle = withAlpha(theme.ink, theme.light ? 0.04 : 0.06);
  ctx.fill();
  ctx.strokeStyle = withAlpha(theme.gold, 0.34);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.stroke();
  ctx.fillStyle = withAlpha(theme.gold, 0.75);
  ctx.fillRect(panel.x, panel.y + panel.h * 0.08, Math.max(2.5, W * 0.0035), panel.h * 0.84);
  ctx.restore();

  /**
   * Centre the block of points inside the card. Top-aligned points leave the
   * bottom third of the card empty, which reads as a missing paragraph.
   */
  const blockH = (points.length - 1) * lead + pointSize * 1.45;
  drawBullets(
    ctx,
    points,
    panel.x + W * 0.05,
    panel.y + Math.max(H * 0.032, (panel.h - blockH) / 2),
    panel.w - W * 0.1,
    pointSize,
    theme,
    scene.fonts,
    lead,
  );
  scene.log.add("body", pointSize, points.join(" · "));

  // Footer: CTA closes the panel rather than floating at the page edge.
  const ctaTop = Math.min(footY - W * 0.045, panel.y + panel.h + H * 0.05);
  hairline(ctx, W * 0.04, footY - H * 0.032, W * 0.96, withAlpha(theme.gold, 0.3), Math.max(1, W * 0.0012));
  if (content.cta.trim()) {
    drawCta(ctx, {
      x: W * 0.055,
      y: ctaTop,
      align: "left",
      theme,
      label: content.cta.trim(),
      variant: "text",
      size: W * 0.0325,
    });
    scene.log.add("cta", W * 0.0325, content.cta);
  }
  drawContactLine(ctx, W, H, theme, { y: H - H * 0.028, size: W * 0.02 });
}

/* -------------------------- 5 · festival greeting ----------------------- */

function festivalGreeting(scene: Scene) {
  const { ctx, W, H, theme, content, warnings } = scene;
  paintScene(scene, { angle: "vertical", glowX: 0.5, glowY: 0.2, glow: 0.22 });
  drawDoubleFrame(ctx, frameFor(W, H), theme, { inset: W * 0.028 });

  drawToran(ctx, W * 0.06, H * 0.055, W * 0.88, theme, 13, theme.gold);
  // Lockup follows the global placement; for top anchors it hangs below the toran.
  drawGlobalLockup(ctx, scene.logo, {
    W,
    H,
    theme,
    baseSize: W * 0.055,
    pad: W * 0.06,
    topBand: H * 0.115 - W * 0.055 * 0.3,
    bottomBand: H * 0.13,
  });

  // Greeting: Tamil first, then English, then the brand line.
  //
  // The type is laid out against the room above the footer rule *before* the
  // medallion is drawn, because the medallion is what gives way when the copy
  // is long. Scaling the text instead dropped the body under the 11 px mobile
  // floor; sizing the art to the copy keeps every line readable.
  //
  // `fitHeadline` never drops a word, so at its floor size a long subline can
  // return more lines than the two it was asked for. That block is optional on
  // a greeting card: if it cannot be set whole inside the room that is left, it
  // is left off (and reported) rather than printed over the footer.
  const cx = W / 2;
  const minRadius = W * 0.12;
  const maxRadius = W * 0.19;
  const toranY = H * 0.055;
  const cyFor = (value: number) => toranY + H * 0.075 + value;
  const footRule = H - H * 0.085 - H * 0.045;
  const greeterTopFor = (value: number) => cyFor(value) + value + H * 0.055;
  const budgetAt = (value: number) => footRule - H * 0.02 - greeterTopFor(value);

  type GreetingLine = { text: string; role: TypeRole; font: string; color: string; hop: number };
  const layoutGreeting = (withSubline: boolean) => {
    const lines: GreetingLine[] = [];
    let height = 0;
    if (content.tamil.trim()) {
      const tamil = fitHeadline(ctx, content.tamil, W * 0.78, 2, (size) => scene.fonts.script(size), W * 0.05, W * 0.034);
      tamil.lines.forEach((line) => {
        const hop = lineHop(tamil.size, 1.24, line);
        lines.push({ text: line, role: "headline", font: scene.fonts.script(tamil.size), color: withAlpha(theme.goldSoft, 0.98), hop });
        height += hop;
      });
      height += H * 0.008;
    }
    const blessing = fitHeadline(ctx, content.headline, W * 0.8, 3, (size) => scene.fonts.display(size, 600), W * 0.058, W * 0.04);
    blessing.lines.forEach((line) => {
      const hop = lineHop(blessing.size, 1.14, line);
      lines.push({ text: line, role: "headline", font: scene.fonts.display(blessing.size, 600), color: withAlpha(theme.ink, 0.97), hop });
      height += hop;
    });
    if (withSubline && content.subline.trim()) {
      const sub = fitHeadline(ctx, content.subline, W * 0.76, 2, (size) => scene.fonts.sans(size, 400), W * 0.0315, W * 0.024);
      const subHeight = sub.lines.reduce((sum, line) => sum + lineHop(sub.size, 1.34, line), 0);
      if (height + H * 0.012 + subHeight <= budgetAt(minRadius)) {
        height += H * 0.012;
        sub.lines.forEach((line, index) => {
          const hop = lineHop(sub.size, 1.34, line);
          lines.push({ text: line, role: "body", font: scene.fonts.sans(sub.size, 400), color: mutedOn(theme, 0.9), hop: index === 0 ? hop + H * 0.012 : hop });
          height += hop + (index === 0 ? H * 0.012 : 0);
        });
      }
    }
    return { lines, height };
  };

  let greeting = layoutGreeting(true);
  const hasSubline = greeting.lines.some((line) => line.role === "body");
  if (!hasSubline && content.subline.trim()) warnings.push("Festival greeting: the supporting line did not fit and was left off this card.");
  // Largest medallion whose room still holds the block; two units of greeting
  // top per unit of radius, so each step of radius buys twice the height.
  let radius = maxRadius;
  while (radius > minRadius && budgetAt(radius) < greeting.height) radius -= W * 0.004;
  radius = Math.max(minRadius, radius);
  greeting = layoutGreeting(hasSubline);

  const cy = cyFor(radius);
  drawMedallionRing(ctx, cx, cy, radius * 1.1, theme, 26);
  const medallion = { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 };
  if (scene.art) {
    drawImageIn(ctx, scene.art, medallion, {
      inset: 0.04,
      shape: "circle",
      focusY: 0.34,
      outline: withAlpha(theme.gold, 0.9),
      outlineWidth: Math.max(2, W * 0.0035),
      vignette: 0.18,
      grade: theme.bgTo,
      gradeAlpha: 0.06,
    });
  } else {
    drawArtFallback(ctx, medallion, theme, styleMotif(scene.style), 0.86, "circle");
  }
  drawDiya(ctx, cx - radius * 1.9, cy + radius * 0.6, W * 0.05, theme);
  drawDiya(ctx, cx + radius * 1.9, cy + radius * 0.6, W * 0.05, theme, true);

  let gy = greeterTopFor(radius);
  greeting.lines.forEach((line) => {
    drawText(scene, line.role, line.text, cx, gy, line.font, line.color, { align: "center" });
    gy += line.hop;
  });

  // Footer band: brand left, site right, rules closing the page.
  const footY = H - H * 0.085;
  hairline(ctx, W * 0.1, footY - H * 0.045, W * 0.9, withAlpha(theme.gold, 0.34), Math.max(1, W * 0.0012));
  drawContactLine(ctx, W, H, theme, { y: footY, size: W * 0.021 });
}

const PAINTERS: Record<FbLayout, (scene: Scene) => void> = {
  "profile-seal": profileSeal,
  "cover-lockup": coverLockup,
  "service-promo": servicePromo,
  educational,
  "festival-greeting": festivalGreeting,
};

/* --------------------------------- render -------------------------------- */

export async function renderFbCreative(input: FbCreativeInput): Promise<FbRender> {
  input = { ...input, content: englishCopy(input.content) };
  // Fonts must be resident before the first measurement: `fitLines` and
  // `measureText` are what decide the size, and a face that arrives late makes
  // every wrapped line the wrong length — which shows up as overflow in export.
  await ensureFonts();
  const meta = FB_LAYOUT_MAP[input.layout] ?? FB_LAYOUT_MAP["service-promo"];
  const scale = input.scale ?? 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(meta.width * scale);
  canvas.height = Math.round(meta.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot render the creative.");
  if (scale !== 1) ctx.scale(scale, scale);

  const theme = themeFor(input.themeKey);
  const logo = await loadLogo().catch(() => null);
  const art = input.art ? await loadImageSource(input.art).catch(() => null) : null;
  const log = new TypeLog();
  const warnings: string[] = [];

  const scene: Scene = {
    ctx,
    W: meta.width,
    H: meta.height,
    theme,
    fonts: fontsFor("classic"),
    content: input.content,
    art,
    logo,
    log,
    style: input.style,
    showSafeArea: false,
    warnings,
  };
  (PAINTERS[meta.key] ?? servicePromo)(scene);

  // Safe-area overlay is an editor aid only; it must never reach an export.
  if (input.showSafeArea && meta.safeArea) {
    const { x, y, w, h, label } = meta.safeArea;
    ctx.save();
    ctx.setLineDash([meta.width * 0.012, meta.width * 0.01]);
    ctx.strokeStyle = "rgba(120,220,190,0.75)";
    ctx.lineWidth = Math.max(2, meta.width * 0.0022);
    if (meta.crop === "circle") {
      ctx.beginPath();
      ctx.arc(meta.width / 2, meta.height / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.stroke();
    ctx.restore();
    void label;
  }

  return { canvas, layout: meta, typography: log.entries, warnings };
}
