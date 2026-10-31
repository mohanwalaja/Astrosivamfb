<?php
$keys = [
    'AUTH_USERNAME', 'AUTH_PASSWORD', 'AUTH_SESSION_SECRET', 'META_APP_ID',
    'META_APP_SECRET', 'META_LOGIN_CONFIG_ID', 'META_REDIRECT_URI', 'META_GRAPH_VERSION', 'SITE_BASE_URL',
];
$config = [];
foreach ($keys as $key) {
    $value = getenv($key);
    if ($value !== false) {
        $config[$key] = $value;
    }
}
$localFile = __DIR__ . '/config.local.php';
if (is_file($localFile)) {
    $local = require $localFile;
    if (is_array($local)) {
        $config = array_merge($config, $local);
    }
}
return $config;
