<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\Config;
use RuntimeException;

final class AuthService
{
    public static function generateToken(array $user): string
    {
        $secret = Config::get('auth.token_secret');
        $ttl = Config::get('auth.token_ttl_minutes');
        $now = time();

        $payload = [
            'iss' => Config::get('app.url'),
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + ($ttl * 60),
            'sub' => $user['id'],
            'role' => $user['role'],
        ];

        return self::encode($payload, $secret);
    }

    public static function decodeToken(string $token): array
    {
        $secret = Config::get('auth.token_secret');

        $payload = self::decode($token, $secret);

        return [
            'id' => $payload['sub'],
            'role' => $payload['role'],
        ];
    }

    private static function encode(array $payload, string $secret): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];

        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, $secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    private static function decode(string $token, string $secret): array
    {
        $segments = explode('.', $token);
        if (count($segments) !== 3) {
            throw new RuntimeException('Malformed token', 401);
        }

        [$header64, $payload64, $signature64] = $segments;
        $header = json_decode(self::base64UrlDecode($header64), true);
        $payload = json_decode(self::base64UrlDecode($payload64), true);
        $signature = self::base64UrlDecode($signature64);

        if (!is_array($header) || !is_array($payload)) {
            throw new RuntimeException('Malformed token', 401);
        }

        $expected = hash_hmac('sha256', $header64 . '.' . $payload64, $secret, true);
        if (!hash_equals($expected, $signature)) {
            throw new RuntimeException('Invalid signature', 401);
        }

        if (isset($payload['exp']) && time() >= $payload['exp']) {
            throw new RuntimeException('Token expired', 401);
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $padding = strlen($data) % 4;
        if ($padding > 0) {
            $data .= str_repeat('=', 4 - $padding);
        }
        $decoded = base64_decode(strtr($data, '-_', '+/'), true);
        if ($decoded === false) {
            throw new RuntimeException('Invalid token payload', 401);
        }
        return $decoded;
    }
}
