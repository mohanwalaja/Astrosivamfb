import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Layers, PenLine, Search, Smartphone } from "lucide-react";
import {
  CATEGORY_META,
  DESIGN_LIBRARY,
  LAYOUT_LABEL,
  LIBRARY_COUNTS,
  TYPE_LABEL,
  type Design,
  type DesignCategory,
  type Register,
} from "../data/library";
import { THEMES } from "../data/brand";
import { getLibraryAudit, renderLibraryDesign } from "../lib/libraryRender";
import { downloadCanvas } from "../lib/export";
import { requestStudio, type PosterState } from "../lib/studioState";
import { Button, Input, PageHeader, Panel, PreviewFrame, SectionLabel, Segmented, Select, useToast } from "./ui";
import { PublishCanvasButton } from "./PublishCanvasButton";
import { brandPostCaptions } from "../lib/publishCaptions";

/* ==========================================================================
   The design library.
   ==========================================================================
   One hundred and fifty art directions: seventy-five traditional, seventy-five
   modern, grouped by the service each one was drawn for. Every tile is painted
   by the same renderer the studio exports with, so the preview is the file.

   Tiles render when they scroll into view — 150 canvases at once would stall a
   phone for seconds, and a filter change should feel instant.
   ========================================================================== */

const PREVIEW_WIDTH = 320;

const displayFor = (design: Design): PosterState["display"] =>
  design.type === "swiss" || design.type === "technical"
    ? "inter"
    : design.type === "playfair" || design.type === "editorialPair"
      ? "playfair"
      : design.type === "cormorant"
        ? "cormorant"
        : "cinzel";

const toState = (design: Design): PosterState => ({
  width: 1080,
  height: 1350,
  themeKey: design.theme,
  style: "signature",
  layout: "split",
  template: "editorial",
  designId: design.id,
  display: displayFor(design),
  script: "serif",
  image: design.image,
  imageIsLibrary: true,
  imageFit: "full",
  category: design.category,
  serviceTitle: design.copy.serviceTitle,
  kicker: design.copy.kicker,
  headline: design.copy.headline,
  tamil: "",
  hindi: "",
  subline: design.copy.subline,
  facts: design.copy.facts,
  cta: design.copy.cta,
  footer: "astrosivam.com",
  showLogo: true,
  seed: design.number,
  useGlobalBrandPlacement: false,
});

const Tile: React.FC<{ design: Design; onOpen: () => void }> = ({ design, onOpen }) => {
  const toast = useToast();
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [busy, setBusy] = useState<"feed" | "story" | null>(null);

  useEffect(() => {
    const node = holder.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setState("loading");
    renderLibraryDesign({ design, width: 1080, height: 1350, scale: Math.min(1, PREVIEW_WIDTH / 1080) })
      .then((canvas) => {
        if (cancelled || !holder.current) return;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        holder.current.replaceChildren(canvas);
        setState("ready");
      })
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
    };
  }, [design, visible]);

  const download = async (format: "feed" | "story") => {
    setBusy(format);
    try {
      const size = format === "feed" ? { width: 1080, height: 1350 } : { width: 1080, height: 1920 };
      const canvas = await renderLibraryDesign({ design, ...size, scale: 1 });
      const audit = getLibraryAudit(canvas);
      if (audit && !audit.passes) toast("This design needs a shorter line at that size — edit it in the studio.", "error");
      await downloadCanvas(canvas, `astrosivam_${String(design.number).padStart(3, "0")}_${design.id}_${size.width}x${size.height}.png`);
      toast(`Downloaded ${design.name} · ${size.width} × ${size.height}`);
    } catch {
      toast("That design could not be rendered.", "error");
    } finally {
      setBusy(null);
    }
  };

  const recipe = `${LAYOUT_LABEL[design.layout]} · ${THEMES[design.theme].name} · ${TYPE_LABEL[design.type].split(" · ")[0]}`;

  return (
    <Panel className="flex flex-col gap-3">
      <PreviewFrame
        label={`${design.number} · ${design.name}`}
        meta={design.register === "traditional" ? "Traditional" : "Modern"}
        caption={recipe}
        innerClassName="bg-[#0B0708]"
      >
        <div ref={holder} data-state={state} role="img" aria-label={`${design.name}, ${recipe}`} className="min-h-[120px]">
          {state === "failed" ? <span className="p-4 text-[11px] text-[#F0C3A2]">Preview failed</span> : null}
        </div>
      </PreviewFrame>
      <div>
        <p className="text-[12.5px] font-semibold leading-snug text-[#F1E4CE]">{design.copy.headline}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#A2937D]">{design.copy.subline}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="gold" size="sm" loading={busy === "feed"} icon={<Download className="h-3.5 w-3.5" />} onClick={() => download("feed")}>
          PNG
        </Button>
        <Button variant="ghost" size="sm" loading={busy === "story"} icon={<Smartphone className="h-3.5 w-3.5" />} onClick={() => download("story")}>
          Story
        </Button>
        <Button variant="quiet" size="sm" icon={<PenLine className="h-3.5 w-3.5" />} onClick={onOpen}>
          Edit
        </Button>
        <PublishCanvasButton
          size="sm"
          variant="ghost"
          render={() => renderLibraryDesign({ design, width: 1080, height: 1350, scale: 1 })}
          filename={`astrosivam_${String(design.number).padStart(3, "0")}_${design.id}.png`}
          captions={brandPostCaptions([design.copy.headline, design.copy.subline, design.copy.cta].join("\n\n"))}
          sourceLabel={`Library design ${design.number} · ${design.name}`}
          label="Publish"
        />
      </div>
    </Panel>
  );
};

const REGISTERS: Array<{ value: Register | "all"; label: string }> = [
  { value: "all", label: `All · ${LIBRARY_COUNTS.total}` },
  { value: "traditional", label: `Traditional · ${LIBRARY_COUNTS.traditional}` },
  { value: "modern", label: `Modern · ${LIBRARY_COUNTS.modern}` },
];

export const DesignLibrary: React.FC<{ onNavigate?: (id: string) => void }> = ({ onNavigate }) => {
  const [category, setCategory] = useState<DesignCategory | "all">("all");
  const [register, setRegister] = useState<Register | "all">("all");
  const [layout, setLayout] = useState<string>("all");
  const [query, setQuery] = useState("");

  const layouts = useMemo(() => Array.from(new Set(DESIGN_LIBRARY.map((item) => item.layout))), []);

  const shown = useMemo(
    () =>
      DESIGN_LIBRARY.filter((design) => {
        if (category !== "all" && design.category !== category) return false;
        if (register !== "all" && design.register !== register) return false;
        if (layout !== "all" && design.layout !== layout) return false;
        if (query.trim()) {
          const haystack = `${design.name} ${design.copy.headline} ${design.copy.kicker} ${design.layout} ${design.theme}`.toLowerCase();
          if (!haystack.includes(query.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [category, register, layout, query],
  );

  const open = (design: Design) => {
    requestStudio({
      state: toState(design),
      formatId: "ig-post",
      deityKey: null,
      note: `${design.name} loaded — edit the words, then export.`,
    });
    onNavigate?.("poster");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Design library · 150 art directions"
        title={
          <>
            Seventy-five traditional. Seventy-five modern.{" "}
            <span className="gold-text">Every one made for a service.</span>
          </>
        }
        description="A catalogue of 150 designs, each a curated recipe of layout, palette, typography, background, frame, ornament and art treatment — grouped by the service it was drawn for. Every plate is rendered by the production engine, audited for legibility, overflow and text contrast before it ships, and exports at feed or story size."
        meta={
          <>
            <span className="chip chip-gold">{LIBRARY_COUNTS.total} designs</span>
            <span className="chip">{LIBRARY_COUNTS.traditional} traditional</span>
            <span className="chip">{LIBRARY_COUNTS.modern} modern</span>
            <span className="chip">10 layouts</span>
            <span className="chip">Audited</span>
          </>
        }
        actions={
          <Button variant="quiet" icon={<Layers className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("plain-words")}>
            Plain-words posters
          </Button>
        }
      />

      <Panel className="mb-5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Service category">
          <button type="button" onClick={() => setCategory("all")} aria-pressed={category === "all"} className={`chip ${category === "all" ? "chip-gold" : ""}`}>
            All services · {DESIGN_LIBRARY.length}
          </button>
          {(Object.keys(CATEGORY_META) as DesignCategory[]).map((key) => (
            <button key={key} type="button" onClick={() => setCategory(key)} aria-pressed={category === key} className={`chip ${category === key ? "chip-gold" : ""}`}>
              {CATEGORY_META[key].short} · {LIBRARY_COUNTS.byCategory[key]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Segmented label="Register" value={register} onChange={setRegister} options={REGISTERS} />
          <div className="min-w-[180px] flex-1">
            <Select label="Layout" value={layout} onChange={(event) => setLayout(event.target.value)}>
              <option value="all">All layouts</option>
              {layouts.map((key) => (
                <option key={key} value={key}>
                  {LAYOUT_LABEL[key as Design["layout"]]}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[200px] flex-1">
            <Input label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ivory, mandala, wedding…" />
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#A2937D]">
          <Search className="h-3.5 w-3.5" aria-hidden="true" /> Showing {shown.length} of {DESIGN_LIBRARY.length} designs.
        </p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {shown.map((design) => (
          <Tile key={design.id} design={design} onOpen={() => open(design)} />
        ))}
      </div>

      {!shown.length ? <Panel className="mt-4 text-[12px] text-[#A2937D]">No design matches those filters.</Panel> : null}

      <Panel className="mt-6">
        <SectionLabel right={<span className="text-[10px] uppercase tracking-[0.14em] text-[#8F8272]">posters/design-library/</span>}>
          How the library is built
        </SectionLabel>
        <div className="grid gap-4 text-[11.5px] leading-relaxed text-[#A2937D] sm:grid-cols-2">
          <p>
            A design is one of ten structural layouts — sanctum arch, carved pillars, palm-leaf scroll, medallion,
            full-bleed horizon, art band, editorial ledger, split field, corner bleed or modular grid — combined with a
            palette, a type stack, a background treatment, a frame, an ornament kit and an art treatment. Each of the 150
            entries pins its own recipe; nothing is randomised at render time.
          </p>
          <p>
            Every plate is audited before it ships: no line may fall below the mobile legibility floor, no copy may be
            clipped, and every line is checked against the pixels it actually sits on for contrast. The 150 PNGs, the
            per-category contact sheets and the catalogue all live in{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">posters/design-library/</code>. Regenerate with{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">npm run designs</code>.
          </p>
        </div>
      </Panel>
    </div>
  );
};
