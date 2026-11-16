<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;

class AdminPaymentController extends Controller
{
    public function index()
    {
        $payments = Payment::with('booking')->get();

        return response()->json([
            'success' => true,
            'data' => $payments->map(fn ($p) => $this->paymentData($p)),
        ]);
    }

    public function show(string $id)
    {
        $payment = Payment::find($id);

        if (! $payment) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PAYMENT_NOT_FOUND', 'message' => 'Payment not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->paymentData($payment),
        ]);
    }

    private function paymentData(Payment $p): array
    {
        return [
            'id' => $p->id,
            'booking_id' => $p->booking_id,
            'amount' => (int) round(((float) $p->amount) * 100),
            'currency' => $p->currency,
            'status' => $p->status,
            'provider' => $p->provider,
        ];
    }
}
