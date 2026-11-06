<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\Request;

class PublicNewsletterController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function subscribe(Request $request)
    {
        $email = trim((string) $request->input('email'));
        if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_EMAIL', 'message' => 'A valid email is required'],
            ], 422);
        }

        $normalized = strtoupper($email);
        $name = $request->input('name');
        $source = $request->input('source', 'website');

        $existing = NewsletterSubscriber::where('normalized_email', $normalized)->first();
        if ($existing) {
            $existing->status = 'SUBSCRIBED';
            if ($name) {
                $existing->name = $name;
            }
            $existing->save();

            return response()->json(['success' => true, 'data' => $existing]);
        }

        $subscriber = NewsletterSubscriber::create([
            'id' => bin2hex(random_bytes(12)),
            'email' => $email,
            'normalized_email' => $normalized,
            'name' => $name,
            'source' => $source,
            'status' => 'SUBSCRIBED',
            'unsubscribe_token' => bin2hex(random_bytes(32)),
        ]);

        return response()->json(['success' => true, 'data' => $subscriber], 201);
    }
}
