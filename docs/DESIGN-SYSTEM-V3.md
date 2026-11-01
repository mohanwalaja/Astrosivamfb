# Astrosivam Poster Suite — v3 design system

**Status:** implemented, tested and rendered. This document is the completion
report: what changed, what was verified, what it produces, and what remains.

Everything below was produced by running the code in this repository — the
sample sheets in `docs/samples/` are real output from `npm run samples:v3`, not
mockups.

---

## 1. What changed, in one paragraph

The suite used to paint **one layout with eight recolours**: logo + wordmark at
the top, a photographic deity plate, one copy block, a CTA pill and a footer.
That single skeleton is now a design system of **15 independent page
architectures**, **15 background architectures**, **20 illustration programs**,
**10 palettes**, **5 typefaces**, **3 decoration levels**, **7 motion presets**
and **5 formats** — combined by a selection engine that treats the design as a
tuple and the studio as eight independent locks. Nothing is photo-real: the
artwork is vector-drawn (emblems, charts, celestial scenes, seals, letter
plates), so it stays sharp from a 190 px thumbnail to an A4 sheet.

---

## 2. Changed files

### New — the design system (`src/design/`)

| File | What it is |
| --- | --- |
| `compositions.ts` | 15 composition families. Each one owns the page: focal point, illustration box, headline placement and alignment, supporting content, graphic layers, negative-space budget, footer/CTA treatment and its response to 1:1, 4:5, 9:16 and A4. |
| `ground.ts` | 15 background architectures (`sanctum`, `editorial-rule`, `mandala-rose`, `diagonal-motion`, `framed-matte`, `cosmic-depth`, `type-field`, `panel-grid`, `commercial-band`, `narrative-layers`, `collage-blocks`, `quiet-paper`, `festival-burst`, `split-panels`, `geometric-astro`) plus the ornament helpers they share. |
| `emblems.ts` | The devotional emblem system, authored in a fixed 1000-unit space: halo (tapered ray fan + bead chain) → torana (cusped arch + finial) → painted plate → symbol → lotus seat → standing lamps → garland. Twelve symbol painters (`ganesha, shiva, murugan, lakshmi, saraswati, durga, rama, hanuman, venkateswara, ayyappa`, with `krishna`/`meenakshi` aliases). |
| `artLibrary.ts` | 20 illustration programs (deity emblems, celestial scene, zodiac medallion, jathagam chart grid, couple seal, letter bloom, date plate, navagraha grid, festive altar, service seal, narrative scene, mandala rose) and the shared line-weight/metal/tint primitives. |
| `layout.ts` | The typographic engine: margin system, one **row solver** shared by measurement and painting (`chromeRows` → `planChrome` / `paintChrome`) so the reserved space and the painted space cannot disagree, `planCopy` / `paintCopy` with fit-to-height and a floor, scrims. |
| `type.ts` | The type scale: four display families plus a supporting face, `fitDisplay`, `wrapText`, and the English-only audit (`auditEnglish`, `englishOnly`) that strips Indic runs before they reach a canvas. |
| `palettes.ts` | 10 palettes with dark and light grounds, ink/gold/accent ramps and swatches. |
| `categories.ts` | The 10 business categories — copy direction, artwork family, palette ladder, composition ladder, sample English copy, carousel slides, and the artwork catalogue. |
| `timeline.ts` | 7 motion presets as independent tracks over normalised time (ground, art, artReveal, kicker, headline, sub, CTA, logo, sweep, parallax, scale). |
| `engine.ts` | Selection: `designFromBrief`, `nextDesign` (anti-repeat), `diversityRun`, copy normalisation, shape fitting. |
| `render.ts` | The single paint path: `paintDesign` / `renderDesign` / `paintDesignToCanvas` / `copyAudit`. |
| `adapters.ts` | v2 ↔ v3 translation so saved posters, festival presets and the legacy tests keep working. |

### Rewritten

| File | Change |
| --- | --- |
| `src/components/PosterStudio.tsx` | New studio: eight independent locks (brief, composition, illustration, palette, typeface, decoration, motion, format) plus copy, mark and subject; **real rendered composition thumbnails**; prominent **Generate another design**; live **Play motion** preview that walks the exact timeline the recorder captures; PNG, reel and publish actions. |
| `src/lib/poster.ts` | `renderPoster` now renders through the design engine. The original v2 painter is retained behind `engine: "legacy"`. |
| `src/lib/reel.ts` | The animated export is no longer a camera push over a finished PNG: every frame is a full re-paint through `paintDesign` with the preset's motion state at that instant. |
| `src/lib/studioState.ts` | Presets carry a v3 design; the festival hand-off moved to it while the legacy `state` shape keeps older callers working. |
| `tests/poster-templates.test.ts` | The two studio tests that asserted the old wiring were replaced with behavioural contracts for the independence guarantee, anti-repeat generation and category changes. |

### New — support

| File | What it is |
| --- | --- |
| `src/lib/studioDesign.ts` | The studio's state model: `createStudioDesign`, `applyChange`, `selectCategory`, `generateAnother`, formats, copy flags. One field changes, the rest re-resolve. |
| `tools/design-samples.mjs` | The review harness: modes `compositions`, `matrix`, `carousel`, `diversity`, `controls`, `motion`. |
| `tests/design-system.test.ts` | 12 behavioural tests (see §6). |
| `tools/canvas-env.mjs` | node-canvas shim so every render path also runs head-less. |

---

## 3. The fifteen composition families

Ordered as rendered in `docs/samples/compositions.png`. The **structure** column
is the thing that actually differs — not the colour.

| # | Composition | Structure | Focal point |
| --- | --- | --- | --- |
| 1 | Hero Illustration | Full-width illustration, type over its lower third, centred | centre, upper |
| 2 | Luxury Editorial | Tall plate right, narrow editorial column left, vertical kicker rail | right, upper |
| 3 | Circular Mandala | Radial mandala ground, centred medallion, symmetrical chrome | centre |
| 4 | Diagonal Dynamic | Wedge field, low-left headline, edge-to-edge diagonal ribbon band | upper right |
| 5 | Luxury Framed | Wide gallery mat, double gold rule, centred plate and caption | centre |
| 6 | Cosmic Astrology | Deep starfield, offset planet field, wide-set headline | upper right |
| 7 | Typography Dominant | Oversized headline as the artwork, margin numeral, vast void | centre, optical middle |
| 8 | Educational Infographic | Header band, numbered teaching rows, labelled diagram rail | top |
| 9 | Commercial Ad | Price-plate block, benefit rows, hard CTA, corner seal | right |
| 10 | Illustrated Story | Illustrated scene above, card over the seam, type in the card | centre, upper |
| 11 | Asymmetric Collage | Tall bleeding plate, floating square, threaded headline, foot rule | left |
| 12 | Minimal Luxury | Off-centre plate high right, type low left, large calm diagonal | right, high |
| 13 | Festival Celebration | Festive burst ground, garlanded medallion, ribbon CTA | centre |
| 14 | Split Panel | Hard horizontal split, art above the seam, type below, seam kicker | centre, upper |
| 15 | Geometric Astrology | Square chart architecture, diamond grid, engraved plating | upper right |

Each composition also carries its own response to proportion: `luxury-editorial`
stacks to a single column on 9:16, `minimal-luxury` grows its plate, the
mandala shrinks and lifts its greeting on 1:1. `engine.ts` `SHAPE_FIT` encodes
which aspect families each family survives, and the selector uses it.

---

## 4. Category identities

Ten briefs, each with real business copy (no invented guarantees, testimonials or
claims), one contact line (`astrosivam.com`) and English-only wording.
Sanskrit/astrology vocabulary is used in standard Roman transliteration —
*jathagam, porutham, muhurtham, namakaranam, nakshatra, ayanamsa, panchangam*.

| Category | Artwork family | Palette ladder | Lead compositions |
| --- | --- | --- | --- |
| Birth Jathagam | jathagam chart grid | indigo-cosmos, maroon-gold, violet-astral | luxury-editorial, cosmic-astrology, hero-illustration |
| Wedding Matching | couple seal | kumkum-red, maroon-gold, ivory-sand | split-panel, circular-mandala, festival-celebration |
| Baby Naming Letters | letter bloom | ivory-sand, champagne-slate, emerald-temple, saffron-ember | minimal-luxury, luxury-framed, split-panel |
| Subha Muhurtham | auspicious date plate | kumkum-red, saffron-ember, maroon-gold | split-panel, diagonal-dynamic, commercial-ad |
| Astrology Education | teaching diagrams | (dark editorial) | educational-infographic, typography-dominant |
| Navagraha Education | navagraha grid | indigo-cosmos, violet-astral, midnight-lagoon | circular-mandala, educational-infographic |
| Festival Greetings | festive altar | kumkum-red, maroon-gold, saffron-ember | festival-celebration, illustrated-story |
| Devotional Posters | deity emblem | maroon-gold, emerald-temple, granite-brass | hero-illustration, luxury-framed, circular-mandala |
| Service Advertisements | service seal | maroon-gold, midnight-lagoon, champagne-slate | commercial-ad, diagonal-dynamic |
| Carousel Campaigns | mixed per slide | indigo-cosmos, midnight-lagoon, violet-astral | luxury-editorial, educational-infographic, split-panel, collage-asymmetric, diagonal-dynamic |

---

## 5. Eight independent controls — proven, not asserted

`docs/samples/controls.png` is the proof sheet: one base card, then one card per
control with **only** that control moved.

| Control | What it changes | What it may not change |
| --- | --- | --- |
| Brief (category) | copy direction, artwork family, ladders | anything the client has locked |
| Composition | page architecture | palette, typeface, artwork, copy |
| Illustration | which art program draws | composition, palette, type |
| Palette | colour scheme | composition, artwork, type placement |
| Typeface | display family | composition, palette, art box |
| Decoration | quiet / balanced / rich — ornament density in the ground and emblem | layout, copy |
| Motion | which preset the preview and reel use | the still poster |
| Format | 1:1, 4:5, 9:16, FB tall, A4 | the design tuple |

`tests/poster-templates.test.ts` asserts this in code: a composition change must
not alter palette, face or copy; a palette change must not alter composition or
face; a typeface change must not alter composition or palette; an artwork change
must not alter the composition; and `generateAnother` must change the structure
and never repeat the last four.

---

## 6. Test results

```
npx tsc --noEmit        0 errors
npm run lint            tsc --noEmit (this repo's lint is the type check) — clean
npm test                218 tests, 218 pass, 0 fail
npm run build           built in ~0.9 s, no warnings
```

New coverage in `tests/design-system.test.ts` (all behavioural — they render and
read pixels):

1. **Fifteen families, each with its own architecture** — unique keys, unique
   structure lines, ≥ 8 distinct grounds, ≥ 6 distinct focal points.
2. **Recolouring does not reflow** — every composition rendered twice on two
   palettes; the ink map must move less than 0.14 between them.
3. **Every composition paints a different page** — pairwise ink-map distance
   > 0.02 across all 15 × 15 pairs. Colour is held constant across the matrix, so
   the difference can only be structure.
4. **Every category renders its own brief** — 10 renders, none empty.
5. **Every palette renders on both dark and light grounds** — 10 renders.
6. **No Indic script is ever painted** — the audit flags Tamil/Devanagari and
   the renderer strips them; transliterated Sanskrit passes.
7. **Every format renders at its own size** — 1:1, 4:5, 9:16, FB tall, A4.
8. **Seven motion presets, each distinct and each actually moving** — no preset
   is the still state, none is unbuilt at half-way, no two share a tracking
   signature.
9. **Diversity run** — 20 cards, ≥ 8 structures, never three consecutive cards in
   the same family, and diversity is *not* explained by palettes alone.
10. **Generate another** — eight consecutive generations, never a repeat from the
    last four.
11. **Determinism** — the same brief reproduces the same poster.
12. **Category copy** — real headlines, one contact line, English-only.

The sample sheets are produced by `npm run samples:v3 [compositions|matrix|carousel|diversity|controls|motion]`.

---

## 7. Sample outputs

| Sheet | What it shows |
| --- | --- |
| `docs/samples/compositions.png` | All 15 families, 1080 × 1350, one card each. |
| `docs/samples/diversity.png` | The 20-card diversity run: 10 distinct structures, longest run 1. |
| `docs/samples/controls.png` | The base card and nine one-control changes. |
| `docs/samples/carousel.png` | A five-slide campaign: five different architectures, one palette and one page-count chrome. |
| `docs/samples/formats.png` | 1:1, 9:16 and A4 across three categories. |
| `docs/samples/motion-*.png` | Five frames per preset (0 %, 20 %, 40 %, 65 %, 100 %). |

Render times, measured on this machine at full export size (1080 × 1350,
scale 1): 110–660 ms per card; A4 (1748 × 2480) 630–850 ms.

---

## 8. Motion — what actually moves

Seven presets, each a set of independent tracks evaluated per frame; the same
`paintDesign` paints the preview, the contact sheet and the recorded video, so
the file cannot drift from the still.

| Preset | Length | Motion |
| --- | --- | --- |
| Premium Spiritual | 8 s | Illustration builds layer by layer (halo → crest → symbol → seat → garland), controlled glow, barely-there drift. |
| Luxury Gold Reveal | 7 s | A foil sweep crosses the artwork, a second glint travels across the type, masked headline entrance. |
| Cosmic Motion | 10 s | Orbital parallax, drifting art plane, stars building; position and scale return to the opening frame so the clip loops. |
| Festival Celebration | 6.5 s | Spark bursts, decoration drawing on, greeting landing with a gentle overshoot. |
| Editorial Typography | 6 s | Masked line-by-line headline, artwork masked in behind, no camera move. |
| Elegant Minimal | 5.5 s | One slow fade, a 1 % rise, a growing hairline. |
| Dynamic Advertising | 5 s | Fast coordinated entrances, band slide, CTA punch-in. |

The reel is recorded frame-by-frame through `MediaRecorder` at 1080 × 1920.
`reelSupport()` reports honestly when the browser cannot capture a canvas, and
the button is disabled with the reason rather than producing a broken file.

---

## 9. Remaining limits (stated plainly)

1. **Deity emblems are stylised, not iconographic.** They are readable vector
   marks (Ganesha's ears, crown and trunk; Shiva's trident and damaru; the vel,
   the kalash, the veena, the bow, the gada, the chakra) — not traditional
   paintings. That is the intended aesthetic, but a client expecting a Thanjavur
   painting should be told this is a graphic mark.
2. **Video export depends on the browser.** `MediaRecorder` + `captureStream`
   are required; support is checked at runtime and the UI explains when the
   feature is unavailable rather than silently failing. Recording runs in real
   time (one clip length of tab-visible time), and the tab must stay in front.
3. **Fonts are local files.** The five display families and the supporting faces
   are self-hosted; a face that fails to load falls back to the next in its
   stack, so the layout survives but the voice changes.
4. **A4 is 1748 × 2480 in the sample harness** (≈ 210 × 297 mm at ~210 dpi for
   review speed); the studio exports A4 at 2480 × 3508. Both come from the same
   vector path, so both stay sharp.
5. **Nineteen other screens are untouched.** The service-post, festival, story
   and carousel editors outside the poster studio still use the v2 painters. They
   are untouched by this change and keep working, but their card designs are not
   v3 yet. Porting them is mechanical: each has a copy object and a format, which
   is exactly the input `renderDesign` takes.
6. **No automated visual assertion can replace an eye.** The ink-map tests catch
   collisions of mass, not of legibility; every sheet in `docs/samples/` was
   reviewed by eye, and any new composition should be reviewed the same way.

---

## 10. How to reproduce

```bash
npm install
npx tsc --noEmit          # 0 errors
npm test                  # 218 passing
npm run build             # production bundle
npm run samples:v3        # 15 composition cards      → .samples/design
npm run samples:v3 -- diversity   # 20-card audit
npm run samples:v3 -- controls    # the independence proof sheet
npm run samples:v3 -- motion      # five frames per preset
```

The studio is at the **Poster studio** section of the app; it opens on the last
design you were working on (stored locally), otherwise on a finished starter
card.
