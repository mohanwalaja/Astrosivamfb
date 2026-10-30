import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  PALETTE,
  SEMANTIC,
  TEXT_CONTRAST_PAIRS,
  contrastRatio,
  relativeLuminance,
} from "../src/design/tokens";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

test("every audited text pair meets WCAG AA on its intended surface", () => {
  for (const pair of TEXT_CONTRAST_PAIRS) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    assert.ok(
      ratio >= pair.min,
      `${pair.name} is ${ratio.toFixed(2)}:1; expected at least ${pair.min}:1`,
    );
  }
});

test("contrast helper is symmetric and reports the reference extremes", () => {
  assert.equal(contrastRatio("#000000", "#ffffff").toFixed(0), "21");
  assert.equal(contrastRatio("#ffffff", "#ffffff").toFixed(0), "1");
  assert.equal(relativeLuminance("#000000"), 0);
  assert.equal(relativeLuminance("#ffffff").toFixed(4), "1.0000");
  assert.equal(contrastRatio(PALETTE.gold[500], PALETTE.charcoal[800]), contrastRatio(PALETTE.charcoal[800], PALETTE.gold[500]));
});

test("the five palette families are declared in the token layer", () => {
  const css = read("src/index.css");
  for (const [family, shades] of Object.entries(PALETTE)) {
    assert.ok(css.includes(`/* ${family}`) || css.includes(`color-${family}`) || family === "charcoal", `missing ${family} family comment`);
    for (const hex of Object.values(shades)) {
      assert.ok(css.toLowerCase().includes(hex.toLowerCase()), `${family} token ${hex} is missing from index.css`);
    }
  }
  for (const value of [SEMANTIC.maroon, SEMANTIC.gold, SEMANTIC.champagne, SEMANTIC.ivory, SEMANTIC.bg]) {
    assert.ok(css.toLowerCase().includes(value.toLowerCase()), `semantic token ${value} is missing from index.css`);
  }
});

test("the interface exposes a reusable component and accessibility contract", () => {
  const css = read("src/index.css");
  for (const selector of [
    ".btn-gold",
    ".btn-ghost",
    ".btn-maroon",
    ".card",
    ".card-featured",
    ".chip-gold",
    ".field",
    ".modal-panel",
    ".preview-frame",
    ".nav-item-active",
    ".brand-seal",
    ".skip-link",
    ":focus-visible",
    "prefers-reduced-motion",
  ]) {
    assert.ok(css.includes(selector), `expected ${selector} in the design system`);
  }

  const ui = read("src/components/ui.tsx");
  for (const component of [
    "export function Modal",
    "export function PreviewFrame",
    "export function Field",
    "const Button = React.forwardRef",
    "export function PageHeader",
    "export function Panel",
    "export function EmptyState",
    "export function ExportProgress",
    "export function Segmented",
  ]) {
    assert.ok(ui.includes(component), `expected ${component}`);
  }
  assert.ok(ui.includes('role="dialog"'), "modal must expose role=dialog");
  assert.ok(ui.includes('aria-modal="true"'), "modal must expose aria-modal");
  assert.ok(ui.includes('event.key === "Escape"'), "modal must close on Escape");
});

test("no pure white or legacy cool-grey colours remain in component markup", () => {
  const forbiddenUtilities = ["text-white", "bg-white/", "border-white/", "divide-white/", "ring-white/"];
  const legacy = ["#8b94a8", "#6f7a90", "#a8b0c0", "#98a1b6", "#c3cad7", "#d8b15e", "#05070e", "#060912"];
  const dir = path.join(process.cwd(), "src/components");
  const files = [
    ...readdirSync(dir).filter((file) => file.endsWith(".tsx")).map((file) => path.join(dir, file)),
    path.join(process.cwd(), "src/App.tsx"),
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8").toLowerCase();
    for (const colour of legacy) {
      assert.ok(!source.includes(colour), `${path.basename(file)} still uses legacy colour ${colour}`);
    }
    for (const utility of forbiddenUtilities) {
      assert.ok(!source.includes(utility), `${path.basename(file)} still uses ${utility}; warm ivory replaces pure white`);
    }
  }
});
