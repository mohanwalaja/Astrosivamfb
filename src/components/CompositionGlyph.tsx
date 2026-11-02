import type { CompositionKey, DesignCategory } from "../data/designBriefs";
import { planComposition, type Box } from "../lib/compositionPlan";

/** A true miniature of the responsive plan, not a decorative icon. */
export function CompositionGlyph({ composition, category = "birth", className = "", landscape = false }: { composition: CompositionKey; category?: DesignCategory; className?: string; landscape?: boolean }) {
  const W = 100, H = landscape ? 62 : 125;
  const p = planComposition({ key: composition, category, width: W, height: H });
  const rect = (b: Box, fill: string, key: string, rx = 1) => <rect key={key} x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} fill={fill} />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true">
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="3" fill="currentColor" fillOpacity=".035" stroke="currentColor" strokeOpacity=".22" />
      {p.artShape === "circle" ? <ellipse cx={p.art.x + p.art.w / 2} cy={p.art.y + p.art.h / 2} rx={Math.min(p.art.w, p.art.h) / 2} ry={Math.min(p.art.w, p.art.h) / 2} fill="currentColor" fillOpacity=".24" /> : rect(p.art, "currentColor", "art", p.artShape === "arch" ? 12 : 1)}
      {rect(p.title, "currentColor", "title")}
      {rect(p.service, "currentColor", "service")}
      {rect(p.body, "currentColor", "body")}
      {p.facts.map((b, i) => rect(b, "currentColor", `fact-${i}`))}
      {rect(p.cta, "currentColor", "cta", 2)}
      {rect(p.logo, "currentColor", "logo")}
    </svg>
  );
}
