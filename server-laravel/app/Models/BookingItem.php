<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Concerns\HasHexId;

class BookingItem extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'booking_id', 'room_type_id', 'room_id', 'rate_plan_id',
        'room_name_snapshot', 'room_number_snapshot', 'rate_plan_name_snapshot',
        'check_in', 'check_out', 'guests', 'pricing',
    ];

    protected $casts = [
        'guests' => 'array',
        'pricing' => 'array',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function roomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class, 'room_type_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function ratePlan(): BelongsTo
    {
        return $this->belongsTo(RatePlan::class, 'rate_plan_id');
    }

    /**
     * Scope a query to only include booking items that actively reserve inventory.
     * Option 1: Zero Pre-Hold / Pay-First architecture.
     * Only CONFIRMED or PAID bookings block availability.
     * Drafts, HELD (unpaid checkout), CANCELLED, and EXPIRED bookings NEVER block dates.
     */
    public function scopeActiveBookings($query)
    {
        return $query->whereHas('booking', function ($q) {
            $q->whereIn('status', ['CONFIRMED', 'PAID']);
        });
    }
}
