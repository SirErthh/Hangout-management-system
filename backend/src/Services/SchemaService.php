<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\Config;
use PDO;
use PDOException;

final class SchemaService
{
    // เรียกฟังก์ชันย่อยต่างๆ เพื่ออัปเดต schema ให้เป็นปัจจุบัน
    public static function migrate(): void
    {
        $pdo = Database::connection();

        self::ensureRoles($pdo);
        self::ensureEventsColumns($pdo);
        self::ensureTicketCodeTable($pdo);
        self::ensureMenuColumns($pdo);
        self::ensureFnbOrderColumns($pdo);
        self::ensureTicketOrderColumns($pdo);
        self::ensureReservationSupport($pdo);
        self::ensureReservationStatusLogEnums($pdo);
        self::ensureReservationStatusEnum($pdo);
        self::ensureCheckInColumns($pdo);
        self::ensurePerformanceIndexes($pdo);
        self::seedDefaultData($pdo);
    }

    // เพิ่มคอลัมน์ที่จำเป็นในตาราง CHECK_IN
    private static function ensureCheckInColumns(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $columnExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );

        $columns = [
            'ticket_code_id' => 'ALTER TABLE CHECK_IN ADD COLUMN ticket_code_id BIGINT NULL',
            'ticket_code' => 'ALTER TABLE CHECK_IN ADD COLUMN ticket_code VARCHAR(64) NULL',
            'event_id' => 'ALTER TABLE CHECK_IN ADD COLUMN event_id BIGINT NULL',
            'customer_id' => 'ALTER TABLE CHECK_IN ADD COLUMN customer_id BIGINT NULL',
            'staff_id' => 'ALTER TABLE CHECK_IN ADD COLUMN staff_id BIGINT NULL',
            'note' => 'ALTER TABLE CHECK_IN ADD COLUMN note VARCHAR(255) NULL',
            'order_id' => 'ALTER TABLE CHECK_IN ADD COLUMN order_id BIGINT NULL',
        ];

        foreach ($columns as $column => $sql) {
            $columnExists->execute([
                'schema' => $schema,
                'table' => 'CHECK_IN',
                'column' => $column,
            ]);

            if ((int)$columnExists->fetchColumn() === 0) {
                $pdo->exec($sql);
            }
        }
    }

    // เพิ่มค่า enum สถานะ completed ให้ตาราง TABLE_RESERVATION
    private static function ensureReservationStatusEnum(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $stmt = $pdo->prepare(
            'SELECT COLUMN_TYPE
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = :schema
               AND TABLE_NAME = "TABLE_RESERVATION"
               AND COLUMN_NAME = "status"
             LIMIT 1'
        );
        $stmt->execute(['schema' => $schema]);
        $columnType = $stmt->fetchColumn();
        if ($columnType !== false && str_contains(strtolower((string)$columnType), "'completed'")) {
            return;
        }

        $pdo->exec(
            "ALTER TABLE TABLE_RESERVATION
             MODIFY status ENUM('pending','confirmed','seated','no_show','canceled','completed')
             CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
        );
    }

    // อัปเดต enum ในตาราง RESERVATIONSTATUSLOG ให้รองรับ completed เช่นกัน
    private static function ensureReservationStatusLogEnums(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        foreach (['old_status', 'new_status'] as $column) {
            $stmt = $pdo->prepare(
                'SELECT COLUMN_TYPE
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = :schema
                   AND TABLE_NAME = "RESERVATIONSTATUSLOG"
                   AND COLUMN_NAME = :column
                 LIMIT 1'
            );
            $stmt->execute([
                'schema' => $schema,
                'column' => $column,
            ]);
            $columnType = $stmt->fetchColumn();
            if ($columnType !== false && str_contains(strtolower((string)$columnType), "'completed'")) {
                continue;
            }

            $pdo->exec(
                "ALTER TABLE RESERVATIONSTATUSLOG
                 MODIFY {$column} ENUM('pending','confirmed','seated','no_show','canceled','completed')
                 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
            );
        }
    }

    // ลบคอลัมน์ payment_note เก่าออกจาก TICKETS_ORDER หากยังหลงเหลือ
    private static function ensureTicketOrderColumns(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $columnExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );

        $columnExists->execute([
            'schema' => $schema,
            'table' => 'TICKETS_ORDER',
            'column' => 'payment_note',
        ]);

        if ((int)$columnExists->fetchColumn() > 0) {
            $pdo->exec('ALTER TABLE TICKETS_ORDER DROP COLUMN payment_note');
        }
    }

    // ลบคอลัมน์ payment_note จาก FNB_ORDER
    private static function ensureFnbOrderColumns(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $columnExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );

        $columnExists->execute([
            'schema' => $schema,
            'table' => 'FNB_ORDER',
            'column' => 'payment_note',
        ]);

        if ((int)$columnExists->fetchColumn() > 0) {
            $pdo->exec('ALTER TABLE FNB_ORDER DROP COLUMN payment_note');
        }
    }

    // สร้าง role พื้นฐาน admin/staff/customer หากยังไม่มี
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

    // เพิ่มคอลัมน์ ticket_code_prefix และ max_capacity ให้ EVENTS
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

    // สร้างตาราง TICKET_CODE สำหรับเก็บโค้ดบัตรถ้ายังไม่มี
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

    // เพิ่มคอลัมน์ description ให้ MENU_ITEM
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

    // เพิ่มคอลัมน์/constraint/index ที่ใช้รองรับการจับจองโต๊ะ
    private static function ensureReservationSupport(PDO $pdo): void
    {
        $schema = Config::get('database.database');
        $columnExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );

        $columns = [
            'assigned_table_id' => 'ALTER TABLE TABLE_RESERVATION ADD COLUMN assigned_table_id BIGINT NULL',
            'ticket_order_id' => 'ALTER TABLE TABLE_RESERVATION ADD COLUMN ticket_order_id BIGINT NULL',
            'is_placeholder' => 'ALTER TABLE TABLE_RESERVATION ADD COLUMN is_placeholder TINYINT(1) NOT NULL DEFAULT 0',
            'hold_expires_at' => 'ALTER TABLE TABLE_RESERVATION ADD COLUMN hold_expires_at DATETIME NULL',
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

        $ticketFkExists = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND CONSTRAINT_NAME = :constraint'
        );
        $ticketFkExists->execute([
            'schema' => $schema,
            'table' => 'TABLE_RESERVATION',
            'constraint' => 'fk_table_reservation_ticket_order',
        ]);

        if ((int)$ticketFkExists->fetchColumn() === 0) {
            $pdo->exec(
                'ALTER TABLE TABLE_RESERVATION
                    ADD CONSTRAINT fk_table_reservation_ticket_order
                    FOREIGN KEY (ticket_order_id) REFERENCES TICKETS_ORDER(id)
                    ON DELETE SET NULL ON UPDATE RESTRICT'
            );
        }

        $indexes = [
            'idx_res_ticket_order' => 'CREATE INDEX idx_res_ticket_order ON TABLE_RESERVATION(ticket_order_id)',
            'idx_res_hold_expires' => 'CREATE INDEX idx_res_hold_expires ON TABLE_RESERVATION(hold_expires_at)',
        ];

        foreach ($indexes as $index => $sql) {
            $indexExists = $pdo->prepare(
                'SELECT COUNT(*)
                 FROM INFORMATION_SCHEMA.STATISTICS
                 WHERE TABLE_SCHEMA = :schema
                   AND TABLE_NAME = :table
                   AND INDEX_NAME = :index'
            );
            $indexExists->execute([
                'schema' => $schema,
                'table' => 'TABLE_RESERVATION',
                'index' => $index,
            ]);
            if ((int)$indexExists->fetchColumn() === 0) {
                $pdo->exec($sql);
            }
        }
    }

    // เติมข้อมูลเริ่มต้น เช่น admin/table/menu
    private static function seedDefaultData(PDO $pdo): void
    {
        self::seedAdmin($pdo);
        self::seedTables($pdo);
        self::seedMenu($pdo);
    }

    // ถ้ายังไม่มี admin ให้สร้างพร้อมผูก role
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

    // default table data
    private static function seedTables(PDO $pdo): void
    {
        $tables = [
            ['table_name' => 'T1', 'capacity' => 2],
            ['table_name' => 'T2', 'capacity' => 4],
            ['table_name' => 'T3', 'capacity' => 4],
            ['table_name' => 'T4', 'capacity' => 6],
            ['table_name' => 'T5', 'capacity' => 2],
            ['table_name' => 'T6', 'capacity' => 8],
            ['table_name' => 'T7', 'capacity' => 2],
            ['table_name' => 'T8', 'capacity' => 2],
            ['table_name' => 'T9', 'capacity' => 2],
            ['table_name' => 'T10', 'capacity' => 2],
            ['table_name' => 'T11', 'capacity' => 2],
            ['table_name' => 'T12', 'capacity' => 3],
            ['table_name' => 'T13', 'capacity' => 3],
            ['table_name' => 'T14', 'capacity' => 3],
            ['table_name' => 'T15', 'capacity' => 3],
            ['table_name' => 'T16', 'capacity' => 3],
            ['table_name' => 'T17', 'capacity' => 4],
            ['table_name' => 'T18', 'capacity' => 4],
            ['table_name' => 'T19', 'capacity' => 4],
            ['table_name' => 'T20', 'capacity' => 4],
            ['table_name' => 'T21', 'capacity' => 4],
            ['table_name' => 'T22', 'capacity' => 4],
            ['table_name' => 'T23', 'capacity' => 5],
            ['table_name' => 'T24', 'capacity' => 5],
            ['table_name' => 'T25', 'capacity' => 5],
            ['table_name' => 'T26', 'capacity' => 5],
            ['table_name' => 'T27', 'capacity' => 5],
        ];

        $existsStmt = $pdo->prepare('SELECT id FROM VENUETABLE WHERE table_name = :name LIMIT 1');
        $insertStmt = $pdo->prepare(
            'INSERT INTO VENUETABLE (table_name, capacity, is_active) VALUES (:name, :capacity, :active)'
        );

        foreach ($tables as $table) {
            $existsStmt->execute(['name' => $table['table_name']]);
            if ($existsStmt->fetchColumn()) {
                continue;
            }

            $insertStmt->execute([
                'name' => $table['table_name'],
                'capacity' => $table['capacity'],
                'active' => 1,
            ]);
        }
    }

    // default menu data
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

    // increase query performance by adding indexes on main tables
    private static function ensurePerformanceIndexes(PDO $pdo): void
    {
        $schema = Config::get('database.database');

        $indexes = [
            [
                'table' => 'FNB_ORDER',
                'name' => 'idx_fnb_status_created',
                'sql' => 'CREATE INDEX idx_fnb_status_created ON FNB_ORDER (status, created_at)',
            ],
            [
                'table' => 'TABLE_RESERVATION',
                'name' => 'idx_reservation_status_date',
                'sql' => 'CREATE INDEX idx_reservation_status_date ON TABLE_RESERVATION (status, reserved_date)',
            ],
            [
                'table' => 'TICKETS_ORDER',
                'name' => 'idx_ticket_status_created',
                'sql' => 'CREATE INDEX idx_ticket_status_created ON TICKETS_ORDER (status, created_at)',
            ],
        ];

        foreach ($indexes as $index) {
            self::ensureIndex($pdo, $schema, $index['table'], $index['name'], $index['sql']);
        }
    }

    // create index if not exists
    private static function ensureIndex(PDO $pdo, string $schema, string $table, string $index, string $sql): void
    {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = :schema
               AND TABLE_NAME = :table
               AND INDEX_NAME = :index'
        );
        $stmt->execute([
            'schema' => $schema,
            'table' => $table,
            'index' => $index,
        ]);

        if ((int)$stmt->fetchColumn() === 0) {
            $pdo->exec($sql);
        }
    }

}
