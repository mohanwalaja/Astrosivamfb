<?php
// Copy this file to config.local.php (keep it private and out of version control).
// BigRock may also provide these values as PHP environment variables.
return [
    'AUTH_USERNAME' => 'admin',
    'AUTH_PASSWORD' => '',
    'AUTH_SESSION_SECRET' => '', // At least 32 random characters.
    'META_APP_ID' => '',
    'META_APP_SECRET' => '',
    'META_LOGIN_CONFIG_ID' => '', // Facebook Login for Business / Unified Login configuration ID.
    'META_REDIRECT_URI' => 'https://your-domain.example/api/meta/callback',
    'META_GRAPH_VERSION' => 'v26.0',
    'SITE_BASE_URL' => 'https://your-domain.example',
];
