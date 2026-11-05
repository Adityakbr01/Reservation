<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;

class PlanRules
{
    public static function computeNights(DateTimeInterface $checkIn, DateTimeInterface $checkOut): int
    {
        return (int) round(($checkOut->getTimestamp() - $checkIn->getTimestamp()) / 86400);
    }

    /**
     * Decides whether a rate plan can price a stay.
     *
     * @param  array{status?: string, restrictions?: array<string, mixed>}  $plan
     */
    public static function isPlanApplicable(
        array $plan,
        DateTimeInterface $checkIn,
        DateTimeInterface $checkOut,
        int $nights
    ): bool {
        if (($plan['status'] ?? null) !== 'ACTIVE') {
            return false;
        }

        $r = $plan['restrictions'] ?? [];
        $validFrom = self::toDate($r['validFrom'] ?? null);
        $validUntil = self::toDate($r['validUntil'] ?? null);
        $minNights = $r['minNights'] ?? null;
        $maxNights = $r['maxNights'] ?? null;

        if ($validFrom !== null && $validFrom->getTimestamp() > $checkOut->getTimestamp()) {
            return false;
        }
        if ($validUntil !== null && $validUntil->getTimestamp() < $checkIn->getTimestamp()) {
            return false;
        }
        if ($minNights !== null && $nights < $minNights) {
            return false;
        }
        if ($maxNights !== null && $nights > $maxNights) {
            return false;
        }

        return true;
    }

    private static function toDate(mixed $value): ?DateTimeImmutable
    {
        if ($value === null) {
            return null;
        }
        if ($value instanceof DateTimeInterface) {
            return DateTimeImmutable::createFromInterface($value);
        }

        return new DateTimeImmutable((string) $value);
    }
}
