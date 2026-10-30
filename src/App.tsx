import React, { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Download,
  Facebook,
  Gauge,
  Hash,
  ImageIcon,
  Instagram,
  Layers,
  LogOut,
  Menu,
  MonitorSmartphone,
  Palette,
  PartyPopper,
  PenLine,
  ScrollText,
  Send,
  Shapes,
  Sparkles,
  Sunrise,
  X,
} from "lucide-react";
import { BRAND } from "./data/brand";
import { LaunchControl } from "./components/LaunchControl";

// Everything below pulls the canvas engines (templates, poster, style art) — loading
// them lazily keeps the first paint on the landing section small.
const AssetStudio = lazy(() => import("./components/AssetStudio").then((m) => ({ default: m.AssetStudio })));
const BrandSystem = lazy(() => import("./components/BrandSystem").then((m) => ({ default: m.BrandSystem })));
const ContentCalendar = lazy(() =>
  import("./components/ContentCalendar").then((m) => ({ default: m.ContentCalendar })),
);
const ExportCenter = lazy(() => import("./components/ExportCenter").then((m) => ({ default: m.ExportCenter })));
const FacebookSuite = lazy(() =>
  import("./components/FacebookSuite").then((m) => ({ default: m.FacebookSuite })),
);
const HashtagLab = lazy(() => import("./components/HashtagLab").then((m) => ({ default: m.HashtagLab })));
const InstagramSuite = lazy(() =>
  import("./components/InstagramSuite").then((m) => ({ default: m.InstagramSuite })),
);
const Mockups = lazy(() => import("./components/Mockups").then((m) => ({ default: m.Mockups })));
const ProfileCover = lazy(() => import("./components/ProfileCover").then((m) => ({ default: m.ProfileCover })));
const FestivalWishes = lazy(() =>
  import("./components/FestivalWishes").then((m) => ({ default: m.FestivalWishes })),
);
const PosterStudio = lazy(() => import("./components/PosterStudio").then((m) => ({ default: m.PosterStudio })));
const Panchangam = lazy(() => import("./components/Panchangam").then((m) => ({ default: m.Panchangam })));
const ServicePosts = lazy(() => import("./components/ServicePosts").then((m) => ({ default: m.ServicePosts })));
const StyleGallery = lazy(() => import("./components/StyleGallery").then((m) => ({ default: m.StyleGallery })));
const Publisher = lazy(() => import("./components/Publisher").then((m) => ({ default: m.Publisher })));
import { ensureFonts, fontHealth } from "./lib/canvas";
import { getCsrfToken } from "./lib/csrf";
import { ToastProvider, useHashSection } from "./components/ui";

const NAV = [
  {
    group: "Studio",
    items: [
      { id: "launch", label: "Studio home", icon: Gauge },
      { id: "brand", label: "Brand & design", icon: Palette },
      { id: "profile-cover", label: "Identity set", icon: ImageIcon },
    ],
  },
  {
    group: "Create",
    items: [
      { id: "assets", label: "Asset studio", icon: Layers },
      { id: "styles", label: "Style gallery", icon: Shapes },
      { id: "poster", label: "Poster studio", icon: PenLine },
      { id: "panchangam", label: "Panchangam", icon: Sunrise },
      { id: "festivals", label: "Festival wishes", icon: PartyPopper },
      { id: "services", label: "Service posts", icon: ScrollText },
      { id: "instagram", label: "Instagram suite", icon: Instagram },
      { id: "facebook", label: "Facebook suite", icon: Facebook },
    ],
  },
  {
    group: "Grow",
    items: [
      { id: "calendar", label: "Publishing calendar", icon: CalendarDays },
      { id: "hashtags", label: "Hashtag lab", icon: Hash },
    ],
  },
  {
    group: "Deliver",
    items: [
      { id: "mockups", label: "In-context previews", icon: MonitorSmartphone },
      { id: "export", label: "Export library", icon: Download },
    ],
  },
];

const ALL_SECTIONS = NAV.flatMap((group) => group.items.map((item) => item.id));
const LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((group) => group.items.map((item) => [item.id, item.label])),
);
const GROUP_OF: Record<string, string> = Object.fromEntries(
  NAV.flatMap((group) => group.items.map((item) => [item.id, group.group])),
);

/** Shown while a lazily-loaded section chunk arrives. */
const SectionFallback: React.FC = () => (
  <div role="status" aria-live="polite" className="space-y-5 py-2">
    <div className="space-y-3">
      <div className="skeleton h-3 w-40" />
      <div className="skeleton h-9 w-[min(420px,80%)]" />
      <div className="skeleton h-4 w-full max-w-xl" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-56 rounded-[18px]" />
      ))}
    </div>
    <span className="sr-only">Loading section</span>
  </div>
);

type SectionErrorBoundaryProps = {
  sectionLabel: string;
  children: React.ReactNode;
};

type SectionErrorBoundaryState = {
  error: Error | null;
};

/** Prevent a failed lazy-loaded section from taking down the entire signed-in app. */
class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Failed to render ${this.props.sectionLabel}`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="card card-featured p-6">
          <div className="eyebrow mb-2">Section unavailable</div>
          <h2 className="type-section text-cream">{this.props.sectionLabel} could not be opened</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#DCCFBA]">
            This section encountered an error. Your sign-in is still active; choose another section or reload the app.
          </p>
          <details className="mt-4 max-w-2xl rounded-lg border border-line bg-[#140f10] px-3.5 py-2.5 text-xs text-[#C7B9A3]">
            <summary className="cursor-pointer font-semibold text-[#E8DDCB]">Show technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{`${this.state.error.name}: ${this.state.error.message || "No error message was provided."}`}</pre>
          </details>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-ghost mt-4">
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const logo = size === "sm" ? "h-6 w-6" : "h-[30px] w-[30px]";
  return (
    <span className={`relative flex ${box} shrink-0 items-center justify-center`}>
      <img
        src="/astrosivam_logo.png"
        alt=""
        className={`${logo} object-contain`}
      />
    </span>
  );
}

function SidebarNavigation({
  section,
  navigate,
}: {
  section: string;
  navigate: (id: string) => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 scroll-thin" aria-label="Studio sections">
      {NAV.map((group) => (
        <div key={group.group} className="mb-5">
          <div className="nav-group-label">{group.group}</div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`nav-item ${active ? "nav-item-active" : ""}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-gold" : "text-[#A2937D]"}`} aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {active ? <ChevronRight className="h-3 w-3 text-gold/80" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-line-soft p-3.5">
      <div className="card-maroon rounded-xl p-3.5">
        <div className="flex items-center gap-2">
          <span className="status-dot" />
          <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#C7E5D5]">Launch ready</span>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-[#E0D4C0]">
          {BRAND.handle} · 1st report free (beta)
        </p>
        <a
          href={BRAND.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-champagne transition-colors hover:text-[#FAF2E2]"
        >
          astrosivam.com <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
      <div className="mt-3 flex items-center justify-between px-1 text-[9px] uppercase tracking-[0.16em] text-[#A2937D]">
        <span>Walajapet, TN · IST</span>
        <span>v2.1</span>
      </div>
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  section,
  navigate,
  signOut,
}: {
  open: boolean;
  onClose: () => void;
  section: string;
  navigate: (id: string) => void;
  signOut: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(selector) ?? []);
    window.setTimeout(() => focusables()[0]?.focus(), 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] xl:hidden">
      <div
        className="absolute inset-0 bg-[#0B0607]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Studio navigation"
        className="fade-rise relative flex h-full w-[min(88vw,304px)] flex-col border-r border-line-strong bg-[#191314] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <div>
              <div className="font-display text-[12px] tracking-[0.14em] text-cream">ASTRO SIVAM</div>
              <div className="text-[8.5px] uppercase tracking-[0.2em] text-[#A2937D]">Creative studio</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close navigation">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <SidebarNavigation section={section} navigate={navigate} />
        <div className="border-t border-line px-4 py-3.5">
          <a
            href={BRAND.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[11px] text-[#B4A58F] transition-colors hover:text-cream"
          >
            astrosivam.com <ArrowUpRight className="h-3 w-3 text-gold" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={signOut}
            className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-[11.5px] text-[#C7B9A3] transition-colors hover:border-line-strong hover:text-cream"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
          </button>
          <p className="mt-3 text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
            {BRAND.email}
          </p>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const [section, go] = useHashSection("launch", ALL_SECTIONS);
  const [drawer, setDrawer] = useState(false);
  const [fontsMissing, setFontsMissing] = useState<string[]>([]);
  const [publisherOpen, setPublisherOpen] = useState(false);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": getCsrfToken() } }).catch(() => undefined);
    window.location.assign("/login");
  };

  // The suite used to fall back to Georgia without saying anything. Now the app
  // checks the loaded font faces once and warns if any brand family is missing.
  useEffect(() => {
    let cancelled = false;
    ensureFonts()
      .then(() => {
        if (cancelled) return;
        const health = fontHealth();
        if (!health.ok) setFontsMissing(health.missing);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = `${LABELS[section] ?? "Studio"} · Astro Sivam Creative Studio`;
  }, [section]);

  const navigate = (id: string) => {
    go(id);
    setDrawer(false);
  };

  return (
    <div className="grain flex min-h-screen flex-col text-cream">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line bg-[#161011]/92 px-3.5 py-2.5 backdrop-blur-xl xl:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-cream transition-colors hover:border-line-strong"
          aria-label="Open navigation"
          aria-expanded={drawer}
          aria-controls="mobile-navigation"
        >
          <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size="sm" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-[11.5px] tracking-[0.12em] text-cream">ASTRO SIVAM</div>
            <div className="text-[8px] uppercase tracking-[0.18em] text-[#A2937D]">Creative studio</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPublisherOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-[rgba(199,154,60,0.08)] text-gold-soft"
            aria-label="Publish a post"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[#B4A58F] transition-colors hover:text-cream"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* sidebar */}
        <aside
          className="sticky top-0 hidden h-screen w-[274px] shrink-0 flex-col border-r border-line bg-[linear-gradient(180deg,#1E1416_0%,#171113_58%,#161011_100%)] xl:flex"
          aria-label="Studio sidebar"
        >
          <div className="flex items-center gap-3 border-b border-line-soft px-4 py-4">
            <BrandMark />
            <div className="min-w-0 leading-tight">
              <div className="font-display text-[13px] tracking-[0.16em] text-cream">ASTRO SIVAM</div>
              <div className="mt-0.5 text-[8.5px] uppercase tracking-[0.22em] text-[#A2937D]">Creative studio</div>
            </div>
            <span className="ml-auto rounded-full border border-line px-1.5 py-0.5 font-mono text-[8px] tracking-[0.06em] text-[#A2937D]">
              v2.1
            </span>
          </div>

          <SidebarNavigation section={section} navigate={navigate} />
          <SidebarFooter />
        </aside>

        {/* main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-line bg-[#161011]/82 px-6 py-2.5 backdrop-blur-xl xl:flex xl:px-10">
            <div className="flex min-w-0 items-center gap-2.5 text-[10px] uppercase tracking-[0.18em] text-[#A2937D]">
              <span className="text-[#A2937D]">Astro Sivam</span>
              <ChevronRight className="h-3 w-3 text-[#6E6357]" aria-hidden="true" />
              <span>{GROUP_OF[section] ?? "Studio"}</span>
              <ChevronRight className="h-3 w-3 text-[#6E6357]" aria-hidden="true" />
              <span className="truncate text-cream">{LABELS[section]}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#B4A58F] xl:flex">
                <Facebook className="h-2.5 w-2.5 text-[#9DB3D4]" aria-hidden="true" /> Facebook
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#B4A58F] xl:flex">
                <Instagram className="h-2.5 w-2.5 text-[#D0A8B8]" aria-hidden="true" /> Instagram
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border border-[rgba(199,154,60,0.32)] bg-[rgba(199,154,60,0.08)] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#EBD9AE] 2xl:flex">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> Export-ready
              </span>
              <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setPublisherOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(216,177,100,0.42)] bg-[rgba(199,154,60,0.1)] px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#EBD9AE] transition-colors hover:bg-[rgba(199,154,60,0.17)]"
              >
                <Send className="h-3 w-3" aria-hidden="true" /> Publish
              </button>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[9.5px] uppercase tracking-[0.12em] text-[#B4A58F] transition-colors hover:border-line-strong hover:text-cream"
              >
                <LogOut className="h-3 w-3" aria-hidden="true" /> Sign out
              </button>
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8 xl:px-10 xl:py-9"
          >
            {fontsMissing.length ? (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-[rgba(208,138,90,0.4)] bg-[rgba(208,138,90,0.08)] px-4 py-3 text-[12.5px] leading-relaxed text-[#F0C3A2]">
                <span className="mt-0.5 text-[15px] leading-none" aria-hidden="true">
                  ⚠
                </span>
                <div>
                  <strong className="font-semibold text-[#FFD9B0]">Brand fonts did not load.</strong>{" "}
                  Posters and exports will render in fallback type. Missing:{" "}
                  <span className="text-[#FFD9B0]">{fontsMissing.join(", ")}</span>. Reload the page, or check that
                  <code className="mx-1 rounded bg-black/30 px-1 py-0.5 text-[11px]">/assets</code>
                  is not blocked by your network.
                </div>
              </div>
            ) : null}
            <SectionErrorBoundary key={section} sectionLabel={LABELS[section] ?? "This section"}>
              <Suspense fallback={<SectionFallback />}>
                {section === "launch" ? <LaunchControl onNavigate={navigate} /> : null}
                {section === "brand" ? <BrandSystem /> : null}
                {section === "profile-cover" ? <ProfileCover /> : null}
                {section === "assets" ? <AssetStudio /> : null}
                {section === "styles" ? <StyleGallery onNavigate={navigate} /> : null}
                {section === "poster" ? <PosterStudio /> : null}
                {section === "panchangam" ? <Panchangam /> : null}
                {section === "festivals" ? <FestivalWishes /> : null}
                {section === "services" ? <ServicePosts onNavigate={navigate} /> : null}
                {section === "instagram" ? <InstagramSuite /> : null}
                {section === "facebook" ? <FacebookSuite /> : null}
                {section === "calendar" ? <ContentCalendar /> : null}
                {section === "hashtags" ? <HashtagLab /> : null}
                {section === "mockups" ? <Mockups /> : null}
                {section === "export" ? <ExportCenter /> : null}
              </Suspense>
            </SectionErrorBoundary>
          </main>

          <footer className="mt-auto border-t border-line-soft px-4 py-6 sm:px-6 xl:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-[10.5px] leading-relaxed text-[#A2937D]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <img src="/astrosivam_logo.png" alt="" className="h-4 w-4 object-contain" />
                </span>
                <span>
                  <span className="font-semibold text-[#E3CA99]">Astro Sivam</span>
                  <span className="mx-1.5 text-[#6E6357]">·</span>
                  Vedic astrology, calculated in Lahiri sidereal and reviewed by an India-based priest team in Tamil
                  Nadu.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                <span>{BRAND.email}</span>
                <span aria-hidden="true">·</span>
                <a
                  href={BRAND.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-champagne"
                >
                  astrosivam.com
                </a>
                <span aria-hidden="true">·</span>
                <span>Suite v2.1</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <div id="mobile-navigation">
        <MobileDrawer
          open={drawer}
          onClose={() => setDrawer(false)}
          section={section}
          navigate={navigate}
          signOut={signOut}
        />
      </div>

      <Suspense fallback={null}>
        <Publisher open={publisherOpen} onClose={() => setPublisherOpen(false)} />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
