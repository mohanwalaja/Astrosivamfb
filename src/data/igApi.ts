/**
 * What the Instagram Platform can and cannot do, written down once.
 *
 * Everything here is either a documented limit or an explicit "not available",
 * so the studio never shows a button that quietly does nothing. The publishing
 * numbers Meta publishes disagree with each other, so the disagreement is
 * reproduced rather than smoothed over — and the app reads the account's real
 * quota from the API instead of trusting either number.
 *
 * Checked against Meta's Instagram Platform documentation on 26 Oct 2026.
 * Re-check quarterly: Graph versions are supported for about two years, and
 * this backend is pinned to v26.0.
 */

export const IG_API_SOURCES = [
  {
    label: "Content publishing (images, carousels, reels, stories)",
    url: "https://developers.facebook.com/docs/instagram-platform/content-publishing/",
  },
  {
    label: "IG User media reference (container parameters)",
    url: "https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media",
  },
  {
    label: "Content publishing limit endpoint",
    url: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit",
  },
];

export interface IgLimit {
  label: string;
  value: string;
  note?: string;
}

export const IG_LIMITS: IgLimit[] = [
  {
    label: "API-published posts",
    value: "Query it — do not hard-code it",
    note:
      "Meta's guide says 100 posts per rolling 24 hours; the same page's carousel section and the content_publishing_limit reference say 50. Read GET /{ig-user-id}/content_publishing_limit and use quota_total for the account you are posting from.",
  },
  { label: "Carousel size", value: "2 – 10 items", note: "Counts as one published post. Images, videos, or a mix." },
  {
    label: "Carousel crop",
    value: "All items crop to the first item",
    note: "Default 1:1 when the first item has no aspect ratio. Keep every slide 4:5 and the crop is predictable.",
  },
  { label: "Caption", value: "2,200 characters", note: "30 hashtags, 20 @mentions. Carousel captions go on the parent only." },
  { label: "Image upload", value: "JPEG only, up to 8 MB, 1440 px wide", note: "PNG is not accepted by the publishing API. Feed ratio 4:5 – 1.91:1." },
  { label: "Alt text", value: "1,000 characters", note: "Single images and images inside a carousel. Not Reels, not Stories." },
  { label: "Story", value: "One image or video, no caption", note: "No alt text, no tags, no location, no collaborators. Video ≤ 60 s, 100 MB." },
  { label: "Reel", value: "3 s – 15 min, 300 MB, 9:16", note: "Cover via cover_url or thumb_offset. Reels are video; a still image cannot be posted as a Reel." },
  { label: "Container lifetime", value: "24 hours", note: "An unpublished container expires; the app must publish at the chosen time." },
  { label: "Media source", value: "Public HTTPS URL", note: "Meta fetches the file itself. This backend writes the file to a temporary public path and deletes it after publishing." },
  { label: "Account type", value: "Business or Creator only", note: "Personal accounts cannot publish through the API." },
];

export type IgCapabilitySupport = "api" | "manual" | "none";

export interface IgCapability {
  task: string;
  support: IgCapabilitySupport;
  /** Endpoint, when the API can do it. */
  endpoint?: string;
  /** Why not, or what to do instead. */
  note: string;
  /** Where the person goes to do the manual version. */
  fallback?: string;
}

/**
 * "api"      — this workspace can or could call it
 * "manual"   — only in the Instagram app or Meta Business Suite
 * "none"     — not possible at all; do not design a workflow that assumes it
 */
export const IG_CAPABILITIES: IgCapability[] = [
  {
    task: "Publish a single image post",
    support: "api",
    endpoint: "POST /{ig-user-id}/media → POST /{ig-user-id}/media_publish",
    note: "JPEG only and the image must be at a public HTTPS URL. This app's publisher does exactly this, for the linked Instagram professional account.",
  },
  {
    task: "Publish a 2–10 item carousel",
    support: "api",
    endpoint: "Child containers (is_carousel_item=true) → parent (media_type=CAROUSEL) → media_publish",
    note: "Not wired into this app's publisher yet: it needs one upload per slide and a status poll per container. Export the slides here and post them from the app, or extend the PHP publisher.",
      fallback: "Instagram app · Meta Business Suite",
  },
  {
    task: "Publish a Reel",
    support: "api",
    endpoint: "media_type=REELS + video_url",
    note: "Video only. The cover can be set with cover_url — the Reel covers exported here are made for that field. A still image cannot be published as a Reel.",
  },
  {
    task: "Publish a Story",
    support: "api",
    endpoint: "media_type=STORIES + image_url",
    note: "Image or video, no caption, no alt text, no tags. Interactive stickers (link, poll, question) cannot be added through the API.",
  },
  {
    task: "Add a link, poll or question sticker to a Story",
    support: "manual",
    note: "Stickers are created inside Instagram. The story frames here leave a marked slot above the reply bar so the sticker has somewhere to go.",
    fallback: "Instagram app",
  },
  {
    task: "Set alt text on a feed image",
    support: "api",
    endpoint: "alt_text on the image container (≤ 1,000 characters)",
    note: "Single images and images inside a carousel only. Every feed entry in this studio ships ready-to-paste alt text.",
  },
  {
    task: "Set alt text on a Reel or Story",
    support: "none",
    note: "Meta excludes both. Write the description into the caption instead — captions are not used for Reels' alt text either, but they are read by screen readers in the app.",
  },
  {
    task: "Create or reorder Highlights, or set a cover",
    support: "none",
    note: "No Highlights API exists. Export the seven covers here and set them in the app; Instagram renders the label under the circle itself.",
    fallback: "Instagram app · profile → Highlights",
  },
  {
    task: "Change the profile photo, name, bio or link",
    support: "none",
    note: "The API is read-only for profile fields (has_profile_pic and profile_picture_url can be read). Copy the fields from this studio and paste them in the app.",
    fallback: "Instagram app · Edit profile",
  },
  {
    task: "Reorder the profile grid or pin a post",
    support: "none",
    note: "Grid order is chronological and pinning is app-only. The nine-post plan here is therefore a publishing order, not a layout you can impose later.",
  },
  {
    task: "Schedule a post",
    support: "manual",
    note: "There is no publish-time field, and containers expire after 24 hours, so the API cannot hold a post for later. Schedule in Meta Business Suite, or build a scheduler that publishes at the chosen minute.",
    fallback: "Meta Business Suite · Planner",
  },
  {
    task: "Add collaborators",
    support: "api",
    endpoint: "collaborators (up to 3) on feed, carousel and Reels containers",
    note: "Not supported on Stories.",
  },
  {
    task: "Tag people or a location",
    support: "api",
    endpoint: "user_tags · location_id",
    note: "Location is not supported on carousel items, and neither is available on Stories. Coordinates are required for user_tags.",
  },
  {
    task: "Post a first comment immediately",
    support: "none",
    note: "The API publishes the caption with the post; there is no atomic first-comment call. Add it in the app within the first minutes instead.",
    fallback: "Instagram app",
  },
  {
    task: "Read insights",
    support: "api",
    endpoint: "GET /{ig-media-id}/insights · /{ig-user-id}/insights",
    note: "Requires instagram_manage_insights. Not used by this studio, which deliberately shows no invented numbers.",
  },
  {
    task: "Reply to comments and DMs",
    support: "api",
    endpoint: "GET/POST /{ig-media-id}/comments · Messenger Platform for Instagram",
    note: "DM automation needs Instagram messaging permissions and only works inside the 24-hour messaging window or with a human-agent tag.",
  },
];

export const IG_PERMISSIONS = [
  { scope: "instagram_basic", why: "Read the professional account and its media." },
  { scope: "instagram_content_publish", why: "Create containers and publish them. Required for every post." },
  { scope: "instagram_manage_insights", why: "Read media and account insights. Optional; this studio shows no metrics without it." },
  { scope: "instagram_manage_comments", why: "Read and moderate comments. Optional." },
  { scope: "instagram_manage_messages", why: "Answer DMs from the Messenger Platform. Optional, for the DM playbook." },
  { scope: "pages_show_list", why: "List the Facebook Pages that own the linked Instagram account." },
  { scope: "pages_read_engagement", why: "Read the Page that the Instagram account is linked to." },
];

/** What this app's own publisher does today, stated plainly next to the rest. */
export const IG_PUBLISHER_COVERAGE = [
  {
    surface: "Feed image (single)",
    supported: true,
    note: "Facebook and the linked Instagram account, JPEG, via /api/meta/publish.",
  },
  {
    surface: "Carousel",
    supported: false,
    note: "Export the slides here; publishing needs a multi-file backend.",
  },
  {
    surface: "Reel",
    supported: false,
    note: "Needs video hosting and a REELS container; the cover is exported here for cover_url.",
  },
  {
    surface: "Story",
    supported: false,
    note: "Stories need STORIES containers; the frames are exported here with the sticker slot marked.",
  },
  {
    surface: "Highlight covers",
    supported: false,
    note: "No API at all. Export and set them in the app.",
  },
];

/** Meta's media specifications, per surface. */
export const IG_MEDIA_SPECS = [
  {
    surface: "Feed portrait",
    px: "1080 × 1350",
    ratio: "4:5",
    formats: "JPEG",
    notes: "Tallest shape in the feed. 1440 px is Meta's maximum width; anything larger is downscaled.",
  },
  {
    surface: "Feed square",
    px: "1080 × 1080",
    ratio: "1:1",
    formats: "JPEG",
    notes: "The grid thumbnail crops a 4:5 post to the centre square, so keep the headline inside it.",
  },
  {
    surface: "Carousel slide",
    px: "1080 × 1350",
    ratio: "4:5",
    formats: "JPEG",
    notes: "2–10 slides; every slide crops to the first. Keep all slides the same ratio.",
  },
  {
    surface: "Story",
    px: "1080 × 1920",
    ratio: "9:16",
    formats: "JPEG · MP4/MOV",
    notes: "Top 250 px and bottom 340 px are Instagram UI. Video ≤ 60 s, 100 MB.",
  },
  {
    surface: "Reel cover",
    px: "1080 × 1920",
    ratio: "9:16 (1:1 in the grid)",
    formats: "JPEG",
    notes: "Set with cover_url. Only the centre 1080 × 1080 appears in the profile grid.",
  },
  {
    surface: "Highlight cover",
    px: "1080 × 1080",
    ratio: "1:1",
    formats: "JPEG",
    notes: "Displays at about 64 px in a circle. Symbol only — Instagram draws the label.",
  },
  {
    surface: "Profile photo",
    px: "320 × 320 minimum",
    ratio: "1:1",
    formats: "JPEG",
    notes: "Shown at 110 px on the profile and 32 px in comments. Uploaded in the app, not the API.",
  },
];
