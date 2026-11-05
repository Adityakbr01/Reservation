<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Property extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name', 'slug', 'description', 'contact', 'map_embed_url',
        'check_in_time', 'check_out_time', 'timezone', 'currency', 'status',
    ];

    protected $casts = [
        'contact' => 'array',
    ];

    public function roomTypes(): HasMany
    {
        return $this->hasMany(RoomType::class, 'property_id');
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class, 'property_id');
    }

    public function ratePlans(): HasMany
    {
        return $this->hasMany(RatePlan::class, 'property_id');
    }

    public function dailyPrices(): HasMany
    {
        return $this->hasMany(DailyPrice::class, 'property_id');
    }

    public function cancellationPolicies(): HasMany
    {
        return $this->hasMany(CancellationPolicy::class, 'property_id');
    }

    public function availabilityBlocks(): HasMany
    {
        return $this->hasMany(AvailabilityBlock::class, 'property_id');
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class, 'property_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'property_id');
    }
}
