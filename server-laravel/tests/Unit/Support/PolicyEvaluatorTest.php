<?php

namespace Tests\Unit\Support;

use App\Support\PolicyEvaluator;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class PolicyEvaluatorTest extends TestCase
{
    private const POLICY = ['name' => 'Standard flexible', 'freeCancellationHours' => 24, 'refundPercentage' => 100];

    private DateTimeImmutable $checkIn;
    private DateTimeImmutable $checkOut;

    protected function setUp(): void
    {
        $this->checkIn = new DateTimeImmutable('2026-12-20T14:00:00Z');
        $this->checkOut = new DateTimeImmutable('2026-12-22T11:00:00Z');
    }

    private function evaluate(string $status, int $paidTotal, ?array $policy, string $now): array
    {
        return PolicyEvaluator::evaluateCancellation([
            'status' => $status,
            'checkIn' => $this->checkIn,
            'checkOut' => $this->checkOut,
            'paidTotal' => $paidTotal,
            'policy' => $policy ?? self::POLICY,
            'now' => new DateTimeImmutable($now),
        ]);
    }

    public function test_unpaid_cancellable_states_cancel_with_zero_refund(): void
    {
        foreach (['HELD', 'PAYMENT_PENDING'] as $status) {
            $result = $this->evaluate($status, 0, null, '2026-12-01T00:00:00Z');
            $this->assertTrue($result['isCancellable']);
            $this->assertSame(0, $result['refundAmount']);
        }
    }

    public function test_paid_booking_inside_window_gets_full_refund(): void
    {
        $result = $this->evaluate('CONFIRMED', 20000, null, '2026-12-18T00:00:00Z');

        $this->assertTrue($result['isCancellable']);
        $this->assertSame(20000, $result['refundAmount']);
        $this->assertSame(100, $result['refundPercentage']);
    }

    public function test_paid_booking_past_cutoff_cancels_with_no_refund(): void
    {
        $result = $this->evaluate('CONFIRMED', 20000, null, '2026-12-20T00:00:00Z');

        $this->assertTrue($result['isCancellable']);
        $this->assertSame(0, $result['refundAmount']);
    }

    public function test_partial_percentage_applies_correctly(): void
    {
        $result = $this->evaluate('CONFIRMED', 20000, [
            'name' => 'Standard flexible',
            'freeCancellationHours' => 24,
            'refundPercentage' => 50,
        ], '2026-12-01T00:00:00Z');

        $this->assertSame(10000, $result['refundAmount']);
        $this->assertSame(50, $result['refundPercentage']);
    }

    public function test_terminal_states_and_finished_stays_are_not_cancellable(): void
    {
        foreach (['CANCELLED', 'EXPIRED', 'CHECKED_OUT'] as $status) {
            $this->assertFalse($this->evaluate($status, 20000, null, '2026-12-01T00:00:00Z')['isCancellable']);
        }

        $this->assertFalse($this->evaluate('CONFIRMED', 20000, null, '2026-12-25T00:00:00Z')['isCancellable']);
    }
}
