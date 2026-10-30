# Export pipeline audit

Scope: every file the studio hands to the browser — the 18 creative formats, the
5 Facebook layouts, 7 Instagram layouts, 8 ad plates, 4 festival card sizes, the
five ZIP packs, the copy files, the poster reel, uploads and the export library.

Two reproducible entry points:

```bash
npx tsx tools/export-audit.mjs --json   # renders, measures, writes .samples/export-audit/report.json
npm test                                # includes tests/export-pipeline.test.ts
```

The audit renders every surface through the real painters (Node canvas / Skia
shim in `tools/canvas-env.mjs`), parses the PNG chunk stream, inflates the IDAT
data and checks it against the header, then builds each ZIP and reads it back
entry by entry — CRCs, offsets, byte-for-byte contents — the way an extractor
does. The browser-only paths (download anchors, object URLs, uploads) are covered
by `tests/export-pipeline.test.ts` with a minimal DOM stub.

---

## 1. Do the exports match the previews?

Yes — and this was the one finding that had to be settled with evidence rather
than opinion. Comparing a full-size export with the same design rendered at the
360 px preview scale shows a 3.7–8.0 % pixel difference. Blurring both sides by
1.5 px before comparing collapses that difference, and the *text anchors* — the
position and size of every `fillText` call, normalised to the canvas — are
identical to **0.00 %** on all 18 formats:

| format | pixels | export | Δ at 360 px | Δ after 1.5 px blur | text drift |
| --- | --- | --- | --- | --- | --- |
| fb-profile | 1080×1080 | 262 KB | 4.82 % | 0.15 % | 0.00 % |
| ig-profile | 1080×1080 | 262 KB | 4.82 % | 0.15 % | 0.00 % |
| fb-cover | 1640×624 | 245 KB | 7.37 % | 1.33 % | 0.00 % |
| fb-cover-statement | 1640×624 | 240 KB | 7.85 % | 3.04 % | 0.00 % |
| link-card | 1200×630 | 193 KB | 5.66 % | 1.56 % | 0.00 % |
| fb-post | 1200×1500 | 666 KB | 7.53 % | 2.18 % | 0.00 % |
| ig-post | 1080×1350 | 583 KB | 7.25 % | 1.93 % | 0.00 % |
| ig-square | 1080×1080 | 501 KB | 8.04 % | 1.98 % | 0.00 % |
| ig-carousel | 1080×1350 | 376 KB | 6.05 % | 0.32 % | 0.00 % |
| ig-story | 1080×1920 | 427 KB | 3.77 % | 0.44 % | 0.00 % |
| fb-story | 1080×1920 | 427 KB | 3.77 % | 0.44 % | 0.00 % |
| ig-reel-cover | 1080×1920 | 413 KB | 3.70 % | 0.45 % | 0.00 % |
| ig-highlights | 1080×1080 | 261 KB | 4.50 % | 0.13 % | 0.00 % |
| panchangam-card | 1080×1350 | 311 KB | 5.14 % | 1.16 % | 0.00 % |
| quote-card | 1080×1350 | 340 KB | 4.56 % | 0.31 % | 0.00 % |
| offer-card | 1080×1350 | 367 KB | 5.45 % | 1.88 % | 0.00 % |
| style-sheet | 2000×2100 | 1928 KB | 6.13 % | 1.41 % | 0.00 % |
| review-card | 1080×1350 | 294 KB | 4.43 % | 0.67 % | 0.00 % |

The pixel difference is ordinary resampling of fine art and antialiased type, not
a layout that moves between scales. The audit now reports those two numbers
separately and only raises a defect when the anchor drift or the blurred delta
crosses the threshold.

## 2. Every render: correct size, opaque, not blank

42 renders (18 formats + 5 FB + 7 IG + 8 ads + 4 festival cards). All 42:

- match the format's declared pixels exactly (PNG IHDR = canvas = format record);
- declare a ratio that matches width ÷ height within 0.02 (`fb-cover` 2.63:1 etc.),
  so nothing is stretched;
- are **0 % transparent** — a full-bleed card never exports a hole;
- are **not blank**: luminance standard deviation 24.7–76.1 and 1 810–5 000 distinct colours (the
  sampler stops counting at 5 000), so no frame is flat or black;
- are a complete PNG: signature, 13-byte IHDR, IDAT that inflates to
  `height × (1 + width × channels)` bytes, and an IEND chunk;
- are not unexpectedly compressed: 116 KB – 1 928 KB of PNG for the pixel counts
  involved (a flat frame of that size would be a few KB).

## 3. Packs: files, CRCs and progress

| pack | files | images | PNGs re-decoded | size | duplicate names | empty files | ZIP read-back | progress |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| brand | 14 | 13 | 13 | 4.99 MB | 0 | 0 | CRC + bytes OK | 14/14 |
| service | 19 | 17 | 17 | 6.36 MB | 0 | 0 | CRC + bytes OK | 19/19 |
| festival | 5 | 4 | 4 | 2.27 MB | 0 | 0 | CRC + bytes OK | 5/5 |
| festival-year | 53 | 52 | 40 | 24.98 MB | 0 | 0 | CRC + bytes OK | 53/53 |
| styles | 21 | 21 | 21 | 10.12 MB | 0 | 0 | CRC + bytes OK | — |

Read-back means: end-of-central-directory found, entry count matches, every local
header at its recorded offset, UTF-8 flag set, CRC32 recomputed from the stored
bytes, and the bytes compared with the file the builder produced.

## 4. Captions and hashtags

Every service's Facebook and Instagram caption is checked against the limits the
platform documents: Instagram ≤ 2 200 characters, ≤ 30 hashtags, no runaway blank
lines, Facebook non-empty and under the post limit. All seven services pass, and
`tests/export-pipeline.test.ts` keeps them there.

## 5. Uploads

`checkUploadFile` runs before any decode, so a renamed script, an empty file, an
SVG or a 12 MB+ image is refused with a specific sentence instead of freezing the
tab. Decoded bitmaps are released (`img.src = "data:,"` + `close()`), and a
60-megapixel ceiling stops decompression bombs from being painted.

| case | result |
| --- | --- |
| real PNG | accepted |
| PHP source renamed `.png` | refused — "not an image this browser can open" |
| empty file | refused — "that file is empty" |
| SVG | refused — the same "not an image this browser can open" message |
| `UPLOAD_MAX_BYTES + 1` | refused — names the size and the limit |

## 6. Downloads, object URLs and memory

- Every browser download now goes through one helper (`saveBlob` /
  `downloadCanvas` / `downloadZip`). Object URLs are tracked, revoked on a timer,
  and can be flushed in one call (`revokePendingObjectUrls`). Measured: 2 created,
  2 revoked, 0 open after the audit's saves.
- Blank file names can no longer reach the anchor (they become `astrosivam-export`).
- Encoding failures now say *why*: no pixels, a browser encode failure, or a
  tainted/oversized canvas, each with a different instruction.
- Memory: three service packs in a row grow the heap by +2.1 / +1.7 / +0.4 MB —
  flat, not cumulative.
- The festival-year pack used to hold 53 full canvases alive while building a
  25 MB archive: **+292.6 MB RSS**. Each canvas is now released as soon as its PNG
  bytes exist (`releaseCanvas` / `canvasToBytesAndRelease`). Same pack now:
  **+2.1 MB RSS, +0.5 MB heap** for 25.0 MB of PNG → 25.0 MB ZIP.

---

## Defects found and fixed

1. **The 2000×2100 style sheet threw on export.** `styleArt.ts` read gradients
   back off `ctx.fillStyle`; Skia rejects that ("Get shader of linear gradient
   failed"), so the contact sheet never rendered. Gradients are now held in
   locals (three sites).
2. **The service pack shipped duplicate file names.** Names were
   `${service}_${W}x${H}` and `fb-post`/`ig-square` (both 1200×1500) plus
   `ig-story`/`fb-story`/`ig-reel-cover` (all 1080×1920) collided — 6 of 19
   entries. Extractors silently drop the later file. Every name now carries the
   format id, and `buildZip` de-duplicates defensively (`uniqueFileNames`).
3. **Non-Latin headlines produced `__` in file names.** `slugify()` returned an
   empty string for Tamil, Hindi, blank and punctuation-only input. It now folds
   accents, keeps `fallback`, and otherwise emits a stable fingerprint
   (`item-1gmjorp`); `exportFileName` drops empty fragments so no `__` can appear.
   The panchangam download also stopped using a raw place name (which may contain
   `/`) as part of the file name.
4. **Progress never reached 100 %** on the festival pack (4/5) and the year pack
   (52/53) because the caption/calendar file was appended without reporting. Both
   now report their final step, and `ExportProgress` clamps a bad count instead of
   painting 130 %.
5. **The download path was duplicated in four components** (library re-download,
   poster reel, and the anchor logic in Export Center). All of it goes through
   `saveBlob`, so URLs are tracked and revoked in one place.
6. **The year pack kept every canvas alive** (see §6) — a real risk on phones.
7. **Uploads were unchecked** — no type, size or pixel guard, and the decoded
   image was never released.
8. **Export Center advertised "13 files"** for a 14-file brand pack; counts now
   come from the pack builder itself.
9. **Generic failure toasts** ("Pack export failed") now include the reason and
   the archive size, e.g. `Brand pack failed — <cause>`, and success messages
   quote files + MB.

## Tests added

`tests/export-pipeline.test.ts` — 14 tests, ~6 s:

- slugify/`exportFileName` behaviour (Tamil, Hindi, accents, blank, 400-char input);
- pack file names are unique, safe and carry exact pixels (all 7 services, brand pack);
- `uniqueFileNames` renames only genuine repeats;
- a built ZIP parses, every entry's CRC matches, bytes round-trip, UTF-8 flag set,
  empty packs are refused, duplicates are renamed inside the archive;
- a download creates exactly one object URL and revokes it; pending URLs can be flushed;
- all 18 formats export at exact size, declared ratio, 0 % transparency, non-blank,
  valid PNG, > 20 KB;
- festival card sizes and pack names;
- caption/hashtag limits for all services;
- upload guards (good PNG, renamed text, empty, oversize) and that the guard runs
  before decode;
- every render entry point awaits `ensureFonts()`;
- every declared safe area fits inside its canvas.

## Limitations

- The audit renders through `@napi-rs/canvas` (Skia) in Node. It reproduces the
  layout, gradients, art and PNG encoding, but it is not the browser's rasteriser:
  sub-pixel antialiasing can differ slightly from Chrome. The browser-only paths
  (MediaRecorder reel, `blob:` downloads) are exercised with stubs, not in Safari
  or on a phone.
- The 15-second poster reel needs `MediaRecorder` and a visible tab; it cannot be
  recorded headlessly, so it was verified by code path and by its PNG thumbnail,
  not by encoding a video.
- Publishing to Meta is not exercised (no credentials in development). Captions,
  hashtags and alt limits are checked against the documented API limits, not
  against a live publish.
- The festival-year archive is still assembled in memory (25 MB of PNG, then a
  25 MB Blob). With canvas release the peak cost is small, but on a very
  low-memory phone the per-festival packs are the safer download.
- The ZIP writer is store-only (no deflate): files are larger than they could be,
  but every archive is valid, CRC-checked, and extracted byte-for-byte in the audit.
