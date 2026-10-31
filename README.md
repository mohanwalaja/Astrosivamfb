# Astro Sivam — Creative Studio

A complete, export-ready creative studio for [astrosivam.com](https://astrosivam.com).

Everything lives in one React app: the brand kit and interface design system, a canvas studio that
renders at exact platform resolutions, seven service post systems with final captions and hashtags,
festival and panchangam tools, Instagram and Facebook playbooks, and a 30-day publishing calendar.

## The studio interface

The chrome is a restrained, editorial Indian design system rather than a generic dashboard. It has
one palette family and one component grammar across every screen:

| Token family | Values | Role |
| --- | --- | --- |
| Deep maroon | `#310915` → `#75203A` | Identity, emphasis panels, active navigation |
| Antique gold | `#8A6423` → `#D8B164` | Primary actions, rules, icons, focus |
| Champagne gold | `#E3CA99` → `#FAF2E2` | Headlines, quotes, quiet emphasis |
| Warm ivory | `#948772` → `#FBF5E9` | Text hierarchy — never pure white |
| Charcoal | `#100B0C` → `#372C2F` | Canvas, cards, raised surfaces, insets |

- **Tokens** live in `src/design/tokens.ts` and are mirrored as CSS custom properties in
  `src/index.css`. Components never introduce a colour outside those families.
- **Components** live in `src/components/ui.tsx`: `Button`, `IconButton`, `Chip`, `Badge`, `Panel`,
  `SectionLabel`, `PageHeader`, `Stat`, `Field`, `Input`, `Textarea`, `Select`, `Toggle`, `Modal`,
  `PreviewFrame`, `EmptyState`, `Callout`, `Accordion`, `Segmented` and the copy/toast primitives.
- **Typography** is Cinzel for display, Marcellus for editorial asides, Plus Jakarta Sans for the
  interface and Tiro Tamil for script lines. All four ship self-hosted.
- **Accessibility** is part of the contract: a skip link, visible 2px champagne focus rings, trapped
  focus and Escape-to-close dialogs, labelled form controls, reduced-motion support and WCAG AA text
  pairs (audited by `tests/design-system.test.ts`).
- **The logo is untouched.** The sun–moon mark keeps its original file and square proportions; it is
  only presented inside an ivory seal, where the supplied white paper background blends in.

## What it includes

- **Brand system** — logo usage, palette (9 themes grouped into five families), type, voice,
  boilerplate, the six design styles, seasonal overlays, handle strategy and safe areas.
- **Profile & covers** — the identity set: two profile photos, two Facebook covers, the link card and
  seven highlight covers, each downloadable on its own with the mobile crop drawn on.
- **Asset Studio** — 18 formats rendered on canvas: profile photos, two Facebook covers, link card,
  feed posts, a 7-slide carousel, stories, reel covers, seven highlight covers, panchangam card,
  quote card, offer card, review card and the twelve-style contact sheet. Download a single PNG or a ZIP pack.
- **Style gallery** — 12 art directions in two families, each with its own post layout, backdrop,
  frame, palette and hashtag set, rendered side by side for every service:
  - *Heritage* — Signature Gold, Thanjavur Court, Kolam Morning, Kanchipuram Silk, Gopuram Dusk,
    Karthigai Deepam
  - *Modern* — Mono Editorial, Paper Studio, Ephemeris, Aurum Minimal, Glass Nocturne, Orbit

  Each carries its own ornament vocabulary, palette and hashtag set. Export one PNG, a ZIP of all of
  them, or the contact sheet for sign-off.
- **Poster studio** — build a card from scratch: your own kicker, headline, Tamil and Hindi lines,
  a deity portrait or an uploaded photo, eight **compositions** (Temple Mandapam, Gallery Plate,
  Manifesto, Glass Nocturne, Guide Slide, Offer Card, Festival Blessing, Series Cover), five formats
  including A4 print, four headline faces (Cinzel, Cormorant Garamond, Playfair Display, Inter Tight),
  three Tamil/Hindi pairings (Noto Serif, Hind, Baloo + Yatra) and twelve palettes — one per art
  direction. All fonts are bundled locally. The canvas re-renders live and exports a print-resolution
  PNG. Switching composition changes the layout only — copy, art, palette and fonts are kept.

  The eight templates are separate painters, not eight recolours of one skeleton:

  | Template | Composition | Best for |
  | --- | --- | --- |
  | Luxury editorial | Left type column, full-height art plate, catalogue caption | Flagship launches, pinned offers |
  | South Indian heritage | Mango-leaf toran, carved arch, kolam footing, Tamil-first copy | Muhurtham, Griha Pravesam, temple festivals |
  | Minimal typography | No image, no frame — headline set as large as the format allows | Quotes, method statements, manifestos |
  | Cinematic astrology | Full-bleed art, letterbox, deep scrim, studio ident | Transits, eclipses, reel covers |
  | Educational graphic | Header bar, art inset, numbered bullets, page dots | Explainers, panchangam notes |
  | Service advertisement | Campaign band, product card, filled CTA, brand seal | Paid boosts, consultation drives |
  | Festival greeting | Petal medallion, deepam lamps, greeting-first hierarchy | Diwali, Pongal, Navaratri |
  | Carousel cover | Index numeral, lower art band, swipe prompt, page dots | First slide of any carousel |

  The old five layouts still work and now select a composition, so saved presets and the other
  screens keep rendering. `npm run samples` renders one representative poster per template to
  `.samples/` at export resolution.
- **Festival wishes** — 45 occasions: the Hindu and Tamil calendar (Tamil, pan-Indian, North Indian
  and Kerala sets) plus global days — New Year, Valentine's Day, Women's Day, Mother's Day, Father's
  Day, Friendship Day, Teachers' Day, Children's Day and Christmas. Four style families, each a
  different composition rather than a recolour:
  - **Traditional** — mango-leaf toran, arched portrait, occasion kicker, the date on a rule-flanked
    medallion band, diyas and a kolam at the foot.
  - **Minimal** — an ivory page, one gold rule, the greeting set left like a letter, a circular art
    stamp and the date as the last line.
  - **Luxury** — double gold frame with corner ticks, a ringed oval portrait, the date engraved on a
    plate above a wordmark.
  - **Contemporary** — a hard colour block over the lower half, art cropped into a window bleeding off
    the right edge, a large left-aligned greeting and a typographic date.

  Every card is configurable: festival, verified date, the three greetings and the supporting line,
  which language leads, the display and script faces, a palette override (or the style's own), bundled
  deity art / a motif / your own upload, and where the logo sits — plaque, wordmark, corner or absent.
  Formats: Instagram 4:5, square, 9:16 story and Facebook 4:5, all rendered by one engine.

  Dates are read from the verified panchang table only, with `confirmed` / `provisional` printed on the
  card. A festival with no stored row for the chosen year says **“Date awaits the panchang”** and prints
  the traditional rule instead — no date is ever composed, rounded or inferred. Tamil and Hindi are
  drawn through per-script faces, letter-spacing is suppressed for Indic text (tracking shatters
  clusters into dotted circles), and `tests/festival-cards.test.ts` renders every style × format and
  fails on a missing glyph or a line below its mobile legibility floor.

  Facebook and Instagram captions are written separately: Facebook gets the full wish, the date line and
  four tags; Instagram gets a hook, the greeting in all three scripts, a save prompt, a longer tag set
  and is held under 2,200 characters. Export one card, a four-format pack with a captions file, or the
  whole year as a numbered ZIP plus a dated calendar markdown.
- **Deity art** — twelve painted deity portraits (Ganesha, Shiva, Murugan, Lakshmi, Saraswati, Durga,
  Krishna, Rama, Hanuman, Venkateswara, Ayyappa, Meenakshi) at 1200 px with 360 px thumbnails. Any of
  them can be turned on or off per poster; you can also upload your own image.
- **Service posts** — Birth Jathagam, Marriage Compatibility (10 Poruthams), Baby Naming,
  Subha Muhurtham, Daily Panchangam, Transits & Sade Sati, Samples & Trust. Each has a Facebook
  caption, Instagram caption, first comment, alt text, carousel script, reel script, three story
  frames and six hashtag mixes.
- **Instagram suite** — seven surfaces behind one tab bar, built on the same measurement discipline as
  the Facebook suite:
  - **Profile** — the 390 × 844 phone mockup with the real nine tiles, the seven seals and blank
    follower counts, beside the name field (30 characters), three bio options (150), the link stack and
    the profile-photo workflow (shown at 110 px and 32 px, uploaded in the app because the API cannot
    set it).
  - **Grid** — the nine posts as a 3 × 3 plan with the centre 1:1 crop drawn, the register/focal badge on
    each tile, and a written reason for every placement. Art posts take the main diagonal, quote plates
    take the anti-diagonal, education alternates ivory and sand on the edges; no two neighbours share
    both register and focal. `tests/ig-copy.test.ts` enforces those rules.
  - **Feed posts** — each post with its own composition rather than a recoloured skeleton: a *service
    card* (full-height art plate, type column, price panel, ticked deliverables, flat CTA), a *field
    note* (light editorial page, watermark index, circular art medallion, closing link), a *type plate*
    (double frame, one quote, attribution rule) and a *carousel cover* (art window, index tab, page
    dots, swipe cue). Caption + hashtags, Facebook caption, alt text and the matched DM keyword are one
    click each; every export re-renders at full size.
  - **Stories & Reels** — three story frames and two Reel covers with the 250 px / 340 px UI bands drawn
    on demand. The copy block is laid out top-down inside the band that is left, so the CTA can never
    land on the reply bar, and the Reel cover keeps every word inside the centre 1080 × 1080 that the
    grid shows.
  - **Highlights** — seven symbol-only seals inside the 70 % safe circle, with the manual build steps,
    because there is no Highlights API.
  - **Playbook** — DM keywords with saved replies, the reels playbook, weekly cadence, best times,
    story ideas, growth actions and the alt-text rules.
  - **API limits** — Meta's real constraints, task by task: what the API publishes (single image,
    carousel, Reels, Stories, alt text, collaborators, tags), what is manual (story stickers, scheduling,
    first comment) and what does not exist (highlights, profile fields, grid order, alt text on Reels and
    Stories). The daily publish cap is presented as something to query — Meta's guide says both 50 and
    100 in the same page — and the panel says plainly that this app's own publisher posts one image at a
    time.

  Mobile legibility is measured per surface: a feed post is audited at 360 px, a story at 390 px, a Reel
  cover at the 124 px grid thumbnail and a highlight at 64 px. `tests/ig-creative.test.ts` pins the
  canvas sizes, safe zones and audit maths, and `npx tsx tmp/igsheet.mjs` renders all 21 assets and
  fails if any line falls below its role's floor.
- **Facebook suite** — four sections behind one tab bar:
  - **Post studio** — ten ready posts across four content categories (service, education, festival,
    trust), each with a distinct composition rather than one skeleton recoloured: a *service promo*
    (header band, type column, price panel, ticked deliverables, flat CTA), an *educational guide*
    (editorial light page, circular art inset, numbered points, closing link), a *festival greeting*
    (gold toran, medallion portrait, greeting-first hierarchy) and a *trust page* that reuses the
    educational grid with a quieter register. Every post carries the same logo plate, type pairing,
    palette and footer line. Captions open inside the feed's 125-character cut, hashtags are split into
    core / local / service sets, and the call to action is repeated as a Messenger quick reply.
    The preview is the real renderer at export size, with a genuine 360 px phone-feed view beside it.
  - **Profile & cover** — a 1080 × 1080 profile seal (plate, wordmark, Tamil line, twin rings) that
    still reads at the 28 px comment size, and a 1640 × 624 cover whose promise, price and CTA all sit
    inside the 640 × 360 box Facebook leaves visible on a phone. The phone crop is a crop of the same
    exported canvas, so nothing is approved that will not be seen.
  - **Publish** — live Page connection state read back from the Graph API, and Meta's own error payload
    (type, code, subcode, `fbtrace_id`) plus the fix for each documented code. It is never a simulated
    success: if the PHP service is not deployed, the panel says exactly that.
  - **Page kit** — page fields, About copy, Messenger FAQs and instant replies, review replies, boost
    plan and Meta compliance guardrails.

  Mobile legibility is measured, not asserted: every layout declares the width it is actually seen at
  (`auditWidth`, which is 640 px for a cropped cover rather than its full 1640 px), every painter logs
  the type it draws, and `auditLegibility` fails the build if any line falls below its role's floor.
  `tests/fb-legibility.test.ts` renders all five layouts and enforces that audit.
- **Content calendar** — 30 days across four phases, filterable, exportable as CSV, plus a festival
  lane that reads the same verified date table as the greeting cards (provisional days marked, undated
  festivals deliberately absent) and exports its own CSV.
- **Hashtag lab** — tiered bank with rotation rules, a per-platform mix builder and a style tag bank.
- **Mockups & Export centre** — in-context previews and all download packs, including festival packs
  (four formats + captions) and the whole festival year, rendered from the same engine as the studio.

## Run it

```bash
npm install
cp .env.example .env
# Edit .env: set a private password and generate AUTH_SESSION_SECRET with:
# openssl rand -base64 48
npm run dev     # http://localhost:3000
npm run lint    # type check
npm test        # feature + design-system tests
npm run build   # production bundle
npm run audit:export  # render + measure every export, write .samples/export-audit/
npm start       # serve the production build (NODE_ENV=production)
```

The design-system tests check WCAG contrast for every audited text pair, the token contract, the
shared-component contract and that no legacy cool-grey colour returns to component markup.

`docs/export-audit.md` records what the export audit measured — PNG structure, opacity, preview vs
export parity, ZIP read-back, file names, progress, uploads and memory — and what it could not cover.

## BigRock PHP hosting and Meta publishing

The interactive app is a static Vite build, but its production gate and publishing endpoints can run
on PHP; Node.js is **not** needed on the BigRock server. Build `dist/` on a computer or CI runner
with Node, then upload the built files and the contents of `hosting/` to the site's document root.
Confirm that path in cPanel **Domains**; do not assume it is `public_html`. The PHP front controller
serves the private app bundle and its `/api` routes.
Do not upload this as a static-only site.

### Install on BigRock

1. Build the site with `npm ci && npm run build` on a computer/CI runner. Keep the complete `dist/`
   directory; it contains the app's `index.html`, assets, fonts, and public images.
2. In cPanel **Domains**, confirm the document root for `suite.astrosivam.com` (use the folder
   shown there; do not assume it is `public_html`). Upload the **contents** of `hosting/` to that
   folder, then upload the complete `dist/` directory alongside `index.php`. The included
   `.htaccess` routes requests through PHP so assets are protected too. Apache `mod_rewrite` and
   `AllowOverride` must be enabled.
3. Make `storage/` writable by PHP (start with `750`/`700`; use your hosting panel's PHP file
   manager if needed). The publisher encrypts saved Meta Page tokens there. The temporary post
   image is removed after the API request.
4. Open `https://your-domain/setup`. The installer creates a private one-time key at
   `storage/setup.key`; view that file in cPanel File Manager and paste its contents into the setup
   form. Enter your login username/password and HTTPS site origin. It generates the session secret
   and writes the private `config.local.php` for you. The setup key is deleted after success.
5. Use PHP 8.1+ with `cURL`, `OpenSSL`, and `Fileinfo` enabled. Set `upload_max_filesize` and
   `post_max_size` to at least `9M`, and PHP's maximum execution time to at least five minutes so a
   slow Meta media-processing request is not cut off. If BigRock does not offer these extensions or
   settings, ask support to enable them.

The installer creates this private config automatically. The following is a reference for advanced
manual recovery only; never upload a real config or secrets into Git:

```php
return [
    'AUTH_USERNAME' => 'admin',
    'AUTH_PASSWORD' => 'your-private-password',
    'AUTH_SESSION_SECRET' => 'a-long-random-secret-at-least-32-characters',
    'META_APP_ID' => 'your-meta-app-id',
    'META_APP_SECRET' => 'your-meta-app-secret',
    'META_REDIRECT_URI' => 'https://your-domain.com/api/meta/callback',
    'META_GRAPH_VERSION' => 'v26.0',
    'SITE_BASE_URL' => 'https://your-domain.com',
];
```

Use your own password and generate a random session secret (for example, `openssl rand -base64 48`).
The Meta App Secret and Page tokens stay on the PHP server; they are never sent to the browser.
`SITE_BASE_URL` must be the public HTTPS origin because Meta fetches the image being published.

### Configure Meta

First time here? [`docs/meta-api-setup.md`](docs/meta-api-setup.md) walks through finding
your App ID and App Secret in the Meta dashboard, the one-time app settings, and the
connect flow, step by step with screenshots-free click paths and a troubleshooting table.

Create a Meta developer app, add Facebook Login for Web, and enable Instagram API with Facebook Login
(sometimes labelled Instagram Graph API; this integration does not use the separate Instagram Login
flow). Set the exact OAuth redirect URL from `META_REDIRECT_URI` in the app's Valid OAuth Redirect
URIs. The Facebook Page must be managed by the account that authorizes the app. For Instagram, switch
the Instagram account to Professional and link it to that Facebook Page. The Connect flow requests
the Page and Instagram publishing permissions (`pages_show_list`, `pages_read_engagement`,
`pages_manage_posts`, `instagram_basic`, and `instagram_content_publish`). Meta may require App
Review/Advanced Access before people other than app roles can connect. The app's Graph API version
is configurable in `config.local.php`.

Instagram is stricter than Facebook, and the studio says so instead of hiding it. An Instagram
professional account (Business or Creator) linked to that Page is required before anything can be
published, the image must be a JPEG of at most 8 MB behind a public HTTPS URL, and Stories accept no
caption at all. Carousels need one container per slide, Reels need video, and highlights, profile
fields and grid order have no API. The **Instagram → API limits** tab lists all of it task by task;
the daily publish cap is read from `content_publishing_limit` rather than assumed, because Meta's own
documentation quotes both 50 and 100 posts per 24 hours.

After setup, sign in to the site, choose **Publish**, connect the Meta account once, pick a Page,
select Facebook and/or its linked Instagram account, add an image and caption, then press **Publish
now**. It publishes image posts immediately (PNG is converted to JPEG in the browser for Instagram).
This does not publish Reels, Stories, scheduled posts, or text-only posts. When both platforms are
selected, Meta handles the two posts separately, so one may succeed if the other fails; the result is
shown per platform. `/api/health` is public and returns only basic health/version information.

### Security audit

The source review, PHP/Node comparison, repaired findings, no-live-test boundary, residual risks, and
manual Meta launch checklist are recorded in [`docs/meta-security-audit.md`](docs/meta-security-audit.md).
No Meta OAuth flow, account change, token revocation, remote image fetch, or real post was exercised.

### Optional Node hosting

For hosts that do support Node, the existing server can still run the private app after `npm run build`
and `npm start` with `NODE_ENV=production`. The Node server is an authentication/static-app host only:
it does **not** implement Meta OAuth, Page tokens or publishing. The publishing UI will report the
missing `/api/meta` service rather than simulate a connection. Use the PHP backend above for Meta.
Keep Node credentials in environment variables; do not commit `.env` or put credentials in frontend
code. Node sessions are revocable within the running process, use CSRF on logout, and expire after
eight hours; a server restart signs existing sessions out.

## Notes

- Creatives are drawn with the Canvas API at native resolution — no upscaling. The identity set is
  generated in the app (Profile & covers → Download identity set), so exported files always match the
  current brand data.
- Brand fonts (Cinzel, Marcellus, Plus Jakarta Sans, Tiro Tamil, Baloo Thambi 2, Noto Sans Devanagari,
  Yatra One) are self-hosted WOFF2 files; canvas font loading has a timeout and uses system fallbacks.
- Tamil and Devanagari never get letter-spacing — it breaks shaping — and long greetings shrink then
  wrap instead of overflowing the safe area.
- Prices verified 25 Oct 2026 against [astrosivam.com/services](https://astrosivam.com/services):
  Birth Jathagam — Basic/Kids 0–10/Students 11–18 US$5 · ₹470 · Bhava/Varga US$10 · ₹940 · Marriage Compatibility US$5 · ₹470 · Baby Naming US$5 · ₹470 ·
  Subha Muhurtham US$10 · ₹940 · Daily Panjangam free. Age-gated: /birth-jathagam auto-selects Kids 0–10 or Students 11–18 from the entered birth date; adult plans are Basic/Bhava/Varga. Everywhere: 1st report FREE (Beta, one per
  customer) · 90% refund before approval (within 3 working days) · reports checked every 6 hours,
  PDF + tax invoice emailed after admin approval · 7 days of astrologer chat. NOTE: the homepage
  cards on astrosivam.com currently show different amounts (US$18/22/15/20) — this suite follows
  /services (owner-confirmed). Keep both in sync.
- Delivery promise, office Address (Walajapet, Ranipet District, Tamil Nadu) and the free Daily
  Panjangam URL (astrosivam.com/panjangam) mirror the live site. Review assets are placeholders until
  genuine customer feedback and permission are verified; do not publish placeholder copy.
- Publishing is always a deliberate manual action from the Publish composer; there are no background or
  scheduled posts. The publisher now validates the file's own bytes before upload — JPEG, PNG, WebP, GIF,
  AVIF, HEIC, BMP and TIFF are recognised by magic number, anything outside JPEG/PNG is converted in the
  browser, Instagram gets a JPEG capped at 1440 px, and both platforms enforce the 8 MB / aspect-ratio /
  minimum-width rules with a reason for every rejection. A second confirmation step lists the Page,
  targets, file and caption length before a real post is sent, and the per-platform result shows Meta's
  raw error object when one platform fails. The other exports remain available for Meta Business Suite.
- Image and copy rules live in `src/lib/imageValidate.ts`, the layouts in `src/lib/fbCreative.ts`, and the
  post library in `src/data/fbCopy.ts`; `npm test` covers format sniffing, the rejection rules, caption
  limits, hashtag policy, and the mobile legibility audit.
