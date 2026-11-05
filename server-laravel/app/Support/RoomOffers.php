<?php

namespace App\Support;

use NumberFormatter;

class RoomOffers
{
    /**
     * Badge text for the clickable offer badge (docs: room offers).
     */
    public static function offerBadgeLabel(string $discountType, int $discountValue, string $currency): string
    {
        if ($discountType === 'PERCENTAGE') {
            return $discountValue . '% OFF';
        }

        return 'SAVE ' . self::formatMinor($discountValue, $currency);
    }

    public static function formatMinor(int $minor, string $currency): string
    {
        $fractionDigits = $minor % 100 === 0 ? 0 : 2;
        $formatter = new NumberFormatter('en_GB', NumberFormatter::CURRENCY);
        $formatter->setAttribute(NumberFormatter::MAX_FRACTION_DIGITS, $fractionDigits);
        $formatter->setAttribute(NumberFormatter::MIN_FRACTION_DIGITS, $fractionDigits);
        $formatted = $formatter->formatCurrency($minor / 100, $currency);

        return $formatted !== false
            ? $formatted
            : number_format($minor / 100, 2) . ' ' . $currency;
    }
}
