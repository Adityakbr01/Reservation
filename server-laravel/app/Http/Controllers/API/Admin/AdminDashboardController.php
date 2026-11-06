<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AdminDashboardController extends Controller
{
    public function summary()
    {
        $now = now();
        $start = $now->copy()->startOfDay();
        $end = $now->copy()->endOfDay();
        $last24h = $now->copy()->subHours(24);

        $checkInCol = Schema::hasColumn('bookings', 'check_in') ? 'check_in' : (Schema::hasColumn('bookings', 'checkIn') ? 'checkIn' : null);
        $checkOutCol = Schema::hasColumn('bookings', 'check_out') ? 'check_out' : (Schema::hasColumn('bookings', 'checkOut') ? 'checkOut' : null);

        $todayArrivals = $checkInCol ? Booking::where('status', 'CONFIRMED')->whereBetween($checkInCol, [$start, $end])->count() : 0;
        $todayDepartures = $checkOutCol ? Booking::whereIn('status', ['CHECKED_IN', 'CHECKED_OUT'])->whereBetween($checkOutCol, [$start, $end])->count() : 0;
        $currentGuests = Booking::where('status', 'CHECKED_IN')->count();
        $upcomingReservations = $checkInCol ? Booking::where('status', 'CONFIRMED')->where($checkInCol, '>=', $end)->count() : 0;
        $pendingPayments = Booking::whereIn('status', ['HELD', 'PAYMENT_PENDING'])->count();
        $paymentFailures24h = Payment::where('status', 'FAILED')->where('created_at', '>=', $last24h)->count();
        $pendingRefunds = Booking::where('status', 'REFUND_PENDING')->count();
        $failedNotifications = Notification::where('status', 'FAILED')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'todayArrivals' => $todayArrivals,
                'todayDepartures' => $todayDepartures,
                'currentGuests' => $currentGuests,
                'upcomingReservations' => $upcomingReservations,
                'pendingPayments' => $pendingPayments,
                'paymentFailures24h' => $paymentFailures24h,
                'todayBookingValue' => 0,
                'todayBookingCurrency' => 'GBP',
                'pendingRefunds' => $pendingRefunds,
                'failedNotifications' => $failedNotifications,
            ],
        ]);
    }

    public function sales(Request $request)
    {
        $range = $request->query('range', 'week');
        $currency = 'GBP';

        // Load recent bookings
        $recentBookings = Booking::orderBy('id', 'desc')->limit(10)->get();
        $recent = [];

        foreach ($recentBookings as $b) {
            $guestName = $b->guest_name;
            if (! $guestName && is_array($b->contact)) {
                $guestName = trim(($b->contact['firstName'] ?? '') . ' ' . ($b->contact['lastName'] ?? ''));
            }
            if (! $guestName) {
                $guestName = 'Guest';
            }

            $bNumber = $b->booking_number ?? $b->bookingNumber ?? $b->id;
            $checkIn = $b->check_in ?? $b->checkIn ?? '';
            $checkOut = $b->check_out ?? $b->checkOut ?? '';
            $total = (int) ($b->total_amount ?? ($b->pricing['total'] ?? 0));
            $curr = $b->currency ?? ($b->pricing['currency'] ?? 'GBP');
            $status = $b->status ?? 'CONFIRMED';
            $paymentStatus = $b->payment_status ?? $b->paymentStatus ?? 'PENDING';

            $recent[] = [
                'id' => (string) $b->id,
                'bookingNumber' => (string) $bNumber,
                'guest' => (string) $guestName,
                'checkIn' => is_string($checkIn) ? $checkIn : (is_object($checkIn) && method_exists($checkIn, 'toDateString') ? $checkIn->toDateString() : ''),
                'checkOut' => is_string($checkOut) ? $checkOut : (is_object($checkOut) && method_exists($checkOut, 'toDateString') ? $checkOut->toDateString() : ''),
                'total' => $total,
                'currency' => (string) $curr,
                'status' => (string) $status,
                'paymentStatus' => (string) $paymentStatus,
            ];
        }

        $bookingsCount = Booking::count();
        $grossValue = (int) (Booking::sum('total_amount') ?: 0);
        $collected = (int) (Payment::where('status', 'SUCCEEDED')->sum('amount') ?: 0);
        $refunded = 0;
        $netCollected = $collected - $refunded;
        $occupancyNights = (int) (Booking::sum('nights') ?: 0);

        return response()->json([
            'success' => true,
            'data' => [
                'range' => $range,
                'currency' => $currency,
                'bookingsCount' => $bookingsCount,
                'grossValue' => $grossValue,
                'collected' => $collected,
                'refunded' => $refunded,
                'netCollected' => $netCollected,
                'occupancyNights' => $occupancyNights,
                'buckets' => [],
                'byRoomType' => [],
                'recent' => $recent,
            ],
        ]);
    }
}
