<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowedOrigins = array_filter(array_map('trim', explode(',', config('app.allowed_origins', ''))));
        $origin = $request->headers->get('Origin');

        $response = $next($request);

        if ($origin && (in_array($origin, $allowedOrigins) || preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin) || preg_match('/^https?:\/\/([a-z0-9-]+\.)*(hamptworthstays\.com|airoapp\.ai)$/i', $origin))) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, Accept, Origin');
        }

        if ($request->method() === 'OPTIONS') {
            return response('', 200)->headers->set('Access-Control-Allow-Origin', $origin ?? '*')
                ->set('Access-Control-Allow-Credentials', 'true')
                ->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, Accept, Origin');
        }

        return $response;
    }
}
