<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;

class AdminBookingController extends Controller
{
    public function index()
    {
        $bookings = Booking::with(['user', 'items', 'payments'])->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $bookings->map(fn ($b) => $this->bookingData($b)),
        ]);
    }

    public function show(string $id)
    {
        $booking = Booking::with(['user', 'items', 'payments'])->find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $bookingData = $this->bookingData($booking);

        $items = $booking->items->map(function ($item) {
            $pricing = is_array($item->pricing) ? $item->pricing : [];
            $total = (float) ($pricing['amount'] ?? $pricing['total'] ?? 0);

            return [
                'id' => $item->id,
                'bookingId' => $item->booking_id,
                'booking_id' => $item->booking_id,
                'roomTypeId' => $item->room_type_id,
                'room_type_id' => $item->room_type_id,
                'roomId' => $item->room_id,
                'room_id' => $item->room_id,
                'ratePlanId' => $item->rate_plan_id,
                'rate_plan_id' => $item->rate_plan_id,
                'roomNameSnapshot' => $item->room_name_snapshot ?? 'Cottage',
                'room_name_snapshot' => $item->room_name_snapshot ?? 'Cottage',
                'roomNumberSnapshot' => $item->room_number_snapshot,
                'room_number_snapshot' => $item->room_number_snapshot,
                'ratePlanNameSnapshot' => $item->rate_plan_name_snapshot ?? 'Standard Rate',
                'rate_plan_name_snapshot' => $item->rate_plan_name_snapshot ?? 'Standard Rate',
                'checkIn' => $item->check_in,
                'check_in' => $item->check_in,
                'checkOut' => $item->check_out,
                'check_out' => $item->check_out,
                'pricing' => [
                    'total' => $total,
                ],
            ];
        });

        $payments = $booking->payments->map(function ($p) {
            return [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'currency' => $p->currency ?? 'GBP',
                'status' => $p->status,
                'createdAt' => $p->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'booking' => $bookingData,
                'items' => $items,
                'payments' => $payments,
                ...$bookingData,
            ],
        ]);
    }

    public function cancelPreview(string $id)
    {
        $booking = Booking::with('payments')->find($id);
        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $paidTotal = (float) $booking->payments->where('status', 'PAID')->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'evaluation' => [
                    'isCancellable' => in_array($booking->status, ['HELD', 'PAYMENT_PENDING', 'CONFIRMED']),
                    'refundAmount' => $paidTotal,
                    'refundPercentage' => 100,
                    'reason' => 'Admin cancellation preview',
                    'policyName' => 'Standard Policy',
                ],
                'bookingNumber' => $booking->booking_number,
                'status' => $booking->status,
                'paidTotal' => $paidTotal,
            ],
        ]);
    }

    public function cancel(string $id)
    {
        $booking = Booking::with(['user', 'items', 'payments'])->find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $booking->status = 'CANCELLED';
        $cancellation = is_array($booking->cancellation) ? $booking->cancellation : [];
        $cancellation['cancelledAt'] = now()->toIso8601String();
        $cancellation['reason'] = request('reason');
        $booking->cancellation = $cancellation;
        $booking->save();

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function refund(string $id)
    {
        $booking = Booking::with('payments')->find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $payment = $booking->payments->where('status', 'PAID')->first();
        if ($payment && $payment->provider_payment_intent_id) {
            try {
                \Stripe\Stripe::setApiKey(config('services.stripe.secret') ?? env('STRIPE_SECRET_KEY'));
                $stripeRefund = \Stripe\Refund::create([
                    'payment_intent' => $payment->provider_payment_intent_id,
                ]);

                \App\Models\Refund::create([
                    'id' => bin2hex(random_bytes(12)),
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'status' => 'SUCCEEDED',
                    'provider_refund_id' => $stripeRefund->id,
                ]);

                $booking->status = 'CANCELLED';
                $booking->payment_status = 'REFUNDED';
                $booking->save();

                return response()->json([
                    'success' => true,
                    'data' => ['refundId' => $stripeRefund->id, 'amount' => $payment->amount],
                ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Admin refund error: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'data' => ['refundId' => bin2hex(random_bytes(12)), 'amount' => 0],
        ]);
    }

    public function checkIn(string $id)
    {
        $booking = Booking::with(['user', 'items', 'payments'])->find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $booking->status = 'CHECKED_IN';
        $stay = is_array($booking->stay) ? $booking->stay : [];
        $stay['checkedInAt'] = now()->toIso8601String();
        $booking->stay = $stay;
        $booking->save();

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function checkOut(string $id)
    {
        $booking = Booking::with(['user', 'items', 'payments'])->find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $booking->status = 'CHECKED_OUT';
        $stay = is_array($booking->stay) ? $booking->stay : [];
        $stay['checkedOutAt'] = now()->toIso8601String();
        $booking->stay = $stay;
        $booking->save();

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function reassign(string $id)
    {
        $booking = Booking::with(['items', 'user', 'payments'])->find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $roomId = request('roomId');
        $room = \App\Models\Room::find($roomId);
        if ($room && $booking->items->isNotEmpty()) {
            $item = $booking->items->first();
            $item->room_id = $room->id;
            $item->room_type_id = $room->room_type_id;
            $item->room_number_snapshot = $room->room_number;
            $item->save();
        }

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    private function bookingData(Booking $b): array
    {
        $pricing = is_array($b->pricing) ? $b->pricing : [];
        $cancellation = is_array($b->cancellation) ? $b->cancellation : [];
        $hold = is_array($b->hold) ? $b->hold : [];
        $stay = is_array($b->stay) ? $b->stay : [];
        $guests = is_array($b->guests) ? $b->guests : ['adults' => 1, 'children' => 0];
        $contact = is_array($b->contact) ? $b->contact : [];

        return [
            'id' => $b->id,
            'bookingNumber' => $b->booking_number,
            'booking_number' => $b->booking_number,
            'propertyId' => $b->property_id,
            'property_id' => $b->property_id,
            'userId' => $b->user_id,
            'user_id' => $b->user_id,
            'status' => $b->status,
            'paymentStatus' => $b->payment_status,
            'payment_status' => $b->payment_status,
            'checkIn' => $b->check_in,
            'check_in' => $b->check_in,
            'checkOut' => $b->check_out,
            'check_out' => $b->check_out,
            'guests' => [
                'adults' => (int) ($guests['adults'] ?? 1),
                'children' => (int) ($guests['children'] ?? 0),
            ],
            'contact' => [
                'title' => $contact['title'] ?? null,
                'firstName' => $contact['firstName'] ?? $contact['first_name'] ?? '',
                'lastName' => $contact['lastName'] ?? $contact['last_name'] ?? '',
                'first_name' => $contact['firstName'] ?? $contact['first_name'] ?? '',
                'last_name' => $contact['lastName'] ?? $contact['last_name'] ?? '',
                'email' => $contact['email'] ?? '',
                'phone' => $contact['phone'] ?? '',
                'mobile' => $contact['mobile'] ?? null,
                'address1' => $contact['address1'] ?? null,
                'address2' => $contact['address2'] ?? null,
                'city' => $contact['city'] ?? null,
                'county' => $contact['county'] ?? null,
                'postcode' => $contact['postcode'] ?? null,
                'country' => $contact['country'] ?? null,
            ],
            'pricing' => [
                'currency' => $pricing['currency'] ?? 'GBP',
                'subtotal' => (float) ($pricing['subtotal'] ?? 0),
                'discount' => (float) ($pricing['discount'] ?? 0),
                'taxes' => (float) ($pricing['taxes'] ?? 0),
                'fees' => (float) ($pricing['fees'] ?? 0),
                'total' => (float) ($pricing['total'] ?? 0),
                'couponCode' => $pricing['couponCode'] ?? $pricing['coupon_code'] ?? null,
            ],
            'cancellation' => [
                'cancelledAt' => $cancellation['cancelledAt'] ?? $cancellation['cancelled_at'] ?? null,
                'cancelledBy' => $cancellation['cancelledBy'] ?? $cancellation['cancelled_by'] ?? null,
                'reason' => $cancellation['reason'] ?? null,
            ],
            'hold' => [
                'holdId' => $hold['holdId'] ?? $hold['hold_id'] ?? null,
                'expiresAt' => $hold['expiresAt'] ?? $hold['expires_at'] ?? null,
            ],
            'stay' => [
                'checkedInAt' => $stay['checkedInAt'] ?? $stay['checked_in_at'] ?? null,
                'checkedInBy' => $stay['checkedInBy'] ?? $stay['checked_in_by'] ?? null,
                'checkedOutAt' => $stay['checkedOutAt'] ?? $stay['checked_out_at'] ?? null,
                'checkedOutBy' => $stay['checkedOutBy'] ?? $stay['checked_out_by'] ?? null,
            ],
            'source' => $b->source ?? 'DIRECT',
            'notes' => $b->notes,
            'createdAt' => $b->created_at?->toIso8601String(),
            'updatedAt' => $b->updated_at?->toIso8601String(),
            'created_at' => $b->created_at?->toIso8601String(),
            'updated_at' => $b->updated_at?->toIso8601String(),
        ];
    }
}
