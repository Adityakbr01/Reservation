<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\ListUsersQueryRequest;
use App\Http\Requests\Users\UserStatusRequest;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
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
            'data' => $users->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'is_active' => $u->is_active,
                'created_at' => $u->created_at,
            ]),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
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

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
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

        $actorId = $httpRequest->attributes->get('auth_user')->id;
        $isActive = $request->validated('is_active');

        $user->is_active = $isActive;
        $user->save();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'is_active' => $user->is_active,
            ],
        ]);
    }
}
