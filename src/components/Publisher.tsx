import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Facebook,
  ImagePlus,
  Instagram,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  Unlink,
  X,
} from "lucide-react";
import { Button, Callout, Modal, Select, Textarea } from "./ui";
import {
  PLATFORM_RULES,
  prepareImage,
  validateCaption,
  validateImageFile,
  type ImageValidation,
  type Platform as TargetPlatform,
} from "../lib/imageValidate";

type MetaPage = {
  id: string;
  name: string;
  instagramId?: string;
  instagramUsername?: string;
  tokenStatus?: "valid" | "expired" | "invalid_token" | "permission_error" | "connection_error" | "api_error" | "missing_token" | "not_checked";
  probeError?: string | null;
  instagramStatus?: "linked" | "not_linked" | "unknown" | "not_checked";
};

type MetaStatus = {
  connected: boolean;
  pages: MetaPage[];
  selectedPageId: string | null;
  csrf: string;
};

/** Meta's own error object, passed through untouched from the PHP service. */
type GraphError = {
  type?: string | null;
  code?: number | null;
  subcode?: number | null;
  traceId?: string | null;
  httpStatus?: number | null;
};

type PostResult = {
  platform: "facebook" | "instagram";
  success: boolean;
  id?: string;
  error?: string;
  graph?: GraphError | null;
  hint?: string;
  category?: "expired" | "invalid_token" | "permission_error" | "rate_limited" | "api_error" | "connection_error" | "account_link_error";
  outcomeUnknown?: boolean;
};

type ImageCheck = {
  file: File;
  name: string;
  validation: ImageValidation;
};

const emptyStatus: MetaStatus = { connected: false, pages: [], selectedPageId: null, csrf: "" };

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/bmp,image/tiff";

async function readJson(response: Response, allowErrorResponse = false) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    throw new Error(
      "The Meta publishing service is not responding on this host. Deploy the PHP files in hosting/ before publishing.",
    );
  }
  const body = await response.json();
  if (!response.ok && !allowErrorResponse) throw new Error(body.error || "Request failed.");
  return body;
}

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const Publisher: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [status, setStatus] = useState<MetaStatus>(emptyStatus);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [caption, setCaption] = useState("");
  const [check, setCheck] = useState<ImageCheck | null>(null);
  const [prepared, setPrepared] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [platforms, setPlatforms] = useState<TargetPlatform[]>(["facebook"]);
  const [publishing, setPublishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [results, setResults] = useState<PostResult[]>([]);
  const [notice, setNotice] = useState("");
  const [csrf, setCsrf] = useState("");

  const selectedPage = useMemo(
    () => status.pages.find((page) => page.id === status.selectedPageId) || status.pages[0],
    [status.pages, status.selectedPageId],
  );
  const instagramAvailable = Boolean(selectedPage?.instagramId);
  const validation = check?.validation ?? null;
  const blocking = validation?.issues.filter((issue) => issue.severity === "error") ?? [];
  const warnings = validation?.issues.filter((issue) => issue.severity === "warning") ?? [];
  const text = useMemo(() => validateCaption(caption, platforms), [caption, platforms]);

  const refreshStatus = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const next = (await readJson(await fetch("/api/meta/status", { cache: "no-store" }))) as MetaStatus;
      setStatus(next);
      setCsrf(next.csrf || "");
      if (next.pages.length && !next.selectedPageId) setStatus({ ...next, selectedPageId: next.pages[0].id });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load Meta account status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refreshStatus();
  }, [open]);

  useEffect(() => {
    const source = prepared ?? check?.file ?? null;
    if (!source) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(source);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [prepared, check]);

  const togglePlatform = (platform: TargetPlatform) => {
    const next = platforms.includes(platform) ? platforms.filter((item) => item !== platform) : [...platforms, platform];
    setPlatforms(next);
    setResults([]);
    setNotice("");
    setConfirming(false);
    // Instagram's rules are stricter, so a file that passed for Facebook has to be
    // re-checked the moment Instagram joins the targets.
    if (check && next.length) void recheck(check.file, next);
  };

  const recheck = async (file: File, targets: TargetPlatform[]) => {
    const next = await validateImageFile(file, targets);
    setCheck({ file, name: file.name, validation: next });
    setPrepared(null);
  };

  const pickFile = async (file?: File | null) => {
    if (!file) return;
    setResults([]);
    setNotice("");
    setConfirming(false);
    setPrepared(null);
    try {
      const next = await validateImageFile(file, platforms);
      setCheck({ file, name: file.name, validation: next });
    } catch (error) {
      setCheck(null);
      setNotice(error instanceof Error ? error.message : "That file could not be read.");
    }
  };

  const selectPage = async (pageId: string) => {
    setStatus((current) => ({ ...current, selectedPageId: pageId }));
    setResults([]);
    try {
      const body = await readJson(
        await fetch("/api/meta/select", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify({ pageId }),
        }),
      );
      setStatus((current) => ({ ...current, selectedPageId: body.selectedPageId }));
      await refreshStatus();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not select this Page.");
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect the saved Meta Page and Instagram account from this publisher?")) return;
    try {
      await readJson(
        await fetch("/api/meta/disconnect", {
          method: "POST",
          headers: { "X-CSRF-Token": csrf },
        }),
      );
      setStatus(emptyStatus);
      setNotice("Meta account disconnected.");
      setResults([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not disconnect the account.");
    }
  };

  /** Step one of publishing: validate, prepare, then ask for explicit confirmation. */
  const requestPublish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!check || !selectedPage || platforms.length === 0) return;
    if (blocking.length || !text.ok) {
      setNotice("Fix the blocking issues above before publishing.");
      return;
    }
    setNotice("");
    try {
      const upload = await prepareImage(check.file, check.validation);
      if (upload.size > PLATFORM_RULES.facebook.maxBytes) {
        setNotice("The prepared image is larger than 8 MB. Export a smaller file.");
        return;
      }
      setPrepared(upload);
      setConfirming(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not prepare the image for upload.");
    }
  };

  /** Step two: the actual POST, only after the summary has been confirmed. */
  const publish = async () => {
    if (!prepared || !selectedPage) return;
    setPublishing(true);
    setResults([]);
    setNotice("");
    try {
      const data = new FormData();
      data.append("image", prepared);
      data.append("caption", caption);
      data.append("pageId", selectedPage.id);
      platforms.forEach((platform) => data.append("platforms[]", platform));
      const response = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: data,
      });
      const body = await readJson(response, true);
      setResults(body.results || []);
      setNotice(body.message || `${body.category ? `${String(body.category).replaceAll("_", " ")} · ` : ""}${body.error || "Publishing finished."}`);
      setConfirming(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not publish this post.");
    } finally {
      setPublishing(false);
    }
  };

  const maxCaption = platforms.includes("instagram") ? 2200 : 5000;
  const canPublish = Boolean(status.connected && check && platforms.length && selectedPage?.tokenStatus === "valid" && !publishing);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!publishing}
      size="md"
      icon={<Send className="h-4 w-4" />}
      eyebrow="Meta publishing"
      title="Publish from one place"
      description="Send a finished creative and caption to your Facebook Page, Instagram, or both."
      footer={
        <>
          <span className="mr-auto max-w-[320px] text-[9.5px] leading-relaxed text-[#A2937D]">
            Posts publish immediately once you confirm. Meta may reject content or require re-authorization — the exact
            error it returns is shown below.
          </span>
          <Button variant="quiet" onClick={onClose} disabled={publishing}>
            Close
          </Button>
          {status.connected && !confirming ? (
            <Button
              variant="gold"
              type="submit"
              form="publisher-form"
              loading={publishing}
              disabled={!canPublish || blocking.length > 0 || !text.ok}
              icon={<Send className="h-3.5 w-3.5" />}
            >
              Review &amp; publish
            </Button>
          ) : null}
          {status.connected && confirming ? (
            <Button variant="danger" onClick={() => void publish()} loading={publishing} icon={<Send className="h-3.5 w-3.5" />}>
              Publish to {selectedPage?.name}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <div className="skeleton h-4 w-44" />
            <div className="skeleton h-24 w-full rounded-xl" />
            <span className="sr-only">Checking Meta connection</span>
          </div>
        ) : loadError ? (
          <Callout tone="danger" title="Meta connection">
            <p>{loadError}</p>
            <p className="mt-1.5 text-[10.5px] text-[#C7B9A3]">
              This screen needs the PHP publishing service. Nothing is simulated: no result means no live endpoint was
              reached.
            </p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => void refreshStatus()}>
              Try again
            </Button>
          </Callout>
        ) : !status.connected ? (
          <div className="space-y-4">
            <div className="card-maroon flex items-start gap-4 rounded-2xl p-5 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-[#24060F] text-gold">
                <Facebook className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[16px] text-cream">Connect your Meta Page</h3>
                <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-[#E0D4C0]">
                  Authorize your Facebook Page once. If that Page has a linked Instagram professional account, it appears
                  here too. Your access token stays on your PHP host — never in the browser.
                </p>
                <a href="/api/meta/connect" className="btn btn-gold mt-4">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Connect Facebook &amp; Instagram
                </a>
              </div>
            </div>
            <p className="rounded-xl border border-line bg-wash px-4 py-3 text-[10.5px] leading-relaxed text-[#A2937D]">
              Requires a Meta developer app configured by the site owner and the relevant Meta publishing permissions.
              Meta may require app review before other people can authorize.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-line bg-wash p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Select
                  label="Posting page"
                  fieldClassName="min-w-0 flex-1"
                  value={selectedPage?.id || ""}
                  onChange={(event) => void selectPage(event.target.value)}
                >
                  {status.pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                      {page.instagramUsername ? ` · @${page.instagramUsername}` : ""}
                    </option>
                  ))}
                </Select>
                <a href="/api/meta/connect" className="btn btn-ghost btn-sm h-[38px] shrink-0">
                  <ExternalLink className="h-3 w-3" aria-hidden="true" /> Reconnect
                </a>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="btn btn-quiet btn-sm h-[38px] shrink-0 text-[#C7B9A3] hover:text-[#F0B9A4]"
                >
                  <Unlink className="h-3 w-3" aria-hidden="true" /> Disconnect
                </button>
              </div>
            </div>

            {selectedPage?.tokenStatus !== "valid" ? (
              <Callout tone="danger" title={selectedPage?.tokenStatus === "expired" ? "Meta token expired" : selectedPage?.tokenStatus === "permission_error" ? "Meta permission required" : "Page connection not verified"}>
                <p>{selectedPage?.probeError || "The Page is saved locally, but its live token check is not successful. Publishing is disabled until the connection is verified."}</p>
                <p className="mt-1">Reconnect or resolve the Meta permission/API issue, then refresh the connection status. No post has been sent.</p>
              </Callout>
            ) : null}
            <form id="publisher-form" onSubmit={requestPublish} className="space-y-5">
              <fieldset>
                <legend className="label">Post to</legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={platforms.includes("facebook")}
                    onClick={() => togglePlatform("facebook")}
                    className={`choice inline-flex items-center gap-2 px-3 py-2 text-[11.5px] ${
                      platforms.includes("facebook") ? "choice-active" : ""
                    }`}
                  >
                    <Facebook className="h-3.5 w-3.5 text-[#9DB3D4]" aria-hidden="true" /> Facebook Page
                  </button>
                  <button
                    type="button"
                    aria-pressed={platforms.includes("instagram")}
                    disabled={!instagramAvailable}
                    onClick={() => togglePlatform("instagram")}
                    className={`choice inline-flex items-center gap-2 px-3 py-2 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
                      platforms.includes("instagram") ? "choice-active" : ""
                    }`}
                  >
                    <Instagram className="h-3.5 w-3.5 text-[#D0A8B8]" aria-hidden="true" /> Instagram
                    {instagramAvailable ? "" : selectedPage?.instagramStatus === "not_linked" ? " · not linked" : " · verify Page"}
                  </button>
                </div>
              </fieldset>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_238px]">
                <div>
                  <Textarea
                    label="Caption"
                    id="post-caption"
                    value={caption}
                    onChange={(event) => {
                      setCaption(event.target.value);
                      setConfirming(false);
                    }}
                    maxLength={maxCaption}
                    rows={7}
                    placeholder="Write the post caption…"
                    hint={`${Array.from(caption).length} / ${maxCaption} characters · ${text.hashtagCount} hashtags · first line ${text.hookLength}`}
                  />
                  {text.issues.length ? (
                    <div className="mt-1.5 space-y-1">
                      {text.issues.map((issue) => (
                        <div
                          key={issue.code}
                          className={`flex items-start gap-1.5 text-[10px] leading-relaxed ${
                            issue.severity === "error" ? "text-[#F0C3A2]" : "text-[#E0D4C0]"
                          }`}
                        >
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>{issue.message}{issue.fix ? ` ${issue.fix}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <span className="label">Image</span>
                  <label
                    className="upload-label group flex min-h-[168px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-[#140f10] text-center transition-colors hover:border-[rgba(216,177,100,0.55)]"
                  >
                    <input
                      id="post-image"
                      type="file"
                      accept={ACCEPTED}
                      aria-label="Choose an image for the post"
                      className="sr-only"
                      onChange={(event) => void pickFile(event.target.files?.[0])}
                    />
                    {preview ? (
                      <img src={preview} alt="Selected post preview" className="max-h-[238px] w-full object-contain" />
                    ) : (
                      <>
                        <ImagePlus className="h-7 w-7 text-[#A2937D] transition-colors group-hover:text-gold" aria-hidden="true" />
                        <span className="mt-2 text-[11px] text-[#C7B9A3]">Choose an image</span>
                        <span className="mt-1 text-[9px] text-[#A2937D]">JPEG, PNG, WebP, HEIC… · max 8 MB</span>
                      </>
                    )}
                  </label>
                  {check ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[10.5px] font-medium text-cream">{check.name}</div>
                          <div className="text-[9.5px] text-[#A2937D]">
                            {validation?.meta
                              ? `${validation.meta.kind.toUpperCase()} · ${validation.meta.width} × ${validation.meta.height} · ${formatBytes(validation.meta.bytes)}`
                              : "Dimensions unreadable"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCheck(null);
                            setPrepared(null);
                            setResults([]);
                            setConfirming(false);
                          }}
                          className="shrink-0 text-[9.5px] text-[#A2937D] underline decoration-[#948772] underline-offset-2 hover:text-cream"
                        >
                          Remove
                        </button>
                      </div>

                      {validation?.meta ? (
                        <div className="rounded-lg border border-line-soft bg-[#140f10] px-2 py-1.5 text-[9.5px] leading-relaxed text-[#B4A58F]">
                          Uploads as <span className="text-gold-soft">{validation.uploadMime ?? validation.meta.mime}</span>
                          {validation.needsConversion ? " · converted in the browser, because Meta only accepts JPEG and PNG" : " · no conversion needed"}
                          {validation.targetWidth ? ` · resized to ${validation.targetWidth} px wide for Instagram` : ""}
                        </div>
                      ) : null}

                      {validation?.issues.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-jade">
                          <Check className="h-3 w-3" aria-hidden="true" /> Ready for {platforms.join(" + ")}
                        </div>
                      ) : null}

                      {[...blocking, ...warnings].map((issue, index) => (
                        <div
                          key={`${issue.code}-${index}`}
                          className={`flex items-start gap-1.5 text-[10px] leading-relaxed ${
                            issue.severity === "error" ? "text-[#F0C3A2]" : "text-[#E0D4C0]"
                          }`}
                        >
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>
                            {issue.message}
                            {issue.fix ? <span className="block text-[#A2937D]">{issue.fix}</span> : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {confirming && prepared && selectedPage ? (
                <div className="rounded-xl border border-[rgba(216,177,100,0.4)] bg-[rgba(216,177,100,0.06)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-gold-soft">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Confirm this publishes right now
                  </div>
                  <ul className="mt-2 space-y-1 text-[10.5px] leading-relaxed text-[#C7B9A3]">
                    <li>Page · {selectedPage.name}</li>
                    <li>Targets · {platforms.join(" + ")}</li>
                    <li>
                      File · {prepared.name} ({(prepared.size / (1024 * 1024)).toFixed(2)} MB, {prepared.type})
                    </li>
                    <li>Caption · {Array.from(caption).length} characters</li>
                  </ul>
                  <p className="mt-2 text-[10px] text-[#B4A58F]">
                    This sends a real post. Nothing here is a draft.
                  </p>
                  <Button variant="quiet" size="sm" className="mt-2" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              ) : null}

              {notice ? (
                <Callout tone="quiet" title="Publisher" icon={<Sparkles className="h-3.5 w-3.5" />}>
                  <span role="status">{notice}</span>
                </Callout>
              ) : null}

              {results.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {results.map((result) => (
                    <div
                      key={result.platform}
                      className={`rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${
                        result.success
                          ? "border-[rgba(143,191,165,0.28)] bg-[rgba(143,191,165,0.06)] text-[#C7E5D5]"
                          : "border-[rgba(216,130,111,0.3)] bg-[rgba(216,130,111,0.07)] text-[#F0C3A2]"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {result.success ? (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          <strong className="capitalize">{result.platform}</strong>
                          {result.success ? ` · published (id ${result.id || "not returned"})` : ` · ${result.error || "failed"}`}
                        </span>
                      </div>
                      {!result.success && result.category ? <p className="mt-1.5 pl-6 text-[9.5px] uppercase tracking-wide">{result.category.replaceAll("_", " ")}</p> : null}
                      {!result.success && result.outcomeUnknown ? <p className="mt-1.5 pl-6 font-semibold text-[#F0C3A2]">Meta may have accepted this post before the connection failed. Check the Page/Instagram account before retrying to avoid a duplicate.</p> : null}
                      {!result.success && result.graph ? (
                        <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 pl-6 text-[9.5px] text-[#E6C9A8]">
                          {result.graph.type ? (
                            <div className="col-span-2">
                              <dt className="inline text-[#C7B9A3]">type </dt>
                              <dd className="inline font-mono">{result.graph.type}</dd>
                            </div>
                          ) : null}
                          {typeof result.graph.code === "number" ? (
                            <div>
                              <dt className="inline text-[#C7B9A3]">code </dt>
                              <dd className="inline font-mono">{result.graph.code}</dd>
                            </div>
                          ) : null}
                          {typeof result.graph.subcode === "number" ? (
                            <div>
                              <dt className="inline text-[#C7B9A3]">subcode </dt>
                              <dd className="inline font-mono">{result.graph.subcode}</dd>
                            </div>
                          ) : null}
                          {result.graph.traceId ? (
                            <div className="col-span-2 break-all">
                              <dt className="inline text-[#C7B9A3]">fbtrace </dt>
                              <dd className="inline font-mono">{result.graph.traceId}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}
                      {!result.success && result.hint ? (
                        <p className="mt-1.5 pl-6 text-[10px] text-[#E0D4C0]">{result.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};
