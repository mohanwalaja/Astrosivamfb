import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");
const APP = read("src/App.tsx");
const CSS = read("src/index.css");
const UI = read("src/components/ui.tsx");
const CREATIVE = read("src/components/CreativeCanvas.tsx");
const IG = read("src/components/IgCanvas.tsx");

const workflowSections = [
  "launch", "brand", "profile-cover", "assets", "designs", "poster", "panchangam",
  "festivals", "services", "instagram", "facebook", "calendar", "hashtags", "mockups", "export",
];

test("the app has narrow, tablet and desktop navigation modes with an accessible drawer", () => {
  assert.match(APP, /xl:hidden/, "small screens and tablets retain the compact top bar");
  assert.match(APP, /xl:flex/, "wide desktop gets the permanent sidebar/header");
  assert.match(APP, /role="dialog"[\s\S]*?aria-modal="true"/, "navigation drawer is modal to assistive technology");
  assert.match(APP, /event\.key === "Escape"/, "Escape closes the drawer");
  assert.match(APP, /aria-expanded=\{drawer\}/);
  for (const section of workflowSections) assert.ok(APP.includes(`"${section}"`), `navigation keeps ${section}`);
});

test("touch and mobile layouts protect targets, safe areas, modal controls and inputs", () => {
  assert.match(CSS, /@media \(max-width: 640px\)[\s\S]*?button\s*\{\s*min-height: 44px/);
  assert.match(CSS, /@media \(pointer: coarse\)[\s\S]*?min-height: 44px/);
  assert.match(CSS, /font-size: 16px; \/\* prevents iOS zoom/);
  assert.match(CSS, /env\(safe-area-inset-top\)/);
  assert.match(CSS, /env\(safe-area-inset-bottom\)/);
  assert.match(CSS, /max-height: calc\(100dvh/);
  assert.match(CSS, /\.modal-footer > span\s*\{\s*flex: 1 0 100%/);
});

test("content and grids may shrink; narrow tables scroll locally instead of widening the page", () => {
  assert.match(CSS, /\.section-label,[\s\S]*?main\s*\{\s*min-width: 0/);
  assert.match(CSS, /overflow-x: clip/);
  const instagram = read("src/components/InstagramSuite.tsx");
  assert.match(instagram, /overflow-x-auto/);
  assert.match(instagram, /min-w-\[520px\]|min-w-\[640px\]/);
  assert.match(UI, /tab-seg max-w-full overflow-x-auto/);
});

test("heavy creative canvases defer off-screen work and keep their preview footprint", () => {
  for (const [name, source] of Object.entries({ CREATIVE, IG })) {
    assert.match(source, /IntersectionObserver/, `${name} should skip painting below the fold`);
    assert.match(source, /rootMargin: "280px 0px"/, `${name} should paint shortly before scroll-in`);
    assert.match(source, /aspectRatio:/, `${name} reserves its correct ratio while loading`);
  }
  assert.match(CREATIVE, /React\.memo/, "stable creative props should skip parent-triggered rerenders");
  assert.match(CREATIVE, /setTimeout\(\(\) => \{/ , "rapid edits are lightly coalesced before repaint");
});

test("image galleries use small lazy-decoded thumbnails and uploads expose visible keyboard focus", () => {
  assert.match(read("src/components/PosterStudio.tsx"), /loading="lazy" decoding="async"/);
  assert.match(read("src/components/FbComposer.tsx"), /loading="lazy" decoding="async"/);
  const publisher = read("src/components/Publisher.tsx");
  assert.match(publisher, /className="upload-label[\s\S]*?<input[\s\S]*?type="file"[\s\S]*?Choose an image for the post/);
  assert.match(CSS, /\.upload-label:focus-within\s*\{\s*outline: 2px solid var\(--sv-focus\)/);
  assert.match(CSS, /:focus-visible\s*\{\s*outline: 2px solid var\(--sv-focus\)/);
  assert.match(UI, /Skip to content|role="dialog"/);
});

test("main content, loading fallback and toast notices stay available on mobile", () => {
  assert.match(APP, /id="main-content"/);
  assert.match(APP, /SectionFallback/);
  assert.match(UI, /className="toast-stack/);
  assert.match(CSS, /\.toast-stack\s*\{[\s\S]*?left: 8px/);
});
