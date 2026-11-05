<?php

namespace Tests\Unit\Support;

use App\Support\BookingRules;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class BookingRulesTest extends TestCase
{
    private function booking(array $overrides = []): array
    {
        return array_replace([
            'id' => 'b1',
            'bookingNumber' => 'QB-TEST01',
            'status' => 'CONFIRMED',
            'paymentStatus' => 'PAID',
            'checkIn' => '2026-10-10T00:00:00Z',
            'checkOut' => '2026-10-12T00:00:00Z',
            'contact' => [
                'firstName' => 'Neha',
                'lastName' => 'K',
                'email' => 'n@example.com',
                'phone' => '+91',
            ],
            'pricing' => [
                'currency' => 'INR',
                'total' => 300000,
            ],
        ], $overrides);
    }

    public function test_confirmed_paid_due_date_passes(): void
    {
        $now = new DateTimeImmutable('2026-10-10T12:00:00Z');

        $this->assertNull(BookingRules::checkInBlockReason($this->booking(), $now));
    }

    public function test_non_confirmed_statuses_are_blocked(): void
    {
        $now = new DateTimeImmutable('2026-10-10T12:00:00Z');
        foreach (['HELD', 'PAYMENT_PENDING', 'CANCELLED', 'EXPIRED', 'CHECKED_IN'] as $status) {
            $this->assertNotNull(BookingRules::checkInBlockReason($this->booking(['status' => $status]), $now));
        }
    }

    public function test_unpaid_bookings_are_blocked(): void
    {
        $now = new DateTimeImmutable('2026-10-10T12:00:00Z');

        $this->assertNotNull(
            BookingRules::checkInBlockReason($this->booking(['paymentStatus' => 'PENDING']), $now)
        );
    }

    public function test_early_arrival_is_blocked_until_check_in_day(): void
    {
        $early = new DateTimeImmutable('2026-10-09T23:59:59Z');

        $this->assertStringContainsString(
            'day',
            (string) BookingRules::checkInBlockReason($this->booking(), $early)
        );
    }

    public function test_missing_guest_email_is_blocked(): void
    {
        $now = new DateTimeImmutable('2026-10-10T12:00:00Z');
        $booking = $this->booking();
        $booking['contact']['email'] = '';

        $this->assertNotNull(BookingRules::checkInBlockReason($booking, $now));
    }

    public function test_only_checked_in_bookings_can_check_out(): void
    {
        $this->assertNull(BookingRules::checkOutBlockReason($this->booking(['status' => 'CHECKED_IN'])));
        $this->assertNotNull(BookingRules::checkOutBlockReason($this->booking(['status' => 'CONFIRMED'])));
        $this->assertNotNull(BookingRules::checkOutBlockReason($this->booking(['status' => 'CHECKED_OUT'])));
    }

    public function test_expire_hold_only_when_past_expiry(): void
    {
        $expires = new DateTimeImmutable('2026-10-10T12:00:00Z');
        $now = new DateTimeImmutable('2026-10-10T12:00:01Z');

        $this->assertTrue(BookingRules::shouldExpireHold('HELD', $expires, $now));
        $this->assertFalse(BookingRules::shouldExpireHold('HELD', $expires, new DateTimeImmutable('2026-10-10T11:59:59Z')));
        $this->assertFalse(BookingRules::shouldExpireHold('CONFIRMED', $expires, $now));
        $this->assertFalse(BookingRules::shouldExpireHold('HELD', null, $now));
    }

    public function test_generated_booking_numbers_use_the_safe_alphabet(): void
    {
        $number = BookingRules::generateBookingNumber();

        $this->assertMatchesRegularExpression('/^QB-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/', $number);
    }
}
