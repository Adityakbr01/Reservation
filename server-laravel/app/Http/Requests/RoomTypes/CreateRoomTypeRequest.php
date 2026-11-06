<?php

namespace App\Http\Requests\RoomTypes;

use Illuminate\Foundation\Http\FormRequest;

class CreateRoomTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $map = [
            'shortDescription' => 'short_description',
            'maxAdults' => 'max_adults',
            'maxChildren' => 'max_children',
            'maxOccupancy' => 'max_occupancy',
            'propertyDetailsHtml' => 'property_details_html',
            'layoutHtml' => 'layout_html',
            'floorplanMediaIds' => 'floorplan_media_ids',
            'locationText' => 'location_text',
            'surroundingsHtml' => 'surroundings_html',
            'mapLat' => 'map_lat',
            'mapLng' => 'map_lng',
            'mapEmbedUrl' => 'map_embed_url',
            'welcomeHamperIncluded' => 'welcome_hamper_included',
            'welcomeHamperDescription' => 'welcome_hamper_description',
            'welcomeHamperImageMediaId' => 'welcome_hamper_image_media_id',
            'welcomeHamperHtml' => 'welcome_hamper_html',
            'amenityIds' => 'amenity_ids',
            'nearbyAttractions' => 'nearby_attractions',
            'maxDogs' => 'max_dogs',
        ];

        $merges = [];
        $all = $this->all();
        foreach ($map as $camel => $snake) {
            if (array_key_exists($camel, $all) && ! array_key_exists($snake, $all)) {
                $merges[$snake] = $all[$camel];
            }
        }

        if ($this->has('status') && is_string($this->status)) {
            $merges['status'] = strtoupper($this->status);
        }

        if (! empty($merges)) {
            $this->merge($merges);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'max_adults' => ['required', 'integer', 'min:1'],
            'max_children' => ['nullable', 'integer', 'min:0'],
            'max_occupancy' => ['required', 'integer', 'min:1'],
            'beds' => ['nullable', 'array'],
            'amenities' => ['nullable', 'array'],
            'images' => ['nullable', 'array'],
            'media' => ['nullable', 'array'],
            'property_details_html' => ['nullable', 'string'],
            'layout_html' => ['nullable', 'string'],
            'floorplan_media_ids' => ['nullable', 'array'],
            'location_text' => ['nullable', 'string'],
            'surroundings_html' => ['nullable', 'string'],
            'map_lat' => ['nullable', 'numeric'],
            'map_lng' => ['nullable', 'numeric'],
            'map_embed_url' => ['nullable', 'string'],
            'welcome_hamper_included' => ['nullable', 'boolean'],
            'welcome_hamper_description' => ['nullable', 'string'],
            'welcome_hamper_image_media_id' => ['nullable', 'string'],
            'welcome_hamper_html' => ['nullable', 'string'],
            'amenity_ids' => ['nullable', 'array'],
            'nearby_attractions' => ['nullable', 'array'],
            'bedrooms' => ['nullable', 'integer', 'min:0'],
            'bathrooms' => ['nullable', 'integer', 'min:0'],
            'max_dogs' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string'],
            'seo' => ['nullable', 'array'],
        ];
    }
}
