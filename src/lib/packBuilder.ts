import { FORMAT_MAP } from "../data/formats";
import { IG_HIGHLIGHTS } from "../data/instagram";
import { getService } from "../data/services";
import type { CreativeContent, DownloadFile, Service, StyleKey, ThemeKey } from "../types";
import { canvasToBytes, canvasToBytesAndRelease, exportFileName } from "./export";
import { fullIgCaption, fullPackMarkdown, igCaption, serviceMarkdown } from "./pack";
import { defaultContent, renderCreative } from "./templates";

/** The brand pack's fixed contents, in ZIP order. */
export const BRAND_FORMAT_IDS = ["fb-profile", "ig-profile", "fb-cover", "fb-cover-statement", "link-card", "style-sheet"];
/** The service pack's fixed contents, in ZIP order. */
export const SERVICE_FORMAT_IDS = [
  "fb-post",
  "ig-post",
  "ig-square",
  "fb-story",
  "ig-story",
  "ig-reel-cover",
  "panchangam-card",
  "quote-card",
  "offer-card",
  "review-card",
];

const encoder = new TextEncoder();

/* ------------------------------ file naming ------------------------------- */
/*
 * Every image name carries the format id as well as its pixels. Sizes alone are
 * ambiguous — fb-post/ig-square are both 1200x1500, and ig-story, fb-story and
 * ig-reel-cover are all 1080x1920 — so a size-only name put two or three files
 * under the same name in one ZIP and extractors silently kept the first.
 */

export const brandImageFileName = (formatId: string): string => {
  const format = FORMAT_MAP[formatId];
  return `${exportFileName([format.label, formatId])}_${format.width}x${format.height}.png`;
};

export const highlightFileName = (index: number): string => {
  const format = FORMAT_MAP["ig-highlights"];
  const highlight = IG_HIGHLIGHTS[index];
  return `instagram_highlight_${exportFileName([highlight.label], String(index + 1))}_${format.width}x${format.height}.png`;
};

export const serviceImageFileName = (service: Service, formatId: string): string => {
  const format = FORMAT_MAP[formatId];
  return `${exportFileName([service.shortName, formatId])}_${format.width}x${format.height}.png`;
};

export const carouselFileName = (index: number): string => {
  const format = FORMAT_MAP["ig-carousel"];
  return `carousel_${String(index + 1).padStart(2, "0")}_${format.width}x${format.height}.png`;
};

const bytesFor = async (formatId: string, options: {
  themeKey: ThemeKey;
  style?: StyleKey;
  service: Service;
  content?: CreativeContent;
  slideIndex?: number;
  highlightIndex?: number;
}) => {
  const format = FORMAT_MAP[formatId];
  const canvas = await renderCreative({
    format,
    themeKey: options.themeKey,
    style: options.style,
    service: options.service,
    content: options.content ?? defaultContent(format, options.service),
    scale: 1,
    slideIndex: options.slideIndex,
    highlightIndex: options.highlightIndex,
  });
  return { format, bytes: await canvasToBytesAndRelease(canvas) };
};

export async function brandPackFiles(
  onProgress?: (done: number, total: number) => void,
): Promise<{ files: DownloadFile[]; total: number }> {
  const total = BRAND_FORMAT_IDS.length + IG_HIGHLIGHTS.length + 1;
  const files: DownloadFile[] = [];
  const service = getService("jathagam");

  for (const id of BRAND_FORMAT_IDS) {
    const { bytes } = await bytesFor(id, { themeKey: service.theme, service });
    files.push({ name: brandImageFileName(id), data: bytes });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  for (let index = 0; index < IG_HIGHLIGHTS.length; index += 1) {
    const highlight = IG_HIGHLIGHTS[index];
    const { bytes } = await bytesFor("ig-highlights", {
      themeKey: highlight.theme,
      service,
      highlightIndex: index,
    });
    files.push({ name: highlightFileName(index), data: bytes });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  files.push({
    name: "READ-ME.txt",
    data: encoder.encode(
      [
        "ASTRO SIVAM — BRAND PACK",
        "=========================",
        `Generated ${new Date().toISOString()}`,
        "",
        "Contents",
        "• Facebook profile photo — 1080×1080",
        "• Instagram profile photo — 1080×1080",
        "• Facebook cover (lockup) — 1640×624",
        "• Facebook cover (statement) — 1640×624",
        "• Link share card — 1200×630",
        "• Twelve-style contact sheet",
        "• Seven Instagram highlight covers — 1080×1080",
        "",
        "Upload notes",
        "1. Facebook cover: keep the mark and wordmark inside the central 820×312 area.",
        "2. Profile photos are square; both platforms crop them to a circle.",
        "3. Highlight covers are symbol-only — Instagram renders the label itself.",
        "4. Do not recolour, outline or rotate the logo.",
        "",
        "Palette: #05070E · #0D1930 · #C9962C · #D9AE5F · #F3DCA9 · #F8F2E5",
        "Type: Cinzel (display) · Plus Jakarta Sans (UI) · Tiro Tamil (Tamil)",
        "",
        "astrosivam.com · admin@astrosivam.com",
      ].join("\n"),
    ),
  });
  onProgress?.(files.length, total);

  return { files, total };
}

export async function servicePackFiles(
  service: Service,
  themeKey: ThemeKey,
  content?: CreativeContent,
  onProgress?: (done: number, total: number) => void,
  style?: StyleKey,
): Promise<{ files: DownloadFile[]; total: number }> {
  const slides = service.carousel.slides.length;
  const total = SERVICE_FORMAT_IDS.length + slides + 2;
  const files: DownloadFile[] = [];

  for (const id of SERVICE_FORMAT_IDS) {
    const { bytes } = await bytesFor(id, {
      themeKey,
      style,
      service,
      content: content && id === "ig-post" ? content : undefined,
    });
    files.push({ name: serviceImageFileName(service, id), data: bytes });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  for (let index = 0; index < slides; index += 1) {
    const format = FORMAT_MAP["ig-carousel"];
    const canvas = await renderCreative({
      format,
      themeKey,
      style,
      service,
      content: defaultContent(format, service),
      scale: 1,
      slideIndex: index,
    });
    files.push({ name: carouselFileName(index), data: await canvasToBytesAndRelease(canvas) });
    onProgress?.(files.length, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  files.push({ name: "COPY.md", data: encoder.encode(serviceMarkdown(service)) });
  files.push({ name: "instagram-caption.txt", data: encoder.encode(fullIgCaption(service)) });
  onProgress?.(files.length, total);

  return { files, total };
}

export function textPackFiles(): DownloadFile[] {
  return [
    { name: "astrosivam-social-suite.md", data: encoder.encode(fullPackMarkdown()) },
    { name: "service-captions.txt", data: encoder.encode(igCaption(getService("jathagam"))) },
  ];
}

export const PACK_SUMMARY = {
  brand: BRAND_FORMAT_IDS.length + IG_HIGHLIGHTS.length + 1,
  service: SERVICE_FORMAT_IDS.length + 7 + 2,
};
