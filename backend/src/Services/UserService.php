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

    public static function all(): array
    {
        $stmt = Database::connection()->query(
            'SELECT u.id, u.fname, u.lname, u.email, u.phone, r.role_name AS role
             FROM USERS u
             LEFT JOIN USERROLES ur ON ur.user_id = u.id
             LEFT JOIN ROLES r ON r.id = ur.role_id
             ORDER BY u.id ASC'
        );

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function update(int $userId, array $data): array
    {
        $current = self::findById($userId);
        if (!$current) {
            throw new RuntimeException('User not found', 404);
        }

        $updates = [
            'fname' => array_key_exists('fname', $data) ? trim((string)$data['fname']) : $current['fname'],
            'lname' => array_key_exists('lname', $data) ? trim((string)$data['lname']) : $current['lname'],
            'email' => array_key_exists('email', $data) ? strtolower(trim((string)$data['email'])) : $current['email'],
            'phone' => array_key_exists('phone', $data) ? trim((string)$data['phone']) : ($current['phone'] ?? ''),
        ];

        if ($updates['fname'] === '' || $updates['email'] === '') {
            throw new RuntimeException('First name and email are required', 422);
        }

        if (!filter_var($updates['email'], FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Invalid email address', 422);
        }

        $existing = self::findByEmail($updates['email']);
        if ($existing && (int)$existing['id'] !== $userId) {
            throw new RuntimeException('Email already in use', 409);
        }

        $stmt = Database::connection()->prepare(
            'UPDATE USERS
             SET fname = :fname,
                 lname = :lname,
                 email = :email,
                 phone = :phone
             WHERE id = :id'
        );

        $stmt->execute([
            'id' => $userId,
            'fname' => $updates['fname'],
            'lname' => $updates['lname'],
            'email' => $updates['email'],
            'phone' => $updates['phone'],
        ]);

        return self::findById($userId) ?? [];
    }

    public static function delete(int $userId): void
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $link = $pdo->prepare('DELETE FROM USERROLES WHERE user_id = :user');
            $link->execute(['user' => $userId]);

            $delete = $pdo->prepare('DELETE FROM USERS WHERE id = :id');
            $delete->execute(['id' => $userId]);

            $pdo->commit();
        } catch (\PDOException $e) {
            $pdo->rollBack();
            throw new RuntimeException('Unable to delete user account', 409);
        }
    }
}
