<?php

namespace Tests\Unit\Support;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_percent_of_rounds_to_whole_minor_units(): void
    {
        $this->assertSame(90000, Money::percentOf(900000, 10));
        $this->assertSame(100, Money::percentOf(999, 10));
    }

    public function test_percentage_discount_without_cap(): void
    {
        $this->assertSame(90000, Money::applyDiscount(900000, ['type' => 'PERCENTAGE', 'value' => 10]));
    }

    public function test_percentage_discount_honours_max_cap(): void
    {
        $this->assertSame(100000, Money::applyDiscount(900000, [
            'type' => 'PERCENTAGE',
            'value' => 50,
            'maxDiscount' => 100000,
        ]));
    }

    public function test_fixed_discount_clamps_at_subtotal(): void
    {
        $this->assertSame(30000, Money::applyDiscount(30000, ['type' => 'FIXED', 'value' => 50000]));
    }

    public function test_zero_subtotal_yields_zero_discount(): void
    {
        $this->assertSame(0, Money::applyDiscount(0, ['type' => 'PERCENTAGE', 'value' => 10]));
    }
}
