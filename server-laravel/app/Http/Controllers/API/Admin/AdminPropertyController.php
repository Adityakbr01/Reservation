<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateSettingsRequest;
use App\Models\Property;

class AdminPropertyController extends Controller
{
    public function show()
    {
        $property = Property::first();

        if (! $property) {
            $property = Property::create([
                'id' => '6ac0cc41a287cfd3dfbbf8a9',
                'name' => 'Hamptworth Stays',
                'slug' => 'hamptworth-stays',
                'description' => 'Luxury countryside retreat on the edge of New Forest',
                'currency' => 'GBP',
                'timezone' => 'Europe/London',
                'check_in_time' => '15:00',
                'check_out_time' => '10:00',
                'status' => 'active',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $this->propertyData($property),
        ]);
    }

    public function update(UpdateSettingsRequest $request)
    {
        $property = Property::first();

        if (! $property) {
            $property = Property::create([
                'id' => '6ac0cc41a287cfd3dfbbf8a9',
                'name' => 'Hamptworth Stays',
                'slug' => 'hamptworth-stays',
                'currency' => 'GBP',
                'timezone' => 'Europe/London',
                'status' => 'active',
            ]);
        }

        $property->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => $this->propertyData($property),
        ]);
    }

    private function propertyData(Property $property): array
    {
        return [
            'id' => $property->id,
            'name' => $property->name,
            'slug' => $property->slug,
            'description' => $property->description,
            'contact' => $property->contact,
            'map_embed_url' => $property->map_embed_url,
            'check_in_time' => $property->check_in_time,
            'check_out_time' => $property->check_out_time,
            'timezone' => $property->timezone,
            'currency' => $property->currency,
            'status' => $property->status,
        ];
    }
}
