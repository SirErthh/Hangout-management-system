<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\Config;
use PDO;
use PDOException;

final class SchemaService
{
    public static function migrate(): void
    {
        $pdo = Database::connection();

        self::ensureRoles($pdo);
        self::ensureEventsColumns($pdo);
        self::ensureTicketCodeTable($pdo);
        self::ensureMenuColumns($pdo);
        self::ensureReservationSupport($pdo);
        self::seedDefaultData($pdo);
    }

    private static function ensureRoles(PDO $pdo): void
    {
        $roles = ['admin', 'staff', 'customer'];
        $stmt = $pdo->prepare('SELECT role_name FROM ROLES WHERE role_name = :role LIMIT 1');
        $insert = $pdo->prepare('INSERT INTO ROLES (role_name) VALUES (:role)');

        foreach ($roles as $role) {
            $stmt->execute(['role' => $role]);
            if (!$stmt->fetchColumn()) {
                $insert->execute(['role' => $role]);
            }
        }
    }

    private static function ensureEventsColumns(PDO $pdo): void
    {
        $columnExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );
        $schema = Config::get('database.database');

        $columns = [
            'ticket_code_prefix' => 'ALTER TABLE EVENTS ADD COLUMN ticket_code_prefix VARCHAR(10) NULL',
            'max_capacity' => "ALTER TABLE EVENTS ADD COLUMN max_capacity INT NULL",
        ];

        foreach ($columns as $column => $sql) {
            $columnExists->execute([
                'schema' => $schema,
                'table' => 'EVENTS',
                'column' => $column,
            ]);
            if ((int)$columnExists->fetchColumn() === 0) {
                $pdo->exec($sql);
            }
        }
    }

    private static function ensureTicketCodeTable(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $exists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table'
        );
        $exists->execute([
            'schema' => $schema,
            'table' => 'TICKET_CODE',
        ]);

        if ((int)$exists->fetchColumn() === 0) {
            $pdo->exec(
                'CREATE TABLE TICKET_CODE (
                    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    order_item_id BIGINT NOT NULL,
                    code VARCHAR(64) NOT NULL,
                    status ENUM("issued","confirmed","cancelled") NOT NULL DEFAULT "issued",
                    confirmed_at DATETIME NULL,
                    UNIQUE KEY uq_code (code),
                    KEY fk_ticket_code_item (order_item_id),
                    CONSTRAINT fk_ticket_code_item FOREIGN KEY (order_item_id) REFERENCES TICKET_ORDER_ITEM(id) ON DELETE CASCADE ON UPDATE RESTRICT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
        }
    }

    private static function ensureMenuColumns(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $columnExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );

        $columns = [
            'description' => 'ALTER TABLE MENU_ITEM ADD COLUMN description TEXT NULL',
        ];

        foreach ($columns as $column => $sql) {
            $columnExists->execute([
                'schema' => $schema,
                'table' => 'MENU_ITEM',
                'column' => $column,
            ]);
            if ((int)$columnExists->fetchColumn() === 0) {
                $pdo->exec($sql);
            }
        }
    }

    private static function ensureReservationSupport(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $columnExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );

        $columns = [
            'assigned_table_id' => 'ALTER TABLE TABLE_RESERVATION ADD COLUMN assigned_table_id BIGINT NULL',
        ];

        foreach ($columns as $column => $sql) {
            $columnExists->execute([
                'schema' => $schema,
                'table' => 'TABLE_RESERVATION',
                'column' => $column,
            ]);
            if ((int)$columnExists->fetchColumn() === 0) {
                $pdo->exec($sql);
            }
        }

        $constraintExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND CONSTRAINT_NAME = :constraint'
        );
        $constraintExists->execute([
            'schema' => $schema,
            'table' => 'TABLE_RESERVATION',
            'constraint' => 'fk_table_reservation_assigned_table',
        ]);

        if ((int)$constraintExists->fetchColumn() === 0) {
            $pdo->exec(
                'ALTER TABLE TABLE_RESERVATION
                    ADD CONSTRAINT fk_table_reservation_assigned_table
                    FOREIGN KEY (assigned_table_id) REFERENCES VENUETABLE(id)
                    ON DELETE SET NULL ON UPDATE RESTRICT'
            );
        }
    }

    private static function seedDefaultData(PDO $pdo): void
    {
        self::seedAdmin($pdo);
        self::seedTables($pdo);
        self::seedEvents($pdo);
        self::seedMenu($pdo);
    }

    private static function seedAdmin(PDO $pdo): void
    {
        $pdo->beginTransaction();

        $userStmt = $pdo->prepare('SELECT id FROM USERS WHERE email = :email LIMIT 1');
        $userStmt->execute(['email' => 'admin@hangout.local']);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $insert = $pdo->prepare(
                'INSERT INTO USERS (fname, lname, email, phone, pass) VALUES (:fname, :lname, :email, :phone, :pass)'
            );
            $insert->execute([
                'fname' => 'Admin',
                'lname' => 'User',
                'email' => 'admin@hangout.local',
                'phone' => '0900000000',
                'pass' => password_hash('1234', PASSWORD_BCRYPT),
            ]);
            $userId = (int)$pdo->lastInsertId();
        } else {
            $userId = (int)$user['id'];
        }

        $roleStmt = $pdo->prepare('SELECT id FROM ROLES WHERE role_name = :role LIMIT 1');
        $roleStmt->execute(['role' => 'admin']);
        $roleId = (int)$roleStmt->fetchColumn();

        $linkStmt = $pdo->prepare('SELECT id FROM USERROLES WHERE user_id = :user AND role_id = :role LIMIT 1');
        $linkStmt->execute(['user' => $userId, 'role' => $roleId]);
        if (!$linkStmt->fetchColumn()) {
            $insertLink = $pdo->prepare('INSERT INTO USERROLES (user_id, role_id) VALUES (:user, :role)');
            $insertLink->execute(['user' => $userId, 'role' => $roleId]);
        }

        $pdo->commit();
    }

    private static function seedTables(PDO $pdo): void
    {
        $count = (int)$pdo->query('SELECT COUNT(*) FROM VENUETABLE')->fetchColumn();
        if ($count > 0) {
            return;
        }

        $tables = [
            ['table_name' => 'T1', 'capacity' => 2],
            ['table_name' => 'T2', 'capacity' => 4],
            ['table_name' => 'T3', 'capacity' => 4],
            ['table_name' => 'T4', 'capacity' => 6],
            ['table_name' => 'T5', 'capacity' => 2],
            ['table_name' => 'T6', 'capacity' => 8],
        ];

        $stmt = $pdo->prepare(
            'INSERT INTO VENUETABLE (table_name, capacity, is_active) VALUES (:name, :capacity, :active)'
        );
        foreach ($tables as $table) {
            $stmt->execute([
                'name' => $table['table_name'],
                'capacity' => $table['capacity'],
                'active' => 1,
            ]);
        }
    }

    private static function seedEvents(PDO $pdo): void
    {
        $count = (int)$pdo->query('SELECT COUNT(*) FROM EVENTS')->fetchColumn();
        if ($count > 0) {
            return;
        }

        $events = [
            [
                'title' => 'Jazz Night',
                'artist' => 'The Groove Ensemble',
                'cover_img' => '🎷',
                'description' => 'Live jazz performance with guest artists.',
                'ticket_price' => 500.00,
                'starts_at' => date('Y-m-d H:i:s', strtotime('+7 days 20:00')),
                'ends_at' => date('Y-m-d H:i:s', strtotime('+7 days 23:00')),
                'prefix' => 'JAZ',
            ],
            [
                'title' => 'EDM Party',
                'artist' => 'DJ Nova',
                'cover_img' => '🎧',
                'description' => 'Electronic dance music festival.',
                'ticket_price' => 800.00,
                'starts_at' => date('Y-m-d H:i:s', strtotime('+14 days 21:00')),
                'ends_at' => date('Y-m-d H:i:s', strtotime('+15 days 02:00')),
                'prefix' => 'EDM',
            ],
        ];

        $stmt = $pdo->prepare(
            'INSERT INTO EVENTS (title, artist, status, cover_img, description, ticket_price, capacity_mode, capacity_fixed, starts_at, ends_at, ticket_code_prefix, max_capacity)
            VALUES (:title, :artist, :status, :cover_img, :description, :ticket_price, :capacity_mode, :capacity_fixed, :starts_at, :ends_at, :prefix, :max_capacity)'
        );

        foreach ($events as $event) {
            $stmt->execute([
                'title' => $event['title'],
                'artist' => $event['artist'],
                'status' => 'published',
                'cover_img' => $event['cover_img'],
                'description' => $event['description'],
                'ticket_price' => $event['ticket_price'],
                'capacity_mode' => 'fixed',
                'capacity_fixed' => 250,
                'starts_at' => $event['starts_at'],
                'ends_at' => $event['ends_at'],
                'prefix' => $event['prefix'],
                'max_capacity' => 250,
            ]);
        }
    }

    private static function seedMenu(PDO $pdo): void
    {
        $count = (int)$pdo->query('SELECT COUNT(*) FROM MENU_ITEM')->fetchColumn();
        if ($count > 0) {
            return;
        }

        $items = [
            [
                'name' => 'Signature Burger',
                'type' => 'food',
                'price' => 280.00,
                'image_url' => '🍔',
                'description' => 'Angus beef, special sauce, lettuce, cheese',
            ],
            [
                'name' => 'Truffle Pasta',
                'type' => 'food',
                'price' => 320.00,
                'image_url' => '🍝',
                'description' => 'Creamy truffle sauce with mushrooms',
            ],
            [
                'name' => 'Mojito',
                'type' => 'drink',
                'price' => 220.00,
                'image_url' => '🍹',
                'description' => 'Rum, mint, lime, soda',
            ],
            [
                'name' => 'Craft Beer',
                'type' => 'drink',
                'price' => 180.00,
                'image_url' => '🍺',
                'description' => 'Local IPA on tap',
            ],
        ];

        $stmt = $pdo->prepare(
            'INSERT INTO MENU_ITEM (name, type, price, image_url, is_active, description) VALUES (:name, :type, :price, :image, :active, :description)'
        );

        foreach ($items as $item) {
            $stmt->execute([
                'name' => $item['name'],
                'type' => $item['type'],
                'price' => $item['price'],
                'image' => $item['image_url'],
                'active' => 1,
                'description' => $item['description'],
            ]);
        }
    }
}
