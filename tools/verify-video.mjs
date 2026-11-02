/** Decode the exported MP4s in the real browser engine and report metadata + frame variance. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import chromium from "@sparticuz/chromium";
import { chromium as pw } from "playwright";
const { inflate } = await import(new URL("../node_modules/@sparticuz/chromium/build/lambdafs.js", import.meta.url).href);
const libDir = await inflate(join(process.cwd(), "node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
process.env.LD_LIBRARY_PATH = [join(libDir, "lib"), process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
process.env.FONTCONFIG_PATH ??= join(tmpdir(), "fonts");

const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
try {
  for (const file of process.argv.slice(2)) {
    const page = await browser.newPage();
    const data = readFileSync(file).toString("base64");
    const result = await page.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
      const video = document.createElement("video");
      video.muted = true; video.src = url;
      await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = () => reject(new Error("decode failed")); });
      const meta = { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
      // Sample three frames and measure pixel variance to prove real motion content.
      const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 200;
      const ctx = canvas.getContext("2d");
      const samples = [];
      for (const t of [0.5, meta.duration / 2, Math.max(0, meta.duration - 0.6)]) {
        video.currentTime = Math.min(t, Math.max(0, meta.duration - 0.05));
        await new Promise((resolve) => { video.onseeked = resolve; });
        ctx.drawImage(video, 0, 0, 160, 200);
        const d = ctx.getImageData(0, 0, 160, 200).data;
        let sum = 0, min = 255, max = 0;
        for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += l; min = Math.min(min, l); max = Math.max(max, l); }
        samples.push({ t: Number(video.currentTime.toFixed(2)), mean: Math.round(sum / (d.length / 4)), range: max - min });
      }
      URL.revokeObjectURL(url);
      return { ...meta, samples };
    }, data);
    console.log(file, JSON.stringify(result));
    await page.close();
  }
} finally { await browser.close(); }
