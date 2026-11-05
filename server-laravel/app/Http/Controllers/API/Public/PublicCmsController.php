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

    public function policy(string $key)
    {
        return response()->json(['success' => true, 'data' => ['key' => $key]]);
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
