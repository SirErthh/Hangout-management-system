<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\TicketService;
use App\Support\Request;
use RuntimeException;

final class TicketController
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

        return ['orders' => TicketService::list($filters)];
    }

    public function updateStatus(Request $request): array
    {
        $this->ensureStaff($request);
        $orderId = (int)$request->param('id');
        $status = (string)($request->input('status') ?? '');
        if ($status === '') {
            throw new RuntimeException('Status is required', 422);
        }

        $order = TicketService::updateStatus($orderId, $status);
        return ['order' => $order];
    }

    public function confirmTicket(Request $request): array
    {
        $this->ensureStaff($request);
        $orderId = (int)$request->param('id');
        $code = (string)($request->input('code') ?? '');
        if ($code === '') {
            throw new RuntimeException('Code is required', 422);
        }

        $order = TicketService::confirmTicket($orderId, $code);
        return ['order' => $order];
    }

    public function confirmAll(Request $request): array
    {
        $this->ensureStaff($request);
        $orderId = (int)$request->param('id');
        $order = TicketService::confirmAll($orderId);
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
