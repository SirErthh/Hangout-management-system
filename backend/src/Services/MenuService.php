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
        $stmt = Database::connection()->prepare('DELETE FROM MENU_ITEM WHERE id = :id');
        $stmt->execute(['id' => $id]);
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
}
