<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Amenity;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminAmenitiesController extends Controller
{
    private function formatAmenity(Amenity $a): array
    {
        return [
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
            'sort_order' => (int) ($a->sort_order ?? 0),
            'status' => $a->status ?? 'ACTIVE',
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ];
    }

    public function index(Request $request)
    {
        $query = Amenity::query();

        if ($request->filled('group')) {
            $query->where('group', $request->input('group'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $amenities = $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $amenities->map(fn ($a) => $this->formatAmenity($a)),
            'total' => $amenities->count(),
        ]);
    }

    public function show($id)
    {
        $amenity = Amenity::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->formatAmenity($amenity),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:120',
            'group' => 'nullable|string|in:HIGHLIGHT,FACILITY',
            'description' => 'nullable|string',
            'sortOrder' => 'nullable|integer',
            'sort_order' => 'nullable|integer',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $name = trim($request->input('name'));
        $baseSlug = Str::slug($request->input('slug') ?: $name);
        $slug = $baseSlug;
        $counter = 1;
        while (Amenity::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $sortOrder = $request->input('sortOrder') ?? $request->input('sort_order') ?? 0;
        $imageMediaId = $request->input('imageMediaId') ?? $request->input('image_media_id');
        $iconUrl = $request->input('iconUrl') ?? $request->input('icon_url');

        $amenity = Amenity::create([
            'name' => $name,
            'slug' => $slug,
            'group' => $request->input('group', 'HIGHLIGHT'),
            'description' => $request->input('description'),
            'image_media_id' => $imageMediaId,
            'icon_url' => $iconUrl,
            'sort_order' => (int) $sortOrder,
            'status' => $request->input('status', 'ACTIVE'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Feature created successfully',
            'data' => $this->formatAmenity($amenity),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $amenity = Amenity::findOrFail($id);

        if ($request->has('name')) {
            $amenity->name = trim($request->input('name'));
            if ($request->filled('slug')) {
                $amenity->slug = Str::slug($request->input('slug'));
            }
        }

        if ($request->has('group')) {
            $amenity->group = $request->input('group');
        }

        if ($request->has('description')) {
            $amenity->description = $request->input('description');
        }

        if ($request->has('imageMediaId') || $request->has('image_media_id')) {
            $amenity->image_media_id = $request->input('imageMediaId') ?? $request->input('image_media_id');
        }

        if ($request->has('iconUrl') || $request->has('icon_url')) {
            $amenity->icon_url = $request->input('iconUrl') ?? $request->input('icon_url');
        }

        if ($request->has('sortOrder') || $request->has('sort_order')) {
            $amenity->sort_order = (int) ($request->input('sortOrder') ?? $request->input('sort_order') ?? 0);
        }

        if ($request->has('status')) {
            $amenity->status = $request->input('status');
        }

        $amenity->save();

        return response()->json([
            'success' => true,
            'message' => 'Feature updated successfully',
            'data' => $this->formatAmenity($amenity),
        ]);
    }

    public function destroy($id)
    {
        $amenity = Amenity::findOrFail($id);
        $amenity->delete();

        return response()->json([
            'success' => true,
            'message' => 'Feature deleted successfully',
        ]);
    }

    public function reorder(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'string',
        ]);

        foreach ($request->input('ids') as $order => $id) {
            Amenity::where('id', $id)->update(['sort_order' => $order]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Features reordered successfully',
        ]);
    }
}
