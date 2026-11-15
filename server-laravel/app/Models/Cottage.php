<?php

namespace App\Models;

use App\Models\Concerns\HasHexId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cottage extends Model
{
    use HasHexId;

    protected $table = 'cottages';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'property_id', 'name', 'slug', 'short_description', 'description',
        'middle_description', 'about_heading', 'about_text', 'about_image_media_id',
        'overview_bullets', 'section_settings',
        'max_adults', 'max_children', 'max_occupancy', 'beds', 'amenities',
        'images', 'media', 'property_details_html', 'layout_html',
        'floorplan_media_ids', 'location_text', 'surroundings_html',
        'map_lat', 'map_lng', 'map_embed_url', 'welcome_hamper_included',
        'welcome_hamper_description', 'welcome_hamper_image_media_id',
        'welcome_hamper_html', 'amenity_ids', 'nearby_attractions',
        'bedrooms', 'bathrooms', 'max_dogs',
        'dog_policy_enabled', 'dog_policy_title', 'dog_policy_subtitle', 'dog_fee', 'dog_policy_image_media_id',
        'extras',
        'status', 'seo',
    ];

    protected $casts = [
        'beds' => 'array',
        'amenities' => 'array',
        'images' => 'array',
        'media' => 'array',
        'floorplan_media_ids' => 'array',
        'map_lat' => 'float',
        'map_lng' => 'float',
        'welcome_hamper_included' => 'boolean',
        'dog_policy_enabled' => 'boolean',
        'dog_fee' => 'float',
        'extras' => 'array',
        'amenity_ids' => 'array',
        'nearby_attractions' => 'array',
        'overview_bullets' => 'array',
        'section_settings' => 'array',
        'seo' => 'array',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class, 'room_type_id');
    }

    public function ratePlans(): HasMany
    {
        return $this->hasMany(RatePlan::class, 'room_type_id');
    }
}
