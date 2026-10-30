/**
 * ASTRO SIVAM — interface design tokens
 * ------------------------------------
 * One source of truth for the studio chrome. The values mirror the CSS custom
 * properties in `src/index.css`; the interface never hard-codes a colour that is
 * not declared here.
 *
 * The palette is deliberately five families:
 *   deep maroon · antique gold · champagne gold · warm ivory · charcoal
 *
 * Brand artwork (canvas templates, poster themes) keeps its own palettes — this
 * file governs the interface around the artwork, not the artwork itself.
 */

export const PALETTE = {
  maroon: {
    950: "#24060F",
    900: "#310915",
    800: "#3F0C1C",
    700: "#4D1023",
    600: "#5E162C",
    500: "#75203A",
  },
  gold: {
    700: "#8A6423",
    600: "#A87C2C",
    500: "#C79A3C",
    400: "#D8B164",
  },
  champagne: {
    400: "#E3CA99",
    300: "#EDDCB8",
    200: "#F4E8CF",
    100: "#FAF2E2",
  },
  ivory: {
    100: "#FBF5E9",
    200: "#F7F1E4",
    300: "#DCCFBA",
    400: "#B4A58F",
    500: "#A2937D",
    600: "#948772",
  },
  charcoal: {
    950: "#100B0C",
    900: "#161011",
    850: "#191314",
    800: "#1D1618",
    750: "#241C1E",
    700: "#2B2224",
    600: "#372C2F",
  },
} as const;

/** Semantic tokens — what components should reference, never raw palette keys. */
export const SEMANTIC = {
  bg: PALETTE.charcoal[900],
  bgElevated: PALETTE.charcoal[850],
  surface: PALETTE.charcoal[800],
  surfaceRaised: PALETTE.charcoal[750],
  surfaceInset: PALETTE.charcoal[950],
  maroon: PALETTE.maroon[700],
  maroonDeep: PALETTE.maroon[900],
  gold: PALETTE.gold[500],
  goldSoft: PALETTE.gold[400],
  champagne: PALETTE.champagne[300],
  champagneDeep: PALETTE.champagne[400],
  ivory: PALETTE.ivory[200],
  text: PALETTE.ivory[200],
  textSecondary: PALETTE.ivory[300],
  textMuted: PALETTE.ivory[400],
  textSubtle: PALETTE.ivory[500],
  textFaint: PALETTE.ivory[600],
  lineSoft: "rgba(231, 206, 164, 0.08)",
  line: "rgba(231, 206, 164, 0.14)",
  lineStrong: "rgba(231, 206, 164, 0.28)",
  success: "#8FBFA5",
  warning: "#D08A5A",
  danger: "#D8826F",
  info: "#9DB3D4",
} as const;

/** 8-point spacing rhythm, exposed for documentation and inline layout maths. */
export const SPACE = {
  "3xs": "2px",
  "2xs": "4px",
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
  "4xl": "96px",
} as const;

export const RADIUS = {
  xs: "6px",
  sm: "9px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "26px",
  pill: "999px",
} as const;

export const TYPE_SCALE = {
  hero: { size: "clamp(30px, 4vw, 46px)", lineHeight: "1.08", family: "display", tracking: "-0.012em" },
  title: { size: "clamp(24px, 2.6vw, 34px)", lineHeight: "1.14", family: "display", tracking: "-0.008em" },
  section: { size: "18px", lineHeight: "1.25", family: "display", tracking: "0" },
  cardTitle: { size: "15px", lineHeight: "1.3", family: "display", tracking: "0.002em" },
  body: { size: "13.5px", lineHeight: "1.7", family: "sans", tracking: "0" },
  small: { size: "12px", lineHeight: "1.6", family: "sans", tracking: "0" },
  caption: { size: "10.5px", lineHeight: "1.45", family: "sans", tracking: "0.06em" },
  eyebrow: { size: "10.5px", lineHeight: "1.4", family: "sans", tracking: "0.22em" },
} as const;

export const SHADOW = {
  card: "inset 0 1px 0 rgba(250, 242, 226, 0.045), 0 24px 56px -46px rgba(0, 0, 0, 0.95)",
  raised: "inset 0 1px 0 rgba(250, 242, 226, 0.06), 0 30px 70px -40px rgba(0, 0, 0, 0.9)",
  modal: "0 40px 120px -32px rgba(0, 0, 0, 0.92)",
  gold: "0 12px 28px -16px rgba(199, 154, 60, 0.55)",
} as const;

export const MOTION = {
  fast: "140ms",
  base: "220ms",
  slow: "480ms",
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

/** Pairs audited by `tests/design-system.test.ts`. All are ≥ 4.5:1. */
export const TEXT_CONTRAST_PAIRS = [
  { name: "Body ivory on charcoal", fg: PALETTE.ivory[200], bg: PALETTE.charcoal[900], min: 4.5 },
  { name: "Secondary ivory on card", fg: PALETTE.ivory[300], bg: PALETTE.charcoal[800], min: 4.5 },
  { name: "Muted ivory on card", fg: PALETTE.ivory[400], bg: PALETTE.charcoal[800], min: 4.5 },
  { name: "Subtle ivory on card", fg: PALETTE.ivory[500], bg: PALETTE.charcoal[800], min: 4.5 },
  { name: "Faint ivory on card", fg: PALETTE.ivory[600], bg: PALETTE.charcoal[800], min: 4.5 },
  { name: "Subtle ivory on maroon", fg: PALETTE.ivory[500], bg: PALETTE.maroon[700], min: 4.5 },
  { name: "Champagne on maroon", fg: PALETTE.champagne[300], bg: PALETTE.maroon[700], min: 4.5 },
  { name: "Antique gold on card", fg: PALETTE.gold[500], bg: PALETTE.charcoal[800], min: 4.5 },
  { name: "Button ink on antique gold", fg: "#241706", bg: PALETTE.gold[500], min: 4.5 },
  { name: "Button ink on champagne", fg: "#241706", bg: PALETTE.champagne[400], min: 4.5 },
] as const;

/** Relative luminance (WCAG 2.2) for a 6-digit hex colour. */
export function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG contrast ratio between two 6-digit hex colours. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}
