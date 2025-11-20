<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class FnbService
{
    // บันทึกออเดอร์อาหารพร้อมรายละเอียดแต่ละเมนู
    public static function createOrder(array $data): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        $orderStmt = $pdo->prepare(
            'INSERT INTO FNB_ORDER (user_id, venue_table_id, status, created_at, note, total_baht, payment_method, paid_by_user_id)
             VALUES (:user_id, :venue_table_id, :status, NOW(), :note, :total_baht, :payment_method, :paid_by_user_id)'
        );

        $orderStmt->execute([
            'user_id' => $data['user_id'],
            'venue_table_id' => $data['table_id'] ?? self::defaultTableId(),
            'status' => 'pending',
            'note' => $data['note'] ?? null,
            'total_baht' => $data['total'],
            'payment_method' => 'cash',
            'paid_by_user_id' => $data['user_id'],
        ]);

        $orderId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare(
            'INSERT INTO FNB_ORDER_ITEM (order_id, menu_item_id, quantity, unit_price_baht, line_total_baht, status, remark)
             VALUES (:order_id, :menu_item_id, :quantity, :unit_price_baht, :line_total_baht, :status, :remark)'
        );

        $menuLookup = $pdo->prepare('SELECT id, price FROM MENU_ITEM WHERE id = :id LIMIT 1');

        $insertedItems = 0;

        foreach ($data['items'] as $item) {
            $menuItemId = $item['menu_item_id'] ?? $item['id'] ?? null;
            if ($menuItemId === null) {
                throw new RuntimeException('Menu item reference missing', 422);
            }
            $menuItemId = (int)$menuItemId;

            $menuLookup->execute(['id' => $menuItemId]);
            $menuRow = $menuLookup->fetch(PDO::FETCH_ASSOC);
            if (!$menuRow) {
                throw new RuntimeException('Menu item not found', 422);
            }

            $quantity = isset($item['quantity']) ? (int)$item['quantity'] : 0;
            if ($quantity <= 0) {
                throw new RuntimeException('Invalid quantity', 422);
            }

            $unitPrice = (float)$menuRow['price'];

            $remark = null;
            if (isset($item['remark'])) {
                $trimmed = trim((string)$item['remark']);
                if ($trimmed !== '') {
                    $remark = mb_substr($trimmed, 0, 200);
                }
            }

            $itemStmt->execute([
                'order_id' => $orderId,
                'menu_item_id' => $menuItemId,
                'quantity' => $quantity,
                'unit_price_baht' => $unitPrice,
                'line_total_baht' => $unitPrice * $quantity,
                'status' => 'ordered',
                'remark' => $remark,
            ]);

            $insertedItems += $itemStmt->rowCount();
        }

        if ($insertedItems === 0) {
            $pdo->rollBack();
            throw new RuntimeException('Unable to add order items. Please try again.', 500);
        }

        $pdo->commit();

        error_log(sprintf('[fnb_order] order %d saved with %d items', $orderId, $insertedItems));

        return self::find($orderId) ?? [];
    }

    // คืนลิสต์ออเดอร์ F&B พร้อม filter/pagination
    public static function list(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $perPage = max(1, min(200, $perPage));
        $page = max(1, $page);
        $offset = ($page - 1) * $perPage;

        $pdo = Database::connection();
        [$whereClause, $params] = self::buildFilterClause($filters);

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
                INNER JOIN VENUETABLE t ON t.id = o.venue_table_id' .
            $whereClause .
            ' ORDER BY o.created_at DESC
              LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        self::bindParams($stmt, $params);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $orders = array_map(static fn(array $row) => self::transform($row), $rows);
        $total = self::countOrders($whereClause, $params);
        $stats = self::statusTotals($whereClause, $params);
        $lastPage = max(1, (int)ceil(max($total, 1) / $perPage));

        return [
            'orders' => $orders,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
            ],
            'stats' => $stats,
        ];
    }

    // ปรับสถานะการทำอาหารและเวลาชำระเงิน
    public static function updateStatus(int $orderId, string $status): array
    {
        $allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            throw new RuntimeException('Invalid status', 422);
        }

        $stmt = Database::connection()->prepare(
            'UPDATE FNB_ORDER
             SET status = :status,
                 paid_at = CASE
                     WHEN :status_completed = \'completed\' THEN NOW()
                     WHEN :status_cancelled = \'cancelled\' THEN NULL
                     ELSE paid_at
                 END
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $orderId,
            'status' => $status,
            'status_completed' => $status,
            'status_cancelled' => $status,
        ]);

        return self::find($orderId) ?? [];
    }

    // ดึงคำสั่งซื้อเดี่ยวพร้อมรายการอาหาร
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
                    fn_order_line_total(i.quantity, i.unit_price_baht) AS calculated_line_total,
                    i.status,
                    i.remark
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
                'line_total' => (float)($item['calculated_line_total'] ?? ($item['unit_price_baht'] * $item['quantity'])),
                'status' => $item['status'],
                'remark' => $item['remark'],
            ], $items),
        ];
    }

    // เลือกโต๊ะแรกที่ active ใช้เป็นค่า default
    private static function defaultTableId(): int
    {
        $stmt = Database::connection()->query('SELECT id FROM VENUETABLE WHERE is_active = 1 ORDER BY id ASC LIMIT 1');
        $id = $stmt->fetchColumn();
        if (!$id) {
            throw new RuntimeException('No tables configured');
        }

        return (int)$id;
    }

    /**
     * @return array{0:string,1:array<string, int|string>}
     */
    private static function buildFilterClause(array $filters): array
    {
        $conditions = [];
        $params = [];

        $daysBack = isset($filters['days_back']) ? max(1, (int)$filters['days_back']) : 7;
        $params[':recent_since'] = (new \DateTimeImmutable(sprintf('-%d days', $daysBack)))->format('Y-m-d H:i:s');
        $conditions[] = 'o.created_at >= :recent_since';

        if (isset($filters['user_id'])) {
            $conditions[] = 'o.user_id = :user_id';
            $params[':user_id'] = (int)$filters['user_id'];
        }

        $hasExplicitStatus = isset($filters['status']);

        if ($hasExplicitStatus) {
            $conditions[] = 'o.status = :status';
            $params[':status'] = (string)$filters['status'];
        } else {
            $view = $filters['view'] ?? null;
            if ($view === 'active') {
                $conditions[] = "o.status IN ('pending','preparing','ready')";
            } elseif ($view === 'completed') {
                $conditions[] = "o.status IN ('completed','cancelled')";
            }
        }

        $whereClause = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';

        return [$whereClause, $params];
    }

    private static function bindParams(\PDOStatement $stmt, array $params): void
    {
        foreach ($params as $placeholder => $value) {
            $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($placeholder, $value, $type);
        }
    }

    private static function countOrders(string $whereClause, array $params): int
    {
        $stmt = Database::connection()->prepare('SELECT COUNT(*) FROM FNB_ORDER o' . $whereClause);
        self::bindParams($stmt, $params);
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }

    /**
     * @return array<string, int>
     */
    private static function statusTotals(string $whereClause, array $params): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT o.status, COUNT(*) AS total
             FROM FNB_ORDER o' . $whereClause . '
             GROUP BY o.status'
        );
        self::bindParams($stmt, $params);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $defaults = [
            'pending' => 0,
            'preparing' => 0,
            'ready' => 0,
            'completed' => 0,
            'cancelled' => 0,
        ];

        foreach ($rows as $row) {
            $status = $row['status'] ?? null;
            if ($status !== null && array_key_exists($status, $defaults)) {
                $defaults[$status] = (int)$row['total'];
            }
        }

        return $defaults;
    }
}
