import type {
  DisplayFontKey,
  ImageFit,
  PosterLayout,
  PosterTemplate,
  ScriptFontKey,
  StyleKey,
  ThemeKey,
} from "../types";
import { getDesign } from "../data/library";
import { renderLibraryDesign } from "./libraryRender";
import { THEMES } from "../data/brand";
import { LAYOUT_TEMPLATE, TEMPLATE_MAP, TEMPLATES, layoutForTemplate, templateForLayout } from "../data/posterTemplates";
import { createCanvas, ensureFonts, loadImageSource, loadLogo } from "./canvas";
import { displayFaceFor } from "./posterKit";
import { paintPosterTemplate } from "./posterTemplates";
import { isComposition, BRIEF_MAP, getOccasion, type DesignCategory } from "../data/designBriefs";
import { renderComposition } from "./compositionRender";
import { englishCopy } from "./englishCopy";

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
  /** A design from the 150-design library. When present it owns the layout. */
  designId?: string;
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
  /** New composition engine brief. Legacy callers keep working without these. */
  category?: DesignCategory;
  occasion?: string;
  serviceTitle?: string;
  facts?: string[];
  seed?: number;
  imageIsLibrary?: boolean;
  useGlobalBrandPlacement?: boolean;
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
  const libraryDesign = getDesign(options.designId);
  if (libraryDesign) {
    return renderLibraryDesign({
      design: libraryDesign,
      width: options.width,
      height: options.height,
      copy: {
        kicker: options.kicker,
        serviceTitle: options.serviceTitle,
        headline: options.headline,
        subline: options.subline,
        facts: options.facts as [string, string, string] | undefined,
        cta: options.cta,
      },
      image: options.image,
      footer: options.footer,
      showLogo: options.showLogo,
      scale: options.scale,
    });
  }
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
  } = options;

  const resolvedTemplate: PosterTemplate = template ?? templateForLayout(layout);

  if (isComposition(resolvedTemplate)) {
    const category = options.category ?? "birth";
    const brief = BRIEF_MAP[category];
    const occasion = getOccasion(category, options.occasion);
    return renderComposition({
      width, height, composition: resolvedTemplate, category, occasion: occasion.key,
      themeKey, style, display, image: image === undefined ? (occasion.image ?? brief.image) : image,
      imageIsLibrary: options.imageIsLibrary, showLogo, seed: options.seed, scale,
      useGlobalBrandPlacement: options.useGlobalBrandPlacement,
      copy: englishCopy({ kicker, headline, subline, cta, footer, serviceTitle: options.serviceTitle ?? kicker, facts: options.facts ?? occasion.copy.facts, tamil: "", hindi: "" }),
    });
  }

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
    copy: englishCopy({
      kicker: kicker ?? "",
      headline: headline ?? "",
      tamil: tamil ?? "",
      hindi: hindi ?? "",
      subline: subline ?? "",
      cta: cta ?? "",
      footer: footer ? (footer.includes("Email:") || footer.includes("@astrosivam.com") ? "astrosivam.com" : footer) : "",
    }),
    img,
    logo,
    display: displayFaceFor(display),
    script,
    showLogo,
    reveal: Math.max(0, Math.min(1, reveal)),
  });

  return canvas;
}
