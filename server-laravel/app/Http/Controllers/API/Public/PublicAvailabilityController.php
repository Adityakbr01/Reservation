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
        $checkInDate = $data['check_in'];
        $checkOutDate = $data['check_out'];

        $checkIn = \Carbon\Carbon::parse($checkInDate);
        $checkOut = \Carbon\Carbon::parse($checkOutDate);
        $nights = max(1, $checkIn->diffInDays($checkOut));

        // Auto-unhold any expired holds older than 20 minutes
        \App\Models\Booking::unholdExpired();

        // 1. Bulk query: Get all blocked room IDs in date range with 1 query
        $blockedRoomIds = AvailabilityBlock::where('start_date', '<', $checkOutDate)
            ->where('end_date', '>', $checkInDate)
            ->pluck('room_id')
            ->filter()
            ->all();

        // 2. Bulk query: Get all active booked/held room IDs in date range with 1 query
        $bookedRoomIds = BookingItem::activeBookings()
            ->where('check_in', '<', $checkOutDate)
            ->where('check_out', '>', $checkInDate)
            ->pluck('room_id')
            ->filter()
            ->all();

        $unavailableRoomIds = array_flip(array_merge($blockedRoomIds, $bookedRoomIds));

        // 3. Bulk query: Active rooms
        $roomQuery = Room::where('status', 'ACTIVE');
        if (!empty($data['room_type_id'])) {
            $roomQuery->where('room_type_id', $data['room_type_id']);
        }
        $rooms = $roomQuery->get();

        $availableCounts = [];
        foreach ($rooms as $room) {
            if (!isset($unavailableRoomIds[$room->id])) {
                $rtId = $room->room_type_id;
                $availableCounts[$rtId] = ($availableCounts[$rtId] ?? 0) + 1;
            }
        }

        // 4. Bulk query: Get all active cottages with active rate plans in 1 query
        $roomTypes = \App\Models\RoomType::with(['ratePlans' => function ($q) {
            $q->where('status', 'ACTIVE');
        }])->where('status', 'ACTIVE')->get();

        $currency = \App\Models\SiteSettings::first()?->currency
            ?? \App\Models\Property::first()?->currency
            ?? 'GBP';

        // 5. Bulk query: Resolve media URLs directly so client has URLs immediately
        $allMediaIds = [];
        foreach ($roomTypes as $rt) {
            foreach ($rt->media ?? [] as $m) {
                $mid = is_array($m) ? ($m['mediaId'] ?? null) : ($m->mediaId ?? null);
                if ($mid) $allMediaIds[] = $mid;
            }
            foreach ($rt->images ?? [] as $img) {
                $mid = is_array($img) ? ($img['mediaId'] ?? null) : ($img->mediaId ?? null);
                if ($mid) $allMediaIds[] = $mid;
            }
            if (!empty($rt->dog_policy_image_media_id)) {
                $allMediaIds[] = (string) $rt->dog_policy_image_media_id;
            }
            $rtExtras = is_array($rt->extras) ? $rt->extras : (is_string($rt->extras) ? (json_decode($rt->extras, true) ?? []) : []);
            foreach ($rtExtras as $extra) {
                $mid = is_array($extra) ? ($extra['imageMediaId'] ?? $extra['image_media_id'] ?? null) : ($extra->imageMediaId ?? null);
                if ($mid) $allMediaIds[] = (string) $mid;
            }
        }
        $mediaMap = [];
        if (!empty($allMediaIds)) {
            $mediaMap = \App\Models\Media::whereIn('id', array_unique($allMediaIds))
                ->get()
                ->keyBy('id');
        }

        $results = [];
        foreach ($roomTypes as $rt) {
            $availableCount = $availableCounts[$rt->id] ?? 1;

            $rates = [];
            $activePlans = $rt->relationLoaded('ratePlans') ? $rt->ratePlans : \App\Models\RatePlan::where('room_type_id', $rt->id)->where('status', 'ACTIVE')->get();
            foreach ($activePlans as $rp) {
                $basePrice = 15000;
                if (is_array($rp->pricing)) {
                    if (isset($rp->pricing['amount']) && is_numeric($rp->pricing['amount'])) {
                        $basePrice = (int) $rp->pricing['amount'];
                    } elseif (isset($rp->pricing['basePrice']) && is_numeric($rp->pricing['basePrice'])) {
                        $basePrice = (int) round(((float) $rp->pricing['basePrice']) * 100);
                    } elseif (isset($rp->pricing['base_price']) && is_numeric($rp->pricing['base_price'])) {
                        $basePrice = (int) round(((float) $rp->pricing['base_price']) * 100);
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

            $resolvedMedia = array_map(function ($m) use ($mediaMap) {
                $item = is_array($m) ? $m : (array) $m;
                $mid = $item['mediaId'] ?? null;
                if ($mid && isset($mediaMap[$mid])) {
                    $item['url'] = $mediaMap[$mid]->url;
                    $item['altText'] = $item['altText'] ?? $mediaMap[$mid]->alt;
                }
                return $item;
            }, $rt->media ?? []);

            $resolvedImages = array_map(function ($img) use ($mediaMap) {
                $item = is_array($img) ? $img : (array) $img;
                $mid = $item['mediaId'] ?? null;
                if ($mid && isset($mediaMap[$mid])) {
                    $item['url'] = $mediaMap[$mid]->url;
                    $item['altText'] = $item['altText'] ?? $mediaMap[$mid]->alt;
                }
                return $item;
            }, $rt->images ?? []);

            $results[] = [
                'roomType' => [
                    'id' => $rt->id,
                    'name' => $rt->name,
                    'slug' => $rt->slug,
                    'maxAdults' => $rt->max_adults,
                    'maxChildren' => $rt->max_children,
                    'maxOccupancy' => $rt->max_occupancy,
                    'bedrooms' => $rt->bedrooms,
                    'bathrooms' => $rt->bathrooms,
                    'maxDogs' => $rt->max_dogs,
                    'max_dogs' => $rt->max_dogs,
                    'dogPolicyEnabled' => (bool) ($rt->dog_policy_enabled ?? ($rt->max_dogs > 0)),
                    'dog_policy_enabled' => (bool) ($rt->dog_policy_enabled ?? ($rt->max_dogs > 0)),
                    'dogPolicyTitle' => $rt->dog_policy_title,
                    'dog_policy_title' => $rt->dog_policy_title,
                    'dogPolicySubtitle' => $rt->dog_policy_subtitle,
                    'dog_policy_subtitle' => $rt->dog_policy_subtitle,
                    'dogFee' => $rt->dog_fee !== null ? (float) $rt->dog_fee : 70.00,
                    'dog_fee' => $rt->dog_fee !== null ? (float) $rt->dog_fee : 70.00,
                    'dogPolicyImageMediaId' => $rt->dog_policy_image_media_id,
                    'dog_policy_image_media_id' => $rt->dog_policy_image_media_id,
                    'dogPolicyImageUrl' => (!empty($rt->dog_policy_image_media_id) && isset($mediaMap[$rt->dog_policy_image_media_id])) ? $mediaMap[$rt->dog_policy_image_media_id]->url : null,
                    'dog_policy_image_url' => (!empty($rt->dog_policy_image_media_id) && isset($mediaMap[$rt->dog_policy_image_media_id])) ? $mediaMap[$rt->dog_policy_image_media_id]->url : null,
                    'shortDescription' => $rt->short_description,
                    'homeSection' => $rt->home_section ?? ($rt->section_settings['home_section'] ?? 'section_1'),
                    'home_section' => $rt->home_section ?? ($rt->section_settings['home_section'] ?? 'section_1'),
                    'amenities' => $rt->amenities ?? [],
                    'images' => $resolvedImages,
                    'media' => $resolvedMedia,
                    'extras' => array_map(function ($extra) use ($mediaMap) {
                        $ex = is_array($extra) ? $extra : (array) $extra;
                        $mid = $ex['imageMediaId'] ?? $ex['image_media_id'] ?? null;
                        if ($mid) {
                            $midStr = (string) $mid;
                            if (isset($mediaMap[$midStr])) {
                                $ex['imageUrl'] = $mediaMap[$midStr]->url;
                                $ex['image_url'] = $mediaMap[$midStr]->url;
                            } else {
                                $med = \App\Models\Media::find($midStr);
                                if ($med) {
                                    $ex['imageUrl'] = $med->url;
                                    $ex['image_url'] = $med->url;
                                }
                            }
                        }
                        return $ex;
                    }, is_array($rt->extras) ? $rt->extras : (is_string($rt->extras) ? (json_decode($rt->extras, true) ?? []) : [])),
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
        // Auto-unhold any expired holds older than 20 minutes
        \App\Models\Booking::unholdExpired();

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

                    $bookedCount = BookingItem::activeBookings()
                        ->whereIn('room_id', $roomIds)
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
