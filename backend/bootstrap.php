<?php

declare(strict_types=1);

define('BASE_PATH', __DIR__);

$config = require BASE_PATH . '/config/config.php';

date_default_timezone_set('Asia/Bangkok');

spl_autoload_register(static function ($class): void {
    $prefix = 'App\\';
    $baseDir = BASE_PATH . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

App\Support\Config::set($config);

App\Services\SchemaService::migrate();
