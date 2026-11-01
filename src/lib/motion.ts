/**
 * motion — the animated-poster engine.
 *
 * A poster is painted once into four separable layers (ground, art, copy,
 * brand) plus a manifest of the rectangles those layers occupy. Every video
 * frame and every live motion-preview frame is then a cheap composite of
 * those layers with a camera move, parallax between depth planes, masked type
 * reveals and live light overlays (twinkle, shimmer, motes, glow pulse).
 *
 * This is what separates a campaign film from a slideshow: the depth planes
 * move at different rates, the headline reveals through a travelling mask
 * instead of fading as a block, and the light keeps living after the type
 * has settled. Stills and motion share one painter, so a printed PNG and a
 * reel frame are the same artwork at different times.
 */
import type { PosterTemplate, Theme } from "../types";
import { withAlpha } from "./posterKit";
import type { SceneBox } from "./graphicKit";

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
/** 0 before `from`, 1 after `to`, eased between. */
export const windowed = (t: number, from: number, to: number) => easeOutCubic(clamp01((t - from) / Math.max(0.0001, to - from)));

export interface MotionSpec {
  /** Seconds of choreography before the poster settles into its still state. */
  settle: number;
  /** Camera push on the ground plane: zoom from → to across the clip. */
  groundZoom: [number, number];
  groundPan: [number, number];
  /** Art plane moves against the camera for parallax depth. */
  artZoom: [number, number];
  artPan: [number, number];
  /** Type reveal window (seconds) and drift distance in canvas-height units. */
  copyIn: [number, number];
  copyDrift: number;
  brandIn: [number, number];
  overlays: {
    twinkle?: boolean;
    shimmer?: boolean;
    motes?: boolean;
    glowPulse?: boolean;
    vignette?: number;
  };
}

const BASE: MotionSpec = {
  settle: 3.2,
  groundZoom: [1.06, 1.0],
  groundPan: [0.012, 0],
  artZoom: [1.12, 1.02],
  artPan: [-0.02, -0.004],
  copyIn: [0.55, 1.7],
  copyDrift: 0.028,
  brandIn: [1.5, 2.4],
  overlays: { twinkle: true, shimmer: true, glowPulse: true, vignette: 0.26 },
};

/** Per-template choreography: each composition gets its own camera grammar. */
export const MOTION: Record<PosterTemplate, MotionSpec> = {
  mandapam: { ...BASE, groundZoom: [1.04, 1.0], artZoom: [1.14, 1.03], copyIn: [0.7, 2.0], overlays: { ...BASE.overlays, motes: true } },
  gallery: { ...BASE, groundZoom: [1.02, 1.0], artZoom: [1.1, 1.015], artPan: [-0.03, -0.006], copyIn: [0.5, 1.6], overlays: { shimmer: true, vignette: 0.2 } },
  manifesto: { ...BASE, groundZoom: [1.0, 1.0], artZoom: [1, 1], copyIn: [0.35, 1.9], copyDrift: 0.04, overlays: { shimmer: true, vignette: 0.14 } },
  nocturne: { ...BASE, groundZoom: [1.1, 1.02], groundPan: [0.02, 0.004], artZoom: [1.16, 1.05], copyIn: [0.8, 2.1], overlays: { twinkle: true, shimmer: true, motes: true, glowPulse: true, vignette: 0.32 } },
  lesson: { ...BASE, groundZoom: [1.03, 1.0], artZoom: [1.1, 1.02], copyIn: [0.5, 1.8], overlays: { twinkle: true, shimmer: true, vignette: 0.2 } },
  offer: { ...BASE, groundZoom: [1.05, 1.0], artZoom: [1.12, 1.03], copyIn: [0.45, 1.5], brandIn: [1.2, 2.0], overlays: { shimmer: true, glowPulse: true, vignette: 0.24 } },
  blessing: { ...BASE, groundZoom: [1.03, 1.0], artZoom: [1.12, 1.04], copyIn: [0.7, 2.2], overlays: { twinkle: true, motes: true, glowPulse: true, shimmer: true, vignette: 0.24 } },
  sequence: { ...BASE, groundZoom: [1.08, 1.01], artZoom: [1.14, 1.04], copyIn: [0.6, 1.8], overlays: { twinkle: true, shimmer: true, vignette: 0.28 } },
};

export interface PosterLayers {
  ground: HTMLCanvasElement;
  art: HTMLCanvasElement;
  copy: HTMLCanvasElement;
  brand: HTMLCanvasElement;
}

export interface PosterManifest {
  width: number;
  height: number;
  bg: string;
  art: SceneBox | null;
  copy: SceneBox | null;
  brand: SceneBox | null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function drawPlane(
  ctx: CanvasRenderingContext2D,
  layer: CanvasImageSource,
  W: number,
  H: number,
  zoom: number,
  panX: number,
  panY: number,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2 + panX * W, H / 2 + panY * H);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(layer, 0, 0, W, H);
  ctx.restore();
}

/**
 * One animated frame at time `t` (seconds). Ambient loops (twinkle, shimmer,
 * motes) keep living past `settle`; the camera and reveals hold their final
 * value, so the last frame of a reel is exactly the still poster.
 */
export function paintMotionFrame(options: {
  ctx: CanvasRenderingContext2D;
  layers: PosterLayers;
  manifest: PosterManifest;
  template: PosterTemplate;
  theme: Theme;
  t: number;
}) {
  const { ctx, layers, manifest, template, theme, t } = options;
  const spec = MOTION[template] ?? BASE;
  const W = manifest.width;
  const H = manifest.height;
  const settle = spec.settle;
  const cam = easeInOut(clamp01(t / settle));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = manifest.bg;
  ctx.fillRect(0, 0, W, H);

  // Depth plane 1 — the ground field, slow push-in.
  drawPlane(
    ctx,
    layers.ground,
    W,
    H,
    lerp(spec.groundZoom[0], spec.groundZoom[1], cam),
    lerp(spec.groundPan[0], spec.groundPan[1], cam),
    0,
  );
  // Depth plane 2 — the artwork, moving against the camera.
  drawPlane(
    ctx,
    layers.art,
    W,
    H,
    lerp(spec.artZoom[0], spec.artZoom[1], cam),
    lerp(spec.artPan[0], spec.artPan[1], cam),
    lerp(spec.artPan[0], spec.artPan[1], cam) * 0.6,
  );

  // Live light between art and type: glow pulse + twinkle handled by overlays
  if (spec.overlays.glowPulse) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    const gy = manifest.art ? manifest.art.y + manifest.art.h * 0.4 : H * 0.34;
    const g = ctx.createRadialGradient(W / 2, gy, 0, W / 2, gy, W * 0.75);
    g.addColorStop(0, withAlpha(theme.gold, 0.04 + pulse * 0.05));
    g.addColorStop(1, withAlpha(theme.gold, 0));
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  // Depth plane 3 — the type, revealed through a travelling mask.
  const reveal = windowed(t, spec.copyIn[0], spec.copyIn[1]);
  if (reveal > 0 && manifest.copy) {
    const box = manifest.copy;
    const drift = (1 - easeOutQuint(reveal)) * spec.copyDrift * H;
    ctx.save();
    const maskBottom = box.y + box.h * easeOutQuint(reveal) + drift * 0.2;
    ctx.beginPath();
    ctx.rect(box.x - W * 0.02, box.y - H * 0.02 + drift, box.w + W * 0.04, Math.max(0, maskBottom - box.y + H * 0.02));
    ctx.clip();
    ctx.translate(0, drift);
    ctx.drawImage(layers.copy, 0, 0, W, H);
    ctx.restore();
  } else if (reveal > 0) {
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.drawImage(layers.copy, 0, 0, W, H);
    ctx.restore();
  }

  // Depth plane 4 — the brand signature lands last, small and certain.
  const brandIn = windowed(t, spec.brandIn[0], spec.brandIn[1]);
  if (brandIn > 0) {
    ctx.save();
    ctx.globalAlpha = brandIn;
    const s = lerp(0.96, 1, easeOutCubic(brandIn));
    ctx.translate(W / 2, H / 2);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(layers.brand, 0, 0, W, H);
    ctx.restore();
  }

  // Foil shimmer sweep across the whole card.
  if (spec.overlays.shimmer) {
    const period = 5.2;
    const phase = (t % period) / period;
    const width = W * 0.22;
    const cx = -width + phase * (W + width * 2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(cx - width, H, cx + width, 0);
    g.addColorStop(0, withAlpha(theme.goldSoft, 0));
    g.addColorStop(0.5, withAlpha(theme.goldSoft, 0.05));
    g.addColorStop(1, withAlpha(theme.goldSoft, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Drifting motes in the foreground air.
  if (spec.overlays.motes) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const n = 14;
    for (let i = 0; i < n; i += 1) {
      const seedA = (i * 0.61803) % 1;
      const seedB = (i * 0.38196) % 1;
      const sp = 0.05 + seedA * 0.08;
      const x = (seedB + 0.02 * Math.sin(t * 0.6 + i)) * W;
      const y = ((seedA - t * sp) % 1 + 1) % 1 * H;
      const r = 1 + seedA * 2.4;
      const a = 0.1 + 0.14 * Math.sin(t * 1.1 + i * 2.1) ** 2;
      ctx.fillStyle = withAlpha(theme.goldSoft, a);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Cinematic edge vignette.
  const vig = spec.overlays.vignette ?? 0.24;
  if (vig > 0) {
    const g = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.32, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${vig})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Open on a fade from the poster's own ground colour.
  const fadeIn = 1 - clamp01(t / 0.35);
  if (fadeIn > 0) {
    ctx.globalAlpha = fadeIn;
    ctx.fillStyle = manifest.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
