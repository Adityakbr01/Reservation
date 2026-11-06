<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Rooms\CreateRoomRequest;
use App\Http\Requests\Rooms\UpdateRoomRequest;
use App\Models\Room;

class AdminRoomController extends Controller
{
    public function index()
    {
        $rooms = Room::with('roomType')->get();

        return response()->json([
            'success' => true,
            'data' => $rooms->map(fn ($r) => $this->roomData($r)),
        ]);
    }

    public function store(CreateRoomRequest $request)
    {
        $propertyId = $request->input('property_id')
            ?? \App\Models\RoomType::find($request->validated('room_type_id'))?->property_id
            ?? \App\Models\Property::first()?->id
            ?? '6ac0cc41a287cfd3dfbbf8a9';

        $room = Room::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->roomData($room),
        ], 201);
    }

    public function show(string $id)
    {
        $room = Room::find($id);

        if (! $room) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ROOM_NOT_FOUND', 'message' => 'Room not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->roomData($room),
        ]);
    }

    public function update(string $id, UpdateRoomRequest $request)
    {
        $room = Room::find($id);

        if (! $room) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ROOM_NOT_FOUND', 'message' => 'Room not found'],
            ], 404);
        }

        $room->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => $this->roomData($room),
        ]);
    }

    public function occupancy()
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }

    private function roomData(Room $r): array
    {
        return [
            'id' => $r->id,
            'property_id' => $r->property_id,
            'room_type_id' => $r->room_type_id,
            'name' => $r->name,
            'room_number' => $r->room_number,
            'floor' => $r->floor,
            'status' => $r->status,
            'condition' => $r->condition,
            'notes' => $r->notes,
        ];
    }
}
