<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;

class PublicSettingsController extends Controller
{
    public function show()
    {
        $settings = SiteSettings::first() ?? SiteSettings::defaultSettings();

        $rawWhy = $settings->why_book_with_us;
        $whyHeading = 'Why book with us?';
        $whyItems = [];
        if (is_array($rawWhy)) {
            if (isset($rawWhy['items']) && is_array($rawWhy['items'])) {
                $whyHeading = $rawWhy['heading'] ?? 'Why book with us?';
                $whyItems = $rawWhy['items'];
            } else {
                $whyItems = $rawWhy;
            }
        }

        $mediaIds = [];
        foreach ($whyItems as $it) {
            if (is_array($it)) {
                $mid = $it['imageMediaId'] ?? $it['image_media_id'] ?? null;
                if ($mid) {
                    $mediaIds[] = $mid;
                }
            }
        }
        $mediaMap = !empty($mediaIds) ? \App\Models\Media::whereIn('id', array_unique($mediaIds))->get()->keyBy('id') : collect();

        $resolvedWhyItems = [];
        foreach ($whyItems as $it) {
            if (!is_array($it)) continue;
            $mid = $it['imageMediaId'] ?? $it['image_media_id'] ?? null;
            $imageUrl = ($mid && isset($mediaMap[$mid])) ? $mediaMap[$mid]->url : ($it['imageUrl'] ?? $it['image_url'] ?? null);

            $resolvedWhyItems[] = [
                'title' => (string) ($it['title'] ?? ''),
                'text' => $it['text'] ?? null,
                'icon' => $it['icon'] ?? null,
                'imageMediaId' => $mid,
                'image_media_id' => $mid,
                'imageUrl' => $imageUrl,
                'image_url' => $imageUrl,
                'badgeColor' => $it['badgeColor'] ?? $it['badge_color'] ?? null,
                'badge_color' => $it['badgeColor'] ?? $it['badge_color'] ?? null,
            ];
        }

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
                'why_book_with_us' => $resolvedWhyItems,
                'whyBookWithUs' => $resolvedWhyItems,
                'why_book_with_us_heading' => $whyHeading,
                'whyBookWithUsHeading' => $whyHeading,
                'why_book_with_us_data' => [
                    'heading' => $whyHeading,
                    'items' => $resolvedWhyItems,
                ],
                'whyBookWithUsData' => [
                    'heading' => $whyHeading,
                    'items' => $resolvedWhyItems,
                ],
                'social' => $settings->social ?? [],
                'default_seo' => $settings->default_seo ?? [],
                'defaultSeo' => $settings->default_seo ?? [],
            ],
        ]);
    }
}
