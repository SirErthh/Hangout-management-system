<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class FnbService
{
    public static function createOrder(array $data): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        $orderStmt = $pdo->prepare(
            'INSERT INTO FNB_ORDER (user_id, venue_table_id, status, created_at, note, total_baht, payment_method)
             VALUES (:user_id, :venue_table_id, :status, NOW(), :note, :total_baht, :payment_method)'
        );

        $orderStmt->execute([
            'user_id' => $data['user_id'],
            'venue_table_id' => $data['table_id'] ?? self::defaultTableId(),
            'status' => 'pending',
            'note' => $data['note'] ?? null,
            'total_baht' => $data['total'],
            'payment_method' => 'cash',
        ]);

        $orderId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare(
            'INSERT INTO FNB_ORDER_ITEM (order_id, menu_item_id, quantity, unit_price_baht, line_total_baht, status)
             VALUES (:order_id, :menu_item_id, :quantity, :unit_price_baht, :line_total_baht, :status)'
        );

        foreach ($data['items'] as $item) {
            $itemStmt->execute([
                'order_id' => $orderId,
                'menu_item_id' => $item['id'],
                'quantity' => $item['quantity'],
                'unit_price_baht' => $item['price'],
                'line_total_baht' => $item['price'] * $item['quantity'],
                'status' => 'ordered',
            ]);
        }

        $pdo->commit();

        return self::find($orderId) ?? [];
    }

    public static function list(array $filters = []): array
    {
        $pdo = Database::connection();

        $sql = 'SELECT o.id,
                       o.user_id,
                       o.venue_table_id,
                       o.status,
                       o.total_baht,
                       o.created_at,
                       o.note,
                       u.fname,
                       u.lname,
                       t.table_name
                FROM FNB_ORDER o
                INNER JOIN USERS u ON u.id = o.user_id
                INNER JOIN VENUETABLE t ON t.id = o.venue_table_id';

        $conditions = [];
        $params = [];

        if (isset($filters['user_id'])) {
            $conditions[] = 'o.user_id = :user_id';
            $params['user_id'] = $filters['user_id'];
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

        return array_map(static fn(array $row) => self::transform($row), $rows);
    }

    public static function updateStatus(int $orderId, string $status): array
    {
        $allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            throw new RuntimeException('Invalid status', 422);
        }

        $stmt = Database::connection()->prepare('UPDATE FNB_ORDER SET status = :status WHERE id = :id');
        $stmt->execute([
            'id' => $orderId,
            'status' => $status,
        ]);

        return self::find($orderId) ?? [];
    }

    public static function find(int $orderId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT o.id,
                    o.user_id,
                    o.venue_table_id,
                    o.status,
                    o.total_baht,
                    o.created_at,
                    o.note,
                    u.fname,
                    u.lname,
                    t.table_name
             FROM FNB_ORDER o
             INNER JOIN USERS u ON u.id = o.user_id
             INNER JOIN VENUETABLE t ON t.id = o.venue_table_id
             WHERE o.id = :id'
        );
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        return self::transform($row);
    }

    private static function transform(array $row): array
    {
        $itemsStmt = Database::connection()->prepare(
            'SELECT i.id,
                    i.menu_item_id,
                    m.name,
                    i.quantity,
                    i.unit_price_baht,
                    i.line_total_baht,
                    i.status
             FROM FNB_ORDER_ITEM i
             INNER JOIN MENU_ITEM m ON m.id = i.menu_item_id
             WHERE i.order_id = :order_id'
        );
        $itemsStmt->execute(['order_id' => $row['id']]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'customer' => trim($row['fname'] . ' ' . $row['lname']),
            'table' => $row['table_name'],
            'status' => $row['status'],
            'total' => (float)$row['total_baht'],
            'createdAt' => date('c', strtotime($row['created_at'])),
            'note' => $row['note'],
            'items' => array_map(static fn(array $item) => [
                'id' => (int)$item['menu_item_id'],
                'name' => $item['name'],
                'quantity' => (int)$item['quantity'],
                'price' => (float)$item['unit_price_baht'],
                'line_total' => (float)$item['line_total_baht'],
                'status' => $item['status'],
            ], $items),
        ];
    }

    private static function defaultTableId(): int
    {
        $stmt = Database::connection()->query('SELECT id FROM VENUETABLE WHERE is_active = 1 ORDER BY id ASC LIMIT 1');
        $id = $stmt->fetchColumn();
        if (!$id) {
            throw new RuntimeException('No tables configured');
        }

        return (int)$id;
    }
}
