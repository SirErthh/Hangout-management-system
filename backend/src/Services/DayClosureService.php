<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class DayClosureService
{
    public static function getToday(): ?array
    {
        return self::findByDate(date('Y-m-d'));
    }

    public static function store(array $data): array
    {
        return self::closeDay($data);
    }

    public static function startDay(array $payload = []): array
    {
        $pdo = Database::connection();
        $date = $payload['date'] ?? date('Y-m-d');
        $existing = self::findByDate($date);
        if ($existing) {
            throw new RuntimeException("Day already initialized for {$date}", 409);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO DAY_CLOSURE (
                closure_date,
                opened_at,
                status,
                ticket_sales_baht,
                fnb_sales_baht,
                promptpay_amount_baht,
                note
            ) VALUES (
                :date,
                :opened_at,
                "open",
                0,
                0,
                0,
                :note
            )'
        );

        $stmt->execute([
            'date' => $date,
            'opened_at' => $payload['opened_at'] ?? date('Y-m-d H:i:s'),
            'note' => $payload['note'] ?? null,
        ]);

        return [
            'closure' => self::findByDate($date),
            'summary' => self::summary($date),
            'summaryDate' => $date,
        ];
    }

    public static function closeDay(array $payload = []): array
    {
        $pdo = Database::connection();
        $date = $payload['date'] ?? date('Y-m-d');
        $record = self::findByDate($date);
        if (!$record) {
            $record = self::startDay(['date' => $date]);
        }
        if ($record['status'] === 'closed') {
            throw new RuntimeException('Day closure already submitted', 409);
        }

        $summary = self::summary($date);

        $update = $pdo->prepare(
            'UPDATE DAY_CLOSURE
             SET closed_at = :closed_at,
                 status = "closed",
                 ticket_sales_baht = :ticket_sales,
                 fnb_sales_baht = :fnb_sales,
                 promptpay_amount_baht = :promptpay,
                 note = :note
             WHERE id = :id'
        );
        $update->execute([
            'closed_at' => $payload['closed_at'] ?? date('Y-m-d H:i:s'),
            'ticket_sales' => $summary['tickets']['amount'],
            'fnb_sales' => $summary['fnb']['amount'],
            'promptpay' => $summary['cash'],
            'note' => $payload['note'] ?? null,
            'id' => $record['id'],
        ]);

        self::resetDayState($pdo, $date);

        $nextDate = $payload['next_date'] ?? date('Y-m-d', strtotime($date . ' +1 day'));

        return [
            'closure' => self::findByDate($date),
            'summary' => self::summary($nextDate),
            'summaryDate' => $nextDate,
        ];
    }

    public static function summary(string $date): array
    {
        $pdo = Database::connection();
        $tickets = self::ticketSummary($pdo, $date);
        $fnb = self::fnbSummary($pdo, $date);

        return [
            'date' => $date,
            'tickets' => $tickets,
            'fnb' => $fnb,
            'cash' => $tickets['amount'] + $fnb['amount'],
        ];
    }

    public static function findByDate(string $date): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT *
             FROM DAY_CLOSURE
             WHERE closure_date = :date
             LIMIT 1'
        );
        $stmt->execute(['date' => $date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? self::transform($row) : null;
    }

    private static function transform(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'closureDate' => $row['closure_date'],
            'openedAt' => $row['opened_at'],
            'closedAt' => $row['closed_at'],
            'status' => $row['status'],
            'ticketSales' => (float)$row['ticket_sales_baht'],
            'fnbSales' => (float)$row['fnb_sales_baht'],
            'promptpay' => (float)$row['promptpay_amount_baht'],
            'note' => $row['note'],
        ];
    }

    private static function ticketSummary(PDO $pdo, string $date): array
    {
        $stmt = $pdo->prepare(
            'SELECT
                COALESCE(SUM(i.quantity), 0) AS quantity,
                COALESCE(SUM(i.line_total_baht), 0) AS amount,
                COUNT(DISTINCT o.id) AS orders
             FROM TICKETS_ORDER o
             INNER JOIN TICKET_ORDER_ITEM i ON i.order_id = o.id
             WHERE DATE(o.created_at) = :date'
        );
        $stmt->execute(['date' => $date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['quantity' => 0, 'amount' => 0, 'orders' => 0];

        return [
            'count' => (int)$row['quantity'],
            'amount' => (float)$row['amount'],
            'orders' => (int)$row['orders'],
        ];
    }

    private static function fnbSummary(PDO $pdo, string $date): array
    {
        $stmt = $pdo->prepare(
            'SELECT
                COUNT(*) AS orders,
                COALESCE(SUM(total_baht), 0) AS amount
             FROM FNB_ORDER
             WHERE DATE(created_at) = :date'
        );
        $stmt->execute(['date' => $date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['orders' => 0, 'amount' => 0];

        return [
            'count' => (int)$row['orders'],
            'amount' => (float)$row['amount'],
        ];
    }

    private static function resetDayState(PDO $pdo, string $date): void
    {
        $reservationIds = self::fetchIds(
            $pdo,
            'SELECT id FROM TABLE_RESERVATION WHERE DATE(reserved_date) <= :date',
            ['date' => $date],
        );

        if ($reservationIds) {
            self::ensureReservationTablePivot($pdo);
            $placeholders = implode(',', array_fill(0, count($reservationIds), '?'));
            $stmt = $pdo->prepare(
                "DELETE FROM TABLE_RESERVATION_TABLE WHERE reservation_id IN ({$placeholders})"
            );
            $stmt->execute($reservationIds);
        }

        $pdo->prepare(
            'UPDATE TABLE_RESERVATION
             SET assigned_table_id = NULL,
                 status = CASE
                     WHEN status IN ("pending","confirmed","seated") THEN "completed"
                     ELSE status
                 END
             WHERE DATE(reserved_date) <= :date'
        )->execute(['date' => $date]);

        $pdo->prepare(
            'UPDATE SEATINGSESSION
             SET status = "closed",
                 note = COALESCE(note, "Auto-closed")
             WHERE status = "open" AND DATE(reserved_date) <= :date'
        )->execute(['date' => $date]);

        $pdo->prepare(
            'UPDATE FNB_ORDER
             SET status = "completed"
             WHERE DATE(created_at) <= :date AND status <> "completed"'
        )->execute(['date' => $date]);

        $pdo->prepare(
            'UPDATE TICKETS_ORDER
             SET status = "completed"
             WHERE DATE(created_at) <= :date AND status <> "completed"'
        )->execute(['date' => $date]);
    }

    private static function fetchIds(PDO $pdo, string $sql, array $params = []): array
    {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private static function ensureReservationTablePivot(PDO $pdo): void
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
