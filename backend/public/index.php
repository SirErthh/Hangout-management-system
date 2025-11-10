<?php

declare(strict_types=1);

ini_set('log_errors', 'On');
ini_set('error_log', __DIR__ . '/../storage/logs/app-error.log');

require dirname(__DIR__) . '/bootstrap.php';

$router = require BASE_PATH . '/routes/api.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$router->dispatch($_SERVER['REQUEST_METHOD'], $uri);
