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
        $block = AvailabilityBlock::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
        ]));

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $block->id,
                'property_id' => $block->property_id,
                'room_id' => $block->room_id,
                'start_date' => $block->start_date,
                'end_date' => $block->end_date,
                'reason' => $block->reason,
            ],
        ], 201);
    }

    public function deleteBlock(string $id)
    {
        $block = AvailabilityBlock::find($id);

        if (!$block) {
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
