<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\WebhookEvent;
use App\Services\StripeWebhookService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StripeWebhookController extends Controller
{
    public function __construct(private readonly StripeWebhookService $webhookService) {}

    public function handle(Request $request)
    {
        $event = $this->webhookService->verify(
            $request->getContent(),
            (string) $request->header('Stripe-Signature', '')
        );

        if (! WebhookEvent::where('stripe_event_id', $event->id)->exists()) {
            try {
                WebhookEvent::create([
                    'id' => (string) Str::uuid(),
                    'provider' => 'STRIPE',
                    'stripe_event_id' => $event->id,
                    'event_type' => (string) $event->type,
                    'received_at' => now(),
                    'processing_status' => 'RECEIVED',
                ]);
            } catch (QueryException $error) {
                if (! $this->isDuplicate($error)) {
                    throw $error;
                }
            }
        }

        Log::info('Stripe webhook received', ['event_id' => $event->id, 'type' => $event->type]);

        return response()->json([
            'success' => true,
            'data' => ['received' => true],
        ]);
    }

    private function isDuplicate(QueryException $error): bool
    {
        return ($error->errorInfo[1] ?? null) === 1062;
    }
}
