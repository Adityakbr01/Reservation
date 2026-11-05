<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Coupons\CreateCouponRequest;
use App\Models\Coupon;

class AdminCouponController extends Controller
{
    public function index()
    {
        $coupons = Coupon::all();

        return response()->json([
            'success' => true,
            'data' => $coupons->map(fn ($c) => $this->couponData($c)),
        ]);
    }

    public function store(CreateCouponRequest $request)
    {
        $coupon = Coupon::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
            'normalized_code' => strtoupper($request->validated('code')),
            'usage_count' => 0,
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->couponData($coupon),
        ], 201);
    }

    public function show(string $id)
    {
        $coupon = Coupon::find($id);

        if (!$coupon) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COUPON_NOT_FOUND', 'message' => 'Coupon not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->couponData($coupon),
        ]);
    }

    public function update(string $id)
    {
        $coupon = Coupon::find($id);

        if (!$coupon) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COUPON_NOT_FOUND', 'message' => 'Coupon not found'],
            ], 404);
        }

        $coupon->update(request()->only([
            'code', 'discount_type', 'discount_value', 'max_discount',
            'minimum_booking_amount', 'valid_from', 'valid_until',
            'usage_limit', 'per_user_limit', 'applicable_room_type_ids', 'status',
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->couponData($coupon),
        ]);
    }

    private function couponData(Coupon $c): array
    {
        return [
            'id' => $c->id,
            'property_id' => $c->property_id,
            'code' => $c->code,
            'normalized_code' => $c->normalized_code,
            'discount_type' => $c->discount_type,
            'discount_value' => $c->discount_value,
            'max_discount' => $c->max_discount,
            'minimum_booking_amount' => $c->minimum_booking_amount,
            'valid_from' => $c->valid_from,
            'valid_until' => $c->valid_until,
            'usage_limit' => $c->usage_limit,
            'usage_count' => $c->usage_count,
            'per_user_limit' => $c->per_user_limit,
            'applicable_room_type_ids' => $c->applicable_room_type_ids,
            'status' => $c->status,
        ];
    }
}
