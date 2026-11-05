<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;

class AdminCmsPageController extends Controller
{
    public function index()
    {
        $pages = CmsPage::all();

        return response()->json([
            'success' => true,
            'data' => $pages->map(fn ($p) => [
                'id' => $p->id,
                'title' => $p->title,
                'slug' => $p->slug,
                'status' => $p->status,
                'version' => $p->version,
            ]),
        ]);
    }

    public function store()
    {
        return response()->json([
            'success' => true,
            'data' => ['created' => true],
        ], 201);
    }

    public function show(string $id)
    {
        $page = CmsPage::find($id);

        if (!$page) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PAGE_NOT_FOUND', 'message' => 'Page not found'],
            ], 404);
        }

        return response()->json(['success' => true, 'data' => $page]);
    }

    public function update(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['updated' => true],
        ]);
    }

    public function status(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['status_updated' => true],
        ]);
    }

    public function preview(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['preview_url' => ''],
        ]);
    }
}
