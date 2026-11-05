<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;

class AdminAuditLogsController extends Controller
{
    public function index()
    {
        $logs = AuditLog::latest()->limit(100)->get();

        return response()->json([
            'success' => true,
            'data' => $logs->map(fn ($l) => [
                'id' => $l->id,
                'action' => $l->action,
                'entity_type' => $l->entity_type,
                'created_at' => $l->created_at,
            ]),
        ]);
    }
}
