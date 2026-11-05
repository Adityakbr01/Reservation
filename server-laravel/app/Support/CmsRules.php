<?php

namespace App\Support;

class CmsRules
{
    public const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

    public const RESERVED_SLUGS = [
        'admin', 'api', 'login', 'auth', 'checkout', 'booking', 'bookings',
        'payment', 'payments', 'webhooks', 'assets', 'media',
    ];

    public static function isValidSlug(string $slug): bool
    {
        return strlen($slug) <= 120
            && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) === 1;
    }

    public static function isReservedSlug(string $slug): bool
    {
        return in_array(strtolower($slug), self::RESERVED_SLUGS, true);
    }

    public static function isAllowedUrl(string $url): bool
    {
        $trimmed = trim($url);
        if (str_starts_with($trimmed, '/') && !str_starts_with($trimmed, '//')) {
            return true;
        }
        if (str_starts_with($trimmed, '#')) {
            return true;
        }

        $scheme = parse_url($trimmed, PHP_URL_SCHEME);
        if (!is_string($scheme) || $scheme === '') {
            return false;
        }

        return in_array(strtolower($scheme), ['https', 'http', 'mailto', 'tel'], true);
    }

    public static function sanitizeRichText(string $html): string
    {
        // Remove script/style/iframe/object/embed blocks entirely.
        $clean = preg_replace('/<(script|style|iframe|object|embed)[^>]*>.*?<\/\1>/is', '', $html) ?? '';
        $clean = preg_replace('/<(script|style|iframe|object|embed)[^>]*\/?>/is', '', $clean) ?? '';
        // Remove event-handler attributes (onclick, onerror, ...).
        $clean = preg_replace('/\s+on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/is', '', $clean) ?? '';

        // Neutralize javascript:/vbscript:/data: hrefs and srcs.
        $clean = preg_replace_callback(
            '/\s+(href|src)\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))/is',
            static function (array $matches): string {
                $attr = $matches[1];
                $value = trim($matches[3] ?? $matches[4] ?? $matches[5] ?? '');
                if (preg_match('/^(javascript|vbscript|data):/i', $value)) {
                    return ' ' . $attr . '="#"';
                }

                return ' ' . $attr . '="' . str_replace('"', '&quot;', $value) . '"';
            },
            $clean
        ) ?? '';

        return trim($clean);
    }

    public static function canTransition(string $from, string $to): bool
    {
        $transitions = [
            'DRAFT' => ['PUBLISHED', 'ARCHIVED'],
            'PUBLISHED' => ['DRAFT', 'ARCHIVED'],
            'ARCHIVED' => ['DRAFT'],
        ];

        return in_array($to, $transitions[$from] ?? [], true);
    }
}
