<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;

class PublicReviewController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => []]);
    }
}
