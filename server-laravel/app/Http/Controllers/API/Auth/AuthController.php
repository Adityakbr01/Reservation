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
use App\Models\EmailTemplate;
use App\Models\User;
use App\Services\EmailTemplateService;
use App\Services\NotificationService;
use App\Support\Email\EmailShared;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $hash = Hash::make($request->validated('password'));
        $data = [
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'role' => 'user',
        ];

        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'password_hash')) {
            $data['password_hash'] = $hash;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'passwordHash')) {
            $data['passwordHash'] = $hash;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'is_active')) {
            $data['is_active'] = true;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'isActive')) {
            $data['isActive'] = true;
        }
        $now = now();
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'created_at')) {
            $data['created_at'] = $now;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'createdAt')) {
            $data['createdAt'] = $now;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'updated_at')) {
            $data['updated_at'] = $now;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'updatedAt')) {
            $data['updatedAt'] = $now;
        }

        $user = User::create(array_merge([
            'id' => bin2hex(random_bytes(12)),
        ], $data));

        $token = $this->generateToken($user);

        try {
            $name = $user->name ?: 'Guest';
            $welcome = \App\Support\Email\Templates\WelcomeTemplates::welcome($name);
            $override = EmailTemplate::where('key', 'WELCOME')->first();
            if ($override) {
                $clientBase = rtrim(env('CLIENT_URL', 'https://hamptworthstays.com'), '/');
                $vars = [
                    'guestName' => $name,
                    'brandName' => EmailShared::DEFAULT_BRAND_NAME,
                    'brandSiteUrl' => EmailShared::DEFAULT_BRAND_SITE_URL,
                    'bookingSiteUrl' => EmailShared::DEFAULT_BOOKING_SITE_URL,
                    'loginUrl' => "{$clientBase}/login",
                ];
                $res = app(EmailTemplateService::class)->renderWithOverride(
                    'WELCOME',
                    $vars,
                    $welcome,
                    $override->toArray()
                );
                $welcome = $res['rendered'];
            }
            app(NotificationService::class)->sendViaResend(
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
        $userHash = $user ? ($user->password_hash ?? $user->passwordHash ?? null) : null;

        if (! $user || ! $userHash || ! Hash::check($request->validated('password'), $userHash)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_CREDENTIALS', 'message' => 'Invalid email or password'],
            ], 401);
        }

        $isActive = $user->is_active ?? $user->isActive ?? true;
        if (! $isActive) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ACCOUNT_DISABLED', 'message' => 'Account is disabled'],
            ], 403);
        }

        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'last_login_at')) {
            $user->last_login_at = now();
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'lastLoginAt')) {
            $user->lastLoginAt = now();
        }
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
                $override = EmailTemplate::where('key', 'PASSWORD_RESET')->first();
                if ($override) {
                    $vars = [
                        'guestName' => $name,
                        'brandName' => EmailShared::DEFAULT_BRAND_NAME,
                        'resetUrl' => $resetUrl,
                        'brandSiteUrl' => EmailShared::DEFAULT_BRAND_SITE_URL,
                        'bookingSiteUrl' => EmailShared::DEFAULT_BOOKING_SITE_URL,
                        'expiryNote' => 'For your security, the reset link expires after 1 hour.',
                    ];
                    $res = app(EmailTemplateService::class)->renderWithOverride(
                        'PASSWORD_RESET',
                        $vars,
                        $resetMail,
                        $override->toArray()
                    );
                    $resetMail = $res['rendered'];
                }
                app(NotificationService::class)->sendViaResend(
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
            $override = EmailTemplate::where('key', 'PASSWORD_CHANGED')->first();
            if ($override) {
                $clientBase = rtrim(env('CLIENT_URL', 'https://hamptworthstays.com'), '/');
                $vars = [
                    'guestName' => $name,
                    'brandName' => EmailShared::DEFAULT_BRAND_NAME,
                    'loginUrl' => "{$clientBase}/login",
                    'brandSiteUrl' => EmailShared::DEFAULT_BRAND_SITE_URL,
                    'bookingSiteUrl' => EmailShared::DEFAULT_BOOKING_SITE_URL,
                    'supportEmail' => env('ADMIN_NOTIFICATION_EMAIL', 'stay@hamptworthstays.com'),
                ];
                $res = app(EmailTemplateService::class)->renderWithOverride(
                    'PASSWORD_CHANGED',
                    $vars,
                    $changedMail,
                    $override->toArray()
                );
                $changedMail = $res['rendered'];
            }
            app(NotificationService::class)->sendViaResend(
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

    public function updateMe(UpdateMeRequest $request)
    {
        $user = $request->attributes->get('auth_user') ?? $request->user();
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

    public function changePassword(ChangePasswordRequest $request)
    {
        $user = $request->attributes->get('auth_user') ?? $request->user();

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

    public function setPassword(SetPasswordRequest $request)
    {
        $user = $request->attributes->get('auth_user') ?? $request->user();
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
        $avatar = $user->avatar_url ?? $user->avatarUrl ?? null;
        $isActive = (bool) ($user->is_active ?? $user->isActive ?? true);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'isActive' => $isActive,
            'is_active' => $isActive,
            'avatarUrl' => $avatar,
            'avatar_url' => $avatar,
        ];
    }
}
