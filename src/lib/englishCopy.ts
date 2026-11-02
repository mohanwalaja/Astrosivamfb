/** English-only canvas contract. Never transliterate or invent a translation. */
const NON_ENGLISH = /[\u0900-\u097F\u0B80-\u0BFF\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g;
export function englishText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(NON_ENGLISH, "").replace(/[ \t]+/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/^[\s·|–—-]+|[\s·|–—-]+$/g, "").trim();
}
export function hasNonEnglishText(value: string): boolean {
  const clean = value.replace(NON_ENGLISH, "");
  return clean !== value;
}
export interface EnglishCopyInput {
  kicker?: string; headline?: string; subline?: string; cta?: string; footer?: string;
  serviceTitle?: string; tamil?: string; hindi?: string; facts?: string[];
}
/** Legacy Tamil/Hindi fields are intentionally discarded, not placed in a hidden layer. */
export function englishCopy<T extends EnglishCopyInput>(copy: T): T {
  return { ...copy,
    kicker: englishText(copy.kicker), headline: englishText(copy.headline), subline: englishText(copy.subline),
    cta: englishText(copy.cta), footer: englishText(copy.footer), serviceTitle: englishText(copy.serviceTitle),
    tamil: "", hindi: "", facts: (copy.facts ?? []).map(englishText).filter(Boolean).slice(0, 3),
  };
}
export function validatePosterCopy(copy: EnglishCopyInput): string[] {
  const errors: string[] = [];
  if (!englishText(copy.headline)) errors.push("Add an English headline.");
  if (!englishText(copy.serviceTitle ?? copy.kicker)) errors.push("Add an English service title or kicker.");
  for (const [name, value] of Object.entries({ Headline: copy.headline, Subline: copy.subline, Service: copy.serviceTitle, Kicker: copy.kicker, CTA: copy.cta, Footer: copy.footer })) {
    if (value && hasNonEnglishText(value)) errors.push(`${name} contains non-English text. Posters use English only.`);
  }
  return [...new Set(errors)];
}
