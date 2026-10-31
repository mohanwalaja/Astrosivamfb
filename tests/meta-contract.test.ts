import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The publishing contract spans three places: the browser client, the PHP
 * service, and Meta. These checks keep the boundaries honest — no simulated
 * success in the UI, no token in the status payload, and no direct Graph call
 * from the browser (which would need a token in the page).
 */

const ROOT = new URL("..", import.meta.url).pathname;
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const PHP = read("hosting/index.php");
const STATUS = read("src/components/MetaStatus.tsx");
const PUBLISHER = read("src/components/Publisher.tsx");
const SUITE = read("src/components/FacebookSuite.tsx");
const HTACCESS = read("hosting/.htaccess");

test("the status payload is read back from the Graph API, not stored assumptions", () => {
  assert.match(PHP, /function meta_probe_page\(/, "the page probe must exist");
  assert.match(PHP, /array_merge\(\$page, \$probe\)/, "fresh Graph fields must override cached Page and Instagram link metadata");
  assert.match(PHP, /\$lastError = \$_SESSION\['meta_last_error'\] \?\? null;[\s\S]*?'lastError' => \$lastError/, "OAuth setup failures survive one status read, then are consumed");
  assert.match(PHP, /'instagramStatus' => \$instagram \? 'linked' : 'not_linked'/);
  assert.match(PHP, /Page’s linked Instagram account changed or is no longer available/);
  assert.match(PHP, /!hash_equals\(\$instagramId, \$liveInstagram\)/, "Instagram target is revalidated against the live Page relation immediately before publishing");
  assert.match(PHP, /'instagramStatus' => 'unknown'/, "failed probes must not present cached Instagram links as verified");
  assert.match(PHP, /'fields' => 'id,name,category,fan_count,link,instagram_business_account/, "the probe asks Meta for live fields");
  assert.match(PHP, /'checkedAt' => gmdate\('c'\)/, "status reports when it was checked");
  assert.match(PHP, /'graphVersion' => meta_graph_version\(\)/, "status reports the pinned Graph version");
  assert.match(PHP, /'tokenValid' => false/, "a dead token is reported, never assumed valid");
});

test("the status route cannot leak a Page access token", () => {
  const body = PHP.slice(PHP.indexOf("function meta_pages_for_status"), PHP.indexOf("function current_page"));
  assert.doesNotMatch(body, /access_token/, "meta_pages_for_status must whitelist fields explicitly");
  for (const field of ["id", "name", "instagramId", "instagramUsername"]) {
    assert.match(body, new RegExp(`'${field}'`), `status should expose ${field}`);
  }
});

test("publishing failures carry Meta's own error object", () => {
  assert.match(PHP, /class MetaApiException[\s\S]*public array \$graph/, "the exception must carry the graph payload");
  for (const key of ["type", "code", "subcode", "traceId", "httpStatus"]) {
    assert.match(PHP, new RegExp(`'${key}' =>`), `the graph payload should include ${key}`);
  }
  assert.match(PHP, /meta_error_hint\(\$graph, \$platform\)/, "Meta API failures need a code-specific fix");
  assert.match(PHP, /'hint' => \$error instanceof MetaApiException/, "local/transport failures must not be mislabeled as Meta rejections");
  for (const code of ["case 190:", "case 200:", "case 368:", "case 613:"]) {
    assert.ok(PHP.includes(code), `Meta error ${code} needs a documented hint`);
  }
});

test("the client renders the raw code, subcode and trace id", () => {
  assert.match(PUBLISHER, /result\.graph\.code/, "the UI must show Meta's code");
  assert.match(PUBLISHER, /result\.graph\.subcode/, "the UI must show Meta's subcode");
  assert.match(PUBLISHER, /result\.graph\.traceId/, "the UI must show fbtrace_id for support");
  assert.match(PUBLISHER, /result\.hint/, "the UI must show the matching fix");
});

test("the browser never calls the Graph API directly", () => {
  for (const [name, source] of Object.entries({ STATUS, PUBLISHER, SUITE })) {
    assert.doesNotMatch(source, /graph\.facebook\.com/, `${name} must go through the PHP service`);
    assert.doesNotMatch(source, /access_token/, `${name} must never handle a token`);
  }
});

test("an unreachable service is reported as such, never as a connection", () => {
  assert.match(STATUS, /not deployed|is not responding/, "the UI must name the missing service");
  assert.match(STATUS, /No live Meta result to show/, "the empty state must be explicit");
  assert.doesNotMatch(STATUS, /connected:\s*true/, "the client must not invent a connected state");
  // The client types `connected` from the server and branches on it.
  assert.match(STATUS, /payload\.connected|live\.connected/, "connection state comes from the payload");
});

test("publishing requires an explicit confirmation listing page, targets and file", () => {
  assert.match(PUBLISHER, /setConfirming\(true\)/, "the first submit only prepares and asks");
  assert.match(PUBLISHER, /Confirm this publishes right now/, "the confirmation must be unambiguous");
  assert.match(PUBLISHER, /This sends a real post\. Nothing here is a draft\./, "the consequence must be stated");
  assert.match(PUBLISHER, /Page · \{selectedPage\.name\}/, "the confirmation lists the Page");
  assert.match(PUBLISHER, /Targets · \{platforms\.join/, "the confirmation lists the targets");
});

test("the publisher validates the file instead of converting blindly", () => {
  assert.match(PUBLISHER, /validateImageFile/, "uploads run through the shared validator");
  assert.match(PUBLISHER, /prepareImage/, "conversion happens once the file is validated");
  assert.doesNotMatch(PUBLISHER, /function imageAsJpeg/, "the old unchecked converter must be gone");
  assert.match(PUBLISHER, /accept=\{ACCEPTED\}/, "the picker should accept every readable format");
});

test("publishing is still a single deliberate multipart POST with CSRF", () => {
  for (const field of ['"image"', '"caption"', '"pageId"', '"platforms[]"']) {
    assert.ok(PUBLISHER.includes(`data.append(${field}`), `the upload must include ${field}`);
  }
  assert.match(PUBLISHER, /"X-CSRF-Token": csrf/, "the request must carry the CSRF token");
  assert.match(PHP, /if \(\$uriPath === '\/api\/meta\/publish' && \$method === 'POST'\)/, "the PHP route is unchanged");
  assert.match(PHP, /require_csrf\(\);/, "the PHP route still enforces CSRF");
});

test("the OAuth connect flow requests Page access and Instagram publishing scopes", () => {
  const connectStart = PHP.indexOf("if ($uriPath === '/api/meta/connect' && $method === 'GET')");
  const statusStart = PHP.indexOf("if ($uriPath === '/api/meta/status' && $method === 'GET')", connectStart);
  assert.notEqual(connectStart, -1, "the Meta connect route must exist");
  assert.notEqual(statusStart, -1, "the status route bounds the connect route");
  const connectRoute = PHP.slice(connectStart, statusStart);
  for (const permission of [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish",
  ]) {
    assert.ok(connectRoute.includes(permission), `OAuth must request ${permission}`);
  }
  assert.match(connectRoute, /'scope' => \$scopes/);
});

test("first-time setup does not pin a previous Meta app ID", () => {
  const setupStart = PHP.indexOf("function setup_page(");
  const loginStart = PHP.indexOf("function login_page()", setupStart);
  const setup = PHP.slice(setupStart, loginStart);
  assert.doesNotMatch(setup, /developers\.facebook\.com\/apps\/\d+|value="\d{10,}"/, "a new install must not inherit another app's ID");
  assert.match(setup, /name="meta_app_id"[^>]+placeholder="Your numeric App ID"/);
  assert.match(setup, /name="meta_app_secret"[^>]+type="password"/);
  assert.match(setup, /SITE_BASE_URL \+ \/api\/meta\/callback/);
});

test("post-install Meta and login setup is authenticated, CSRF protected, and keeps secrets private", () => {
  const authGate = PHP.indexOf("if (!$authenticated)");
  const setupRoute = PHP.indexOf("if ($uriPath === '/setup/meta' && $method === 'GET')");
  assert.ok(authGate >= 0 && setupRoute > authGate, "API setup routes must sit behind the authenticated-session gate");
  const routeEnd = PHP.indexOf("if ($uriPath === '/api/meta/connect'", setupRoute);
  const routes = PHP.slice(setupRoute, routeEnd);
  assert.match(routes, /\$_SESSION\['csrf_token'\][\s\S]*hash_equals/, "saving config must validate the session CSRF token");
  assert.match(routes, /save_meta_api_config\(/, "the protected route must persist validated settings");
  assert.match(routes, /login_username[\s\S]*login_password_confirm/, "login credentials can be configured beside Meta credentials");
  assert.match(routes, /hash_equals\(\$newLoginPassword, \$newLoginPasswordConfirm\)/, "password changes require a matching confirmation");
  assert.match(routes, /'AUTH_USERNAME' => \$loginUsername/);
  assert.match(routes, /\$settings\['AUTH_PASSWORD'\] = \$newLoginPassword/, "blank password fields must preserve the current password");

  const formStart = PHP.indexOf("function meta_api_setup_page(");
  const loginStart = PHP.indexOf("function login_page()", formStart);
  const form = PHP.slice(formStart, loginStart);
  assert.match(form, /name="meta_app_secret" type="password"/, "the App Secret is entered in a password field");
  assert.match(form, /SECRET_HINT/, "the user is told the saved secret is never displayed");
  assert.doesNotMatch(form, /value="\{\{APP_SECRET\}\}"/, "the saved secret must never be interpolated into HTML");
  assert.match(form, /name="login_username" value="\{\{LOGIN_USERNAME\}\}"/);
  assert.match(form, /name="login_password" type="password"/);
  assert.match(form, /name="login_password_confirm" type="password"/);
  assert.doesNotMatch(form, /name="login_password"[^>]*value=/, "the stored login password must never be rendered");
  assert.match(form, /name="site_base_url"/);
  assert.match(form, /name="graph_version"/);
  assert.match(form, /val-redirect/);
  assert.match(form, /val-deletion/);
  assert.match(STATUS, /href="\/setup\/meta"/, "the signed-in studio links to the protected setup page");

  const writerStart = PHP.indexOf("function save_meta_api_config(");
  const writer = PHP.slice(writerStart, formStart);
  assert.match(writer, /var_export\(\$localConfig/);
  assert.match(writer, /\['AUTH_USERNAME', 'AUTH_PASSWORD', 'META_APP_ID'/, "only the allowlisted site and Meta settings may be written");
  assert.match(writer, /rename\(\$temporary, \$configPath\)/, "config updates are installed atomically");
  assert.match(writer, /chmod\(\$configPath, 0600\)/, "the config file is private");
  assert.match(writer, /do not rotate AUTH_SESSION_SECRET/, "saving Meta settings must not invalidate encrypted tokens");
  assert.match(HTACCESS, /RewriteRule \^storage\(\?:\/\|\$\) - \[F,L\]/, "storage temp and token files are not directly served");
});

test("OAuth callback state is one-use, session-bound and expires after ten minutes", () => {
  assert.match(PHP, /random_bytes\(32\)/, "state must be unpredictable");
  assert.match(PHP, /meta_oauth_state_created_at/);
  assert.match(PHP, /stateCreatedAt < time\(\) - 600/, "old callbacks must be rejected");
  assert.match(PHP, /unset\(\$_SESSION\['meta_oauth_state'\]/, "state must be consumed before code exchange");
  assert.match(PHP, /hash_equals\(\$expectedState, \$returnedState\)/, "state comparison must be constant-time");
  assert.match(PHP, /valid_meta_redirect\(/);
  assert.match(PHP, /hash_equals\(\$expectedRedirect, \(string\) \$config\['META_REDIRECT_URI'\]\)/, "redirect must equal the configured HTTPS origin and callback path");
});

test("Page tokens are encrypted at rest and never included in status JSON", () => {
  assert.match(PHP, /Authorization: Bearer /, "Graph access tokens go in an authorization header, not the URL");
  assert.doesNotMatch(PHP, /\$params\['access_token'\] = \$token/);
  assert.match(PHP, /aes-256-gcm/);
  assert.match(PHP, /storage_key\(\)/);
  assert.match(PHP, /chmod\(\$target, 0600\)/);
  const statusWhitelist = PHP.slice(PHP.indexOf("function meta_pages_for_status"), PHP.indexOf("function current_page"));
  assert.match(statusWhitelist, /'instagramUsername'/, "status explicitly exposes only its display fields");
  assert.doesNotMatch(statusWhitelist, /access_token/);
});

test("PHP distinguishes token, permission, transport and Graph API failures", () => {
  for (const category of ["expired", "invalid_token", "permission_error", "connection_error", "api_error", "rate_limited", "account_link_error"]) {
    assert.ok(PHP.includes(`'${category}'`) || PHP.includes(`'${category}' =>`), `missing category ${category}`);
  }
  assert.match(PHP, /if \(\$code === 190\) return \$subcode === 463 \? 'expired'/);
  assert.match(PHP, /case 200:/);
  assert.match(PHP, /'tokenExpiresAt' => null/, "the API does not claim an unknown Page-token expiry");
  assert.match(STATUS, /Exact Page-token expiry is unknown/);
  assert.match(PUBLISHER, /selectedPage\?\.tokenStatus === "valid"/, "publishing is disabled unless live token probe passes");
});

test("all PHP state-changing Meta routes require CSRF and the session expires", () => {
  for (const route of ["select", "disconnect", "publish"]) {
    const routeStart = PHP.indexOf(`if ($uriPath === '/api/meta/${route}'`);
    assert.notEqual(routeStart, -1, `route ${route} must exist`);
    assert.match(PHP.slice(routeStart, routeStart + 260), /require_csrf\(\)/, `${route} must require CSRF`);
  }
  assert.match(PHP, /lastActivity >= 1800/, "PHP sessions have a 30-minute idle timeout");
  assert.match(PHP, /now - \$authenticatedAt >= 28800/, "PHP sessions have an eight-hour absolute timeout");
  assert.match(PHP, /'samesite' => 'Lax'/, "OAuth top-level GET callback must retain PHP session cookie");
});

test("publish endpoint rate-limits, validates actual image dimensions and enforces server-side platform rules", () => {
  assert.match(PHP, /function publish_rate_limit\(/);
  const publishRoute = PHP.slice(PHP.indexOf("if ($uriPath === '/api/meta/publish'"));
  assert.match(publishRoute, /\$liveCheck = meta_probe_page\(/, "server publishing must live-check the token");
  assert.match(publishRoute, /\(\$liveCheck\['tokenValid'\] \?\? null\) !== true/, "unverified tokens must be rejected server-side");
  assert.ok(publishRoute.includes("$liveCheck['instagramStatus']") && publishRoute.includes("$page['instagram_id']"), "Instagram publishing requires a live linked-account check");
  assert.match(PHP, /at most one request per 30 seconds and ten per hour/);
  assert.match(PHP, /getimagesize\(/);
  assert.ok(publishRoute.indexOf("$platforms = $_POST['platforms']") < publishRoute.indexOf("in_array('facebook', $platforms"), "platforms must be validated before platform-specific checks");
  assert.match(PHP, /40000000/);
  assert.match(PHP, /Instagram requires a JPEG, 320–1,440 px wide/);
  assert.match(PHP, /Facebook image must be at least 200 px wide/);
  assert.match(PHP, /9 \* 1024 \* 1024/);
  assert.match(PHP, /outcomeUnknown/);
  assert.match(PUBLISHER, /avoid a duplicate/);
});

test("Node runtime is an auth gate, not a second Meta publisher, and revokes sessions on logout", () => {
  const NODE = read("server.ts");
  assert.match(NODE, /metaPublishing: false/);
  assert.doesNotMatch(NODE, /graph\.facebook\.com|\/api\/meta\/(?:publish|connect)/);
  assert.match(NODE, /activeSessions = new Map/);
  assert.match(NODE, /randomBytes\(24\)/);
  assert.match(NODE, /csrfMatches\(req\)/);
  assert.match(NODE, /activeSessions\.delete\(nonce\)/);
  assert.match(NODE, /clearCookie\("astrosivam_csrf"/);
});
