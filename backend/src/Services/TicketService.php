<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class TicketService
{
    public static function createOrder(array $data): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        $event = EventService::find($data['event_id']);
        if (!$event) {
            $pdo->rollBack();
            throw new RuntimeException('Event not found', 404);
        }

        $orderCode = strtoupper($event['ticketCodePrefix']) . '-' . strtoupper(bin2hex(random_bytes(3)));
        $total = $data['quantity'] * $event['price'];

        $orderStmt = $pdo->prepare(
            'INSERT INTO TICKETS_ORDER (user_id, order_code, status, total_baht, payment_method, created_at)
             VALUES (:user_id, :order_code, :status, :total_baht, :payment_method, NOW())'
        );
        $orderStmt->execute([
            'user_id' => $data['user_id'],
            'order_code' => $orderCode,
            'status' => 'pending',
            'total_baht' => $total,
            'payment_method' => 'cash',
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

        $pdo->commit();

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
            'UPDATE TICKETS_ORDER SET status = :status WHERE id = :id'
        );
        $stmt->execute([
            'status' => $status,
            'id' => $orderId,
        ]);

        return self::find($orderId) ?? [];
    }

    public static function confirmTicket(int $orderId, string $code): array
    {
        $pdo = Database::connection();

        $ticketStmt = $pdo->prepare(
            'SELECT tc.id, tc.status
             FROM TICKET_CODE tc
             INNER JOIN TICKET_ORDER_ITEM toi ON toi.id = tc.order_item_id
             WHERE toi.order_id = :order_id AND tc.code = :code
             LIMIT 1'
        );
        $ticketStmt->execute(['order_id' => $orderId, 'code' => $code]);
        $ticket = $ticketStmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            throw new RuntimeException('Ticket code not found', 404);
        }

        if ($ticket['status'] === 'confirmed') {
            return self::find($orderId) ?? [];
        }

        $update = $pdo->prepare('UPDATE TICKET_CODE SET status = "confirmed", confirmed_at = NOW() WHERE id = :id');
        $update->execute(['id' => $ticket['id']]);

        return self::find($orderId) ?? [];
    }

    public static function confirmAll(int $orderId): array
    {
        $pdo = Database::connection();
        $update = $pdo->prepare(
            'UPDATE TICKET_CODE SET status = "confirmed", confirmed_at = NOW()
             WHERE order_item_id IN (
                SELECT id FROM TICKET_ORDER_ITEM WHERE order_id = :order_id
             )'
        );
        $update->execute(['order_id' => $orderId]);

        self::updateStatus($orderId, 'confirmed');

        return self::find($orderId) ?? [];
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
        ];
    }
}
