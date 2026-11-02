import React, { useState } from "react";
import { Download, Info, Languages, Megaphone, ScrollText } from "lucide-react";
import type { Service } from "../types";
import { getDeity } from "../data/deities";
import { AD_RULES, adsFor, referencePlates, SERVICE_LOCALES } from "../data/serviceAds";
import { AD_LAYOUT_MAP, AD_LAYOUTS, renderServiceAd } from "../lib/serviceAds";
import { brandPostCaptions, servicePublishCaptions } from "../lib/publishCaptions";
import type { Platform } from "../lib/imageValidate";
import { AdCanvas, exportAd, type AdScene } from "./AdCanvas";
import { Button, Callout, CopyButton, Panel, SectionLabel, Segmented, useToast } from "./ui";
import { PublishCanvasButton } from "./PublishCanvasButton";

type Role = "ad" | "edu";
type Lang = "en" | "ta" | "hi";

const LANGUAGES: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "ta", label: "தமிழ்" },
  { value: "hi", label: "हिन्दी" },
];

/** The painters take a style register; the reference plates are always quiet. */
const styleFor = (layout: string) => (layout.startsWith("edu") ? "mono" : layout === "ad-statement" ? "mono" : "gopuram");

export const ServiceAds: React.FC<{ service: Service }> = ({ service }) => {
  const [role, setRole] = useState<Role>("ad");
  const lang: Lang = "en";
  const toast = useToast();

  const ads = adsFor(service.id);
  const references = referencePlates(service.id);
  const locale = SERVICE_LOCALES[service.id];

  const art = (id?: string) => (id ? getDeity(id as Parameters<typeof getDeity>[0])?.file ?? null : null);

  const adsScenes: Array<{ id: string; name: string; purpose: string; use: string; scene: AdScene }> = ads.map((ad) => ({
    id: ad.id,
    name: AD_LAYOUT_MAP[ad.layout].name,
    purpose: AD_LAYOUT_MAP[ad.layout].purpose,
    use: ad.use,
    scene: {
      layout: ad.layout,
      theme: ad.theme,
      style: styleFor(ad.layout),
      copy: ad.copy,
      lang,
      price: service.price,
      url: service.url.replace(/^https?:\/\//, ""),
      motif: service.motif,
      art: art(ad.art),
    },
  }));

  const referenceScenes: Array<{ id: string; name: string; purpose: string; use: string; scene: AdScene }> = references.map((plate) => ({
    id: plate.id,
    name: AD_LAYOUT_MAP[plate.layout].name,
    purpose: AD_LAYOUT_MAP[plate.layout].purpose,
    use: plate.source,
    scene: {
      layout: plate.layout,
      theme: plate.theme,
      style: "mono",
      copy: {
        kicker: plate.kicker,
        headline: plate.headline,
        subline: "",
        cta: "",
        facts: plate.facts,
        step: plate.step,
        body: plate.body,
        source: plate.source,
      },
      lang: "en",
      price: "",
      url: "",
      motif: service.motif,
      art: null,
    },
  }));

  const cards = role === "ad" ? adsScenes : referenceScenes;

  const download = async (card: (typeof cards)[number]) => {
    const ok = await exportAd(card.scene, `astrosivam_ad_${card.id}.png`);
    toast(ok ? `${card.id} exported — 1080 px PNG` : "The browser could not render the plate", ok ? "success" : "error");
  };

  const captionsFor = (card: (typeof cards)[number]) =>
    role === "ad"
      ? servicePublishCaptions(service)
      : brandPostCaptions(
          [card.scene.copy.headline, card.scene.copy.subline, card.scene.copy.body, card.scene.copy.source]
            .filter(Boolean)
            .join("\n\n"),
        );

  const targetsFor = (card: (typeof cards)[number]): Platform[] | undefined => {
    const meta = AD_LAYOUT_MAP[card.scene.layout];
    const ratio = meta.width / meta.height;
    return ratio >= 0.8 && ratio <= 1.91 ? undefined : ["facebook"];
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              label="Content type"
              value={role}
              onChange={setRole}
              options={[
                { value: "ad", label: "Advertising", count: adsScenes.length },
                { value: "edu", label: "Reference plates", count: referenceScenes.length },
              ]}
            />
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-[#A2937D]">
            {role === "ad"
              ? "One report, one action, one price read from the service record. All poster text is English only."
              : "Reference plates teach one idea and sell nothing. The copy is quoted from this service's own explainer, the source is printed on the plate, and no price or action ever appears."}
          </p>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Panel key={card.id} padded={false} className="overflow-hidden">
              <AdCanvas input={card.scene} previewWidth={360} />
              <div className="border-t border-line p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-cream">{card.name}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                      {role === "ad" ? `${AD_LAYOUT_MAP[card.scene.layout].width} × ${AD_LAYOUT_MAP[card.scene.layout].height}` : "1080 × 1080"}
                    </div>
                  </div>
                  <PublishCanvasButton
                    render={async () => (await renderServiceAd({ ...card.scene, scale: 1 })).canvas}
                    filename={`astrosivam_ad_${card.id}_${AD_LAYOUT_MAP[card.scene.layout].width}x${AD_LAYOUT_MAP[card.scene.layout].height}.png`}
                    captions={captionsFor(card)}
                    sourceLabel={`${service.shortName} · ${card.name}`}
                    platforms={targetsFor(card)}
                    label="Publish now"
                  />
                  <Button
                    variant="ghost"
                    icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => void download(card)}
                  >
                    PNG
                  </Button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#B4A58F]">{card.purpose}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#A2937D]">{card.use}</p>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Panel>
          <SectionLabel right={<span className="text-[10px] text-[#A2937D]">{AD_LAYOUTS.length} compositions</span>}>
            The system
          </SectionLabel>
          <div className="space-y-2">
            {AD_LAYOUTS.map((layout) => (
              <div key={layout.key} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold ${
                    layout.role === "ad" ? "bg-gold/20 text-gold-soft" : "bg-[rgba(143,191,165,0.16)] text-[#C7E5D5]"
                  }`}
                >
                  {layout.role === "ad" ? <Megaphone className="h-2.5 w-2.5" aria-hidden="true" /> : <ScrollText className="h-2.5 w-2.5" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-medium text-cream">{layout.name}</div>
                  <div className="text-[10.5px] leading-snug text-[#A2937D]">{layout.bestFor}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Copy rules</SectionLabel>
          <ul className="space-y-1.5">
            {AD_RULES.map((rule) => (
              <li key={rule} className="flex gap-2 text-[11px] leading-relaxed text-[#B4A58F]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                {rule}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionLabel>English-only posters</SectionLabel>
          <p className="text-[11px] leading-relaxed text-[#B4A58F]">Poster text is English only. Prepared Tamil and Hindi lines remain in the service record for captions and reports, but are not drawn on these creatives.</p>
        </Panel>

        <Callout tone="quiet" icon={<Info className="h-3.5 w-3.5" aria-hidden="true" />} title="Price and action are never typed">
          Both come from the service record, so a price change in the data moves every plate at once. The action button always points at{" "}
          {service.url.replace(/^https?:\/\//, "")}.
        </Callout>

        <Panel>
          <SectionLabel>Copy the plate text</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={ads[0]?.copy.headline ?? ""} label="Headline" compact />
            <CopyButton text={service.url} label="URL" compact />
            <CopyButton text={locale ? `${locale.tamil}\n${locale.hindi}` : ""} label="Tamil + Hindi" compact />
          </div>
        </Panel>
      </div>
    </div>
  );
};
