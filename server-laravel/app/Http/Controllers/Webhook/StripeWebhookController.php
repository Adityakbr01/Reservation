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

        try {
            switch ($event->type) {
                case 'payment_intent.succeeded':
                    $intent = $event->data->object;
                    $bookingId = $intent->metadata->booking_id ?? $intent->metadata->bookingId ?? null;
                    if ($bookingId) {
                        $booking = \App\Models\Booking::find($bookingId);
                        if ($booking) {
                            $booking->status = 'CONFIRMED';
                            $booking->payment_status = 'PAID';
                            $booking->save();
                            Log::info("Booking {$bookingId} confirmed via Stripe webhook");
                        }
                    }
                    $payment = \App\Models\Payment::where('provider_payment_intent_id', $intent->id)->first();
                    if ($payment) {
                        $payment->status = 'PAID';
                        $payment->paid_at = now();
                        $payment->save();
                    }
                    break;
                case 'payment_intent.payment_failed':
                    $intent = $event->data->object;
                    $bookingId = $intent->metadata->booking_id ?? $intent->metadata->bookingId ?? null;
                    if ($bookingId) {
                        $booking = \App\Models\Booking::find($bookingId);
                        if ($booking) {
                            $booking->payment_status = 'FAILED';
                            $booking->save();
                            Log::warning("Booking {$bookingId} payment failed via Stripe webhook");
                        }
                    }
                    $payment = \App\Models\Payment::where('provider_payment_intent_id', $intent->id)->first();
                    if ($payment) {
                        $payment->status = 'FAILED';
                        $payment->failure_message = $intent->last_payment_error->message ?? 'Payment failed';
                        $payment->save();
                    }
                    break;
                case 'charge.refunded':
                    $charge = $event->data->object;
                    $paymentIntentId = $charge->payment_intent ?? null;
                    if ($paymentIntentId) {
                        $payment = \App\Models\Payment::where('provider_payment_intent_id', $paymentIntentId)->first();
                        if ($payment && $payment->booking_id) {
                            $booking = \App\Models\Booking::find($payment->booking_id);
                            if ($booking) {
                                $booking->payment_status = 'REFUNDED';
                                $booking->save();
                            }
                            $payment->status = 'REFUNDED';
                            $payment->save();
                        }
                    }
                    break;
            }
        } catch (\Throwable $e) {
            Log::error('Error processing Stripe webhook event: ' . $e->getMessage());
        }

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
