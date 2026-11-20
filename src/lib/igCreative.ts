import type { MotifKey, StyleKey, ThemeKey } from "../types";
import {
  type ImageBox,
  accent,
  drawArtFallback,
  drawContactLine,
  drawCta,
  drawImageIn,
  drawIndex,
  drawPageDots,
  drawSwipe,
  frameFor,
  hairline,
  mutedOn,
  paintGrain,
  paintStyledGround,
  roundRect,
  styleMotif,
  withAlpha,
} from "./posterKit";
import { drawSocialText, renderSocialCreative, type SocialScene } from "./socialCreative";
import { renderHighlightSeal } from "./highlightSeal";
import { brandSize, brandSpot, drawGlobalLockup } from "./brandPlacement";
import { IG_HIGHLIGHTS } from "../data/instagram";
import { fitLine, fitLines, fitSize, fontPx as px, lineHop, wrapAll } from "./typeset";
import { auditLegibility, LEGIBILITY_MINIMUMS, type TypedDraw, type TypeRole } from "./legibility";

/**
 * Instagram-specific creatives.
 *
 * Instagram is not one canvas. A feed post is read at ~360 px, a story at the
 * full 390 px with the top 250 px and bottom 340 px owned by the app, a reel
 * cover is judged at 124 px in the profile grid, and a highlight cover is a
 * 64 px circle where anything but a symbol turns to mud. Each surface gets its
 * own painter and its own audit width here, and they share only the palette,
 * the logo plate, the type pairing and the footer line.
 */

export type IgLayout =
  | "ig-service"
  | "ig-education"
  | "ig-quote"
  | "ig-carousel-cover"
  | "ig-story"
  | "ig-reel-cover"
  | "ig-highlight";

export interface IgSafeZone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface IgLayoutMeta {
  key: IgLayout;
  name: string;
  surface: "Feed" | "Carousel" | "Story" | "Reels" | "Highlights";
  purpose: string;
  width: number;
  height: number;
  /** Width the asset is actually seen at, in CSS px. */
  mobileWidth: number;
  /** Canvas px the viewer sees. A 9:16 cover judged in the grid is the 1:1 crop. */
  auditWidth: number;
  crop: "rect" | "square" | "circle";
  /** What Instagram does to the file, in Meta's own terms. */
  cropNote: string;
  /** Area the app's own UI covers. Never place type here. */
  uiZones?: { top: number; bottom: number };
  safeArea?: IgSafeZone;
}

export const IG_LAYOUTS: IgLayoutMeta[] = [
  {
    key: "ig-service",
    name: "Service card",
    surface: "Feed",
    purpose: "A paid service with deliverables and one call to action.",
    width: 1080,
    height: 1350,
    mobileWidth: 360,
    auditWidth: 1080,
    crop: "rect",
    cropNote: "4:5 is the tallest shape Instagram shows in the feed; nothing is cropped at 360 px.",
  },
  {
    key: "ig-education",
    name: "Field note",
    surface: "Feed",
    purpose: "Teaches one idea. No offer — save and share behaviour.",
    width: 1080,
    height: 1350,
    mobileWidth: 360,
    auditWidth: 1080,
    crop: "rect",
    cropNote: "Light editorial page, so a dark feed does not become a wall of maroon cards.",
  },
  {
    key: "ig-quote",
    name: "Type plate",
    surface: "Feed",
    purpose: "One line, set large. The breathing space in a nine-post grid.",
    width: 1080,
    height: 1080,
    mobileWidth: 360,
    auditWidth: 1080,
    crop: "rect",
    cropNote: "Square, type only: this is the post that keeps the grid from looking like a catalogue.",
  },
  {
    key: "ig-carousel-cover",
    name: "Carousel cover",
    surface: "Carousel",
    purpose: "Slide one of a swipe set: the promise, the index, and the swipe cue.",
    width: 1080,
    height: 1350,
    mobileWidth: 360,
    auditWidth: 1080,
    crop: "rect",
    cropNote:
      "All slides are cropped to the first slide's aspect ratio. Keep every slide 4:5 so the crop is predictable.",
    safeArea: { x: 0, y: 0, w: 1080, h: 1350, label: "4:5 — matches every slide" },
  },
  {
    key: "ig-story",
    name: "Story frame",
    surface: "Story",
    purpose: "Full-screen daily frame with the call to action above the reply bar.",
    width: 1080,
    height: 1920,
    mobileWidth: 390,
    auditWidth: 1080,
    crop: "rect",
    cropNote: "The top 250 px and bottom 340 px belong to Instagram's own UI. Type lives between them.",
    uiZones: { top: 250, bottom: 340 },
    safeArea: { x: 72, y: 250, w: 936, h: 1330, label: "Story content band" },
  },
  {
    key: "ig-reel-cover",
    name: "Reel cover",
    surface: "Reels",
    purpose: "Cover image for a Reel, judged at thumbnail size in the profile grid.",
    width: 1080,
    height: 1920,
    mobileWidth: 124,
    auditWidth: 1080,
    crop: "square",
    cropNote: "The profile grid shows the centre 1080 × 1080. Everything outside it is only seen in the player.",
    safeArea: { x: 0, y: 420, w: 1080, h: 1080, label: "Grid crop 1:1" },
  },
  {
    key: "ig-highlight",
    name: "Highlight seal",
    surface: "Highlights",
    purpose: "A symbol in a 64 px circle. Instagram renders the label itself.",
    width: 1080,
    height: 1080,
    mobileWidth: 64,
    auditWidth: 1080,
    crop: "circle",
    cropNote: "Circular crop: keep the symbol inside the 70 % safe circle, and keep type out entirely.",
    safeArea: { x: 162, y: 162, w: 756, h: 756, label: "Safe circle 70 %" },
  },
];

export const IG_LAYOUT_MAP: Record<IgLayout, IgLayoutMeta> = Object.fromEntries(
  IG_LAYOUTS.map((layout) => [layout.key, layout]),
) as Record<IgLayout, IgLayoutMeta>;

export interface IgContent {
  kicker: string;
  headline: string;
  subline: string;
  tamil: string;
  chips: string[];
  price: string;
  cta: string;
  footer: string;
  /** Slide index for carousel covers, e.g. "01 / 07". */
  index?: string;
  /** Symbol for a highlight cover. */
  glyph?: MotifKey;
  /** Attribution line for a quote plate. */
  attribution?: string;
}

export interface IgCreativeInput {
  layout: IgLayout;
  themeKey: ThemeKey;
  style: StyleKey;
  content: IgContent;
  art?: string | null;
  /** Story / reel editor aid: draws the UI bands and the grid crop. */
  showSafeArea?: boolean;
  scale?: number;
}

export interface IgRender {
  canvas: HTMLCanvasElement;
  layout: IgLayoutMeta;
  typography: TypedDraw[];
}

type Scene = SocialScene<IgContent>;
const drawText = drawSocialText;

/**
 * Cover CTA. This layout wants a huge label — it has to survive a 124 px
 * thumbnail — but an editorial label like "ORDER YOUR JATHAGAM (24 H)" cannot
 * fit one line at that size. It is fitted, then split over two centred lines
 * rather than allowed to run past the canvas on both edges.
 */
function coverCta(
  scene: Scene,
  label: string,
  y: number,
  start: number,
  min: number,
  track: number,
  color: string,
): number {
  const { ctx, W, fonts } = scene;
  const budget = W * 0.86;
  const size = fitLine(ctx, label, budget, start, min, (value) => fonts.sans(value, 600), track);
  ctx.save();
  ctx.font = fonts.sans(size, 600);
  const width = ctx.measureText(label).width + track * Math.max(0, Array.from(label).length - 1);
  ctx.restore();
  // `fitLines` may have to step below the one-line size to get two lines to fit,
  // and it reports the size it actually used. Drawing at the original size
  // measured the lines in one face and painted them in a larger one, which is
  // how a two-line CTA ended up a few pixels wider than the card.
  const fitted =
    width <= budget
      ? { size, lines: [label], truncated: false }
      : fitLines(ctx, label, budget, 2, (value) => fonts.sans(value, 600), size, min, true);
  let cursor = y;
  fitted.lines.forEach((line) => {
    drawText(scene, "cta", line, W / 2, cursor, fonts.sans(fitted.size, 600), color, {
      align: "center",
      tracking: track,
    });
    cursor += lineHop(fitted.size, 1.2, line);
  });
  return cursor;
}

const paintGround = (scene: Scene, options: Parameters<typeof paintStyledGround>[4] = {}) => {
  paintStyledGround(scene.ctx, frameFor(scene.W, scene.H), scene.theme, scene.style, options);
  paintGrain(scene.ctx, scene.W, scene.H, 31, scene.theme.light ? 0.024 : 0.034);
};

const artCard = (scene: Scene, box: ImageBox, options = {}) => {
  if (scene.art) {
    drawImageIn(scene.ctx, scene.art, box, {
      inset: 0,
      focusY: 0.36,
      radius: Math.min(box.w, box.h) * 0.03,
      outline: withAlpha(scene.theme.gold, 0.5),
      outlineWidth: Math.max(1.5, box.w * 0.003),
      vignette: 0.18,
      grade: scene.theme.bgTo,
      gradeAlpha: 0.1,
      ...options,
    });
  } else {
    drawArtFallback(scene.ctx, box, scene.theme, styleMotif(scene.style), 0.8);
  }
};

/* ------------------------------ 1 · service card -------------------------- */

function igService(scene: Scene) {
  const { ctx, W, H, theme, content, fonts } = scene;
  paintGround(scene, { angle: "diagonal", glowX: 0.72, glowY: 0.24, glow: 0.2 });

  // A full-height art panel bleeds off the right edge, so the card reads as a
  // magazine plate rather than a poster with a picture stuck on it.
  // Give the editorial copy a little more width: otherwise a long final word
  // (for example MAPPED) can be split down to a stray character in the feed.
  const panelX = W * 0.56;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX, 0, W - panelX, H);
  ctx.clip();
  artCard(scene, { x: panelX, y: 0, w: W - panelX + W * 0.06, h: H }, { inset: 0, radius: 0, shape: "arch" });
  ctx.restore();
  // Gold keyline at the seam, faded at both ends.
  const seam = ctx.createLinearGradient(0, 0, 0, H);
  seam.addColorStop(0, withAlpha(theme.gold, 0));
  seam.addColorStop(0.18, withAlpha(theme.gold, 0.5));
  seam.addColorStop(0.82, withAlpha(theme.gold, 0.5));
  seam.addColorStop(1, withAlpha(theme.gold, 0));
  ctx.fillStyle = seam;
  ctx.fillRect(panelX - W * 0.0016, 0, Math.max(2, W * 0.0032), H);

  const pad = W * 0.07;
  const lockupWidth = drawGlobalLockup(ctx, scene.logo, { W, H, theme, baseSize: W * 0.075, pad, topBand: H * 0.058 - W * 0.075 * 0.3, bottomBand: H * 0.075 });
  const kickerLabel = content.kicker.toUpperCase();
  const serviceSpot = brandSpot(W, H, brandSize(W * 0.075), { pad });
  const kickerX = serviceSpot.align === "left" ? pad + lockupWidth + W * 0.035 : pad;
  const kickerSize = fitLine(ctx, kickerLabel, W - kickerX - pad, W * 0.027, W * 0.019, (size) => fonts.sans(size, 600), W * 0.0032);
  drawText(scene, "kicker", kickerLabel, kickerX, H * 0.058 + W * 0.0375, fonts.sans(kickerSize, 600), accent(theme), {
    tracking: W * 0.0032,
  });
  // Text column ends a gutter before the art seam — never on top of it.
  const textW = panelX - pad - W * 0.04;
  const headlineFont = (size: number) => fonts.display(size, 600);
  const headlineFloor = W * 0.048;
  // Fit the widest individual word before wrapping. `wrapAll` can otherwise
  // break an over-wide word into fragments while still reporting that the
  // four-line block fits (e.g. MAPPED / D), which reads as a clipped headline.
  const headlineStart = content.headline
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((size, word) => Math.min(size, fitSize(ctx, word, textW, size, headlineFloor, headlineFont)), W * 0.085);
  const head = fitLines(ctx, content.headline, textW, 4, headlineFont, headlineStart, headlineFloor);
  let y = H * 0.2;
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, pad, y, fonts.display(head.size, 600), withAlpha(theme.ink, 0.97));
    y += lineHop(head.size, 1.06, line);
  });

  if (content.tamil.trim()) {
    // Tamil glyphs carry deep descenders; advance by the full em plus a lead so
    // the price panel below can never clip them.
    y += H * 0.014;
    const tamil = fitLines(ctx, content.tamil, textW, 2, (size) => fonts.script(size), W * 0.036, W * 0.024);
    tamil.lines.forEach((line) => {
      drawText(scene, "body", line, pad, y, fonts.script(tamil.size), accent(theme));
      y += lineHop(tamil.size, 1.35, line);
    });
    y += H * 0.012;
  }

  // Footer first, because it decides how much room the CTA has. The colophon
  // wraps to at most two lines at a fixed, legible size — 8 CSS px on a phone.
  const footerSize = W * 0.0225;
  const footerW = textW;
  ctx.save();
  ctx.font = fonts.sans(footerSize, 500);
  const footerLines = wrapAll(ctx, content.footer, footerW);
  ctx.restore();
  const footerLineH = footerSize * 1.32;
  const footerLast = H - H * 0.042;
  const footerTop = footerLast - (footerLines.length - 1) * footerLineH;
  const ruleY = footerTop - footerSize * 1.35;

  const ctaSize = W * 0.032;
  const ctaOpts = { x: pad, y: H - H * 0.152, align: "left" as const, theme, label: content.cta, variant: "pill" as const, size: ctaSize };
  const ctaTop = ctaOpts.y;
  const ctaHeight = ctaSize * 2.4;

  // Deliverables: as many as fit above the CTA at a size a phone can read.
  // The list is ordered by importance, so the card keeps the first two and the
  // caption carries the rest — no chip is ever set below 11 CSS px to squeeze
  // a third one in. Price cards are intentionally removed from every poster.
  const chipSize = W * 0.0306;
  const chipTextW = textW - W * 0.036;
  const chipTop = y + H * 0.028;
  ctx.save();
  ctx.font = fonts.sans(chipSize, 400);
  let laid = content.chips.slice(0, 3).map((chip) => wrapAll(ctx, chip, chipTextW));
  ctx.restore();
  const stackHeight = (rows: string[][]) =>
    rows.reduce((sum, row) => sum + row.length * chipSize * 1.32 + H * 0.014, 0);
  while (laid.length > 1 && chipTop + stackHeight(laid) > ctaTop - H * 0.02) laid = laid.slice(0, -1);

  let chipY = chipTop;
  laid.forEach((lines) => {
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.gold, 0.85);
    ctx.lineWidth = Math.max(2, W * 0.0032);
    ctx.beginPath();
    ctx.moveTo(pad, chipY + chipSize * 0.42);
    ctx.lineTo(pad + W * 0.008, chipY + chipSize * 0.78);
    ctx.lineTo(pad + W * 0.022, chipY);
    ctx.stroke();
    ctx.restore();
    lines.forEach((line, lineIndex) => {
      drawText(scene, "body", line, pad + W * 0.036, chipY + lineIndex * chipSize * 1.32, fonts.sans(chipSize, 400), mutedOn(theme, 0.88));
    });
    chipY += lines.length * chipSize * 1.32 + H * 0.014;
  });

  if (content.cta.trim()) {
    drawCta(ctx, ctaOpts);
    scene.log.add("cta", ctaSize, content.cta);
    void ctaHeight;
  }

  // The rule and colophon stop at the art seam, never under the portrait.
  hairline(ctx, pad, ruleY, panelX - W * 0.03, withAlpha(theme.gold, 0.28), 1.5);
  drawContactLine(ctx, W, H, theme, { y: H - H * 0.024, size: W * 0.02 });
}

/* ------------------------------ 2 · field note ---------------------------- */

function igEducation(scene: Scene) {
  const { ctx, W, H, theme, content, fonts } = scene;
  paintGround(scene, { angle: "vertical", glowX: 0.2, glowY: 0.1, glow: 0.1 });

  const pad = W * 0.075;
  const eduLockW = drawGlobalLockup(ctx, scene.logo, { W, H, theme, baseSize: W * 0.06, pad, topBand: H * 0.062 - W * 0.03 - W * 0.06 * 0.3, bottomBand: H * 0.075 });
  const eduKicker = content.kicker.toUpperCase();
  const eduSpot = brandSpot(W, H, brandSize(W * 0.06), { pad });
  const eduKickerX = eduSpot.align === "left" ? pad + eduLockW + W * 0.03 : pad;
  const eduKickerSize = fitLine(ctx, eduKicker, W - eduKickerX - pad - W * 0.3, W * 0.024, W * 0.017, (size) => fonts.sans(size, 700), W * 0.0042);
  drawText(scene, "kicker", eduKicker, eduKickerX, H * 0.062, fonts.sans(eduKickerSize, 700), accent(theme), {
    tracking: W * 0.0042,
  });
  hairline(ctx, pad, H * 0.092, W - pad, withAlpha(theme.gold, 0.32), 1.5);

  // Oversized index numeral as a watermark — structure without another rule.
  ctx.save();
  ctx.globalAlpha = theme.light ? 0.1 : 0.14;
  drawIndex(ctx, content.index ?? "01", W - pad, H * 0.1, W * 0.42, theme, "right", W * 0.86);
  ctx.restore();

  const head = fitLines(ctx, content.headline, W - pad * 2.1, 3, (size) => fonts.display(size, 600), W * 0.082, W * 0.05);
  let y = H * 0.19;
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, pad, y, fonts.display(head.size, 600), withAlpha(theme.ink, 0.96));
    y += lineHop(head.size, 1.07, line);
  });

  y += H * 0.02;
  if (content.tamil.trim()) {
    const tamil = fitLines(ctx, content.tamil, W - pad * 2.1, 2, (size) => fonts.script(size), W * 0.032, W * 0.022);
    tamil.lines.forEach((line) => {
      drawText(scene, "body", line, pad, y, fonts.script(tamil.size), theme.light ? theme.goldSoft : accent(theme));
      y += lineHop(tamil.size, 1.35, line);
    });
    y += H * 0.006;
  }

  // One paragraph, set as a single measured block.
  const body = fitLines(ctx, content.subline, W - pad * 2.1, 4, (size) => fonts.sans(size, 400), W * 0.035, W * 0.031, true);
  let bodyY = y;
  body.lines.forEach((line) => {
    drawText(scene, "body", line, pad, bodyY, fonts.sans(body.size, 400), mutedOn(theme, 0.9));
    bodyY += lineHop(body.size, 1.42, line);
  });

  // Circular art, quiet, above the colophon — never over it.
  const artSize = W * 0.185;
  if (scene.art) {
    drawImageIn(ctx, scene.art, { x: pad, y: H * 0.695, w: artSize, h: artSize }, {
      inset: 0.03,
      shape: "circle",
      focusY: 0.34,
      outline: withAlpha(theme.gold, 0.6),
      outlineWidth: Math.max(1.5, W * 0.0028),
      vignette: 0.2,
    });
  }

  if (content.cta.trim()) {
    drawCta(ctx, {
      x: W - pad,
      y: H - H * 0.155,
      align: "right",
      theme,
      label: content.cta,
      variant: "text",
      size: W * 0.034,
    });
    scene.log.add("cta", W * 0.034, content.cta);
  }
  drawContactLine(ctx, W, H, theme, { y: H - H * 0.03, size: W * 0.02 });
}

/* ------------------------------- 3 · type plate --------------------------- */

function igQuote(scene: Scene) {
  const { ctx, W, H, theme, content, fonts } = scene;
  paintGround(scene, { angle: "vertical", glowX: 0.5, glowY: 0.42, glow: 0.16 });

  // Thin double frame keeps a text-only square from floating.
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.32);
  ctx.lineWidth = Math.max(1.2, W * 0.0018);
  ctx.strokeRect(W * 0.06, H * 0.06, W * 0.88, H * 0.88);
  ctx.strokeStyle = withAlpha(theme.gold, 0.16);
  ctx.strokeRect(W * 0.075, H * 0.075, W * 0.85, H * 0.85);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = withAlpha(theme.gold, 0.75);
  ctx.font = fonts.display(W * 0.21, 700);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("“", W * 0.105, H * 0.09);
  ctx.restore();

  const quote = fitLines(ctx, content.headline, W * 0.72, 4, (size) => fonts.display(size, 500), W * 0.078, W * 0.044);
  const blockH = quote.lines.reduce((sum, line) => sum + lineHop(quote.size, 1.18, line), 0);
  let y = H / 2 - blockH / 2;
  quote.lines.forEach((line) => {
    drawText(scene, "headline", line, W / 2, y, fonts.display(quote.size, 500), withAlpha(theme.ink, 0.97), { align: "center" });
    y += lineHop(quote.size, 1.18, line);
  });

  if (content.attribution?.trim()) {
    hairline(ctx, W / 2 - W * 0.06, y + H * 0.035, W / 2 + W * 0.06, withAlpha(theme.gold, 0.6), 2);
    drawText(scene, "kicker", content.attribution.toUpperCase(), W / 2, y + H * 0.05, fonts.sans(W * 0.024, 600), accent(theme), {
      align: "center",
      tracking: W * 0.0038,
    });
  }

  // The lockup opens the plate top-left; the colophon closes it centred.
  drawGlobalLockup(ctx, scene.logo, { W, H, theme, baseSize: W * 0.062, pad: W * 0.1, topBand: H * 0.095 - W * 0.062 * 0.3, bottomBand: H * 0.075 });
  drawContactLine(ctx, W, H, theme, { y: H * 0.94, size: W * 0.021 });
}

/* ---------------------------- 4 · carousel cover -------------------------- */

function igCarouselCover(scene: Scene) {
  const { ctx, W, H, theme, content, fonts } = scene;
  paintGround(scene, { angle: "vertical", glowX: 0.5, glowY: 0.1, glow: 0.14 });

  const pad = W * 0.07;
  drawGlobalLockup(ctx, scene.logo, { W, H, theme, baseSize: W * 0.055, pad, topBand: H * 0.022 - W * 0.055 * 0.3, bottomBand: H * 0.075 });
  const window = { x: pad, y: H * 0.075, w: W - pad * 2, h: H * 0.47 };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = W * 0.04;
  ctx.shadowOffsetY = W * 0.016;
  roundRect(ctx, window.x, window.y, window.w, window.h, W * 0.035);
  ctx.fillStyle = theme.bgTo;
  ctx.fill();
  ctx.restore();
  artCard(scene, window, { inset: 0.006, radius: W * 0.03, focusY: 0.34, outline: withAlpha(theme.gold, 0.6) });

  // Index numeral straddles the window's lower-left corner.
  ctx.save();
  roundRect(ctx, pad - W * 0.006, window.y + window.h - H * 0.052, W * 0.19, H * 0.085, W * 0.014);
  ctx.fillStyle = theme.light ? "#FBF5E9" : "#1A0F10";
  ctx.fill();
  ctx.strokeStyle = withAlpha(theme.gold, 0.55);
  ctx.lineWidth = Math.max(1, W * 0.0016);
  ctx.stroke();
  ctx.restore();
  drawText(
    scene,
    "kicker",
    content.index ?? "01 / 07",
    pad + W * 0.089,
    window.y + window.h - H * 0.052 + H * 0.0425,
    fonts.sans(W * 0.028, 700),
    accent(theme),
    { align: "center", baseline: "middle", tracking: W * 0.002 },
  );

  // Headline and subline share the room above the footer rule, and the
  // headline steps down until both fit. Sizing each block on its own let a
  // three-line Tamil headline push the paragraph onto the footer rule.
  const footerBaseline = H - H * 0.048;
  const copyTop = window.y + window.h + H * 0.055;
  const copyRoom = footerBaseline - H * 0.055 - copyTop;
  let headSize = W * 0.072;
  let headLines: string[] = [];
  let bodyLines: string[] = [];
  let bodySize = W * 0.032;
  const bodyPx = W * 0.032;
  for (;;) {
    ctx.save();
    ctx.font = fonts.display(headSize, 600);
    headLines = wrapAll(ctx, content.headline, W - pad * 2);
    ctx.restore();
    if (content.subline.trim()) {
      const body = fitLines(ctx, content.subline, W - pad * 2.1, 2, (size) => fonts.sans(size, 400), bodyPx, W * 0.028, true);
      bodyLines = body.lines;
      bodySize = body.size;
    } else {
      bodyLines = [];
      bodySize = bodyPx;
    }
    const headBlock = headLines.reduce((sum, line) => sum + lineHop(headSize, 1.08, line), 0);
    const bodyBlock = bodyLines.reduce((sum, line) => sum + lineHop(bodySize, 1.34, line), 0);
    if (headBlock + (bodyLines.length ? H * 0.014 : 0) + bodyBlock <= copyRoom || headSize <= W * 0.048) break;
    headSize -= Math.max(1, W * 0.002);
  }
  let y = copyTop;
  headLines.forEach((line) => {
    drawText(scene, "headline", line, pad, y, fonts.display(headSize, 600), withAlpha(theme.ink, 0.97));
    y += lineHop(headSize, 1.08, line);
  });
  if (bodyLines.length) {
    y += H * 0.014;
    bodyLines.forEach((line) => {
      drawText(scene, "body", line, pad, y, fonts.sans(bodySize, 400), mutedOn(theme, 0.88));
      y += lineHop(bodySize, 1.34, line);
    });
  }

  // Carousel position sits inside the art window, where a swipe gesture starts;
  // "SWIPE" shares the footer baseline on the far right.
  const dotY = window.y + window.h - W * 0.052;
  const dotsWidth = 7 * (W * 0.0082 * 2.4) - (W * 0.0082 * 2.4 - W * 0.0082 * 2);
  ctx.save();
  roundRect(ctx, W - pad - dotsWidth - W * 0.03, dotY - W * 0.026, dotsWidth + W * 0.024, W * 0.052, W * 0.026);
  ctx.fillStyle = withAlpha(theme.bgFrom, 0.62);
  ctx.fill();
  ctx.restore();
  drawPageDots(ctx, W - pad - dotsWidth - W * 0.018, dotY, 7, 0, theme, W * 0.0082, "left");
  drawSwipe(ctx, W - pad, footerBaseline - H * 0.008, W * 0.024, theme, "right", "SWIPE");
  scene.log.add("kicker", W * 0.024, "SWIPE");
  drawContactLine(ctx, W, H, theme, { y: H - H * 0.024, size: W * 0.02 });
}

/* -------------------------------- 5 · story ------------------------------- */

function igStory(scene: Scene) {
  const { ctx, W, H, theme, content, fonts } = scene;
  const meta = IG_LAYOUT_MAP["ig-story"];
  const top = meta.uiZones?.top ?? 250;
  const bottom = H - (meta.uiZones?.bottom ?? 340);

  // Full-bleed art with a scrim that keeps type legible over any portrait.
  if (scene.art) {
    drawImageIn(ctx, scene.art, { x: 0, y: 0, w: W, h: H }, { inset: 0, focusY: 0.3, vignette: 0.32, grade: theme.bgFrom, gradeAlpha: 0.2 });
  } else {
    paintGround(scene, { angle: "vertical", glowX: 0.5, glowY: 0.24, glow: 0.24 });
  }
  const scrim = ctx.createLinearGradient(0, 0, 0, H);
  scrim.addColorStop(0, withAlpha(theme.bgFrom, 0.94));
  scrim.addColorStop(0.24, withAlpha(theme.bgFrom, 0.3));
  scrim.addColorStop(0.52, withAlpha(theme.bgFrom, 0.42));
  scrim.addColorStop(0.86, withAlpha(theme.bgFrom, 0.96));
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  const pad = W * 0.075;
  drawGlobalLockup(ctx, scene.logo, { W, H, theme, baseSize: W * 0.07, pad, topBand: top + H * 0.02 - W * 0.07 * 0.3, bottomBand: H - bottom + H * 0.05 });

  // The copy block is laid out top-down inside a band that ends where the CTA
  // begins, and the headline steps down until the whole block fits. Nothing is
  // clamped on top of anything else — the earlier version pinned the CTA to a
  // fixed height and ran the body straight through it.
  const ctaSize = W * 0.036;
  const ctaHeight = ctaSize * 2.3;
  const footerBaseline = bottom - H * 0.058;
  const ctaTop = footerBaseline - H * 0.035 - ctaHeight;
  const blockTop = top + H * 0.155;
  const blockBottom = (content.cta.trim() ? ctaTop : footerBaseline) - H * 0.045;

  const bodyFont = (size: number) => fonts.sans(size, 400);
  const body = content.subline.trim()
    ? fitLines(ctx, content.subline, W * 0.78, 3, bodyFont, W * 0.034, W * 0.031, true)
    : { size: W * 0.034, lines: [] as string[], truncated: false };
  const tamil = content.tamil.trim()
    ? fitLines(ctx, content.tamil, W * 0.78, 2, (size) => fonts.script(size), W * 0.04, W * 0.026)
    : { size: W * 0.026, lines: [] as string[], truncated: false };

  // The block is measured with the same per-line advances it is painted with.
  // A flat `lines * size * 1.08` estimate is a Latin estimate: a Tamil headline
  // line is 1.46 em tall, so the estimate said "fits" while the last line was
  // already sitting on the block below it.
  const blockFor = (size: number) => {
    ctx.save();
    ctx.font = fonts.display(size, 600);
    const lines = wrapAll(ctx, content.headline, W - pad * 2);
    ctx.restore();
    const hops = lines.map((line) => lineHop(size, 1.08, line));
    const tamilHops = tamil.lines.map((line) => lineHop(tamil.size, 1.35, line));
    const bodyHops = body.lines.map((line) => lineHop(body.size, 1.42, line));
    const height =
      hops.reduce((sum, hop) => sum + hop, 0) +
      (tamil.lines.length ? H * 0.012 + tamilHops.reduce((sum, hop) => sum + hop, 0) : 0) +
      (body.lines.length ? H * 0.035 + bodyHops.reduce((sum, hop) => sum + hop, 0) : 0);
    return { size, lines, hops, height };
  };
  let plan = blockFor(W * 0.093);
  while (plan.height > blockBottom - blockTop && plan.size > W * 0.052) {
    plan = blockFor(plan.size - Math.max(1, Math.round(W * 0.0024)));
  }

  let y = blockTop;
  plan.lines.forEach((line, index) => {
    drawText(scene, "headline", line, W / 2, y, fonts.display(plan.size, 600), withAlpha(theme.ink, 0.98), { align: "center" });
    y += plan.hops[index];
  });
  if (tamil.lines.length) {
    y += H * 0.012;
    tamil.lines.forEach((line) => {
      drawText(scene, "body", line, W / 2, y, fonts.script(tamil.size), accent(theme), { align: "center" });
      y += lineHop(tamil.size, 1.35, line);
    });
  }
  if (body.lines.length) {
    y += H * 0.035;
    body.lines.forEach((line) => {
      drawText(scene, "body", line, W / 2, y, bodyFont(body.size), withAlpha(theme.ink, 0.86), { align: "center" });
      y += lineHop(body.size, 1.42, line);
    });
  }

  // CTA sits above the reply bar — the single most common story mistake.
  if (content.cta.trim()) {
    drawCta(ctx, { x: W / 2, y: ctaTop, align: "center", theme, label: content.cta, variant: "pill", size: ctaSize });
    scene.log.add("cta", ctaSize, content.cta);
  }
  // Sticker slot: marked in the editor, empty in the export.
  if (scene.showSafeArea) {
    ctx.save();
    ctx.setLineDash([W * 0.02, W * 0.016]);
    ctx.strokeStyle = "rgba(120,220,190,0.8)";
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeRect(pad, bottom - H * 0.045, W - pad * 2, H * 0.036);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "rgba(120,220,190,0.85)";
    ctx.font = fonts.sans(26, 600);
    ctx.textAlign = "center";
    ctx.fillText("link / poll sticker goes here", W / 2, bottom - H * 0.055);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, 0, W, top);
    ctx.fillRect(0, bottom + H * 0.002, W, H - bottom);
    ctx.restore();
  }
  // The reply bar owns the bottom 340 px: the footer sits above the sticker
  // slot, which sits above the bar. Nothing readable is ever under UI.
  drawContactLine(ctx, W, H, theme, { y: bottom - H * 0.024, size: W * 0.02 });
}

/* ------------------------------ 6 · reel cover ---------------------------- */

function igReelCover(scene: Scene) {
  const { ctx, W, H, theme, content, fonts } = scene;
  const meta = IG_LAYOUT_MAP["ig-reel-cover"];
  const safe = meta.safeArea!;
  const cropTop = safe.y;
  const cropBottom = safe.y + safe.h;

  if (scene.art) {
    drawImageIn(ctx, scene.art, { x: 0, y: 0, w: W, h: H }, { inset: 0, focusY: 0.28, vignette: 0.36, grade: theme.bgFrom, gradeAlpha: 0.26 });
  } else {
    paintGround(scene, { angle: "vertical", glowX: 0.5, glowY: 0.42, glow: 0.24 });
  }
  // Darken outside the grid crop so the editor can see what survives at 124 px.
  const scrim = ctx.createLinearGradient(0, cropTop, 0, cropBottom);
  scrim.addColorStop(0, withAlpha(theme.bgFrom, 0.86));
  scrim.addColorStop(0.5, withAlpha(theme.bgFrom, 0.52));
  scrim.addColorStop(1, withAlpha(theme.bgFrom, 0.9));
  ctx.fillStyle = scrim;
  ctx.fillRect(0, cropTop, W, cropBottom - cropTop);
  ctx.fillStyle = withAlpha(theme.bgFrom, 0.82);
  ctx.fillRect(0, 0, W, cropTop);
  ctx.fillRect(0, cropBottom, W, H - cropBottom);

  // Everything readable is inside the 1:1 crop, because that is the thumbnail.
  const pad = W * 0.075;
  drawGlobalLockup(ctx, scene.logo, { W, H, theme, baseSize: W * 0.08, pad, topBand: cropTop + W * 0.05 - W * 0.08 * 0.3, bottomBand: H - cropTop - W + W * 0.05 });
  drawContactLine(ctx, W, H, theme, { y: cropTop + W - W * 0.05, size: W * 0.021 });
  const reelKicker = content.kicker.toUpperCase();
  const reelKickerSize = fitLine(ctx, reelKicker, W * 0.88, W * 0.082, W * 0.044, (size) => fonts.sans(size, 700), W * 0.006);
  drawText(scene, "kicker", reelKicker, W / 2, cropTop + W * 0.2, fonts.sans(reelKickerSize, 700), accent(theme), {
    align: "center",
    tracking: W * 0.006,
  });

  const head = fitLines(ctx, content.headline, W * 0.84, 3, (size) => fonts.display(size, 700), W * 0.155, W * 0.1);
  const blockH = head.lines.reduce((sum, line) => sum + lineHop(head.size, 1.02, line), 0);
  let y = cropTop + safe.h / 2 - blockH / 2 + W * 0.06;
  head.lines.forEach((line) => {
    drawText(scene, "headline", line, W / 2, y, fonts.display(head.size, 700), withAlpha(theme.ink, 0.99), { align: "center" });
    y += lineHop(head.size, 1.02, line);
  });

  hairline(ctx, W / 2 - W * 0.12, y + W * 0.03, W / 2 + W * 0.12, withAlpha(theme.gold, 0.7), Math.max(2, W * 0.003));
  if (content.cta.trim()) {
    // At 124 px in the grid the CTA has to be huge — and still fit 1080 px wide.
    const ctaY = Math.min(y + W * 0.055, cropBottom - W * 0.1 * 1.5);
    coverCta(scene, content.cta.toUpperCase(), ctaY, W * 0.1, W * 0.062, W * 0.004, withAlpha(theme.ink, 0.9));
  }

  if (scene.showSafeArea) {
    ctx.save();
    ctx.setLineDash([W * 0.02, W * 0.016]);
    ctx.strokeStyle = "rgba(120,220,190,0.8)";
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeRect(0, cropTop, W, safe.h);
    ctx.restore();
  }
}

/* ----------------------------- 7 · highlight seal ------------------------- */

function igHighlight(scene: Scene) {
  const { ctx, W, H, content } = scene;
  const plan = IG_HIGHLIGHTS.find((entry) => entry.glyph === content.glyph) ?? IG_HIGHLIGHTS[0];
  renderHighlightSeal(ctx, W, H, plan);
}

/* -------------------------------- renderer -------------------------------- */

const PAINTERS: Record<IgLayout, (scene: Scene) => void> = {
  "ig-service": igService,
  "ig-education": igEducation,
  "ig-quote": igQuote,
  "ig-carousel-cover": igCarouselCover,
  "ig-story": igStory,
  "ig-reel-cover": igReelCover,
  "ig-highlight": igHighlight,
};

export async function renderIgCreative(input: IgCreativeInput): Promise<IgRender> {
  const out = await renderSocialCreative({
    input,
    layouts: IG_LAYOUT_MAP,
    fallback: "ig-service",
    painters: PAINTERS,
    paintSafeArea: (ctx, meta) => paintIgSafeArea(ctx, IG_LAYOUT_MAP[meta.key]),
  });
  return { canvas: out.canvas, layout: IG_LAYOUT_MAP[out.layout.key], typography: out.typography };
}

/** Editor-only guides: UI bands, the grid crop, the safe circle. */
const paintIgSafeArea = (ctx: CanvasRenderingContext2D, meta: IgLayoutMeta) => {
  if (meta.uiZones) {
    ctx.fillStyle = "rgba(8,6,7,0.55)";
    ctx.fillRect(0, 0, meta.width, meta.uiZones.top);
    ctx.fillRect(0, meta.height - meta.uiZones.bottom, meta.width, meta.uiZones.bottom);
    ctx.setLineDash([meta.width * 0.014, meta.width * 0.01]);
    ctx.strokeStyle = "rgba(120,220,190,0.7)";
    ctx.lineWidth = Math.max(2, meta.width * 0.0022);
    ctx.beginPath();
    ctx.moveTo(0, meta.uiZones.top);
    ctx.lineTo(meta.width, meta.uiZones.top);
    ctx.moveTo(0, meta.height - meta.uiZones.bottom);
    ctx.lineTo(meta.width, meta.height - meta.uiZones.bottom);
    ctx.stroke();
  }
  if (meta.safeArea && (meta.crop === "circle" || meta.key === "ig-reel-cover")) {
    ctx.setLineDash([meta.width * 0.014, meta.width * 0.01]);
    ctx.strokeStyle = "rgba(120,220,190,0.7)";
    ctx.lineWidth = Math.max(2, meta.width * 0.0022);
    if (meta.crop === "circle") {
      ctx.beginPath();
      ctx.arc(meta.width / 2, meta.height / 2, meta.safeArea.w / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(meta.safeArea.x, meta.safeArea.y, meta.safeArea.w, meta.safeArea.h);
    }
  }
};

/** Re-exported so the suite can audit without importing the shared module twice. */
export { auditLegibility, LEGIBILITY_MINIMUMS };
export type { TypedDraw, TypeRole };
