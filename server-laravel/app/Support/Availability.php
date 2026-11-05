<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;

class Availability
{
    private static function toTime(DateTimeInterface|string $value): int
    {
        if ($value instanceof DateTimeInterface) {
            return $value->getTimestamp();
        }

        return (int) strtotime($value);
    }

    /**
     * Authoritative overlap rule: checkout is exclusive.
     * overlap <=> existingCheckIn < requestedCheckOut && existingCheckOut > requestedCheckIn
     *
     * @param  array{checkIn: DateTimeInterface|string, checkOut: DateTimeInterface|string}  $existing
     * @param  array{checkIn: DateTimeInterface|string, checkOut: DateTimeInterface|string}  $requested
     */
    public static function isOverlappingStay(array $existing, array $requested): bool
    {
        $existingIn = self::toTime($existing['checkIn']);
        $existingOut = self::toTime($existing['checkOut']);
        $requestedIn = self::toTime($requested['checkIn']);
        $requestedOut = self::toTime($requested['checkOut']);

        return $existingIn < $requestedOut && $existingOut > $requestedIn;
    }

    /** Valid when checkout is after check-in and the stay has not ended. */
    public static function isValidStayRange(
        DateTimeInterface|string $checkIn,
        DateTimeInterface|string $checkOut,
        ?DateTimeImmutable $now = null
    ): bool {
        $start = self::toTime($checkIn);
        $end = self::toTime($checkOut);
        if ($start === 0 || $end === 0) {
            return false;
        }

        $now ??= new DateTimeImmutable;

        return $start < $end && $end > $now->getTimestamp();
    }
}
