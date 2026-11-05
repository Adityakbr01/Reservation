<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailTemplate extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'key', 'subject', 'html_body', 'text_body', 'is_enabled',
        'updated_by',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
    ];

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
