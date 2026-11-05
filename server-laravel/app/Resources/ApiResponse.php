<?php

namespace App\Resources;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success($data = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
        ], $status);
    }

    public static function error(string $code, string $message, int $status = 400, $errors = null): JsonResponse
    {
        $body = [
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ];

        if ($errors) {
            $body['error']['errors'] = $errors;
        }

        return response()->json($body, $status);
    }
}
