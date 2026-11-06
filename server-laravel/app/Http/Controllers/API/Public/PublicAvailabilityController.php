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

        $checkIn = \Carbon\Carbon::parse($data['check_in']);
        $checkOut = \Carbon\Carbon::parse($data['check_out']);
        $nights = max(1, $checkIn->diffInDays($checkOut));

        $roomTypes = \App\Models\RoomType::where('status', 'ACTIVE')->get();
        $results = [];

        $currency = \App\Models\Property::first()?->currency ?? 'GBP';

        foreach ($roomTypes as $rt) {
            $availableCount = count(array_filter($available, fn ($r) => $r['room_type_id'] === $rt->id));
            $ratePlans = \App\Models\RatePlan::where('room_type_id', $rt->id)->where('status', 'ACTIVE')->get();

            $rates = [];
            foreach ($ratePlans as $rp) {
                $basePrice = 100;
                if (is_array($rp->pricing) && isset($rp->pricing['basePrice'])) {
                    $basePrice = (int) $rp->pricing['basePrice'];
                } elseif (is_array($rp->pricing) && isset($rp->pricing['base_price'])) {
                    $basePrice = (int) $rp->pricing['base_price'];
                }
                $rates[] = [
                    'ratePlanId' => $rp->id,
                    'name' => $rp->name,
                    'pricingType' => 'PER_NIGHT',
                    'perNight' => $basePrice,
                    'total' => $basePrice * $nights,
                    'currency' => $currency,
                ];
            }

            $results[] = [
                'roomType' => [
                    'id' => $rt->id,
                    'name' => $rt->name,
                    'slug' => $rt->slug,
                    'maxAdults' => $rt->max_adults,
                    'maxChildren' => $rt->max_children,
                    'maxOccupancy' => $rt->max_occupancy,
                    'shortDescription' => $rt->short_description,
                    'amenities' => $rt->amenities ?? [],
                    'images' => $rt->images ?? [],
                    'media' => $rt->media ?? [],
                ],
                'availableCount' => $availableCount,
                'rates' => $rates,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'search' => [
                    'checkIn' => $data['check_in'],
                    'checkOut' => $data['check_out'],
                    'adults' => (int) ($data['adults'] ?? 2),
                    'children' => (int) ($data['children'] ?? 0),
                    'rooms' => (int) ($data['rooms'] ?? 1),
                    'nights' => $nights,
                ],
            ],
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
