<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\MenuService;
use App\Services\FnbService;
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

        $items = $payload['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            throw new RuntimeException('Cart is empty', 422);
        }

        $total = 0.0;
        foreach ($items as $item) {
            if (!isset($item['id'], $item['price'], $item['quantity'])) {
                throw new RuntimeException('Invalid order payload', 422);
            }
            $total += (float)$item['price'] * (int)$item['quantity'];
        }

        $order = FnbService::createOrder([
            'user_id' => $user['id'],
            'table_id' => $payload['table_id'] ?? null,
            'items' => $items,
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
