<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RoomTypes\CreateRoomTypeRequest;
use App\Http\Requests\RoomTypes\UpdateRoomTypeRequest;
use App\Models\RoomType;

class AdminRoomTypeController extends Controller
{
    public function index()
    {
        $roomTypes = RoomType::with('property')->get();

        return response()->json([
            'success' => true,
            'data' => $roomTypes->map(fn ($rt) => $this->roomTypeData($rt)),
        ]);
    }

    public function store(CreateRoomTypeRequest $request)
    {
        $roomType = RoomType::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->roomTypeData($roomType),
        ], 201);
    }

    public function show(string $id)
    {
        $roomType = RoomType::find($id);

        if (! $roomType) {
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

    public function update(string $id, UpdateRoomTypeRequest $request)
    {
        $roomType = RoomType::find($id);

        if (! $roomType) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ROOM_TYPE_NOT_FOUND', 'message' => 'Room type not found'],
            ], 404);
        }

        $roomType->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => $this->roomTypeData($roomType),
        ]);
    }

    private function roomTypeData(RoomType $rt): array
    {
        return [
            'id' => $rt->id,
            'property_id' => $rt->property_id,
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
