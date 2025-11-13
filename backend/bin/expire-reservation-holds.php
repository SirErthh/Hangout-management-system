#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\ReservationService;

require __DIR__ . '/../bootstrap.php';

$count = ReservationService::expireHolds();
echo sprintf("Expired %d reservation hold(s).\n", $count);
