<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

class NotificationKeys
{
    public const TYPES = [
        'BOOKING_RECEIVED',
        'BOOKING_CONFIRMED',
        'PAYMENT_FAILED',
        'BOOKING_CANCELLED',
        'REFUND_UPDATED',
        'CHECKIN_REMINDER',
        'CHECKED_IN',
        'CHECKED_OUT',
        'ADMIN_NEW_BOOKING',
        'ADMIN_PAYMENT_FAILURE',
        'ADMIN_CANCELLATION',
        'ADMIN_SOLD_OUT',
    ];

    public const STATUSES = ['QUEUED', 'PROCESSING', 'SENT', 'FAILED'];

    public const RETRY_DELAYS_MS = [0, 60_000, 300_000, 900_000, 3_600_000];

    public const MAX_ATTEMPTS = 5;

    public static function nextRetryDelayMs(int $attempt): ?int
    {
        if ($attempt < 0 || $attempt >= count(self::RETRY_DELAYS_MS)) {
            return null;
        }

        return self::RETRY_DELAYS_MS[$attempt];
    }

    public static function idempotencyKeyFor(string $type, string|int ...$parts): string
    {
        return implode(':', array_merge([$type], $parts));
    }

    public static function bookingReceived(string $bookingId): string
    {
        return self::idempotencyKeyFor('BOOKING_RECEIVED', $bookingId);
    }

    public static function bookingConfirmed(string $bookingId): string
    {
        return self::idempotencyKeyFor('BOOKING_CONFIRMED', $bookingId);
    }

    public static function paymentFailed(string $paymentIntentId, string $eventId): string
    {
        return self::idempotencyKeyFor('PAYMENT_FAILED', $paymentIntentId, $eventId);
    }

    public static function bookingCancelled(string $bookingId): string
    {
        return self::idempotencyKeyFor('BOOKING_CANCELLED', $bookingId);
    }

    public static function refundUpdated(string $providerRefundId): string
    {
        return self::idempotencyKeyFor('REFUND_UPDATED', $providerRefundId);
    }

    public static function checkinReminder(string $bookingId, DateTimeInterface $checkIn): string
    {
        return self::idempotencyKeyFor('CHECKIN_REMINDER', $bookingId, self::dayKey($checkIn));
    }

    public static function checkedIn(string $bookingId): string
    {
        return self::idempotencyKeyFor('CHECKED_IN', $bookingId);
    }

    public static function checkedOut(string $bookingId): string
    {
        return self::idempotencyKeyFor('CHECKED_OUT', $bookingId);
    }

    public static function adminNewBooking(string $bookingId): string
    {
        return self::idempotencyKeyFor('ADMIN_NEW_BOOKING', $bookingId);
    }

    public static function adminPaymentFailure(string $paymentIntentId, string $eventId): string
    {
        return self::idempotencyKeyFor('ADMIN_PAYMENT_FAILURE', $paymentIntentId, $eventId);
    }

    public static function adminCancellation(string $bookingId): string
    {
        return self::idempotencyKeyFor('ADMIN_CANCELLATION', $bookingId);
    }

    public static function soldOut(DateTimeInterface|string $checkIn, DateTimeInterface|string $checkOut): string
    {
        return self::idempotencyKeyFor(
            'ADMIN_SOLD_OUT',
            self::dayKey(self::toDate($checkIn)),
            self::dayKey(self::toDate($checkOut))
        );
    }

    private static function dayKey(DateTimeInterface $date): string
    {
        return DateTimeImmutable::createFromInterface($date)
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d');
    }

    private static function toDate(DateTimeInterface|string $value): DateTimeInterface
    {
        return $value instanceof DateTimeInterface ? $value : new DateTimeImmutable($value);
    }
}
