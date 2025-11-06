<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class TableService
{
    public static function all(): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query(
            'SELECT id, table_name, capacity, is_active, updated_at
             FROM VENUETABLE
             ORDER BY table_name ASC'
        );

        $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$tables) {
            return [];
        }

        $statusStmt = $pdo->prepare(
            'SELECT COUNT(*)
             FROM TABLE_RESERVATION
             WHERE assigned_table_id = :table_id AND status IN ("pending","confirmed","seated")'
        );

        return array_map(static function (array $row) use ($statusStmt): array {
            $statusStmt->execute(['table_id' => $row['id']]);
            $isOccupied = ((int)$statusStmt->fetchColumn()) > 0;
            $state = (int)$row['is_active'] === 1 ? ($isOccupied ? 'occupied' : 'available') : 'inactive';

            return [
                'id' => (int)$row['id'],
                'number' => $row['table_name'],
                'capacity' => (int)$row['capacity'],
                'status' => $state,
                'updatedAt' => $row['updated_at'] ? date('c', strtotime($row['updated_at'])) : null,
            ];
        }, $tables);
    }
}
