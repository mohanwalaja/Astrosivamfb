# PR: Age-gated Birth Jathagam + Facebook Integration + Site Scan

This PR merges work from `arena/47245725-astrosivamfb`:

1. **Full site scan (2026-10-31)** — `docs/site-scan-2026-10-31.md` covers all sitemap URLs, birth-jathagam form fields, pricing, delivery promises, and the auto-age-gate behaviour (0-10 Kids, 11-18 Students).
2. **5-plan Birth Jathagam** — `src/data/services/jathagam.ts` expanded to Kids (Bala Arishta, health, speech, Vidyarambham) + Students (Vidya/focus, stream hints, exam windows, 6-7yr timeline) auto-selected from DOB; new services `kidsJathagam.ts`, `studentsJathagam.ts`, helpers `resolveBirthPlan`/`ageFromDob`.
3. **Brand/README** — pricing updated for 5 plans.
4. **Meta Data-Deletion** — public `POST /api/meta/data-deletion` + `GET /data-deletion-status` in `hosting/index.php` for the configured Meta developer app.
5. **Installer Meta integration** — `/setup` walks through Privacy Policy, Data-Deletion Callback, App Domains, and the Valid OAuth Redirect URI with copyable values. App credentials are entered by the owner; no particular App ID is prefilled.

Built dist at `dist/` → Drive zips: `dist-2026-10-31-kids-0-10-students-11-18-age-gate.zip`, `dist-2026-10-31-data-deletion-callback.zip`, `dist-2026-10-31-installer-facebook-integrated.zip`.
