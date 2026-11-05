<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Operational error with a stable machine-readable code for API responses.
 */
class AppError extends RuntimeException
{
    public readonly int $status;

    public readonly string $errorCode;

    public readonly mixed $details;

    public function __construct(string $message, int $status = 500, string $errorCode = 'INTERNAL_ERROR', mixed $details = null)
    {
        parent::__construct($message);
        $this->status = $status;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }

    public function render(Request $request): JsonResponse
    {
        $error = [
            'code' => $this->errorCode,
            'message' => $this->getMessage(),
        ];

        if ($this->details !== null) {
            $error['details'] = $this->details;
        }

        return response()->json([
            'success' => false,
            'error' => $error,
        ], $this->status);
    }
}
