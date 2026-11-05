<?php

namespace Tests\Unit\Support;

use App\Support\AppError;
use PHPUnit\Framework\TestCase;

class AppErrorTest extends TestCase
{
    public function test_carries_status_code_and_message(): void
    {
        $error = new AppError('Room unavailable', 409, 'ROOM_UNAVAILABLE');

        $this->assertSame(409, $error->status);
        $this->assertSame('ROOM_UNAVAILABLE', $error->errorCode);
        $this->assertSame('Room unavailable', $error->getMessage());
    }

    public function test_defaults_to_internal_error(): void
    {
        $error = new AppError('boom');

        $this->assertSame(500, $error->status);
        $this->assertSame('INTERNAL_ERROR', $error->errorCode);
    }
}
