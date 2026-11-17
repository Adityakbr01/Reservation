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
use Illuminate\Support\Str;

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
        $propertyId = $request->input('property_id') ?? $request->input('propertyId');
        if (! $propertyId || ! Property::where('id', $propertyId)->exists()) {
            $propertyId = $defaultProp->id;
        }

        $name = trim((string) $request->input('name', ''));
        $slug = trim((string) $request->input('slug', ''));
        if (empty($slug)) {
            $slug = Str::slug($name) ?: ('cottage-' . bin2hex(random_bytes(3)));
        } else {
            $slug = Str::slug($slug);
        }

        // Ensure unique slug
        $baseSlug = $slug;
        $counter = 1;
        while (Cottage::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $basePrice = 150;
        if ($request->has('base_price') && $request->input('base_price') !== null && $request->input('base_price') !== '') {
            $basePrice = $request->input('base_price');
        } elseif ($request->has('basePrice') && $request->input('basePrice') !== null && $request->input('basePrice') !== '') {
            $basePrice = $request->input('basePrice');
        }

        $maxAdults = (int) ($request->input('max_adults') ?? $request->input('maxAdults') ?? 2);
        $maxChildren = (int) ($request->input('max_children') ?? $request->input('maxChildren') ?? 0);
        $rawOcc = $request->input('max_occupancy') ?? $request->input('maxOccupancy');
        $maxOccupancy = ($rawOcc !== null && (int) $rawOcc > 0) ? (int) $rawOcc : max(1, $maxAdults + $maxChildren);

        $cottage = Cottage::create([
            'id' => bin2hex(random_bytes(12)),
            'property_id' => $propertyId,
            'name' => $name,
            'slug' => $slug,
            'short_description' => $request->input('short_description') ?? $request->input('shortDescription'),
            'description' => $request->input('description'),
            'middle_description' => $request->input('middle_description') ?? $request->input('middleDescription'),
            'about_heading' => $request->input('about_heading') ?? $request->input('aboutHeading'),
            'about_text' => $request->input('about_text') ?? $request->input('aboutText'),
            'about_image_media_id' => $request->input('about_image_media_id') ?? $request->input('aboutImageMediaId'),
            'overview_bullets' => $request->input('overview_bullets') ?? $request->input('overviewBullets') ?? [],
            'section_settings' => (function() use ($request) {
                $ss = $request->input('section_settings') ?? $request->input('sectionSettings') ?? [];
                if (is_array($ss)) {
                    $ss['home_section'] = $request->input('home_section') ?? $request->input('homeSection') ?? 'section_1';
                }
                return $ss;
            })(),
            'home_section' => $request->input('home_section') ?? $request->input('homeSection') ?? 'section_1',
            'max_adults' => $maxAdults,
            'max_children' => $maxChildren,
            'max_occupancy' => $maxOccupancy,
            'bedrooms' => $request->filled('bedrooms') ? (int) $request->input('bedrooms') : null,
            'bathrooms' => $request->filled('bathrooms') ? (float) $request->input('bathrooms') : null,
            'max_dogs' => $request->filled('maxDogs') ? (int) $request->input('maxDogs') : ($request->filled('max_dogs') ? (int) $request->input('max_dogs') : 0),
            'dog_policy_enabled' => filter_var($request->input('dog_policy_enabled') ?? $request->input('dogPolicyEnabled'), FILTER_VALIDATE_BOOLEAN),
            'dog_policy_title' => $request->input('dog_policy_title') ?? $request->input('dogPolicyTitle'),
            'dog_policy_subtitle' => $request->input('dog_policy_subtitle') ?? $request->input('dogPolicySubtitle'),
            'dog_fee' => $request->filled('dog_fee') ? (float) $request->input('dog_fee') : ($request->filled('dogFee') ? (float) $request->input('dogFee') : 70.00),
            'dog_fees' => $request->input('dog_fees') ?? $request->input('dogFees') ?? [],
            'dog_policy_image_media_id' => $request->input('dog_policy_image_media_id') ?? $request->input('dogPolicyImageMediaId'),
            'extras' => $request->input('extras') ?? [],
            'beds' => $request->input('beds') ?? [],
            'amenities' => $request->input('amenities') ?? [],
            'amenity_ids' => $request->input('amenity_ids') ?? $request->input('amenityIds') ?? [],
            'images' => $request->input('images') ?? [],
            'media' => $request->input('media') ?? [],
            'property_details_html' => $request->input('property_details_html') ?? $request->input('propertyDetailsHtml'),
            'layout_html' => $request->input('layout_html') ?? $request->input('layoutHtml'),
            'floorplan_media_ids' => $request->input('floorplan_media_ids') ?? $request->input('floorplanMediaIds') ?? [],
            'location_text' => $request->input('location_text') ?? $request->input('locationText'),
            'surroundings_html' => $request->input('surroundings_html') ?? $request->input('surroundingsHtml'),
            'map_lat' => $request->filled('map_lat') ? (float) $request->input('map_lat') : ($request->filled('mapLat') ? (float) $request->input('mapLat') : null),
            'map_lng' => $request->filled('map_lng') ? (float) $request->input('map_lng') : ($request->filled('mapLng') ? (float) $request->input('mapLng') : null),
            'map_embed_url' => $request->input('map_embed_url') ?? $request->input('mapEmbedUrl'),
            'welcome_hamper_included' => filter_var($request->input('welcome_hamper_included') ?? $request->input('welcomeHamperIncluded'), FILTER_VALIDATE_BOOLEAN),
            'welcome_hamper_description' => $request->input('welcome_hamper_description') ?? $request->input('welcomeHamperDescription'),
            'welcome_hamper_image_media_id' => $request->input('welcome_hamper_image_media_id') ?? $request->input('welcomeHamperImageMediaId'),
            'welcome_hamper_html' => $request->input('welcome_hamper_html') ?? $request->input('welcomeHamperHtml'),
            'status' => $request->input('status', 'ACTIVE') ?: 'ACTIVE',
            'seo' => $request->input('seo'),
        ]);

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

        $payload = [];
        if ($request->has('name')) {
            $payload['name'] = trim((string) $request->input('name'));
        }
        if ($request->has('slug')) {
            $slug = trim((string) $request->input('slug'));
            $payload['slug'] = $slug !== '' ? Str::slug($slug) : Str::slug($payload['name'] ?? $cottage->name);
        }
        if ($request->has('short_description') || $request->has('shortDescription')) {
            $payload['short_description'] = $request->input('short_description') ?? $request->input('shortDescription');
        }
        if ($request->has('description')) {
            $payload['description'] = $request->input('description');
        }
        if ($request->has('middle_description') || $request->has('middleDescription')) {
            $payload['middle_description'] = $request->input('middle_description') ?? $request->input('middleDescription');
        }
        if ($request->has('about_heading') || $request->has('aboutHeading')) {
            $payload['about_heading'] = $request->input('about_heading') ?? $request->input('aboutHeading');
        }
        if ($request->has('about_text') || $request->has('aboutText')) {
            $payload['about_text'] = $request->input('about_text') ?? $request->input('aboutText');
        }
        if ($request->has('about_image_media_id') || $request->has('aboutImageMediaId')) {
            $payload['about_image_media_id'] = $request->input('about_image_media_id') ?? $request->input('aboutImageMediaId');
        }
        if ($request->has('overview_bullets') || $request->has('overviewBullets')) {
            $payload['overview_bullets'] = $request->input('overview_bullets') ?? $request->input('overviewBullets') ?? [];
        }
        if ($request->has('section_settings') || $request->has('sectionSettings')) {
            $payload['section_settings'] = $request->input('section_settings') ?? $request->input('sectionSettings') ?? [];
        }
        if ($request->has('home_section') || $request->has('homeSection')) {
            $homeSec = $request->input('home_section') ?? $request->input('homeSection') ?? 'section_1';
            $payload['home_section'] = $homeSec;
            $curSS = $payload['section_settings'] ?? $cottage->section_settings ?? [];
            if (is_array($curSS)) {
                $curSS['home_section'] = $homeSec;
                $payload['section_settings'] = $curSS;
            }
        }
        if ($request->has('max_adults') || $request->has('maxAdults')) {
            $payload['max_adults'] = (int) ($request->input('max_adults') ?? $request->input('maxAdults'));
        }
        if ($request->has('max_children') || $request->has('maxChildren')) {
            $payload['max_children'] = (int) ($request->input('max_children') ?? $request->input('maxChildren'));
        }
        if ($request->has('max_occupancy') || $request->has('maxOccupancy')) {
            $rawOcc = (int) ($request->input('max_occupancy') ?? $request->input('maxOccupancy'));
            if ($rawOcc <= 0) {
                $a = (int) ($payload['max_adults'] ?? $cottage->max_adults ?? 2);
                $c = (int) ($payload['max_children'] ?? $cottage->max_children ?? 0);
                $rawOcc = max(1, $a + $c);
            }
            $payload['max_occupancy'] = $rawOcc;
        }
        if ($request->has('bedrooms')) {
            $payload['bedrooms'] = $request->filled('bedrooms') ? (int) $request->input('bedrooms') : null;
        }
        if ($request->has('bathrooms')) {
            $payload['bathrooms'] = $request->filled('bathrooms') ? (float) $request->input('bathrooms') : null;
        }
        if ($request->has('max_dogs') || $request->has('maxDogs')) {
            $payload['max_dogs'] = $request->filled('maxDogs') ? (int) $request->input('maxDogs') : ($request->filled('max_dogs') ? (int) $request->input('max_dogs') : 0);
        }
        if ($request->has('dog_policy_enabled') || $request->has('dogPolicyEnabled')) {
            $payload['dog_policy_enabled'] = filter_var($request->input('dog_policy_enabled') ?? $request->input('dogPolicyEnabled'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('dog_policy_title') || $request->has('dogPolicyTitle')) {
            $payload['dog_policy_title'] = $request->input('dog_policy_title') ?? $request->input('dogPolicyTitle');
        }
        if ($request->has('dog_policy_subtitle') || $request->has('dogPolicySubtitle')) {
            $payload['dog_policy_subtitle'] = $request->input('dog_policy_subtitle') ?? $request->input('dogPolicySubtitle');
        }
        if ($request->has('dog_fee') || $request->has('dogFee')) {
            $val = $request->input('dog_fee') ?? $request->input('dogFee');
            $payload['dog_fee'] = ($val !== null && $val !== '') ? (float) $val : 70.00;
        }
        if ($request->has('dog_fees') || $request->has('dogFees')) {
            $payload['dog_fees'] = $request->input('dog_fees') ?? $request->input('dogFees') ?? [];
        }
        if ($request->has('dog_policy_image_media_id') || $request->has('dogPolicyImageMediaId')) {
            $payload['dog_policy_image_media_id'] = $request->input('dog_policy_image_media_id') ?? $request->input('dogPolicyImageMediaId');
        }
        if ($request->has('extras')) {
            $payload['extras'] = $request->input('extras') ?? [];
        }
        if ($request->has('beds')) $payload['beds'] = $request->input('beds');
        if ($request->has('amenities')) $payload['amenities'] = $request->input('amenities');
        if ($request->has('amenity_ids') || $request->has('amenityIds')) {
            $payload['amenity_ids'] = $request->input('amenity_ids') ?? $request->input('amenityIds');
        }
        if ($request->has('images')) $payload['images'] = $request->input('images');
        if ($request->has('media')) $payload['media'] = $request->input('media');
        if ($request->has('property_details_html') || $request->has('propertyDetailsHtml')) {
            $payload['property_details_html'] = $request->input('property_details_html') ?? $request->input('propertyDetailsHtml');
        }
        if ($request->has('layout_html') || $request->has('layoutHtml')) {
            $payload['layout_html'] = $request->input('layout_html') ?? $request->input('layoutHtml');
        }
        if ($request->has('floorplan_media_ids') || $request->has('floorplanMediaIds')) {
            $payload['floorplan_media_ids'] = $request->input('floorplan_media_ids') ?? $request->input('floorplanMediaIds');
        }
        if ($request->has('location_text') || $request->has('locationText')) {
            $payload['location_text'] = $request->input('location_text') ?? $request->input('locationText');
        }
        if ($request->has('surroundings_html') || $request->has('surroundingsHtml')) {
            $payload['surroundings_html'] = $request->input('surroundings_html') ?? $request->input('surroundingsHtml');
        }
        if ($request->has('map_lat') || $request->has('mapLat')) {
            $payload['map_lat'] = $request->filled('map_lat') ? (float) $request->input('map_lat') : ($request->filled('mapLat') ? (float) $request->input('mapLat') : null);
        }
        if ($request->has('map_lng') || $request->has('mapLng')) {
            $payload['map_lng'] = $request->filled('map_lng') ? (float) $request->input('map_lng') : ($request->filled('mapLng') ? (float) $request->input('mapLng') : null);
        }
        if ($request->has('map_embed_url') || $request->has('mapEmbedUrl')) {
            $payload['map_embed_url'] = $request->input('map_embed_url') ?? $request->input('mapEmbedUrl');
        }
        if ($request->has('welcome_hamper_included') || $request->has('welcomeHamperIncluded')) {
            $payload['welcome_hamper_included'] = filter_var($request->input('welcome_hamper_included') ?? $request->input('welcomeHamperIncluded'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('welcome_hamper_description') || $request->has('welcomeHamperDescription')) {
            $payload['welcome_hamper_description'] = $request->input('welcome_hamper_description') ?? $request->input('welcomeHamperDescription');
        }
        if ($request->has('welcome_hamper_image_media_id') || $request->has('welcomeHamperImageMediaId')) {
            $payload['welcome_hamper_image_media_id'] = $request->input('welcome_hamper_image_media_id') ?? $request->input('welcomeHamperImageMediaId');
        }
        if ($request->has('welcome_hamper_html') || $request->has('welcomeHamperHtml')) {
            $payload['welcome_hamper_html'] = $request->input('welcome_hamper_html') ?? $request->input('welcomeHamperHtml');
        }
        if ($request->has('status')) $payload['status'] = $request->input('status');
        if ($request->has('seo')) $payload['seo'] = $request->input('seo');

        $cottage->update($payload);

        $basePrice = null;
        if ($request->has('base_price') && $request->input('base_price') !== null && $request->input('base_price') !== '') {
            $basePrice = $request->input('base_price');
        } elseif ($request->has('basePrice') && $request->input('basePrice') !== null && $request->input('basePrice') !== '') {
            $basePrice = $request->input('basePrice');
        }
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

        $activeCurrency = \App\Models\SiteSettings::first()?->currency
            ?? \App\Models\Property::first()?->currency
            ?? 'GBP';

        $ratePlan = RatePlan::where('room_type_id', $cottage->id)->first();
        if ($basePrice !== null && $basePrice !== '') {
            $floatPrice = (float) $basePrice;
            $amountInPence = (int) round($floatPrice * 100);

            $pricing = ($ratePlan && is_array($ratePlan->pricing)) ? $ratePlan->pricing : [];
            $pricing['type'] = $pricing['type'] ?? 'PER_NIGHT';
            $pricing['amount'] = $amountInPence;
            $pricing['basePrice'] = $floatPrice;
            $pricing['base_price'] = $floatPrice;
            $pricing['currency'] = $activeCurrency;

            if ($ratePlan) {
                $ratePlan->update([
                    'pricing' => $pricing,
                    'status' => $cottage->status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                ]);
            } else {
                $slug = 'standard-' . ($cottage->slug ?? $cottage->id);
                RatePlan::create([
                    'id' => bin2hex(random_bytes(12)),
                    'property_id' => $cottage->property_id,
                    'room_type_id' => $cottage->id,
                    'cancellation_policy_id' => $defaultPolicy->id,
                    'name' => 'Standard Rate',
                    'slug' => $slug,
                    'description' => 'Standard flexible rate for ' . $cottage->name,
                    'pricing' => $pricing,
                    'restrictions' => [
                        'minStay' => 1,
                        'maxStay' => 30,
                    ],
                    'status' => 'ACTIVE',
                ]);
            }
        } elseif (! $ratePlan) {
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
                    'type' => 'PER_NIGHT',
                    'amount' => 15000,
                    'basePrice' => 150.0,
                    'base_price' => 150.0,
                    'currency' => $activeCurrency,
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
        $basePrice = 150.0;
        if ($ratePlan && is_array($ratePlan->pricing)) {
            if (isset($ratePlan->pricing['basePrice']) && is_numeric($ratePlan->pricing['basePrice'])) {
                $basePrice = (float) $ratePlan->pricing['basePrice'];
            } elseif (isset($ratePlan->pricing['base_price']) && is_numeric($ratePlan->pricing['base_price'])) {
                $basePrice = (float) $ratePlan->pricing['base_price'];
            } elseif (isset($ratePlan->pricing['amount']) && is_numeric($ratePlan->pricing['amount'])) {
                $basePrice = round(((float) $ratePlan->pricing['amount']) / 100, 2);
            }
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
            'middle_description' => $c->middle_description,
            'middleDescription' => $c->middle_description,
            'about_heading' => $c->about_heading,
            'aboutHeading' => $c->about_heading,
            'about_text' => $c->about_text,
            'aboutText' => $c->about_text,
            'about_image_media_id' => $c->about_image_media_id,
            'aboutImageMediaId' => $c->about_image_media_id,
            'about_image_url' => $c->about_image_media_id ? \App\Models\Media::find($c->about_image_media_id)?->url : null,
            'aboutImageUrl' => $c->about_image_media_id ? \App\Models\Media::find($c->about_image_media_id)?->url : null,
            'overview_bullets' => $c->overview_bullets ?? [],
            'overviewBullets' => $c->overview_bullets ?? [],
            'section_settings' => $c->section_settings ?? [],
            'sectionSettings' => $c->section_settings ?? [],
            'home_section' => $c->home_section ?? ($c->section_settings['home_section'] ?? 'section_1'),
            'homeSection' => $c->home_section ?? ($c->section_settings['home_section'] ?? 'section_1'),
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
            'dog_policy_enabled' => (bool) ($c->dog_policy_enabled ?? ($c->max_dogs > 0)),
            'dogPolicyEnabled' => (bool) ($c->dog_policy_enabled ?? ($c->max_dogs > 0)),
            'dog_policy_title' => $c->dog_policy_title,
            'dogPolicyTitle' => $c->dog_policy_title,
            'dog_policy_subtitle' => $c->dog_policy_subtitle,
            'dogPolicySubtitle' => $c->dog_policy_subtitle,
            'dog_fee' => $c->dog_fee !== null ? (float) $c->dog_fee : 70.00,
            'dogFee' => $c->dog_fee !== null ? (float) $c->dog_fee : 70.00,
            'dog_fees' => $c->dog_fees ?? [],
            'dogFees' => $c->dog_fees ?? [],
            'dog_policy_image_media_id' => $c->dog_policy_image_media_id,
            'dogPolicyImageMediaId' => $c->dog_policy_image_media_id,
            'dog_policy_image_url' => $c->dog_policy_image_media_id ? \App\Models\Media::find($c->dog_policy_image_media_id)?->url : null,
            'dogPolicyImageUrl' => $c->dog_policy_image_media_id ? \App\Models\Media::find($c->dog_policy_image_media_id)?->url : null,
            'extras' => array_map(function ($extra) {
                $ex = is_array($extra) ? $extra : (array) $extra;
                $mid = $ex['imageMediaId'] ?? $ex['image_media_id'] ?? null;
                if ($mid) {
                    $med = \App\Models\Media::find((string) $mid);
                    if ($med) {
                        $ex['imageUrl'] = $med->url;
                        $ex['image_url'] = $med->url;
                    }
                }
                return $ex;
            }, is_array($c->extras) ? $c->extras : (is_string($c->extras) ? (json_decode($c->extras, true) ?? []) : [])),
            'status' => (string) ($c->status ?? 'ACTIVE'),
            'seo' => $c->seo ?? [],
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'updated_at' => $updatedAt,
            'updatedAt' => $updatedAt,
        ];
    }
}
