<?php

namespace Tests\Unit\Support;

use App\Support\NotificationKeys;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class NotificationKeysTest extends TestCase
{
    public function test_same_event_maps_to_same_key(): void
    {
        $this->assertSame(
            NotificationKeys::bookingConfirmed('b1'),
            NotificationKeys::bookingConfirmed('b1')
        );
        $this->assertSame(
            'REFUND_UPDATED:re_1',
            NotificationKeys::refundUpdated('re_1')
        );
    }

    public function test_different_events_map_to_different_keys(): void
    {
        $this->assertNotSame(
            NotificationKeys::bookingConfirmed('b1'),
            NotificationKeys::bookingConfirmed('b2')
        );
        $this->assertNotSame(
            NotificationKeys::paymentFailed('pi_1', 'evt_1'),
            NotificationKeys::paymentFailed('pi_1', 'evt_2')
        );
        $this->assertNotSame(
            NotificationKeys::checkinReminder('b1', new DateTimeImmutable('2026-10-10')),
            NotificationKeys::checkinReminder('b1', new DateTimeImmutable('2026-10-11'))
        );
    }

    public function test_retry_backoff_schedule(): void
    {
        $this->assertSame(0, NotificationKeys::nextRetryDelayMs(0));
        $this->assertSame(60_000, NotificationKeys::nextRetryDelayMs(1));
        $this->assertSame(300_000, NotificationKeys::nextRetryDelayMs(2));
        $this->assertSame(900_000, NotificationKeys::nextRetryDelayMs(3));
        $this->assertSame(3_600_000, NotificationKeys::nextRetryDelayMs(4));
        $this->assertNull(NotificationKeys::nextRetryDelayMs(5));
        $this->assertNull(NotificationKeys::nextRetryDelayMs(-1));
        $this->assertSame(5, NotificationKeys::MAX_ATTEMPTS);
    }

    public function test_sold_out_key_uses_utc_day_keys(): void
    {
        $this->assertSame(
            'ADMIN_SOLD_OUT:2026-10-10:2026-10-12',
            NotificationKeys::soldOut('2026-10-10', '2026-10-12')
        );
    }
}
