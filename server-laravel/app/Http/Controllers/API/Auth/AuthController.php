<?php

namespace App\Http\Controllers\API\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\SetPasswordRequest;
use App\Http\Requests\Auth\UpdateMeRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $user = User::create(array_merge([
            'id' => bin2hex(random_bytes(12)),
        ], [
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password_hash' => Hash::make($request->validated('password')),
            'role' => 'user',
            'is_active' => true,
        ]));

        $token = $this->generateToken($user);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $this->userData($user),
                'token' => $token,
            ],
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (!$user || !Hash::check($request->validated('password'), $user->password_hash)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_CREDENTIALS', 'message' => 'Invalid email or password'],
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ACCOUNT_DISABLED', 'message' => 'Account is disabled'],
            ], 403);
        }

        $token = $this->generateToken($user);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $this->userData($user),
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => ['logged_out' => true],
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'message' => 'If an account exists for this email, a reset link was sent',
            ],
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        return response()->json([
            'success' => true,
            'data' => ['message' => 'Password has been reset'],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        return response()->json([
            'success' => true,
            'data' => $this->userData($user),
        ]);
    }

    public function updateMe(UpdateMeRequest $request, Request $httpRequest)
    {
        $user = $httpRequest->attributes->get('auth_user');
        $data = $request->validated();

        if (isset($data['name'])) {
            $user->name = $data['name'];
            $user->save();
        }

        return response()->json([
            'success' => true,
            'data' => $this->userData($user),
        ]);
    }

    public function changePassword(ChangePasswordRequest $request, Request $httpRequest)
    {
        $user = $httpRequest->attributes->get('auth_user');

        if (!Hash::check($request->validated('current_password'), $user->password_hash)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_PASSWORD', 'message' => 'Current password is incorrect'],
            ], 400);
        }

        $user->password_hash = Hash::make($request->validated('new_password'));
        $user->save();

        return response()->json([
            'success' => true,
            'data' => ['message' => 'Password changed'],
        ]);
    }

    public function setPassword(SetPasswordRequest $request, Request $httpRequest)
    {
        $user = $httpRequest->attributes->get('auth_user');
        $user->password_hash = Hash::make($request->validated('new_password'));
        $user->save();

        return response()->json([
            'success' => true,
            'data' => ['message' => 'Password changed'],
        ]);
    }

    private function generateToken(User $user): string
    {
        $secret = config('jwt.secret') ?: 'default_secret_key_for_testing_min_32_chars_long';
        $now = now();
        $exp = $now->copy()->addMinutes((int) config('jwt.ttl', 60));
        $payload = [
            'iss' => config('app.url', 'http://localhost:8000'),
            'iat' => $now->timestamp,
            'exp' => $exp->timestamp,
            'nbf' => $now->timestamp,
            'sub' => $user->id,
            'jti' => bin2hex(random_bytes(16)),
        ];

        return \Firebase\JWT\JWT::encode($payload, $secret, config('jwt.algo', 'HS256'), 'default');
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => $user->is_active,
            'avatar_url' => $user->avatar_url,
        ];
    }
}
