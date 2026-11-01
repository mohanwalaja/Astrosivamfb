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
import { fromLegacyPoster } from "../design/adapters";
import { paintDesign, renderDesign } from "../design/render";
import type { DesignSpec } from "../design/engine";
import type { PosterCopy } from "../design/compositions";

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
  /**
   * Legacy Indic lines. Kept in the type so saved presets still parse, but never
   * painted: the studio is English-only by policy. Anything left in them is
   * dropped before the render.
   */
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
  /**
   * Opt into the v3 design system (default). Set to `false` to paint the
   * original v2 template instead — retained for saved posters and for the
   * legacy regression tests.
   */
  engine?: "design" | "legacy";
  /** A design produced by the design engine; overrides the derived one. */
  design?: DesignSpec;
  /** Motion state for the reel recorder; omitted means the finished poster. */
  motion?: ReturnType<typeof stillMotion>;
}

const stillMotion = () => undefined as never;

/* --------------------------------- fonts ---------------------------------- */

export const DISPLAY_FONTS: Array<{ key: DisplayFontKey; label: string; note: string }> = [
  { key: "cinzel", label: "Cinzel", note: "Brand default — engraved Roman capitals" },
  { key: "cormorant", label: "Cormorant Garamond", note: "High-contrast display serif — luxury and heritage" },
  { key: "playfair", label: "Playfair Display", note: "Editorial serif with sharp hairlines — magazine pages" },
  { key: "inter", label: "Inter Tight", note: "Geometric modern sans — campaigns and guides" },
];

/**
 * Historically the Tamil/Hindi pairings. The studio is English-only, so these now
 * name the *supporting* face only and never paint an Indic line.
 */
export const SCRIPT_FONTS: Array<{ key: ScriptFontKey; label: string; note: string }> = [
  { key: "serif", label: "Serif support", note: "Book-weight secondary text — pairs with every serif headline" },
  { key: "sans", label: "Sans support", note: "Clean geometric secondary text — pairs with Inter Tight" },
  { key: "festive", label: "Rounded support", note: "Softer secondary text for greetings" },
];

/* ------------------------------ compatibility ----------------------------- */

export { TEMPLATES, LAYOUT_TEMPLATE, templateForLayout, layoutForTemplate };
export type { TemplateMeta } from "../types";

/* --------------------------------- render --------------------------------- */

const legacyCopy = (options: PosterOptions): PosterCopy => ({
  kicker: options.kicker ?? "",
  headline: options.headline ?? "",
  // `tamil` / `hindi` are deliberately not read.
  subline: options.subline ?? "",
  cta: options.cta ?? "",
  footer: options.footer
    ? options.footer.includes("Email:") || options.footer.includes("@astrosivam.com")
      ? "astrosivam.com"
      : options.footer
    : "",
});

/** The v3 design a v2 poster maps onto. Exported for the studio and the tools. */
export function designForPoster(options: PosterOptions): DesignSpec {
  if (options.design) return options.design;
  return fromLegacyPoster(
    {
      themeKey: options.themeKey,
      style: options.style,
      layout: options.layout,
      template: options.template,
      display: options.display,
      script: options.script,
      image: options.image,
      imageFit: options.imageFit,
      headline: options.headline,
    },
    0,
  );
}

export async function renderPoster(options: PosterOptions): Promise<HTMLCanvasElement> {
  const { width, height, scale = 1, reveal = 1, showLogo } = options;

  await ensureFonts();

  // The legacy painter is opt-in only; every default render uses the v3 engine.
  if (options.engine === "legacy") {
    return renderLegacy(options);
  }

  const spec = designForPoster(options);
  const motion = options.motion ?? (reveal >= 1 ? undefined : { ...stillReveal(reveal) });
  const canvas = await renderDesign({
    spec,
    copy: legacyCopy(options),
    width,
    height,
    scale,
    showLogo,
    motion,
  });
  void THEMES;
  void TEMPLATE_MAP;
  return canvas;
}

/** A degraded motion state for the v2 `reveal` flag: copy fades, art holds. */
function stillReveal(reveal: number) {
  return {
    ground: 1,
    art: 1,
    artReveal: 1,
    kicker: Math.min(1, reveal * 1.2),
    headline: reveal,
    sub: Math.max(0, reveal * 1.15 - 0.15),
    cta: Math.max(0, reveal * 1.2 - 0.2),
    logo: 1,
    sweep: 0,
    parallaxX: 0,
    parallaxY: 0,
    scale: 1,
  };
}

/** Paint the v3 design into a caller-owned context (used by the reel). */
export function paintPoster(ctx: CanvasRenderingContext2D, options: PosterOptions, motion?: ReturnType<typeof stillReveal>) {
  const spec = designForPoster(options);
  paintDesign(ctx, {
    spec,
    copy: legacyCopy(options),
    width: options.width,
    height: options.height,
    scale: options.scale ?? 1,
    showLogo: options.showLogo,
    motion: (motion ?? stillReveal(options.reveal ?? 1)) as never,
  });
}

/**
 * The original v2 painting path. Only reached when a caller explicitly asks for
 * it; kept so saved posters and the legacy regression suite still render.
 */
async function renderLegacy(options: PosterOptions): Promise<HTMLCanvasElement> {
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
  const theme = THEMES[themeKey] ? themeKey : "midnight";
  const { canvas, ctx } = createCanvas(width, height, scale);

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
      // English-only: the script lines are never painted.
      tamil: tamil ? "" : "",
      hindi: hindi ? "" : "",
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
  });

  return canvas;
}
