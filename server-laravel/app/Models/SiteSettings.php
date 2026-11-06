<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Models\Concerns\HasHexId;

class SiteSettings extends Model
{
    use HasHexId;
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

    public static function defaultSettings(): self
    {
        return static::firstOrCreate(
            ['key' => 'site'],
            [
                'id' => '6ac0cc40a287cfd3dfbbf8a7',
                'property_name' => 'Hamptworth Stays',
                'phone' => '+44 1794 390155',
                'support_email' => 'hamptworthstays@gmail.com',
                'address' => 'Home Farm, Hamptworth, Salisbury SP5 2DU',
                'timezone' => 'Europe/London',
                'currency' => 'GBP',
                'check_in_time' => '16:00',
                'check_out_time' => '10:00',
                'reminder_hours_before' => 24,
                'why_book_with_us' => [
                    ['title' => 'Charming Luxury Cottages', 'text' => 'Set on the edge of the New Forest.'],
                    ['title' => 'Complimentary Welcome Hamper', 'text' => 'Fresh local treats on arrival.'],
                    ['title' => 'Golf & Country Club Facilities', 'text' => 'Direct access to Hamptworth Golf & Country Club.'],
                ],
            ]
        );
    }
}
