<?php

return [
    'app' => [
        'name' => 'Hangout Management API',
        'env' => getenv('APP_ENV') ?: 'development',
        'debug' => filter_var(getenv('APP_DEBUG') ?: true, FILTER_VALIDATE_BOOLEAN),
        'url' => getenv('APP_URL') ?: 'http://localhost:8000',
    ],
    'database' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int)(getenv('DB_PORT') ?: 3306),
        'database' => getenv('DB_DATABASE') ?: 'Hangout',
        'username' => getenv('DB_USERNAME') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: 'root',
        'charset' => 'utf8mb4',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ],
    ],
    'auth' => [
        'token_secret' => getenv('APP_KEY') ?: 'replace-this-with-a-random-secret',
        'token_ttl_minutes' => (int)(getenv('TOKEN_TTL') ?: 720),
    ],
];
