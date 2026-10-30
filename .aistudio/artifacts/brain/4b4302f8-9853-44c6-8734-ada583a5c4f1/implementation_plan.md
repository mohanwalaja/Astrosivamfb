# Astro Sivam Professional Mastercraft Poster & Design System Upgrade

Comprehensive design elevation across Astro Sivam's poster generation engine, service ad plates, Instagram highlights, and planetary charts, transforming placeholders into museum-grade Vedic visual assets with 24k gold leaf repoussé, classical temple arch engravings, and high-precision celestial wireframes.

### User Review & Critical Decisions

> [!IMPORTANT]
> Based on your design preferences, all creative outputs will follow these three confirmed artistic directions:

- **Confirmed Decision 1: Master Poster System**: Sacred Vedic iconography with 24k gold foil details, deep mineral parchment surfaces, and authentic temple repoussé borders across all 6 flagship astrology services.
- **Confirmed Decision 2: Baby Naming Service Art**: Classical temple arch engraving with sacred Tamil syllables (`ஓம்`, `ந`), blooming lotus throne (*Padma Peedam*), divine infant footprints (*Bala Paadam*), and radiant *Janma Nakshatra* birth star quadrant rays in royal ivory and gold enamel.
- **Confirmed Decision 3: Saturn & Transit Ephemeris**: Clean modern editorial dark mode with minimalist gold wireframes, high-precision Cassini division rings, inclination tilt, and concentric degree ticks.

---

### 1. Overview & Core Concept

- **What It Does**: Upgrades Astro Sivam's client-side canvas rendering pipeline to generate print-ready, high-resolution social posters (1:1, 4:5, 9:16), service cards, and highlight seals that rival bespoke luxury editorial publications.
- **Target Audience / Persona**: High-intent seekers of authentic South Indian Vedic astrology, discerning families commissioning baby naming (*Namakaranam*) ceremonies, and clients reviewing major planetary transits (*Sade Sati* / *Ezhara Sani*).
- **Key Value**: Replaces raw geometric sketches and brown placeholder squares with heirloom-quality art direction, building immediate credibility, reverence, and brand trust.

---

### 2. User Experience & Visual Design

#### Visual Identity & Theme
- **Color Palette & Mood**:
  - *Royal Ivory & Silk*: `#FFFDF8` to `#F6E8CE` luminous parchment base with `#1C1917` warm charcoal typography.
  - *24k Gold Foil System*: Multi-stop metallic gradients (`#FFE58F` highlight, `#D4AF37` burnished leaf, `#996515` deep repoussé shadow) with soft ambient bloom.
  - *Editorial Deep Celestial Dark Mode*: `#080D1A` to `#0B1220` deep midnight slate with hairline gold orbital tracks (`#D4AF37` at 30%–70% opacity).
  - *No Muddy Terracotta Clutter*: Eliminated harsh `#C0633A` placeholder rectangles; all cards and highlight medallions render with authentic beveled temple frames or seamless concentric gold borders.

#### Key Component Upgrades
1. **Baby Naming (Namakaranam) Temple Arch Tablet**:
   - Classical South Indian *Koodu / Gopuram* archway silhouette engraved in gold foil.
   - Sacred Tamil initial syllable glyphs (`ஓம்`, `ந`, `ஸ்ரீ`) inscribed in luminous gold calligraphy atop the arch.
   - Lotus Throne (*Padma Peedam*) with stepped gold tiers and layered rose-gold petals.
   - Detailed infant footprints (*Bala Paadam*) with chubby toes, arch contours, and auspicious red *Kumkum* tilak.
   - 8-pointed *Janma Nakshatra* birth star with 4 *Pada* rays and 27 celestial constellation dots.
2. **Saturn Transit Minimalist Gold Wireframe**:
   - Clean editorial dark-mode aesthetic with spherical latitude shading.
   - High-precision concentric elliptical rings modeling the A Ring, Cassini Division, and B Ring.
   - Precision 360° celestial coordinate dial with 30° zodiac sector demarcations and clean hairline typography.
3. **Instagram Highlight Seals & Service Ads**:
   - Seamless circular medallion framing with zero square backdrop clipping inside rounds.
   - Cohesive corner post badge with the authentic Astro Sivam twin-sun logo.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Procedural Vector Canvas vs. Static Bitmaps**
  - *Chosen Approach*: Procedural HTML5 2D Canvas rendering with trigonometric curves, gold foil linear gradients, and radial lighting.
  - *Why*: Allows infinite crisp resolution scaling across Instagram post (1080x1080), portrait (1080x1350), and story (1080x1920) with zero asset loading latency or network failure.
  - *Alternatives Considered*: Prerendered raster JPGs were rejected because they blur on high-DPI retina displays and increase bundle size.

- **Decision 2: Classical Tamil Syllable Engraving Architecture**
  - *Chosen Approach*: Render authentic vector-drawn Tamil sacred glyphs and Unicode typographic inscriptions directly within the arch apex.
  - *Why*: Honors traditional Tamil Vedic astrology where the *Janma Nakshatra Pada* dictates the auspicious first syllable of the newborn's name.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ASTRO SIVAM STUDIO UI                           │
│   (Poster Customizer · Service Ad Generator · Highlight Cover Kit)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ triggers
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CANVAS RENDERING PIPELINE                          │
│                                                                        │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌───────────────┐ │
│  │     styleArt.ts      │  │     canvas.ts       │  │  stylePosts.ts│ │
│  │                      │  │                     │  │               │ │
│  │ • Temple Arch Tablet │  │ • drawMotif()       │  │ • Full Ad     │ │
│  │ • 24k Gold Bevel     │  │   - namakaranam     │  │   Plates      │ │
│  │ • Tamil Glyph Inlay  │  │   - saturnWireframe │  │ • Typography  │ │
│  └──────────┬───────────┘  └──────────┬──────────┘  └───────┬───────┘ │
└─────────────┼─────────────────────────┼─────────────────────┼─────────┘
              └─────────────────────────┼─────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      HIGH-RESOLUTION OUTPUT                            │
│           (1080x1080 Square · 1080x1350 Feed · 1080x1920 Story)        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key Implementation Files
- `src/lib/styleArt.ts`: Implement `drawBabyNamingTempleArch` with gold-filigree archway, Tamil syllable inscription, and eliminate legacy terracotta boxes.
- `src/lib/canvas.ts`: Enhance `drawMotif("namakaranam")` and add `drawSaturnWireframe` with editorial dark-mode geometry and Cassini division rings.
- `src/lib/stylePosts.ts`: Update service ad plates (`serviceKey === "babynaming"` and `"transits"`) with the refined iconography.
- `src/lib/highlightSeal.ts`: Ensure circular clipping and clean gold borders for the Baby Names Instagram highlight cover.
