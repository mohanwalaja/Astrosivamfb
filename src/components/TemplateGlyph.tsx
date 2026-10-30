import type { PosterTemplate } from "../types";

/**
 * A 24 × 30 wireframe of each composition. The whole point of the templates is
 * that they are *different layouts*, and no thumbnail communicates that faster
 * than eight little diagrams that visibly disagree with each other.
 */
export function TemplateGlyph({ template, className = "" }: { template: PosterTemplate; className?: string }) {
  const gold = "currentColor";
  const art = "rgba(199,154,60,0.34)";
  const type = "rgba(251,245,233,0.62)";
  const faint = "rgba(251,245,233,0.28)";

  const shapes: Record<PosterTemplate, React.ReactNode> = {
    mandapam: (
      <>
        {/* pillars, lintel, arch, lamps */}
        <rect x="3" y="4" width="1.6" height="22" fill={gold} fillOpacity="0.45" />
        <rect x="19.4" y="4" width="1.6" height="22" fill={gold} fillOpacity="0.45" />
        <rect x="2" y="3" width="20" height="1.2" fill={gold} fillOpacity="0.6" />
        <path d="M8 15V10a4 4 0 0 1 8 0v5z" fill={art} />
        <path d="M8 15V10a4 4 0 0 1 8 0v5" fill="none" stroke={gold} strokeWidth="0.6" />
        <rect x="8" y="17.5" width="8" height="0.8" fill={faint} />
        <rect x="6.5" y="19.5" width="11" height="1.4" fill={type} />
        <rect x="8" y="21.8" width="8" height="1.4" fill={type} />
        <rect x="9" y="24.6" width="6" height="1.3" rx="0.65" fill={gold} fillOpacity="0.5" />
        <circle cx="3.8" cy="26.5" r="0.8" fill={gold} />
        <circle cx="20.2" cy="26.5" r="0.8" fill={gold} />
      </>
    ),
    gallery: (
      <>
        {/* matted plate above, label below */}
        <rect x="2.5" y="3" width="19" height="15" fill="rgba(251,245,233,0.14)" />
        <rect x="4" y="4.5" width="16" height="11" fill={art} />
        <rect x="4" y="4.5" width="16" height="11" fill="none" stroke={gold} strokeOpacity="0.5" strokeWidth="0.4" />
        <rect x="4" y="16.4" width="3" height="0.5" fill={faint} />
        <rect x="2.5" y="20.5" width="12" height="1.6" fill={type} />
        <rect x="2.5" y="23" width="9" height="1.6" fill={type} />
        <rect x="2.5" y="25.6" width="14" height="0.6" fill={faint} />
        <rect x="2.5" y="28" width="19" height="0.4" fill={faint} />
      </>
    ),
    manifesto: (
      <>
        {/* margin rule, slash, huge type, watermark */}
        <text x="12" y="19" textAnchor="middle" fontSize="13" fill={gold} fillOpacity="0.12" fontFamily="serif">ஜ</text>
        <rect x="2.2" y="5" width="0.5" height="20" fill={gold} fillOpacity="0.5" />
        <rect x="5" y="6" width="4" height="0.9" fill={gold} />
        <rect x="5" y="9" width="16" height="2.4" fill={type} />
        <rect x="5" y="12.4" width="13" height="2.4" fill={type} />
        <rect x="5" y="15.8" width="15" height="2.4" fill={type} />
        <rect x="5" y="19.2" width="9" height="2.4" fill={type} />
        <rect x="5" y="23" width="8" height="0.6" fill={faint} />
        <rect x="2.2" y="27.5" width="19.6" height="0.4" fill={faint} />
      </>
    ),
    nocturne: (
      <>
        {/* full-bleed art, frosted card */}
        <rect x="0.5" y="0.5" width="23" height="29" fill={art} />
        <rect x="1.8" y="1.8" width="20.4" height="26.4" fill="none" stroke={faint} strokeWidth="0.4" />
        <rect x="3" y="16" width="18" height="11" rx="1.4" fill="rgba(10,12,18,0.72)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
        <rect x="4.5" y="16" width="15" height="0.5" fill={gold} fillOpacity="0.7" />
        <rect x="4.8" y="18.3" width="4" height="0.6" fill={faint} />
        <rect x="4.8" y="20" width="13" height="1.5" fill={type} />
        <rect x="4.8" y="22.2" width="9" height="1.5" fill={type} />
        <rect x="4.8" y="24.6" width="5.5" height="1.4" rx="0.7" fill={gold} fillOpacity="0.6" />
      </>
    ),
    lesson: (
      <>
        {/* numeral, round inset, three cards, rail */}
        <text x="2" y="8.2" fontSize="6.5" fontWeight="700" fill={gold} fillOpacity="0.8" fontFamily="serif">01</text>
        <rect x="10" y="4.5" width="12" height="0.4" fill={faint} />
        <circle cx="18.5" cy="12.5" r="3.4" fill={art} stroke={gold} strokeWidth="0.5" />
        <rect x="2" y="10.5" width="11" height="1.5" fill={type} />
        <rect x="2" y="12.7" width="9" height="1.5" fill={type} />
        <rect x="2" y="17.5" width="20" height="2.6" rx="0.6" fill="rgba(251,245,233,0.08)" stroke={faint} strokeWidth="0.3" />
        <rect x="2" y="17.5" width="2.4" height="2.6" rx="0.6" fill={gold} fillOpacity="0.7" />
        <rect x="2" y="20.8" width="20" height="2.6" rx="0.6" fill="rgba(251,245,233,0.08)" stroke={faint} strokeWidth="0.3" />
        <rect x="2" y="20.8" width="2.4" height="2.6" rx="0.6" fill={gold} fillOpacity="0.7" />
        <rect x="2" y="24.1" width="20" height="2.6" rx="0.6" fill="rgba(251,245,233,0.08)" stroke={faint} strokeWidth="0.3" />
        <rect x="2" y="24.1" width="2.4" height="2.6" rx="0.6" fill={gold} fillOpacity="0.7" />
        <rect x="2" y="28" width="6.4" height="0.6" fill={gold} />
        <rect x="8.8" y="28" width="6.4" height="0.6" fill={faint} />
        <rect x="15.6" y="28" width="6.4" height="0.6" fill={faint} />
      </>
    ),
    offer: (
      <>
        {/* diagonal band, product card, stamp, chips, button */}
        <path d="M0 4h13.5l-1.4 2.6H0z" fill={gold} fillOpacity="0.75" />
        <rect x="13.5" y="3" width="8.5" height="10.5" rx="0.8" fill={art} stroke={gold} strokeOpacity="0.5" strokeWidth="0.4" />
        <circle cx="13.6" cy="13.2" r="1.7" fill={gold} />
        <rect x="2" y="8.5" width="9.5" height="1.6" fill={type} />
        <rect x="2" y="10.9" width="8" height="1.6" fill={type} />
        <rect x="2" y="13.3" width="9" height="1.6" fill={type} />
        <rect x="2" y="17.5" width="5.5" height="1.6" rx="0.8" fill="none" stroke={faint} strokeWidth="0.4" />
        <rect x="8.3" y="17.5" width="6.5" height="1.6" rx="0.8" fill="none" stroke={faint} strokeWidth="0.4" />
        <rect x="15.6" y="17.5" width="5" height="1.6" rx="0.8" fill="none" stroke={faint} strokeWidth="0.4" />
        <rect x="2" y="21.5" width="8.5" height="2.4" rx="1.2" fill={gold} fillOpacity="0.75" />
        <rect x="2" y="27.5" width="20" height="0.4" fill={faint} />
      </>
    ),
    blessing: (
      <>
        {/* rays, medallion, lamps, greeting */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="12"
            y1="9"
            x2={12 + Math.cos((i / 12) * Math.PI * 2) * 9}
            y2={9 + Math.sin((i / 12) * Math.PI * 2) * 9}
            stroke={gold}
            strokeOpacity="0.18"
            strokeWidth="0.4"
          />
        ))}
        <circle cx="12" cy="9" r="4.6" fill={art} />
        <circle cx="12" cy="9" r="4.6" fill="none" stroke={gold} strokeWidth="0.6" />
        {[6, 9, 12, 15, 18].map((x) => (
          <circle key={x} cx={x} cy="16.6" r={x === 12 ? 0.9 : 0.7} fill={gold} />
        ))}
        <rect x="6" y="19.3" width="12" height="1.6" fill={type} />
        <rect x="4.5" y="21.8" width="15" height="1.4" fill={type} />
        <rect x="8" y="24.2" width="8" height="0.7" fill={faint} />
        <rect x="8.5" y="26.2" width="7" height="1.3" rx="0.65" fill="none" stroke={gold} strokeWidth="0.4" />
      </>
    ),
    sequence: (
      <>
        {/* arc-cut art, oversized index, swipe */}
        <rect x="0.5" y="0.5" width="23" height="18" fill={art} />
        <path d="M0.5 18.5Q13 11 23.5 17.5V29.5H0.5z" fill="#1A1410" />
        <path d="M0.5 18.5Q13 11 23.5 17.5" fill="none" stroke={gold} strokeWidth="0.6" />
        <text x="-0.5" y="24" fontSize="9" fontWeight="700" fill={gold} fillOpacity="0.85" fontFamily="serif">01</text>
        <rect x="8" y="18" width="13" height="1.6" fill={type} />
        <rect x="8" y="20.4" width="10" height="1.6" fill={type} />
        <rect x="8" y="23" width="8" height="0.6" fill={faint} />
        {[2, 4, 6, 8, 10].map((x, i) => (
          <circle key={x} cx={x} cy="27.5" r="0.55" fill={i === 0 ? gold : faint} />
        ))}
        <path d="M18 27.5h3.5l-1.2-1.2M21.5 27.5l-1.2 1.2" fill="none" stroke={gold} strokeWidth="0.5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 30" aria-hidden="true" className={className}>
      <rect x="0.5" y="0.5" width="23" height="29" rx="1.2" fill="none" stroke={faint} strokeWidth="0.4" />
      {shapes[template]}
    </svg>
  );
}
