<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;

class AdminNotificationController extends Controller
{
    public function index()
    {
        $notifications = Notification::all();

        return response()->json([
            'success' => true,
            'data' => $notifications->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'recipient' => $n->recipient,
                'status' => $n->status,
                'attempts' => $n->attempts,
                'created_at' => $n->created_at,
            ]),
        ]);
    }

    public function retry(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => ['retried' => true],
        ]);
    }
}
