# Fresh Facebook + Instagram API setup

This guide starts from **no Meta developer app** and ends with a connected Facebook Page and its linked Instagram professional account. It covers the Meta dashboard and this site's PHP host. Creating an app, retrieving its App ID, revealing its App Secret, approving permissions, and choosing the Page must be done by the account owner in Meta; this repository cannot sign in to Meta or create an app on your behalf.

> **Never send anyone your App Secret, Facebook password, two-factor code, OAuth code, or access token.** Enter the App Secret only in Meta's dashboard and the private PHP-host setup/configuration. The App ID is public, but the Secret and tokens are not.

## Before you start

You need:

- A personal Facebook account enrolled in Meta for Developers. That account must be an **Admin** of the developer app and have the access needed to manage the Facebook Page.
- A public, working **HTTPS** deployment of this site on PHP. The Meta OAuth and publishing endpoints are in `hosting/index.php`; the Vite/Node preview and the Node production host do **not** implement Meta OAuth or publishing.
- A Facebook Page you manage. For Instagram publishing, the Instagram account must be **Business or Creator** and linked to that Page.
- The site's public origin, e.g. `https://suite.astrosivam.com`. Do not use localhost, an Arena preview URL, or a temporary hosting URL for a live app.

If your site is not deployed on PHP yet, first follow [BigRock PHP hosting and Meta publishing in the README](../README.md#bigrock-php-hosting-and-meta-publishing). You can create the Meta app before deployment, but you will need the final HTTPS domain for the redirect URI.

## 1. Create a new Meta app

If you already have an app that you administer, skip to **Step 2**. Otherwise:

1. Sign in at [Meta for Developers](https://developers.facebook.com/) with the Facebook account that manages the Page. If asked, complete Meta's developer registration and accept its terms.
2. Open [My Apps](https://developers.facebook.com/apps/) and choose **Create app**.
3. Follow the current creation wizard. For new apps, choose a business type or use case that supports **Facebook Login for Business / Unified Login** and the **Instagram API with Facebook Login**. If Meta asks for a business portfolio, select the portfolio that owns or manages the Page. The dashboard wording can change.
4. Give the app a name and contact email, then finish **Create app**. Keep it in **Development** mode while testing.
5. Open the new app's dashboard. In the left menu, choose **App settings → Basic** (older dashboard: **Settings → Basic**).
6. Copy the numeric **App ID** shown on this page or at the top of the dashboard. This is the value for `META_APP_ID`; it is not the App Secret.
7. On the same **Basic** page, find **App Secret** and press **Show**. Complete Meta's identity check if prompted, then copy it directly into a password manager. This is the value for `META_APP_SECRET`. Only an app Admin can reveal it.

### App ID, App Secret, and access token are different

| Value | What it is | Where it comes from | Where it belongs |
| --- | --- | --- | --- |
| App ID | Public numeric identifier for your developer app | App dashboard / App settings → Basic | PHP host configuration; safe to identify the app |
| App Secret | Password for the app | App settings → Basic → Show | Private PHP configuration only |
| Facebook Login Configuration ID | Identifies the permission/asset configuration (not a password or access token) | Facebook Login for Business → Configurations | `META_LOGIN_CONFIG_ID` in the setup form/PHP config |
| User/Page access token | Authorization granted for an account/Page | Fetched by the site's **Connect Meta account** flow | Encrypted storage on the PHP host; never copy it by hand |

Do not use a third-party app or an app whose Secret you do not control. If the app is missing from **My Apps**, check that you are signed in with the account that created it, switch business portfolios, or ask an existing app Admin to add you as an Admin. Do not make a duplicate app just because the dashboard is showing a permissions/review warning.

## 2. Add the login and Instagram API capabilities

New Meta apps that use the supported Instagram business use case may require **Unified Login** through **Facebook Login for Business**. The suite supports both that configuration flow and the legacy scope-based OAuth flow.

1. In **Facebook Login for Business → Configurations**, create a configuration for a **User access token** (this studio publishes after a user action; do not choose a System User token). Select the Facebook Page and its linked Instagram professional account/assets that the setup allows you to choose.
2. Add the five permissions listed in Step 4 to that configuration. The PHP callback exchanges an authorization code server-side; Meta documents User access tokens as implicit by default but able to support the authorization-code grant. If the dashboard offers a response/grant choice, enable **Authorization Code**. The site sends `response_type=code` and `override_default_response_type=true`. Save the configuration and copy its numeric **Configuration ID** into `META_LOGIN_CONFIG_ID` on `/setup` or `/setup/meta`.
3. Enable **Instagram API with Facebook Login** (some dashboards label it Instagram Graph API or make it part of the app's Unified Login use case). This app uses Facebook credentials and a Page-linked professional Instagram account; it does not use the separate Instagram Login flow.
4. Register the exact callback from Step 3 in the app's redirect settings. Keep the app in **Development** mode while testing. Add the Facebook account under **App roles** (Admin, Developer, or Tester) and accept the invitation; that account must also have the needed Page access. **Development-mode posts and photos are visible only to people with an app role.** Before using the integration for public Page posts, complete the applicable review/Advanced Access requirements and switch the app to **Live** mode; do not switch prematurely if Meta still shows required permissions as unapproved.

For a new Unified Login app, the site sends `config_id` and intentionally omits the legacy `scope` parameter. Select permissions in the Meta configuration itself. Leave `META_LOGIN_CONFIG_ID` blank only for an older classic OAuth app that supports direct scopes. See Meta's [Facebook Login for Business documentation](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business) for current configuration behavior.

## 3. Set the domains and exact callback URLs

For this example, assume the final site address is `https://suite.astrosivam.com`. Replace it everywhere with your own **public HTTPS origin** if different.

1. In **App settings → Basic**, set **App Domains** to the bare host: `suite.astrosivam.com` — no `https://`, slash, or path. Add the parent domain too only if Meta asks for it.
2. Set the **Privacy Policy URL** to the public privacy policy for this service. This project's privacy policy is `https://astrosivam.com/privacy-policy`.
3. If the Basic settings show **User Data Deletion**, set its callback to `https://suite.astrosivam.com/api/meta/data-deletion`. This PHP endpoint is included in the project.
4. Open the relevant **Facebook Login / Facebook Login for Business settings**. In **Valid OAuth Redirect URIs** (or the matching redirect-URI field), add this exact URI and save it:

   ```text
   https://suite.astrosivam.com/api/meta/callback
   ```

   The callback must match `META_REDIRECT_URI` character-for-character: HTTPS, same hostname, exact path, no trailing slash or query string. The setup installer displays copy buttons for the URLs based on the site address you enter.

5. Choose the closest app **Category** available (the setup page suggests **Lifestyle** for this project), complete any other required Basic settings Meta marks, then save.

## 4. Make the required permissions available

The site needs these five permissions for Page discovery and publishing:

```text
pages_show_list
pages_read_engagement
pages_manage_posts
instagram_basic
instagram_content_publish
```

For **Unified Login**, select all five permissions in the Facebook Login for Business configuration; the site sends that configuration's ID instead of a `scope` list. For an older classic OAuth app, open **App Review → Permissions and features** (sometimes **Use cases → Permissions and features**) and make the five permissions available; the site requests them as scopes. Meta's Standard/Advanced Access and review rules vary by permission and app. In Development mode, use an app Admin/Developer/Tester for the initial test. Before unrelated people can use the integration, complete applicable App Review/Advanced Access and business-verification requirements.

If a new app reports **Invalid Scopes**, confirm it is using Unified Login, create a Facebook Login for Business configuration with the permissions above, then save that configuration's ID in the setup page. The app's new flow does not send the legacy scope list.

## 5. Save the credentials on the PHP host

### First-time installation

On the already-deployed PHP site, open `https://suite.astrosivam.com/setup`. Use the one-time key from `storage/setup.key`, set the site's login, and enter the App ID and App Secret in the Meta section. If the app uses Unified Login, also enter the Facebook Login for Business Configuration ID. The installer writes these to private `hosting/config.local.php` and derives:

```text
SITE_BASE_URL     = https://suite.astrosivam.com
META_REDIRECT_URI = https://suite.astrosivam.com/api/meta/callback
```

Make sure the website address in the installer is the **same origin** used in Meta's callback settings. Keep `storage/` writable but private; the installer removes the one-time setup key after success.

### If the site is already installed

Do **not** rerun the one-time installer. Sign in to the deployed PHP site and open `https://suite.astrosivam.com/setup/meta`. This protected setup page lets you configure the Meta App ID, App Secret, Facebook Login for Business Configuration ID, site HTTPS origin, Graph API version, and the suite's login username in one place. You can also set a new login password there; leave both new-password fields blank to keep the current password. The password is never shown again, and the new credentials apply to future sign-ins; already-authenticated sessions remain active until logout or normal timeout. The callback URI is generated from the site origin; the page also gives copy buttons for App Domains, the Data Deletion callback, the Privacy Policy URL, and the five requested permissions. If the same App ID is already saved, leave the App Secret blank to keep it; changing the App ID requires its matching Secret.

Saving this page writes the values to private `hosting/config.local.php` and preserves `AUTH_SESSION_SECRET` so encrypted Page tokens remain readable. It does **not** modify Meta's developer dashboard for you. Copy the generated values into the Meta app's Basic and Facebook Login settings, then reconnect from **Publish**. If the setup page cannot save because the PHP host has locked down writes, use cPanel File Manager and preserve the rest of `config.local.php`:

```php
'META_APP_ID'        => 'your-numeric-app-id',
'META_APP_SECRET'    => 'your-private-app-secret',
'META_LOGIN_CONFIG_ID' => 'your-facebook-login-business-configuration-id',
'META_REDIRECT_URI'  => 'https://suite.astrosivam.com/api/meta/callback',
'META_GRAPH_VERSION' => 'v26.0',
'SITE_BASE_URL'      => 'https://suite.astrosivam.com',
```

The PHP config also accepts PHP environment variables with these names. Do not put production Meta secrets in frontend code, a public repository, screenshots, or this chat. `hosting/config.local.php` is intentionally private and git-ignored.

## 6. Connect and verify

1. Visit the deployed HTTPS site, sign in, and open **Publish** from the header to connect Meta once.
2. Click **Connect Meta account**. The browser should open a Facebook authorization dialog. Sign in as the app-role user who manages the Page and approve the requested permissions.
3. Choose the Facebook Page returned by Meta. The Instagram account must be linked to that Page and be Business or Creator. If it is not linked, fix it in Meta Business Suite/Instagram account settings, then reconnect.
4. The site's live status check should show a valid Page connection and, where configured, the linked Instagram username. Then return to a supported single-image design and tap **Publish now** once. The artwork and separate Facebook/Instagram captions and hashtags load automatically, the media is validated, and the post is sent immediately without a second confirmation. If the Page or image needs attention, the publisher explains what to fix. It is not a draft or schedule.
5. Confirm `https://suite.astrosivam.com/api/health` returns a PHP health response. If you see a **service not deployed** message or `/api/meta` is missing, you are probably testing the Vite/Node version or the wrong document root; deploy the `hosting/` PHP backend.

No API tokens should be copied into a browser, Meta's App Secret should never be sent through chat, and no real post should be made without the Page owner's approval.

## Troubleshooting

| What you see | Check this |
| --- | --- |
| App ID is not visible / app missing from My Apps | Sign in with the personal Facebook account that created the app; switch portfolio; have an existing app Admin grant you the Admin role. |
| **Invalid OAuth redirect URI**, URL blocked, or error 191 | Match the Facebook Login Valid OAuth Redirect URI to `SITE_BASE_URL + /api/meta/callback` exactly. Use the final HTTPS domain, not localhost, Arena preview, `www` vs non-`www`, or a trailing slash. |
| **Invalid Scopes** listing all five permissions | For a new app using Unified Login, create a Facebook Login for Business **User access token** configuration, select all five permissions and the Page/Instagram assets, then save its numeric Configuration ID in `/setup/meta`. The site must send `config_id` instead of `scope`; leaving the field blank uses legacy OAuth and will keep failing for a new Unified Login app. |
| Login says the app is in development / user is not allowed | Add that Facebook account to App roles and accept the invitation. A non-role user needs the applicable review/advanced-access approval and the app must be ready for public use. |
| Connect succeeds, but no Facebook Pages are listed | The authorizing Facebook account has no eligible Page access, `pages_show_list` was not granted, or the app/account lacks access to the Page. Use the account that manages the Page and reconnect. |
| Page appears, but Instagram is missing | Switch Instagram to Business or Creator, link it to the same Facebook Page, make sure the authorizing Facebook user can manage both, then reconnect. |
| Facebook publishing works but Instagram gets permission error | Confirm `instagram_basic` and `instagram_content_publish` are available and granted, the Instagram API/Facebook Login setup is enabled, and the selected Page still links to that professional account. Check the Meta code/subcode shown in the studio. |
| The update appears in the Page's **Photos** tab but not on the Page timeline/followers' feeds | The publisher used to stop at `POST /{page-id}/photos`, which only files the image in the photo library. It now uploads the photo with `published=false`, then creates a real Page post with `POST /{page-id}/feed` and `attached_media[0]={"media_fbid":...}`. That feed post is what appears on the timeline and in followers' feeds. If you still see photo-only results, confirm the deployed `hosting/index.php` includes `facebook_publish()` and that the app is in **Live** mode. |
| You can see the API post/photo, but other people cannot or only the photo appears | This is the classic **Development mode** visibility symptom. In the Meta app dashboard, complete the applicable App Review/Advanced Access requirements, then switch **App mode → Live**. Reconnect the Page, publish one new test post, and open its permalink while logged out or in a private browser. A photo-only API response is not treated as success by the current publisher; Facebook must return a Page feed `post_id`. |
| `(#200)` permissions error | Verify the exact permission for the failed platform, Page access/task, app mode and any review status required. Reconnect after changing grants. |
| **Service is not deployed** or `META_APP_ID... must be set` | This OAuth/publishing backend is PHP-only. Check the BigRock document root contains `index.php`, `dist/`, and private `config.local.php`; ensure HTTPS and PHP cURL/OpenSSL/Fileinfo are enabled. |
| Meta shows **Currently ineligible** | Read the exact item Meta marks incomplete under the app's use case, permission, review, or business verification. Filling in App Domains/redirects alone does not grant Advanced Access or approve the app. |
| Page token reports expired/invalid | Use **Reconnect** in the Publish panel. The site obtains fresh tokens; never paste an access token manually. |

## Security notes

- The App Secret and Page tokens stay on the PHP host. Page tokens are encrypted at rest; the browser receives status fields only.
- `hosting/config.local.php` and `hosting/storage/` must remain private and out of Git. Do not share `storage/` backups or publish PHP error logs containing sensitive query strings.
- If an App Secret is exposed, reset it in **App settings → Basic**, update the PHP config, and reconnect.
- This guide does not perform app creation, permission review, account linking, token exchange, or live publishing. Those require the account owner's explicit action in Meta and on the deployed site.
