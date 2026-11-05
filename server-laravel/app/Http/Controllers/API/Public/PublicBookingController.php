<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bookings\CreateBookingRequest;
use App\Http\Requests\Bookings\QuoteRequest;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\RoomType;
use App\Models\RatePlan;

class PublicBookingController extends Controller
{
    public function quote(QuoteRequest $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'quote_id' => bin2hex(random_bytes(9)),
                'ttl_seconds' => 900,
            ],
        ], 201);
    }

    public function store(CreateBookingRequest $request)
    {
        $data = $request->validated();

        $booking = Booking::create(array_merge($data, [
            'id' => bin2hex(random_bytes(12)),
            'booking_number' => 'BK' . strtoupper(bin2hex(random_bytes(6))),
            'property_id' => 'prop_000000000001',
            'user_id' => $request->attributes->get('auth_user')->id,
            'status' => 'HELD',
            'payment_status' => 'PENDING',
            'source' => 'DIRECT',
            'reminder_sent' => false,
        ]));

        foreach ($data['rooms'] as $roomData) {
            BookingItem::create([
                'id' => bin2hex(random_bytes(12)),
                'booking_id' => $booking->id,
                'room_type_id' => $roomData['room_type_id'],
                'room_id' => null,
                'rate_plan_id' => $roomData['rate_plan_id'],
                'room_name_snapshot' => '',
                'room_number_snapshot' => null,
                'rate_plan_name_snapshot' => '',
                'check_in' => $data['check_in'],
                'check_out' => $data['check_out'],
                'guests' => $data['guests'],
                'pricing' => [],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'booking' => [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'status' => $booking->status,
                    'check_in' => $booking->check_in,
                    'check_out' => $booking->check_out,
                ],
                'idempotent_replay' => false,
            ],
        ], 201);
    }

    public function show(string $id)
    {
        $userId = request()->attributes->get('auth_user')->id;
        $booking = Booking::where('id', $id)->where('user_id', $userId)->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function receipt(string $id)
    {
        $userId = request()->attributes->get('auth_user')->id;
        $booking = Booking::where('id', $id)->where('user_id', $userId)->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'booking_number' => $booking->booking_number,
                'status' => $booking->status,
                'check_in' => $booking->check_in,
                'check_out' => $booking->check_out,
            ],
        ]);
    }

    public function cancel(string $id)
    {
        $userId = request()->attributes->get('auth_user')->id;
        $booking = Booking::where('id', $id)->where('user_id', $userId)->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $booking->status = 'CANCELLED';
        $booking->save();

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function myIndex()
    {
        $userId = request()->attributes->get('auth_user')->id;
        $bookings = Booking::where('user_id', $userId)->get();

        return response()->json([
            'success' => true,
            'data' => $bookings->map(fn ($b) => $this->bookingData($b)),
            'meta' => ['page' => 1, 'limit' => 20, 'total' => count($bookings)],
        ]);
    }

    public function myShow(string $id)
    {
        $userId = request()->attributes->get('auth_user')->id;
        $booking = Booking::where('id', $id)->where('user_id', $userId)->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function createIntent()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'client_secret' => 'pi_test_' . bin2hex(random_bytes(12)),
            ],
        ]);
    }

    public function paymentShow(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['id' => $id],
        ]);
    }

    private function bookingData(Booking $b): array
    {
        return [
            'id' => $b->id,
            'booking_number' => $b->booking_number,
            'status' => $b->status,
            'payment_status' => $b->payment_status,
            'check_in' => $b->check_in,
            'check_out' => $b->check_out,
            'guests' => $b->guests,
            'contact' => $b->contact,
            'pricing' => $b->pricing,
        ];
    }
}
