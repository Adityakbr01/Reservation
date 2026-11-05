<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\RoomType;
use App\Models\CmsOffer;

class PublicRoomTypeController extends Controller
{
    public function index()
    {
        $roomTypes = RoomType::where('status', 'ACTIVE')->get();

        return response()->json([
            'success' => true,
            'data' => $roomTypes->map(fn ($rt) => $this->roomTypeData($rt)),
        ]);
    }

    public function showBySlug(string $slug)
    {
        $roomType = RoomType::where('slug', $slug)->where('status', 'ACTIVE')->first();

        if (!$roomType) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ROOM_TYPE_NOT_FOUND', 'message' => 'Room type not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->roomTypeData($roomType),
        ]);
    }

    public function offers(string $id)
    {
        $offers = CmsOffer::where('status', 'PUBLISHED')->get();

        return response()->json([
            'success' => true,
            'data' => $offers->map(fn ($o) => [
                'id' => $o->id,
                'title' => $o->title,
                'description' => $o->description,
                'valid_from' => $o->valid_from,
                'valid_until' => $o->valid_until,
                'cta_label' => $o->cta_label,
                'cta_url' => $o->cta_url,
            ]),
        ]);
    }

    private function roomTypeData(RoomType $rt): array
    {
        return [
            'id' => $rt->id,
            'name' => $rt->name,
            'slug' => $rt->slug,
            'short_description' => $rt->short_description,
            'description' => $rt->description,
            'max_adults' => $rt->max_adults,
            'max_children' => $rt->max_children,
            'max_occupancy' => $rt->max_occupancy,
            'beds' => $rt->beds,
            'amenities' => $rt->amenities,
            'images' => $rt->images,
            'media' => $rt->media,
            'status' => $rt->status,
            'seo' => $rt->seo,
        ];
    }
}
