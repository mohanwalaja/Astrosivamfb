import type { HighlightPlan, StyleKey, Theme } from "../types";
import { STYLE_MAP, THEMES } from "../data/brand";
import { SERVICE_MAP } from "../data/services";
import { withAlpha } from "./canvas";
import { paintStyledBackdrop } from "./styles";
import { drawServiceArt } from "./stylePosts";
import { drawGrain } from "./premium";

/**
 * Instagram highlight seals.
 *
 * Instagram shows a highlight cover at roughly 110 px on a phone, cropped to a
 * circle, with the label typeset underneath by Instagram itself.
 *
 * Each seal is an exquisite, prestigious circular Vedic temple medallion with
 * multi-layered gold repoussé bezels, milgrain pearls, and authentic relief iconography.
 */
export const HIGHLIGHT_STYLE: Record<string, { style: StyleKey; service?: string }> = {
  jathagam: { style: "signature", service: "jathagam" },
  porutham: { style: "silk", service: "marriage" },
  baby: { style: "kolam", service: "baby-naming" },
  muhurtham: { style: "gopuram", service: "muhurtham" },
  panchangam: { style: "ephemeris", service: "panchangam" },
  reviews: { style: "aurum" },
  order: { style: "glass" },
};

export function highlightStyle(plan: HighlightPlan): StyleKey {
  return HIGHLIGHT_STYLE[plan.id]?.style ?? "signature";
}

export function highlightTheme(plan: HighlightPlan): Theme {
  return THEMES[plan.theme] ?? THEMES[STYLE_MAP[highlightStyle(plan)].defaultTheme];
}

/* ------------------------------ relief emblems ----------------------------- */

function metal(ctx: CanvasRenderingContext2D) {
  const gold = ctx.createLinearGradient(-35, -38, 32, 38);
  gold.addColorStop(0, "#FFF9D4");
  gold.addColorStop(0.24, "#E2AC3E");
  gold.addColorStop(0.5, "#FFFBEC");
  gold.addColorStop(0.73, "#B37418");
  gold.addColorStop(1, "#F7D26D");
  const deep = ctx.createLinearGradient(0, -42, 0, 42);
  deep.addColorStop(0, "#5E3914");
  deep.addColorStop(0.48, "#BF8E34");
  deep.addColorStop(1, "#4A270B");
  return { gold, deep };
}

/** Five-point royal celestial star insignia with laurel for the Reviews highlight. */
function drawStarRelief(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, theme: Theme) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  const { gold, deep } = metal(ctx);

  const star = (r: number, r2: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r2;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // Laurel branch of sacred temple blossoms encircling the stars
  ctx.strokeStyle = withAlpha(theme.gold, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 4, 43, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Laurel leaves / blossoms
  for (let i = 0; i < 9; i += 1) {
    const a = Math.PI * 0.2 + (i / 8) * Math.PI * 0.6;
    const lx = Math.cos(a) * 43;
    const ly = 4 + Math.sin(a) * 43;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Shadow for 3D star
  ctx.shadowColor = "rgba(0,0,0,.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;

  // Main central star
  star(40, 17);
  ctx.fillStyle = deep;
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.lineWidth = 3.2;
  ctx.strokeStyle = gold;
  ctx.lineJoin = "round";
  ctx.stroke();

  star(30, 13);
  ctx.fillStyle = gold;
  ctx.fill();

  // 3D Facet highlights — top-left facets catch bright light
  ctx.fillStyle = "rgba(255,255,240,.75)";
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(-7.5, -9);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-28.5, -9.5);
  ctx.lineTo(-11.5, -3.5);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-18, 24);
  ctx.lineTo(-7, 7);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // Star center sparkling diamond bindu
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // 4 companion celestial stars in an arched row beneath
  for (const [x, y, s] of [
    [-38, 24, 0.24],
    [-19, 32, 0.24],
    [19, 32, 0.24],
    [38, 24, 0.24],
  ] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    star(40, 17);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/** Auspicious Temple Manuscript Scroll & Gold Verification Seal for Order highlight. */
function drawChatRelief(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, theme: Theme) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  const { gold, deep } = metal(ctx);

  // Sacred palm-leaf / royal parchment scroll (Olaichuvadi)
  ctx.shadowColor = "rgba(0,0,0,.65)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;

  // 1. Two rolled parchment scroll rods on left and right
  const scrollW = 74;
  const scrollH = 50;

  // Scroll body parchment
  const parchmentGrad = ctx.createLinearGradient(-scrollW / 2, -scrollH / 2, scrollW / 2, scrollH / 2);
  parchmentGrad.addColorStop(0, "#4A2B0E");
  parchmentGrad.addColorStop(0.3, "#A66D26");
  parchmentGrad.addColorStop(0.5, "#DEAA46");
  parchmentGrad.addColorStop(0.7, "#A66D26");
  parchmentGrad.addColorStop(1, "#3E1E07");

  ctx.fillStyle = parchmentGrad;
  ctx.beginPath();
  ctx.roundRect(-scrollW / 2, -scrollH / 2, scrollW, scrollH, 6);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Rolled scroll wooden spindle caps at top and bottom ends
  for (const endY of [-scrollH / 2, scrollH / 2]) {
    ctx.fillStyle = deep;
    ctx.beginPath();
    ctx.roundRect(-scrollW / 2 - 4, endY - 3, scrollW + 8, 6, 3);
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Spindle gold finial knobs
    for (const endX of [-scrollW / 2 - 4, scrollW / 2 + 4]) {
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Inner sacred text lines simulation (3 golden hairlines)
  ctx.strokeStyle = "rgba(255, 245, 200, 0.35)";
  ctx.lineWidth = 1.0;
  for (const ly of [-14, -8, -2]) {
    ctx.beginPath();
    ctx.moveTo(-24, ly);
    ctx.lineTo(24, ly);
    ctx.stroke();
  }

  // Central embossed royal gold seal with checkmark
  ctx.save();
  ctx.translate(0, 8);

  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = deep;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Beaded seal ring
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = "#FFFDE7";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 15, Math.sin(a) * 15, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3D Sculpted Gold Verification Checkmark
  ctx.strokeStyle = "#4E2C09";
  ctx.lineWidth = 7.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-2, 6);
  ctx.lineTo(10, -6);
  ctx.stroke();

  ctx.strokeStyle = gold;
  ctx.lineWidth = 5.0;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-2, 6);
  ctx.lineTo(10, -6);
  ctx.stroke();

  // White-gold ridge highlight
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.lineTo(-2, 4.8);
  ctx.lineTo(10, -7.2);
  ctx.stroke();

  ctx.restore();

  // Golden feather quill resting across top
  ctx.save();
  ctx.translate(14, -22);
  ctx.rotate(Math.PI / 4);
  const quillGrad = ctx.createLinearGradient(0, -14, 0, 14);
  quillGrad.addColorStop(0, "#FFF9E6");
  quillGrad.addColorStop(0.5, "#F7D26D");
  quillGrad.addColorStop(1, "#8D5413");
  ctx.fillStyle = quillGrad;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.quadraticCurveTo(3, 0, 0, 14);
  ctx.quadraticCurveTo(-3, 0, 0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  void theme;
}

/* --------------------------------- the seal -------------------------------- */

export function renderHighlightSeal(ctx: CanvasRenderingContext2D, W: number, H: number, plan: HighlightPlan) {
  const style = highlightStyle(plan);
  const theme = highlightTheme(plan);
  const cx = W / 2;
  const cy = H / 2;

  // 1. Full-bleed backdrop (art: null so no awkward rectangular boxes are drawn behind round icons)
  paintStyledBackdrop(ctx, W, H, theme, style, {
    glowX: 0.5,
    glowY: 0.5,
    frameInset: W * 0.05,
    stars: true,
    art: null,
  });

  // 2. High-Craft Circular Temple Medallion Base
  const plateR = W * 0.31;

  // Dimensional outer drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = W * 0.05;
  ctx.shadowOffsetY = W * 0.015;

  // Outer gold repoussé bezel gradient
  const bezelGrad = ctx.createLinearGradient(cx - plateR, cy - plateR, cx + plateR, cy + plateR);
  bezelGrad.addColorStop(0, "#FFF9D4");
  bezelGrad.addColorStop(0.22, "#E2AC3E");
  bezelGrad.addColorStop(0.48, "#FFFDEC");
  bezelGrad.addColorStop(0.72, "#B37418");
  bezelGrad.addColorStop(1, "#F7D26D");

  ctx.beginPath();
  ctx.arc(cx, cy, plateR, 0, Math.PI * 2);
  ctx.fillStyle = bezelGrad;
  ctx.fill();
  ctx.restore();

  // 3. Milgrain pearl ring (32 tiny gold pearls along the outer bezel)
  const pearlCount = 36;
  const pearlRadius = plateR - W * 0.012;
  for (let i = 0; i < pearlCount; i += 1) {
    const a = (i / pearlCount) * Math.PI * 2;
    const px = cx + Math.cos(a) * pearlRadius;
    const py = cy + Math.sin(a) * pearlRadius;
    ctx.fillStyle = i % 2 === 0 ? "#FFFDE7" : "#E2AC3E";
    ctx.beginPath();
    ctx.arc(px, py, W * 0.0045, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Dark inner groove ring
  ctx.strokeStyle = "rgba(35, 18, 5, 0.85)";
  ctx.lineWidth = W * 0.004;
  ctx.beginPath();
  ctx.arc(cx, cy, plateR - W * 0.024, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Inner circular sanctum field (deep celestial or luminous royal ivory gradient)
  const innerR = plateR - W * 0.028;
  const sanctumGrad = ctx.createRadialGradient(cx - innerR * 0.25, cy - innerR * 0.3, innerR * 0.05, cx, cy, innerR);
  if (theme.light || theme.key === "ivory") {
    sanctumGrad.addColorStop(0, "#FFFDF8");
    sanctumGrad.addColorStop(0.45, "#FBF1DD");
    sanctumGrad.addColorStop(0.8, "#F2E2BE");
    sanctumGrad.addColorStop(1, "#E7CEA0");
  } else {
    sanctumGrad.addColorStop(0, withAlpha(theme.bgTo, 0.96));
    sanctumGrad.addColorStop(0.7, withAlpha(theme.bgFrom, 0.98));
    sanctumGrad.addColorStop(1, "#040508");
  }
  ctx.fillStyle = sanctumGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  // 6. Sacred Astrolabe Watermark Geometry (subtle astronomical depth behind emblem)
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, theme.light ? 0.32 : 0.14);
  ctx.lineWidth = W * 0.0016;
  for (const rad of [innerR * 0.45, innerR * 0.72, innerR * 0.92]) {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 8-directional subtle sacred rays
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * innerR * 0.3, cy + Math.sin(a) * innerR * 0.3);
    ctx.lineTo(cx + Math.cos(a) * innerR * 0.88, cy + Math.sin(a) * innerR * 0.88);
    ctx.stroke();
  }
  ctx.restore();

  // 7. Delicate 12-Rasi zodiac division ticks on inner rim
  ctx.strokeStyle = withAlpha(theme.gold, 0.55);
  ctx.lineWidth = W * 0.0022;
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r1 = innerR - W * 0.015;
    const r2 = innerR - W * 0.003;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // Inner hairline gold ring
  ctx.strokeStyle = withAlpha(theme.gold, 0.8);
  ctx.lineWidth = W * 0.0025;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - W * 0.018, 0, Math.PI * 2);
  ctx.stroke();

  // 8. The Central Relief Emblem (bold, crisp, legible at thumbnail size)
  const emblem = W * 0.44;
  const link = HIGHLIGHT_STYLE[plan.id];
  const service = link?.service ? SERVICE_MAP[link.service] : undefined;
  if (service) {
    drawServiceArt(ctx, service, style, cx, cy, emblem, theme, 1, "relief");
  } else if (plan.id === "reviews") {
    drawStarRelief(ctx, cx, cy, emblem, theme);
  } else {
    drawChatRelief(ctx, cx, cy, emblem, theme);
  }

  // 8. Subtle gold grain texture
  drawGrain(ctx, W, H, 16);
}

