<?php

declare(strict_types=1);

namespace App\Services;

use DateTimeImmutable;
use PDO;
use RuntimeException;

final class EventService
{
    public static function all(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, title, artist, status, cover_img, description, ticket_price, starts_at, ends_at, ticket_code_prefix, max_capacity
             FROM EVENTS
             ORDER BY starts_at ASC'
        );

        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn(array $event) => self::transform($event), $events);
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, title, artist, status, cover_img, description, ticket_price, starts_at, ends_at, ticket_code_prefix, max_capacity
             FROM EVENTS
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        return $event ? self::transform($event) : null;
    }

    public static function create(array $data): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO EVENTS (title, artist, status, cover_img, description, ticket_price, capacity_mode, capacity_fixed, starts_at, ends_at, ticket_code_prefix, max_capacity)
             VALUES (:title, :artist, :status, :cover_img, :description, :ticket_price, :capacity_mode, :capacity_fixed, :starts_at, :ends_at, :ticket_code_prefix, :max_capacity)'
        );

        $stmt->execute([
            'title' => $data['name'],
            'artist' => $data['artist'] ?? 'Resident DJ',
            'status' => $data['status'] ?? 'published',
            'cover_img' => $data['image_url'] ?? '',
            'description' => $data['description'] ?? '',
            'ticket_price' => $data['price'],
            'capacity_mode' => 'fixed',
            'capacity_fixed' => $data['capacity'] ?? 0,
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
            'ticket_code_prefix' => strtoupper(substr($data['ticket_code_prefix'] ?? 'HAN', 0, 3)),
            'max_capacity' => $data['capacity'] ?? 0,
        ]);

        $id = (int)$pdo->lastInsertId();

        return self::find($id) ?? [];
    }

    public static function update(int $id, array $data): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'UPDATE EVENTS
             SET title = :title,
                 artist = :artist,
                 status = :status,
                 cover_img = :cover_img,
                 description = :description,
                 ticket_price = :ticket_price,
                 starts_at = :starts_at,
                 ends_at = :ends_at,
                 ticket_code_prefix = :ticket_code_prefix,
                 max_capacity = :max_capacity
             WHERE id = :id'
        );

        $stmt->execute([
            'id' => $id,
            'title' => $data['name'],
            'artist' => $data['artist'] ?? 'Resident DJ',
            'status' => $data['status'] ?? 'published',
            'cover_img' => $data['image_url'] ?? '',
            'description' => $data['description'] ?? '',
            'ticket_price' => $data['price'],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
            'ticket_code_prefix' => strtoupper(substr($data['ticket_code_prefix'] ?? 'HAN', 0, 3)),
            'max_capacity' => $data['capacity'] ?? 0,
        ]);

        return self::find($id) ?? [];
    }

    public static function delete(int $id): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM EVENTS WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    private static function transform(array $row): array
    {
        $startsAt = $row['starts_at'] ? (new DateTimeImmutable($row['starts_at'])) : null;

        return [
            'id' => (int)$row['id'],
            'name' => $row['title'],
            'artist' => $row['artist'],
            'status' => $row['status'],
            'image_url' => $row['cover_img'],
            'description' => $row['description'],
            'price' => (float)$row['ticket_price'],
            'date' => $startsAt ? $startsAt->format('Y-m-d') : null,
            'starts_at' => $row['starts_at'],
            'ends_at' => $row['ends_at'],
            'ticketCodePrefix' => $row['ticket_code_prefix'] ?: 'HAN',
            'max_capacity' => $row['max_capacity'],
        ];
    }
}
