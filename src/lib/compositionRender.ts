import type { DisplayFontKey, StyleKey, Theme, ThemeKey } from "../types";
import type { CompositionKey, DesignCategory } from "../data/designBriefs";
import { createCanvas, loadImageSource, loadLogo, ensureFonts, withAlpha, rand } from "./canvas";
import { displayFaceFor, themeFor, paintGrain, roundRect, drawLogoMark, archPath } from "./posterKit";
import { SANS, INTER } from "./canvas";
import { wrapAll } from "./typeset";
import { planComposition, type Box, type CompositionPlan, type SceneLayer } from "./compositionPlan";
import { englishCopy, validatePosterCopy } from "./englishCopy";
import { getBrandPlacement } from "./brandPlacement";
import { auditLegibility, TypeLog, type TypeRole } from "./legibility";

export interface CompositionCopy {
  kicker: string; serviceTitle: string; headline: string; subline: string; cta: string; footer: string; facts: string[];
}
export interface CompositionRenderOptions {
  width: number; height: number; composition: CompositionKey; category: DesignCategory; occasion?: string;
  themeKey: ThemeKey; style: StyleKey; display: DisplayFontKey;
  image?: string | null; imageIsLibrary?: boolean; showLogo: boolean;
  copy: CompositionCopy; seed?: number; scale?: number; layer?: SceneLayer;
  /** Composition-led placement is the default; global placement remains available. */
  useGlobalBrandPlacement?: boolean;
}
export interface TextBounds { text: string; role: TypeRole; size: number; box: Box; line: number }
export interface DesignAudit {
  plan: CompositionPlan; text: TextBounds[]; type: TypeLog;
  overflow: string[];
  legibility: ReturnType<typeof auditLegibility>;
  /** Painted bounds (not the plan boxes) so motion reveals the real lockup/pill. */
  logoBox: Box | null; ctaBox: Box | null;
}
interface Scene {
  ctx: CanvasRenderingContext2D; p: CompositionPlan; theme: Theme; copy: CompositionCopy;
  img: HTMLImageElement | null; logo: HTMLImageElement | null; face: (size: number, weight?: number) => string;
  style: StyleKey; layer?: SceneLayer; showLogo: boolean; imageIsLibrary: boolean; useGlobalBrandPlacement: boolean;
  audit: DesignAudit;
}
const audits = new WeakMap<HTMLCanvasElement, DesignAudit>();
export const getDesignAudit = (canvas: HTMLCanvasElement) => audits.get(canvas);
const active = (s: Scene, layer: SceneLayer) => !s.layer || s.layer === layer;
const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;

/** Measure every line at the exact face used to paint it; never silently clip copy. */
function text(s: Scene, value: string, box: Box, role: TypeRole, options: { align?: "left" | "center" | "right"; max?: number; min?: number; color?: string; face?: (n: number, w?: number) => string; weight?: number; lead?: number; valign?: "top" | "middle" } = {}) {
  if (!active(s, "type") || !value.trim()) return;
  const { ctx, p } = s;
  const align = options.align ?? p.align;
  const face = options.face ?? (role === "headline" ? s.face : (n: number, w = 500) => SANS(n, w));
  const max = options.max ?? (role === "headline" ? Math.min(box.w * .22, box.h * .52, p.W * .115) : role === "body" ? p.W * .034 : p.W * .027);
  const min = options.min ?? (role === "headline" ? p.W * .05 : role === "body" ? p.W * .031 : role === "footer" ? p.W * .024 : p.W * .026);
  const lead = options.lead ?? (role === "headline" ? 1.08 : 1.35);
  const weight = options.weight ?? (role === "headline" ? 600 : 500);
  let size = max, lines: string[] = [];
  ctx.save();
  for (let i = 0; i < 24; i++) {
    ctx.font = face(size, weight);
    lines = wrapAll(ctx, value.trim(), box.w);
    if (lines.length * size * lead <= box.h && lines.every((line) => ctx.measureText(line).width <= box.w + .5)) break;
    if (size <= min + .01) break;
    size = Math.max(min, (size + min) / 2);
  }
  ctx.font = face(size, weight);
  lines = wrapAll(ctx, value.trim(), box.w);
  const height = lines.length * size * lead;
  if (height > box.h + 1 || lines.some((line) => ctx.measureText(line).width > box.w + 1)) s.audit.overflow.push(`${role}: ${value.slice(0, 40)}`);
  const top = box.y + (options.valign === "middle" ? Math.max(0, (box.h - height) / 2) : 0);
  ctx.fillStyle = options.color ?? (role === "headline" ? s.theme.ink : role === "body" ? withAlpha(s.theme.ink, .82) : s.theme.goldSoft);
  if (s.theme.light && role !== "headline") ctx.fillStyle = options.color ?? (role === "body" ? withAlpha(s.theme.ink, .82) : s.theme.gold);
  ctx.textBaseline = "top"; ctx.textAlign = align;
  const x = align === "center" ? cx(box) : align === "right" ? box.x + box.w : box.x;
  lines.forEach((line, index) => {
    const y = top + index * size * lead;
    ctx.fillText(line, x, y);
    const width = ctx.measureText(line).width;
    const lx = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    s.audit.text.push({ text: line, role, size, box: { x: lx, y, w: width, h: size * lead }, line: index });
    s.audit.type.add(role, size, line);
  });
  ctx.restore();
}
function headline(s: Scene, box = s.p.title, scale = 1) { text(s, s.copy.headline, box, "headline", { max: Math.min(box.w * .24, box.h * .55, s.p.W * .13) * scale, weight: 600 }); }
function labels(s: Scene) {
  text(s, s.copy.serviceTitle, s.p.service, "kicker", { weight: 600, max: s.p.W * .028 });
  text(s, s.copy.kicker, s.p.kicker, "kicker", { max: s.p.W * .026, color: withAlpha(s.theme.ink, s.theme.light ? .7 : .68) });
}
function body(s: Scene) { text(s, s.copy.subline, s.p.body, "body", { weight: 400 }); }
function rule(s: Scene, x: number, y: number, w: number, alpha = .45) {
  const { ctx, theme } = s; ctx.save(); ctx.strokeStyle = withAlpha(theme.gold, alpha); ctx.lineWidth = Math.max(1, s.p.W * .0012); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); ctx.restore();
}
function ground(s: Scene, color?: string) {
  if (!active(s, "background")) return;
  const { ctx, p, theme } = s;
  const g = ctx.createLinearGradient(0, 0, p.W * .7, p.H);
  g.addColorStop(0, color ?? theme.bgFrom); g.addColorStop(1, color ?? theme.bgTo);
  ctx.fillStyle = g; ctx.fillRect(0, 0, p.W, p.H);
  const heritage = ["signature", "thanjavur", "kolam", "silk", "gopuram", "deepam"].includes(s.style);
  paintGrain(ctx, p.W, p.H, p.seed % 97, heritage ? .035 : .018);
}
function clipArt(s: Scene, box: Box, shape = s.p.artShape) {
  const { ctx } = s; ctx.beginPath();
  if (shape === "circle") ctx.arc(cx(box), cy(box), Math.min(box.w, box.h) / 2, 0, Math.PI * 2);
  else if (shape === "arch") { const path = archPath(box.x, box.y, box.w, box.h); ctx.clip(path); return; }
  else if (shape === "diagonal") { ctx.moveTo(box.x + box.w * .22, box.y); ctx.lineTo(box.x + box.w, box.y); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.lineTo(box.x, box.y + box.h * .72); ctx.closePath(); }
  else ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
}
function art(s: Scene, box = s.p.art, shape = s.p.artShape) {
  if (!active(s, "art")) return;
  const { ctx, p, img, theme } = s;
  ctx.save();
  if (p.artRotation) { ctx.translate(cx(box), cy(box)); ctx.rotate(p.artRotation); ctx.translate(-cx(box), -cy(box)); }
  clipArt(s, box, shape);
  if (img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const trim = s.imageIsLibrary ? .035 : 0;
    const sw = iw * (1 - trim * 2), sh = ih * (1 - trim * 2);
    const scale = Math.max(box.w / sw, box.h / sh);
    const fx = .5 + ((p.seed % 5) - 2) * .012;
    const fy = s.imageIsLibrary ? .5 : .42;
    const dx = box.x - (sw * scale - box.w) * fx, dy = box.y - (sh * scale - box.h) * fy;
    ctx.drawImage(img, iw * trim, ih * trim, sw, sh, dx, dy, sw * scale, sh * scale);
  } else {
    ctx.fillStyle = withAlpha(theme.gold, .08); ctx.fillRect(box.x, box.y, box.w, box.h);
    categoryIllustration(s, cx(box), cy(box), Math.min(box.w, box.h) * .78);
  }
  ctx.restore();
}
function scrim(s: Scene, direction: "bottom" | "left" | "top", strength = .94) {
  if (!active(s, "art")) return;
  const { ctx, p, theme } = s;
  const g = direction === "left" ? ctx.createLinearGradient(0, 0, p.W * .72, 0) : ctx.createLinearGradient(0, direction === "top" ? 0 : p.H, 0, direction === "top" ? p.H * .25 : p.H * .38);
  g.addColorStop(0, withAlpha(theme.bgFrom, strength)); g.addColorStop(.55, withAlpha(theme.bgFrom, strength * .72)); g.addColorStop(1, withAlpha(theme.bgFrom, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, p.W, p.H);
}
function brand(s: Scene) {
  if (!active(s, "brand")) return;
  const { ctx, p, theme } = s;
  if (s.showLogo) {
    const size = Math.min(p.logo.h * .9, p.W * .044) * getBrandPlacement().scale;
    let box = p.logo, align = p.logoAlign;
    if (s.useGlobalBrandPlacement) {
      const pos = getBrandPlacement().position;
      align = pos.endsWith("right") ? "right" : pos.endsWith("center") ? "center" : "left";
      const top = pos.startsWith("top");
      box = { x: p.safe.x, y: top ? p.safe.y : p.safe.y + p.safe.h - p.logo.h, w: p.safe.w, h: p.logo.h };
    }
    const lockup = Math.max(p.W * .025, size);
    const anchorX = align === "center" ? cx(box) : align === "right" ? box.x + box.w : box.x;
    const width = drawLogoMark(ctx, s.logo, { x: anchorX, y: box.y, size: lockup, align, theme, variant: "wordmark" });
    s.audit.logoBox = { x: align === "center" ? anchorX - width / 2 : align === "right" ? anchorX - width : anchorX, y: box.y, w: width, h: lockup };
  }
  const saved = s.layer; s.layer = "type";
  text(s, s.copy.footer, p.footer, "footer", { align: "right", max: p.W * .024, color: withAlpha(theme.ink, .65) });
  s.layer = saved;
}
// CTA and footer live on the brand layer so they can settle independently.
function ctaOnly(s: Scene) {
  if (!active(s, "brand") || !s.copy.cta) return;
  const saved = s.layer; s.layer = "type";
  const { ctx, p, theme } = s; const cta = p.cta;
  const size = Math.min(p.W * .032, cta.h * .55);
  ctx.save(); ctx.font = SANS(size, 600);
  const tw = ctx.measureText(s.copy.cta).width;
  const w = Math.min(cta.w, tw + size * 2.6), h = cta.h;
  const x = p.ctaAlign === "center" ? cx(cta) - w / 2 : p.ctaAlign === "right" ? cta.x + cta.w - w : cta.x;
  ctx.fillStyle = theme.gold; roundRect(ctx, x, cta.y, w, h, h * .18); ctx.fill();
  s.audit.ctaBox = { x, y: cta.y, w, h };
  text(s, s.copy.cta, { x: x + size * .5, y: cta.y, w: w - size, h }, "cta", { align: "center", color: theme.light ? "#FFF8EC" : theme.bgFrom, max: size, min: size, weight: 600, valign: "middle" });
  ctx.restore(); s.layer = saved;
}
function facts(s: Scene) {
  if (!active(s, "type")) return;
  const { ctx, p, theme } = s;
  p.facts.forEach((box, i) => {
    const value = s.copy.facts[i]; if (!value) return;
    const numW = box.h * .7;
    ctx.save(); ctx.fillStyle = withAlpha(theme.gold, .1); roundRect(ctx, box.x, box.y, box.w, box.h, box.h * .12); ctx.fill(); ctx.restore();
    text(s, String(i + 1).padStart(2, "0"), { x: box.x + box.h * .15, y: box.y, w: numW, h: box.h }, "kicker", { align: "center", valign: "middle", max: box.h * .32, color: theme.gold });
    text(s, value, { x: box.x + numW + box.h * .25, y: box.y, w: box.w - numW - box.h * .4, h: box.h }, "body", { valign: "middle", max: p.W * .031 });
    if (i < 2) rule(s, box.x, box.y + box.h + p.safe.h * .012, box.w, .2);
  });
}

/* Category-specific vector fallbacks: no letters, no fake scripture, no clipart. */
function categoryIllustration(s: Scene, x: number, y: number, size: number) {
  const { ctx, p, theme } = s; ctx.save(); ctx.translate(x, y); ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = theme.gold; ctx.fillStyle = withAlpha(theme.gold, .14); ctx.lineWidth = 1.1; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const circle = (r: number, ox = 0, oy = 0) => { ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.stroke(); };
  const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  switch (p.motif) {
    case "chart":
      ctx.strokeRect(-34, -34, 68, 68); ctx.strokeRect(-29, -29, 58, 58); line(-34, -34, 34, 34); line(34, -34, -34, 34); line(0, -34, 34, 0); line(34, 0, 0, 34); line(0, 34, -34, 0); line(-34, 0, 0, -34); circle(45); break;
    case "union":
      circle(23, -17, -5); circle(23, 17, -5); ctx.beginPath(); ctx.moveTo(-38, 35); ctx.quadraticCurveTo(-35, 2, -17, 4); ctx.quadraticCurveTo(0, 8, 0, 35); ctx.moveTo(38, 35); ctx.quadraticCurveTo(35, 2, 17, 4); ctx.quadraticCurveTo(0, 8, 0, 35); ctx.stroke(); break;
    case "cradle":
      ctx.beginPath(); ctx.moveTo(-35, -5); ctx.lineTo(35, -5); ctx.quadraticCurveTo(28, 28, 0, 28); ctx.quadraticCurveTo(-28, 28, -35, -5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -5, 27, Math.PI, 0); ctx.stroke(); line(-25, 35, 25, 35); line(-18, 28, -25, 35); line(18, 28, 25, 35); circle(8, 24, -30); break;
    case "calendar":
      ctx.strokeRect(-30, -35, 60, 70); line(-30, -17, 30, -17); [-15, 0, 15].forEach((v) => { line(v, -42, v, -28); [-3, 12, 27].forEach((h) => circle(2, v, h)); }); break;
    case "planets":
      [16, 28, 42].forEach((r, i) => { ctx.save(); ctx.rotate(i * .55); ctx.beginPath(); ctx.ellipse(0, 0, r, r * .55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }); circle(8); circle(4, 28, -14); circle(5, -32, 18); break;
    case "vel":
      line(0, -15, 0, 44); ctx.beginPath(); ctx.moveTo(0, -46); ctx.quadraticCurveTo(17, -24, 0, -10); ctx.quadraticCurveTo(-17, -24, 0, -46); ctx.fill(); ctx.stroke(); circle(5, 0, -22); break;
    case "harvest":
      ctx.beginPath(); ctx.ellipse(0, 8, 27, 25, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeRect(-15, -20, 30, 7); [-12, 0, 12].forEach((v) => { ctx.beginPath(); ctx.moveTo(v, -22); ctx.quadraticCurveTo(v - 8, -35, v, -42); ctx.stroke(); }); line(35, 40, 42, -38); line(-35, 40, -42, -38); break;
    case "sun": circle(18); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; line(Math.cos(a) * 25, Math.sin(a) * 25, Math.cos(a) * 36, Math.sin(a) * 36); } break;
    default:
      [-24, 0, 24].forEach((v, i) => { const yy = i === 1 ? -12 : 10; ctx.beginPath(); ctx.ellipse(v, yy + 15, 13, 6, 0, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(v, yy + 8); ctx.quadraticCurveTo(v - 8, yy, v, yy - 12); ctx.quadraticCurveTo(v + 8, yy, v, yy + 8); ctx.stroke(); });
  }
  ctx.restore();
}
function orbit(s: Scene, x: number, y: number, r: number, count = 3) {
  if (!active(s, "effects")) return;
  const { ctx, theme } = s; ctx.save(); ctx.strokeStyle = withAlpha(theme.gold, .22); ctx.lineWidth = Math.max(1, s.p.W * .001);
  for (let i = 0; i < count; i++) { ctx.beginPath(); ctx.ellipse(x, y, r * (1 + i * .16), r * (.62 + i * .08), -.45 + i * .5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function particles(s: Scene, count = 22) {
  if (!active(s, "effects")) return;
  const { ctx, p, theme } = s; const rng = rand(p.seed); ctx.save();
  for (let i = 0; i < count; i++) { const x = rng() * p.W, y = rng() * p.H, r = .7 + rng() * 1.5; ctx.fillStyle = withAlpha(theme.goldSoft, .12 + rng() * .25); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/* ===================== 12 independent composition painters ===================== */
function paintHero(s: Scene) {
  ground(s); art(s); scrim(s, s.p.scrim === "left" ? "left" : "bottom", .97); scrim(s, "top", .55);
  labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintEditorial(s: Scene) {
  ground(s); const { ctx, p, theme } = s;
  if (active(s, "effects")) { rule(s, p.safe.x, p.safe.y + p.safe.h * .175, p.safe.w, .5); ctx.save(); ctx.fillStyle = withAlpha(theme.gold, .07); ctx.fillRect(p.safe.x, p.safe.y + p.safe.h * .55, p.W * .004, p.safe.h * .3); ctx.restore(); }
  art(s); labels(s); headline(s, p.title, 1.12); body(s); brand(s); ctaOnly(s);
}
function paintAsymmetric(s: Scene) {
  ground(s); const { ctx, p, theme } = s;
  if (active(s, "background")) { ctx.fillStyle = withAlpha(theme.gold, .07); ctx.fillRect(p.W * .48, 0, p.W * .52, p.H); }
  art(s); if (active(s, "effects")) rule(s, p.title.x, p.title.y - p.safe.h * .025, p.title.w * .45, .7);
  labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintMandala(s: Scene) {
  ground(s); const { ctx, p, theme } = s; const r = Math.min(p.art.w, p.art.h) / 2;
  if (active(s, "effects")) {
    ctx.save(); ctx.strokeStyle = withAlpha(theme.gold, .35); ctx.lineWidth = Math.max(1, p.W * .0012);
    [1.08, 1.18].forEach((k) => { ctx.beginPath(); ctx.arc(cx(p.art), cy(p.art), r * k, 0, Math.PI * 2); ctx.stroke(); });
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; const x = cx(p.art) + Math.cos(a) * r * 1.18, y = cy(p.art) + Math.sin(a) * r * 1.18; ctx.fillStyle = withAlpha(theme.gold, .55); ctx.beginPath(); ctx.arc(x, y, p.W * .0025, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  art(s); labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintDiagonal(s: Scene) {
  ground(s); const { ctx, p, theme } = s;
  art(s);
  if (active(s, "art")) { ctx.save(); ctx.fillStyle = theme.bgFrom; ctx.beginPath(); ctx.moveTo(0, p.H * (p.format === "landscape" ? 0 : .43)); ctx.lineTo(p.W * (p.format === "landscape" ? .56 : 1), p.H * (p.format === "landscape" ? 1 : .60)); ctx.lineTo(0, p.H); ctx.closePath(); ctx.fill(); ctx.restore(); }
  if (active(s, "effects")) { ctx.save(); ctx.strokeStyle = withAlpha(theme.gold, .7); ctx.lineWidth = p.W * .002; ctx.beginPath(); ctx.moveTo(0, p.H * (p.format === "landscape" ? 0 : .43)); ctx.lineTo(p.W * (p.format === "landscape" ? .56 : 1), p.H * (p.format === "landscape" ? 1 : .60)); ctx.stroke(); ctx.restore(); }
  labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintCosmic(s: Scene) {
  ground(s, s.theme.light ? undefined : "#07101F"); orbit(s, cx(s.p.art), cy(s.p.art), Math.min(s.p.art.w, s.p.art.h) * .52, 3); particles(s, 30);
  art(s); labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintSplit(s: Scene) {
  ground(s); const { ctx, p, theme } = s;
  if (active(s, "background")) { ctx.fillStyle = withAlpha(theme.gold, .06); if (p.format === "landscape") ctx.fillRect(0, 0, p.W * .52, p.H); else ctx.fillRect(0, p.H * .47, p.W, p.H * .53); }
  art(s); if (active(s, "effects")) rule(s, p.safe.x, p.service.y - p.safe.h * .018, p.safe.w * (p.format === "landscape" ? .44 : 1), .55);
  labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintStory(s: Scene) {
  ground(s); const { ctx, p, theme } = s;
  if (active(s, "background")) { ctx.save(); ctx.fillStyle = withAlpha(theme.gold, .07); roundRect(ctx, p.art.x - p.W * .018, p.art.y - p.W * .018, p.art.w + p.W * .036, p.art.h + p.W * .036, p.W * .02); ctx.fill(); ctx.restore(); }
  art(s); if (active(s, "effects")) { rule(s, p.title.x, p.title.y - p.safe.h * .018, p.title.w * .18, .8); }
  labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintMinimal(s: Scene) {
  ground(s); art(s); labels(s); headline(s, pScaleTitle(s)); body(s); brand(s); ctaOnly(s);
}
function pScaleTitle(s: Scene) { return { ...s.p.title, y: s.p.title.y + s.p.title.h * .04, h: s.p.title.h * .92 }; }
function paintInfographic(s: Scene) {
  ground(s); art(s); labels(s); headline(s); body(s); facts(s); brand(s); ctaOnly(s);
}
function paintCollage(s: Scene) {
  ground(s); const { ctx, p, theme } = s;
  if (active(s, "background")) {
    ctx.save(); ctx.translate(cx(p.art), cy(p.art)); ctx.rotate(-p.artRotation * 1.6); ctx.fillStyle = s.theme.light ? "#E5D5BE" : withAlpha(theme.gold, .18); ctx.fillRect(-p.art.w * .55, -p.art.h * .55, p.art.w * 1.1, p.art.h * 1.1); ctx.restore();
  }
  art(s);
  if (active(s, "background")) { ctx.save(); ctx.fillStyle = theme.bgFrom; ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = p.W * .025; ctx.shadowOffsetY = p.W * .008; ctx.fillRect(p.title.x - p.W * .025, p.title.y - p.H * .018, p.title.w + p.W * .05, p.title.h + p.H * .036); ctx.restore(); }
  if (active(s, "effects")) { ctx.save(); ctx.strokeStyle = withAlpha(theme.gold, .5); ctx.lineWidth = p.W * .0015; ctx.strokeRect(p.art.x - p.W * .012, p.art.y - p.W * .012, p.art.w + p.W * .024, p.art.h + p.W * .024); ctx.restore(); }
  labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
function paintDevotional(s: Scene) {
  ground(s); art(s); const { ctx, p, theme } = s;
  if (active(s, "effects")) { rule(s, p.safe.x, p.H * .225, p.safe.w, .6); rule(s, p.safe.x, p.H * .585, p.safe.w, .6); }
  labels(s); headline(s); body(s); brand(s); ctaOnly(s);
}
const PAINTERS: Record<CompositionKey, (s: Scene) => void> = { hero: paintHero, editorial: paintEditorial, asymmetric: paintAsymmetric, mandala: paintMandala, diagonal: paintDiagonal, cosmic: paintCosmic, split: paintSplit, story: paintStory, minimal: paintMinimal, infographic: paintInfographic, collage: paintCollage, devotional: paintDevotional };

export function paintCompositionScene(ctx: CanvasRenderingContext2D, options: CompositionRenderOptions, assets: { img: HTMLImageElement | null; logo: HTMLImageElement | null }): DesignAudit {
  const copy = englishCopy(options.copy);
  const errors = validatePosterCopy(options.copy);
  if (errors.length) throw new Error(errors[0]);
  const p = planComposition({ key: options.composition, category: options.category, occasion: options.occasion, width: options.width, height: options.height, seed: options.seed, contentLength: copy.headline.length + copy.subline.length });
  const theme = themeFor(options.themeKey);
  // Cosmic copy always sits on its own dark atlas, regardless of palette choice.
  const sceneTheme = options.composition === "cosmic" && theme.light ? { ...themeFor("midnight") } : theme;
  const type = new TypeLog();
  const audit: DesignAudit = { plan: p, text: [], type, overflow: [], legibility: auditLegibility([], options.width, 360), logoBox: null, ctaBox: null };
  const scene: Scene = { ctx, p, theme: sceneTheme, copy, img: assets.img, logo: assets.logo, face: displayFaceFor(options.display), style: options.style, layer: options.layer, showLogo: options.showLogo, imageIsLibrary: options.imageIsLibrary !== false, useGlobalBrandPlacement: Boolean(options.useGlobalBrandPlacement), audit };
  ctx.save();
  try { PAINTERS[options.composition](scene); } finally { ctx.restore(); }
  audit.legibility = auditLegibility(type.entries, options.width, 360);
  return audit;
}
export async function loadCompositionAssets(options: CompositionRenderOptions) {
  await ensureFonts();
  const [img, logo] = await Promise.all([options.image ? loadImageSource(options.image).catch(() => null) : Promise.resolve(null), options.showLogo ? loadLogo().catch(() => null) : Promise.resolve(null)]);
  return { img, logo };
}
export async function renderComposition(options: CompositionRenderOptions): Promise<HTMLCanvasElement> {
  const assets = await loadCompositionAssets(options);
  const { canvas, ctx } = createCanvas(options.width, options.height, options.scale ?? 1);
  const audit = paintCompositionScene(ctx, options, assets);
  if (audit.overflow.length) throw new Error(`This composition needs shorter copy (${audit.overflow[0]}). Try Type-led editorial or shorten the text.`);
  audits.set(canvas, audit);
  return canvas;
}
