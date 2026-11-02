import { COMPOSITION_MAP, getOccasion, resolveCategory, type CompositionKey, type DesignCategory } from "../data/designBriefs";

export interface Box { x: number; y: number; w: number; h: number }
export type PosterFormat = "portrait" | "square" | "landscape" | "story";
export type SceneLayer = "background" | "art" | "effects" | "type" | "brand";
export interface CompositionPlan {
  key: CompositionKey;
  category: DesignCategory;
  W: number; H: number;
  format: PosterFormat;
  safe: Box;
  unit: number;
  seed: number;
  art: Box;
  artShape: "rect" | "circle" | "arch" | "diagonal";
  artRotation: number;
  title: Box;
  service: Box;
  kicker: Box;
  body: Box;
  cta: Box;
  logo: Box;
  footer: Box;
  facts: Box[];
  align: "left" | "center" | "right";
  logoAlign: "left" | "center" | "right";
  ctaAlign: "left" | "center" | "right";
  scrim: "bottom" | "left" | "none";
  motif: ReturnType<typeof getOccasion>["motif"];
}
export interface PlanInput {
  key: CompositionKey;
  category?: DesignCategory;
  occasion?: string;
  width: number; height: number;
  seed?: number;
  hasArtwork?: boolean;
  contentLength?: number;
}
export const formatFor = (W: number, H: number): PosterFormat => {
  const ratio = W / H;
  return ratio > 1.15 ? "landscape" : ratio < 0.62 ? "story" : ratio < 0.9 ? "portrait" : "square";
};

/**
 * Pure, measurable composition plans. These are deliberately not a shared
 * header/art/body/footer skeleton. Each family owns its own geometry; common
 * helpers only enforce the platform safe area and coordinate conversion.
 * A palette or style change cannot enter this function and move the grid.
 */
export function planComposition(input: PlanInput): CompositionPlan {
  const { width: W, height: H, key } = input;
  if (!(W > 0 && H > 0 && Number.isFinite(W + H))) throw new Error("A poster needs positive, finite dimensions.");
  const format = formatFor(W, H);
  const wide = format === "landscape";
  const m = Math.min(W, H) * 0.065;
  const top = format === "story" ? H * 0.135 : wide ? H * 0.085 : H * 0.065;
  const bottom = format === "story" ? H * 0.17 : wide ? H * 0.085 : H * 0.065;
  const safe = { x: m, y: top, w: W - m * 2, h: H - top - bottom };
  const b = (x: number, y: number, w: number, h: number): Box => ({ x: safe.x + x * safe.w, y: safe.y + y * safe.h, w: w * safe.w, h: h * safe.h });
  const full = (x: number, y: number, w: number, h: number): Box => ({ x: x * W, y: y * H, w: w * W, h: h * H });
  const category = resolveCategory(input.category);
  const seed = input.seed ?? 1;
  const plan: CompositionPlan = {
    key, category, W, H, format, safe, unit: W, seed,
    art: b(.2, .2, .6, .4), artShape: "rect", artRotation: 0,
    title: b(0, .2, .8, .25), service: b(0, .08, .7, .05), kicker: b(0, .145, .7, .04),
    body: b(0, .5, .65, .16), cta: b(0, .86, .42, .07), logo: b(0, 0, .34, .06),
    footer: b(.55, .965, .45, .035), facts: [], align: "left", logoAlign: "left", ctaAlign: "left",
    scrim: "none", motif: getOccasion(category, input.occasion).motif,
  };
  const set = (values: Partial<CompositionPlan>) => Object.assign(plan, values);
  switch (key) {
    case "hero":
      set({ art: full(0, 0, 1, 1), artShape: "rect", scrim: wide ? "left" : "bottom",
        title: b(0, wide ? .27 : .52, wide ? .46 : .94, .22),
        service: b(0, wide ? .16 : .38, wide ? .44 : .75, .05), kicker: b(0, wide ? .22 : .46, wide ? .44 : .8, .035),
        body: b(0, wide ? .50 : .76, wide ? .43 : .85, wide ? .30 : .14), cta: b(0, .91, wide ? .4 : .55, .065),
        logo: b(wide ? 0 : .64, 0, .36, .06), logoAlign: wide ? "left" : "right", footer: b(.55, .965, .45, .035) });
      break;
    case "editorial":
      set({ art: b(wide ? .76 : .68, wide ? .28 : .60, wide ? .24 : .32, wide ? .48 : .27), artShape: "rect",
        title: b(0, wide ? .25 : .19, wide ? .70 : .98, wide ? .20 : .34), service: b(0, wide ? .035 : .075, .65, wide ? .09 : .05), kicker: b(0, wide ? .14 : .145, .7, wide ? .09 : .035),
        body: b(0, wide ? .48 : .57, wide ? .57 : .59, wide ? .29 : .22), cta: b(0, wide ? .78 : .86, wide ? .48 : .56, .07),
        logo: b(0, 0, .36, .06), footer: b(.57, .965, .43, .035) });
      break;
    case "asymmetric":
      set({ art: full(0, 0, wide ? .46 : .48, wide ? 1 : .79), artShape: "rect",
        title: b(wide ? .53 : .52, .27, wide ? .47 : .48, .30),
        service: b(.52, .12, .48, .065), kicker: b(.52, .21, .48, .045),
        body: b(.52, wide ? .58 : .59, .48, wide ? .28 : .25), cta: b(.52, .86, .48, .07),
        logo: b(.62, 0, .38, .06), logoAlign: "right", footer: b(.52, .965, .48, .035), align: "left" });
      break;
    case "mandala":
      set({ art: wide ? b(.02, .16, .39, .70) : b(.17, .245, .66, wide ? .6 : .46), artShape: "circle",
        title: b(wide ? .52 : .03, wide ? .24 : .105, wide ? .48 : .94, wide ? .25 : .13),
        service: b(wide ? .52 : .15, wide ? .12 : .055, wide ? .48 : .70, .045),
        kicker: b(wide ? .52 : .1, wide ? .19 : .0, wide ? .48 : .8, .04),
        body: b(wide ? .52 : .10, wide ? .52 : .745, wide ? .46 : .8, wide ? .30 : .17),
        cta: b(wide ? .52 : .22, .90, wide ? .46 : .56, .065),
        logo: b(wide ? .64 : 0, 0, .36, .055), logoAlign: wide ? "right" : "left",
        footer: b(.58, .965, .42, .035), align: wide ? "left" : "center", ctaAlign: wide ? "left" : "center" });
      break;
    case "diagonal":
      set({ art: full(wide ? .48 : .24, 0, wide ? .52 : .76, wide ? 1 : .57), artShape: "diagonal",
        title: b(0, wide ? .27 : .50, wide ? .46 : .88, .22),
        service: b(0, wide ? .14 : .075, wide ? .43 : .55, .05), kicker: b(0, wide ? .21 : .13, wide ? .43 : .5, .04),
        body: b(0, wide ? .52 : .755, wide ? .43 : .82, wide ? .28 : .13), cta: b(0, .9, wide ? .42 : .6, .065),
        logo: b(0, 0, .35, .055), footer: b(.56, .965, .44, .035) });
      break;
    case "cosmic":
      set({ art: wide ? b(.53, .12, .47, .75) : b(.34, .30, .66, .43), artShape: "circle",
        title: b(0, .17, wide ? .49 : .88, .23), service: b(0, .075, .65, .05), kicker: b(0, .135, .65, .035),
        body: b(0, wide ? .48 : .70, wide ? .44 : .60, wide ? .30 : .20), cta: b(0, .89, wide ? .44 : .58, .07),
        logo: b(.64, 0, .36, .06), logoAlign: "right", footer: b(.58, .965, .42, .035) });
      break;
    case "split":
      set({ art: wide ? full(.52, 0, .48, 1) : full(0, 0, 1, .43), artShape: "rect",
        title: b(0, wide ? .27 : .54, wide ? .47 : .94, wide ? .18 : .14),
        service: b(0, wide ? .14 : .44, wide ? .46 : .8, wide ? .045 : .045), kicker: b(0, wide ? .21 : .49, wide ? .46 : .8, wide ? .03 : .04),
        body: b(0, wide ? .48 : .75, wide ? .45 : .87, wide ? .27 : .15), cta: b(0, wide ? .9 : .925, wide ? .44 : .62, .065),
        logo: b(0, 0, .36, .055), footer: b(.57, .965, .43, .035) });
      break;
    case "story":
      set({ art: b(wide ? .53 : .025, wide ? .08 : .055, wide ? .47 : .95, wide ? .76 : .43), artShape: "arch",
        title: b(0, wide ? .28 : .555, wide ? .47 : .94, .19),
        service: b(0, wide ? .15 : .505, wide ? .46 : .85, .045), kicker: b(0, wide ? .22 : .0, wide ? .46 : .65, .04),
        body: b(0, wide ? .52 : .775, wide ? .46 : .88, .12), cta: b(0, .915, wide ? .46 : .65, .06),
        logo: b(wide ? 0 : .65, 0, .35, .05), logoAlign: wide ? "left" : "right", footer: b(.58, .965, .42, .035) });
      break;
    case "minimal":
      set({ art: wide ? b(.015, .24, .22, .46) : b(.39, .14, .22, .17), artShape: "circle",
        title: b(wide ? .29 : .06, wide ? .27 : .365, wide ? .68 : .88, .24),
        service: b(wide ? .29 : .15, wide ? .13 : .065, wide ? .68 : .7, .05), kicker: b(wide ? .29 : .15, wide ? .20 : .0, wide ? .68 : .7, .04),
        body: b(wide ? .32 : .15, wide ? .56 : .65, wide ? .62 : .7, wide ? .24 : .17),
        cta: b(wide ? .34 : .23, .875, wide ? .58 : .54, .065),
        logo: b(.32, .965, .36, .035), logoAlign: "center", footer: b(.70, .97, .30, .03),
        align: "center", ctaAlign: "center" });
      break;
    case "infographic":
      set({ art: b(wide ? .02 : .77, wide ? .72 : .075, wide ? .20 : .23, wide ? .20 : .19), artShape: "circle",
        title: b(0, .14, wide ? .48 : .72, .20), service: b(0, .065, .7, .045), kicker: b(0, .0, .65, .04),
        body: b(0, wide ? .36 : .35, wide ? .46 : .94, wide ? .38 : .12),
        facts: wide ? [b(.53, .18, .47, .20), b(.53, .40, .47, .20), b(.53, .62, .47, .20)] : [b(0, .50, 1, .095), b(0, .615, 1, .095), b(0, .73, 1, .095)],
        cta: b(0, .89, wide ? .47 : .63, .07),
        logo: b(wide ? .25 : .65, 0, .35, .05), logoAlign: "right", footer: b(0, .965, .55, .035) });
      break;
    case "collage":
      set({ art: b(wide ? .53 : .075, wide ? .08 : .07, wide ? .43 : .73, wide ? .67 : .43), artShape: "rect", artRotation: wide ? .035 : -.045,
        title: b(wide ? 0 : .10, wide ? .27 : .46, wide ? .48 : .86, .22),
        service: b(0, .075, .6, .05), kicker: b(0, .145, .55, .04),
        body: b(0, wide ? .52 : .72, wide ? .45 : .80, wide ? .28 : .17), cta: b(wide ? 0 : .30, .9, wide ? .44 : .65, .065),
        logo: b(.64, 0, .36, .055), logoAlign: "right", footer: b(0, .965, .48, .035) });
      break;
    case "devotional":
      set({ art: wide ? full(.48, 0, .52, 1) : full(0, .235, 1, .34), artShape: "rect",
        title: b(wide ? 0 : .04, wide ? .28 : .59, wide ? .46 : .92, wide ? .18 : .14),
        service: b(wide ? 0 : .12, wide ? .14 : .075, wide ? .46 : .76, .05), kicker: b(wide ? 0 : .1, wide ? .21 : .14, wide ? .46 : .8, .04),
        body: b(wide ? 0 : .10, wide ? .52 : .75, wide ? .44 : .8, wide ? .28 : .14), cta: b(wide ? 0 : .18, .92, wide ? .44 : .64, .055),
        logo: b(wide ? 0 : .65, 0, .35, .055), logoAlign: wide ? "left" : "right", footer: b(.58, .975, .42, .025),
        align: wide ? "left" : "center", ctaAlign: wide ? "left" : "center" });
      break;
  }
  // Readability constraints are applied after the family grid, so every format
  // keeps the same composition but never shrinks labels below the mobile floor.
  plan.footer.h = Math.max(plan.footer.h, W * 0.035);
  plan.footer.y = safe.y + safe.h - plan.footer.h;
  plan.footer.x = safe.x + safe.w * 0.70; plan.footer.w = safe.w * 0.30;
  plan.cta.h = Math.max(plan.cta.h, W * 0.065);
  const sharesFooterBand = plan.cta.x < plan.footer.x + plan.footer.w && plan.cta.x + plan.cta.w > plan.footer.x;
  const ctaLimit = sharesFooterBand ? plan.footer.y - plan.cta.h - safe.h * 0.012 : safe.y + safe.h - plan.cta.h;
  plan.cta.y = Math.min(plan.cta.y, ctaLimit);

  const gap = safe.h * (wide ? 0.008 : 0.012);
  plan.service.h = Math.max(plan.service.h, W * 0.045);
  plan.kicker.h = Math.max(plan.kicker.h, W * 0.04);
  if (wide) {
    // Landscape has one short vertical budget: stack the two labels tightly,
    // then give the headline and body the remaining measured space.
    plan.service.y = safe.y;
    plan.kicker.y = plan.service.y + plan.service.h + gap;
    plan.title.y = plan.kicker.y + plan.kicker.h + gap;
    plan.title.h = Math.max(plan.title.h, W * 0.11);
    plan.body.y = plan.title.y + plan.title.h + gap;
    plan.body.h = Math.max(0, plan.cta.y - plan.body.y - gap);
  } else {
    if (plan.kicker.y >= plan.service.y - 1) plan.kicker.y = Math.max(plan.kicker.y, plan.service.y + plan.service.h + gap);
    const labelsBottom = Math.max(plan.service.y + plan.service.h, plan.kicker.y + plan.kicker.h);
    plan.title.y = Math.max(plan.title.y, labelsBottom + gap);
    if (plan.title.y + plan.title.h > plan.body.y - gap) {
      plan.body.y = plan.title.y + plan.title.h + gap;
      plan.body.h = Math.max(0, plan.cta.y - plan.body.y - gap);
    }
    plan.body.h = Math.min(plan.body.h, Math.max(0, plan.cta.y - plan.body.y - gap));
  }
  // Seed changes focal point, never the selected grid. The caller chooses a new
  // composition explicitly through the scored selector, not by random decoration.
  if (seed % 2 === 0 && key === "collage") plan.artRotation *= -1;
  if (!COMPOSITION_MAP[key]) throw new Error(`Unknown composition: ${key}`);
  return plan;
}

export const boxCenter = (box: Box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
export const containsBox = (outer: Box, inner: Box, tolerance = 1) => inner.x >= outer.x - tolerance && inner.y >= outer.y - tolerance && inner.x + inner.w <= outer.x + outer.w + tolerance && inner.y + inner.h <= outer.y + outer.h + tolerance;
export const boxesOverlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
export const planSignature = (plan: CompositionPlan) => {
  const n = (v: number, size: number) => Math.round(v / size * 100);
  return [plan.key, ...[plan.art, plan.title, plan.body, plan.cta, plan.logo].flatMap((r) => [n(r.x, plan.W), n(r.y, plan.H), n(r.w, plan.W), n(r.h, plan.H)])].join(":");
};
