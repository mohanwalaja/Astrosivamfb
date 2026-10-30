import type { Festival } from "../data/festivals";
import { FESTIVALS } from "../data/festivals";
import type { DisplayFontKey, ScriptFontKey, ThemeKey } from "../types";
import type { DownloadFile } from "../types";
import { canvasToBytes, canvasToBytesAndRelease, exportFileName } from "./export";
import { CARD_FORMATS, renderFestivalCard, type BrandLockupSettings, type CardFormat, type CardLanguage, type FestivalStyle, type LogoPlacement, type PictureSettings } from "./festivalCreative";
import { captionWarnings, festivalArt, festivalCaptions, festivalCopy, festivalDateView, skinFor, type FestivalDateView } from "./festivalKit";

/**
 * ZIP contents for the festival surfaces. The same builder feeds the Festival
 * Wishes tab and the Export Center, so a downloaded pack is identical wherever
 * it is started from.
 */

export interface FestivalPackConfig {
  style: FestivalStyle;
  language: CardLanguage;
  format: CardFormat;
  /** null = use the style's own palette seeded by the festival. */
  theme: ThemeKey | null;
  display: DisplayFontKey | null;
  script: ScriptFontKey | null;
  logo: LogoPlacement | null;
  brandLockup?: BrandLockupSettings;
  /** A user-uploaded data URL; overrides the bundled deity art. */
  artOverride: string | null;
  pictureSettings?: PictureSettings;
  year: number | "next";
}

export const DEFAULT_PACK: FestivalPackConfig = {
  style: "traditional",
  language: "trilingual",
  format: "ig-post",
  theme: null,
  display: null,
  script: null,
  logo: null,
  artOverride: null,
  year: "next",
};

function packTheme(festival: Festival, config: FestivalPackConfig, format: CardFormat): ThemeKey {
  const skin = skinFor(config.style, festival, format);
  return config.theme ?? skin.theme;
}

export function captionFileText(festival: Festival, date: FestivalDateView, page: { facebook: string; instagram: string }): string {
  return [
    `${festival.name} · ${festival.tamil} · ${festival.hindi}`,
    `Verified date: ${date.label ?? "not on file"}${date.confidence ? ` (${date.confidence})` : ""}`,
    `Traditional: ${festival.when}`,
    "",
    "FACEBOOK",
    page.facebook,
    "",
    "INSTAGRAM",
    page.instagram,
    "",
    "TAMIL WISH",
    festival.wish.ta,
    "",
    "HINDI WISH",
    festival.wish.hi,
    "",
    "HASHTAGS",
    festival.hashtags.join(" "),
  ].join("\n");
}

export async function festivalPackFiles(
  festival: Festival,
  config: FestivalPackConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<{ files: DownloadFile[]; warnings: string[] }> {
  const date = festivalDateView(festival.id, config.year === "next" ? undefined : config.year);
  const copy = festivalCopy(festival, date);
  const skin = skinFor(config.style, festival, config.format);
  const files: DownloadFile[] = [];
  const warnings: string[] = [];

  for (const [index, format] of CARD_FORMATS.entries()) {
    const out = await renderFestivalCard({
      style: config.style,
      format: format.key,
      theme: packTheme(festival, config, format.key),
      display: config.display ?? skin.display,
      script: config.script ?? skin.script,
      logo: config.logo ?? skinFor(config.style, festival, format.key).logo,
      brandLockup: config.brandLockup,
      language: config.language,
      copy,
      art: config.artOverride ?? festivalArt(festival),
      pictureSettings: config.pictureSettings,
    });
    warnings.push(...out.warnings);
    files.push({
      name: `${exportFileName([festival.name, config.style])}_${format.width}x${format.height}.png`,
      data: await canvasToBytesAndRelease(out.canvas),
    });
    onProgress?.(index + 1, CARD_FORMATS.length + 1);
  }

  const captions = festivalCaptions(festival, {
    date,
    language: config.language,
    dateLine: date.label ?? festival.when,
  });
  warnings.push(...captionWarnings(captions));
  files.push({
    name: "CAPTIONS.txt",
    data: new TextEncoder().encode(captionFileText(festival, date, captions)),
  });
  // The last step still reports, so the progress bar reaches 100% instead of stopping at 4/5.
  onProgress?.(files.length, CARD_FORMATS.length + 1);
  return { files, warnings };
}

/** One card per festival, for the year pack. */
export async function festivalYearFiles(
  config: FestivalPackConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<{ files: DownloadFile[]; warnings: string[]; undated: string[] }> {
  const files: DownloadFile[] = [];
  const warnings: string[] = [];
  const undated: string[] = [];

  for (const [index, festival] of FESTIVALS.entries()) {
    const date = festivalDateView(festival.id, config.year === "next" ? undefined : config.year);
    if (!date.label) undated.push(festival.name);
    const copy = festivalCopy(festival, date);
    const skin = skinFor(config.style, festival, "ig-post");
    const out = await renderFestivalCard({
      style: config.style,
      format: "ig-post",
      theme: config.theme ?? skin.theme,
      display: config.display ?? skin.display,
      script: config.script ?? skin.script,
      logo: config.logo ?? skin.logo,
      brandLockup: config.brandLockup,
      language: config.language,
      copy,
      art: festivalArt(festival),
    });
    warnings.push(...out.warnings);
    files.push({
      name: `${String(index + 1).padStart(2, "0")}_${exportFileName([festival.id, festival.name])}.png`,
      data: await canvasToBytesAndRelease(out.canvas),
    });
    onProgress?.(index + 1, FESTIVALS.length + 1);
  }

  const calendar = [
    "# Astro Sivam — festival wishes",
    "",
    `Style: ${config.style} · Language: ${config.language}`,
    "Dates come from the verified calendar only; anything without one says so.",
    "",
    ...FESTIVALS.map((festival) => {
      const date = festivalDateView(festival.id, config.year === "next" ? undefined : config.year);
      const when = date.label
        ? `${date.label}${date.confidence === "provisional" ? " (provisional — confirm on the panchang)" : ""}`
        : `No civil date on file — ${festival.when}`;
      return `## ${festival.name}\n\n${when}\n\n${festival.wish.en}\n\nTamil: ${festival.greetingTa}\n\nHindi: ${festival.greetingHi}\n\nTags: ${festival.hashtags.join(" ")}\n`;
    }),
  ].join("\n");
  files.push({ name: "FESTIVAL-CALENDAR.md", data: new TextEncoder().encode(calendar) });
  onProgress?.(files.length, FESTIVALS.length + 1);
  return { files, warnings, undated };
}
