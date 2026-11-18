<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\Amenity;

class PublicAmenitiesController extends Controller
{
    public function index()
    {
        $amenities = Amenity::where('status', 'ACTIVE')
            ->orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $amenities->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'slug' => $a->slug,
                'group' => $a->group ?? 'HIGHLIGHT',
                'description' => $a->description,
                'imageMediaId' => $a->image_media_id,
                'image_media_id' => $a->image_media_id,
                'iconUrl' => $a->icon_url,
                'icon_url' => $a->icon_url,
                'sortOrder' => (int) ($a->sort_order ?? 0),
            ]),
        ])->header('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200');
    }
}
