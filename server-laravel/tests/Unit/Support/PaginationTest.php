<?php

namespace Tests\Unit\Support;

use App\Support\Pagination;
use PHPUnit\Framework\TestCase;

class PaginationTest extends TestCase
{
    public function test_computes_total_pages(): void
    {
        $this->assertSame(
            ['page' => 1, 'limit' => 10, 'total' => 95, 'totalPages' => 10],
            Pagination::build(1, 10, 95)
        );
    }

    public function test_returns_zero_pages_for_empty_list(): void
    {
        $this->assertSame(
            ['page' => 1, 'limit' => 10, 'total' => 0, 'totalPages' => 0],
            Pagination::build(1, 10, 0)
        );
    }

    public function test_keeps_requested_page_untouched(): void
    {
        $this->assertSame(5, Pagination::build(5, 10, 12)['page']);
    }

    public function test_wraps_data_with_pagination_envelope(): void
    {
        $this->assertSame([
            'data' => ['a', 'b'],
            'meta' => ['page' => 2, 'limit' => 10, 'total' => 12, 'totalPages' => 2],
        ], Pagination::response(['a', 'b'], 2, 10, 12));
    }
}
