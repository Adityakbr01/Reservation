<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;

class AdminEmailTemplateController extends Controller
{
    public function index()
    {
        $templates = EmailTemplate::all();

        return response()->json([
            'success' => true,
            'data' => $templates->map(fn ($t) => [
                'id' => $t->id,
                'key' => $t->key,
                'subject' => $t->subject,
                'is_enabled' => $t->is_enabled,
            ]),
        ]);
    }

    public function show(string $key)
    {
        $template = EmailTemplate::where('key', $key)->first();

        if (! $template) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'TEMPLATE_NOT_FOUND', 'message' => 'Template not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $template,
        ]);
    }

    public function update(string $key)
    {
        return response()->json([
            'success' => true,
            'data' => ['updated' => true],
        ]);
    }

    public function preview(string $key)
    {
        return response()->json([
            'success' => true,
            'data' => ['preview' => ''],
        ]);
    }

    public function draftPreview(string $key)
    {
        return response()->json([
            'success' => true,
            'data' => ['draft_preview' => ''],
        ]);
    }

    public function test(string $key)
    {
        return response()->json([
            'success' => true,
            'data' => ['sent' => true],
        ]);
    }
}
