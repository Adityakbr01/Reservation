<?php

namespace App\Resources;

class BookingResource
{
    public static function array($booking): array
    {
        return [
            'id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'status' => $booking->status,
            'payment_status' => $booking->payment_status,
            'check_in' => $booking->check_in,
            'check_out' => $booking->check_out,
            'guests' => $booking->guests,
            'contact' => $booking->contact,
            'pricing' => $booking->pricing,
            'created_at' => $booking->created_at,
        ];
    }

    public static function collection($bookings): array
    {
        return array_map(fn ($b) => self::array($b), $bookings);
    }
}
