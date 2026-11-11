<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPolicyDoc;
use Illuminate\Http\Request;

class AdminCmsPolicyController extends Controller
{
    public function index()
    {
        $docs = CmsPolicyDoc::orderBy('title', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $docs,
        ]);
    }

    public function upsert(Request $request)
    {
        $rawKey = $request->input('key') ?? $request->input('slug') ?? 'terms';
        // Normalize slug: lowercase alphanumeric, hyphens, and underscores allowed
        $cleanKey = strtolower(trim(preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) $rawKey)));
        $cleanKey = trim($cleanKey, '-_');
        $cleanKey = substr($cleanKey, 0, 60);

        if (empty($cleanKey)) {
            $cleanKey = 'policy-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }

        $id = $request->input('id');
        $previousKey = $request->input('previous_key') ?? $request->input('previousKey');

        $doc = null;
        if (! empty($id)) {
            $doc = CmsPolicyDoc::find($id);
        }
        if (! $doc && ! empty($previousKey)) {
            $prevClean = strtolower(trim($previousKey));
            $doc = CmsPolicyDoc::whereRaw('LOWER(`key`) = ?', [$prevClean])->first();
        }
        if (! $doc) {
            $doc = CmsPolicyDoc::whereRaw('LOWER(`key`) = ?', [$cleanKey])->first();
        }

        if ($doc) {
            // Check if key is being changed and if there is a collision
            if (strtolower($doc->key) !== strtolower($cleanKey)) {
                $collision = CmsPolicyDoc::where('id', '!=', $doc->id)
                    ->whereRaw('LOWER(`key`) = ?', [$cleanKey])
                    ->first();
                if ($collision) {
                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'DUPLICATE_SLUG',
                            'message' => "Policy slug '{$cleanKey}' is already in use by another policy.",
                        ],
                    ], 422);
                }
                $doc->key = $cleanKey;
            }
            $doc->version = (int) $request->input('version', ($doc->version ?? 1) + 1);
        } else {
            // Check for duplicate key on create
            $collision = CmsPolicyDoc::whereRaw('LOWER(`key`) = ?', [$cleanKey])->first();
            if ($collision) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'DUPLICATE_SLUG',
                        'message' => "Policy slug '{$cleanKey}' already exists.",
                    ],
                ], 422);
            }
            $doc = new CmsPolicyDoc();
            $doc->id = bin2hex(random_bytes(12));
            $doc->key = $cleanKey;
            $doc->version = 1;
        }

        $defaultTitle = ucwords(str_replace(['_', '-'], ' ', strtolower($cleanKey)));
        $newTitle = $request->input('title');
        $doc->title = (! empty($newTitle) && trim((string) $newTitle) !== '')
            ? trim((string) $newTitle)
            : ($doc->title ?: $defaultTitle);

        // Accept arbitrary full HTML/CSS/JS without stripping
        $body = $request->input('body');
        if ($body === null) {
            $body = $request->input('content_html');
        }
        if ($body === null) {
            $body = $request->input('content');
        }
        if ($body === null) {
            $body = $doc->body ?? '';
        }
        $doc->body = (string) $body;

        if ($request->has('status') && ! empty($request->input('status'))) {
            $doc->status = strtoupper((string) $request->input('status'));
        } elseif (! $doc->exists || empty($doc->status)) {
            $doc->status = 'PUBLISHED';
        }

        if ($doc->status === 'PUBLISHED') {
            $doc->published_at = now();
        }

        $doc->save();

        return response()->json([
            'success' => true,
            'data' => $doc,
        ]);
    }

    public function destroy(string $key)
    {
        $clean = trim($key);
        $doc = CmsPolicyDoc::where('id', $clean)
            ->orWhereRaw('LOWER(`key`) = ?', [strtolower($clean)])
            ->first();

        if ($doc) {
            $doc->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Policy deleted successfully',
        ]);
    }

    public function status(string $key, Request $request)
    {
        $clean = trim($key);
        $doc = CmsPolicyDoc::where('id', $clean)
            ->orWhereRaw('LOWER(`key`) = ?', [strtolower($clean)])
            ->first();

        if (! $doc) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Policy document not found'],
            ], 404);
        }

        $newStatus = strtoupper((string) $request->input('status', $request->input('to', 'PUBLISHED')));
        $doc->status = $newStatus;
        if ($newStatus === 'PUBLISHED') {
            $doc->published_at = now();
        }
        $doc->save();

        return response()->json([
            'success' => true,
            'data' => $doc,
        ]);
    }
}

