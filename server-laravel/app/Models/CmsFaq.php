<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Concerns\HasHexId;

class CmsFaq extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'question', 'answer', 'category', 'sort_order', 'status', 'version',
        'published_at', 'created_by', 'preview_token', 'preview_expires_at',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'version' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
