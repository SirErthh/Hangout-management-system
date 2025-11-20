<?php

declare(strict_types=1);

// เปิด log error แล้วชี้ไปที่ storage/logs
ini_set('log_errors', 'On');
ini_set('error_log', __DIR__ . '/../storage/logs/app-error.log');

require dirname(__DIR__) . '/bootstrap.php';

// โหลด Router มาใช้
$router = require BASE_PATH . '/routes/api.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

// ส่งต่อให้ Router จัดการตาม method/uri
$router->dispatch($_SERVER['REQUEST_METHOD'], $uri);
