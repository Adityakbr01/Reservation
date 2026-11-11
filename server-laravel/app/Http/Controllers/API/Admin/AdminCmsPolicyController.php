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

        if ($docs->isEmpty()) {
            try {
                $terms = CmsPolicyDoc::create([
                    'id' => bin2hex(random_bytes(12)),
                    'key' => 'TERMS',
                    'title' => 'Booking Conditions & Terms',
                    'body' => '<p>Please read our booking terms and conditions carefully before reserving your cottage stay with Hamptworth Stays.</p>',
                    'status' => 'PUBLISHED',
                    'version' => 1,
                    'published_at' => now(),
                ]);
                $privacy = CmsPolicyDoc::create([
                    'id' => bin2hex(random_bytes(12)),
                    'key' => 'PRIVACY',
                    'title' => 'Privacy Notice & Policy',
                    'body' => '<p>At Hamptworth Stays, we respect your privacy and protect your personal information.</p>',
                    'status' => 'PUBLISHED',
                    'version' => 1,
                    'published_at' => now(),
                ]);
                $docs = collect([$terms, $privacy]);
            } catch (\Throwable $e) {
                // If create fails due to DB constraints or permissions, fallback to empty collection
            }
        }

        return response()->json([
            'success' => true,
            'data' => $docs,
        ]);
    }

    public function upsert(Request $request)
    {
        $rawKey = $request->input('key') ?? $request->input('slug') ?? 'TERMS';
        $cleanKey = strtoupper(trim(preg_replace('/[^A-Za-z0-9_]/', '_', (string) $rawKey)));
        $cleanKey = substr($cleanKey, 0, 60);

        if (empty($cleanKey)) {
            $cleanKey = 'POLICY_' . strtoupper(bin2hex(random_bytes(3)));
        }

        $doc = CmsPolicyDoc::whereRaw('UPPER(`key`) = ?', [$cleanKey])->first();

        if (! $doc) {
            $doc = new CmsPolicyDoc();
            $doc->id = bin2hex(random_bytes(12));
            $doc->key = $cleanKey;
            $doc->version = 1;
        } else {
            $doc->version = (int) $request->input('version', ($doc->version ?? 1) + 1);
        }

        $defaultTitle = ucwords(str_replace('_', ' ', strtolower($cleanKey)));
        $newTitle = $request->input('title');
        $doc->title = (! empty($newTitle) && trim((string) $newTitle) !== '')
            ? trim((string) $newTitle)
            : ($doc->title ?: $defaultTitle);

        // Extract body safely and ensure it is NEVER null for MySQL NOT NULL constraint
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
        if ($body === null || trim((string) $body) === '') {
            $body = '<p></p>';
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
        $cleanKey = strtoupper(trim($key));
        $doc = CmsPolicyDoc::whereRaw('UPPER(`key`) = ?', [$cleanKey])->first();

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
        $cleanKey = strtoupper(trim($key));
        $doc = CmsPolicyDoc::whereRaw('UPPER(`key`) = ?', [$cleanKey])->first();

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

