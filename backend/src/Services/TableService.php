<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class TableService
{
    public static function all(): array
    {
        $pdo = Database::connection();
        self::ensurePivotTable($pdo);
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
             FROM (
                 SELECT r.id
                 FROM TABLE_RESERVATION r
                 WHERE r.assigned_table_id = :table_id
                   AND r.status IN ("pending","confirmed","seated")
                 UNION
                 SELECT r2.id
                 FROM TABLE_RESERVATION_TABLE rt
                 INNER JOIN TABLE_RESERVATION r2 ON r2.id = rt.reservation_id
                 WHERE rt.table_id = :table_id
                   AND r2.status IN ("pending","confirmed","seated")
             ) AS active_reservations'
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

    private static function ensurePivotTable(PDO $pdo): void
    {
        static $ensured = false;
        if ($ensured) {
            return;
        }

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS TABLE_RESERVATION_TABLE (
                reservation_id BIGINT NOT NULL,
                table_id BIGINT NOT NULL,
                table_order INT NOT NULL DEFAULT 0,
                PRIMARY KEY (reservation_id, table_id),
                KEY idx_res_table (table_id),
                CONSTRAINT fk_res_table_reservation FOREIGN KEY (reservation_id)
                    REFERENCES TABLE_RESERVATION(id) ON DELETE CASCADE ON UPDATE RESTRICT,
                CONSTRAINT fk_res_table_table FOREIGN KEY (table_id)
                    REFERENCES VENUETABLE(id) ON DELETE CASCADE ON UPDATE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $ensured = true;
    }
}
