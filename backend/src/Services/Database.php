<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\Config;
use PDO;
use PDOException;

final class Database
{
    // เก็บ PDO เชื่อมต่อเดียวให้ทั้งระบบใช้ร่วมกัน
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        // โหลดค่าคอนฟิกฐานข้อมูลจาก Config
        $config = Config::get('database');

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        self::$connection = new PDO(
            $dsn,
            $config['username'],
            $config['password'],
            $config['options']
        );

        // คืน connection ที่สร้างแล้ว
        return self::$connection;
    }
}
