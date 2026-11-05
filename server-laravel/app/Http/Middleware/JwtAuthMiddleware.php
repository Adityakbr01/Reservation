<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        Log::info('JwtAuthMiddleware called', ['path' => $request->path(), 'has_token' => (bool) $request->bearerToken()]);

        $token = $request->bearerToken();

        if (! $token) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Authentication required'],
            ], 401);
        }

        try {
            $secret = config('jwt.secret') ?: 'default_secret_key_for_testing_min_32_chars_long';
            $keys = ['default' => new Key($secret, 'HS256')];
            $headers = null;
            $decoded = JWT::decode($token, $keys, $headers);
            $userId = $decoded->sub ?? null;
            Log::info('JWT decoded: sub='.($userId ?? 'NULL'));

            if (! $userId) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Invalid token'],
                ], 401);
            }

            $user = User::find($userId);
            Log::info('JWT user found: '.($user ? $user->id.' role='.$user->role : 'NULL'));

            if (! $user || ! $user->is_active) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Authentication required'],
                ], 401);
            }

            $request->attributes->set('auth_user', $user);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Invalid or expired token'],
            ], 401);
        }

        return $next($request);
    }
}
