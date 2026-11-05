<?php

namespace Tests\Unit\Support;

use App\Support\Availability;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class AvailabilityTest extends TestCase
{
    private const EXISTING = ['checkIn' => '2026-01-10', 'checkOut' => '2026-01-15'];

    public function test_detects_a_contained_overlap(): void
    {
        $this->assertTrue(Availability::isOverlappingStay(
            self::EXISTING,
            ['checkIn' => '2026-01-12', 'checkOut' => '2026-01-13']
        ));
    }

    public function test_detects_a_single_night_edge_overlap(): void
    {
        $this->assertTrue(Availability::isOverlappingStay(
            self::EXISTING,
            ['checkIn' => '2026-01-14', 'checkOut' => '2026-01-16']
        ));
    }

    public function test_treats_checkout_as_exclusive(): void
    {
        $this->assertFalse(Availability::isOverlappingStay(
            self::EXISTING,
            ['checkIn' => '2026-01-15', 'checkOut' => '2026-01-18']
        ));
        $this->assertFalse(Availability::isOverlappingStay(
            ['checkIn' => '2026-01-05', 'checkOut' => '2026-01-10'],
            self::EXISTING
        ));
    }

    public function test_rejects_checkout_on_or_before_check_in(): void
    {
        $this->assertFalse(Availability::isValidStayRange('2026-01-12', '2026-01-12'));
        $this->assertFalse(Availability::isValidStayRange('2026-01-13', '2026-01-12'));
    }

    public function test_rejects_stays_that_already_ended(): void
    {
        $this->assertFalse(Availability::isValidStayRange('2020-01-10', '2020-01-12'));
    }

    public function test_rejects_unparseable_dates(): void
    {
        $this->assertFalse(Availability::isValidStayRange('not-a-date', '2026-01-12'));
    }

    public function test_accepts_a_future_stay(): void
    {
        $this->assertTrue(
            Availability::isValidStayRange('2099-01-10', '2099-01-12', new DateTimeImmutable('2026-01-01T00:00:00Z'))
        );
    }
}
