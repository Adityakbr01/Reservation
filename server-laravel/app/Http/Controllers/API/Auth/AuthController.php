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
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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

        try {
            $name = $user->name ?: 'Guest';
            $welcome = \App\Support\Email\Templates\WelcomeTemplates::welcome($name);
            app(\App\Services\NotificationService::class)->sendViaResend(
                $user->email,
                $welcome['subject'],
                $welcome['html'],
                $welcome['text']
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Welcome email failed: ' . $e->getMessage());
        }

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

        if (! $user || ! Hash::check($request->validated('password'), $user->password_hash)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_CREDENTIALS', 'message' => 'Invalid email or password'],
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ACCOUNT_DISABLED', 'message' => 'Account is disabled'],
            ], 403);
        }

        $user->last_login_at = now();
        $user->save();

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
        $user = User::where('email', $request->validated('email'))->first();
        if ($user && $user->is_active) {
            $token = bin2hex(random_bytes(32));
            $user->password_reset_token_hash = hash('sha256', $token);
            $user->password_reset_expires = now()->addHours(2);
            $user->save();

            $clientUrl = env('CLIENT_URL', 'https://hamptworthstays.com');
            $resetUrl = rtrim($clientUrl, '/') . '/reset-password?token=' . $token;

            try {
                $name = $user->name ?: 'Guest';
                $resetMail = \App\Support\Email\Templates\AuthTemplates::passwordReset($name, $resetUrl);
                app(\App\Services\NotificationService::class)->sendViaResend(
                    $user->email,
                    $resetMail['subject'],
                    $resetMail['html'],
                    $resetMail['text']
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Password reset email failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'message' => 'If an account exists for this email, a reset link was sent',
            ],
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $token = $request->validated('token');
        $hash = hash('sha256', $token);

        $user = User::where('password_reset_token_hash', $hash)
            ->where('password_reset_expires', '>', now())
            ->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'RESET_TOKEN_INVALID', 'message' => 'Reset link is invalid or has expired'],
            ], 400);
        }

        $user->password_hash = Hash::make($request->validated('password'));
        $user->password_reset_token_hash = null;
        $user->password_reset_expires = null;
        $user->save();

        try {
            $name = $user->name ?: 'Guest';
            $changedMail = \App\Support\Email\Templates\AuthTemplates::passwordChanged($name);
            app(\App\Services\NotificationService::class)->sendViaResend(
                $user->email,
                $changedMail['subject'],
                $changedMail['html'],
                $changedMail['text']
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Password changed email failed: ' . $e->getMessage());
        }

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

        if (! Hash::check($request->validated('current_password'), $user->password_hash)) {
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

        return JWT::encode($payload, $secret, config('jwt.algo', 'HS256'), 'default');
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
