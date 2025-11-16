<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\EventService;
use App\Services\ReservationService;
use App\Services\TableService;
use App\Support\Request;
use RuntimeException;

final class ReservationController
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

        if ($eventId = (int)$request->query('event_id')) {
            $filters['event_id'] = $eventId;
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
        $daysBack = max(1, min(180, (int)$request->query('days_back', $isMine ? 90 : 14)));

        $filters['days_back'] = $daysBack;

        $result = ReservationService::list($filters, $page, $perPage);

        return [
            'reservations' => $result['reservations'],
            'meta' => $result['meta'],
            'stats' => $result['stats'],
        ];
    }

    public function store(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            throw new RuntimeException('Authentication required', 401);
        }

        $payload = $request->all();
        $date = (string)($payload['date'] ?? '');
        $partySize = (int)($payload['partySize'] ?? $payload['party_size'] ?? 0);
        $eventId = (int)($payload['event_id'] ?? 0);

        if ($date === '' || $partySize <= 0) {
            throw new RuntimeException('Invalid reservation payload', 422);
        }

        if ($eventId === 0) {
            $events = EventService::all();
            if (empty($events)) {
                throw new RuntimeException('No events configured', 400);
            }
            $eventId = $events[0]['id'];
        } elseif (!EventService::find($eventId)) {
            throw new RuntimeException('Event not found', 404);
        }

        $reservation = ReservationService::create([
            'user_id' => $user['id'],
            'event_id' => $eventId,
            'party_size' => $partySize,
            'reserved_date' => date('Y-m-d H:i:s', strtotime($date)),
            'note' => $payload['note'] ?? null,
            'assigned_table_id' => $payload['assigned_table_id'] ?? null,
        ]);

        return ['reservation' => $reservation];
    }

    public function updateStatus(Request $request): array
    {
        $this->ensureStaff($request);
        $id = (int)$request->param('id');
        $status = (string)($request->input('status') ?? '');
        if ($status === '') {
            throw new RuntimeException('Status is required', 422);
        }

        $reservation = ReservationService::updateStatus($id, $status, $request->user());
        return ['reservation' => $reservation];
    }

    public function assignTable(Request $request): array
    {
        $this->ensureStaff($request);
        $reservationId = (int)$request->param('id');
        $tableIds = $request->input('table_ids');

        if (is_array($tableIds)) {
            $tableIds = array_map('intval', $tableIds);
            $tableIds = array_values(array_filter($tableIds, static fn($id) => $id > 0));
        } else {
            $single = (int)($request->input('table_id') ?? 0);
            $tableIds = $single > 0 ? [$single] : [];
        }

        if (empty($tableIds)) {
            throw new RuntimeException('Table selection is required', 422);
        }

        $reservation = ReservationService::assignTables($reservationId, $tableIds, $request->user());
        return ['reservation' => $reservation];
    }

    public function tables(Request $request): array
    {
        $this->ensureStaff($request);
        $date = $request->query('date');
        return ['tables' => TableService::all($date)];
    }

    private function ensureStaff(Request $request): void
    {
        $user = $request->user();
        if (!$user || !in_array($user['role'], ['admin', 'staff'], true)) {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
