<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && strtolower((string) $_SERVER['HTTPS']) !== 'off')
    || (isset($config['SITE_BASE_URL']) && str_starts_with((string) $config['SITE_BASE_URL'], 'https://'));
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Cache-Control: private, no-store');

$uriPath = rawurldecode((string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));
$distDirectory = is_dir(__DIR__ . '/dist') ? __DIR__ . '/dist' : dirname(__DIR__) . '/dist';
$storageDirectory = __DIR__ . '/storage';

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function secure_cookie(): bool
{
    global $isHttps;
    return $isHttps;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    $token = (string) $_SESSION['csrf_token'];
    setcookie('astrosivam_csrf', $token, [
        'expires' => time() + 28800,
        'path' => '/',
        'secure' => secure_cookie(),
        'httponly' => false,
        'samesite' => 'Strict',
    ]);
    return $token;
}

function require_csrf(): void
{
    $expected = (string) ($_SESSION['csrf_token'] ?? '');
    $actual = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($expected === '' || $actual === '' || !hash_equals($expected, $actual)) {
        json_response(['error' => 'Security token expired. Refresh the page and try again.'], 403);
    }
}

function require_login(): void
{
    if (($_SESSION['authenticated'] ?? false) !== true) {
        json_response(['error' => 'Authentication required'], 401);
    }
}

function login_rate_limit(string $action): bool
{
    global $storageDirectory, $config;
    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0700, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('Could not create private storage for login protection.');
    }
    $handle = fopen($storageDirectory . '/login-attempts.json', 'c+');
    if ($handle === false) throw new RuntimeException('Could not open private login-protection storage.');
    if (!flock($handle, LOCK_EX)) { fclose($handle); throw new RuntimeException('Could not lock login-protection storage.'); }
    rewind($handle);
    $data = json_decode((string) stream_get_contents($handle), true);
    if (!is_array($data)) $data = [];
    $now = time();
    foreach ($data as $key => $record) {
        if (!is_array($record) || (int) ($record['reset_at'] ?? 0) <= $now) unset($data[$key]);
    }
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $key = hash_hmac('sha256', $ip, (string) $config['AUTH_SESSION_SECRET']);
    $record = $data[$key] ?? ['count' => 0, 'reset_at' => $now + 900];
    $blocked = (int) ($record['count'] ?? 0) >= 8 && (int) ($record['reset_at'] ?? 0) > $now;
    if ($action === 'failed' && !$blocked) {
        $record['count'] = (int) ($record['count'] ?? 0) + 1;
        $record['reset_at'] = $now + 900;
        $data[$key] = $record;
    } elseif ($action === 'success') {
        unset($data[$key]);
    }
    if (count($data) > 10000) $data = array_slice($data, -5000, null, true);
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($data, JSON_UNESCAPED_SLASHES) ?: '{}');
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($storageDirectory . '/login-attempts.json', 0600);
    return $blocked;
}

/** Per-Page publishing throttle: at most one request per 30 seconds and ten per hour. */
function publish_rate_limit(string $pageId): int
{
    global $storageDirectory, $config;
    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0700, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('Could not create private rate-limit storage.');
    }
    $file = $storageDirectory . '/publish-attempts.json';
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) fclose($handle);
        throw new RuntimeException('Could not lock private publish-rate storage.');
    }
    rewind($handle);
    $data = json_decode((string) stream_get_contents($handle), true);
    if (!is_array($data)) $data = [];
    $now = time();
    $key = hash_hmac('sha256', $pageId, (string) $config['AUTH_SESSION_SECRET']);
    $times = array_values(array_filter($data[$key] ?? [], static fn($at) => is_int($at) && $at > $now - 3600));
    $retry = 0;
    if ($times && $times[count($times) - 1] > $now - 30) $retry = $times[count($times) - 1] + 30 - $now;
    elseif (count($times) >= 10) $retry = $times[0] + 3600 - $now;
    if ($retry === 0) $times[] = $now;
    $data[$key] = $times;
    if (count($data) > 5000) $data = array_slice($data, -2500, null, true);
    rewind($handle); ftruncate($handle, 0);
    fwrite($handle, json_encode($data, JSON_UNESCAPED_SLASHES) ?: '{}'); fflush($handle);
    flock($handle, LOCK_UN); fclose($handle); @chmod($file, 0600);
    return max(0, $retry);
}

function meta_graph_version(): string
{
    global $config;
    $version = (string) ($config['META_GRAPH_VERSION'] ?? 'v26.0');
    if (!preg_match('/^v[0-9]+\.[0-9]+$/', $version)) {
        throw new RuntimeException('Meta Graph API version is not configured correctly.');
    }
    return $version;
}

/**
 * A Graph API rejection, carrying Meta's own error object so the UI can show the
 * real code, subcode and trace id instead of a paraphrase.
 */
class MetaApiException extends RuntimeException
{
    public array $graph;

    public function __construct(string $message, array $graph = [])
    {
        parent::__construct($message);
        $this->graph = $graph;
    }
}

class MetaTransportException extends RuntimeException
{
    public bool $mayHaveCommitted;

    public function __construct(string $message, bool $mayHaveCommitted = false)
    {
        parent::__construct($message);
        $this->mayHaveCommitted = $mayHaveCommitted;
    }
}

class MetaLinkException extends RuntimeException {}

function meta_error_category(Throwable $error): string
{
    if ($error instanceof MetaTransportException) return 'connection_error';
    if ($error instanceof MetaLinkException) return 'account_link_error';
    if (!$error instanceof MetaApiException) return 'api_error';
    $code = (int) ($error->graph['code'] ?? 0);
    $subcode = (int) ($error->graph['subcode'] ?? 0);
    if ($code === 190) return $subcode === 463 ? 'expired' : 'invalid_token';
    if (in_array($code, [10, 200], true)) return 'permission_error';
    if (in_array($code, [4, 17, 32, 613, 368], true)) return 'rate_limited';
    return 'api_error';
}

function graph_request(string $method, string $endpoint, array $params, ?string $token = null): array
{
    global $config;
    if (!function_exists('curl_init')) {
        throw new MetaTransportException('PHP cURL is required. Enable the cURL extension in your BigRock PHP settings.');
    }
    $base = 'https://graph.facebook.com/' . meta_graph_version() . '/' . ltrim($endpoint, '/');
    // Keep access tokens out of URLs, access logs and redirect/referrer paths.
    $authHeader = $token !== null ? ['Authorization: Bearer ' . $token] : [];
    $method = strtoupper($method);
    if (!in_array($method, ['GET', 'POST'], true)) throw new RuntimeException('Unsupported Meta request method.');
    $url = $method === 'GET' && $params ? $base . '?' . http_build_query($params) : $base;
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 22,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => array_merge(['Accept: application/json'], $authHeader),
    ]);
    if ($method !== 'GET') {
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($params));
    }
    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if ($body === false) {
        $mayHaveCommitted = $method === 'POST' && (str_ends_with($endpoint, '/photos') || str_ends_with($endpoint, '/feed') || str_ends_with($endpoint, '/media_publish'));
        throw new MetaTransportException('Could not reach Meta. Check the hosting server outbound HTTPS and cURL settings.', $mayHaveCommitted);
    }
    $data = json_decode((string) $body, true);
    if (!is_array($data)) throw new RuntimeException('Meta returned an unreadable response.');
    if ($status < 200 || $status >= 300 || isset($data['error'])) {
        $error = is_array($data['error'] ?? null) ? $data['error'] : [];
        $message = (string) ($error['message'] ?? 'Meta rejected the request.');
        throw new MetaApiException($message, [
            'type' => $error['type'] ?? null,
            'code' => $error['code'] ?? null,
            'subcode' => $error['error_subcode'] ?? null,
            'traceId' => $error['fbtrace_id'] ?? null,
            'httpStatus' => $status,
        ]);
    }
    return $data;
}

function storage_key(): string
{
    global $config;
    $secret = (string) ($config['AUTH_SESSION_SECRET'] ?? '');
    if (strlen($secret) < 32) throw new RuntimeException('AUTH_SESSION_SECRET must be at least 32 characters.');
    return hash('sha256', 'astrosivam-meta-store:' . $secret, true);
}

function connection_file(): string
{
    global $storageDirectory;
    return $storageDirectory . '/meta-connection.enc';
}

function read_connection(): ?array
{
    $file = connection_file();
    if (!is_file($file)) return null;
    $parts = explode('.', trim((string) file_get_contents($file)));
    if (count($parts) !== 3) return null;
    $iv = base64_decode($parts[0], true);
    $tag = base64_decode($parts[1], true);
    $cipher = base64_decode($parts[2], true);
    if ($iv === false || $tag === false || $cipher === false) return null;
    $plain = openssl_decrypt($cipher, 'aes-256-gcm', storage_key(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($plain === false) return null;
    $data = json_decode($plain, true);
    return is_array($data) ? $data : null;
}

function save_connection(array $connection): void
{
    global $storageDirectory;
    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0700, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('Could not create the private storage folder.');
    }
    $iv = random_bytes(12);
    $tag = '';
    $plain = json_encode($connection, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($plain === false) throw new RuntimeException('Could not encode the Meta connection data.');
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', storage_key(), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    if ($cipher === false) throw new RuntimeException('Could not encrypt the Meta connection.');
    $payload = base64_encode($iv) . '.' . base64_encode($tag) . '.' . base64_encode($cipher);
    $target = connection_file();
    $temporary = $target . '.tmp-' . bin2hex(random_bytes(6));
    if (file_put_contents($temporary, $payload, LOCK_EX) === false) {
        throw new RuntimeException('Could not save the encrypted Meta connection. Check the storage folder permissions.');
    }
    @chmod($temporary, 0600);
    if (!rename($temporary, $target)) {
        @unlink($temporary);
        throw new RuntimeException('Could not securely update the Meta connection file.');
    }
    @chmod($target, 0600);
}

function meta_pages_for_status(?array $connection): array
{
    if (!$connection || !is_array($connection['pages'] ?? null)) return [];
    return array_map(static function (array $page): array {
        return [
            'id' => (string) ($page['id'] ?? ''),
            'name' => (string) ($page['name'] ?? 'Facebook Page'),
            'instagramId' => isset($page['instagram_id']) ? (string) $page['instagram_id'] : null,
            'instagramUsername' => isset($page['instagram_username']) ? (string) $page['instagram_username'] : null,
        ];
    }, array_values(array_filter($connection['pages'], static fn($page) => is_array($page) && !empty($page['id']))));
}

function current_page(array $connection, string $requestedId): ?array
{
    foreach (($connection['pages'] ?? []) as $page) {
        if (is_array($page) && hash_equals((string) ($page['id'] ?? ''), $requestedId)) return $page;
    }
    return null;
}

/**
 * Read one Page back from the Graph API.
 *
 * Returns the fields the status panel displays, plus whether the stored token
 * still works. A failure here is reported, never hidden: a Page that has revoked
 * our token must not look connected.
 */
function meta_probe_page(string $pageId, string $token, ?int $authorizationExpiresAt = null): array
{
    if ($token === '') {
        return ['tokenValid' => false, 'tokenStatus' => 'missing_token', 'tokenExpiresAt' => null,
            'authorizationExpiresAt' => $authorizationExpiresAt, 'fanCount' => null, 'link' => null,
            'category' => null, 'instagramId' => null, 'instagramUsername' => null, 'instagramStatus' => 'unknown', 'probeError' => 'No stored Page token.'];
    }
    try {
        $data = graph_request('GET', rawurlencode($pageId), [
            'fields' => 'id,name,category,fan_count,link,instagram_business_account{id,username}',
        ], $token);
        $instagram = is_array($data['instagram_business_account'] ?? null) ? $data['instagram_business_account'] : null;
        return [
            'tokenValid' => true,
            'tokenStatus' => 'valid',
            'tokenExpiresAt' => null,
            'authorizationExpiresAt' => $authorizationExpiresAt,
            'name' => (string) ($data['name'] ?? 'Facebook Page'),
            'category' => isset($data['category']) ? (string) $data['category'] : null,
            'fanCount' => isset($data['fan_count']) ? (int) $data['fan_count'] : null,
            'link' => isset($data['link']) ? (string) $data['link'] : null,
            'instagramId' => $instagram && isset($instagram['id']) ? (string) $instagram['id'] : null,
            'instagramUsername' => $instagram && isset($instagram['username']) ? (string) $instagram['username'] : null,
            'instagramStatus' => $instagram ? 'linked' : 'not_linked',
            'probeError' => null,
            'probeGraph' => null,
        ];
    } catch (Throwable $error) {
        $category = meta_error_category($error);
        $graph = $error instanceof MetaApiException ? $error->graph : null;
        $status = in_array($category, ['expired', 'invalid_token', 'permission_error', 'connection_error', 'rate_limited', 'api_error'], true)
            ? $category : 'api_error';
        $graphCode = is_array($graph) ? ($graph['code'] ?? null) : null;
        error_log('Meta page probe failed for Page ' . $pageId . ' [' . $category . ']' . ($graphCode !== null ? ' code ' . (string) $graphCode : ''));
        return [
            'tokenValid' => in_array($status, ['expired', 'invalid_token'], true) ? false : null,
            'tokenStatus' => $status,
            'tokenExpiresAt' => null,
            'authorizationExpiresAt' => $authorizationExpiresAt,
            'fanCount' => null,
            'link' => null,
            'category' => null,
            'instagramId' => null,
            'instagramUsername' => null,
            'instagramStatus' => 'unknown',
            'probeError' => $error->getMessage(),
            'probeGraph' => $graph,
        ];
    }
}

/**
 * Turn Meta's numeric error code into the action that actually fixes it.
 *
 * Codes are the ones documented in the Graph API error reference: 190 token
 * problems, 200 permissions, 368 temporarily blocked, 4/17/32/613 rate limits.
 */
function meta_error_hint(?array $graph, string $platform): string
{
    $code = isset($graph['code']) ? (int) $graph['code'] : 0;
    $subcode = isset($graph['subcode']) ? (int) $graph['subcode'] : 0;
    switch ($code) {
        case 190:
            return $subcode === 463
                ? 'The Page token expired. Reconnect the Page and publish again.'
                : 'The access token is invalid. Reconnect the Page; if it keeps failing, the authorizing account may have lost its role on the Page.';
        case 200:
        case 10:
            return 'The app is missing a publishing permission. pages_manage_posts and pages_read_engagement must be granted and approved in app review.';
        case 100:
            return 'Meta rejected a parameter. Check that the image is publicly reachable over HTTPS and that the page id is correct.';
        case 368:
            return 'Meta has temporarily blocked this Page from posting. Wait for the block to lift — retrying faster makes it longer.';
        case 4:
        case 17:
        case 32:
        case 613:
            return 'Rate limit reached. Wait a few minutes before retrying; do not loop the request.';
        case 9007:
        case 9004:
            return $platform === 'instagram'
                ? 'Instagram could not fetch the image. It must be a publicly reachable HTTPS JPEG under 8 MB.'
                : 'Meta could not fetch the image URL. Confirm SITE_BASE_URL is publicly reachable over HTTPS.';
        default:
            return 'Meta rejected the post. The code, subcode and trace id above are what Meta support will ask for.';
    }
}

/**
 * Publish a Page photo as a real feed post.
 *
 * Uploading to /photos on its own only files the image in the Page's photo
 * library. Even with published=true the response is a photo object, and the
 * image does not become a distributed Page feed story, so followers never see
 * it in their feed. The supported Page flow is two steps:
 *
 *   1. POST /{page-id}/photos with published=false  -> unpublished photo id
 *   2. POST /{page-id}/feed with attached_media[0]   -> the Page post id
 *
 * Step 2 is what puts the update on the Page timeline and in followers' feeds.
 */
function facebook_publish(array $page, string $imageUrl, string $caption): string
{
    $pageId = (string) ($page['id'] ?? '');
    $token = (string) ($page['access_token'] ?? '');
    if ($pageId === '' || $token === '') {
        throw new MetaLinkException('No connected Facebook Page token is available.');
    }

    $photo = graph_request('POST', rawurlencode($pageId) . '/photos', [
        'url' => $imageUrl,
        // Unpublished: the photo is only an attachment for the feed post below.
        'published' => 'false',
    ], $token);
    $photoId = (string) ($photo['id'] ?? '');
    if ($photoId === '') {
        throw new RuntimeException('Meta did not return a photo ID for the unpublished upload.');
    }

    try {
        $post = graph_request('POST', rawurlencode($pageId) . '/feed', [
            'message' => $caption,
            // attached_media is the documented way to turn an uploaded photo
            // into a Page feed post. The JSON value is form-encoded by
            // http_build_query as attached_media[0]={...}.
            'attached_media[0]' => json_encode(['media_fbid' => $photoId], JSON_UNESCAPED_SLASHES),
            'published' => 'true',
        ], $token);
    } catch (MetaApiException $error) {
        // The photo is uploaded but unpublished, so nothing was shown to
        // followers. Pass Meta's own error through without implying a post
        // exists, and without telling the operator to retry blindly.
        throw new MetaApiException(
            'The photo uploaded, but Meta rejected the Page feed post: ' . $error->getMessage(),
            $error->graph
        );
    }

    $postId = (string) ($post['id'] ?? '');
    if ($postId === '') {
        throw new RuntimeException('Meta accepted the feed post request but did not return a Page post ID.');
    }
    return $postId;
}

function instagram_publish(array $page, string $imageUrl, string $caption): string
{
    $instagramId = (string) ($page['instagram_id'] ?? '');
    $token = (string) ($page['access_token'] ?? '');
    $pageId = (string) ($page['id'] ?? '');
    if ($instagramId === '' || $token === '' || $pageId === '') throw new MetaLinkException('No linked Instagram professional account was found for this Page.');
    $pageData = graph_request('GET', rawurlencode($pageId), ['fields' => 'instagram_business_account{id,username}'], $token);
    $liveInstagram = is_array($pageData['instagram_business_account'] ?? null) ? (string) ($pageData['instagram_business_account']['id'] ?? '') : '';
    if ($liveInstagram === '' || !hash_equals($instagramId, $liveInstagram)) {
        throw new MetaLinkException('The Page’s linked Instagram account changed or is no longer available. Refresh status and reconnect before publishing.');
    }
    $container = graph_request('POST', rawurlencode($instagramId) . '/media', [
        'image_url' => $imageUrl,
        'caption' => $caption,
    ], $token);
    $creationId = (string) ($container['id'] ?? '');
    if ($creationId === '') throw new RuntimeException('Meta did not return an Instagram media container ID.');

    $finished = false;
    for ($attempt = 0; $attempt < 8; $attempt++) {
        if ($attempt > 0) usleep(750000);
        $status = graph_request('GET', rawurlencode($creationId), ['fields' => 'status_code'], $token);
        $code = strtoupper((string) ($status['status_code'] ?? ''));
        if ($code === 'FINISHED') { $finished = true; break; }
        if ($code === 'ERROR' || $code === 'EXPIRED') {
            throw new RuntimeException('Instagram could not prepare the image. Check the image dimensions and format.');
        }
        if ($code === 'IN_PROGRESS' || $code === 'PUBLISHED') continue;
        if ($code !== '') throw new RuntimeException('Instagram returned an unexpected media status (' . $code . '). The post was not published.');
    }
    if (!$finished) throw new RuntimeException('Instagram is still processing this image. Please try again shortly.');
    $published = graph_request('POST', rawurlencode($instagramId) . '/media_publish', ['creation_id' => $creationId], $token);
    return (string) ($published['id'] ?? '');
}

function setup_code_file(): string
{
    global $storageDirectory;
    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0700, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('The storage folder could not be created. Make storage/ writable in File Manager.');
    }
    $file = $storageDirectory . '/setup.key';
    if (!is_file($file)) {
        $handle = @fopen($file, 'x');
        if ($handle !== false) {
            fwrite($handle, bin2hex(random_bytes(32)));
            fflush($handle);
            fclose($handle);
            @chmod($file, 0600);
        }
    }
    $code = is_file($file) ? trim((string) file_get_contents($file)) : '';
    if (strlen($code) !== 64) throw new RuntimeException('Could not create the private setup key. Check storage/ permissions.');
    return $code;
}

function setup_page(string $error = ''): never
{
    header('Content-Type: text/html; charset=utf-8');
    $errorHtml = $error === '' ? '' : '<div class="error" role="alert">' . htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</div>';
    $html = <<<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>First-time setup · Astro Sivam</title>
<style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:18px;background:#161011;color:#f7f1e4;font:14px/1.55 system-ui,sans-serif}
  .wrap{max-width:780px;margin:24px auto;padding:26px 28px;border:1px solid rgba(231,206,164,.28);border-radius:18px;background:#1d1618}
  .tag{color:#e3ca99;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700}h1{font:500 26px Georgia,serif;margin:8px 0 6px}
  p{color:#b4a58f;font-size:13px;line-height:1.6}.note{padding:12px 14px;background:rgba(199,154,60,.07);border:1px solid rgba(199,154,60,.22);border-radius:10px;color:#eddcb8;font-size:12px;line-height:1.55}
  .error{margin:14px 0;padding:11px 13px;border:1px solid #d8826f;border-radius:9px;background:rgba(216,130,111,.11);color:#f2b7a9;font-size:13px}
  label{display:block;margin:14px 0 6px;font-size:11.5px;color:#c7b9a3;font-weight:600;letter-spacing:.04em}input{width:100%;padding:10px 11px;border:1px solid rgba(231,206,164,.16);border-radius:8px;background:#140f10;color:#fff;font:inherit;font-size:14px}
  input:focus{outline:2px solid #c79a3c;outline-offset:1px}small{display:block;margin-top:4px;color:#948772;font-size:11px;line-height:1.5}
  button.main{margin-top:18px;width:100%;padding:13px 18px;border:0;border-radius:10px;background:linear-gradient(180deg,#e8ce96,#d2aa5a 44%,#bd9138);color:#241706;font:700 13px system-ui,sans-serif;letter-spacing:.02em;cursor:pointer}
  button.main:hover{filter:brightness(1.04)}details{margin-top:14px;border:1px solid rgba(231,206,164,.14);border-radius:12px;background:rgba(0,0,0,.16)}summary{cursor:pointer;padding:12px 14px;color:#d8b164;font-size:12.5px;font-weight:700;list-style:none;display:flex;align-items:center;justify-content:space-between}
  summary::-webkit-details-marker{display:none}summary:after{content:"▾";font-size:14px}details[open] summary:after{transform:rotate(180deg)}.meta-inner{padding:4px 14px 14px}
  h2{margin:16px 0 6px;font:600 13px system-ui,sans-serif;color:#e3ca99}.steps{margin:8px 0;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(231,206,164,.14);border-radius:10px}
  .steps ol{margin:6px 0 0 18px;padding:0;color:#dccfba;font-size:12px;line-height:1.65}.steps li{margin:4px 0}.steps a{color:#e8ce96;text-decoration:none;border-bottom:1px solid rgba(232,206,150,.3)}
  .copy-row{display:flex;gap:6px;align-items:center;margin:6px 0}.copy-row code{flex:1;padding:8px 9px;background:#0f0c0d;border:1px solid rgba(231,206,164,.16);border-radius:7px;font:12px ui-monospace,monospace;color:#eddcb8;word-break:break-all}
  .copy-btn{flex:none;padding:7px 10px;border:1px solid rgba(231,206,164,.18);border-radius:7px;background:#2a1f14;color:#e3ca99;font:11px system-ui,sans-serif;cursor:pointer}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.foot{margin-top:16px;padding-top:12px;border-top:1px solid rgba(231,206,164,.12);color:#948772;font-size:11px;line-height:1.5}
  @media(max-width:600px){.grid2{grid-template-columns:1fr}.wrap{padding:22px 18px}h1{font-size:23px}}
</style>
</head>
<body>
<main class="wrap">
  <div class="tag">Astro Sivam · One-time setup</div>
  <h1>Set up your private site login</h1>
  <p>This installer creates the protected PHP configuration for the site. Create or select your Meta developer app first; the App ID and Secret are entered only on this trusted HTTPS page.</p>
  <!--SETUP_ERROR-->
  <div class="note"><strong>One-time security check:</strong> In cPanel File Manager, open <code>storage/setup.key</code>, copy its contents, and paste it below. The key is deleted after setup succeeds.</div>
  <form method="post" action="/setup">
    <label for="setup_code">One-time setup key *</label>
    <input id="setup_code" name="setup_code" required autocomplete="off" placeholder="64-character key from storage/setup.key">
    <label for="username">Login username *</label>
    <input id="username" name="username" value="admin" required autocomplete="username">
    <label for="password">Login password *</label>
    <input id="password" name="password" type="password" minlength="8" required autocomplete="new-password">
    <small>Use a unique strong password of at least 8 characters.</small>
    <label for="password_confirm">Confirm password *</label>
    <input id="password_confirm" name="password_confirm" type="password" minlength="8" required autocomplete="new-password">
    <label for="site_base_url">Website HTTPS address *</label>
    <input id="site_base_url" name="site_base_url" type="url" value="https://suite.astrosivam.com" required>
    <small>Enter the public site origin only, e.g. <code>https://suite.astrosivam.com</code> — no path, query, or trailing slash.</small>

    <details open>
      <summary>Facebook + Instagram publishing app (optional during first install)</summary>
      <div class="meta-inner">
        <p>Create your app from <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Meta for Developers → My Apps</a>. In the app dashboard, the numeric <strong>App ID</strong> is under <strong>App settings → Basic</strong>; reveal the <strong>App Secret</strong> there with <strong>Show</strong>. The ID is public. Keep the Secret private and never paste it into chat, screenshots, or Git.</p>
        <div class="grid2">
          <div>
            <label for="meta_app_id">Meta App ID</label>
            <input id="meta_app_id" name="meta_app_id" autocomplete="off" inputmode="numeric" placeholder="Your numeric App ID">
          </div>
          <div>
            <label for="meta_app_secret">Meta App Secret</label>
            <input id="meta_app_secret" name="meta_app_secret" type="password" autocomplete="new-password" placeholder="Paste the Secret from App settings → Basic">
          </div>
          <div>
            <label for="meta_login_config_id">Facebook Login for Business Config ID</label>
            <input id="meta_login_config_id" name="meta_login_config_id" inputmode="numeric" pattern="[0-9]{1,32}" autocomplete="off" placeholder="Needed for new Unified Login apps">
          </div>
        </div>
        <small>For new apps showing Unified Login, create a Facebook Login for Business configuration with a User access token and the required Page/Instagram permissions, enable the authorization-code grant if Meta offers that option, then enter its Configuration ID. Leave it blank only for older apps using classic OAuth scopes. Enter both App ID and App Secret, or leave both blank for now. The App Secret is stored only in the private PHP config on this server.</small>

        <h2>Copy these values into Meta → App settings</h2>
        <div class="steps">
          <ol>
            <li>In <strong>App settings → Basic</strong>, set <strong>App Domains</strong> to the bare domain below (no scheme or path) and add the Privacy Policy and Data Deletion URLs if those fields are shown.</li>
            <li>For a new app that shows <strong>Unified Login</strong>, open <strong>Facebook Login for Business → Configurations</strong>, create a <strong>User access token</strong> configuration, choose the Page/Instagram assets and required permissions below, then paste its Configuration ID into this installer. Register the callback shown below in Meta's redirect settings. Older classic OAuth apps can leave the Config ID blank.</li>
            <li>Enable <strong>Instagram API with Facebook Login</strong> (or the matching Instagram use case). This site uses a Facebook user login and a Page-linked professional Instagram account; it does not use separate Instagram Login.</li>
            <li>Include these permissions in the Unified Login configuration (classic apps request them as OAuth scopes): <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>, <code>instagram_basic</code>, and <code>instagram_content_publish</code>. In Development mode, the person connecting must have an app role and API-created content is visible only to app-role users. For public Page posts, complete Meta's applicable review/Advanced Access requirements and switch the app to Live mode.</li>
          </ol>
          <div class="copy-row"><code id="val-domains">suite.astrosivam.com</code><button type="button" class="copy-btn" onclick="copyVal('val-domains')">Copy</button></div>
          <small>→ App Domains</small>
          <div class="copy-row"><code id="val-privacy">https://astrosivam.com/privacy-policy</code><button type="button" class="copy-btn" onclick="copyVal('val-privacy')">Copy</button></div>
          <small>→ Privacy Policy URL (if requested by Meta)</small>
          <div class="copy-row"><code id="val-deletion">https://suite.astrosivam.com/api/meta/data-deletion</code><button type="button" class="copy-btn" onclick="copyVal('val-deletion')">Copy</button></div>
          <small>→ User Data Deletion callback URL (if requested by Meta)</small>
          <div class="copy-row"><code id="val-redirect">https://suite.astrosivam.com/api/meta/callback</code><button type="button" class="copy-btn" onclick="copyVal('val-redirect')">Copy</button></div>
          <small>→ Facebook Login / Facebook Login for Business redirect settings (must match exactly)</small>
        </div>
        <p>After saving the Meta app settings and this installer, open the deployed site, sign in, go to <strong>Publish</strong>, and select <strong>Connect Meta account</strong>. Choose the Facebook Page that owns the linked Instagram Business or Creator account.</p>
        <small>After the first login is created, use the protected <code>/setup/meta</code> page to add or update Meta settings without editing PHP files. Never add credentials to frontend files or the Node <code>.env</code> for a production Meta connection.</small>
      </div>
    </details>
    <button type="submit" class="main">Create secure configuration →</button>
  </form>
  <footer class="foot">This writes <code>hosting/config.local.php</code> with restrictive permissions and removes the one-time setup key after success. The Meta redirect URI is generated as <code>SITE_BASE_URL + /api/meta/callback</code>; the App Secret and Page tokens remain server-side.</footer>
</main>
<script>
function copyVal(id){
  const el=document.getElementById(id);if(!el)return;const text=el.textContent;
  if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>{const button=el.nextElementSibling;if(button){const before=button.textContent;button.textContent="Copied";setTimeout(()=>button.textContent=before,1200);}});}
  else{const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.execCommand("copy");selection.removeAllRanges();}
}
(function(){
  const base=document.getElementById("site_base_url");
  const fields={deletion:document.getElementById("val-deletion"),redirect:document.getElementById("val-redirect"),domain:document.getElementById("val-domains")};
  function sync(){try{const url=new URL((base.value||"").trim());if(url.protocol!=="https:")return;const origin=url.origin;if(fields.deletion)fields.deletion.textContent=origin+"/api/meta/data-deletion";if(fields.redirect)fields.redirect.textContent=origin+"/api/meta/callback";if(fields.domain)fields.domain.textContent=url.hostname;}catch(_){}}
  base.addEventListener("input",sync);sync();
})();
</script>
</body>
</html>
HTML;
    echo str_replace('<!--SETUP_ERROR-->', $errorHtml, $html);
    exit;
}

function save_meta_api_config(array $settings): void
{
    global $storageDirectory;
    $configPath = __DIR__ . '/config.local.php';
    $localConfig = [];
    if (is_file($configPath)) {
        $loaded = require $configPath;
        if (!is_array($loaded)) throw new RuntimeException('The private PHP config is not a valid array.');
        $localConfig = $loaded;
    }
    // Preserve unrelated local settings and the session/token-encryption key.
    // Login username/password are included only as validated settings; do not rotate AUTH_SESSION_SECRET here or encrypted Page tokens become unreadable.
    foreach (['AUTH_USERNAME', 'AUTH_PASSWORD', 'META_APP_ID', 'META_APP_SECRET', 'META_LOGIN_CONFIG_ID', 'META_REDIRECT_URI', 'META_GRAPH_VERSION', 'SITE_BASE_URL'] as $key) {
        if (array_key_exists($key, $settings)) $localConfig[$key] = $settings[$key];
    }
    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0700, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('Could not create private storage for the configuration update.');
    }
    $temporary = $storageDirectory . '/config-meta-' . bin2hex(random_bytes(8)) . '.tmp';
    $contents = "<?php\n// Private site and Meta settings saved by the authenticated setup page.\nreturn " . var_export($localConfig, true) . ";\n";
    if (file_put_contents($temporary, $contents, LOCK_EX) === false) {
        @unlink($temporary);
        throw new RuntimeException('Could not write the private Meta configuration.');
    }
    @chmod($temporary, 0600);
    if (!rename($temporary, $configPath)) {
        @unlink($temporary);
        throw new RuntimeException('Could not install the private Meta configuration.');
    }
    @chmod($configPath, 0600);
}

function meta_api_setup_page(string $csrf, array $config, string $error = '', bool $saved = false, array $values = []): never
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: private, no-store');
    header('X-Robots-Tag: noindex, nofollow');
    $escape = static fn($value): string => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $appId = (string) ($values['app_id'] ?? ($config['META_APP_ID'] ?? ''));
    $loginConfigId = (string) ($values['login_config_id'] ?? ($config['META_LOGIN_CONFIG_ID'] ?? ''));
    $loginUsername = (string) ($values['login_username'] ?? ($config['AUTH_USERNAME'] ?? ''));
    $siteBase = rtrim((string) ($values['site_base_url'] ?? ($config['SITE_BASE_URL'] ?? 'https://suite.astrosivam.com')), '/');
    $graphVersion = (string) ($values['graph_version'] ?? ($config['META_GRAPH_VERSION'] ?? 'v26.0'));
    $secretIsSet = !empty($config['META_APP_SECRET']);
    $redirect = valid_site_origin($siteBase) ? $siteBase . '/api/meta/callback' : '';
    $domain = valid_site_origin($siteBase) ? strtolower((string) parse_url($siteBase, PHP_URL_HOST)) : '';
    $message = $error !== ''
        ? '<div class="alert error" role="alert">' . $escape($error) . '</div>'
        : ($saved ? '<div class="alert success" role="status">Meta settings and the suite login username were saved to the private PHP config. New login credentials apply to future sign-ins; already-authenticated sessions remain active until logout or normal timeout. Copy the generated values below into the Meta app dashboard, then reconnect.</div>' : '');
    $secretHint = $secretIsSet
        ? 'An App Secret is already saved on this server. Leave this blank to keep it, or enter a replacement if you rotated it.'
        : 'Required before Connect can work. It is written only to config.local.php and is never shown again.';
    $html = <<<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">
<title>Meta API and suite login setup · Astro Sivam</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:20px;background:#161011;color:#f7f1e4;font:14px/1.55 system-ui,sans-serif}
main{max-width:900px;margin:20px auto;padding:26px;border:1px solid rgba(231,206,164,.25);border-radius:18px;background:#1d1618;box-shadow:0 24px 80px -40px #000}
.eyebrow{color:#e3ca99;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}h1{margin:8px 0;font:500 26px Georgia,serif}h2{margin:18px 0 8px;color:#e3ca99;font-size:13px}
p,li{color:#c7b9a3;font-size:12px;line-height:1.6}p{margin:8px 0}.alert{margin:14px 0;padding:11px 13px;border-radius:9px;font-size:12px}.error{border:1px solid #d8826f;background:rgba(216,130,111,.1);color:#f2b7a9}.success{border:1px solid #6b9878;background:rgba(93,149,112,.1);color:#c8e3cf}
.notice{margin:14px 0;padding:12px 14px;border:1px solid rgba(199,154,60,.24);border-radius:10px;background:rgba(199,154,60,.07);color:#eddcb8;font-size:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:block;margin:13px 0 6px;color:#c7b9a3;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}input{width:100%;min-height:42px;padding:9px 11px;border:1px solid rgba(231,206,164,.18);border-radius:8px;background:#140f10;color:#fff;font:inherit}input:focus{outline:2px solid #c79a3c;outline-offset:1px}small{display:block;margin-top:5px;color:#948772;font-size:10.5px;line-height:1.5}
.values{display:grid;grid-template-columns:1fr 1fr;gap:10px}.value{min-width:0;padding:10px;border:1px solid rgba(231,206,164,.13);border-radius:9px;background:#171112}.value label{margin:0 0 6px;color:#A2937D}.copyline{display:flex;gap:6px;align-items:center}.copyline code{min-width:0;flex:1;overflow-wrap:anywhere;color:#eddcb8;font:11px/1.5 ui-monospace,monospace}.copyline button{padding:6px 8px;border:1px solid rgba(231,206,164,.2);border-radius:6px;background:#2a1f14;color:#e3ca99;cursor:pointer;font-size:10px}
.perms{padding:10px 12px;border:1px solid rgba(231,206,164,.13);border-radius:9px;background:#171112;color:#eddcb8;font:11px/1.8 ui-monospace,monospace;overflow-wrap:anywhere}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 14px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700;cursor:pointer}.primary{border:1px solid #eddcb8;background:linear-gradient(180deg,#e8ce96,#bd9138);color:#241706}.secondary{border:1px solid rgba(231,206,164,.2);background:#241b1c;color:#e3ca99}
a{color:#e8ce96}.foot{margin-top:18px;padding-top:13px;border-top:1px solid rgba(231,206,164,.1);color:#948772;font-size:10.5px;line-height:1.6}
@media(max-width:620px){main{padding:20px 16px}.grid,.values{grid-template-columns:1fr}h1{font-size:23px}}
</style>
</head>
<body><main>
  <div class="eyebrow">Astro Sivam · Private setup</div>
  <h1>Meta API and suite login setup</h1>
  <p>Enter your Meta App ID and Secret, a Facebook Login for Business Configuration ID when using Unified Login, and the public HTTPS address for this site. The PHP host saves the settings privately. The App Secret is never returned to the browser after saving, and user/Page tokens are obtained later through Meta's Connect flow.</p>
  {{MESSAGE}}
  <div class="notice"><strong>Important:</strong> This saves the website's server settings. It cannot create a Meta developer app, add products, grant permissions, or approve App Review. Complete those items in <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Meta for Developers</a> using the copyable values below.</div>
  <form method="post" action="/setup/meta" autocomplete="off">
    <input type="hidden" name="csrf" value="{{CSRF}}">
    <div class="grid">
      <div><label for="meta_app_id">Meta App ID</label><input id="meta_app_id" name="meta_app_id" value="{{APP_ID}}" inputmode="numeric" pattern="[0-9]{1,32}" required placeholder="Numeric ID from App settings → Basic"><small>Meta for Developers → My Apps → your app → App settings → Basic. This is not your Page ID or Instagram ID.</small></div>
      <div><label for="meta_app_secret">Meta App Secret</label><input id="meta_app_secret" name="meta_app_secret" type="password" autocomplete="new-password" placeholder="Paste the Secret from App settings → Basic"><small>{{SECRET_HINT}}</small></div>
      <div><label for="site_base_url">Public site HTTPS origin</label><input id="site_base_url" name="site_base_url" type="url" value="{{SITE_BASE}}" required placeholder="https://suite.astrosivam.com"><small>Origin only — no path, query, or trailing slash. Must be the same public host visitors use.</small></div>
      <div><label for="graph_version">Meta Graph API version</label><input id="graph_version" name="graph_version" value="{{GRAPH_VERSION}}" pattern="v[0-9]{1,2}\.[0-9]+" required placeholder="v26.0"><small>Use the version supported by your Meta app. Current project default: v26.0.</small></div>
      <div><label for="meta_login_config_id">Facebook Login for Business Config ID</label><input id="meta_login_config_id" name="meta_login_config_id" value="{{LOGIN_CONFIG_ID}}" inputmode="numeric" pattern="[0-9]{1,32}" placeholder="Needed for new Unified Login apps"><small>For Meta's new Unified Login flow, paste the ID from Facebook Login for Business → Configurations. Create a User access token configuration with the required assets and permissions below; enable Authorization Code if Meta offers a grant/response choice. This site requests an authorization code for the PHP callback. Leave blank only for a legacy app using classic OAuth scopes.</small></div>
    </div>
    <h2>Suite login</h2>
    <p>Set the username and, if you want to change it, a new login password here with the Meta settings. Leave both new-password fields blank to keep the current password. The password is never re-displayed; new credentials apply to future sign-ins, while active sessions remain until logout or timeout.</p>
    <div class="grid">
      <div><label for="login_username">Login username</label><input id="login_username" name="login_username" value="{{LOGIN_USERNAME}}" maxlength="64" required autocomplete="username"><small>This username is used to sign in to the suite.</small></div>
      <div><label for="login_password">New login password</label><input id="login_password" name="login_password" type="password" minlength="8" maxlength="1024" autocomplete="new-password" placeholder="Leave blank to keep current password"><small>Use 8 to 1,024 characters. Leave blank unless changing it.</small></div>
      <div><label for="login_password_confirm">Confirm new login password</label><input id="login_password_confirm" name="login_password_confirm" type="password" minlength="8" maxlength="1024" autocomplete="new-password" placeholder="Re-enter the new password"><small>Must match the new password above.</small></div>
    </div>
    <div class="actions"><button type="submit" class="primary">Save Meta API and login settings</button><a class="secondary" href="/#facebook">Back to studio</a></div>
  </form>

  <h2>Copy these generated values into the Meta app</h2>
  <div class="values">
    <div class="value"><label>App Domains</label><div class="copyline"><code id="val-domain">{{DOMAIN}}</code><button type="button" onclick="copyValue('val-domain',this)">Copy</button></div></div>
    <div class="value"><label>Valid OAuth Redirect URI</label><div class="copyline"><code id="val-redirect">{{REDIRECT}}</code><button type="button" onclick="copyValue('val-redirect',this)">Copy</button></div></div>
    <div class="value"><label>Data Deletion Callback URL</label><div class="copyline"><code id="val-deletion">{{DELETION}}</code><button type="button" onclick="copyValue('val-deletion',this)">Copy</button></div></div>
    <div class="value"><label>Privacy Policy URL</label><div class="copyline"><code id="val-privacy">https://astrosivam.com/privacy-policy</code><button type="button" onclick="copyValue('val-privacy',this)">Copy</button></div></div>
    <div class="value"><label>App Category</label><div class="copyline"><code id="val-category">Lifestyle</code><button type="button" onclick="copyValue('val-category',this)">Copy</button></div></div>
  </div>
  <h2>Permissions needed by Connect</h2>
  <div class="perms">pages_show_list · pages_read_engagement · pages_manage_posts · instagram_basic · instagram_content_publish</div>
  <p>For apps showing <strong>Unified Login</strong>, configure <strong>Facebook Login for Business</strong> with a <strong>User access token</strong>, the Page/Instagram assets, and all five permissions above; register the exact callback in Meta's redirect settings. The site will send the Configuration ID and omit the legacy <code>scope</code> parameter. For older classic OAuth apps only, leave the Config ID blank, enable Web OAuth if shown, and the site will request the scopes directly. Use <strong>Instagram API with Facebook Login</strong> (not separate Instagram Login). In Development mode, test with an app Admin/Developer/Tester who can manage the Page; posts and photos created in this mode are visible only to app-role users. Before public Page publishing, complete Meta's applicable review/Advanced Access requirements and switch to Live mode.</p>
  <div class="foot">The callback is always derived as <code>SITE_BASE_URL + /api/meta/callback</code>. If you change the domain, update App Domains and Valid OAuth Redirect URIs in Meta too. Never paste an access token here; use <strong>Connect Meta account</strong> after saving to authorize the Page. For app creation and troubleshooting, follow the project's Fresh Facebook + Instagram API setup guide.</div>
</main>
<script>
function copyValue(id,button){const el=document.getElementById(id);if(!el)return;const text=el.textContent;if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>{const old=button.textContent;button.textContent="Copied";setTimeout(()=>button.textContent=old,1200);});}else{const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.execCommand("copy");selection.removeAllRanges();}}
(function(){const base=document.getElementById("site_base_url");function sync(){try{const url=new URL((base.value||"").trim());if(url.protocol!=="https:")return;const origin=url.origin;document.getElementById("val-domain").textContent=url.hostname;document.getElementById("val-redirect").textContent=origin+"/api/meta/callback";document.getElementById("val-deletion").textContent=origin+"/api/meta/data-deletion";}catch(_){}}base.addEventListener("input",sync);sync();})();
</script></body></html>
HTML;
    $replace = [
        '{{MESSAGE}}' => $message,
        '{{CSRF}}' => $escape($csrf),
        '{{APP_ID}}' => $escape($appId),
        '{{LOGIN_CONFIG_ID}}' => $escape($loginConfigId),
        '{{LOGIN_USERNAME}}' => $escape($loginUsername),
        '{{SECRET_HINT}}' => $escape($secretHint),
        '{{SITE_BASE}}' => $escape($siteBase),
        '{{GRAPH_VERSION}}' => $escape($graphVersion),
        '{{DOMAIN}}' => $escape($domain),
        '{{REDIRECT}}' => $escape($redirect),
        '{{DELETION}}' => $escape(valid_site_origin($siteBase) ? $siteBase . '/api/meta/data-deletion' : ''),
    ];
    echo strtr($html, $replace);
    exit;
}

function login_page(): never
{
    header('Content-Type: text/html; charset=utf-8');
    $logoPath = __DIR__ . '/dist/astrosivam_logo.png';
    if (!is_file($logoPath)) {
        $logoPath = dirname(__DIR__) . '/dist/astrosivam_logo.png';
    }
    $logo = is_file($logoPath) ? '<img src="data:image/png;base64,' . base64_encode((string) file_get_contents($logoPath)) . '" alt="">' : '<span class="fallback">✦</span>';
    echo <<<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#161011">
<title>Sign in · Astro Sivam Creative Studio</title>
<style>
  *{box-sizing:border-box}
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;color:#f7f1e4;
    background-color:#161011;
    background-image:radial-gradient(900px 540px at 10% -10%,rgba(77,16,35,.72),transparent 64%),radial-gradient(700px 460px at 100% 0%,rgba(199,154,60,.09),transparent 60%);
    font:15px/1.55 "Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    -webkit-font-smoothing:antialiased}
  main{width:min(100%,430px);padding:34px;border:1px solid rgba(231,206,164,.22);border-radius:22px;
    background:#1d1618;box-shadow:inset 0 1px 0 rgba(250,242,226,.06),0 40px 110px -40px #000}
  .seal{display:grid;place-items:center;width:62px;height:62px;margin-bottom:24px;border:1px solid rgba(199,154,60,.62);
    border-radius:15px;background:radial-gradient(120% 120% at 28% 18%,#fffdf7 0%,#f7f1e4 58%,#e9dcc4 100%);
    box-shadow:inset 0 0 0 1px rgba(255,252,245,.75),0 0 0 1px rgba(77,16,35,.45),0 8px 18px -14px #000}
  .seal img{width:40px;height:40px;object-fit:contain;mix-blend-mode:multiply}
  .seal .fallback{color:#a87c2c;font-size:26px;line-height:1}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;color:#e3ca99;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
  .eyebrow::before{content:"";width:5px;height:5px;transform:rotate(45deg);background:#c79a3c}
  h1{margin:9px 0 6px;font-family:"Cinzel",Georgia,serif;font-size:29px;font-weight:600;letter-spacing:-.01em;line-height:1.15}
  .lede{margin:0 0 26px;color:#b4a58f;font-size:13px;line-height:1.6}
  label{display:block;margin:16px 0 7px;color:#b4a58f;font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
  input{width:100%;min-height:46px;padding:0 13px;border:1px solid rgba(231,206,164,.16);border-radius:10px;outline:none;
    background:#140f10;color:#f7f1e4;font:inherit;font-size:14px;transition:border-color .15s ease,box-shadow .15s ease}
  input::placeholder{color:#948772}
  input:focus{border-color:rgba(216,177,100,.72);box-shadow:0 0 0 3px rgba(199,154,60,.16)}
  button{width:100%;min-height:48px;margin-top:24px;border:1px solid rgba(255,241,208,.36);border-radius:10px;
    background:linear-gradient(180deg,#e8ce96,#d2aa5a 44%,#bd9138);color:#241706;
    font:700 13px "Plus Jakarta Sans",system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;
    box-shadow:inset 0 1px 0 rgba(255,248,231,.6),0 12px 26px -16px rgba(199,154,60,.8)}
  button:hover{filter:brightness(1.05)}
  button:focus-visible{outline:2px solid #f0dcb2;outline-offset:3px}
  button:disabled{opacity:.6;cursor:wait}
  #error{min-height:20px;margin:13px 0 0;color:#f2b7a9;font-size:12px;line-height:1.5}
  .foot{display:flex;align-items:center;gap:7px;margin-top:24px;padding-top:16px;border-top:1px solid rgba(231,206,164,.1);
    color:#948772;font-size:10px;line-height:1.5}
  .foot svg{flex:none;color:#c79a3c}
  .foot a{color:#e3ca99;text-decoration:none;border-bottom:1px solid rgba(199,154,60,.35)}
  @media (max-width:480px){main{padding:27px 23px}h1{font-size:26px}}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
  <main>
    <div class="seal" aria-hidden="true">{$logo}</div>
    <div class="eyebrow">Astro Sivam · Creative studio</div>
    <h1>Welcome back</h1>
    <p class="lede">Sign in to the private studio — brand kit, poster and asset tools, panchangam, festival cards and the publishing desk.</p>
    <form id="login-form">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required autofocus>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button id="submit" type="submit">Sign in</button>
      <div id="error" role="alert" aria-live="polite"></div>
    </form>
    <div class="foot">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Private studio · Vedic astrology content for
      <a href="https://astrosivam.com" target="_blank" rel="noopener noreferrer">astrosivam.com</a>
    </div>
  </main>
  <script>
    const form=document.getElementById('login-form'),button=document.getElementById('submit'),error=document.getElementById('error');
    form.addEventListener('submit',async event=>{event.preventDefault();error.textContent='';button.disabled=true;button.textContent='Signing in…';
      try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.username.value,password:form.password.value})});
        if(!response.ok){error.textContent=response.status===429?'Too many attempts. Please wait 15 minutes and try again.':'Username or password is incorrect.';return}
        window.location.replace('/'+window.location.hash)}catch(_){error.textContent='Unable to sign in. Please try again.'}finally{button.disabled=false;button.textContent='Sign in'}})
  </script>
</body>
</html>
HTML;
    exit;
}

function valid_site_origin(string $origin): bool
{
    $parts = parse_url($origin);
    return is_array($parts) && strtolower((string) ($parts['scheme'] ?? '')) === 'https'
        && !empty($parts['host']) && !isset($parts['user'], $parts['pass'], $parts['query'], $parts['fragment'])
        && in_array((string) ($parts['path'] ?? ''), ['', '/'], true);
}

function valid_meta_redirect(string $redirect): bool
{
    $parts = parse_url($redirect);
    return is_array($parts)
        && strtolower((string) ($parts['scheme'] ?? '')) === 'https'
        && !empty($parts['host'])
        && !isset($parts['user'], $parts['pass'], $parts['query'], $parts['fragment'])
        && (string) ($parts['path'] ?? '') === '/api/meta/callback';
}

function meta_callback(): never
{
    global $config;
    header('Referrer-Policy: no-referrer');
    header('Cache-Control: no-store');
    if (($_SESSION['authenticated'] ?? false) !== true) { header('Location: /login', true, 302); exit; }
    $expectedState = (string) ($_SESSION['meta_oauth_state'] ?? '');
    $stateCreatedAt = (int) ($_SESSION['meta_oauth_state_created_at'] ?? 0);
    $returnedState = (string) ($_GET['state'] ?? '');
    unset($_SESSION['meta_oauth_state'], $_SESSION['meta_oauth_state_created_at']);
    if ($expectedState === '' || $returnedState === '' || $stateCreatedAt < time() - 600 || $stateCreatedAt > time() || !hash_equals($expectedState, $returnedState)) {
        header('Location: /?meta=state-error', true, 302); exit;
    }
    if (!empty($_GET['error']) || empty($_GET['code'])) {
        header('Location: /?meta=cancelled', true, 302); exit;
    }
    if (empty($config['META_APP_ID']) || empty($config['META_APP_SECRET']) || empty($config['META_REDIRECT_URI'])) {
        header('Location: /?meta=not-configured', true, 302); exit;
    }
    try {
        $code = (string) $_GET['code'];
        if (strlen($code) > 4096 || preg_match('/[\x00-\x20\x7F]/', $code)) {
            throw new RuntimeException('Meta returned an invalid authorization code.');
        }
        $redirect = (string) $config['META_REDIRECT_URI'];
        if (!valid_meta_redirect($redirect)) throw new RuntimeException('META_REDIRECT_URI must be the configured HTTPS origin plus /api/meta/callback.');
        $tokenResponse = graph_request('GET', 'oauth/access_token', [
            'client_id' => (string) $config['META_APP_ID'],
            'redirect_uri' => $redirect,
            'client_secret' => (string) $config['META_APP_SECRET'],
            'code' => $code,
        ]);
        $userToken = (string) ($tokenResponse['access_token'] ?? '');
        if ($userToken === '') throw new RuntimeException('Meta did not return an access token.');
        $longLived = graph_request('GET', 'oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => (string) $config['META_APP_ID'],
            'client_secret' => (string) $config['META_APP_SECRET'],
            'fb_exchange_token' => $userToken,
        ]);
        $userToken = (string) ($longLived['access_token'] ?? $userToken);
        $authorizationExpiresAt = isset($longLived['expires_in']) && is_numeric($longLived['expires_in'])
            ? time() + max(0, (int) $longLived['expires_in']) : null;
        $accountParams = [
            'fields' => 'id,name,access_token,instagram_business_account{id,username}',
            'limit' => 100,
        ];
        $accounts = graph_request('GET', 'me/accounts', $accountParams, $userToken);
        $pagesById = [];
        $seenCursors = [];
        for ($batch = 0; $batch < 10; $batch++) {
            foreach (($accounts['data'] ?? []) as $item) {
                if (!is_array($item) || empty($item['id']) || empty($item['access_token'])) continue;
                $instagram = is_array($item['instagram_business_account'] ?? null) ? $item['instagram_business_account'] : [];
                $pagesById[(string) $item['id']] = [
                    'id' => (string) $item['id'],
                    'name' => (string) ($item['name'] ?? 'Facebook Page'),
                    'access_token' => (string) $item['access_token'],
                    'instagram_id' => isset($instagram['id']) ? (string) $instagram['id'] : null,
                    'instagram_username' => isset($instagram['username']) ? (string) $instagram['username'] : null,
                ];
            }
            $cursor = (string) ($accounts['paging']['cursors']['after'] ?? '');
            if ($cursor === '' || empty($accounts['paging']['next'])) break;
            if (strlen($cursor) > 512 || isset($seenCursors[$cursor])) throw new RuntimeException('Meta returned an invalid Page-list cursor.');
            $seenCursors[$cursor] = true;
            $accountParams['after'] = $cursor;
            $accounts = graph_request('GET', 'me/accounts', $accountParams, $userToken);
            if ($batch === 9 && !empty($accounts['paging']['next'])) throw new RuntimeException('More than 1,000 Pages were returned. Narrow Page access in Meta and reconnect.');
        }
        $pages = array_values($pagesById);
        if (!$pages) {
            $_SESSION['meta_last_error'] = ['category' => 'no_pages'];
            header('Location: /?meta=no-pages', true, 302); exit;
        }
        unset($_SESSION['meta_last_error']);
        save_connection([
            'pages' => $pages,
            'selected_page_id' => $pages[0]['id'],
            'connected_at' => time(),
            'authorization_expires_at' => $authorizationExpiresAt,
        ]);
        header('Location: /?meta=connected', true, 302);
        exit;
    } catch (Throwable $error) {
        $category = meta_error_category($error);
        $graph = $error instanceof MetaApiException ? $error->graph : [];
        $_SESSION['meta_last_error'] = ['category' => $category, 'code' => $graph['code'] ?? null, 'subcode' => $graph['subcode'] ?? null, 'traceId' => $graph['traceId'] ?? null];
        error_log('Meta OAuth failed [' . $category . ']' . (isset($graph['code']) ? ' code ' . (string) $graph['code'] : ''));
        header('Location: /?meta=error', true, 302);
        exit;
    }
}

if (str_contains($uriPath, "\0") || str_contains($uriPath, '..')) {
    http_response_code(400); echo 'Bad request'; exit;
}

// Meta User Data Deletion callback — must be public (no auth) so Meta can POST to it.
// Configured in App Settings → Basic as https://suite.astrosivam.com/api/meta/data-deletion
if ($uriPath === '/api/meta/data-deletion') {
    header('X-Robots-Tag: noindex, nofollow');
    // Meta expects a JSON response with `url` and `confirmation_code` even on GET probe.
    $appSecret = (string) ($config['META_APP_SECRET'] ?? '');
    $siteBase = rtrim((string) ($config['SITE_BASE_URL'] ?? ''), '/');
    if ($siteBase === '') $siteBase = 'https://suite.astrosivam.com';
    // Helper to generate a confirmation code
    $makeCode = static function () {
        return 'DEL-' . strtoupper(bin2hex(random_bytes(6))) . '-' . time();
    };
    // On GET — simple reachability check (Meta dashboard test fetch)
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'GET') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'url' => $siteBase . '/data-deletion-status',
            'confirmation_code' => $makeCode(),
            'message' => 'POST signed_request here for data deletion. Email admin@astrosivam.com for manual deletion.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }
    // On POST — parse Meta signed_request
    $signedRequest = (string) ($_POST['signed_request'] ?? ($_REQUEST['signed_request'] ?? ''));
    $userId = null;
    if ($signedRequest !== '' && $appSecret !== '') {
        $parts = explode('.', $signedRequest, 2);
        if (count($parts) === 2) {
            [$encodedSig, $encodedPayload] = $parts;
            $sig = base64_decode(strtr($encodedSig, '-_', '+/'), true);
            $payloadJson = base64_decode(strtr($encodedPayload, '-_', '+/'), true);
            if ($sig !== false && $payloadJson !== false) {
                $expectedSig = hash_hmac('sha256', $encodedPayload, $appSecret, true);
                if (hash_equals($expectedSig, $sig)) {
                    $payload = json_decode($payloadJson, true);
                    if (is_array($payload) && isset($payload['user_id'])) {
                        $userId = (string) $payload['user_id'];
                    } elseif (is_array($payload) && isset($payload['userID'])) {
                        $userId = (string) $payload['userID'];
                    }
                }
            }
        }
    }
    // Fallback: if signature can't be verified (e.g. secret not yet set or test POST), still respond per Meta spec
    $confirmationCode = $makeCode();
    $statusUrl = $siteBase . '/data-deletion-status?id=' . urlencode($confirmationCode);
    // Persist request for 30-day audit trail (private storage)
    try {
        if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0700, true) && !is_dir($storageDirectory)) {
            // non-fatal
        } else {
            $logFile = $storageDirectory . '/data-deletion-requests.json';
            $existing = [];
            if (is_file($logFile)) {
                $raw = (string) @file_get_contents($logFile);
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $existing = $decoded;
            }
            $existing[] = [
                'time' => gmdate('c'),
                'confirmation_code' => $confirmationCode,
                'user_id' => $userId ?? 'unknown',
                'signed_request_present' => $signedRequest !== '',
                'ip' => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
            ];
            // Keep last 500 entries
            if (count($existing) > 500) $existing = array_slice($existing, -500);
            @file_put_contents($logFile, json_encode($existing, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
            @chmod($logFile, 0600);
        }
    } catch (Throwable $e) {
        // Log but don't fail the response — Meta expects 200
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'url' => $statusUrl,
        'confirmation_code' => $confirmationCode,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Human-readable deletion status page (no auth) — linked from the callback response
if ($uriPath === '/data-deletion-status') {
    $siteBaseStatus = rtrim((string) ($config['SITE_BASE_URL'] ?? ''), '/');
    if ($siteBaseStatus === '') $siteBaseStatus = 'https://suite.astrosivam.com';
    $confirmId = (string) ($_GET['id'] ?? '');
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Data Deletion Status — Astro Sivam</title>';
    echo '<body style="font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#1a1a1a;line-height:1.6">';
    echo '<h1>Data Deletion Request Received</h1>';
    if ($confirmId !== '') {
        echo '<p>Your request has been recorded.</p><p><strong>Confirmation code:</strong> <code>' . htmlspecialchars($confirmId, ENT_QUOTES) . '</code></p>';
    } else {
        echo '<p>If you requested deletion via Facebook, your request is recorded and will be processed within 30 days.</p>';
    }
    echo '<p>We store only what Facebook sends for publishing (Page tokens on the secure PHP host). Deletion removes your Page connection and any stored tokens from our server. Contact <a href="mailto:admin@astrosivam.com">admin@astrosivam.com</a> for manual deletion or questions.</p>';
    echo '<p><a href="https://astrosivam.com/privacy-policy">Privacy Policy</a> · <a href="' . htmlspecialchars($siteBaseStatus, ENT_QUOTES) . '">Studio Home</a></p>';
    echo '</body></html>';
    exit;
}

// Meta needs to fetch each uploaded image without being signed in. Filenames are random and
// the temporary image is deleted as soon as the publishing request finishes.
if (preg_match('~^/_meta-media/([a-f0-9]{32}\.(?:jpg|png))$~', $uriPath, $mediaMatch)) {
    $mediaPath = $storageDirectory . '/media/' . $mediaMatch[1];
    if (!is_file($mediaPath) || filemtime($mediaPath) < time() - 3600) { http_response_code(404); exit; }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($mediaPath);
    if (!in_array($mime, ['image/jpeg', 'image/png'], true)) { http_response_code(404); exit; }
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string) filesize($mediaPath));
    header('Cache-Control: public, max-age=900');
    header('X-Robots-Tag: noindex, nofollow');
    readfile($mediaPath);
    exit;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$requiredConfig = ['AUTH_USERNAME', 'AUTH_PASSWORD', 'AUTH_SESSION_SECRET'];
$authConfigured = true;
foreach ($requiredConfig as $key) {
    if (!isset($config[$key]) || (string) $config[$key] === '') $authConfigured = false;
}
if (strlen((string) ($config['AUTH_SESSION_SECRET'] ?? '')) < 32) $authConfigured = false;
if (!$authConfigured) {
    if ($uriPath !== '/setup' || !in_array($method, ['GET', 'POST'], true)) {
        header('Location: /setup', true, 302); exit;
    }
    try {
        $setupCode = setup_code_file();
    } catch (Throwable $error) {
        http_response_code(503);
        setup_page($error->getMessage());
    }
    if ($method === 'POST') {
        $submittedCode = trim((string) ($_POST['setup_code'] ?? ''));
        if ($submittedCode === '' || !hash_equals($setupCode, $submittedCode)) {
            http_response_code(403);
            setup_page('The setup key did not match. Open storage/setup.key in File Manager and try again.');
        }
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');
        $siteBase = rtrim(trim((string) ($_POST['site_base_url'] ?? '')), '/');
        $appId = trim((string) ($_POST['meta_app_id'] ?? ''));
        $appSecret = trim((string) ($_POST['meta_app_secret'] ?? ''));
        $loginConfigId = trim((string) ($_POST['meta_login_config_id'] ?? ''));
        $siteParts = parse_url($siteBase);
        if ($username === '' || strlen($username) > 64 || preg_match('/[\x00-\x1F\x7F]/', $username)) {
            setup_page('Enter a username of 1 to 64 characters.');
        }
        if (strlen($password) < 8 || strlen($password) > 1024) setup_page('Use a password between 8 and 1,024 characters.');
        if (!hash_equals($password, $passwordConfirm)) setup_page('The password fields do not match.');
        if (!filter_var($siteBase, FILTER_VALIDATE_URL) || !is_array($siteParts) || strtolower((string) ($siteParts['scheme'] ?? '')) !== 'https' || empty($siteParts['host']) || isset($siteParts['user']) || isset($siteParts['pass']) || isset($siteParts['query']) || isset($siteParts['fragment']) || !in_array((string) ($siteParts['path'] ?? ''), ['', '/'], true)) {
            setup_page('Enter the HTTPS site origin only, such as https://suite.astrosivam.com.');
        }
        if (($appId === '') !== ($appSecret === '')) setup_page('Enter both Meta app fields, or leave both blank for now.');
        if ($appId !== '' && !preg_match('/^[0-9]{1,32}$/', $appId)) setup_page('The Meta App ID should be the numeric value shown in App settings → Basic.');
        if ($loginConfigId !== '' && !preg_match('/^[0-9]{1,32}$/', $loginConfigId)) setup_page('The Facebook Login for Business Configuration ID should be numeric.');
        if ($loginConfigId !== '' && ($appId === '' || $appSecret === '')) setup_page('Enter the Meta App ID and App Secret when entering a Login Configuration ID.');
        $localConfig = [
            'AUTH_USERNAME' => $username,
            'AUTH_PASSWORD' => $password,
            'AUTH_SESSION_SECRET' => bin2hex(random_bytes(32)),
            'SITE_BASE_URL' => $siteBase,
            'META_GRAPH_VERSION' => 'v26.0',
        ];
        if ($appId !== '') {
            $localConfig['META_APP_ID'] = $appId;
            $localConfig['META_APP_SECRET'] = $appSecret;
            $localConfig['META_REDIRECT_URI'] = $siteBase . '/api/meta/callback';
        }
        if ($loginConfigId !== '') $localConfig['META_LOGIN_CONFIG_ID'] = $loginConfigId;
        $phpConfig = "<?php\n// Generated by the one-time Astro Sivam installer. Keep this file private.\nreturn " . var_export($localConfig, true) . ";\n";
        $configPath = __DIR__ . '/config.local.php';
        $temporaryConfig = $storageDirectory . '/config-install.tmp-' . bin2hex(random_bytes(6));
        if (file_put_contents($temporaryConfig, $phpConfig, LOCK_EX) === false) setup_page('Could not write config.local.php. Check document-root permissions.');
        @chmod($temporaryConfig, 0600);
        if (!rename($temporaryConfig, $configPath)) {
            @unlink($temporaryConfig);
            setup_page('Could not install config.local.php. Check document-root permissions.');
        }
        @chmod($configPath, 0600);
        @unlink($storageDirectory . '/setup.key');
        header('Location: /login', true, 302); exit;
    }
    setup_page();
}
if ($uriPath === '/setup') { header('Location: /login', true, 302); exit; }
if (strlen((string) $config['AUTH_SESSION_SECRET']) < 32) {
    http_response_code(503); header('Content-Type: text/plain; charset=utf-8'); echo 'AUTH_SESSION_SECRET must be at least 32 characters.'; exit;
}

session_name('ASTROSIVAMSESSID');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.gc_maxlifetime', '28800');
session_set_cookie_params([
    'lifetime' => 28800,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    // Lax is required so Meta's top-level OAuth callback GET carries the session cookie.
    'samesite' => 'Lax',
]);
session_start();
$csrf = csrf_token();
header('Cache-Control: private, no-store');

$authenticated = ($_SESSION['authenticated'] ?? false) === true;
if ($authenticated) {
    $now = time();
    $authenticatedAt = (int) ($_SESSION['authenticated_at'] ?? 0);
    $lastActivity = (int) ($_SESSION['last_activity'] ?? 0);
    if ($authenticatedAt < 1 || $lastActivity < 1 || $now - $authenticatedAt >= 28800 || $now - $lastActivity >= 1800) {
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Lax']);
        session_destroy();
        $authenticated = false;
    } else {
        $_SESSION['last_activity'] = $now;
    }
}

if ($uriPath === '/api/health' && $method === 'GET') {
    json_response(['status' => 'ok', 'app' => 'astrosivam-social-suite', 'version' => '2.0.0', 'runtime' => 'php']);
}

if ($uriPath === '/api/auth/login' && $method === 'POST') {
    try {
        if (login_rate_limit('check')) json_response(['error' => 'Too many attempts. Wait 15 minutes and try again.'], 429);
    } catch (Throwable $error) {
        error_log('Login rate limiter failed: ' . $error->getMessage());
        json_response(['error' => 'Login protection is unavailable. Contact the site owner.'], 503);
    }
    $body = request_json();
    $submittedUser = is_string($body['username'] ?? null) ? $body['username'] : '';
    $submittedPassword = is_string($body['password'] ?? null) ? $body['password'] : '';
    $userMatches = hash_equals((string) $config['AUTH_USERNAME'], $submittedUser);
    $passwordMatches = hash_equals((string) $config['AUTH_PASSWORD'], $submittedPassword);
    if (!$userMatches || !$passwordMatches) {
        try { login_rate_limit('failed'); } catch (Throwable $error) { error_log('Login rate limiter failed: ' . $error->getMessage()); }
        json_response(['error' => 'Invalid username or password'], 401);
    }
    login_rate_limit('success');
    session_regenerate_id(true);
    $_SESSION['authenticated'] = true;
    $_SESSION['authenticated_at'] = time();
    $_SESSION['last_activity'] = time();
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $csrf = csrf_token();
    json_response(['authenticated' => true, 'csrf' => $csrf]);
}

if ($uriPath === '/login' && $method === 'GET') {
    if ($authenticated) { header('Location: /', true, 302); exit; }
    login_page();
}

if ($uriPath === '/api/auth/logout' && $method === 'POST') {
    require_login(); require_csrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Lax']);
    }
    setcookie('astrosivam_csrf', '', ['expires' => time() - 42000, 'path' => '/', 'secure' => $isHttps, 'httponly' => false, 'samesite' => 'Strict']);
    session_destroy();
    json_response(['authenticated' => false]);
}

if ($uriPath === '/api/meta/callback' && $method === 'GET') meta_callback();

if (!$authenticated) {
    if (str_starts_with($uriPath, '/api/')) json_response(['error' => 'Authentication required'], 401);
    header('Location: /login', true, 302); exit;
}

if ($uriPath === '/setup/meta' && $method === 'GET') {
    meta_api_setup_page($csrf, $config, '', ($_GET['saved'] ?? '') === '1');
}

if ($uriPath === '/setup/meta' && $method === 'POST') {
    $suppliedCsrf = is_string($_POST['csrf'] ?? null) ? (string) $_POST['csrf'] : '';
    $expectedCsrf = (string) ($_SESSION['csrf_token'] ?? '');
    if ($suppliedCsrf === '' || $expectedCsrf === '' || !hash_equals($expectedCsrf, $suppliedCsrf)) {
        http_response_code(403);
        meta_api_setup_page($csrf, $config, 'The security token expired. Reload this page and try again.');
    }
    $appId = is_string($_POST['meta_app_id'] ?? null) ? trim((string) $_POST['meta_app_id']) : '';
    $secretInput = is_string($_POST['meta_app_secret'] ?? null) ? trim((string) $_POST['meta_app_secret']) : '';
    $siteBase = is_string($_POST['site_base_url'] ?? null) ? rtrim(trim((string) $_POST['site_base_url']), '/') : '';
    $graphVersion = is_string($_POST['graph_version'] ?? null) ? trim((string) $_POST['graph_version']) : '';
    $loginConfigId = is_string($_POST['meta_login_config_id'] ?? null) ? trim((string) $_POST['meta_login_config_id']) : '';
    $loginUsername = is_string($_POST['login_username'] ?? null) ? trim((string) $_POST['login_username']) : '';
    $newLoginPassword = is_string($_POST['login_password'] ?? null) ? (string) $_POST['login_password'] : '';
    $newLoginPasswordConfirm = is_string($_POST['login_password_confirm'] ?? null) ? (string) $_POST['login_password_confirm'] : '';
    $values = ['app_id' => $appId, 'site_base_url' => $siteBase, 'graph_version' => $graphVersion, 'login_config_id' => $loginConfigId, 'login_username' => $loginUsername];
    if ($loginUsername === '' || strlen($loginUsername) > 64 || preg_match('/[\\x00-\\x1F\\x7F]/', $loginUsername)) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Enter a login username of 1 to 64 characters.', false, $values);
    }
    if ($newLoginPassword === '' && $newLoginPasswordConfirm !== '') {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Leave both new-password fields blank to keep the current password.', false, $values);
    }
    if ($newLoginPassword !== '' && (strlen($newLoginPassword) < 8 || strlen($newLoginPassword) > 1024)) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Use a new login password between 8 and 1,024 characters.', false, $values);
    }
    if ($newLoginPassword !== '' && !hash_equals($newLoginPassword, $newLoginPasswordConfirm)) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'The new login password fields do not match.', false, $values);
    }
    if ($appId === '' || !preg_match('/^[0-9]{1,32}$/', $appId)) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Enter the numeric Meta App ID from App settings → Basic.', false, $values);
    }
    if (!valid_site_origin($siteBase)) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Enter the public HTTPS site origin only, without a path, query, or credentials.', false, $values);
    }
    if (!preg_match('/^v[0-9]{1,2}\.[0-9]+$/', $graphVersion)) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Use a Graph API version in the format v26.0.', false, $values);
    }
    if ($loginConfigId !== '' && !preg_match('/^[0-9]{1,32}$/', $loginConfigId)) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Enter the numeric Configuration ID from Facebook Login for Business, or leave it blank only for a legacy app.', false, $values);
    }
    if ($secretInput !== '' && (strlen($secretInput) > 512 || preg_match('/[\x00-\x20\x7F]/', $secretInput))) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'The App Secret contains invalid whitespace or is too long. Copy it again from Meta.', false, $values);
    }
    $currentAppId = (string) ($config['META_APP_ID'] ?? '');
    $currentAppSecret = (string) ($config['META_APP_SECRET'] ?? '');
    if ($secretInput === '' && ($currentAppSecret === '' || !hash_equals($currentAppId, $appId))) {
        http_response_code(400);
        meta_api_setup_page($csrf, $config, 'Enter the App Secret for this App ID. A saved Secret can be retained only when keeping the same App ID.', false, $values);
    }
    try {
        $settings = [
            'AUTH_USERNAME' => $loginUsername,
            'META_APP_ID' => $appId,
            'META_APP_SECRET' => $secretInput !== '' ? $secretInput : $currentAppSecret,
            'META_LOGIN_CONFIG_ID' => $loginConfigId,
            'META_REDIRECT_URI' => $siteBase . '/api/meta/callback',
            'META_GRAPH_VERSION' => $graphVersion,
            'SITE_BASE_URL' => $siteBase,
        ];
        if ($newLoginPassword !== '') $settings['AUTH_PASSWORD'] = $newLoginPassword;
        save_meta_api_config($settings);
    } catch (Throwable $error) {
        error_log('Meta API setup save failed: ' . $error->getMessage());
        http_response_code(500);
        meta_api_setup_page($csrf, $config, 'Could not save the private config. Check that the PHP storage folder is writable.', false, $values);
    }
    header('Location: /setup/meta?saved=1', true, 303); exit;
}

try {
    if ($uriPath === '/api/meta/connect' && $method === 'GET') {
        if (empty($config['META_APP_ID']) || empty($config['META_APP_SECRET']) || empty($config['META_REDIRECT_URI'])) {
            json_response(['error' => 'META_APP_ID, META_APP_SECRET and META_REDIRECT_URI must be set in the private PHP config.'], 503);
        }
        $expectedRedirect = rtrim((string) ($config['SITE_BASE_URL'] ?? ''), '/') . '/api/meta/callback';
        if (!valid_site_origin(rtrim((string) ($config['SITE_BASE_URL'] ?? ''), '/'))
            || !valid_meta_redirect((string) $config['META_REDIRECT_URI'])
            || !hash_equals($expectedRedirect, (string) $config['META_REDIRECT_URI'])) {
            json_response(['error' => 'Configure META_REDIRECT_URI as the exact SITE_BASE_URL plus /api/meta/callback.'], 503);
        }
        $_SESSION['meta_oauth_state'] = bin2hex(random_bytes(32));
        $_SESSION['meta_oauth_state_created_at'] = time();
        // This app uses the Instagram Graph API through Facebook Login and a linked Page.
        // New Unified Login apps grant permissions from a Facebook Login for Business
        // configuration (config_id), so do not send legacy scope parameters for them.
        // Older classic OAuth apps retain the direct-scope fallback.
        $scopes = 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish';
        $loginConfigId = trim((string) ($config['META_LOGIN_CONFIG_ID'] ?? ''));
        if ($loginConfigId !== '' && !preg_match('/^[0-9]{1,32}$/', $loginConfigId)) {
            json_response(['error' => 'META_LOGIN_CONFIG_ID must be the numeric Configuration ID from Facebook Login for Business.'], 503);
        }
        $params = [
            'client_id' => (string) $config['META_APP_ID'],
            'redirect_uri' => (string) $config['META_REDIRECT_URI'],
            'state' => (string) $_SESSION['meta_oauth_state'],
            'response_type' => 'code',
        ];
        if ($loginConfigId !== '') {
            $params['config_id'] = $loginConfigId;
            $params['override_default_response_type'] = 'true';
        } else {
            $params['scope'] = $scopes;
        }
        $dialog = 'https://www.facebook.com/' . meta_graph_version() . '/dialog/oauth?' . http_build_query($params);
        header('Location: ' . $dialog, true, 302); exit;
    }

    if ($uriPath === '/api/meta/status' && $method === 'GET') {
        // Live read: the stored page list is only the keyring. Name, category,
        // follower count and token validity below are what Meta returns right
        // now, so the UI never shows a cached "Connected" badge for a dead token.
        $connection = read_connection();
        $pages = meta_pages_for_status($connection);
        $configured = !empty($config['META_APP_ID']) && !empty($config['META_APP_SECRET']) && !empty($config['META_REDIRECT_URI']);
        $note = $configured
            ? 'Meta app credentials are present. Authorize the Page to store a token.'
            : 'META_APP_ID, META_APP_SECRET and META_REDIRECT_URI must be set in the private config before a Page can be connected.';
        $selectedPageId = (string) ($connection['selected_page_id'] ?? ($pages[0]['id'] ?? ''));
        if ($selectedPageId !== '' && !current_page($connection ?? [], $selectedPageId)) $selectedPageId = (string) ($pages[0]['id'] ?? '');
        $checked = [];
        foreach ($pages as $page) {
            if ($page['id'] === $selectedPageId) {
                $stored = current_page($connection ?? [], $page['id']);
                $token = is_array($stored) ? (string) ($stored['access_token'] ?? '') : '';
                $probe = meta_probe_page($page['id'], $token, isset($connection['authorization_expires_at']) ? (int) $connection['authorization_expires_at'] : null);
            } else {
                $probe = ['tokenValid' => null, 'tokenStatus' => 'not_checked', 'tokenExpiresAt' => null,
                    'instagramId' => null, 'instagramUsername' => null, 'instagramStatus' => 'not_checked',
                    'authorizationExpiresAt' => isset($connection['authorization_expires_at']) ? (int) $connection['authorization_expires_at'] : null,
                    'probeError' => null, 'probeGraph' => null];
            }
            $checked[] = array_merge($page, $probe);
        }
        $lastError = $_SESSION['meta_last_error'] ?? null;
        unset($_SESSION['meta_last_error']);
        json_response([
            'connected' => count($pages) > 0,
            'pages' => $checked,
            'selectedPageId' => $selectedPageId,
            'configured' => $configured,
            'configurationNote' => $configured ? null : $note,
            'graphVersion' => meta_graph_version(),
            'checkedAt' => gmdate('c'),
            'lastError' => $lastError,
            'csrf' => $csrf,
        ]);
    }

    if ($uriPath === '/api/meta/select' && $method === 'POST') {
        require_csrf();
        $connection = read_connection();
        if (!$connection) json_response(['error' => 'Connect a Meta Page first.'], 409);
        $body = request_json();
        $pageId = is_string($body['pageId'] ?? null) ? $body['pageId'] : '';
        if (!preg_match('/^[0-9]{1,32}$/', $pageId) || !current_page($connection, $pageId)) json_response(['error' => 'That Page is not connected.'], 404);
        $connection['selected_page_id'] = $pageId;
        save_connection($connection);
        json_response(['selectedPageId' => $pageId]);
    }

    if ($uriPath === '/api/meta/disconnect' && $method === 'POST') {
        require_csrf();
        $file = connection_file();
        if (is_file($file)) @unlink($file);
        json_response(['connected' => false]);
    }

    if ($uriPath === '/api/meta/publish' && $method === 'POST') {
        require_csrf();
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 9 * 1024 * 1024) json_response(['error' => 'Upload request exceeds the 9 MB limit.'], 413);
        if (!function_exists('curl_init')) json_response(['error' => 'PHP cURL must be enabled by BigRock to publish through Meta.'], 503);
        if (!isset($_FILES['image']) || !is_array($_FILES['image'])) json_response(['error' => 'Choose a JPG or PNG image first.'], 400);
        $file = $_FILES['image'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($file['tmp_name'] ?? ''))) {
            json_response(['error' => 'The image upload failed. Please try a smaller image.'], 400);
        }
        if ((int) ($file['size'] ?? 0) < 1 || (int) $file['size'] > 8 * 1024 * 1024) {
            json_response(['error' => 'Image size must be between 1 byte and 8 MB.'], 413);
        }
        if (!class_exists('finfo')) json_response(['error' => 'PHP Fileinfo must be enabled to validate image uploads.'], 503);
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
        if (!isset($extensions[$mime])) json_response(['error' => 'Only JPEG and PNG images can be published.'], 415);
        $platforms = $_POST['platforms'] ?? [];
        if (!is_array($platforms)) $platforms = [$platforms];
        if (!$platforms || count($platforms) > 2 || array_filter($platforms, static fn($p) => !is_string($p) || !in_array($p, ['facebook', 'instagram'], true))) {
            json_response(['error' => 'Choose Facebook, Instagram, or both.'], 400);
        }
        $platforms = array_values(array_unique($platforms));
        if (!$platforms) json_response(['error' => 'Choose Facebook, Instagram, or both.'], 400);
        $dimensions = @getimagesize((string) $file['tmp_name']);
        if (!is_array($dimensions) || empty($dimensions[0]) || empty($dimensions[1]) || ($dimensions['mime'] ?? '') !== $mime) {
            json_response(['error' => 'The uploaded file is not a complete, readable JPEG or PNG image.'], 415);
        }
        $width = (int) $dimensions[0]; $height = (int) $dimensions[1];
        if ($width < 1 || $height < 1 || $width > 8192 || $height > 8192 || $width * $height > 40000000) {
            json_response(['error' => 'Image dimensions exceed the safe publishing limit (8,192 px per side and 40 megapixels).'], 413);
        }
        $aspect = $width / $height;
        if (in_array('facebook', $platforms, true) && ($width < 200 || $aspect < 0.5 || $aspect > 5.5)) {
            json_response(['error' => 'Facebook image must be at least 200 px wide and have an aspect ratio from 0.5:1 to 5.5:1.'], 415);
        }
        if (in_array('instagram', $platforms, true) && ($mime !== 'image/jpeg' || $width < 320 || $width > 1440 || $aspect < 0.8 || $aspect > 1.91)) {
            json_response(['error' => 'Instagram requires a JPEG, 320–1,440 px wide, with an aspect ratio from 0.8:1 to 1.91:1.'], 415);
        }

        $legacyCaption = is_string($_POST['caption'] ?? null) ? trim((string) $_POST['caption']) : '';
        // New editor buttons send separate platform captions. Keep the old field as
        // a compatibility fallback for clients that have not updated yet.
        $captions = [
            'facebook' => is_string($_POST['facebookCaption'] ?? null) ? trim((string) $_POST['facebookCaption']) : $legacyCaption,
            'instagram' => is_string($_POST['instagramCaption'] ?? null) ? trim((string) $_POST['instagramCaption']) : $legacyCaption,
        ];
        foreach ($platforms as $platform) {
            $caption = $captions[$platform];
            if ($caption === '') json_response(["error" => ucfirst($platform) . ' caption is required.'], 400);
            if (strlen($caption) > 20000) json_response(['error' => ucfirst($platform) . ' caption is too long.'], 413);
            $captionCharacters = preg_match_all('/./us', $caption, $unused);
            $captionLimit = $platform === 'instagram' ? 2200 : 5000;
            if ($captionCharacters === false || $captionCharacters > $captionLimit) {
                json_response(['error' => ucfirst($platform) . ' captions are limited to ' . number_format($captionLimit) . ' characters.'], 413);
            }
        }
        if (in_array('instagram', $platforms, true) && $mime !== 'image/jpeg') {
            json_response(['error' => 'Instagram requires a JPEG image. The site converts PNG to JPEG before upload; please try again.'], 415);
        }
        $baseUrl = rtrim((string) ($config['SITE_BASE_URL'] ?? ''), '/');
        if (!valid_site_origin($baseUrl)) json_response(['error' => 'Set SITE_BASE_URL to the public HTTPS URL for this site in hosting/config.local.php.'], 503);
        $connection = read_connection();
        if (!$connection) json_response(['error' => 'Connect your Meta Page before publishing.'], 409);
        $pageId = is_string($_POST['pageId'] ?? null) ? (string) $_POST['pageId'] : (string) ($connection['selected_page_id'] ?? '');
        if (!preg_match('/^[0-9]{1,32}$/', $pageId)) json_response(['error' => 'Choose a valid connected Facebook Page.'], 400);
        $page = current_page($connection, $pageId);
        if (!$page || empty($page['access_token'])) json_response(['error' => 'Select a connected Facebook Page first.'], 404);
        try { $retryAfter = publish_rate_limit($pageId); }
        catch (Throwable $error) { error_log('Meta publish rate limiter failed: ' . $error->getMessage()); json_response(['error' => 'Publishing protection is unavailable. Contact the site owner.'], 503); }
        if ($retryAfter > 0) {
            header('Retry-After: ' . $retryAfter);
            json_response(['error' => 'Publishing is temporarily rate limited for this Page. Wait before trying again.', 'retryAfter' => $retryAfter], 429);
        }
        $liveCheck = meta_probe_page($pageId, (string) $page['access_token'], isset($connection['authorization_expires_at']) ? (int) $connection['authorization_expires_at'] : null);
        if (($liveCheck['tokenValid'] ?? null) !== true) {
            $category = (string) ($liveCheck['tokenStatus'] ?? 'api_error');
            $httpStatus = in_array($category, ['expired', 'invalid_token', 'missing_token'], true) ? 401
                : ($category === 'permission_error' ? 403 : ($category === 'rate_limited' ? 429 : ($category === 'connection_error' ? 503 : 502)));
            json_response(['error' => $liveCheck['probeError'] ?? 'The selected Page token did not pass a live check.', 'category' => $category, 'graph' => $liveCheck['probeGraph'] ?? null], $httpStatus);
        }
        if (in_array('instagram', $platforms, true)
            && (($liveCheck['instagramStatus'] ?? '') !== 'linked'
                || !hash_equals((string) ($page['instagram_id'] ?? ''), (string) ($liveCheck['instagramId'] ?? '')))) {
            json_response(['error' => 'The Page’s linked Instagram account changed or is no longer available. Refresh status and reconnect before publishing.', 'category' => 'account_link_error'], 409);
        }

        @set_time_limit(300);
        $mediaDirectory = $storageDirectory . '/media';
        if (!is_dir($mediaDirectory) && !mkdir($mediaDirectory, 0700, true) && !is_dir($mediaDirectory)) {
            json_response(['error' => 'Could not prepare image storage. Check PHP folder permissions.'], 500);
        }
        foreach (glob($mediaDirectory . '/*') ?: [] as $oldMedia) {
            if (is_file($oldMedia) && filemtime($oldMedia) < time() - 3600) @unlink($oldMedia);
        }
        $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
        $mediaPath = $mediaDirectory . '/' . $filename;
        if (!move_uploaded_file((string) $file['tmp_name'], $mediaPath)) json_response(['error' => 'Could not store the uploaded image.'], 500);
        @chmod($mediaPath, 0600);
        $imageUrl = $baseUrl . '/_meta-media/' . $filename;
        $results = [];
        foreach ($platforms as $platform) {
            try {
                if ($platform === 'facebook') {
                    // Two-step Page flow: upload the photo unpublished, then
                    // create the feed post that attaches it. The /feed post is
                    // what appears on the Page timeline and reaches followers.
                    $postId = facebook_publish($page, $imageUrl, $captions['facebook']);
                    $results[] = [
                        'platform' => 'facebook',
                        'success' => true,
                        'id' => $postId,
                        'permalinkUrl' => 'https://www.facebook.com/' . rawurlencode($postId),
                    ];
                } else {
                    $id = instagram_publish($page, $imageUrl, $captions['instagram']);
                    $results[] = ['platform' => 'instagram', 'success' => true, 'id' => $id];
                }
            } catch (Throwable $error) {
                $graph = $error instanceof MetaApiException ? $error->graph : null;
                $graphCode = is_array($graph) ? ($graph['code'] ?? null) : null;
                error_log('Meta ' . $platform . ' publish failed [' . meta_error_category($error) . ']' . ($graphCode !== null ? ' code ' . (string) $graphCode : ''));
                $results[] = [
                    'platform' => $platform,
                    'success' => false,
                    'error' => $error->getMessage(),
                    'graph' => $graph,
                    'category' => meta_error_category($error),
                    'outcomeUnknown' => $error instanceof MetaTransportException && $error->mayHaveCommitted,
                    'hint' => $error instanceof MetaApiException ? meta_error_hint($graph, $platform) : $error->getMessage(),
                ];
            }
        }
        @unlink($mediaPath);
        $successCount = count(array_filter($results, static fn($result) => !empty($result['success'])));
        $message = $successCount === count($results) ? 'Published successfully.' : ($successCount > 0 ? 'One platform posted; another failed.' : 'Meta could not publish this post.');
        json_response(['message' => $message, 'results' => $results], $successCount > 0 ? 200 : 502);
    }
} catch (Throwable $error) {
    error_log('Astro Sivam PHP backend error: ' . $error->getMessage());
    json_response(['error' => $error instanceof MetaApiException ? $error->getMessage() : 'The PHP publishing service hit an error. Check the host PHP error log.'], 500);
}

// Authenticated SPA file serving: static assets are also behind the login.
if (!is_dir($distDirectory) || !is_file($distDirectory . '/index.html')) {
    http_response_code(503); header('Content-Type: text/plain; charset=utf-8');
    echo 'App build not found. Upload the contents of the built dist folder beside this PHP hosting folder.'; exit;
}

$relativePath = ltrim($uriPath, '/');
if ($relativePath === '') $relativePath = 'index.html';
$requestedFile = $distDirectory . '/' . $relativePath;
$realDist = realpath($distDirectory);
$realFile = is_file($requestedFile) ? realpath($requestedFile) : false;
if ($realDist !== false && $realFile !== false && str_starts_with($realFile, $realDist . DIRECTORY_SEPARATOR)) {
    $filePath = $realFile;
} else {
    // Client-side routes and hashes resolve to the single-page app entry point.
    $filePath = $distDirectory . '/index.html';
}
// Choose browser-facing asset MIME types by extension. Some shared-hosting
// libmagic databases identify JavaScript/CSS as text/plain; with nosniff set,
// mobile browsers then refuse the app entry bundle and show a blank page.
$mimeTypes = [
    'html' => 'text/html; charset=utf-8',
    'htm' => 'text/html; charset=utf-8',
    'js' => 'text/javascript; charset=utf-8',
    'mjs' => 'text/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'webmanifest' => 'application/manifest+json; charset=utf-8',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'avif' => 'image/avif',
    'ico' => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    'ttf' => 'font/ttf',
    'otf' => 'font/otf',
    'wasm' => 'application/wasm',
    'xml' => 'application/xml; charset=utf-8',
    'txt' => 'text/plain; charset=utf-8',
];
$extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$mime = $mimeTypes[$extension] ?? (function_exists('finfo_open') ? ((new finfo(FILEINFO_MIME_TYPE))->file($filePath) ?: 'application/octet-stream') : 'application/octet-stream');
header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($filePath));
header('Cache-Control: private, no-store');
if ($method !== 'HEAD') readfile($filePath);
