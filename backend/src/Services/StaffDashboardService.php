<?php

declare(strict_types=1);

namespace App\Services;

final class StaffDashboardService
{
    public static function summary(?string $date = null): array
    {
        $pdo = Database::connection();
        $targetDate = $date ?? date('Y-m-d');

        $ticketsStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(toi.quantity), 0) AS total
             FROM TICKET_ORDER_ITEM toi
             INNER JOIN EVENTS e ON e.id = toi.event_id
             WHERE DATE(e.starts_at) = :date'
        );
        $ticketsStmt->execute(['date' => $targetDate]);
        $ticketsToday = (int)$ticketsStmt->fetchColumn();

        $reservationsStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM TABLE_RESERVATION WHERE DATE(reserved_date) = :date'
        );
        $reservationsStmt->execute(['date' => $targetDate]);
        $reservationsToday = (int)$reservationsStmt->fetchColumn();

        $fnbStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM FNB_ORDER WHERE DATE(created_at) = :date'
        );
        $fnbStmt->execute(['date' => $targetDate]);
        $fnbOrdersToday = (int)$fnbStmt->fetchColumn();

        $guestsStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(partysize), 0) AS guests
             FROM TABLE_RESERVATION
             WHERE DATE(reserved_date) = :date
               AND status IN ("confirmed","seated")'
        );
        $guestsStmt->execute(['date' => $targetDate]);
        $guestsToday = (int)$guestsStmt->fetchColumn();

        return [
            'date' => $targetDate,
            'ticketsToday' => $ticketsToday,
            'reservationsToday' => $reservationsToday,
            'fnbOrdersToday' => $fnbOrdersToday,
            'guestsToday' => $guestsToday,
        ];
    }
}
