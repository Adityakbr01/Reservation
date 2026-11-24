<?php

namespace App\Support\Resend;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Clean Resend PHP integration matching the official Resend SDK contract.
 * @see https://resend.com/docs/send-with-php
 * @see https://resend.com/docs/send-with-laravel
 */
class Resend
{
    public static function client(?string $apiKey = null): ResendClient
    {
        $key = $apiKey ?: config('services.resend.key', env('RESEND_API_KEY'));
        return new ResendClient($key ?: '');
    }
}

class ResendClient
{
    public ResendEmails $emails;

    public function __construct(private readonly string $apiKey)
    {
        $this->emails = new ResendEmails($this->apiKey);
    }
}

class ResendEmails
{
    public function __construct(private readonly string $apiKey) {}

    /**
     * Send an email through Resend API.
     *
     * @param array{
     *   from: string,
     *   to: string|array,
     *   subject: string,
     *   html?: string,
     *   text?: string,
     *   reply_to?: string,
     *   cc?: string|array,
     *   bcc?: string|array
     * } $payload
     * @return array{id: ?string, error: ?string}
     */
    public function send(array $payload): array
    {
        if (empty($this->apiKey)) {
            Log::info('Resend: RESEND_API_KEY not configured, email logged instead.', [
                'to' => $payload['to'] ?? null,
                'subject' => $payload['subject'] ?? null,
            ]);
            return ['id' => null, 'error' => 'API key missing'];
        }

        // Standardize 'to' to an array
        if (is_string($payload['to'] ?? null)) {
            $payload['to'] = [$payload['to']];
        }

        $from = $payload['from'] ?? env('RESEND_FROM_EMAIL', env('EMAIL_FROM', 'no-reply@hamptworthstays.com'));
        $payload['from'] = $from;

        if (empty($payload['html']) && ! empty($payload['subject'])) {
            $payload['html'] = '<p>' . htmlspecialchars($payload['subject']) . '</p>';
        }

        try {
            $response = Http::withToken($this->apiKey)
                ->withHeaders(['User-Agent' => 'HamptworthStays/1.0'])
                ->timeout(10)
                ->connectTimeout(5)
                ->post('https://api.resend.com/emails', $payload);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Resend email sent successfully', [
                    'id' => $data['id'] ?? null,
                    'to' => $payload['to'],
                    'subject' => $payload['subject'],
                ]);
                return $data;
            }

            Log::error('Resend API returned error response: ' . $response->body(), [
                'status' => $response->status(),
                'payload' => $payload,
            ]);

            return [
                'id' => null,
                'error' => $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error('Resend network/request exception: ' . $e->getMessage(), [
                'to' => $payload['to'] ?? null,
                'subject' => $payload['subject'] ?? null,
            ]);

            return [
                'id' => null,
                'error' => $e->getMessage(),
            ];
        }
    }
}

