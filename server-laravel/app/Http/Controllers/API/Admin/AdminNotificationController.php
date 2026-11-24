<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;

class AdminNotificationController extends Controller
{
    public function index()
    {
        $notifications = Notification::latest()->get();

        return response()->json([
            'success' => true,
            'data' => $notifications->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'recipient' => $n->recipient,
                'status' => $n->status,
                'provider' => $n->provider,
                'providerMessageId' => $n->provider_message_id,
                'lastError' => $n->last_error,
                'attempts' => $n->attempts,
                'sent_at' => $n->sent_at,
                'created_at' => $n->created_at,
            ]),
        ]);
    }

    public function retry(string $id)
    {
        $notification = Notification::find($id);
        if (! $notification) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Notification not found'],
            ], 404);
        }

        try {
            $notification->status = 'QUEUED';
            $notification->save();
            app(\App\Services\NotificationService::class)->processNotification($notification);

            return response()->json([
                'success' => true,
                'data' => [
                    'retried' => true,
                    'status' => $notification->fresh()->status,
                    'providerMessageId' => $notification->fresh()->provider_message_id,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'RETRY_FAILED', 'message' => $e->getMessage()],
            ], 500);
        }
    }
}
