import type { CreativeContent, MotifKey, Service, StyleKey, Theme } from "../types";
import {
  DISPLAY,
  SANS,
  SERIF,
  TAMIL,
  drawMotif,
  drawTracked,
  fitHeadline,
  roundRect,
  withAlpha,
} from "./canvas";
import { drawStyleFrame, paintStyledBackdrop } from "./styles";
import { glassCard } from "./styleArt";
import { drawContactLine } from "./posterKit";
import { drawGlobalLockup } from "./brandPlacement";
import { foilGradient, foilText } from "./premium";
import { blockHeight, leadOffsets, wrapClip } from "./typeset";
import { BRAND } from "../data/brand";

/* ------------------------------- service plate ----------------------------- */

export type PlateVariant = "relief" | "line";

function motifFor(style: StyleKey, serviceMotif: MotifKey): MotifKey {
  // The service glyph is the brand's semantic anchor, so every style keeps it.
  if (style === "gopuram" && serviceMotif === "muhurtham") return "kalash";
  if (style === "kolam" && serviceMotif === "namakaranam") return "lotus";
  if (style === "deepam" && serviceMotif === "transits") return "diya";
  return serviceMotif;
}

/** Thin-line version of the plate for the technical and editorial systems. */
function drawLinePlate(
  ctx: CanvasRenderingContext2D,
  serviceKey: string,
  cx: number,
  cy: number,
  size: number,
  theme: Theme,
  alpha: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  ctx.globalAlpha *= alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const stroke = theme.light ? theme.ink : theme.goldSoft;
  const accent = theme.gold;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  if (serviceKey === "jathagam") {
    ctx.strokeRect(-40, -40, 80, 80);
    ctx.lineWidth = 1;
    for (const p of [-20, 20]) {
      ctx.beginPath(); ctx.moveTo(p, -40); ctx.lineTo(p, 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-40, p); ctx.lineTo(40, p); ctx.stroke();
    }
    // the central 2×2 field stays open: mask the inner separators
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(-19, -19, 38, 38);
    ctx.restore();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5); ctx.lineTo(-5, 0); ctx.closePath(); ctx.stroke();
    // house numerals as tiny ticks
    ctx.fillStyle = withAlpha(stroke, 0.7);
    for (let i = 0; i < 4; i += 1) { ctx.fillRect(-38 + i * 20 + 2, -38, 3, 1.2); ctx.fillRect(-38 + i * 20 + 2, 36.8, 3, 1.2); }
  } else if (serviceKey === "marriage") {
    ctx.beginPath(); ctx.arc(-14, 0, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(14, 0, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = accent; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
  } else if (serviceKey === "panchangam") {
    ctx.beginPath(); ctx.arc(-18, 0, 22, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i += 1) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-18 + Math.cos(a) * 26, Math.sin(a) * 26); ctx.lineTo(-18 + Math.cos(a) * 32, Math.sin(a) * 32); ctx.stroke(); }
    ctx.strokeStyle = accent; ctx.beginPath(); ctx.arc(22, 0, 18, -Math.PI * 0.5, Math.PI * 0.5); ctx.arc(14, 0, 18, Math.PI * 0.5, -Math.PI * 0.5, true); ctx.closePath(); ctx.stroke();
  } else if (serviceKey === "transits") {
    // Technical Astronomical Blueprint of Saturn with multi-layered rings and Cassini Division
    ctx.save();
    ctx.rotate(-0.44); // 26° axial tilt

    const rx = 49;
    const ry = 14;
    const pr = 19;

    // 1. Tilted Polar Axis Line
    ctx.strokeStyle = withAlpha(stroke, 0.45);
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(0, 32);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Back arc of rings (angles PI to 2*PI) drawn behind globe
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2); // Ring A outer
    ctx.stroke();

    ctx.strokeStyle = withAlpha(accent, 0.7);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 3.5, ry - 1.0, 0, Math.PI, Math.PI * 2); // Ring A inner
    ctx.stroke();

    // Cassini Division gap behind
    ctx.strokeStyle = withAlpha(stroke, 0.25);
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 5.5, ry - 1.5, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ring B behind (dense double ring)
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 8.5, ry - 2.4, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = withAlpha(accent, 0.85);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 12.5, ry - 3.5, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Crepe Ring C behind
    ctx.strokeStyle = withAlpha(accent, 0.4);
    ctx.lineWidth = 0.8;
    ctx.setLineDash([1, 2]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 15.5, ry - 4.4, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Planet Globe Body (Solid fill masks the back rings completely)
    ctx.fillStyle = theme.light ? theme.bgFrom : "#071224";
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Atmospheric latitude bands across globe
    ctx.strokeStyle = withAlpha(stroke, 0.5);
    ctx.lineWidth = 0.9;
    for (const by of [-10, -4, 4, 11]) {
      const half = Math.sqrt(Math.max(1, pr * pr - by * by));
      ctx.beginPath();
      ctx.moveTo(-half, by);
      ctx.lineTo(half, by);
      ctx.stroke();
    }

    // Ring shadow cast on globe
    ctx.strokeStyle = withAlpha(stroke, 0.75);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 2.5, pr * 0.95, 3.2, 0, 0, Math.PI);
    ctx.stroke();

    // 4. Front arc of rings (angles 0 to PI) drawn IN FRONT of globe
    // Crepe Ring C in front
    ctx.strokeStyle = withAlpha(accent, 0.4);
    ctx.lineWidth = 0.8;
    ctx.setLineDash([1, 2]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 15.5, ry - 4.4, 0, 0, Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ring B in front (main broad luminous ring)
    ctx.strokeStyle = withAlpha(accent, 0.85);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 12.5, ry - 3.5, 0, 0, Math.PI);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 8.5, ry - 2.4, 0, 0, Math.PI);
    ctx.stroke();

    // Cassini Division in front (sharp dark gap line)
    ctx.strokeStyle = withAlpha(stroke, 0.25);
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 5.5, ry - 1.5, 0, 0, Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ring A in front
    ctx.strokeStyle = withAlpha(accent, 0.7);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 3.5, ry - 1.0, 0, 0, Math.PI);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    // Astrological Saturn Symbol ♄ & degree ticks
    ctx.fillStyle = accent;
    ctx.font = "bold 10px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♄", 34, -28);

    // Degree ticks
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.strokeStyle = withAlpha(accent, 0.5);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
      ctx.lineTo(Math.cos(a) * 47, Math.sin(a) * 47);
      ctx.stroke();
    }
  } else if (serviceKey === "muhurtham") {
    ctx.beginPath(); ctx.moveTo(-26, 28); ctx.quadraticCurveTo(0, 40, 26, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, 22); ctx.quadraticCurveTo(0, 14, 20, 22); ctx.lineTo(15, 30); ctx.lineTo(-15, 30); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = accent; ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-12, 0, -4, -20, 0, -34); ctx.bezierCurveTo(4, -20, 12, 0, 0, 14); ctx.stroke();
  } else if (serviceKey === "babynaming") {
    // Sacred Classical Temple Arch Engraving with Tamil Syllables, Lotus Throne & Bala Paadam
    // 1. Classical Temple Archway (Gopuram / Koodu Arch)
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-35, 34);
    ctx.lineTo(-35, -8);
    ctx.quadraticCurveTo(-35, -42, 0, -46);
    ctx.quadraticCurveTo(35, -42, 35, -8);
    ctx.lineTo(35, 34);
    ctx.stroke();

    // Inner archway
    ctx.strokeStyle = withAlpha(accent, 0.55);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-30, 34);
    ctx.lineTo(-30, -7);
    ctx.quadraticCurveTo(-30, -37, 0, -41);
    ctx.quadraticCurveTo(30, -37, 30, -7);
    ctx.lineTo(30, 34);
    ctx.stroke();

    // Temple Arch Apex Medallion with Sacred Tamil OM (ஓம்)
    ctx.save();
    ctx.fillStyle = theme.light ? (theme.bgFrom ?? "#FFFDF8") : (theme.bgTo ?? "#060A14");
    ctx.beginPath();
    ctx.arc(0, -46, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = `bold 8px ${TAMIL}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ஓம்", 0, -45.5);
    ctx.restore();

    // Flanking Sacred Tamil Syllables (ந & ஸ்ரீ)
    const drawTamilPlaque = (tx: number, ty: number, char: string) => {
      ctx.save();
      ctx.fillStyle = theme.light ? (theme.bgFrom ?? "#FFFDF8") : (theme.bgTo ?? "#060A14");
      ctx.beginPath();
      ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(accent, 0.7);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.font = `600 5px ${TAMIL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(char, tx, ty + 0.3);
      ctx.restore();
    };
    drawTamilPlaque(-24, -20, "ந");
    drawTamilPlaque(24, -20, "ஸ்ரீ");

    // 2. Blooming Sacred Lotus Throne base
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    for (let i = -3; i <= 3; i += 1) {
      const lx = i * 8.5;
      ctx.beginPath();
      ctx.moveTo(lx, 26);
      ctx.quadraticCurveTo(lx + 4, 15, lx, 7);
      ctx.quadraticCurveTo(lx - 4, 15, lx, 26);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 26, 30, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Divine Golden Baby Footprints (Bala Paadam)
    const drawFoot = (fx: number, fy: number, isRight: boolean) => {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.3;
      // Sole and heel
      ctx.beginPath();
      ctx.moveTo(isRight ? -3 : 3, -11);
      ctx.bezierCurveTo(isRight ? 6 : -6, -9, isRight ? 5 : -5, 2, isRight ? 4 : -4, 7);
      ctx.quadraticCurveTo(0, 11, isRight ? -4 : 4, 7);
      ctx.bezierCurveTo(isRight ? -5 : 5, 2, isRight ? -5 : 5, -9, isRight ? -3 : 3, -11);
      ctx.closePath();
      ctx.fillStyle = withAlpha(accent, 0.2);
      ctx.fill();
      ctx.stroke();

      // 5 tiny round toes
      const toes = isRight
        ? [[-3.5, -14, 1.8], [-0.5, -14.5, 1.5], [2.2, -14, 1.3], [4.5, -13, 1.1], [6.2, -11.5, 0.9]]
        : [[3.5, -14, 1.8], [0.5, -14.5, 1.5], [-2.2, -14, 1.3], [-4.5, -13, 1.1], [-6.2, -11.5, 0.9]];
      for (const [tx, ty, tr] of toes) {
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
      }
      ctx.restore();
    };
    drawFoot(-6.5, 14, false);
    drawFoot(6.5, 14, true);

    // 4. Radiant 8-pointed Janma Nakshatra birth star overhead
    ctx.save();
    ctx.translate(0, -26);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 12 : 5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(accent, 0.25);
    ctx.fill();
    ctx.stroke();

    // Center star bindu
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 1); ctx.lineTo(-4, 12); ctx.lineTo(17, -13); ctx.stroke();
  }
  ctx.restore();
}

/** A small, fully procedural service illustration, drawn in a 100-unit local space. */
export function drawServiceArt(
  ctx: CanvasRenderingContext2D,
  service: Service,
  style: StyleKey,
  cx: number,
  cy: number,
  size: number,
  theme: Theme,
  alpha = 0.9,
  variant: PlateVariant = "relief",
) {
  const serviceKey = service.id.toLowerCase().replace(/[^a-z]/g, "");
  if (variant === "line") {
    drawLinePlate(ctx, serviceKey, cx, cy, size, theme, alpha);
    return;
  }
  if (!["jathagam", "marriage", "babynaming", "muhurtham", "panchangam", "transits", "trust"].includes(serviceKey)) {
    drawMotif(ctx, motifFor(style, service.motif), cx, cy, size, theme, alpha);
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  ctx.globalAlpha *= alpha;

  const gold = ctx.createLinearGradient(-35, -38, 32, 38);
  gold.addColorStop(0, "#FFFCE2");
  gold.addColorStop(0.2, "#F2C75C");
  gold.addColorStop(0.48, "#FFFDF0");
  gold.addColorStop(0.72, "#B87819");
  gold.addColorStop(1, "#F8D775");

  const deep = ctx.createLinearGradient(0, -42, 0, 42);
  deep.addColorStop(0, "#54320F");
  deep.addColorStop(0.48, "#BA872E");
  deep.addColorStop(1, "#3E1E07");

  const gem = ctx.createRadialGradient(-2, -4, 1, 0, 0, 15);
  gem.addColorStop(0, "#FFFFFF");
  gem.addColorStop(0.2, "#8DF5F0");
  gem.addColorStop(0.65, "#14959B");
  gem.addColorStop(1, "#05343D");

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (serviceKey === "jathagam") {
    // Flagship South Indian 4×4 Rasi Chakra with 12 outer houses and open Brahma sanctum
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 11;
    ctx.shadowOffsetY = 6;

    // Outer beveled gold foundation plate
    roundRect(ctx, -45, -45, 90, 90, 8);
    ctx.fillStyle = deep;
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.lineWidth = 3.8;
    ctx.strokeStyle = gold;
    ctx.stroke();

    // Outer gold beading pips
    ctx.fillStyle = "#FFFDE7";
    for (let i = 0; i < 4; i += 1) {
      const cornerX = (i % 2 === 0 ? -1 : 1) * 39;
      const cornerY = (i < 2 ? -1 : 1) * 39;
      ctx.beginPath();
      ctx.arc(cornerX, cornerY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner dark velvet field
    const fieldGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    fieldGrad.addColorStop(0, theme.light ? "#2E1B09" : "#0A0E1A");
    fieldGrad.addColorStop(1, theme.light ? "#140A02" : "#020306");
    roundRect(ctx, -39, -39, 78, 78, 5);
    ctx.fillStyle = fieldGrad;
    ctx.fill();

    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Corner repoussé lotus brackets
    for (const [bx, by, rot] of [
      [-39, -39, 0],
      [39, -39, Math.PI / 2],
      [39, 39, Math.PI],
      [-39, 39, -Math.PI / 2],
    ] as const) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(9, 0);
      ctx.quadraticCurveTo(4.5, 4.5, 0, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // South Indian 4×4 rasi grid lines (perimeter houses only, central 2×2 sanctum stays open)
    ctx.strokeStyle = withAlpha(theme.gold, 0.85);
    ctx.lineWidth = 1.2;
    for (const p of [-19.5, 19.5]) {
      // Top & bottom segments
      ctx.beginPath();
      ctx.moveTo(p, -39);
      ctx.lineTo(p, -19.5);
      ctx.moveTo(p, 19.5);
      ctx.lineTo(p, 39);
      ctx.stroke();

      // Left & right segments
      ctx.beginPath();
      ctx.moveTo(-39, p);
      ctx.lineTo(-19.5, p);
      ctx.moveTo(19.5, p);
      ctx.lineTo(39, p);
      ctx.stroke();
    }

    // Outer perimeter dividers for 12 houses
    for (const d of [-39, 39]) {
      ctx.beginPath();
      ctx.moveTo(-19.5, d);
      ctx.lineTo(19.5, d);
      ctx.moveTo(d, -19.5);
      ctx.lineTo(d, 19.5);
      ctx.stroke();
    }

    // Sacred Tamil / Vedic planetary glyph seeds in key houses:
    // Mesha (1st / Lagna): Ascendant marker "ல" (La)
    ctx.save();
    ctx.font = "bold 9px 'Noto Sans Tamil', 'Noto Serif Tamil', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFE899";
    ctx.fillText("ல", -29, -29);

    // Simha (5th): Surya "சூ"
    ctx.font = "bold 7.5px 'Noto Sans Tamil', serif";
    ctx.fillText("சூ", 29, -9.5);

    // Kataka (4th): Chandra "சந்"
    ctx.font = "bold 7px 'Noto Sans Tamil', serif";
    ctx.fillText("சந்", 29, -29);

    // Dhanus (9th): Guru "குரு"
    ctx.fillText("குரு", 9.5, 29);

    // Makara (10th): Shani "சனி"
    ctx.fillText("சனி", -9.5, 29);
    ctx.restore();

    // Golden Bindus in other houses
    const houses: Array<[number, number, number]> = [
      [-9.5, -29.25, 1.4],
      [9.5, -29.25, 1.4],
      [29.25, 9.5, 1.6],
      [29.25, 29.25, 1.8], // Thula
      [-29.25, 29.25, 1.8],
      [-29.25, 9.5, 1.4],
      [-29.25, -9.5, 1.4],
    ];
    ctx.fillStyle = gold;
    for (const [hx, hy, hr] of houses) {
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Brahma Sanctum (open 2×2 field) with radiant 8-petal golden lotus & bindu
    ctx.save();
    const sanctumGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 19.5);
    sanctumGrad.addColorStop(0, "#4E3010");
    sanctumGrad.addColorStop(0.65, "#251404");
    sanctumGrad.addColorStop(1, "#100601");
    roundRect(ctx, -19.5, -19.5, 39, 39, 3);
    ctx.fillStyle = sanctumGrad;
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Sri Yantra diamond in sanctum
    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.45);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(17, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(-17, 0);
    ctx.closePath();
    ctx.stroke();

    // 8-petal central blooming lotus
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(3.2, 7, 0, 13);
      ctx.quadraticCurveTo(-3.2, 7, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Divine central bindu with sacred radiance
    ctx.shadowColor = withAlpha(theme.gold, 0.95);
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#FFFDE7";
    ctx.beginPath();
    ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (serviceKey === "marriage") {
    // Matrimonial Union: Interlocking 3D Torus Wedding Bands, Solitaire Gem, & Kalyana Maalai
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 4.5;

    const ring = (x: number, y: number, r: number) => {
      // Outer shadow bevel
      ctx.lineWidth = 11.5;
      ctx.strokeStyle = "#522F09";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Main heavy 3D gold band
      ctx.lineWidth = 8.0;
      ctx.strokeStyle = gold;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Specular highlight rim catching sunlight
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,252,235,.95)";
      ctx.beginPath();
      ctx.arc(x - 1.2, y - 1.5, r - 3.0, Math.PI * 1.05, Math.PI * 1.9);
      ctx.stroke();

      // Inner shadow groove
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(55,25,4,.65)";
      ctx.beginPath();
      ctx.arc(x + 1.2, y + 1.5, r + 3.0, 0, Math.PI * 0.85);
      ctx.stroke();
    };

    ring(-16, 4, 25.5);
    ring(16, 4, 25.5);
    ctx.shadowColor = "transparent";

    // Brilliant-cut diamond solitaire at apex
    ctx.save();
    ctx.translate(0, -26);
    ctx.rotate(Math.PI / 4);

    ctx.shadowColor = "rgba(141,245,240,.75)";
    ctx.shadowBlur = 9;
    ctx.fillStyle = gem;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.7;
    ctx.strokeRect(-7, -7, 14, 14);

    // Diamond facet cuts
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.restore();

    // 4-point radiant lens flare from the diamond
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(0, -16);
    ctx.moveTo(-10, -26);
    ctx.lineTo(10, -26);
    ctx.stroke();

    // Sacred Thirumangalyam (Thali) knot at crest with twin auspicious gold coins
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(-4, -37, 2.8, 0, Math.PI * 2);
    ctx.arc(4, -37, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(theme.gold, 0.8);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-12, -37);
    ctx.lineTo(12, -37);
    ctx.stroke();

    // Cascading Kalyana Maalai garland arc beneath
    ctx.strokeStyle = "#1B5E20";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-45, 30);
    ctx.quadraticCurveTo(0, 49, 45, 30);
    ctx.stroke();

    // Alternating marigold florets, crimson rose buds, and white jasmine pearls
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      const gx = -42 + t * 84;
      const gy = 30 + Math.sin(t * Math.PI) * 17;
      ctx.save();
      ctx.translate(gx, gy);
      if (i % 2 === 0) {
        // Marigold
        ctx.fillStyle = "#E65100";
        ctx.beginPath();
        ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFB300";
        ctx.beginPath();
        ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFF9C4";
        ctx.beginPath();
        ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Jasmine pearl
        ctx.fillStyle = "#FFFDE7";
        ctx.beginPath();
        ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#B71C1C";
        ctx.beginPath();
        ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  } else if (serviceKey === "babynaming") {
    // Sacred Classical Temple Arch Engraving with Tamil Syllables, Lotus Throne & Bala Paadam
    // 0. Classical Temple Arch Tablet (Koodu Mandapam Arch) in Royal Ivory & 24k Gold
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    // Arched Ivory Tablet Base
    const archH = 88;
    const archW = 76;
    const tabletGrad = ctx.createLinearGradient(0, -46, 0, 42);
    tabletGrad.addColorStop(0, "#FFFDF9");
    tabletGrad.addColorStop(0.35, "#FAF2E0");
    tabletGrad.addColorStop(0.7, "#F4E5C7");
    tabletGrad.addColorStop(1, "#E8D3A4");

    ctx.fillStyle = tabletGrad;
    ctx.beginPath();
    ctx.moveTo(-archW / 2, 42);
    ctx.lineTo(-archW / 2, -12);
    ctx.quadraticCurveTo(-archW / 2, -46, 0, -50);
    ctx.quadraticCurveTo(archW / 2, -46, archW / 2, -12);
    ctx.lineTo(archW / 2, 42);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = "transparent";

    // 24k Gold Leaf Repoussé Arch Border
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Inner Hairline Gold Inlay
    ctx.strokeStyle = withAlpha(theme.gold, 0.55);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-archW / 2 + 4, 40);
    ctx.lineTo(-archW / 2 + 4, -10);
    ctx.quadraticCurveTo(-archW / 2 + 4, -42, 0, -45.5);
    ctx.quadraticCurveTo(archW / 2 - 4, -42, archW / 2 - 4, -10);
    ctx.lineTo(archW / 2 - 4, 40);
    ctx.stroke();

    // Temple Fluted Pillars (Thoongal)
    for (const px of [-archW / 2 + 3, archW / 2 - 3]) {
      ctx.fillStyle = gold;
      ctx.fillRect(px - 1.5, -8, 3, 48);
      // Capital & base
      ctx.fillRect(px - 3, -11, 6, 3.5);
      ctx.fillRect(px - 3, 38, 6, 3.5);
    }

    // Arch Apex Medallion with Sacred Tamil OM (ஓம்)
    ctx.save();
    ctx.shadowColor = "rgba(180, 120, 20, 0.75)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(0, -50, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#FFFDF8";
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Sacred OM (ஓம்) in Tamil Calligraphy
    ctx.fillStyle = "#3E2207";
    ctx.font = `bold 10px ${TAMIL}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ஓம்", 0, -49.5);
    ctx.restore();

    // Inscribed Auspicious Tamil Naming Syllable Cartouches (ந, க, சு, ம, ஸ்ரீ)
    const cartouches: Array<{ x: number; y: number; char: string }> = [
      { x: -28, y: -26, char: "ந" },
      { x: -30, y: 4, char: "க" },
      { x: 28, y: -26, char: "ஸ்ரீ" },
      { x: 30, y: 4, char: "சு" },
    ];
    for (const c of cartouches) {
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 0.7;
      ctx.stroke();

      ctx.fillStyle = "#3E2207";
      ctx.font = `600 6.5px ${TAMIL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.char, c.x, c.y + 0.5);
    }
    ctx.restore();

    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 4.5;

    // 1. Radiant 8-pointed Janma Nakshatra birth star at top
    const star = (cx2: number, cy2: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 16; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 8;
        const radius = i % 2 === 0 ? r : r * 0.38;
        const x = cx2 + Math.cos(a) * radius;
        const y = cy2 + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    ctx.save();
    ctx.shadowColor = withAlpha(theme.gold, 0.95);
    ctx.shadowBlur = 12;
    star(0, -34, 15);
    ctx.fillStyle = gold;
    ctx.fill();
    star(0, -34, 7.5);
    ctx.fillStyle = "#FFFDE7";
    ctx.fill();
    // Star rays / divine aura
    ctx.strokeStyle = withAlpha(theme.gold, 0.5);
    ctx.lineWidth = 1.0;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 16, -34 + Math.sin(a) * 16);
      ctx.lineTo(Math.cos(a) * 22, -34 + Math.sin(a) * 22);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Padma Peedam (Sacred Blooming Lotus Throne)
    // Lotus Base Pedestal (Stepped golden terrace)
    const baseGrad = ctx.createLinearGradient(-32, 24, 32, 34);
    baseGrad.addColorStop(0, "#734714");
    baseGrad.addColorStop(0.35, "#E8B44A");
    baseGrad.addColorStop(0.7, "#FFF0B8");
    baseGrad.addColorStop(1, "#522E08");
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.roundRect(-30, 26, 60, 6, [3, 3, 2, 2]);
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Outer Lotus Petals (Back layer, spreading wide)
    const petalGradBack = ctx.createLinearGradient(0, 5, 0, 26);
    petalGradBack.addColorStop(0, "#F48FB1");
    petalGradBack.addColorStop(0.5, "#AD1457");
    petalGradBack.addColorStop(1, "#6A1B9A");

    const drawPetal = (x: number, y: number, w: number, h: number, rot: number, fill: CanvasGradient | string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.bezierCurveTo(w, -h * 0.6, w * 0.9, h * 0.3, 0, h * 0.5);
      ctx.bezierCurveTo(-w * 0.9, h * 0.3, -w, -h * 0.6, 0, -h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(theme.gold, 0.7);
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.restore();
    };

    // Back side petals
    drawPetal(-25, 20, 9, 17, -0.65, petalGradBack);
    drawPetal(25, 20, 9, 17, 0.65, petalGradBack);
    drawPetal(-16, 22, 10, 19, -0.35, petalGradBack);
    drawPetal(16, 22, 10, 19, 0.35, petalGradBack);
    drawPetal(0, 23, 11, 20, 0, petalGradBack);

    // Front/Mid Lotus Petals (Luminous rose, ivory and gold)
    const petalGradFront = ctx.createLinearGradient(0, 10, 0, 28);
    petalGradFront.addColorStop(0, "#FFF59D");
    petalGradFront.addColorStop(0.3, "#F06292");
    petalGradFront.addColorStop(0.8, "#C2185B");
    petalGradFront.addColorStop(1, "#880E4F");

    drawPetal(-20, 24, 8, 14, -0.5, petalGradFront);
    drawPetal(20, 24, 8, 14, 0.5, petalGradFront);
    drawPetal(-10, 25, 9, 15, -0.22, petalGradFront);
    drawPetal(10, 25, 9, 15, 0.22, petalGradFront);
    drawPetal(0, 26, 10, 16, 0, petalGradFront);

    // 3. Divine Golden Baby Footprints (Bala Paadam / கிருஷ்ணர் பாதம்)
    // Left & right tiny chubby footprints side-by-side
    const drawBabyFoot = (cx: number, cy: number, isRight: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      const flip = isRight ? 1 : -1;

      // Golden gradient for divine feet
      const footGrad = ctx.createLinearGradient(-7 * flip, -12, 7 * flip, 12);
      footGrad.addColorStop(0, "#FFFFFF");
      footGrad.addColorStop(0.25, "#FFF59D");
      footGrad.addColorStop(0.6, "#FFD54F");
      footGrad.addColorStop(0.88, "#FFA000");
      footGrad.addColorStop(1, "#BF360C");

      ctx.fillStyle = footGrad;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      // Sole contour: rounded chubby heel, gentle medial arch, broad front ball
      ctx.beginPath();
      ctx.moveTo(-1 * flip, -9); // Top medial under toes
      ctx.bezierCurveTo(4.2 * flip, -9, 6.2 * flip, -5, 5.5 * flip, -1); // Lateral ball curve
      ctx.bezierCurveTo(4.8 * flip, 3, 2.5 * flip, 5, 3.8 * flip, 8); // Waist & lateral heel
      ctx.bezierCurveTo(3.5 * flip, 11, -2.5 * flip, 11, -3.2 * flip, 8); // Round chubby heel
      ctx.bezierCurveTo(-2.2 * flip, 5, -4.5 * flip, 2, -4.2 * flip, -3); // Medial arch
      ctx.bezierCurveTo(-4.0 * flip, -7, -2.5 * flip, -9, -1 * flip, -9);
      ctx.closePath();
      ctx.fill();

      // Delicate gold outline & sole crease
      ctx.strokeStyle = "#FFF8E1";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Five chubby rounded baby toes
      // Big toe (medial) down to pinky (lateral)
      const toes = [
        { x: -2.8 * flip, y: -12.5, r: 2.2 }, // Big toe (largest)
        { x: -0.2 * flip, y: -13.2, r: 1.8 }, // Second toe
        { x: 2.1 * flip, y: -12.6, r: 1.5 },  // Third toe
        { x: 4.1 * flip, y: -11.3, r: 1.25 }, // Fourth toe
        { x: 5.8 * flip, y: -9.8, r: 1.0 },   // Pinky toe
      ];

      for (const t of toes) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = footGrad;
        ctx.fill();
        ctx.strokeStyle = "#FFF8E1";
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }

      // Auspicious Tilak / Padma mark on sole center
      ctx.fillStyle = "#D32F2F"; // Sacred Kumkum red dot
      ctx.beginPath();
      ctx.arc(0.2 * flip, -2, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFD700"; // Golden center
      ctx.beginPath();
      ctx.arc(0.2 * flip, -2, 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Draw pair of baby footprints
    drawBabyFoot(-9, 12, false); // Left baby foot
    drawBabyFoot(9, 12, true);   // Right baby foot

    // 4. White Jasmine Garland (Malligai) with Golden Ankle Bells (Kolusu / Salangai)
    ctx.save();
    // Jasmine buds arching at the base
    for (let i = -7; i <= 7; i += 1) {
      const gx = i * 4.4;
      const gy = 33 + Math.cos((i / 7) * (Math.PI / 2.2)) * 3;
      // White jasmine bud
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(gx, gy, 1.6, 2.2, (i * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#C8E6C9";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // Green calyx stem
      ctx.fillStyle = "#43A047";
      ctx.beginPath();
      ctx.arc(gx, gy + 1.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Jingling Golden Bells (Salangai / Kolusu) at bottom corners and center
    for (const bx of [-26, 0, 26]) {
      const by = bx === 0 ? 37 : 34;
      // Golden bell
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5D4037";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // Bell clapper slit
      ctx.fillStyle = "#B71C1C";
      ctx.beginPath();
      ctx.arc(bx, by + 1.2, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

  } else if (serviceKey === "muhurtham") {
    // Sacred Subha Muhurtham: Consecrated Purna Kumbha (Kalash), Mango Leaves & Kuthuvilakku
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4.5;

    // Blooming lotus throne base (Padma Peedam)
    for (let i = -3; i <= 3; i += 1) {
      const px = i * 9.5;
      ctx.save();
      ctx.translate(px, 36);
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-8, -2, -6, -10, 0, -12);
      ctx.bezierCurveTo(6, -10, 8, -2, 0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
    }

    // Heavy brass Kalash pot body
    const kalashGrad = ctx.createLinearGradient(-26, -10, 26, 30);
    kalashGrad.addColorStop(0, "#FFFCE2");
    kalashGrad.addColorStop(0.28, "#E0AD42");
    kalashGrad.addColorStop(0.68, "#8E5718");
    kalashGrad.addColorStop(1, "#4A2706");

    ctx.fillStyle = kalashGrad;
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.lineTo(16, -12);
    ctx.lineTo(13, -4);
    ctx.quadraticCurveTo(29, 4, 26, 24);
    ctx.quadraticCurveTo(0, 37, -26, 24);
    ctx.quadraticCurveTo(-29, 4, -13, -4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = gold;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Kalash neck rim & sacred thread (Kalava)
    ctx.fillStyle = gold;
    ctx.fillRect(-17.5, -15.5, 35, 4.8);
    ctx.strokeStyle = "#B71C1C";
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(-15, 6);
    ctx.quadraticCurveTo(0, 15, 15, 6);
    ctx.stroke();

    // Sacred Swastika symbol on Kalash belly
    ctx.save();
    ctx.strokeStyle = "#B71C1C";
    ctx.lineWidth = 1.4;
    const sw = 4;
    ctx.beginPath();
    ctx.moveTo(-sw, 0); ctx.lineTo(sw, 0);
    ctx.moveTo(0, -sw); ctx.lineTo(0, sw);
    ctx.moveTo(-sw, 0); ctx.lineTo(-sw, -sw * 0.7);
    ctx.moveTo(sw, 0); ctx.lineTo(sw, sw * 0.7);
    ctx.moveTo(0, -sw); ctx.lineTo(sw * 0.7, -sw);
    ctx.moveTo(0, sw); ctx.lineTo(-sw * 0.7, sw);
    ctx.stroke();
    ctx.restore();

    // Auspicious mango leaves (Mavilai) fanning upward from neck
    const leafAngles = [-0.68, -0.36, 0, 0.36, 0.68];
    for (const a of leafAngles) {
      ctx.save();
      ctx.translate(0, -14);
      ctx.rotate(a);
      const lg = ctx.createLinearGradient(-4, 0, 4, -27);
      lg.addColorStop(0, "#14441A");
      lg.addColorStop(0.48, "#2E7D32");
      lg.addColorStop(1, "#4CAF50");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(6.5, -14, 0, -29);
      ctx.quadraticCurveTo(-6.5, -14, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,250,200,0.6)";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -27);
      ctx.stroke();
      ctx.restore();
    }

    // Sacred coconut (Sriphala) crowned at center
    const cocoGrad = ctx.createRadialGradient(-2, -31, 1, 0, -27, 12);
    cocoGrad.addColorStop(0, "#FFE599");
    cocoGrad.addColorStop(0.4, "#A66926");
    cocoGrad.addColorStop(1, "#4C2907");
    ctx.fillStyle = cocoGrad;
    ctx.beginPath();
    ctx.ellipse(0, -27, 9.5, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Sacred tilak on coconut
    ctx.fillStyle = "#C62828";
    ctx.beginPath();
    ctx.arc(0, -27, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Traditional Tamil Kuthuvilakku lamp flame on left & right
    for (const side of [-36, 36]) {
      const flame = ctx.createRadialGradient(side, 4, 1, side, 4, 15);
      flame.addColorStop(0, "#FFFFFF");
      flame.addColorStop(0.35, "#FFE082");
      flame.addColorStop(0.7, "#FF9800");
      flame.addColorStop(1, "rgba(229,57,53,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.ellipse(side, 4, 5.5, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brass lamp diya bowl
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.moveTo(side - 8.5, 14);
      ctx.quadraticCurveTo(side, 23, side + 8.5, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  } else if (serviceKey === "panchangam") {
    // Celestial Vedic Astrolabe: Harmonized Surya-Chandra Dial with 12 Rasis and 27 Nakshatras
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4.5;

    // Outer astronomical dial ring
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.45);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, 39, 0, Math.PI * 2);
    ctx.stroke();

    // 27 Nakshatra ticks along circumference
    ctx.strokeStyle = withAlpha(theme.gold, 0.75);
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 27; i += 1) {
      const a = (i / 27) * Math.PI * 2;
      const isMajor = i % 9 === 0;
      const r1 = isMajor ? 35 : 39;
      const r2 = 44;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }

    // Left half: Golden Surya (Sun) with radiant flame rays
    ctx.save();
    ctx.translate(-14, 0);

    // 12 Radiant solar flare rays
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.7;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.quadraticCurveTo(Math.cos(a + 0.25) * 25, Math.sin(a + 0.25) * 25, Math.cos(a) * 31, Math.sin(a) * 31);
      ctx.stroke();
    }

    // Surya solar disc
    const sunGrad = ctx.createRadialGradient(-5, -6, 1, 0, 0, 20);
    sunGrad.addColorStop(0, "#FFFFEE");
    sunGrad.addColorStop(0.3, "#FFD54F");
    sunGrad.addColorStop(0.7, "#FF8F00");
    sunGrad.addColorStop(1, "#C64600");

    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 19.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.7;
    ctx.stroke();
    ctx.restore();

    // Right half: Chandra (Luminous Silver-Gold Crescent Moon with starry night field)
    ctx.save();
    ctx.translate(15, 0);

    const moonGrad = ctx.createRadialGradient(-3, -4, 1, 0, 0, 19.5);
    moonGrad.addColorStop(0, "#FFFFFF");
    moonGrad.addColorStop(0.4, "#FFF9C4");
    moonGrad.addColorStop(0.75, "#D7CCC8");
    moonGrad.addColorStop(1, "#8D6E63");

    // Crescent moon path
    ctx.beginPath();
    ctx.arc(0, 0, 19.5, -Math.PI * 0.48, Math.PI * 0.48);
    ctx.arc(-8, 0, 18.5, Math.PI * 0.48, -Math.PI * 0.48, true);
    ctx.closePath();
    ctx.fillStyle = moonGrad;
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.7;
    ctx.stroke();

    // Moon craters
    ctx.fillStyle = "rgba(141, 110, 99, 0.42)";
    for (const [cx3, cy3, cr3] of [
      [6, -6, 2.2],
      [8, 4, 1.8],
      [4, 9, 1.4],
    ]) {
      ctx.beginPath();
      ctx.arc(cx3, cy3, cr3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5 Sacred Bindus for Pancha-Anga (Tithi, Vara, Nakshatra, Yoga, Karana)
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const bx = Math.cos(a) * 28;
      const by = Math.sin(a) * 28;
      ctx.fillStyle = "#FFFDE7";
      ctx.beginPath();
      ctx.arc(bx, by, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central celestial bindu unifying Surya & Chandra
    ctx.shadowColor = withAlpha(theme.gold, 0.9);
    ctx.shadowBlur = 7;
    ctx.fillStyle = "#FFFDE7";
    ctx.beginPath();
    ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
    ctx.fill();
  } else if (serviceKey === "transits") {
    // Lord Shani / Saturn & Planetary Transits: High-Fidelity 3D Shaded Planet & Rings
    ctx.save();
    ctx.rotate(-0.4);

    const pr = 21.5; // Planet radius
    const rx = 50; // Ring major radius
    const ry = 14.8; // Ring minor radius

    // 1. Back-half of rings (behind globe)
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
    const ringBack = ctx.createLinearGradient(-rx, 0, rx, 0);
    ringBack.addColorStop(0, "rgba(180, 120, 40, 0.4)");
    ringBack.addColorStop(0.35, "rgba(240, 190, 90, 0.8)");
    ringBack.addColorStop(0.7, "rgba(255, 230, 150, 0.95)");
    ringBack.addColorStop(1, "rgba(160, 95, 25, 0.35)");
    ctx.strokeStyle = ringBack;
    ctx.lineWidth = 4.6;
    ctx.stroke();

    // Cassini Division behind
    ctx.strokeStyle = "rgba(18, 10, 4, 0.85)";
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 4.2, ry - 1.2, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Ring B behind
    const ringBBack = ctx.createLinearGradient(-rx, 0, rx, 0);
    ringBBack.addColorStop(0, "rgba(210, 150, 60, 0.6)");
    ringBBack.addColorStop(0.4, "rgba(255, 240, 175, 0.95)");
    ringBBack.addColorStop(0.8, "rgba(235, 180, 85, 0.85)");
    ringBBack.addColorStop(1, "rgba(180, 110, 35, 0.5)");
    ctx.strokeStyle = ringBBack;
    ctx.lineWidth = 8.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 9.4, ry - 2.8, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // 2. Planet Globe with 3D sphere illumination and atmospheric bands
    ctx.save();
    const planetGrad = ctx.createRadialGradient(-pr * 0.42, -pr * 0.45, pr * 0.08, 0, 0, pr * 1.05);
    planetGrad.addColorStop(0, "#FFF9E6");
    planetGrad.addColorStop(0.2, "#FFE599");
    planetGrad.addColorStop(0.48, "#D8A030");
    planetGrad.addColorStop(0.78, "#8F5614");
    planetGrad.addColorStop(0.95, "#442407");
    planetGrad.addColorStop(1, "#1E0E02");

    ctx.shadowColor = "rgba(0,0,0,0.68)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fillStyle = planetGrad;
    ctx.fill();
    ctx.shadowColor = "transparent";

    // Atmospheric bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "rgba(255, 248, 220, 0.28)";
    ctx.fillRect(-pr, -14, pr * 2, 4);
    ctx.fillStyle = "rgba(180, 110, 30, 0.35)";
    ctx.fillRect(-pr, -9, pr * 2, 5);
    ctx.fillStyle = "rgba(255, 230, 150, 0.25)";
    ctx.fillRect(-pr, -2, pr * 2, 3.5);
    ctx.fillStyle = "rgba(140, 75, 15, 0.42)";
    ctx.fillRect(-pr, 4, pr * 2, 5);

    // Ring shadow cast onto globe
    ctx.fillStyle = "rgba(18, 9, 3, 0.78)";
    ctx.beginPath();
    ctx.ellipse(0, 3, pr * 1.05, 4.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Illuminated sunlit crescent limb
    ctx.strokeStyle = "rgba(255, 250, 230, 0.88)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, pr - 0.7, Math.PI * 0.9, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();

    // 3. Front-half of rings (in front of globe)
    // Ring B in front
    const ringBFront = ctx.createLinearGradient(-rx, 0, rx, 0);
    ringBFront.addColorStop(0, "rgba(220, 160, 65, 0.85)");
    ringBFront.addColorStop(0.35, "rgba(255, 245, 195, 1)");
    ringBFront.addColorStop(0.7, "rgba(245, 195, 95, 0.95)");
    ringBFront.addColorStop(1, "rgba(195, 120, 40, 0.75)");
    ctx.strokeStyle = ringBFront;
    ctx.lineWidth = 8.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 9.4, ry - 2.8, 0, 0, Math.PI);
    ctx.stroke();

    // Cassini Division in front
    ctx.strokeStyle = "rgba(20, 12, 4, 0.9)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 4.2, ry - 1.2, 0, 0, Math.PI);
    ctx.stroke();

    // Ring A in front
    const ringAFront = ctx.createLinearGradient(-rx, 0, rx, 0);
    ringAFront.addColorStop(0, "rgba(190, 130, 45, 0.75)");
    ringAFront.addColorStop(0.3, "rgba(255, 230, 155, 0.95)");
    ringAFront.addColorStop(0.7, "rgba(240, 180, 80, 0.85)");
    ringAFront.addColorStop(1, "rgba(170, 100, 30, 0.65)");
    ctx.strokeStyle = ringAFront;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.stroke();

    // Razor-sharp ring edge highlight
    ctx.strokeStyle = "rgba(255, 250, 220, 0.88)";
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 2.0, ry + 0.6, 0, 0, Math.PI * 0.95);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  } else {
    // Astro Sivam Certified Astrologer Seal: 32-scallop Thanjavur Medallion, Dharmachakra, & Gold Ribbon
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 11;
    ctx.shadowOffsetY = 5.5;

    // 48-point scalloped gold repoussé perimeter
    ctx.beginPath();
    for (let i = 0; i < 48; i += 1) {
      const a = (Math.PI * 2 * i) / 48;
      const r = i % 2 ? 41 : 46;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (!i) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = deep;
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = gold;
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // Beaded pearl ring
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      ctx.fillStyle = "#FFFDE7";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 36, Math.sin(a) * 36, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner imperial midnight sanctum
    const sanctum = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
    sanctum.addColorStop(0, "#3D2411");
    sanctum.addColorStop(0.7, "#201208");
    sanctum.addColorStop(1, "#0A0502");
    ctx.fillStyle = sanctum;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.9;
    ctx.stroke();

    // 24-spoke Dharmachakra rays
    ctx.strokeStyle = withAlpha(theme.gold, 0.45);
    ctx.lineWidth = 0.85;
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29);
      ctx.stroke();
    }

    // Bold 3D gold verification checkmark
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 6;
    ctx.strokeStyle = "#5A340C";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-15, 1);
    ctx.lineTo(-4, 13);
    ctx.lineTo(18, -13);
    ctx.stroke();

    ctx.strokeStyle = gold;
    ctx.lineWidth = 6.4;
    ctx.beginPath();
    ctx.moveTo(-15, 1);
    ctx.lineTo(-4, 13);
    ctx.lineTo(18, -13);
    ctx.stroke();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.lineTo(-4, 10);
    ctx.lineTo(17, -15);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------- type primitives --------------------------- */

type Align = "left" | "center" | "right";

interface Ctx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  theme: Theme;
  logo: HTMLImageElement;
  service: Service;
  content: CreativeContent;
  /** 4:5 (true) or 1:1 (false) — compositions tighten their vertical rhythm for squares. */
  tall: boolean;
}

function trackedWidth(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  const widths = Array.from(text).map((char) => ctx.measureText(char).width);
  return widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, widths.length - 1);
}

function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, fade: "right" | "both" | "none" = "right") {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  if (fade === "none") {
    ctx.fillStyle = color;
  } else if (fade === "both") {
    g.addColorStop(0, withAlpha(color, 0));
    g.addColorStop(0.5, color);
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
  } else {
    g.addColorStop(0, color);
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
  }
  ctx.fillRect(x, y, w, 1);
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function lockup(c: Ctx, y: number, size = c.W * 0.036, opacity = 1) {
  drawGlobalLockup(c.ctx, c.logo, { W: c.W, H: c.H, theme: c.theme, baseSize: size, pad: c.W * 0.072, topBand: y - size * 0.3, bottomBand: c.H * 0.08, opacity });
}

/** Small-caps tracked label. Returns its width. */
function label(c: Ctx, text: string, x: number, y: number, size: number, color: string, align: Align = "left", tracking = size * 0.22, weight = 600) {
  const { ctx } = c;
  ctx.save();
  ctx.font = SANS(size, weight);
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  const upper = text.toUpperCase();
  drawTracked(ctx, upper, x, y, tracking, align);
  const width = trackedWidth(ctx, upper, tracking);
  ctx.restore();
  return width;
}

interface HeadlineOptions {
  x: number;
  y: number;
  maxWidth: number;
  maxLines: number;
  size: number;
  minSize: number;
  align: Align;
  /** Metallic foil (heritage) or flat ink (modern). */
  foil: boolean;
  color?: string;
  lead?: number;
  weight?: number;
  font?: (size: number, weight?: number) => string;
}

/** Draws the headline and returns the block height. */
function headline(c: Ctx, text: string, o: HeadlineOptions) {
  const { ctx, theme } = c;
  const lead = o.lead ?? 1.12;
  const weight = o.weight ?? 700;
  const fit = fitHeadline(ctx, text, o.maxWidth, o.maxLines, o.size, o.minSize, weight, o.font);
  const face = o.font ?? DISPLAY;
  ctx.save();
  ctx.font = face(fit.size, weight);
  ctx.textAlign = o.align;
  ctx.textBaseline = "top";
  const offsets = leadOffsets(fit.lines, fit.size, lead);
  fit.lines.forEach((line, index) => {
    if (o.foil) foilText(ctx, line, o.x, o.y + offsets[index], theme);
    else {
      ctx.fillStyle = o.color ?? theme.ink;
      ctx.fillText(line, o.x, o.y + offsets[index]);
    }
  });
  ctx.restore();
  return blockHeight(fit.lines, fit.size, lead);
}

function tamilLine(c: Ctx, x: number, y: number, size: number, align: Align, color: string, foil = false) {
  if (!c.content.tamil) return 0;
  const { ctx, theme } = c;
  ctx.save();
  ctx.font = TAMIL(size);
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  if (foil) foilText(ctx, c.content.tamil, x, y, theme);
  else {
    ctx.fillStyle = color;
    ctx.fillText(c.content.tamil, x, y);
  }
  ctx.restore();
  return size * 1.75;
}

function subline(c: Ctx, x: number, y: number, size: number, maxWidth: number, align: Align, color: string, maxLines = 2, font = SANS) {
  if (!c.content.subline) return 0;
  const { ctx } = c;
  ctx.save();
  ctx.font = font(size, 400);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const lines = wrapClip(ctx, c.content.subline, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * size * 1.45));
  ctx.restore();
  return lines.length * size * 1.45;
}

/** Outlined capsule chips. Falls back to a separated text row if they do not fit. */
function capsuleChips(c: Ctx, x: number, y: number, maxWidth: number, align: Align, options: { size?: number; height?: number; fill?: string; stroke?: string; color?: string } = {}) {
  const { ctx, theme } = c;
  const size = options.size ?? c.W * 0.0148;
  const height = options.height ?? c.H * 0.034;
  const gap = c.W * 0.012;
  const parts = c.content.chips.filter(Boolean).slice(0, 3);
  if (!parts.length) return 0;
  ctx.save();
  ctx.font = SANS(size, 500);
  const tracking = size * 0.08;
  const widths = parts.map((chip) => trackedWidth(ctx, chip, tracking) + size * 2.1);
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (parts.length - 1);
  if (total > maxWidth) {
    ctx.restore();
    return textChips(c, x, y + height * 0.5, maxWidth, align, { size, color: options.color });
  }
  let cursor = align === "center" ? x - total / 2 : x;
  parts.forEach((chip, index) => {
    roundRect(ctx, cursor, y, widths[index], height, height / 2);
    ctx.fillStyle = options.fill ?? withAlpha(theme.gold, 0.08);
    ctx.fill();
    ctx.strokeStyle = options.stroke ?? withAlpha(theme.gold, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = options.color ?? (theme.light ? theme.ink : theme.goldSoft);
    ctx.textBaseline = "middle";
    drawTracked(ctx, chip, cursor + widths[index] / 2, y + height / 2 + 1, tracking, "center");
    cursor += widths[index] + gap;
  });
  ctx.restore();
  return height;
}

/** Chips as a tracked text row separated by diamonds. */
function textChips(c: Ctx, x: number, y: number, maxWidth: number, align: Align, options: { size?: number; color?: string; mark?: string } = {}) {
  const { ctx, theme } = c;
  const size = options.size ?? c.W * 0.0138;
  const parts = c.content.chips.filter(Boolean).slice(0, 3).map((chip) => chip.toUpperCase());
  if (!parts.length) return 0;
  ctx.save();
  let tracking = size * 0.16;
  ctx.font = SANS(size, 600);
  let widths = parts.map((part) => trackedWidth(ctx, part, tracking));
  let gap = size * 2;
  let total = widths.reduce((sum, w) => sum + w, 0) + gap * (parts.length - 1);
  if (total > maxWidth) {
    tracking = size * 0.06;
    gap = size * 1.4;
    widths = parts.map((part) => trackedWidth(ctx, part, tracking));
    total = widths.reduce((sum, w) => sum + w, 0) + gap * (parts.length - 1);
  }
  if (total > maxWidth) {
    // stack vertically instead of overflowing
    ctx.fillStyle = options.color ?? theme.muted;
    ctx.textBaseline = "alphabetic";
    parts.forEach((part, index) => drawTracked(ctx, part, x, y + index * size * 1.9, tracking, align));
    ctx.restore();
    return parts.length * size * 1.9;
  }
  let cursor = align === "center" ? x - total / 2 : x;
  ctx.fillStyle = options.color ?? theme.muted;
  ctx.textBaseline = "alphabetic";
  parts.forEach((part, index) => {
    drawTracked(ctx, part, cursor, y, tracking, "left");
    cursor += widths[index];
    if (index < parts.length - 1) {
      diamond(ctx, cursor + gap / 2, y - size * 0.34, Math.max(2.4, size * 0.2), options.mark ?? withAlpha(theme.gold, 0.8));
      cursor += gap;
    }
  });
  ctx.restore();
  return size * 1.4;
}

/** Numbered contents list for the editorial systems. */
function listChips(c: Ctx, x: number, y: number, size: number, color: string, index: string, gap = size * 2.1) {
  const { ctx } = c;
  const parts = c.content.chips.filter(Boolean).slice(0, 3);
  ctx.save();
  ctx.textBaseline = "alphabetic";
  parts.forEach((chip, i) => {
    const row = y + i * gap;
    ctx.font = SANS(size * 0.78, 600);
    ctx.fillStyle = index;
    ctx.fillText(`0${i + 1}`, x, row);
    ctx.font = SANS(size, 500);
    ctx.fillStyle = color;
    ctx.fillText(chip, x + size * 2.2, row);
    rule(ctx, x, row + size * 0.7, c.W * 0.36, withAlpha(color, 0.2), "right");
  });
  ctx.restore();
  return parts.length * gap;
}

/** Solid price pill. Returns its width. */
function pricePill(c: Ctx, x: number, y: number, align: Align, options: { fill?: string; color?: string; size?: number; height?: number; outline?: boolean } = {}) {
  if (!c.content.price) return 0;
  const { ctx, theme } = c;
  const size = options.size ?? c.W * 0.0155;
  const height = options.height ?? c.H * 0.038;
  const tracking = size * 0.12;
  ctx.save();
  ctx.font = SANS(size, 700);
  const text = c.content.price.toUpperCase();
  const width = trackedWidth(ctx, text, tracking) + size * 2.6;
  const left = align === "center" ? x - width / 2 : x;
  roundRect(ctx, left, y, width, height, height / 2);
  if (options.outline) {
    ctx.strokeStyle = options.fill ?? theme.gold;
    ctx.lineWidth = Math.max(1, c.W * 0.0015);
    ctx.stroke();
    ctx.fillStyle = options.color ?? theme.gold;
  } else {
    ctx.fillStyle = options.fill ?? theme.gold;
    ctx.fill();
    ctx.fillStyle = options.color ?? "#140F04";
  }
  ctx.textBaseline = "middle";
  drawTracked(ctx, text, left + width / 2, y + height / 2 + 1, tracking, "center");
  ctx.restore();
  return width;
}

/**
 * CTA as a tracked line with an arrow. The arrow is drawn, not typed: U+2192 is
 * outside the Latin subsets the suite ships, so as a glyph it would fall to
 * whatever the visitor's system has.
 */
function ctaLine(c: Ctx, x: number, y: number, align: "left" | "right" | "center", color: string, size = c.W * 0.0142, maxWidth = c.W * 0.5) {
  if (!c.content.cta) return;
  const { ctx } = c;
  ctx.save();
  ctx.font = SANS(size, 600);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  const arrowW = size * 0.9;
  const gap = size * 0.6;
  let text = c.content.cta.replace(/^https?:\/\//, "");
  while (ctx.measureText(text).width + gap + arrowW > maxWidth && text.length > 10) text = `${text.slice(0, -2)}…`;
  const textW = ctx.measureText(text).width;
  const total = textW + gap + arrowW;
  const left = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.textAlign = "left";
  ctx.fillText(text, left, y);
  const ax = left + textW + gap;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(ax, y);
  ctx.lineTo(ax + arrowW, y);
  ctx.moveTo(ax + arrowW - size * 0.32, y - size * 0.32);
  ctx.lineTo(ax + arrowW, y);
  ctx.lineTo(ax + arrowW - size * 0.32, y + size * 0.32);
  ctx.stroke();
  ctx.restore();
}

function footer(c: Ctx, y: number, color?: string, size = c.W * 0.0122) {
  drawContactLine(c.ctx, c.W, c.H, c.theme, { y, size, color });
}

/** Service plate with an optional halo; variant and shadow follow the system. */
function plate(c: Ctx, style: StyleKey, cx: number, cy: number, size: number, variant: PlateVariant = "relief", halo = 0) {
  const { ctx, theme } = c;
  if (halo > 0) {
    const g = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.95);
    g.addColorStop(0, withAlpha(theme.gold, halo));
    g.addColorStop(1, withAlpha(theme.gold, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  drawServiceArt(ctx, c.service, style, cx, cy, size, theme, 0.96, variant);
}

/* ================================= heritage ================================ */

/* 01 · Signature Gold — centred shrine, the identity layout. */
function renderSignature(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.075;
  const inset = W * 0.024;
  const artSize = c.tall ? H * 0.23 : H * 0.26;
  const artCy = c.tall ? H * 0.31 : H * 0.33;
  paintStyledBackdrop(ctx, W, H, theme, "signature", { seed: 11, art: { x: W / 2 - artSize / 2, y: artCy - artSize / 2, w: artSize, h: artSize } });
  drawStyleFrame(ctx, W, H, theme, "signature", inset);
  lockup(c, H * 0.072);
  if (c.content.kicker) {
    const y = c.tall ? H * 0.145 : H * 0.15;
    const w = label(c, c.content.kicker, W / 2, y, W * 0.0138, withAlpha(theme.gold, 0.95), "center", 3.4);
    rule(ctx, W / 2 - w / 2 - W * 0.06, y - W * 0.005, W * 0.045, withAlpha(theme.gold, 0.6), "none");
    rule(ctx, W / 2 + w / 2 + W * 0.015, y - W * 0.005, W * 0.045, withAlpha(theme.gold, 0.6), "none");
  }
  plate(c, "signature", W / 2, artCy, artSize);
  let y = c.tall ? H * 0.5 : H * 0.52;
  y += headline(c, c.content.headline, { x: W / 2, y, maxWidth: W - pad * 2, maxLines: c.tall ? 3 : 2, size: W * 0.066, minSize: W * 0.042, align: "center", foil: true });
  y += H * 0.008;
  y += tamilLine(c, W / 2, y, W * 0.028, "center", theme.goldSoft, true);
  y += subline(c, W / 2, y, W * 0.0215, W - pad * 3, "center", theme.muted);
  const chipsY = Math.max(c.tall ? H * 0.775 : H * 0.76, y + H * 0.02);
  const chipsH = capsuleChips(c, W / 2, chipsY, W - pad * 2, "center");
  const ruleY = Math.max(c.tall ? H * 0.845 : H * 0.835, chipsY + chipsH + H * 0.03);
  rule(ctx, pad, ruleY, W - pad * 2, withAlpha(theme.gold, 0.5), "both");
  const priceY = ruleY + H * 0.018;
  pricePill(c, pad, priceY, "left");
  ctaLine(c, W - pad, priceY + H * 0.019, "right", withAlpha(theme.gold, 0.95), W * 0.0148, W * 0.5);
  footer(c, H - H * 0.038);
}

/* 02 · Thanjavur Relief — enthroned in a gesso arch. */
function renderThanjavur(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.085;
  const inset = W * 0.026;
  const artSize = c.tall ? H * 0.19 : H * 0.21;
  const artCy = c.tall ? H * 0.315 : H * 0.33;
  paintStyledBackdrop(ctx, W, H, theme, "thanjavur", { seed: 13, art: { x: W / 2 - artSize / 2, y: artCy - artSize / 2, w: artSize, h: artSize } });
  drawStyleFrame(ctx, W, H, theme, "thanjavur", inset);
  lockup(c, H * 0.078);
  plate(c, "thanjavur", W / 2, artCy, artSize, "relief", 0.3);
  let y = c.tall ? H * 0.56 : H * 0.57;
  if (c.content.kicker) {
    label(c, c.content.kicker, W / 2, y, W * 0.0132, "#FFD98A", "center", 3.6);
    diamond(ctx, W / 2 - W * 0.14, y - W * 0.005, W * 0.006, "#FFD98A");
    diamond(ctx, W / 2 + W * 0.14, y - W * 0.005, W * 0.006, "#FFD98A");
    y += H * 0.03;
  }
  y += headline(c, c.content.headline, { x: W / 2, y, maxWidth: W - pad * 2, maxLines: c.tall ? 3 : 2, size: W * 0.06, minSize: W * 0.04, align: "center", foil: true });
  y += H * 0.006;
  y += tamilLine(c, W / 2, y, W * 0.027, "center", "#FFE2A8", true);
  y += subline(c, W / 2, y, W * 0.021, W - pad * 2.6, "center", "rgba(255,230,200,0.78)");
  const chipsY = Math.max(c.tall ? H * 0.8 : H * 0.785, y + H * 0.02);
  const chipsH = textChips(c, W / 2, chipsY, W - pad * 2, "center", { color: "rgba(255,236,210,0.82)", mark: "#FFD98A" });
  // brass price plate
  if (c.content.price) {
    const plateH = H * 0.046;
    const plateY = Math.max(c.tall ? H * 0.83 : H * 0.815, chipsY + chipsH + H * 0.012);
    ctx.save();
    ctx.font = SANS(W * 0.0155, 700);
    const text = c.content.price.toUpperCase();
    const plateW = trackedWidth(ctx, text, 2.6) + W * 0.12;
    const plateX = W / 2 - plateW / 2;
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = W * 0.012;
    ctx.shadowOffsetY = W * 0.004;
    ctx.fillStyle = foilGradient(ctx, theme, plateX, plateY, plateH);
    roundRect(ctx, plateX, plateY, plateW, plateH, 4);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = withAlpha("#5A2A08", 0.7);
    ctx.lineWidth = 1;
    roundRect(ctx, plateX + 4, plateY + 4, plateW - 8, plateH - 8, 2);
    ctx.stroke();
    ctx.fillStyle = "#3A1606";
    ctx.textBaseline = "middle";
    drawTracked(ctx, text, W / 2, plateY + plateH / 2 + 1, 2.6, "center");
    ctx.restore();
    ctaLine(c, W / 2, plateY + plateH + H * 0.03, "center", "#FFD98A", W * 0.0138, W * 0.7);
  }
  footer(c, H - H * 0.04, "rgba(255,230,200,0.6)");
}

/* 03 · Kolam Morning — light, letter-like, art top-left. */
function renderKolam(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.09;
  const artSize = W * 0.2;
  const artBox = { x: pad, y: c.tall ? H * 0.155 : H * 0.15, w: artSize, h: artSize };
  paintStyledBackdrop(ctx, W, H, theme, "kolam", { seed: 17, art: artBox });
  drawStyleFrame(ctx, W, H, theme, "kolam", W * 0.03);
  lockup(c, H * 0.07);
  // plate on the terracotta square, drawn with light-theme gold
  drawServiceArt(ctx, c.service, "kolam", artBox.x + artSize / 2, artBox.y + artSize / 2, artSize * 0.88, { ...theme, light: false }, 0.98);
  // meta beside the plate
  const metaX = artBox.x + artSize + W * 0.06;
  let my = artBox.y + artSize * 0.2;
  if (c.content.kicker) {
    label(c, c.content.kicker, metaX, my, W * 0.0135, "#9A4A22", "left", 3.2);
    my += H * 0.028;
  }
  ctx.save();
  ctx.font = SANS(W * 0.0145, 500);
  ctx.fillStyle = withAlpha("#2C1A10", 0.7);
  ctx.textBaseline = "alphabetic";
  ctx.fillText(BRAND.ephemeris, metaX, my);
  my += H * 0.024;
  ctx.fillText(BRAND.languages, metaX, my);
  my += H * 0.024;
  ctx.fillText(c.service.kind, metaX, my);
  ctx.restore();
  rule(ctx, metaX, artBox.y + artSize - W * 0.004, W * 0.3, withAlpha("#D9A441", 0.9), "right");
  let y = artBox.y + artSize + (c.tall ? H * 0.065 : H * 0.05);
  y += headline(c, c.content.headline, { x: pad, y, maxWidth: W - pad * 2, maxLines: 3, size: W * 0.068, minSize: W * 0.044, align: "left", foil: false, color: "#2C1A10", lead: 1.08 });
  y += H * 0.012;
  y += tamilLine(c, pad, y, W * 0.028, "left", "#9A4A22");
  y += subline(c, pad, y, W * 0.0215, W - pad * 2.4, "left", withAlpha("#2C1A10", 0.72));
  const chipsY = c.tall ? H * 0.78 : H * 0.765;
  capsuleChips(c, pad, chipsY, W - pad * 2, "left", { fill: withAlpha("#9A4A22", 0.06), stroke: withAlpha("#9A4A22", 0.45), color: "#5A2E16" });
  const baseY = c.tall ? H * 0.865 : H * 0.855;
  rule(ctx, pad, baseY - H * 0.02, W - pad * 2, withAlpha("#9A4A22", 0.35), "none");
  pricePill(c, pad, baseY, "left", { fill: "#9A4A22", color: "#FFF3E2" });
  ctaLine(c, W - pad, baseY + H * 0.019, "right", "#9A4A22", W * 0.0145, W * 0.5);
  footer(c, H - H * 0.04, withAlpha("#2C1A10", 0.6));
}

/* 04 · Kanchipuram Silk — bordered like a sari, brooch plate. */
function renderSilk(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.125;
  const artSize = c.tall ? H * 0.2 : H * 0.23;
  const artCy = c.tall ? H * 0.29 : H * 0.3;
  paintStyledBackdrop(ctx, W, H, theme, "silk", { seed: 19, art: { x: W / 2 - artSize / 2, y: artCy - artSize / 2, w: artSize, h: artSize } });
  drawStyleFrame(ctx, W, H, theme, "silk", W * 0.02);
  lockup(c, H * 0.075);
  plate(c, "silk", W / 2, artCy, artSize, "relief", 0.22);
  let y = c.tall ? H * 0.46 : H * 0.48;
  if (c.content.kicker) {
    const w = label(c, c.content.kicker, W / 2, y, W * 0.0132, theme.goldSoft, "center", 3.6);
    drawMotif(ctx, "peacock", W / 2 - w / 2 - W * 0.05, y - W * 0.006, W * 0.028, theme, 0.9);
    drawMotif(ctx, "peacock", W / 2 + w / 2 + W * 0.05, y - W * 0.006, W * 0.028, theme, 0.9);
    y += H * 0.032;
  }
  y += headline(c, c.content.headline, { x: W / 2, y, maxWidth: W - pad * 2, maxLines: c.tall ? 3 : 2, size: W * 0.06, minSize: W * 0.04, align: "center", foil: true });
  y += H * 0.006;
  y += tamilLine(c, W / 2, y, W * 0.027, "center", theme.goldSoft, true);
  y += subline(c, W / 2, y, W * 0.021, W - pad * 2.2, "center", theme.muted);
  const chipsY = Math.max(c.tall ? H * 0.745 : H * 0.735, y + H * 0.02);
  const chipsH = textChips(c, W / 2, chipsY, W - pad * 2, "center", { color: withAlpha(theme.ink, 0.8) });
  // price + CTA sit together above the korvai band
  const rowY = Math.min(H * 0.84, Math.max(c.tall ? H * 0.79 : H * 0.78, chipsY + chipsH + H * 0.016));
  const pw = pricePill(c, W / 2 - W * 0.01, rowY, "left", { fill: theme.gold });
  void pw;
  ctaLine(c, W / 2 - W * 0.025, rowY + H * 0.019, "right", theme.goldSoft, W * 0.0138, W * 0.34);
  // contact inside the band
  footer(c, H - H * 0.0375, withAlpha("#FFE7C2", 0.9), W * 0.0118);
}

/* 05 · Gopuram Dusk — scene above, type on the dark street below. */
function renderGopuram(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.08;
  const artSize = c.tall ? H * 0.16 : H * 0.18;
  const artCy = c.tall ? H * 0.21 : H * 0.22;
  paintStyledBackdrop(ctx, W, H, theme, "gopuram", { seed: 23, art: { x: W / 2 - artSize / 2, y: artCy - artSize / 2, w: artSize, h: artSize } });
  drawStyleFrame(ctx, W, H, theme, "gopuram", W * 0.024);
  lockup(c, H * 0.072);
  plate(c, "gopuram", W / 2, artCy, artSize, "relief", 0.0);
  let y = c.tall ? H * 0.6 : H * 0.585;
  if (c.content.kicker) {
    label(c, c.content.kicker, W / 2, y, W * 0.0132, "#FFC46A", "center", 3.6);
    y += H * 0.03;
  }
  y += headline(c, c.content.headline, { x: W / 2, y, maxWidth: W - pad * 2, maxLines: c.tall ? 2 : 2, size: W * 0.058, minSize: W * 0.038, align: "center", foil: true });
  y += H * 0.005;
  y += tamilLine(c, W / 2, y, W * 0.026, "center", "#FFD98A", true);
  y += subline(c, W / 2, y, W * 0.0205, W - pad * 2.4, "center", "rgba(255,226,190,0.72)", 1);
  const chipsY = Math.max(c.tall ? H * 0.815 : H * 0.805, y + H * 0.018);
  const chipsH = textChips(c, W / 2, chipsY, W - pad * 2, "center", { color: "rgba(255,236,210,0.8)", mark: "#FFC46A" });
  const rowY = Math.max(c.tall ? H * 0.848 : H * 0.84, chipsY + chipsH + H * 0.012);
  rule(ctx, pad, rowY, W - pad * 2, withAlpha("#FFC46A", 0.4), "both");
  pricePill(c, pad, rowY + H * 0.016, "left", { fill: "#F2A23A" });
  ctaLine(c, W - pad, rowY + H * 0.035, "right", "#FFC46A", W * 0.0142, W * 0.5);
  footer(c, H - H * 0.038, "rgba(255,226,190,0.6)");
}

/* 06 · Karthigai Deepam — type high, lamps below. */
function renderDeepam(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.085;
  const artSize = c.tall ? H * 0.15 : H * 0.17;
  const artCy = c.tall ? H * 0.215 : H * 0.225;
  paintStyledBackdrop(ctx, W, H, theme, "deepam", { seed: 29, art: { x: W / 2 - artSize / 2, y: artCy - artSize / 2, w: artSize, h: artSize } });
  drawStyleFrame(ctx, W, H, theme, "deepam", W * 0.022);
  lockup(c, H * 0.07);
  plate(c, "deepam", W / 2, artCy, artSize, "relief", 0.26);
  let y = c.tall ? H * 0.345 : H * 0.36;
  if (c.content.kicker) {
    const w = label(c, c.content.kicker, W / 2, y, W * 0.0132, "#FFC46A", "center", 3.6);
    rule(ctx, W / 2 - w / 2 - W * 0.07, y - W * 0.005, W * 0.055, withAlpha("#FFC46A", 0.6), "none");
    rule(ctx, W / 2 + w / 2 + W * 0.015, y - W * 0.005, W * 0.055, withAlpha("#FFC46A", 0.6), "none");
    y += H * 0.032;
  }
  y += headline(c, c.content.headline, { x: W / 2, y, maxWidth: W - pad * 2, maxLines: 3, size: W * 0.064, minSize: W * 0.042, align: "center", foil: true });
  y += H * 0.008;
  y += tamilLine(c, W / 2, y, W * 0.028, "center", "#FFD98A", true);
  y += subline(c, W / 2, y, W * 0.0215, W - pad * 2.4, "center", "rgba(255,226,190,0.74)");
  y += H * 0.03;
  capsuleChips(c, W / 2, y, W - pad * 2, "center", { fill: "rgba(255,160,60,0.1)", stroke: "rgba(255,196,106,0.45)", color: "#FFE2B0" });
  y += H * 0.06;
  pricePill(c, W / 2, y, "center", { fill: "#FFB45A", color: "#2A1204" });
  ctaLine(c, W / 2, y + H * 0.06, "center", "#FFC46A", W * 0.0138, W * 0.7);
  footer(c, H - H * 0.036, "rgba(255,226,190,0.62)");
}

/* ================================== modern ================================= */

/* 07 · Mono Ink — oversized left-aligned type, line-art plate. */
function renderMono(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const left = W * 0.1;
  const right = W * 0.9;
  paintStyledBackdrop(ctx, W, H, theme, "mono", { seed: 31 });
  drawStyleFrame(ctx, W, H, theme, "mono", W * 0.03);
  lockup(c, H * 0.07, W * 0.034);
  // plate as a diagram, top-right
  const artSize = W * 0.26;
  drawServiceArt(ctx, c.service, "mono", right - artSize / 2, H * 0.2 + artSize * 0.1, artSize, theme, 0.95, "line");
  // index + kicker on the baseline grid
  const gridTop = c.tall ? H * 0.165 : H * 0.17;
  ctx.save();
  ctx.font = SANS(W * 0.0128, 600);
  ctx.fillStyle = "#E4572E";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("NO. 01", left, gridTop);
  ctx.restore();
  if (c.content.kicker) label(c, c.content.kicker, left + W * 0.08, gridTop, W * 0.0128, "rgba(255,255,255,0.75)", "left", 3.2);
  rule(ctx, left, gridTop + H * 0.016, W * 0.5, "rgba(255,255,255,0.3)", "none");
  let y = c.tall ? H * 0.36 : H * 0.34;
  y += headline(c, c.content.headline, { x: left, y, maxWidth: right - left, maxLines: 4, size: W * 0.086, minSize: W * 0.05, align: "left", foil: false, color: "#F5F5F2", lead: 1.0 });
  y += H * 0.018;
  y += tamilLine(c, left, y, W * 0.028, "left", "#E4572E");
  y += subline(c, left, y, W * 0.021, W * 0.62, "left", "rgba(255,255,255,0.62)");
  const listY = c.tall ? H * 0.765 : H * 0.75;
  rule(ctx, left, listY - H * 0.03, right - left, "rgba(255,255,255,0.2)", "none");
  listChips(c, left, listY, W * 0.0165, "rgba(255,255,255,0.86)", "#E4572E", H * 0.034);
  // price + CTA in the right column
  const priceY = listY - H * 0.012;
  ctx.save();
  ctx.font = DISPLAY(W * 0.03, 700);
  ctx.fillStyle = "#F5F5F2";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(c.content.price, right, priceY + H * 0.012);
  ctx.restore();
  ctaLine(c, right, priceY + H * 0.045, "right", "#E4572E", W * 0.0138, W * 0.4);
  rule(ctx, left, H * 0.92, right - left, "rgba(255,255,255,0.2)", "none");
  footer(c, H - H * 0.045, "rgba(255,255,255,0.5)");
}

/* 08 · Paper Editorial — two columns, numbered list, ink footer bar. */
function renderPaper(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const left = W * 0.085;
  const right = W * 0.915;
  const colGap = W * 0.04;
  const col = (right - left - colGap) / 2;
  const artSize = col * 0.62;
  const artBox = { x: right - col / 2 - artSize / 2, y: (c.tall ? H * 0.235 : H * 0.23) - artSize / 2, w: artSize, h: artSize };
  paintStyledBackdrop(ctx, W, H, theme, "paper", { seed: 37, art: artBox });
  drawStyleFrame(ctx, W, H, theme, "paper", W * 0.03);
  const inkColor = "#15120E";
  // meta row
  const metaY = H * 0.09;
  ctx.save();
  ctx.font = SANS(W * 0.0122, 600);
  ctx.fillStyle = "#B4531F";
  ctx.textBaseline = "alphabetic";
  drawTracked(ctx, BRAND.wordmark, left, metaY, 3, "left");
  ctx.fillStyle = withAlpha(inkColor, 0.6);
  drawTracked(ctx, `${c.service.kind}  ·  ${BRAND.languages}`.toUpperCase(), right, metaY, 2, "right");
  ctx.restore();
  rule(ctx, left, metaY + H * 0.016, right - left, withAlpha(inkColor, 0.5), "none");
  // plate in the right column panel
  drawServiceArt(ctx, c.service, "paper", artBox.x + artSize / 2, artBox.y + artSize / 2, artSize * 0.9, { ...theme, light: false }, 0.98);
  ctx.save();
  ctx.font = SANS(W * 0.0115, 500);
  ctx.fillStyle = withAlpha(inkColor, 0.55);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`Fig. 1 — ${c.service.shortName}`, artBox.x + artSize / 2, artBox.y + artSize + H * 0.04);
  ctx.restore();
  // left column: kicker + headline
  let y = c.tall ? H * 0.145 : H * 0.14;
  if (c.content.kicker) {
    label(c, c.content.kicker, left, y, W * 0.0128, "#B4531F", "left", 3.2);
    y += H * 0.03;
  }
  y += headline(c, c.content.headline, { x: left, y, maxWidth: col, maxLines: 5, size: W * 0.064, minSize: W * 0.04, align: "left", foil: false, color: inkColor, lead: 1.04, weight: 600 });
  y += H * 0.014;
  y += tamilLine(c, left, y, W * 0.026, "left", "#B4531F");
  // body band: serif standfirst left, numbered contents right
  const bodyY = Math.max(y + H * 0.03, artBox.y + artSize + H * 0.085);
  rule(ctx, left, bodyY, right - left, withAlpha(inkColor, 0.5), "none");
  label(c, "In this report", left, bodyY + H * 0.03, W * 0.011, "#B4531F", "left", 2.6);
  label(c, "Contents", right - col, bodyY + H * 0.03, W * 0.011, "#B4531F", "left", 2.6);
  subline(c, left, bodyY + H * 0.055, W * 0.03, col, "left", withAlpha(inkColor, 0.85), 4, SERIF);
  listChips(c, right - col, bodyY + H * 0.075, W * 0.018, withAlpha(inkColor, 0.85), "#B4531F", H * 0.056);
  // proof line low in the left column
  ctx.save();
  ctx.font = SANS(W * 0.0135, 400);
  ctx.fillStyle = withAlpha(inkColor, 0.6);
  ctx.textBaseline = "alphabetic";
  const proof = wrapClip(ctx, c.service.priceNote, col, 2);
  proof.forEach((line, i) => ctx.fillText(line, left, H * 0.83 + i * W * 0.02));
  ctx.restore();
  // ink footer bar: price left, CTA right, contact centred
  const barY = H * 0.89;
  pricePill(c, left, barY + H * 0.03, "left", { fill: "#F4EDE0", color: inkColor, height: H * 0.036 });
  ctaLine(c, right, barY + H * 0.048, "right", "#F4EDE0", W * 0.0138, W * 0.42);
  footer(c, H - H * 0.022, "rgba(244,237,224,0.55)", W * 0.011);
}

/* 09 · Ephemeris Blueprint — dial above, data block below. */
function renderEphemeris(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.085;
  const artSize = c.tall ? H * 0.16 : H * 0.18;
  const artCy = c.tall ? H * 0.3 : H * 0.31;
  paintStyledBackdrop(ctx, W, H, theme, "ephemeris", { seed: 41, art: { x: W / 2 - artSize / 2, y: artCy - artSize / 2, w: artSize, h: artSize } });
  drawStyleFrame(ctx, W, H, theme, "ephemeris", W * 0.03);
  lockup(c, H * 0.07, W * 0.034);
  drawServiceArt(ctx, c.service, "ephemeris", W / 2, artCy, artSize, theme, 0.95, "line");
  // dial labels
  ctx.save();
  ctx.font = SANS(W * 0.0115, 600);
  ctx.fillStyle = withAlpha(theme.gold, 0.85);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const R = artSize * 0.98;
  ["0°", "90°", "180°", "270°"].forEach((t, i) => {
    const a = (i / 4) * Math.PI * 2;
    ctx.fillText(t, W / 2 + Math.cos(a) * R * 1.2, artCy + Math.sin(a) * R * 1.2 + W * 0.004);
  });
  ctx.restore();
  if (c.content.kicker) label(c, c.content.kicker, pad, H * 0.145, W * 0.0128, theme.gold, "left", 3.2);
  label(c, BRAND.ephemeris, W - pad, H * 0.145, W * 0.0115, withAlpha(theme.ink, 0.6), "right", 1.6);
  let y = c.tall ? H * 0.53 : H * 0.54;
  rule(ctx, pad, y - H * 0.02, W - pad * 2, withAlpha(theme.gold, 0.45), "none");
  y += headline(c, c.content.headline, { x: pad, y, maxWidth: W - pad * 2, maxLines: 3, size: W * 0.058, minSize: W * 0.038, align: "left", foil: false, color: theme.ink, lead: 1.08 });
  y += H * 0.01;
  y += tamilLine(c, pad, y, W * 0.026, "left", theme.gold);
  y += subline(c, pad, y, W * 0.0205, W - pad * 2.6, "left", theme.muted);
  // data block: three cells
  const cellsY = c.tall ? H * 0.785 : H * 0.775;
  const cellW = (W - pad * 2) / 3;
  const parts = c.content.chips.filter(Boolean).slice(0, 3);
  ctx.save();
  parts.forEach((chip, i) => {
    const x = pad + i * cellW;
    ctx.strokeStyle = withAlpha(theme.gold, 0.4);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, cellsY, cellW, H * 0.06);
    ctx.font = SANS(W * 0.0105, 600);
    ctx.fillStyle = withAlpha(theme.gold, 0.8);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(`0${i + 1}`, x + W * 0.012, cellsY + H * 0.02);
    ctx.font = SANS(W * 0.0142, 500);
    ctx.fillStyle = theme.ink;
    let text = chip;
    while (ctx.measureText(text).width > cellW - W * 0.024 && text.length > 6) text = `${text.slice(0, -2)}…`;
    ctx.fillText(text, x + W * 0.012, cellsY + H * 0.045);
  });
  ctx.restore();
  const rowY = cellsY + H * 0.085;
  pricePill(c, pad, rowY, "left", { fill: theme.gold, color: "#031419" });
  ctaLine(c, W - pad, rowY + H * 0.019, "right", theme.gold, W * 0.0138, W * 0.45);
  footer(c, H - H * 0.04, withAlpha(theme.ink, 0.55));
}

/* 10 · Aurum Minimal — asymmetric, air, one arc. */
function renderAurum(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const left = W * 0.1;
  const artSize = W * 0.17;
  const artBox = { x: W * 0.9 - artSize, y: (c.tall ? H * 0.3 : H * 0.29) - artSize / 2, w: artSize, h: artSize };
  paintStyledBackdrop(ctx, W, H, theme, "aurum", { seed: 43, art: artBox });
  drawStyleFrame(ctx, W, H, theme, "aurum", W * 0.03);
  lockup(c, H * 0.07, W * 0.034);
  plate(c, "aurum", artBox.x + artSize / 2, artBox.y + artSize / 2, artSize, "relief", 0.0);
  if (c.content.kicker) label(c, c.content.kicker, left, c.tall ? H * 0.165 : H * 0.165, W * 0.0128, withAlpha(theme.gold, 0.9), "left", 3.6);
  let y = c.tall ? H * 0.4 : H * 0.37;
  y += headline(c, c.content.headline, { x: left, y, maxWidth: W * 0.76, maxLines: 4, size: W * 0.074, minSize: W * 0.046, align: "left", foil: false, color: theme.ink, lead: 1.04, weight: 600 });
  y += H * 0.02;
  y += tamilLine(c, left, y, W * 0.027, "left", theme.gold);
  y += subline(c, left, y, W * 0.0205, W * 0.6, "left", theme.muted);
  const rowY = c.tall ? H * 0.8 : H * 0.79;
  textChips(c, left, rowY, W * 0.8, "left", { color: withAlpha(theme.ink, 0.7) });
  // price as large type, CTA underlined
  ctx.save();
  ctx.font = DISPLAY(W * 0.03, 600);
  ctx.fillStyle = theme.gold;
  ctx.textBaseline = "alphabetic";
  const priceY = rowY + H * 0.07;
  ctx.fillText(c.content.price, left, priceY);
  ctx.font = SANS(W * 0.0138, 600);
  ctx.fillStyle = theme.ink;
  const cta = c.content.cta.replace(/^https?:\/\//, "");
  const cw = ctx.measureText(cta).width;
  ctx.textAlign = "right";
  ctx.fillText(cta, W * 0.9, priceY);
  ctx.fillStyle = theme.gold;
  ctx.fillRect(W * 0.9 - cw, priceY + W * 0.008, cw, Math.max(1, W * 0.0015));
  ctx.restore();
  footer(c, H - H * 0.04, withAlpha(theme.ink, 0.45));
}

/* 11 · Nocturne Glass — frosted card, stacked type. */
function renderGlass(c: Ctx) {
  const { ctx, W, H, theme } = c;
  paintStyledBackdrop(ctx, W, H, theme, "glass", { seed: 47 });
  const cardX = W * 0.09;
  const cardY = c.tall ? H * 0.13 : H * 0.12;
  const cardW = W - cardX * 2;
  const cardH = c.tall ? H * 0.76 : H * 0.78;
  glassCard(ctx, cardX, cardY, cardW, cardH, W * 0.035);
  lockup(c, H * 0.065, W * 0.032);
  const inner = cardX + W * 0.06;
  const innerW = cardW - W * 0.12;
  const artSize = c.tall ? H * 0.16 : H * 0.18;
  const artCy = cardY + H * 0.03 + artSize / 2;
  plate(c, "glass", W / 2, artCy, artSize, "relief", 0.2);
  let y = artCy + artSize / 2 + H * 0.045;
  if (c.content.kicker) {
    label(c, c.content.kicker, W / 2, y, W * 0.0128, "rgba(255,255,255,0.72)", "center", 3.4);
    y += H * 0.03;
  }
  y += headline(c, c.content.headline, { x: W / 2, y, maxWidth: innerW, maxLines: 3, size: W * 0.058, minSize: W * 0.038, align: "center", foil: false, color: "#F6F9FE", lead: 1.1, weight: 600 });
  y += H * 0.008;
  y += tamilLine(c, W / 2, y, W * 0.026, "center", "#C7B3FF");
  y += subline(c, W / 2, y, W * 0.0205, innerW * 0.86, "center", "rgba(246,249,254,0.66)");
  y += H * 0.03;
  capsuleChips(c, W / 2, y, innerW, "center", { fill: "rgba(255,255,255,0.08)", stroke: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.86)" });
  const rowY = cardY + cardH - H * 0.09;
  rule(ctx, inner, rowY - H * 0.018, innerW, "rgba(255,255,255,0.18)", "none");
  pricePill(c, inner, rowY, "left", { fill: "#F6F9FE", color: "#161B29" });
  ctaLine(c, cardX + cardW - W * 0.06, rowY + H * 0.019, "right", "#C7B3FF", W * 0.0138, W * 0.42);
  footer(c, H - H * 0.045, "rgba(246,249,254,0.5)");
}

/* 12 · Orbit Lines — diagram above, cool violet type below. */
function renderOrbit(c: Ctx) {
  const { ctx, W, H, theme } = c;
  const pad = W * 0.09;
  const artSize = c.tall ? H * 0.15 : H * 0.17;
  const artCy = c.tall ? H * 0.3 : H * 0.31;
  paintStyledBackdrop(ctx, W, H, theme, "orbit", { seed: 53, art: { x: W / 2 - artSize / 2, y: artCy - artSize / 2, w: artSize, h: artSize } });
  drawStyleFrame(ctx, W, H, theme, "orbit", W * 0.03);
  lockup(c, H * 0.07, W * 0.034);
  // dark disc so the plate reads over the rings
  ctx.save();
  ctx.fillStyle = "rgba(10,6,24,0.8)";
  ctx.beginPath();
  ctx.arc(W / 2, artCy, artSize * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(theme.gold, 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  drawServiceArt(ctx, c.service, "orbit", W / 2, artCy, artSize * 0.86, theme, 0.95, "line");
  let y = c.tall ? H * 0.575 : H * 0.585;
  if (c.content.kicker) {
    label(c, c.content.kicker, W / 2, y, W * 0.0128, theme.gold, "center", 3.6);
    y += H * 0.03;
  }
  y += headline(c, c.content.headline, { x: W / 2, y, maxWidth: W - pad * 2, maxLines: c.tall ? 3 : 2, size: W * 0.058, minSize: W * 0.038, align: "center", foil: false, color: theme.ink, lead: 1.1, weight: 600 });
  y += H * 0.006;
  y += tamilLine(c, W / 2, y, W * 0.026, "center", theme.gold);
  y += subline(c, W / 2, y, W * 0.0205, W - pad * 2.4, "center", theme.muted, 1);
  const chipsY = Math.max(c.tall ? H * 0.8 : H * 0.79, y + H * 0.018);
  const chipsH = textChips(c, W / 2, chipsY, W - pad * 2, "center", { color: withAlpha(theme.ink, 0.72), mark: theme.gold });
  const rowY = Math.max(c.tall ? H * 0.838 : H * 0.83, chipsY + chipsH + H * 0.012);
  rule(ctx, pad, rowY, W - pad * 2, withAlpha(theme.gold, 0.4), "both");
  pricePill(c, pad, rowY + H * 0.016, "left", { fill: theme.gold, color: "#140A2A" });
  ctaLine(c, W - pad, rowY + H * 0.035, "right", theme.gold, W * 0.0138, W * 0.45);
  footer(c, H - H * 0.04, withAlpha(theme.ink, 0.5));
}

/* -------------------------------- registry -------------------------------- */

type StyleRenderer = (c: Ctx) => void;

const RENDERERS: Record<StyleKey, StyleRenderer> = {
  signature: renderSignature,
  thanjavur: renderThanjavur,
  kolam: renderKolam,
  silk: renderSilk,
  gopuram: renderGopuram,
  deepam: renderDeepam,
  mono: renderMono,
  paper: renderPaper,
  ephemeris: renderEphemeris,
  aurum: renderAurum,
  glass: renderGlass,
  orbit: renderOrbit,
};

export function hasStyleLayout(style: StyleKey) {
  return Boolean(RENDERERS[style]);
}

/**
 * Paints one of the twelve post layouts into an existing context.
 *
 * Synchronous by contract: it measures as it paints, so it can only be called
 * after `ensureFonts()` has resolved. `renderCreative` (its caller) awaits the
 * fonts before creating the canvas; do not call this directly from a click
 * handler without awaiting them first.
 */
export function renderStylePost(
  style: StyleKey,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  logo: HTMLImageElement,
  service: Service,
  content: CreativeContent,
) {
  const renderer = RENDERERS[style] ?? RENDERERS.signature;
  renderer({ ctx, W, H, theme, logo, service, content, tall: H / W > 1.15 });
  return true;
}
