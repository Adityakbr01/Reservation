<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Amenity;

class AdminAmenitiesController extends Controller
{
    public function index()
    {
        $amenities = Amenity::all();

        return response()->json([
            'success' => true,
            'data' => $amenities->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'slug' => $a->slug,
                'group' => $a->group,
                'status' => $a->status,
            ]),
        ]);
    }
}
