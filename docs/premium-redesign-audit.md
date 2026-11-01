# Premium creative redesign — audit & implementation record

Date: 2026-11-02 · Branch: `arena/0d70a211-astrosivamfb`
Scope: every poster-producing module, the motion pipeline and the Poster Studio UI.
Direction from the client: **graphic, animated** artwork — not photorealism.

## 1 · Audit of the previous output

Rendered through `npm run samples` and inspected pixel-by-pixel, the old system
failed in these specific ways:

1. **Clip-art vector architecture.** `mandapam` drew fluted pillars, a mango-leaf
   toran, cartoon diyas and a kalasam as flat gradient shapes around the photo —
   the "cheap illustration" look the brief forbids.
2. **Website-card compositing.** `nocturne` floated a frosted-glass rounded card
   over the artwork (a UI pattern enlarged into a poster) and set the headline
   across the deity's face with a uniform darken instead of a designed scrim.
3. **Broken commercial grid.** `offer` let the headline column collide with the
   diagonal campaign band and the arch ornament, let benefit chips overlap the
   band, and left the lower ~40 % of the canvas empty.
4. **Clipped devices.** `sequence` bled its index numeral off the left edge;
   `gallery` hard-coded a "PLATE 01" caption; sublines were ellipsised at one
   line even when space existed (`subMaxLines: 1`).
5. **One skeleton, eight colours.** Every template ran the same
   `brandRow → fitStack → footerRow` sequence over a flat gradient ground; the
   "style" system only swapped backdrop motifs, so campaigns looked repetitive.
6. **No subject direction.** A wedding post, a transit alert and a festival
   greeting all opened on the same compositions and palettes.
7. **Motion was a crossfade.** `reel.ts` rendered the poster twice (reveal 0/1)
   and alpha-blended them with a zoom — a slideshow, not a campaign film.
8. **No variation system.** "Another version" meant another palette, never
   another composition.

## 2 · What replaced it

### Graphic art system — `src/lib/graphicKit.ts` (new)
Eight computed scenes, each a pure function of `(box, theme, t, seed)` so stills
and animation frames are the same artwork at different times:
`cosmic` (nebula gradients, three parallax star layers, constellation line work),
`orbit` (ephemeris rings with advancing planetary nodes and degree ticks),
`silk` (flowing zari ribbons with a travelling sheen), `deco` (foil sunburst and
stepped chevrons), `kolam` (exact pulli-kolam lattice), `kolam band`
(`paintKolamBand`, width-tiled footing), `skyline` (layered gopuram silhouettes
under a star field), `aura` (concentric halo rings, lotus petal ring, motes) and
`chart` (engraved-plate zodiac ring). Plus `foilShimmer`, `motes`, `gradeArt`
(dignity-preserving treatment for devotional paintings) and `lampGlow` (light,
never a cartoon lamp). No external image service, no fabricated URLs, no empty
placeholder: when no photograph is chosen a designed scene fills the art plane.

### Motion engine — `src/lib/motion.ts` (new)
Per-template choreography (`MOTION` specs): camera push on the ground plane,
counter-moving art plane for parallax, headline reveal through a travelling
mask, brand signature landing last, then live light (glow pulse, foil shimmer,
drifting motes) and a cinematic vignette. `paintMotionFrame` composites four
pre-rendered depth planes, so a 450-frame reel costs one layered render plus
cheap per-frame composites.

### Layer-routed painters — `src/lib/posterTemplates.ts` (rewritten)
Every painter declares which depth plane each draw belongs to
(`scene.ground / art / type / brand`). A still export runs all four planes onto
one canvas; `renderPosterLayers` runs them onto four — same code, guaranteed
preview/export/reel parity. The eight compositions were redesigned:

| Template | New art direction | Variations |
| --- | --- | --- |
| Luxury Editorial (`gallery`) | full-height art plate with inset foil keyline against a ruled type column; cover stack for stories | 3 |
| South Indian Heritage (`mandapam`) | silk field, foiled arch window, Tamil-first copy, kolam footing band, lamp glows | 2 |
| Minimal Typography (`manifesto`) | three type grids (margin rail / centred / bottom billboard), Tamil watermark | 3 |
| Cinematic Astrology (`nocturne`) | cosmic field or graded photo, letterbox scrims, lower-third or horizon-band copy, ephemeris accent | 2 |
| Educational Graphic (`lesson`) | series numeral, chart/orbit tile, numbered editorial rows on hairlines, progress rail | 2 |
| Service Advertisement (`offer`) | hero band, kicker chip, measured headline, foil-tick benefit rows, one CTA, foil brand seal | 2 |
| Festival Greeting (`blessing`) | aura field, foiled medallion, greeting-first festive type, kolam band | 2 |
| Carousel Cover (`sequence`) | foil-seamed diagonal or ruled cut, contained index numeral, swipe grammar | 2 |

### Layout engine
`planCopy`/`copyStack` measure the copy block against the space actually left
(after art plane, brand and footer reserves) and return the measured plan, so
benefit rows, CTA and seals flow from the copy's real height — the dead-air and
collision class of defects is structurally gone. `center` regions centre
greeting blocks; `fitStack` still guards overflow with its four stages and a
console warning. Copy masks (`scene.mark`) tell the motion compositor exactly
which rectangle the type reveal sweeps.

### Category art direction — `src/data/categoryDirection.ts` (new)
Ten campaign registers (jathagam, marriage, baby-naming, muhurtham, education,
navagraha, festival, devotional, promo, campaign), each with its own default
composition, palette, graphic scene, type pairing and variation. Applied as a
one-tap studio default; every control stays overridable. No service, claim or
contact detail is invented — copy still comes from the service definitions.

### Studio UI — `src/components/PosterStudio.tsx`
Variation chips per template, campaign-direction select, graphic-artwork select
and a **Motion preview** toggle that composites the same depth planes the reel
recorder uses on a rAF loop — the preview is the export, frame for frame.
All existing controls, presets, upload, deity library, formats, publish and
reel buttons are untouched.

### Reel — `src/lib/reel.ts` (rewritten internals, same public API)
`recordReel` now renders four depth planes once and records
`paintMotionFrame` output: parallax, masked type reveal, light overlays.
WebM/MP4 selection, progress stages, abort and hidden-tab guards unchanged.

## 3 · Verification performed

- `npm run lint` (tsc --noEmit): clean.
- `npm test`: 210/210 pass (contract tests for the eight painters, legacy
  layouts, font shipping, truncation guards, pixel-size guards, logo asset).
- `npm run build`: production bundle builds.
- `npm run gallery` (new harness, `.samples/premium/`, git-ignored): eight
  compositions, all 17 variations, ten category directions, stress cases (long
  headline + long subline, Tamil-only, missing optional fields, square, story,
  A4 2480×3508) and four-frame motion strips for three templates.
- Every rendered PNG above was opened and inspected by eye; defects found
  (chip/lockup collision, weak scrim, dead air, footer/kolam overlap, clipped
  masks) were fixed and re-rendered until clean.
- Tamil and Hindi shaping verified in renders (compound glyphs intact, no
  .notdef, no mid-word breaks); missing-field render degrades gracefully.

## 4 · Compatibility notes

- `PosterOptions` gained optional `variation`, `artScene`, `category`, `t`;
  every existing caller (service ads, festival packs, IG/FB suites, export
  centre, presets) keeps working unchanged — defaults resolve per template.
- Saved presets migrate as before (`studioState.migrateState` untouched).
- The logo file, brand lockup rules and palette tokens are unchanged; gold is
  an accent (keylines, seals, ticks), never a substitute for composition.
