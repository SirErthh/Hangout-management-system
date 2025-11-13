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

    public static function availableForEvent(int $eventId): array
    {
        $pdo = Database::connection();
        self::ensurePivotTable($pdo);

        $stmt = $pdo->prepare(
            'SELECT id, table_name, capacity, is_active
             FROM VENUETABLE
             WHERE is_active = 1
             ORDER BY table_name ASC'
        );
        $stmt->execute();
        $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$tables) {
            return [];
        }

        $occupied = self::fetchOccupiedTableIds($pdo, $eventId);

        return array_map(static function (array $table) use ($occupied): array {
            $id = (int)$table['id'];
            return [
                'id' => $id,
                'number' => $table['table_name'],
                'capacity' => (int)$table['capacity'],
                'available' => !isset($occupied[$id]),
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

    /**
     * @return array<int, true>
     */
    private static function fetchOccupiedTableIds(PDO $pdo, int $eventId): array
    {
        $occupied = [];

        $stmt = $pdo->prepare(
            'SELECT DISTINCT t_id AS table_id FROM (
                SELECT assigned_table_id AS t_id
                FROM TABLE_RESERVATION
                WHERE event_id = :event_id
                  AND assigned_table_id IS NOT NULL
                  AND status IN ("pending","confirmed","seated")
                UNION
                SELECT rt.table_id AS t_id
                FROM TABLE_RESERVATION_TABLE rt
                INNER JOIN TABLE_RESERVATION r ON r.id = rt.reservation_id
                WHERE r.event_id = :event_id
                  AND r.status IN ("pending","confirmed","seated")
            ) AS taken'
        );
        $stmt->execute(['event_id' => $eventId]);

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $occupied[(int)$row['table_id']] = true;
        }

        return $occupied;
    }
}
