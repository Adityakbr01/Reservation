<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'property_id', 'room_type_id', 'name', 'room_number', 'floor',
        'status', 'condition', 'notes',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function roomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class, 'room_type_id');
    }

    public function availabilityBlocks(): HasMany
    {
        return $this->hasMany(AvailabilityBlock::class, 'room_id');
    }

    public function bookingItems(): HasMany
    {
        return $this->hasMany(BookingItem::class, 'room_id');
    }
}
