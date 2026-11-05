<?php

namespace Tests\Unit\Support;

use App\Support\PlanRules;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class PlanRulesTest extends TestCase
{
    private function plan(string $status = 'ACTIVE', array $restrictions = []): array
    {
        return [
            'status' => $status,
            'restrictions' => array_replace([
                'minNights' => null,
                'maxNights' => null,
                'minAdvanceDays' => null,
                'maxAdvanceDays' => null,
                'validFrom' => null,
                'validUntil' => null,
                'daysOfWeek' => [],
            ], $restrictions),
        ];
    }

    public function test_counts_exclusive_checkout_nights(): void
    {
        $this->assertSame(2, PlanRules::computeNights(
            new DateTimeImmutable('2026-11-10'),
            new DateTimeImmutable('2026-11-12')
        ));
        $this->assertSame(5, PlanRules::computeNights(
            new DateTimeImmutable('2026-11-10'),
            new DateTimeImmutable('2026-11-15')
        ));
    }

    public function test_accepts_unrestricted_active_plan(): void
    {
        $this->assertTrue(PlanRules::isPlanApplicable(
            $this->plan(),
            new DateTimeImmutable('2026-11-10'),
            new DateTimeImmutable('2026-11-12'),
            2
        ));
    }

    public function test_rejects_inactive_plans(): void
    {
        $this->assertFalse(PlanRules::isPlanApplicable(
            $this->plan('INACTIVE'),
            new DateTimeImmutable('2026-11-10'),
            new DateTimeImmutable('2026-11-12'),
            2
        ));
    }

    public function test_enforces_validity_window_overlapping_the_stay(): void
    {
        $checkIn = new DateTimeImmutable('2026-11-10');
        $checkOut = new DateTimeImmutable('2026-11-12');

        $this->assertFalse(PlanRules::isPlanApplicable(
            $this->plan('ACTIVE', ['validUntil' => new DateTimeImmutable('2026-11-01')]),
            $checkIn,
            $checkOut,
            2
        ));
        $this->assertFalse(PlanRules::isPlanApplicable(
            $this->plan('ACTIVE', ['validFrom' => new DateTimeImmutable('2026-12-01')]),
            $checkIn,
            $checkOut,
            2
        ));
    }

    public function test_enforces_min_and_max_nights(): void
    {
        $checkIn = new DateTimeImmutable('2026-11-10');
        $checkOut = new DateTimeImmutable('2026-11-12');

        $this->assertFalse(PlanRules::isPlanApplicable($this->plan('ACTIVE', ['minNights' => 3]), $checkIn, $checkOut, 2));
        $this->assertFalse(PlanRules::isPlanApplicable($this->plan('ACTIVE', ['maxNights' => 1]), $checkIn, $checkOut, 2));
        $this->assertTrue(PlanRules::isPlanApplicable(
            $this->plan('ACTIVE', ['minNights' => 2, 'maxNights' => 2]),
            $checkIn,
            $checkOut,
            2
        ));
    }
}
