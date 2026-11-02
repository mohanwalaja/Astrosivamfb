/**
 * Real-browser acceptance run for the upgraded Poster Studio.
 *
 *   node tools/browser-audit.mjs            (expects the dev server on :3000)
 *
 * Boots the bundled Chromium, opens the actual app, drives the studio on a
 * desktop and an Android-sized viewport, and downloads a real PNG plus a real
 * motion file. Screenshots and downloads land in `.samples/browser/`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import chromium from "@sparticuz/chromium";
const { inflate } = await import(new URL("../node_modules/@sparticuz/chromium/build/lambdafs.js", import.meta.url).href);
import { chromium as pw } from "playwright";

// The bundled Chromium ships its own NSS/NSPR libraries. On non-Amazon-Linux
// hosts the package skips extracting them, so do it here and point the loader
// at the result before the browser starts.
const libDir = await inflate(join(process.cwd(), "node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
process.env.LD_LIBRARY_PATH = [join(libDir, "lib"), process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
process.env.FONTCONFIG_PATH ??= join(tmpdir(), "fonts");

const OUT = ".samples/browser";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:3000";
const findings = [];
const note = (ok, label, detail = "") => {
  findings.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const launch = () => pw.launch({
  executablePath: executable,
  args: [...chromium.args, "--hide-scrollbars", "--mute-audio"],
  headless: true,
});
const executable = await chromium.executablePath();

const run = async (name, viewport, isMobile) => {
  // The serverless build runs single-process; a fresh browser per viewport is
  // more stable than a second context after a MediaRecorder session.
  const browser = await launch();
  const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: isMobile ? 2 : 1, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: `${OUT}/${name}-home.png`, fullPage: false });

  // Open the Poster Studio through the app's own navigation (drawer on mobile).
  const studioLink = page.getByRole("button", { name: /poster studio/i }).first();
  if (!(await studioLink.isVisible().catch(() => false))) {
    const opener = page.getByRole("button", { name: /open navigation/i }).first();
    if (await opener.count()) await opener.click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: /poster studio/i }).first().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}-studio.png`, fullPage: false });

  const body = await page.textContent("body");
  note(/composition/i.test(body), `${name}: composition picker present`);
  note(!/தமிழ்|हिन्दी/.test(body), `${name}: no language selector on the studio surface`);

  // No horizontal overflow at this viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  note(overflow <= 1, `${name}: no horizontal page overflow`, `${overflow}px`);

  // Generate a fresh design and confirm the preview canvas actually paints.
  const generate = page.getByRole("button", { name: /generate|new design|surprise/i }).first();
  if (await generate.count()) { await generate.click(); await page.waitForTimeout(1800); }
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 0; i < data.length; i += 4096) if (data[i + 3] > 0) painted++;
    return { width: canvas.width, height: canvas.height, painted };
  });
  note(Boolean(canvasInfo && canvasInfo.painted > 50), `${name}: preview canvas paints`, canvasInfo ? `${canvasInfo.width}×${canvasInfo.height}` : "no canvas");

  // Exports live on the studio's Export tab.
  await page.getByRole("button", { name: /^export$/i }).first().click();
  await page.waitForTimeout(400);

  // Real PNG download through the app's own export button.
  const pngButton = page.getByRole("button", { name: /download png/i }).first();
  if (await pngButton.count()) {
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), pngButton.click()]);
    const path = `${OUT}/${name}-export.png`;
    await download.saveAs(path);
    note(true, `${name}: PNG download`, download.suggestedFilename());
  } else note(false, `${name}: PNG download button found`);

  // Real motion export. MediaRecorder runs in real time, so allow the full clip.
  const motionButton = page.getByRole("button", { name: /export 15 s motion/i }).first();
  if (await motionButton.count()) {
    try {
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), motionButton.click()]);
      await download.saveAs(`${OUT}/${name}-motion.${download.suggestedFilename().split(".").pop()}`);
      note(true, `${name}: motion download`, download.suggestedFilename());
    } catch (error) { note(false, `${name}: motion download`, String(error).slice(0, 160)); }
  } else note(false, `${name}: motion export button found`);

  note(errors.length === 0, `${name}: no page errors`, errors.slice(0, 2).join(" | ").slice(0, 200));
  await context.close();
  await browser.close();
};

await run("desktop", { width: 1440, height: 900 }, false);
await run("android", { width: 393, height: 851 }, true);
writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
const failed = findings.filter((f) => !f.ok);
console.log(`\n${findings.length - failed.length}/${findings.length} browser checks passed.`);
if (failed.length) process.exitCode = 1;
