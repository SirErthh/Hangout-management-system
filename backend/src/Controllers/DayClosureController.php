<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\DayClosureService;
use App\Support\Request;
use RuntimeException;

final class DayClosureController
{
    public function show(Request $request): array
    {
        $this->ensureAdmin($request);
        $closure = DayClosureService::getToday();
        $summaryDate = date('Y-m-d');
        if ($closure) {
            if ($closure['status'] === 'open') {
                $summaryDate = $closure['closureDate'];
            } else {
                $summaryDate = date('Y-m-d', strtotime($closure['closureDate'] . ' +1 day'));
            }
        }
        return [
            'closure' => $closure,
            'summary' => DayClosureService::summary($summaryDate),
            'summaryDate' => $summaryDate,
        ];
    }

    public function store(Request $request): array
    {
        $this->ensureAdmin($request);
        return DayClosureService::store($request->all());
    }

    public function start(Request $request): array
    {
        $this->ensureAdmin($request);
        return DayClosureService::startDay($request->all());
    }

    private function ensureAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || $user['role'] !== 'admin') {
            throw new RuntimeException('Forbidden', 403);
        }
    }
}
