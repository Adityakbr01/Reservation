<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function enqueue(array $data): void
    {
        Notification::create(array_merge([
            'id' => bin2hex(random_bytes(12)),
            'status' => 'QUEUED',
            'attempts' => 0,
            'max_attempts' => 5,
        ], $data));
    }

    public function processPending(): void
    {
        $pending = Notification::where('status', 'QUEUED')
            ->where(function ($q) {
                $q->whereNull('next_attempt_at')
                    ->orWhere('next_attempt_at', '<=', now());
            })
            ->limit(10)
            ->get();

        foreach ($pending as $notification) {
            try {
                Log::info('Processing notification', ['id' => $notification->id, 'type' => $notification->type]);

                $provider = 'log';
                $providerMessageId = null;

                $apiKey = config('services.resend.key', env('RESEND_API_KEY'));
                if ($apiKey && ! empty($notification->recipient)) {
                    $provider = 'resend';
                    $providerMessageId = $this->sendViaResend(
                        $notification->recipient,
                        $notification->subject ?? 'Notification from Hamptworth Stays',
                        $notification->body ?? '',
                        $notification->text ?? null
                    );
                }

                $notification->status = 'SENT';
                $notification->sent_at = now();
                $notification->provider = $provider;
                $notification->provider_message_id = $providerMessageId;
                $notification->save();
            } catch (\Exception $e) {
                Log::error('Notification failed', ['id' => $notification->id, 'error' => $e->getMessage()]);
                $notification->attempts += 1;
                $notification->status = $notification->attempts >= $notification->max_attempts ? 'FAILED' : 'QUEUED';
                $notification->last_error = $e->getMessage();
                $notification->save();
            }
        }
    }

    public function sendViaResend(string $to, string $subject, string $html, ?string $text = null): ?string
    {
        $apiKey = config('services.resend.key', env('RESEND_API_KEY'));
        if (! $apiKey) {
            return null;
        }

        $from = env('RESEND_FROM_EMAIL', env('EMAIL_FROM', 'no-reply@hamptworthstays.com'));
        $replyTo = env('EMAIL_REPLY_TO');

        $payload = [
            'from' => $from,
            'to' => [$to],
            'subject' => $subject,
            'html' => $html ?: '<p>' . htmlspecialchars($subject) . '</p>',
        ];

        if ($text) {
            $payload['text'] = $text;
        }
        if ($replyTo) {
            $payload['reply_to'] = $replyTo;
        }

        $response = Http::withToken($apiKey)->post('https://api.resend.com/emails', $payload);

        if ($response->failed()) {
            throw new \RuntimeException('Resend API error: ' . $response->body());
        }

        return $response->json('id');
    }
}
