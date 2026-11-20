import type { DisplayFontKey, StyleKey, ThemeKey } from "../types";
import { BRIEF_MAP, getOccasion, type CompositionKey, type DesignCategory } from "../data/designBriefs";
import { ensureFonts } from "./canvas";
import { renderComposition } from "./compositionRender";
import { englishCopy } from "./englishCopy";

/**
 * Poster rendering entry point (composition engine only).
 *
 * The former Poster Studio UI and its legacy template painters were removed;
 * the twelve composition systems in `compositionPlan`/`compositionRender` are
 * now the single poster engine, used by the Plain-words campaign and the
 * poster tools. Copy is English-only: Tamil/Hindi fields are stripped by
 * `englishCopy` before anything reaches the canvas.
 */
export interface PosterOptions {
  width: number;
  height: number;
  themeKey: ThemeKey;
  style: StyleKey;
  /** Composition system. Defaults to `split` when a caller does not choose one. */
  template?: CompositionKey;
  display: DisplayFontKey;
  image?: string | null;
  kicker: string;
  headline: string;
  subline: string;
  cta: string;
  footer: string;
  showLogo: boolean;
  scale?: number;
  /** Composition engine brief. */
  category?: DesignCategory;
  occasion?: string;
  serviceTitle?: string;
  facts?: string[];
  seed?: number;
  imageIsLibrary?: boolean;
  useGlobalBrandPlacement?: boolean;
}

export async function renderPoster(options: PosterOptions): Promise<HTMLCanvasElement> {
  const {
    width,
    height,
    themeKey,
    style,
    template = "split",
    display,
    image,
    kicker,
    headline,
    subline,
    cta,
    footer,
    showLogo,
    scale = 1,
  } = options;

  await ensureFonts();
  const category = options.category ?? "birth";
  const brief = BRIEF_MAP[category];
  const occasion = getOccasion(category, options.occasion);
  return renderComposition({
    width, height, composition: template, category, occasion: occasion.key,
    themeKey, style, display, image: image === undefined ? (occasion.image ?? brief.image) : image,
    imageIsLibrary: options.imageIsLibrary, showLogo, seed: options.seed, scale,
    useGlobalBrandPlacement: options.useGlobalBrandPlacement,
    copy: englishCopy({ kicker, headline, subline, cta, footer, serviceTitle: options.serviceTitle ?? kicker, facts: options.facts ?? occasion.copy.facts, tamil: "", hindi: "" }),
  });
}
