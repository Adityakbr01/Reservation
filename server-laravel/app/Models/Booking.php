<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Models\Concerns\HasHexId;

class Booking extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'booking_number', 'property_id', 'user_id', 'status',
        'payment_status', 'check_in', 'check_out', 'guests', 'contact',
        'pricing', 'cancellation', 'hold', 'stay', 'source', 'notes',
        'reminder_sent',
    ];

    protected $casts = [
        'guests' => 'array',
        'contact' => 'array',
        'pricing' => 'array',
        'cancellation' => 'array',
        'hold' => 'array',
        'stay' => 'array',
        'reminder_sent' => 'boolean',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(BookingItem::class, 'booking_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'booking_id');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class, 'booking_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'booking_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'booking_id');
    }
}
