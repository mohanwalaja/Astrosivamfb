/**
 * One global brand-lockup setting for the whole studio: where the mark +
 * wordmark sits on every post, story, wish and ad, and how large it is.
 *
 * The painters never hard-code a corner any more — they ask `brandSpot` /
 * `drawGlobalLockup`, which read this store. It persists in localStorage so a
 * choice made once in Settings applies to every surface and every export, and
 * it publishes changes so open previews re-render immediately.
 */
import { useEffect, useState } from "react";
import type { Theme } from "../types";
import { drawLogoMark } from "./posterKit";

export type BrandPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface BrandPlacementSettings {
  position: BrandPosition;
  /** 0.6 – 1.6 multiplier on each surface's own base lockup size. */
  scale: number;
}

export const BRAND_POSITIONS: { id: BrandPosition; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-center", label: "Top centre" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom centre" },
  { id: "bottom-right", label: "Bottom right" },
];

export const DEFAULT_BRAND_PLACEMENT: BrandPlacementSettings = { position: "top-left", scale: 1 };
export const BRAND_SCALE_MIN = 0.6;
export const BRAND_SCALE_MAX = 1.6;

const STORAGE_KEY = "astrosivam.brand-placement";

const clampScale = (value: unknown): number => {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 1;
  return Math.min(BRAND_SCALE_MAX, Math.max(BRAND_SCALE_MIN, n));
};
const validPosition = (value: unknown): BrandPosition =>
  BRAND_POSITIONS.some((entry) => entry.id === value) ? (value as BrandPosition) : DEFAULT_BRAND_PLACEMENT.position;

let cache: BrandPlacementSettings | null = null;
const listeners = new Set<() => void>();

const readStorage = (): BrandPlacementSettings => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BrandPlacementSettings>;
        if (parsed && typeof parsed === "object") {
          return { position: validPosition(parsed.position), scale: clampScale(parsed.scale) };
        }
      }
    }
  } catch {
    /* private mode / quota — the default placement is always safe */
  }
  return { ...DEFAULT_BRAND_PLACEMENT };
};

/** Current placement; painters call this while drawing. */
export function getBrandPlacement(): BrandPlacementSettings {
  if (!cache) cache = readStorage();
  return cache;
}

/** Save a new placement and notify every subscriber (previews, panels). */
export function setBrandPlacement(next: Partial<BrandPlacementSettings>): BrandPlacementSettings {
  const current = getBrandPlacement();
  const merged: BrandPlacementSettings = {
    position: next.position !== undefined ? validPosition(next.position) : current.position,
    scale: next.scale !== undefined ? clampScale(next.scale) : current.scale,
  };
  cache = merged;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  } catch {
    /* persistence is a convenience, never a blocker */
  }
  listeners.forEach((listener) => listener());
  return merged;
}

export function subscribeBrandPlacement(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Bumps a counter on every placement change — put it in render-effect deps. */
export function useBrandPlacementVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeBrandPlacement(() => setVersion((value) => value + 1)), []);
  return version;
}

/** The scaled lockup size for a surface whose design size is `base`. */
export function brandSize(base: number): number {
  return base * getBrandPlacement().scale;
}

export interface BrandSpotOptions {
  /** Chrome the lockup must clear: story/reel UI bands, toran, header bars. */
  topBand?: number;
  bottomBand?: number;
  pad?: number;
  /** Pin the vertical position (header bars, brand rows) — horizontal still follows the setting. */
  lockY?: number;
}

export interface BrandSpot {
  x: number;
  y: number;
  align: "left" | "center" | "right";
}

/** Where the lockup's top-left/centre/right anchor lands on a W × H canvas. */
export function brandSpot(W: number, H: number, size: number, options: BrandSpotOptions = {}): BrandSpot {
  const { position } = getBrandPlacement();
  const pad = options.pad ?? W * 0.07;
  const align: BrandSpot["align"] = position.endsWith("left")
    ? "left"
    : position.endsWith("right")
      ? "right"
      : "center";
  const x = align === "left" ? pad : align === "right" ? W - pad : W / 2;
  const top = position.startsWith("top");
  const y =
    options.lockY ?? (top ? (options.topBand ?? 0) + size * 0.3 : H - (options.bottomBand ?? 0) - size * 1.3);
  return { x, y, align };
}

/**
 * Draw the mark + wordmark at the globally configured spot. Returns the drawn
 * width so neighbours (kickers, labels) can sit clear of it.
 */
export function drawGlobalLockup(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  options: BrandSpotOptions & { W: number; H: number; theme: Theme; baseSize: number; label?: string; opacity?: number },
): number {
  const size = brandSize(options.baseSize);
  const spot = brandSpot(options.W, options.H, size, options);
  return drawLogoMark(ctx, logo, {
    x: spot.x,
    y: spot.y,
    size,
    align: spot.align,
    theme: options.theme,
    variant: "wordmark",
    label: options.label,
    opacity: options.opacity,
  });
}
