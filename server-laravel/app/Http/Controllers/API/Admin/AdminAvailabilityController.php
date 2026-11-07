<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Availability\CreateBlockRequest;
use App\Models\AvailabilityBlock;

class AdminAvailabilityController extends Controller
{
    public function index()
    {
        $blocks = AvailabilityBlock::with('room')->get();

        return response()->json([
            'success' => true,
            'data' => $blocks->map(fn ($b) => [
                'id' => $b->id,
                'property_id' => $b->property_id,
                'room_id' => $b->room_id,
                'start_date' => $b->start_date,
                'end_date' => $b->end_date,
                'reason' => $b->reason,
                'created_by' => $b->created_by,
            ]),
        ]);
    }

    public function createBlock(CreateBlockRequest $request)
    {
        $cottageId = $request->input('cottage_id') ?? $request->input('room_type_id') ?? $request->input('cottageId') ?? $request->input('roomTypeId');
        $roomId = $request->input('room_id') ?? $request->input('roomId');

        if (! $roomId && $cottageId) {
            $cottage = \App\Models\RoomType::find($cottageId);
            $room = \App\Models\Room::firstOrCreate(
                ['room_type_id' => $cottageId],
                [
                    'id' => bin2hex(random_bytes(12)),
                    'property_id' => $cottage?->property_id ?? '6ac0cc41a287cfd3dfbbf8a9',
                    'room_number' => $cottage?->slug ?: '1',
                    'name' => $cottage?->name ?: 'Cottage',
                    'status' => 'ACTIVE',
                ]
            );
            $roomId = $room->id;
        } else {
            $room = \App\Models\Room::find($roomId);
        }

        $defaultProp = \App\Models\Property::defaultProperty();
        $propertyId = $room?->property_id ?? $defaultProp->id;

        $block = AvailabilityBlock::create([
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
            'room_id' => $roomId ?? ($room?->id),
            'start_date' => $request->validated('start_date'),
            'end_date' => $request->validated('end_date'),
            'reason' => $request->validated('reason'),
            'created_by' => auth()->id() ?? '6ac0cc40a287cfd3dfbbf8a8',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $block->id,
                'property_id' => $block->property_id,
                'room_id' => $block->room_id,
                'cottage_id' => $room?->room_type_id ?? $cottageId,
                'start_date' => $block->start_date,
                'end_date' => $block->end_date,
                'reason' => $block->reason,
            ],
        ], 201);
    }

    public function deleteBlock(string $id)
    {
        $block = AvailabilityBlock::find($id);

        if (! $block) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BLOCK_NOT_FOUND', 'message' => 'Availability block not found'],
            ], 404);
        }

        $block->delete();

        return response()->json([
            'success' => true,
            'data' => ['deleted' => true],
        ]);
    }
}
