<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;

class AdminBookingController extends Controller
{
    public function index()
    {
        $bookings = Booking::with('user')->get();

        return response()->json([
            'success' => true,
            'data' => $bookings->map(fn ($b) => $this->bookingData($b)),
        ]);
    }

    public function show(string $id)
    {
        $booking = Booking::find($id);

        if (! $booking) {
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

    public function cancelPreview(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['refund_amount' => 0],
        ]);
    }

    public function cancel(string $id)
    {
        $booking = Booking::find($id);

        if (! $booking) {
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

    public function refund(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['refund_id' => bin2hex(random_bytes(12))],
        ]);
    }

    public function checkIn(string $id)
    {
        $booking = Booking::find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $booking->status = 'CHECKED_IN';
        $booking->save();

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function checkOut(string $id)
    {
        $booking = Booking::find($id);

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $booking->status = 'CHECKED_OUT';
        $booking->save();

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function reassign(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['reassigned' => true],
        ]);
    }

    private function bookingData(Booking $b): array
    {
        return [
            'id' => $b->id,
            'booking_number' => $b->booking_number,
            'user_id' => $b->user_id,
            'status' => $b->status,
            'payment_status' => $b->payment_status,
            'check_in' => $b->check_in,
            'check_out' => $b->check_out,
            'guests' => $b->guests,
            'contact' => $b->contact,
        ];
    }
}
