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
        $isMine = (bool)$request->query('mine');

        if ($isMine) {
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

        if ($search = (string)$request->query('q')) {
            $filters['search'] = trim($search);
        }

        $view = (string)$request->query(
            'view',
            $isMine ? 'all' : 'active'
        );

        if (!in_array($view, ['active', 'completed', 'all'], true)) {
            $view = $isMine ? 'all' : 'active';
        }

        $filters['view'] = $view;

        $page = max(1, (int)$request->query('page', 1));
        $perPage = max(1, min(200, (int)$request->query('per_page', 20)));
        $daysBack = max(1, min(365, (int)$request->query('days_back', $isMine ? 365 : 30)));

        $filters['days_back'] = $daysBack;

        $result = TicketService::list($filters, $page, $perPage);

        return [
            'orders' => $result['orders'],
            'meta' => $result['meta'],
            'stats' => $result['stats'],
        ];
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

        $note = $request->input('note');
        $order = TicketService::confirmTicket($orderId, $code, $request->user(), $note ? (string)$note : null);
        return ['order' => $order];
    }

    public function confirmAll(Request $request): array
    {
        $this->ensureStaff($request);
        $orderId = (int)$request->param('id');
        $note = $request->input('note');
        $order = TicketService::confirmAll($orderId, $request->user(), $note ? (string)$note : null);
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
