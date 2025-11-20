<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\AdminDashboardService;
use App\Support\Request;
use RuntimeException;

final class AdminDashboardController
{
    // แดชบอร์ดแอดมิน ต้องตรวจว่า role เป็น admin เท่านั้น
    public function summary(Request $request): array
    {
        $user = $request->user();
        if (!$user || $user['role'] !== 'admin') {
            throw new RuntimeException('Forbidden', 403);
        }

        return AdminDashboardService::summary();
    }
}
