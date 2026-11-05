<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;

class PolicyEvaluator
{
    public const FALLBACK_POLICY = [
        'name' => 'Standard flexible (approved default)',
        'freeCancellationHours' => 24,
        'refundPercentage' => 100,
    ];

    /**
     * Pure cancellation evaluation (docs 06 §35).
     *
     * @param  array{
     *     status: string,
     *     checkIn: DateTimeInterface,
     *     checkOut: DateTimeInterface,
     *     paidTotal: int,
     *     policy: array{name?: ?string, freeCancellationHours?: ?int, refundPercentage?: ?int}|null,
     *     now?: DateTimeInterface
     * }  $input
     * @return array{isCancellable: bool, refundAmount: int, refundPercentage: int, reason: string, policyName: string}
     */
    public static function evaluateCancellation(array $input): array
    {
        $status = $input['status'];
        $checkIn = $input['checkIn'];
        $checkOut = $input['checkOut'];
        $paidTotal = (int) $input['paidTotal'];
        $policy = $input['policy'] ?? null;
        $now = $input['now'] ?? new DateTimeImmutable;
        $policyName = $policy['name'] ?? self::FALLBACK_POLICY['name'];

        if (! in_array($status, ['HELD', 'PAYMENT_PENDING', 'CONFIRMED'], true)) {
            return self::result(false, 0, 0, 'Booking cannot be cancelled in its current state', $policyName);
        }

        if ($now->getTimestamp() >= $checkOut->getTimestamp()) {
            return self::result(false, 0, 0, 'Stay has already ended', $policyName);
        }

        if ($paidTotal <= 0) {
            return self::result(true, 0, 0, 'No payment captured — nothing to refund', $policyName);
        }

        $freeHours = $policy['freeCancellationHours'] ?? self::FALLBACK_POLICY['freeCancellationHours'];
        $pct = $policy['refundPercentage'] ?? self::FALLBACK_POLICY['refundPercentage'];
        $cutoff = $checkIn->getTimestamp() - ((int) $freeHours * 3600);

        if ($now->getTimestamp() <= $cutoff) {
            return self::result(
                true,
                (int) round(($paidTotal * $pct) / 100),
                (int) $pct,
                "Free cancellation until {$freeHours}h before check-in",
                $policyName
            );
        }

        return self::result(true, 0, 0, 'Outside the free-cancellation window — no refund', $policyName);
    }

    /**
     * @return array{isCancellable: bool, refundAmount: int, refundPercentage: int, reason: string, policyName: string}
     */
    private static function result(bool $isCancellable, int $refundAmount, int $refundPercentage, string $reason, string $policyName): array
    {
        return [
            'isCancellable' => $isCancellable,
            'refundAmount' => $refundAmount,
            'refundPercentage' => $refundPercentage,
            'reason' => $reason,
            'policyName' => $policyName,
        ];
    }
}
