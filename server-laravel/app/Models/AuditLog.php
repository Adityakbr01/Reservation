<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'actor_id', 'actor_role', 'action', 'entity_type', 'entity_id',
        'before', 'after', 'metadata', 'ip', 'user_agent',
    ];

    protected $casts = [
        'before' => 'array',
        'after' => 'array',
        'metadata' => 'array',
    ];
}
