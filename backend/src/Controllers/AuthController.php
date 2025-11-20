<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\AuthService;
use App\Services\UserService;
use App\Support\Request;
use RuntimeException;

final class AuthController
{
    // register สมาชิกใหม่และคืน token
    public function register(Request $request): array
    {
        $payload = $request->all();

        $fname = trim((string)($payload['fname'] ?? ''));
        $lname = trim((string)($payload['lname'] ?? ''));
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $password = (string)($payload['password'] ?? '');
        $phone = trim((string)($payload['phone'] ?? ''));

        if ($fname === '' || $email === '' || $password === '' || $phone === '') {
            throw new RuntimeException('Missing required fields', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Invalid email address', 422);
        }

        if (strlen($password) < 4) {
            throw new RuntimeException('Password must be at least 4 characters', 422);
        }

        if (UserService::findByEmail($email)) {
            throw new RuntimeException('Email already registered', 409);
        }

        $user = UserService::create([
            'fname' => $fname,
            'lname' => $lname,
            'email' => $email,
            'password' => $password,
            'phone' => $phone,
        ]);

        $token = AuthService::generateToken($user);

        return [
            'token' => $token,
            'user' => $user,
        ];
    }

    // ล็อกอินด้วย email และรหัสผ่านและออก token
    public function login(Request $request): array
    {
        $payload = $request->all();
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $password = (string)($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            throw new RuntimeException('Invalid credentials', 401);
        }

        $user = UserService::findByEmail($email);
        $valid = false;
        if ($user) {
            $hash = $user['pass'];
            if (password_verify($password, $hash)) {
                $valid = true;
            } elseif ($hash === $password) {
                $valid = true;
                UserService::upgradePassword((int)$user['id'], $password);
                $user = UserService::findByEmail($email);
            }
        }

        if (!$user || !$valid) {
            throw new RuntimeException('Invalid email or password', 401);
        }

        $token = AuthService::generateToken($user);

        unset($user['pass']);

        return [
            'token' => $token,
            'user' => $user,
        ];
    }

    // Endpoint เช็ค session ปัจจุบัน
    public function me(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            throw new RuntimeException('Unauthenticated', 401);
        }

        return ['user' => $user];
    }
}
