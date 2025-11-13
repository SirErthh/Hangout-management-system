<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

use App\Services\Database;
use PDO;

const DEFAULT_TARGET = 10_000;
const BATCH_SIZE = 250;
const MAX_DAYS_BACK = 120;

$target = isset($argv[1]) ? max(1, (int)$argv[1]) : DEFAULT_TARGET;

$pdo = Database::connection();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$users = fetchColumn($pdo, 'SELECT id FROM USERS ORDER BY id ASC');
$tables = fetchColumn($pdo, 'SELECT id FROM VENUETABLE WHERE is_active = 1 ORDER BY id ASC');
$menuItems = fetchMenuItems($pdo);

if (empty($users)) {
    fwrite(STDERR, "✗ No USERS rows found. Seed users first.\n");
    exit(1);
}

if (empty($tables)) {
    fwrite(STDERR, "✗ No active VENUETABLE rows found. Seed tables first.\n");
    exit(1);
}

if (empty($menuItems)) {
    fwrite(STDERR, "✗ No MENU_ITEM rows found. Seed menu items first.\n");
    exit(1);
}

$orderStmt = $pdo->prepare(
    'INSERT INTO FNB_ORDER (user_id, venue_table_id, status, created_at, note, total_baht, payment_method, paid_by_user_id, paid_at)
     VALUES (:user_id, :table_id, :status, :created_at, :note, :total, :payment_method, :paid_by, :paid_at)'
);

$itemStmt = $pdo->prepare(
    'INSERT INTO FNB_ORDER_ITEM (order_id, menu_item_id, quantity, unit_price_baht, line_total_baht, status, remark)
     VALUES (:order_id, :menu_id, :quantity, :price, :line_total, :status, :remark)'
);

$statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
$notes = [
    null,
    'VIP guest, expedite service',
    'Allergic to peanuts',
    'Birthday celebration',
    'Needs split bill',
    'Prefers less spicy',
];

$inserted = 0;
$batch = 0;

while ($inserted < $target) {
    $pdo->beginTransaction();
    $batch = 0;

    while ($batch < BATCH_SIZE && $inserted < $target) {
        $userId = randomValue($users);
        $tableId = randomValue($tables);
        $status = randomValue($statuses);
        $createdAt = randomPastDate(MAX_DAYS_BACK);
        $note = randomValue($notes);

        $items = buildItems($menuItems);
        $total = array_reduce($items, static fn($carry, $item) => $carry + $item['line_total'], 0.0);

        $paidAt = $status === 'completed'
            ? (new DateTimeImmutable($createdAt))->modify(sprintf('+%d minutes', random_int(5, 60)))->format('Y-m-d H:i:s')
            : null;

        $orderStmt->execute([
            'user_id' => $userId,
            'table_id' => $tableId,
            'status' => $status,
            'created_at' => $createdAt,
            'note' => $note,
            'total' => $total,
            'payment_method' => 'cash',
            'paid_by' => $status === 'completed' ? $userId : null,
            'paid_at' => $paidAt,
        ]);

        $orderId = (int)$pdo->lastInsertId();

        foreach ($items as $item) {
            $itemStmt->execute([
                'order_id' => $orderId,
                'menu_id' => $item['menu_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'line_total' => $item['line_total'],
                'status' => 'ordered',
                'remark' => $item['remark'],
            ]);
        }

        $inserted++;
        $batch++;

        if ($inserted % 500 === 0) {
            printf("… %d orders inserted\n", $inserted);
        }
    }

    $pdo->commit();
}

printf("✓ Inserted %d FNB orders with items.\n", $inserted);

function fetchColumn(PDO $pdo, string $sql): array
{
    $stmt = $pdo->query($sql);
    return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

function fetchMenuItems(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT id, price FROM MENU_ITEM WHERE is_active = 1 ORDER BY id ASC');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map(static fn(array $row) => [
        'id' => (int)$row['id'],
        'price' => (float)$row['price'],
    ], $rows);
}

function randomValue(array $pool)
{
    return $pool[random_int(0, count($pool) - 1)];
}

function randomPastDate(int $maxDaysBack): string
{
    $days = random_int(0, $maxDaysBack);
    $minutes = random_int(0, 23 * 60);
    $date = (new DateTimeImmutable('now'))->modify(sprintf('-%d days', $days))->modify(sprintf('-%d minutes', $minutes));
    return $date->format('Y-m-d H:i:s');
}

function buildItems(array $menuItems): array
{
    $itemCount = random_int(1, min(5, count($menuItems)));
    $pickedIndexes = [];
    while (count($pickedIndexes) < $itemCount) {
        $idx = random_int(0, count($menuItems) - 1);
        $pickedIndexes[$idx] = true;
    }

    $remarks = [null, null, 'no ice', 'extra spicy', 'shareable'];
    $items = [];

    foreach (array_keys($pickedIndexes) as $idx) {
        $menu = $menuItems[$idx];
        $quantity = random_int(1, 4);
        $price = $menu['price'];
        $line = $price * $quantity;

        $items[] = [
            'menu_id' => $menu['id'],
            'quantity' => $quantity,
            'price' => $price,
            'line_total' => $line,
            'remark' => randomValue($remarks),
        ];
    }

    return $items;
}
