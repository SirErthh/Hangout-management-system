<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\MenuService;
use App\Services\FnbService;
use App\Services\ReservationService;
use App\Support\Request;
use RuntimeException;

final class MenuController
{
    public function index(): array
    {
        return ['items' => MenuService::all()];
    }

    public function store(Request $request): array
    {
        $this->ensureManager($request);
        $data = $this->validate($request);
        $item = MenuService::create($data);
        return ['item' => $item];
    }

    public function update(Request $request): array
    {
        $this->ensureManager($request);
        $id = (int)$request->param('id');
        $data = $this->validate($request);
        $item = MenuService::update($id, $data);
        return ['item' => $item];
    }

    public function destroy(Request $request): array
    {
        $this->ensureManager($request);
        $id = (int)$request->param('id');
        MenuService::delete($id);
        return ['message' => 'Menu item deleted'];
    }

    public function order(Request $request): array
    {
        $payload = $request->all();
        $user = $request->user();
        if (!$user) {
            throw new RuntimeException('Authentication required', 401);
        }

        if (!ReservationService::userHasConfirmedReservation((int)$user['id'])) {
            throw new RuntimeException('You need a confirmed reservation before ordering food & beverage', 422);
        }

        $activeReservation = ReservationService::latestActiveReservation((int)$user['id']);
        if (!$activeReservation) {
            throw new RuntimeException('No active reservation found for your account', 422);
        }

        $items = $payload['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            throw new RuntimeException('Cart is empty', 422);
        }

        $sanitizedItems = [];
        $total = 0.0;
        foreach ($items as $item) {
            if (!isset($item['id'], $item['quantity'])) {
                throw new RuntimeException('Invalid order payload', 422);
            }

            $menuItem = MenuService::find((int)$item['id']);
            if (!$menuItem || !$menuItem['is_active']) {
                throw new RuntimeException('Menu item is unavailable', 422);
            }

            $quantity = (int)$item['quantity'];
            if ($quantity <= 0) {
                throw new RuntimeException('Quantity must be greater than zero', 422);
            }

            $remark = null;
            if (isset($item['remark'])) {
                $trimmed = trim((string)$item['remark']);
                if ($trimmed !== '') {
                    if (mb_strlen($trimmed) > 200) {
                        throw new RuntimeException('Remark must be 200 characters or less', 422);
                    }
                    $remark = $trimmed;
                }
            }

            $sanitizedItems[] = [
                'menu_item_id' => (int)$menuItem['id'],
                'id' => (int)$menuItem['id'],
                'price' => (float)$menuItem['price'],
                'quantity' => $quantity,
                'remark' => $remark,
            ];

            $total += (float)$menuItem['price'] * $quantity;
        }

        $tableId = $payload['table_id'] ?? $activeReservation['table_id'] ?? null;
        if ($tableId === null) {
            throw new RuntimeException('Your reservation must be assigned to a table before ordering food & beverage', 422);
        }

        $order = FnbService::createOrder([
            'user_id' => $user['id'],
            'table_id' => $tableId,
            'items' => $sanitizedItems,
            'total' => $total,
            'note' => $payload['note'] ?? null,
        ]);

        return ['order' => $order];
    }

    private function validate(Request $request): array
    {
        $payload = $request->all();
        $name = trim((string)($payload['name'] ?? ''));
        $type = $payload['type'] ?? 'food';
        $price = isset($payload['price']) ? (float)$payload['price'] : null;

        if ($name === '' || $price === null) {
            throw new RuntimeException('Invalid menu payload', 422);
        }

        if (!in_array($type, ['food', 'drink'], true)) {
            throw new RuntimeException('Invalid type', 422);
        }

        return [
            'name' => $name,
            'type' => $type,
            'price' => $price,
            'image_url' => $payload['image_url'] ?? '',
            'description' => $payload['description'] ?? null,
            'is_active' => isset($payload['is_active']) ? (bool)$payload['is_active'] : true,
        ];
    }

    private function ensureManager(Request $request): void
    {
        $user = $request->user();
        if (!$user || !in_array($user['role'], ['admin', 'staff'], true)) {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
