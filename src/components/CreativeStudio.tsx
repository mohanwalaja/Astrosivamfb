import React, { useState } from "react";
import { AssetStudio } from "./AssetStudio";
import { ProfileCover } from "./ProfileCover";
import { ServicePosts } from "./ServicePosts";
import { Segmented } from "./ui";

/**
 * The single creative surface.
 *
 * Asset Studio (every format), the Identity set (profile & covers) and
 * Service Posts (per-service copy desk) used to be three top-level sections
 * over the same `renderCreative` engine and the same twelve art directions.
 * They are now three views of one studio: one navigation entry, one place to
 * make and export creative. Each view keeps its own working state, exactly as
 * the separate sections did — switching views is switching tools, not losing
 * a different app.
 */

export type CreativeView = "assets" | "identity" | "services";

const VIEWS: Array<{ value: CreativeView; label: string; hint: string }> = [
  {
    value: "assets",
    label: "Assets",
    hint: "Every format at export resolution — pick a format, service, art direction and palette, edit the copy, download one PNG or a whole pack.",
  },
  {
    value: "identity",
    label: "Identity set",
    hint: "Profile photos, covers, the link card and highlight covers — drawn at platform resolution with the mobile crops already accounted for.",
  },
  {
    value: "services",
    label: "Service posts",
    hint: "One service at a time: the creative in twelve art directions, final Facebook/Instagram captions, carousel, reel, stories, hashtags, ads and the brief.",
  },
];

export const CreativeStudio: React.FC<{ onNavigate: (section: string) => void }> = ({ onNavigate }) => {
  const [view, setView] = useState<CreativeView>("assets");
  const active = VIEWS.find((item) => item.value === view) ?? VIEWS[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-[#191314]/70 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-gold">Creative studio</div>
          <p className="mt-0.5 max-w-[62ch] truncate text-[11px] text-[#A2937D]" title={active.hint}>
            {active.hint}
          </p>
        </div>
        <Segmented<CreativeView>
          label="Creative studio views"
          options={VIEWS.map(({ value, label }) => ({ value, label }))}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "assets" ? <AssetStudio /> : null}
      {view === "identity" ? <ProfileCover /> : null}
      {view === "services" ? (
        <ServicePosts onNavigate={onNavigate} onOpenAssets={() => setView("assets")} />
      ) : null}
    </div>
  );
};
