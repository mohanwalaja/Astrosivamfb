import type { CreativeContent, CreativeFormat, Service, StyleKey, Theme, ThemeKey } from "../types";
import { englishCopy, englishText } from "./englishCopy";
import { STYLES, STYLE_MAP, THEMES } from "../data/brand";
import { IG_HIGHLIGHTS } from "../data/instagram";
import { PANCHANGAM_ROWS } from "../data/panchangam";
import { QUOTES, REVIEWS } from "../data/launch";
import {
  DEVA,
  DISPLAY,
  SANS,
  TAMIL,
  createCanvas,
  drawChips,
  drawFrame,
  drawLogo,
  drawMotif,
  drawOrbit,
  drawPill,
  drawSafeZones,
  drawTracked,
  ensureFonts,
  fitHeadline,
  goldGradient,
  loadLogo,
  loadImageSource,
  paintBackdrop,
  roundRect,
  withAlpha,
  wrapLines,
} from "./canvas";
import { drawServiceArt, hasStyleLayout, renderStylePost } from "./stylePosts";
import { drawContactLine } from "./posterKit";
import { brandSize, brandSpot, drawGlobalLockup } from "./brandPlacement";
import { blockHeight, leadOffsets } from "./typeset";
import { drawStyleFrame, paintStyledBackdrop } from "./styles";
import { drawGrain, drawPremiumFrame, foilText } from "./premium";
import { renderHighlightSeal } from "./highlightSeal";

export interface RenderOptions {
  format: CreativeFormat;
  themeKey?: ThemeKey;
  style?: StyleKey;
  service: Service;
  content: CreativeContent;
  scale?: number;
  overlay?: boolean;
  slideIndex?: number;
  highlightIndex?: number;
  quoteIndex?: number;
  reviewIndex?: number;
}

const dateLabel = () =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

/* ------------------------------- primitives ------------------------------- */

function brandRow(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pad: number,
  y: number,
  theme: Theme,
  logo: HTMLImageElement,
  rightLabel = "English",
  size = 40,
) {
  // The lockup follows the studio-wide placement setting; the side label keeps
  // to the opposite end of the same row so the two never collide.
  const scaled = brandSize(size);
  const spot = brandSpot(W, H, scaled, { pad, topBand: y - size * 0.8, bottomBand: H * 0.075 });
  drawGlobalLockup(ctx, logo, {
    W,
    H,
    theme,
    baseSize: size,
    pad,
    topBand: y - size * 0.8,
    bottomBand: H * 0.075,
  });

  if (!rightLabel) {
    return;
  }
  const labelOnLeft = spot.align === "right";
  if (rightLabel === "English") {
    drawLanguages(ctx, labelOnLeft ? pad : W - pad, y + 1, size * 0.29, withAlpha(theme.gold, 0.92), labelOnLeft ? "left" : "right");
  } else {
    ctx.fillStyle = withAlpha(theme.gold, 0.9);
    ctx.font = SANS(size * 0.28, 500);
    ctx.textAlign = labelOnLeft ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillText(rightLabel, labelOnLeft ? pad : W - pad, y + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

function drawLanguages(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, align: "left" | "right" = "right") {
  ctx.save(); ctx.font = SANS(size, 600); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText("English", x, y); const width = ctx.measureText("English").width; ctx.restore(); return width;
}

function halo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, theme: Theme) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.55);
  glow.addColorStop(0, withAlpha(theme.gold, theme.light ? 0.18 : 0.22));
  glow.addColorStop(0.55, withAlpha(theme.gold, 0.06));
  glow.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = withAlpha(theme.gold, 0.32);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.16, 0, Math.PI * 2);
  ctx.stroke();

  drawOrbit(ctx, cx, cy, r * 1.42, r * 0.62, -0.62, withAlpha(theme.gold, 0.2), 0.9, true);
  drawOrbit(ctx, cx, cy, r * 1.5, r * 0.74, 0.72, withAlpha(theme.gold, 0.14), 0.8);
}

function decorativeGlyphs(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  motif: Service["motif"],
  seed = 3,
) {
  // Quiet corner glows and filled foil glints frame the content without crossing its text zone.
  const positions: Array<[number, number]> = [[W * 0.075, H * 0.075], [W * 0.925, H * 0.075], [W * 0.075, H * 0.91], [W * 0.925, H * 0.91]];
  positions.forEach(([x, y], index) => {
    const r = W * 0.095;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, withAlpha(theme.goldSoft, 0.12 + ((seed + index) % 3) * 0.018));
    glow.addColorStop(1, withAlpha(theme.gold, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    drawMotif(ctx, "sparkles", x, y, W * 0.085, theme, 0.42);
  });
  void motif;
}

/* ---------------------------------- post ---------------------------------- */

function renderPost(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  service: Service,
  content: CreativeContent,
  style: StyleKey = "signature",
) {
  const pad = W * 0.068;
  // Fallback layout for non-post formats that still want a styled ground.
  paintStyledBackdrop(ctx, W, H, theme, style, { glowX: 0.5, glowY: 0.3, frameInset: W * 0.023, seed: 11 });
  drawStyleFrame(ctx, W, H, theme, style, W * 0.023);
  decorativeGlyphs(ctx, W, H, theme, service.motif);

  brandRow(ctx, W, H, pad, H * 0.07, theme, logo);

  // kicker
  if (content.kicker) {
    drawPill(ctx, content.kicker.toUpperCase(), pad, H * 0.108, {
      theme,
      size: W * 0.0158,
      height: H * 0.036,
      paddingX: W * 0.019,
      tracking: W * 0.0019,
    });
  }

  // art
  const artSize = H * 0.255;
  const artCx = W / 2;
  const artCy = H * 0.3;
  halo(ctx, artCx, artCy, artSize * 0.52, theme);
  drawServiceArt(ctx, service, style, artCx, artCy, artSize, theme, 0.9);

  // measure blocks first so the headline always fits above the detail chips
  const chipsHeight = H * 0.032;
  const chipsGap = W * 0.028;
  const tamilSize = W * 0.029;
  const subSize = W * 0.0235;
  const tamilBlock = content.tamil ? tamilSize * 2.05 : 0;
  ctx.font = SANS(subSize, 400);
  const subLines = content.subline ? wrapLines(ctx, content.subline, W - pad * 2.6).slice(0, 2) : [];
  const subBlock = subLines.length ? subLines.length * subSize * 1.4 + (tamilBlock ? W * 0.012 : 0) : 0;

  const blockTop = H * 0.455;
  const blockBottom = H * 0.772 - chipsGap;
  const available = blockBottom - blockTop - tamilBlock - subBlock;
  const maxLines = available > W * 0.19 ? 3 : 2;
  const natural = W * (H / W > 1.15 ? 0.072 : 0.062);
  const usable = Math.min(natural, available / (maxLines * 1.1));
  const headline = fitHeadline(ctx, content.headline, W - pad * 2, maxLines, Math.max(usable, W * 0.044), W * 0.04);

  // vertically balance the text block inside its zone
  const headOffsets = leadOffsets(headline.lines, headline.size, 1.11);
  const headHeight = blockHeight(headline.lines, headline.size, 1.11);
  const totalHeight = headHeight + tamilBlock + subBlock;
  let cursorY = blockTop + Math.max(0, (blockBottom - blockTop - totalHeight) / 2);

  ctx.font = DISPLAY(headline.size, 700);
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  headline.lines.forEach((line, index) => foilText(ctx, line, W / 2, cursorY + headOffsets[index], theme));
  ctx.textAlign = "left";
  cursorY += headHeight;

  if (content.tamil) {
    ctx.fillStyle = theme.light ? theme.gold : withAlpha(theme.goldSoft, 0.95);
    ctx.font = TAMIL(tamilSize);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    foilText(ctx, content.tamil, W / 2, cursorY + tamilSize * 0.12, theme);
    ctx.textAlign = "left";
    cursorY += tamilBlock;
  }

  if (subLines.length) {
    ctx.font = SANS(subSize, 400);
    ctx.fillStyle = theme.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    subLines.forEach((line, index) => ctx.fillText(line, W / 2, cursorY + index * subSize * 1.4));
    ctx.textAlign = "left";
  }

  // chips
  drawChips(ctx, content.chips.slice(0, 3), pad, H * 0.772, W - pad * 2, theme, {
    size: W * 0.0158,
    height: chipsHeight,
    tracking: W * 0.0012,
  });

  // bottom block
  const ruleY = H * 0.848;
  const grad = ctx.createLinearGradient(pad, ruleY, W - pad, ruleY);
  grad.addColorStop(0, withAlpha(theme.gold, 0.55));
  grad.addColorStop(0.4, withAlpha(theme.gold, 0.18));
  grad.addColorStop(1, withAlpha(theme.gold, 0.04));
  ctx.fillStyle = grad;
  ctx.fillRect(pad, ruleY, W - pad * 2, 1);

  const priceY = H * 0.864;
  const priceHeight = H * 0.038;
  if (content.price) {
    drawPill(ctx, content.price.toUpperCase(), pad, priceY, {
      theme,
      filled: true,
      size: W * 0.0158,
      height: priceHeight,
      paddingX: W * 0.022,
      tracking: W * 0.0016,
    });
  }

  if (content.cta) {
    ctx.font = SANS(W * 0.0155, 500);
    ctx.fillStyle = withAlpha(theme.gold, 0.95);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const maxCta = W - pad * 2 - W * 0.34;
    let label = content.cta;
    while (ctx.measureText(label).width > maxCta && label.length > 12) {
      label = `${label.slice(0, -2)}…`;
    }
    ctx.fillText(label, W - pad, priceY + priceHeight / 2 + 1);
    ctx.textAlign = "left";
  }

  // footer: contact only, centred — the lockup already sits top-left
  ctx.font = SANS(W * 0.0128, 500);
  drawContactLine(ctx, W, H, theme, { y: H - H * 0.039, size: W * 0.0128 });
}

/* --------------------------------- profile -------------------------------- */

function renderProfile(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.5, glowY: 0.44, frameInset: W * 0.028, stars: false });
  const cx = W / 2;
  // Match the square canvas center and the avatar-crop guide. Even a small
  // vertical offset makes the mark look visibly off-centre inside Instagram's circle.
  const cy = H / 2;

  // orbital ring system
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.45);
  ctx.lineWidth = W * 0.0024;
  ctx.beginPath();
  ctx.arc(cx, cy, W * 0.335, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([W * 0.004, W * 0.014]);
  ctx.strokeStyle = withAlpha(theme.gold, 0.32);
  ctx.lineWidth = W * 0.0012;
  ctx.beginPath();
  ctx.arc(cx, cy, W * 0.395, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 12 rasi ticks + dots
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r1 = W * 0.335;
    const r2 = W * 0.37;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.strokeStyle = withAlpha(theme.gold, 0.6);
    ctx.lineWidth = W * 0.0016;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * W * 0.415, cy + Math.sin(angle) * W * 0.415, W * 0.006, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(theme.gold, 0.55);
    ctx.fill();
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.32);
  glow.addColorStop(0, withAlpha(theme.gold, 0.18));
  glow.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, W * 0.32, 0, Math.PI * 2);
  ctx.fill();

  drawLogo(ctx, logo, cx, cy, W * 0.5);

  if (theme.light) {
    ctx.strokeStyle = withAlpha(theme.ink, 0.18);
    ctx.lineWidth = W * 0.0012;
    ctx.beginPath();
    ctx.arc(cx, cy, W * 0.336, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = theme.ink;
  ctx.font = DISPLAY(W * 0.036, 700);
  ctx.textBaseline = "alphabetic";
  drawTracked(ctx, "ASTRO SIVAM", cx, H * 0.745, W * 0.004, "center");
  ctx.fillStyle = withAlpha(theme.gold, 0.9);
  ctx.font = SANS(W * 0.0145, 600);
  drawTracked(ctx, "VEDIC ASTROLOGY", cx, H * 0.788, W * 0.0055, "center");
  ctx.textAlign = "left";
}

/* ---------------------------------- cover --------------------------------- */

function renderCover(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  statement = false,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.28, glowY: 0.5, frameInset: 18, seed: 5 });

  // decorative wheels far outside the safe area
  drawMotif(ctx, "jathagam", W * 0.1, H * 0.52, H * 0.52, theme, 0.14);
  drawMotif(ctx, "panchangam", W * 0.925, H * 0.48, H * 0.5, theme, 0.12);

  ctx.save();
  ctx.globalAlpha = 0.2;
  drawOrbit(ctx, W * 0.5, H * 0.5, W * 0.46, H * 0.34, 0, withAlpha(theme.gold, 0.5), 0.8, true);
  ctx.restore();

  if (statement) {
    const cx = W / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = withAlpha(theme.gold, 0.95);
    ctx.font = SANS(16, 600);
    drawTracked(ctx, "ASTRO SIVAM · AUTHENTIC VEDIC ASTROLOGY", cx, H * 0.4, 4.4, "center");

    const head = fitHeadline(ctx, "Understand your life through Vedic astrology.", 780, 2, 58, 40);
    ctx.font = DISPLAY(head.size, 700);
    ctx.fillStyle = theme.ink;
    head.lines.forEach((line, i) =>
      ctx.fillText(line, cx, H * 0.485 + i * head.size * 1.14),
    );

    ctx.fillStyle = withAlpha(theme.gold, 0.42);
    ctx.fillRect(cx - 120, H * 0.7, 240, 1);
    ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
    ctx.font = SANS(19, 500);
drawTracked(ctx, "astrosivam.com · first report free", cx, H * 0.765, 1.8, "center");
    ctx.textAlign = "left";
    return;
  }

  const logoX = W * 0.305;
  const logoY = H * 0.53;
  const textX = W * 0.362;
  const logoSize = H * 0.19;

  drawLogo(ctx, logo, logoX, logoY, logoSize);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = withAlpha(theme.gold, 0.95);
  ctx.font = SANS(15, 600);
  drawTracked(ctx, "AUTHENTIC VEDIC ASTROLOGY", textX, H * 0.392, 4.6, "left");

  ctx.fillStyle = theme.ink;
  ctx.font = DISPLAY(62, 700);
  drawTracked(ctx, "ASTRO SIVAM", textX, H * 0.522, 7, "left");

  const rule = ctx.createLinearGradient(textX, 0, W * 0.72, 0);
  rule.addColorStop(0, withAlpha(theme.gold, 0.75));
  rule.addColorStop(1, withAlpha(theme.gold, 0.05));
  ctx.fillStyle = rule;
  ctx.fillRect(textX, H * 0.552, W * 0.36, 1.2);

  ctx.fillStyle = withAlpha(theme.ink, 0.88);
  ctx.font = SANS(21, 500);
  ctx.fillText("Jathagam · Porutham · Baby Naming · Muhurtham", textX, H * 0.612);

  ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
  ctx.font = SANS(19, 500);
ctx.fillText("astrosivam.com · first report free", textX, H * 0.662);

  ctx.fillStyle = theme.muted;
  ctx.font = SANS(14.5, 400);
  {
    const label = "Lahiri sidereal · Reviewed by our India-based priest team · ";
    ctx.font = SANS(14.5, 400);
    const labelWidth = ctx.measureText(label).width;
    ctx.fillStyle = theme.muted;
    ctx.fillText(label, textX, H * 0.702);
    drawLanguages(ctx, textX + labelWidth, H * 0.702 - 4, 15, theme.muted, "left");
  }

  // safe-area side label
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.translate(52, H * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = withAlpha(theme.gold, 0.9);
  ctx.font = SANS(10.5, 600);
  drawTracked(ctx, "SIDEREAL · LAHIRI", 0, 0, 2.6, "center");
  ctx.restore();
}

/* ---------------------------------- link ---------------------------------- */

function renderLink(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.22, glowY: 0.4, frameInset: 22, seed: 9 });
  // Keep the full chart inside the share card. The old right-heavy placement
  // put its outer cells past the canvas edge on this 1.91:1 format.
  const chartSize = H * 0.58;
  const chartCenterX = W * 0.79;
  drawMotif(ctx, "jathagam", chartCenterX, H * 0.5, chartSize, theme, 0.2);

  drawGlobalLockup(ctx, logo, { W, H, theme, baseSize: 96, pad: 106, topBand: 132 - 96 * 0.8, bottomBand: 80 });

  ctx.fillStyle = withAlpha(theme.ink, 0.9);
  ctx.font = SANS(23, 500);
  ctx.fillText("Birth Jathagam · 10 Poruthams · Baby Naming", 106, 372);
  ctx.fillText("Subha Muhurtham · Free daily Panchangam", 106, 410);

  const pillY = H - 142;
  drawPill(ctx, "astrosivam.com", 106, pillY, {
    theme,
    filled: true,
    size: 20,
    height: 54,
    paddingX: 26,
    tracking: 1.4,
  });
  ctx.fillStyle = withAlpha(theme.muted, 1);
  ctx.font = SANS(17, 500);
  ctx.fillText("first report free", 106, H - 62);
  ctx.textAlign = "right";
  ctx.fillStyle = withAlpha(theme.gold, 0.85);
  ctx.font = SANS(13, 600);
  drawTracked(ctx, "VEDIC ASTROLOGY · JYOTISH", W - 62, 96, 2.4, "right");
  ctx.textAlign = "left";
  drawContactLine(ctx, W, H, theme, { y: H - 40, size: 14 });
}

/* ---------------------------------- story --------------------------------- */

function renderStory(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  service: Service,
  content: CreativeContent,
  reelCover = false,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.5, glowY: 0.4, frameInset: 22, seed: reelCover ? 19 : 13 });
  decorativeGlyphs(ctx, W, H, theme, service.motif);

  brandRow(ctx, W, H, W * 0.075, H * (reelCover ? 0.135 : 0.16), theme, logo, "DAILY · VEDIC", 34);

  if (content.kicker) {
    drawPill(ctx, content.kicker.toUpperCase(), W * 0.075, H * 0.198, {
      theme,
      size: 16,
      height: 46,
      paddingX: 18,
      tracking: 2.2,
    });
  }

  if (reelCover) {
    // art above the headline so the central 1:1 grid crop is never empty
    halo(ctx, W / 2, H * 0.335, W * 0.2, theme);
    drawServiceArt(ctx, service, "signature", W / 2, H * 0.335, W * 0.38, theme, 0.9);

    const head = fitHeadline(ctx, content.headline, W - W * 0.15, 3, 82, 54);
    const lh = head.size * 1.1;
    ctx.font = DISPLAY(head.size, 700);
    ctx.fillStyle = theme.ink;
    ctx.textBaseline = "top";
    const headTop = H * 0.455;
    head.lines.forEach((line, i) => foilText(ctx, line, W * 0.075, headTop + i * lh, theme));
    let cursorY = headTop + head.lines.length * lh + 20;

    if (content.tamil) {
      ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
      ctx.font = TAMIL(27);
      foilText(ctx, content.tamil, W * 0.075, cursorY + 18, theme);
      cursorY += 56;
    }
    if (content.subline) {
      ctx.font = SANS(22, 400);
      ctx.fillStyle = theme.muted;
      const lines = wrapLines(ctx, content.subline, W - W * 0.16).slice(0, 2);
      lines.forEach((line, i) => ctx.fillText(line, W * 0.075, cursorY + i * 32));
    }

    drawStoryCta(ctx, W, H * 0.735, theme, content, "LINK IN BIO · TAP TO ORDER", 0.865);
    return;
  }

  // headline
  const head = fitHeadline(ctx, content.headline, W - W * 0.15, 4, 92, 54);
  const lh = head.size * 1.1;
  ctx.font = DISPLAY(head.size, 700);
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = "top";
  const headTop = H * 0.235;
  head.lines.forEach((line, i) => foilText(ctx, line, W * 0.075, headTop + i * lh, theme));
  let cursorY = headTop + head.lines.length * lh + 22;

  if (content.tamil) {
    ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
    ctx.font = TAMIL(28);
    ctx.textBaseline = "top";
    foilText(ctx, content.tamil, W * 0.075, cursorY, theme);
    cursorY += 58;
  }

  if (content.subline) {
    ctx.font = SANS(23, 400);
    ctx.fillStyle = theme.muted;
    const lines = wrapLines(ctx, content.subline, W - W * 0.16).slice(0, 2);
    lines.forEach((line, i) => ctx.fillText(line, W * 0.075, cursorY + i * 33));
    cursorY += lines.length * 33;
  }

  // art panel, sized to the space left above the CTA
  const ctaY = H * 0.76;
  const artTop = cursorY + 34;
  const artSpace = ctaY - 42 - artTop;
  const artSize = Math.max(200, Math.min(W * 0.4, artSpace * 0.92));
  if (artSpace > 170) {
    halo(ctx, W / 2, artTop + artSpace / 2, artSize * 0.5, theme);
    drawServiceArt(ctx, service, "signature", W / 2, artTop + artSpace / 2, artSize, theme, 0.9);
  }

  drawStoryCta(ctx, W, ctaY, theme, content, "LINK IN BIO · TAP TO ORDER", 0.865);
}

function drawStoryCta(
  ctx: CanvasRenderingContext2D,
  W: number,
  y: number,
  theme: Theme,
  content: CreativeContent,
  hint: string,
  footerAt: number,
) {
  ctx.save();
  ctx.font = SANS(18, 600);
  const label = content.cta || "astrosivam.com";
  const textWidth = ctx.measureText(label).width;
  const width = Math.min(W - W * 0.2, textWidth + 56);
  drawPill(ctx, label, (W - width) / 2, y, {
    theme,
    filled: true,
    size: 18,
    height: 58,
    paddingX: 28,
    tracking: 0.6,
  });

  ctx.textAlign = "center";
  ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
  ctx.font = SANS(15, 600);
  drawTracked(
    ctx,
    content.price && content.price !== "Free" ? `${content.price}  ·  ${hint}` : hint,
    W / 2,
    y + 92,
    2.8,
    "center",
  );
  ctx.fillStyle = withAlpha(theme.muted, 0.9);
  ctx.font = SANS(13, 500);
  drawContactLine(ctx, W, 1920, theme, { y: 1920 * footerAt, size: 13 });
  ctx.textAlign = "left";
  ctx.restore();
}

/* -------------------------------- carousel -------------------------------- */

function renderCarousel(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  service: Service,
  slideIndex: number,
) {
  const slides = service.carousel.slides;
  const index = ((slideIndex % slides.length) + slides.length) % slides.length;
  const slide = slides[index];
  const last = index === slides.length - 1;
  paintBackdrop(ctx, W, H, theme, { glowX: 0.2, glowY: 0.22, frameInset: W * 0.024, seed: 23 + index });

  const pad = W * 0.075;
  brandRow(ctx, W, H, pad, H * 0.06, theme, logo, "");

  drawMotif(ctx, service.motif, W * 0.84, H * 0.6, W * 0.42, theme, 0.06);

  // counter
  ctx.fillStyle = withAlpha(theme.gold, 0.9);
  ctx.font = SANS(15, 600);
  drawTracked(
    ctx,
    `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`,
    W - pad,
    H * 0.0615,
    2.4,
    "right",
  );
  ctx.fillStyle = withAlpha(theme.muted, 0.9);
  ctx.font = SANS(12, 500);
  drawTracked(ctx, "SWIPE TO LEARN", W - pad, H * 0.092, 2.2, "right");

  // kicker
  if (slide.kicker) {
    drawPill(ctx, slide.kicker.toUpperCase(), pad, H * 0.135, {
      theme,
      size: 16,
      height: 44,
      paddingX: 18,
      tracking: 2,
    });
  }

  const head = fitHeadline(ctx, slide.headline, W - pad * 2, 3, W * 0.092, W * 0.056);
  const lh = head.size * 1.1;
  const headTop = H * (index === 0 ? 0.245 : 0.235);
  ctx.font = DISPLAY(head.size, 700);
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = "top";
  head.lines.forEach((line, i) => foilText(ctx, line, pad, headTop + i * lh, theme));

  let cursorY = headTop + head.lines.length * lh + 30;
  if (index === 0) {
    ctx.fillStyle = withAlpha(theme.gold, 0.95);
    ctx.font = TAMIL(28);
    ctx.fillText(service.tamilName, pad, cursorY + 18);
    cursorY += 62;
  }

  if (slide.body) {
    ctx.font = SANS(W * 0.029, 400);
    ctx.fillStyle = theme.muted;
    const lines = wrapLines(ctx, slide.body, W - pad * 2.2).slice(0, 4);
    lines.forEach((line, i) => ctx.fillText(line, pad, cursorY + i * W * 0.041));
    cursorY += lines.length * W * 0.041;
  }

  // art on cover + last slide
  if (index === 0) {
    halo(ctx, W * 0.5, H * 0.78, W * 0.16, theme);
    drawServiceArt(ctx, service, "signature", W * 0.5, H * 0.78, W * 0.31, theme, 0.85);
  }

  if (last) {
    const pillY = H * 0.755;
    drawPill(ctx, "ORDER", pad, pillY, {
      theme,
      filled: true,
      size: 18,
      height: 54,
      paddingX: 24,
      tracking: 1.6,
    });
    ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
    ctx.font = SANS(19, 500);
    ctx.fillText(service.url.replace("https://", ""), pad, pillY + 96);
    ctx.fillStyle = withAlpha(theme.muted, 1);
    ctx.font = SANS(15, 500);
    ctx.fillText(
      service.kind === "Paid report" && service.price
        ? `${service.price} · First report free (Beta) · 7 days of chat`
        : "First report free (Beta) · 7 days of astrologer chat",
      pad,
      pillY + 126,
    );
  } else if (index !== 0) {
    const pillY = H * 0.735;
    drawPill(ctx, "SWIPE →", pad, pillY, {
      theme,
      size: 15,
      height: 44,
      paddingX: 18,
      tracking: 2.4,
    });
  }

  // footer
  ctx.fillStyle = withAlpha(theme.gold, 0.32);
  ctx.fillRect(pad, H * 0.895, W - pad * 2, 1);
  ctx.textBaseline = "alphabetic";
  drawContactLine(ctx, W, H, theme, { y: H * 0.928, size: 14 });

  // progress
  const barY = H * 0.952;
  const gap = 7;
  const segWidth = (W - pad * 2 - gap * (slides.length - 1)) / slides.length;
  slides.forEach((_, i) => {
    roundRect(ctx, pad + i * (segWidth + gap), barY, segWidth, 4, 2);
    ctx.fillStyle = i === index ? withAlpha(theme.gold, 0.95) : withAlpha(theme.gold, 0.2);
    ctx.fill();
  });
}

/* -------------------------------- highlight ------------------------------- */

function renderHighlight(ctx: CanvasRenderingContext2D, W: number, H: number, highlightIndex: number) {
  const plan = IG_HIGHLIGHTS[((highlightIndex % IG_HIGHLIGHTS.length) + IG_HIGHLIGHTS.length) % IG_HIGHLIGHTS.length];
  renderHighlightSeal(ctx, W, H, plan);
}

/* -------------------------------- panchangam ------------------------------- */

function renderPanchangam(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  content: CreativeContent,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.7, glowY: 0.18, frameInset: W * 0.024, seed: 41 });
  const pad = W * 0.078;
  brandRow(ctx, W, H, pad, H * 0.062, theme, logo, "FREE · DAILY", 34);

  drawMotif(ctx, "panchangam", W * 0.89, H * 0.205, W * 0.36, theme, 0.1);

  ctx.fillStyle = withAlpha(theme.gold, 0.92);
  ctx.font = SANS(15, 600);
  drawTracked(ctx, "DAILY PANCHANGAM", pad, H * 0.125, 4, "left");

  const dateHead = fitHeadline(ctx, content.headline, W - pad * 2, 2, W * 0.055, W * 0.038);
  ctx.font = DISPLAY(dateHead.size, 700);
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = "top";
  dateHead.lines.forEach((line, i) => foilText(ctx, line, pad, H * 0.152 + i * dateHead.size * 1.1, theme));
  const dateBottom = H * 0.152 + dateHead.lines.length * dateHead.size * 1.1;

  ctx.fillStyle = withAlpha(theme.muted, 1);
  ctx.font = SANS(19, 500);
  ctx.textBaseline = "alphabetic";
  ctx.fillText(content.subline || "Chennai · timings in IST", pad, dateBottom + 26);

  // Ten limbs down the card. The four-value version this replaced showed a
  // tithi, a nakshatra and two timings — the five classical limbs minus three,
  // plus one — which is not a panchangam.
  const labels = PANCHANGAM_ROWS;
  const rows = Math.min(labels.length, Math.max(4, content.chips.length));
  const startY = Math.max(dateBottom + 54, H * (rows > 6 ? 0.3 : 0.335));
  const bottomY = H * 0.855;
  const available = bottomY - startY;
  const rowH = available / rows;
  const dense = rows > 6;
  const labelSize = dense ? 11 : 15;
  const valueSize = dense ? W * 0.0255 : W * 0.034;

  labels.slice(0, rows).forEach((label, i) => {
    const y = startY + i * rowH;
    ctx.fillStyle = withAlpha(theme.gold, 0.3);
    ctx.fillRect(pad, y, W - pad * 2, 1);

    ctx.fillStyle = withAlpha(theme.gold, 0.95);
    ctx.font = SANS(labelSize, 600);
    drawTracked(ctx, label.en.toUpperCase(), pad, y + rowH * 0.3, dense ? 2.6 : 3.4, "left");

    // the value, with the "till 1:38 PM" end time set back on the right
    const raw = content.chips[i] || "—";
    const [value, ...rest] = raw.split("|");
    ctx.fillStyle = theme.ink;
    ctx.font = SANS(valueSize, 500);
    let text = value.trim();
    while (ctx.measureText(text).width > W - pad * 2 && text.length > 6) {
      text = `${text.slice(0, -2)}…`;
    }
    ctx.fillText(text, pad, y + rowH * (dense ? 0.74 : 0.72));

    const tail = rest.join("|").trim();
    if (tail) {
      ctx.fillStyle = withAlpha(theme.muted, 0.95);
      ctx.font = SANS(dense ? 15 : 18, 500);
      ctx.textAlign = "right";
      ctx.fillText(tail, W - pad, y + rowH * (dense ? 0.74 : 0.72));
      ctx.textAlign = "left";
    }
  });

  ctx.fillStyle = withAlpha(theme.gold, 0.3);
  ctx.fillRect(pad, startY + rows * rowH, W - pad * 2, 1);

  ctx.fillStyle = withAlpha(theme.gold, 0.95);
  ctx.font = SANS(19, 500);
  ctx.fillText("Free every morning", pad, H * 0.895);
  ctx.fillStyle = withAlpha(theme.muted, 0.95);
  ctx.font = SANS(13, 500);
  ctx.fillText("Lahiri ayanamsa · timings in IST", pad, H * 0.925);
  ctx.textAlign = "right";
  ctx.fillStyle = withAlpha(theme.gold, 0.85);
  ctx.font = SANS(13, 600);
  drawTracked(ctx, "CHENNAI · IST", W - pad, H * 0.925, 2.6, "right");
  ctx.textAlign = "left";
  drawContactLine(ctx, W, H, theme, { y: H * 0.965, size: 13 });
}

/* ---------------------------------- quote --------------------------------- */

function renderQuote(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  content: CreativeContent,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.5, glowY: 0.35, frameInset: W * 0.026, seed: 31 });
  drawMotif(ctx, "star", W * 0.84, H * 0.8, W * 0.5, theme, 0.08);

  const pad = W * 0.085;
  brandRow(ctx, W, H, pad, H * 0.07, theme, logo, "", 34);
  ctx.fillStyle = withAlpha(theme.gold, 0.22);
  ctx.font = DISPLAY(250, 700);
  ctx.textBaseline = "alphabetic";
  ctx.fillText("“", pad - 16, H * 0.28);

  const quote = fitHeadline(ctx, content.headline, W - pad * 2, 6, W * 0.068, W * 0.042);
  ctx.font = DISPLAY(quote.size, 600);
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  const blockH = quote.lines.length * quote.size * 1.32;
  const top = H * 0.34;
  quote.lines.forEach((line, i) => foilText(ctx, line, W / 2, top + i * quote.size * 1.32, theme));

  const attrY = top + blockH + 46;
  ctx.fillStyle = withAlpha(theme.gold, 0.6);
  ctx.fillRect(W / 2 - 60, attrY - 28, 120, 1);
  ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
  ctx.font = SANS(20, 600);
  ctx.textAlign = "center";
  drawTracked(ctx, content.subline.toUpperCase(), W / 2, attrY + 14, 3.4, "center");

  drawContactLine(ctx, W, H, theme, { y: H * 0.93, size: 15 });
  ctx.textAlign = "left";
}

/* ---------------------------------- offer --------------------------------- */

function renderOffer(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.5, glowY: 0.42, frameInset: W * 0.026, seed: 37 });
  const cx = W / 2;

  // rays
  ctx.save();
  ctx.translate(cx, H * 0.42);
  for (let i = 0; i < 36; i += 1) {
    const angle = (i / 36) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * W * 0.18, Math.sin(angle) * W * 0.18);
    ctx.lineTo(Math.cos(angle) * W * 0.62, Math.sin(angle) * W * 0.62);
    ctx.strokeStyle = withAlpha(theme.gold, i % 2 === 0 ? 0.09 : 0.04);
    ctx.lineWidth = i % 2 === 0 ? 1.2 : 0.7;
    ctx.stroke();
  }
  ctx.restore();

  brandRow(ctx, W, H, W * 0.075, H * 0.07, theme, logo, "BETA OFFER", 34);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = withAlpha(theme.gold, 0.95);
  ctx.font = SANS(17, 600);
  drawTracked(ctx, "ONE FREE REPORT PER CUSTOMER", cx, H * 0.205, 4, "center");

  ctx.fillStyle = theme.ink;
  ctx.font = DISPLAY(W * 0.072, 700);
  ctx.fillText("Your first", cx, H * 0.315);
  ctx.fillText("report is", cx, H * 0.395);

  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.28);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, H * 0.47, W * 0.29, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = withAlpha(theme.gold, 0.18);
  ctx.beginPath();
  ctx.arc(cx, H * 0.47, W * 0.315, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const gradient = goldGradient(ctx, theme, cx - W * 0.3, H * 0.44, cx + W * 0.3, H * 0.52);
  ctx.fillStyle = gradient;
  ctx.font = DISPLAY(W * 0.16, 800);
  ctx.fillText("FREE", cx, H * 0.535);

  ctx.fillStyle = withAlpha(theme.ink, 0.9);
  ctx.font = SANS(24, 400);
  ctx.fillText("Then US$5 · ₹470 · Muhurtham US$10 · ₹940", cx, H * 0.6);

  const items = ["Birth Jathagam", "10 Poruthams", "Baby Naming", "Subha Muhurtham"];
  ctx.font = SANS(19, 500);
  ctx.fillStyle = withAlpha(theme.ink, 0.85);
  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = cx + (col === 0 ? -W * 0.3 : W * 0.02);
    const y = H * 0.645 + row * 40;
    ctx.beginPath();
    ctx.arc(x + 12, y - 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(theme.gold, 0.9);
    ctx.fill();
    ctx.fillStyle = withAlpha(theme.ink, 0.85);
    ctx.textAlign = "left";
    ctx.fillText(item, x + 26, y);
  });
  ctx.textAlign = "center";

  ctx.font = SANS(21, 600);
  const offerPillWidth = ctx.measureText("astrosivam.com").width + 1.2 * 12 + 68;
  drawPill(ctx, "astrosivam.com", (W - offerPillWidth) / 2, H * 0.735, {
    theme,
    filled: true,
    size: 21,
    height: 62,
    paddingX: 34,
    tracking: 1.2,
  });
  ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
  ctx.font = SANS(17, 500);
  ctx.fillText("PayPal · Cards · Google Pay / UPI", cx, H * 0.845);
  ctx.fillStyle = withAlpha(theme.muted, 1);
  ctx.font = SANS(15, 500);
  ctx.fillText("90% refund before approval · 7 days of astrologer chat", cx, H * 0.878);

  ctx.fillStyle = withAlpha(theme.gold, 0.35);
  ctx.fillRect(W * 0.2, H * 0.905, W * 0.6, 1);
  ctx.font = SANS(13.5, 500);
  drawContactLine(ctx, W, H, theme, { y: H * 0.94, size: 13.5 });
  ctx.textAlign = "left";
}

/* --------------------------------- review --------------------------------- */

function renderReview(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  content: CreativeContent,
) {
  paintBackdrop(ctx, W, H, theme, { glowX: 0.5, glowY: 0.28, frameInset: W * 0.026, seed: 47 });
  drawMotif(ctx, "scroll", W * 0.86, H * 0.9, W * 0.5, theme, 0.1);

  const pad = W * 0.085;
  brandRow(ctx, W, H, pad, H * 0.07, theme, logo, "CUSTOMER FEEDBACK", 34);

  const cx = W / 2;

  const quote = fitHeadline(ctx, `“${content.headline}”`, W - pad * 2, 9, W * 0.037, W * 0.026, 500);
  ctx.font = DISPLAY(quote.size, 500);
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  const quoteHeight = quote.lines.length * quote.size * 1.42;
  const top = Math.max(H * 0.28, H * 0.47 - quoteHeight / 2);
  quote.lines.forEach((line, i) => foilText(ctx, line, cx, top + i * quote.size * 1.42, theme));

  const afterQuote = top + quoteHeight + 42;
  ctx.fillStyle = withAlpha(theme.gold, 0.5);
  ctx.fillRect(cx - 50, afterQuote - 22, 100, 1);
  ctx.fillStyle = theme.ink;
  ctx.font = SANS(23, 600);
  ctx.fillText(content.subline, cx, afterQuote + 10);
  ctx.fillStyle = withAlpha(theme.goldSoft, 0.95);
  ctx.font = SANS(16, 600);
  drawTracked(ctx, content.chips[0]?.toUpperCase() ?? "CUSTOMER FEEDBACK", cx, afterQuote + 44, 2.6, "center");

  ctx.fillStyle = withAlpha(theme.muted, 0.95);
  ctx.font = SANS(14, 500);
  ctx.fillText("Publish only with permission", cx, Math.min(H * 0.8, afterQuote + 96));

  drawContactLine(ctx, W, H, theme, { y: H * 0.935, size: 14 });
  ctx.textAlign = "left";
}

/* ------------------------------- style sheet ------------------------------ */

const TILE_W = 1080;
const TILE_H = 1350;

async function drawStyleTile(
  ctx: CanvasRenderingContext2D,
  style: StyleKey,
  x: number,
  y: number,
  w: number,
  service: Service,
  content: CreativeContent,
) {
  const tile = await renderCreative({
    format: {
      id: `tile-${style}`,
      label: style,
      platform: "instagram",
      group: "posts",
      width: TILE_W,
      height: TILE_H,
      template: "post",
      ratio: "4:5",
      usage: "",
    },
    style,
    service,
    content,
    scale: w / TILE_W,
  });
  ctx.drawImage(tile, x, y, w, (w / TILE_W) * TILE_H);
}

async function renderStyleSheet(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  service: Service,
  content: CreativeContent,
) {
  const pad = W * 0.042;
  paintBackdrop(ctx, W, H, theme, { glowX: 0.5, glowY: 0.08, frameInset: 22, seed: 71 });
  drawFrame(ctx, W, H, theme, 22);

  // masthead
  ctx.fillStyle = withAlpha(theme.gold, 0.95);
  ctx.font = SANS(15, 600);
  drawTracked(ctx, "ASTRO SIVAM · DESIGN SYSTEM", pad, H * 0.038, 3.4, "left");
  const count = STYLES.length;
  ctx.fillStyle = theme.ink;
  ctx.font = DISPLAY(46, 700);
  drawTracked(ctx, `${count} ART DIRECTIONS`, pad, H * 0.078, 2.2, "left");
  ctx.fillStyle = theme.muted;
  ctx.font = SANS(19, 400);
  ctx.fillText(`${service.name} · ${content.headline} · six heritage, six modern`, pad, H * 0.103);

  const gapX = W * 0.02;
  const gapY = H * 0.022;
  const labelH = H * 0.028;
  const gridTop = H * 0.126;
  const gridW = W - pad * 2;
  const footTop = H - H * 0.055;
  const availH = footTop - gridTop;

  // pick the column count whose tile is largest once both width and height are honoured
  let cols = 2;
  let tileW = 0;
  let tileH = 0;
  for (let candidate = 2; candidate <= 9; candidate += 1) {
    const rowsNeeded = Math.ceil(count / candidate);
    const widthLimit = (gridW - gapX * (candidate - 1)) / candidate;
    const heightLimit = (availH / rowsNeeded - labelH - gapY) * (TILE_W / TILE_H);
    const w = Math.min(widthLimit, heightLimit);
    if (w > tileW) {
      cols = candidate;
      tileW = w;
      tileH = (w / TILE_W) * TILE_H;
    }
  }
  if (!tileW) {
    cols = Math.ceil(Math.sqrt(count));
    tileW = (gridW - gapX * (cols - 1)) / cols;
    tileH = (tileW / TILE_W) * TILE_H;
  }
  const rows = Math.ceil(count / cols);
  const cellW = (gridW - gapX * (cols - 1)) / cols;
  const sheetH = rows * (labelH + tileH + gapY) - gapY;
  const originY = gridTop + Math.max(0, (availH - sheetH) / 2);

  for (let index = 0; index < count; index += 1) {
    const style = STYLES[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = pad + col * (cellW + gapX) + (cellW - tileW) / 2;
    const cellTop = originY + row * (labelH + tileH + gapY);
    const tileY = cellTop + labelH * 0.72;

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = withAlpha(theme.gold, 0.95);
    const indexText = `${String(index + 1).padStart(2, "0")} · ${style.name.toUpperCase()}`;
    const familyText = style.family.toUpperCase();
    const familyFont = SANS(10.5, 500);
    const tracking = 2.2;
    const trackedWidth = (text: string, font: string) => {
      ctx.font = font;
      return ctx.measureText(text).width + text.length * tracking;
    };
    ctx.font = familyFont;
    const familyW = ctx.measureText(familyText).width + familyText.length * 1.4;
    let labelFont = SANS(13, 600);
    for (const size of [13, 12, 11, 10, 9.5]) {
      labelFont = SANS(size, 600);
      if (trackedWidth(indexText, labelFont) <= tileW - 6) break;
    }
    const showFamily = trackedWidth(indexText, labelFont) + familyW + 12 <= tileW;
    drawTracked(ctx, indexText, x, cellTop, tracking, "left");

    if (showFamily) {
      ctx.textAlign = "right";
      ctx.fillStyle = withAlpha(theme.muted, 0.95);
      ctx.font = familyFont;
      drawTracked(ctx, familyText, x + tileW, cellTop, 1.4, "right");
      ctx.textAlign = "left";
    }

    await drawStyleTile(ctx, style.key, x, tileY, tileW, service, content);

    ctx.strokeStyle = withAlpha(theme.gold, 0.24);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, tileY, tileW, tileH);
  }

  // footer
  const footerY = H - H * 0.028;
  ctx.fillStyle = withAlpha(theme.gold, 0.3);
  ctx.fillRect(pad, footerY - 22, W - pad * 2, 1);
  ctx.fillStyle = withAlpha(theme.muted, 0.95);
  ctx.font = SANS(13, 500);
  ctx.fillText("astrosivam.com", pad, footerY);
  ctx.textAlign = "right";
  ctx.fillStyle = withAlpha(theme.gold, 0.9);
  ctx.font = SANS(12, 600);
  drawTracked(ctx, "SHEET 01 · HERITAGE + MODERN", W - pad, footerY, 2, "right");
  ctx.textAlign = "left";
}

/* --------------------------------- overlay -------------------------------- */

function drawProfileGuide(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(W / 2, H / 2, W * 0.35, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = "rgba(87,184,154,0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(87,184,154,0.95)";
  ctx.font = SANS(18, 600);
  ctx.fillText("AVATAR CROP GUIDE", 28, 42);
  ctx.restore();
}

function renderCoverGuide(ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme) {
  ctx.save();
  const zone = { left: W * 0.25, right: W * 0.25, top: H * 0.25, bottom: H * 0.25 };
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, 0, W, zone.top);
  ctx.fillRect(0, H - zone.bottom, W, zone.bottom);
  ctx.fillRect(0, zone.top, zone.left, H - zone.top - zone.bottom);
  ctx.fillRect(W - zone.right, zone.top, zone.right, H - zone.top - zone.bottom);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(87,184,154,0.95)";
  ctx.lineWidth = 2;
  ctx.strokeRect(zone.left, zone.top, W - zone.left - zone.right, H - zone.top - zone.bottom);
  ctx.fillStyle = "rgba(87,184,154,0.95)";
  ctx.font = SANS(16, 600);
  ctx.fillText("MOBILE 640 × 360 CROP", zone.left + 12, zone.top + 24);
  ctx.restore();
  void theme;
}

/* --------------------------------- render --------------------------------- */

export async function renderCreative(options: RenderOptions): Promise<HTMLCanvasElement> {
  options = { ...options, content: englishCopy(options.content) };
  const {
    format,
    themeKey,
    service,
    content,
    scale = 1,
    overlay = false,
    slideIndex = 0,
    highlightIndex = 0,
    quoteIndex = 0,
    reviewIndex = 0,
  } = options;

  const style: StyleKey = options.style ?? "signature";
  const theme = THEMES[themeKey ?? STYLE_MAP[style]?.defaultTheme ?? "midnight"] ?? THEMES.midnight;
  await ensureFonts();
  const logo = await loadLogo();
  const { canvas, ctx } = createCanvas(format.width, format.height, scale);
  const W = format.width;
  const H = format.height;

  switch (format.template) {
    case "profile":
      renderProfile(ctx, W, H, theme, logo);
      break;
    case "cover":
      renderCover(ctx, W, H, theme, logo, false);
      break;
    case "cover-statement":
      renderCover(ctx, W, H, theme, logo, true);
      break;
    case "link":
      renderLink(ctx, W, H, theme, logo);
      break;
    case "post":
    case "square":
      if (!hasStyleLayout(style) || !renderStylePost(style, ctx, W, H, theme, logo, service, content)) {
        renderPost(ctx, W, H, theme, logo, service, content, style);
      }
      break;
    case "carousel":
      renderCarousel(ctx, W, H, theme, logo, service, slideIndex);
      break;
    case "story":
      renderStory(ctx, W, H, theme, logo, service, content, false);
      break;
    case "reel-cover":
      renderStory(ctx, W, H, theme, logo, service, content, true);
      break;
    case "highlight": {
      renderHighlight(ctx, W, H, highlightIndex);
      break;
    }
    case "panchangam":
      renderPanchangam(ctx, W, H, theme, logo, content);
      break;
    case "quote": {
      const quote = QUOTES[quoteIndex % QUOTES.length];
      renderQuote(ctx, W, H, theme, logo, {
        ...content,
        headline: content.headline || quote.text,
        subline: content.subline || quote.attribution,
      });
      break;
    }
    case "offer":
      renderOffer(ctx, W, H, theme, logo);
      break;
    case "review": {
      const review = REVIEWS[reviewIndex % REVIEWS.length];
      renderReview(ctx, W, H, theme, logo, {
        ...content,
        headline: content.headline || review.quote,
        subline: content.subline || `${review.name} · ${review.place}`,
        chips: content.chips[0] ? content.chips : [review.service],
      });
      break;
    }
    case "style-sheet":
      await renderStyleSheet(ctx, W, H, theme, service, content);
      break;
    default:
      renderPost(ctx, W, H, theme, logo, service, content, style);
  }

  // The same deterministic finish is shared by editor previews, downloads, packs and reels.
  // Modern systems carry their own edge treatment, so the bevelled rail only
  // lands on heritage posts and on every non-post format.
  const isPost = format.template === "post" || format.template === "square";
  if (!isPost || (STYLE_MAP[style]?.goldRail ?? true)) drawPremiumFrame(ctx, W, H, theme);
  drawGrain(ctx, W, H, service.id.length * 17 + format.id.length * 31);

  if (overlay) {
    if (format.template === "profile") drawProfileGuide(ctx, W, H);
    else if (format.template === "cover" || format.template === "cover-statement") renderCoverGuide(ctx, W, H, theme);
    else if (format.safeZones?.length) drawSafeZones(ctx, W, H, theme, format.safeZones);
  }

  return canvas;
}

/* ----------------------------- content defaults --------------------------- */

export interface FieldSpec {
  key: "kicker" | "headline" | "subline" | "tamil" | "price" | "cta";
  label: string;
  multiline?: boolean;
  max?: number;
}

export interface EditorConfig {
  fields: FieldSpec[];
  chips?: { label: string; count: number };
  message?: string;
}

const CONTENT_FIELDS: FieldSpec[] = [
  { key: "kicker", label: "Kicker / badge", max: 48 },
  { key: "headline", label: "Headline", multiline: true, max: 110 },
  { key: "subline", label: "Subline", multiline: true, max: 120 },
  { key: "tamil", label: "Tamil line", max: 60 },
  { key: "price", label: "Price pill", max: 28 },
  { key: "cta", label: "Link / CTA", max: 60 },
];

export function editorConfig(format: CreativeFormat): EditorConfig {
  switch (format.template) {
    case "post":
    case "square":
    case "story":
    case "reel-cover":
      return { fields: CONTENT_FIELDS, chips: { label: "Detail chips", count: 3 } };
    case "carousel":
      return {
        fields: [],
        message:
          "Carousel copy is written per slide in Service Posts → Carousel. Use the slide navigator to preview all seven.",
      };
    case "panchangam":
      return {
        fields: [{ key: "headline", label: "Date line", max: 60 }],
        chips: {
          label: "The ten limbs, in order (year, ayana, ritu, month, paksha, tithi, vara, nakshatra, yoga, karana)",
          count: PANCHANGAM_ROWS.length,
        },
        message:
          "Generate the real values in Panchangam, or type them here. Add a “|” to put an end time or a note in the right-hand column, e.g. “Trayodashi | till 1:38 PM”.",
      };
    case "quote":
      return {
        fields: [
          { key: "headline", label: "Quote", multiline: true, max: 160 },
          { key: "subline", label: "Attribution", max: 48 },
        ],
      };
    case "review":
      return {
        fields: [
          { key: "headline", label: "Review quote", multiline: true, max: 230 },
          { key: "subline", label: "Name · place", max: 60 },
        ],
        chips: { label: "Service label", count: 1 },
      };
    case "cover-statement":
      return {
        fields: [{ key: "headline", label: "Promise headline", multiline: true, max: 80 }],
      };
    case "style-sheet":
      return {
        fields: [],
        message:
          "The contact sheet re-renders the same post in all twelve art directions at once. Edit the copy in a post format first — this sheet follows it.",
      };
    case "profile":
    case "highlight":
    case "offer":
    case "cover":
    case "link":
    default:
      return {
        fields: [],
        message:
          "This layout is locked to the brand system so every export stays consistent. Choose another format to edit copy.",
      };
  }
}

export function defaultContent(
  format: CreativeFormat,
  service: Service,
  options: { quoteIndex?: number; reviewIndex?: number } = {},
): CreativeContent {
  const base: CreativeContent = { ...service.creative, chips: [...service.creative.chips] };
  const quote = QUOTES[(options.quoteIndex ?? 0) % QUOTES.length];
  const review = REVIEWS[(options.reviewIndex ?? 0) % REVIEWS.length];

  switch (format.template) {
    case "panchangam":
      return {
        kicker: "Daily Panchangam",
        headline: dateLabel(),
        subline: "Chennai · timings in IST",
        tamil: "தினசரி பஞ்சாங்கம்",
        chips: PANCHANGAM_ROWS.map((row) => row.en),
        price: "Free",
        cta: "astrosivam.com",
      };
    case "quote":
      return { ...base, headline: quote.text, subline: quote.attribution };
    case "review":
      return {
        ...base,
        headline: review.quote,
        subline: `${review.name} · ${review.place}`,
        chips: [review.service],
      };
    default:
      return base;
  }
}
