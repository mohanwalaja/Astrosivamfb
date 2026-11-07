import type { DisplayFontKey, ScriptFontKey, ThemeKey } from "../types";
import { englishText } from "./englishCopy";
import { BRAND } from "../data/brand";
import { drawMotif, ensureFonts, hasGlyph, loadImageSource, loadLogo } from "./canvas";
import { TypeLog, type TypedDraw, type TypeRole } from "./legibility";
import {
  accent,
  drawDiya,
  drawDoubleFrame,
  drawImageIn,
  drawKolamBase,
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
  tracked,
  withAlpha,
} from "./posterKit";
import { fitLines, fitSize, fontPx } from "./typeset";
import { drawBrandLockup, type BrandOrientation } from "./brandLockup";
import { brandSpot, drawGlobalLockup, getBrandPlacement } from "./brandPlacement";

/* ==========================================================================
   Festival greeting cards
   ==========================================================================
   Four registers of tasteful — traditional, minimal, luxury, contemporary —
   each a different composition and a different grid, not a different tint.
   Every register adapts to the four shapes the studio exports (4:5 feed,
   square, 9:16 story, Facebook post) and obeys the same rules:

   — The greeting is the headline. It leads in the language the reader picked;
     the other two languages sit beneath at a size that still reads on a phone.
   — A date is printed only when the verified calendar holds one. Otherwise the
     card prints the festival's traditional rule and says the date awaits the
     panchang. It never composes, guesses or pads a date.
   — Every string arrives from the data layer. The painter lays type out; it
     does not write copy.
   ========================================================================== */

export type FestivalStyle =
  | "traditional"
  | "sanctum"
  | "editorial-full"
  | "mandala-radial"
  | "luxury"
  | "tanjore-heirloom"
  | "minimal"
  | "contemporary";

export type PictureShape = "default" | "arch" | "circle" | "oval" | "sanctum" | "bleed" | "square";
export type PictureTreatment = "natural" | "divine-aura" | "temple-glow" | "antique-gold";

export interface PictureSettings {
  shape?: PictureShape;
  scale?: number;
  focusY?: number;
  treatment?: PictureTreatment;
  beadedBorder?: boolean;
  showAura?: boolean;
}
export type CardLanguage = "en" | "ta" | "hi" | "trilingual";
export type LogoPlacement = "plaque" | "wordmark" | "corner" | "service-top-right" | "custom" | "none";
export type CardFormat = "ig-post" | "ig-square" | "ig-story" | "fb-post";

export interface BrandLockupSettings {
  orientation: BrandOrientation;
  /** Multiplier for the original square logo; it is never cropped or stretched. */
  markScale: number;
  textScale: number;
  /** Relative canvas offsets; safe, bounded movement from the style's anchor. */
  offsetX: number;
  offsetY: number;
  /** Anchor coordinates used only for Custom placement, in percent of the canvas. */
  customX: number;
  customY: number;
  name: string;
}

export const DEFAULT_BRAND_LOCKUP: BrandLockupSettings = {
  orientation: "horizontal",
  markScale: 1,
  textScale: 1,
  offsetX: 0,
  offsetY: 0,
  customX: 86,
  customY: 9,
  name: "ASTRO SIVAM",
};

export interface CardFormatMeta {
  key: CardFormat;
  name: string;
  width: number;
  height: number;
  ratio: string;
  /** Width the card is really seen at in the feed, in CSS px. */
  mobileWidth: number;
  /** Canvas px visible at that size (a story loses its edges to chrome). */
  auditWidth: number;
  cropNote: string;
  /** Story chrome, in canvas px, that the platform draws over the art. */
  uiZones?: { top: number; bottom: number };
}

export const CARD_FORMATS: CardFormatMeta[] = [
  {
    key: "ig-post",
    name: "Instagram · 4:5",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    mobileWidth: 360,
    auditWidth: 1080,
    cropNote: "The feed shows 4:5 uncropped; a square preview crops the middle band.",
  },
  {
    key: "ig-square",
    name: "Square · 1:1",
    width: 1080,
    height: 1080,
    ratio: "1:1",
    mobileWidth: 360,
    auditWidth: 1080,
    cropNote: "Never cropped — the safe choice for the profile grid.",
  },
  {
    key: "ig-story",
    name: "Story / Reel · 9:16",
    width: 1080,
    height: 1920,
    ratio: "9:16",
    mobileWidth: 390,
    auditWidth: 1080,
    cropNote: "Top 250 px and bottom 340 px carry platform chrome — type stays out.",
    uiZones: { top: 250, bottom: 340 },
  },
  {
    key: "fb-post",
    name: "Facebook · 4:5",
    width: 1200,
    height: 1500,
    ratio: "4:5",
    mobileWidth: 360,
    auditWidth: 1200,
    cropNote: "Facebook shows 4:5 in feed; a link preview crops to 1.91:1.",
  },
];

export const CARD_FORMAT_MAP = Object.fromEntries(CARD_FORMATS.map((item) => [item.key, item])) as Record<
  CardFormat,
  CardFormatMeta
>;

export interface CardStyleMeta {
  key: FestivalStyle;
  name: string;
  purpose: string;
  bestFor: string;
  defaultTheme: ThemeKey;
  defaultDisplay: DisplayFontKey;
  defaultScript: ScriptFontKey;
  defaultLogo: LogoPlacement;
}

export const CARD_STYLES: CardStyleMeta[] = [
  {
    key: "traditional",
    name: "Traditional",
    purpose: "A mango-leaf toran, an arched portrait, the date on a gold seal, diyas at the foot.",
    bestFor: "Temple festivals, Pongal, Deepavali, family and community groups.",
    defaultTheme: "kumkum",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "plaque",
  },
  {
    key: "sanctum",
    name: "Temple Sanctum",
    purpose: "Shrine mandapam, carved pilasters, kalasam crest, and twin brass vilakku lamps.",
    bestFor: "Grand temple utsavams, Pradosham, Brahmotsavam, Deepavali, Thai Poosam.",
    defaultTheme: "kumkum",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "plaque",
  },
  {
    key: "editorial-full",
    name: "Full Devotional Bleed",
    purpose: "High-impact bleed portrait with celestial gradient veil, starlight, and modern editorial type.",
    bestFor: "Instagram reels, high-reach feed heroes, immersive devotional posters.",
    defaultTheme: "midnight",
    defaultDisplay: "cinzel",
    defaultScript: "bold",
    defaultLogo: "service-top-right",
  },
  {
    key: "mandala-radial",
    name: "Sacred Mandala",
    purpose: "Concentric 32-petal gold filigree mandala framing a large circular sacred portrait.",
    bestFor: "Guru Purnima, Navaratri, Maha Shivaratri, solar Sankranti festivals.",
    defaultTheme: "saffron",
    defaultDisplay: "marcellus",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "luxury",
    name: "Luxury Cameo",
    purpose: "Double gold frame, portrait in an oval medallion, date engraved on a plate.",
    bestFor: "Invitations, New Year, anything that should read as an heirloom.",
    defaultTheme: "midnight",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "tanjore-heirloom",
    name: "Tanjore Gold Leaf",
    purpose: "Embossed 24k gold leaf repoussé borders, corner rosettes, sacred velvet ground.",
    bestFor: "Varalakshmi Vratham, Janmashtami, Rama Navami, heirloom family wishes.",
    defaultTheme: "kumkum",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "minimal",
    name: "Minimal",
    purpose: "Mostly ground, one gold rule, the greeting set left like a letter.",
    bestFor: "A series where the words carry the day, and quiet weekdays.",
    defaultTheme: "ivory",
    defaultDisplay: "marcellus",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "contemporary",
    name: "Contemporary",
    purpose: "A hard colour block, a big sans greeting, art cropped into a window.",
    bestFor: "Younger audiences, reels, weekdays that need reach.",
    defaultTheme: "sand",
    defaultDisplay: "jakarta",
    defaultScript: "bold",
    defaultLogo: "corner",
  },
];

export const CARD_STYLE_MAP = Object.fromEntries(CARD_STYLES.map((item) => [item.key, item])) as Record<
  FestivalStyle,
  CardStyleMeta
>;

export const CARD_PALETTES: Array<{ key: ThemeKey; label: string }> = [
  { key: "kumkum", label: "Kumkum" },
  { key: "saffron", label: "Saffron" },
  { key: "sand", label: "Sand" },
  { key: "ivory", label: "Ivory" },
  { key: "midnight", label: "Midnight gold" },
  { key: "granite", label: "Granite" },
  { key: "jade", label: "Jade" },
  { key: "forest", label: "Forest" },
  { key: "ink", label: "Ink" },
  { key: "dawn", label: "Dawn" },
];

export const CARD_TYPE = {
  display: [
    { key: "cinzel" as DisplayFontKey, label: "Cinzel", note: "Engraved Roman caps — the brand default" },
    { key: "marcellus" as DisplayFontKey, label: "Marcellus", note: "Softer classical serif, devotional" },
    { key: "baloo" as DisplayFontKey, label: "Baloo Thambi", note: "Rounded, pairs naturally with Tamil" },
    { key: "jakarta" as DisplayFontKey, label: "Plus Jakarta", note: "Modern sans, editorial" },
  ],
  script: [
    { key: "classic" as ScriptFontKey, label: "Tiro Tamil", note: "Text-weight Tamil, Noto Devanagari" },
    { key: "rounded" as ScriptFontKey, label: "Baloo Tamil", note: "Rounder Tamil, Noto Devanagari" },
    { key: "bold" as ScriptFontKey, label: "Baloo + Yatra One", note: "Display-weight Tamil and Hindi" },
  ],
};

export const CARD_LANGUAGES: Array<{ key: CardLanguage; label: string; note: string }> = [
  { key: "en", label: "English", note: "English greeting leads" },
  { key: "ta", label: "தமிழ்", note: "Tamil greeting leads" },
  { key: "hi", label: "हिंदी", note: "Hindi greeting leads" },
  { key: "trilingual", label: "All three", note: "English leads, Tamil and Hindi beneath" },
];

export interface FestivalCopyBlock {
  /** Display name in each language, from the festival record or the editor. */
  name: { en: string; ta: string; hi: string };
  greeting: { en: string; ta: string; hi: string };
  /** One line of context under the greeting, already written in the data layer. */
  subline: string;
  /** Verified civil date, formatted for display. Never composed in the painter. */
  dateLabel: string | null;
  /** "Thai Pongal" / "Soorasamharam" — the day inside a multi-day festival. */
  dateNote: string | null;
  /** Provisional dates are labelled, never hidden. */
  provisional: boolean;
  /** The festival's own traditional rule, shown when there is no civil date. */
  traditional: string;
  footer: string;
  site: string;
}

export interface FestivalCardInput {
  style: FestivalStyle;
  format: CardFormat;
  theme: ThemeKey;
  display: DisplayFontKey;
  script: ScriptFontKey;
  logo: LogoPlacement;
  language: CardLanguage;
  copy: FestivalCopyBlock;
  /** Image path (bundled deity art or an uploaded photo); null draws the motif. */
  art: string | null;
  /** Motif drawn when there is no image. */
  motif?: Parameters<typeof drawMotif>[1];
  /** Editable wordmark arrangement and position, shared by preview and exports. */
  brandLockup?: BrandLockupSettings;
  /** Controls for picture shape, scale, focus, aura, and artistic treatment. */
  pictureSettings?: PictureSettings;
  /** Show the platform's safe-area guides (editor only, never exported). */
  showSafeArea?: boolean;
  scale?: number;
}

export interface FestivalCardRender {
  canvas: HTMLCanvasElement;
  format: CardFormatMeta;
  style: CardStyleMeta;
  typography: TypedDraw[];
  /** Short human-readable notes for the editor, e.g. a missing glyph. */
  warnings: string[];
}

/* -------------------------------- helpers -------------------------------- */

interface Scene {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  format: CardFormatMeta;
  theme: ReturnType<typeof themeFor>;
  fonts: ReturnType<typeof fontsFor>;
  display: (size: number, weight?: number) => string;
  log: TypeLog;
  copy: FestivalCopyBlock;
  language: CardLanguage;
  art: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  motif: Parameters<typeof drawMotif>[1];
  logoPlacement: LogoPlacement;
  brandLockup: BrandLockupSettings;
  pictureSettings?: PictureSettings;
}

const TAMIL = /[\u0B80-\u0BFF]/;
const DEVA = /[\u0900-\u097F]/;

/** The face a line of copy should be set in, decided by its own script. */
const faceFor = (scene: Scene, text: string, size: number, weight = 500): string => {
  if (TAMIL.test(text)) return scene.fonts.script(size);
  if (DEVA.test(text)) return scene.fonts.hindi(size);
  return scene.fonts.sans(size, weight);
};

/** Shared type scale, as a fraction of the card width. */
const TYPE = {
  display: 0.056,
  displayStory: 0.055,
  script: 0.0345,
  body: 0.0335,
  kicker: 0.029,
  footer: 0.0245,
  cta: 0.0345,
};

const paintText = (
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
  // Letter-spacing is drawn glyph by glyph, which shatters Tamil and Devanagari
  // clusters into base letters plus dotted circles. Script text is never tracked.
  const indic = /[\u0900-\u097F\u0B80-\u0BFF]/.test(text);
  if (options.tracking && !indic) tracked(ctx, text, x, y, options.tracking, options.align ?? "left");
  else ctx.fillText(text, x, y, options.maxWidth);
  ctx.restore();
  scene.log.add(role, fontPx(font), text);
};

/** The greeting lines, in the reader's order, before fitting. */
function greetingItems(scene: Scene): Array<{ text: string; size: number; role: TypeRole }> {
  const W = scene.W;
  const lead = W * (scene.format.key === "ig-story" ? TYPE.displayStory : TYPE.display);
  const other = W * TYPE.script;
  const { greeting } = scene.copy;
  // English mode is English-only. Tamil and Hindi have their own modes, and
  // trilingual deliberately shows all three.
  if (scene.language === "en") {
    return [{ text: greeting.en, size: lead, role: "headline" }];
  }
  if (scene.language === "trilingual") {
    return [
      { text: greeting.en, size: lead * 0.92, role: "headline" },
      { text: greeting.ta, size: other, role: "body" },
      { text: greeting.hi, size: other, role: "body" },
    ];
  }
  const order =
    scene.language === "ta"
      ? [greeting.ta, greeting.en, greeting.hi]
      : scene.language === "hi"
        ? [greeting.hi, greeting.en, greeting.ta]
        : [greeting.en, greeting.ta, greeting.hi];
  return [
    { text: order[0], size: lead, role: "headline" },
    { text: order[1], size: other, role: "body" },
    { text: order[2], size: other, role: "body" },
  ];
}

interface GreetingItem {
  text: string;
  role: TypeRole;
  size: number;
  font: string;
  lines: string[];
}

interface GreetingPlan {
  items: GreetingItem[];
  height: number;
}

/**
 * Fits the greeting into a column *and* a vertical budget. The size steps down
 * until the three scripts clear the space reserved for the date, rather than
 * letting a long Tamil greeting push the date off the card.
 */
function planGreeting(scene: Scene, width: number, maxHeight = Infinity): GreetingPlan {
  const W = scene.W;
  const build = (factor: number): GreetingPlan => {
    const items = greetingItems(scene).map((line): GreetingItem => {
      if (!line.text.trim()) return { ...line, font: faceFor(scene, line.text, line.size), lines: [] };
      const family = (size: number) => faceFor(scene, line.text, size);
      const floor = line.role === "headline" ? W * 0.0445 : W * 0.0308;
      // Never step below the legibility floor: shrinking past it is not a fix.
      const fitted = fitLines(scene.ctx, line.text, width, 2, family, Math.max(line.size * factor, floor), floor);
      return { text: line.text, role: line.role, size: fitted.size, font: family(fitted.size), lines: fitted.lines };
    });
    let height = 0;
    items.forEach((item, index) => {
      if (!item.lines.length) return;
      if (height > 0) height += item.size * (index === 1 ? 0.55 : 0.28);
      height += item.lines.length * item.size * 1.22;
    });
    return { items, height };
  };
  let last = build(1);
  for (const factor of [1, 0.95, 0.9, 0.84, 0.78, 0.72, 0.66]) {
    last = build(factor);
    if (last.height <= maxHeight) return last;
  }
  return last;
}

/** Draws a planned greeting. Returns the y below the last line. */
function paintGreetingPlan(scene: Scene, plan: GreetingPlan, x: number, y: number, color: string, align: CanvasTextAlign): number {
  let cursor = y;
  plan.items.forEach((item, index) => {
    if (!item.lines.length) return;
    if (cursor > y) cursor += item.size * (index === 1 ? 0.55 : 0.28);
    item.lines.forEach((text, i) => {
      paintText(scene, item.role, text, x, cursor + i * item.size * 1.22, item.font, color, { align });
    });
    cursor += item.lines.length * item.size * 1.22;
  });
  return cursor;
}

/** Fits, then draws. `maxBottom` is the y the greeting may not cross. */
function paintGreeting(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  color: string,
  options: { align?: CanvasTextAlign; maxBottom?: number } = {},
): number {
  const maxHeight = options.maxBottom ? Math.max(scene.W * 0.09, options.maxBottom - y) : Infinity;
  const plan = planGreeting(scene, width, maxHeight);
  return paintGreetingPlan(scene, plan, x, y, color, options.align ?? "left");
}

/** Kicker text that measures first, so a long Tamil name cannot run into art. */
const paintKicker = (
  scene: Scene,
  text: string,
  options: { x: number; y: number; width: number; align?: CanvasTextAlign; color?: string; size?: number; tracking?: number },
) => {
  const size = options.size ?? scene.W * TYPE.kicker;
  const tracking = options.tracking ?? scene.W * 0.006;
  // Tracking is added after the glyphs, so it has to be paid for up front.
  const spare = tracking * Math.max(0, Array.from(text).length - 1);
  const fitted = fitSize(scene.ctx, text, Math.max(size * 2, options.width - spare), size, scene.W * 0.021, (value) =>
    faceFor(scene, text, value, 600),
  );
  paintText(scene, "kicker", text, options.x, options.y, faceFor(scene, text, fitted, 600), options.color ?? accent(scene.theme), {
    align: options.align,
    tracking,
  });
};

const nameFor = (scene: Scene) => {
  const { name } = scene.copy;
  if (scene.language === "ta") return name.ta || name.en;
  if (scene.language === "hi") return name.hi || name.en;
  return name.en;
};

/** Verified date, or an honest stand-in. Nothing is composed beyond that. */
const dateLines = (scene: Scene) => {
  const { dateLabel, dateNote, provisional, traditional } = scene.copy;
  if (!dateLabel) return { primary: "DATE AWAITS THE PANCHANG", secondary: traditional };
  const secondary = [dateNote, provisional ? "provisional · confirm on the panchang" : null].filter(Boolean).join(" · ");
  return { primary: dateLabel, secondary };
};

const paintSubline = (
  scene: Scene,
  x: number,
  y: number,
  width: number,
  color: string,
  options: { align?: CanvasTextAlign; maxLines?: number; maxBottom?: number } = {},
) => {
  if (!scene.copy.subline.trim()) return y;
  const align = options.align ?? "left";
  const size = scene.W * TYPE.body;
  const lineH = size * 1.4;
  let budget = options.maxLines ?? 2;
  if (options.maxBottom !== undefined) {
    budget = Math.min(budget, Math.floor((options.maxBottom - y) / lineH));
  }
  if (budget < 1) return y;
  const family = (value: number) => faceFor(scene, scene.copy.subline, value, 400);
  const fitted = fitLines(scene.ctx, scene.copy.subline, width, budget, family, size, scene.W * 0.0308, true);
  fitted.lines.forEach((text, i) => {
    paintText(scene, "body", text, x, y + i * fitted.size * 1.4, family(fitted.size), color, { align });
  });
  return y + fitted.lines.length * fitted.size * 1.4;
};

/** Full date on a rule-flanked band — used by the traditional grid. */
const paintDateBand = (scene: Scene, x: number, y: number, width: number) => {
  const { ctx, theme, W } = scene;
  const { primary, secondary } = dateLines(scene);
  const size = W * TYPE.kicker;
  const fitted = fitSize(ctx, primary, width * 0.6, size, W * 0.022, (value) => scene.display(value, 600));
  paintText(scene, "kicker", primary, x + width / 2, y, scene.display(fitted, 600), withAlpha(accent(theme), 0.98), {
    align: "center",
    tracking: W * 0.0045,
  });
  const ruleY = y + fitted * 0.55;
  const ruleLen = W * 0.07;
  const gap = W * 0.012;
  hairline(ctx, x + gap, ruleY, x + gap + ruleLen, withAlpha(theme.gold, 0.5), Math.max(1, W * 0.0014));
  hairline(ctx, x + width - gap - ruleLen, ruleY, x + width - gap, withAlpha(theme.gold, 0.5), Math.max(1, W * 0.0014));
  let end = y + fitted * 1.35;
  if (secondary) {
    const lines = fitLines(ctx, secondary, width * 0.86, 2, (value) => scene.fonts.sans(value, 500), W * TYPE.footer, W * 0.0225, true);
    lines.lines.forEach((text, i) => {
      paintText(scene, "footer", text, x + width / 2, end + i * lines.size * 1.4, scene.fonts.sans(lines.size, 500), withAlpha(theme.ink, 0.66), {
        align: "center",
      });
    });
    end += lines.lines.length * lines.size * 1.4;
  }
  return end;
};

/** Paint the style-selected logo, with the same editable lockup used in preview and export. */
const paintLogo = (
  scene: Scene,
  placement: LogoPlacement,
  at: { x: number; y: number; size: number; align?: "left" | "center" | "right"; topOffset?: number },
) => {
  if (placement === "none" || placement === "service-top-right" || placement === "custom") return;
  const { ctx, theme, logo, W, H, format, brandLockup } = scene;
  // The studio-wide placement setting decides the corner and size. Styles with
  // a toran pass a topOffset so the lockup sits below the hanging garland.
  const uiTop = format.uiZones?.top ?? 0;
  const uiBottom = format.uiZones?.bottom ?? 0;
  const pad = W * 0.07 + brandLockup.offsetX * W;
  const topBand = uiTop + H * (at.topOffset ?? 0.042) + brandLockup.offsetY * H;
  const bottomBand = uiBottom + H * 0.1;
  const mark = at.size * brandLockup.markScale;
  if (placement === "wordmark") {
    const size = mark * getBrandPlacement().scale;
    const spot = brandSpot(W, H, size, { pad, topBand: topBand - mark * 0.3, bottomBand });
    drawBrandLockup(ctx, logo, {
      x: spot.x,
      y: spot.y + size / 2,
      markSize: size,
      textSize: W * TYPE.footer * brandLockup.textScale,
      orientation: brandLockup.orientation,
      align: spot.align,
      name: brandLockup.name,
      font: scene.display(W * TYPE.footer * brandLockup.textScale, 600),
      theme,
    });
    scene.log.add("footer", W * TYPE.footer * brandLockup.textScale, brandLockup.name);
    return;
  }
  drawGlobalLockup(ctx, logo, { W, H, theme, baseSize: mark, pad, topBand: topBand - mark * 0.3, bottomBand, opacity: 0.94 });
};

const paintSite = (scene: Scene, _x?: number, y?: number, _align: CanvasTextAlign = "left") => {
  // Single centered contact line across all festival cards: astrosivam.com
  const lineY = y ?? scene.H - scene.H * 0.038;
  paintText(
    scene,
    "footer",
    BRAND.website,
    scene.W / 2,
    lineY,
    scene.fonts.sans(scene.W * TYPE.footer, 500),
    withAlpha(accent(scene.theme), 0.94),
    {
      align: "center",
      tracking: scene.W * 0.002,
    },
  );
};

const paintFooterLine = (_scene: Scene, _color?: string, _footBase?: number) => {
  // Completely no-op: prevents duplicate footer line from being painted.
};

const drawArt = (
  scene: Scene,
  box: { x: number; y: number; w: number; h: number },
  defaultShape: "arch" | "circle" | "square" | "full",
) => {
  const { ctx, theme } = scene;
  const pSettings = scene.pictureSettings;
  const scale = pSettings?.scale ?? 1;
  const focusY = pSettings?.focusY ?? 0.34;

  // Center-scaled dimensions
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const bw = box.w * scale;
  const bh = box.h * scale;
  const bx = cx - bw / 2;
  const by = cy - bh / 2;
  const effectiveBox = { x: bx, y: by, w: bw, h: bh };

  // Resolve user shape override
  let shape: "arch" | "circle" | "square" | "full" = defaultShape;
  if (pSettings?.shape && pSettings.shape !== "default") {
    if (pSettings.shape === "arch") shape = "arch";
    else if (pSettings.shape === "circle" || pSettings.shape === "oval") shape = "circle";
    else if (pSettings.shape === "square" || pSettings.shape === "sanctum") shape = "square";
    else if (pSettings.shape === "bleed") shape = "square";
  }

  // 1. Radiant Solar Aura / Halo Behind Picture
  if (pSettings?.showAura || pSettings?.treatment === "divine-aura") {
    ctx.save();
    const haloRadius = Math.max(bw, bh) * 0.68;
    const auraGrad = ctx.createRadialGradient(cx, cy, Math.min(bw, bh) * 0.22, cx, cy, haloRadius);
    auraGrad.addColorStop(0, "rgba(255, 235, 120, 0.42)");
    auraGrad.addColorStop(0.5, "rgba(255, 185, 45, 0.18)");
    auraGrad.addColorStop(1, "rgba(255, 140, 20, 0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // 24 Radiant gold solar rays
    ctx.strokeStyle = withAlpha(theme.gold, 0.45);
    ctx.lineWidth = Math.max(1, scene.W * 0.0012);
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const r1 = Math.min(bw, bh) * 0.46;
      const r2 = haloRadius * (i % 2 === 0 ? 0.96 : 0.82);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (scene.art) {
    const isAntique = pSettings?.treatment === "antique-gold";
    drawImageIn(ctx, scene.art, effectiveBox, {
      inset: 0,
      shape,
      focusY,
      vignette: pSettings?.treatment === "temple-glow" ? 0.28 : 0.18,
      grade: isAntique ? "#D49B28" : undefined,
      gradeAlpha: isAntique ? 0.18 : 0,
      outline: withAlpha(theme.gold, 0.78),
      outlineWidth: Math.max(1.8, scene.W * 0.002),
    });

    // 2. Beaded Gold / Pearl Rim
    if (pSettings?.beadedBorder) {
      ctx.save();
      const beadCount = 38;
      for (let i = 0; i < beadCount; i += 1) {
        const t = i / beadCount;
        let px = cx;
        let py = cy;
        if (shape === "circle") {
          const a = t * Math.PI * 2;
          px = cx + Math.cos(a) * (bw / 2 + 3.2);
          py = cy + Math.sin(a) * (bh / 2 + 3.2);
        } else if (shape === "arch") {
          const r = bw / 2;
          if (t < 0.5) {
            const a = Math.PI + (t / 0.5) * Math.PI;
            px = bx + r + Math.cos(a) * (r + 3.2);
            py = by + r + Math.sin(a) * (r + 3.2);
          } else {
            const legT = (t - 0.5) / 0.5;
            if (legT < 0.4) {
              px = bx + bw + 3.2;
              py = by + r + (legT / 0.4) * (bh - r);
            } else if (legT < 0.6) {
              const bT = (legT - 0.4) / 0.2;
              px = bx + bw - bT * bw;
              py = by + bh + 3.2;
            } else {
              const lT = (legT - 0.6) / 0.4;
              px = bx - 3.2;
              py = by + bh - lT * (bh - r);
            }
          }
        } else {
          const peri = (bw + bh) * 2;
          const pos = t * peri;
          if (pos < bw) { px = bx + pos; py = by - 3.2; }
          else if (pos < bw + bh) { px = bx + bw + 3.2; py = by + (pos - bw); }
          else if (pos < bw * 2 + bh) { px = bx + bw - (pos - (bw + bh)); py = by + bh + 3.2; }
          else { px = bx - 3.2; py = by + bh - (pos - (bw * 2 + bh)); }
        }
        ctx.fillStyle = i % 2 === 0 ? "#FFFDE7" : theme.gold;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, scene.W * 0.0016), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Temple Candle Glow at bottom of frame
    if (pSettings?.treatment === "temple-glow") {
      ctx.save();
      const glow = ctx.createRadialGradient(cx, by + bh, 0, cx, by + bh, bw * 0.72);
      glow.addColorStop(0, "rgba(255, 160, 20, 0.38)");
      glow.addColorStop(0.5, "rgba(255, 120, 10, 0.14)");
      glow.addColorStop(1, "rgba(255, 80, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(cx, by + bh, bw * 0.72, bh * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  const size = Math.min(box.w, box.h) * 0.78;
  drawMotif(ctx, scene.motif, box.x + box.w / 2, box.y + box.h / 2, size, theme, 0.4);
};

/* ------------------------------ 1 · traditional --------------------------- */

function traditional(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  paintStyledGround(ctx, frameFor(W, H), theme, "deepam", { angle: "vertical", glowX: 0.5, glowY: 0.18, glow: 0.2 });
  paintGrain(ctx, W, H, 23, theme.light ? 0.02 : 0.03);
  drawToran(ctx, W * 0.055, H * 0.045, W * 0.89, theme, 17, withAlpha(theme.gold, 0.88));

  const square = format.key === "ig-square";
  const story = format.key === "ig-story";
  const pad = W * 0.07;
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;

  const artTop = H * (story ? 0.19 : 0.165);
  const artW = W * (square ? 0.42 : 0.46);
  const artH = H * (square ? 0.24 : story ? 0.21 : 0.27);
  drawArt(scene, { x: W / 2 - artW / 2, y: artTop, w: artW, h: artH }, "arch");

  const name = nameFor(scene);
  const nameY = artTop + artH + H * 0.038;
  paintKicker(scene, name.toUpperCase(), { x: W / 2, y: nameY, width: W * 0.82, align: "center", color: accent(theme) });

  // The date band is anchored to the foot, so it cannot drift when a greeting wraps.
  const bandAnchor = footBase - H * (square ? 0.29 : story ? 0.19 : 0.262);
  const greetTop = nameY + W * TYPE.kicker * 1.9;
  const end = paintGreeting(scene, W / 2, greetTop, W * 0.8, withAlpha(theme.ink, 0.97), {
    align: "center",
    maxBottom: bandAnchor - H * 0.085,
  });
  const subEnd = paintSubline(scene, W / 2, end + H * 0.018, W * 0.68, mutedOn(theme, 0.85), {
    align: "center",
    maxBottom: bandAnchor - H * 0.03,
  });
  const bandTop = Math.max(bandAnchor, subEnd + H * 0.024);

  paintDateBand(scene, pad, bandTop, W - pad * 2);

  const diyaY = footBase - H * 0.128;
  drawDiya(ctx, W * 0.2, diyaY, W * 0.045, theme);
  drawDiya(ctx, W * 0.8, diyaY, W * 0.045, theme, true);
  drawKolamBase(ctx, W / 2, diyaY + W * 0.012, W * 0.4, theme);

  // toran style: the lockup hangs below the garland, not above it
  paintLogo(scene, scene.logoPlacement, { x: pad, y: footBase - H * 0.145, size: W * 0.046, topOffset: 0.1 });
  paintSite(scene, W - pad, footBase - H * 0.072, "right");
  paintFooterLine(scene, undefined, footBase);
}

/* -------------------------------- 2 · minimal ----------------------------- */

function minimal(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  paintStyledGround(ctx, frameFor(W, H), theme, "mono", { angle: "diagonal", glowX: 0.14, glowY: 0.12, glow: 0.1 });
  paintGrain(ctx, W, H, 31, theme.light ? 0.015 : 0.022);

  const pad = W * 0.085;
  const story = format.key === "ig-story";
  const square = format.key === "ig-square";
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;

  const ruleY = format.uiZones ? Math.max(H * 0.15, format.uiZones.top + H * 0.03) : H * 0.135;
  hairline(ctx, pad, ruleY, W - pad, withAlpha(theme.gold, 0.55), Math.max(1.5, W * 0.0018));
  const name = nameFor(scene);
  const headerY = ruleY + H * 0.018;
  const ruleText = scene.copy.traditional.toUpperCase();
  const nameSize = W * TYPE.kicker;
  const ruleSize = W * TYPE.footer;
  ctx.save();
  ctx.font = faceFor(scene, name, nameSize, 600);
  const nameW = ctx.measureText(name.toUpperCase()).width;
  ctx.font = scene.fonts.sans(ruleSize, 500);
  const ruleW = ctx.measureText(ruleText).width;
  ctx.restore();
  const stacked = nameW + ruleW + W * 0.05 > W - pad * 2;
  paintKicker(scene, name.toUpperCase(), {
    x: pad,
    y: headerY,
    width: stacked ? W - pad * 2 : W - pad * 2 - ruleW - W * 0.04,
    color: accent(theme),
    tracking: W * 0.0055,
  });
  paintText(
    scene,
    "footer",
    ruleText,
    W - pad,
    stacked ? headerY + H * 0.036 : headerY + H * 0.001,
    scene.fonts.sans(ruleSize, 500),
    withAlpha(theme.ink, 0.52),
    { align: "right", tracking: W * 0.002 },
  );


  const dateAnchor = footBase - H * 0.2;
  const bodyTop = ruleY + H * (square ? 0.075 : story ? 0.12 : 0.11);
  const colW = W - pad * 2;
  const end = paintGreeting(scene, pad, bodyTop, colW, withAlpha(theme.ink, 0.97), {
    maxBottom: dateAnchor - H * 0.075,
  });
  const subEnd = paintSubline(scene, pad, end + H * 0.03, W * 0.64, mutedOn(theme, 0.86), {
    maxLines: 3,
    maxBottom: dateAnchor - H * 0.02,
  });
  // The date never rides up into the line above it.
  const dateTop = Math.max(dateAnchor, subEnd + H * 0.02);

  const { primary, secondary } = dateLines(scene);
  // Keep the date column clear of the art stamp on the right.
  const dateWidth = scene.art ? W * 0.5 : W - pad * 2;
  const primaryFit = fitSize(ctx, primary.toUpperCase(), dateWidth, W * TYPE.kicker * 0.95, W * 0.0225, (value) =>
    scene.display(value, 600),
  );
  paintText(scene, "kicker", primary.toUpperCase(), pad, dateTop, scene.display(primaryFit, 600), withAlpha(accent(theme), 0.96), {
    tracking: W * 0.0045,
  });
  if (secondary) {
    paintText(scene, "footer", secondary, pad, dateTop + W * TYPE.kicker * 1.25, scene.fonts.sans(W * TYPE.footer, 500), withAlpha(theme.ink, 0.6));
  }

  // Bottom stack, measured upward from the foot so nothing can collide.
  const footerTop = footBase - H * 0.036;
  const siteTop = footerTop - H * 0.042 - W * TYPE.footer * 0.2;
  const markTop = siteTop - W * 0.044 - H * 0.012;
  const markSize = W * 0.042;
  paintLogo(scene, scene.logoPlacement, { x: W / 2, y: markTop, size: markSize, align: "center" });
  paintSite(scene, W / 2, siteTop - W * TYPE.footer * 0.2, "center");
  paintFooterLine(scene, undefined, footBase);

  if (scene.art) {
    const stamp = W * 0.16;
    drawArt(scene, { x: W - pad - stamp, y: markTop - H * 0.035 - stamp, w: stamp, h: stamp }, "circle");
  }
}

/* -------------------------------- 3 · luxury ------------------------------ */

function luxury(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  paintStyledGround(ctx, frameFor(W, H), theme, "signature", { angle: "vertical", glowX: 0.5, glowY: 0.22, glow: 0.16 });
  paintGrain(ctx, W, H, 17, theme.light ? 0.018 : 0.026);

  const square = format.key === "ig-square";
  const story = format.key === "ig-story";
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;
  drawDoubleFrame(ctx, frameFor(W, H), theme, { inset: W * 0.035, color: withAlpha(theme.gold, 0.5), cornerTicks: true });

  // Bottom stack, measured upward from the frame line: plate, wordmark, site, footer.
  const footerTop = footBase - H * 0.056;
  const siteTop = footerTop - H * 0.048;
  const markSize = W * 0.045;
  const markTop = siteTop - markSize - H * 0.014;
  const plateH = W * 0.135;
  const plateBottom = markTop - H * 0.032;
  const plateTop = plateBottom - plateH;

  const cy = H * (story ? 0.24 : square ? 0.225 : 0.245);
  const ring = W * (square ? 0.17 : story ? 0.2 : 0.235);
  drawArt(scene, { x: W / 2 - ring * 0.78, y: cy - ring * 0.88, w: ring * 1.56, h: ring * 1.76 }, "circle");
  drawMedallionRing(ctx, W / 2, cy, ring, theme, 44);

  const name = nameFor(scene);
  const nameY = cy + ring * 1.1;
  paintKicker(scene, name.toUpperCase(), {
    x: W / 2,
    y: nameY,
    width: W * 0.78,
    align: "center",
    color: withAlpha(accent(theme), 0.96),
    tracking: W * 0.008,
  });
  hairline(ctx, W / 2 - W * 0.08, nameY + W * TYPE.kicker * 1.5, W / 2 + W * 0.08, withAlpha(theme.gold, 0.5), Math.max(1, W * 0.0014));

  const greetTop = nameY + W * TYPE.kicker * 2.4;
  const end = paintGreeting(scene, W / 2, greetTop, W * 0.74, withAlpha(theme.ink, 0.98), {
    align: "center",
    maxBottom: plateTop - H * 0.085,
  });
  const subEnd = paintSubline(scene, W / 2, end + H * 0.022, W * 0.62, withAlpha(theme.ink, 0.72), {
    align: "center",
    maxBottom: plateTop - H * 0.025,
  });

  // Engraved date plate: the verified date, or the traditional rule. Shifted
  // down rather than up if a long greeting needs the room.
  const datePlateTop = subEnd > plateTop - H * 0.06 ? Math.min(subEnd + H * 0.022, markTop - plateH - H * 0.02) : plateTop;
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.55);
  ctx.lineWidth = Math.max(1.2, W * 0.0014);
  roundRect(ctx, W / 2 - (W * 0.58) / 2, datePlateTop, W * 0.58, plateH, W * 0.012);
  ctx.stroke();
  ctx.restore();
  const { primary, secondary } = dateLines(scene);
  const plateSize = scene.display(W * TYPE.kicker * 0.92, 600);
  const primaryY = secondary ? datePlateTop + plateH * 0.26 : datePlateTop + plateH / 2 - W * TYPE.kicker * 0.52;
  paintText(scene, "kicker", primary.toUpperCase(), W / 2, primaryY, plateSize, withAlpha(accent(theme), 0.98), {
    align: "center",
    tracking: W * 0.0045,
  });
  if (secondary) {
    paintText(scene, "footer", secondary, W / 2, datePlateTop + plateH * 0.62, scene.fonts.sans(W * TYPE.footer, 500), withAlpha(theme.ink, 0.66), {
      align: "center",
    });
  }

  paintLogo(scene, scene.logoPlacement, { x: W / 2, y: markTop, size: markSize, align: "center" });
  paintSite(scene, W / 2, siteTop, "center");
}

/* ----------------------------- 1b · sanctum ------------------------------- */

function sanctum(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  paintStyledGround(ctx, frameFor(W, H), theme, "deepam", { angle: "vertical", glowX: 0.5, glowY: 0.28, glow: 0.26 });
  paintGrain(ctx, W, H, 26, theme.light ? 0.02 : 0.035);

  const square = format.key === "ig-square";
  const story = format.key === "ig-story";
  const pad = W * 0.07;
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;

  // Architectural Sanctum Shrine Mandapam Frame
  const shrineW = W * (square ? 0.62 : story ? 0.72 : 0.66);
  const shrineH = H * (square ? 0.38 : story ? 0.32 : 0.37);
  const shrineX = W / 2 - shrineW / 2;
  const shrineY = H * (story ? 0.14 : square ? 0.11 : 0.115);

  // Twin carved temple pilasters (pillars) flanking sanctum
  const pillarW = W * 0.036;
  const pillarGrad = ctx.createLinearGradient(0, shrineY, 0, shrineY + shrineH);
  pillarGrad.addColorStop(0, "#D49C35");
  pillarGrad.addColorStop(0.3, "#FFF1B0");
  pillarGrad.addColorStop(0.7, "#A66D1E");
  pillarGrad.addColorStop(1, "#54330E");

  [-shrineW / 2 - pillarW, shrineW / 2].forEach((pxOffset) => {
    const px = W / 2 + pxOffset;
    ctx.save();
    ctx.fillStyle = pillarGrad;
    ctx.fillRect(px, shrineY + shrineH * 0.12, pillarW, shrineH * 0.88);
    ctx.fillRect(px - pillarW * 0.25, shrineY + shrineH * 0.95, pillarW * 1.5, shrineH * 0.05);
    ctx.fillRect(px - pillarW * 0.25, shrineY + shrineH * 0.1, pillarW * 1.5, shrineH * 0.04);
    ctx.strokeStyle = withAlpha("#FFF8D6", 0.6);
    ctx.lineWidth = 1;
    ctx.strokeRect(px, shrineY + shrineH * 0.12, pillarW, shrineH * 0.88);
    ctx.restore();
  });

  // Kalasam finial at apex of shrine arch
  ctx.save();
  const kalasamY = shrineY - H * 0.015;
  const kGrad = ctx.createRadialGradient(W / 2, kalasamY, 1, W / 2, kalasamY, W * 0.035);
  kGrad.addColorStop(0, "#FFF7D2");
  kGrad.addColorStop(0.5, "#D59D35");
  kGrad.addColorStop(1, "#5C350D");
  ctx.fillStyle = kGrad;
  ctx.beginPath();
  ctx.arc(W / 2, kalasamY, W * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha("#FFFDF0", 0.85);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2, kalasamY - W * 0.036);
  ctx.lineTo(W / 2 + W * 0.007, kalasamY - W * 0.02);
  ctx.lineTo(W / 2 - W * 0.007, kalasamY - W * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawToran(ctx, shrineX - W * 0.04, shrineY + shrineH * 0.08, shrineW + W * 0.08, theme, 15, withAlpha(theme.gold, 0.92));

  // Art inside the Sanctum Arch
  const artBox = { x: shrineX, y: shrineY + shrineH * 0.08, w: shrineW, h: shrineH * 0.92 };
  drawArt(scene, artBox, "arch");

  const name = nameFor(scene);
  const nameY = shrineY + shrineH + H * 0.032;
  paintKicker(scene, name.toUpperCase(), { x: W / 2, y: nameY, width: W * 0.82, align: "center", color: accent(theme), tracking: W * 0.006 });

  const bandAnchor = footBase - H * (square ? 0.28 : story ? 0.18 : 0.245);
  const greetTop = nameY + W * TYPE.kicker * 1.8;
  const end = paintGreeting(scene, W / 2, greetTop, W * 0.82, withAlpha(theme.ink, 0.98), {
    align: "center",
    maxBottom: bandAnchor - H * 0.075,
  });
  const subEnd = paintSubline(scene, W / 2, end + H * 0.016, W * 0.7, mutedOn(theme, 0.85), {
    align: "center",
    maxBottom: bandAnchor - H * 0.025,
  });
  const bandTop = Math.max(bandAnchor, subEnd + H * 0.02);

  paintDateBand(scene, pad, bandTop, W - pad * 2);

  const diyaY = footBase - H * 0.125;
  drawDiya(ctx, W * 0.18, diyaY, W * 0.048, theme);
  drawDiya(ctx, W * 0.82, diyaY, W * 0.048, theme, true);
  drawKolamBase(ctx, W / 2, diyaY + W * 0.012, W * 0.44, theme);

  paintLogo(scene, scene.logoPlacement, { x: pad, y: footBase - H * 0.14, size: W * 0.046, topOffset: 0.08 });
  paintSite(scene, W - pad, footBase - H * 0.065, "right");
  paintFooterLine(scene, undefined, footBase);
}

/* -------------------------- 1c · editorial-full --------------------------- */

function editorialFull(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  const square = format.key === "ig-square";
  const story = format.key === "ig-story";
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;
  const pad = W * 0.075;

  paintStyledGround(ctx, frameFor(W, H), theme, "signature", { angle: "vertical", glowX: 0.5, glowY: 0.35, glow: 0.2 });
  paintGrain(ctx, W, H, 20, 0.025);

  const bleedH = H * (story ? 0.62 : square ? 0.58 : 0.6);
  const artBox = { x: 0, y: 0, w: W, h: bleedH };
  drawArt(scene, artBox, "square");

  const scrim = ctx.createLinearGradient(0, bleedH * 0.45, 0, bleedH + H * 0.05);
  scrim.addColorStop(0, "rgba(5, 10, 24, 0)");
  scrim.addColorStop(0.55, "rgba(5, 10, 24, 0.75)");
  scrim.addColorStop(1, theme.bgTo);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  const stars: Array<[number, number, number]> = [
    [0.12, 0.18, 1.2], [0.85, 0.15, 1.4], [0.22, 0.38, 0.9],
    [0.78, 0.42, 1.1], [0.5, 0.08, 1.5], [0.92, 0.3, 0.8]
  ];
  stars.forEach(([sx, sy, sr]) => {
    ctx.fillStyle = "rgba(255, 235, 160, 0.65)";
    ctx.beginPath();
    ctx.arc(W * sx, bleedH * sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  drawDoubleFrame(ctx, frameFor(W, H), theme, { inset: W * 0.038, color: withAlpha(theme.gold, 0.45), cornerTicks: true });

  const name = nameFor(scene);
  const kickerY = bleedH - H * (story ? 0.08 : square ? 0.07 : 0.075);
  hairline(ctx, pad, kickerY - W * 0.015, pad + W * 0.14, withAlpha(theme.gold, 0.8), Math.max(1.8, W * 0.002));
  paintKicker(scene, name.toUpperCase(), {
    x: pad,
    y: kickerY,
    width: W - pad * 2,
    color: accent(theme),
    size: W * TYPE.kicker * 1.05,
    tracking: W * 0.007,
  });

  const greetTop = kickerY + W * TYPE.kicker * 1.8;
  const dateAnchor = footBase - H * (square ? 0.19 : story ? 0.16 : 0.175);
  const end = paintGreeting(scene, pad, greetTop, W - pad * 2, withAlpha(theme.ink, 0.98), {
    maxBottom: dateAnchor - H * 0.065,
  });
  const subEnd = paintSubline(scene, pad, end + H * 0.016, W * 0.72, mutedOn(theme, 0.88), {
    maxBottom: dateAnchor - H * 0.02,
  });

  const dateTop = Math.max(dateAnchor, subEnd + H * 0.02);
  const { primary, secondary } = dateLines(scene);
  paintText(scene, "kicker", primary.toUpperCase(), pad, dateTop, scene.display(W * TYPE.kicker * 0.92, 600), withAlpha(accent(theme), 0.96), {
    tracking: W * 0.0045,
  });
  if (secondary) {
    paintText(scene, "footer", secondary, pad, dateTop + W * TYPE.kicker * 1.25, scene.fonts.sans(W * TYPE.footer, 500), withAlpha(theme.ink, 0.65));
  }

  paintLogo(scene, scene.logoPlacement, { x: W - pad, y: footBase - H * 0.09, size: W * 0.052, align: "right" });
  paintSite(scene, pad, footBase - H * 0.045);
  paintFooterLine(scene, undefined, footBase);
}

/* -------------------------- 1d · mandala-radial --------------------------- */

function mandalaRadial(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  const square = format.key === "ig-square";
  const story = format.key === "ig-story";
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;
  const pad = W * 0.075;

  paintStyledGround(ctx, frameFor(W, H), theme, "kolam", { angle: "vertical", glowX: 0.5, glowY: 0.25, glow: 0.28 });
  paintGrain(ctx, W, H, 22, theme.light ? 0.018 : 0.028);

  const cy = H * (story ? 0.24 : square ? 0.23 : 0.25);
  const r = W * (square ? 0.21 : story ? 0.23 : 0.255);

  ctx.save();
  const rayCount = 16;
  ctx.strokeStyle = withAlpha(theme.gold, 0.35);
  ctx.lineWidth = Math.max(1, W * 0.0014);
  for (let i = 0; i < rayCount; i += 1) {
    const a = (i / rayCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 + Math.cos(a) * (r * 1.15), cy + Math.sin(a) * (r * 1.15));
    ctx.lineTo(W / 2 + Math.cos(a) * (r * 1.36), cy + Math.sin(a) * (r * 1.36));
    ctx.stroke();
  }
  ctx.restore();

  drawMedallionRing(ctx, W / 2, cy, r * 1.08, theme, 32);

  const artBox = { x: W / 2 - r, y: cy - r, w: r * 2, h: r * 2 };
  drawArt(scene, artBox, "circle");

  const cornerR = W * 0.038;
  const inset = W * 0.055;
  [
    [inset, inset],
    [W - inset, inset],
  ].forEach(([cx2, cy2]) => {
    drawMotif(ctx, "kolam", cx2, cy2, cornerR * 2, theme, 0.4);
  });

  const name = nameFor(scene);
  const nameY = cy + r * 1.25;
  paintKicker(scene, name.toUpperCase(), {
    x: W / 2,
    y: nameY,
    width: W * 0.8,
    align: "center",
    color: accent(theme),
    tracking: W * 0.007,
  });

  const dateAnchor = footBase - H * (square ? 0.26 : story ? 0.17 : 0.23);
  const greetTop = nameY + W * TYPE.kicker * 1.85;
  const end = paintGreeting(scene, W / 2, greetTop, W * 0.82, withAlpha(theme.ink, 0.98), {
    align: "center",
    maxBottom: dateAnchor - H * 0.075,
  });
  const subEnd = paintSubline(scene, W / 2, end + H * 0.016, W * 0.68, mutedOn(theme, 0.86), {
    align: "center",
    maxBottom: dateAnchor - H * 0.025,
  });
  const bandTop = Math.max(dateAnchor, subEnd + H * 0.02);

  paintDateBand(scene, pad, bandTop, W - pad * 2);

  paintLogo(scene, scene.logoPlacement, { x: W / 2, y: footBase - H * 0.125, size: W * 0.046, align: "center" });
  paintSite(scene, W / 2, footBase - H * 0.065, "center");
  paintFooterLine(scene, undefined, footBase);
}

/* -------------------------- 3b · tanjore-heirloom ------------------------- */

function tanjoreHeirloom(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  const square = format.key === "ig-square";
  const story = format.key === "ig-story";
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;
  const pad = W * 0.08;

  paintStyledGround(ctx, frameFor(W, H), theme, "signature", { angle: "vertical", glowX: 0.5, glowY: 0.25, glow: 0.22 });
  paintGrain(ctx, W, H, 25, 0.03);

  const inset = W * 0.04;
  ctx.save();
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = Math.max(2.5, W * 0.0035);
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

  ctx.strokeStyle = withAlpha(theme.goldSoft, 0.65);
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 4, inset + 4, W - (inset + 4) * 2, H - (inset + 4) * 2);

  [
    [inset + 8, inset + 8],
    [W - inset - 8, inset + 8],
    [inset + 8, H - inset - 8],
    [W - inset - 8, H - inset - 8],
  ].forEach(([rx, ry]) => {
    ctx.fillStyle = theme.gold;
    ctx.beginPath();
    ctx.arc(rx, ry, W * 0.016, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FF1744";
    ctx.beginPath();
    ctx.arc(rx, ry, W * 0.007, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  const nicheW = W * (square ? 0.48 : story ? 0.54 : 0.5);
  const nicheH = H * (square ? 0.28 : story ? 0.25 : 0.3);
  const nicheX = W / 2 - nicheW / 2;
  const nicheY = H * (story ? 0.16 : square ? 0.12 : 0.13);

  ctx.save();
  ctx.fillStyle = theme.bgFrom;
  ctx.beginPath();
  ctx.arc(W / 2, nicheY - H * 0.01, W * 0.034, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = theme.gold;
  ctx.font = `bold ${Math.round(W * 0.034)}px "Tiro Tamil", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ஓம்", W / 2, nicheY - H * 0.009);
  ctx.restore();

  drawArt(scene, { x: nicheX, y: nicheY, w: nicheW, h: nicheH }, "arch");

  const name = nameFor(scene);
  const nameY = nicheY + nicheH + H * 0.038;
  paintKicker(scene, name.toUpperCase(), {
    x: W / 2,
    y: nameY,
    width: W * 0.78,
    align: "center",
    color: accent(theme),
    tracking: W * 0.008,
  });

  hairline(ctx, W / 2 - W * 0.12, nameY + W * TYPE.kicker * 1.5, W / 2 + W * 0.12, withAlpha(theme.gold, 0.6), 2);

  const dateAnchor = footBase - H * (square ? 0.24 : story ? 0.16 : 0.21);
  const greetTop = nameY + W * TYPE.kicker * 2.3;
  const end = paintGreeting(scene, W / 2, greetTop, W * 0.76, withAlpha(theme.ink, 0.98), {
    align: "center",
    maxBottom: dateAnchor - H * 0.075,
  });
  const subEnd = paintSubline(scene, W / 2, end + H * 0.018, W * 0.65, withAlpha(theme.ink, 0.75), {
    align: "center",
    maxBottom: dateAnchor - H * 0.025,
  });

  const plateTop = Math.max(dateAnchor, subEnd + H * 0.02);
  const plateH = W * 0.11;
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.6);
  ctx.lineWidth = Math.max(1.2, W * 0.0016);
  roundRect(ctx, W / 2 - (W * 0.6) / 2, plateTop, W * 0.6, plateH, W * 0.012);
  ctx.stroke();
  ctx.restore();

  const { primary, secondary } = dateLines(scene);
  paintText(scene, "kicker", primary.toUpperCase(), W / 2, plateTop + plateH * 0.32, scene.display(W * TYPE.kicker * 0.88, 600), withAlpha(accent(theme), 0.98), {
    align: "center",
    tracking: W * 0.0045,
  });
  if (secondary) {
    paintText(scene, "footer", secondary, W / 2, plateTop + plateH * 0.68, scene.fonts.sans(W * TYPE.footer, 500), withAlpha(theme.ink, 0.65), {
      align: "center",
    });
  }

  paintLogo(scene, scene.logoPlacement, { x: W / 2, y: footBase - H * 0.115, size: W * 0.046, align: "center" });
  paintSite(scene, W / 2, footBase - H * 0.055, "center");
  paintFooterLine(scene, undefined, footBase);
}

/* ------------------------------ 4 · contemporary -------------------------- */

function contemporary(scene: Scene) {
  const { ctx, W, H, theme, format } = scene;
  const square = format.key === "ig-square";
  const story = format.key === "ig-story";
  const pad = W * 0.07;
  const footBase = format.uiZones ? H - format.uiZones.bottom : H;

  paintStyledGround(ctx, frameFor(W, H), theme, "mono", { angle: "horizontal", glowX: 0.82, glowY: 0.1, glow: 0.12 });
  paintGrain(ctx, W, H, 47, theme.light ? 0.012 : 0.02);

  const blockTop = H * (story ? 0.4 : square ? 0.46 : 0.49);
  ctx.save();
  ctx.fillStyle = withAlpha(theme.bgFrom, theme.light ? 0.9 : 0.86);
  ctx.fillRect(0, blockTop, W, H - blockTop);
  ctx.restore();
  hairline(ctx, 0, blockTop, W, withAlpha(theme.gold, 0.75), Math.max(2, W * 0.0026));

  // Art window: a hard crop of the deity, bleeding to the right edge.
  const artTop = H * (story ? 0.145 : 0.05);
  const winW = W * 0.48;
  const winH = H * (square ? 0.25 : story ? 0.22 : 0.27);
  drawArt(scene, { x: W - winW, y: artTop, w: winW, h: winH }, "square");
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.gold, 0.55);
  ctx.lineWidth = Math.max(1.5, W * 0.0018);
  ctx.strokeRect(W - winW, artTop, winW, winH);
  ctx.restore();

  const name = nameFor(scene);
  // On a story the left column under the art is empty, so the occasion moves
  // down beside it instead of floating alone at the top.
  // Devanagari matras sit above the em box, so the occasion never hugs the trim.
  const kickerY = story ? artTop + winH + H * 0.018 - W * TYPE.kicker * 1.7 : artTop + H * 0.085;
  const kickerWidth = W - winW - pad * 1.6;
  paintKicker(scene, name.toUpperCase(), {
    x: pad,
    y: kickerY,
    width: kickerWidth,
    color: accent(theme),
    size: W * TYPE.kicker,
    tracking: W * 0.006,
  });
  // The rule line sits under the art window, so it can use the full column and
  // never has to shrink below the mobile floor to squeeze beside the image.
  const ruleText = scene.copy.traditional.toUpperCase();
  const ruleY = artTop + winH + H * 0.018;
  const ruleFitted = fitSize(ctx, ruleText, W - pad * 2, W * TYPE.footer, W * 0.0225, (value) => scene.fonts.sans(value, 600));
  paintText(scene, "footer", ruleText, pad, ruleY, scene.fonts.sans(ruleFitted, 600), withAlpha(theme.ink, 0.5), {
    tracking: W * 0.003,
  });

  const dateAnchor = footBase - H * 0.155;
  const greetTop = blockTop + H * 0.042;
  const end = paintGreeting(scene, pad, greetTop, W - pad * 2, withAlpha(theme.ink, 0.98), {
    maxBottom: dateAnchor - H * 0.085,
  });
  const subEnd = paintSubline(scene, pad, end + H * 0.024, W * 0.7, mutedOn(theme, 0.85), { maxBottom: dateAnchor - H * 0.025 });
  const dateTop = Math.max(dateAnchor, subEnd + H * 0.02);

  const { primary, secondary } = dateLines(scene);
  hairline(ctx, pad, dateTop - W * 0.014, pad + W * 0.1, withAlpha(theme.gold, 0.7), Math.max(1.5, W * 0.002));
  paintText(scene, "kicker", primary.toUpperCase(), pad, dateTop, scene.display(W * TYPE.kicker * 0.92, 600), withAlpha(accent(theme), 0.96), {
    tracking: W * 0.0045,
  });
  if (secondary) {
    paintText(scene, "footer", secondary, pad, dateTop + W * TYPE.kicker * 1.25, scene.fonts.sans(W * TYPE.footer, 500), withAlpha(theme.ink, 0.62));
  }

  paintSite(scene, pad, footBase - H * 0.042);
  paintLogo(scene, scene.logoPlacement, { x: W - pad, y: footBase - H * 0.105, size: W * 0.055, align: "right", topOffset: 0.02 });
}

/* -------------------------------- dispatch -------------------------------- */

const PAINTERS: Record<FestivalStyle, (scene: Scene) => void> = {
  traditional,
  sanctum,
  "editorial-full": editorialFull,
  "mandala-radial": mandalaRadial,
  luxury,
  "tanjore-heirloom": tanjoreHeirloom,
  minimal,
  contemporary,
};

export async function renderFestivalCard(input: FestivalCardInput): Promise<FestivalCardRender> {
  input = { ...input, language: "en", copy: { ...input.copy,
    name: { en: englishText(input.copy.name.en), ta: "", hi: "" },
    greeting: { en: englishText(input.copy.greeting.en), ta: "", hi: "" },
    subline: englishText(input.copy.subline), footer: englishText(input.copy.footer), site: englishText(input.copy.site),
  } };
  // Fonts must be resident before the first measurement: `fitLines` and
  // `measureText` are what decide the size, and a face that arrives late makes
  // every wrapped line the wrong length — which shows up as overflow in export.
  await ensureFonts();
  const format = CARD_FORMAT_MAP[input.format] ?? CARD_FORMAT_MAP["ig-post"];
  const style = CARD_STYLE_MAP[input.style] ?? CARD_STYLE_MAP.traditional;
  const scale = input.scale ?? 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(format.width * scale);
  canvas.height = Math.round(format.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot render the card.");
  if (scale !== 1) ctx.scale(scale, scale);

  const theme = themeFor(input.theme);
  const fonts = fontsFor(input.script);
  const [logo, art] = await Promise.all([
    loadLogo().catch(() => null),
    input.art ? loadImageSource(input.art).catch(() => null) : Promise.resolve(null),
  ]);

  const scene: Scene = {
    ctx,
    W: format.width,
    H: format.height,
    format,
    theme,
    fonts,
    display: (size, weight) => {
      if (input.display === "marcellus") return fonts.editorial(size);
      if (input.display === "baloo") return fonts.sans(size, weight ?? 500);
      if (input.display === "jakarta") return fonts.sans(size, weight ?? 600);
      return fonts.display(size, weight);
    },
    log: new TypeLog(),
    copy: input.copy,
    language: input.language,
    art,
    logo,
    motif: input.motif ?? styleMotif("deepam"),
    logoPlacement: input.logo,
    brandLockup: { ...DEFAULT_BRAND_LOCKUP, ...input.brandLockup },
    pictureSettings: input.pictureSettings,
  };

  (PAINTERS[style.key] ?? traditional)(scene);

  // Fixed service-suite and custom anchors are painted after the style layout;
  // all other placements keep their design-specific anchor above.
  if (input.logo === "service-top-right" || input.logo === "custom") {
    const settings = scene.brandLockup;
    const custom = input.logo === "custom";
    const align = custom ? "center" : "right";
    const x = (custom ? format.width * settings.customX / 100 : format.width * 0.94) + settings.offsetX * format.width;
    const serviceY = format.uiZones ? format.uiZones.top + format.height * 0.035 : format.height * 0.075;
    const y = (custom ? format.height * settings.customY / 100 : serviceY) + settings.offsetY * format.height;
    const textSize = format.width * 0.023 * settings.textScale;
    drawBrandLockup(ctx, logo, {
      x,
      y,
      markSize: format.width * 0.052 * settings.markScale,
      textSize,
      orientation: settings.orientation,
      align,
      name: settings.name,
      font: scene.display(textSize, 600),
      theme,
    });
    scene.log.add("footer", textSize, settings.name);
  }

  // Editor-only guides. Drawn after the composition so they can never be
  // mistaken for design, and the export path never turns them on.
  if (input.showSafeArea) {
    ctx.save();
    ctx.strokeStyle = "rgba(208,168,184,0.9)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    if (format.uiZones) {
      ctx.strokeRect(0, format.uiZones.top, format.width, format.height - format.uiZones.top - format.uiZones.bottom);
      ctx.fillStyle = "rgba(208,168,184,0.16)";
      ctx.fillRect(0, 0, format.width, format.uiZones.top);
      ctx.fillRect(0, format.height - format.uiZones.bottom, format.width, format.uiZones.bottom);
    } else {
      ctx.strokeRect(format.width * 0.04, format.height * 0.04, format.width * 0.92, format.height * 0.92);
    }
    ctx.restore();
  }

  return { canvas, format, style, typography: scene.log.entries, warnings: coverageWarnings(scene) };
}

/* ------------------------------ script checks ----------------------------- */

/**
 * Every character no shipped face can draw, so the editor hears about it.
 *
 * This is a real-coverage test, not a per-family one: the canvas stacks name the
 * script families *and* their Latin halves, so a Tamil comma is covered even
 * though the Tamil face alone has no comma. Only characters outside every
 * shipped face (emoji, CJK, Thai) reach the warning.
 */
export function coverageWarnings(scene: Pick<Scene, "copy" | "fonts" | "W">): string[] {
  const warnings: string[] = [];
  const texts = [
    scene.copy.name.en,
    scene.copy.name.ta,
    scene.copy.name.hi,
    scene.copy.greeting.en,
    scene.copy.greeting.ta,
    scene.copy.greeting.hi,
    scene.copy.subline,
  ];
  const missing = new Set<string>();
  for (const text of texts) {
    for (const char of Array.from(text)) {
      if (/\s/.test(char)) continue;
      const font = TAMIL.test(char) ? scene.fonts.script(40) : DEVA.test(char) ? scene.fonts.hindi(40) : scene.fonts.sans(40, 500);
      if (!hasGlyph(font, char)) missing.add(char);
    }
  }
  if (missing.size) {
    warnings.push(`No shipped face can draw ${Array.from(missing).join(" ")} — replace those characters or they will print as boxes.`);
  }
  return warnings;
}
