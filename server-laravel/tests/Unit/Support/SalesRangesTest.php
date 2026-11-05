<?php

namespace Tests\Unit\Support;

use App\Support\SalesRanges;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class SalesRangesTest extends TestCase
{
    private DateTimeImmutable $now;

    protected function setUp(): void
    {
        $this->now = new DateTimeImmutable('2026-10-03T14:00:00Z');
    }

    public function test_today_spans_the_utc_day(): void
    {
        [$from, $to] = SalesRanges::bounds('today', $this->now);

        $this->assertSame('2026-10-03T00:00:00.000Z', $from->format('Y-m-d\TH:i:s.v\Z'));
        $this->assertSame('2026-10-03T23:59:59.999Z', $to->format('Y-m-d\TH:i:s.v\Z'));
    }

    public function test_week_spans_seven_days_ending_now(): void
    {
        [$from, $to] = SalesRanges::bounds('week', $this->now);

        $this->assertSame('2026-09-27T00:00:00.000Z', $from->format('Y-m-d\TH:i:s.v\Z'));
        $this->assertSame($this->now->getTimestamp(), $to->getTimestamp());
    }

    public function test_month_spans_thirty_days_ending_now(): void
    {
        [$from, $to] = SalesRanges::bounds('month', $this->now);

        $this->assertSame('2026-09-04T00:00:00.000Z', $from->format('Y-m-d\TH:i:s.v\Z'));
        $this->assertSame($this->now->getTimestamp(), $to->getTimestamp());
    }
}
