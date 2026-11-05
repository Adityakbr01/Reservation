<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;

class AdminSettingsController extends Controller
{
    public function show()
    {
        $settings = SiteSettings::first();

        return response()->json([
            'success' => true,
            'data' => $settings ? [
                'id' => $settings->id,
                'property_name' => $settings->property_name,
                'currency' => $settings->currency,
                'timezone' => $settings->timezone,
            ] : [],
        ]);
    }

    public function update()
    {
        return response()->json([
            'success' => true,
            'data' => ['updated' => true],
        ]);
    }
}
