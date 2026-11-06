<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\ListUsersQueryRequest;
use App\Http\Requests\Users\UserStatusRequest;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    private function formatUser(User $u): array
    {
        $isActive = (bool) $u->is_active;
        $createdAt = $u->created_at?->toIso8601String() ?? (string) $u->created_at;
        $lastLoginAt = $u->last_login_at?->toIso8601String() ?? (string) $u->last_login_at;

        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'is_active' => $isActive,
            'isActive' => $isActive,
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'last_login_at' => $lastLoginAt ?: null,
            'lastLoginAt' => $lastLoginAt ?: null,
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

        $page = $request->validated('page', 1);
        $limit = $request->validated('limit', 20);
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
                'id' => $b->id,
                'bookingNumber' => $b->booking_number ?? $b->id,
                'status' => $b->status ?? 'CONFIRMED',
                'paymentStatus' => $b->payment_status ?? 'PAID',
                'checkIn' => $b->check_in?->toIso8601String() ?? (string) $b->check_in,
                'checkOut' => $b->check_out?->toIso8601String() ?? (string) $b->check_out,
                'total' => (float) ($b->total_price ?? 0),
                'currency' => $b->currency ?? 'GBP',
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

        $isActive = $request->validated('is_active');
        $user->is_active = $isActive;
        $user->save();

        return response()->json([
            'success' => true,
            'data' => $this->formatUser($user),
        ]);
    }
}
