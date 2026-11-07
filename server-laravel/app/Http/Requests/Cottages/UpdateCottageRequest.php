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
            'slug' => 'sometimes|string|max:255|unique:room_types,slug,' . $id,
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
            'square_meters' => 'nullable|numeric|min:0',
            'squareMeters' => 'nullable|numeric|min:0',
            'view_type' => 'nullable|string|max:100',
            'bed_configuration' => 'nullable|string|max:255',
            'featured_image' => 'nullable|string',
            'gallery' => 'nullable|array',
            'amenity_ids' => 'nullable|array',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE,DRAFT',
            'base_price' => 'nullable|numeric|min:0',
            'basePrice' => 'nullable|numeric|min:0',
            'property_id' => 'nullable|string',
            'propertyId' => 'nullable|string',
        ];
    }
}
