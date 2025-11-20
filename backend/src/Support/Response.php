<?php

declare(strict_types=1);

namespace App\Support;

final class Response
{
    // ส่งข้อมูลเป็น JSON พร้อมตั้ง header/status ให้เรียบร้อย
    public function json(mixed $data, int $status = 200, array $headers = []): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        foreach ($headers as $name => $value) {
            header($name . ': ' . $value, false);
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
