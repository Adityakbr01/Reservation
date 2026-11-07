<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\CmsOffer;
use App\Models\Cottage;

class PublicCottageController extends Controller
{
    public function index()
    {
        $cottages = Cottage::where('status', 'ACTIVE')->get();

        return response()->json([
            'success' => true,
            'data' => $cottages->map(fn ($c) => $this->cottageData($c)),
        ]);
    }

    public function showBySlug(string $slug)
    {
        $cottage = Cottage::where('slug', $slug)->where('status', 'ACTIVE')->first();

        if (! $cottage) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'COTTAGE_NOT_FOUND', 'message' => 'Cottage not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->cottageData($cottage),
        ]);
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

    private function cottageData(Cottage $c): array
    {
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
        $mediaMap = [];
        if (!empty($allMediaIds)) {
            $mediaMap = \App\Models\Media::whereIn('id', array_unique($allMediaIds))
                ->get()
                ->keyBy('id');
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

        return [
            'id' => (string) $c->id,
            'property_id' => (string) ($c->property_id ?? ''),
            'propertyId' => (string) ($c->property_id ?? ''),
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
            'max_dogs' => $c->max_dogs !== null ? (int) $c->max_dogs : null,
            'maxDogs' => $c->max_dogs !== null ? (int) $c->max_dogs : null,
            'status' => (string) ($c->status ?? 'ACTIVE'),
            'seo' => $c->seo ?? [],
        ];
    }
}
