import React, { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { THEMES } from "../data/brand";
import { ensureFonts } from "../lib/canvas";
import { drawBrandLockup, type BrandOrientation } from "../lib/brandLockup";
import { downloadCanvas } from "../lib/export";
import { Button } from "./ui";

export const LogoLockupStudio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orientation, setOrientation] = useState<BrandOrientation>("horizontal");
  const [markScale, setMarkScale] = useState(100);
  const [textScale, setTextScale] = useState(100);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void (async () => {
      await ensureFonts();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || cancelled) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#11131C";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(217,174,95,.23)";
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, width - 28, height - 28);
      const logo = new Image();
      logo.onload = () => {
        if (cancelled) return;
        drawBrandLockup(ctx, logo, {
          x: width * x / 100,
          y: height * y / 100,
          markSize: 112 * markScale / 100,
          textSize: 32 * textScale / 100,
          orientation,
          align: "center",
          name: "ASTRO SIVAM",
          font: '600 32px "Cinzel", Georgia, serif',
          theme: THEMES.midnight,
        });
        setReady(true);
      };
      logo.onerror = () => setReady(false);
      logo.src = "/astrosivam_logo.png";
    })();
    return () => {
      cancelled = true;
    };
  }, [orientation, markScale, textScale, x, y]);

  const download = async () => {
    if (!canvasRef.current) return;
    await downloadCanvas(canvasRef.current, `astrosivam_lockup_${orientation}.png`);
  };

  return (
    <div className="mt-4 rounded-xl border border-line bg-wash p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-cream">Build a logo lockup</div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[#A2937D]">Choose an arrangement, resize it and position it before exporting.</p>
        </div>
        <Button variant="ghost" disabled={!ready} onClick={() => void download()} icon={<Download className="h-3.5 w-3.5" />}>
          Download PNG
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-[#11131C]">
        <canvas ref={canvasRef} width={860} height={500} className="block h-auto w-full" aria-label="Custom Astro Sivam logo lockup preview" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Arrangement</span>
          <select value={orientation} onChange={(event) => setOrientation(event.target.value as BrandOrientation)} className="w-full rounded-lg border border-line bg-[#191314] px-2 py-1.5 text-[11px] text-cream">
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Stacked vertical</option>
            <option value="circular">Circular wordmark</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Logo size · {markScale}%</span>
          <input type="range" min={50} max={160} value={markScale} aria-label="Logo size" onChange={(event) => setMarkScale(Number(event.target.value))} className="w-full accent-[#C79A3C]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Brand text · {textScale}%</span>
          <input type="range" min={60} max={180} value={textScale} aria-label="Brand text size" onChange={(event) => setTextScale(Number(event.target.value))} className="w-full accent-[#C79A3C]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Horizontal position · {x}%</span>
          <input type="range" min={12} max={88} value={x} aria-label="Logo horizontal position" onChange={(event) => setX(Number(event.target.value))} className="w-full accent-[#C79A3C]" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">Vertical position · {y}%</span>
          <input type="range" min={12} max={88} value={y} aria-label="Logo vertical position" onChange={(event) => setY(Number(event.target.value))} className="w-full accent-[#C79A3C]" />
        </label>
      </div>
      <p className="mt-2 text-[9.5px] leading-relaxed text-[#A2937D]">The official square logo file is kept intact. Only its placement and the separate wordmark layout change.</p>
    </div>
  );
};
