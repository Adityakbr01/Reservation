<?php

namespace Tests\Unit\Support;

use App\Support\CmsRules;
use PHPUnit\Framework\TestCase;

class CmsRulesTest extends TestCase
{
    public function test_accepts_lowercase_hyphen_slugs(): void
    {
        $this->assertTrue(CmsRules::isValidSlug('deluxe-room'));
        $this->assertTrue(CmsRules::isValidSlug('offer-2026'));
    }

    public function test_rejects_uppercase_spaces_and_special_chars(): void
    {
        $this->assertFalse(CmsRules::isValidSlug('Deluxe Room'));
        $this->assertFalse(CmsRules::isValidSlug('room_type'));
        $this->assertFalse(CmsRules::isValidSlug(str_repeat('a', 121)));
    }

    public function test_rejects_reserved_slugs(): void
    {
        foreach (['admin', 'api', 'booking', 'payments', 'webhooks', 'media'] as $slug) {
            $this->assertTrue(CmsRules::isReservedSlug($slug));
        }
        $this->assertFalse(CmsRules::isReservedSlug('deluxe-room'));
    }

    public function test_allows_https_http_relative_mailto_tel_and_anchor(): void
    {
        foreach ([
            'https://example.com/offer',
            'http://example.com',
            '/offers/summer',
            'mailto:stay@example.com',
            'tel:+911234567890',
            '#rooms',
        ] as $url) {
            $this->assertTrue(CmsRules::isAllowedUrl($url), $url);
        }
    }

    public function test_rejects_scriptable_and_protocol_relative_urls(): void
    {
        foreach ([
            'javascript:alert(1)',
            'vbscript:msgbox(1)',
            'data:text/html,<h1>x</h1>',
            '//evil.com/x',
        ] as $url) {
            $this->assertFalse(CmsRules::isAllowedUrl($url), $url);
        }
    }

    public function test_sanitizer_strips_scripts_iframes_and_event_handlers(): void
    {
        $dirty = '<p>Hello</p><script>alert(1)</script><iframe src="x"></iframe><a href="https://ok.com" onclick="steal()">link</a>';
        $clean = CmsRules::sanitizeRichText($dirty);

        $this->assertStringContainsString('<p>Hello</p>', $clean);
        $this->assertStringNotContainsString('<script>', $clean);
        $this->assertStringNotContainsString('<iframe', $clean);
        $this->assertStringNotContainsString('onclick', $clean);
        $this->assertStringContainsString('href="https://ok.com"', $clean);
    }

    public function test_sanitizer_neutralizes_javascript_hrefs(): void
    {
        $clean = CmsRules::sanitizeRichText('<a href="javascript:alert(1)">x</a>');

        $this->assertStringNotContainsString('javascript:', $clean);
        $this->assertStringContainsString('href="#"', $clean);
    }

    public function test_cms_lifecycle_transitions(): void
    {
        $this->assertTrue(CmsRules::canTransition('DRAFT', 'PUBLISHED'));
        $this->assertTrue(CmsRules::canTransition('DRAFT', 'ARCHIVED'));
        $this->assertFalse(CmsRules::canTransition('DRAFT', 'DRAFT'));

        $this->assertTrue(CmsRules::canTransition('PUBLISHED', 'DRAFT'));
        $this->assertTrue(CmsRules::canTransition('PUBLISHED', 'ARCHIVED'));
        $this->assertFalse(CmsRules::canTransition('PUBLISHED', 'PUBLISHED'));

        $this->assertTrue(CmsRules::canTransition('ARCHIVED', 'DRAFT'));
        $this->assertFalse(CmsRules::canTransition('ARCHIVED', 'PUBLISHED'));
        $this->assertFalse(CmsRules::canTransition('ARCHIVED', 'ARCHIVED'));
    }
}
