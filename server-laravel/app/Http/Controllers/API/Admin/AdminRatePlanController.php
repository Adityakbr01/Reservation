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
        $propertyId = $request->input('property_id')
            ?? \App\Models\RoomType::find($request->validated('room_type_id'))?->property_id
            ?? \App\Models\Property::first()?->id
            ?? '6ac0cc41a287cfd3dfbbf8a9';

        $ratePlan = RatePlan::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
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

    private function ratePlanData(RatePlan $rp): array
    {
        $pricing = $rp->pricing ?? [
            'type' => 'PER_NIGHT',
            'amount' => 0,
            'currency' => 'GBP',
        ];

        // Ensure pricing has both amount & basePrice for backwards-compatibility
        if (is_array($pricing)) {
            if (! isset($pricing['amount']) && isset($pricing['basePrice'])) {
                $pricing['amount'] = (int) $pricing['basePrice'] * 100;
            }
            if (! isset($pricing['currency'])) {
                $pricing['currency'] = 'GBP';
            }
            if (! isset($pricing['type'])) {
                $pricing['type'] = 'PER_NIGHT';
            }
        }

        $createdAt = $this->isoDate($rp->created_at);
        $updatedAt = $this->isoDate($rp->updated_at);

        return [
            'id' => (string) $rp->id,
            'property_id' => (string) ($rp->property_id ?? ''),
            'propertyId' => (string) ($rp->property_id ?? ''),
            'room_type_id' => (string) ($rp->room_type_id ?? ''),
            'roomTypeId' => (string) ($rp->room_type_id ?? ''),
            'name' => (string) ($rp->name ?? ''),
            'slug' => (string) ($rp->slug ?? ''),
            'description' => $rp->description,
            'pricing' => $pricing,
            'restrictions' => $rp->restrictions ?? [],
            'cancellation_policy_id' => $rp->cancellation_policy_id,
            'cancellationPolicyId' => $rp->cancellation_policy_id,
            'status' => (string) ($rp->status ?? 'ACTIVE'),
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'updated_at' => $updatedAt,
            'updatedAt' => $updatedAt,
        ];
    }
}
