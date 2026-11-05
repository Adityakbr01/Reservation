<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

class SalesRanges
{
    /**
     * @return array{0: DateTimeImmutable, 1: DateTimeImmutable}
     */
    public static function bounds(string $range, ?DateTimeInterface $now = null): array
    {
        $current = $now instanceof DateTimeInterface
            ? DateTimeImmutable::createFromInterface($now)
            : new DateTimeImmutable;
        $current = $current->setTimezone(new DateTimeZone('UTC'));
        $from = $current->setTime(0, 0, 0);
        $to = clone $current;

        if ($range === 'today') {
            $to = $from->modify('+1 day')->modify('-1 millisecond');
        } elseif ($range === 'week') {
            $from = $from->modify('-6 days');
        } else {
            $from = $from->modify('-29 days');
        }

        return [$from, $to];
    }
}
