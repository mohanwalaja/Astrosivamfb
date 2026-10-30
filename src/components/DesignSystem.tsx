import React, { useState } from "react";
import { Check, Copy, Diamond, Layers, Maximize2, Palette, Type } from "lucide-react";
import {
  PALETTE,
  RADIUS,
  SEMANTIC,
  SHADOW,
  SPACE,
  TEXT_CONTRAST_PAIRS,
  TYPE_SCALE,
  contrastRatio,
} from "../design/tokens";
import {
  Badge,
  Button,
  Callout,
  Chip,
  CopyButton,
  EmptyState,
  Field,
  Input,
  Modal,
  Panel,
  PreviewFrame,
  SectionLabel,
  Select,
  Stat,
  Textarea,
  Toggle,
  useToast,
} from "./ui";

/**
 * A living reference for the studio chrome. The canvas artwork keeps its own
 * palettes; everything documented here governs the interface around it.
 */

const FAMILIES = [
  {
    key: "maroon",
    name: "Deep maroon",
    token: "--sv-maroon-700",
    use: "Sidebar identity, emphasis panels, active navigation.",
    shades: PALETTE.maroon,
  },
  {
    key: "gold",
    name: "Antique gold",
    token: "--sv-gold-500",
    use: "One primary action per view, rules, icons, focus.",
    shades: PALETTE.gold,
  },
  {
    key: "champagne",
    name: "Champagne gold",
    token: "--sv-champagne-300",
    use: "Headlines, quotes and quiet emphasis on charcoal.",
    shades: PALETTE.champagne,
  },
  {
    key: "ivory",
    name: "Warm ivory",
    token: "--sv-ivory-400",
    use: "Text hierarchy — never pure white.",
    shades: PALETTE.ivory,
  },
  {
    key: "charcoal",
    name: "Charcoal",
    token: "--sv-charcoal-800",
    use: "Canvas, cards, raised surfaces, insets.",
    shades: PALETTE.charcoal,
  },
] as const;

export const DesignSystem: React.FC = () => {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [guides, setGuides] = useState(true);
  const [format, setFormat] = useState("ig-post");
  const [name, setName] = useState("Astro Sivam");
  const [note, setNote] = useState("A calm, precise studio voice.");

  const copy = (name: string, hex: string) => {
    void navigator.clipboard?.writeText(hex);
    toast(`${name} · ${hex} copied`);
  };

  return (
    <div>
      <SectionLabel
        eyebrow="Interface design system"
        description="One palette family, one type scale and one component grammar, used across every screen. The five families below are the only interface colours in the product."
        right={<CopyButton text={FAMILIES.map((family) => `${family.name}: ${family.token}`).join("\n")} label="Copy tokens" compact />}
      >
        Tokens, type and components
      </SectionLabel>

      {/* palette */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {FAMILIES.map((family) => {
          const shadeEntries = Object.entries(family.shades);
          const middle = shadeEntries[Math.floor(shadeEntries.length / 2)];
          const onLight = contrastRatio("#241706", middle[1]) >= 4.5;
          return (
            <div key={family.key} className="overflow-hidden rounded-xl border border-line bg-[#1D1618]">
              <div className="flex h-16 items-end justify-between px-3 pb-2" style={{ background: middle[1] }}>
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.08em] ${onLight ? "text-[#241706]" : "text-[#FBF5E9]"}`}
                >
                  {middle[1]}
                </span>
                <button
                  type="button"
                  onClick={() => copy(family.name, middle[1])}
                  className={`rounded-md p-1 transition-colors ${
                    onLight
                      ? "text-[#241706]/70 hover:bg-black/10 hover:text-[#241706]"
                      : "text-[#FBF5E9]/80 hover:bg-[#161011]/35 hover:text-[#FBF5E9]"
                  }`}
                  aria-label={`Copy ${family.name} hex ${middle[1]}`}
                >
                  <Copy className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
              <div className="p-3">
                <div className="text-[11.5px] font-semibold text-cream">{family.name}</div>
                <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[#A2937D]">{family.token}</div>
                <div className="mt-2 flex overflow-hidden rounded-[3px] ring-1 ring-inset ring-black/30" aria-hidden="true">
                  {shadeEntries.map(([shade, hex]) => (
                    <span key={shade} className="h-2.5 flex-1" style={{ background: hex }} title={`${shade} ${hex}`} />
                  ))}
                </div>
                <p className="mt-2 text-[9.5px] leading-snug text-[#B4A58F]">{family.use}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* type */}
        <Panel>
          <SectionLabel eyebrow="Typography" right={<Chip icon={<Type className="h-3 w-3" />}>4 self-hosted faces</Chip>}>
            Cinzel, Marcellus, Jakarta, Tiro
          </SectionLabel>
          <div className="space-y-4">
            <div className="border-b border-line-soft pb-4">
              <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">
                <span>Display · Cinzel</span>
                <span>{TYPE_SCALE.hero.size}</span>
              </div>
              <div className="type-hero">
                A studio for <span className="gold-text">sacred stories</span>.
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">Editorial · Marcellus</div>
                <p className="font-serif text-[19px] leading-snug text-[#E3CA99]">
                  “Say the date, the place and the method. Trust follows.”
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[#B4A58F]">
                  Marcellus is reserved for asides and quotations — never for buttons or labels.
                </p>
              </div>
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">Interface · Plus Jakarta Sans</div>
                <div className="text-[15px] font-semibold text-cream">Section title, 18px</div>
                <p className="mt-1.5 text-[13px] leading-[1.7] text-[#DCCFBA]">
                  Body copy sits at 13.5px with a 1.7 line-height and a maximum measure of 68 characters.
                </p>
                <div className="eyebrow mt-3">Eyebrow · 10.5px</div>
              </div>
            </div>
          </div>
        </Panel>

        {/* space, radius, elevation */}
        <Panel>
          <SectionLabel eyebrow="Rhythm" right={<Chip icon={<Layers className="h-3 w-3" />}>8-point</Chip>}>
            Space, radius and depth
          </SectionLabel>
          <div className="space-y-4">
            <div>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">Spacing scale</div>
              <div className="flex items-end gap-2">
                {Object.entries(SPACE).map(([label, value]) => (
                  <div key={label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="w-full rounded-sm bg-[rgba(199,154,62,0.35)]" style={{ height: value }} />
                    <span className="font-mono text-[8px] text-[#A2937D]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">Radius</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(RADIUS).map(([label, value]) => (
                    <span
                      key={label}
                      className="flex h-7 w-7 items-center justify-center border border-line-strong bg-[#241C1E] font-mono text-[8px] text-[#A2937D]"
                      style={{ borderRadius: value }}
                      title={`${label} · ${value}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">Surfaces</div>
                <div className="flex gap-1.5">
                  {[
                    ["Canvas", SEMANTIC.bg],
                    ["Card", SEMANTIC.surface],
                    ["Raised", SEMANTIC.surfaceRaised],
                    ["Maroon", SEMANTIC.maroon],
                  ].map(([label, color]) => (
                    <span key={label} className="flex-1 text-center">
                      <span
                        className="block h-7 w-full rounded-md border border-line"
                        style={{ background: color, boxShadow: label === "Card" ? SHADOW.card : undefined }}
                      />
                      <span className="mt-1 block text-[8px] text-[#A2937D]">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat value="18" label="Sections" sub="One grammar" />
              <Stat value="9" label="Primitives" sub="Shared" />
              <Stat value="AA" label="Contrast" sub="Audited" />
            </div>
          </div>
        </Panel>
      </div>

      {/* components */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Panel>
          <SectionLabel eyebrow="Components" right={<Badge tone="jade" dot>Live examples</Badge>}>
            Actions, chips and fields
          </SectionLabel>
          <div className="space-y-4">
            <div>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">Buttons</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="gold" icon={<Diamond className="h-3.5 w-3.5" aria-hidden="true" />}>
                  Primary
                </Button>
                <Button variant="ghost">Secondary</Button>
                <Button variant="maroon">Maroon</Button>
                <Button variant="quiet">Quiet</Button>
                <Button variant="ghost" loading>
                  Working
                </Button>
                <Button variant="ghost" disabled>
                  Disabled
                </Button>
              </div>
            </div>
            <div>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#A2937D]">Chips</div>
              <div className="flex flex-wrap gap-1.5">
                <Chip>Default</Chip>
                <Chip tone="gold">Gold</Chip>
                <Chip tone="maroon">Maroon</Chip>
                <Chip tone="jade">Ready</Chip>
                <Chip tone="saffron">Review</Chip>
                <Chip tone="danger">Blocked</Chip>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Service name" hint="Shown on every caption.">
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Format">
                <Select value={format} onChange={(event) => setFormat(event.target.value)}>
                  <option value="ig-post">Instagram post · 1080 × 1350</option>
                  <option value="ig-square">Instagram square · 1080 × 1080</option>
                  <option value="story">Story · 1080 × 1920</option>
                  <option value="fb-post">Facebook post · 1200 × 1500</option>
                </Select>
              </Field>
            </div>
            <Field label="Voice note" hint="Plain language, no promises about outcomes.">
              <Textarea value={note} rows={2} onChange={(event) => setNote(event.target.value)} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-wash px-3.5 py-3">
              <Toggle checked={guides} onChange={setGuides} label="Safe-area guides" hint="Platform crops in previews." />
              <Button variant="ghost" size="sm" onClick={() => setModal(true)} icon={<Maximize2 className="h-3 w-3" aria-hidden="true" />}>
                Open modal
              </Button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionLabel eyebrow="Accessibility">Measured contrast</SectionLabel>
            <ul className="divide-y divide-line-soft">
              {TEXT_CONTRAST_PAIRS.map((pair) => {
                const ratio = contrastRatio(pair.fg, pair.bg);
                return (
                  <li key={pair.name} className="flex items-center justify-between gap-3 py-2 text-[10.5px]">
                    <span className="min-w-0 text-[#B4A58F]">{pair.name}</span>
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-[#C7E5D5]">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      {ratio.toFixed(2)}:1
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[10px] leading-relaxed text-[#A2937D]">
              Every pair is asserted by <code className="font-mono text-[#C7B9A3]">tests/design-system.test.ts</code>. Focus rings are
              2px champagne, never removed.
            </p>
          </Panel>

          <Panel padded={false} className="overflow-hidden">
            <div className="border-b border-line px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-[#A2937D]">
              Preview frame
            </div>
            <div className="p-3.5">
              <PreviewFrame label="Brand seal" meta="1:1" caption="Every canvas sits in one warm mat.">
                <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_50%_42%,#5E162C,#1D1618_72%)]">
                  <span className="brand-seal flex h-[56%] w-[56%] items-center justify-center rounded-[22%]">
                    <img src="/astrosivam_logo.png" alt="Astro Sivam logo" className="w-[74%] object-contain" />
                  </span>
                </div>
              </PreviewFrame>
            </div>
            <div className="border-t border-line p-3.5">
              <EmptyState
                icon={<Palette className="h-4 w-4" aria-hidden="true" />}
                title="Empty states use the same grammar"
                description="A frame, a gold icon and one clear next step — never a bare outline."
              />
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        eyebrow="Shared component"
        title="Dialogs share one grammar"
        description="A champagne eyebrow, a gold hairline and one primary action. Focus is trapped; Escape closes."
        footer={
          <>
            <Button variant="quiet" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={() => {
                setModal(false);
                toast("Sample action confirmed");
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Callout title="Keyboard contract" icon={<Diamond className="h-3.5 w-3.5" aria-hidden="true" />}>
            The backdrop is not a tab stop, focus returns to the trigger, and the page behind the dialog cannot scroll.
          </Callout>
          <Field label="Sample export name" hint="Used in the filename only.">
            <Input defaultValue="astrosivam_jathagam_post" />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default DesignSystem;
