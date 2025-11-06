<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\EventService;
use App\Services\TicketService;
use App\Support\Request;
use RuntimeException;

final class EventController
{
    public function index(): array
    {
        return ['events' => EventService::all()];
    }

    public function show(Request $request): array
    {
        $id = (int)$request->param('id');
        $event = EventService::find($id);
        if (!$event) {
            throw new RuntimeException('Event not found', 404);
        }

        return ['event' => $event];
    }

    public function store(Request $request): array
    {
        $this->ensureAdmin($request);
        $data = $this->validate($request);
        $event = EventService::create($data);

        return ['event' => $event];
    }

    public function update(Request $request): array
    {
        $this->ensureAdmin($request);
        $id = (int)$request->param('id');
        $existing = EventService::find($id);
        if (!$existing) {
            throw new RuntimeException('Event not found', 404);
        }

        $data = $this->validate($request);
        $event = EventService::update($id, $data);

        return ['event' => $event];
    }

    public function destroy(Request $request): array
    {
        $this->ensureAdmin($request);
        $id = (int)$request->param('id');
        EventService::delete($id);
        return ['message' => 'Event deleted'];
    }

    public function orderTickets(Request $request): array
    {
        $eventId = (int)$request->param('id');
        $payload = $request->all();
        $user = $request->user();
        if (!$user) {
            throw new RuntimeException('Authentication required', 401);
        }

        $quantity = (int)($payload['quantity'] ?? 0);
        if ($quantity <= 0) {
            throw new RuntimeException('Quantity must be greater than zero', 422);
        }

        $ticketOrder = TicketService::createOrder([
            'user_id' => $user['id'],
            'event_id' => $eventId,
            'quantity' => $quantity,
            'price' => (float)($payload['price'] ?? 0),
        ]);

        return ['order' => $ticketOrder];
    }

    private function validate(Request $request): array
    {
        $payload = $request->all();
        $name = trim((string)($payload['name'] ?? ''));
        $price = isset($payload['price']) ? (float)$payload['price'] : null;
        $startsAt = (string)($payload['starts_at'] ?? '');
        $endsAt = (string)($payload['ends_at'] ?? '');
        $date = (string)($payload['date'] ?? '');
        $endDate = (string)($payload['end_date'] ?? $date);

        if ($name === '' || $price === null) {
            throw new RuntimeException('Invalid event payload', 422);
        }

        if ($startsAt === '' && $date !== '') {
            $startsAt = $date . ' 20:00:00';
        }

        if ($endsAt === '' && $endDate !== '') {
            $endsAt = $endDate . ' 23:59:00';
        }

        return [
            'name' => $name,
            'artist' => $payload['artist'] ?? 'Resident DJ',
            'status' => $payload['status'] ?? 'published',
            'image_url' => $payload['image_url'] ?? '',
            'description' => $payload['description'] ?? '',
            'price' => $price,
            'starts_at' => $startsAt ?: date('Y-m-d H:i:s'),
            'ends_at' => $endsAt ?: date('Y-m-d H:i:s', strtotime('+3 hours')),
            'ticket_code_prefix' => $payload['ticketCodePrefix'] ?? $payload['ticket_code_prefix'] ?? 'HAN',
            'capacity' => isset($payload['capacity']) ? (int)$payload['capacity'] : 0,
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
