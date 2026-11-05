<?php

namespace App\Services;

use App\Models\Notification;
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
                $notification->status = 'SENT';
                $notification->sent_at = now();
                $notification->save();
            } catch (\Exception $e) {
                Log::error('Notification failed', ['id' => $notification->id, 'error' => $e->getMessage()]);
                $notification->attempts += 1;
                $notification->status = $notification->attempts >= $notification->max_attempts ? 'FAILED' : 'QUEUED';
                $notification->save();
            }
        }
    }
}
