<?php

namespace App\Services;

use App\Models\AvailabilityBlock;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\Room;

class BookingService
{
    public function calculateAvailability(array $data): array
    {
        $checkIn = $data['check_in'];
        $checkOut = $data['check_out'];
        $roomTypeId = $data['room_type_id'] ?? null;

        $query = Room::where('status', 'ACTIVE');
        if ($roomTypeId) {
            $query->where('room_type_id', $roomTypeId);
        }

        $rooms = $query->get();
        $available = [];

        foreach ($rooms as $room) {
            $blocked = AvailabilityBlock::where('room_id', $room->id)
                ->where('start_date', '<', $checkOut)
                ->where('end_date', '>', $checkIn)
                ->exists();

            $conflicting = BookingItem::where('room_id', $room->id)
                ->where('check_in', '<', $checkOut)
                ->where('check_out', '>', $checkIn)
                ->exists();

            if (! $blocked && ! $conflicting) {
                $available[] = [
                    'id' => $room->id,
                    'room_type_id' => $room->room_type_id,
                    'name' => $room->name,
                    'room_number' => $room->room_number,
                ];
            }
        }

        return $available;
    }

    public function createBooking(array $data, string $userId): array
    {
        $booking = Booking::create(array_merge($data, [
            'id' => bin2hex(random_bytes(12)),
            'booking_number' => 'BK'.strtoupper(bin2hex(random_bytes(6))),
            'user_id' => $userId,
            'status' => 'HELD',
            'payment_status' => 'PENDING',
        ]));

        return [
            'booking' => $booking,
            'items' => $booking->items,
        ];
    }

    public function cancelBooking(string $id, string $userId): ?Booking
    {
        $booking = Booking::where('id', $id)->where('user_id', $userId)->first();

        if (! $booking) {
            return null;
        }

        $booking->status = 'CANCELLED';
        $booking->save();

        return $booking;
    }
}
