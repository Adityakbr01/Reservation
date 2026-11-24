<?php

namespace App\Support\Email;

class EmailShared
{
    public const DEFAULT_BRAND_NAME = 'Hamptworth Stays';

    public const DEFAULT_BRAND_SITE_URL = 'https://book.hamptworthstays.com/';

    public const DEFAULT_BOOKING_SITE_URL = 'https://book.hamptworthstays.com/';

    public const THEME = [
        'canvas' => '#F7F5EF',
        'card' => '#FFFFFF',
        'ivory' => '#F7F5EF',
        'ivoryDeep' => '#EFE9DA',
        'hairline' => '#D8C7A3',
        'border' => '#E9E5DA',
        'divider' => '#E9E5DA',
        'ink' => '#263D32',
        'body' => '#526157',
        'muted' => '#727C72',
        'faint' => '#899087',
        'gold' => '#D8C7A3',
        'goldLight' => '#EAD9AE',
        'bronze' => '#8A6D3B',
        'forest' => '#263D32',
        'forestDeep' => '#1C2E25',
        'pine' => '#1B2B23',
        'footerMuted' => '#A9B6AF',
    ];

    private const SERIF = "Georgia,'Times New Roman',serif";

    private const SANS = 'Arial,Helvetica,sans-serif';

    private static ?string $configuredLogoUrl = null;

    /**
     * @return array{subject: string, html: string, text: string}
     */
    public static function rendered(string $subject, string $html, string $text): array
    {
        return ['subject' => $subject, 'html' => $html, 'text' => $text];
    }

    public static function escapeHtml(string $value): string
    {
        return str_replace(
            ['&', '<', '>', '"', "'"],
            ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;'],
            $value
        );
    }

    public static function money(int $amount, string $currency): string
    {
        return self::escapeHtml($currency).' '.number_format($amount / 100, 2, '.', '');
    }

    public static function safeSubjectText(string $value): string
    {
        $text = strip_tags($value);
        $text = preg_replace('/[\r\n]+/', ' ', $text) ?? '';
        $text = preg_replace('/\s+/', ' ', $text) ?? '';

        return mb_substr(trim($text), 0, 160);
    }

    /**
     * @param  array{brandName?: ?string, brandSiteUrl?: ?string, bookingSiteUrl?: ?string}  $overrides
     * @return array{brandName: string, brandSiteUrl: string, bookingSiteUrl: string}
     */
    public static function brandLinks(array $overrides = []): array
    {
        return [
            'brandName' => trim((string) ($overrides['brandName'] ?? '')) ?: self::DEFAULT_BRAND_NAME,
            'brandSiteUrl' => trim((string) ($overrides['brandSiteUrl'] ?? '')) ?: self::DEFAULT_BRAND_SITE_URL,
            'bookingSiteUrl' => trim((string) ($overrides['bookingSiteUrl'] ?? '')) ?: self::DEFAULT_BOOKING_SITE_URL,
        ];
    }

    public static function resolveLogoUrl(?string $explicit): ?string
    {
        $raw = trim((string) $explicit);
        if ($raw === '' || strlen($raw) > 500) {
            return null;
        }

        return preg_match('/^https:\/\//i', $raw) === 1 ? $raw : null;
    }

    public static function setEmailLogoUrl(?string $url): void
    {
        self::$configuredLogoUrl = self::resolveLogoUrl($url);
    }

    public static function emailLogoUrl(): ?string
    {
        return self::$configuredLogoUrl ?? self::resolveLogoUrl((string) config('mail.logo_url', ''));
    }

    public static function isSafeEmailUrl(string $url): bool
    {
        $trimmed = trim($url);
        if (str_starts_with($trimmed, '/') && ! str_starts_with($trimmed, '//')) {
            return true;
        }
        if (str_starts_with($trimmed, '#')) {
            return true;
        }

        $scheme = parse_url($trimmed, PHP_URL_SCHEME);

        return is_string($scheme) && in_array(strtolower($scheme), ['http', 'https'], true);
    }

    public static function formatArrivalTime(?string $time, string $prefix): string
    {
        if ($time === null || trim($time) === '') {
            return $prefix === 'After' ? 'After 4 pm' : 'Before 11 am';
        }

        if (preg_match('/^(\d{1,2}):(\d{2})$/', trim($time), $match) !== 1) {
            return $prefix.' '.$time;
        }

        $hour = (int) $match[1];
        $minutes = $match[2];
        $suffix = $hour >= 12 ? 'pm' : 'am';
        $twelve = $hour % 12;
        if ($twelve === 0) {
            $twelve = 12;
        }
        $rest = $minutes === '00' ? '' : ':'.$minutes;

        return "{$prefix} {$twelve}{$rest} {$suffix}";
    }

    public static function checkInLabel(?string $time): string
    {
        return self::formatArrivalTime($time, 'After');
    }

    public static function checkOutLabel(?string $time): string
    {
        return self::formatArrivalTime($time, 'Before');
    }

    public static function mapsDirectionsUrl(?string $address): ?string
    {
        $trimmed = trim((string) $address);

        return $trimmed === ''
            ? null
            : 'https://www.google.com/maps/dir/?api=1&destination='.rawurlencode($trimmed);
    }

    public static function emailButton(string $url, string $label): string
    {
        $safeUrl = self::isSafeEmailUrl($url) ? $url : '#';
        $sans = self::SANS;
        $forest = self::THEME['forest'];

        return "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin: 28px 0 4px 0;\"><tr><td align=\"center\" class=\"hs-btn-cell\" bgcolor=\"{$forest}\" style=\"border-radius: 4px; background-color: {$forest};\"><a href=\"".self::escapeHtml($safeUrl)."\" style=\"display: inline-block; padding: 16px 28px; font-family: {$sans}; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; color: #FFFFFF; text-decoration: none;\"><span style=\"color: #FFFFFF; text-decoration: none;\">{$label} &rarr;</span></a></td></tr></table>";
    }

    public static function goldRule(): string
    {
        return '<div style="width: 56px; height: 2px; background-color: '.self::THEME['gold'].'; margin: 14px 0 4px 0;"></div>';
    }

    public static function goldRuleCentered(): string
    {
        return '<div style="text-align: center; margin: 12px 0 4px 0;"><div style="display: inline-block; width: 56px; height: 2px; background-color: '.self::THEME['gold'].';"></div></div>';
    }

    public static function eyebrow(string $text): string
    {
        $sans = self::SANS;
        $bronze = self::THEME['bronze'];

        return "<p style=\"margin: 0; font-family: {$sans}; font-size: 11px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: {$bronze};\">".self::escapeHtml($text).'</p>';
    }

    public static function eyebrowOnDark(string $text): string
    {
        $sans = self::SANS;
        $gold = self::THEME['goldLight'];

        return "<p style=\"margin: 0; font-family: {$sans}; font-size: 11px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: {$gold};\">".self::escapeHtml($text).'</p>';
    }

    public static function sectionTitle(string $text): string
    {
        $serif = self::SERIF;
        $ink = self::THEME['ink'];

        return "<h2 style=\"margin: 30px 0 12px 0; font-family: {$serif}; font-size: 22px; line-height: 1.3; font-weight: normal; color: {$ink};\">".self::escapeHtml($text).'</h2>';
    }

    public static function p(string $text): string
    {
        $sans = self::SANS;
        $body = self::THEME['body'];

        return "<p style=\"margin: 0 0 18px 0; font-family: {$sans}; font-size: 15px; line-height: 1.9; color: {$body};\">{$text}</p>";
    }

    public static function infoCard(string $inner): string
    {
        $ivory = self::THEME['ivory'];
        $border = self::THEME['border'];

        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"margin: 20px 0;\"><tr><td bgcolor=\"{$ivory}\" style=\"background-color: {$ivory}; border: 1px solid {$border}; border-radius: 4px; padding: 20px 22px;\">{$inner}</td></tr></table>";
    }

    public static function infoRow(string $label, string $value): string
    {
        $sans = self::SANS;
        $serif = self::SERIF;
        $muted = self::THEME['muted'];
        $ink = self::THEME['ink'];

        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"margin: 8px 0;\"><tr><td style=\"font-family: {$sans}; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: {$muted}; padding: 2px 0;\">{$label}</td><td align=\"right\" style=\"font-family: {$serif}; font-size: 17px; color: {$ink}; padding: 2px 0;\">{$value}</td></tr></table>";
    }

    public static function refPill(string $reference): string
    {
        $sans = self::SANS;
        $forest = self::THEME['forest'];
        $hairline = self::THEME['hairline'];

        return "<span style=\"display: inline-block; font-family: {$sans}; font-size: 12px; font-weight: bold; letter-spacing: 1px; color: {$forest}; background-color: #FFFFFF; border: 1px solid {$hairline}; border-radius: 999px; padding: 5px 14px;\">".self::escapeHtml($reference).'</span>';
    }

    public static function refPillLight(string $reference): string
    {
        $sans = self::SANS;
        $goldLight = self::THEME['goldLight'];
        $gold = self::THEME['gold'];

        return "<span style=\"display: inline-block; font-family: {$sans}; font-size: 12px; font-weight: bold; letter-spacing: 1px; color: {$goldLight}; background-color: transparent; border: 1px solid {$gold}; border-radius: 999px; padding: 5px 14px;\">".self::escapeHtml($reference).'</span>';
    }

    public static function heroCard(string $reference, string $cottageName, string $detailLine): string
    {
        $sans = self::SANS;
        $serif = self::SERIF;
        $ivory = self::THEME['ivory'];
        $border = self::THEME['border'];
        $muted = self::THEME['muted'];
        $ink = self::THEME['ink'];
        $body = self::THEME['body'];

        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"margin: 24px 0;\"><tr><td bgcolor=\"{$ivory}\" style=\"background-color: {$ivory}; border: 1px solid {$border}; border-radius: 4px; padding: 24px 24px 22px 24px;\"><p style=\"margin: 0 0 6px 0; font-family: {$sans}; font-size: 11px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: {$muted};\">Your stay</p><p style=\"margin: 0 0 8px 0; font-family: {$serif}; font-size: 24px; line-height: 1.25; color: {$ink};\">".self::escapeHtml($cottageName)."</p><p style=\"margin: 0 0 14px 0; font-family: {$sans}; font-size: 14px; line-height: 1.8; color: {$body};\">{$detailLine}</p>".self::refPill($reference).'</td></tr></table>';
    }

    /**
     * @param  array<int, array{url: string, label: string}>  $links
     */
    public static function textLinks(array $links): string
    {
        $sans = self::SANS;
        $forest = self::THEME['forest'];
        $muted = self::THEME['muted'];
        $body = self::THEME['body'];
        $items = [];
        foreach ($links as $link) {
            $safeUrl = self::isSafeEmailUrl($link['url']) ? $link['url'] : '#';
            $items[] = '<a href="'.self::escapeHtml($safeUrl)."\" style=\"font-family: {$sans}; font-size: 14px; font-weight: bold; color: {$forest}; text-decoration: underline;\"><span style=\"color: {$forest};\">{$link['label']}</span></a>";
        }
        $joined = implode("<span style=\"color: {$muted}; padding: 0 10px;\">|</span>", $items);

        return "<p style=\"margin: 22px 0 0 0; font-family: {$sans}; font-size: 14px; line-height: 2; color: {$body};\">{$joined}</p>";
    }

    public static function siteLinksFooter(array $links): string
    {
        return self::textLinks([
            ['url' => $links['brandSiteUrl'], 'label' => "Explore {$links['brandName']} →"],
            ['url' => $links['bookingSiteUrl'], 'label' => 'Visit our booking website →'],
        ]);
    }

    /**
     * @param  array{preheader?: ?string, logoUrl?: ?string, brandSiteUrl?: ?string, bookingSiteUrl?: ?string}  $options
     */
    public static function layout(string $title, string $greeting, string $body, string $footer, array $options = []): string
    {
        $preheader = self::escapeHtml(mb_substr((string) ($options['preheader'] ?? $title), 0, 140));
        $logoUrl = self::resolveLogoUrl($options['logoUrl'] ?? null) ?? self::emailLogoUrl();
        $brandSiteUrl = trim((string) ($options['brandSiteUrl'] ?? '')) ?: self::DEFAULT_BRAND_SITE_URL;
        $bookingSiteUrl = trim((string) ($options['bookingSiteUrl'] ?? '')) ?: self::DEFAULT_BOOKING_SITE_URL;
        $brandSiteUrl = self::escapeHtml($brandSiteUrl);
        $bookingSiteUrl = self::escapeHtml($bookingSiteUrl);
        $theme = self::THEME;
        $sans = self::SANS;
        $serif = self::SERIF;
        $brand = self::escapeHtml(self::DEFAULT_BRAND_NAME);
        $mastheadMark = $logoUrl !== null
            ? '<img src="'.self::escapeHtml($logoUrl).'" alt="'.$brand.'" width="150" style="display: inline-block; width: 150px; max-width: 62%; height: auto; border: 0; margin: 0 0 12px 0;" /><br />'
            : '<a href="'.self::escapeHtml($brandSiteUrl)."\" style=\"font-family: {$serif}; font-size: 28px; letter-spacing: 1px; color: #FFFFFF; text-decoration: none;\"><span style=\"color: #FFFFFF;\">{$brand}</span></a>";
        $year = date('Y');
        $hello = 'Hello'.($greeting !== '' ? ' '.$greeting : '').',';
        $greetingLine = $hello;
        $footerHtml = $footer;
        $titleEscaped = $title;

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<title>{$title}</title>
<style>
@media only screen and (max-width: 620px) {
  .hs-card { width: 100% !important; }
  .hs-pad-mast { padding: 26px 20px !important; }
  .hs-pad-body { padding: 28px 20px 24px !important; }
  .hs-title { font-size: 28px !important; }
  .hs-btn-cell a { padding: 15px 22px !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: {$theme['canvas']}; font-family: {$sans}; color: {$theme['ink']};">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">{$preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: {$theme['canvas']};">
<tr><td align="center" style="padding: 28px 10px 32px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="hs-card" style="width: 100%; max-width: 600px; background-color: {$theme['card']};" bgcolor="{$theme['card']}">
<tr><td align="center" bgcolor="{$theme['forest']}" class="hs-pad-mast" style="padding: 30px 24px; background-color: {$theme['forest']};">
{$mastheadMark}
<p style="margin: 12px 0 0 0; font-family: {$sans}; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: {$theme['gold']};"><span style="color: {$theme['gold']};">Your countryside escape</span></p>
</td></tr>
<tr><td class="hs-pad-body" style="padding: 36px 28px 30px 28px;">
<p style="margin: 0 0 18px 0; font-family: {$sans}; font-size: 15px; line-height: 1.8; color: {$theme['body']};">{$greetingLine}</p>
<h1 class="hs-title" style="margin: 0 0 22px 0; font-family: {$serif}; font-size: 34px; line-height: 1.25; font-weight: normal; color: {$theme['ink']};">{$titleEscaped}</h1>
<div style="font-family: {$sans};">{$body}</div>
<p style="margin: 22px 0 0 0; font-family: {$sans}; font-size: 14px; line-height: 1.8; color: {$theme['body']};">Warm wishes,<br /><strong style="color: {$theme['ink']};">The {$brand} Team</strong></p>
</td></tr>
<tr><td style="padding: 0 32px;"><div style="border-top: 1px solid {$theme['divider']};"></div></td></tr>
<tr><td align="center" bgcolor="{$theme['ivory']}" style="padding: 28px 24px; background-color: {$theme['ivory']};">
<p style="margin: 0 0 10px 0; font-family: {$serif}; font-size: 20px; color: {$theme['ink']};">{$brand}</p>
<p style="margin: 0 0 18px 0; font-family: {$sans}; font-size: 12px; line-height: 1.8; color: {$theme['muted']};">Thoughtful stays. Memorable escapes.</p>
<p style="margin: 0 0 18px 0; font-family: {$sans}; font-size: 12px; line-height: 1.8;"><a href="{$brandSiteUrl}" style="color: {$theme['forest']}; text-decoration: underline;"><span style="color: {$theme['forest']};">Our Website</span></a><span style="color: {$theme['muted']};">&nbsp;&nbsp;|&nbsp;&nbsp;</span><a href="{$bookingSiteUrl}" style="color: {$theme['forest']}; text-decoration: underline;"><span style="color: {$theme['forest']};">Book Your Stay</span></a></p>
<p style="margin: 0; font-family: {$sans}; font-size: 11px; line-height: 1.8; color: {$theme['faint']};">{$footerHtml}</p>
<p style="margin: 12px 0 0 0; font-family: {$sans}; font-size: 11px; color: {$theme['faint']};">&copy; {$year} {$brand}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
HTML;
    }

    public static function htmlToText(string $html): string
    {
        $text = preg_replace('/<\s*br\s*\/?>/i', "\n", $html) ?? '';
        $text = preg_replace('/<\s*\/\s*(p|div|tr|li|h\d)\s*>/i', "\n", $text) ?? '';
        $text = strip_tags($text);
        $text = str_replace(
            ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;', '&nbsp;'],
            ['&', '<', '>', '"', "'", ' '],
            $text
        );
        $lines = array_filter(array_map('trim', explode("\n", $text)), static fn (string $line): bool => $line !== '');

        return mb_substr(implode("\n\n", $lines), 0, 8000);
    }

    /**
     * @return array<int, string>
     */
    public static function extractPlaceholders(string $template): array
    {
        preg_match_all('/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/', $template, $matches);
        $found = array_values(array_unique($matches[1] ?? []));
        sort($found);

        return $found;
    }

    /**
     * @param  array<string, mixed>  $vars
     * @param  array<int, string>  $required
     */
    public static function requireVars(array $vars, array $required, string $templateKey): void
    {
        $missing = [];
        foreach ($required as $key) {
            $value = $vars[$key] ?? null;
            if ($value === null || trim((string) $value) === '') {
                $missing[] = $key;
            }
        }
        if ($missing !== []) {
            throw new \RuntimeException("Email template {$templateKey} is missing required variables: ".implode(', ', $missing));
        }
    }

    /**
     * @param  array<string, string>  $vars
     * @param  array<int, string>  $allowed
     */
    public static function renderPlaceholderTemplate(string $template, array $vars, array $allowed, string $templateKey): string
    {
        $unknown = array_values(array_diff(self::extractPlaceholders($template), $allowed));
        if ($unknown !== []) {
            throw new \RuntimeException("Email template {$templateKey} uses unknown variables: ".implode(', ', $unknown));
        }

        return preg_replace_callback(
            '/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/',
            static fn (array $m): string => self::escapeHtml((string) ($vars[$m[1]] ?? '')),
            $template
        ) ?? '';
    }

    public static function sanitizeEmailHtml(string $html): string
    {
        $styles = [];
        $withoutStyles = preg_replace_callback(
            '/<style[^>]*>[\s\S]*?<\/style>/i',
            static function (array $match) use (&$styles): string {
                $styles[] = $match[0];

                return '__EMAIL_STYLE_'.(count($styles) - 1).'__';
            },
            $html
        ) ?? '';

        $clean = preg_replace('/<(script|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/i', '', $withoutStyles) ?? '';
        $clean = preg_replace('/<(script|iframe|object|embed)[^>]*\/?>/i', '', $clean) ?? '';
        $clean = preg_replace('/\s+on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $clean) ?? '';
        $clean = preg_replace_callback(
            '/\s+(href|src)\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))/i',
            static function (array $m): string {
                $attr = $m[1];
                $value = trim($m[3] ?? $m[4] ?? $m[5] ?? '');
                if (preg_match('/^(javascript|vbscript|data):/i', $value)) {
                    return ' '.$attr.'="#"';
                }

                return ' '.$attr.'="'.str_replace('"', '&quot;', $value).'"';
            },
            $clean
        ) ?? '';

        $clean = trim($clean);

        return preg_replace_callback(
            '/__EMAIL_STYLE_(\d+)__/',
            static fn (array $m): string => $styles[(int) $m[1]] ?? '',
            $clean
        ) ?? '';
    }
}
