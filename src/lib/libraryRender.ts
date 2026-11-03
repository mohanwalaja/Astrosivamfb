import type { Theme } from "../types";
import { THEMES } from "../data/brand";
import type { ArtKey, BackgroundKey, Design, DesignCopy, FrameKey, OrnamentKey, TypeKey } from "../data/library";
import { CORMORANT, DISPLAY, INTER, PLAYFAIR, SANS, SERIF, createCanvas, drawTracked, loadImageSource, withAlpha } from "./canvas";
import { drawImageIn, paintGrain } from "./posterKit";

/* ==========================================================================
   The library engine.
   ==========================================================================
   One renderer paints all 150 designs. A design is a recipe — layout, palette,
   type stack, ground, frame, ornament, art treatment — and this file turns that
   recipe plus a block of copy into a finished 1080 × 1350 poster.

   Three rules hold the whole catalogue together:

   1. Nothing is painted at a fixed y with a guessed type size. Type is measured,
      wrapped and placed as a block, so a long headline shrinks the block rather
      than colliding with the call to action.
   2. Nothing is clipped. If a block cannot fit even at the smallest size, the
      line is recorded in the audit, and the build fails rather than shipping a
      poster with a hidden line.
   3. Every line is checked against the pixels it actually sits on. Where the
      ground is too close to the ink, a veil in the theme's own colour is laid
      down first. The contrast audit is therefore a hard gate, not a suggestion.
   ========================================================================== */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placed {
  lines: string[];
  size: number;
  height: number;
}

export interface LibraryAudit {
  texts: Array<{ role: string; size: number; text: string; box: Box; color: string }>;
  overflow: string[];
  lowContrast: Array<{ role: string; text: string; ratio: number }>;
  smallest: number;
  passes: boolean;
}

const AUDITS = new WeakMap<HTMLCanvasElement, LibraryAudit>();

export const getLibraryAudit = (canvas: HTMLCanvasElement): LibraryAudit | undefined => AUDITS.get(canvas);

/* ---------------------------------- type ---------------------------------- */

type Face = {
  display: (size: number, weight?: number) => string;
  body: (size: number, weight?: number) => string;
  caps: boolean;
  tracking: number;
  weight: number;
};

const FACES: Record<TypeKey, Face> = {
  cinzel: { display: DISPLAY, body: SANS, caps: true, tracking: 0.055, weight: 700 },
  cormorant: { display: (size, weight = 600) => CORMORANT(size, weight), body: SANS, caps: false, tracking: 0.012, weight: 600 },
  playfair: { display: (size, weight = 700) => PLAYFAIR(size, weight), body: SANS, caps: false, tracking: 0.012, weight: 700 },
  marcellus: { display: (size, weight = 400) => SERIF(size, weight), body: SANS, caps: false, tracking: 0.02, weight: 400 },
  swiss: { display: (size, weight = 700) => INTER(size, weight), body: INTER, caps: true, tracking: 0, weight: 700 },
  modernHeritage: { display: DISPLAY, body: INTER, caps: true, tracking: 0.045, weight: 700 },
  editorialPair: { display: (size, weight = 700) => PLAYFAIR(size, weight), body: INTER, caps: false, tracking: 0.015, weight: 700 },
  technical: { display: (size, weight = 600) => INTER(size, weight), body: INTER, caps: true, tracking: 0.12, weight: 600 },
};

interface TextOptions {
  face: (size: number, weight?: number) => string;
  max: number;
  min?: number;
  maxLines?: number;
  weight?: number;
  color?: string;
  align?: CanvasTextAlign;
  tracking?: number;
  caps?: boolean;
  lineHeight?: number;
  opacity?: number;
}

const measure = (ctx: CanvasRenderingContext2D, text: string, font: string, tracking = 0) => {
  ctx.font = font;
  const width = ctx.measureText(text).width;
  return width + Math.max(0, text.length - 1) * tracking;
};

const wrap = (ctx: CanvasRenderingContext2D, text: string, width: number, font: string, tracking: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(ctx, next, font, tracking) <= width || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/** Wrap at a size, or report that this size cannot hold the line count. */
function tryPlace(ctx: CanvasRenderingContext2D, text: string, box: Box, options: TextOptions, size: number): Placed | null {
  const face = options.face(size, options.weight);
  const tracking = options.tracking ?? 0;
  const lines = wrap(ctx, text, box.w, face, tracking);
  const maxLines = options.maxLines ?? 3;
  if (lines.length > maxLines) return null;
  const lineHeight = options.lineHeight ?? 1.16;
  const height = size * lineHeight * lines.length;
  if (height > box.h) return null;
  return { lines, size, height };
}

function place(ctx: CanvasRenderingContext2D, text: string, box: Box, options: TextOptions): Placed | null {
  const min = Math.min(options.min ?? options.max * 0.62, options.max);
  const steps = 26;
  for (let index = 0; index <= steps; index += 1) {
    const size = options.max - ((options.max - min) * index) / steps;
    const placed = tryPlace(ctx, text, box, options, size);
    if (placed) return placed;
  }
  return null;
}

/* ---------------------------- ground protection ---------------------------- */

const parseColor = (color: string): [number, number, number] | null => {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const parts = match[1].split(",").map((part) => parseFloat(part));
    return [parts[0], parts[1], parts[2]];
  }
  const hex = color.trim().replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (full.length < 6) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

const luminanceOf = ([r, g, b]: [number, number, number]) => {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: string, b: string) => {
  const first = parseColor(a);
  const second = parseColor(b);
  if (!first || !second) return 21;
  const l1 = luminanceOf(first);
  const l2 = luminanceOf(second);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/**
 * Sample the ground under a line and lay a veil when the ink would drown in it.
 * This is what lets a light palette sit on a dark photograph — and why the
 * contrast audit below can be a hard pass/fail.
 */
function protectGround(scene: Scene, box: Box, color: string, y: number) {
  const { ctx, W, H, scale, theme } = scene;
  const sx = Math.max(0, Math.round(box.x * scale));
  const sy = Math.max(0, Math.round((y - 8) * scale));
  const sw = Math.max(1, Math.min(Math.round(W * scale) - sx, Math.round(box.w * scale)));
  const sh = Math.max(1, Math.min(Math.round(H * scale) - sy, Math.round(10 * scale)));
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(sx, sy, sw, sh).data;
  } catch {
    return;
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  if (!count) return;
  const ground = luminanceOf([r / count, g / count, b / count]);
  const ink = parseColor(color);
  if (!ink) return;
  const ratio = (Math.max(ground, luminanceOf(ink)) + 0.05) / (Math.min(ground, luminanceOf(ink)) + 0.05);
  if (ratio >= 3.6) return;
  const pad = 10;
  const veil = ctx.createLinearGradient(0, y - pad, 0, y + box.h + pad);
  veil.addColorStop(0, withAlpha(theme.bgFrom, 0.6));
  veil.addColorStop(0.16, withAlpha(theme.bgFrom, 0.9));
  veil.addColorStop(1, withAlpha(theme.bgFrom, 0.9));
  ctx.save();
  ctx.fillStyle = veil;
  ctx.fillRect(box.x - pad, y - pad, box.w + pad * 2, box.h + pad * 2);
  ctx.restore();
}

/* --------------------------------- scene ---------------------------------- */

interface Scene {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  m: number;
  scale: number;
  theme: Theme;
  faces: Face;
  copy: DesignCopy;
  design: Design;
  image: HTMLImageElement | null;
  footer: string;
  showLogo: boolean;
  audit: LibraryAudit;
  wide: boolean;
}

function render(scene: Scene, role: string, placed: Placed | null, box: Box, options: TextOptions, y = box.y): number {
  if (!placed) return y;
  const { ctx } = scene;
  const color = options.color ?? scene.theme.ink;
  protectGround(scene, box, color, y);
  ctx.save();
  ctx.font = options.face(placed.size, options.weight);
  ctx.fillStyle = color;
  ctx.globalAlpha = options.opacity ?? 1;
  ctx.textBaseline = "top";
  const align = options.align ?? "left";
  const tracking = options.tracking ?? 0;
  let cursor = y;
  for (const line of placed.lines) {
    const x = align === "center" ? box.x + box.w / 2 : align === "right" ? box.x + box.w : box.x;
    drawTracked(ctx, line, x, cursor, tracking, align);
    cursor += placed.size * (options.lineHeight ?? 1.16);
  }
  ctx.restore();
  scene.audit.texts.push({ role, size: placed.size, text: placed.lines.join(" "), box: { x: box.x, y, w: box.w, h: placed.height }, color });
  if (placed.size < scene.audit.smallest) scene.audit.smallest = placed.size;
  return y + placed.height;
}

function text(scene: Scene, role: string, value: string, x: number, y: number, w: number, options: TextOptions & { color?: string }): number {
  const box: Box = { x, y, w, h: options.max * (options.maxLines ?? 3) * (options.lineHeight ?? 1.16) + 2 };
  const placed = place(scene.ctx, value, box, options);
  if (!placed) {
    scene.audit.overflow.push(`${role}: ${value.slice(0, 44)}`);
    return y;
  }
  return render(scene, role, placed, { x, y, w, h: placed.height }, options, y);
}

/** Headline + subline as one measured block; the headline shrinks to fit. */
function copyBlock(
  scene: Scene,
  x: number,
  y: number,
  w: number,
  limit: number,
  options: {
    headlineMax?: number;
    headlineLines?: number;
    subMax?: number;
    subLines?: number;
    subColor?: string;
    anchor?: "top" | "center";
    align?: CanvasTextAlign;
  } = {},
): number {
  const { ctx, faces, theme, W } = scene;
  const align = options.align ?? "left";
  const headlineMax = options.headlineMax ?? W * 0.07;
  const subMax = options.subMax ?? W * 0.021;
  const gap = W * 0.022;
  for (let factor = 1; factor >= 0.6; factor -= 0.04) {
    const size = headlineMax * factor;
    const headline = place(ctx, scene.copy.headline, { x, y: 0, w, h: limit }, {
      face: faces.display, max: size, min: size, maxLines: options.headlineLines ?? 3,
      weight: faces.weight, caps: faces.caps, tracking: faces.display === DISPLAY ? W * 0.0016 : 0, lineHeight: 1.1,
    });
    const subline = place(ctx, scene.copy.subline, { x, y: 0, w, h: Math.max(1, limit - (headline?.height ?? 0)) }, {
      face: faces.body, max: subMax, min: W * 0.016, maxLines: options.subLines ?? 3, weight: 400,
      lineHeight: 1.45,
    });
    if (!headline || !subline) continue;
    if (headline.height + gap + subline.height > limit) continue;
    const total = headline.height + gap + subline.height;
    const top = options.anchor === "center" ? y + Math.max(0, (limit - total) / 2) : y;
    const bottom = render(scene, "headline", headline, { x, y: top, w, h: headline.height }, {
      face: faces.display, max: size, min: size, maxLines: options.headlineLines ?? 3, weight: faces.weight,
      caps: faces.caps, tracking: faces.display === DISPLAY ? W * 0.0016 : 0, lineHeight: 1.1, align,
    }, top);
    return render(scene, "subline", subline, { x, y: bottom + gap, w, h: subline.height }, {
      face: faces.body, max: subMax, min: W * 0.016, maxLines: options.subLines ?? 3, weight: 400,
      lineHeight: 1.45, align, color: options.subColor ?? withAlpha(theme.ink, 0.82),
    }, bottom + gap);
  }
  scene.audit.overflow.push(`block: ${scene.copy.headline.slice(0, 40)}`);
  return y;
}

/* ------------------------------- backgrounds ------------------------------- */

function baseGround(ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme) {
  const gradient = ctx.createLinearGradient(0, 0, W * 0.4, H);
  gradient.addColorStop(0, theme.bgFrom);
  gradient.addColorStop(1, theme.bgTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function paintBackground(scene: Scene, key: BackgroundKey) {
  const { ctx, W, H, theme } = scene;
  baseGround(ctx, W, H, theme);
  if (key === "flat") {
    paintGrain(ctx, W, H, 11, 0.05);
    return;
  }
  if (key === "radial") {
    const glow = ctx.createRadialGradient(W * 0.5, H * 0.34, 0, W * 0.5, H * 0.34, W * 0.85);
    glow.addColorStop(0, withAlpha(theme.light ? "#FFFFFF" : theme.goldSoft, 0.16));
    glow.addColorStop(0.55, withAlpha(theme.gold, theme.light ? 0.07 : 0.05));
    glow.addColorStop(1, withAlpha(theme.bgFrom, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  } else if (key === "parchment") {
    ctx.save();
    for (let i = 0; i < 90; i += 1) {
      const y = (i / 90) * H;
      ctx.strokeStyle = withAlpha(theme.light ? "#8A6A3A" : "#E9CFA0", 0.035 + ((i * 37) % 17) / 900);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(W * 0.3, y + 6, W * 0.6, y - 8, W, y + 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (key === "silk") {
    for (let i = 0; i < 26; i += 1) {
      const t = i / 26;
      const x = t * W;
      const band = ctx.createLinearGradient(x, 0, x + W / 26, 0);
      band.addColorStop(0, withAlpha("#FFFFFF", 0));
      band.addColorStop(0.5, withAlpha(theme.light ? "#FFFFFF" : theme.goldSoft, theme.light ? 0.05 : 0.035));
      band.addColorStop(1, withAlpha("#000000", 0));
      ctx.fillStyle = band;
      ctx.fillRect(x, 0, W / 26, H);
    }
  } else if (key === "starfield") {
    ctx.save();
    for (let i = 0; i < 170; i += 1) {
      const x = ((i * 733) % 1000) / 1000 * W;
      const y = ((i * 487) % 1000) / 1000 * H;
      const r = 0.6 + ((i * 13) % 9) / 9;
      ctx.fillStyle = withAlpha(i % 5 === 0 ? theme.goldSoft : "#FFFFFF", 0.12 + ((i * 7) % 30) / 100);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (key === "marble") {
    ctx.save();
    for (let i = 0; i < 7; i += 1) {
      ctx.strokeStyle = withAlpha(theme.light ? "#7C6440" : theme.goldSoft, 0.055);
      ctx.lineWidth = W * (0.004 + i * 0.002);
      ctx.beginPath();
      ctx.moveTo(-W * 0.1, H * (0.15 + i * 0.11));
      ctx.bezierCurveTo(W * 0.3, H * (0.05 + i * 0.12), W * 0.65, H * (0.28 + i * 0.1), W * 1.1, H * (0.12 + i * 0.11));
      ctx.stroke();
    }
    ctx.restore();
  } else if (key === "halftone") {
    ctx.save();
    for (let row = 0; row < 46; row += 1) {
      for (let col = 0; col < 46; col += 1) {
        const x = (col / 45) * W;
        const y = (row / 45) * H;
        const falloff = 1 - Math.min(1, Math.hypot((x - W * 0.5) / W, (y - H * 0.25) / H) * 1.5);
        if (falloff <= 0.02) continue;
        ctx.fillStyle = withAlpha(theme.light ? theme.gold : theme.goldSoft, 0.03 + falloff * 0.09);
        ctx.beginPath();
        ctx.arc(x, y, W * 0.0018 + falloff * W * 0.0016, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (key === "grid") {
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.ink, theme.light ? 0.06 : 0.08);
    ctx.lineWidth = 1;
    for (let col = 1; col < 12; col += 1) {
      ctx.beginPath();
      ctx.moveTo((col / 12) * W, 0);
      ctx.lineTo((col / 12) * W, H);
      ctx.stroke();
    }
    for (let row = 1; row < 16; row += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (row / 16) * H);
      ctx.lineTo(W, (row / 16) * H);
      ctx.stroke();
    }
    ctx.restore();
  }
  paintGrain(ctx, W, H, 17, 0.045);
}

/* --------------------------------- frames --------------------------------- */

function paintFrame(scene: Scene, key: FrameKey) {
  if (key === "none") return;
  const { ctx, W, H, m, theme } = scene;
  const ink = theme.light ? withAlpha(theme.gold, 0.55) : withAlpha(theme.gold, 0.5);
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, W * 0.0011);
  if (key === "hairline") {
    ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  } else if (key === "doubleRule") {
    ctx.strokeRect(m, m, W - m * 2, H - m * 2);
    ctx.lineWidth = Math.max(1, W * 0.0007);
    ctx.strokeRect(m * 1.14, m * 1.14, W - m * 2.28, H - m * 2.28);
  } else if (key === "cornerTicks") {
    const len = W * 0.07;
    const pad = m * 0.9;
    for (const [x, y, dx, dy] of [[pad, pad, 1, 1], [W - pad, pad, -1, 1], [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * len);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * len, y);
      ctx.stroke();
    }
  } else if (key === "topBottomBands") {
    ctx.fillStyle = withAlpha(theme.gold, 0.16);
    ctx.fillRect(0, 0, W, m * 0.34);
    ctx.fillRect(0, H - m * 0.34, W, m * 0.34);
    const line = (y: number) => {
      ctx.beginPath();
      ctx.moveTo(m, y);
      ctx.lineTo(W - m, y);
      ctx.stroke();
    };
    line(m * 0.34);
    line(H - m * 0.34);
  } else if (key === "pillarRails") {
    const railW = W * 0.028;
    for (const x of [m * 0.42, W - m * 0.42 - railW]) {
      const rail = ctx.createLinearGradient(x, 0, x + railW, 0);
      rail.addColorStop(0, withAlpha(theme.gold, 0.1));
      rail.addColorStop(0.5, withAlpha(theme.goldSoft, 0.4));
      rail.addColorStop(1, withAlpha(theme.gold, 0.1));
      ctx.fillStyle = rail;
      ctx.fillRect(x, m * 0.5, railW, H - m);
      ctx.fillStyle = withAlpha(theme.gold, 0.55);
      ctx.fillRect(x, m * 0.5, railW, W * 0.008);
      ctx.fillRect(x, H - m * 0.5 - W * 0.008, railW, W * 0.008);
    }
  } else if (key === "goldBorder") {
    ctx.lineWidth = Math.max(2, W * 0.0042);
    ctx.strokeStyle = withAlpha(theme.gold, 0.75);
    ctx.strokeRect(m * 0.8, m * 0.8, W - m * 1.6, H - m * 1.6);
    ctx.lineWidth = Math.max(1, W * 0.0009);
    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.6);
    ctx.strokeRect(m * 0.98, m * 0.98, W - m * 1.96, H - m * 1.96);
  }
  ctx.restore();
}

/* -------------------------------- ornaments -------------------------------- */

function ornament(scene: Scene, key: Exclude<OrnamentKey, "none">, x: number, y: number, size: number, alpha = 0.7) {
  const { ctx, theme } = scene;
  const gold = theme.gold;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = Math.max(1, size * 0.012);
  if (key === "kolam") {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * size * 0.26, Math.sin(a) * size * 0.26, size * 0.16, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * size * 0.46, Math.sin(a) * size * 0.46, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === "lampRow") {
    const count = 5;
    for (let i = 0; i < count; i += 1) {
      const dx = (i - (count - 1) / 2) * size * 0.2;
      ctx.beginPath();
      ctx.moveTo(dx - size * 0.06, 0);
      ctx.quadraticCurveTo(dx, size * 0.09, dx + size * 0.06, 0);
      ctx.closePath();
      ctx.fill();
      const flame = ctx.createRadialGradient(dx, -size * 0.07, 0, dx, -size * 0.07, size * 0.05);
      flame.addColorStop(0, "#FFF3C4");
      flame.addColorStop(1, withAlpha(gold, 0));
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.ellipse(dx, -size * 0.06, size * 0.026, size * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gold;
    }
  } else if (key === "mandalaRings") {
    [0.2, 0.3, 0.42].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(0, 0, size * radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    for (let i = 0; i < 16; i += 1) {
      const a = (i * Math.PI) / 8;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * size * 0.36, Math.sin(a) * size * 0.36, size * 0.028, size * 0.062, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === "jasmine") {
    for (let cluster = 0; cluster < 4; cluster += 1) {
      const a = (cluster * Math.PI) / 2 + 0.4;
      const cx = Math.cos(a) * size * 0.24;
      const cy = Math.sin(a) * size * 0.24;
      for (let petal = 0; petal < 5; petal += 1) {
        const p = (petal * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(p) * size * 0.055, cy + Math.sin(p) * size * 0.055, size * 0.032, size * 0.052, p, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(theme.light ? "#FFFDF6" : "#FFF8E6", 0.82);
        ctx.fill();
      }
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === "toran") {
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.quadraticCurveTo(0, size * 0.16, size / 2, 0);
    ctx.stroke();
    for (let i = 0; i < 11; i += 1) {
      const t = i / 10;
      const px = -size / 2 + size * t;
      const py = Math.sin(Math.PI * t) * size * 0.08;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + size * 0.07);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(px, py + size * 0.1, size * 0.018, size * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === "starMap") {
    const points = 12;
    const coords: Array<[number, number]> = [];
    for (let i = 0; i < points; i += 1) {
      const a = (i * Math.PI * 2) / points + i * 0.21;
      const r = size * (0.16 + ((i * 37) % 100) / 100 * 0.3);
      coords.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    ctx.strokeStyle = withAlpha(gold, 0.45);
    ctx.beginPath();
    coords.forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    ctx.fillStyle = withAlpha(theme.goldSoft, 0.9);
    coords.forEach(([px, py], index) => {
      ctx.beginPath();
      ctx.arc(px, py, size * (index % 3 === 0 ? 0.014 : 0.008), 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (key === "ruleDiamond") {
    const half = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(-size * 0.06, 0);
    ctx.moveTo(size * 0.06, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.06);
    ctx.lineTo(size * 0.06, 0);
    ctx.lineTo(0, size * 0.06);
    ctx.lineTo(-size * 0.06, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintOrnamentFrame(scene: Scene) {
  const { W, H, m, design } = scene;
  const key = design.ornament;
  if (key === "none") return;
  if (key === "kolam") {
    if (design.layout !== "pillars") {
      ornament(scene, "kolam", m * 1.05, H - m * 1.05, W * 0.11, 0.34);
      ornament(scene, "kolam", W - m * 1.05, m * 1.05, W * 0.11, 0.3);
    }
  } else if (key === "lampRow") {
    if (design.layout !== "sanctum" && design.layout !== "horizon") ornament(scene, "lampRow", W / 2, H - m * 0.95, W * 0.24, 0.8);
  } else if (key === "toran") {
    ornament(scene, "toran", W / 2, m * 0.5, W * 0.86, 0.85);
  } else if (key === "jasmine") {
    if (design.layout !== "scroll") ornament(scene, "jasmine", W - m * 1.15, H * 0.5, W * 0.17, 0.75);
  } else if (key === "starMap") {
    ornament(scene, "starMap", W * 0.84, H * 0.13, W * 0.28, 0.45);
  } else if (key === "mandalaRings") {
    ornament(scene, "mandalaRings", W * 0.5, H * 0.33, W * 0.9, 0.14);
  }
}

/* ----------------------------------- art ---------------------------------- */

function paintArt(scene: Scene, box: Box, key: ArtKey) {
  const { ctx, theme } = scene;
  const image = scene.image;
  if (!image) {
    ctx.save();
    ctx.fillStyle = withAlpha(theme.gold, 0.12);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
    return;
  }
  if (key === "fullBleed") {
    drawImageIn(ctx, image, box, { inset: 0.02, focusY: 0.46, vignette: 0.24 });
    return;
  }
  if (key === "duotone") {
    ctx.save();
    drawImageIn(ctx, image, box, { inset: 0.03, focusY: 0.44, radius: 2 });
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = withAlpha(theme.light ? theme.gold : theme.bgTo, 0.32);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = withAlpha(theme.bgFrom, 0.16);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
    return;
  }
  if (key === "arch") {
    drawImageIn(ctx, image, box, { inset: 0.04, shape: "arch", focusY: 0.42, outline: withAlpha(theme.gold, 0.6), outlineWidth: Math.max(1, box.w * 0.003) });
    return;
  }
  if (key === "circle" || key === "cornerCrop") {
    drawImageIn(ctx, image, box, { inset: 0.04, shape: "circle", focusY: 0.44, outline: withAlpha(theme.gold, 0.55), outlineWidth: Math.max(1, box.w * 0.0026) });
    return;
  }
  if (key === "plate") {
    drawImageIn(ctx, image, box, {
      inset: 0.04, focusY: 0.44, radius: Math.min(box.w, box.h) * 0.02,
      outline: withAlpha(theme.gold, 0.5), outlineWidth: Math.max(1, box.w * 0.002),
    });
    return;
  }
  drawImageIn(ctx, image, box, { inset: 0.04, focusY: 0.42, vignette: 0.16 });
}

/* --------------------------------- brand ---------------------------------- */

function drawLogo(scene: Scene, x: number, y: number, align: CanvasTextAlign = "left", color?: string) {
  if (!scene.showLogo) return;
  const { ctx, W, theme } = scene;
  const ink = color ?? (theme.light ? theme.ink : theme.ink);
  const size = W * 0.0205;
  const label = "ASTRO SIVAM";
  ctx.save();
  ctx.font = SANS(size, 600);
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  const tracking = W * 0.0042;
  const width = measure(ctx, label, SANS(size, 600), tracking);
  const originX = align === "right" ? x - width - size * 1.9 : align === "center" ? x - width / 2 - size * 0.95 : x;
  const markX = align === "right" ? x - width - size * 0.75 : align === "center" ? x - width / 2 - size * 0.1 : x + width + size * 0.75;
  ctx.globalAlpha = 0.95;
  drawTracked(ctx, label, originX, y, tracking, "left");
  const r = size * 0.52;
  ctx.strokeStyle = withAlpha(theme.gold, 0.95);
  ctx.fillStyle = withAlpha(theme.gold, 0.95);
  ctx.lineWidth = Math.max(1, size * 0.09);
  ctx.beginPath();
  ctx.arc(markX, y, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(markX + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
    ctx.lineTo(markX + Math.cos(a) * r * 2.1, y + Math.sin(a) * r * 2.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawKicker(scene: Scene, value: string, x: number, y: number, w: number, align: CanvasTextAlign = "left") {
  const { W, faces, theme } = scene;
  text(scene, "kicker", value.toUpperCase(), x, y, w, {
    face: faces.body, max: W * 0.019, min: W * 0.0145, maxLines: 1, weight: 600,
    color: withAlpha(theme.gold, 0.95), caps: true, tracking: W * 0.0032, align,
  });
}

function drawFooter(scene: Scene, y: number, align: CanvasTextAlign = "right") {
  const { W, m, theme, faces } = scene;
  const x = align === "right" ? W - m : align === "center" ? W / 2 : m;
  text(scene, "footer", scene.footer, x, y, W * 0.6, {
    face: faces.body, max: W * 0.0185, min: W * 0.0145, maxLines: 1, weight: 500,
    color: withAlpha(theme.ink, 0.55), align, tracking: W * 0.0016,
  });
}

function drawCta(scene: Scene, value: string, x: number, y: number, w: number, align: CanvasTextAlign = "left") {
  const { ctx, W, theme, faces } = scene;
  const size = W * 0.0205;
  ctx.save();
  ctx.font = faces.body(size, 600);
  const padX = W * 0.028;
  const padY = W * 0.019;
  const width = Math.min(w, measure(ctx, value, faces.body(size, 600)) + padX * 2);
  const height = size + padY * 2;
  const bx = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  const fill = theme.light ? theme.gold : theme.goldSoft;
  const pill = ctx.createLinearGradient(bx, y, bx, y + height);
  pill.addColorStop(0, withAlpha(fill, 0.98));
  pill.addColorStop(1, withAlpha(fill, 0.82));
  ctx.fillStyle = pill;
  const radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(bx + radius, y);
  ctx.arcTo(bx + width, y, bx + width, y + height, radius);
  ctx.arcTo(bx + width, y + height, bx, y + height, radius);
  ctx.arcTo(bx, y + height, bx, y, radius);
  ctx.arcTo(bx, y, bx + width, y, radius);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.light ? "#FBF5E9" : "#1B1108";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = faces.body(size, 600);
  ctx.fillText(value, bx + width / 2, y + height / 2 + 0.5);
  ctx.restore();
  scene.audit.texts.push({ role: "cta", size, text: value, box: { x: bx, y, w: width, h: height }, color: theme.light ? "#FBF5E9" : "#1B1108" });
  if (size < scene.audit.smallest) scene.audit.smallest = size;
}

function drawFacts(
  scene: Scene,
  x: number,
  y: number,
  w: number,
  mode: "inline" | "rows" | "cards",
  align: CanvasTextAlign = "left",
  height = scene.H * 0.125,
) {
  const { W, H, ctx, theme, faces, copy } = scene;
  const facts = copy.facts;
  if (mode === "inline") {
    text(scene, "facts", facts.join("  ·  "), x, y, w, {
      face: faces.body, max: W * 0.0195, min: W * 0.0155, maxLines: 2, weight: 500,
      color: withAlpha(theme.ink, 0.72), align,
    });
    return;
  }
  if (mode === "rows") {
    const rowH = W * 0.052;
    facts.forEach((fact, index) => {
      const top = y + index * rowH;
      ctx.save();
      ctx.strokeStyle = withAlpha(theme.ink, 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + w, top);
      ctx.stroke();
      ctx.restore();
      text(scene, "fact-index", `0${index + 1}`, x, top + rowH * 0.26, w * 0.12, {
        face: faces.body, max: W * 0.019, min: W * 0.0165, maxLines: 1, weight: 600, color: withAlpha(theme.gold, 0.9),
      });
      text(scene, "facts", fact, x + w * 0.14, top + rowH * 0.26, strandWidth(w), {
        face: faces.body, max: W * 0.0205, min: W * 0.0165, maxLines: 1, weight: 500, color: withAlpha(theme.ink, 0.82),
      });
    });
    return;
  }
  // cards
  const gap = W * 0.016;
  const cardW = (w - gap * 2) / 3;
  facts.forEach((fact, index) => {
    const cx = x + index * (cardW + gap);
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.gold, 0.42);
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, y, cardW, height);
    ctx.restore();
    text(scene, "fact-index", `0${index + 1}`, cx + cardW * 0.08, y + height * 0.16, cardW * 0.7, {
      face: faces.body, max: W * 0.0185, min: W * 0.0155, maxLines: 1, weight: 600, color: withAlpha(theme.gold, 0.9),
    });
    text(scene, "facts", fact, cx + cardW * 0.08, y + height * 0.52, cardW * 0.84, {
      face: faces.body, max: W * 0.0205, min: W * 0.0155, maxLines: 2, weight: 500, color: withAlpha(theme.ink, 0.85),
    });
  });
  void H;
}

const strandWidth = (w: number) => w * 0.8;

/* -------------------------------- layouts --------------------------------- */

type Painter = (scene: Scene) => void;

const sanctum: Painter = (scene) => {
  const { W, H, m, theme } = scene;
  const u = W * 0.024;
  drawLogo(scene, W / 2, m * 0.62, "center");
  drawKicker(scene, scene.copy.kicker, W / 2, m * 1.15, W * 0.66, "center");
  const artW = W * 0.56;
  const artH = H * 0.34;
  paintArt(scene, { x: (W - artW) / 2, y: m * 1.85, w: artW, h: artH }, scene.design.art === "arch" ? "arch" : scene.design.art);
  if (scene.design.ornament !== "none") ornament(scene, "lampRow", W / 2, m * 1.85 + artH + u * 1.4, W * 0.2, 0.85);
  const copyTop = m * 1.85 + artH + u * 3.2;
  const ctaY = H - m * 1.5;
  const copyBottom = copyBlock(scene, m * 1.1, copyTop, W - m * 2.2, ctaY - u * 4.6 - copyTop, {
    headlineMax: W * 0.062, headlineLines: 3, subMax: W * 0.0205, subLines: 3, align: "center",
  });
  drawFacts(scene, m * 1.1, Math.min(copyBottom + u * 1.6, ctaY - u * 3.2), W - m * 2.2, "inline", "center");
  drawCta(scene, scene.copy.cta, W / 2, ctaY, W * 0.5, "center");
  drawFooter(scene, H - m * 0.35, "center");
};

const pillars: Painter = (scene) => {
  const { W, H, m } = scene;
  const u = W * 0.024;
  drawLogo(scene, W / 2, m * 0.62, "center");
  drawKicker(scene, scene.copy.kicker, W / 2, m * 1.15, W * 0.62, "center");
  const artW = W * 0.62;
  paintArt(scene, { x: (W - artW) / 2, y: m * 1.8, w: artW, h: H * 0.3 }, "plate");
  const copyTop = m * 1.8 + H * 0.3 + u * 2.6;
  const ctaY = H - m * 1.5;
  const bottom = copyBlock(scene, m * 1.25, copyTop, W - m * 2.5, ctaY - u * 4.4 - copyTop, {
    headlineMax: W * 0.06, headlineLines: 3, subMax: W * 0.0205, subLines: 3, align: "center",
  });
  drawFacts(scene, m * 1.25, Math.min(bottom + u * 1.5, ctaY - u * 3), W - m * 2.5, "inline", "center");
  drawCta(scene, scene.copy.cta, W / 2, ctaY, W * 0.5, "center");
  drawFooter(scene, H - m * 0.35, "center");
};

const scroll: Painter = (scene) => {
  const { W, H, m } = scene;
  const u = W * 0.026;
  drawLogo(scene, m, m * 0.7, "left");
  drawKicker(scene, scene.copy.kicker, m, m * 1.2, W * 0.5);
  const artSize = W * 0.42;
  paintArt(scene, { x: W - m - artSize, y: m * 1.6, w: artSize, h: artSize }, "circle");
  const copyTop = m * 1.6 + u * 2;
  const ctaY = H - m * 1.6;
  const width = W - m * 2 - artSize * 0.1;
  const bottom = copyBlock(scene, m, copyTop, width, ctaY - u * 7.4 - copyTop, {
    headlineMax: W * 0.058, headlineLines: 4, subMax: W * 0.0205, subLines: 4,
  });
  drawFacts(scene, m, Math.min(bottom + u * 2, ctaY - u * 4.6), width, "rows");
  drawCta(scene, scene.copy.cta, m, ctaY, W * 0.5);
  drawFooter(scene, H - m * 0.35, "right");
};

const medallion: Painter = (scene) => {
  const { W, H, m } = scene;
  const u = W * 0.024;
  const size = W * 0.62;
  drawLogo(scene, W / 2, m * 0.62, "center");
  drawKicker(scene, scene.copy.kicker, W / 2, m * 1.1, W * 0.64, "center");
  paintArt(scene, { x: (W - size) / 2, y: m * 1.7, w: size, h: size }, "circle");
  const copyTop = m * 1.7 + size + u * 2.2;
  const ctaY = H - m * 1.5;
  const bottom = copyBlock(scene, m * 1.2, copyTop, W - m * 2.4, ctaY - u * 4.4 - copyTop, {
    headlineMax: W * 0.058, headlineLines: 3, subMax: W * 0.0205, subLines: 3, align: "center",
  });
  drawFacts(scene, m * 1.2, Math.min(bottom + u * 1.5, ctaY - u * 3), W - m * 2.4, "inline", "center");
  drawCta(scene, scene.copy.cta, W / 2, ctaY, W * 0.5, "center");
  drawFooter(scene, H - m * 0.35, "center");
};

const horizon: Painter = (scene) => {
  const { W, H, m, theme } = scene;
  const u = W * 0.026;
  paintArt(scene, { x: 0, y: 0, w: W, h: H * 0.74 }, "fullBleed");
  const scrim = scene.ctx.createLinearGradient(0, H * 0.24, 0, H * 0.86);
  scrim.addColorStop(0, withAlpha(theme.bgFrom, 0));
  scrim.addColorStop(0.5, withAlpha(theme.bgFrom, 0.88));
  scrim.addColorStop(1, theme.bgFrom);
  scene.ctx.fillStyle = scrim;
  scene.ctx.fillRect(0, H * 0.24, W, H * 0.76);
  const top = scene.ctx.createLinearGradient(0, 0, 0, H * 0.22);
  top.addColorStop(0, withAlpha(theme.bgFrom, 0.9));
  top.addColorStop(1, withAlpha(theme.bgFrom, 0));
  scene.ctx.fillStyle = top;
  scene.ctx.fillRect(0, 0, W, H * 0.22);
  drawLogo(scene, W - m, m * 0.6, "right");
  drawKicker(scene, scene.copy.kicker, m, m * 0.6, W * 0.55);
  const ctaY = H - m * 1.5;
  const copyTop = H * 0.54;
  const bottom = copyBlock(scene, m, copyTop, W * 0.82, ctaY - u * 4.6 - copyTop, {
    headlineMax: W * 0.072, headlineLines: 3, subMax: W * 0.0225, subLines: 3,
    subColor: withAlpha(theme.ink, 0.84),
  });
  drawFacts(scene, m, Math.min(bottom + u * 1.6, ctaY - u * 3), W * 0.72, "inline");
  drawCta(scene, scene.copy.cta, m, ctaY, W * 0.6);
  drawFooter(scene, H - m * 0.32, "right");
};

const band: Painter = (scene) => {
  const { W, H, m, theme, ctx } = scene;
  const u = W * 0.026;
  drawLogo(scene, m, m * 0.72, "left");
  drawKicker(scene, scene.copy.kicker, W - m, m * 0.72, W * 0.4, "right");
  const headlineTop = H * 0.12;
  const artY = H * 0.37;
  const artH = H * 0.31;
  const placed = place(ctx, scene.copy.headline, { x: m, y: headlineTop, w: W - m * 2, h: artY - headlineTop - u * 1.4 }, {
    face: scene.faces.display, max: W * 0.068, min: W * 0.036, maxLines: 3, weight: scene.faces.weight,
    caps: scene.faces.caps, tracking: scene.faces.display === DISPLAY ? W * 0.0016 : 0, lineHeight: 1.08,
  });
  if (placed) {
    render(scene, "headline", placed, { x: m, y: headlineTop, w: W - m * 2, h: placed.height }, {
      face: scene.faces.display, max: W * 0.068, min: W * 0.036, maxLines: 3, weight: scene.faces.weight,
      caps: scene.faces.caps, tracking: scene.faces.display === DISPLAY ? W * 0.0016 : 0, lineHeight: 1.08,
    }, headlineTop);
  } else {
    scene.audit.overflow.push(`headline: ${scene.copy.headline.slice(0, 40)}`);
  }
  paintArt(scene, { x: 0, y: artY, w: W, h: artH }, "banner");
  const copyTop = artY + artH + u * 1.8;
  const ctaY = H - m * 1.5;
  const subline = place(ctx, scene.copy.subline, { x: m, y: copyTop, w: W * 0.78, h: ctaY - u * 4.4 - copyTop }, {
    face: scene.faces.body, max: W * 0.0215, min: W * 0.017, maxLines: 3, weight: 400, lineHeight: 1.45,
  });
  const bottom = subline
    ? render(scene, "subline", subline, { x: m, y: copyTop, w: W * 0.78, h: subline.height }, {
      face: scene.faces.body, max: W * 0.0215, min: W * 0.017, maxLines: 3, weight: 400, lineHeight: 1.45,
      color: withAlpha(theme.ink, 0.82),
    }, copyTop)
    : copyTop;
  drawFacts(scene, m, Math.min(bottom + u * 1.6, ctaY - u * 3), W * 0.72, "inline");
  drawCta(scene, scene.copy.cta, m, ctaY, W * 0.58);
  drawFooter(scene, H - m * 0.32, "right");
};

const ledger: Painter = (scene) => {
  const { W, H, m } = scene;
  const u = W * 0.026;
  const colX = W * 0.56;
  drawLogo(scene, m, m * 0.7, "left");
  drawKicker(scene, scene.copy.kicker, m, m * 1.2, W * 0.44);
  const artBox: Box = { x: colX, y: m * 1.5, w: W - colX - m * 0.6, h: H * 0.46 };
  paintArt(scene, artBox, "sideColumn");
  const serviceBottom = text(scene, "service", scene.copy.serviceTitle, m, m * 2.4, colX - m * 2.2, {
    face: scene.faces.display, max: W * 0.030, min: W * 0.020, maxLines: 3, weight: scene.faces.weight,
    color: withAlpha(scene.theme.gold, 0.95), lineHeight: 1.2,
  });
  const copyTop = Math.max(serviceBottom + u * 1.6, m * 4.6);
  const ctaY = H - m * 1.5;
  const bottom = copyBlock(scene, m, copyTop, colX - m * 2, ctaY - u * 8.6 - copyTop, {
    headlineMax: W * 0.052, headlineLines: 4, subMax: W * 0.0195, subLines: 4,
  });
  drawFacts(scene, m, Math.min(bottom + u * 2, ctaY - u * 6.2), colX - m * 2, "rows");
  drawCta(scene, scene.copy.cta, m, ctaY, colX - m * 2);
  drawFooter(scene, H - m * 0.32, "left");
};

const splitField: Painter = (scene) => {
  const { W, H, m } = scene;
  const u = W * 0.026;
  const fieldX = W * 0.52;
  paintArt(scene, { x: fieldX, y: 0, w: W - fieldX, h: H }, "sideColumn");
  drawLogo(scene, m, m * 0.7, "left");
  drawKicker(scene, scene.copy.kicker, m, H * 0.12, fieldX - m * 1.6);
  const ctaY = H - m * 1.4;
  const copyTop = H * 0.2;
  const bottom = copyBlock(scene, m, copyTop, fieldX - m * 1.8, ctaY - u * 5 - copyTop, {
    headlineMax: W * 0.05, headlineLines: 5, subMax: W * 0.0205, subLines: 5, anchor: "center",
  });
  drawFacts(scene, m, Math.min(bottom + u * 1.8, ctaY - u * 3.4), fieldX - m * 1.8, "inline");
  drawCta(scene, scene.copy.cta, m, ctaY, fieldX - m * 1.8);
  drawFooter(scene, H - m * 0.32, "left");
};

const corner: Painter = (scene) => {
  const { W, H, m, theme, ctx } = scene;
  const u = W * 0.024;
  const circle = W * 0.8;
  paintArt(scene, { x: W * 0.38, y: -circle * 0.3, w: circle, h: circle }, "cornerCrop");
  ctx.save();
  const veil = ctx.createLinearGradient(0, circle * 0.52, 0, circle * 0.94);
  veil.addColorStop(0, withAlpha(theme.bgFrom, 0));
  veil.addColorStop(0.55, withAlpha(theme.bgFrom, 0.55));
  veil.addColorStop(1, theme.bgFrom);
  ctx.fillStyle = veil;
  ctx.fillRect(0, circle * 0.52, W, circle * 0.44);
  ctx.restore();
  drawLogo(scene, m, m * 0.72, "left");
  drawKicker(scene, scene.copy.kicker, m, H * 0.14, W * 0.42);
  text(scene, "index", `№ ${String(scene.design.number).padStart(3, "0")}`, W - m - W * 0.3, H - m * 0.95, W * 0.3, {
    face: SANS, max: W * 0.0155, min: W * 0.0125, maxLines: 1, weight: 600, align: "right",
    color: withAlpha(theme.ink, 0.5), caps: true, tracking: W * 0.0022,
  });
  const ctaY = H - m * 1.3;
  const copyTop = H * 0.6;
  const bottom = copyBlock(scene, m, copyTop, W * 0.68, ctaY - u * 5.2 - copyTop, {
    headlineMax: W * 0.058, headlineLines: 3, subMax: W * 0.0205, subLines: 3,
  });
  drawFacts(scene, m, Math.min(bottom + u * 1.8, ctaY - u * 3.4), W * 0.62, "inline");
  drawCta(scene, scene.copy.cta, m, ctaY, W * 0.55);
  drawFooter(scene, H - m * 0.32, "right");
};

const grid: Painter = (scene) => {
  const { ctx, W, H, m, theme } = scene;
  const u = W * 0.022;
  const col = (W - m * 2) / 12;
  const gap = W * 0.018;
  const artBox: Box = { x: m, y: H * 0.09, w: col * 7 - gap, h: H * 0.29 };
  paintArt(scene, artBox, "plate");
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(artBox.x, artBox.y, artBox.w, artBox.h);
  ctx.restore();
  const cardX = m + col * 7 + gap * 0.4;
  const cardW = col * 5 - gap * 0.4;
  ctx.save();
  ctx.fillStyle = withAlpha(theme.gold, theme.light ? 0.12 : 0.1);
  ctx.fillRect(cardX, H * 0.09, cardW, H * 0.29);
  ctx.restore();
  const serviceBottom = text(scene, "service", scene.copy.serviceTitle, cardX + gap, H * 0.12, cardW - gap * 2, {
    face: scene.faces.display, max: W * 0.028, min: W * 0.019, maxLines: 3, weight: scene.faces.weight,
    color: theme.ink, lineHeight: 1.12,
  });
  text(scene, "kicker", scene.copy.kicker, cardX + gap, Math.min(serviceBottom + u * 0.8, H * 0.33), cardW - gap * 2, {
    face: SANS, max: W * 0.0145, min: W * 0.0115, maxLines: 2, weight: 600,
    color: withAlpha(theme.ink, 0.68), caps: true, tracking: W * 0.0022,
  });
  drawLogo(scene, W - m, m * 0.62, "right");
  const ctaY = H - m * 1.3;
  const cardsH = H * 0.125;
  const copyTop = artBox.y + artBox.h + u * 2.4;
  copyBlock(scene, m, copyTop, col * 7 - gap, ctaY - cardsH - u * 2.4 - copyTop, {
    headlineMax: W * 0.054, headlineLines: 3, subMax: W * 0.0205, subLines: 3, anchor: "center",
  });
  drawFacts(scene, m, ctaY - cardsH - u, W - m * 2, "cards", "left", cardsH);
  drawCta(scene, scene.copy.cta, m, ctaY, W * 0.45);
  drawFooter(scene, H - m * 0.3, "right");
};

const LAYOUTS: Record<Design["layout"], Painter> = {
  sanctum, pillars, scroll, medallion, horizon, band, ledger, splitField, corner, grid,
};

/** Landscape and other wide formats get one honest editorial layout. */
function wideEditorial(scene: Scene) {
  const { W, H, m } = scene;
  const u = W * 0.02;
  const artW = W * 0.42;
  paintArt(scene, { x: W - artW - m * 0.2, y: m * 0.2, w: artW, h: H - m * 0.4 }, "sideColumn");
  drawLogo(scene, m, m * 0.62, "left");
  drawKicker(scene, scene.copy.kicker, m, m * 1.35, W * 0.44);
  const ctaY = H - m * 1.2;
  const copyTop = m * 2.3;
  const bottom = copyBlock(scene, m, copyTop, W - artW - m * 2.8, ctaY - u * 5 - copyTop, {
    headlineMax: W * 0.042, headlineLines: 3, subMax: W * 0.018, subLines: 3,
  });
  drawFacts(scene, m, Math.min(bottom + u * 1.6, ctaY - u * 3.2), W * 0.42, "inline");
  drawCta(scene, scene.copy.cta, m, ctaY, W * 0.34);
  drawFooter(scene, H - m * 0.3, "right");
}

/* ---------------------------------- audit ---------------------------------- */

function measureContrast(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, audit: LibraryAudit, scale: number) {
  const failures: Array<{ role: string; text: string; ratio: number }> = [];
  for (const entry of audit.texts) {
    if (entry.role === "cta") continue;
    const sx = Math.max(0, Math.round(entry.box.x * scale));
    const sy = Math.max(0, Math.round((entry.box.y - 7) * scale));
    const sw = Math.max(1, Math.min(Math.round(canvas.width) - sx, Math.round(entry.box.w * scale)));
    const sh = Math.max(1, Math.min(Math.round(canvas.height) - sy, Math.round(3 * scale)));
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(sx, sy, sw, sh).data;
    } catch {
      continue;
    }
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    if (!count) continue;
    const ground = luminanceOf([r / count, g / count, b / count]);
    const ink = parseColor(entry.color);
    if (!ink) continue;
    const ratio = (Math.max(ground, luminanceOf(ink)) + 0.05) / (Math.min(ground, luminanceOf(ink)) + 0.05);
    if (ratio < 3.2) failures.push({ role: entry.role, text: entry.text.slice(0, 44), ratio: Math.round(ratio * 10) / 10 });
  }
  return failures;
}

/* --------------------------------- public --------------------------------- */

export interface LibraryRenderOptions {
  design: Design;
  width: number;
  height: number;
  copy?: Partial<DesignCopy>;
  image?: string | null;
  footer?: string;
  showLogo?: boolean;
  scale?: number;
}

export async function renderLibraryDesign(options: LibraryRenderOptions): Promise<HTMLCanvasElement> {
  const { design } = options;
  const W = options.width;
  const H = options.height;
  const theme: Theme = THEMES[design.theme] ?? THEMES.midnight;
  const copy: DesignCopy = { ...design.copy, ...(options.copy ?? {}) };
  const { canvas, ctx } = createCanvas(W, H, options.scale ?? 1);
  const image = await loadImageSource(options.image ?? design.image).catch(() => null);
  const audit: LibraryAudit = { texts: [], overflow: [], lowContrast: [], smallest: Number.POSITIVE_INFINITY, passes: true };
  const scene: Scene = {
    ctx,
    W,
    H,
    m: W * 0.075,
    scale: options.scale ?? 1,
    theme,
    faces: FACES[design.type],
    copy,
    design,
    image,
    footer: options.footer ?? "astrosivam.com",
    showLogo: options.showLogo !== false,
    audit,
    wide: W / H > 1.15,
  };

  paintBackground(scene, design.background);
  paintFrame(scene, design.frame);
  if (!scene.wide) paintOrnamentFrame(scene);
  if (scene.wide) wideEditorial(scene);
  else LAYOUTS[design.layout](scene);

  audit.lowContrast = measureContrast(canvas, ctx, audit, options.scale ?? 1);
  audit.smallest = Number.isFinite(audit.smallest) ? audit.smallest : 0;
  audit.passes = audit.overflow.length === 0 && audit.smallest >= W * 0.0145 && audit.lowContrast.length === 0;
  AUDITS.set(canvas, audit);
  return canvas;
}

export { contrast };
