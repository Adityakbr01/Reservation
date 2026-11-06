<?php

namespace App\Models;

use App\Models\Concerns\HasHexId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'name', 'slug', 'description', 'contact', 'map_embed_url',
        'check_in_time', 'check_out_time', 'timezone', 'currency', 'status',
    ];

    protected $casts = [
        'contact' => 'array',
    ];

    public static function defaultProperty(): self
    {
        return static::firstOrCreate(
            ['id' => '6ac0cc41a287cfd3dfbbf8a9'],
            [
                'name' => 'Hamptworth Stays',
                'slug' => 'hamptworth-stays',
                'description' => 'Luxury holiday cottages in Hamptworth, Hampshire',
                'check_in_time' => '14:00',
                'check_out_time' => '12:00',
                'timezone' => 'Europe/London',
                'currency' => 'GBP',
                'status' => 'ACTIVE',
            ]
        );
    }

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
