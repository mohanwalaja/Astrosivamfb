import React, { useMemo, useState } from "react";
import { Download, Hash, Search, ShieldAlert, Sparkles } from "lucide-react";
import {
  HASHTAG_BANK,
  HASHTAG_CATEGORIES,
  HASHTAG_MISTAKES,
  HASHTAG_RULES,
  MIX_PRESETS,
  buildMix,
  type HashtagCategory,
  type MixKind,
} from "../data/hashtags";
import { STYLE_TAG_SETS, STYLES } from "../data/brand";
import { SERVICES, getService } from "../data/services";
import { hashtagMarkdown } from "../lib/pack";
import { copyText, downloadText } from "../lib/export";
import { Button, Callout, CopyButton, EmptyState, PageHeader, Panel, SectionLabel, Segmented, useToast } from "./ui";

const categoryTone: Record<HashtagCategory, string> = {
  Branded: "chip chip-gold",
  Service: "chip",
  Broad: "chip chip-jade",
  Regional: "chip chip-saffron",
  Festival: "chip chip-saffron",
  Community: "chip",
};

export const HashtagLab: React.FC = () => {
  const toast = useToast();
  const [serviceId, setServiceId] = useState("jathagam");
  const [kind, setKind] = useState<MixKind>("instagram");
  const [variant, setVariant] = useState<0 | 1>(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<HashtagCategory | "All">("All");

  const service = getService(serviceId);
  const mix = buildMix(service, kind, variant);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return HASHTAG_BANK.filter((tag) => {
      const matchesQuery = !query || tag.tag.toLowerCase().includes(query);
      const matchesCategory = category === "All" || tag.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [search, category]);

  const copyTag = async (tag: string) => {
    const ok = await copyText(tag);
    toast(ok ? `${tag} copied` : "Copy failed", ok ? "success" : "error");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Hashtag lab"
        title="Tags with a job, not a wall of noise."
        description="Every tag is classified by purpose: branded, service, broad reach, regional, festival or community. Build a mix per platform, rotate two sets per service, and stop treating thirty tags as a strategy."
        actions={
          <>
            <CopyButton text={mix.join(" ")} label={`Copy ${kind} mix`} />
            <Button
              variant="ghost"
              icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                downloadText(hashtagMarkdown(), "astrosivam-hashtags.md", "text/markdown;charset=utf-8");
                toast("Hashtag pack downloaded.");
              }}
            >
              Hashtag pack .md
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {HASHTAG_RULES.map((rule) => (
          <Panel key={rule.platform} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">{rule.platform}</span>
              <span className="font-display text-[13px] text-cream">{rule.count}</span>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-[#B4A58F]">{rule.detail}</p>
          </Panel>
        ))}
      </div>

      {/* style tag bank */}
      <div className="mt-8">
        <SectionLabel
          right={<span className="text-[10.5px] uppercase tracking-[0.14em] text-[#A2937D]">Add 2 per post</span>}
        >
          <span className="inline-flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-gold" /> Style tag bank
          </span>
        </SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {STYLES.map((style) => {
            const tags = STYLE_TAG_SETS[style.key];
            return (
              <Panel key={style.key} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{style.family}</div>
                    <div className="mt-1 font-display text-[14px] text-cream">{style.name}</div>
                  </div>
                  <CopyButton text={tags.join(" ")} label="Copy" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => copyTag(tag)}
                      className="rounded border border-line px-2 py-1 text-[10.5px] text-[#C7B9A3] transition-colors hover:border-[rgba(199,154,62,0.4)] hover:text-gold-soft"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="mt-3 border-t border-line pt-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
                  Pair with the {service.shortName} service set, then drop the two weakest service tags so the post stays
                  under twelve.
                </p>
              </Panel>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <Panel>
          <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{mix.length} tags</span>}>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Mix builder
            </span>
          </SectionLabel>

          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setServiceId(item.id)}
                aria-pressed={serviceId === item.id}
                className={`choice px-2.5 py-1.5 text-[10.5px] font-medium ${
                  serviceId === item.id ? "choice-active" : ""
                }`}
              >
                {item.shortName}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <Segmented
              label="Mix preset"
              options={MIX_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
              value={kind}
              onChange={(value) => setKind(value as MixKind)}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10.5px] text-[#A2937D]">
              {MIX_PRESETS.find((preset) => preset.id === kind)?.note} · rotate sets so the account does not look
              automated.
            </span>
            <Segmented
              label="Tag set"
              options={[
                { value: "0", label: "Set A" },
                { value: "1", label: "Set B" },
              ]}
              value={String(variant)}
              onChange={(value) => setVariant(Number(value) as 0 | 1)}
            />
          </div>

          <div className="mt-3 rounded-xl border border-[rgba(199,154,62,0.22)] bg-[rgba(199,154,62,0.05)] p-3.5">
            <p className="break-words text-[11.5px] leading-[1.8] text-[#DCCFBA]">{mix.join(" ")}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={mix.join(" ")} label="Copy mix" />
            <CopyButton text={mix.join("\n")} label="Copy as list" compact />
            <span className="ml-auto text-[10.5px] text-[#A2937D]">
              {service.name} · {kind === "facebook" ? "3–5 recommended" : kind === "full" ? "30 maximum" : "quality over volume"}
            </span>
          </div>

          <div className="mt-4 space-y-2 border-t border-line pt-3">
            {(["instagram", "niche", "reel", "facebook"] as MixKind[]).map((preset) => (
              <div key={preset} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#A2937D]">{preset}</div>
                  <p className="truncate text-[10.5px] text-[#B4A58F]">{buildMix(service, preset, variant).join(" ")}</p>
                </div>
                <CopyButton text={buildMix(service, preset, variant).join(" ")} label="Copy" compact />
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionLabel right={<span className="text-[10.5px] text-[#A2937D]">{filtered.length} tags</span>}>
              <span className="inline-flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-gold" /> Tag bank
              </span>
            </SectionLabel>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A2937D]"
                aria-hidden="true"
              />
              <input
                type="search"
                className="field pl-9"
                aria-label="Search hashtags"
                placeholder="Search tags — wedding, baby, panchangam…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategory("All")}
                aria-pressed={category === "All"}
                className={`choice px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  category === "All" ? "choice-active" : ""
                }`}
              >
                All
              </button>
              {HASHTAG_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={`choice px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    category === item ? "choice-active" : ""
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-3 flex max-h-[360px] flex-wrap gap-1.5 overflow-y-auto pr-1 scroll-thin">
              {filtered.map((tag) => (
                <button
                  key={tag.tag}
                  type="button"
                  onClick={() => copyTag(tag.tag)}
                  className="group rounded-md border border-line bg-wash px-2 py-1 text-[10.5px] text-[#C7B9A3] transition-colors hover:border-[rgba(199,154,62,0.45)] hover:text-gold-soft"
                  title={`${tag.category} · ${tag.tier}`}
                >
                  {tag.tag}
                  <span className="ml-1 text-[8.5px] uppercase tracking-[0.06em] text-[#A2937D] group-hover:text-gold/60">
                    {tag.category.slice(0, 3)}
                  </span>
                </button>
              ))}
              {!filtered.length ? (
                <div className="w-full">
                  <EmptyState
                    icon={<Search className="h-4 w-4" aria-hidden="true" />}
                    title="No tags match that search"
                    description="Try a shorter word, or clear the category filter. Every tag in the bank is mapped to one of six purposes."
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setCategory("All");
                        }}
                      >
                        Reset filters
                      </Button>
                    }
                  />
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <SectionLabel right={<span className="chip chip-saffron">{HASHTAG_MISTAKES.length} rules</span>}>
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-[#E0B48C]" /> Avoid
              </span>
            </SectionLabel>
            <ul className="space-y-1.5">
              {HASHTAG_MISTAKES.map((mistake) => (
                <li key={mistake} className="flex gap-2 text-[11px] leading-relaxed text-[#C7B9A3]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#D8826F]" />
                  {mistake}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionLabel>Category legend</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {HASHTAG_CATEGORIES.map((item) => {
              const count = HASHTAG_BANK.filter((tag) => tag.category === item).length;
              return (
                <div key={item} className="flex items-center justify-between rounded-lg border border-line-soft px-3 py-2">
                  <span className={categoryTone[item]}>{item}</span>
                  <span className="text-[10.5px] text-[#A2937D]">{count} tags</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <div>
          <Callout title="How to measure">
            Meta does not report hashtag reach. Judge a set by saves, follows and DM keyword volume over two weeks. If a
            set adds nothing twice in a row, retire it — relevance decays faster than the tags do.
          </Callout>
        </div>
      </div>
    </div>
  );
};
