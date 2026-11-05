<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\Property;

class PublicPropertyController extends Controller
{
    public function show()
    {
        $property = Property::first();

        if (!$property) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PROPERTY_NOT_FOUND', 'message' => 'Property not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
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
            ],
        ]);
    }
}
