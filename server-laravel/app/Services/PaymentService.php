<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\Stripe;

class PaymentService
{
    public function __construct()
    {
        $secretKey = config('services.stripe.secret_key');
        if (!empty($secretKey)) {
            Stripe::setApiKey($secretKey);
        }
    }

    public function createIntent(Booking $booking): array
    {
        try {
            $secretKey = config('services.stripe.secret_key');
            if (empty($secretKey)) {
                Log::error('Stripe secret key is missing in configuration');
                return [
                    'success' => false,
                    'error' => 'Payment service not configured',
                ];
            }
            Stripe::setApiKey($secretKey);

            // Check if there is already an uncaptured/pending payment intent for this booking
            $existingPayment = Payment::where('booking_id', $booking->id)
                ->where('status', 'PENDING')
                ->whereNotNull('provider_payment_intent_id')
                ->latest()
                ->first();

            if ($existingPayment && $existingPayment->provider_payment_intent_id) {
                try {
                    $existingIntent = PaymentIntent::retrieve($existingPayment->provider_payment_intent_id);
                    if ($existingIntent && in_array($existingIntent->status, ['requires_payment_method', 'requires_confirmation', 'requires_action'])) {
                        return [
                            'success' => true,
                            'client_secret' => $existingIntent->client_secret,
                            'payment_intent_id' => $existingIntent->id,
                            'payment_id' => $existingPayment->id,
                            'reused' => true,
                        ];
                    }
                } catch (\Throwable $e) {
                    Log::warning('Could not retrieve existing payment intent: ' . $e->getMessage());
                }
            }

            $pricing = is_array($booking->pricing) ? $booking->pricing : [];
            $total = (int) ($pricing['total'] ?? 0);
            $currency = strtolower((string) ($pricing['currency'] ?? 'gbp'));

            // $total is stored in pence (minor units, e.g. 100 for £1, 30000 for £300)
            $amountPence = max(50, $total);

            $intent = PaymentIntent::create([
                'amount' => $amountPence,
                'currency' => $currency ?: 'gbp',
                'automatic_payment_methods' => ['enabled' => true],
                'metadata' => [
                    'booking_id' => (string) $booking->id,
                    'bookingId' => (string) $booking->id,
                    'property_id' => (string) ($booking->property_id ?? ''),
                    'booking_number' => (string) ($booking->booking_number ?? ''),
                ],
            ]);

            $payment = Payment::create([
                'id' => bin2hex(random_bytes(12)),
                'booking_id' => $booking->id,
                'user_id' => $booking->user_id,
                'amount' => $amountPence / 100,
                'currency' => strtoupper($currency ?: 'GBP'),
                'status' => 'PENDING',
                'provider' => 'STRIPE',
                'provider_payment_intent_id' => $intent->id,
                'metadata' => [
                    'booking_number' => $booking->booking_number,
                ],
            ]);

            return [
                'success' => true,
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
                'payment_id' => $payment->id,
                'reused' => false,
            ];
        } catch (\Throwable $e) {
            Log::error('Stripe PaymentIntent creation failed: ' . $e->getMessage(), [
                'booking_id' => $booking->id ?? null,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}

