<?php

declare(strict_types=1);

namespace App\Services;

final class AdminDashboardService
{
    // ดึงข้อมูลสรุปสำหรับแอดมิน dashboard
    public static function summary(): array
    {
        $pdo = Database::connection();

        $totalUsers = (int)$pdo->query('SELECT COUNT(*) FROM USERS')->fetchColumn();

        $activeEventsStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM EVENTS
             WHERE status = "published"
               AND (ends_at IS NULL OR ends_at >= NOW())'
        );
        $activeEventsStmt->execute();
        $activeEvents = (int)$activeEventsStmt->fetchColumn();

        $ticketRevenue = (float)$pdo->query('SELECT COALESCE(SUM(total_baht), 0) FROM TICKETS_ORDER')->fetchColumn();
        $fnbRevenue = (float)$pdo->query('SELECT COALESCE(SUM(total_baht), 0) FROM FNB_ORDER')->fetchColumn();
        $totalRevenue = $ticketRevenue + $fnbRevenue;

        $staffStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM USERROLES ur
             INNER JOIN ROLES r ON r.id = ur.role_id
             WHERE r.role_name = "staff"'
        );
        $staffStmt->execute();
        $staffCount = (int)$staffStmt->fetchColumn();

        return [
            'totalUsers' => $totalUsers,
            'activeEvents' => $activeEvents,
            'totalRevenue' => $totalRevenue,
            'staffCount' => $staffCount,
            'ticketRevenue' => $ticketRevenue,
            'fnbRevenue' => $fnbRevenue,
        ];
    }
}
