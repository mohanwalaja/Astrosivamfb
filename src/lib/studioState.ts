import type { DeityKey } from "../types";
import type { Festival } from "../data/festivals";
import { DEITY_MAP } from "../data/deities";
import type { PosterOptions } from "./poster";
import { resolveTemplate, templateForLayout } from "../data/posterTemplates";
import { englishCopy } from "./englishCopy";
import { BRIEF_MAP, getOccasion, type DesignCategory } from "../data/designBriefs";
import { selectDesign, loadHistory, appendHistory, saveHistory, newSeed } from "./designSelector";

/**
 * The studio owns its state, but other screens need to hand it a finished
 * starting point — "open this festival, preloaded". Rather than lifting the
 * whole studio into a provider (and re-rendering every preview on each
 * keystroke), we pass a one-shot preset through a tiny module store.
 *
 * The same store holds the remembered preset, so a reload comes back to the
 * poster you were working on instead of a blank Ganesha.
 */

export type PosterState = Omit<PosterOptions, "scale" | "reveal">;

export interface StudioPreset {
  /** One field per poster option — everything the studio would otherwise default. */
  state: Partial<PosterState>;
  formatId?: string;
  deityKey?: DeityKey | null;
  /** Shown as a toast when the preset lands, so the jump is never mysterious. */
  note?: string;
}

const PRESET_KEY = "astrosivam:studio-preset:v1";

/* ------------------------------ one-shot hand-off --------------------------- */

let pending: StudioPreset | null = null;

export const requestStudio = (preset: StudioPreset) => {
  // Hand-offs from other screens set a legacy layout and know nothing about
  // templates. Resolve it here so the studio never opens on a mismatched pair.
  preset = { ...preset, state: migrateState(preset.state) };
  if (preset.state.layout && !preset.state.template) {
    preset = { ...preset, state: { ...preset.state, template: templateForLayout(preset.state.layout) } };
  }
  pending = preset;
};

/** Read-and-clear: a preset is applied once, then never again. */
export const consumeStudioPreset = (): StudioPreset | null => {
  const preset = pending;
  pending = null;
  return preset;
};

/**
 * Read without clearing. The studio peeks in its state initialiser (which React
 * is allowed to run twice) and clears in an effect once it has mounted.
 */
export const peekStudioPreset = (): StudioPreset | null => pending;

export const clearStudioPreset = (): void => {
  pending = null;
};

/**
 * Older presets name templates and font pairings from the previous studio set.
 * Map them forward so nothing a client saved opens on a blank or broken card.
 */
export function migrateState<T extends Partial<PosterState>>(state: T): T {
  const next: Partial<PosterState> = { ...englishCopy(state) };
  const template = resolveTemplate(state.template as string | undefined);
  if (state.template && template !== state.template) next.template = template;
  if (state.template && !template) delete next.template;
  const script = state.script as string | undefined;
  if (script === "classic" || script === "rounded") next.script = "serif";
  if (script === "bold") next.script = "festive";
  const display = state.display as string | undefined;
  if (display === "marcellus") next.display = "cormorant";
  if (display === "baloo" || display === "jakarta") next.display = "inter";
  if (next.category && !(next.category in BRIEF_MAP)) delete next.category;
  return next as T;
}

/* ------------------------------- remembered state --------------------------- */

export interface SavedPreset {
  state: PosterState;
  formatId: string;
  deityKey: DeityKey | null;
  savedAt: string;
}

const isBrowser = () => {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
};

export function loadPreset(): SavedPreset | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PRESET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPreset;
    if (!parsed || typeof parsed !== "object" || !parsed.state || typeof parsed.state !== "object") return null;
    // An uploaded image is a blob: URL that dies with the session — never restore a dead one.
    if (typeof parsed.state.image === "string" && parsed.state.image.startsWith("blob:")) {
      parsed.state.image = parsed.deityKey ? DEITY_MAP[parsed.deityKey]?.file ?? null : null;
    }
    return { ...parsed, state: migrateState(parsed.state) };
  } catch {
    return null;
  }
}

export function savePreset(preset: Omit<SavedPreset, "savedAt">): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PRESET_KEY, JSON.stringify({ ...preset, savedAt: new Date().toISOString() }));
  } catch {
    /* quota or private mode — persistence is a convenience, never a blocker */
  }
}

export function clearPreset(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PRESET_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------ festival → poster --------------------------- */

/**
 * The mapping from a festival to a ready poster. Kept in one place so the
 * upcoming-festival card, the festival library and the studio all agree about
 * what "the Deepavali poster" looks like.
 */
export function presetFromFestival(festival: Festival): StudioPreset {
  const name = festival.name.toLowerCase();
  const category: DesignCategory = festival.deity === "murugan" ? "murugan" : "festival";
  const occasionKey = name.includes("pongal") ? "pongal" : name.includes("karthigai") || name.includes("deepam") ? "karthigai" : "deepavali";
  const occasion = getOccasion(category, occasionKey);
  const brief = BRIEF_MAP[category];
  const selection = selectDesign({ category, occasion: occasion.key, width: 1080, height: 1350, headline: festival.headline, subline: festival.subline, seed: newSeed() }, loadHistory());
  saveHistory(appendHistory(loadHistory(), selection, category));
  return {
    formatId: "ig-post", deityKey: null,
    note: `${festival.name} loaded in English — edit anything.`,
    state: {
      category, occasion: occasion.key, themeKey: brief.theme, style: brief.style,
      image: occasion.image ?? brief.image, imageIsLibrary: true, imageFit: "full",
      layout: "full-bleed", template: selection.composition, seed: selection.seed,
      display: brief.display, script: "serif",
      kicker: occasion.copy.kicker, serviceTitle: festival.name, headline: festival.headline,
      tamil: "", hindi: "", subline: festival.subline, facts: occasion.copy.facts,
      cta: occasion.copy.cta, footer: "astrosivam.com", showLogo: true,
    },
  };
}
