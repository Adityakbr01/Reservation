<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Concerns\HasHexId;

class CmsOffer extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'title', 'slug', 'description', 'image_media_id', 'valid_from',
        'valid_until', 'cta_label', 'cta_url', 'coupon_id', 'seo', 'status',
        'version', 'published_at', 'created_by', 'preview_token',
        'preview_expires_at',
    ];

    protected $casts = [
        'seo' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }
}
