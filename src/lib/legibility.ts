/**
 * Measured mobile legibility.
 *
 * A creative is drawn at 1080–1640 px but read at 124–390 px. Judging that by
 * eye at full size is how 6 px captions ship. Every painter logs the type it
 * actually draws; this module converts each line to the size it will appear at
 * the width the asset is really seen at, and compares it with a floor for its
 * role.
 *
 * Shared by the Facebook and Instagram renderers so the two cannot drift.
 */

export type TypeRole = "headline" | "body" | "cta" | "kicker" | "footer" | "desktop";

export interface TypedDraw {
  role: TypeRole;
  size: number;
  text: string;
}

export interface LegibilityFinding {
  role: TypeRole;
  size: number;
  /** Size in CSS px at the width the asset is actually displayed. */
  effective: number;
  minimum: number;
  passes: boolean;
  text: string;
}

export interface LegibilityAudit {
  /** Width the asset is displayed at on a phone, in CSS px. */
  mobileWidth: number;
  /** Width the audit measured against — the visible crop, not always the canvas. */
  posterWidth: number;
  scale: number;
  findings: LegibilityFinding[];
  failing: LegibilityFinding[];
  /** Smallest effective headline size, in CSS px. */
  smallestHeadline: number;
  passes: boolean;
}

/** Minimum effective CSS px per role at the mobile display width. */
export const LEGIBILITY_MINIMUMS: Record<TypeRole, number> = {
  desktop: 0,
  headline: 16,
  cta: 11.5,
  body: 11,
  kicker: 8.5,
  footer: 8,
};

/**
 * `posterWidth` must be the width the viewer sees, not the canvas width.
 * A cover cropped to 640 px on a phone is audited against 640.
 */
export function auditLegibility(typography: TypedDraw[], posterWidth: number, mobileWidth: number): LegibilityAudit {
  const scale = mobileWidth / posterWidth;
  const findings = typography
    .filter((entry) => entry.role !== "desktop")
    .map((entry) => {
      const effective = Math.round(entry.size * scale * 100) / 100;
      const minimum = LEGIBILITY_MINIMUMS[entry.role];
      return { ...entry, effective, minimum, passes: effective >= minimum };
    });
  const headlines = findings.filter((finding) => finding.role === "headline");
  return {
    mobileWidth,
    posterWidth,
    scale,
    findings,
    failing: findings.filter((finding) => !finding.passes),
    smallestHeadline: headlines.length ? Math.min(...headlines.map((finding) => finding.effective)) : 0,
    passes: findings.every((finding) => finding.passes),
  };
}

/** Every painter records the type it draws, so the audit is measured, not guessed. */
export class TypeLog {
  entries: TypedDraw[] = [];
  add(role: TypeRole, size: number, text: string) {
    if (!text.trim()) return;
    this.entries.push({ role, size: Math.round(size * 10) / 10, text: text.slice(0, 40) });
  }
}
