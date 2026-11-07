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

        // Ensure all active cottages have at least 1 room unit provisioned
        $allCottages = \App\Models\RoomType::where('status', 'ACTIVE')->get();
        foreach ($allCottages as $c) {
            Room::firstOrCreate(
                ['room_type_id' => $c->id],
                [
                    'id' => bin2hex(random_bytes(12)),
                    'property_id' => $c->property_id,
                    'room_number' => $c->slug ?: '1',
                    'name' => $c->name,
                    'status' => 'ACTIVE',
                ]
            );
        }

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

        $currency = \App\Models\SiteSettings::first()?->currency
            ?? \App\Models\Property::first()?->currency
            ?? 'GBP';

        foreach ($roomTypes as $rt) {
            $availableCount = count(array_filter($available, fn ($r) => $r['room_type_id'] === $rt->id));
            $ratePlans = \App\Models\RatePlan::where('room_type_id', $rt->id)->where('status', 'ACTIVE')->get();

            $rates = [];
            foreach ($ratePlans as $rp) {
                $basePrice = 15000;
                if (is_array($rp->pricing)) {
                    $raw = $rp->pricing['amount'] ?? $rp->pricing['basePrice'] ?? $rp->pricing['base_price'] ?? null;
                    if ($raw !== null) {
                        $rawInt = (int) $raw;
                        // Frontend formatMoney(minor) expects minor units (pence).
                        // If DB contains pounds (e.g. 150), convert to pence (15000) so £150.00 displays!
                        $basePrice = ($rawInt < 1000 && $rawInt > 0) ? ($rawInt * 100) : $rawInt;
                    }
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

    public function calendar(\Illuminate\Http\Request $request)
    {
        $now = \Carbon\Carbon::now();
        $from = $request->query('from') ?? $now->copy()->startOfMonth()->toDateString();
        $to = $request->query('to') ?? $now->copy()->endOfMonth()->toDateString();
        $roomTypeId = $request->query('roomTypeId') ?? $request->query('room_type_id');

        try {
            $startDate = \Carbon\Carbon::parse($from);
            $endDate = \Carbon\Carbon::parse($to);
        } catch (\Throwable) {
            $startDate = $now->copy()->startOfMonth();
            $endDate = $now->copy()->endOfMonth();
            $from = $startDate->toDateString();
            $to = $endDate->toDateString();
        }

        $query = \App\Models\RoomType::where('status', 'ACTIVE');
        if ($roomTypeId && $roomTypeId !== 'all') {
            $query->where('id', $roomTypeId);
        }
        $roomTypes = $query->get();

        $typesData = [];
        foreach ($roomTypes as $rt) {
            $rooms = Room::where('room_type_id', $rt->id)->where('status', 'ACTIVE')->get();
            if ($rooms->isEmpty()) {
                $room = Room::firstOrCreate(
                    ['room_type_id' => $rt->id],
                    [
                        'id' => bin2hex(random_bytes(12)),
                        'property_id' => $rt->property_id,
                        'room_number' => $rt->slug ?: '1',
                        'name' => $rt->name,
                        'status' => 'ACTIVE',
                    ]
                );
                $rooms = collect([$room]);
            }
            $totalRooms = max(1, $rooms->count());
            $roomIds = $rooms->pluck('id')->all();

            $days = [];
            $cursor = $startDate->copy();
            // Cap at 62 days max to prevent large loops
            $limit = 0;
            while ($cursor->lte($endDate) && $limit < 62) {
                $limit++;
                $curDate = $cursor->toDateString();
                $nextDate = $cursor->copy()->addDay()->toDateString();

                $blockedCount = 0;
                $bookedCount = 0;

                if ($totalRooms > 0) {
                    $blockedCount = AvailabilityBlock::whereIn('room_id', $roomIds)
                        ->where('start_date', '<', $nextDate)
                        ->where('end_date', '>', $curDate)
                        ->count();

                    $bookedCount = BookingItem::whereIn('room_id', $roomIds)
                        ->where('check_in', '<', $nextDate)
                        ->where('check_out', '>', $curDate)
                        ->count();
                }

                $availableCount = max(0, $totalRooms - $blockedCount - $bookedCount);

                $days[] = [
                    'date' => $curDate,
                    'total' => $totalRooms,
                    'available' => $availableCount,
                    'booked' => $bookedCount,
                    'blocked' => $blockedCount,
                ];

                $cursor->addDay();
            }

            $typesData[] = [
                'roomTypeId' => (string) $rt->id,
                'name' => (string) $rt->name,
                'days' => $days,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'from' => $from,
                'to' => $to,
                'types' => $typesData,
            ],
        ]);
    }
}
