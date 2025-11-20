<?php

declare(strict_types=1);

namespace App\Support;

use App\Services\AuthService;

final class Request
{
    private array $query;
    private array $body;
    private array $params;
    private array $headers;
    private ?array $user = null;

    private function __construct(array $query, array $body, array $params, array $headers)
    {
        $this->query = $query;
        $this->body = $body;
        $this->params = $params;
        $this->headers = $headers;
    }

    // รวมข้อมูลจาก superglobal และ body JSON มาเป็น Request object
    public static function capture(array $params = []): self
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $header = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                $headers[$header] = $value;
            }
        }

        $content = file_get_contents('php://input');
        $parsedBody = [];
        if ($content !== false && $content !== '') {
            $decoded = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $parsedBody = $decoded;
            }
        }

        return new self($_GET, $parsedBody, $params, $headers);
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function all(): array
    {
        return $this->body;
    }

    public function param(string $key, mixed $default = null): mixed
    {
        return $this->params[$key] ?? $default;
    }

    public function header(string $key, mixed $default = null): mixed
    {
        return $this->headers[$key] ?? $default;
    }

    // ดึง token จาก header Authorization
    public function bearerToken(): ?string
    {
        $authHeader = $this->header('Authorization');
        if (!$authHeader) {
            return null;
        }
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }

    // ตั้งค่า user หลังจากตรวจสอบ token แล้ว
    public function setUser(array $user): void
    {
        $this->user = $user;
    }

    // ดึงข้อมูลผู้ใช้ที่ตรวจสอบแล้ว
    public function user(): ?array
    {
        return $this->user;
    }
}
