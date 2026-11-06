<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\ListUsersQueryRequest;
use App\Http\Requests\Users\UserStatusRequest;
use App\Models\Booking;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminUserController extends Controller
{
    private function isoDate(mixed $date): ?string
    {
        if (empty($date)) {
            return null;
        }

        if ($date instanceof DateTimeInterface) {
            return $date->format('Y-m-d\TH:i:s.v\Z');
        }

        if (is_string($date)) {
            try {
                return Carbon::parse($date)->utc()->format('Y-m-d\TH:i:s.v\Z');
            } catch (\Throwable) {
                return $date;
            }
        }

        return (string) $date;
    }

    private function formatUser(User $u): array
    {
        $isActive = (bool) ($u->is_active ?? $u->isActive ?? true);
        $createdAt = $this->isoDate($u->created_at ?? $u->createdAt);
        $lastLoginAt = $this->isoDate($u->last_login_at ?? $u->lastLoginAt);

        return [
            'id' => (string) $u->id,
            'name' => (string) ($u->name ?? ''),
            'email' => (string) ($u->email ?? ''),
            'role' => (string) ($u->role ?? 'user'),
            'is_active' => $isActive,
            'isActive' => $isActive,
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'last_login_at' => $lastLoginAt,
            'lastLoginAt' => $lastLoginAt,
        ];
    }

    public function index(ListUsersQueryRequest $request)
    {
        $query = User::query();

        if ($q = $request->validated('q')) {
            $query->where(function ($q2) use ($q) {
                $q2->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($role = $request->validated('role')) {
            $query->where('role', $role);
        }

        $page = (int) $request->validated('page', 1);
        $limit = (int) $request->validated('limit', 20);
        $offset = ($page - 1) * $limit;

        $total = $query->count();
        $users = $query->offset($offset)->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $users->map(fn (User $u) => $this->formatUser($u))->all(),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / max(1, $limit)),
            ],
        ]);
    }

    public function show(string $id)
    {
        $user = User::find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'USER_NOT_FOUND', 'message' => 'User not found'],
            ], 404);
        }

        $formattedUser = $this->formatUser($user);

        $bookings = [];
        $paid = 0;
        $refunded = 0;
        $currency = 'GBP';

        try {
            $userBookings = Booking::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->get();

            $bookings = $userBookings->map(fn ($b) => [
                'id' => (string) $b->id,
                'bookingNumber' => (string) ($b->booking_number ?? $b->id),
                'status' => (string) ($b->status ?? 'CONFIRMED'),
                'paymentStatus' => (string) ($b->payment_status ?? 'PAID'),
                'checkIn' => $this->isoDate($b->check_in),
                'checkOut' => $this->isoDate($b->check_out),
                'total' => (float) ($b->total_price ?? 0),
                'currency' => (string) ($b->currency ?? 'GBP'),
            ])->all();

            foreach ($userBookings as $b) {
                if (($b->payment_status ?? '') === 'PAID') {
                    $paid += (float) ($b->total_price ?? 0);
                }
            }
        } catch (\Throwable) {
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $formattedUser,
                'bookings' => $bookings,
                'paymentSummary' => [
                    'paid' => $paid,
                    'refunded' => $refunded,
                    'currency' => $currency,
                ],
                'cancellations' => [],
                ...$formattedUser,
            ],
        ]);
    }

    public function setStatus(string $id, UserStatusRequest $request, Request $httpRequest)
    {
        $user = User::find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'USER_NOT_FOUND', 'message' => 'User not found'],
            ], 404);
        }

        $isActive = (bool) $request->validated('is_active');
        $user->is_active = $isActive;
        $user->save();

        return response()->json([
            'success' => true,
            'data' => $this->formatUser($user),
        ]);
    }
}
