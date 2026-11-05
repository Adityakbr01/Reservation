<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RatePlans\CreateRatePlanRequest;
use App\Http\Requests\RatePlans\UpdateRatePlanRequest;
use App\Models\RatePlan;

class AdminRatePlanController extends Controller
{
    public function index()
    {
        $ratePlans = RatePlan::with('roomType')->get();

        return response()->json([
            'success' => true,
            'data' => $ratePlans->map(fn ($rp) => $this->ratePlanData($rp)),
        ]);
    }

    public function store(CreateRatePlanRequest $request)
    {
        $ratePlan = RatePlan::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->ratePlanData($ratePlan),
        ], 201);
    }

    public function show(string $id)
    {
        $ratePlan = RatePlan::find($id);

        if (! $ratePlan) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'RATE_PLAN_NOT_FOUND', 'message' => 'Rate plan not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->ratePlanData($ratePlan),
        ]);
    }

    public function update(string $id, UpdateRatePlanRequest $request)
    {
        $ratePlan = RatePlan::find($id);

        if (! $ratePlan) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'RATE_PLAN_NOT_FOUND', 'message' => 'Rate plan not found'],
            ], 404);
        }

        $ratePlan->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => $this->ratePlanData($ratePlan),
        ]);
    }

    public function prices(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }

    public function upsertPrices(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }

    public function deletePrice(string $id, string $date)
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }

    private function ratePlanData(RatePlan $rp): array
    {
        return [
            'id' => $rp->id,
            'property_id' => $rp->property_id,
            'room_type_id' => $rp->room_type_id,
            'name' => $rp->name,
            'slug' => $rp->slug,
            'description' => $rp->description,
            'pricing' => $rp->pricing,
            'restrictions' => $rp->restrictions,
            'cancellation_policy_id' => $rp->cancellation_policy_id,
            'status' => $rp->status,
        ];
    }
}
