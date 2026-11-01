/**
 * Astrosivam Design System · colour
 *
 * Ten campaign palettes, each a complete tonal family rather than a tint of the
 * same gold-on-black. A palette always supplies: a ground pair (`deep`,
 * `deepAlt`), a structural field, a metal ramp (`gold`, `goldSoft`, `goldDeep`),
 * two text weights and a campaign accent.
 *
 * `light` palettes invert the whole engine: grounds become paper, text becomes
 * ink, and every "glow" becomes a shadow. Nothing else in the system hard-codes
 * a colour, so a palette swap recolours a composition without touching its grid.
 */

export type PaletteKey =
  | "maroon-gold"
  | "indigo-cosmos"
  | "emerald-temple"
  | "ivory-sand"
  | "saffron-ember"
  | "violet-astral"
  | "midnight-lagoon"
  | "kumkum-red"
  | "granite-brass"
  | "champagne-slate";

export interface Palette {
  key: PaletteKey;
  name: string;
  note: string;
  /** Deepest ground tone. */
  deep: string;
  /** Ground partner — used for gradients and fields. */
  deepAlt: string;
  /** A structural third tone for bands, panels and diagonal fields. */
  field: string;
  gold: string;
  goldSoft: string;
  goldDeep: string;
  ink: string;
  inkSoft: string;
  accent: string;
  accentSoft: string;
  light: boolean;
  swatch: string[];
}

export const PALETTES: Record<PaletteKey, Palette> = {
  "maroon-gold": {
    key: "maroon-gold",
    name: "Maroon & Antique Gold",
    note: "The heritage flagship — temple maroon under antique gold.",
    deep: "#2A0A0E",
    deepAlt: "#4A1016",
    field: "#67161C",
    gold: "#D9A94F",
    goldSoft: "#F5DFA6",
    goldDeep: "#8A5C18",
    ink: "#FCF3E2",
    inkSoft: "rgba(252,243,226,0.70)",
    accent: "#E2543C",
    accentSoft: "#F7B39A",
    light: false,
    swatch: ["#2A0A0E", "#67161C", "#D9A94F", "#FCF3E2"],
  },
  "indigo-cosmos": {
    key: "indigo-cosmos",
    name: "Cosmic Indigo",
    note: "Deep sky for jathagam, transits and celestial graphics.",
    deep: "#070B1E",
    deepAlt: "#111A3C",
    field: "#1D2A5C",
    gold: "#D8BC77",
    goldSoft: "#F3E4B8",
    goldDeep: "#8C6A2A",
    ink: "#F4F1E6",
    inkSoft: "rgba(244,241,230,0.68)",
    accent: "#7FA7FF",
    accentSoft: "#C3D4FF",
    light: false,
    swatch: ["#070B1E", "#1D2A5C", "#D8BC77", "#F4F1E6"],
  },
  "emerald-temple": {
    key: "emerald-temple",
    name: "Emerald Temple",
    note: "Deep green ground with champagne metal — calm, scholarly.",
    deep: "#04140F",
    deepAlt: "#0A2A20",
    field: "#124035",
    gold: "#DCC07A",
    goldSoft: "#F4E7BE",
    goldDeep: "#8B6E2C",
    ink: "#F2F5EC",
    inkSoft: "rgba(242,245,236,0.68)",
    accent: "#57C4A2",
    accentSoft: "#B7E8D8",
    light: false,
    swatch: ["#04140F", "#124035", "#DCC07A", "#F2F5EC"],
  },
  "ivory-sand": {
    key: "ivory-sand",
    name: "Ivory & Sand",
    note: "Editorial paper: warm ivory ground, dark ink, brass accents.",
    deep: "#FBF5E9",
    deepAlt: "#F1E5CC",
    field: "#E7D7B6",
    gold: "#8E6418",
    goldSoft: "#B98B2C",
    goldDeep: "#5D3F0C",
    ink: "#1A1620",
    inkSoft: "rgba(26,22,32,0.66)",
    accent: "#A8331F",
    accentSoft: "#D9755C",
    light: true,
    swatch: ["#FBF5E9", "#E7D7B6", "#8E6418", "#1A1620"],
  },
  "saffron-ember": {
    key: "saffron-ember",
    name: "Saffron Ember",
    note: "Warm devotional ground for greetings and deity artwork.",
    deep: "#1B0A05",
    deepAlt: "#3E180A",
    field: "#5E2410",
    gold: "#F3B65D",
    goldSoft: "#FFDFA6",
    goldDeep: "#96601A",
    ink: "#FEF4E4",
    inkSoft: "rgba(254,244,228,0.70)",
    accent: "#FF7A3C",
    accentSoft: "#FFC2A0",
    light: false,
    swatch: ["#1B0A05", "#5E2410", "#F3B65D", "#FEF4E4"],
  },
  "violet-astral": {
    key: "violet-astral",
    name: "Violet Astral",
    note: "Deep violet for nakshatra, dasha and abstract astrology.",
    deep: "#0F0720",
    deepAlt: "#211343",
    field: "#362063",
    gold: "#E0C489",
    goldSoft: "#F6E9C6",
    goldDeep: "#91702F",
    ink: "#F6F1F9",
    inkSoft: "rgba(246,241,249,0.68)",
    accent: "#B98BFF",
    accentSoft: "#DCC6FF",
    light: false,
    swatch: ["#0F0720", "#362063", "#E0C489", "#F6F1F9"],
  },
  "midnight-lagoon": {
    key: "midnight-lagoon",
    name: "Midnight Lagoon",
    note: "Teal-blue commercial register — modern, confident.",
    deep: "#03161C",
    deepAlt: "#083340",
    field: "#0D4B5C",
    gold: "#E7CE92",
    goldSoft: "#F8EDCB",
    goldDeep: "#957834",
    ink: "#EFF7F8",
    inkSoft: "rgba(239,247,248,0.68)",
    accent: "#3FD0D8",
    accentSoft: "#AEEBF0",
    light: false,
    swatch: ["#03161C", "#0D4B5C", "#E7CE92", "#EFF7F8"],
  },
  "kumkum-red": {
    key: "kumkum-red",
    name: "Kumkum Red",
    note: "Traditional red with warm gold — auspicious date cards.",
    deep: "#40060B",
    deepAlt: "#7A1218",
    field: "#A31F22",
    gold: "#F0C468",
    goldSoft: "#FFE9B0",
    goldDeep: "#9C6516",
    ink: "#FFF6E8",
    inkSoft: "rgba(255,246,232,0.74)",
    accent: "#FFD166",
    accentSoft: "#FFE9B5",
    light: false,
    swatch: ["#40060B", "#A31F22", "#F0C468", "#FFF6E8"],
  },
  "granite-brass": {
    key: "granite-brass",
    name: "Granite & Brass",
    note: "Temple stone: neutral, architectural, education-friendly.",
    deep: "#16161A",
    deepAlt: "#26262C",
    field: "#3A3A42",
    gold: "#C9A15A",
    goldSoft: "#EEDCB0",
    goldDeep: "#7C5A1F",
    ink: "#F3F1EC",
    inkSoft: "rgba(243,241,236,0.66)",
    accent: "#8FB4C9",
    accentSoft: "#CBE0EC",
    light: false,
    swatch: ["#16161A", "#3A3A42", "#C9A15A", "#F3F1EC"],
  },
  "champagne-slate": {
    key: "champagne-slate",
    name: "Champagne Slate",
    note: "Quiet luxury: slate ink on champagne paper.",
    deep: "#F6EFE2",
    deepAlt: "#EADFCC",
    field: "#D8C7AC",
    gold: "#7A5A20",
    goldSoft: "#A07A32",
    goldDeep: "#4A3410",
    ink: "#20222B",
    inkSoft: "rgba(32,34,43,0.64)",
    accent: "#3C5A78",
    accentSoft: "#7E9CB6",
    light: true,
    swatch: ["#F6EFE2", "#D8C7AC", "#7A5A20", "#20222B"],
  },
};

export const PALETTE_LIST: Palette[] = Object.values(PALETTES);

export const paletteFor = (key: string | null | undefined): Palette =>
  (key && PALETTES[key as PaletteKey]) || PALETTES["maroon-gold"];
