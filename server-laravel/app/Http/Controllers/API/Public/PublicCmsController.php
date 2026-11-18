<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;

class PublicCmsController extends Controller
{
    public function page(string $slug)
    {
        return response()->json(['success' => true, 'data' => ['slug' => $slug]]);
    }

    public function blogs()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function blog(string $slug)
    {
        return response()->json(['success' => true, 'data' => ['slug' => $slug]]);
    }

    public function faqs()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function offers()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function policies()
    {
        $docs = \App\Models\CmsPolicyDoc::where('status', 'PUBLISHED')->orderBy('created_at', 'asc')->get();

        if ($docs->isEmpty()) {
            $docs = \App\Models\CmsPolicyDoc::all();
        }

        $formatted = $docs->map(fn($d) => [
            'id' => $d->id ?? null,
            'key' => $d->key,
            'title' => $d->title,
            'body' => $d->body ?? '',
            'status' => $d->status ?? 'PUBLISHED',
            'version' => (int) ($d->version ?? 1),
            'updatedAt' => $d->updated_at ? $d->updated_at->toIso8601String() : now()->toIso8601String(),
            'updated_at' => $d->updated_at ? $d->updated_at->toIso8601String() : now()->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ])->header('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200');
    }

    public function policy(string $key)
    {
        $cleanKey = strtolower(trim($key));
        $doc = \App\Models\CmsPolicyDoc::where('id', trim($key))
            ->orWhereRaw('LOWER(`key`) = ?', [$cleanKey])
            ->first();

        if ($doc) {
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $doc->id ?? null,
                    'key' => $doc->key,
                    'title' => $doc->title,
                    'body' => $doc->body ?? '',
                    'status' => $doc->status ?? 'PUBLISHED',
                    'version' => (int) ($doc->version ?? 1),
                    'updatedAt' => $doc->updated_at ? $doc->updated_at->toIso8601String() : now()->toIso8601String(),
                    'updated_at' => $doc->updated_at ? $doc->updated_at->toIso8601String() : now()->toIso8601String(),
                ],
            ])->header('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200');
        }

        return response()->json([
            'success' => false,
            'error' => ['code' => 'NOT_FOUND', 'message' => "Policy document '{$key}' not found"],
        ], 404);
    }

    public function preview(string $token)
    {
        return response()->json(['success' => true, 'data' => ['token' => $token]]);
    }

    public function sitemap()
    {
        return response('<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>', 200)
            ->header('Content-Type', 'application/xml');
    }

    public function robots()
    {
        return response("User-agent: *\nAllow: /\n", 200)
            ->header('Content-Type', 'text/plain');
    }
}
