/**
 * Astrosivam Design System · motion
 *
 * Real motion design, not a camera push. Each preset is a set of independent
 * tracks over normalised time:
 *
 *   ground      the field building up
 *   art         the illustration layer arriving (position/scale)
 *   artReveal   the illustration drawing itself on (halo → crest → symbol)
 *   kicker/headline/sub/cta/logo   staggered type entrances
 *   sweep       a light band travelling across the artwork
 *   parallax    depth offset between layers
 *   scale       camera, used sparingly and only where it is in character
 *
 * A frame is a pure function of `t` (0–1 of the clip), so the same code paints
 * the live preview, the recorded export and the contact sheet.
 */

import type { MotionState } from "./compositions";

export type MotionPresetKey =
  | "spiritual"
  | "gold"
  | "cosmic"
  | "festival"
  | "editorial"
  | "minimal"
  | "dynamic";

export interface MotionPreset {
  key: MotionPresetKey;
  name: string;
  note: string;
  /** Total clip length in seconds. */
  seconds: number;
  /** Loop point behaviour: does the clip return to its opening state? */
  loopable: boolean;
  /** Build a full state at normalised time `t`. */
  state: (t: number) => MotionState;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - clamp01(t), 5);
const easeInOut = (t: number) => {
  const v = clamp01(t);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};
/** 0 before `from`, 1 after `to`, eased between. */
const win = (t: number, from: number, to: number, ease = easeOutCubic) => ease(clamp01((t - from) / Math.max(0.0001, to - from)));
/** A soft in-and-out pulse over a window. */
const pulse = (t: number, from: number, to: number) => {
  const mid = (from + to) / 2;
  const v = clamp01((t - from) / Math.max(0.0001, to - from));
  return Math.sin(Math.PI * clamp01(v)) * (t < mid ? 1 : 1);
};

const base: MotionState = {
  ground: 1,
  art: 1,
  artReveal: 1,
  kicker: 1,
  headline: 1,
  sub: 1,
  cta: 1,
  logo: 1,
  sweep: 0,
  parallaxX: 0,
  parallaxY: 0,
  scale: 1,
};

/**
 * Premium Spiritual — the sanctum breathes. Ground fades up, the emblem's halo
 * draws on before its symbol, type rises in three staggered beats, and a slow
 * vertical drift keeps the composition alive without moving the eye.
 */
const spiritual: MotionPreset = {
  key: "spiritual",
  name: "Premium Spiritual",
  note: "Illustration draws on layer by layer, controlled glow, barely-there drift.",
  seconds: 8,
  loopable: false,
  state: (t) => ({
    ...base,
    ground: win(t, 0, 0.22, easeOutCubic),
    artReveal: win(t, 0.08, 0.72, easeOutQuint),
    art: win(t, 0.05, 0.6),
    parallaxY: Math.sin(t * Math.PI * 1.5) * 0.004,
    kicker: win(t, 0.42, 0.62),
    headline: win(t, 0.5, 0.86, easeOutQuint),
    sub: win(t, 0.66, 0.94),
    cta: win(t, 0.74, 0.98),
    logo: win(t, 0.6, 0.84),
    sweep: win(t, 0.82, 1),
    scale: 1 + 0.012 * easeInOut(t),
  }),
};

/**
 * Luxury Gold Reveal — a foil sweep crosses the artwork, then the headline is
 * wiped on from the left while a second, faster glint travels across it.
 */
const gold: MotionPreset = {
  key: "gold",
  name: "Luxury Gold Reveal",
  note: "Gold light sweeps, foil glints, masked typography entrances.",
  seconds: 7,
  loopable: false,
  state: (t) => ({
    ...base,
    ground: win(t, 0, 0.18),
    artReveal: win(t, 0.05, 0.5, easeOutQuint),
    art: win(t, 0.02, 0.4),
    kicker: win(t, 0.3, 0.45),
    headline: win(t, 0.36, 0.72, easeInOut),
    sub: win(t, 0.58, 0.78),
    cta: win(t, 0.66, 0.84),
    logo: win(t, 0.5, 0.68),
    sweep: pulse(t, 0.02, 0.46) > 0 ? win(t, 0.02, 0.46, easeInOut) : win(t, 0.72, 1, easeInOut),
    parallaxX: (t - 0.5) * 0.006,
    scale: 1 + 0.02 * easeInOut(t),
  }),
};

/**
 * Cosmic Motion — continuous orbit. The artwork layer drifts on a parallax orbit
 * while the ground's own orbit bodies stay put, so the two planes separate. The
 * clip loops: position and scale return to the opening frame.
 */
const cosmic: MotionPreset = {
  key: "cosmic",
  name: "Cosmic Motion",
  note: "Orbital parallax, planets drifting, stars building, continuous loop.",
  seconds: 10,
  loopable: true,
  state: (t) => {
    const cycle = Math.sin(t * Math.PI * 2);
    return {
      ...base,
      ground: 1,
      artReveal: win(t, 0.02, 0.4, easeOutQuint),
      art: win(t, 0.0, 0.3),
      parallaxX: cycle * 0.014,
      parallaxY: Math.cos(t * Math.PI * 2) * 0.008,
      kicker: win(t, 0.18, 0.34),
      headline: win(t, 0.24, 0.56, easeOutQuint),
      sub: win(t, 0.42, 0.62),
      cta: win(t, 0.5, 0.7),
      logo: win(t, 0.36, 0.54),
      sweep: 0,
      scale: 1 + 0.016 * Math.sin(t * Math.PI * 2 + Math.PI / 3) * 0.5,
    };
  },
};

/**
 * Festival Celebration — sparks spring outward, decoration draws on, the greeting
 * lands with a small overshoot, and a warm glow pulses twice.
 */
const festival: MotionPreset = {
  key: "festival",
  name: "Festival Celebration",
  note: "Spark bursts, decoration drawing on, greeting with a gentle overshoot.",
  seconds: 6.5,
  loopable: false,
  state: (t) => {
    const overshoot = (v: number) => (v >= 1 ? 1 : 1 + 0.06 * Math.sin(v * Math.PI));
    const head = win(t, 0.22, 0.56, easeOutQuint);
    return {
      ...base,
      ground: win(t, 0, 0.2, easeOutCubic),
      artReveal: win(t, 0.04, 0.64, (v) => easeOutQuint(v)),
      art: win(t, 0.0, 0.45),
      parallaxY: Math.sin(t * Math.PI * 3) * 0.005,
      kicker: win(t, 0.3, 0.46),
      headline: overshoot(head),
      sub: win(t, 0.5, 0.72),
      cta: win(t, 0.6, 0.8),
      logo: win(t, 0.54, 0.72),
      sweep: pulse(t, 0.68, 1) * 0.7,
      scale: 1 + 0.02 * easeInOut(t),
    };
  },
};

/**
 * Editorial Typography — the copy is the event. Lines wipe in from the left on a
 * stagger, the artwork masks in behind them, and there is no camera movement at
 * all: the page simply sets itself.
 */
const editorial: MotionPreset = {
  key: "editorial",
  name: "Editorial Typography",
  note: "Masked line-by-line headline, artwork masked in behind, no camera move.",
  seconds: 6,
  loopable: false,
  state: (t) => ({
    ...base,
    ground: win(t, 0, 0.14),
    artReveal: win(t, 0.06, 0.5, easeOutQuint),
    art: win(t, 0.04, 0.44),
    kicker: win(t, 0.1, 0.24),
    headline: win(t, 0.14, 0.62, easeInOut),
    sub: win(t, 0.44, 0.62),
    cta: win(t, 0.52, 0.7),
    logo: win(t, 0.4, 0.58),
    sweep: 0,
    scale: 1,
  }),
};

/**
 * Elegant Minimal — almost still. One fade, one short rise, one thin rule that
 * grows. Everything else holds.
 */
const minimal: MotionPreset = {
  key: "minimal",
  name: "Elegant Minimal",
  note: "One slow fade, a 1 % rise, a growing hairline. Nothing else moves.",
  seconds: 5.5,
  loopable: false,
  state: (t) => ({
    ...base,
    ground: win(t, 0, 0.3, easeInOut),
    artReveal: win(t, 0.1, 0.62, easeInOut),
    art: win(t, 0.08, 0.55),
    kicker: win(t, 0.24, 0.44),
    headline: win(t, 0.28, 0.7, easeInOut),
    sub: win(t, 0.5, 0.72),
    cta: win(t, 0.56, 0.76),
    logo: win(t, 0.44, 0.64),
    sweep: 0,
    parallaxY: 0.002 * easeInOut(t),
    scale: 1 + 0.008 * easeInOut(t),
  }),
};

/**
 * Dynamic Advertising — hard, quick, coordinated. Elements land in a tight
 * sequence with a snap ease, the background band slides, and the CTA is the last
 * thing to arrive, on purpose.
 */
const dynamic: MotionPreset = {
  key: "dynamic",
  name: "Dynamic Advertising",
  note: "Fast coordinated entrances, band slide, CTA punch-in at the end.",
  seconds: 5,
  loopable: false,
  state: (t) => {
    const snap = (v: number) => 1 - Math.pow(1 - clamp01(v), 4);
    return {
      ...base,
      ground: win(t, 0, 0.12, snap),
      artReveal: win(t, 0.02, 0.42, snap),
      art: win(t, 0.0, 0.34, snap),
      parallaxX: (1 - win(t, 0, 0.3, easeOutCubic)) * 0.03,
      kicker: win(t, 0.12, 0.26, snap),
      headline: win(t, 0.16, 0.46, snap),
      sub: win(t, 0.3, 0.5, snap),
      cta: win(t, 0.46, 0.66, snap),
      logo: win(t, 0.38, 0.54, snap),
      sweep: pulse(t, 0.6, 1),
      scale: 1 + 0.03 * (1 - win(t, 0, 0.5, easeOutCubic)),
    };
  },
};

export const MOTION_PRESETS: MotionPreset[] = [spiritual, gold, cosmic, festival, editorial, minimal, dynamic];

export const MOTION_MAP: Record<string, MotionPreset> = Object.fromEntries(MOTION_PRESETS.map((p) => [p.key, p]));

export const resolveMotion = (key: string | null | undefined): MotionPreset =>
  (key && MOTION_MAP[key]) || MOTION_PRESETS[0];

/** The state of every preset's opening frame — used for the poster thumbnail. */
export const STILL_MOTION: MotionState = { ...base };

/** Which preset suits a composition best, when the engine picks one. */
export const PRESET_FOR_COMPOSITION: Record<string, MotionPresetKey> = {
  "hero-illustration": "spiritual",
  "luxury-editorial": "editorial",
  "circular-mandala": "spiritual",
  "diagonal-dynamic": "dynamic",
  "luxury-framed": "gold",
  "cosmic-astrology": "cosmic",
  "typography-dominant": "editorial",
  "educational-infographic": "editorial",
  "commercial-ad": "dynamic",
  "illustrated-story": "cosmic",
  "collage-asymmetric": "festival",
  "minimal-luxury": "minimal",
  "festival-celebration": "festival",
  "split-panel": "gold",
  "geometric-astrology": "cosmic",
};
