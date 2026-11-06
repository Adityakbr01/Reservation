<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPolicyDoc;
use Illuminate\Http\Request;

class AdminCmsPolicyController extends Controller
{
    public function index()
    {
        $docs = CmsPolicyDoc::all();

        return response()->json([
            'success' => true,
            'data' => $docs,
        ]);
    }

    public function upsert(Request $request)
    {
        $key = $request->input('key') ?? $request->input('slug') ?? 'terms';

        $doc = CmsPolicyDoc::updateOrCreate(
            ['key' => $key],
            [
                'id' => bin2hex(random_bytes(12)),
                'title' => $request->input('title', ucfirst($key)),
                'body' => $request->input('body', $request->input('content_html', '')),
                'status' => strtoupper($request->input('status', 'PUBLISHED')),
                'version' => (int) $request->input('version', 1),
                'published_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $doc,
        ]);
    }

    public function status(string $key, Request $request)
    {
        $doc = CmsPolicyDoc::where('key', $key)->first();

        if (! $doc) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Policy document not found'],
            ], 404);
        }

        $doc->update(['status' => strtoupper($request->input('status', 'PUBLISHED'))]);

        return response()->json([
            'success' => true,
            'data' => $doc,
        ]);
    }
}

