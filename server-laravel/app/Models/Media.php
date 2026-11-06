<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Concerns\HasHexId;

class Media extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'file_name', 'url', 'storage_key', 'storage_provider', 'legacy_url',
        'legacy_storage_key', 'mime', 'kind', 'folder', 'width', 'height',
        'duration_sec', 'alt', 'caption', 'size', 'position', 'created_by',
    ];

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'duration_sec' => 'float',
        'size' => 'integer',
        'position' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
