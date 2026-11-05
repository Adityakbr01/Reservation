<?php

namespace Tests\Unit\Support;

use App\Support\Slug;
use PHPUnit\Framework\TestCase;

class SlugTest extends TestCase
{
    public function test_lowercases_and_hyphenates(): void
    {
        $this->assertSame('deluxe-room', Slug::make('Deluxe Room'));
    }

    public function test_trims_and_strips_punctuation(): void
    {
        $this->assertSame('suite-spa', Slug::make('  Suite & Spa! '));
    }

    public function test_transliterates_diacritics(): void
    {
        $this->assertSame('cafe-munchen', Slug::make('Café Münchén'));
    }

    public function test_returns_empty_string_when_nothing_usable_remains(): void
    {
        $this->assertSame('', Slug::make('!!!'));
        $this->assertSame('', Slug::make(''));
    }

    public function test_keeps_numbers(): void
    {
        $this->assertSame('room-101', Slug::make('Room 101'));
    }
}
