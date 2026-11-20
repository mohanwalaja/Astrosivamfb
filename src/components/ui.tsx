import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { copyText } from "../lib/export";

/* ==========================================================================
   Shared interface primitives.
   Every screen composes these instead of re-inventing buttons, cards, fields,
   modals or preview frames. Styling lives in the token layer (index.css).
   ========================================================================== */

/* ---------------------------------- toast --------------------------------- */

type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

export const useToast = () => useContext(ToastContext);

const toastIcon: Record<Tone, React.ReactNode> = {
  success: <Check className="h-3.5 w-3.5" />,
  error: <CircleAlert className="h-3.5 w-3.5" />,
  info: <Info className="h-3.5 w-3.5" />,
};

const toastTone: Record<Tone, string> = {
  success: "text-jade border-[rgba(143,191,165,0.34)]",
  error: "text-danger border-[rgba(216,130,111,0.4)]",
  info: "text-info border-[rgba(157,179,212,0.34)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: Tone = "success") => {
    counter.current += 1;
    const id = counter.current;
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="toast-stack pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[min(92vw,380px)] flex-col gap-2 no-print"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`fade-rise pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#231B1D]/97 px-4 py-3 text-[12.5px] text-cream shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur ${toastTone[item.tone]}`}
          >
            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/30 bg-current/10">
              {toastIcon[item.tone]}
            </span>
            <span className="leading-relaxed text-cream">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* --------------------------------- buttons -------------------------------- */

export type ButtonVariant = "gold" | "ghost" | "maroon" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const buttonVariant: Record<ButtonVariant, string> = {
  gold: "btn-gold",
  ghost: "btn-ghost",
  maroon: "btn-maroon",
  quiet: "btn-quiet",
  danger: "btn-danger",
};

const buttonSize: Record<ButtonSize, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  full?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", size = "md", icon, iconRight, loading = false, full = false, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`btn ${buttonVariant[variant]} ${buttonSize[size]} ${full ? "btn-block" : ""} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  className = "",
  ...rest
}: {
  label: string;
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`btn ${buttonVariant[variant]} ${buttonSize[size]} btn-icon ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}

/* ---------------------------------- chips --------------------------------- */

export type ChipTone = "default" | "gold" | "maroon" | "jade" | "saffron" | "danger";

const chipTone: Record<ChipTone, string> = {
  default: "chip",
  gold: "chip chip-gold",
  maroon: "chip chip-maroon",
  jade: "chip chip-jade",
  saffron: "chip chip-saffron",
  danger: "chip chip-danger",
};

export function Chip({
  children,
  tone = "default",
  icon,
  className = "",
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`${chipTone[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/** Status pill with a leading dot — a calmer alternative to a solid chip. */
export function Badge({
  children,
  tone = "default",
  dot = false,
  className = "",
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`${chipTone[tone]} ${className}`}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/* -------------------------------- clipboard ------------------------------- */

export function CopyButton({
  text,
  label = "Copy",
  className = "",
  compact = false,
}: {
  text: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const onCopy = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      toast("Copy failed — select the text and copy manually.", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={compact ? `copy-inline ${className}` : `btn btn-ghost ${className}`}
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-jade" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

/* --------------------------------- layout --------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <header className="fade-rise mb-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="eyebrow mb-3">{eyebrow}</div>
          <h1 className="type-title">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-[68ch] text-[13.5px] leading-[1.75] text-[#DCCFBA]">{description}</p>
          ) : null}
          {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="rule-ornament mt-7" aria-hidden="true" />
    </header>
  );
}

export type PanelVariant = "default" | "featured" | "maroon" | "inset" | "plain";

const panelVariant: Record<PanelVariant, string> = {
  default: "card",
  featured: "card card-featured",
  maroon: "card-maroon",
  inset: "card-inset",
  plain: "rounded-[18px] border border-line-soft",
};

export function Panel({
  children,
  className = "",
  padded = true,
  variant = "default",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  variant?: PanelVariant;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${panelVariant[variant]} ${padded ? "p-5 sm:p-6" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  right,
  eyebrow,
  description,
  className = "",
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-label mb-4 flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
        <h2 className="type-section flex items-center gap-2.5">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rotate-45 bg-gold/80" aria-hidden="true" />
          <span className="min-w-0">{children}</span>
        </h2>
        {description ? (
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#A2937D]">{description}</p>
        ) : null}
      </div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function Stat({
  value,
  label,
  sub,
  icon,
}: {
  value: string;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card group relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="stat-value gold-text text-[30px] sm:text-[34px]">{value}</div>
        {icon ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong/70 text-gold/90">
            {icon}
          </span>
        ) : (
          <span className="mt-1.5 inline-block h-1.5 w-1.5 rotate-45 bg-gold/45" aria-hidden="true" />
        )}
      </div>
      <div className="mt-2.5 text-[12px] font-semibold text-cream">{label}</div>
      {sub ? <div className="mt-1 text-[10.5px] leading-relaxed text-[#A2937D]">{sub}</div> : null}
    </div>
  );
}

export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 ${className}`} aria-hidden="true">
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/50" />
      <span className="h-1 w-1 rotate-45 bg-gold/70" />
      <span className="h-1.5 w-1.5 rotate-45 border border-gold/70" />
      <span className="h-1 w-1 rotate-45 bg-gold/70" />
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/50" />
    </div>
  );
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="divider my-5" role="separator" />;
  return (
    <div className="my-5 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A2937D]">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function Toolbar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-line bg-[#191314]/70 px-3 py-2.5 ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------- selectable ------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
  label,
}: {
  /** `lang` marks a script-specific label so it keeps its own face and no tracking. */
  options: Array<{ value: T; label: React.ReactNode; count?: number; lang?: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`tab-seg max-w-full overflow-x-auto scroll-thin ${className}`}
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          data-active={value === option.value}
          onClick={() => onChange(option.value)}
          lang={option.lang}
        >
          {option.label}
          {typeof option.count === "number" ? (
            <span className="ml-1.5 text-[10px] opacity-60">{option.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function PillTabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: React.ReactNode; hint?: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={value === item.id}
          className={`choice px-3 py-1.5 text-[11.5px] font-semibold ${value === item.id ? "choice-active" : ""}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Accordion({
  question,
  children,
  defaultOpen = false,
}: {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="card-inset overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-wash"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
      >
        <span className="text-[13px] font-semibold text-cream">{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gold transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id={`${id}-panel`}
          role="region"
          className="border-t border-line px-4 py-3.5 text-[12.5px] leading-relaxed text-[#DCCFBA]"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[12px] text-[#E3CA99] transition-colors hover:text-champagne ${className}`}
    >
      {children}
      <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden="true" />
    </a>
  );
}

/* ---------------------------------- forms --------------------------------- */

export function Field({
  label,
  children,
  hint,
  error,
  htmlFor,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <span className="label">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </>
  );
  if (htmlFor) {
    return (
      <div className={`block ${className}`}>
        <label className="block" htmlFor={htmlFor}>
          {content}
        </label>
      </div>
    );
  }
  return <label className={`block ${className}`}>{content}</label>;
}

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
};

export function Input({ label, hint, error, fieldClassName = "", id, className = "", ...rest }: TextInputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const control = (
    <input
      id={inputId}
      className={`field ${className}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error || hint ? `${inputId}-desc` : undefined}
      {...rest}
    />
  );
  if (!label && !hint && !error) return control;
  return (
    <div className={fieldClassName}>
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      ) : null}
      {control}
      {error || hint ? (
        <span id={`${inputId}-desc`} className={error ? "error-text" : "hint"}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  error,
  fieldClassName = "",
  id,
  className = "",
  rows = 4,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={fieldClassName}>
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        rows={rows}
        className={`field ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-desc` : undefined}
        {...rest}
      />
      {error || hint ? (
        <span id={`${inputId}-desc`} className={error ? "error-text" : "hint"}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  hint,
  error,
  children,
  fieldClassName = "",
  id,
  className = "",
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={fieldClassName}>
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      ) : null}
      <select
        id={inputId}
        className={`field ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-desc` : undefined}
        {...rest}
      >
        {children}
      </select>
      {error || hint ? (
        <span id={`${inputId}-desc`} className={error ? "error-text" : "hint"}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#F0DCB2] ${
          checked ? "border-gold/70 bg-gold/80" : "border-line-strong bg-[#140f10]"
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full transition-all ${
            checked ? "left-[17px] bg-[#241706]" : "left-[3px] bg-[#B4A58F]"
          }`}
        />
      </span>
      <span>
        <span className="block text-[12px] font-semibold text-cream">{label}</span>
        {hint ? <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[#A2937D]">{hint}</span> : null}
      </span>
    </label>
  );
}

/* --------------------------------- feedback -------------------------------- */

export function Callout({
  title,
  children,
  tone = "gold",
  icon,
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "gold" | "warn" | "quiet" | "danger";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "warn" ? "callout-warn" : tone === "danger" ? "callout-danger" : tone === "quiet" ? "" : "callout-gold";
  const titleColor =
    tone === "warn" ? "text-[#F0C3A2]" : tone === "danger" ? "text-[#F2B7A9]" : "text-[#E9D5A8]";
  return (
    <div className={`callout ${toneClass}`}>
      {title ? (
        <div className={`mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] ${titleColor}`}>
          {icon ?? <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />}
          {title}
        </div>
      ) : null}
      <div className="text-[12px] leading-relaxed text-[#DCCFBA]">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-[#241C1E] text-gold">
          {icon}
        </span>
      ) : null}
      <div className="type-card-title">{title}</div>
      {description ? <p className="max-w-md text-[12px] leading-relaxed text-[#A2937D]">{description}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/**
 * Fixed progress toast used by the Creative Studio and the Export library while a
 * ZIP is being rendered. It stays out of the tab order and announces politely.
 */
export function ExportProgress({
  label,
  done,
  total,
  noun = "files",
  note,
}: {
  label: string;
  done: number;
  total: number;
  noun?: string;
  /** One line under the bar — used for anything the export needs from the user. */
  note?: string;
}) {
  // Clamped: a caller that reports a late or duplicate count must not paint 130%.
  const safeDone = Math.min(Math.max(0, Math.round(done)), Math.max(1, Math.round(total)));
  const safeTotal = Math.max(1, Math.round(total));
  const percent = Math.round((safeDone / safeTotal) * 100);
  return (
    <div
      className="fixed bottom-5 left-5 z-[75] w-[min(92vw,320px)] rounded-xl border border-line-strong bg-[#241C1E]/97 p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold text-cream">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
        <span className="ml-auto font-mono text-[10px] text-[#A2937D]">{percent}%</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percent}% — ${safeDone} of ${safeTotal} ${noun}`}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#E3CA99,#C79A3C)] transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 text-[10.5px] text-[#B4A58F]">
        {safeDone} / {safeTotal} {noun}
      </div>
      {note ? <div className="mt-1 text-[10px] leading-relaxed text-[#A2937D]">{note}</div> : null}
    </div>
  );
}

/* ---------------------------------- modal --------------------------------- */

const MODAL_WIDTH = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" } as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  icon,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof MODAL_WIDTH;
  dismissible?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dismissRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissRef.current = dismissible;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root?.setAttribute("aria-hidden", "true");

    const focusables = () => {
      const selector =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(panelRef.current?.querySelectorAll<HTMLElement>(selector) ?? []).filter(
        (element) => element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0,
      );
    };

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred = panel.querySelector<HTMLElement>("[data-autofocus]");
      (preferred ?? focusables()[0] ?? panel).focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const panel = panelRef.current;
      if (!items.length) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      root?.removeAttribute("aria-hidden");
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissRef.current) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`modal-panel ${MODAL_WIDTH[size]} my-auto`}
      >
        <div className="modal-header">
          <div className="flex min-w-0 items-start gap-3.5">
            {icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-[#2B2224] text-gold">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
              <h2 id={titleId} className="type-section">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-[11.5px] leading-relaxed text-[#A2937D]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {dismissible ? (
            <button type="button" className="modal-close" onClick={() => onCloseRef.current()} aria-label="Close dialog">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------- previews -------------------------------- */

export function PreviewFrame({
  children,
  label,
  meta,
  className = "",
  innerClassName = "",
  caption,
}: {
  children: React.ReactNode;
  label?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  caption?: React.ReactNode;
}) {
  return (
    <figure className={`preview-frame ${className}`}>
      <div className={`preview-frame-inner ${innerClassName}`}>{children}</div>
      {label || meta || caption ? (
        <figcaption className="preview-caption">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#C7B9A3]">{label}</span>
          {meta ? <span className="font-mono tracking-[0.08em]">{meta}</span> : null}
          {caption ? <span className="w-full normal-case tracking-normal text-[#A2937D]">{caption}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ------------------------------- hash routing ----------------------------- */

export function useHashSection(defaultSection: string, sections: string[]) {
  const read = () => {
    const hash = window.location.hash.replace("#", "");
    return sections.includes(hash) ? hash : defaultSection;
  };
  const [section, setSection] = useState(read);

  useEffect(() => {
    const onHash = () => setSection(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (next: string) => {
    setSection(next);
    if (window.location.hash !== `#${next}`) {
      window.history.replaceState(null, "", `#${next}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return [section, go] as const;
}
