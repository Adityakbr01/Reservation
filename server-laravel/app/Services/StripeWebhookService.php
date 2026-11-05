<?php

namespace App\Services;

use App\Support\AppError;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;

class StripeWebhookService
{
    public function verify(string $rawBody, string $signature, ?string $secret = null): Event
    {
        $secret = $secret ?? (string) config('services.stripe.webhook_secret');

        if ($secret === '') {
            throw new AppError('Stripe webhooks are not configured', 503, 'STRIPE_WEBHOOK_NOT_CONFIGURED');
        }

        if (trim($signature) === '') {
            throw new AppError('Missing webhook signature', 400, 'INVALID_SIGNATURE');
        }

        try {
            return Webhook::constructEvent($rawBody, $signature, $secret);
        } catch (SignatureVerificationException|\UnexpectedValueException) {
            throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');
        }
    }
}
