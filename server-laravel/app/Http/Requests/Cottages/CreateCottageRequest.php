<?php

namespace App\Http\Requests\Cottages;

use Illuminate\Foundation\Http\FormRequest;

class CreateCottageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:cottages,slug',
            'short_description' => 'nullable|string',
            'shortDescription' => 'nullable|string',
            'description' => 'nullable|string',
            'max_adults' => 'nullable|integer|min:1',
            'maxAdults' => 'nullable|integer|min:1',
            'max_children' => 'nullable|integer|min:0',
            'maxChildren' => 'nullable|integer|min:0',
            'max_occupancy' => 'nullable|integer|min:1',
            'maxOccupancy' => 'nullable|integer|min:1',
            'bedrooms' => 'nullable|integer|min:0',
            'bathrooms' => 'nullable|numeric|min:0',
            'max_dogs' => 'nullable|integer|min:0',
            'maxDogs' => 'nullable|integer|min:0',
            'beds' => 'nullable|array',
            'amenities' => 'nullable|array',
            'amenity_ids' => 'nullable|array',
            'amenityIds' => 'nullable|array',
            'images' => 'nullable|array',
            'media' => 'nullable|array',
            'property_details_html' => 'nullable|string',
            'propertyDetailsHtml' => 'nullable|string',
            'layout_html' => 'nullable|string',
            'layoutHtml' => 'nullable|string',
            'floorplan_media_ids' => 'nullable|array',
            'floorplanMediaIds' => 'nullable|array',
            'location_text' => 'nullable|string',
            'locationText' => 'nullable|string',
            'surroundings_html' => 'nullable|string',
            'surroundingsHtml' => 'nullable|string',
            'map_lat' => 'nullable|numeric',
            'mapLat' => 'nullable|numeric',
            'map_lng' => 'nullable|numeric',
            'mapLng' => 'nullable|numeric',
            'map_embed_url' => 'nullable|string',
            'mapEmbedUrl' => 'nullable|string',
            'welcome_hamper_included' => 'nullable',
            'welcomeHamperIncluded' => 'nullable',
            'welcome_hamper_description' => 'nullable|string',
            'welcomeHamperDescription' => 'nullable|string',
            'welcome_hamper_image_media_id' => 'nullable|string',
            'welcomeHamperImageMediaId' => 'nullable|string',
            'welcome_hamper_html' => 'nullable|string',
            'welcomeHamperHtml' => 'nullable|string',
            'nearby_attractions' => 'nullable|array',
            'nearbyAttractions' => 'nullable|array',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE,DRAFT',
            'base_price' => 'nullable|numeric|min:0',
            'basePrice' => 'nullable|numeric|min:0',
            'property_id' => 'nullable|string',
            'propertyId' => 'nullable|string',
            'seo' => 'nullable|array',
        ];
    }
}
