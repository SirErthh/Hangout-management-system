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

        return ['reservations' => ReservationService::list($filters)];
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

        $reservation = ReservationService::updateStatus($id, $status);
        return ['reservation' => $reservation];
    }

    public function assignTable(Request $request): array
    {
        $this->ensureStaff($request);
        $reservationId = (int)$request->param('id');
        $tableId = (int)($request->input('table_id') ?? 0);
        if ($tableId === 0) {
            throw new RuntimeException('Table id is required', 422);
        }

        $reservation = ReservationService::assignTable($reservationId, $tableId);
        return ['reservation' => $reservation];
    }

    public function tables(Request $request): array
    {
        $this->ensureStaff($request);
        return ['tables' => TableService::all()];
    }

    private function ensureStaff(Request $request): void
    {
        $user = $request->user();
        if (!$user || !in_array($user['role'], ['admin', 'staff'], true)) {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
