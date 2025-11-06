<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$router = require BASE_PATH . '/routes/api.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$router->dispatch($_SERVER['REQUEST_METHOD'], $uri);
