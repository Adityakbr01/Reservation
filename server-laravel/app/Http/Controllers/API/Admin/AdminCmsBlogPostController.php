<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;

class AdminCmsBlogPostController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function store()
    {
        return response()->json(['success' => true, 'data' => ['created' => true]], 201);
    }

    public function show(string $id)
    {
        return response()->json(['success' => true, 'data' => ['id' => $id]]);
    }

    public function update(string $id)
    {
        return response()->json(['success' => true, 'data' => ['updated' => true]]);
    }

    public function status(string $id)
    {
        return response()->json(['success' => true, 'data' => ['status_updated' => true]]);
    }

    public function preview(string $id)
    {
        return response()->json(['success' => true, 'data' => ['preview_url' => '']]);
    }
}
