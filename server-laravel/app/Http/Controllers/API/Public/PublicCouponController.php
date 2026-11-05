<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Coupons\ValidateCouponRequest;
use App\Models\Coupon;

class PublicCouponController extends Controller
{
    public function validate(ValidateCouponRequest $request)
    {
        $data = $request->validated();
        $now = now();

        $coupon = Coupon::where('normalized_code', strtoupper($data['code']))
            ->where('status', 'ACTIVE')
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_from')
                    ->orWhere('valid_from', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_until')
                    ->orWhere('valid_until', '>=', $now);
            })
            ->first();

        if (!$coupon) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COUPON_INVALID', 'message' => 'Coupon is invalid or expired'],
            ], 422);
        }

        if ($coupon->usage_limit && $coupon->usage_count >= $coupon->usage_limit) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COUPON_LIMIT_REACHED', 'message' => 'Coupon usage limit reached'],
            ], 422);
        }

        if ($data['subtotal'] < ($coupon->minimum_booking_amount ?? 0)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'MINIMUM_NOT_MET', 'message' => 'Minimum booking amount not met'],
            ], 422);
        }

        $discount = $coupon->discount_type === 'PERCENTAGE'
            ? min($data['subtotal'] * ($coupon->discount_value / 100), $coupon->max_discount ?? $data['subtotal'])
            : min($coupon->discount_value, $data['subtotal']);

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $coupon->code,
                'discount_type' => $coupon->discount_type,
                'discount_value' => $coupon->discount_value,
                'discount' => round($discount, 2),
                'max_discount' => $coupon->max_discount,
            ],
        ]);
    }
}
