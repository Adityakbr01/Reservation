<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enquiry extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'title', 'first_name', 'last_name', 'email', 'telephone',
        'holiday_budget', 'party_size', 'bedrooms', 'from_date', 'to_date',
        'specific_location', 'dog_friendly', 'details', 'room_type_id',
        'status',
    ];

    protected $casts = [
        'party_size' => 'integer',
        'bedrooms' => 'integer',
        'dog_friendly' => 'boolean',
    ];

    public function roomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class, 'room_type_id');
    }
}
