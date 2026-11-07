<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\SiteSettings;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    public function show()
    {
        $settings = SiteSettings::first() ?? SiteSettings::defaultSettings();

        return response()->json([
            'success' => true,
            'data' => $this->settingsData($settings),
        ]);
    }

    public function update(Request $request)
    {
        $settings = SiteSettings::first() ?? SiteSettings::defaultSettings();
        $input = $request->all();

        $data = [];
        if (array_key_exists('propertyName', $input) || array_key_exists('property_name', $input)) {
            $data['property_name'] = $input['propertyName'] ?? $input['property_name'] ?? 'Hamptworth Stays';
        }
        if (array_key_exists('logoMediaId', $input) || array_key_exists('logo_media_id', $input)) {
            $data['logo_media_id'] = $input['logoMediaId'] ?? $input['logo_media_id'] ?? null;
        }
        if (array_key_exists('faviconMediaId', $input) || array_key_exists('favicon_media_id', $input)) {
            $data['favicon_media_id'] = $input['faviconMediaId'] ?? $input['favicon_media_id'] ?? null;
        }
        if (array_key_exists('phone', $input)) {
            $data['phone'] = $input['phone'];
        }
        if (array_key_exists('supportEmail', $input) || array_key_exists('support_email', $input)) {
            $data['support_email'] = $input['supportEmail'] ?? $input['support_email'] ?? null;
        }
        if (array_key_exists('address', $input)) {
            $data['address'] = $input['address'];
        }
        if (array_key_exists('timezone', $input)) {
            $data['timezone'] = $input['timezone'] ?? 'Europe/London';
        }
        if (array_key_exists('currency', $input)) {
            $data['currency'] = $input['currency'] ?? 'GBP';
        }
        if (array_key_exists('checkInTime', $input) || array_key_exists('check_in_time', $input)) {
            $data['check_in_time'] = $input['checkInTime'] ?? $input['check_in_time'] ?? null;
        }
        if (array_key_exists('checkOutTime', $input) || array_key_exists('check_out_time', $input)) {
            $data['check_out_time'] = $input['checkOutTime'] ?? $input['check_out_time'] ?? null;
        }
        if (array_key_exists('reminderHoursBefore', $input) || array_key_exists('reminder_hours_before', $input)) {
            $val = $input['reminderHoursBefore'] ?? $input['reminder_hours_before'];
            $data['reminder_hours_before'] = $val !== null ? (int) $val : 24;
        }
        if (array_key_exists('whyBookWithUs', $input) || array_key_exists('why_book_with_us', $input)) {
            $data['why_book_with_us'] = $input['whyBookWithUs'] ?? $input['why_book_with_us'] ?? [];
        }
        if (array_key_exists('social', $input)) {
            $data['social'] = $input['social'];
        }
        if (array_key_exists('defaultSeo', $input) || array_key_exists('default_seo', $input)) {
            $data['default_seo'] = $input['defaultSeo'] ?? $input['default_seo'];
        }

        if (! empty($data)) {
            $settings->update($data);
        }

        // Also keep Property table name in sync if propertyName changed
        if (! empty($data['property_name'])) {
            Property::query()->update(['name' => $data['property_name']]);
        }

        $fresh = $settings->fresh() ?? $settings;

        return response()->json([
            'success' => true,
            'data' => $this->settingsData($fresh),
        ]);
    }

    private function settingsData(SiteSettings $settings): array
    {
        return [
            'id' => $settings->id,
            'property_name' => $settings->property_name ?? 'Hamptworth Stays',
            'propertyName' => $settings->property_name ?? 'Hamptworth Stays',
            'logo_media_id' => $settings->logo_media_id,
            'logoMediaId' => $settings->logo_media_id,
            'favicon_media_id' => $settings->favicon_media_id,
            'faviconMediaId' => $settings->favicon_media_id,
            'phone' => $settings->phone ?? '',
            'support_email' => $settings->support_email ?? '',
            'supportEmail' => $settings->support_email ?? '',
            'address' => $settings->address ?? '',
            'timezone' => $settings->timezone ?? 'Europe/London',
            'currency' => $settings->currency ?? 'GBP',
            'check_in_time' => $settings->check_in_time ?? '16:00',
            'checkInTime' => $settings->check_in_time ?? '16:00',
            'check_out_time' => $settings->check_out_time ?? '10:00',
            'checkOutTime' => $settings->check_out_time ?? '10:00',
            'reminder_hours_before' => (int) ($settings->reminder_hours_before ?? 24),
            'reminderHoursBefore' => (int) ($settings->reminder_hours_before ?? 24),
            'why_book_with_us' => $settings->why_book_with_us ?? [],
            'whyBookWithUs' => $settings->why_book_with_us ?? [],
            'social' => $settings->social ?? [],
            'default_seo' => $settings->default_seo ?? [],
            'defaultSeo' => $settings->default_seo ?? [],
        ];
    }
}
