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
        $closure = DayClosureService::current();
        $previousClosure = DayClosureService::latestClosed();
        if ($closure) {
            $summaryDate = $closure['closureDate'];
            $nextDate = date('Y-m-d', strtotime($closure['closureDate'] . ' +1 day'));
        } else {
            $summaryDate = $previousClosure
                ? date('Y-m-d', strtotime($previousClosure['closureDate'] . ' +1 day'))
                : date('Y-m-d');
            $nextDate = $summaryDate;
        }

        return [
            'closure' => $closure,
            'summary' => DayClosureService::summary($summaryDate),
            'summaryDate' => $summaryDate,
            'previousClosure' => $previousClosure,
            'nextDate' => $nextDate,
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
