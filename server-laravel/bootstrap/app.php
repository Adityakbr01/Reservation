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
        $middleware->alias([
            'jwt.auth' => JwtAuthMiddleware::class,
            'role' => RoleMiddleware::class,
            'cors.custom' => CorsMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (ValidationException $error, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => $error->validator->errors()->first(),
                    'details' => $error->errors(),
                ],
            ], 422);
        });
    })->create();
