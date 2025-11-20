<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Support\Config;
use App\Support\Request;
use RuntimeException;

final class UploadController
{
    private const MAX_FILE_BYTES = 2097152; // 2MB

    private const MIME_MAP = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/webp' => 'webp',
    ];

    // อัพโหลดรูปภาพจาก data URL
    public function store(Request $request): array
    {
        $user = $request->user();
        if (!$user || !in_array($user['role'], ['admin', 'staff'], true)) {
            throw new RuntimeException('Forbidden', 403);
        }

        $dataUrl = (string)($request->input('dataUrl') ?? $request->input('data_url') ?? '');
        if ($dataUrl === '') {
            throw new RuntimeException('Image payload is required', 422);
        }

        if (!preg_match('/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i', $dataUrl, $matches)) {
            throw new RuntimeException('Invalid image payload', 422);
        }

        $mime = strtolower($matches[1]);
        $base64Data = $matches[2];
        $extension = self::MIME_MAP[$mime] ?? null;
        if ($extension === null) {
            throw new RuntimeException('Unsupported image type', 422);
        }

        $binary = base64_decode($base64Data, true);
        if ($binary === false) {
            throw new RuntimeException('Failed to decode image data', 422);
        }

        if (strlen($binary) > self::MAX_FILE_BYTES) {
            throw new RuntimeException('Image exceeds maximum size of 512KB', 422);
        }

        $uploadDir = BASE_PATH . '/public/uploads';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            throw new RuntimeException('Failed to prepare upload directory', 500);
        }

        $filename = bin2hex(random_bytes(8)) . '.' . $extension;
        $filePath = $uploadDir . '/' . $filename;

        if (file_put_contents($filePath, $binary) === false) {
            throw new RuntimeException('Failed to store uploaded image', 500);
        }

        $relativePath = '/uploads/' . $filename;
        $baseUrl = rtrim((string)Config::get('app.url'), '/');

        return [
            'path' => $relativePath,
            'url' => $baseUrl . $relativePath,
        ];
    }
}
