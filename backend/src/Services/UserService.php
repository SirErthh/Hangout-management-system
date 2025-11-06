<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class UserService
{
    public static function findByEmail(string $email): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT u.id, u.fname, u.lname, u.email, u.phone, u.pass, r.role_name AS role
             FROM USERS u
             LEFT JOIN USERROLES ur ON ur.user_id = u.id
             LEFT JOIN ROLES r ON r.id = ur.role_id
             WHERE u.email = :email
             LIMIT 1'
        );
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function findById(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT u.id, u.fname, u.lname, u.email, u.phone, r.role_name AS role
             FROM USERS u
             LEFT JOIN USERROLES ur ON ur.user_id = u.id
             LEFT JOIN ROLES r ON r.id = ur.role_id
             WHERE u.id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function create(array $data, string $roleName = 'customer'): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        $insert = $pdo->prepare(
            'INSERT INTO USERS (fname, lname, email, phone, pass)
             VALUES (:fname, :lname, :email, :phone, :pass)'
        );
        $insert->execute([
            'fname' => $data['fname'],
            'lname' => $data['lname'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'pass' => password_hash($data['password'], PASSWORD_BCRYPT),
        ]);
        $userId = (int)$pdo->lastInsertId();

        $roleStmt = $pdo->prepare('SELECT id FROM ROLES WHERE role_name = :role LIMIT 1');
        $roleStmt->execute(['role' => $roleName]);
        $roleId = $roleStmt->fetchColumn();
        if (!$roleId) {
            $pdo->rollBack();
            throw new RuntimeException('Role not found');
        }

        $link = $pdo->prepare('INSERT INTO USERROLES (user_id, role_id) VALUES (:user, :role)');
        $link->execute([
            'user' => $userId,
            'role' => $roleId,
        ]);

        $pdo->commit();

        return self::findById($userId) ?? [];
    }

    public static function assignRole(int $userId, string $roleName): void
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        $roleStmt = $pdo->prepare('SELECT id FROM ROLES WHERE role_name = :role LIMIT 1');
        $roleStmt->execute(['role' => $roleName]);
        $roleId = $roleStmt->fetchColumn();
        if (!$roleId) {
            $pdo->rollBack();
            throw new RuntimeException('Role not found');
        }

        $delete = $pdo->prepare('DELETE FROM USERROLES WHERE user_id = :user');
        $delete->execute(['user' => $userId]);

        $link = $pdo->prepare('INSERT INTO USERROLES (user_id, role_id) VALUES (:user, :role)');
        $link->execute(['user' => $userId, 'role' => $roleId]);

        $pdo->commit();
    }

    public static function upgradePassword(int $userId, string $plainPassword): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE USERS SET pass = :pass WHERE id = :id'
        );
        $stmt->execute([
            'id' => $userId,
            'pass' => password_hash($plainPassword, PASSWORD_BCRYPT),
        ]);
    }
}
