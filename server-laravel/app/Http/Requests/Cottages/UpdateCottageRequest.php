<?php

namespace App\Http\Requests\Cottages;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCottageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255|unique:cottages,slug,' . $id,
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
            'dog_policy_enabled' => 'nullable',
            'dogPolicyEnabled' => 'nullable',
            'dog_policy_title' => 'nullable|string|max:160',
            'dogPolicyTitle' => 'nullable|string|max:160',
            'dog_policy_subtitle' => 'nullable|string|max:255',
            'dogPolicySubtitle' => 'nullable|string|max:255',
            'dog_fee' => 'nullable|numeric|min:0',
            'dogFee' => 'nullable|numeric|min:0',
            'dog_fees' => 'nullable',
            'dogFees' => 'nullable',
            'dog_policy_image_media_id' => 'nullable|string',
            'dogPolicyImageMediaId' => 'nullable|string',
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
            'category_id' => 'nullable|string',
            'categoryId' => 'nullable|string',
            'extras' => 'nullable|array',
            'extras.*.id' => 'nullable|string|max:120',
            'extras.*.title' => 'nullable|string|max:160',
            'extras.*.description' => 'nullable|string|max:500',
            'extras.*.price' => 'nullable|numeric|min:0',
            'extras.*.pricingType' => 'nullable|in:PER_PERSON,PER_STAY',
            'extras.*.showCounter' => 'nullable|boolean',
            'extras.*.min' => 'nullable|integer|min:0',
            'extras.*.max' => 'nullable|integer|min:0',
            'seo' => 'nullable|array',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $extras = $this->input('extras', []);
            if (!is_array($extras)) {
                return;
            }
            foreach ($extras as $index => $ex) {
                if (!is_array($ex)) {
                    continue;
                }
                $key = "extras.{$index}";
                $showCounter = $ex['showCounter'] ?? true;
                $min = isset($ex['min']) ? (int) $ex['min'] : 1;
                $max = isset($ex['max']) && $ex['max'] !== null && $ex['max'] !== '' ? (int) $ex['max'] : null;
                if ($showCounter && $max !== null && $min > $max) {
                    $validator->errors()->add("$key.max", 'Max must be greater than or equal to min.');
                }
            }
        });
    }
}
