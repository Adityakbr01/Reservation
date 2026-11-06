<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\CancellationPolicy;
use App\Models\Property;
use Illuminate\Http\Request;

class AdminPolicyController extends Controller
{
    public function index()
    {
        $policies = CancellationPolicy::all();

        return response()->json([
            'success' => true,
            'data' => $policies->map(fn ($p) => $this->policyData($p)),
        ]);
    }

    public function store(Request $request)
    {
        $defaultProp = Property::defaultProperty();
        $propertyId = $request->input('property_id');
        if (! $propertyId || ! Property::where('id', $propertyId)->exists()) {
            $propertyId = $defaultProp->id;
        }

        $policy = CancellationPolicy::create([
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
            'name' => $request->input('name', 'Flexible Policy'),
            'free_cancellation_hours' => (int) $request->input('free_cancellation_hours', 48),
            'refund_percentage' => (int) $request->input('refund_percentage', 100),
            'is_default' => $request->boolean('is_default', false),
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->policyData($policy),
        ], 201);
    }

    public function show(string $id)
    {
        $policy = CancellationPolicy::find($id);

        if (! $policy) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'POLICY_NOT_FOUND', 'message' => 'Policy not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->policyData($policy),
        ]);
    }

    public function update(string $id, Request $request)
    {
        $policy = CancellationPolicy::find($id);

        if (! $policy) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'POLICY_NOT_FOUND', 'message' => 'Policy not found'],
            ], 404);
        }

        $policy->update($request->only([
            'name', 'free_cancellation_hours', 'refund_percentage', 'is_default',
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->policyData($policy),
        ]);
    }

    private function policyData(CancellationPolicy $policy): array
    {
        return [
            'id' => $policy->id,
            'property_id' => $policy->property_id,
            'name' => $policy->name,
            'free_cancellation_hours' => (int) $policy->free_cancellation_hours,
            'refund_percentage' => (int) $policy->refund_percentage,
            'is_default' => (bool) $policy->is_default,
        ];
    }
}

