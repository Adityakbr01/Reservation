<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;

class AdminEnquiriesController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => []]);
    }
}
