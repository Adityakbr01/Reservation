<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'whsec_unit_test_secret';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.stripe.webhook_secret' => self::SECRET]);
    }

    private function signedHeaders(string $payload, ?int $timestamp = null): array
    {
        $timestamp ??= time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$payload, self::SECRET);

        return [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$timestamp.',v1='.$signature,
        ];
    }

    private function eventPayload(string $id = 'evt_unit_test'): string
    {
        return json_encode([
            'id' => $id,
            'object' => 'event',
            'api_version' => '2024-06-20',
            'created' => time(),
            'type' => 'ping',
            'data' => ['object' => ['id' => 'obj_1', 'object' => 'payment_intent']],
        ], JSON_THROW_ON_ERROR);
    }

    public function test_accepts_a_valid_signature_and_records_the_event_once(): void
    {
        $payload = $this->eventPayload();
        $headers = $this->signedHeaders($payload);

        $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], $headers, $payload)
            ->assertOk()
            ->assertJsonPath('data.received', true);

        $this->assertDatabaseCount('webhook_events', 1);
        $this->assertDatabaseHas('webhook_events', [
            'stripe_event_id' => 'evt_unit_test',
            'event_type' => 'ping',
            'provider' => 'STRIPE',
        ]);

        $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], $headers, $payload)
            ->assertOk()
            ->assertJsonPath('data.received', true);

        $this->assertDatabaseCount('webhook_events', 1);
    }

    public function test_rejects_a_tampered_payload_with_invalid_signature(): void
    {
        $original = $this->eventPayload();
        $headers = $this->signedHeaders($original);

        $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], $headers, $this->eventPayload('evt_tampered'))
            ->assertStatus(400)
            ->assertJsonPath('error.code', 'INVALID_SIGNATURE');

        $this->assertDatabaseCount('webhook_events', 0);
    }

    public function test_rejects_a_missing_signature_header(): void
    {
        $payload = $this->eventPayload();

        $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
        ], $payload)
            ->assertStatus(400)
            ->assertJsonPath('error.code', 'INVALID_SIGNATURE');
    }

    public function test_returns_service_unavailable_when_secret_is_not_configured(): void
    {
        config(['services.stripe.webhook_secret' => '']);

        $payload = $this->eventPayload();
        $headers = $this->signedHeaders($payload);

        $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], $headers, $payload)
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'STRIPE_WEBHOOK_NOT_CONFIGURED');
    }
}
