<?php

namespace App\Support;

use Illuminate\Http\Request;

class Audit
{
    public const ACTIONS = [
        'BOOKING_CREATED',
        'BOOKING_CANCELLED',
        'BOOKING_CHECKED_IN',
        'BOOKING_CHECKED_OUT',
        'PAYMENT_REFUNDED',
        'CMS_PUBLISHED',
        'SETTINGS_UPDATED',
    ];

    /**
     * Actor + network context for audit rows.
     *
     * @return array{actorId: ?string, actorRole: ?string, ip: ?string, userAgent: ?string}
     */
    public static function contextFrom(Request $request): array
    {
        $user = $request->attributes->get('auth_user') ?? $request->user();
        $forwarded = $request->headers->get('x-forwarded-for');
        $ip = $forwarded
            ? trim(explode(',', $forwarded)[0])
            : ($request->ip() ?? $request->server('REMOTE_ADDR'));

        $ua = $request->headers->get('user-agent');

        return [
            'actorId' => $user?->id ?? null,
            'actorRole' => $user?->role ?? null,
            'ip' => $ip ?: null,
            'userAgent' => $ua !== null ? substr($ua, 0, 300) : null,
        ];
    }

    /**
     * Curated booking snapshot for audit rows — statuses and money only.
     *
     * @param  array<string, mixed>  $booking  camelCase or snake_case
     * @return array{bookingNumber: mixed, status: mixed, paymentStatus: mixed, total: mixed, currency: mixed}
     */
    public static function bookingSnapshot(array $booking): array
    {
        $pricing = $booking['pricing'] ?? [];

        return [
            'bookingNumber' => $booking['bookingNumber'] ?? $booking['booking_number'] ?? null,
            'status' => $booking['status'] ?? null,
            'paymentStatus' => $booking['paymentStatus'] ?? $booking['payment_status'] ?? null,
            'total' => $pricing['total'] ?? null,
            'currency' => $pricing['currency'] ?? null,
        ];
    }
}
