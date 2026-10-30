# Multilingual rendering audit — English, Tamil, Hindi

Scope: every surface the studio draws type on. UI headings, body copy, captions,
canvas previews and exported PNGs, in `en`, `ta`, `hi` and a mixed/stress string.

Everything below is measured, not asserted. Two harnesses produce the numbers:

```bash
npx tsx tools/textmatrix.mjs --engine=fb|ig|ads|fest|templates|long   # canvas engines
npx tsx tools/dom-multilingual.mjs                                   # UI screens, jsdom
npx tsx --test tests/multilingual.test.ts                          # primitives + CSS
```

The canvas harness wraps the 2D context, records every `fillText`/`strokeText`
with the font, alignment and transform that were live at the time, replays each
string alone on a scratch canvas and reads its **ink box from pixels**. That is
what makes the clipping, overlap and safe-area findings real rather than
estimated from `measureText`.

## Coverage

| Engine | Surfaces rendered | Strings |
| --- | --- | --- |
| Facebook suite | 5 layouts × en/ta/hi/mixed | 20 |
| Instagram suite | 7 layouts × en/ta/hi/mixed | 28 |
| Service ads | 8 compositions × en/ta/hi | 24 |
| Festival cards | 4 style families × 2 formats × en/ta/hi | 24 |
| Poster templates | 8 art directions × en/ta/hi | 24 |
| Hostile copy | 1 render per engine: 38-character unbroken Tamil word, Devanagari compound, `“ ” — ( ) … ₹`, two paragraphs | 5 |

**125 renders**, 1080 px wide (1640 for the cover), total **5,912 drawn strings**.
Copy matrix per render: short kicker, headline, long body, chips/facts, price,
CTA and footer, plus an empty-script control.

## Canvas results

| Script | Renders | Missing glyphs (tofu) | Clipped | Text overlaps | Outside safe area |
| --- | --- | --- | --- | --- | --- |
| English | 36 | 0 | 0 | 0 | 0 |
| Tamil | 36 | 0 | 0 | 0 | 0 |
| Hindi | 36 | 0 | 0 | 0 | 0 |
| Mixed | 12 | 0 | 0 | 0 | 0 |
| Hostile copy (`long`) | 5 | 0 | 0 | 0 | 0 |

Ink measured against the baseline (the number that decides line spacing):

| Script | Tallest ink above baseline | Deepest ink below baseline |
| --- | --- | --- |
| Latin | 0.90 em | 1.10 em |
| Devanagari | 1.00 em | 1.15 em |
| Tamil | 1.00 em | **1.32 em** |
| Hostile copy | 0.93 em | **1.36 em** |

Every engine's line advance had to clear 1.32 em for Tamil; the audit found
several places advancing by a flat 1.06–1.14 em, which is why the same block was
clean in English and collided in Tamil.

### Ink width vs reported advance

Worst `ink width / measureText advance` across all 125 renders: **1.15**. A
ratio near 1 means the width a painter budgeted matches the width that appears
on the card. Before this pass the poster templates measured a headline in one
face and painted it in another, which showed up as 1.4+ here.

## UI results (jsdom, real components)

| Screen | Indic runs found | Marked with `lang` + script face | Unmarked | Inherited tracking |
| --- | --- | --- | --- | --- |
| Instagram · Profile | 4 | 4 | 0 | 0 |
| Instagram · Feed posts | 3 | 3 | 0 | 0 |
| Service posts | 8 | 8 | 0 | 0 |
| Festival wishes | 23 | 23 | 0 | 0 |
| Service ads | 4 | 4 | 0 | 0 |

42 Indic text runs, **0 unmarked**, **0** carrying letter-spacing, **0 console
errors**. An unmarked run is the failure mode that matters in the browser: the
Latin stack has no Tamil or Devanagari glyphs at all, so the string falls back to
a system face with different metrics, and any tracking on the container is
applied to that substitution.

## Defects found and fixed

**Missing glyphs.** Two causes, both fixed by naming the faces the studio ships:

- Canvas stacks named no Indic family. Tamil and Devanagari were drawn by
  whatever the OS provided (Node drew `.notdef` boxes). Every stack in
  `src/lib/canvas.ts` now ends in Tiro Tamil → Noto Sans Devanagari → Baloo
  Thambi 2 → generics, and `src/index.css` mirrors that for DOM text.
- ASCII punctuation (`. , · — – “ ” ( )`) lives in the *Latin* half of each
  script family, not the Tamil/Devanagari subset. The Node sample renderer keeps
  one face per family name, so a Tamil sentence lost its full stop; the halves
  are registered as `"Tiro Tamil Latin"` etc. and named in the stacks. The
  browser resolves the same characters by `unicode-range` and ignores the twin
  names.

**Font loading before measurement.** `ensureFonts()` now probes per family ×
weight × script — `document.fonts.load` only fetches faces whose `unicode-range`
matches the sample text, so a Latin probe never downloads the Tamil subset. All
five async renderers await it before creating a canvas; `renderStylePost` is
synchronous but only reachable through `renderCreative`, which awaits first. If
a face never arrives, rendering proceeds after a 4 s timeout rather than hanging.

**Wrong measurements.**

- `fitLines` could step below its start size to make lines fit, but three call
  sites in the Instagram engine painted at the original size. Result: text
  measured at 30 px and drawn at 34.5 px, 9 % wider than its column. All three
  now draw at the returned size.
- `fitLine` (new) budgets the tracking a line will actually carry, and skips it
  for Indic text, matching what the painter does.
- `wrapLines`/`wrapBalanced`/`fitHeadline` measured with whatever font happened
  to be on the context. They now route through `wrapAll`, which is always called
  with the face set, and the posters' `wrapAll(...).slice(0, n)` — which cut
  paragraphs with no ellipsis — became `wrapClip`, which marks the cut.

**Wrapping.** A Tamil place name or Hindi compound longer than the column ran
under the artwork; `breakWord` splits it at a cluster boundary (never between a
letter and its vowel sign, never inside a conjunct), and `wrapAll` preserves
paragraph breaks. `ellipsize` trims whole clusters, so a shortened line cannot
end in a bare vowel sign (a dotted circle).

**Clipping.** Two causes: the paragraph that could not fit (above), and the CTA
in the reel cover drawn at a size the two-line wrap had already stepped below.
Both fixed; `fitLines` gained an opt-in `clip` flag for body copy in a fixed
card — headlines never lose words, body copy is ellipsised rather than painted
through the footer.

**Overlap.**

- Festival greetings advanced at a flat `size × 1.24`. Tamil reaches 1.32 em
  below the baseline, so the second line collided with the first. All five
  headline blocks in `stylePosts.ts` and the story/carousel blocks in
  `igCreative.ts` now use `lineHop`/`leadOffsets`, which floor the advance at
  1.46 em for Indic runs.
- The editorial backdrop's brass bar sat exactly on the kicker's cap line; Tamil
  ascenders are taller than Cinzel caps, so a Tamil kicker ran into the bar. The
  bar moved up 1.3 % of the height and the kicker down 0.6 %.
- Festival cards printed the brand line twice when the footer was set to the
  site's own words.

**Sizing consistency.** Script faces were not consistently applied: the Hindi
field in the festival editor used an inline `font-family`, the education chip
used `slice(0, 12)` on UTF-16 units (which can cut a vowel sign). Both now use
the shared stacks; the chip measures and ellipsises instead.

**Safe areas.** The harness checks text against the layout's own crop guide
where one exists, otherwise a 1 % bleed tolerance, plus the Stories UI bands
(top 14 %, bottom 14 %). Result: 0 outside on all 125 renders. Crop guides
(profile circle, 640 × 360 banner crop) are deliberately *not* treated as text
bounds — text outside a crop guide is allowed to be cropped, that is what the
guide describes.

## Known limitations, stated rather than hidden

- The poster templates ship 10–12.7 px micro-labels (`FIG. 01 — THE CHART`) that
  are below the 8 CSS px mobile floor at 360 px. They are ornamental index marks,
  identical in all three scripts, and predate this audit; they were not enlarged
  because it would change the poster typography rather than fix a script bug.
- `ig-highlights` draws no type by design (Instagram supplies the label), so it
  contributes 0 strings to the matrix.
- `tools/textmatrix.mjs --engine=all` runs every engine in one process and exhausts
  memory; run the engines individually.
- The DOM audit runs in jsdom, which has no layout engine: it can prove markup
  (`lang`, font classes, tracking) but not pixel overflow. `FbComposer` and
  `PosterStudio` draw one canvas into another and cannot be mounted there; their
  canvas output is covered by the engine matrix instead.
- Two scripts are shipped (Tamil, Devanagari). A third would need a family, a
  unicode-range split and a probe in `ensureFonts` — the harness would catch the
  gap, but nothing falls back silently today.
