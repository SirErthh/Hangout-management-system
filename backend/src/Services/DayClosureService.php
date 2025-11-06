<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class DayClosureService
{
    public static function getToday(): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM DAY_CLOSURE WHERE closure_date = CURDATE() LIMIT 1'
        );
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? self::transform($row) : null;
    }

    public static function store(array $data): array
    {
        $pdo = Database::connection();
        $existing = self::getToday();
        if ($existing) {
            throw new RuntimeException('Day closure already submitted', 409);
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
                CURDATE(),
                :opened_at,
                :closed_at,
                :status,
                :ticket_sales,
                :fnb_sales,
                :promptpay,
                :note
            )'
        );

        $stmt->execute([
            'opened_at' => $data['opened_at'] ?? date('Y-m-d 10:00:00'),
            'closed_at' => $data['closed_at'] ?? date('Y-m-d H:i:s'),
            'status' => 'closed',
            'ticket_sales' => $data['ticket_sales_baht'],
            'fnb_sales' => $data['fnb_sales_baht'],
            'promptpay' => $data['promptpay_amount_baht'],
            'note' => $data['note'] ?? null,
        ]);

        return self::getToday() ?? [];
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
}
