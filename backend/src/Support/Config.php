<?php

declare(strict_types=1);

namespace App\Support;

final class Config
{
    // เก็บค่าคอนฟิกทั้งหมดแบบ static
    private static array $items = [];

    public static function set(array $config): void
    {
        self::$items = $config;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        // ดึงค่าคอนฟิกแบบ nested เช่น 'database.host'
        $segments = explode('.', $key);
        $value = self::$items;

        foreach ($segments as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }

        return $value;
    }
}
