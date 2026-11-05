<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Availability\SearchAvailabilityRequest;
use App\Models\AvailabilityBlock;
use App\Models\BookingItem;
use App\Models\Room;

class PublicAvailabilityController extends Controller
{
    public function search(SearchAvailabilityRequest $request)
    {
        $data = $request->validated();

        $rooms = Room::where('status', 'ACTIVE');

        if ($data['room_type_id'] ?? null) {
            $rooms->where('room_type_id', $data['room_type_id']);
        }

        $rooms = $rooms->get();

        $available = [];
        foreach ($rooms as $room) {
            $blocked = AvailabilityBlock::where('room_id', $room->id)
                ->where(function ($q) use ($data) {
                    $q->where('start_date', '<', $data['check_out'])
                        ->where('end_date', '>', $data['check_in']);
                })->exists();

            $conflicting = BookingItem::where('room_id', $room->id)
                ->where(function ($q) use ($data) {
                    $q->where('check_in', '<', $data['check_out'])
                        ->where('check_out', '>', $data['check_in']);
                })->exists();

            if (! $blocked && ! $conflicting) {
                $available[] = [
                    'id' => $room->id,
                    'room_type_id' => $room->room_type_id,
                    'name' => $room->name,
                    'room_number' => $room->room_number,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $available,
        ]);
    }

    public function calendar()
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }
}
