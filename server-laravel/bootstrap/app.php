<?php

use App\Console\Commands\ProcessNotifications;
use App\Http\Middleware\CorsMiddleware;
use App\Http\Middleware\JwtAuthMiddleware;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        ProcessNotifications::class,
    ])
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend(CorsMiddleware::class);
        $middleware->alias([
            'jwt.auth' => JwtAuthMiddleware::class,
            'role' => RoleMiddleware::class,
            'cors.custom' => CorsMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function (Request $request, \Throwable $e) {
            return $request->is('api/*') || $request->is('v1/*') || $request->is('public/*') || $request->expectsJson();
        });

        $exceptions->render(function (ValidationException $error, Request $request) {
            $origin = $request->header('Origin') ?: '*';

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => $error->validator->errors()->first(),
                    'details' => $error->errors(),
                ],
            ], 422)
                ->header('Access-Control-Allow-Origin', $origin)
                ->header('Access-Control-Allow-Credentials', 'true')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, Accept, Origin, Application');
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->is('v1/*') || $request->is('public/*') || $request->expectsJson()) {
                $origin = $request->header('Origin') ?: '*';
                $status = ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) ? $e->getStatusCode() : 500;

                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'SERVER_ERROR',
                        'message' => $e->getMessage() ?: 'An unexpected server error occurred',
                    ],
                ], $status)
                    ->header('Access-Control-Allow-Origin', $origin)
                    ->header('Access-Control-Allow-Credentials', 'true')
                    ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                    ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, Accept, Origin, Application');
            }
        });
    })->create();
