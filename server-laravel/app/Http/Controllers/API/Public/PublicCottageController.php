<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\CmsOffer;
use App\Models\Cottage;

class PublicCottageController extends Controller
{
    public function index()
    {
        $cached = \Illuminate\Support\Facades\Cache::remember('public_active_cottages', 3600, function () {
            $cottages = Cottage::with('category')->where('status', 'ACTIVE')->get();

            // Bulk collect all media IDs across all active cottages in 1 single query
            $allMediaIds = [];
            foreach ($cottages as $c) {
                foreach ($c->media ?? [] as $m) {
                    $mid = is_array($m) ? ($m['mediaId'] ?? null) : ($m->mediaId ?? null);
                    if ($mid) $allMediaIds[] = $mid;
                }
                foreach ($c->images ?? [] as $img) {
                    $mid = is_array($img) ? ($img['mediaId'] ?? null) : ($img->mediaId ?? null);
                    if ($mid) $allMediaIds[] = $mid;
                }
                if (!empty($c->about_image_media_id)) {
                    $allMediaIds[] = $c->about_image_media_id;
                }
                if (!empty($c->dog_policy_image_media_id)) {
                    $allMediaIds[] = (string) $c->dog_policy_image_media_id;
                }
                $extrasList = is_array($c->extras) ? $c->extras : (is_string($c->extras) ? (json_decode($c->extras, true) ?? []) : []);
                foreach ($extrasList as $extra) {
                    $mid = is_array($extra) ? ($extra['imageMediaId'] ?? $extra['image_media_id'] ?? null) : ($extra->imageMediaId ?? null);
                    if ($mid) $allMediaIds[] = (string) $mid;
                }
            }

            $mediaMap = !empty($allMediaIds)
                ? \App\Models\Media::whereIn('id', array_unique($allMediaIds))->get()->keyBy('id')
                : collect();

            return $cottages->map(fn ($c) => $this->cottageData($c, $mediaMap))->all();
        });

        return response()->json([
            'success' => true,
            'data' => $cached,
        ])->header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    }

    public function showBySlug(string $slug)
    {
        $cottage = Cottage::with('category')->where(function ($query) use ($slug) {
            $query->where('slug', $slug)
                  ->orWhere('id', $slug);
        })->where('status', 'ACTIVE')->first();

        if (! $cottage) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COTTAGE_NOT_FOUND', 'message' => 'Cottage not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->cottageData($cottage),
        ])->header('Cache-Control', 'public, max-age=5, s-maxage=10, must-revalidate');
    }

    public function offers(string $id)
    {
        $offers = CmsOffer::where('status', 'PUBLISHED')->get();

        return response()->json([
            'success' => true,
            'data' => $offers->map(fn ($o) => [
                'id' => $o->id,
                'title' => $o->title,
                'description' => $o->description,
                'valid_from' => $o->valid_from,
                'valid_until' => $o->valid_until,
                'cta_label' => $o->cta_label,
                'cta_url' => $o->cta_url,
            ]),
        ]);
    }

    private function cottageData(Cottage $c, mixed $providedMediaMap = null): array
    {
        if ($providedMediaMap !== null) {
            $mediaMap = $providedMediaMap;
        } else {
            // Resolve media URLs directly so client has URLs immediately on the first response
            $allMediaIds = [];
            foreach ($c->media ?? [] as $m) {
                $mid = is_array($m) ? ($m['mediaId'] ?? null) : ($m->mediaId ?? null);
                if ($mid) $allMediaIds[] = $mid;
            }
            foreach ($c->images ?? [] as $img) {
                $mid = is_array($img) ? ($img['mediaId'] ?? null) : ($img->mediaId ?? null);
                if ($mid) $allMediaIds[] = $mid;
            }
            if (!empty($c->about_image_media_id)) {
                $allMediaIds[] = $c->about_image_media_id;
            }
            if (!empty($c->dog_policy_image_media_id)) {
                $allMediaIds[] = (string) $c->dog_policy_image_media_id;
            }
            $extrasList = is_array($c->extras) ? $c->extras : (is_string($c->extras) ? (json_decode($c->extras, true) ?? []) : []);
            foreach ($extrasList as $extra) {
                $mid = is_array($extra) ? ($extra['imageMediaId'] ?? $extra['image_media_id'] ?? null) : ($extra->imageMediaId ?? null);
                if ($mid) $allMediaIds[] = (string) $mid;
            }
            $mediaMap = [];
            if (!empty($allMediaIds)) {
                $mediaMap = \App\Models\Media::whereIn('id', array_unique($allMediaIds))
                    ->get()
                    ->keyBy('id');
            }
        }

        $resolvedMedia = array_map(function ($m) use ($mediaMap) {
            $item = is_array($m) ? $m : (array) $m;
            $mid = $item['mediaId'] ?? null;
            if ($mid && isset($mediaMap[$mid])) {
                $item['url'] = $mediaMap[$mid]->url;
                $item['altText'] = $item['altText'] ?? $mediaMap[$mid]->alt;
            }
            return $item;
        }, $c->media ?? []);

        $resolvedImages = array_map(function ($img) use ($mediaMap) {
            $item = is_array($img) ? $img : (array) $img;
            $mid = $item['mediaId'] ?? null;
            if ($mid && isset($mediaMap[$mid])) {
                $item['url'] = $mediaMap[$mid]->url;
                $item['altText'] = $item['altText'] ?? $mediaMap[$mid]->alt;
            }
            return $item;
        }, $c->images ?? []);

        $catId = $c->category_id ?? ($c->home_section === 'section_2' ? 'cat_estate_collection' : 'cat_farm_cottages');
        $catObj = null;
        if ($c->relationLoaded('category') && $c->category) {
            $catObj = [
                'id' => $c->category->id,
                'name' => $c->category->name,
                'slug' => $c->category->slug,
                'allowMultiple' => (bool) $c->category->allow_multiple,
                'description' => $c->category->description,
            ];
        } else {
            $isEstate = ($catId === 'cat_estate_collection' || $c->home_section === 'section_2');
            $catObj = [
                'id' => $catId,
                'name' => $isEstate ? 'The Estate Collection' : 'Farm Cottages',
                'slug' => $isEstate ? 'the-estate-collection' : 'farm-cottages',
                'allowMultiple' => !$isEstate,
                'description' => $isEstate ? 'Exclusive estate properties and private retreats.' : 'Charming holiday cottages at Home Farm.',
            ];
        }

        $cDogFees = is_array($c->dog_fees) ? $c->dog_fees : (is_string($c->dog_fees) ? (json_decode($c->dog_fees, true) ?? []) : []);
        $effectiveMaxDogs = $c->max_dogs !== null ? (int) $c->max_dogs : 0;
        if ($c->dog_policy_enabled === false) {
            $effectiveMaxDogs = 0;
            $cDogFees = [];
        } elseif (!empty($cDogFees)) {
            $maxCustom = max(array_map('intval', array_keys($cDogFees)));
            $effectiveMaxDogs = max($effectiveMaxDogs, $maxCustom);
        }

        return [
            'id' => (string) $c->id,
            'property_id' => (string) ($c->property_id ?? ''),
            'propertyId' => (string) ($c->property_id ?? ''),
            'category_id' => $catId,
            'categoryId' => $catId,
            'category' => $catObj,
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
            'about_image_url' => (!empty($c->about_image_media_id) && isset($mediaMap[$c->about_image_media_id])) ? $mediaMap[$c->about_image_media_id]->url : null,
            'aboutImageUrl' => (!empty($c->about_image_media_id) && isset($mediaMap[$c->about_image_media_id])) ? $mediaMap[$c->about_image_media_id]->url : null,
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
            'images' => $resolvedImages,
            'media' => $resolvedMedia,
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
            'max_dogs' => $effectiveMaxDogs,
            'maxDogs' => $effectiveMaxDogs,
            'dog_policy_enabled' => $c->dog_policy_enabled === false || $effectiveMaxDogs <= 0 ? false : (bool) ($c->dog_policy_enabled ?? ($effectiveMaxDogs > 0)),
            'dogPolicyEnabled' => $c->dog_policy_enabled === false || $effectiveMaxDogs <= 0 ? false : (bool) ($c->dog_policy_enabled ?? ($effectiveMaxDogs > 0)),
            'dog_policy_title' => $c->dog_policy_title,
            'dogPolicyTitle' => $c->dog_policy_title,
            'dog_policy_subtitle' => $c->dog_policy_subtitle,
            'dogPolicySubtitle' => $c->dog_policy_subtitle,
            'dog_fee' => $c->dog_fee !== null ? (float) $c->dog_fee : 70.00,
            'dogFee' => $c->dog_fee !== null ? (float) $c->dog_fee : 70.00,
            'dog_fees' => $cDogFees,
            'dogFees' => $cDogFees,
            'dog_policy_image_media_id' => $c->dog_policy_image_media_id,
            'dogPolicyImageMediaId' => $c->dog_policy_image_media_id,
            'dog_policy_image_url' => (!empty($c->dog_policy_image_media_id) && isset($mediaMap[$c->dog_policy_image_media_id])) ? $mediaMap[$c->dog_policy_image_media_id]->url : null,
            'dogPolicyImageUrl' => (!empty($c->dog_policy_image_media_id) && isset($mediaMap[$c->dog_policy_image_media_id])) ? $mediaMap[$c->dog_policy_image_media_id]->url : null,
            'extras' => array_map(function ($extra) use ($mediaMap) {
                $ex = is_array($extra) ? $extra : (array) $extra;
                $mid = $ex['imageMediaId'] ?? $ex['image_media_id'] ?? null;
                if ($mid) {
                    $midStr = (string) $mid;
                    if (isset($mediaMap[$midStr])) {
                        $ex['imageUrl'] = $mediaMap[$midStr]->url;
                        $ex['image_url'] = $mediaMap[$midStr]->url;
                    } else {
                        $med = \App\Models\Media::find($midStr);
                        if ($med) {
                            $ex['imageUrl'] = $med->url;
                            $ex['image_url'] = $med->url;
                        }
                    }
                }
                return $ex;
            }, is_array($c->extras) ? $c->extras : (is_string($c->extras) ? (json_decode($c->extras, true) ?? []) : [])),
            'status' => (string) ($c->status ?? 'ACTIVE'),
            'seo' => $c->seo ?? [],
        ];
    }
}
