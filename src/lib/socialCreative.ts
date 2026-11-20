import type { ScriptFontKey, StyleKey, ThemeKey } from "../types";
import { englishCopy } from "./englishCopy";
import { fontsFor, themeFor, tracked, type FontSet } from "./posterKit";
import { ensureFonts, loadImageSource, loadLogo } from "./canvas";
import { TypeLog, type TypedDraw, type TypeRole } from "./legibility";
import { fontPx } from "./typeset";

/**
 * Shared core for the platform creatives (Facebook + Instagram).
 *
 * The Facebook and Instagram painters used to each carry a copy of this
 * scaffolding: the scene object, the logged text painter, and the whole
 * render entry point (await fonts, resolve the layout, create and scale the
 * canvas, load art/logo, dispatch to the painter, paint editor-only safe-area
 * guides, return the typography audit trail). The platform files now own only
 * what is genuinely platform-specific — their layout tables and painters —
 * and delegate the rest to `renderSocialCreative` here.
 *
 * What this deliberately does NOT do: merge the painters themselves. A
 * Facebook cover cropped to 640 × 360, an Instagram story with app-owned UI
 * bands and a reel cover judged at 124 px are different compositions that
 * happen to share a palette, a logo plate and a type scale.
 */

/** Copy every platform creative carries, before platform extras. */
export interface SocialContent {
  kicker: string;
  headline: string;
  subline: string;
  tamil: string;
  chips: string[];
  price: string;
  cta: string;
  footer: string;
}

/** Layout metadata every platform creative declares. */
export interface SocialLayoutMeta<Key extends string = string> {
  key: Key;
  name: string;
  purpose: string;
  width: number;
  height: number;
  /** Width the asset is actually seen at, in CSS px. */
  mobileWidth: number;
  /** Canvas px the viewer sees (a cropped cover audits at its crop, not its canvas). */
  auditWidth: number;
  crop: "circle" | "rect" | "square";
  cropNote: string;
  safeArea?: { x: number; y: number; w: number; h: number; label: string };
}

export interface SocialScene<Content extends SocialContent = SocialContent> {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  theme: ReturnType<typeof themeFor>;
  fonts: FontSet;
  content: Content;
  art: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  log: TypeLog;
  style: StyleKey;
  /** Editor-only crop guide; suppressed on export. */
  showSafeArea: boolean;
  /** Copy decisions the painter had to make, surfaced to the editor. */
  warnings: string[];
}

/** Paint one logged line in the current face (shared by both platforms). */
export function drawSocialText<Content extends SocialContent>(
  scene: SocialScene<Content>,
  role: TypeRole,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  options: { align?: CanvasTextAlign; baseline?: CanvasTextBaseline; tracking?: number } = {},
): void {
  const { ctx } = scene;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = options.baseline ?? "top";
  if (options.tracking) {
    tracked(ctx, text, x, y, options.tracking, options.align ?? "left");
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
  scene.log.add(role, fontPx(font), text);
}

export interface SocialCreativeInput<Layout extends string, Content extends SocialContent> {
  layout: Layout;
  themeKey: ThemeKey;
  style: StyleKey;
  content: Content;
  art?: string | null;
  /** Editor-only guides; never reach an export. */
  showSafeArea?: boolean;
  scale?: number;
}

export interface SocialRender<Layout extends string> {
  canvas: HTMLCanvasElement;
  layout: SocialLayoutMeta<Layout>;
  typography: TypedDraw[];
  /** Copy decisions the painter had to make, e.g. an optional line it left off. */
  warnings: string[];
}

/**
 * The render entry point both platforms share. Fonts must be resident before
 * the first measurement: `fitLines` and `measureText` decide the sizes, and a
 * face that arrives late makes every wrapped line the wrong length — which
 * shows up as overflow in the export.
 */
export async function renderSocialCreative<Layout extends string, Content extends SocialContent>(args: {
  input: SocialCreativeInput<Layout, Content>;
  layouts: Record<Layout, SocialLayoutMeta<Layout>>;
  fallback: Layout;
  painters: Record<Layout, (scene: SocialScene<Content>) => void>;
  /** Platform-specific editor guides, painted after the scene. */
  paintSafeArea?: (ctx: CanvasRenderingContext2D, meta: SocialLayoutMeta<Layout>) => void;
  script?: ScriptFontKey;
}): Promise<SocialRender<Layout>> {
  const input: SocialCreativeInput<Layout, Content> = {
    ...args.input,
    content: englishCopy(args.input.content) as Content,
  };
  await ensureFonts();
  const meta = args.layouts[input.layout] ?? args.layouts[args.fallback];
  const scale = input.scale ?? 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(meta.width * scale);
  canvas.height = Math.round(meta.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot render the creative.");
  if (scale !== 1) ctx.scale(scale, scale);

  const logo = await loadLogo().catch(() => null);
  const art = input.art ? await loadImageSource(input.art).catch(() => null) : null;
  const log = new TypeLog();
  const warnings: string[] = [];

  const scene: SocialScene<Content> = {
    ctx,
    W: meta.width,
    H: meta.height,
    theme: themeFor(input.themeKey),
    fonts: fontsFor(args.script ?? "classic"),
    content: input.content,
    art,
    logo,
    log,
    style: input.style,
    showSafeArea: false,
    warnings,
  };
  (args.painters[meta.key] ?? args.painters[args.fallback])(scene);

  // Safe-area overlay is an editor aid only; it must never reach an export.
  if (input.showSafeArea) {
    ctx.save();
    try {
      args.paintSafeArea?.(ctx, meta);
    } finally {
      ctx.restore();
    }
  }

  return { canvas, layout: meta, typography: log.entries, warnings };
}
