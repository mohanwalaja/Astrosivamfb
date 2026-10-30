/**
 * DOM-side multilingual audit.
 *
 * The canvas engines are measured by `tmp/textmatrix.mjs`; this checks the
 * other half of the brief — headings, body copy and caption previews in the
 * running UI. It mounts each screen that shows generated copy and walks the
 * text nodes looking for Tamil or Devanagari that is *not* inside an element
 * marked with `lang="ta|hi"` or one of the script font classes.
 *
 * An unmarked run means the browser falls back to a system face and any
 * tracking on the container applies to that substitution.
 */
import { JSDOM } from "jsdom";
import { createCanvas } from "@napi-rs/canvas";
import { registerFonts } from "./canvas-env.mjs";

// The screens run the real canvas engine, so the faces have to be registered
// here too — jsdom has no @font-face machinery of its own.
registerFonts();

const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
globalThis.Node = window.Node;
globalThis.NodeFilter = window.NodeFilter;
globalThis.Element = window.Element;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.HTMLCanvasElement.prototype.getContext = function getContext(type) {
  if (type !== "2d") return null;
  if (!this.__ctx) {
    const backing = createCanvas(this.width || 300, this.height || 150);
    this.__ctx = backing.getContext("2d");
  }
  return this.__ctx;
};

const errors = [];
const originalError = console.error;
console.error = (...args) => {
  errors.push(args.map((a) => String(a)).join(" "));
  originalError(...args);
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { ToastProvider } = await import("../src/components/ui.tsx");
const { InstagramSuite } = await import("../src/components/InstagramSuite.tsx");
const { ServicePosts } = await import("../src/components/ServicePosts.tsx");
const { FestivalWishes } = await import("../src/components/FestivalWishes.tsx");
const { Mockups } = await import("../src/components/Mockups.tsx");
const { ServiceAds } = await import("../src/components/ServiceAds.tsx");
const { SERVICES } = await import("../src/data/services/index.ts");

const INDIC = /[\u0900-\u097F\u0B80-\u0BFF]/;
const results = [];

async function audit(name) {
  let indicNodes = 0;
  let marked = 0;
  const stray = [];
  const walker = document.createTreeWalker(document.getElementById("root"), window.NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    if (!INDIC.test(text)) continue;
    indicNodes += 1;
    const el = node.parentElement;
    const ok =
      el &&
      (el.closest('[lang="ta"]') ||
        el.closest('[lang="hi"]') ||
        el.classList.contains("font-tamil") ||
        el.classList.contains("font-hindi"));
    if (ok) marked += 1;
    else if (stray.length < 6) {
      stray.push(`<${el?.tagName?.toLowerCase()} class="${String(el?.className ?? "").slice(0, 40)}"> ${text.trim().slice(0, 36)}`);
    }
  }
  const tracked = [...document.querySelectorAll('[style*="letter-spacing"]')].filter((el) => INDIC.test(el.textContent ?? ""));
  results.push({ name, indicNodes, marked, stray, tracked: tracked.length });
}

async function mount(name, element) {
  try {
    await mountInner(name, element);
  } catch (error) {
    // A screen that draws one canvas into another needs the browser's
    // drawImage; the jsdom shim cannot unwrap a napi canvas. Recorded, not
    // hidden — the canvas engines are audited separately by textmatrix.
    results.push({ name, indicNodes: 0, marked: 0, stray: [`mount failed: ${String(error.message).slice(0, 90)}`], tracked: 0 });
  }
}

async function mountInner(name, element) {
  document.getElementById("root").innerHTML = "";
  const root = createRoot(document.getElementById("root"));
  await act(async () => {
    root.render(React.createElement(ToastProvider, null, element));
  });
  await new Promise((resolve) => setTimeout(resolve, 700));

  // Every tab, not just the landing one: captions live behind their own panel.
  const tabs = [...document.querySelectorAll('[aria-label$="sections"] button')];
  if (tabs.length) {
    for (const tab of tabs) {
      await act(async () => {
        tab.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
      await audit(`${name} · ${tab.textContent.trim()}`);
    }
  } else {
    await audit(name);
  }
  await act(async () => root.unmount());
}

await mount("InstagramSuite", React.createElement(InstagramSuite, { initialTab: "grid" }));
await mount("ServicePosts", React.createElement(ServicePosts, { onNavigate: () => {} }));
await mount("FestivalWishes", React.createElement(FestivalWishes));
await mount("Mockups", React.createElement(Mockups));
await mount("ServiceAds", React.createElement(ServiceAds, { service: SERVICES[0] }));


console.log("\nscreen                          indic runs  marked  unmarked  tracked");
for (const row of results) {
  console.log(
    `${row.name.padEnd(32)}${String(row.indicNodes).padStart(9)}${String(row.marked).padStart(8)}${String(row.indicNodes - row.marked).padStart(10)}${String(row.tracked).padStart(9)}`,
  );
  row.stray.forEach((line) => console.log(`    stray: ${line}`));
}
console.log(`\nconsole errors: ${errors.length}`);
errors.slice(0, 6).forEach((line) => console.log(`  ! ${line.slice(0, 160)}`));
