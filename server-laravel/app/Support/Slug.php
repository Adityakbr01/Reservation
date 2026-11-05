<?php

namespace App\Support;

use Illuminate\Support\Str;

class Slug
{
    /**
     * URL-safe slug: lowercase, ASCII, hyphen-separated.
     * "Deluxe Room" -> "deluxe-room". Empty string when nothing usable remains.
     */
    public static function make(string $input): string
    {
        $ascii = Str::ascii($input);
        $ascii = preg_replace('/[^\x20-\x7E]/', '', $ascii) ?? '';
        $slug = strtolower(trim($ascii));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';

        return trim($slug, '-');
    }
}
