<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cottages\CreateCottageRequest;
use App\Http\Requests\Cottages\UpdateCottageRequest;
use App\Models\CancellationPolicy;
use App\Models\Cottage;
use App\Models\Property;
use App\Models\RatePlan;
use App\Models\Room;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Http\Request;

class AdminCottageController extends Controller
{
    public function index()
    {
        $cottages = Cottage::with('property')->get();

        foreach ($cottages as $cottage) {
            $this->syncCottageInventoryAndRates($cottage);
        }

        return response()->json([
            'success' => true,
            'data' => $cottages->map(fn ($c) => $this->cottageData($c)),
        ]);
    }

    public function store(CreateCottageRequest $request)
    {
        $defaultProp = Property::defaultProperty();
        $propertyId = $request->input('property_id');
        if (! $propertyId || ! Property::where('id', $propertyId)->exists()) {
            $propertyId = $defaultProp->id;
        }

        $validated = $request->validated();
        $basePrice = $request->input('base_price') ?? $request->input('basePrice');
        unset($validated['base_price'], $validated['basePrice']);

        $cottage = Cottage::create(array_merge($validated, [
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
        ]));

        $this->syncCottageInventoryAndRates($cottage, $basePrice);

        return response()->json([
            'success' => true,
            'data' => $this->cottageData($cottage->fresh()),
        ], 201);
    }

    public function show(string $id)
    {
        $cottage = Cottage::find($id);

        if (! $cottage) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COTTAGE_NOT_FOUND', 'message' => 'Cottage not found'],
            ], 404);
        }

        $this->syncCottageInventoryAndRates($cottage);

        return response()->json([
            'success' => true,
            'data' => $this->cottageData($cottage->fresh()),
        ]);
    }

    public function update(string $id, UpdateCottageRequest $request)
    {
        $cottage = Cottage::find($id);

        if (! $cottage) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COTTAGE_NOT_FOUND', 'message' => 'Cottage not found'],
            ], 404);
        }

        $validated = $request->validated();
        $basePrice = $request->input('base_price') ?? $request->input('basePrice');
        unset($validated['base_price'], $validated['basePrice']);

        $cottage->update($validated);

        $this->syncCottageInventoryAndRates($cottage, $basePrice);

        return response()->json([
            'success' => true,
            'data' => $this->cottageData($cottage->fresh()),
        ]);
    }

    public function destroy(string $id)
    {
        $cottage = Cottage::find($id);

        if (! $cottage) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COTTAGE_NOT_FOUND', 'message' => 'Cottage not found'],
            ], 404);
        }

        $cottage->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cottage deleted successfully',
        ]);
    }

    public function syncCottageInventoryAndRates(Cottage $cottage, mixed $basePrice = null): void
    {
        // 1. Auto-provision 1:1 physical unit in rooms table
        $room = Room::firstOrCreate(
            ['room_type_id' => $cottage->id],
            [
                'id' => bin2hex(random_bytes(12)),
                'property_id' => $cottage->property_id,
                'room_number' => $cottage->slug ?: '1',
                'name' => $cottage->name,
                'status' => $cottage->status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
            ]
        );

        $room->update([
            'name' => $cottage->name,
            'status' => $cottage->status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        ]);

        // 2. Auto-provision or update Rate Plan
        $defaultPolicy = CancellationPolicy::firstOrCreate(
            ['property_id' => $cottage->property_id, 'is_default' => true],
            [
                'id' => bin2hex(random_bytes(12)),
                'name' => 'Flexible Policy',
                'free_cancellation_hours' => 48,
                'refund_percentage' => 100,
            ]
        );

        $ratePlan = RatePlan::where('room_type_id', $cottage->id)->first();
        if ($ratePlan) {
            if ($basePrice !== null && $basePrice !== '') {
                $pricing = is_array($ratePlan->pricing) ? $ratePlan->pricing : [];
                $pricing['basePrice'] = (int) $basePrice;
                $pricing['base_price'] = (int) $basePrice;
                $ratePlan->update([
                    'pricing' => $pricing,
                    'status' => $cottage->status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                ]);
            }
        } else {
            $price = ($basePrice !== null && $basePrice !== '') ? (int) $basePrice : 150;
            $slug = 'standard-' . ($cottage->slug ?? $cottage->id);
            RatePlan::create([
                'id' => bin2hex(random_bytes(12)),
                'property_id' => $cottage->property_id,
                'room_type_id' => $cottage->id,
                'cancellation_policy_id' => $defaultPolicy->id,
                'name' => 'Standard Rate',
                'slug' => $slug,
                'description' => 'Standard flexible rate for ' . $cottage->name,
                'pricing' => [
                    'basePrice' => $price,
                    'base_price' => $price,
                    'currency' => 'GBP',
                ],
                'restrictions' => [
                    'minStay' => 1,
                    'maxStay' => 30,
                ],
                'status' => 'ACTIVE',
            ]);
        }
    }

    private function isoDate(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }
        if (is_string($date)) {
            try {
                return Carbon::parse($date)->toIso8601String();
            } catch (\Throwable) {
                return $date;
            }
        }
        if ($date instanceof DateTimeInterface) {
            return $date->format(DateTimeInterface::ATOM);
        }

        return (string) $date;
    }

    public function cottageData(Cottage $c): array
    {
        $createdAt = $this->isoDate($c->created_at);
        $updatedAt = $this->isoDate($c->updated_at);

        $ratePlan = RatePlan::where('room_type_id', $c->id)->first();
        $basePrice = 150;
        if ($ratePlan && is_array($ratePlan->pricing)) {
            $basePrice = (int) ($ratePlan->pricing['basePrice'] ?? $ratePlan->pricing['base_price'] ?? ($ratePlan->pricing['amount'] ? round($ratePlan->pricing['amount'] / 100) : 150));
        }

        $room = Room::where('room_type_id', $c->id)->first();

        return [
            'id' => (string) $c->id,
            'property_id' => (string) ($c->property_id ?? ''),
            'propertyId' => (string) ($c->property_id ?? ''),
            'room_id' => $room?->id,
            'roomId' => $room?->id,
            'base_price' => $basePrice,
            'basePrice' => $basePrice,
            'name' => (string) ($c->name ?? ''),
            'slug' => (string) ($c->slug ?? ''),
            'short_description' => $c->short_description,
            'shortDescription' => $c->short_description,
            'description' => $c->description,
            'max_adults' => (int) ($c->max_adults ?? 2),
            'maxAdults' => (int) ($c->max_adults ?? 2),
            'max_children' => (int) ($c->max_children ?? 0),
            'maxChildren' => (int) ($c->max_children ?? 0),
            'max_occupancy' => (int) ($c->max_occupancy ?? 2),
            'maxOccupancy' => (int) ($c->max_occupancy ?? 2),
            'beds' => $c->beds ?? [],
            'amenities' => $c->amenities ?? [],
            'images' => $c->images ?? [],
            'media' => $c->media ?? [],
            'property_details_html' => $c->property_details_html,
            'propertyDetailsHtml' => $c->property_details_html,
            'layout_html' => $c->layout_html,
            'layoutHtml' => $c->layout_html,
            'floorplan_media_ids' => $c->floorplan_media_ids ?? [],
            'floorplanMediaIds' => $c->floorplan_media_ids ?? [],
            'location_text' => $c->location_text,
            'locationText' => $c->location_text,
            'surroundings_html' => $c->surroundings_html,
            'surroundingsHtml' => $c->surroundings_html,
            'map_lat' => $c->map_lat !== null ? (float) $c->map_lat : null,
            'mapLat' => $c->map_lat !== null ? (float) $c->map_lat : null,
            'map_lng' => $c->map_lng !== null ? (float) $c->map_lng : null,
            'mapLng' => $c->map_lng !== null ? (float) $c->map_lng : null,
            'map_embed_url' => $c->map_embed_url,
            'mapEmbedUrl' => $c->map_embed_url,
            'welcome_hamper_included' => (bool) $c->welcome_hamper_included,
            'welcomeHamperIncluded' => (bool) $c->welcome_hamper_included,
            'welcome_hamper_description' => $c->welcome_hamper_description,
            'welcomeHamperDescription' => $c->welcome_hamper_description,
            'welcome_hamper_image_media_id' => $c->welcome_hamper_image_media_id,
            'welcomeHamperImageMediaId' => $c->welcome_hamper_image_media_id,
            'welcome_hamper_html' => $c->welcome_hamper_html,
            'welcomeHamperHtml' => $c->welcome_hamper_html,
            'amenity_ids' => $c->amenity_ids ?? [],
            'amenityIds' => $c->amenity_ids ?? [],
            'nearby_attractions' => $c->nearby_attractions ?? [],
            'nearbyAttractions' => $c->nearby_attractions ?? [],
            'bedrooms' => $c->bedrooms !== null ? (int) $c->bedrooms : null,
            'bathrooms' => $c->bathrooms !== null ? (int) $c->bathrooms : null,
            'max_dogs' => $c->max_dogs !== null ? (int) $c->max_dogs : null,
            'maxDogs' => $c->max_dogs !== null ? (int) $c->max_dogs : null,
            'status' => (string) ($c->status ?? 'ACTIVE'),
            'seo' => $c->seo ?? [],
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'updated_at' => $updatedAt,
            'updatedAt' => $updatedAt,
        ];
    }
}
