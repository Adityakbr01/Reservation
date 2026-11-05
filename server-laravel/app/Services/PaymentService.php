<?php

namespace App\Services;

use Stripe\PaymentIntent;
use Stripe\Stripe;

class PaymentService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret_key'));
    }

    public function createIntent(string $bookingId, float $amount, string $currency): array
    {
        try {
            $intent = PaymentIntent::create([
                'amount' => (int) round($amount * 100),
                'currency' => strtolower($currency),
                'metadata' => ['booking_id' => $bookingId],
            ]);

            return [
                'success' => true,
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
