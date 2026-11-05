<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;

class AdminDashboardController extends Controller
{
    public function summary()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total_bookings' => 0,
                'total_revenue' => 0,
                'active_rooms' => 0,
            ],
        ]);
    }

    public function sales()
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }
}
