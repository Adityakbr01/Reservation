<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;

class PublicSettingsController extends Controller
{
    public function show()
    {
        $settings = SiteSettings::first();

        return response()->json([
            'success' => true,
            'data' => $settings ? [
                'property_name' => $settings->property_name,
                'currency' => $settings->currency,
            ] : [],
        ]);
    }
}
