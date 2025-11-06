<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\FnbService;
use App\Support\Request;
use RuntimeException;

final class FnbController
{
    public function index(Request $request): array
    {
        $filters = [];

        if ($request->query('mine')) {
            $user = $request->user();
            if ($user) {
                $filters['user_id'] = $user['id'];
            }
        } else {
            $this->ensureStaff($request);
        }

        if ($status = $request->query('status')) {
            $filters['status'] = $status;
        }

        return ['orders' => FnbService::list($filters)];
    }

    public function updateStatus(Request $request): array
    {
        $this->ensureStaff($request);
        $orderId = (int)$request->param('id');
        $status = (string)($request->input('status') ?? '');

        if ($status === '') {
            throw new RuntimeException('Status is required', 422);
        }

        $order = FnbService::updateStatus($orderId, $status);
        return ['order' => $order];
    }

    private function ensureStaff(Request $request): void
    {
        $user = $request->user();
        if (!$user || !in_array($user['role'], ['admin', 'staff'], true)) {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
