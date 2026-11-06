<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RoomTypes\CreateRoomTypeRequest;
use App\Http\Requests\RoomTypes\UpdateRoomTypeRequest;
use App\Models\RoomType;

class AdminRoomTypeController extends Controller
{
    public function index()
    {
        $roomTypes = RoomType::with('property')->get();

        return response()->json([
            'success' => true,
            'data' => $roomTypes->map(fn ($rt) => $this->roomTypeData($rt)),
        ]);
    }

    public function store(CreateRoomTypeRequest $request)
    {
        $property = \App\Models\Property::first();
        $propertyId = $request->input('property_id') ?? ($property ? $property->id : '6ac0cc41a287cfd3dfbbf8a9');

        $roomType = RoomType::create(array_merge($request->validated(), [
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->roomTypeData($roomType->fresh()),
        ], 201);
    }

    public function show(string $id)
    {
        $roomType = RoomType::find($id);

        if (! $roomType) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ROOM_TYPE_NOT_FOUND', 'message' => 'Room type not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->roomTypeData($roomType->fresh()),
        ]);
    }

    public function update(string $id, UpdateRoomTypeRequest $request)
    {
        $roomType = RoomType::find($id);

        if (! $roomType) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ROOM_TYPE_NOT_FOUND', 'message' => 'Room type not found'],
            ], 404);
        }

        $roomType->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => $this->roomTypeData($roomType->fresh()),
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

    private function roomTypeData(RoomType $rt): array
    {
        $createdAt = $this->isoDate($rt->created_at);
        $updatedAt = $this->isoDate($rt->updated_at);

        return [
            'id' => (string) $rt->id,
            'property_id' => (string) ($rt->property_id ?? ''),
            'propertyId' => (string) ($rt->property_id ?? ''),
            'name' => (string) ($rt->name ?? ''),
            'slug' => (string) ($rt->slug ?? ''),
            'short_description' => $rt->short_description,
            'shortDescription' => $rt->short_description,
            'description' => $rt->description,
            'max_adults' => (int) ($rt->max_adults ?? 2),
            'maxAdults' => (int) ($rt->max_adults ?? 2),
            'max_children' => (int) ($rt->max_children ?? 0),
            'maxChildren' => (int) ($rt->max_children ?? 0),
            'max_occupancy' => (int) ($rt->max_occupancy ?? 2),
            'maxOccupancy' => (int) ($rt->max_occupancy ?? 2),
            'beds' => $rt->beds ?? [],
            'amenities' => $rt->amenities ?? [],
            'images' => $rt->images ?? [],
            'media' => $rt->media ?? [],
            'property_details_html' => $rt->property_details_html,
            'propertyDetailsHtml' => $rt->property_details_html,
            'layout_html' => $rt->layout_html,
            'layoutHtml' => $rt->layout_html,
            'floorplan_media_ids' => $rt->floorplan_media_ids ?? [],
            'floorplanMediaIds' => $rt->floorplan_media_ids ?? [],
            'location_text' => $rt->location_text,
            'locationText' => $rt->location_text,
            'surroundings_html' => $rt->surroundings_html,
            'surroundingsHtml' => $rt->surroundings_html,
            'map_lat' => $rt->map_lat !== null ? (float) $rt->map_lat : null,
            'mapLat' => $rt->map_lat !== null ? (float) $rt->map_lat : null,
            'map_lng' => $rt->map_lng !== null ? (float) $rt->map_lng : null,
            'mapLng' => $rt->map_lng !== null ? (float) $rt->map_lng : null,
            'map_embed_url' => $rt->map_embed_url,
            'mapEmbedUrl' => $rt->map_embed_url,
            'welcome_hamper_included' => (bool) $rt->welcome_hamper_included,
            'welcomeHamperIncluded' => (bool) $rt->welcome_hamper_included,
            'welcome_hamper_description' => $rt->welcome_hamper_description,
            'welcomeHamperDescription' => $rt->welcome_hamper_description,
            'welcome_hamper_image_media_id' => $rt->welcome_hamper_image_media_id,
            'welcomeHamperImageMediaId' => $rt->welcome_hamper_image_media_id,
            'welcome_hamper_html' => $rt->welcome_hamper_html,
            'welcomeHamperHtml' => $rt->welcome_hamper_html,
            'amenity_ids' => $rt->amenity_ids ?? [],
            'amenityIds' => $rt->amenity_ids ?? [],
            'nearby_attractions' => $rt->nearby_attractions ?? [],
            'nearbyAttractions' => $rt->nearby_attractions ?? [],
            'bedrooms' => $rt->bedrooms !== null ? (int) $rt->bedrooms : null,
            'bathrooms' => $rt->bathrooms !== null ? (int) $rt->bathrooms : null,
            'max_dogs' => $rt->max_dogs !== null ? (int) $rt->max_dogs : null,
            'maxDogs' => $rt->max_dogs !== null ? (int) $rt->max_dogs : null,
            'status' => (string) ($rt->status ?? 'ACTIVE'),
            'seo' => $rt->seo ?? [],
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'updated_at' => $updatedAt,
            'updatedAt' => $updatedAt,
        ];
    }
}
