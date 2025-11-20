<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class DayClosureService
{
    // show ข้อมูลวันปัจจุบัน for dashboard
    public static function getToday(): ?array
    {
        return self::current();
    }

    // alias สำหรับปิดวันผ่าน controller
    public static function store(array $data): array
    {
        return self::closeDay($data);
    }

    // เปิดรอบวันใหม่หรือรีเซ็ตรอบที่มีอยู่
    public static function startDay(array $payload = []): array
    {
        $pdo = Database::connection();
        $date = $payload['date'] ?? date('Y-m-d');
        $existing = self::findByDate($date);
        $openedAt = $payload['opened_at'] ?? date('Y-m-d H:i:s');
        $note = $payload['note'] ?? null;

        if ($existing) {
            if ($existing['status'] === 'open') {
                throw new RuntimeException("Day already initialized for {$date}", 409);
            }

            $stmt = $pdo->prepare(
                'UPDATE DAY_CLOSURE
                 SET status = "open",
                     opened_at = :opened_at,
                     closed_at = :opened_at,
                     ticket_sales_baht = 0,
                     fnb_sales_baht = 0,
                     promptpay_amount_baht = 0,
                     note = :note
                 WHERE id = :id'
            );
            $stmt->execute([
                'opened_at' => $openedAt,
                'note' => $note,
                'id' => $existing['id'],
            ]);

            return [
                'closure' => self::findByDate($date),
                'summary' => self::summary($date),
                'summaryDate' => $date,
                'previousClosure' => self::latestClosed(),
                'nextDate' => date('Y-m-d', strtotime($date . ' +1 day')),
            ];
        }

        $stmt = $pdo->prepare(
            'INSERT INTO DAY_CLOSURE (
                closure_date,
                opened_at,
                closed_at,
                status,
                ticket_sales_baht,
                fnb_sales_baht,
                promptpay_amount_baht,
                note
            ) VALUES (
                :date,
                :opened_at,
                :closed_at,
                "open",
                0,
                0,
                0,
                :note
            )'
        );

        $stmt->execute([
            'date' => $date,
            'opened_at' => $openedAt,
            'closed_at' => $openedAt,
            'note' => $note,
        ]);

        $nextDate = date('Y-m-d', strtotime($date . ' +1 day'));

        return [
            'closure' => self::findByDate($date),
            'summary' => self::summary($date),
            'summaryDate' => $date,
            'previousClosure' => self::latestClosed(),
            'nextDate' => $nextDate,
        ];
    }

    // ปิดวันคำนวณยอดขายแล้วล็อกสถานะ
    public static function closeDay(array $payload = []): array
    {
        $pdo = Database::connection();
        $openRecord = self::current();
        if (!$openRecord) {
            throw new RuntimeException('No active day to close', 409);
        }

        $date = $openRecord['closureDate'];
        $recordId = $openRecord['id'];

        $summary = self::summary($date);

        $pdo->beginTransaction();
        try {
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
                'id' => $recordId,
            ]);

            self::resetDayState($pdo, $date);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $nextDate = $payload['next_date'] ?? date('Y-m-d', strtotime($date . ' +1 day'));

        return [
            'closure' => null,
            'summary' => self::summary($nextDate),
            'summaryDate' => $nextDate,
            'nextDate' => $nextDate,
            'previousClosure' => self::latestClosed(),
        ];
    }

    // สรุปยอดขายตั๋วและ F&B ในวันที่กำหนด
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

    // ค้นหา record ตามวันที่
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

    // แปลงฟิลด์ฐานข้อมูลให้เป็น key camelCase ที่ frontend ใช้งาน
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

    // ดึงยอดขายตั๋วรวมในวันนั้น
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

    // ดึงยอดขาย F&B ในวันนั้น
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

    // หลังปิดวันให้ปรับสถานะสำคัญให้จบงานอัตโนมัติ
    private static function resetDayState(PDO $pdo, string $date): void
    {
        $pdo->prepare(
            'UPDATE TABLE_RESERVATION
             SET status = CASE
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
             SET status = "confirmed"
             WHERE status <> "confirmed"
               AND id IN (
                   SELECT DISTINCT toi.order_id
                   FROM TICKET_ORDER_ITEM toi
                   INNER JOIN EVENTS e ON e.id = toi.event_id
                   WHERE e.ends_at IS NOT NULL
                     AND e.ends_at <= CONCAT(:date, " 23:59:59")
               )'
        )->execute(['date' => $date]);
    }

    private static function fetchIds(PDO $pdo, string $sql, array $params = []): array
    {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // หา record ที่ยัง status = open เพื่อตรวจสอบว่าปัจจุบันเปิดวันอยู่หรือไม่
    public static function current(): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query(
            'SELECT *
             FROM DAY_CLOSURE
             WHERE status = "open"
             ORDER BY closure_date DESC
             LIMIT 1'
        );
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return self::transform($row);
        }

        return null;
    }

    // สร้าง pivot TABLE_RESERVATION_TABLE (ใช้ผูกหลายโต๊ะต่อหนึ่งการจอง)
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

    // คืนวันล่าสุดที่ปิดสำเร็จ
    public static function latestClosed(): ?array
    {
        $stmt = Database::connection()->query(
            'SELECT *
             FROM DAY_CLOSURE
             WHERE status = "closed"
             ORDER BY closure_date DESC
             LIMIT 1'
        );
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? self::transform($row) : null;
    }
}
