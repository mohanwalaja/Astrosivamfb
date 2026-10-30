import type { StyleKey, Theme, ThemeKey } from "../types";
import { drawGlyphSafe, drawMotif, ensureFonts, loadImageSource, loadLogo, needsFallback } from "./canvas";
import { TypeLog, type TypedDraw, type TypeRole } from "./legibility";
import {
  type CtaOptions,
  type FontSet,
  type ImageBox,
  accent,
  drawCta,
  drawDoubleFrame,
  drawImageIn,
  drawIndex,
  drawPrice,
  fontsFor,
  frameFor,
  hairline,
  measurePrice,
  mutedOn,
  paintGrain,
  paintStyledGround,
  roundRect,
  themeFor,
  tracked,
  withAlpha,
} from "./posterKit";
import { drawGlobalLockup } from "./brandPlacement";
import { ellipsize, fitLines, fontPx as px, lineHop, wrapAll } from "./typeset";
import { BRAND } from "../data/brand";

/* ==========================================================================
   Service advertising system
   ==========================================================================
   Eight compositions — six that sell, two that teach — drawn from one type
   scale, one palette and one set of margins.

   The split is structural, not editorial:

     role "ad"   — sells one report. Carries the verified price from the
                   service record, one action, and facts traceable to that
                   record.
     role "edu"  — explains one idea. Carries no price, no action and no offer;
                   the copy is the service's own explainer, with its source
                   printed on the plate.

   Nothing here invents a price, a testimonial, a guarantee or an outcome.
   Prices arrive from `Service.price`; the rest is either authored positioning
   or quoted from the service data, and `tests/service-ads.test.ts` checks that.

   Layout rules that matter:
   — One secondary script at a time. Tamil and Hindi never stack; the reader
     picked a language, so only that language appears.
   — Every block is measured before the next one is placed, and every block is
     given a hard floor. Nothing is placed at a fixed height that a long line
     could collide with.
   — The price shrinks to fit its column rather than bleeding into artwork.
   ========================================================================== */

export type AdLayout =
  | "ad-plate"
  | "ad-split"
  | "ad-checklist"
  | "ad-duo"
  | "ad-band"
  | "ad-statement"
  | "edu-guide"
  | "edu-step";

export type AdRole = "ad" | "edu";

export interface AdLayoutMeta {
  key: AdLayout;
  name: string;
  role: AdRole;
  /** What the composition is for, in one line. */
  purpose: string;
  /** Where it earns its keep in a campaign. */
  bestFor: string;
  width: number;
  height: number;
  /** Width the plate is actually seen at on a phone, in CSS px. */
  mobileWidth: number;
  auditWidth: number;
}

const FEED = { width: 1080, height: 1350, mobileWidth: 360, auditWidth: 1080 };
const SQUARE = { width: 1080, height: 1080, mobileWidth: 360, auditWidth: 1080 };

export const AD_LAYOUTS: AdLayoutMeta[] = [
  {
    key: "ad-plate",
    name: "Gallery plate",
    role: "ad",
    purpose: "A full-height portrait beside a measured type column, price on a plate.",
    bestFor: "The flagship report; paid boosts; the pinned post.",
    ...FEED,
  },
  {
    key: "ad-split",
    name: "Split editorial",
    role: "ad",
    purpose: "Type above, art below, the action sitting on the photograph.",
    bestFor: "A campaign opening, where the headline has to do the work.",
    ...FEED,
  },
  {
    key: "ad-checklist",
    name: "What arrives",
    role: "ad",
    purpose: "A numbered list of what the report contains, with the proof at the foot.",
    bestFor: "Retargeting people who have already read the headline.",
    ...FEED,
  },
  {
    key: "ad-duo",
    name: "Twin portrait",
    role: "ad",
    purpose: "An arched portrait and a right-aligned column split by a gold spine.",
    bestFor: "Two-chart readings and anything about a partnership.",
    ...FEED,
  },
  {
    key: "ad-band",
    name: "Gold band",
    role: "ad",
    purpose: "The headline set in ink on a solid gold band over full-bleed art.",
    bestFor: "Feed interruption; the most legible of the six at thumb size.",
    ...FEED,
  },
  {
    key: "ad-statement",
    name: "Statement",
    role: "ad",
    purpose: "No photograph at all — type, motif watermark and three facts on a rule.",
    bestFor: "Carousels and paid placements where every competitor has a deity.",
    ...FEED,
  },
  {
    key: "edu-guide",
    name: "Reference card",
    role: "edu",
    purpose: "One teaching idea with its explanation and a printed source.",
    bestFor: "Saves; the frame that makes the next ad believable.",
    ...SQUARE,
  },
  {
    key: "edu-step",
    name: "Numbered step",
    role: "edu",
    purpose: "A single step from a service's own explainer, set large.",
    bestFor: "Carousel bodies and story sequences.",
    ...SQUARE,
  },
];

export const AD_LAYOUT_MAP: Record<AdLayout, AdLayoutMeta> = Object.fromEntries(
  AD_LAYOUTS.map((layout) => [layout.key, layout]),
) as Record<AdLayout, AdLayoutMeta>;

/** Only the advertising compositions. Used by the copy tests. */
export const AD_ONLY_LAYOUTS = AD_LAYOUTS.filter((layout) => layout.role === "ad");
export const EDU_ONLY_LAYOUTS = AD_LAYOUTS.filter((layout) => layout.role === "edu");

export type AdLang = "en" | "ta" | "hi";

export interface AdCopy {
  kicker: string;
  headline: string;
  subline: string;
  /** A verb-first action. The URL is printed from the service record. */
  cta: string;
  /** Two to four short facts, each traceable to the service record. */
  facts: string[];
  /** Secondary-script lines, drawn one at a time when switched on. */
  tamil?: string;
  hindi?: string;
  /** Reference plates only. */
  step?: string;
  body?: string;
  source?: string;
}

export interface ServiceAdInput {
  layout: AdLayout;
  theme: ThemeKey;
  style: StyleKey;
  copy: AdCopy;
  lang?: AdLang;
  /** Verified price string from the service record. Ignored by reference plates. */
  price?: string;
  /** Landing URL from the service record, printed under the action. */
  url?: string;
  /** Service motif, used by the reference plates. */
  motif?: Parameters<typeof drawMotif>[1];
  art?: string | null;
  scale?: number;
}

export interface ServiceAdRender {
  canvas: HTMLCanvasElement;
  layout: AdLayoutMeta;
  typography: TypedDraw[];
}

/* -------------------------------- scene ---------------------------------- */

interface ScriptLine {
  text: string;
  font: string;
  fallback: string;
}

interface Scene {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  theme: Theme;
  fonts: FontSet;
  copy: AdCopy;
  price: string;
  url: string;
  art: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  log: TypeLog;
  style: StyleKey;
  motif: Parameters<typeof drawMotif>[1];
  script: ScriptLine | null;
  isAd: boolean;
}

/* One type scale for the whole system, as fractions of the plate width. Chosen
   so nothing falls under the legibility floor at a 360 px phone width:
   0.0315 ≈ 11 px body · 0.0345 ≈ 12.4 px action · 0.046 ≈ 16.6 px price. */
const S = {
  kicker: 0.0265,
  label: 0.026,
  footer: 0.0245,
  url: 0.0245,
  body: 0.034,
  bodyMin: 0.0315,
  price: 0.05,
  priceMin: 0.046,
  cta: 0.0345,
  script: 0.036,
} as const;

const drawText = (
  scene: Scene,
  role: TypeRole,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  options: { align?: CanvasTextAlign; baseline?: CanvasTextBaseline; tracking?: number; maxWidth?: number } = {},
) => {
  const { ctx } = scene;
  if (!text.trim()) return;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = options.baseline ?? "top";
  if (options.tracking) tracked(ctx, text, x, y, options.tracking, options.align ?? "left");
  else ctx.fillText(text, x, y, options.maxWidth);
  ctx.restore();
  scene.log.add(role, px(font), text);
};

/** Mixed-script text: punctuation falls back per run instead of drawing a box. */
const drawScript = (
  scene: Scene,
  text: string,
  x: number,
  y: number,
  font: string,
  fallback: string,
  color: string,
  align: CanvasTextAlign,
) => {
  const { ctx } = scene;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  // Indic shaping is done by the face; only fall back when a character is
  // genuinely missing, because splitting a shaped run moves the marks.
  if (needsFallback(font, text)) {
    drawGlyphSafe(ctx, text, { x, y, font, fallbackFont: fallback, align, baseline: "top" });
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
  scene.log.add("body", px(font), text);
};

const ground = (scene: Scene, options: Parameters<typeof paintStyledGround>[4] = {}) => {
  paintStyledGround(scene.ctx, frameFor(scene.W, scene.H), scene.theme, scene.style, options);
  paintGrain(scene.ctx, scene.W, scene.H, 41, scene.theme.light ? 0.022 : 0.032);
};

const GAP = {
  /** Between a headline and the script line under it. */
  script: 0.018,
  /** Between the script line and the body. */
  body: 0.012,
};

function headlineBlock(
  scene: Scene,
  options: { x: number; y: number; width: number; maxLines: number; start: number; min: number; align?: CanvasTextAlign; color?: string },
): number {
  const { ctx } = scene;
  const align = options.align ?? "left";
  const fitted = fitLines(ctx, scene.copy.headline, options.width, options.maxLines, (size) => scene.fonts.display(size, 600), options.start, options.min);
  fitted.lines.forEach((line, index) => {
    drawText(scene, "headline", line, options.x, options.y + index * fitted.size * 1.045, scene.fonts.display(fitted.size, 600), options.color ?? withAlpha(scene.theme.ink, 0.97), { align });
  });
  return options.y + fitted.lines.length * fitted.size * 1.045;
}

function scriptBlock(scene: Scene, x: number, y: number, width: number, align: CanvasTextAlign = "left"): number {
  const line = scene.script;
  if (!line) return y;
  const family = (size: number) => line.font.replace(/[\d.]+px/, `${size}px`);
  const fitted = fitLines(scene.ctx, line.text, width, 2, family, px(line.font), px(line.font) * 0.87);
  fitted.lines.forEach((text, index) => {
    const size = fitted.size;
    drawScript(scene, text, x, y + index * size * 1.32, family(size), line.fallback.replace(/[\d.]+px/, `${size}px`), accent(scene.theme), align);
  });
  return y + fitted.lines.length * fitted.size * 1.32;
}

/** Body copy that shrinks to the room it is actually given, never past a floor. */
function bodyBlock(
  scene: Scene,
  options: { x: number; y: number; width: number; limit: number; align?: CanvasTextAlign; maxLines?: number; start?: number },
): number {
  const { ctx } = scene;
  const text = scene.copy.subline;
  if (!text.trim() || options.limit - options.y < 20) return options.y;
  const start = options.start ?? S.body * scene.W;
  const ability = Math.max(1, Math.floor((options.limit - options.y) / (start * 1.44)));
  const maxLines = Math.max(1, Math.min(options.maxLines ?? 3, ability));
  const fitted = fitLines(ctx, text, options.width, maxLines, (size) => scene.fonts.sans(size, 400), start, S.bodyMin * scene.W, true);
  fitted.lines.forEach((line, index) => {
    drawText(scene, "body", line, options.x, options.y + index * fitted.size * 1.44, scene.fonts.sans(fitted.size, 400), mutedOn(scene.theme, 0.9), { align: options.align ?? "left" });
  });
  return options.y + fitted.lines.length * fitted.size * 1.44;
}

const priceLabel = (scene: Scene) => (/^free/i.test(scene.price.trim()) ? "" : "FROM");

function priceBlock(
  scene: Scene,
  options: { x: number; y: number; size: number; maxWidth: number; align?: CanvasTextAlign; labelY?: number; color?: string },
) {
  if (!scene.isAd || !scene.price.trim()) return;
  const { ctx } = scene;
  const align = options.align ?? "left";
  const label = priceLabel(scene);
  if (label && options.labelY !== undefined) {
    drawText(scene, "kicker", label, options.x, options.labelY, scene.fonts.sans(scene.W * S.label, 700), withAlpha(scene.theme.ink, 0.55), {
      align,
      tracking: scene.W * 0.004,
    });
  }
  let size = options.size;
  const tracking = size * 0.01;
  while (size > options.size * 0.72 && measurePrice(ctx, scene.price, scene.fonts.display(size, 600), tracking) > options.maxWidth) size -= 1;
  ctx.save();
  ctx.fillStyle = options.color ?? withAlpha(scene.theme.ink, 0.97);
  drawPrice(ctx, scene.price, { x: options.x, y: options.y, font: scene.fonts.display(size, 600), tracking, align });
  ctx.restore();
  scene.log.add("headline", size, scene.price);
}

const ctaBlock = (
  scene: Scene,
  options: Omit<CtaOptions, "theme" | "label"> & { label?: string; maxWidth?: number },
) => {
  if (!scene.isAd) return { width: 0, height: 0 };
  const label = options.label ?? scene.copy.cta;
  if (!label.trim()) return { width: 0, height: 0 };
  const box = drawCta(scene.ctx, { ...options, theme: scene.theme, label });
  scene.log.add("cta", options.size ?? 20, label);
  void options.maxWidth;
  return box;
};

const urlLine = (scene: Scene, x: number, y: number, align: CanvasTextAlign = "left", color?: string) => {
  if (!scene.isAd || !scene.url) return;
  drawText(scene, "footer", scene.url, x, y, scene.fonts.sans(scene.W * S.url, 600), color ?? withAlpha(scene.theme.gold, 0.95), {
    align,
    tracking: scene.W * 0.0026,
  });
};

const footerLine = (scene: Scene, x: number, y: number, align: CanvasTextAlign = "left", color?: string) => {
  drawText(scene, "footer", `${BRAND.website} · Email: ${BRAND.email}`, x, y, scene.fonts.sans(scene.W * S.footer, 500), color ?? withAlpha(scene.theme.ink, 0.62), { align });
};

/** Vertical rule. `hairline` only draws across, so the spines need their own. */
const vrule = (ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, color: string, width = 1) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.restore();
};

// The seal follows the studio-wide lockup placement and scale.
const seal = (scene: Scene, x: number, y: number, size: number): number =>
  drawGlobalLockup(scene.ctx, scene.logo, {
    W: scene.W,
    H: scene.H,
    theme: scene.theme,
    baseSize: size,
    pad: x,
    topBand: y - size * 0.3,
    bottomBand: scene.H * 0.08,
  });

/* ------------------------------ 1 · gallery plate ------------------------ */

function adPlate(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  ground(scene, { angle: "diagonal", glowX: 0.2, glowY: 0.18, glow: 0.18 });

  // Portrait first: an arch that stops short of the page edge, so the plate
  // reads as a hung picture rather than a bleed.
  const artX = W * 0.5;
  const artBox: ImageBox = { x: artX + W * 0.035, y: H * 0.075, w: W - artX - W * 0.06, h: H * 0.85 };
  if (scene.art) {
    drawImageIn(ctx, scene.art, artBox, {
      inset: 0,
      shape: "arch",
      focusY: 0.34,
      vignette: 0.22,
      outline: withAlpha(theme.gold, 0.55),
      outlineWidth: Math.max(2, W * 0.0022),
    });
  } else {
    drawMotif(ctx, scene.motif, artBox.x + artBox.w / 2, artBox.y + artBox.h / 2, artBox.w * 0.62, theme, 0.5);
  }

  vrule(ctx, artX - W * 0.018, H * 0.075, H * 0.925, withAlpha(theme.gold, 0.3), Math.max(1.5, W * 0.0016));

  const pad = W * 0.075;
  const colW = artX - pad - W * 0.045;
  seal(scene, pad, H * 0.062, W * 0.086);
  drawText(scene, "kicker", copy.kicker.toUpperCase(), pad, H * 0.062 + W * 0.104, fonts.sans(W * S.kicker, 700), accent(theme), {
    tracking: W * 0.0042,
  });

  let y = H * 0.2;
  y = headlineBlock(scene, { x: pad, y, width: colW, maxLines: 3, start: W * 0.078, min: W * 0.05 });
  if (scene.script) y = scriptBlock(scene, pad, y + H * GAP.script, colW) + H * GAP.body;
  y = bodyBlock(scene, { x: pad, y, width: colW, limit: H * 0.625, maxLines: 3 });

  // Price plate: a hairline box, pinned to a fixed height so it can never be
  // overrun by a long line above it.
  const plateTop = H * 0.66;
  const plateH = H * 0.205;
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.45);
  ctx.lineWidth = Math.max(1.5, W * 0.0018);
  roundRect(ctx, pad - W * 0.018, plateTop, colW + W * 0.036, plateH, W * 0.018);
  ctx.stroke();
  ctx.restore();
  drawText(scene, "kicker", "THE REPORT", pad, plateTop + H * 0.022, fonts.sans(W * S.label, 700), withAlpha(theme.ink, 0.58), {
    tracking: W * 0.004,
  });
  priceBlock(scene, { x: pad, y: plateTop + H * 0.098, size: W * S.price, maxWidth: colW + W * 0.02 });
  ctaBlock(scene, { x: pad, y: plateTop + plateH - H * 0.078, align: "left", variant: "pill", size: W * S.cta });
  urlLine(scene, pad, H * 0.932);
  footerLine(scene, pad, H * 0.972);
}

/* ------------------------------ 2 · split editorial ---------------------- */

function adSplit(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  const splitY = H * 0.6;
  ctx.save();
  ctx.fillStyle = theme.light ? "#FBF5E9" : "#150E10";
  ctx.fillRect(0, 0, W, splitY);
  ctx.restore();
  paintStyledGround(ctx, frameFor(W, H), theme, scene.style, { angle: "vertical", glowX: 0.24, glowY: 0.1, glow: 0.1 });

  if (scene.art) {
    drawImageIn(ctx, scene.art, { x: 0, y: splitY, w: W, h: H - splitY }, { inset: 0, focusY: 0.32, vignette: 0.3, grade: theme.bgFrom, gradeAlpha: 0.28 });
  } else {
    ctx.save();
    ctx.fillStyle = withAlpha(theme.bgFrom, 0.9);
    ctx.fillRect(0, splitY, W, H - splitY);
    ctx.restore();
    drawMotif(ctx, scene.motif, W / 2, splitY + (H - splitY) / 2, W * 0.4, theme, 0.55);
  }
  const scrim = ctx.createLinearGradient(0, splitY, 0, H);
  scrim.addColorStop(0, withAlpha(theme.bgFrom, 0.72));
  scrim.addColorStop(0.32, withAlpha(theme.bgFrom, 0.1));
  scrim.addColorStop(0.78, withAlpha(theme.bgFrom, 0.6));
  scrim.addColorStop(1, withAlpha(theme.bgFrom, 0.92));
  ctx.save();
  ctx.fillStyle = scrim;
  ctx.fillRect(0, splitY, W, H - splitY);
  ctx.restore();
  hairline(ctx, 0, splitY, W, withAlpha(theme.gold, 0.55), Math.max(2, W * 0.0022));

  const pad = W * 0.075;
  const sealWidth = seal(scene, pad, H * 0.055, W * 0.075);
  drawText(scene, "kicker", copy.kicker.toUpperCase(), pad + sealWidth + W * 0.03, H * 0.072, fonts.sans(W * S.kicker, 700), accent(theme), {
    tracking: W * 0.0042,
  });

  let y = H * 0.168;
  y = headlineBlock(scene, { x: pad, y, width: W - pad * 2, maxLines: 3, start: W * 0.088, min: W * 0.058 });
  if (scene.script) y = scriptBlock(scene, pad, y + H * GAP.script, W * 0.8) + H * GAP.body;
  y = bodyBlock(scene, { x: pad, y, width: W * 0.74, limit: H * 0.572, maxLines: 2 });

  // The action sits on the photograph; the price sits opposite it.
  ctaBlock(scene, { x: pad, y: H - H * 0.185, align: "left", variant: "pill", size: W * S.cta });
  priceBlock(scene, {
    x: W - pad,
    y: H * 0.868,
    labelY: H * 0.803,
    size: W * S.priceMin,
    maxWidth: W * 0.42,
    align: "right",
  });
  drawText(scene, "footer", scene.url, W - pad, H * 0.925, fonts.sans(W * S.url, 600), withAlpha(theme.goldSoft, 0.95), {
    align: "right",
    tracking: W * 0.0022,
  });
  footerLine(scene, pad, H * 0.965, "left", withAlpha(theme.ink, 0.74));
}

/* ------------------------------ 3 · what arrives ------------------------- */

function adChecklist(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  ground(scene, { angle: "vertical", glowX: 0.78, glowY: 0.12, glow: 0.14 });

  const pad = W * 0.075;
  const artSize = W * 0.26;
  if (scene.art) {
    drawImageIn(ctx, scene.art, { x: W - pad - artSize, y: H * 0.075, w: artSize, h: artSize }, {
      inset: 0.02,
      shape: "circle",
      focusY: 0.33,
      outline: withAlpha(theme.gold, 0.5),
      outlineWidth: Math.max(2, W * 0.002),
      vignette: 0.2,
    });
  }
  seal(scene, pad, H * 0.07, W * 0.07);
  drawText(scene, "kicker", copy.kicker.toUpperCase(), pad, H * 0.152, fonts.sans(W * S.kicker, 700), accent(theme), { tracking: W * 0.0042 });
  hairline(ctx, pad, H * 0.198, W - pad, withAlpha(theme.gold, 0.35), Math.max(1.5, W * 0.0018));

  let y = H * 0.23;
  y = headlineBlock(scene, { x: pad, y, width: W - pad * 2 - artSize * 0.55, maxLines: 2, start: W * 0.072, min: W * 0.05 });
  if (scene.script) y = scriptBlock(scene, pad, y + H * GAP.script, W * 0.62);

  const listTop = Math.max(y + H * 0.035, H * 0.37);
  const listBottom = H * 0.7;
  const rowH = Math.min(H * 0.082, (listBottom - listTop) / Math.max(1, copy.facts.length));
  copy.facts.forEach((fact, index) => {
    const rowY = listTop + index * rowH;
    drawText(scene, "kicker", String(index + 1).padStart(2, "0"), pad, rowY, fonts.display(W * 0.032, 700), withAlpha(theme.gold, 0.9));
    const textW = W - pad * 2 - W * 0.11;
    const size = Math.max(W * S.bodyMin, Math.min(W * S.body, rowH * 0.42));
    drawText(scene, "body", fact, pad + W * 0.085, rowY + W * 0.004, fonts.sans(size, 500), withAlpha(theme.ink, 0.9), { maxWidth: textW });
    if (index < copy.facts.length - 1) hairline(ctx, pad, rowY + rowH * 0.76, W - pad, withAlpha(theme.gold, 0.18), 1.2);
  });

  hairline(ctx, pad, H * 0.72, W - pad, withAlpha(theme.gold, 0.4), Math.max(1.5, W * 0.0018));
  drawText(scene, "kicker", "THE REPORT", pad, H * 0.742, fonts.sans(W * S.label, 700), withAlpha(theme.ink, 0.58), {
    tracking: W * 0.004,
  });
  priceBlock(scene, { x: pad, y: H * 0.808, size: W * S.price, maxWidth: W - pad * 2 });
  ctaBlock(scene, { x: pad, y: H * 0.828, align: "left", variant: "pill", size: W * S.cta });
  urlLine(scene, W - pad, H * 0.93, "right");
  footerLine(scene, pad, H - H * 0.035);
}

/* ------------------------------ 4 · twin portrait ------------------------ */

function adDuo(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  ground(scene, { angle: "horizontal", glowX: 0.85, glowY: 0.15, glow: 0.12 });

  const artW = W * 0.43;
  const box: ImageBox = { x: W * 0.055, y: H * 0.07, w: artW, h: H * 0.86 };
  if (scene.art) {
    drawImageIn(ctx, scene.art, box, {
      inset: 0,
      shape: "arch",
      focusY: 0.32,
      vignette: 0.24,
      outline: withAlpha(theme.gold, 0.5),
      outlineWidth: Math.max(2, W * 0.002),
    });
  } else {
    drawMotif(ctx, scene.motif, box.x + box.w / 2, box.y + box.h / 2, box.w * 0.6, theme, 0.5);
  }

  // Gold spine with three diamonds — the rail that stops the two halves merging.
  const spineX = W * 0.545;
  vrule(ctx, spineX, H * 0.07, H * 0.93, withAlpha(theme.gold, 0.4), Math.max(1.5, W * 0.0016));
  ctx.save();
  ctx.fillStyle = withAlpha(theme.gold, 0.85);
  [0.32, 0.5, 0.68].forEach((at) => {
    const cy = H * at;
    ctx.beginPath();
    ctx.moveTo(spineX, cy - W * 0.008);
    ctx.lineTo(spineX + W * 0.008, cy);
    ctx.lineTo(spineX, cy + W * 0.008);
    ctx.lineTo(spineX - W * 0.008, cy);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  const right = W - W * 0.075;
  const colW = right - spineX - W * 0.05;
  drawText(scene, "kicker", copy.kicker.toUpperCase(), right, H * 0.085, fonts.sans(W * S.kicker, 700), accent(theme), {
    align: "right",
    tracking: W * 0.004,
  });

  let y = H * 0.15;
  y = headlineBlock(scene, { x: right, y, width: colW, maxLines: 3, start: W * 0.068, min: W * 0.046, align: "right" });
  if (scene.script) y = scriptBlock(scene, right, y + H * GAP.script, colW, "right") + H * GAP.body;
  y = bodyBlock(scene, { x: right, y, width: colW, limit: H * 0.56, maxLines: 4, align: "right" });

  // Facts as a right-aligned stack with gold bullets, starting below the body.
  let factY = Math.max(y + H * 0.028, H * 0.6);
  copy.facts.slice(0, 2).forEach((fact) => {
    const size = Math.max(W * S.bodyMin, Math.min(W * S.body, (H * 0.68 - factY) / 1.9));
    drawText(scene, "body", fact, right, factY, fonts.sans(size, 500), withAlpha(theme.ink, 0.84), { align: "right", maxWidth: colW });
    ctx.save();
    ctx.fillStyle = withAlpha(theme.gold, 0.9);
    ctx.beginPath();
    ctx.arc(right - colW - W * 0.005, factY + size * 0.45, W * 0.005, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    factY += size * 1.75;
  });

  priceBlock(scene, { x: right, y: H * 0.795, labelY: H * 0.742, size: W * S.price, maxWidth: colW, align: "right" });
  ctaBlock(scene, { x: right, y: H * 0.822, align: "right", variant: "text", size: W * S.cta });
  urlLine(scene, right, H * 0.932, "right");
}

/* -------------------------------- 5 · gold band -------------------------- */

function adBand(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  if (scene.art) {
    drawImageIn(ctx, scene.art, { x: 0, y: 0, w: W, h: H }, { inset: 0, focusY: 0.3, vignette: 0.3, grade: theme.bgFrom, gradeAlpha: 0.16 });
  } else {
    ground(scene, { angle: "vertical", glowX: 0.5, glowY: 0.3, glow: 0.2 });
  }
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, withAlpha(theme.bgFrom, 0.9));
  veil.addColorStop(0.26, withAlpha(theme.bgFrom, 0.24));
  veil.addColorStop(0.6, withAlpha(theme.bgFrom, 0.52));
  veil.addColorStop(1, withAlpha(theme.bgFrom, 0.92));
  ctx.save();
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const pad = W * 0.075;
  const bandSealWidth = seal(scene, pad, H * 0.058, W * 0.075);
  drawText(scene, "kicker", copy.kicker.toUpperCase(), pad + bandSealWidth + W * 0.03, H * 0.076, fonts.sans(W * S.kicker, 700), withAlpha(theme.goldSoft, 0.95), {
    tracking: W * 0.0042,
  });

  // The band: gold ground, ink type. The one place in the system with inverted
  // contrast, which is why it survives a thumbnail.
  const bandY = H * 0.185;
  const bandH = H * 0.2;
  const grad = ctx.createLinearGradient(pad * 0.4, bandY, W - pad * 0.4, bandY + bandH);
  grad.addColorStop(0, theme.gold);
  grad.addColorStop(0.5, theme.goldSoft);
  grad.addColorStop(1, theme.gold);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.restore();
  const inkish = theme.light ? "#1B0B10" : "#1A0E05";
  const head = fitLines(ctx, copy.headline, W - pad * 2, 3, (size) => fonts.display(size, 700), W * 0.076, W * 0.05);
  let y = bandY + (bandH - head.lines.reduce((sum, line) => sum + lineHop(head.size, 1.02, line), 0)) / 2;
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, pad, y, fonts.display(head.size, 700), inkish);
    y += lineHop(head.size, 1.02, line);
  });

  let below = bandY + bandH + H * 0.04;
  if (scene.script) below = scriptBlock(scene, pad, below, W - pad * 2) + H * GAP.body;
  below = bodyBlock(scene, { x: pad, y: below, width: W * 0.8, limit: H * 0.6, maxLines: 2 });

  // Facts on a rule, then the action.
  const factY = Math.max(below + H * 0.042, H * 0.655);
  hairline(ctx, pad, factY - H * 0.028, W - pad, withAlpha(theme.gold, 0.35), Math.max(1.5, W * 0.0018));
  let factX = pad;
  const columns = Math.max(1, Math.min(3, copy.facts.length));
  const factW = (W - pad * 2) / columns;
  copy.facts.slice(0, 3).forEach((fact) => {
    // `wrapAll` measures with whatever font is on the context, so it has to be
    // told the face before it wraps — otherwise a Tamil fact is wrapped for a
    // smaller size and painted wider than its own column.
    const fitted = fitLines(ctx, fact, factW - W * 0.03, 2, (size) => fonts.sans(size, 500), W * S.body, W * S.bodyMin, true);
    fitted.lines.forEach((line, index) => {
      drawText(scene, "body", line, factX, factY + index * lineHop(fitted.size, 1.35, line), fonts.sans(fitted.size, 500), withAlpha(theme.ink, 0.84));
    });
    factX += factW;
  });

  ctaBlock(scene, { x: W / 2, y: H * 0.762, align: "center", variant: "ribbon", size: W * S.cta });
  priceBlock(scene, { x: W / 2, y: H * 0.892, labelY: H * 0.838, size: W * S.priceMin, maxWidth: W * 0.7, align: "center" });
  drawText(scene, "footer", scene.url, W / 2, H * 0.945, fonts.sans(W * S.url, 600), withAlpha(theme.gold, 0.95), {
    align: "center",
    tracking: W * 0.0022,
  });
}

/* ------------------------------- 6 · statement --------------------------- */

function adStatement(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  ground(scene, { angle: "vertical", glowX: 0.5, glowY: 0.32, glow: 0.16 });
  drawDoubleFrame(ctx, frameFor(W, H), theme, { inset: W * 0.045, cornerTicks: true });


  const pad = W * 0.13;
  drawText(scene, "kicker", copy.kicker.toUpperCase(), W / 2, H * 0.115, fonts.sans(W * S.kicker, 700), accent(theme), {
    align: "center",
    tracking: W * 0.005,
  });

  const head = fitLines(ctx, copy.headline, W - pad * 2, 4, (size) => fonts.display(size, 600), W * 0.085, W * 0.055);
  const blockH = head.lines.reduce((sum, line) => sum + lineHop(head.size, 1.06, line), 0);
  let y = H * 0.315 - blockH / 2;
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, W / 2, y, fonts.display(head.size, 600), withAlpha(theme.ink, 0.97), { align: "center" });
    y += lineHop(head.size, 1.06, line);
  });
  if (scene.script) y = scriptBlock(scene, W / 2, y + H * GAP.script, W - pad * 2, "center") + H * GAP.body;
  y = bodyBlock(scene, { x: W / 2, y, width: W * 0.68, limit: H * 0.6, maxLines: 2, align: "center" });

  // Three facts, centred, each under its own rule.
  const factTop = Math.min(Math.max(y + H * 0.035, H * 0.6), H * 0.655);
  const colW = (W - pad * 2) / Math.max(1, Math.min(3, copy.facts.length));
  copy.facts.slice(0, 3).forEach((fact, index) => {
    const cx = pad + colW * (index + 0.5);
    hairline(ctx, cx - W * 0.028, factTop, cx + W * 0.028, withAlpha(theme.gold, 0.55), Math.max(1.5, W * 0.0016));
    const fitted = fitLines(ctx, fact, colW - W * 0.035, 2, (size) => fonts.sans(size, 500), W * S.body, W * S.bodyMin, true);
    let factLineY = factTop + H * 0.034;
    fitted.lines.forEach((line) => {
      drawText(scene, "body", line, cx, factLineY, fonts.sans(fitted.size, 500), withAlpha(theme.ink, 0.84), { align: "center" });
      factLineY += lineHop(fitted.size, 1.35, line);
    });
  });

  priceBlock(scene, { x: W / 2, y: H * 0.822, labelY: H * 0.772, size: W * S.price, maxWidth: W * 0.72, align: "center" });
  ctaBlock(scene, { x: W / 2, y: H * 0.85, align: "center", variant: "outline", size: W * S.cta });
  drawText(scene, "footer", scene.url, W / 2, H * 0.938, fonts.sans(W * S.url, 600), withAlpha(theme.gold, 0.95), {
    align: "center",
    tracking: W * 0.0022,
  });
}

/* ------------------------------ 7 · reference card ----------------------- */

function eduGuide(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  ground(scene, { angle: "vertical", glowX: 0.2, glowY: 0.12, glow: 0.1 });

  // A reference plate wears a different frame from an ad, on purpose: a rule
  // and a label instead of a price plate and a button.
  const pad = W * 0.075;
  drawText(scene, "kicker", "REFERENCE · NOT AN OFFER", pad, H * 0.062, fonts.sans(W * S.kicker, 700), withAlpha(theme.ink, 0.62), {
    tracking: W * 0.0045,
  });
  drawText(scene, "kicker", "ASTRO SIVAM", W - pad, H * 0.062, fonts.sans(W * S.kicker, 700), accent(theme), {
    align: "right",
    tracking: W * 0.0045,
  });
  hairline(ctx, pad, H * 0.107, W - pad, withAlpha(theme.gold, 0.45), Math.max(1.5, W * 0.0016));

  // A small mark, not a watermark: the reference plate has to stay quiet so
  // the page can be read as a page.
  ctx.save();
  ctx.globalAlpha = theme.light ? 0.14 : 0.18;
  drawMotif(ctx, scene.motif, W - pad - W * 0.07, H * 0.745, W * 0.14, theme, 1);
  ctx.restore();

  let y = H * 0.185;
  const head = fitLines(ctx, copy.headline, W - pad * 2, 3, (size) => fonts.display(size, 600), W * 0.085, W * 0.052);
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, pad, y, fonts.display(head.size, 600), withAlpha(theme.ink, 0.97));
    y += lineHop(head.size, 1.05, line);
  });

  if (copy.body?.trim()) {
    const limit = H * 0.62;
    const ability = Math.max(1, Math.floor((limit - (y + H * 0.025)) / (W * S.body * 1.5)));
    const body = fitLines(ctx, copy.body, W - pad * 2 - W * 0.04, Math.min(5, ability), (size) => fonts.sans(size, 400), W * S.body, W * S.bodyMin, true);
    body.lines.forEach((line, index) => {
      drawText(scene, "body", line, pad, y + H * 0.025 + index * body.size * 1.5, fonts.sans(body.size, 400), mutedOn(theme, 0.92));
    });
    y = y + H * 0.025 + body.lines.length * body.size * 1.5;
  }

  if (copy.facts.length) {
    let factY = Math.min(Math.max(y + H * 0.05, H * 0.52), H * 0.66);
    copy.facts.slice(0, 3).forEach((fact, index) => {
      if (factY > H * 0.86) return;
      drawText(scene, "kicker", String(index + 1), pad, factY, fonts.display(W * S.label, 700), withAlpha(theme.gold, 0.85));
      // Facts wrap instead of being squeezed into one line by `maxWidth` — a
      // Tamil fact is 30 % taller than its Latin equivalent and used to sit on
      // the fact below it.
      const lines = fitLines(ctx, fact, W - pad * 2 - W * 0.05, 2, (size) => fonts.sans(size, 500), W * S.body, W * S.bodyMin, true);
      lines.lines.forEach((line) => {
        if (factY > H * 0.86) return;
        drawText(scene, "body", line, pad + W * 0.045, factY, fonts.sans(lines.size, 500), withAlpha(theme.ink, 0.86));
        factY += lineHop(lines.size, 1.3, line);
      });
      factY += W * S.label * 0.55;
    });
  }

  hairline(ctx, pad, H * 0.878, W - pad, withAlpha(theme.gold, 0.25), 1.2);
  drawText(
    scene,
    "footer",
    ellipsize(ctx, copy.source ?? `${BRAND.website} · Email: ${BRAND.email}`, W - pad * 2 - W * 0.24, fonts.sans(W * S.footer, 500)),
    pad,
    H * 0.898,
    fonts.sans(W * S.footer, 500),
    withAlpha(theme.ink, 0.6),
  );
  drawText(scene, "footer", "REFERENCE ONLY", W - pad, H * 0.898, fonts.sans(W * S.footer, 700), withAlpha(theme.ink, 0.45), {
    align: "right",
    tracking: W * 0.003,
  });
}

/* ------------------------------ 8 · numbered step ------------------------ */

function eduStep(scene: Scene) {
  const { ctx, W, H, theme, fonts, copy } = scene;
  ground(scene, { angle: "horizontal", glowX: 0.18, glowY: 0.2, glow: 0.16 });

  const pad = W * 0.085;
  drawText(scene, "kicker", (copy.step ?? "STEP").toUpperCase(), pad, H * 0.072, fonts.sans(W * S.kicker, 700), accent(theme), {
    tracking: W * 0.0048,
  });
  drawText(scene, "kicker", "ASTRO SIVAM · REFERENCE", W - pad, H * 0.072, fonts.sans(W * S.kicker, 600), withAlpha(theme.ink, 0.5), {
    align: "right",
    tracking: W * 0.004,
  });

  ctx.save();
  ctx.globalAlpha = theme.light ? 0.09 : 0.12;
  drawMotif(ctx, scene.motif, pad + W * 0.06, H * 0.19, W * 0.16, theme, 1);
  ctx.restore();

  let y = H * 0.225;
  const head = fitLines(ctx, copy.headline, W - pad * 2, 3, (size) => fonts.display(size, 600), W * 0.09, W * 0.052);
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, pad, y, fonts.display(head.size, 600), withAlpha(theme.ink, 0.97));
    y += lineHop(head.size, 1.04, line);
  });

  if (copy.body?.trim()) {
    hairline(ctx, pad, y + H * 0.028, pad + W * 0.1, withAlpha(theme.gold, 0.6), Math.max(2, W * 0.002));
    const limit = H * 0.86;
    const ability = Math.max(1, Math.floor((limit - (y + H * 0.058)) / (W * S.body * 1.5)));
    const body = fitLines(ctx, copy.body, W - pad * 2, Math.min(5, ability), (size) => fonts.sans(size, 400), W * S.body, W * S.bodyMin, true);
    body.lines.forEach((line, index) => {
      drawText(scene, "body", line, pad, y + H * 0.058 + index * body.size * 1.5, fonts.sans(body.size, 400), mutedOn(theme, 0.92));
    });
  }

  hairline(ctx, pad, H - H * 0.095, W - pad, withAlpha(theme.gold, 0.25), 1.2);
  drawText(
    scene,
    "footer",
    ellipsize(ctx, copy.source ?? `${BRAND.website} · Email: ${BRAND.email}`, W - pad * 2 - W * 0.24, fonts.sans(W * S.footer, 500)),
    pad,
    H - H * 0.077,
    fonts.sans(W * S.footer, 500),
    withAlpha(theme.ink, 0.6),
  );
  drawText(scene, "footer", "REFERENCE ONLY", W - pad, H - H * 0.077, fonts.sans(W * S.footer, 700), withAlpha(theme.ink, 0.45), {
    align: "right",
    tracking: W * 0.003,
  });
}

/* -------------------------------- dispatch ------------------------------- */

const PAINTERS: Record<AdLayout, (scene: Scene) => void> = {
  "ad-plate": adPlate,
  "ad-split": adSplit,
  "ad-checklist": adChecklist,
  "ad-duo": adDuo,
  "ad-band": adBand,
  "ad-statement": adStatement,
  "edu-guide": eduGuide,
  "edu-step": eduStep,
};

export async function renderServiceAd(input: ServiceAdInput): Promise<ServiceAdRender> {
  // Fonts must be resident before the first measurement: `fitLines` and
  // `measureText` are what decide the size, and a face that arrives late makes
  // every wrapped line the wrong length — which shows up as overflow in export.
  await ensureFonts();
  const meta = AD_LAYOUT_MAP[input.layout] ?? AD_LAYOUT_MAP["ad-plate"];
  const scale = input.scale ?? 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(meta.width * scale);
  canvas.height = Math.round(meta.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot render the creative.");
  if (scale !== 1) ctx.scale(scale, scale);

  const theme = themeFor(input.theme);
  const fonts = fontsFor("classic");
  const logo = await loadLogo().catch(() => null);
  const art = input.art ? await loadImageSource(input.art).catch(() => null) : null;
  const log = new TypeLog();

  // Exactly one secondary script, chosen by the reader's language.
  let script: ScriptLine | null = null;
  const lang = input.lang ?? "en";
  if (lang === "ta" && input.copy.tamil?.trim()) {
    script = {
      text: input.copy.tamil.trim(),
      font: fonts.script(meta.width * S.script),
      fallback: fonts.sans(meta.width * S.script),
    };
  } else if (lang === "hi" && input.copy.hindi?.trim()) {
    script = {
      text: input.copy.hindi.trim(),
      font: fonts.hindi(meta.width * (S.script - 0.003)),
      fallback: fonts.sans(meta.width * (S.script - 0.003)),
    };
  }

  const scene: Scene = {
    ctx,
    W: meta.width,
    H: meta.height,
    theme,
    fonts,
    copy: input.copy,
    price: input.price ?? "",
    url: input.url ?? "",
    art,
    logo,
    log,
    style: input.style,
    motif: input.motif ?? "jathagam",
    script,
    isAd: meta.role === "ad",
  };
  (PAINTERS[meta.key] ?? adPlate)(scene);

  return { canvas, layout: meta, typography: log.entries };
}
