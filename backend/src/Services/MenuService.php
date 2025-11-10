<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class MenuService
{
    public static function all(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, name, type, price, image_url, is_active, description
             FROM MENU_ITEM
             ORDER BY type, name'
        );

        return array_map([self::class, 'transform'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public static function create(array $data): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO MENU_ITEM (name, type, price, image_url, is_active, description)
             VALUES (:name, :type, :price, :image, :active, :description)'
        );
        $stmt->execute([
            'name' => $data['name'],
            'type' => $data['type'],
            'price' => $data['price'],
            'image' => $data['image_url'] ?? '',
            'active' => (int)$data['is_active'],
            'description' => $data['description'] ?? null,
        ]);

        return self::find((int)$pdo->lastInsertId()) ?? [];
    }

    public static function update(int $id, array $data): array
    {
        $stmt = Database::connection()->prepare(
            'UPDATE MENU_ITEM
             SET name = :name,
                 type = :type,
                 price = :price,
                 image_url = :image,
                 is_active = :active,
                 description = :description
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'type' => $data['type'],
            'price' => $data['price'],
            'image' => $data['image_url'] ?? '',
            'active' => (int)$data['is_active'],
            'description' => $data['description'] ?? null,
        ]);

        return self::find($id) ?? [];
    }

    public static function delete(int $id): void
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $orderIds = self::fetchIds(
                $pdo,
                'SELECT DISTINCT order_id FROM FNB_ORDER_ITEM WHERE menu_item_id = :id',
                ['id' => $id],
            );

            $deleteItems = $pdo->prepare('DELETE FROM FNB_ORDER_ITEM WHERE menu_item_id = :id');
            $deleteItems->execute(['id' => $id]);

            self::deleteOrdersWithoutItems($pdo, $orderIds, 'FNB_ORDER', 'FNB_ORDER_ITEM');

            $stmt = $pdo->prepare('DELETE FROM MENU_ITEM WHERE id = :id');
            $stmt->execute(['id' => $id]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, name, type, price, image_url, is_active, description
             FROM MENU_ITEM
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? self::transform($row) : null;
    }

    private static function transform(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'type' => $row['type'],
            'price' => (float)$row['price'],
            'image_url' => $row['image_url'],
            'is_active' => (bool)$row['is_active'],
            'description' => $row['description'],
        ];
    }

    /**
     * @return array<int>
     */
    private static function fetchIds(PDO $pdo, string $sql, array $params = []): array
    {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private static function deleteOrdersWithoutItems(PDO $pdo, array $orderIds, string $orderTable, string $itemTable): void
    {
        if (empty($orderIds)) {
            return;
        }

        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $sql = "DELETE FROM {$orderTable}
                WHERE id IN ({$placeholders})
                  AND NOT EXISTS (
                      SELECT 1 FROM {$itemTable} WHERE {$itemTable}.order_id = {$orderTable}.id
                  )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($orderIds);
    }
}
