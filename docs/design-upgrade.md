# Poster Studio design upgrade — audit and implementation

This records the audit of the original creative app, the root causes of the repetitive output,
and the working replacement that now ships in the Poster Studio. It is an implementation note,
not a proposal: every item below is in the source and covered by a test or a real render.

## 1. What the audit found

The original studio exposed eight templates, but in practice roughly nine out of ten generated
posters looked the same. The causes were structural, not cosmetic:

- **One shared skeleton.** Every template painted the same vertical stack — art on top, a centred
  kicker/headline/subline block, a CTA pill and a footer. Changing the template mostly changed the
  frame, the palette and the ornament, not the composition.
- **Layout was chosen by format, not by content.** `templateForLayout` mapped a format to a single
  template, so a category always landed on the same arrangement regardless of occasion or copy.
- **No memory.** Selection had no history, so the same layout could repeat indefinitely.
- **Shared decorative vocabulary.** Mandalas, gold frames and glows were applied across categories,
  which made a wedding card, a navagraha card and a festival card read as one brand of ornament.
- **Multilingual copy on the canvas.** Tamil and Hindi lines were drawn into the poster, which
  crowded the layout and produced inconsistent mobile legibility.
- **Fixed type sizes.** Several painters hard-coded pixel sizes, so the same composition broke or
  shrank unpredictably across portrait, square, landscape, story and A4.

The fix had to change *structure*, not add more skins.

## 2. The new engine

Four small, pure modules replace the shared skeleton:

| Module | Responsibility |
| --- | --- |
| `src/data/designBriefs.ts` | Seven category identities, 21 occasion briefs, 12 composition metadata records, category weights, occasion art overrides and six curated palettes. |
| `src/lib/compositionPlan.ts` | Pure geometry: safe areas, art shapes, text boxes and scene layers for each of the 12 systems × portrait/square/landscape/story. No drawing. |
| `src/lib/compositionRender.ts` | Twelve separate painters. A measured binary-search fitter sizes every line, records an audit, and **throws** rather than clip or drop copy. |
| `src/lib/designSelector.ts` | Deterministic scored selection with localStorage history. Hard-excludes the previous composition and any family already used twice consecutively. |

Supporting modules:

- `src/lib/englishCopy.ts` — strips Tamil/Hindi and validates poster copy at every canvas boundary.
- `src/lib/motion.ts` — a 15 s / 30 fps layered timeline (parallax, orbits, particles, one light
  sweep, per-line type reveals, late CTA) that settles into the exact static composition.
- `src/lib/reel.ts` — records the layered motion at the selected format, MP4-first, releases every
  layer canvas on success and on failure.
- `src/components/CompositionGlyph.tsx` — an SVG wireframe of each system for the picker.

### The twelve systems

Hero illustration, type-led editorial, asymmetric luxury, mandala centrepiece, diagonal geometry,
cosmic astrology, split screen, illustrated story, minimal luxury, infographic, layered collage and
cinematic devotional. They differ in art placement, headline/service/supporting hierarchy,
decoration, background, logo position, CTA and negative space — not just colour. Each has its own
painter function and its own geometry signature; a test asserts all twelve signatures are distinct
in every format.

### Category identity

Each category carries its own default palette, art direction, display face and vector fallback:
Birth Jathagam (midnight atlas), Wedding Matching (rose & sandstone), Baby Naming (ivory),
Subha Muhurtham (terracotta), Navagraha (cosmic), Festival (deep red) and a refined, respectful
Murugan devotional (emerald). Artwork is text-free digital illustration — no photorealism, no
cartoons, no clipart, no fake writing inside the image.

## 3. English-only enforcement

`englishCopy`/`englishText`/`validatePosterCopy` are imported by the poster renderer, the state
migration, the studio and all five other canvas engines (Facebook, Instagram, service ads,
templates, festival cards). The language selectors were removed from Service Ads, Festival Wishes
and the Export Center. Caption and service-record data that legitimately stores Tamil/Hindi is
untouched; only the *canvas* is English-only. A test renders every system and fails if any Indic
codepoint reaches the text audit.

## 4. Legibility and safe zones

The fitter enforces mobile floors at a 360 px reading column: headline ≈ 16 px, body ≥ 11 px,
kicker ≥ 8.5 px, footer ≥ 8 px, CTA ≥ 11.5 px effective. The planner keeps the CTA above the footer
band and clamps body height so blocks cannot overlap. `getDesignAudit` reports per-line bounds,
overflow and a legibility verdict; the render throws on overflow so a broken card is never exported.

## 5. Verification (all real, all passing)

- `npm run lint` — clean.
- `npm test` — **218 pass, 0 fail, 1 skipped** (219 total). Includes new `tests/design-engine.test.ts`:
  distinct geometry, selector no-repeat/family rules, determinism, English-only contract, legacy
  migration, every system × four formats readable/safe/non-overlapping, motion settles into the
  static PNG, global-placement logo survives motion, and rejected layered renders release canvases.
- `npm run build` — production bundle builds.
- `npm run samples` — 10 legacy posters (8 templates + story + A4).
- `npm run audit:export` — every export pack renders, decodes, no dupes/empty/CRC errors, no findings.
- `npx tsx tools/design-samples.mjs` — **36 posters, 0 failures**: 24 category/occasion/format proofs
  plus one per composition system, with `audit.json` and two contact sheets.
- `node tools/browser-audit.mjs` — **14/14 checks** in bundled Chromium on desktop (1440×900) and
  Android (393×851): composition picker present, no language selector, no horizontal overflow,
  preview canvas paints, real PNG download, real motion download, no page errors.
- `node tools/verify-video.mjs` — the exported MP4s decode in the browser engine at 1080×1350,
  H.264 (`avc1`), with real frame-to-frame variance (not a frozen image).

## 6. What was preserved

Authentication, Meta publishing connections, the export library, ZIP packs, the deity library,
uploads, the other creative suites and the eight legacy templates all still work. The legacy
`cinematic` alias still migrates to `nocturne`; the new devotional system is a separate key, so old
saved presets are not silently reinterpreted. Video publishing still accepts images only, so the
motion file is downloaded for manual upload — the Meta integration is unchanged.

## 7. Known limits

- MediaRecorder duration metadata in the headless software encoder reads a few seconds short of the
  15 s wall-clock recording; the frame count (450) and content are correct. Hardware-encoded browsers
  report the full duration.
- The motion preview and export require a browser with canvas capture + MediaRecorder (Chrome, Edge,
  Firefox, modern Safari). The studio detects support and disables the button with a reason otherwise.
