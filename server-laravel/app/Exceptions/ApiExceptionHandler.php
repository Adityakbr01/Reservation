<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Illuminate\Validation\ValidationException;

class ApiExceptionHandler
{
    public function handle(Request $request, Exception $exception): JsonResponse
    {
        if ($exception instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Validation failed',
                    'errors' => $exception->errors(),
                ],
            ], 422);
        }

        if ($exception instanceof HttpExceptionInterface) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => strtoupper(str_replace(' ', '_', $exception->getMessage())),
                    'message' => $exception->getMessage(),
                ],
            ], $exception->getStatusCode());
        }

        Log::error('Unhandled exception: ' . $exception->getMessage(), [
            'trace' => $exception->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'INTERNAL_ERROR',
                'message' => config('app.debug') ? $exception->getMessage() : 'Internal server error',
            ],
        ], 500);
    }
}
