<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\Property;

class PublicPropertyController extends Controller
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
