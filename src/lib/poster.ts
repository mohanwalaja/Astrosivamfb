import type {
  DisplayFontKey,
  ImageFit,
  PosterLayout,
  PosterTemplate,
  ScriptFontKey,
  StyleKey,
  ThemeKey,
} from "../types";
import { THEMES } from "../data/brand";
import { LAYOUT_TEMPLATE, TEMPLATE_MAP, TEMPLATES, layoutForTemplate, templateForLayout } from "../data/posterTemplates";
import { createCanvas, ensureFonts, loadImageSource, loadLogo } from "./canvas";
import { displayFaceFor } from "./posterKit";
import { paintPosterTemplate } from "./posterTemplates";
import type { GraphicSceneKey } from "./graphicKit";
import type { PosterLayers, PosterManifest } from "./motion";

export interface PosterOptions {
  width: number;
  height: number;
  themeKey: ThemeKey;
  style: StyleKey;
  layout: PosterLayout;
  /**
   * The composition. Optional so every existing caller keeps working; when it is
   * absent the template is derived from `layout`.
   */
  template?: PosterTemplate;
  display: DisplayFontKey;
  script: ScriptFontKey;
  image?: string | null;
  imageFit: ImageFit;
  kicker: string;
  headline: string;
  tamil: string;
  hindi: string;
  subline: string;
  cta: string;
  footer: string;
  showLogo: boolean;
  scale?: number;
  /**
   * 0–1 text reveal, used by the reel recorder. The art, frame, logo and footer
   * always draw; only the copy fades and drifts up. Defaults to 1, so every
   * existing export is unchanged.
   */
  reveal?: number;
  /** Composition variation — a genuinely different grid, not a recolour. */
  variation?: number;
  /** The graphic scene used for designed artwork (default per category). */
  artScene?: GraphicSceneKey | "style";
  /** Campaign register, so art direction can follow the subject. */
  category?: string | null;
  /** Ambient time in seconds for animated graphics. Stills settle at 1.6. */
  t?: number;
}

/* --------------------------------- fonts ---------------------------------- */

export const DISPLAY_FONTS: Array<{ key: DisplayFontKey; label: string; note: string }> = [
  { key: "cinzel", label: "Cinzel", note: "Brand default — engraved Roman capitals" },
  { key: "cormorant", label: "Cormorant Garamond", note: "High-contrast display serif — luxury and heritage" },
  { key: "playfair", label: "Playfair Display", note: "Editorial serif with sharp hairlines — magazine pages" },
  { key: "inter", label: "Inter Tight", note: "Geometric modern sans — campaigns and guides" },
];

export const SCRIPT_FONTS: Array<{ key: ScriptFontKey; label: string; note: string }> = [
  { key: "serif", label: "Noto Serif Tamil + Devanagari", note: "Book-weight serif Tamil and Hindi — pairs with every serif headline" },
  { key: "sans", label: "Hind Madurai + Hind", note: "Clean sans Tamil and Hindi — pairs with Inter Tight" },
  { key: "festive", label: "Baloo Thambi + Yatra One", note: "Heavy, rounded festive Tamil and Hindi for greetings" },
];

/* ------------------------------ compatibility ----------------------------- */

export { TEMPLATES, LAYOUT_TEMPLATE, templateForLayout, layoutForTemplate };
export type { TemplateMeta } from "../types";

/* --------------------------------- render --------------------------------- */

export async function renderPoster(options: PosterOptions): Promise<HTMLCanvasElement> {
  const {
    width,
    height,
    themeKey,
    style,
    layout,
    template,
    display,
    script,
    image,
    imageFit,
    kicker,
    headline,
    tamil,
    hindi,
    subline,
    cta,
    footer,
    showLogo,
    scale = 1,
    reveal = 1,
    variation = 0,
    artScene,
    category = null,
    t = 1.6,
  } = options;

  const resolvedTemplate: PosterTemplate = template ?? templateForLayout(layout);
  // Each composition ships its own graphic scene; callers may override it.
  const resolvedScene = artScene ?? (TEMPLATE_MAP[resolvedTemplate]?.defaultArtScene as PosterOptions["artScene"]);

  await ensureFonts();
  const theme = THEMES[themeKey] ? themeKey : "midnight";
  const { canvas, ctx } = createCanvas(width, height, scale);

  // Only templates that use art load the photograph. The minimal typographic
  // template deliberately ignores it, which also makes it the fastest export.
  const wantsImage = TEMPLATE_MAP[resolvedTemplate]?.usesImage !== false;
  const img = wantsImage && image ? await loadImageSource(image).catch(() => null) : null;
  const logo = showLogo ? await loadLogo().catch(() => null) : null;

  paintPosterTemplate({
    ctx,
    W: width,
    H: height,
    themeKey: theme,
    template: resolvedTemplate,
    imageFit,
    style,
    copy: {
      kicker: kicker ?? "",
      headline: headline ?? "",
      tamil: tamil ?? "",
      hindi: hindi ?? "",
      subline: subline ?? "",
      cta: cta ?? "",
      footer: footer ? (footer.includes("Email:") || footer.includes("@astrosivam.com") ? "astrosivam.com" : footer) : "",
    },
    img,
    logo,
    display: displayFaceFor(display),
    script,
    showLogo,
    reveal: Math.max(0, Math.min(1, reveal)),
    variation,
    artScene: resolvedScene,
    category,
    t,
  });

  return canvas;
}

/**
 * The motion pipeline's input: the same poster painted once per depth plane
 * (ground, art, copy, brand) plus the rectangles the compositor animates.
 * Four layer renders cost about what one full render costs, because each pass
 * only executes its own stage — and a reel frame is then a cheap composite.
 */
export async function renderPosterLayers(
  options: PosterOptions,
): Promise<{ layers: PosterLayers; manifest: PosterManifest }> {
  const { width, height } = options;
  const marks: Partial<Record<"art" | "copy" | "brand", { x: number; y: number; w: number; h: number }>> = {};
  const make = () => createCanvas(width, height, 1);
  const ground = make();
  const art = make();
  const copy = make();
  const brand = make();

  const resolvedTemplate = options.template ?? templateForLayout(options.layout);
  const resolvedScene = options.artScene ?? (TEMPLATE_MAP[resolvedTemplate]?.defaultArtScene as PosterOptions["artScene"]);
  const wantsImage = TEMPLATE_MAP[resolvedTemplate]?.usesImage !== false;
  const img = wantsImage && options.image ? await loadImageSource(options.image).catch(() => null) : null;
  const logo = options.showLogo ? await loadLogo().catch(() => null) : null;

  for (const [layer, target] of [
    ["ground", ground],
    ["art", art],
    ["copy", copy],
    ["brand", brand],
  ] as const) {
    paintPosterTemplate({
      ctx: target.ctx,
      W: width,
      H: height,
      themeKey: options.themeKey,
      template: resolvedTemplate,
      imageFit: options.imageFit,
      style: options.style,
      copy: {
        kicker: options.kicker ?? "",
        headline: options.headline ?? "",
        tamil: options.tamil ?? "",
        hindi: options.hindi ?? "",
        subline: options.subline ?? "",
        cta: options.cta ?? "",
        footer: options.footer ?? "",
      },
      img,
      logo,
      display: displayFaceFor(options.display),
      script: options.script,
      showLogo: options.showLogo,
      reveal: 1,
      variation: options.variation ?? 0,
      artScene: resolvedScene,
      category: options.category ?? null,
      t: options.t ?? 1.6,
      layer,
      marks,
    });
  }

  let bg = "#0b0f1a";
  try {
    const pixel = ground.ctx.getImageData(2, 2, 1, 1).data;
    bg = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  } catch {
    /* tainted or unavailable — the default is close enough */
  }

  return {
    layers: {
      ground: ground.canvas as HTMLCanvasElement,
      art: art.canvas as HTMLCanvasElement,
      copy: copy.canvas as HTMLCanvasElement,
      brand: brand.canvas as HTMLCanvasElement,
    },
    manifest: {
      width,
      height,
      bg,
      art: marks.art ?? null,
      copy: marks.copy ?? null,
      brand: marks.brand ?? null,
    },
  };
}
