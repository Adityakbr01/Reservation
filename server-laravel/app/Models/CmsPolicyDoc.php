<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CmsPolicyDoc extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'key', 'title', 'body', 'status', 'version', 'published_at',
        'created_by', 'preview_token', 'preview_expires_at',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
