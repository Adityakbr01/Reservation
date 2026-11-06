<?php

namespace App\Models;

use App\Models\Concerns\HasHexId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'property_id', 'code', 'normalized_code', 'discount_type',
        'discount_value', 'max_discount', 'minimum_booking_amount',
        'valid_from', 'valid_until', 'usage_limit', 'usage_count',
        'per_user_limit', 'applicable_room_type_ids', 'status', 'created_by',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'minimum_booking_amount' => 'decimal:2',
        'applicable_room_type_ids' => 'array',
        'usage_count' => 'integer',
        'usage_limit' => 'integer',
        'per_user_limit' => 'integer',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function cmsOffers(): HasMany
    {
        return $this->hasMany(CmsOffer::class, 'coupon_id');
    }
}
