<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class ReservationService
{
    private const ACTIVE_STATUSES = ['pending', 'confirmed', 'seated'];
    private const COMPLETED_STATUSES = ['canceled', 'no_show'];

    public static function create(array $data): array
    {
        $pdo = Database::connection();
        self::ensurePivotTable($pdo);
        $stmt = $pdo->prepare(
            'INSERT INTO TABLE_RESERVATION (
                user_id,
                event_id,
                partysize,
                reserved_date,
                status,
                note,
                assigned_table_id,
                ticket_order_id,
                is_placeholder,
                hold_expires_at,
                created_at
            ) VALUES (
                :user_id,
                :event_id,
                :partysize,
                :reserved_date,
                :status,
                :note,
                :assigned_table_id,
                :ticket_order_id,
                :is_placeholder,
                :hold_expires_at,
                NOW()
            )'
        );

        $stmt->execute([
            'user_id' => $data['user_id'],
            'event_id' => $data['event_id'],
            'partysize' => $data['party_size'],
            'reserved_date' => $data['reserved_date'],
            'status' => $data['status'] ?? 'pending',
            'note' => $data['note'] ?? null,
            'assigned_table_id' => $data['assigned_table_id'] ?? null,
            'ticket_order_id' => $data['ticket_order_id'] ?? null,
            'is_placeholder' => isset($data['is_placeholder']) ? (int)$data['is_placeholder'] : 0,
            'hold_expires_at' => $data['hold_expires_at'] ?? null,
        ]);

        return self::find((int)$pdo->lastInsertId()) ?? [];
    }

    public static function list(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $perPage = max(1, min(200, $perPage));
        $page = max(1, $page);
        $offset = ($page - 1) * $perPage;

        $pdo = Database::connection();
        [$whereClause, $params] = self::buildFilterClause($filters);

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
                       t.capacity AS table_capacity,
                       r.ticket_order_id,
                       r.is_placeholder,
                       r.hold_expires_at
                FROM TABLE_RESERVATION r
                INNER JOIN USERS u ON u.id = r.user_id
                INNER JOIN EVENTS e ON e.id = r.event_id
                LEFT JOIN VENUETABLE t ON t.id = r.assigned_table_id ';
        $sql .= $whereClause;
        $sql .= ' ORDER BY r.reserved_date DESC
                  LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        self::bindParams($stmt, $params);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($rows) {
            $rows = self::attachTablesToRows($rows);
        }

        $reservations = array_map(static fn(array $row) => self::transform($row), $rows);
        $total = self::countReservations($whereClause, $params);
        $stats = self::statusTotals($whereClause, $params);
        $lastPage = max(1, (int)ceil(max($total, 1) / $perPage));

        return [
            'reservations' => $reservations,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
            ],
            'stats' => $stats,
        ];
    }

    public static function updateStatus(int $id, string $status, ?array $actor = null): array
    {
        $allowed = ['pending', 'confirmed', 'seated', 'no_show', 'canceled'];
        if (!in_array($status, $allowed, true)) {
            throw new RuntimeException('Invalid status value', 422);
        }

        $pdo = Database::connection();
        $currentStatus = self::fetchReservationStatus($pdo, $id);
        if ($currentStatus === null) {
            throw new RuntimeException('Reservation not found', 404);
        }

        self::setAppUserContext($pdo, $actor['id'] ?? null);

        $pdo->beginTransaction();
        try {
            $update = $pdo->prepare(
                'UPDATE TABLE_RESERVATION SET status = :status WHERE id = :id'
            );
            $update->execute(['status' => $status, 'id' => $id]);

            if (in_array($status, ['confirmed', 'seated'], true)) {
                self::clearHoldMeta($pdo, $id);
            }

            if ($status === 'seated' && $currentStatus !== 'seated') {
                self::callStartSession($pdo, $id, $actor['id'] ?? null);
            }

            if (in_array($status, ['canceled', 'no_show'], true)) {
                self::releaseTablesInternal($pdo, $id);
            }

            if (in_array($status, ['completed', 'no_show'], true) && $currentStatus !== $status) {
                self::callEndSession($pdo, $id, $status, $actor['id'] ?? null);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return self::find($id) ?? [];
    }

    public static function assignTable(int $reservationId, int $tableId, ?array $actor = null, string $nextStatus = 'confirmed'): array
    {
        return self::assignTables($reservationId, [$tableId], $actor, $nextStatus);
    }

    public static function assignTables(int $reservationId, array $tableIds, ?array $actor = null, string $nextStatus = 'confirmed'): array
    {
        $filtered = array_values(array_unique(array_map('intval', $tableIds)));
        $filtered = array_filter($filtered, static fn(int $id) => $id > 0);
        if (empty($filtered)) {
            throw new RuntimeException('Table selection is required', 422);
        }

        $allowedStatuses = ['pending', 'confirmed', 'seated'];
        if (!in_array($nextStatus, $allowedStatuses, true)) {
            throw new RuntimeException('Invalid reservation status for assignment', 422);
        }

        $pdo = Database::connection();
        self::ensurePivotTable($pdo);
        self::setAppUserContext($pdo, $actor['id'] ?? null);
        $startedTransaction = !$pdo->inTransaction();
        if ($startedTransaction) {
            $pdo->beginTransaction();
        }

        try {
            $reservationStmt = $pdo->prepare('SELECT partysize, event_id, reserved_date FROM TABLE_RESERVATION WHERE id = :id');
            $reservationStmt->execute(['id' => $reservationId]);
            $reservation = $reservationStmt->fetch(PDO::FETCH_ASSOC);
            if (!$reservation) {
                throw new RuntimeException('Reservation not found', 404);
            }

            $orderMap = self::tableOrderMap($pdo);
            $tables = self::fetchTables($pdo, $filtered, $orderMap);
            if (count($tables) !== count($filtered)) {
                throw new RuntimeException('One or more tables are not available', 404);
            }

            self::ensureTablesAreActive($tables);
            self::ensureTablesAdjacent($tables);
            self::ensureCapacitySufficient($tables, (int)$reservation['partysize']);
            self::ensureTablesFree(
                $pdo,
                $filtered,
                $reservationId,
                (int)$reservation['event_id'],
                $reservation['reserved_date']
            );

            $primaryTableId = $tables[0]['id'];

            $update = $pdo->prepare(
                'UPDATE TABLE_RESERVATION
                 SET assigned_table_id = :table_id, status = :status
                 WHERE id = :id'
            );
            $update->execute(['table_id' => $primaryTableId, 'status' => $nextStatus, 'id' => $reservationId]);

            $pdo->prepare('DELETE FROM TABLE_RESERVATION_TABLE WHERE reservation_id = :id')
                ->execute(['id' => $reservationId]);

            $insert = $pdo->prepare(
                'INSERT INTO TABLE_RESERVATION_TABLE (reservation_id, table_id, table_order)
                 VALUES (:reservation_id, :table_id, :table_order)'
            );

            foreach ($tables as $index => $table) {
                $insert->execute([
                    'reservation_id' => $reservationId,
                    'table_id' => $table['id'],
                    'table_order' => $index,
                ]);
            }

            if ($startedTransaction) {
                $pdo->commit();
            }
        } catch (\Throwable $e) {
            if ($startedTransaction && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

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
                    r.ticket_order_id,
                    r.is_placeholder,
                    r.hold_expires_at,
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
        if (!$row) {
            return null;
        }

        $rows = self::attachTablesToRows([$row]);

        return self::transform($rows[0]);
    }

    private static function transform(array $row): array
    {
        $tablesData = $row['tablesData'] ?? [];
        $tableNames = array_map(static fn(array $table) => $table['number'], $tablesData);
        $tableIds = array_map(static fn(array $table) => $table['id'], $tablesData);
        $tablesCapacity = array_sum(array_map(static fn(array $table) => $table['capacity'], $tablesData));

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
            'table' => $tableNames ? implode(' + ', $tableNames) : $row['table_name'],
            'tables' => $tableNames,
            'tableIds' => $tableIds,
            'tableCapacity' => $tablesCapacity > 0
                ? $tablesCapacity
                : ($row['table_capacity'] !== null ? (int)$row['table_capacity'] : null),
            'assigned_table_id' => $row['assigned_table_id'] ? (int)$row['assigned_table_id'] : null,
            'ticket_order_id' => isset($row['ticket_order_id']) && $row['ticket_order_id'] !== null ? (int)$row['ticket_order_id'] : null,
            'isPlaceholder' => isset($row['is_placeholder']) ? (int)$row['is_placeholder'] === 1 : false,
            'holdExpiresAt' => !empty($row['hold_expires_at']) ? date('c', strtotime($row['hold_expires_at'])) : null,
            'createdAt' => date('c', strtotime($row['created_at'])),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     *
     * @return array<int, array<string, mixed>>
     */
    private static function attachTablesToRows(array $rows): array
    {
        if (!$rows) {
            return $rows;
        }

        $ids = array_map(static fn(array $row) => (int)$row['id'], $rows);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = Database::connection()->prepare(
            'SELECT rt.reservation_id,
                    t.id AS table_id,
                    t.table_name,
                    t.capacity
             FROM TABLE_RESERVATION_TABLE rt
             INNER JOIN VENUETABLE t ON t.id = rt.table_id
             WHERE rt.reservation_id IN (' . $placeholders . ')
             ORDER BY rt.table_order ASC, t.table_name ASC'
        );
        $stmt->execute($ids);

        $map = [];
        while ($tableRow = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $reservationId = (int)$tableRow['reservation_id'];
            $map[$reservationId] ??= [];
            $map[$reservationId][] = [
                'id' => (int)$tableRow['table_id'],
                'number' => $tableRow['table_name'],
                'capacity' => (int)$tableRow['capacity'],
            ];
        }

        foreach ($rows as &$row) {
            $id = (int)$row['id'];
            $row['tablesData'] = $map[$id] ?? [];
        }

        return $rows;
    }

    private static function tableOrderMap(PDO $pdo): array
    {
        $stmt = $pdo->query('SELECT id FROM VENUETABLE ORDER BY table_name ASC');
        $order = [];
        $index = 0;
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $order[(int)$row['id']] = $index++;
        }
        return $order;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fetchTables(PDO $pdo, array $tableIds, array $orderMap): array
    {
        $placeholders = implode(',', array_fill(0, count($tableIds), '?'));
        $stmt = $pdo->prepare(
            'SELECT id, table_name, capacity, is_active
             FROM VENUETABLE
             WHERE id IN (' . $placeholders . ')'
        );
        $stmt->execute($tableIds);
        $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(
            static function (array $table) use ($orderMap): array {
                $table['id'] = (int)$table['id'];
                $table['capacity'] = (int)$table['capacity'];
                $table['is_active'] = (int)$table['is_active'];
                $table['order'] = $orderMap[$table['id']] ?? PHP_INT_MAX;
                return $table;
            },
            $tables
        );
    }

    private static function ensureTablesAreActive(array $tables): void
    {
        foreach ($tables as $table) {
            if ((int)$table['is_active'] !== 1) {
                throw new RuntimeException('Selected table is not active', 422);
            }
        }
    }

    private static function ensureTablesAdjacent(array &$tables): void
    {
        if (count($tables) <= 1) {
            $tables = array_values($tables);
            return;
        }

        usort($tables, static fn(array $a, array $b) => ($a['order'] ?? 0) <=> ($b['order'] ?? 0));

        for ($i = 1, $max = count($tables); $i < $max; $i++) {
            $current = $tables[$i]['order'] ?? null;
            $previous = $tables[$i - 1]['order'] ?? null;
            if ($current === null || $previous === null) {
                continue;
            }
            if ($current - $previous !== 1) {
                throw new RuntimeException('Selected tables must be next to each other', 422);
            }
        }
    }

    private static function ensureCapacitySufficient(array $tables, int $partySize): void
    {
        $capacity = array_sum(array_map(static fn(array $table) => (int)$table['capacity'], $tables));
        if ($capacity < $partySize) {
            throw new RuntimeException('Combined table capacity is insufficient', 422);
        }
    }

    private static function ensureTablesFree(PDO $pdo, array $tableIds, int $reservationId, int $eventId, string $reservedDate): void
    {
        self::ensurePivotTable($pdo);
        $placeholders = implode(',', array_fill(0, count($tableIds), '?'));
        $params = array_merge($tableIds, [$reservationId, $eventId]);

        $stmt = $pdo->prepare(
            'SELECT 1
             FROM TABLE_RESERVATION_TABLE rt
             INNER JOIN TABLE_RESERVATION r ON r.id = rt.reservation_id
             WHERE rt.table_id IN (' . $placeholders . ')
               AND r.status IN ("pending","confirmed","seated")
               AND r.id <> ?
               AND r.event_id = ?
             LIMIT 1'
        );
        $stmt->execute($params);

        if ($stmt->fetchColumn()) {
            throw new RuntimeException('One or more selected tables are already assigned', 422);
        }
    }

    private static function fetchReservationStatus(PDO $pdo, int $id): ?string
    {
        $stmt = $pdo->prepare('SELECT status FROM TABLE_RESERVATION WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $status = $stmt->fetchColumn();
        return $status !== false ? (string)$status : null;
    }

    private static function setAppUserContext(PDO $pdo, ?int $userId): void
    {
        $stmt = $pdo->prepare('SET @app_user_id := :user_id');
        $stmt->execute(['user_id' => $userId]);
    }

    private static function callStartSession(PDO $pdo, int $reservationId, ?int $staffId): void
    {
        $stmt = $pdo->prepare('CALL sp_start_seating_session(:reservation_id, :staff_id)');
        $stmt->execute([
            'reservation_id' => $reservationId,
            'staff_id' => $staffId,
        ]);
        $stmt->closeCursor();
    }

    private static function callEndSession(PDO $pdo, int $reservationId, string $outcome, ?int $staffId): void
    {
        $stmt = $pdo->prepare('CALL sp_end_seating_session(:reservation_id, :outcome, :staff_id)');
        $stmt->execute([
            'reservation_id' => $reservationId,
            'outcome' => $outcome,
            'staff_id' => $staffId,
        ]);
        $stmt->closeCursor();
    }

    public static function userHasConfirmedReservation(int $userId): bool
    {
        $stmt = Database::connection()->prepare(
            'SELECT 1
             FROM TABLE_RESERVATION
             WHERE user_id = :user_id
               AND status IN ("confirmed","seated")
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        return (bool)$stmt->fetchColumn();
    }

    public static function latestActiveReservation(int $userId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT r.id,
                    r.assigned_table_id,
                    r.status,
                    r.reserved_date,
                    t.table_name
             FROM TABLE_RESERVATION r
             LEFT JOIN VENUETABLE t ON t.id = r.assigned_table_id
             WHERE r.user_id = :user_id
               AND r.status IN ("confirmed","seated")
             ORDER BY r.reserved_date DESC, r.id DESC
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$reservation) {
            return null;
        }

        $tableId = isset($reservation['assigned_table_id']) ? (int)$reservation['assigned_table_id'] : null;
        $tableName = $reservation['table_name'] ?? null;

        if ($tableId === 0) {
            $tableId = null;
        }

        if ($tableId === null) {
            $pivot = $pdo->prepare(
                'SELECT t.id, t.table_name
                 FROM TABLE_RESERVATION_TABLE rt
                 INNER JOIN VENUETABLE t ON t.id = rt.table_id
                 WHERE rt.reservation_id = :reservation_id
                 ORDER BY rt.table_order ASC
                 LIMIT 1'
            );
            $pivot->execute(['reservation_id' => $reservation['id']]);
            $table = $pivot->fetch(PDO::FETCH_ASSOC);
            if ($table) {
                $tableId = (int)$table['id'];
                $tableName = $table['table_name'];
            }
        }

        return [
            'id' => (int)$reservation['id'],
            'table_id' => $tableId,
            'table_name' => $tableName,
            'status' => $reservation['status'],
        ];
    }

    public static function reservationsForEvent(int $userId, int $eventId): array
    {
        return self::list([
            'user_id' => $userId,
            'event_id' => $eventId,
        ]);
    }

    public static function findByTicketOrder(int $orderId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id FROM TABLE_RESERVATION WHERE ticket_order_id = :order_id LIMIT 1'
        );
        $stmt->execute(['order_id' => $orderId]);
        $reservationId = $stmt->fetchColumn();
        if (!$reservationId) {
            return null;
        }

        return self::find((int)$reservationId);
    }

    public static function markSeatedByOrder(int $orderId, ?array $actor = null): void
    {
        $stmt = Database::connection()->prepare(
            'SELECT id FROM TABLE_RESERVATION WHERE ticket_order_id = :order_id LIMIT 1'
        );
        $stmt->execute(['order_id' => $orderId]);
        $reservationId = $stmt->fetchColumn();
        if (!$reservationId) {
            return;
        }

        self::updateStatus((int)$reservationId, 'seated', $actor);
    }

    public static function touchHoldExpiry(int $reservationId, ?string $expiresAt, bool $isPlaceholder): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE TABLE_RESERVATION
             SET hold_expires_at = :expires_at,
                 is_placeholder = :placeholder
             WHERE id = :id'
        );
        $stmt->execute([
            'expires_at' => $expiresAt,
            'placeholder' => $isPlaceholder ? 1 : 0,
            'id' => $reservationId,
        ]);
    }

    public static function releaseTables(int $reservationId): void
    {
        self::releaseTablesInternal(Database::connection(), $reservationId);
    }

    public static function expireHolds(): int
    {
        $pdo = Database::connection();
        $stmt = $pdo->query(
            'SELECT r.id, r.ticket_order_id
             FROM TABLE_RESERVATION r
             LEFT JOIN TICKETS_ORDER o ON o.id = r.ticket_order_id
             WHERE r.hold_expires_at IS NOT NULL
               AND r.hold_expires_at < NOW()
               AND r.status IN ("pending","confirmed")
               AND (o.id IS NULL OR o.status = "pending")'
        );

        $expired = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$expired) {
            return 0;
        }

        $cancelStmt = $pdo->prepare('UPDATE TICKETS_ORDER SET status = "cancelled" WHERE id = :id');
        foreach ($expired as $row) {
            $reservationId = (int)$row['id'];
            self::updateStatus($reservationId, 'canceled');
            if (!empty($row['ticket_order_id'])) {
                $cancelStmt->execute(['id' => (int)$row['ticket_order_id']]);
            }
        }

        return count($expired);
    }

    public static function cancelByOrder(int $orderId): void
    {
        $stmt = Database::connection()->prepare(
            'SELECT id FROM TABLE_RESERVATION WHERE ticket_order_id = :order_id LIMIT 1'
        );
        $stmt->execute(['order_id' => $orderId]);
        $reservationId = $stmt->fetchColumn();
        if (!$reservationId) {
            return;
        }

        self::updateStatus((int)$reservationId, 'canceled');

        Database::connection()->prepare(
            'UPDATE TABLE_RESERVATION SET ticket_order_id = NULL WHERE id = :id'
        )->execute(['id' => $reservationId]);
    }

    /**
     * @return array{0:string,1:array<string, mixed>}
     */
    private static function buildFilterClause(array $filters): array
    {
        $conditions = [];
        $params = [];

        if (isset($filters['user_id'])) {
            $conditions[] = 'r.user_id = :user_id';
            $params[':user_id'] = (int)$filters['user_id'];
        }

        $daysBack = isset($filters['days_back']) ? max(1, (int)$filters['days_back']) : 14;
        $params[':reservation_recent_since'] = (new \DateTimeImmutable(sprintf('-%d days', $daysBack)))->format('Y-m-d H:i:s');
        $conditions[] = 'r.reserved_date >= :reservation_recent_since';

        $hasExplicitStatus = isset($filters['status']);

        if ($hasExplicitStatus) {
            $conditions[] = 'r.status = :status';
            $params[':status'] = (string)$filters['status'];
        } else {
            $view = $filters['view'] ?? null;
            if ($view === 'active') {
                $statuses = implode("','", self::ACTIVE_STATUSES);
                $conditions[] = "r.status IN ('{$statuses}')";
            } elseif ($view === 'completed') {
                $statuses = implode("','", self::COMPLETED_STATUSES);
                $conditions[] = "r.status IN ('{$statuses}')";
            }
        }

        if (isset($filters['event_id'])) {
            $conditions[] = 'r.event_id = :event_id';
            $params[':event_id'] = (int)$filters['event_id'];
        }

        if (!empty($filters['status_in']) && is_array($filters['status_in'])) {
            $placeholders = [];
            foreach (array_values($filters['status_in']) as $index => $status) {
                $key = ':status_in_' . $index;
                $placeholders[] = $key;
                $params[$key] = $status;
            }
            if ($placeholders) {
                $conditions[] = 'r.status IN (' . implode(',', $placeholders) . ')';
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

    private static function countReservations(string $whereClause, array $params): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM TABLE_RESERVATION r
             INNER JOIN USERS u ON u.id = r.user_id
             INNER JOIN EVENTS e ON e.id = r.event_id
             LEFT JOIN VENUETABLE t ON t.id = r.assigned_table_id ' . $whereClause
        );
        self::bindParams($stmt, $params);
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }

    /**
     * @return array<string, int|float>
     */
    private static function statusTotals(string $whereClause, array $params): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT r.status, COUNT(*) AS total, COALESCE(SUM(r.partysize), 0) AS guests
             FROM TABLE_RESERVATION r
             INNER JOIN USERS u ON u.id = r.user_id
             INNER JOIN EVENTS e ON e.id = r.event_id
             LEFT JOIN VENUETABLE t ON t.id = r.assigned_table_id ' . $whereClause . '
             GROUP BY r.status'
        );
        self::bindParams($stmt, $params);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $defaults = [
            'pending' => 0,
            'confirmed' => 0,
            'seated' => 0,
            'no_show' => 0,
            'canceled' => 0,
            'guest_total' => 0,
        ];

        foreach ($rows as $row) {
            $status = $row['status'] ?? null;
            $total = isset($row['total']) ? (int)$row['total'] : 0;
            $guests = isset($row['guests']) ? (int)$row['guests'] : 0;
            if ($status !== null && array_key_exists($status, $defaults)) {
                $defaults[$status] = $total;
            }
            $defaults['guest_total'] += $guests;
        }

        return $defaults;
    }

    private static function ensurePivotTable(PDO $pdo): void
    {
        static $isEnsured = false;
        if ($isEnsured) {
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

        $isEnsured = true;
    }

    private static function clearHoldMeta(PDO $pdo, int $reservationId): void
    {
        $stmt = $pdo->prepare(
            'UPDATE TABLE_RESERVATION
             SET hold_expires_at = NULL,
                 is_placeholder = 0
             WHERE id = :id'
        );
        $stmt->execute(['id' => $reservationId]);
    }

    private static function releaseTablesInternal(PDO $pdo, int $reservationId): void
    {
        $pdo->prepare('DELETE FROM TABLE_RESERVATION_TABLE WHERE reservation_id = :id')
            ->execute(['id' => $reservationId]);

        $pdo->prepare('UPDATE TABLE_RESERVATION SET assigned_table_id = NULL WHERE id = :id')
            ->execute(['id' => $reservationId]);
    }
}
