<?php

namespace Tests\Unit\Support;

use App\Support\RoomOffers;
use PHPUnit\Framework\TestCase;

class RoomOffersTest extends TestCase
{
    public function test_percentage_discounts_render_as_percent_off(): void
    {
        $this->assertSame('20% OFF', RoomOffers::offerBadgeLabel('PERCENTAGE', 20, 'GBP'));
    }

    public function test_fixed_discounts_render_as_save_amount(): void
    {
        $this->assertSame('SAVE £50', RoomOffers::offerBadgeLabel('FIXED', 5000, 'GBP'));
    }

    public function test_non_round_amounts_keep_two_decimals(): void
    {
        $this->assertSame('SAVE £50.50', RoomOffers::offerBadgeLabel('FIXED', 5050, 'GBP'));
    }
}
