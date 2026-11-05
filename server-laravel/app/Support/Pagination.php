<?php

namespace App\Support;

class Pagination
{
    /**
     * @return array{page: int, limit: int, total: int, totalPages: int}
     */
    public static function build(int $page, int $limit, int $total): array
    {
        return [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'totalPages' => (int) ceil($total / $limit),
        ];
    }

    /**
     * @param  array<int, mixed>  $data
     * @return array{data: array<int, mixed>, meta: array{page: int, limit: int, total: int, totalPages: int}}
     */
    public static function response(array $data, int $page, int $limit, int $total): array
    {
        return [
            'data' => $data,
            'meta' => self::build($page, $limit, $total),
        ];
    }
}
