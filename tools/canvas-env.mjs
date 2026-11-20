/**
 * A tiny Node canvas environment for the poster engine.
 *
 * The renderer is written against the DOM canvas API. This module maps that API
 * onto @napi-rs/canvas so the same layout code can be rendered to PNG in Node —
 * used by the sample renderers and by the export/preview parity check. It is a
 * development tool only; nothing here is bundled into the app.
 */
import { createCanvas, Image as SkiaImage, Path2D as SkiaPath2D, GlobalFonts } from "@napi-rs/canvas";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

/**
 * Skia keeps one face per family and weight, so registering the Latin and Tamil
 * halves of "Tiro Tamil" under one name silently drops one of them — which is
 * how a Tamil sentence lost its full stop and painted a .notdef box in every
 * Node-rendered sample. The browser does not have this problem: it dispatches
 * by unicode-range across the two @font-face rules. To reproduce that here, the
 * Latin half is registered under "<Family> Latin" and the canvas stacks name
 * both; the browser ignores the second name because no such family exists.
 */
const FONTS = [
  ["Cinzel", "cinzel-500.woff2"],
  ["Cinzel", "cinzel-600.woff2"],
  ["Cinzel", "cinzel-700.woff2"],
  ["Cinzel", "cinzel-800.woff2"],
  ["Marcellus", "marcellus-400.woff2"],
  ["Plus Jakarta Sans", "jakarta-400.woff2"],
  ["Plus Jakarta Sans", "jakarta-500.woff2"],
  ["Plus Jakarta Sans", "jakarta-600.woff2"],
  ["Plus Jakarta Sans", "jakarta-700.woff2"],
  ["Baloo Thambi 2", "baloo-tamil-500.woff2"],
  ["Baloo Thambi 2", "baloo-tamil-600.woff2"],
  ["Baloo Thambi 2 Latin", "baloo-latin-500.woff2"],
  ["Baloo Thambi 2 Latin", "baloo-latin-600.woff2"],
  ["Tiro Tamil", "tiro-tamil-400.woff2"],
  ["Tiro Tamil Latin", "tiro-latin-400.woff2"],
  ["Noto Sans Devanagari", "noto-deva-400.woff2"],
  ["Noto Sans Devanagari", "noto-deva-500.woff2"],
  ["Noto Sans Devanagari", "noto-deva-600.woff2"],
  ["Noto Sans Devanagari Latin", "noto-latin-400.woff2"],
  ["Noto Sans Devanagari Latin", "noto-latin-500.woff2"],
  ["Noto Sans Devanagari Latin", "noto-latin-600.woff2"],
  ["Yatra One", "yatra-deva-400.woff2"],
  ["Yatra One Latin", "yatra-latin-400.woff2"],
  ["Cormorant Garamond", "cormorant-600.woff2"],
  ["Cormorant Garamond", "cormorant-700.woff2"],
  ["Playfair Display", "playfair-600.woff2"],
  ["Playfair Display", "playfair-700.woff2"],
  ["Inter Tight", "intertight-500.woff2"],
  ["Inter Tight", "intertight-600.woff2"],
  ["Inter Tight", "intertight-700.woff2"],
  ["Noto Serif Tamil", "notoserif-tamil-500.woff2"],
  ["Noto Serif Tamil", "notoserif-tamil-700.woff2"],
  ["Noto Serif Tamil Latin", "notoserif-tamil-latin-500.woff2"],
  ["Noto Serif Devanagari", "notoserif-deva-500.woff2"],
  ["Noto Serif Devanagari", "notoserif-deva-700.woff2"],
  ["Hind Madurai", "hindmadurai-tamil-500.woff2"],
  ["Hind Madurai", "hindmadurai-tamil-700.woff2"],
  ["Hind Madurai Latin", "hindmadurai-latin-500.woff2"],
  ["Hind", "hind-deva-500.woff2"],
  ["Hind", "hind-deva-700.woff2"],
];

export function registerFonts() {
  for (const [family, file] of FONTS) {
    const filePath = path.join(root, "src/assets/fonts", file);
    if (!existsSync(filePath)) continue;
    try {
      GlobalFonts.registerFromPath(filePath, family);
    } catch (error) {
      console.warn(`font ${family}/${file} failed:`, error.message);
    }
  }
}

/**
 * The image registry lets `document.createElement("canvas")` and `new Image()`
 * return objects that behave like DOM nodes. @napi-rs/canvas's own canvas class
 * is the shape the renderer expects.
 */
function resolveSource(src) {
  if (typeof src !== "string") return src;
  if (src.startsWith("data:") || src.startsWith("file:") || src.startsWith("http")) return src;
  if (src.startsWith("/")) {
    const asset = path.join(root, "public", src.slice(1));
    if (existsSync(asset)) return asset;
  }
  return src;
}

class NodeImage extends SkiaImage {
  set src(value) {
    super.src = typeof value === "string" ? resolveSource(value) : value;
  }
  get src() {
    return super.src ?? "";
  }
}

class NodeCanvas extends (createCanvas(1, 1).constructor) {}

const makeCanvas = (width = 300, height = 150) => {
  const canvas = createCanvas(width, height);
  return canvas;
};

const fontSet = {
  add() {},
  delete() {},
  check: () => true,
  load: () => Promise.resolve([]),
  ready: Promise.resolve(),
  forEach(callback) {
    for (const family of GlobalFonts.families) {
      callback({ family: family.family, status: "loaded", weight: "400", style: "normal" });
    }
  },
};

export function installCanvasEnv() {
  registerFonts();
  const documentShim = {
    fonts: fontSet,
    createElement(tag) {
      if (tag !== "canvas") throw new Error(`createElement(${tag}) is not supported in the sample renderer`);
      return makeCanvas();
    },
  };
  globalThis.document = documentShim;
  globalThis.window = {
    setTimeout: (fn, ms, ...args) => setTimeout(fn, ms, ...args),
    clearTimeout: (id) => clearTimeout(id),
    requestAnimationFrame: (fn) => setTimeout(() => fn(performance.now()), 16),
    devicePixelRatio: 1,
    location: { href: "http://localhost/", search: "", hash: "" },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    navigator: { userAgent: "node-samples" },
  };
  globalThis.Image = NodeImage;
  globalThis.Path2D = SkiaPath2D;
  globalThis.OffscreenCanvas = class OffscreenCanvasShim {
    constructor(width, height) {
      return makeCanvas(width, height);
    }
  };
  globalThis.HTMLCanvasElement = NodeCanvas;
  return { NodeImage, makeCanvas };
}

export { makeCanvas };
