<?php

namespace App\Services;

use App\Models\Coupon;

class CouponService
{
    public function validate(string $code, float $subtotal): array
    {
        $now = now();
        $coupon = Coupon::where('normalized_code', strtoupper($code))
            ->where('status', 'ACTIVE')
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_from')->orWhere('valid_from', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', $now);
            })
            ->first();

        if (!$coupon) {
            return ['valid' => false, 'reason' => 'COUPON_INVALID'];
        }

        if ($coupon->usage_limit && $coupon->usage_count >= $coupon->usage_limit) {
            return ['valid' => false, 'reason' => 'COUPON_LIMIT_REACHED'];
        }

        $discount = $coupon->discount_type === 'PERCENTAGE'
            ? min($subtotal * ($coupon->discount_value / 100), $coupon->max_discount ?? $subtotal)
            : min($coupon->discount_value, $subtotal);

        return [
            'valid' => true,
            'coupon_id' => $coupon->id,
            'discount' => round($discount, 2),
        ];
    }
}
