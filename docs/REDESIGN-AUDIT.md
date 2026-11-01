# Astrosivam Poster Suite — Source Audit & Redesign Brief

Date: 2026-11-01 · Branch: `arena/72428e8a-astrosivamfb`

This document records the audit that drove the **Poster Suite v3** redevelopment, the
root causes found in the v2 engine, and the architecture that replaces it. It is the
reference for every later change.

---

## 1. What v2 actually did

Pipeline (unchanged and traced end to end):

```
PosterStudio state → renderPoster() → paintPosterTemplate() → PAINTERS[t]
                                    ↘ ensureFonts / loadImageSource / loadLogo
                                    ↘ createCanvas(scale)
```

| Layer | File | Role in v2 |
| --- | --- | --- |
| Studio UI | `src/components/PosterStudio.tsx` | 8 template chips, 12 styles, 12 palettes, 3 script faces |
| Entry | `src/lib/poster.ts` | resolves template, loads art/logo, calls the painter |
| Painters | `src/lib/posterTemplates.ts` | **8** hand-written compositions |
| Kit | `src/lib/posterKit.ts` | frames, image fitting, `planStack`/`paintStack`, ornaments, CTA |
| Style art | `src/lib/styleArt.ts`, `styles.ts`, `ornaments.ts` | backdrops, motifs (≈57 motifs) |
| Stage art | `public/deities/*.jpg` | 12 baked temple paintings |
| Reel | `src/lib/reel.ts` | 2 static plates + camera push + copy fade |

Measured output: `.samples/samples/*.png` (8 posts, 1 story, 1 A4) plus
`tools/export-audit.mjs`.

## 2. Root causes of "every poster looks the same"

Ranked by how much they flatten the output, not by how easy they are to fix.

1. **One drawing routine decides the whole page.**
   `paintStack` + `frameFor` are shared by all eight painters. Every composition
   therefore resolves to the same three blocks in the same order: *kicker → headline →
   script → subline*, centred or left on the same margin, with the same CTA pill and the
   same `drawGlobalLockup` corner. Eight names, one text engine, one rhythm.

2. **The picture is the same picture.**
   Twelve JPGs of Ganesha et al. are the only art. Every "different" poster is the same
   square portrait dropped into a different clip path (arch, circle, plate). The user's
   brief explicitly rejects photographic art as the primary style — so the stage art was
   also the *wrong* style, not merely repetitive.

3. **The fallback art is one gold mandala.**
   `drawArtFallback` renders the same rose-window motif at a different size for every
   poster without a JPG. Remove the JPG and all 8 templates become the same poster.

4. **Style and composition were coupled through colour only.**
   `style` selected a backdrop gilding; `themeKey` selected a palette; neither touched
   the grid. The 12 × 12 grid produced 144 recolours of 8 layouts.

5. **"Generate another" did not exist.**
   Selection was a manually-clicked chip list. There was no design engine, no recency
   memory, no content-aware choice — so in practice one template was used for everything.

6. **Animation was a camera move.**
   `paintReelFrame` renders two static plates, then zooms 7 %, drifts 1.2 % of height,
   and fades the copy in one window. No layer reveals, no orbit, no line drawing, no
   kinetic type. One preset for every poster; `reveal` is a scalar on the copy block only.

7. **Category blindness.**
   Nothing in the codebase knows whether a poster is a Jathagam report, a wedding
   matching post, a muhurtham date card or a Navagraha lesson. `Service.creative` supplies
   copy, but the composition never reacts to the category.

8. **Non-English content in the render path.**
   `tamil` and `hindi` are first-class poster inputs, `SCRIPT_FONTS` offers three Indic
   faces, and every template prints both lines above the English headline. This directly
   violates the English-only policy.

9. **Fragile fitting.**
   `fitStack` shrinks *everything* proportionally until the block fits its region, so a
   long headline shrinks the subline and the CTA with it. There is no re-flow decision
   (widen column, drop to two columns, move the block) — only scale.

10. **Preview ≠ export risk.**
    `planStack` measures after `ensureFonts()`, but templates that use `Math.round` on an
    intermediate size can differ by a pixel between `scale: 0.25` and `scale: 1`.

## 3. What the redesign must therefore change

* Composition must own the **whole page**: ground architecture, focal box, type zone,
  alignment, negative space, ornament, footer/CTA. Fifteen of those, not one grid.
* Art must be **generated illustration**, layered and vector, parameterised by category
  and palette — not a photograph.
* A **design engine** must choose composition + artwork from category, copy shape,
  format and recent history, and `Generate another design` must re-roll it.
* **English only** in the render path, with a lint that rejects Indic code points.
* **Real motion**: layered timeline with independent tracks (ground, orbit, mandala,
  illustration, type, CTA, logo, sweep), six named presets.
* Existing screens keep working: legacy templates and the five legacy layouts stay
  resolvable, saved presets migrate forward.

## 4. Delivered architecture (v3)

```
src/design/
  artLibrary.ts     illustrated deity / planet / zodiac / motif artwork generators
  categoryArt.ts    category → art program mapping (Jathagam, Matching, Naming, …)
  palettes.ts       10 campaign palettes (maroon/indigo/emerald/ivory/…)
  compositions.ts   15 composition families, each a full-page program
  engine.ts         design selection + recency + Generate-another
  ground.ts         layered background painters (gradient fields, geometry, texture)
  timeline.ts       motion tracks + 6 animation presets
  renderPoster.ts   single render entry (static + animated frame at time t)
```

Legacy `poster.ts` becomes a thin adapter so every existing caller, preset and test
continues to work; `paintPosterTemplate` is retained for saved posters.
