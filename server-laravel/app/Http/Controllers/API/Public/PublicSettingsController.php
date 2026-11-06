<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;

class PublicSettingsController extends Controller
{
    public function show()
    {
        $settings = SiteSettings::first() ?? SiteSettings::defaultSettings();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $settings->id,
                'property_name' => $settings->property_name,
                'propertyName' => $settings->property_name,
                'logo_media_id' => $settings->logo_media_id,
                'logoMediaId' => $settings->logo_media_id,
                'favicon_media_id' => $settings->favicon_media_id,
                'faviconMediaId' => $settings->favicon_media_id,
                'phone' => $settings->phone,
                'support_email' => $settings->support_email,
                'supportEmail' => $settings->support_email,
                'address' => $settings->address,
                'currency' => $settings->currency,
                'timezone' => $settings->timezone,
                'check_in_time' => $settings->check_in_time,
                'checkInTime' => $settings->check_in_time,
                'check_out_time' => $settings->check_out_time,
                'checkOutTime' => $settings->check_out_time,
                'reminder_hours_before' => (int) ($settings->reminder_hours_before ?? 24),
                'reminderHoursBefore' => (int) ($settings->reminder_hours_before ?? 24),
                'why_book_with_us' => $settings->why_book_with_us ?? [],
                'whyBookWithUs' => $settings->why_book_with_us ?? [],
                'social' => $settings->social ?? [],
                'default_seo' => $settings->default_seo ?? [],
                'defaultSeo' => $settings->default_seo ?? [],
            ],
        ]);
    }
}
