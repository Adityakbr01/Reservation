<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomType extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'property_id', 'name', 'slug', 'short_description', 'description',
        'max_adults', 'max_children', 'max_occupancy', 'beds', 'amenities',
        'images', 'media', 'property_details_html', 'layout_html',
        'floorplan_media_ids', 'location_text', 'surroundings_html',
        'map_lat', 'map_lng', 'map_embed_url', 'welcome_hamper_included',
        'welcome_hamper_description', 'welcome_hamper_image_media_id',
        'welcome_hamper_html', 'amenity_ids', 'nearby_attractions',
        'bedrooms', 'bathrooms', 'max_dogs', 'status', 'seo',
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
        'amenity_ids' => 'array',
        'nearby_attractions' => 'array',
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

    public function bookingItems(): HasMany
    {
        return $this->hasMany(BookingItem::class, 'room_type_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'room_type_id');
    }

    public function enquiries(): HasMany
    {
        return $this->hasMany(Enquiry::class, 'room_type_id');
    }
}
