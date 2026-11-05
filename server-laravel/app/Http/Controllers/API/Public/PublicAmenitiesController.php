<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\Amenity;

class PublicAmenitiesController extends Controller
{
    public function index()
    {
        $amenities = Amenity::where('status', 'ACTIVE')->get();

        return response()->json([
            'success' => true,
            'data' => $amenities->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'slug' => $a->slug,
                'icon_url' => $a->icon_url,
            ]),
        ]);
    }
}
