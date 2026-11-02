import type { CompositionLayers, TextBounds } from "./compositionRender";
import type { Box } from "./compositionPlan";
import { withAlpha, rand } from "./canvas";

export const MOTION_SECONDS = 15;
export const MOTION_FPS = 30;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const out = (t: number) => 1 - Math.pow(1 - clamp(t), 3);

/**
 * Layered motion graphics, not a zoom over a flattened PNG.
 * `progress` is 0..1 over a 15-second timeline. The final second is an exact
 * static hold, so the last video frame and the PNG share the same composition.
 */
export function paintMotionFrame(ctx: CanvasRenderingContext2D, layers: CompositionLayers, progress: number) {
  const { width: W, height: H, audit } = layers;
  const p = audit.plan;
  const t = clamp(progress) * MOTION_SECONDS;
  const settle = 1 - smooth(12.4, 14, t);
  const sx = layers.background.width / W, sy = layers.background.height / H;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Work in design pixels even when the source layers were rendered at a preview scale.
  ctx.scale(ctx.canvas.width / W, ctx.canvas.height / H);
  ctx.drawImage(layers.background, 0, 0, W, H);

  // Ambient orbital layer: a slow independent drift, never a camera zoom.
  const angle = Math.sin(t * .32) * .018 * settle;
  ctx.save(); ctx.translate(p.art.x + p.art.w / 2, p.art.y + p.art.h / 2); ctx.rotate(angle); ctx.translate(-(p.art.x + p.art.w / 2), -(p.art.y + p.art.h / 2));
  ctx.drawImage(layers.effects, 0, 0, W, H); ctx.restore();

  // Artwork parallax: bounded to a few pixels, with a different phase from type.
  const dx = Math.sin(t * .45) * W * .006 * settle;
  const dy = Math.cos(t * .38) * H * .004 * settle;
  const artScale = 1 + .008 * Math.sin(t * .3) * settle;
  ctx.save(); ctx.translate(p.art.x + p.art.w / 2 + dx, p.art.y + p.art.h / 2 + dy); ctx.scale(artScale, artScale); ctx.translate(-(p.art.x + p.art.w / 2), -(p.art.y + p.art.h / 2));
  ctx.drawImage(layers.art, 0, 0, W, H); ctx.restore();

  // One restrained light pass across the artwork, not a persistent glow.
  const sweep = smooth(3.2, 6.8, t) * (1 - smooth(6.8, 8.2, t));
  if (sweep > 0 && p.key !== "minimal") {
    ctx.save(); ctx.beginPath(); ctx.rect(p.art.x, p.art.y, p.art.w, p.art.h); ctx.clip();
    const x = p.art.x - p.art.w * .4 + smooth(3.2, 8.2, t) * p.art.w * 1.8;
    const g = ctx.createLinearGradient(x - p.art.w * .18, 0, x + p.art.w * .18, 0);
    g.addColorStop(0, "rgba(255,240,200,0)"); g.addColorStop(.5, `rgba(255,240,200,${.07 * sweep})`); g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g; ctx.fillRect(p.art.x, p.art.y, p.art.w, p.art.h); ctx.restore();
  }

  // Fine particles move on their own trajectories and stay out of the reading zones.
  if (settle > 0 && ["cosmic", "hero", "devotional", "mandala"].includes(p.key)) {
    const rng = rand(p.seed); ctx.save();
    for (let i = 0; i < 18; i++) {
      const bx = rng() * W, by = rng() * H, speed = .3 + rng() * .5;
      const x = bx + Math.sin(t * speed + i) * W * .012, y = (by - t * H * .004 * speed + H) % H;
      if (audit.text.some((entry) => x > entry.box.x - 8 && x < entry.box.x + entry.box.w + 8 && y > entry.box.y - 8 && y < entry.box.y + entry.box.h + 8)) continue;
      ctx.fillStyle = withAlpha(p.category === "murugan" ? "#F1DCA7" : "#E8C77E", (.1 + rng() * .18) * settle);
      ctx.beginPath(); ctx.arc(x, y, .8 + rng() * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Typography reveals line by line, with a small vertical mask and stagger.
  const lines = audit.text.filter((entry) => entry.role !== "cta" && entry.role !== "footer");
  for (const entry of lines) {
    const order = entry.role === "kicker" ? 0 : entry.role === "headline" ? 1 : 2;
    const start = .35 + order * .38 + entry.line * .12;
    const reveal = out((t - start) / .85);
    if (reveal <= 0) continue;
    drawRegion(ctx, layers.type, entry.box, sx, sy, { alpha: reveal, dy: (1 - reveal) * entry.size * .45, clip: true });
  }
  // Identity is present early and stays still; the action arrives last.
  drawRegion(ctx, layers.brand, audit.logoBox ?? p.logo, sx, sy, { alpha: smooth(.1, .8, t), pad: W * .02 });
  drawRegion(ctx, layers.brand, p.footer, sx, sy, { alpha: smooth(.4, 1.1, t), pad: W * .01 });
  const ctaReveal = out((t - 1.65) / .8);
  const ctaBox = audit.ctaBox ?? p.cta;
  drawRegion(ctx, layers.brand, ctaBox, sx, sy, { alpha: ctaReveal, dy: (1 - ctaReveal) * ctaBox.h * .25, clip: true, pad: W * .004 });
  ctx.restore();
}
function drawRegion(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, box: Box, sx: number, sy: number, options: { alpha?: number; dy?: number; clip?: boolean; pad?: number } = {}) {
  const pad = options.pad ?? 2;
  const x = box.x - pad, y = box.y - pad, w = box.w + pad * 2, h = box.h + pad * 2;
  if (w <= 0 || h <= 0) return;
  ctx.save(); ctx.globalAlpha = options.alpha ?? 1;
  if (options.clip) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  ctx.drawImage(source, x * sx, y * sy, w * sx, h * sy, x, y + (options.dy ?? 0), w, h);
  ctx.restore();
}
export function motionTimeline() {
  return [
    { at: 0, label: "Identity establishes" }, { at: .35, label: "Service and kicker reveal" },
    { at: .75, label: "Headline lines stagger in" }, { at: 1.1, label: "Supporting copy settles" },
    { at: 1.65, label: "Call to action arrives" }, { at: 3.2, label: "A single light pass crosses the art" },
    { at: 12.4, label: "Motion settles into the final poster" },
  ];
}
