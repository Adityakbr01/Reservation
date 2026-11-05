<?php

namespace Tests\Unit\Email;

use App\Support\Email\EmailShared;
use PHPUnit\Framework\TestCase;

class EmailSharedTest extends TestCase
{
    public function test_escape_html_covers_all_interpolated_contexts(): void
    {
        $this->assertSame('&amp;&lt;&gt;&quot;&#39;', EmailShared::escapeHtml('&<>"\''));
    }

    public function test_money_renders_minor_units_with_two_decimals(): void
    {
        $this->assertSame('INR 3000.00', EmailShared::money(300000, 'INR'));
        $this->assertSame('GBP 50.50', EmailShared::money(5050, 'GBP'));
    }

    public function test_safe_urls_allow_http_https_relative_and_anchor_only(): void
    {
        $this->assertTrue(EmailShared::isSafeEmailUrl('https://book.hamptworthstays.com/login'));
        $this->assertTrue(EmailShared::isSafeEmailUrl('http://example.com/x'));
        $this->assertTrue(EmailShared::isSafeEmailUrl('/bookings'));
        $this->assertFalse(EmailShared::isSafeEmailUrl('javascript:alert(1)'));
        $this->assertFalse(EmailShared::isSafeEmailUrl('data:text/html,hi'));
        $this->assertFalse(EmailShared::isSafeEmailUrl('vbscript:msgbox'));
    }

    public function test_email_button_neutralizes_unsafe_targets(): void
    {
        $button = EmailShared::emailButton('javascript:alert(1)', 'Go');

        $this->assertStringContainsString('href="#"', $button);
        $this->assertStringNotContainsString('javascript:', $button);
    }

    public function test_logo_urls_must_be_absolute_https(): void
    {
        $this->assertSame('https://cdn.example.com/logo.webp', EmailShared::resolveLogoUrl('https://cdn.example.com/logo.webp'));
        $this->assertNull(EmailShared::resolveLogoUrl('/logo.webp'));
        $this->assertNull(EmailShared::resolveLogoUrl('http://cdn.example.com/logo.png'));
        $this->assertNull(EmailShared::resolveLogoUrl(null));
    }

    public function test_require_vars_names_every_missing_variable(): void
    {
        $this->expectExceptionMessage('b, c');
        EmailShared::requireVars(['a' => 'x'], ['a', 'b', 'c'], 'DEMO');
    }

    public function test_extract_placeholders_finds_and_dedupes(): void
    {
        $this->assertSame(
            ['bookingReference', 'guestName'],
            EmailShared::extractPlaceholders('Hi {{ guestName }}, ref {{bookingReference}} ({{guestName}})')
        );
    }

    public function test_placeholder_rendering_escapes_values_and_rejects_unknown_vars(): void
    {
        $out = EmailShared::renderPlaceholderTemplate('Hi {{guestName}}', ['guestName' => '<b>A</b>'], ['guestName'], 'DEMO');
        $this->assertSame('Hi &lt;b&gt;A&lt;/b&gt;', $out);

        $this->expectExceptionMessage('unknown variables');
        EmailShared::renderPlaceholderTemplate('Hi {{nope}}', [], ['guestName'], 'DEMO');
    }

    public function test_html_to_text_strips_tags_for_fallback(): void
    {
        $text = EmailShared::htmlToText('<p>Hello<br/>World</p>');

        $this->assertStringContainsString('Hello', $text);
        $this->assertStringNotContainsString('<p>', $text);
    }

    public function test_arrival_time_labels(): void
    {
        $this->assertSame('After 4 pm', EmailShared::checkInLabel('16:00'));
        $this->assertSame('Before 11 am', EmailShared::checkOutLabel('11:00'));
        $this->assertSame('After 4:30 pm', EmailShared::checkInLabel('16:30'));
        $this->assertSame('After 4 pm', EmailShared::checkInLabel(null));
    }

    public function test_sanitizer_preserves_style_blocks_but_strips_scripts(): void
    {
        $clean = EmailShared::sanitizeEmailHtml('<style>.x{color:red}</style><p>Hi</p><script>alert(1)</script><a href="javascript:x">a</a>');

        $this->assertStringContainsString('<style>.x{color:red}</style>', $clean);
        $this->assertStringNotContainsString('<script>', $clean);
        $this->assertStringNotContainsString('javascript:', $clean);
    }
}
