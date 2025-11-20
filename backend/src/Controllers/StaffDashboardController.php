<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\StaffDashboardService;
use App\Support\Request;
use RuntimeException;

final class StaffDashboardController
{
    // สรุปข้อมูลแดชบอร์ดสำหรับสตาฟ
    public function summary(Request $request): array
    {
        $this->ensureStaff($request);

        $date = $request->query('date') ?: null;

        return StaffDashboardService::summary($date);
    }

    private function ensureStaff(Request $request): void
    {
        $user = $request->user();
        if (!$user || !in_array($user['role'], ['admin', 'staff'], true)) {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
