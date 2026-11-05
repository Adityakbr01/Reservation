<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'provider', 'stripe_event_id', 'event_type', 'received_at',
        'processed_at', 'processing_status',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
    ];
}
