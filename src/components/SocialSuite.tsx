import React, { useState } from "react";
import { Facebook, Instagram } from "lucide-react";
import { FacebookSuite } from "./FacebookSuite";
import { InstagramSuite } from "./InstagramSuite";
import { Segmented } from "./ui";

/**
 * The Social Suite: Facebook and Instagram under one roof.
 *
 * The two platform suites used to be separate top-level sections, even though
 * they share one Meta connection, one publisher and one set of services. They
 * are now two platform views of a single Social Suite — one navigation entry,
 * one place to compose, check and publish. Each platform keeps its own views
 * and working state (Facebook: Post studio / Profile & cover / Publish /
 * Page kit; Instagram: Profile / Grid / Feed posts / Stories & Reels /
 * Highlights / Playbook / API limits), exactly as the separate suites did.
 */

export type SocialPlatform = "facebook" | "instagram";

const PLATFORMS: Array<{ value: SocialPlatform; hint: string }> = [
  {
    value: "facebook",
    hint: "The Page: compose a post, check it at phone size, prepare profile and cover, then publish — with Meta's own responses on screen, never a simulated success.",
  },
  {
    value: "instagram",
    hint: "The profile and grid: nine composed posts, stories and reel covers, highlights, the playbook and what the API can and cannot do.",
  },
];

export const SocialSuite: React.FC = () => {
  const [platform, setPlatform] = useState<SocialPlatform>("facebook");
  const active = PLATFORMS.find((item) => item.value === platform) ?? PLATFORMS[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-[#191314]/70 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-gold">Social suite</div>
          <p className="mt-0.5 max-w-[62ch] truncate text-[11px] text-[#A2937D]" title={active.hint}>
            {active.hint}
          </p>
        </div>
        <Segmented<SocialPlatform>
          label="Social suite platform"
          options={[
            {
              value: "facebook",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Facebook className="h-3.5 w-3.5 text-[#9DB3D4]" aria-hidden="true" /> Facebook
                </span>
              ),
            },
            {
              value: "instagram",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-[#D0A8B8]" aria-hidden="true" /> Instagram
                </span>
              ),
            },
          ]}
          value={platform}
          onChange={setPlatform}
        />
      </div>

      {platform === "facebook" ? <FacebookSuite /> : <InstagramSuite />}
    </div>
  );
};
