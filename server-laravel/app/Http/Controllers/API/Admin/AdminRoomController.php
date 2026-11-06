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
        $defaultProp = \App\Models\Property::defaultProperty();
        $propertyId = $request->input('property_id')
            ?? \App\Models\RoomType::find($request->validated('room_type_id'))?->property_id;

        if (! $propertyId || ! \App\Models\Property::where('id', $propertyId)->exists()) {
            $propertyId = $defaultProp->id;
        }

        $room = Room::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->roomData($room->fresh()),
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
            'data' => $this->roomData($room->fresh()),
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
            'data' => $this->roomData($room->fresh()),
        ]);
    }

    public function occupancy()
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }

    private function isoDate(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }
        if (is_string($date)) {
            try {
                return \Carbon\Carbon::parse($date)->toIso8601String();
            } catch (\Throwable) {
                return $date;
            }
        }
        if ($date instanceof \DateTimeInterface) {
            return $date->format(\DateTimeInterface::ATOM);
        }

        return (string) $date;
    }

    private function roomData(Room $r): array
    {
        $createdAt = $this->isoDate($r->created_at);
        $updatedAt = $this->isoDate($r->updated_at);

        return [
            'id' => (string) $r->id,
            'property_id' => (string) ($r->property_id ?? ''),
            'propertyId' => (string) ($r->property_id ?? ''),
            'room_type_id' => (string) ($r->room_type_id ?? ''),
            'roomTypeId' => (string) ($r->room_type_id ?? ''),
            'name' => (string) ($r->name ?? ''),
            'room_number' => (string) ($r->room_number ?? ''),
            'roomNumber' => (string) ($r->room_number ?? ''),
            'floor' => $r->floor,
            'status' => (string) ($r->status ?? 'ACTIVE'),
            'condition' => $r->condition,
            'notes' => $r->notes,
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'updated_at' => $updatedAt,
            'updatedAt' => $updatedAt,
        ];
    }
}
