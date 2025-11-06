<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\DayClosureService;
use App\Support\Request;
use RuntimeException;

final class DayClosureController
{
    public function show(Request $request): array
    {
        $this->ensureAdmin($request);
        return [
            'closure' => DayClosureService::getToday(),
        ];
    }

    public function store(Request $request): array
    {
        $this->ensureAdmin($request);
        $payload = $request->all();
        $data = [
            'ticket_sales_baht' => (float)($payload['ticket_sales_baht'] ?? 0),
            'fnb_sales_baht' => (float)($payload['fnb_sales_baht'] ?? 0),
            'promptpay_amount_baht' => (float)($payload['promptpay_amount_baht'] ?? 0),
            'note' => $payload['note'] ?? null,
            'opened_at' => $payload['opened_at'] ?? null,
            'closed_at' => $payload['closed_at'] ?? null,
        ];

        return [
            'closure' => DayClosureService::store($data),
        ];
    }

    private function ensureAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || $user['role'] !== 'admin') {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
