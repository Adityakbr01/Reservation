<?php

namespace Tests\Unit\Support;

use App\Support\StayDates;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class StayDatesTest extends TestCase
{
    public function test_normalizes_to_utc_midnight(): void
    {
        $this->assertSame(
            '2026-10-12T00:00:00.000000Z',
            StayDates::toUtcMidnight('2026-10-12T18:30:00+05:30')->format('Y-m-d\TH:i:s.u\Z')
        );
    }

    public function test_builds_day_keys_utc_safe(): void
    {
        $this->assertSame('2026-10-12', StayDates::toDayKey('2026-10-12T23:59:59Z'));
        $this->assertSame('2026-10-12', StayDates::toDayKey(new DateTimeImmutable('2026-10-12T23:59:59Z')));
    }

    public function test_occupied_day_keys_are_checkout_exclusive(): void
    {
        $this->assertSame(
            ['2026-10-10', '2026-10-11'],
            StayDates::occupiedDayKeys('2026-10-10', '2026-10-12')
        );
    }

    public function test_calendar_day_keys_match_node_examples(): void
    {
        $this->assertSame(
            ['2026-11-10', '2026-11-11'],
            StayDates::occupiedDayKeys('2026-11-10', '2026-11-12')
        );
        $this->assertSame(['2026-11-10'], StayDates::occupiedDayKeys('2026-11-10', '2026-11-11'));
    }

    public function test_counts_nights_with_exclusive_checkout(): void
    {
        $this->assertSame(2, StayDates::countNights('2026-10-10', '2026-10-12'));
        $this->assertSame(5, StayDates::countNights('2026-10-10', '2026-10-15'));
        $this->assertSame(0, StayDates::countNights('2026-10-12', '2026-10-10'));
    }

    public function test_handles_offset_timestamps_without_timezone_drift(): void
    {
        $this->assertSame(
            ['2026-10-10'],
            StayDates::occupiedDayKeys('2026-10-10T04:00:00+05:30', '2026-10-11T04:00:00+05:30')
        );
    }
}
