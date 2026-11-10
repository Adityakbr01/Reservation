<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Models\Concerns\HasHexId;

class Payment extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'booking_id', 'user_id', 'provider', 'provider_payment_intent_id',
        'provider_checkout_session_id', 'amount', 'currency', 'status',
        'failure_code', 'failure_message', 'paid_at', 'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
        'paid_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class, 'payment_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'payment_id');
    }
}
