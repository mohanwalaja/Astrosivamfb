import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  Facebook,
  Instagram,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unlink,
  X,
} from "lucide-react";
import { Button, Callout, CopyButton, Panel, SectionLabel } from "./ui";

/**
 * Live Meta connection state.
 *
 * Every value here comes from the PHP publishing service, which reads it back
 * from the Graph API. When that service is not deployed — the normal state in
 * development — the panel says so plainly instead of showing a plausible
 * "Connected" badge. Nothing on this screen is invented.
 */

interface MetaPage {
  id: string;
  name: string;
  instagramId?: string | null;
  instagramUsername?: string | null;
  instagramStatus?: "linked" | "not_linked" | "unknown" | "not_checked";
  /** Returned by GET /{page-id}?fields=fan_count,link,category */
  fanCount?: number | null;
  link?: string | null;
  category?: string | null;
  /** Returned by the page token introspection. */
  tokenExpiresAt?: number | null;
  authorizationExpiresAt?: number | null;
  tokenValid?: boolean | null;
  tokenStatus?: "valid" | "expired" | "invalid_token" | "permission_error" | "connection_error" | "api_error" | "rate_limited" | "missing_token" | "not_checked";
  probeError?: string | null;
  probeGraph?: { type?: string | null; code?: number | null; subcode?: number | null; traceId?: string | null; httpStatus?: number | null } | null;
  /** Page-level visibility, read live from the Graph API. */
  pageIsPublished?: boolean | null;
  pageVerificationStatus?: string | null;
  pageExperience?: string | null;
}

interface MetaStatusPayload {
  connected: boolean;
  pages: MetaPage[];
  selectedPageId: string | null;
  csrf: string;
  /** Server clock when the payload was produced. */
  checkedAt?: string;
  /** Graph API version the server is pinned to. */
  graphVersion?: string;
  /** True when the host has app credentials but no authorized connection yet. */
  configured?: boolean;
  /** Human-readable reason when configured === false. */
  configurationNote?: string;
  lastError?: { category?: string; code?: number | null; subcode?: number | null; traceId?: string | null } | null;
}

type ProbeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "live"; payload: MetaStatusPayload }
  | { kind: "unavailable"; message: string; detail?: string };

async function readStatus(response: Response): Promise<MetaStatusPayload> {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    throw Object.assign(new Error("The Meta publishing service is not deployed on this host."), {
      detail:
        "The Vite dev server has no /api/meta routes. Deploy the PHP files in hosting/ (or run the Node server with an API proxy) to check a real Page connection.",
    });
  }
  const body = (await response.json()) as MetaStatusPayload & { error?: string };
  if (!response.ok) throw Object.assign(new Error(body.error || "The Meta service refused the request."), { detail: undefined });
  return body;
}

const timeAgo = (iso?: string) => {
  if (!iso) return "just now";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "just now";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return `${Math.round(seconds / 3600)} h ago`;
};

export function MetaStatus() {
  const [state, setState] = useState<ProbeState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const check = useCallback(async () => {
    setBusy(true);
    setNotice("");
    setState((current) => (current.kind === "live" ? current : { kind: "loading" }));
    try {
      const response = await fetch("/api/meta/status", { cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await readStatus(response);
      setState({ kind: "live", payload: { ...payload, checkedAt: payload.checkedAt ?? new Date().toISOString() } });
    } catch (error) {
      setState({
        kind: "unavailable",
        message: error instanceof Error ? error.message : "Could not reach the Meta service.",
        detail: (error as { detail?: string }).detail,
      });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const disconnect = async () => {
    if (state.kind !== "live") return;
    if (!window.confirm("Remove the stored Page and Instagram token from this host? You will need to authorize again.")) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/meta/disconnect", {
        method: "POST",
        headers: { "X-CSRF-Token": state.payload.csrf },
      });
      if (!response.ok) throw new Error("The host refused to disconnect.");
      setNotice("Connection removed. No token is stored on this host.");
      await check();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not disconnect.");
    } finally {
      setBusy(false);
    }
  };

  // A single narrowed alias keeps the JSX readable and the compiler happy —
  // the union also has an "idle" member before the first probe resolves.
  const live = state.kind === "live" ? state.payload : null;
  const pages = live?.pages ?? [];
  const selected = live ? pages.find((page) => page.id === live.selectedPageId) ?? pages[0] : undefined;

  const tokenStatus = selected?.tokenStatus ?? (live && live.connected ? "missing_token" : undefined);
  const statusCopy: Record<string, string> = {
    valid: "Page token works",
    expired: "Token expired",
    invalid_token: "Token invalid",
    permission_error: "Permission error",
    connection_error: "Meta unreachable",
    api_error: "Meta API error",
    rate_limited: "Meta rate limit",
    missing_token: "No token stored",
  };
  const tone = tokenStatus === "valid" ? "ok" : tokenStatus ? "down" : state.kind === "loading" ? "idle" : "down";
  const label = tokenStatus ? statusCopy[tokenStatus] ?? "Connection needs attention" : state.kind === "live" ? "No Page saved" : state.kind === "loading" ? "Checking…" : "Service not reachable";

  return (
    <Panel>
      <SectionLabel
        right={
          <span className="flex items-center gap-2">
            <span
              className={`chip ${tone === "ok" ? "chip-jade" : tone === "down" ? "chip-saffron" : ""}`}
              aria-live="polite"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              {label}
            </span>
            <a href="/setup/meta" className="btn btn-ghost btn-sm" aria-label="Configure Meta API and suite login settings">
              <ExternalLink className="h-3 w-3" aria-hidden="true" /> API setup
            </a>
            <Button variant="ghost" size="sm" onClick={() => void check()} disabled={busy} icon={<RefreshCw className="h-3 w-3" />}>
              Check now
            </Button>
          </span>
        }
      >
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Meta connection
        </span>
      </SectionLabel>

      <p className="mb-3 text-[10.5px] leading-relaxed text-[#A2937D]">
        The PHP service checks each saved Page against the Graph API. A locally saved Page is not treated as working unless its live token check succeeds.
      </p>

      {state.kind === "loading" ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-16 w-full rounded-lg" />
          <span className="sr-only">Checking the Meta connection</span>
        </div>
      ) : state.kind === "unavailable" ? (
        <div className="space-y-3">
          <Callout tone="warn" title="No live Meta result to show">
            <p>{state.message}</p>
            {state.detail ? <p className="mt-1.5 text-[10.5px] leading-relaxed">{state.detail}</p> : null}
          </Callout>
          <ul className="space-y-1.5 text-[10.5px] leading-relaxed text-[#B4A58F]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
              Deploy <code className="rounded bg-wash px-1 py-0.5 text-[10px] text-gold-soft">hosting/index.php</code> beside
              the built <code className="rounded bg-wash px-1 py-0.5 text-[10px] text-gold-soft">dist/</code> folder.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
              Add <code className="rounded bg-wash px-1 py-0.5 text-[10px] text-gold-soft">META_APP_ID</code>,{" "}
              <code className="rounded bg-wash px-1 py-0.5 text-[10px] text-gold-soft">META_APP_SECRET</code> and{" "}
              <code className="rounded bg-wash px-1 py-0.5 text-[10px] text-gold-soft">SITE_BASE_URL</code> to the private
              config.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/60" />
              Authorize the Page once; the token is stored encrypted on the host, never in this browser.
            </li>
          </ul>
          <p className="text-[10px] leading-relaxed text-[#948772]">
            Until then, nothing on this screen can publish, and no result here is simulated.
          </p>
        </div>
      ) : !live || pages.length === 0 ? (
        <div className="space-y-3">
          <Callout tone="quiet" title="The service answered; no Page is authorized">
            <p>
              {live?.configurationNote ??
                "The publishing service is reachable but no Facebook Page token is stored on this host yet."}
            </p>
          </Callout>
          {live?.lastError ? (
            <Callout tone="danger" title={live.lastError.category === "no_pages" ? "No Pages returned by Meta" : live.lastError.category === "permission_error" ? "Meta permission error" : live.lastError.category === "connection_error" ? "Meta connection error" : "Meta API error"}>
              <p>{live.lastError.category === "no_pages" ? "Meta authorization completed, but no manageable Facebook Pages were returned. Check the authorizing account's Page role and pages_show_list permission. No Page token was saved." : "Meta authorization did not complete. Check the app role, redirect URI, granted scopes and outbound HTTPS, then reconnect. No access token was saved."}</p>
              {live.lastError.code != null ? <p className="mt-1 font-mono text-[10px]">Code {live.lastError.code}{live.lastError.subcode != null ? ` / ${live.lastError.subcode}` : ""}{live.lastError.traceId ? ` · trace ${live.lastError.traceId}` : ""}</p> : null}
            </Callout>
          ) : null}
          <a href="/api/meta/connect" className="btn btn-gold btn-sm">
            <ExternalLink className="h-3 w-3" aria-hidden="true" /> Connect a Facebook Page
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-line-soft bg-wash p-3">
              <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                <Facebook className="h-3 w-3 text-[#9DB3D4]" aria-hidden="true" /> Page
              </div>
              <div className="mt-1 truncate text-[12px] font-semibold text-cream">{selected?.name ?? "—"}</div>
              <div className="mt-0.5 text-[10px] text-[#A2937D]">
                {selected?.category ? `${selected.category} · ` : ""}ID {selected?.id ?? "—"}
              </div>
              {typeof selected?.fanCount === "number" ? (
                <div className="mt-1 text-[10px] text-[#B4A58F]">
                  {selected.fanCount.toLocaleString("en-IN")} followers, as reported by Meta
                </div>
              ) : (
                <div className="mt-1 text-[10px] text-[#948772]">
                  Follower count not returned — the API omitted <code>fan_count</code>.
                </div>
              )}
              {selected?.pageIsPublished === false ? (
                <div className="mt-1 text-[10px] font-semibold text-[#E0B48C]">
                  Page is unpublished — only people with a Page role can see its posts.
                </div>
              ) : null}
              {selected?.pageVerificationStatus ? (
                <div className="mt-1 text-[10px] text-[#B4A58F]">
                  Verification: {selected.pageVerificationStatus.replaceAll("_", " ")}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-line-soft bg-wash p-3">
              <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-[#A2937D]">
                <Instagram className="h-3 w-3 text-[#D0A8B8]" aria-hidden="true" /> Instagram
              </div>
              {selected?.instagramId ? (
                <>
                  <div className="mt-1 truncate text-[12px] font-semibold text-cream">
                    {selected.instagramUsername ? `@${selected.instagramUsername}` : selected.instagramId}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#A2937D]">Connected to this Page · can publish single images</div>
                </>
              ) : selected?.instagramStatus === "not_linked" ? (
                <div className="mt-1 text-[11px] text-[#B4A58F]">
                  Meta reports no Instagram professional account linked to this Page.
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-[#B4A58F]">
                  The linked Instagram account is not verified yet; reconnect/check the selected Page before publishing to Instagram.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#A2937D]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" /> Checked {timeAgo(live?.checkedAt)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Graph {live?.graphVersion ?? "version unset"}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {tokenStatus === "valid" ? <Check className="h-3 w-3 text-jade" aria-hidden="true" /> : <X className="h-3 w-3 text-[#E0B48C]" aria-hidden="true" />}
              {tokenStatus === "valid" ? "Live Page API check passed · token encrypted on host" : statusCopy[tokenStatus ?? ""] ?? "No token status"}
            </span>
          </div>

          {tokenStatus && tokenStatus !== "valid" ? (
            <Callout tone={tokenStatus === "connection_error" || tokenStatus === "api_error" || tokenStatus === "rate_limited" ? "warn" : "danger"} title={statusCopy[tokenStatus]}>
              <p>{selected?.probeError || (tokenStatus === "expired" || tokenStatus === "invalid_token"
                ? "Meta rejected the stored Page token. Reconnect the Page."
                : tokenStatus === "permission_error"
                  ? "The token could not read the required Page fields. Check granted Page and Instagram permissions in Meta."
                  : "The saved Page exists locally, but a live publishing check did not pass. This is not a confirmed working connection.")}</p>
              {selected?.probeGraph?.code != null ? <p className="mt-1 font-mono text-[10px]">Meta code {selected.probeGraph.code}{selected.probeGraph.subcode != null ? ` / ${selected.probeGraph.subcode}` : ""}{selected.probeGraph.traceId ? ` · trace ${selected.probeGraph.traceId}` : ""}</p> : null}
            </Callout>
          ) : null}
          {selected?.authorizationExpiresAt ? (
            <p className="text-[10px] text-[#A2937D]">Meta reported the authorizing user grant expires {new Date(selected.authorizationExpiresAt * 1000).toLocaleString()}. This is not a guaranteed Page-token expiry.</p>
          ) : selected ? (
            <p className="text-[10px] text-[#948772]">Exact Page-token expiry is unknown; usability is checked live. Meta error 190 will be shown distinctly if it expires or becomes invalid.</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <a href="/api/meta/connect" className="btn btn-ghost btn-sm">
              <ExternalLink className="h-3 w-3" aria-hidden="true" /> Reconnect
            </a>
            <Button variant="quiet" size="sm" onClick={() => void disconnect()} disabled={busy} icon={<Unlink className="h-3 w-3" />}>
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {notice ? (
        <Callout tone="quiet">
          <span role="status">{notice}</span>
        </Callout>
      ) : null}

      <details className="mt-3 rounded-lg border border-line-soft bg-wash px-3 py-2">
        <summary className="cursor-pointer text-[10.5px] font-semibold text-gold-soft">
          Troubleshooting common publishing failures
        </summary>
        <dl className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-[#B4A58F]">
          <div>
            <dt className="inline-flex items-center gap-1 font-semibold text-cream">
              <AlertTriangle className="h-3 w-3 text-[#E0B48C]" aria-hidden="true" /> “Service is not deployed”
            </dt>
            <dd className="mt-0.5">
              The dev server does not serve <code>/api/meta</code>. It is a PHP route in{" "}
              <code>hosting/index.php</code> — check it on the deployed host, not in Vite.
            </dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 font-semibold text-cream">
              <AlertTriangle className="h-3 w-3 text-[#E0B48C]" aria-hidden="true" /> “Invalid OAuth access token”
            </dt>
            <dd className="mt-0.5">
              Page tokens inherit the user token's expiry. Reconnect, and confirm the authorizing account still has a
              role on the Page.
            </dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 font-semibold text-cream">
              <AlertTriangle className="h-3 w-3 text-[#E0B48C]" aria-hidden="true" /> “Permissions error (200)”
            </dt>
            <dd className="mt-0.5">
              The app must grant <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>,
              <code>instagram_basic</code> and <code>instagram_content_publish</code>. In Development mode, test as an app role;
              other users need the applicable Meta review/Advanced Access.
            </dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 font-semibold text-cream">
              <AlertTriangle className="h-3 w-3 text-[#E0B48C]" aria-hidden="true" /> “Only I can see the post” / “Others see only the photo”
            </dt>
            <dd className="mt-0.5">
              API-created content in Development mode is visible only to people with an app role. Complete Meta’s applicable
              review/Advanced Access steps, switch <strong>App mode → Live</strong>, reconnect, and publish a new test. Open its
              permalink while logged out to verify public visibility.
            </dd>
          </div>
        </dl>
      </details>

      {live ? (
        <div className="mt-3 flex items-center justify-between gap-2 text-[9.5px] text-[#948772]">
          <span>Raw payload for support</span>
          <CopyButton text={JSON.stringify(live, null, 2)} label="Copy JSON" compact />
        </div>
      ) : null}
    </Panel>
  );
}
