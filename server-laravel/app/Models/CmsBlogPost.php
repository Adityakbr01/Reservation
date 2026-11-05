<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CmsBlogPost extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'title', 'slug', 'excerpt', 'content', 'featured_image_media_id',
        'author', 'category', 'tags', 'reading_minutes', 'seo', 'status',
        'version', 'published_at', 'created_by', 'preview_token',
        'preview_expires_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'seo' => 'array',
        'reading_minutes' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
