<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Refund;

class AdminRefundController extends Controller
{
    public function index()
    {
        $refunds = Refund::with('booking')->get();

        return response()->json([
            'success' => true,
            'data' => $refunds->map(fn ($r) => $this->refundData($r)),
        ]);
    }

    private function refundData(Refund $r): array
    {
        return [
            'id' => $r->id,
            'booking_id' => $r->booking_id,
            'amount' => (int) round(((float) $r->amount) * 100),
            'currency' => $r->currency,
            'status' => $r->status,
        ];
    }
}
