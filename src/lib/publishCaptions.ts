import { STYLE_TAG_SETS } from "../data/brand";
import type { Service, StyleKey } from "../types";
import { fbCaption, igCaption } from "./packs";
import type { PlatformCaptions } from "./publishContext";

const TAG_PATTERN = /#[\p{L}\p{N}_]+/gu;

/** Replace any trailing tag block with a unique, bounded set for that platform. */
export function withHashtags(caption: string, tags: string[], limit = 30): string {
  const body = caption.trim().replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, "").trim();
  const unique = [...new Set(tags.map((tag) => tag.trim()).filter((tag) => /^#[\p{L}\p{N}_]+$/u.test(tag)))].slice(0, limit);
  const trailing = unique.join(" ");
  return [body, trailing].filter(Boolean).join("\n\n");
}

export function servicePublishCaptions(service: Service, style?: StyleKey): PlatformCaptions {
  const styleTags = style ? STYLE_TAG_SETS[style] : [];
  return {
    facebook: withHashtags(fbCaption(service), [...service.fb.hashtags.slice(0, 3), ...styleTags.slice(0, 2)], 5),
    instagram: withHashtags(
      igCaption(service, false),
      [...service.ig.hashtags, ...styleTags, ...service.ig.extendedHashtags],
      30,
    ),
  };
}

/** Read existing hashtags from a caption; used by tests and caption previews. */
export function countHashtags(caption: string): number {
  return (caption.match(TAG_PATTERN) ?? []).length;
}

export function brandPostCaptions(body: string): PlatformCaptions {
  const clean = body.trim();
  return {
    facebook: withHashtags(clean, ["#AstroSivam", "#VedicAstrology", "#TamilAstrology"], 5),
    instagram: withHashtags(clean, ["#AstroSivam", "#VedicAstrology", "#Jyotish", "#TamilAstrology", "#TamilCulture"], 12),
  };
}
