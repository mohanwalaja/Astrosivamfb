# ASTRO SIVAM Meta publishing security audit

**Date:** 27 October 2026  
**Scope:** Facebook/Instagram OAuth and publishing boundary, PHP production backend, Node authentication host, browser publisher and Meta status UI.  
**Safety:** No Meta credentials or live account were used. No OAuth flow was started, token was revoked, account changed, image URL fetched by Meta, or post published. All publishing checks below were source/static tests only.

## Executive summary

The production Meta integration is the PHP front controller in `hosting/index.php`. It keeps Page tokens server-side, encrypts its connection file with AES-256-GCM, uses an authenticated PHP session, validates OAuth state, and returns only a whitelisted Page status payload. The browser talks only to same-origin `/api/meta/*` routes. The Node server (`server.ts`) has no Meta OAuth, Graph API or publish routes; it is an app/auth host, not an alternative publishing backend.

The audit found missing expiry on OAuth state, weak revocation/CSRF behavior in the Node session, no publish rate limit, insufficient server-side image dimension checks, cached Instagram-link data that could outlive a live unlink, misleading status handling for Meta API failures, an unsafe “unknown status means ready” Instagram poll fallback, and a stale Graph API default. Those code paths have been hardened. The status UI now distinguishes verified connection, expiration, invalid token, permission, transport, and Graph API failures; it does not enable publish unless the selected Page token passes a live check.

**Still manual / not verified against Meta:** app-mode and app-review approval; exact granted permissions; live token validity and expiry; Page roles; professional Instagram linkage; public image fetch; current Graph API version support in the target app; actual successful/failing publish behavior. The Page-token expiry is deliberately shown as unknown unless Meta rejects it—the OAuth user-grant expiry is not equivalent to a Page-token expiry.

## Integration comparison

| Boundary | PHP (`hosting/index.php`) | Node (`server.ts`) |
|---|---|---|
| Meta routes | OAuth connect/callback, status, Page selection, disconnect, image publish | None; health now explicitly reports `metaPublishing: false` |
| OAuth state | Session-bound random 256-bit state, now one-use and max 10 minutes; callback also checks the authenticated session | Not implemented |
| Session | Strict-mode PHP session; Secure/HttpOnly/SameSite=Lax cookie (Lax is needed for Meta's top-level GET callback); 30-minute idle and 8-hour absolute timeout | Signed expiry + random nonce held in a server-side session map; Secure/HttpOnly/SameSite=Strict; logout requires CSRF and revokes the nonce; 8-hour expiry; process restart signs sessions out |
| CSRF | Session token required on select, disconnect and publish; OAuth uses state; login rotates the CSRF token | CSRF double-submit value is tied to the in-memory session and checked for logout; no Meta mutating routes exist |
| Tokens | Page tokens encrypted at rest in `hosting/storage/meta-connection.enc`, AES-256-GCM, key derived from `AUTH_SESSION_SECRET`; file mode 0600; not returned to browser | No Meta tokens or Meta API calls |
| Status | Probes only the selected Page live; other Page records are unverified until selected. Live response overrides cached names/Instagram linkage. Token is not called valid on transport/permission/API failure. | Does not claim Meta is connected and tells the user the PHP API is not deployed |
| Publish | PHP only; validated upload and server-side Page membership; per-Page throttle | Not available |

The private app password and Meta app secret reside in deployment configuration, not browser code. `hosting/.htaccess` denies HTTP access to config files and `storage/`; setup writes private config with mode 0600. Keep the config, storage files and environment secrets out of Git and backups accessible to the public web root.

## Findings and repairs

| Finding | Risk | Repair / present behavior |
|---|---|---|
| OAuth state had no age limit | Replayed/stale callback could remain acceptable while the session survived | State is consumed before code exchange, compared with `hash_equals`, and rejected if older than 10 minutes or from the future. Callback requires the authenticated PHP session. |
| OAuth redirect depended on config without exact-origin checking | Misconfiguration could send an authorization code to an unintended callback | Connect validates HTTPS `SITE_BASE_URL` and requires `META_REDIRECT_URI` to equal that origin plus `/api/meta/callback`; callback repeats HTTPS/path validation. Callback responses are `no-store` and `Referrer-Policy: no-referrer` to limit code/state referrer leakage. |
| OAuth error/cancel outcomes were too generic | Permission and connection setup failures were indistinguishable | A short-lived session flash returns a safe category and Meta code/subcode/trace id; it does not include tokens or authorization code. |
| Page list stopped at the first 100 records | Users with more than 100 managed Pages could not select every authorized Page | Uses cursor pagination, bounded at 1,000 Pages, validates cursor size/repetition, and never follows Meta's returned `paging.next` URL. |
| Cached Instagram account could remain shown after an unlink | UI could offer Instagram based on stale authorization metadata | Selected Page status now uses live Graph fields over stored metadata. A failed or unverified probe clears the cached Instagram id; Instagram is unavailable until the Page is verified. The publish route also rechecks that the selected Page still links to the stored Instagram account immediately before creating a media container. Only the selected Page is probed on status refresh to avoid one Graph call per Page. |
| Status conflated expired token, missing permission and API/network failure | Operators could reconnect unnecessarily or trust an unverified token | Maps Graph error 190/subcode 463 to `expired`, other 190 to `invalid_token`, 10/200 to `permission_error`, rate-limit codes to `rate_limited`, transport failure to `connection_error`, and other Graph rejection to `api_error`. UI shows code/subcode/trace where Meta supplied them. A Page is publishable only after a successful live probe. |
| Exact Page-token expiry was not reported | A stored token could be mistaken for one with known lifetime | OAuth `expires_in`, when Meta returns it, is stored as the *authorizing user grant* expiry. Page-token expiry remains `null`/unknown; the UI labels the distinction and checks the token live. No unsupported expiry is invented. |
| A probe that failed was represented as `tokenValid: false` | Network/permission errors looked exactly like a revoked token | `tokenValid` is `null` for permission, connection and general API errors; `false` only for missing/expired/invalid tokens; `true` only on a live successful Page read. |
| No server-side publishing throttle | An authenticated caller could repeatedly submit posts or retry rapidly | File-locked, per-Page server throttle: one request per 30 seconds, at most 10 per hour, with HTTP 429 and `Retry-After`. It is a local safety cap, not Meta's daily quota. |
| Upload validation trusted the UI for dimensions/ratio | Direct API requests could bypass browser checks and send excessive/unsupported images | Server checks multipart size, uploaded-file provenance, MIME by Fileinfo, actual JPEG/PNG dimensions, maximum 8,192 px per side and 40 MP, Facebook dimensions/ratio, Instagram JPEG/320–1,440 px/ratio, and caption character limits. Invalid platform values are rejected rather than silently filtered. |
| Instagram status polling treated a missing status as ready | Could attempt publish before Meta finished preparing the image | Only `FINISHED` permits `media_publish`; `ERROR`/`EXPIRED`, unknown states, and timeout fail closed. |
| Network failure during final photo submission could be mistaken for a clean failure | Blind retry might create a duplicate if Meta accepted the request but the response was lost | The server flags uncertain Facebook `/photos` and Instagram `/media_publish` transport outcomes; UI tells the operator to check the account before retrying. It does not retry automatically. |
| Node signed session was deterministic and logout only cleared the browser cookie | A copied cookie remained valid until expiry; logout had no CSRF check | Node now issues a random nonce backed by a revocable in-memory session, rotates it on login, checks CSRF on logout and deletes the nonce. No Meta routes were added. |
| Node was easy to misread as a second publisher | Users could expect OAuth/publish support from a Node deployment | Health response says `metaPublishing: false`; README and status UI clarify that Meta API routes are PHP-only. |
| PHP default was pinned at Graph v23 while the studio documented v26 as current | Old version can age out and produce avoidable API failures | Default, installer, example config and docs now use v26.0. Confirm the version is supported by the target Meta app before deployment and configure the version explicitly. |

## Security properties confirmed by source review

- OAuth App ID, App Secret, authorization code and Page tokens stay on the server. Browser components do not mention `access_token` or call `graph.facebook.com`.
- Page selection is constrained to Page IDs returned for the authenticated authorization; publish rechecks selected Page membership on the server and verifies the current Page-to-Instagram link again immediately before an Instagram post.
- All PHP mutations (select, disconnect, publish, logout) require the session CSRF token; GET connect uses OAuth state rather than a mutation endpoint.
- PHP callback is authenticated and session-bound. Strict PHP session mode, cookie-only sessions, session ID regeneration at login, HttpOnly cookies, and secure cookies on HTTPS are configured.
- Upload-serving URLs use a random 128-bit basename and are intentionally public for Meta's fetch. The media route only serves recent, local JPEG/PNG files after MIME checking; upload cleanup runs after the publish attempt. The token is not put in the URL.
- Page/user tokens for ordinary Graph reads and publishing go in an `Authorization: Bearer` header rather than the Graph URL. Graph requests use HTTPS, certificate verification, no redirects, and bounded connect/overall timeouts. Dynamic IDs are URL-encoded; Graph API version is constrained to `vN.N`.
- **OAuth exchange exception:** the current `/oauth/access_token` exchange uses GET query parameters, including the callback code, App Secret and short-lived user token. They travel server-to-server over HTTPS and are not sent to the browser, but can appear in hosting/egress URL logs. No code logs the full URL; still, configure hosting access/egress logs to redact or tightly restrict callback and token-exchange query strings.
- “Disconnect” deletes the encrypted local token store only. It does **not** call Meta's token-revocation endpoint. No token revocation was performed as part of this audit.

## Test and verification results

- Added 6 source-contract tests in `tests/meta-contract.test.ts` for OAuth state/redirect, encrypted storage and token non-disclosure, error categories, CSRF/session limits, server-side publish/upload guards, Node auth revocation, and PHP-only Meta publishing.
- **`npm test`: 172/172 pass.**
- **`npx tsc --noEmit`: clean.**
- **`npm run build`: successful.**
- Parsed `hosting/index.php` with a PHP 8.1 grammar parser: **syntax OK**.
- `git diff --check`: clean.
- The sandbox has no PHP interpreter, so PHP route execution and PHP-specific behavior were not runtime-tested. Static PHP parse and source-contract tests do not substitute for deployment testing.

No call was made to a Meta API endpoint. No Meta app configuration, permission, account, token, post, or remote image was touched.

## Remaining risks / manual Meta setup

1. **Use a private Meta developer app.** Add Facebook Login for Web. In Valid OAuth Redirect URIs, enter the exact HTTPS callback configured on the site: `https://<site-origin>/api/meta/callback` (no extra slash/path/query). Keep `META_APP_SECRET` only in private PHP config/environment.
2. **App status and review.** In the Meta developer dashboard, verify app mode, test/admin roles, business verification if requested, Advanced Access/App Review for the requested permissions, and that the authorizing user has the correct Page task/role. Requests are `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`. The code requests them; only Meta can grant/approve them.
3. **Page and Instagram setup.** The Facebook Page must be returned by `/me/accounts`. For Instagram publishing, use a Business or Creator account linked to that Page. The live Page probe must return `instagram_business_account`; cached linkage alone is not enough.
4. **Expiry and permissions.** Reconnect when Meta reports token code 190. The UI may show an OAuth user-grant expiry returned by Meta, but it cannot promise the Page token expires at the same time. Scope inspection via Meta's token-debugging endpoint is not implemented; missing grants are identified when live reads/publish calls return permission errors.
5. **Image fetch.** `SITE_BASE_URL` must be the public HTTPS site origin; Meta needs to fetch the random temporary `/_meta-media/<name>` image URL. Test reachability from outside the host in a deliberate prelaunch test. Hosting firewalls, basic-auth proxies, WAF rules or `robots`/CDN behavior can still prevent Meta from fetching it.
6. **Graph version.** v26.0 is the configured default based on the studio's current API reference. Confirm it remains available for the Meta app, permissions and publishing endpoints immediately before go-live; update `META_GRAPH_VERSION` in private config if Meta's schedule requires another version.
7. **Hosting.** Confirm HTTPS, Apache rewrite and access-deny rules, PHP 8.1+, cURL/OpenSSL/Fileinfo, `upload_max_filesize` and `post_max_size` ≥ 9 MB, writable-but-private `storage/`, PHP execution time sufficient for media processing, and a private 0600 config. Check backups/logs for private data; redact/restrict query strings for `/api/meta/callback` and outbound OAuth token exchange. Rotating `AUTH_SESSION_SECRET` also changes the token-encryption key, so existing encrypted Page tokens become unreadable and must be reconnected.
8. **Quota and duplicate handling.** The 10/hour/Page throttle is a conservative application guard, not Meta's daily account quota. The integration does not query Meta publishing quota. If a final publish request times out, check the target account before retrying; a lost response can leave the outcome uncertain.
9. **After deployment.** First use a Meta test account/Page, verify each status/error class and the public image fetch, and only then—with account owner approval—perform an explicitly confirmed test post. That live step was intentionally not performed here.
