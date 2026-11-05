<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSettings extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'key', 'property_name', 'logo_media_id', 'favicon_media_id',
        'phone', 'support_email', 'address', 'timezone', 'currency',
        'check_in_time', 'check_out_time', 'reminder_hours_before',
        'social', 'default_seo', 'why_book_with_us',
    ];

    protected $casts = [
        'social' => 'array',
        'default_seo' => 'array',
        'why_book_with_us' => 'array',
        'reminder_hours_before' => 'integer',
    ];
}
