<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;

class StayDates
{
    public static function toUtcMidnight(DateTimeInterface|string $input): DateTimeImmutable
    {
        if (is_string($input)) {
            $day = substr($input, 0, 10);
            return new DateTimeImmutable($day . 'T00:00:00.000000Z');
        }

        return new DateTimeImmutable($input->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d') . 'T00:00:00.000000Z');
    }

    public static function toDayKey(DateTimeInterface|string $date): string
    {
        if (is_string($date)) {
            return substr($date, 0, 10);
        }

        return $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d');
    }

    /**
     * Every night in [checkIn, checkOut). Checkout day is exclusive, UTC-safe.
     *
     * @return array<int, string>
     */
    public static function occupiedDayKeys(DateTimeInterface|string $checkIn, DateTimeInterface|string $checkOut): array
    {
        $start = self::toUtcMidnight($checkIn);
        $end = self::toUtcMidnight($checkOut);
        $keys = [];

        $cursor = $start;
        while ($cursor->getTimestamp() < $end->getTimestamp()) {
            $keys[] = self::toDayKey($cursor);
            $cursor = $cursor->modify('+1 day');
            if (count($keys) > 366) {
                break;
            }
        }

        return $keys;
    }

    public static function countNights(DateTimeInterface|string $checkIn, DateTimeInterface|string $checkOut): int
    {
        $start = self::toUtcMidnight($checkIn);
        $end = self::toUtcMidnight($checkOut);
        $diff = (int) floor(($end->getTimestamp() - $start->getTimestamp()) / 86400);

        return max(0, $diff);
    }
}
