<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class TicketService
{
    private const HOLD_MINUTES = 30;
    public static function createOrder(array $data): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        $event = EventService::find($data['event_id']);
        if (!$event) {
            $pdo->rollBack();
            throw new RuntimeException('Event not found', 404);
        }

        try {
            $orderCode = strtoupper($event['ticketCodePrefix']) . '-' . strtoupper(bin2hex(random_bytes(3)));
            $total = $data['quantity'] * $event['price'];

            $orderStmt = $pdo->prepare(
                'INSERT INTO TICKETS_ORDER (user_id, order_code, status, total_baht, payment_method, created_at, paid_by_user_id)
                 VALUES (:user_id, :order_code, :status, :total_baht, :payment_method, NOW(), :paid_by_user_id)'
            );
            $orderStmt->execute([
                'user_id' => $data['user_id'],
                'order_code' => $orderCode,
                'status' => 'pending',
                'total_baht' => $total,
                'payment_method' => 'cash',
                'paid_by_user_id' => $data['user_id'],
            ]);
            $orderId = (int)$pdo->lastInsertId();

            $itemStmt = $pdo->prepare(
                'INSERT INTO TICKET_ORDER_ITEM (order_id, event_id, quantity, unit_price_baht, line_total_baht)
                 VALUES (:order_id, :event_id, :quantity, :unit_price_baht, :line_total_baht)'
            );
            $itemStmt->execute([
                'order_id' => $orderId,
                'event_id' => $data['event_id'],
                'quantity' => $data['quantity'],
                'unit_price_baht' => $event['price'],
                'line_total_baht' => $total,
            ]);
            $orderItemId = (int)$pdo->lastInsertId();

            $codes = self::generateCodes(
                $event['ticketCodePrefix'],
                $orderItemId,
                $data['quantity']
            );

            self::processReservationSelection(
                $pdo,
                [
                    'reservation' => $data['reservation'] ?? null,
                    'user_id' => $data['user_id'],
                    'event_id' => $data['event_id'],
                    'quantity' => $data['quantity'],
                    'order_id' => $orderId,
                    'event_starts_at' => $data['event_starts_at'] ?? ($event['starts_at'] ?? null),
                ],
                $event
            );

            if ($pdo->inTransaction()) {
                $pdo->commit();
            }
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $order = self::find($orderId);
        if ($order) {
            $order['tickets'] = $codes;
            return $order;
        }

        return [
            'id' => $orderId,
            'order_code' => $orderCode,
            'status' => 'pending',
            'total' => $total,
            'quantity' => $data['quantity'],
            'tickets' => $codes,
            'event' => $event['name'],
            'event_id' => $data['event_id'],
            'createdAt' => date('c'),
            'confirmedTickets' => [],
        ];
    }

    public static function list(array $filters = []): array
    {
        $pdo = Database::connection();

        $sql = 'SELECT o.id,
                       o.user_id,
                       o.order_code,
                       o.status,
                       o.total_baht,
                       o.created_at,
                       i.event_id,
                       i.quantity,
                       i.unit_price_baht,
                       e.title AS event_title,
                       u.fname,
                       u.lname
                FROM TICKETS_ORDER o
                INNER JOIN TICKET_ORDER_ITEM i ON i.order_id = o.id
                INNER JOIN EVENTS e ON e.id = i.event_id
                INNER JOIN USERS u ON u.id = o.user_id';

        $conditions = [];
        $params = [];

        if (isset($filters['user_id'])) {
            $conditions[] = 'o.user_id = :user_id';
            $params['user_id'] = (int)$filters['user_id'];
        }

        if (isset($filters['status'])) {
            $conditions[] = 'o.status = :status';
            $params['status'] = $filters['status'];
        }

        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $sql .= ' ORDER BY o.created_at DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn(array $row) => self::transformOrder($row), $rows);
    }

    public static function updateStatus(int $orderId, string $status): array
    {
        $allowed = ['pending', 'confirmed', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            throw new RuntimeException('Invalid status provided', 422);
        }

        $stmt = Database::connection()->prepare(
            'UPDATE TICKETS_ORDER
             SET status = :status,
                 paid_at = CASE
                     WHEN :status_completed = \'confirmed\' THEN NOW()
                     WHEN :status_reset IN (\'pending\',\'cancelled\') THEN NULL
                     ELSE paid_at
                 END,
                 verified_at = CASE
                     WHEN :status_completed = \'confirmed\' THEN NOW()
                     WHEN :status_reset IN (\'pending\',\'cancelled\') THEN NULL
                     ELSE verified_at
                 END
             WHERE id = :id'
        );
        $stmt->execute([
            'status' => $status,
            'id' => $orderId,
            'status_completed' => $status,
            'status_reset' => $status,
        ]);

        if ($status === 'cancelled') {
            ReservationService::cancelByOrder($orderId);
        }

        return self::find($orderId) ?? [];
    }

    public static function confirmTicket(int $orderId, string $code, ?array $actor = null, ?string $note = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $ticketStmt = $pdo->prepare(
                'SELECT tc.id AS ticket_code_id,
                        tc.code AS ticket_code,
                        tc.status,
                        tc.order_item_id,
                        toi.event_id,
                        o.user_id AS customer_id
                 FROM TICKET_CODE tc
                 INNER JOIN TICKET_ORDER_ITEM toi ON toi.id = tc.order_item_id
                 INNER JOIN TICKETS_ORDER o ON o.id = toi.order_id
                 WHERE toi.order_id = :order_id AND tc.code = :code
                 LIMIT 1'
            );
            $ticketStmt->execute(['order_id' => $orderId, 'code' => $code]);
            $ticket = $ticketStmt->fetch(PDO::FETCH_ASSOC);

            if (!$ticket) {
                throw new RuntimeException('Ticket code not found', 404);
            }

            $alreadyConfirmed = $ticket['status'] === 'confirmed';
            if (!$alreadyConfirmed) {
                $update = $pdo->prepare('UPDATE TICKET_CODE SET status = "confirmed", confirmed_at = NOW() WHERE id = :id');
                $update->execute(['id' => $ticket['ticket_code_id']]);
            }

            self::recordCheckIn($pdo, [
                'order_id' => $orderId,
                'order_item_id' => (int)$ticket['order_item_id'],
                'ticket_code_id' => (int)$ticket['ticket_code_id'],
                'ticket_code' => $ticket['ticket_code'],
                'event_id' => isset($ticket['event_id']) ? (int)$ticket['event_id'] : null,
                'customer_id' => isset($ticket['customer_id']) ? (int)$ticket['customer_id'] : null,
                'staff_id' => $actor['id'] ?? null,
                'note' => $note,
            ]);

            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        self::updateStatus($orderId, 'confirmed');
        ReservationService::markSeatedByOrder($orderId, $actor);

        return self::find($orderId) ?? [];
    }

    public static function confirmAll(int $orderId, ?array $actor = null, ?string $note = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $ticketStmt = $pdo->prepare(
                'SELECT tc.id AS ticket_code_id,
                        tc.code AS ticket_code,
                        tc.order_item_id,
                        tc.status,
                        toi.event_id,
                        o.user_id AS customer_id
                 FROM TICKET_CODE tc
                 INNER JOIN TICKET_ORDER_ITEM toi ON toi.id = tc.order_item_id
                 INNER JOIN TICKETS_ORDER o ON o.id = toi.order_id
                 WHERE toi.order_id = :order_id'
            );
            $ticketStmt->execute(['order_id' => $orderId]);
            $tickets = $ticketStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!$tickets) {
                throw new RuntimeException('No tickets found for order', 404);
            }

            $update = $pdo->prepare(
                'UPDATE TICKET_CODE SET status = "confirmed", confirmed_at = NOW()
                 WHERE order_item_id IN (
                    SELECT id FROM TICKET_ORDER_ITEM WHERE order_id = :order_id
                 )'
            );
            $update->execute(['order_id' => $orderId]);

            foreach ($tickets as $ticket) {
                self::recordCheckIn($pdo, [
                    'order_id' => $orderId,
                    'order_item_id' => (int)$ticket['order_item_id'],
                    'ticket_code_id' => (int)$ticket['ticket_code_id'],
                    'ticket_code' => $ticket['ticket_code'],
                    'event_id' => isset($ticket['event_id']) ? (int)$ticket['event_id'] : null,
                    'customer_id' => isset($ticket['customer_id']) ? (int)$ticket['customer_id'] : null,
                    'staff_id' => $actor['id'] ?? null,
                    'note' => $note,
                ]);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        self::updateStatus($orderId, 'confirmed');
        ReservationService::markSeatedByOrder($orderId, $actor);

        return self::find($orderId) ?? [];
    }

    private static function recordCheckIn(PDO $pdo, array $data): void
    {
        $existsStmt = $pdo->prepare('SELECT id FROM CHECK_IN WHERE ticket_code_id = :ticket_code_id LIMIT 1');
        $existsStmt->execute(['ticket_code_id' => $data['ticket_code_id']]);
        $existingId = $existsStmt->fetchColumn();
        if ($existingId) {
            $update = $pdo->prepare(
                'UPDATE CHECK_IN
                 SET ticket_order_id = :order_id,
                     order_id = :order_id,
                     ticket_order_item_id = :order_item_id,
                     ticket_code = :ticket_code,
                     event_id = :event_id,
                     customer_id = :customer_id,
                     staff_id = :staff_id,
                     note = :note
                 WHERE id = :id'
            );
            $update->execute([
                'order_id' => $data['order_id'],
                'order_item_id' => $data['order_item_id'],
                'ticket_code' => $data['ticket_code'],
                'event_id' => $data['event_id'],
                'customer_id' => $data['customer_id'],
                'staff_id' => $data['staff_id'],
                'note' => $data['note'],
                'id' => $existingId,
            ]);
            return;
        }

        $slotStmt = $pdo->prepare(
            'SELECT COALESCE(MAX(slot_no), 0) + 1 AS next_slot
             FROM CHECK_IN
             WHERE ticket_order_item_id = :order_item_id'
        );
        $slotStmt->execute(['order_item_id' => $data['order_item_id']]);
        $slot = (int)$slotStmt->fetchColumn();
        if ($slot <= 0) {
            $slot = 1;
        }

        $insert = $pdo->prepare(
            'INSERT INTO CHECK_IN (
                ticket_order_id,
                order_id,
                ticket_order_item_id,
                slot_no,
                scanned_at,
                ticket_code_id,
                ticket_code,
                event_id,
                customer_id,
                staff_id,
                note
            ) VALUES (
                :order_id,
                :order_id,
                :order_item_id,
                :slot_no,
                NOW(),
                :ticket_code_id,
                :ticket_code,
                :event_id,
                :customer_id,
                :staff_id,
                :note
            )'
        );
        $insert->execute([
            'order_id' => $data['order_id'],
            'order_item_id' => $data['order_item_id'],
            'slot_no' => $slot,
            'ticket_code_id' => $data['ticket_code_id'],
            'ticket_code' => $data['ticket_code'],
            'event_id' => $data['event_id'],
            'customer_id' => $data['customer_id'],
            'staff_id' => $data['staff_id'],
            'note' => $data['note'],
        ]);
    }

    public static function find(int $orderId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT o.id,
                    o.user_id,
                    o.order_code,
                    o.status,
                    o.total_baht,
                    o.created_at,
                    i.event_id,
                    i.quantity,
                    i.unit_price_baht,
                    e.title AS event_title,
                    u.fname,
                    u.lname
             FROM TICKETS_ORDER o
             INNER JOIN TICKET_ORDER_ITEM i ON i.order_id = o.id
             INNER JOIN EVENTS e ON e.id = i.event_id
             INNER JOIN USERS u ON u.id = o.user_id
             WHERE o.id = :id'
        );
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        return self::transformOrder($row);
    }

    private static function generateCodes(string $prefix, int $orderItemId, int $quantity): array
    {
        $pdo = Database::connection();
        $codes = [];

        $prefix = strtoupper(substr($prefix, 0, 3));
        $lastNumber = self::lastCodeNumber($prefix);

        $insert = $pdo->prepare(
            'INSERT INTO TICKET_CODE (order_item_id, code) VALUES (:order_item_id, :code)'
        );

        for ($i = 1; $i <= $quantity; $i++) {
            $number = $lastNumber + $i;
            $code = sprintf('%s%03d', $prefix, $number);
            $insert->execute([
                'order_item_id' => $orderItemId,
                'code' => $code,
            ]);
            $codes[] = $code;
        }

        return $codes;
    }

    private static function processReservationSelection(PDO $pdo, array $context, array $event): void
    {
        $payload = $context['reservation'] ?? null;
        if (!is_array($payload)) {
            throw new RuntimeException('Table selection is required before checkout.', 422);
        }

        $holdExpiresAt = self::calculateHoldExpiry($event);

        self::createReservationWithTables($pdo, $payload, $context, $holdExpiresAt, $event);
    }

    private static function createReservationWithTables(
        PDO $pdo,
        array $payload,
        array $context,
        string $holdExpiresAt,
        array $event
    ): void {
        $tableIds = array_values(array_unique(array_map('intval', $payload['table_ids'] ?? $payload['tableIds'] ?? [])));
        $tableIds = array_filter($tableIds, static fn(int $id) => $id > 0);
        if (empty($tableIds)) {
            throw new RuntimeException('Please select at least one table.', 422);
        }

        $partySize = max((int)($payload['party_size'] ?? $payload['partySize'] ?? 0), (int)$context['quantity']);
        $reservation = ReservationService::create([
            'user_id' => $context['user_id'],
            'event_id' => $context['event_id'],
            'party_size' => $partySize,
            'reserved_date' => self::reservationDateForEvent($event),
            'note' => $payload['note'] ?? null,
            'ticket_order_id' => $context['order_id'],
            'hold_expires_at' => $holdExpiresAt,
        ]);

        if (empty($reservation['id'])) {
            throw new RuntimeException('Unable to create reservation for this order', 500);
        }

        ReservationService::assignTables((int)$reservation['id'], $tableIds, ['id' => $context['user_id']], 'pending');
        ReservationService::touchHoldExpiry((int)$reservation['id'], $holdExpiresAt, false);
    }

    private static function reservationDateForEvent(array $event): string
    {
        $startsAt = $event['starts_at'] ?? null;
        if ($startsAt) {
            $timestamp = strtotime((string)$startsAt);
            if ($timestamp !== false) {
                return date('Y-m-d H:i:s', $timestamp);
            }
        }

        return date('Y-m-d H:i:s');
    }

    private static function calculateHoldExpiry(array $event): string
    {
        $startsAt = $event['starts_at'] ?? null;
        if ($startsAt) {
            $timestamp = strtotime((string)$startsAt);
            if ($timestamp !== false) {
                return date('Y-m-d H:i:s', $timestamp + self::HOLD_MINUTES * 60);
            }
        }

        return date('Y-m-d H:i:s', time() + self::HOLD_MINUTES * 60);
    }

    private static function lastCodeNumber(string $prefix): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT MAX(CAST(SUBSTRING(code, 4) AS UNSIGNED)) AS last_number
             FROM TICKET_CODE
             WHERE code LIKE :prefix'
        );
        $stmt->execute(['prefix' => $prefix . '%']);
        $value = $stmt->fetchColumn();

        return $value ? (int)$value : 0;
    }

    private static function transformOrder(array $row): array
    {
        $codesStmt = Database::connection()->prepare(
            'SELECT code, status, confirmed_at
             FROM TICKET_CODE
             WHERE order_item_id IN (
                SELECT id FROM TICKET_ORDER_ITEM WHERE order_id = :order_id
             )
             ORDER BY code ASC'
        );
        $codesStmt->execute(['order_id' => $row['id']]);
        $codes = $codesStmt->fetchAll(PDO::FETCH_ASSOC);

        $confirmed = array_values(array_filter(
            array_map(static fn(array $code) => $code['status'] === 'confirmed' ? $code['code'] : null, $codes),
            static fn($value) => $value !== null
        ));

        $reservation = ReservationService::findByTicketOrder((int)$row['id']);

        return [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'customer' => trim($row['fname'] . ' ' . $row['lname']),
            'order_code' => $row['order_code'],
            'status' => $row['status'],
            'event_id' => (int)$row['event_id'],
            'event' => $row['event_title'],
            'quantity' => (int)$row['quantity'],
            'total' => (float)$row['total_baht'],
            'price' => (float)$row['unit_price_baht'],
            'createdAt' => date('c', strtotime($row['created_at'])),
            'tickets' => array_map(static fn(array $code) => $code['code'], $codes),
            'confirmedTickets' => $confirmed,
            'reservation' => $reservation,
        ];
    }
}
