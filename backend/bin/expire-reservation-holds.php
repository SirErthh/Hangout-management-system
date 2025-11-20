#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\ReservationService;

require __DIR__ . '/../bootstrap.php';

// สคริปต์ cron สำหรับยกเลิก hold ที่หมดเวลา
$count = ReservationService::expireHolds();
echo sprintf("Expired %d reservation hold(s).\n", $count);
