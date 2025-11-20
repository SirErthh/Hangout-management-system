<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Services\AuthService;
use App\Services\UserService;
use App\Support\Request;
use RuntimeException;

final class AuthMiddleware
{
    // ตรวจสอบ token จาก header แล้วดึงข้อมูลผู้ใช้ถ้าไม่ผ่านจะโยน error
    public static function handle(Request $request): array
    {
        $token = $request->bearerToken();
        if (!$token) {
            throw new RuntimeException('Authentication required', 401);
        }

        $payload = AuthService::decodeToken($token);
        $user = UserService::findById((int)$payload['id']);

        if (!$user) {
            throw new RuntimeException('User not found', 401);
        }

        return $user;
    }
}
