<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;

class BookingRules
{
    private const BOOKING_NUMBER_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public static function shouldExpireHold(string $status, ?DateTimeInterface $expiresAt, ?DateTimeInterface $now = null): bool
    {
        if ($status !== 'HELD' || $expiresAt === null) {
            return false;
        }

        $now ??= new DateTimeImmutable();

        return $expiresAt->getTimestamp() < $now->getTimestamp();
    }

    /**
     * @param  array<string, mixed>  $booking
     */
    public static function checkInBlockReason(array $booking, ?DateTimeInterface $now = null): ?string
    {
        $status = self::get($booking, 'status');
        $paymentStatus = self::get($booking, 'paymentStatus', 'payment_status');
        $checkIn = self::date(self::get($booking, 'checkIn', 'check_in'));
        $contact = self::get($booking, 'contact') ?? [];
        $now ??= new DateTimeImmutable();

        if ($status !== 'CONFIRMED') {
            return 'Only confirmed bookings can be checked in';
        }
        if ($paymentStatus !== 'PAID') {
            return 'Payment must be captured before check-in';
        }
        if (($contact['email'] ?? '') === '' || ($contact['firstName'] ?? '') === '') {
            return 'Guest details are required before check-in';
        }
        if ($checkIn === null) {
            return 'Check-in day has not arrived yet';
        }

        $checkInDay = $checkIn
            ->setTimezone(new \DateTimeZone('UTC'))
            ->setTime(0, 0, 0);
        if ($now->getTimestamp() < $checkInDay->getTimestamp()) {
            return 'Check-in day has not arrived yet';
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $booking
     */
    public static function checkOutBlockReason(array $booking): ?string
    {
        if (self::get($booking, 'status') !== 'CHECKED_IN') {
            return 'Only checked-in bookings can be checked out';
        }

        return null;
    }

    public static function generateBookingNumber(): string
    {
        $max = strlen(self::BOOKING_NUMBER_ALPHABET) - 1;
        $suffix = '';
        for ($i = 0; $i < 6; $i++) {
            $suffix .= self::BOOKING_NUMBER_ALPHABET[random_int(0, $max)];
        }

        return 'QB-' . $suffix;
    }

    /**
     * @param  array<string, mixed>  $booking
     */
    private static function get(array $booking, string $camel, ?string $snake = null): mixed
    {
        if (array_key_exists($camel, $booking)) {
            return $booking[$camel];
        }

        return $snake !== null ? ($booking[$snake] ?? null) : null;
    }

    private static function date(mixed $value): ?DateTimeImmutable
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
