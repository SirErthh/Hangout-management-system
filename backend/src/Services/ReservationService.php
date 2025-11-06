<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class ReservationService
{
    public static function create(array $data): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO TABLE_RESERVATION (
                user_id,
                event_id,
                partysize,
                reserved_date,
                status,
                note,
                assigned_table_id,
                created_at
            ) VALUES (
                :user_id,
                :event_id,
                :partysize,
                :reserved_date,
                :status,
                :note,
                :assigned_table_id,
                NOW()
            )'
        );

        $stmt->execute([
            'user_id' => $data['user_id'],
            'event_id' => $data['event_id'],
            'partysize' => $data['party_size'],
            'reserved_date' => $data['reserved_date'],
            'status' => 'pending',
            'note' => $data['note'] ?? null,
            'assigned_table_id' => $data['assigned_table_id'] ?? null,
        ]);

        return self::find((int)$pdo->lastInsertId()) ?? [];
    }

    public static function list(array $filters = []): array
    {
        $pdo = Database::connection();
        $sql = 'SELECT r.id,
                       r.user_id,
                       r.event_id,
                       r.partysize,
                       r.reserved_date,
                       r.status,
                       r.note,
                       r.assigned_table_id,
                       r.created_at,
                       u.fname,
                       u.lname,
                       e.title AS event_title,
                       t.table_name,
                       t.capacity AS table_capacity
                FROM TABLE_RESERVATION r
                INNER JOIN USERS u ON u.id = r.user_id
                INNER JOIN EVENTS e ON e.id = r.event_id
                LEFT JOIN VENUETABLE t ON t.id = r.assigned_table_id';

        $conditions = [];
        $params = [];

        if (isset($filters['user_id'])) {
            $conditions[] = 'r.user_id = :user_id';
            $params['user_id'] = $filters['user_id'];
        }

        if (isset($filters['status'])) {
            $conditions[] = 'r.status = :status';
            $params['status'] = $filters['status'];
        }

        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $sql .= ' ORDER BY r.reserved_date DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return array_map(static fn(array $row) => self::transform($row), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public static function updateStatus(int $id, string $status): array
    {
        $allowed = ['pending', 'confirmed', 'seated', 'no_show', 'canceled'];
        if (!in_array($status, $allowed, true)) {
            throw new RuntimeException('Invalid status value', 422);
        }

        $stmt = Database::connection()->prepare(
            'UPDATE TABLE_RESERVATION SET status = :status WHERE id = :id'
        );
        $stmt->execute(['status' => $status, 'id' => $id]);

        return self::find($id) ?? [];
    }

    public static function assignTable(int $reservationId, int $tableId): array
    {
        $pdo = Database::connection();

        $tableStmt = $pdo->prepare('SELECT id, capacity FROM VENUETABLE WHERE id = :id AND is_active = 1');
        $tableStmt->execute(['id' => $tableId]);
        $table = $tableStmt->fetch(PDO::FETCH_ASSOC);
        if (!$table) {
            throw new RuntimeException('Table not available', 404);
        }

        $reservationStmt = $pdo->prepare('SELECT partysize FROM TABLE_RESERVATION WHERE id = :id');
        $reservationStmt->execute(['id' => $reservationId]);
        $reservation = $reservationStmt->fetch(PDO::FETCH_ASSOC);
        if (!$reservation) {
            throw new RuntimeException('Reservation not found', 404);
        }

        if ((int)$reservation['partysize'] > (int)$table['capacity']) {
            throw new RuntimeException('Table capacity is insufficient', 422);
        }

        $update = $pdo->prepare(
            'UPDATE TABLE_RESERVATION
             SET assigned_table_id = :table_id, status = "confirmed"
             WHERE id = :id'
        );
        $update->execute(['table_id' => $tableId, 'id' => $reservationId]);

        return self::find($reservationId) ?? [];
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT r.id,
                    r.user_id,
                    r.event_id,
                    r.partysize,
                    r.reserved_date,
                    r.status,
                    r.note,
                    r.assigned_table_id,
                    r.created_at,
                    u.fname,
                    u.lname,
                    e.title AS event_title,
                    t.table_name,
                    t.capacity AS table_capacity
             FROM TABLE_RESERVATION r
             INNER JOIN USERS u ON u.id = r.user_id
             INNER JOIN EVENTS e ON e.id = r.event_id
             LEFT JOIN VENUETABLE t ON t.id = r.assigned_table_id
             WHERE r.id = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? self::transform($row) : null;
    }

    private static function transform(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'customer' => trim($row['fname'] . ' ' . $row['lname']),
            'event_id' => (int)$row['event_id'],
            'event' => $row['event_title'],
            'partySize' => (int)$row['partysize'],
            'reservedDate' => date('c', strtotime($row['reserved_date'])),
            'status' => $row['status'],
            'note' => $row['note'],
            'table' => $row['table_name'],
            'tableCapacity' => $row['table_capacity'] !== null ? (int)$row['table_capacity'] : null,
            'assigned_table_id' => $row['assigned_table_id'] ? (int)$row['assigned_table_id'] : null,
            'createdAt' => date('c', strtotime($row['created_at'])),
        ];
    }
}
