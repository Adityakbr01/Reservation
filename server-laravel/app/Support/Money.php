<?php

namespace App\Support;

/**
 * Centralized money math. Every amount is an integer in the currency's
 * minor unit (paise/cents). Never use floats for storage.
 */
class Money
{
    public static function percentOf(int $amount, int|float $percent): int
    {
        return (int) round(($amount * $percent) / 100);
    }

    /**
     * @param  array{type: string, value: int|float, maxDiscount?: int|null}  $discount
     */
    public static function applyDiscount(int $subtotal, array $discount): int
    {
        if ($subtotal <= 0) {
            return 0;
        }

        $raw = ($discount['type'] ?? '') === 'PERCENTAGE'
            ? self::percentOf($subtotal, $discount['value'])
            : (int) $discount['value'];

        $bounded = min($raw, $subtotal);
        $capped = array_key_exists('maxDiscount', $discount) && $discount['maxDiscount'] !== null
            ? min($bounded, (int) $discount['maxDiscount'])
            : $bounded;

        return max(0, $capped);
    }
}
