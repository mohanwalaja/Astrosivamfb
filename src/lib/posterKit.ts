import type { DisplayFontKey, ImageFit, ScriptFontKey, StyleKey, ThemeKey } from "../types";
import type { Theme } from "../types";
import { BRAND, STYLE_MAP, THEMES } from "../data/brand";
import {
  CORMORANT,
  DEVA,
  DISPLAY,
  HINDI_DISPLAY,
  INTER,
  PLAYFAIR,
  ROUND,
  SANS,
  SANS_DEVA,
  SANS_TAMIL,
  SERIF,
  SERIF_DEVA,
  SERIF_TAMIL,
  TAMIL,
  drawMotif,
  drawTracked,
  INDIC_TEXT,
  fitHeadline,
  goldGradient,
  hasGlyph,
  rand,
  roundRect,
  withAlpha,
  wrapLines,
} from "./canvas";
import { hasStyleArt, paintStyledBackdrop } from "./styles";

/* ==========================================================================
   Poster kit
   ==========================================================================
   The drawing vocabulary every template shares: frame metrics, image fitting,
   a measure-then-paint text engine, ornament painters and a contrast-safe
   scrim. Templates decide *where* things go; nothing here decides composition.

   Every number is derived from the poster width or height, never from a pixel
   constant. That is what makes a 540 px preview and a 2480 px A4 export the
   same design rather than two different ones.
   ========================================================================== */

export interface Frame {
  W: number;
  H: number;
  /** Outer margin — the design's breathing room. */
  m: number;
  /** Inner column width for centred templates. */
  colW: number;
  aspect: number;
  /** 9:16 stories lose their edges to platform chrome; keep content inside. */
  safeTop: number;
  safeBottom: number;
  tall: boolean;
  square: boolean;
  story: boolean;
  /** Print formats need heavier hairlines to survive at physical size. */
  print: boolean;
}

export function frameFor(W: number, H: number): Frame {
  const aspect = W / H;
  const tall = H / W > 1.15;
  const square = H / W <= 1.06;
  const story = H / W > 1.5;
  const print = W >= 2000;
  const m = Math.round(W * (square ? 0.062 : 0.07));
  return {
    W,
    H,
    m,
    colW: W - m * 2,
    aspect,
    safeTop: H * (story ? 0.075 : 0.035),
    safeBottom: H * (story ? 0.11 : 0.045),
    tall,
    square,
    story,
    print,
  };
}

/* --------------------------------- fonts ---------------------------------- */

export interface FontSet {
  display: (size: number, weight?: number) => string;
  /** Marcellus is single-weight; asking Skia for 700 silently falls back to a sans. */
  editorial: (size: number) => string;
  sans: (size: number, weight?: number) => string;
  script: (size: number) => string;
  hindi: (size: number) => string;
  /** Weight used by the script face — Tiro Tamil ships 400 only. */
  scriptWeight: number;
}

export function fontsFor(script: ScriptFontKey): FontSet {
  if (script === "serif") {
    return {
      display: DISPLAY,
      editorial: (size: number) => SERIF(size, 400),
      sans: SANS,
      script: (size: number) => SERIF_TAMIL(size, 500),
      hindi: (size: number) => SERIF_DEVA(size, 500),
      scriptWeight: 500,
    };
  }
  if (script === "sans") {
    return {
      display: DISPLAY,
      editorial: (size: number) => SERIF(size, 400),
      sans: SANS,
      script: (size: number) => SANS_TAMIL(size, 500),
      hindi: (size: number) => SANS_DEVA(size, 500),
      scriptWeight: 500,
    };
  }
  const festive = script === "festive" || script === "bold";
  const tamilFamily = script === "classic" ? TAMIL : ROUND;
  return {
    display: DISPLAY,
    editorial: (size: number) => SERIF(size, 400),
    sans: SANS,
    script: script === "classic" ? (size: number) => tamilFamily(size, 400) : (size: number) => tamilFamily(size, 600),
    hindi: festive ? (size: number) => HINDI_DISPLAY(size, 400) : DEVA,
    scriptWeight: script === "classic" ? 400 : 600,
  };
}

export function displayFaceFor(display: DisplayFontKey): (size: number, weight?: number) => string {
  if (display === "cormorant") return (size: number, weight = 700) => CORMORANT(size, weight >= 700 ? 700 : 600);
  if (display === "playfair") return (size: number, weight = 700) => PLAYFAIR(size, weight >= 700 ? 700 : 600);
  if (display === "inter") return (size: number, weight = 600) => INTER(size, Math.min(700, Math.max(500, weight)));
  if (display === "marcellus") return (size: number) => SERIF(size, 400);
  if (display === "baloo") return ROUND;
  if (display === "jakarta") return SANS;
  return DISPLAY;
}

export function themeFor(key: ThemeKey): Theme {
  return THEMES[key] ?? THEMES.midnight;
}

/* --------------------------------- colour --------------------------------- */

export const ink = (theme: Theme) => theme.ink;
export const gold = (theme: Theme) => theme.gold;
export const accent = (theme: Theme) => (theme.light ? theme.gold : theme.goldSoft);

/** Text-safe muted colour that still reads on the theme's own ground. */
export function mutedOn(theme: Theme, alpha = 0.82): string {
  return withAlpha(theme.ink, theme.light ? Math.max(alpha, 0.74) : Math.max(alpha, 0.7));
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** WCAG relative luminance, used to pick ink or ivory for text over art. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* --------------------------------- ground --------------------------------- */

/** A restrained two-stop ground with one soft light source — never a rainbow. */
export function paintGround(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  theme: Theme,
  options: { angle?: "vertical" | "horizontal" | "diagonal"; glowX?: number; glowY?: number; glow?: number } = {},
) {
  const { W, H } = frame;
  const { angle = "vertical", glowX = 0.5, glowY = 0.28, glow = theme.light ? 0.1 : 0.16 } = options;
  const bg = ctx.createLinearGradient(0, 0, angle === "horizontal" ? W : angle === "diagonal" ? W * 0.7 : 0, H);
  bg.addColorStop(0, theme.bgFrom);
  bg.addColorStop(0.55, theme.bgTo);
  bg.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const light = ctx.createRadialGradient(W * glowX, H * glowY, 0, W * glowX, H * glowY, Math.max(W, H) * 0.75);
  light.addColorStop(0, withAlpha(theme.gold, glow));
  light.addColorStop(0.5, withAlpha(theme.gold, glow * 0.28));
  light.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);
}

/**
 * The 25 studio styles each ship their own backdrop art and a signature motif.
 * The templates own the grid, so a style is applied as a *ground* and as the
 * stand-in art motif — never as a second layout. That keeps the style chips
 * meaningful without letting them fight the composition.
 */
export function paintStyledGround(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  theme: Theme,
  style: StyleKey,
  options: {
    angle?: "vertical" | "horizontal" | "diagonal";
    glowX?: number;
    glowY?: number;
    glow?: number;
    /**
     * Where the template puts its artwork. Style backdrops seat a plate, halo or
     * frame behind this box, so it must be the real art region — `"none"` for a
     * composition with no art moves those pieces off the page.
     */
    art?: ImageBox | null | "none";
  } = {},
) {
  if (hasStyleArt(style)) {
    const art =
      options.art === "none"
        ? { x: -frame.W * 4, y: -frame.H * 4, w: 1, h: 1 }
        : options.art ?? null;
    paintStyledBackdrop(ctx, frame.W, frame.H, theme, style, {
      seed: 7,
      glowX: options.glowX ?? 0.5,
      glowY: options.glowY ?? 0.3,
      frameInset: Math.round(frame.m * 0.45),
      art,
    });
    // flatten the backdrop slightly so template type always clears 4.5:1
    ctx.save();
    ctx.fillStyle = withAlpha(theme.bgFrom, theme.light ? 0.22 : 0.3);
    ctx.fillRect(0, 0, frame.W, frame.H);
    ctx.restore();
    return;
  }
  paintGround(ctx, frame, theme, options);
}

/** The motif a style would use for its own art, for image-less templates. */
export function styleMotif(style: StyleKey): Parameters<typeof drawMotif>[1] {
  return STYLE_MAP[style]?.defaultMotif ?? "mandala";
}

/* --------------------------------- scrim ---------------------------------- */
export function paintGrain(ctx: CanvasRenderingContext2D, W: number, H: number, seed = 13, strength = 0.05) {
  const rng = rand(seed);
  const count = Math.round((W * H) / 900);
  ctx.save();
  ctx.globalAlpha = strength;
  for (let i = 0; i < count; i += 1) {
    const x = rng() * W;
    const y = rng() * H;
    const s = rng() * 1.6 + 0.4;
    ctx.fillStyle = rng() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

/* -------------------------------- image ---------------------------------- */

export interface ImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageOptions {
  /** 0 = show the whole picture edge to edge, 0.06 trims a baked-in border. */
  inset?: number;
  /** Vertical focal point. 0.42 keeps crowns and faces in frame. */
  focusY?: number;
  focusX?: number;
  radius?: number;
  shape?: ImageFit;
  /** Outline colour; omitted = no outline. */
  outline?: string;
  outlineWidth?: number;
  /** Darken the edges so artwork sits into the poster instead of on top of it. */
  vignette?: number;
  /** Unify the art with the template's palette. */
  grade?: string;
  gradeAlpha?: number;
}

export function archPath(x: number, y: number, w: number, h: number) {
  const r = w / 2;
  const path = new Path2D();
  path.moveTo(x, y + h);
  path.lineTo(x, y + r);
  path.arc(x + r, y + r, r, Math.PI, 0);
  path.lineTo(x + w, y + h);
  path.closePath();
  return path;
}

export function clampBox(box: ImageBox, frame: Frame): ImageBox {
  const x = Math.max(0, Math.min(box.x, frame.W - 1));
  const y = Math.max(0, Math.min(box.y, frame.H - 1));
  return {
    x,
    y,
    w: Math.max(1, Math.min(box.w, frame.W - x)),
    h: Math.max(1, Math.min(box.h, frame.H - y)),
  };
}

function clipForShape(ctx: CanvasRenderingContext2D, box: ImageBox, shape: ImageFit, radius: number) {
  if (shape === "arch") {
    ctx.clip(archPath(box.x, box.y, box.w, box.h));
    return;
  }
  if (shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    return;
  }
  roundRect(ctx, box.x, box.y, box.w, box.h, Math.max(0, radius));
  ctx.clip();
}

/**
 * Draw an image into a box with a deliberate crop. Portraits are cropped from a
 * high focal point so a crown is never sliced; landscapes keep the horizon.
 */
export function drawImageIn(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: ImageBox,
  options: ImageOptions = {},
) {
  const {
    inset = 0.05,
    focusY = 0.42,
    focusX = 0.5,
    radius = 0,
    shape = "square",
    outline,
    outlineWidth = 2,
    vignette = 0,
    grade,
    gradeAlpha = 0.16,
  } = options;
  const { x, y, w, h } = box;
  if (w <= 1 || h <= 1) return;

  const sx = img.width * inset;
  const sy = img.height * inset;
  const sw = Math.max(1, img.width - sx * 2);
  const sh = Math.max(1, img.height - sy * 2);
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = x + (w - dw) * Math.min(1, Math.max(0, focusX));
  const dy = y + (h - dh) * Math.min(1, Math.max(0, focusY));

  ctx.save();
  clipForShape(ctx, box, shape, radius);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

  if (grade) {
    ctx.fillStyle = withAlpha(grade, gradeAlpha);
    ctx.fillRect(x, y, w, h);
  }
  if (vignette > 0) {
    const v = ctx.createRadialGradient(x + w / 2, y + h * 0.45, Math.min(w, h) * 0.22, x + w / 2, y + h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(0,0,0,${vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();

  if (outline) {
    ctx.save();
    ctx.strokeStyle = outline;
    ctx.lineWidth = outlineWidth;
    if (shape === "arch") ctx.stroke(archPath(x, y, w, h));
    else if (shape === "circle") {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      roundRect(ctx, x, y, w, h, Math.max(0, radius));
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** A graceful fallback when there is no photograph: a foil motif in the same box. */
/**
 * Stand-in art for when no photograph is supplied. It has to occupy the same
 * footprint as the photo it replaces — leaving the poster ground showing through
 * an empty frame reads as a failed export, not as a design choice.
 */
export function drawArtFallback(
  ctx: CanvasRenderingContext2D,
  box: ImageBox,
  theme: Theme,
  motif: Parameters<typeof drawMotif>[1] = "mandala",
  opacity = 0.85,
  shape: "rect" | "arch" | "circle" = "rect",
) {
  const size = Math.min(box.w, box.h);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.save();

  // plate
  const plate = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  plate.addColorStop(0, withAlpha(theme.gold, theme.light ? 0.26 : 0.18));
  plate.addColorStop(0.55, withAlpha(theme.bgTo, theme.light ? 0.55 : 0.72));
  plate.addColorStop(1, withAlpha(theme.gold, theme.light ? 0.3 : 0.2));
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  } else if (shape === "arch") {
    const r = box.w / 2;
    ctx.moveTo(box.x, box.y + box.h);
    ctx.lineTo(box.x, box.y + r);
    ctx.arc(cx, box.y + r, r, Math.PI, 0);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.closePath();
  } else {
    ctx.rect(box.x, box.y, box.w, box.h);
  }
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.clip();

  // gold wash and motif, clipped to the plate
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.66);
  halo.addColorStop(0, withAlpha(theme.gold, 0.2));
  halo.addColorStop(0.62, withAlpha(theme.gold, 0.06));
  halo.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  drawMotif(ctx, motif, cx, cy + size * 0.02, Math.min(box.w * 0.82, box.h * 0.82), theme, opacity);
  ctx.restore();

  // frame
  ctx.save();
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  } else if (shape === "arch") {
    const r = box.w / 2;
    ctx.moveTo(box.x, box.y + box.h);
    ctx.lineTo(box.x, box.y + r);
    ctx.arc(cx, box.y + r, r, Math.PI, 0);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.closePath();
  } else {
    ctx.rect(box.x, box.y, box.w, box.h);
  }
  ctx.strokeStyle = withAlpha(theme.gold, 0.62);
  ctx.lineWidth = Math.max(1, size * 0.006);
  ctx.stroke();
  ctx.restore();
}

/** A gradient scrim sized to the copy that sits on it — never a guessed fraction. */
export function paintScrim(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  options: { from?: "bottom" | "top" | "left" | "right"; strength?: number; spread?: number; color?: string } = {},
) {
  const { from = "bottom", strength = 0.88, spread = 1.35, color = "#000000" } = options;
  const h = box.h * spread;
  let grad: CanvasGradient;
  if (from === "bottom") {
    grad = ctx.createLinearGradient(0, box.y + box.h - h, 0, box.y + box.h);
    grad.addColorStop(0, withAlpha(color, 0));
    grad.addColorStop(0.55, withAlpha(color, strength * 0.55));
    grad.addColorStop(1, withAlpha(color, strength));
    ctx.fillStyle = grad;
    ctx.fillRect(box.x, box.y + box.h - h, box.w, h);
  } else if (from === "top") {
    grad = ctx.createLinearGradient(0, box.y, 0, box.y + h);
    grad.addColorStop(0, withAlpha(color, strength));
    grad.addColorStop(0.55, withAlpha(color, strength * 0.5));
    grad.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(box.x, box.y, box.w, h);
  } else if (from === "left") {
    grad = ctx.createLinearGradient(box.x + box.w - h, 0, box.x + box.w, 0);
    grad.addColorStop(0, withAlpha(color, 0));
    grad.addColorStop(0.5, withAlpha(color, strength * 0.55));
    grad.addColorStop(1, withAlpha(color, strength));
    ctx.fillStyle = grad;
    ctx.fillRect(box.x + box.w - h, box.y, h, box.h);
  } else {
    grad = ctx.createLinearGradient(box.x + h, 0, box.x, 0);
    grad.addColorStop(0, withAlpha(color, 0));
    grad.addColorStop(0.5, withAlpha(color, strength * 0.55));
    grad.addColorStop(1, withAlpha(color, strength));
    ctx.fillStyle = grad;
    ctx.fillRect(box.x, box.y, h, box.h);
  }
}

/* ------------------------------ text engine ------------------------------- */

export interface Copy {
  kicker: string;
  headline: string;
  tamil: string;
  hindi: string;
  subline: string;
  cta: string;
  footer: string;
}

type Align = "left" | "center" | "right";

export interface StackOptions {
  x: number;
  w: number;
  align: Align;
  theme: Theme;
  fonts: FontSet;
  face: (size: number, weight?: number) => string;
  copy: Copy;
  /** Multiplier over the template's natural sizes. */
  scale?: number;
  maxHeadlineLines?: number;
  /** Reference size for the type ramp. Defaults to the text column width, but a
   *  narrow column on a wide poster must still get poster-scale type, so callers
   *  can point this at the frame instead. */
  measure?: number;
  headlineSize?: number;
  minHeadlineSize?: number;
  headlineWeight?: number;
  kickerMode?: "tracked" | "plain" | "none";
  kickerColor?: string;
  headlineColor?: string;
  scriptColor?: string;
  subColor?: string;
  scriptFirst?: boolean;
  /** Show the Tamil and Hindi lines. */
  showScript?: boolean;
  /** Show the kicker. */
  showKicker?: boolean;
  subMaxLines?: number;
  /** Width fraction reserved on the right (e.g. for a logo in the header row). */
  /** Leading ornament above the headline (small diamond rule). */
  ornament?: boolean;
  lineHeight?: number;
  /** A slim gold rule under the script lines. */
  divider?: boolean;
}

export interface StackPlan {
  options: StackOptions;
  kickerSize: number;
  headlineSize: number;
  headlineLines: string[];
  lineHeight: number;
  tamil: { lines: string[]; size: number; lead: number } | null;
  hindi: { lines: string[]; size: number; lead: number } | null;
  sub: { lines: string[]; size: number; lead: number } | null;
  kickerHeight: number;
  headlineHeight: number;
  scriptHeight: number;
  subHeight: number;
  dividerHeight: number;
  height: number;
}



function fitScriptLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  face: (size: number) => string,
  maxLines = 2,
) {
  let size = start;
  ctx.font = face(size);
  while (ctx.measureText(text).width > maxWidth && size > min) {
    size = Math.max(min, size * 0.96);
    ctx.font = face(size);
  }
  if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };
  return { lines: wrapLines(ctx, text, maxWidth).slice(0, maxLines), size };
}

/**
 * Measure the whole copy block before anything is drawn. Templates use the
 * returned height to centre the block, reserve space under a scrim, or shrink
 * it until it fits a fixed region — which is why nothing overflows any more.
 */
export function planStack(ctx: CanvasRenderingContext2D, options: StackOptions): StackPlan {
  const {
    x,
    w,
    align,
    theme,
    fonts,
    face,
    copy,
    scale = 1,
    maxHeadlineLines = 3,
    headlineWeight = 600,
    kickerMode = "tracked",
    showScript = true,
    showKicker = true,
    subMaxLines = 3,
    ornament = false,
    lineHeight = 1.08,
  } = options;
  void align;
  void theme;
  void x;

  const unit = Math.min(options.measure ?? w, 1200);
  const kickerIndic = INDIC_TEXT.test(copy.kicker);
  const kickerSize = unit * (kickerIndic ? 0.031 : 0.024) * scale;
  const tamilSize = unit * 0.052 * scale;
  const hindiSize = unit * 0.046 * scale;
  const subSize = unit * 0.036 * scale;

  const showTamil = showScript && Boolean(copy.tamil.trim());
  const showHindi = showScript && Boolean(copy.hindi.trim());
  const tamil = showTamil
    ? fitScriptLines(ctx, copy.tamil.trim(), w, tamilSize, tamilSize * 0.66, fonts.script)
    : null;
  const hindi = showHindi
    ? fitScriptLines(ctx, copy.hindi.trim(), w, hindiSize, hindiSize * 0.66, fonts.hindi)
    : null;

  // Both defaults and explicit sizes scale together, otherwise fitStack's
  // shrink pass silently stops working the moment a template sets its own size.
  const headStart = (options.headlineSize ?? unit * 0.115) * scale;
  const headMin = (options.minHeadlineSize ?? unit * 0.05) * scale;
  const head = fitHeadline(ctx, copy.headline, w, maxHeadlineLines, headStart, headMin, headlineWeight, face);
  const lh = head.size * lineHeight;

  if (ornament) {
    /* measured by the painter — included here so centring is exact */
  }
  const kickerHeight = showKicker && copy.kicker.trim() && kickerMode !== "none" ? kickerSize * (ornament ? 4.4 : 2.6) : 0;
  const headlineHeight = head.lines.length * lh;
  const tamilLead = tamil ? tamil.size * 1.52 : 0;
  const hindiLead = hindi ? hindi.size * 1.45 : 0;
  const tamilFit = tamil ? { ...tamil, lead: tamilLead } : null;
  const hindiFit = hindi ? { ...hindi, lead: hindiLead } : null;
  const scriptHeight =
    (tamil ? tamil.size * 1.42 + (tamil.lines.length - 1) * tamilLead : 0) +
    (hindi ? hindi.size * 1.3 + (hindi.lines.length - 1) * hindiLead : 0) +
    (tamil || hindi ? unit * 0.026 : 0);
  const dividerHeight = options.divider ? unit * 0.034 : 0;
  ctx.font = fonts.sans(subSize, 400);
  const wrappedSub = copy.subline.trim() ? wrapLines(ctx, copy.subline.trim(), w) : [];
  // Trimmed copy gets an ellipsis: a sentence that just stops looks like a bug.
  // A short subline must never be cut for width-reasons alone: wrapLines already
  // fits it. Only trim when there are genuinely more lines than the region allows.
  const subLines = wrappedSub.slice(0, subMaxLines);
  if (wrappedSub.length > subMaxLines && subLines.length) {
    subLines[subLines.length - 1] = `${subLines[subLines.length - 1].replace(/[.,;:]$/, "")}…`;
  }
  const sub = subLines.length ? { lines: subLines, size: subSize, lead: subSize * 1.5 } : null;
  const subHeight = sub ? sub.lines.length * sub.lead + unit * 0.02 : 0;

  const height = kickerHeight + headlineHeight + scriptHeight + subHeight + dividerHeight;
  return {
    options,
    kickerSize,
    headlineSize: head.size,
    headlineLines: head.lines,
    lineHeight: lh,
    tamil: tamilFit,
    hindi: hindiFit,
    sub,
    kickerHeight,
    headlineHeight,
    scriptHeight,
    subHeight,
    dividerHeight,
    height,
  };
}

/**
 * Paint a plan. `alpha` drives the reel reveal; the transform only ever touches
 * the copy, never the logo, frame or footer.
 */
export function paintStack(ctx: CanvasRenderingContext2D, plan: StackPlan, top: number, alpha = 1) {
  const { options } = plan;
  const {
    x,
    w,
    align,
    theme,
    fonts,
    copy,
    kickerMode = "tracked",
    ornament = false,
    divider = false,
    scriptFirst = false,
    showKicker = true,
  } = options;
  const textX = align === "center" ? x + w / 2 : align === "right" ? x + w : x;
  const canvasAlign: CanvasTextAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const kickerColor = options.kickerColor ?? accent(theme);
  const headlineColor = options.headlineColor ?? ink(theme);
  const scriptColor = options.scriptColor ?? (theme.light ? theme.gold : theme.goldSoft);
  const subColor = options.subColor ?? mutedOn(theme);

  ctx.save();
  if (alpha < 1) {
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(0, (1 - Math.max(0, alpha)) * plan.height * 0.06);
  }
  ctx.textAlign = canvasAlign;
  ctx.textBaseline = "top";
  let cursor = top;

  // optional leading diamond + rule
  if (ornament) {
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.gold, 0.5);
    ctx.lineWidth = Math.max(1, w * 0.0016);
    const oy = cursor + plan.kickerSize * 1.2;
    const half = Math.min(w * 0.1, plan.kickerSize * 3.2);
    if (align === "center") {
      ctx.beginPath();
      ctx.moveTo(textX - half, oy);
      ctx.lineTo(textX - plan.kickerSize * 0.7, oy);
      ctx.moveTo(textX + plan.kickerSize * 0.7, oy);
      ctx.lineTo(textX + half, oy);
      ctx.stroke();
      ctx.translate(textX, oy);
    } else {
      ctx.beginPath();
      ctx.moveTo(textX, oy);
      ctx.lineTo(textX + half * 1.6, oy);
      ctx.stroke();
      ctx.translate(textX + half * 1.6 + plan.kickerSize * 0.9, oy);
    }
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = withAlpha(theme.gold, 0.85);
    const d = plan.kickerSize * 0.42;
    ctx.fillRect(-d / 2, -d / 2, d, d);
    ctx.restore();
  }

  // kicker
  if (showKicker && copy.kicker.trim() && kickerMode !== "none") {
    ctx.fillStyle = kickerColor;
    ctx.textBaseline = "top";
    if (INDIC_TEXT.test(copy.kicker)) {
      ctx.font = /[\u0B80-\u0BFF]/.test(copy.kicker)
        ? fonts.script(plan.kickerSize)
        : fonts.hindi(plan.kickerSize);
      ctx.fillText(copy.kicker.trim(), textX, cursor + plan.kickerSize * 0.2);
    } else if (kickerMode === "plain") {
      ctx.font = fonts.sans(plan.kickerSize, 600);
      ctx.fillText(copy.kicker.trim(), textX, cursor);
    } else {
      ctx.font = fonts.sans(plan.kickerSize, 600);
      drawTracked(ctx, copy.kicker.trim().toUpperCase(), textX, cursor, plan.kickerSize * 0.24, canvasAlign);
    }
    cursor += plan.kickerHeight;
  }

  const paintScript = () => {
    if (plan.tamil) {
      ctx.font = fonts.script(plan.tamil.size);
      ctx.fillStyle = scriptColor;
      ctx.textBaseline = "top";
      plan.tamil.lines.forEach((line, index) =>
        ctx.fillText(line, textX, cursor + index * plan.tamil!.size * 1.52),
      );
      cursor += plan.tamil.size * 1.42 + (plan.tamil.lines.length - 1) * plan.tamil.size * 1.52;
    }
    const hindi = plan.hindi;
    if (hindi) {
      ctx.font = fonts.hindi(hindi.size);
      ctx.fillStyle = withAlpha(scriptColor, 0.95);
      ctx.textBaseline = "top";
      hindi.lines.forEach((line, index) =>
        ctx.fillText(line, textX, cursor + hindi.size * 0.06 + index * hindi.size * 1.45),
      );
      cursor += hindi.size * 1.3 + (hindi.lines.length - 1) * hindi.size * 1.45;
    }
    if (plan.tamil || plan.hindi) cursor += Math.min(w, 1200) * 0.026;
  };

  if (scriptFirst) paintScript();

  // headline
  ctx.font = options.face(plan.headlineSize, options.headlineWeight ?? 600);
  ctx.fillStyle = headlineColor;
  ctx.textBaseline = "top";
  plan.headlineLines.forEach((line, index) => {
    ctx.fillText(line, textX, cursor + index * plan.lineHeight);
  });
  cursor += plan.headlineHeight;

  if (!scriptFirst) paintScript();

  if (divider) {
    ctx.save();
    const dw = Math.min(w * 0.22, 120);
    const dy = cursor + plan.dividerHeight * 0.35;
    ctx.strokeStyle = withAlpha(theme.gold, 0.5);
    ctx.lineWidth = Math.max(1, w * 0.0014);
    ctx.beginPath();
    if (align === "center") {
      ctx.moveTo(textX - dw, dy);
      ctx.lineTo(textX + dw, dy);
    } else if (align === "right") {
      ctx.moveTo(textX - dw * 2, dy);
      ctx.lineTo(textX, dy);
    } else {
      ctx.moveTo(textX, dy);
      ctx.lineTo(textX + dw * 2, dy);
    }
    ctx.stroke();
    ctx.restore();
    cursor += plan.dividerHeight;
  }

  // subline
  const sub = plan.sub;
  if (sub) {
    ctx.font = fonts.sans(sub.size, 400);
    ctx.fillStyle = subColor;
    ctx.textBaseline = "top";
    sub.lines.forEach((line, index) => ctx.fillText(line, textX, cursor + index * sub.lead));
    cursor += plan.subHeight;
  }

  ctx.restore();
  return cursor;
}

/** Shrink a stack until it fits a fixed height. Returns the plan at the fitted scale. */
export function fitStack(
  ctx: CanvasRenderingContext2D,
  options: StackOptions,
  maxHeight: number,
  floor = 0.62,
): StackPlan {
  const scaleFloor = options.scale ?? 1;
  const planAt = (scale: number, maxLines: number, maxSub: number) =>
    planStack(ctx, {
      ...options,
      scale,
      maxHeadlineLines: maxLines,
      subMaxLines: maxSub,
      showScript: options.showScript !== false,
    });

  let scale = scaleFloor;
  let maxLines = options.maxHeadlineLines ?? 3;
  let maxSub = options.subMaxLines ?? 3;
  let plan = planAt(scale, maxLines, maxSub);

  // Stage 1 — shrink type until it fits. 6% steps read as a deliberate hierarchy.
  let guard = 0;
  while (plan.height > maxHeight && scale > floor && guard < 24) {
    scale *= 0.94;
    plan = planAt(scale, maxLines, maxSub);
    guard += 1;
  }
  // Stage 2 — give back one headline line at a time.
  while (plan.height > maxHeight && maxLines > 1) {
    maxLines -= 1;
    plan = planAt(scale, maxLines, maxSub);
  }
  // Stage 3 — trim supporting copy rather than letterbox the subline.
  while (plan.height > maxHeight && maxSub > 0) {
    maxSub -= 1;
    plan = planAt(scale, maxLines, maxSub);
  }
  // Stage 4 — last resort: drop the script pair and the kicker, then go to a
  // single line. A template that still overflows has sized its region wrong.
  if (plan.height > maxHeight) {
    plan = planStack(ctx, { ...options, scale: floor, maxHeadlineLines: 1, subMaxLines: 0, showScript: false, showKicker: false });
  }
  if (plan.height > maxHeight) {
    console.warn(
      `[poster] copy block ${Math.round(plan.height)}px does not fit its ${Math.round(maxHeight)}px region — check the template's reserves`,
    );
  }
  return plan;
}

/* -------------------------------- elements -------------------------------- */

export function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: CanvasTextAlign = "left",
) {
  ctx.save();
  ctx.textBaseline = "middle";
  drawTracked(ctx, text, x, y, spacing, align);
  ctx.restore();
}

/* ------------------------------ price text -------------------------------- */

/**
 * The self-hosted families are per-script subsets: Cinzel and Marcellus carry
 * Latin but no ₹, while the Tamil and Devanagari faces carry ₹ but no Latin
 * digits. Requesting "₹470" from any single family therefore draws boxes.
 *
 * `drawPrice` splits the string into runs and picks, per character, the first
 * face in the chain that actually has the glyph — so a price keeps the display
 * face's engraved figures and still shows a real rupee sign.
 */
const PRICE_FACE_CHAIN = ["Tiro Tamil", "Noto Sans Devanagari", "Baloo Thambi 2", "Yatra One"];

export interface PriceOptions {
  x: number;
  y: number;
  /** Full CSS font string for the primary face. */
  font: string;
  /** CSS font string for a face known to carry the missing glyphs. Empty = auto. */
  fallbackFont?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** Extra tracking in px, applied between characters. */
  tracking?: number;
}

/** The first face in the chain that can draw `char`, as a CSS font string. */
export function glyphFace(size: number, weight: number, char: string, chain: string[] = PRICE_FACE_CHAIN): string | null {
  for (const family of chain) {
    const font = `${weight} ${size}px "${family}"`;
    if (hasGlyph(font, char)) return font;
  }
  return null;
}

export function drawPrice(ctx: CanvasRenderingContext2D, text: string, options: PriceOptions): number {
  const { x, y, font, fallbackFont, align = "left", baseline = "alphabetic", tracking = 0 } = options;
  if (!text) return 0;
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 0);
  const weight = Number(/([1-9]00)\s/.exec(font)?.[1] ?? 600);

  // Resolve per character, then glue neighbours that share a face.
  const runs: Array<{ text: string; font: string }> = [];
  for (const char of Array.from(text)) {
    let face = font;
    if (/\s/.test(char)) face = font;
    else if (!hasGlyph(font, char)) {
      face = fallbackFont && hasGlyph(fallbackFont, char) ? fallbackFont : glyphFace(size, weight, char) ?? font;
    }
    const last = runs[runs.length - 1];
    if (last && last.font === face) last.text += char;
    else runs.push({ text: char, font: face });
  }

  const measure = (run: { text: string; font: string }) => {
    ctx.save();
    ctx.font = run.font;
    const width = ctx.measureText(run.text).width;
    ctx.restore();
    return width;
  };
  const widths = runs.map(measure);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, Array.from(text).length - 1);
  let cursor = align === "center" ? x - total / 2 : align === "right" ? x - total : x;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = baseline;
  runs.forEach((run, index) => {
    ctx.font = run.font;
    const chars = Array.from(run.text);
    if (!tracking) {
      ctx.fillText(run.text, cursor, y);
      cursor += widths[index];
      return;
    }
    for (const char of chars) {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + tracking;
    }
  });
  ctx.restore();
  return total;
}

/** Measure a price string with the same run splitting, without drawing. */
export function measurePrice(ctx: CanvasRenderingContext2D, text: string, font: string, tracking = 0, fallbackFont?: string): number {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 0);
  const weight = Number(/([1-9]00)\s/.exec(font)?.[1] ?? 600);
  let total = 0;
  for (const char of Array.from(text)) {
    let face = font;
    if (!/\s/.test(char) && !hasGlyph(font, char)) {
      face = fallbackFont && hasGlyph(fallbackFont, char) ? fallbackFont : glyphFace(size, weight, char) ?? font;
    }
    ctx.save();
    ctx.font = face;
    total += ctx.measureText(char).width;
    ctx.restore();
  }
  return total + tracking * Math.max(0, Array.from(text).length - 1);
}

export function hairline(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  color: string,
  width = 1,
  dashed = false,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([width * 4, width * 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

export interface LogoOptions {
  x: number;
  y: number;
  size: number;
  align?: "left" | "center" | "right";
  theme: Theme;
  /** plate = ivory seal behind the mark; bare = mark only; wordmark = mark + name */
  variant?: "plate" | "bare" | "wordmark";
  label?: string;
  opacity?: number;
}

/**
 * The logo file carries its own transparency, so the mark can sit directly on
 * any theme. The plate variant is an optional ivory seal for print pieces —
 * social creatives use bare/wordmark so no white tile ever ships.
 */
export function drawLogoMark(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, options: LogoOptions): number {
  const { y, size, align = "left", theme, variant = "plate", label = "ASTRO SIVAM", opacity = 1 } = options;
  // The wordmark is part of the lockup: right/centre anchors place mark + text
  // as one block, so nothing ever spills off the canvas edge.
  const labelFont = Math.max(10, size * 0.42);
  const labelGap = size * 0.34;
  const labelWidth = variant === "wordmark" ? measureTracked(ctx, label, labelFont, size * 0.1) : 0;
  const blockWidth = variant === "wordmark" ? size + labelGap + labelWidth : size;
  const x = align === "center" ? options.x - blockWidth / 2 : align === "right" ? options.x - blockWidth : options.x;
  ctx.save();
  ctx.globalAlpha = opacity;

  if (variant === "plate") {
    const r = size * 0.24;
    roundRect(ctx, x, y, size, size, r);
    const plate = ctx.createLinearGradient(x, y, x + size, y + size);
    plate.addColorStop(0, "#FFFDF7");
    plate.addColorStop(0.6, "#F7F1E4");
    plate.addColorStop(1, "#E9DCC4");
    ctx.fillStyle = plate;
    ctx.fill();
    ctx.strokeStyle = withAlpha(theme.gold, 0.62);
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.stroke();
  }

  if (logo) {
    const inner = variant === "plate" ? size * 0.76 : size;
    const ix = x + (size - inner) / 2;
    const iy = y + (size - inner) / 2;
    ctx.save();
    if (variant === "plate") ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(logo, ix, iy, inner, inner);
    ctx.restore();
  } else {
    // No file available (offline export, slow network): a mark built from the palette.
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.gold, 0.9);
    ctx.fillStyle = withAlpha(theme.gold, 0.9);
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (variant === "wordmark") {
    ctx.fillStyle = withAlpha(theme.ink, 0.92);
    ctx.font = DISPLAY(labelFont, 600);
    tracked(ctx, label, x + size + labelGap, y + size / 2 + 1, size * 0.1, "left");
  }
  ctx.restore();
  return variant === "wordmark" ? size + size * 0.34 + measureTracked(ctx, label, Math.max(10, size * 0.42), size * 0.1) : size;
}

/**
 * The one contact line every creative carries: website and email, centred at
 * the bottom. Brand decision — the lockup lives top-left with no seal, and
 * contact details live here, so neither competes with the message.
 */
export function drawContactLine(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  options: { y?: number; size?: number; color?: string } = {},
) {
  const y = options.y ?? H - H * 0.045;
  const size = options.size ?? Math.max(12, Math.min(17, W * 0.015));
  ctx.save();
  ctx.fillStyle = options.color ?? withAlpha(theme.muted, 0.95);
  ctx.font = SANS(size, 500);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${BRAND.website} · Email: ${BRAND.email}`, W / 2, y);
  ctx.restore();
}

export function measureTracked(ctx: CanvasRenderingContext2D, text: string, size: number, spacing: number): number {
  ctx.save();
  ctx.font = DISPLAY(size, 600);
  // Tracking is suppressed for Indic text when it is drawn, so it must not be
  // counted here either — otherwise the label is measured wider than it paints.
  if (INDIC_TEXT.test(text)) {
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }
  const chars = Array.from(text);
  const width = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + spacing * Math.max(0, chars.length - 1);
  ctx.restore();
  return width;
}

export interface CtaOptions {
  x: number;
  y: number;
  align?: "left" | "center" | "right";
  theme: Theme;
  label: string;
  variant?: "pill" | "outline" | "text" | "ribbon";
  size?: number;
  opacity?: number;
}

/** Call to action. Size and colour adapt to the ground so it always reads. */
export function drawCta(ctx: CanvasRenderingContext2D, options: CtaOptions) {
  const { x, y, align = "left", theme, label, variant = "pill", opacity = 1 } = options;
  if (!label.trim()) return { width: 0, height: 0 };
  const size = options.size ?? 20;
  const h = size * 2.35;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = SANS(size, 600);
  const textWidth = ctx.measureText(label).width;
  const padX = size * 1.15;

  if (variant === "text") {
    const width = textWidth;
    const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    ctx.fillStyle = accent(theme);
    ctx.textBaseline = "middle";
    ctx.fillText(label, left, y + h / 2);
    hairline(ctx, left, y + h * 0.82, left + width, withAlpha(theme.gold, 0.55), Math.max(1, size * 0.06));
    ctx.restore();
    return { width, height: h };
  }

  if (variant === "ribbon") {
    const width = textWidth + padX * 2;
    const height = size * 2.1;
    const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    ctx.fillStyle = theme.gold;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.lineTo(left + width - height * 0.42, y + height / 2);
    ctx.lineTo(left + width, y + height);
    ctx.lineTo(left, y + height);
    ctx.lineTo(left + height * 0.42, y + height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.light ? "#140F04" : "#1A1206";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, left + width / 2, y + height / 2 + 1);
    ctx.restore();
    return { width, height };
  }

  const width = textWidth + padX * 2;
  const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  roundRect(ctx, left, y, width, h, h / 2);
  if (variant === "pill") {
    const grad = ctx.createLinearGradient(left, y, left, y + h);
    grad.addColorStop(0, theme.goldSoft);
    grad.addColorStop(1, theme.gold);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = theme.light ? "#FFFFFF" : "#171006";
  } else {
    ctx.fillStyle = withAlpha(theme.gold, 0.08);
    ctx.fill();
    ctx.strokeStyle = withAlpha(theme.gold, 0.55);
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();
    ctx.fillStyle = accent(theme);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, left + width / 2, y + h / 2 + 1);
  ctx.restore();
  return { width, height: h };
}

/* ------------------------------- ornaments -------------------------------- */

/** Authentic South Indian mango-leaf and marigold toran across the top of a heritage frame. */
export function drawToran(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  theme: Theme,
  leaves = 13,
  /**
   * Optional leaf colour. The poster templates keep the green mango-leaf toran;
   * the Facebook assets pass gold so the whole asset stays inside the brand
   * palette of maroon, gold, ivory and charcoal.
   */
  leafOverride?: string,
) {
  const step = width / leaves;
  ctx.save();

  // 1. Auspicious braided Kalava cord running across the top
  ctx.lineWidth = Math.max(1.8, width * 0.003);
  ctx.strokeStyle = "#8A1C14";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  ctx.lineWidth = Math.max(1.0, width * 0.0016);
  ctx.strokeStyle = withAlpha(theme.gold, 0.85);
  ctx.setLineDash([width * 0.006, width * 0.006]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Mango leaves (Mavilai)
  for (let i = 0; i < leaves; i += 1) {
    const cx = x + step * (i + 0.5);
    const len = step * 1.05;
    const halfW = step * 0.38;

    ctx.save();
    ctx.translate(cx, y);

    // Dimensional drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = Math.max(2, len * 0.12);
    ctx.shadowOffsetY = Math.max(1, len * 0.06);

    // Leaf gradient
    let leafFill: CanvasGradient | string;
    if (leafOverride) {
      const lg = ctx.createLinearGradient(-halfW, 0, halfW, len);
      lg.addColorStop(0, "#7D5218");
      lg.addColorStop(0.3, withAlpha(theme.gold, 0.95));
      lg.addColorStop(0.65, "#D89B2B");
      lg.addColorStop(1, "#54330A");
      leafFill = lg;
    } else {
      const lg = ctx.createLinearGradient(-halfW, 0, halfW, len);
      lg.addColorStop(0, theme.light ? "#245524" : "#1A451C");
      lg.addColorStop(0.32, theme.light ? "#38823E" : "#2E6E34");
      lg.addColorStop(0.7, theme.light ? "#1F5222" : "#17421A");
      lg.addColorStop(1, theme.light ? "#143A17" : "#0E2B10");
      leafFill = lg;
    }

    ctx.fillStyle = leafFill;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(halfW * 1.25, len * 0.28, halfW * 1.05, len * 0.72, 0, len * 1.12);
    ctx.bezierCurveTo(-halfW * 1.05, len * 0.72, -halfW * 1.25, len * 0.28, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Leaf rim highlight
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = leafOverride ? "rgba(255, 245, 200, 0.4)" : "rgba(215, 255, 175, 0.3)";
    ctx.lineWidth = Math.max(0.6, len * 0.025);
    ctx.stroke();

    // Central midrib vein
    ctx.strokeStyle = withAlpha(theme.gold, 0.7);
    ctx.lineWidth = Math.max(0.7, len * 0.035);
    ctx.beginPath();
    ctx.moveTo(0, len * 0.05);
    ctx.quadraticCurveTo(halfW * 0.08, len * 0.5, 0, len * 1.04);
    ctx.stroke();

    // Side herringbone veins
    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.35);
    ctx.lineWidth = Math.max(0.5, len * 0.02);
    for (let v = 1; v <= 4; v += 1) {
      const vy = len * (v * 0.2);
      const vw = halfW * (1 - v * 0.15) * 0.75;
      ctx.beginPath();
      ctx.moveTo(0, vy);
      ctx.lineTo(vw, vy - len * 0.08);
      ctx.moveTo(0, vy);
      ctx.lineTo(-vw, vy - len * 0.08);
      ctx.stroke();
    }

    // Auspicious red Kumkum and yellow Chandan tilak mark
    const tilakY = len * 0.42;
    const tilakR = Math.max(1.6, len * 0.07);
    ctx.fillStyle = "#FFD54F";
    ctx.beginPath();
    ctx.arc(0, tilakY, tilakR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#C62828";
    ctx.beginPath();
    ctx.arc(0, tilakY, tilakR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. Auspicious marigold floret & hanging pearl bead between leaves
    if (i < leaves - 1) {
      const bx = cx + step / 2;
      const mr = Math.max(2.5, step * 0.13);
      ctx.save();
      ctx.translate(bx, y);

      // Fluffy saffron marigold
      ctx.fillStyle = "#E65100";
      ctx.beginPath();
      ctx.arc(0, 0, mr * 1.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FB8C00";
      ctx.beginPath();
      ctx.arc(0, 0, mr * 0.85, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFE082";
      ctx.beginPath();
      ctx.arc(0, 0, mr * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Hanging pearl-white jasmine bud
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = Math.max(0.6, step * 0.02);
      ctx.beginPath();
      ctx.moveTo(0, mr);
      ctx.lineTo(0, mr + step * 0.28);
      ctx.stroke();

      ctx.fillStyle = "#FFFDE7";
      ctx.beginPath();
      ctx.ellipse(0, mr + step * 0.18, mr * 0.35, mr * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  ctx.restore();
}

/** Deepam / diya pair for festival footing. */
export function drawDiya(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, theme: Theme, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);

  // 1. Ambient warm candlelight halo / aura
  const ambient = ctx.createRadialGradient(0, -size * 0.45, 0, 0, -size * 0.45, size * 1.1);
  ambient.addColorStop(0, "rgba(255, 215, 64, 0.32)");
  ambient.addColorStop(0.45, "rgba(255, 152, 0, 0.12)");
  ambient.addColorStop(1, "rgba(255, 110, 0, 0)");
  ctx.fillStyle = ambient;
  ctx.beginPath();
  ctx.arc(0, -size * 0.45, size * 1.1, 0, Math.PI * 2);
  ctx.fill();

  // 2. Multi-tier sculpted brass base & stem (Kuthuvilakku heirloom profile)
  const baseGrad = ctx.createLinearGradient(-size * 0.4, size * 0.45, size * 0.4, size * 0.45);
  baseGrad.addColorStop(0, "#5E3A10");
  baseGrad.addColorStop(0.25, "#C88E28");
  baseGrad.addColorStop(0.5, "#FFF2B5");
  baseGrad.addColorStop(0.75, "#D59D35");
  baseGrad.addColorStop(1, "#4A2B08");

  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.42, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = withAlpha("#FFF8D6", 0.65);
  ctx.lineWidth = Math.max(0.7, size * 0.02);
  ctx.stroke();

  // Central fluted waist / collar
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.moveTo(-size * 0.12, size * 0.4);
  ctx.quadraticCurveTo(-size * 0.06, size * 0.2, -size * 0.14, size * 0.08);
  ctx.lineTo(size * 0.14, size * 0.08);
  ctx.quadraticCurveTo(size * 0.06, size * 0.2, size * 0.12, size * 0.4);
  ctx.closePath();
  ctx.fill();

  // Beaded collar ring
  ctx.fillStyle = "#FFF2B5";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.22, size * 0.12, size * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Deep brass oil reservoir bowl with pouring spout
  const bowlGrad = ctx.createLinearGradient(-size * 0.55, 0, size * 0.55, size * 0.3);
  bowlGrad.addColorStop(0, "#633D10");
  bowlGrad.addColorStop(0.2, "#D49C32");
  bowlGrad.addColorStop(0.5, "#FFF4BC");
  bowlGrad.addColorStop(0.78, "#B87F22");
  bowlGrad.addColorStop(1, "#442407");

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetY = size * 0.05;

  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.moveTo(-size * 0.52, -size * 0.04);
  ctx.bezierCurveTo(-size * 0.48, size * 0.32, -size * 0.15, size * 0.32, 0, size * 0.3);
  ctx.bezierCurveTo(size * 0.15, size * 0.32, size * 0.48, size * 0.32, size * 0.52, -size * 0.04);
  ctx.quadraticCurveTo(0, size * 0.08, -size * 0.52, -size * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // Golden rim highlight
  ctx.strokeStyle = withAlpha("#FFF9DB", 0.85);
  ctx.lineWidth = Math.max(0.8, size * 0.025);
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.02, size * 0.48, size * 0.08, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Molten ghee oil pool inside reservoir
  const oilGrad = ctx.createRadialGradient(0, -size * 0.02, 0, 0, -size * 0.02, size * 0.42);
  oilGrad.addColorStop(0, "#D97706");
  oilGrad.addColorStop(0.65, "#92400E");
  oilGrad.addColorStop(1, "#451A03");
  ctx.fillStyle = oilGrad;
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.02, size * 0.42, size * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Consecrated white cotton wick tip (Thiri)
  ctx.fillStyle = "#FFFDE7";
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.07, size * 0.04, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3E2723";
  ctx.beginPath();
  ctx.arc(0, -size * 0.1, size * 0.028, 0, Math.PI * 2);
  ctx.fill();

  // 5. Sacred Teardrop Divine Flame (Deepam)
  const flameOuter = ctx.createLinearGradient(0, -size * 0.82, 0, -size * 0.1);
  flameOuter.addColorStop(0, "#FF3D00");
  flameOuter.addColorStop(0.4, "#FF9100");
  flameOuter.addColorStop(0.85, "#FFD700");
  flameOuter.addColorStop(1, "rgba(255, 235, 59, 0)");

  ctx.fillStyle = flameOuter;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.82);
  ctx.bezierCurveTo(size * 0.22, -size * 0.58, size * 0.26, -size * 0.25, 0, -size * 0.09);
  ctx.bezierCurveTo(-size * 0.26, -size * 0.25, -size * 0.22, -size * 0.58, 0, -size * 0.82);
  ctx.closePath();
  ctx.fill();

  const flameMid = ctx.createLinearGradient(0, -size * 0.72, 0, -size * 0.12);
  flameMid.addColorStop(0, "#FFE082");
  flameMid.addColorStop(0.5, "#FFCA28");
  flameMid.addColorStop(1, "#FF8F00");

  ctx.fillStyle = flameMid;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.72);
  ctx.bezierCurveTo(size * 0.15, -size * 0.52, size * 0.18, -size * 0.26, 0, -size * 0.11);
  ctx.bezierCurveTo(-size * 0.18, -size * 0.26, -size * 0.15, -size * 0.52, 0, -size * 0.72);
  ctx.closePath();
  ctx.fill();

  const flameCore = ctx.createLinearGradient(0, -size * 0.55, 0, -size * 0.12);
  flameCore.addColorStop(0, "#FFFFFF");
  flameCore.addColorStop(0.7, "#FFFDE7");
  flameCore.addColorStop(1, "rgba(255, 255, 255, 0.4)");

  ctx.fillStyle = flameCore;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.55);
  ctx.bezierCurveTo(size * 0.08, -size * 0.42, size * 0.09, -size * 0.22, 0, -size * 0.13);
  ctx.bezierCurveTo(-size * 0.09, -size * 0.22, -size * 0.08, -size * 0.42, 0, -size * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Kolam dot-and-loop line used as a base rule. */
export function drawKolamBase(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, theme: Theme) {
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.55);
  ctx.fillStyle = withAlpha(theme.gold, 0.75);
  ctx.lineWidth = Math.max(1, width * 0.0014);
  const unit = width / 24;
  for (let i = 0; i < 12; i += 1) {
    const cx = x + unit * (i + 0.5) * 2;
    ctx.beginPath();
    ctx.arc(cx, y, unit * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, y, unit * 0.075, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Concentric mandala ring used behind medallion art. */
export function drawMedallionRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  theme: Theme,
  petals = 24,
) {
  ctx.save();
  const foil = goldGradient(ctx, theme, cx - radius, cy - radius, radius, radius);
  ctx.strokeStyle = foil;
  ctx.lineWidth = Math.max(1, radius * 0.012);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < petals; i += 1) {
    const angle = (i / petals) * Math.PI * 2;
    const r1 = radius * 1.01;
    const r2 = radius * (i % 2 === 0 ? 1.07 : 1.04);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Thin double frame with corner ticks — the one ornament shared by several templates. */
export function drawDoubleFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  theme: Theme,
  options: { inset?: number; color?: string; cornerTicks?: boolean } = {},
) {
  const inset = options.inset ?? frame.m * 0.42;
  const color = options.color ?? withAlpha(theme.gold, 0.5);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, frame.W * 0.0016);
  ctx.strokeRect(inset, inset, frame.W - inset * 2, frame.H - inset * 2);
  ctx.strokeStyle = withAlpha(theme.gold, 0.24);
  ctx.lineWidth = Math.max(1, frame.W * 0.0008);
  ctx.strokeRect(inset * 1.7, inset * 1.7, frame.W - inset * 3.4, frame.H - inset * 3.4);
  if (options.cornerTicks !== false) {
    const t = inset * 1.1;
    ctx.strokeStyle = withAlpha(theme.gold, 0.85);
    ctx.lineWidth = Math.max(1.4, frame.W * 0.002);
    const corners: Array<[number, number, number, number]> = [
      [inset, inset, 1, 1],
      [frame.W - inset, inset, -1, 1],
      [inset, frame.H - inset, 1, -1],
      [frame.W - inset, frame.H - inset, -1, -1],
    ];
    corners.forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * t, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * t);
      ctx.stroke();
    });
  }
  ctx.restore();
}

/** Numbered index mark for editorial and carousel templates. */
export function drawIndex(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  theme: Theme,
  align: CanvasTextAlign = "left",
  maxWidth?: number,
) {
  ctx.save();
  ctx.font = DISPLAY(size, 700);
  // The ghost numeral is a background device, not body copy, but it still has
  // to stay on the canvas: "01 / 07" at 0.42 W is 1.4 canvases wide and the
  // digits were being painted off both edges.
  let fitted = size;
  if (maxWidth) {
    const width = ctx.measureText(text).width;
    if (width > maxWidth) fitted = Math.max(size * 0.25, (size * maxWidth) / width);
    ctx.font = DISPLAY(fitted, 700);
  }
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = withAlpha(theme.gold, 0.9);
  ctx.fillText(text, x, y);
  ctx.restore();
  return fitted;
}

/** Swipe affordance for carousel covers. */
export function drawSwipe(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, theme: Theme, align: CanvasTextAlign = "right", label = "SWIPE") {
  ctx.save();
  ctx.font = SANS(size, 600);
  ctx.textBaseline = "middle";
  const labelWidth = ctx.measureText(label).width;
  const gap = size * 0.7;
  const arrow = size * 1.9;
  const total = labelWidth + gap + arrow;
  const startX = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  ctx.fillStyle = withAlpha(theme.ink, 0.85);
  ctx.textAlign = "left";
  drawTracked(ctx, label, startX, y, size * 0.22, "left");
  const ax = startX + labelWidth + gap;
  ctx.strokeStyle = accent(theme);
  ctx.lineWidth = Math.max(1.2, size * 0.09);
  ctx.beginPath();
  ctx.moveTo(ax, y);
  ctx.lineTo(ax + arrow, y);
  ctx.moveTo(ax + arrow * 0.55, y - arrow * 0.3);
  ctx.lineTo(ax + arrow, y);
  ctx.lineTo(ax + arrow * 0.55, y + arrow * 0.3);
  ctx.stroke();
  ctx.restore();
}

/** Page dots for carousel covers. */
export function drawPageDots(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, active: number, theme: Theme, size = 7, align: CanvasTextAlign = "left") {
  ctx.save();
  const gap = size * 2.4;
  const total = count * gap - (gap - size * 2);
  const startX = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  for (let i = 0; i < count; i += 1) {
    ctx.beginPath();
    ctx.arc(startX + i * gap + size, y, size, 0, Math.PI * 2);
    ctx.fillStyle = i === active ? accent(theme) : withAlpha(theme.ink, 0.26);
    ctx.fill();
  }
  ctx.restore();
}

/** Numbered bullet list — the educational template's body copy. */
export function drawBullets(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  width: number,
  size: number,
  theme: Theme,
  fonts: FontSet,
  lead = size * 2.35,
) {
  let cursor = y;
  ctx.save();
  lines.forEach((line, index) => {
    ctx.font = SANS(size * 0.72, 700);
    ctx.fillStyle = withAlpha(theme.gold, 0.95);
    ctx.textBaseline = "top";
    ctx.fillText(String(index + 1).padStart(2, "0"), x, cursor + size * 0.12);
    ctx.font = fonts.sans(size, 400);
    ctx.fillStyle = mutedOn(theme);
    const textX = x + size * 2.1;
    const wrapped = wrapLines(ctx, line, width - size * 2.1).slice(0, 2);
    wrapped.forEach((row, rowIndex) => ctx.fillText(row, textX, cursor + rowIndex * size * 1.45));
    // a rule between points gives the list structure without extra weight
    if (index < lines.length - 1) {
      const ruleY = cursor + lead - size * 0.42;
      ctx.strokeStyle = withAlpha(theme.ink, 0.12);
      ctx.lineWidth = Math.max(1, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(x, ruleY);
      ctx.lineTo(x + width * 0.92, ruleY);
      ctx.stroke();
    }
    cursor += lead;
  });
  ctx.restore();
  return cursor - y;
}

/**
 * Split a subline into bullets: explicit separators first, then sentences.
 *
 * A fragment lifted out of a running sentence starts lower-case and reads like a
 * typo in a poster, so each point is capitalised and its trailing punctuation
 * dropped — unless the caller passed something that already looks intentional.
 */
export function toBullets(text: string, max = 3): string[] {
  const tidy = (parts: string[]) =>
    parts
      .map((part) => part.trim().replace(/[\s·•|;]+$/, ""))
      .filter(Boolean)
      .map((part) => (part.charAt(0).toLocaleLowerCase() === part.charAt(0) ? part.charAt(0).toLocaleUpperCase() + part.slice(1) : part))
      .map((part) => part.replace(/\.$/, ""));

  const raw = tidy(text.split(/\n|·|•|\u2022|\||;/));
  if (raw.length >= 2) return raw.slice(0, max);
  const sentences = tidy(text.split(/(?<=[.!?])\s+/));
  if (sentences.length >= 2) return sentences.slice(0, max);
  return raw.slice(0, max);
}

export { roundRect, withAlpha, drawMotif };

export function safeBox(frame: Frame, inset = frame.m) {
  return {
    x: inset,
    y: frame.safeTop + inset * 0.6,
    w: frame.W - inset * 2,
    h: frame.H - (frame.safeTop + inset * 0.6) - frame.safeBottom - inset * 0.6,
  };
}
