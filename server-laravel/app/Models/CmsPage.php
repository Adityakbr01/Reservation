<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Concerns\HasHexId;

class CmsPage extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'title', 'slug', 'excerpt', 'sections', 'featured_image_media_id',
        'seo', 'status', 'version', 'published_at', 'created_by',
        'preview_token', 'preview_expires_at',
    ];

    protected $casts = [
        'sections' => 'array',
        'seo' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
