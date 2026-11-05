<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;

class AdminCmsPolicyController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function upsert()
    {
        return response()->json(['success' => true, 'data' => ['upserted' => true]]);
    }

    public function status(string $key)
    {
        return response()->json(['success' => true, 'data' => ['status_updated' => true]]);
    }
}
