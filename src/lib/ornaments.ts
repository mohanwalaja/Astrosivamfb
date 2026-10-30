import type { Theme } from "../types";
import { withAlpha } from "./canvas";
import { foilGradient } from "./premium";

/**
 * Ornament library — every painter draws inside a 100 × 100 box centred on (0, 0).
 * The caller has already translated, scaled and set globalAlpha.
 */

type Painter = (ctx: CanvasRenderingContext2D, theme: Theme) => void;

const gold = (theme: Theme) => theme.gold;
const soft = (theme: Theme) => theme.goldSoft;

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, width: number, angle: number) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.shadowColor="rgba(18,10,3,.42)";ctx.shadowBlur=2.2;ctx.shadowOffsetX=.8;ctx.shadowOffsetY=1.3;
  const g=ctx.createLinearGradient(-width,0,width,-length);g.addColorStop(0,"#76501B");g.addColorStop(.28,"#C98D2D");g.addColorStop(.48,"#FFF0B0");g.addColorStop(.7,"#D49A39");g.addColorStop(1,"#69400F");ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(width,-length*.42,0,-length);ctx.quadraticCurveTo(-width,-length*.42,0,0);ctx.closePath();ctx.fill();
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.strokeStyle=withAlpha("#FFF2BC",.62);ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(0,-length*.08);ctx.quadraticCurveTo(width*.08,-length*.48,0,-length*.9);ctx.stroke();ctx.restore();
}

/* --------------------------------- temple --------------------------------- */

const gopuram: Painter = (ctx, theme) => {
  const tiers:Array<[number,number,number]>=[[-34,29,68],[-28,17,56],[-22,5,44],[-16,-7,32],[-10,-18,20],[-5,-27,10]];
  tiers.forEach(([x,y,w],i)=>{
    const h=i<2?12:10;ctx.save();ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=2.6;ctx.shadowOffsetX=1;ctx.shadowOffsetY=2;
    const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,"#4C3015");g.addColorStop(.18,"#C18A31");g.addColorStop(.45,"#FFE9A1");g.addColorStop(.72,"#A66B1B");g.addColorStop(1,"#38200D");ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x+4,y);ctx.lineTo(x+w-4,y);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle="rgba(29,17,9,.62)";for(let n=0;n<Math.max(1,5-i);n++){const nx=x+w*(n+.5)/Math.max(1,5-i);ctx.beginPath();ctx.roundRect(nx-2.7,y+3.1,5.4,h-4,2.2);ctx.fill();}
    ctx.strokeStyle=withAlpha("#FFF0B6",.7);ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x+4,y+.5);ctx.lineTo(x+w-4,y+.5);ctx.stroke();
  });
  const fin=ctx.createRadialGradient(0,-34,1,0,-34,8);fin.addColorStop(0,"#FFF6CB");fin.addColorStop(.5,"#D59C38");fin.addColorStop(1,"#70420F");ctx.fillStyle=fin;ctx.beginPath();ctx.ellipse(0,-34,4.3,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=foilGradient(ctx,theme,0,-44,15);ctx.beginPath();ctx.arc(0,-42,3.2,0,Math.PI*2);ctx.fill();
  const door=ctx.createLinearGradient(-8,0,8,0);door.addColorStop(0,"#080706");door.addColorStop(.5,"#38210E");door.addColorStop(1,"#080706");ctx.fillStyle=door;ctx.beginPath();ctx.moveTo(-8,39);ctx.lineTo(-8,31);ctx.quadraticCurveTo(0,21,8,31);ctx.lineTo(8,39);ctx.closePath();ctx.fill();ctx.fillStyle=foilGradient(ctx,theme,0,39,4);ctx.fillRect(-42,39,84,4);
  [-30,30].forEach((x)=>{const bowl=ctx.createLinearGradient(x-6,0,x+6,0);bowl.addColorStop(0,"#73430F");bowl.addColorStop(.5,"#FFE7A0");bowl.addColorStop(1,"#68400E");ctx.fillStyle=bowl;ctx.beginPath();ctx.ellipse(x,34,6.5,2.8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#FFDB64";ctx.beginPath();ctx.ellipse(x,29,2.4,4.5,0,0,Math.PI*2);ctx.fill();});
};

const kalash: Painter = (ctx, theme) => {
  ctx.save();ctx.shadowColor="rgba(0,0,0,.48)";ctx.shadowBlur=3.5;ctx.shadowOffsetX=1.4;ctx.shadowOffsetY=2;
  ctx.fillStyle=foilGradient(ctx,theme,0,-10,47);ctx.beginPath();ctx.moveTo(-15,-8);ctx.bezierCurveTo(-31,4,-25,31,0,35);ctx.bezierCurveTo(25,31,31,4,15,-8);ctx.lineTo(11,-15);ctx.lineTo(-11,-15);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=foilGradient(ctx,theme,0,-21,8);ctx.beginPath();ctx.roundRect(-13,-18,26,7,2);ctx.fill();
  ctx.strokeStyle=withAlpha("#FFF3C2",.7);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-19,4);ctx.quadraticCurveTo(0,12,19,4);ctx.stroke();
  ctx.fillStyle=withAlpha("#5C350F",.38);ctx.beginPath();ctx.ellipse(0,18,9,4,0,0,Math.PI*2);ctx.fill();
  const coconut=ctx.createRadialGradient(-3,-26,1,0,-21,10);coconut.addColorStop(0,"#FFF4C6");coconut.addColorStop(.45,"#D6A13D");coconut.addColorStop(1,"#70420F");ctx.fillStyle=coconut;ctx.beginPath();ctx.ellipse(0,-23,8,10,0,0,Math.PI*2);ctx.fill();
  [-.9,-.38,.38,.9].forEach((a)=>leaf(ctx,a*12,-8,21,6,a*.9));ctx.fillStyle=withAlpha("#FFF4C6",.9);ctx.beginPath();ctx.arc(-2,-25,1.5,0,Math.PI*2);ctx.fill();
};

const lamp: Painter = (ctx, theme) => {
  const brass=foilGradient(ctx,theme,0,-42,84);ctx.save();ctx.shadowColor="rgba(0,0,0,.55)";ctx.shadowBlur=3;ctx.shadowOffsetX=1;ctx.shadowOffsetY=2;
  ctx.fillStyle=brass;ctx.beginPath();ctx.ellipse(0,39,25,5.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-14,36);ctx.lineTo(-8,26);ctx.lineTo(-4,21);ctx.lineTo(4,21);ctx.lineTo(8,26);ctx.lineTo(14,36);ctx.closePath();ctx.fill();ctx.fillRect(-3,6,6,18);ctx.restore();
  const bowl=ctx.createLinearGradient(0,-2,0,25);bowl.addColorStop(0,"#FFF2B0");bowl.addColorStop(.24,"#D39B35");bowl.addColorStop(.62,"#84500F");bowl.addColorStop(1,"#422408");ctx.fillStyle=bowl;ctx.beginPath();ctx.moveTo(-27,4);ctx.quadraticCurveTo(0,24,27,4);ctx.quadraticCurveTo(0,-5,-27,4);ctx.closePath();ctx.fill();
  ctx.fillStyle="rgba(43,25,8,.66)";ctx.beginPath();ctx.ellipse(0,4,18,3.7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=foilGradient(ctx,theme,0,3,3);ctx.beginPath();ctx.ellipse(0,5,18,2.3,0,0,Math.PI*2);ctx.fill();
  const halo=ctx.createRadialGradient(17,-23,0,17,-23,34);halo.addColorStop(0,withAlpha("#FFD45C",.54));halo.addColorStop(1,withAlpha("#FF9B24",0));ctx.fillStyle=halo;ctx.beginPath();ctx.arc(17,-23,34,0,Math.PI*2);ctx.fill();
  const flame=ctx.createLinearGradient(18,-46,18,-3);flame.addColorStop(0,"#FFFCE2");flame.addColorStop(.3,"#FFE268");flame.addColorStop(.72,"#FF9F20");flame.addColorStop(1,"#D84413");ctx.fillStyle=flame;ctx.beginPath();ctx.moveTo(18,-3);ctx.bezierCurveTo(7,-16,10,-32,19,-45);ctx.bezierCurveTo(27,-32,31,-16,18,-3);ctx.closePath();ctx.fill();
  ctx.fillStyle=withAlpha("#FFF9D7",.92);ctx.beginPath();ctx.moveTo(18,-7);ctx.bezierCurveTo(14,-17,16,-26,20,-32);ctx.bezierCurveTo(23,-23,24,-15,18,-7);ctx.closePath();ctx.fill();
};

const bell: Painter = (ctx, theme) => {
  ctx.fillStyle=foilGradient(ctx,theme,0,-48,14);ctx.beginPath();ctx.roundRect(-3,-48,6,8,3);ctx.fill();ctx.fillRect(-1.6,-43,3.2,8);
  ctx.save();ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=3;ctx.shadowOffsetX=1;ctx.shadowOffsetY=2;
  const bell=ctx.createLinearGradient(-33,-25,33,20);bell.addColorStop(0,"#68400F");bell.addColorStop(.18,"#D6A13C");bell.addColorStop(.4,"#FFF1B1");bell.addColorStop(.62,"#BA7F21");bell.addColorStop(1,"#4B2B0B");ctx.fillStyle=bell;ctx.beginPath();ctx.moveTo(-5,-34);ctx.bezierCurveTo(-25,-30,-31,3,-34,17);ctx.quadraticCurveTo(0,31,34,17);ctx.bezierCurveTo(31,3,25,-30,5,-34);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=withAlpha("#472A0D",.7);ctx.beginPath();ctx.ellipse(0,18,33,5.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=foilGradient(ctx,theme,0,12,10);ctx.beginPath();ctx.ellipse(0,14,31,4,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<3;i++){const y=-20+i*13,w=24+i*4;ctx.fillStyle=foilGradient(ctx,theme,0,y-2,4);ctx.beginPath();ctx.ellipse(0,y,w,2.8,0,0,Math.PI*2);ctx.fill();}
  const clapper=ctx.createRadialGradient(-1,22,0,0,24,6);clapper.addColorStop(0,"#FFF2B9");clapper.addColorStop(.5,"#D39B36");clapper.addColorStop(1,"#5E390F");ctx.fillStyle=clapper;ctx.beginPath();ctx.arc(0,24,4.8,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=withAlpha("#FFF2C5",.72);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-5,-31);ctx.quadraticCurveTo(-21,-23,-24,4);ctx.stroke();
};

const kolam: Painter = (ctx, theme) => {
  const plate=ctx.createRadialGradient(-12,-16,3,0,0,47);plate.addColorStop(0,"#493015");plate.addColorStop(.72,"#704716");plate.addColorStop(.9,"#F0CB72");plate.addColorStop(1,"#51300E");ctx.fillStyle=plate;ctx.beginPath();ctx.arc(0,0,47,0,Math.PI*2);ctx.fill();
  const field=ctx.createRadialGradient(-9,-13,1,0,0,39);field.addColorStop(0,"#312113");field.addColorStop(1,"#100D0A");ctx.fillStyle=field;ctx.beginPath();ctx.arc(0,0,39,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=withAlpha("#FFF0B1",.84);ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2);ctx.stroke();
  const foil=foilGradient(ctx,theme,0,-40,80);ctx.strokeStyle=foil;ctx.lineWidth=2.4;ctx.lineCap="round";ctx.shadowColor="rgba(0,0,0,.55)";ctx.shadowBlur=1.6;ctx.shadowOffsetY=1;
  for(let i=-1;i<=1;i++){const y=i*14;ctx.beginPath();ctx.moveTo(-31,y);ctx.bezierCurveTo(-20,y-21,-7,y-21,0,y);ctx.bezierCurveTo(7,y+21,20,y+21,31,y);ctx.stroke();ctx.beginPath();ctx.moveTo(y,-31);ctx.bezierCurveTo(y-21,-20,y-21,-7,y,0);ctx.bezierCurveTo(y+21,7,y+21,20,y,31);ctx.stroke();}
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.fillStyle=foil;for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){const r=(Math.abs(row)+Math.abs(col))%2===0?2.2:1.45;ctx.beginPath();ctx.arc(col*14,row*14,r,0,Math.PI*2);ctx.fill();}
  ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(7,0);ctx.lineTo(0,7);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();
};

const toran: Painter = (ctx, theme) => {
  ctx.save();
  // Braided sacred red-and-gold Kalava thread cord
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = "#8A1C14";
  ctx.beginPath();
  ctx.moveTo(-47, -22);
  ctx.quadraticCurveTo(0, -6, 47, -22);
  ctx.stroke();

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = foilGradient(ctx, theme, -40, -22, 80);
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(-47, -22);
  ctx.quadraticCurveTo(0, -6, 47, -22);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mango leaves (Mavilai) hanging along the curve
  const leafCount = 7;
  for (let i = 0; i < leafCount; i += 1) {
    const t = i / (leafCount - 1);
    const x = -42 + t * 84;
    const y = -22 + Math.sin(t * Math.PI) * 16;
    const sway = (t - 0.5) * 0.28;
    const len = 25;
    const w = 7.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);

    // Leaf body with lush emerald-to-forest gradient
    const leafGrad = ctx.createLinearGradient(-w, 0, w, len);
    leafGrad.addColorStop(0, "#225E28");
    leafGrad.addColorStop(0.35, "#34833D");
    leafGrad.addColorStop(0.75, "#1B4F21");
    leafGrad.addColorStop(1, "#123816");

    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = leafGrad;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w * 1.25, len * 0.28, w * 1.05, len * 0.72, 0, len);
    ctx.bezierCurveTo(-w * 1.05, len * 0.72, -w * 1.25, len * 0.28, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Leaf rim highlight
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(224, 255, 180, 0.35)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Central golden midrib vein
    ctx.strokeStyle = withAlpha(theme.gold, 0.75);
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(w * 0.1, len * 0.5, 0, len - 1);
    ctx.stroke();

    // Herringbone side veins
    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.4);
    ctx.lineWidth = 0.5;
    for (let v = 1; v <= 4; v += 1) {
      const vy = len * (v * 0.18);
      const vw = w * (1 - v * 0.14) * 0.75;
      ctx.beginPath();
      ctx.moveTo(0, vy);
      ctx.lineTo(vw, vy - 2.5);
      ctx.moveTo(0, vy);
      ctx.lineTo(-vw, vy - 2.5);
      ctx.stroke();
    }

    // Auspicious red Kumkum and yellow Chandan tilak dot at the leaf center
    ctx.fillStyle = "#FFD54F";
    ctx.beginPath();
    ctx.arc(0, len * 0.38, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#C62828";
    ctx.beginPath();
    ctx.arc(0, len * 0.38, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Marigold florets (Genda phool) & dangling jasmine buds at junction points
  const marigoldCount = 6;
  for (let i = 0; i < marigoldCount; i += 1) {
    const t = (i + 0.5) / marigoldCount;
    const x = -42 + t * 84;
    const y = -22 + Math.sin(t * Math.PI) * 16;

    // Ruffled marigold floret
    const mr = 4.8;
    ctx.save();
    ctx.translate(x, y + 1);

    // Deep saffron outer ruffle
    ctx.fillStyle = "#E65100";
    ctx.beginPath();
    for (let p = 0; p < 8; p += 1) {
      const a = (p / 8) * Math.PI * 2;
      const px = Math.cos(a) * mr;
      const py = Math.sin(a) * mr;
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    }
    ctx.fill();

    // Radiant gold-orange middle tier
    ctx.fillStyle = "#FB8C00";
    ctx.beginPath();
    ctx.arc(0, 0, mr * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Bright yellow highlight center
    ctx.fillStyle = "#FFE082";
    ctx.beginPath();
    ctx.arc(0, 0, mr * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Hanging pearl-white jasmine droplets with brass bell
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, mr);
    ctx.lineTo(0, mr + 8);
    ctx.stroke();

    // Jasmine buds
    ctx.fillStyle = "#FFFDE7";
    ctx.beginPath();
    ctx.ellipse(0, mr + 4, 1.3, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Miniature brass bell
    const bg = ctx.createLinearGradient(-2, mr + 8, 2, mr + 12);
    bg.addColorStop(0, "#FFF3B0");
    bg.addColorStop(0.5, "#D49B28");
    bg.addColorStop(1, "#664008");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-2.2, mr + 8);
    ctx.lineTo(2.2, mr + 8);
    ctx.lineTo(3.2, mr + 12);
    ctx.lineTo(-3.2, mr + 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // End tassels
  for (const endX of [-47, 47]) {
    const endY = -22;
    ctx.fillStyle = "#D49B28";
    ctx.beginPath();
    ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8A1C14";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX, endY + 7);
    ctx.stroke();
  }
  ctx.restore();
};


const vel: Painter = (ctx, theme) => {
  const gold=foilGradient(ctx,theme,0,-46,92);ctx.save();ctx.shadowColor="rgba(0,0,0,.55)";ctx.shadowBlur=3;ctx.shadowOffsetX=1.2;ctx.shadowOffsetY=2;ctx.fillStyle=gold;ctx.beginPath();ctx.moveTo(-3.5,44);ctx.lineTo(-2.4,-9);ctx.lineTo(0,-16);ctx.lineTo(2.4,-9);ctx.lineTo(3.5,44);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=gold;ctx.beginPath();ctx.moveTo(-20,6);ctx.lineTo(-17,2);ctx.lineTo(17,2);ctx.lineTo(20,6);ctx.lineTo(16,10);ctx.lineTo(-16,10);ctx.closePath();ctx.fill();
  ctx.save();ctx.shadowColor="rgba(0,0,0,.62)";ctx.shadowBlur=3;ctx.shadowOffsetX=1;ctx.shadowOffsetY=2;const blade=ctx.createLinearGradient(-15,-46,13,-7);blade.addColorStop(0,"#68400F");blade.addColorStop(.28,"#D89929");blade.addColorStop(.48,"#FFF5C4");blade.addColorStop(.7,"#BD7B17");blade.addColorStop(1,"#55300C");ctx.fillStyle=blade;ctx.beginPath();ctx.moveTo(0,-47);ctx.bezierCurveTo(15,-31,14,-14,0,-5);ctx.bezierCurveTo(-14,-14,-15,-31,0,-47);ctx.closePath();ctx.fill();ctx.restore();
  ctx.strokeStyle=withAlpha("#FFF7D1",.92);ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(0,-43);ctx.quadraticCurveTo(4,-26,0,-10);ctx.stroke();
  [-1,1].forEach((side)=>{ctx.fillStyle=foilGradient(ctx,theme,0,0,14);ctx.beginPath();ctx.moveTo(side*4,4);ctx.quadraticCurveTo(side*19,-4,side*21,8);ctx.quadraticCurveTo(side*12,15,side*4,9);ctx.closePath();ctx.fill();});
  const gem=ctx.createRadialGradient(-2,2,0,0,5,7);gem.addColorStop(0,"#FFF1C2");gem.addColorStop(.35,"#D74946");gem.addColorStop(1,"#561719");ctx.fillStyle=gem;ctx.beginPath();ctx.arc(0,5,5.3,0,Math.PI*2);ctx.fill();ctx.fillStyle=foilGradient(ctx,theme,0,41,5);ctx.beginPath();ctx.roundRect(-8,41,16,5,2);ctx.fill();
};

const peacock: Painter = (ctx, theme) => {
  ctx.lineWidth = 1;
  const feather = (x: number, y: number, size: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.bezierCurveTo(-size * 0.8, size * 0.2, -size * 0.55, -size * 0.85, 0, -size);
    ctx.bezierCurveTo(size * 0.55, -size * 0.85, size * 0.8, size * 0.2, 0, size);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.35, size * 0.3, size * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(gold(theme), 0.22);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -size * 0.35, size * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(soft(theme), 0.9);
    ctx.fill();
    ctx.restore();
  };
  feather(-22, 6, 22, -0.5);
  feather(22, 6, 22, 0.5);
  feather(0, -4, 30, 0);
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(-4, 36, 0, 44);
  ctx.strokeStyle = withAlpha(gold(theme), 0.6);
  ctx.stroke();
};

const conch: Painter = (ctx, theme) => {
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(-6, -40);
  ctx.bezierCurveTo(24, -34, 34, -4, 22, 18);
  ctx.bezierCurveTo(12, 36, -14, 40, -24, 24);
  ctx.bezierCurveTo(-34, 6, -26, -30, -6, -40);
  ctx.closePath();
  ctx.fillStyle = withAlpha(gold(theme), 0.1);
  ctx.fill();
  ctx.stroke();
  // spiral
  for (let index = 0; index < 4; index += 1) {
    const radius = 20 - index * 4.2;
    ctx.beginPath();
    ctx.arc(4, 2, radius, Math.PI * 0.15, Math.PI * 1.25);
    ctx.strokeStyle = withAlpha(gold(theme), 0.85 - index * 0.13);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  // opening
  ctx.beginPath();
  ctx.moveTo(-6, -40);
  ctx.quadraticCurveTo(-20, -26, -14, -8);
  ctx.strokeStyle = withAlpha(soft(theme), 0.8);
  ctx.stroke();
};

const elephant: Painter = (ctx, theme) => {
  ctx.lineWidth = 1.05;
  ctx.strokeStyle = gold(theme);
  // body
  ctx.beginPath();
  ctx.moveTo(-34, 16);
  ctx.bezierCurveTo(-40, -14, -6, -26, 14, -18);
  ctx.bezierCurveTo(34, -12, 30, 14, 22, 20);
  ctx.lineTo(-30, 22);
  ctx.closePath();
  ctx.fillStyle = withAlpha(gold(theme), 0.08);
  ctx.fill();
  ctx.stroke();
  // head + trunk
  ctx.beginPath();
  ctx.moveTo(14, -18);
  ctx.bezierCurveTo(32, -22, 40, -10, 36, 2);
  ctx.bezierCurveTo(33, 14, 26, 22, 24, 34);
  ctx.stroke();
  // ear
  ctx.beginPath();
  ctx.moveTo(18, -16);
  ctx.bezierCurveTo(6, -12, 4, 4, 14, 12);
  ctx.bezierCurveTo(22, 6, 22, -6, 18, -16);
  ctx.closePath();
  ctx.fillStyle = withAlpha(gold(theme), 0.14);
  ctx.fill();
  ctx.stroke();
  // tusk
  ctx.beginPath();
  ctx.moveTo(32, 12);
  ctx.quadraticCurveTo(40, 20, 34, 26);
  ctx.strokeStyle = withAlpha(soft(theme), 0.9);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // legs
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.05;
  [-22, -8, 8].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, 36);
    ctx.stroke();
  });
  // caparison
  ctx.beginPath();
  ctx.moveTo(-28, -4);
  ctx.quadraticCurveTo(-6, 6, 14, -2);
  ctx.strokeStyle = withAlpha(soft(theme), 0.7);
  ctx.lineWidth = 0.8;
  ctx.stroke();
};

/* --------------------------------- nature --------------------------------- */

const lotus: Painter = (ctx, theme) => {
  for(let layer=0;layer<2;layer++){const count=layer===0?10:7,ring=layer===0?0:Math.PI/count;for(let i=0;i<count;i++){const angle=i*Math.PI*2/count+ring-Math.PI/2;ctx.save();ctx.rotate(angle);ctx.shadowColor="rgba(0,0,0,.4)";ctx.shadowBlur=2;ctx.shadowOffsetX=.8;ctx.shadowOffsetY=1.3;const pg=ctx.createLinearGradient(0,-44,0,2);pg.addColorStop(0,withAlpha(layer===0?"#FFF3C7":"#FFE7A4",.88));pg.addColorStop(.28,withAlpha(layer===0?"#E8B752":"#F4D279",.9));pg.addColorStop(.68,withAlpha(gold(theme),.82));pg.addColorStop(1,"#60370F");ctx.fillStyle=pg;ctx.beginPath();ctx.moveTo(0,2);ctx.bezierCurveTo(14,-11,11,-34,0,-44);ctx.bezierCurveTo(-11,-34,-14,-11,0,2);ctx.closePath();ctx.fill();ctx.restore();ctx.strokeStyle=withAlpha("#FFF4C7",.56);ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(0,-2);ctx.quadraticCurveTo(2,-20,0,-39);ctx.stroke();}}
  const center=ctx.createRadialGradient(-2,-3,1,0,2,12);center.addColorStop(0,"#FFF8D5");center.addColorStop(.36,"#E8B23E");center.addColorStop(1,"#71420E");ctx.fillStyle=center;ctx.beginPath();ctx.arc(0,1,10,0,Math.PI*2);ctx.fill();
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=5;ctx.fillStyle=withAlpha("#FFF4CA",.86);ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.15,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=foilGradient(ctx,theme,0,27,11);ctx.beginPath();ctx.ellipse(0,31,25,5,0,0,Math.PI*2);ctx.fill();[-1,1].forEach((side)=>{ctx.fillStyle=withAlpha("#E4B85D",.75);ctx.beginPath();ctx.ellipse(side*31,29,13,3.2,side*.12,0,Math.PI*2);ctx.fill();});
};

const palm: Painter = (ctx, theme) => {
  ctx.lineWidth = 1.05;
  // trunk
  ctx.beginPath();
  ctx.moveTo(-4, 46);
  ctx.bezierCurveTo(2, 20, 6, -6, 2, -22);
  ctx.moveTo(6, 46);
  ctx.bezierCurveTo(10, 22, 12, -4, 8, -22);
  ctx.stroke();
  // trunk segments
  for (let index = 0; index < 6; index += 1) {
    const y = 40 - index * 11;
    ctx.beginPath();
    ctx.moveTo(0 + index * 1.1, y);
    ctx.lineTo(7 + index * 0.9, y - 2);
    ctx.strokeStyle = withAlpha(gold(theme), 0.4);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.05;
  // fronds
  const fronds = [
    { angle: -2.5, length: 40 },
    { angle: -1.95, length: 46 },
    { angle: -1.35, length: 38 },
    { angle: -0.75, length: 44 },
    { angle: -0.2, length: 34 },
    { angle: -3.0, length: 30 },
  ];
  fronds.forEach(({ angle, length }) => {
    const tipX = 4 + Math.cos(angle) * length;
    const tipY = -22 + Math.sin(angle) * length;
    ctx.beginPath();
    ctx.moveTo(4, -22);
    ctx.quadraticCurveTo(4 + Math.cos(angle) * length * 0.6, -22 + Math.sin(angle) * length * 0.6 - 10, tipX, tipY);
    ctx.stroke();
    for (let step = 1; step <= 5; step += 1) {
      const t = step / 6;
      const baseX = 4 + (tipX - 4) * t;
      const baseY = -22 + (tipY + 22) * t - Math.sin(t * Math.PI) * 8;
      const side = step % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(baseX + Math.cos(angle + side * 1.1) * 11, baseY + Math.sin(angle + side * 1.1) * 11);
      ctx.strokeStyle = withAlpha(gold(theme), 0.55);
      ctx.lineWidth = 0.55;
      ctx.stroke();
    }
    ctx.strokeStyle = gold(theme);
    ctx.lineWidth = 1.05;
  });
  // coconuts
  [-6, 6].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(4 + dx, -18, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(gold(theme), 0.2);
    ctx.fill();
    ctx.stroke();
  });
};

const banana: Painter = (ctx, theme) => {
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(0, 46);
  ctx.bezierCurveTo(-30, 16, -24, -30, 0, -44);
  ctx.bezierCurveTo(24, -30, 30, 16, 0, 46);
  ctx.closePath();
  ctx.fillStyle = withAlpha(gold(theme), 0.08);
  ctx.fill();
  ctx.stroke();
  // midrib
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.lineTo(0, -42);
  ctx.strokeStyle = withAlpha(gold(theme), 0.85);
  ctx.stroke();
  // veins
  for (let index = 0; index < 7; index += 1) {
    const y = -34 + index * 11;
    const spread = 20 - Math.abs(y + 4) * 0.3;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(side * spread * 0.6, y + 4, side * spread, y + 9);
      ctx.strokeStyle = withAlpha(gold(theme), 0.4);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  }
};

const jasmine: Painter = (ctx, theme) => {
  ctx.lineWidth = 1;
  const flower = (x: number, y: number, radius: number) => {
    ctx.save();
    ctx.translate(x, y);
    for (let index = 0; index < 5; index += 1) {
      ctx.save();
      ctx.rotate((index / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -radius * 0.62, radius * 0.34, radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(soft(theme), 0.85);
      ctx.fill();
      ctx.strokeStyle = withAlpha(gold(theme), 0.7);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(gold(theme), 0.9);
    ctx.fill();
    ctx.restore();
  };
  // string
  ctx.beginPath();
  ctx.moveTo(-44, -26);
  ctx.quadraticCurveTo(0, 22, 44, -26);
  ctx.strokeStyle = withAlpha(gold(theme), 0.5);
  ctx.setLineDash([3, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  const spots = [-34, -18, -2, 14, 30, 42];
  spots.forEach((x, index) => {
    const t = (x + 44) / 88;
    const y = -26 + Math.sin(t * Math.PI) * 40;
    flower(x, y, 5.6 + (index % 2) * 1.6);
  });
};

const waves: Painter = (ctx, theme) => {
  for (let row = 0; row < 5; row += 1) {
    const y = -34 + row * 17;
    ctx.beginPath();
    ctx.moveTo(-46, y);
    for (let x = -46; x <= 46; x += 4) {
      ctx.lineTo(x, y + Math.sin((x + row * 12) / 9) * 3.4);
    }
    ctx.strokeStyle = withAlpha(gold(theme), 0.5 - row * 0.07);
    ctx.lineWidth = row === 0 ? 1.1 : 0.7;
    ctx.stroke();
  }
};

const hills: Painter = (ctx, theme) => {
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-46, 20);
  ctx.lineTo(-20, -18);
  ctx.lineTo(-4, 4);
  ctx.lineTo(12, -26);
  ctx.lineTo(34, 8);
  ctx.lineTo(46, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-46, 28);
  ctx.lineTo(-14, 3);
  ctx.lineTo(6, 22);
  ctx.lineTo(26, 2);
  ctx.lineTo(46, 28);
  ctx.strokeStyle = withAlpha(gold(theme), 0.5);
  ctx.stroke();
  // sun
  ctx.beginPath();
  ctx.arc(24, -28, 6, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(soft(theme), 0.8);
  ctx.fill();
  // river
  ctx.beginPath();
  ctx.moveTo(-10, 46);
  ctx.bezierCurveTo(2, 34, 10, 32, 20, 24);
  ctx.strokeStyle = withAlpha(soft(theme), 0.55);
  ctx.lineWidth = 1.2;
  ctx.stroke();
};

/* --------------------------------- modern --------------------------------- */

const geometry: Painter = (ctx, theme) => {
  ctx.lineWidth = 1;
  ctx.strokeStyle = withAlpha(gold(theme), 0.95);
  ctx.strokeRect(-34, -34, 46, 46);
  ctx.strokeStyle = withAlpha(soft(theme), 0.85);
  ctx.strokeRect(-18, -18, 46, 46);
  ctx.beginPath();
  ctx.arc(6, 4, 24, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(gold(theme), 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-34, 34);
  ctx.lineTo(34, -34);
  ctx.strokeStyle = withAlpha(soft(theme), 0.5);
  ctx.stroke();
  ctx.fillStyle = withAlpha(gold(theme), 0.85);
  ctx.fillRect(20, 20, 14, 14);
};

const sunburst: Painter = (ctx, theme) => {
  const core = 14;
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 44);
  glow.addColorStop(0, withAlpha(soft(theme), 0.35));
  glow.addColorStop(1, withAlpha(soft(theme), 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, core, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(soft(theme), 0.9);
  ctx.fill();
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2;
    const inner = core + 6;
    const outer = index % 2 === 0 ? 42 : 30;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = withAlpha(gold(theme), index % 2 === 0 ? 0.85 : 0.4);
    ctx.lineWidth = index % 2 === 0 ? 1.1 : 0.6;
    ctx.stroke();
  }
};

const trishul: Painter = (ctx, theme) => {
  ctx.lineWidth = 1.05;
  ctx.strokeStyle = gold(theme);
  // shaft
  ctx.beginPath();
  ctx.moveTo(0, 46);
  ctx.lineTo(0, -24);
  ctx.stroke();
  // prongs
  [-1, 0, 1].forEach((direction) => {
    const x = direction * 20;
    ctx.beginPath();
    if (direction === 0) {
      ctx.moveTo(0, -24);
      ctx.lineTo(0, -46);
    } else {
      ctx.moveTo(0, -24);
      ctx.bezierCurveTo(x * 0.5, -30, x, -36, x, -40);
      ctx.lineTo(x, -46);
    }
    ctx.stroke();
    if (direction !== 0) {
      ctx.beginPath();
      ctx.moveTo(x - 3, -46);
      ctx.lineTo(x + 3, -46);
      ctx.stroke();
    }
  });
  // crossbar
  ctx.beginPath();
  ctx.moveTo(-22, -24);
  ctx.quadraticCurveTo(0, -18, 22, -24);
  ctx.stroke();
  // crescent
  ctx.beginPath();
  ctx.arc(0, -6, 10, 0.4, Math.PI * 1.6);
  ctx.strokeStyle = withAlpha(soft(theme), 0.9);
  ctx.stroke();
  // damaru dots
  [-14, 14].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 16, 3, 0, Math.PI * 2);
    ctx.stroke();
  });
};


/* --------------------------- temple (new set) ---------------------------- */

const cholaPillar: Painter = (ctx, theme) => {
  // paired pillars with a fluted shaft, cushion capital and a lotus base
  [-1, 1].forEach((side) => {
    const x = side * 26;
    ctx.strokeStyle = gold(theme);
    ctx.lineWidth = 1.1;
    // base plinth
    ctx.beginPath();
    ctx.moveTo(x - 12, 34);
    ctx.lineTo(x + 12, 34);
    ctx.lineTo(x + 9, 28);
    ctx.lineTo(x - 9, 28);
    ctx.closePath();
    ctx.stroke();
    // shaft
    ctx.beginPath();
    ctx.moveTo(x - 6, 28);
    ctx.lineTo(x - 5, -16);
    ctx.moveTo(x + 6, 28);
    ctx.lineTo(x + 5, -16);
    ctx.stroke();
    // flutes
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = withAlpha(gold(theme), 0.5);
    [-2, 2].forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(x + offset, 27);
      ctx.lineTo(x + offset * 0.85, -15);
      ctx.stroke();
    });
    // cushion capital
    ctx.strokeStyle = gold(theme);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x - 9, -16);
    ctx.quadraticCurveTo(x, -22, x + 9, -16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 11, -16);
    ctx.lineTo(x + 11, -16);
    ctx.stroke();
    // bracket
    ctx.beginPath();
    ctx.moveTo(x - 4, -22);
    ctx.lineTo(x - 7, -30);
    ctx.moveTo(x + 4, -22);
    ctx.lineTo(x + 7, -30);
    ctx.stroke();
  });
  // connecting lintel
  ctx.beginPath();
  ctx.moveTo(-38, -30);
  ctx.lineTo(38, -30);
  ctx.stroke();
  // lotus medallion in the centre of the lintel
  ctx.beginPath();
  ctx.arc(0, -12, 6, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6;
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * 3.4, -12 + Math.sin(angle) * 3.4, 2.1, 1.1, angle, 0, Math.PI * 2);
    ctx.stroke();
  }
};

const kandhaVel: Painter = (ctx, theme) => {
  // peacock feather fan behind a vertical vel
  for (let index = -3; index <= 3; index += 1) {
    const angle = index * 0.26;
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = withAlpha(gold(theme), 0.55 - Math.abs(index) * 0.05);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(-9, -10, -5, -34);
    ctx.quadraticCurveTo(0, -45, 5, -34);
    ctx.quadraticCurveTo(9, -10, 0, 10);
    ctx.stroke();
    // eye of the feather
    ctx.beginPath();
    ctx.ellipse(0, -30, 3.4, 4.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -30, 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // the vel: leaf-shaped blade on a long shaft
  ctx.strokeStyle = soft(theme);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 42);
  ctx.lineTo(0, -14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.quadraticCurveTo(9, -30, 0, -12);
  ctx.quadraticCurveTo(-9, -30, 0, -46);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(0, -16);
  ctx.stroke();
  // cross guard
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.quadraticCurveTo(0, -7, 7, -12);
  ctx.stroke();
  // base orb
  ctx.beginPath();
  ctx.arc(0, 42, 4, 0, Math.PI * 2);
  ctx.stroke();
};

const nandi: Painter = (ctx, theme) => {
  // seated nandi, side profile, facing right
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.1;
  // body
  ctx.beginPath();
  ctx.moveTo(-30, 18);
  ctx.quadraticCurveTo(-34, -2, -18, -6);
  ctx.lineTo(10, -6);
  ctx.quadraticCurveTo(24, -4, 22, 12);
  ctx.lineTo(20, 22);
  ctx.stroke();
  // haunch
  ctx.beginPath();
  ctx.arc(-18, 8, 12, Math.PI * 0.9, Math.PI * 1.85);
  ctx.stroke();
  // front legs
  ctx.beginPath();
  ctx.moveTo(14, 10);
  ctx.lineTo(14, 24);
  ctx.moveTo(20, 12);
  ctx.lineTo(20, 24);
  ctx.stroke();
  // hump
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.quadraticCurveTo(-6, -16, 4, -6);
  ctx.stroke();
  // neck and head
  ctx.beginPath();
  ctx.moveTo(20, 2);
  ctx.quadraticCurveTo(30, -2, 32, -8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, -8);
  ctx.quadraticCurveTo(38, -10, 38, -4);
  ctx.lineTo(34, 0);
  ctx.stroke();
  // horns
  ctx.beginPath();
  ctx.moveTo(32, -9);
  ctx.quadraticCurveTo(30, -18, 24, -20);
  ctx.moveTo(35, -9);
  ctx.quadraticCurveTo(38, -17, 34, -21);
  ctx.stroke();
  // ear
  ctx.beginPath();
  ctx.ellipse(27, -5, 3.4, 1.8, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  // bell
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.quadraticCurveTo(28, 6, 31, 6);
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.moveTo(-30, 4);
  ctx.quadraticCurveTo(-38, 10, -36, 20);
  ctx.stroke();
};

const tamilLetter: Painter = (ctx, theme) => {
  // a stylised Tamil "அ" built from strokes, not a webfont
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-14, 0, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, -14);
  ctx.lineTo(-3, 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, -11);
  ctx.quadraticCurveTo(-2, -20, 8, -12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -12);
  ctx.quadraticCurveTo(16, -6, 12, 2);
  ctx.stroke();
  // pulli
  ctx.fillStyle = soft(theme);
  ctx.beginPath();
  ctx.arc(22, 12, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // baseline rule
  ctx.strokeStyle = withAlpha(gold(theme), 0.4);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-30, 20);
  ctx.lineTo(30, 20);
  ctx.stroke();
};

const dwarams: Painter = (ctx, theme) => {
  // a stepped gopuram gate seen head-on
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.2;
  const step = 6;
  const baseY = 34;
  const topY = -26;
  const outer = 40;
  const inner = 22;
  ctx.beginPath();
  ctx.moveTo(-outer, baseY);
  ctx.lineTo(-outer, topY + step * 2);
  ctx.lineTo(-outer + step * 2, topY + step * 2);
  ctx.lineTo(-outer + step * 2, topY);
  ctx.lineTo(outer - step * 2, topY);
  ctx.lineTo(outer - step * 2, topY + step * 2);
  ctx.lineTo(outer, topY + step * 2);
  ctx.lineTo(outer, baseY);
  ctx.stroke();
  // doorway
  ctx.beginPath();
  ctx.moveTo(-inner, baseY);
  ctx.lineTo(-inner, 0);
  ctx.arc(0, 0, inner, Math.PI, 0);
  ctx.lineTo(inner, baseY);
  ctx.stroke();
  // tier lines across the facade
  ctx.strokeStyle = withAlpha(gold(theme), 0.35);
  ctx.lineWidth = 0.6;
  for (let y = topY + step * 3; y < baseY; y += 9) {
    ctx.beginPath();
    ctx.moveTo(-outer + 4, y);
    ctx.lineTo(-inner - 3, y);
    ctx.moveTo(inner + 3, y);
    ctx.lineTo(outer - 4, y);
    ctx.stroke();
  }
  // finials
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1;
  [-outer + step * 2, 0, outer - step * 2].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, topY - 3, 2.6, 0, Math.PI * 2);
    ctx.stroke();
  });
};

/* ---------------------------- nature (new set) --------------------------- */

const sunriseGlyph: Painter = (ctx, theme) => {
  const horizon = 8;
  // sun disc with horizon cut
  ctx.save();
  ctx.beginPath();
  ctx.rect(-50, -50, 100, 50 + horizon);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(0, horizon, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // rays
  for (let index = 0; index < 11; index += 1) {
    const angle = Math.PI + (Math.PI * index) / 10;
    const inner = 26;
    const outer = index % 2 === 0 ? 38 : 33;
    ctx.strokeStyle = withAlpha(gold(theme), index % 2 === 0 ? 0.8 : 0.45);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, horizon + Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, horizon + Math.sin(angle) * outer);
    ctx.stroke();
  }
  // horizon
  ctx.strokeStyle = gold(theme);
  ctx.beginPath();
  ctx.moveTo(-40, horizon);
  ctx.lineTo(40, horizon);
  ctx.stroke();
  // reflection lines
  ctx.strokeStyle = withAlpha(gold(theme), 0.4);
  [-1, 1].forEach((side) => {
    [12, 18, 25].forEach((offset, index) => {
      ctx.beginPath();
      ctx.moveTo(side * (6 + index * 3), horizon + offset);
      ctx.lineTo(side * (18 + index * 5), horizon + offset);
      ctx.stroke();
    });
  });
};

const waveCurl: Painter = (ctx, theme) => {
  // three stacked curls, each tighter than the one above
  ctx.strokeStyle = gold(theme);
  for (let row = 0; row < 3; row += 1) {
    const y = 6 + row * 13;
    ctx.lineWidth = 1.2 - row * 0.2;
    ctx.beginPath();
    ctx.moveTo(-42, y);
    ctx.bezierCurveTo(-24, y - 12, -6, y - 12, 0, y);
    ctx.bezierCurveTo(6, y + 10, 22, y + 10, 30, y - 2);
    ctx.bezierCurveTo(35, y - 9, 30, y - 15, 24, y - 12);
    ctx.stroke();
  }
  // spray
  ctx.fillStyle = withAlpha(soft(theme), 0.85);
  [
    [-18, -4],
    [-12, -8],
    [18, 4],
    [24, 1],
    [30, -10],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
};

const pine: Painter = (ctx, theme) => {
  // a single conifer, three tiers
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.lineTo(0, 10);
  ctx.stroke();
  const tiers: Array<[number, number, number]> = [
    [10, 24, 0.9],
    [-2, 18, 1],
    [-14, 12, 0.8],
  ];
  tiers.forEach(([topY, halfWidth, alpha]) => {
    ctx.strokeStyle = withAlpha(gold(theme), alpha);
    ctx.beginPath();
    ctx.moveTo(0, topY - 26);
    ctx.lineTo(halfWidth, topY);
    ctx.lineTo(-halfWidth, topY);
    ctx.closePath();
    ctx.stroke();
  });
  // ground
  ctx.strokeStyle = withAlpha(gold(theme), 0.4);
  ctx.beginPath();
  ctx.moveTo(-34, 40);
  ctx.lineTo(34, 40);
  ctx.stroke();
  // second, smaller tree
  ctx.strokeStyle = withAlpha(gold(theme), 0.45);
  ctx.beginPath();
  ctx.moveTo(26, 40);
  ctx.lineTo(26, 20);
  ctx.moveTo(16, 24);
  ctx.lineTo(26, 6);
  ctx.lineTo(36, 24);
  ctx.stroke();
};

const rainGlyph: Painter = (ctx, theme) => {
  ctx.strokeStyle = gold(theme);
  // cloud
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-30, -14);
  ctx.quadraticCurveTo(-30, -28, -14, -28);
  ctx.quadraticCurveTo(-6, -38, 6, -32);
  ctx.quadraticCurveTo(18, -36, 22, -24);
  ctx.quadraticCurveTo(34, -20, 30, -10);
  ctx.quadraticCurveTo(28, -4, 18, -4);
  ctx.lineTo(-20, -4);
  ctx.quadraticCurveTo(-30, -4, -30, -14);
  ctx.stroke();
  // rain
  ctx.strokeStyle = withAlpha(soft(theme), 0.8);
  ctx.lineWidth = 1;
  for (let index = 0; index < 7; index += 1) {
    const x = -24 + index * 8;
    const y = 2 + (index % 3) * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 12);
    ctx.stroke();
  }
  // puddle
  ctx.strokeStyle = withAlpha(gold(theme), 0.45);
  ctx.beginPath();
  ctx.ellipse(0, 32, 26, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
};

const blossomGlyph: Painter = (ctx, theme) => {
  // five-petal flower
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.1;
  for (let index = 0; index < 5; index += 1) {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -16, 8, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = withAlpha(soft(theme), 0.9);
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // loose petals
  ctx.strokeStyle = withAlpha(gold(theme), 0.5);
  [
    [30, 24, -0.5],
    [-32, 18, 0.7],
    [26, -28, 1.2],
  ].forEach(([x, y, angle]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
};

/* ---------------------------- space (new set) ---------------------------- */

const spiral: Painter = (ctx, theme) => {
  ctx.strokeStyle = gold(theme);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let step = 0; step <= 220; step += 1) {
    const angle = step * 0.11;
    const radius = 1.2 * angle;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.62;
    if (step === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // core
  ctx.fillStyle = withAlpha(soft(theme), 0.9);
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // stars
  ctx.fillStyle = withAlpha(theme.ink, 0.8);
  [
    [30, -26],
    [-34, 20],
    [22, 26],
    [-26, -30],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
};

const nebulaCloud: Painter = (ctx, theme) => {
  // overlapping soft blobs drawn as concentric strokes
  const blobs: Array<[number, number, number]> = [
    [-10, -4, 30],
    [20, 8, 20],
    [-22, 14, 16],
  ];
  ctx.strokeStyle = gold(theme);
  blobs.forEach(([bx, by, radius], index) => {
    for (let ring = 1; ring <= 4; ring += 1) {
      ctx.strokeStyle = withAlpha(gold(theme), 0.5 - ring * 0.09 - index * 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(bx, by, (radius * ring) / 4, (radius * ring) / 4.6, index * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.fillStyle = withAlpha(soft(theme), 0.9);
  [
    [4, -8],
    [16, 2],
    [-14, 6],
    [24, -10],
    [-6, 18],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
};

const rocketGlyph: Painter = (ctx, theme) => {
  ctx.save();
  ctx.rotate(-0.32);
  ctx.strokeStyle = soft(theme);
  ctx.lineWidth = 1.3;
  // body
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.quadraticCurveTo(13, -20, 11, 12);
  ctx.lineTo(-11, 12);
  ctx.quadraticCurveTo(-13, -20, 0, -42);
  ctx.stroke();
  // fins
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(24, 18);
  ctx.lineTo(11, 14);
  ctx.moveTo(-11, 0);
  ctx.lineTo(-24, 18);
  ctx.lineTo(-11, 14);
  ctx.stroke();
  // window
  ctx.beginPath();
  ctx.arc(0, -16, 5, 0, Math.PI * 2);
  ctx.stroke();
  // nozzle
  ctx.beginPath();
  ctx.moveTo(-7, 12);
  ctx.lineTo(-9, 20);
  ctx.lineTo(9, 20);
  ctx.lineTo(7, 12);
  ctx.stroke();
  // flame
  ctx.strokeStyle = withAlpha(gold(theme), 0.85);
  ctx.beginPath();
  ctx.moveTo(-5, 22);
  ctx.quadraticCurveTo(0, 44, 5, 22);
  ctx.stroke();
  ctx.restore();
};

const moonGlyph: Painter = (ctx, theme) => {
  // crescent built from two arcs, plus a crater field
  ctx.strokeStyle = soft(theme);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(14, -8, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // craters
  ctx.strokeStyle = withAlpha(gold(theme), 0.55);
  ctx.lineWidth = 0.9;
  [
    [-14, 6, 5],
    [-8, 20, 3],
    [-22, -8, 2.4],
    [-16, -20, 3.6],
  ].forEach(([x, y, radius]) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  });
};

const saturnGlyph: Painter = (ctx, theme) => {
  ctx.save();
  ctx.rotate(-0.4);

  const pr = 19; // planet radius
  const rx = 46; // ring major radius
  const ry = 13.5; // ring minor radius

  // 1. BACK HALF OF RINGS (drawn behind the planet globe)
  // Outer Ring A
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
  const ringBackGrad = ctx.createLinearGradient(-rx, 0, rx, 0);
  ringBackGrad.addColorStop(0, "rgba(180, 120, 40, 0.4)");
  ringBackGrad.addColorStop(0.3, "rgba(235, 185, 90, 0.75)");
  ringBackGrad.addColorStop(0.7, "rgba(255, 220, 140, 0.9)");
  ringBackGrad.addColorStop(1, "rgba(160, 95, 25, 0.35)");
  ctx.strokeStyle = ringBackGrad;
  ctx.lineWidth = 4.2;
  ctx.stroke();

  // Cassini Division (dark cosmic gap behind)
  ctx.strokeStyle = "rgba(15, 10, 5, 0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 3.8, ry - 1.1, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Bright Ring B (main broad ring behind)
  const ringBBack = ctx.createLinearGradient(-rx, 0, rx, 0);
  ringBBack.addColorStop(0, "rgba(210, 150, 60, 0.6)");
  ringBBack.addColorStop(0.4, "rgba(255, 235, 165, 0.95)");
  ringBBack.addColorStop(0.8, "rgba(230, 175, 80, 0.85)");
  ringBBack.addColorStop(1, "rgba(180, 110, 35, 0.5)");
  ctx.strokeStyle = ringBBack;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 8.5, ry - 2.5, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Inner faint C-ring (crepe ring behind)
  ctx.strokeStyle = "rgba(200, 160, 100, 0.25)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 14, ry - 4.1, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 2. PLANET GLOBE (3D spherical shading with atmospheric cloud bands)
  ctx.save();
  // Spherical base gradient (light coming from upper-left)
  const globeGrad = ctx.createRadialGradient(-pr * 0.42, -pr * 0.45, pr * 0.08, 0, 0, pr * 1.05);
  globeGrad.addColorStop(0, "#FFF8E1");
  globeGrad.addColorStop(0.2, "#FFE082");
  globeGrad.addColorStop(0.48, "#D49B28");
  globeGrad.addColorStop(0.78, "#8D5413");
  globeGrad.addColorStop(0.95, "#422306");
  globeGrad.addColorStop(1, "#1F0F02");

  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(0, 0, pr, 0, Math.PI * 2);
  ctx.fillStyle = globeGrad;
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Clip to globe for atmospheric banding and ring shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, pr, 0, Math.PI * 2);
  ctx.clip();

  // Planetary atmospheric bands
  const bands = [
    { y: -13, h: 3.5, color: "rgba(255, 248, 220, 0.28)" },
    { y: -8, h: 4.5, color: "rgba(180, 110, 30, 0.35)" },
    { y: -2, h: 3.2, color: "rgba(255, 230, 150, 0.25)" },
    { y: 3, h: 4.8, color: "rgba(140, 75, 15, 0.42)" },
    { y: 9, h: 3.6, color: "rgba(100, 50, 10, 0.5)" },
  ];
  for (const b of bands) {
    ctx.fillStyle = b.color;
    ctx.fillRect(-pr, b.y, pr * 2, b.h);
  }

  // Cast shadow of the rings across the globe
  ctx.fillStyle = "rgba(18, 9, 3, 0.72)";
  ctx.beginPath();
  ctx.ellipse(0, 2.5, pr * 1.05, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crescent limb highlight on the illuminated sunlit edge
  ctx.strokeStyle = "rgba(255, 250, 230, 0.75)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, pr - 0.7, Math.PI * 0.9, Math.PI * 1.85);
  ctx.stroke();

  ctx.restore(); // restore clip

  // 3. FRONT HALF OF RINGS (drawn in front of the planet globe)
  // Inner faint C-ring (crepe ring in front)
  ctx.strokeStyle = "rgba(220, 180, 110, 0.35)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 14, ry - 4.1, 0, 0, Math.PI);
  ctx.stroke();

  // Bright Ring B (main broad ring in front)
  const ringBFront = ctx.createLinearGradient(-rx, 0, rx, 0);
  ringBFront.addColorStop(0, "rgba(220, 160, 65, 0.85)");
  ringBFront.addColorStop(0.35, "rgba(255, 245, 195, 1)");
  ringBFront.addColorStop(0.7, "rgba(245, 195, 95, 0.95)");
  ringBFront.addColorStop(1, "rgba(195, 120, 40, 0.75)");
  ctx.strokeStyle = ringBFront;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 8.5, ry - 2.5, 0, 0, Math.PI);
  ctx.stroke();

  // Cassini Division in front (sharp dark gap)
  ctx.strokeStyle = "rgba(20, 12, 4, 0.85)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 3.8, ry - 1.1, 0, 0, Math.PI);
  ctx.stroke();

  // Outer Ring A in front
  const ringAFront = ctx.createLinearGradient(-rx, 0, rx, 0);
  ringAFront.addColorStop(0, "rgba(190, 130, 45, 0.7)");
  ringAFront.addColorStop(0.3, "rgba(255, 225, 150, 0.95)");
  ringAFront.addColorStop(0.7, "rgba(240, 180, 80, 0.85)");
  ringAFront.addColorStop(1, "rgba(170, 100, 30, 0.6)");
  ctx.strokeStyle = ringAFront;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.stroke();

  // Razor-sharp ring edge highlight
  ctx.strokeStyle = "rgba(255, 250, 220, 0.8)";
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx + 1.8, ry + 0.55, 0, 0, Math.PI * 0.95);
  ctx.stroke();

  ctx.restore(); // restore rotation

  // Celestial sparkle / orbital star anchors
  const stars: Array<[number, number, number]> = [
    [-38, -32, 2.2],
    [36, -34, 1.8],
    [40, 30, 2.0],
    [-34, 32, 1.6],
  ];
  for (const [sx, sy, sr] of stars) {
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2);
    sg.addColorStop(0, "#FFFDE7");
    sg.addColorStop(0.4, withAlpha(theme.gold, 0.8));
    sg.addColorStop(1, "transparent");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 2, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Sacred South Indian Marigold (Genda phool) with layered ruffled petals */
const marigold: Painter = (ctx, theme) => {
  ctx.save();
  const radius = 34;

  // Outer ruffled tier - deep fiery vermillion / burnt orange
  const outerLayers = 14;
  ctx.fillStyle = "#E65100";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  for (let i = 0; i < outerLayers; i += 1) {
    const a = (i / outerLayers) * Math.PI * 2;
    const px = Math.cos(a) * (radius * 0.76);
    const py = Math.sin(a) * (radius * 0.76);
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = "transparent";

  // Middle ruffled tier - rich golden saffron
  const midLayers = 12;
  ctx.fillStyle = "#FB8C00";
  for (let i = 0; i < midLayers; i += 1) {
    const a = (i / midLayers) * Math.PI * 2 + Math.PI / midLayers;
    const px = Math.cos(a) * (radius * 0.52);
    const py = Math.sin(a) * (radius * 0.52);
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner floret tier - brilliant radiant yellow gold
  const innerLayers = 10;
  ctx.fillStyle = "#FDD835";
  for (let i = 0; i < innerLayers; i += 1) {
    const a = (i / innerLayers) * Math.PI * 2;
    const px = Math.cos(a) * (radius * 0.28);
    const py = Math.sin(a) * (radius * 0.28);
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center core - glowing amber bindu
  const core = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 0.22);
  core.addColorStop(0, "#FFF9C4");
  core.addColorStop(0.4, "#FFB300");
  core.addColorStop(1, "#E65100");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Subtle petal edge highlights
  ctx.strokeStyle = "rgba(255, 248, 220, 0.45)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
    ctx.stroke();
  }

  ctx.restore();
  void theme;
};

/** Auspicious Temple Parijata / Golden Flower bloom */
const flower: Painter = (ctx, theme) => {
  ctx.save();
  const petalCount = 8;
  const len = 38;
  const w = 13;

  for (let i = 0; i < petalCount; i += 1) {
    const a = (i / petalCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);

    const pg = ctx.createLinearGradient(0, 0, 0, len);
    pg.addColorStop(0, "#5A340F");
    pg.addColorStop(0.25, withAlpha(theme.gold, 0.95));
    pg.addColorStop(0.65, "#FFE69C");
    pg.addColorStop(1, "#FFFDF0");

    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(w, len * 0.35, w * 0.8, len * 0.85, 0, len);
    ctx.bezierCurveTo(-w * 0.8, len * 0.85, -w, len * 0.35, 0, 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = withAlpha(theme.goldSoft, 0.7);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Central vein on petal
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, len * 0.8);
    ctx.stroke();

    ctx.restore();
  }

  // Golden stamen center
  const center = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11);
  center.addColorStop(0, "#FFFFFF");
  center.addColorStop(0.3, "#FFE082");
  center.addColorStop(0.7, "#D49B28");
  center.addColorStop(1, "#663C05");
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

/** Auspicious Kalyana Maalai garland arc */
const garland: Painter = (ctx, theme) => {
  ctx.save();
  // Braided garland spine curve
  ctx.strokeStyle = "#2E7D32";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-45, -20);
  ctx.quadraticCurveTo(0, 32, 45, -20);
  ctx.stroke();

  // Alternating marigold florets and jasmine clusters along the garland
  const segments = 11;
  for (let i = 0; i < segments; i += 1) {
    const t = i / (segments - 1);
    const x = -42 + t * 84;
    const y = -20 + Math.sin(t * Math.PI) * 48;
    ctx.save();
    ctx.translate(x, y);

    if (i % 2 === 0) {
      // Marigold cluster (orange/saffron)
      ctx.fillStyle = "#E65100";
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FB8C00";
      ctx.beginPath();
      ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFE082";
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Jasmine cluster (pearl white)
      ctx.fillStyle = "#FFFDE7";
      for (let j = 0; j < 5; j += 1) {
        const ja = (j / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ja) * 3.2, Math.sin(ja) * 3.2, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#FBC02D";
      ctx.beginPath();
      ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Golden bow and dangling tassels at bottom center
  ctx.fillStyle = foilGradient(ctx, theme, 0, 24, 12);
  ctx.beginPath();
  ctx.ellipse(0, 28, 5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const mandala: Painter = (ctx, theme) => {
  const plate=ctx.createRadialGradient(-10,-13,1,0,0,49);plate.addColorStop(0,"#4A3218");plate.addColorStop(.76,"#73501E");plate.addColorStop(.92,"#F3D17A");plate.addColorStop(1,"#53320F");ctx.fillStyle=plate;ctx.beginPath();ctx.arc(0,0,49,0,Math.PI*2);ctx.fill();
  const field=ctx.createRadialGradient(-8,-12,1,0,0,40);field.addColorStop(0,"#272018");field.addColorStop(1,"#0D0B09");ctx.fillStyle=field;ctx.beginPath();ctx.arc(0,0,40,0,Math.PI*2);ctx.fill();
  const foil=foilGradient(ctx,theme,0,-40,80);ctx.strokeStyle=foil;ctx.fillStyle=foil;ctx.lineWidth=1.1;for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.save();ctx.rotate(a);ctx.shadowColor="rgba(0,0,0,.44)";ctx.shadowBlur=1.5;ctx.beginPath();ctx.moveTo(0,-8);ctx.bezierCurveTo(8,-17,7,-29,0,-36);ctx.bezierCurveTo(-7,-29,-8,-17,0,-8);ctx.closePath();ctx.fill();ctx.restore();}
  [12,23,34].forEach((r)=>{ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();});for(let i=0;i<24;i++){const a=i*Math.PI/12;ctx.beginPath();ctx.arc(Math.cos(a)*38,Math.sin(a)*38,1.7,0,Math.PI*2);ctx.fill();}ctx.fillStyle=withAlpha("#FFF5C6",.86);ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
};
const om: Painter = (ctx, theme) => {ctx.save();ctx.shadowColor="rgba(0,0,0,.58)";ctx.shadowBlur=3;ctx.shadowOffsetX=1.5;ctx.shadowOffsetY=2.2;ctx.font="700 76px 'Noto Sans Devanagari', 'Noto Serif Devanagari', serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=foilGradient(ctx,theme,0,-40,82);ctx.fillText("ॐ",0,8);ctx.restore();ctx.strokeStyle=withAlpha("#FFF2BD",.74);ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,1,43,-Math.PI*.78,Math.PI*.72);ctx.stroke();ctx.fillStyle=withAlpha("#FFF5D3",.82);ctx.beginPath();ctx.arc(0,-39,2.5,0,Math.PI*2);ctx.fill();};
const rangoli: Painter = (ctx, theme) => {const colors=["#EFB94E","#E66B54","#5CB4A6","#A782C7"];for(let ring=0;ring<3;ring++)for(let i=0;i<12;i++){const a=i*Math.PI/6+(ring%2)*Math.PI/12,r=12+ring*11;ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r);ctx.rotate(a);const g=ctx.createLinearGradient(0,-11,0,5);g.addColorStop(0,"#FFF3C9");g.addColorStop(.3,colors[(i+ring)%colors.length]);g.addColorStop(1,"#5A2F19");ctx.globalAlpha=.9;ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-4,4.5,10,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle=foilGradient(ctx,theme,0,-8,22);ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=withAlpha("#FFF8D9",.92);ctx.beginPath();ctx.arc(-2,-2,2,0,Math.PI*2);ctx.fill();};
const sparkles: Painter = (ctx, theme) => {const items:Array<[number,number,number]>=[[-25,-12,8],[0,-28,5],[25,-5,7],[-10,20,5],[18,25,4]];items.forEach(([x,y,r])=>{const g=ctx.createRadialGradient(x-r*.25,y-r*.3,0,x,y,r*1.3);g.addColorStop(0,"#FFFCE2");g.addColorStop(.3,withAlpha(theme.goldSoft,.9));g.addColorStop(1,withAlpha(theme.gold,0));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+r*.16,y-r*.16,x+r,y);ctx.quadraticCurveTo(x+r*.16,y+r*.16,x,y+r);ctx.quadraticCurveTo(x-r*.16,y+r*.16,x-r,y);ctx.quadraticCurveTo(x-r*.16,y-r*.16,x,y-r);ctx.fill();});};
const divider: Painter = (ctx, theme) => {const bar=ctx.createLinearGradient(-46,0,46,0);bar.addColorStop(0,withAlpha(theme.gold,0));bar.addColorStop(.2,withAlpha(theme.gold,.72));bar.addColorStop(.5,"#FFF0B2");bar.addColorStop(.8,withAlpha(theme.gold,.72));bar.addColorStop(1,withAlpha(theme.gold,0));ctx.fillStyle=bar;ctx.fillRect(-46,-1.2,92,2.4);ctx.fillStyle=foilGradient(ctx,theme,0,-8,16);ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(8,0);ctx.lineTo(0,8);ctx.lineTo(-8,0);ctx.closePath();ctx.fill();[-1,1].forEach((side)=>leaf(ctx,side*13,0,10,3.5,side<0?-Math.PI/2:Math.PI/2));};
const corner: Painter = (ctx, theme) => {const g=foilGradient(ctx,theme,0,-45,90);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-46,-43);ctx.lineTo(-28,-43);ctx.quadraticCurveTo(-15,-42,-12,-29);ctx.lineTo(-12,-12);ctx.lineTo(-29,-12);ctx.quadraticCurveTo(-43,-15,-43,-29);ctx.closePath();ctx.fill();ctx.fillStyle=withAlpha("#241707",.72);ctx.beginPath();ctx.moveTo(-39,-38);ctx.lineTo(-30,-38);ctx.quadraticCurveTo(-20,-38,-18,-28);ctx.lineTo(-18,-18);ctx.lineTo(-28,-18);ctx.quadraticCurveTo(-38,-20,-38,-30);ctx.closePath();ctx.fill();leaf(ctx,-29,-27,16,5,-Math.PI/4);leaf(ctx,-19,-38,13,4,Math.PI/4);ctx.fillStyle=withAlpha("#FFF1B8",.88);ctx.beginPath();ctx.arc(-34,-34,2.1,0,Math.PI*2);ctx.fill();};

export const ORNAMENTS: Partial<Record<string, Painter>> = {
  gopuram,
  kalash,
  lamp,
  bell,
  kolam,
  mandala,
  diya: lamp,
  om,
  rangoli,
  sparkles,
  divider,
  corner,
  toran,
  vel,
  peacock,
  conch,
  elephant,
  lotus,
  palm,
  banana,
  jasmine,
  marigold,
  flower,
  garland,
  waves,
  hills,
  geometry,
  sunburst,
  trishul,
  "chola-pillar": cholaPillar,
  "kandha-vel": kandhaVel,
  nandi,
  "tamil-letter": tamilLetter,
  "dwaram-gate": dwarams,
  sunrise: sunriseGlyph,
  "wave-curl": waveCurl,
  pine,
  rain: rainGlyph,
  blossom: blossomGlyph,
  spiral,
  "nebula-cloud": nebulaCloud,
  rocket: rocketGlyph,
  moon: moonGlyph,
  saturn: saturnGlyph,
};

