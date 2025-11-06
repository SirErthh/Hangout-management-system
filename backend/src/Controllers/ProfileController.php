<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\UserService;
use App\Support\Request;
use RuntimeException;

final class ProfileController
{
    public function update(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            throw new RuntimeException('Authentication required', 401);
        }

        $payload = $request->all();

        $updated = UserService::update((int)$user['id'], [
            'fname' => $payload['fname'] ?? null,
            'lname' => $payload['lname'] ?? null,
            'email' => $payload['email'] ?? null,
            'phone' => $payload['phone'] ?? null,
        ]);

        return ['user' => $updated];
    }

    public function destroy(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            throw new RuntimeException('Authentication required', 401);
        }

        UserService::delete((int)$user['id']);

        return ['message' => 'Account deleted'];
    }
}
