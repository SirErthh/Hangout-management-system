<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$router = require BASE_PATH . '/routes/api.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
if ($origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$router->dispatch($_SERVER['REQUEST_METHOD'], $uri);
