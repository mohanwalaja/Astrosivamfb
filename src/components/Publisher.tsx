import React, { useEffect, useMemo, useRef, useState } from "react";
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
import type { PlatformCaptions, PublisherDraft } from "../lib/publishContext";

type MetaPage = {
  id: string;
  name: string;
  instagramId?: string;
  instagramUsername?: string;
  tokenStatus?: "valid" | "expired" | "invalid_token" | "permission_error" | "connection_error" | "api_error" | "missing_token" | "not_checked";
  probeError?: string | null;
  instagramStatus?: "linked" | "not_linked" | "unknown" | "not_checked";
  pageIsPublished?: boolean | null;
  pageVerificationStatus?: string | null;
  pageExperience?: string | null;
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
  permalinkUrl?: string;
  error?: string;
  graph?: GraphError | null;
  hint?: string;
  category?: "expired" | "invalid_token" | "permission_error" | "rate_limited" | "api_error" | "connection_error" | "account_link_error";
  outcomeUnknown?: boolean;
  visibility?: {
    isPublished?: boolean | null;
    isHidden?: boolean | null;
    timelineVisibility?: string | null;
    statusType?: string | null;
    permalinkUrl?: string | null;
    repaired?: boolean;
    repairError?: string;
    readError?: string;
  };
};

type ImageCheck = {
  file: File;
  name: string;
  platforms: TargetPlatform[];
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

/**
 * Shows what Meta actually reports about the new Page post. The old publisher
 * stopped at a photo upload, so a photo could appear in the Page's Photos tab
 * while no feed post existed. This block makes that distinction visible.
 */
function FacebookVisibilityNote({ result }: { result: PostResult }) {
  const visibility = result.visibility;
  if (!visibility) {
    return (
      <p className="mt-1.5 pl-6 text-[10px] text-[#B4D5C4]">
        Meta returned a Page feed post ID, not just a photo ID. The update is on the Page timeline and can appear in followers’ feeds.
      </p>
    );
  }
  const hidden =
    visibility.isPublished === false ||
    visibility.isHidden === true ||
    (visibility.timelineVisibility != null && visibility.timelineVisibility !== "normal");
  return (
    <div className="mt-1.5 pl-6 text-[10px] text-[#B4D5C4]">
      <p>
        Meta reports:{" "}
        {visibility.isPublished === null ? "published state unknown" : visibility.isPublished ? "published" : "not published"}
        {visibility.isHidden === true ? " · hidden" : ""}
        {visibility.timelineVisibility ? ` · timeline ${visibility.timelineVisibility}` : ""}
        {visibility.statusType ? ` · ${visibility.statusType}` : ""}
      </p>
      {visibility.repaired ? (
        <p className="mt-1 font-semibold text-[#C7E5D5]">
          Meta had created the post unpublished or hidden; the publisher restored it to the Page timeline.
        </p>
      ) : null}
      {hidden ? (
        <p className="mt-1 font-semibold text-[#F0C3A2]">
          This post is not visible on the Page timeline. The usual cause is Meta app Development mode (only app-role users can see it) or an unpublished Page. Switch the app to Live mode, publish the Page, then publish a new post. Check the Page while logged out.
        </p>
      ) : (
        <p className="mt-1">
          The update is on the Page timeline and can appear in followers’ feeds. Check the post while logged out; if others cannot see it, complete Meta’s required review/access steps and switch the app from Development to Live mode.
        </p>
      )}
      {visibility.repairError ? <p className="mt-1 text-[#F0C3A2]">Visibility repair failed: {visibility.repairError}</p> : null}
      {visibility.readError ? <p className="mt-1 text-[#F0C3A2]">Could not read the post back from Meta: {visibility.readError}</p> : null}
    </div>
  );
}

export const Publisher: React.FC<{ open: boolean; onClose: () => void; draft?: PublisherDraft | null }> = ({ open, onClose, draft = null }) => {
  const [status, setStatus] = useState<MetaStatus>(emptyStatus);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [autoPublishPending, setAutoPublishPending] = useState(false);
  const statusReadyRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const autoPublishHandledRef = useRef<PublisherDraft | null>(null);
  const [loadError, setLoadError] = useState("");
  const [captions, setCaptions] = useState<PlatformCaptions>({ facebook: "", instagram: "" });
  const [captionPlatform, setCaptionPlatform] = useState<TargetPlatform>("facebook");
  const [check, setCheck] = useState<ImageCheck | null>(null);
  const [prepared, setPrepared] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [platforms, setPlatforms] = useState<TargetPlatform[]>(["facebook"]);
  const [publishing, setPublishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [results, setResults] = useState<PostResult[]>([]);
  const [publishedTargets, setPublishedTargets] = useState<TargetPlatform[]>([]);
  const [uncertainTargets, setUncertainTargets] = useState<TargetPlatform[]>([]);
  const [notice, setNotice] = useState("");
  const [csrf, setCsrf] = useState("");

  const selectedPage = useMemo(
    () => status.pages.find((page) => page.id === status.selectedPageId) || status.pages[0],
    [status.pages, status.selectedPageId],
  );
  const instagramAvailable = Boolean(selectedPage?.instagramId);
  const validation = check?.validation ?? null;
  const imageBlocking = validation?.issues.filter((issue) => issue.severity === "error") ?? [];
  const imageWarnings = validation?.issues.filter((issue) => issue.severity === "warning") ?? [];
  const captionChecks = useMemo(
    () => ({
      facebook: validateCaption(captions.facebook, ["facebook"]),
      instagram: validateCaption(captions.instagram, ["instagram"]),
    }),
    [captions],
  );
  const captionBlocking = platforms.flatMap((platform) =>
    captionChecks[platform].issues.filter((issue) => issue.severity === "error"),
  );
  const activeCaptionPlatform = platforms.includes(captionPlatform) ? captionPlatform : platforms[0] ?? "facebook";
  const activeCaption = captions[activeCaptionPlatform];
  const validationTargetsMatch = Boolean(
    check && check.platforms.length === platforms.length && check.platforms.every((platform) => platforms.includes(platform)),
  );

  const refreshStatus = async () => {
    statusReadyRef.current = false;
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
      statusReadyRef.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refreshStatus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      autoPublishHandledRef.current = null;
      setAutoPublishPending(false);
      return;
    }
    setResults([]);
    setPublishedTargets([]);
    setUncertainTargets([]);
    setNotice("");
    setConfirming(false);
    setPrepared(null);
    setAutoPublishPending(false);
    if (!draft) {
      setCaptions({ facebook: "", instagram: "" });
      setPlatforms(["facebook"]);
      setCaptionPlatform("facebook");
      setCheck(null);
      return;
    }

    const initialTargets: TargetPlatform[] = draft.platforms?.length
      ? [...draft.platforms]
      : ["facebook", "instagram"];
    setCaptions(draft.captions);
    setPlatforms(initialTargets);
    setCaptionPlatform(initialTargets[0] ?? "facebook");
    setCheck(null);
    let cancelled = false;
    void validateImageFile(draft.file, initialTargets)
      .then((next) => {
        if (!cancelled) setCheck({ file: draft.file, name: draft.file.name, platforms: [...initialTargets], validation: next });
      })
      .catch((error) => {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not validate the selected design.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, draft]);

  useEffect(() => {
    if (!open || loading || !status.connected || !selectedPage || selectedPage.instagramId || !platforms.includes("instagram")) return;
    const next = platforms.filter((platform) => platform !== "instagram");
    const targets: TargetPlatform[] = next.length ? next : ["facebook"];
    setPlatforms(targets);
    setCaptionPlatform(targets[0] ?? "facebook");
    setNotice("The selected Page has no linked Instagram professional account, so this post is set to Facebook only.");
  }, [open, loading, status.connected, selectedPage?.id, selectedPage?.instagramId, platforms, check]);

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
    if (next.length && !next.includes(captionPlatform)) setCaptionPlatform(next[0]);
    setResults([]);
    setNotice("");
    setConfirming(false);
  };

  const recheck = async (file: File, targets: TargetPlatform[]) => {
    try {
      const next = await validateImageFile(file, targets);
      setCheck({ file, name: file.name, platforms: [...targets], validation: next });
      setPrepared(null);
    } catch (error) {
      setCheck(null);
      setNotice(error instanceof Error ? error.message : "Could not validate the selected image.");
    }
  };

  useEffect(() => {
    if (!open || !check || !platforms.length || validationTargetsMatch) return;
    void recheck(check.file, platforms);
  }, [open, check, platforms, validationTargetsMatch]);

  const pickFile = async (file?: File | null) => {
    if (!file) return;
    setResults([]);
    setPublishedTargets([]);
    setUncertainTargets([]);
    setNotice("");
    setConfirming(false);
    setPrepared(null);
    try {
      const next = await validateImageFile(file, platforms);
      setCheck({ file, name: file.name, platforms: [...platforms], validation: next });
    } catch (error) {
      setCheck(null);
      setNotice(error instanceof Error ? error.message : "That file could not be read.");
    }
  };

  const selectPage = async (pageId: string) => {
    setStatus((current) => ({ ...current, selectedPageId: pageId }));
    setResults([]);
    setPublishedTargets([]);
    setUncertainTargets([]);
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
      setPublishedTargets([]);
      setUncertainTargets([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not disconnect the account.");
    }
  };

  const publishFile = async (image: File) => {
    if (!selectedPage || platforms.length === 0) return;
    setPublishing(true);
    setResults([]);
    setNotice("");
    try {
      const data = new FormData();
      data.append("image", image);
      // Keep `caption` for older PHP bundles; current hosting reads the separate
      // platform fields so Facebook and Instagram receive their own copy.
      data.append("caption", captions[platforms[0]]);
      data.append("facebookCaption", captions.facebook);
      data.append("instagramCaption", captions.instagram);
      data.append("pageId", selectedPage.id);
      platforms.forEach((platform) => data.append("platforms[]", platform));
      const response = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: data,
      });
      const body = await readJson(response, true);
      const nextResults = Array.isArray(body.results) ? (body.results as PostResult[]) : [];
      setResults(nextResults);
      setPublishedTargets((current) =>
        Array.from(new Set([...current, ...nextResults.filter((result) => result.success).map((result) => result.platform)])),
      );
      setUncertainTargets((current) =>
        Array.from(new Set([...current, ...nextResults.filter((result) => result.outcomeUnknown).map((result) => result.platform)])),
      );
      setNotice(body.message || `${body.category ? `${String(body.category).replaceAll("_", " ")} · ` : ""}${body.error || "Publishing finished."}`);
      setConfirming(false);
    } catch (error) {
      setUncertainTargets((current) => Array.from(new Set([...current, ...platforms])));
      const reason = error instanceof Error ? error.message : "Could not confirm this post's result.";
      setNotice(`${reason} Check the Page/Instagram account before retrying to avoid a duplicate.`);
    } finally {
      setPublishing(false);
    }
  };

  /** A selected design skips the extra review step; its one-click action posts
   * after account and media checks. Manual uploads retain explicit confirmation. */
  const requestPublish = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!check || !validationTargetsMatch || !selectedPage || platforms.length === 0) return;
    if (imageBlocking.length || captionBlocking.length) {
      setNotice("Fix the blocking image or caption issues above before publishing.");
      return;
    }
    if (platforms.some((platform) => publishedTargets.includes(platform) || uncertainTargets.includes(platform))) {
      setNotice("A selected target has already published this image or has an uncertain result. Deselect that target before retrying.");
      return;
    }
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setPreparing(true);
    setNotice("");
    try {
      const upload = await prepareImage(check.file, check.validation);
      const maxBytes = Math.min(...platforms.map((platform) => PLATFORM_RULES[platform].maxBytes));
      if (upload.size > maxBytes) {
        setNotice(`The prepared image is larger than ${formatBytes(maxBytes)}. Choose a smaller design.`);
        return;
      }
      setPrepared(upload);
      if (draft) await publishFile(upload);
      else setConfirming(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not prepare the image for upload.");
    } finally {
      requestInFlightRef.current = false;
      setPreparing(false);
    }
  };

  useEffect(() => {
    if (!open || !draft?.autoPublish || autoPublishHandledRef.current === draft) return;
    if (!statusReadyRef.current || loading || loadError || !status.connected || !selectedPage) return;
    if (selectedPage.tokenStatus !== "valid") {
      autoPublishHandledRef.current = draft;
      setNotice("The saved Meta Page needs attention before this design can be published. Reconnect or resolve and verify the Page, then return to the design and tap Publish now again.");
      return;
    }
    if (!platforms.length || (platforms.includes("instagram") && !instagramAvailable)) return;
    if (!check || check.file !== draft.file || !validationTargetsMatch) return;

    autoPublishHandledRef.current = draft;
    if (imageBlocking.length || captionBlocking.length) {
      setNotice("The selected design needs attention before it can be published. Fix the blocking issues below, then press Publish now.");
      return;
    }

    setAutoPublishPending(true);
    void (async () => {
      try {
        await requestPublish();
      } finally {
        setAutoPublishPending(false);
      }
    })();
  }, [
    open,
    draft,
    loading,
    loadError,
    status.connected,
    selectedPage,
    platforms,
    instagramAvailable,
    check,
    validationTargetsMatch,
    imageBlocking.length,
    captionBlocking.length,
    requestPublish,
  ]);

  /** Manual uploads retain a final confirmation before the real POST. */
  const publish = async () => {
    if (prepared) await publishFile(prepared);
  };

  const activeMaxCaption = PLATFORM_RULES[activeCaptionPlatform].captionLimit;
  const draftAutoPublishHandled = Boolean(draft?.autoPublish && autoPublishHandledRef.current === draft);
  const draftHasPublished = Boolean(draft?.autoPublish && publishedTargets.length > 0);
  const draftHasUncertain = Boolean(draft?.autoPublish && uncertainTargets.length > 0);
  const selectedProtectedTarget = platforms.some((platform) => publishedTargets.includes(platform) || uncertainTargets.includes(platform));
  const canPublish = Boolean(
    status.connected &&
      check &&
      validationTargetsMatch &&
      platforms.length &&
      selectedPage?.tokenStatus === "valid" &&
      !publishing &&
      !preparing &&
      !autoPublishPending &&
      !selectedProtectedTarget,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!publishing && !preparing && !autoPublishPending}
      size="md"
      icon={<Send className="h-4 w-4" />}
      eyebrow="Meta publishing"
      title="Publish from one place"
      description={draft ? `Ready to publish ${draft.sourceLabel}. The artwork and platform captions are loaded from your design.` : "Send a finished creative and caption to your Facebook Page, Instagram, or both."}
      footer={
        <>
          <span className="mr-auto max-w-[320px] text-[9.5px] leading-relaxed text-[#A2937D]">
            {draft?.autoPublish
              ? "The design-surface Publish now action sends this image immediately after the Page and image checks pass. This is not a draft or a schedule."
              : "Posts publish immediately when you choose Publish now — this is not a draft or a schedule."}{" "}
            Meta may reject content or require re-authorization; its response is shown below.
          </span>
          <Button variant="quiet" onClick={onClose} disabled={publishing || preparing || autoPublishPending}>
            Close
          </Button>
          {status.connected && !confirming ? (
            <Button
              variant="gold"
              type="submit"
              form="publisher-form"
              loading={publishing || preparing || autoPublishPending}
              disabled={!canPublish || imageBlocking.length > 0 || captionBlocking.length > 0}
              icon={<Send className="h-3.5 w-3.5" />}
            >
              {autoPublishPending || publishing ? "Publishing…" : preparing ? "Preparing…" : draftHasPublished ? "Published" : draft ? "Publish now" : "Review & publish"}
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
              {draft ? " Connect the Page once, return to your design, and press Publish again; Meta authorization leaves this screen." : ""}
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
                  disabled={preparing || autoPublishPending || publishing}
                >
                  {status.pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                      {page.instagramUsername ? ` · @${page.instagramUsername}` : ""}
                    </option>
                  ))}
                </Select>
                <a
                  href={preparing || autoPublishPending || publishing ? undefined : "/api/meta/connect"}
                  aria-disabled={preparing || autoPublishPending || publishing}
                  className={`btn btn-ghost btn-sm h-[38px] shrink-0 ${preparing || autoPublishPending || publishing ? "pointer-events-none opacity-50" : ""}`}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" /> Reconnect
                </a>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  disabled={preparing || autoPublishPending || publishing}
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
            {selectedPage?.pageIsPublished === false ? (
              <Callout tone="danger" title="This Facebook Page is unpublished">
                <p>Meta reports the Page is not published. Posts and photos are visible only to people with a role on the Page. Publish the Page from Meta Business Suite or Page settings, then refresh the connection.</p>
              </Callout>
            ) : null}
            <form id="publisher-form" onSubmit={requestPublish} className="space-y-5">
              <fieldset>
                <legend className="label">Post to</legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={platforms.includes("facebook")}
                    disabled={preparing || autoPublishPending || publishing}
                    onClick={() => togglePlatform("facebook")}
                    className={`choice inline-flex items-center gap-2 px-3 py-2 text-[11.5px] ${
                      platforms.includes("facebook") ? "choice-active" : ""
                    }`}
                  >
                    <Facebook className="h-3.5 w-3.5 text-[#9DB3D4]" aria-hidden="true" /> Facebook Page
                    {publishedTargets.includes("facebook")
                      ? " · published"
                      : uncertainTargets.includes("facebook")
                        ? " · verify result"
                        : ""}
                  </button>
                  <button
                    type="button"
                    aria-pressed={platforms.includes("instagram")}
                    disabled={!instagramAvailable || preparing || autoPublishPending || publishing}
                    onClick={() => togglePlatform("instagram")}
                    className={`choice inline-flex items-center gap-2 px-3 py-2 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
                      platforms.includes("instagram") ? "choice-active" : ""
                    }`}
                  >
                    <Instagram className="h-3.5 w-3.5 text-[#D0A8B8]" aria-hidden="true" /> Instagram
                    {instagramAvailable ? "" : selectedPage?.instagramStatus === "not_linked" ? " · not linked" : " · verify Page"}
                    {publishedTargets.includes("instagram")
                      ? " · published"
                      : uncertainTargets.includes("instagram")
                        ? " · verify result"
                        : ""}
                  </button>
                </div>
              </fieldset>

              {draft ? (
                <Callout
                  tone="quiet"
                  title={autoPublishPending ? "Publishing selected design" : "Artwork and captions loaded from your design"}
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                >
                  {autoPublishPending
                    ? "The one-click publish is in progress. The rendered image and platform-specific captions are being sent to the selected Facebook Page and linked Instagram target, where enabled."
                    : draftHasUncertain
                      ? "One or more platform results are uncertain. Verify targets marked ‘verify result’ before retrying; already-published targets marked ‘published’ cannot be sent again here."
                      : draftHasPublished
                        ? "At least one platform has published this design. Deselect any target marked published before retrying; this prevents accidental duplicate posts."
                        : draft.autoPublish
                        ? draftAutoPublishHandled
                          ? "The one-click attempt was blocked or returned an error. Review the status and any validation messages below before retrying."
                          : "Checking the saved Page, targets and rendered image. This one-click design action publishes immediately after those checks pass; no second confirmation is required."
                        : "Check the Page and targets, then press Publish now. The post goes live immediately."}
                </Callout>
              ) : null}
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_238px]">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="label mb-0">Platform captions &amp; hashtags</span>
                    {platforms.length > 1 ? (
                      <div className="flex gap-1.5">
                        {platforms.map((platform) => (
                          <button
                            key={platform}
                            type="button"
                            aria-pressed={activeCaptionPlatform === platform}
                            disabled={preparing || autoPublishPending || publishing}
                            onClick={() => setCaptionPlatform(platform)}
                            className={`chip ${activeCaptionPlatform === platform ? "chip-gold" : ""}`}
                          >
                            {platform === "facebook" ? "Facebook" : "Instagram"}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Textarea
                    label={activeCaptionPlatform === "facebook" ? "Facebook caption" : "Instagram caption"}
                    id={`post-caption-${activeCaptionPlatform}`}
                    value={activeCaption}
                    disabled={preparing || autoPublishPending || publishing}
                    onChange={(event) => {
                      setCaptions((current) => ({ ...current, [activeCaptionPlatform]: event.target.value }));
                      setConfirming(false);
                      setPrepared(null);
                    }}
                    maxLength={activeMaxCaption}
                    rows={7}
                    placeholder={`Write the ${activeCaptionPlatform === "facebook" ? "Facebook" : "Instagram"} caption…`}
                    hint={`${Array.from(activeCaption).length} / ${activeMaxCaption} characters · ${captionChecks[activeCaptionPlatform].hashtagCount} hashtags · first line ${captionChecks[activeCaptionPlatform].hookLength}`}
                  />
                  {captionChecks[activeCaptionPlatform].issues.length ? (
                    <div className="mt-1.5 space-y-1">
                      {captionChecks[activeCaptionPlatform].issues.map((issue) => (
                        <div
                          key={`${activeCaptionPlatform}-${issue.code}`}
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
                  {captionBlocking.length && !captionChecks[activeCaptionPlatform].issues.some((issue) => issue.severity === "error") ? (
                    <p className="mt-1.5 text-[10px] text-[#F0C3A2]">A selected platform’s caption has a blocking issue. Open its tab to review it.</p>
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
                      disabled={preparing || autoPublishPending || publishing}
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
                          disabled={preparing || autoPublishPending || publishing}
                          onClick={() => {
                            setCheck(null);
                            setPrepared(null);
                            setResults([]);
                            setPublishedTargets([]);
                            setUncertainTargets([]);
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

                      {[...imageBlocking, ...imageWarnings].map((issue, index) => (
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
                    {platforms.map((platform) => (
                      <li key={`caption-${platform}`}>
                        {platform === "facebook" ? "Facebook caption" : "Instagram caption"} · {Array.from(captions[platform]).length} characters
                      </li>
                    ))}
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
                          {result.success
                            ? ` · ${result.platform === "facebook" ? "Page feed post created" : "published"} (id ${result.id || "not returned"})`
                            : ` · ${result.error || "failed"}`}
                        </span>
                      </div>
                      {result.success && result.permalinkUrl ? (
                        <a
                          href={result.permalinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 ml-6 inline-flex items-center gap-1 font-semibold text-[#C7E5D5] underline decoration-[rgba(143,191,165,0.5)] underline-offset-2"
                        >
                          Open Facebook post <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : null}
                      {result.success && result.platform === "facebook" ? <FacebookVisibilityNote result={result} /> : null}
                      {!result.success && result.category ? <p className="mt-1.5 pl-6 text-[9.5px] uppercase tracking-wide">{result.category.replaceAll("_", " ")}</p> : null}
                      {!result.success && result.outcomeUnknown ? <p className="mt-1.5 pl-6 font-semibold text-[#F0C3A2]">Meta may have accepted content even though the result is not confirmed. Check the Page/Instagram account before retrying to avoid a duplicate.</p> : null}
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

export default Publisher;
