# Meta API setup — finding your App ID & App Secret, and connecting this site

You already created a Meta developer app; this guide is for the moment after that,
when nobody can remember **where the credentials actually are**. It covers where the
App ID and App Secret live in the Meta dashboard, the one-time app settings this
site needs, how to enter the credentials on the PHP host, and how to check the
whole chain works. Nothing here publishes anything or changes any live account.

---

## 1. Where the App ID and App Secret are (2 minutes)

1. Open <https://developers.facebook.com> in a browser that is logged in to the
   **personal Facebook account that created the app**. The app list is per account —
   being logged in to the wrong account is the single most common reason an app
   "disappears".
2. Click **My Apps** (top-right, the app-switcher grid). Every app you can reach is
   listed there, grouped under its business portfolio. If the list looks empty, use
   the portfolio dropdown at the top of that page to switch portfolios.
3. Click your app's name. The **App Dashboard** opens.
4. **App ID** — the number shown at the top of the dashboard under the app name, and
   again under **App settings → Basic**. It looks like `1082345678904470`. It is
   *not* secret; it is safe to write down anywhere.
5. **App Secret** — open **App settings → Basic** in the left sidebar. In the
   **App secret** row click **Show**. Meta asks for your Facebook password (plus your
   two-factor code if you have it), then reveals a 32-character hex string. Copy it
   straight into your password manager and treat it exactly like a password.
   - Older dashboard layout: the same page lives under **Settings → Basic**.
   - No **Show** button, or the row is blank? You are not an **Admin** of this app —
     see the troubleshooting table below.
6. Keep that **Basic** page open: step 4 pastes both values into the site.

### App ID vs App Secret vs access token

| Credential | What it is | Where it comes from | Who may see it |
| --- | --- | --- | --- |
| App ID | Your app's public identifier | Dashboard header / **App settings → Basic** | Anyone |
| App Secret | Your app's password | **App settings → Basic → Show** | The PHP server only |
| User / Page access tokens | Per-account keys that actually post | The site obtains these itself during **Connect** | The PHP server only (encrypted at rest) |

You never copy a token by hand — the Connect flow in step 5 fetches and stores them.

---

## 2. If the app is not visible at all

- <https://developers.facebook.com/apps/> is the raw list of every app the logged-in
  account can reach. Start there.
- **Wrong account:** apps belong to the personal account — or the business portfolio —
  that created them. Log in with the account used at creation time. If an agency or
  colleague created it, ask them to add you as an admin on the app's **Roles** page
  (App roles → Roles), or to move the app into a portfolio you both share.
- **Business portfolio apps** also appear at <https://business.facebook.com> →
  **Settings → Accounts → Apps**, which is a good cross-check.
- A deleted app cannot be restored; making a replacement takes about two minutes
  (**My Apps → Create app → Business type**), then continue at step 3.

---

## 3. One-time app settings (in the App Dashboard)

1. **Add Product** (left sidebar): add **Facebook Login** (choose **Web**) and
   **Instagram Graph API**. These two products unlock everything the publisher uses.
2. **Facebook Login → Settings → Valid OAuth Redirect URIs**: add exactly one URL —
   your site's public HTTPS origin plus `/api/meta/callback`, for example
   `https://suite.astrosivam.com/api/meta/callback`. Save it. It must match
   `META_REDIRECT_URI` in step 4 **character for character** (https, no trailing
   slash), or the Facebook dialog will refuse to redirect back.
3. **App settings → Basic**: set **App Domains** to the bare domain
   (`suite.astrosivam.com` — no `https://`, no path) and fill the **Privacy Policy
   URL** and **Category** fields. The privacy policy URL is required before the app
   can ever switch to Live mode.
4. **Permissions.** Connect requests five scopes: `pages_show_list`,
   `pages_read_engagement`, `pages_manage_posts`, `instagram_basic` and
   `instagram_content_publish`. All five are *Advanced Access* permissions, which
   means:
   - While the app is in **Development mode** (the toggle at the top of the
     dashboard), only people with an app role — Admins, Developers, Testers — can
     complete Connect. For publishing to *your own* Page that is usually all you
     need, because the app owner is an Admin.
   - Before **anyone else** can connect, submit those permissions for **App Review /
     Advanced Access** under **App Review → Permissions and features**. Until Meta
     approves, other accounts will hit a permissions error at the dialog.
5. That is everything on Meta's side. The site exchanges the login code for a
   long-lived token by itself and encrypts the Page tokens on the PHP host — there
   is nothing else to copy out of the dashboard.

---

## 4. Entering the App ID and Secret on the site

The credentials live **only on the PHP host**, in `config.local.php` (git-ignored) or
as PHP environment variables with the same names. Two ways to set them:

- **During first-time setup:** the one-time installer at `https://your-site/setup`
  has an *"Optional: Meta publishing app"* section — paste the App ID and App Secret
  there together with the site login you are creating.
- **After install:** in cPanel File Manager open the site folder and edit
  `config.local.php` (create it from `hosting/config.example.php` if missing):

```php
'META_APP_ID'        => '1082345678904470',        // dashboard header
'META_APP_SECRET'    => 'abcd1234…32 hex chars',   // App settings → Basic → Show
'META_REDIRECT_URI'  => 'https://suite.astrosivam.com/api/meta/callback',
'META_GRAPH_VERSION' => 'v26.0',
'SITE_BASE_URL'      => 'https://suite.astrosivam.com',
```

Rules the publisher enforces:

- `META_REDIRECT_URI` must be the public HTTPS origin plus `/api/meta/callback` and
  must equal the Valid OAuth Redirect URI from step 3. The callback rejects anything
  else before a single request leaves the server.
- `SITE_BASE_URL` must be the public HTTPS origin, because Meta downloads the image
  being published from it.
- Never commit `config.local.php`, and never paste the App Secret into chat, email,
  issues or screenshots. If it ever leaks: **App settings → Basic → Reset**, then
  update the file — the old secret stops working immediately.

---

## 5. Connect and verify

1. Sign in to the site and open the **Publish** panel.
2. Press **Connect Meta account**. The Facebook dialog opens; log in with the account
   that manages the Page and approve the five permissions.
3. The site swaps the login code for a long-lived user token, reads your Pages from
   `me/accounts` (including each Page's linked Instagram professional account) and
   shows them for selection. Pick the Page you publish from.
4. The panel then reads live state back from the Graph API — Page name, Instagram
   username and the daily publishing quota. Seeing those means the setup is
   complete; the status tile in the studio (`MetaStatus`) shows the same state.
5. Optional terminal check that the ID/secret *pair* is valid, without touching any
   account:

   ```bash
   curl "https://graph.facebook.com/v26.0/app?access_token=YOUR_APP_ID|YOUR_APP_SECRET"
   ```

   A JSON object containing your app's name confirms the pair. (Quote the URL; some
   shells need the pipe written as `%7C`.)

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No **Show** button on the App secret row | You are not an Admin of the app | App roles → Roles: have an Admin add you, or copy the secret across in person |
| App missing from **My Apps** | Wrong personal account or business portfolio | Check <https://developers.facebook.com/apps/>, switch portfolio, or get added as an admin |
| Site redirects to `/?meta=not-configured` | `META_APP_ID`, `META_APP_SECRET` or `META_REDIRECT_URI` empty on the host | Fill all three in `config.local.php` (step 4) |
| Dialog error: *URL blocked / redirect URI isn't an exact match* | Saved redirect URI differs by even one character | Make Valid OAuth Redirect URIs identical to `META_REDIRECT_URI` |
| Dialog error 191 (*Can't Load URL*) | Redirect URI or App Domains not saved | Step 3, items 2–3 |
| Dialog succeeds but the site reports *no Pages* | You logged in with an account that manages no Page | Connect with the Facebook account that owns the Page |
| Page listed with no Instagram account | Instagram is not Professional, or not linked to that Page | In Meta Business Suite switch the IG account to Business/Creator and link it to the Page |
| Publish fails `(#200)` permissions error | Token lacks `pages_manage_posts` / `instagram_content_publish`, or app is in Development mode and the user has no role | Reconnect after granting; review step 3 item 4 |
| Publish fails `(#368)` or rate limits (4 / 17 / 32 / 613) | Meta-side temporary block or cap | Wait, then retry; the Publish panel shows the live quota |
| Connect worked before, now reports expired | The long-lived authorization window elapsed | Reconnect from the Publish panel; tokens are re-fetched |

---

## 7. Security ground rules

- The App Secret and all Page tokens stay on the PHP host. The browser only ever
  receives connection *status*, never credentials.
- `hosting/config.local.php` and `hosting/storage/` are git-ignored; the repository
  ships only `hosting/config.example.php` with empty values.
- Saved Page tokens are encrypted at rest on the host; the one-time `/setup`
  installer removes its own setup key (`storage/setup.key`) after success.
- Rotate the App Secret (**App settings → Basic → Reset**) the moment you suspect a
  leak, then update `config.local.php` and reconnect.

Related reading: the README section *BigRock PHP hosting and Meta publishing*, and
[`docs/meta-security-audit.md`](meta-security-audit.md) for the source review and the
manual launch checklist. No Meta OAuth flow, account change, token revocation, remote
image fetch or real post was exercised while writing this guide.
