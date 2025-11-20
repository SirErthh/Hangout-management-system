<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\UserService;
use App\Support\Request;
use RuntimeException;

final class UserController
{
    // ลิสต์ผู้ใช้ทั้งหมด (เฉพาะแอดมิน)
    public function index(Request $request): array
    {
        $this->ensureAdmin($request);

        return ['users' => UserService::all()];
    }

    // update role user
    public function updateRole(Request $request): array
    {
        $this->ensureAdmin($request);

        $id = (int)$request->param('id');
        $role = (string)($request->input('role') ?? '');

        if ($role === '') {
            throw new RuntimeException('Role is required', 422);
        }

        UserService::assignRole($id, $role);

        $user = UserService::findById($id);

        return ['user' => $user];
    }

    private function ensureAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || $user['role'] !== 'admin') {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
