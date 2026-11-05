<?php

namespace Tests\Unit\Email;

use App\Services\EmailTemplateService;
use App\Support\Email\EmailRegistry;
use App\Support\Email\Templates\AdminTemplates;
use App\Support\Email\Templates\AuthTemplates;
use App\Support\Email\Templates\BookingTemplates;
use App\Support\Email\Templates\PaymentTemplates;
use App\Support\Email\Templates\WelcomeTemplates;
use Tests\TestCase;

class EmailTemplatesTest extends TestCase
{
    private function service(): EmailTemplateService
    {
        return new EmailTemplateService();
    }

    private function base(): array
    {
        return [
            'guestName' => 'Neha Kumari',
            'bookingReference' => 'QB-ABC123',
            'propertyName' => 'Reservation House',
            'roomSummary' => 'Deluxe Room',
            'checkIn' => '10 Oct 2026',
            'checkOut' => '12 Oct 2026',
            'nights' => 2,
            'guests' => '2 adults',
            'currency' => 'INR',
            'subtotal' => 300000,
            'discount' => 0,
            'taxes' => 0,
            'fees' => 0,
            'total' => 300000,
            'totalPaid' => 300000,
            'paymentStatus' => 'paid',
            'cancellationPolicy' => 'Free cancellation until 24h before check-in (100% refund).',
            'supportEmail' => 'stay@example.com',
            'manageUrl' => 'http://localhost:5173/bookings',
        ];
    }

    public function test_confirmation_carries_booking_reference(): void
    {
        $rendered = BookingTemplates::bookingConfirmed($this->base());

        $this->assertStringContainsString('QB-ABC123', $rendered['subject']);
        $this->assertStringContainsString('QB-ABC123', $rendered['html']);
    }

    public function test_received_mail_warns_about_hold_expiry(): void
    {
        $rendered = BookingTemplates::bookingReceived($this->base());

        $this->assertStringContainsString('hold', strtolower($rendered['html']));
    }

    public function test_cancelled_mail_with_zero_refund_says_none_due(): void
    {
        $rendered = BookingTemplates::bookingCancelled(array_merge($this->base(), [
            'cancelledAt' => '2026-10-03',
            'refundAmount' => 0,
            'refundStatus' => 'none',
        ]));

        $this->assertStringContainsString('No refund was due', $rendered['html']);
    }

    public function test_cancelled_mail_with_refund_shows_amount_and_status(): void
    {
        $rendered = BookingTemplates::bookingCancelled(array_merge($this->base(), [
            'cancelledAt' => '2026-10-03',
            'refundAmount' => 300000,
            'refundStatus' => 'succeeded',
        ]));

        $this->assertStringContainsString('INR 3000.00', $rendered['html']);
        $this->assertStringContainsString('succeeded', $rendered['html']);
    }

    public function test_payment_failed_mail_mentions_retry_without_card_data(): void
    {
        $rendered = PaymentTemplates::paymentFailed([
            'guestName' => 'Neha',
            'bookingReference' => 'QB-ABC123',
            'holdExpiresAt' => '2026-10-04T10:00:00Z',
            'supportEmail' => 'stay@example.com',
            'manageUrl' => 'http://localhost:5173/bookings',
        ]);

        $this->assertStringContainsString('retry', strtolower($rendered['html']));
        $this->assertDoesNotMatchRegularExpression('/card number|cvv|secret/i', $rendered['html']);
    }

    public function test_refund_update_shows_amount_and_status(): void
    {
        $rendered = PaymentTemplates::refundUpdated([
            'guestName' => 'Neha',
            'bookingReference' => 'QB-ABC123',
            'currency' => 'INR',
            'refundAmount' => 150000,
            'refundStatus' => 'succeeded',
            'supportEmail' => 'stay@example.com',
        ]);

        $this->assertStringContainsString('INR 1500.00', $rendered['html']);
    }

    public function test_reminder_mentions_check_in_date_and_rooms(): void
    {
        $rendered = BookingTemplates::checkinReminder($this->base());

        $this->assertStringContainsString('10 Oct 2026', $rendered['html']);
        $this->assertStringContainsString('Deluxe Room', $rendered['html']);
    }

    public function test_admin_alert_links_the_booking_reference(): void
    {
        $rendered = AdminTemplates::adminAlert([
            'bookingReference' => 'QB-ABC123',
            'headline' => 'New booking',
            'detail' => 'Paid in full.',
            'adminUrl' => 'http://localhost:5174/reservations/abc',
        ], 'New booking');

        $this->assertStringContainsString('QB-ABC123', $rendered['subject']);
        $this->assertStringContainsString('http://localhost:5174/reservations/abc', $rendered['html']);
    }

    public function test_password_reset_mail_escapes_name_and_keeps_real_url(): void
    {
        $rendered = AuthTemplates::passwordReset('<b>Neha</b>', 'https://x/reset-password?token=abc&u=1');

        $this->assertStringNotContainsString('<b>Neha</b>', $rendered['html']);
        $this->assertStringContainsString('&lt;b&gt;Neha&lt;/b&gt;', $rendered['html']);
        $this->assertStringContainsString('https://x/reset-password?token=abc&amp;u=1', $rendered['html']);
    }

    public function test_password_changed_mail_never_carries_a_token(): void
    {
        $rendered = AuthTemplates::passwordChanged('Neha');

        $this->assertDoesNotMatchRegularExpression('/token/i', $rendered['html']);
        $this->assertDoesNotMatchRegularExpression('/token/i', $rendered['text']);
        $this->assertStringContainsString('https://book.hamptworthstays.com/login', $rendered['html']);
    }

    public function test_welcome_and_admin_escape_untrusted_values(): void
    {
        $this->assertStringNotContainsString('<img src=x', WelcomeTemplates::welcome('<img src=x onerror=alert(1)>')['html']);

        $alert = AdminTemplates::adminAlert([
            'bookingReference' => 'QB-1',
            'headline' => '<b>Hi</b>',
            'detail' => 'd',
            'adminUrl' => 'https://a.com/x',
        ], '<b>Hi</b>');
        $this->assertStringNotContainsString('<b>Hi</b>', $alert['html']);
    }

    public function test_checked_in_and_checked_out_copy(): void
    {
        $checkedIn = BookingTemplates::checkedIn($this->base());
        $this->assertStringContainsString('QB-ABC123', $checkedIn['html']);

        $checkedOut = BookingTemplates::checkedOut($this->base());
        $this->assertStringContainsString('INR 3000.00', $checkedOut['html']);
        $this->assertStringContainsString('QB-ABC123', $checkedOut['html']);
    }

    public function test_every_template_renders_complete_responsive_on_brand_mail(): void
    {
        foreach (EmailRegistry::KEYS as $key) {
            $rendered = $this->service()->codeDefaultFor($key);

            $this->assertNotSame('', trim($rendered['subject']), $key);
            $this->assertStringContainsString('viewport', $rendered['html'], $key);
            $this->assertStringContainsString('max-width: 600px', $rendered['html'], $key);
            $this->assertStringContainsString('#263D32', $rendered['html'], $key);
            $this->assertStringContainsString('#F7F5EF', $rendered['html'], $key);
            $this->assertStringContainsString('#D8C7A3', $rendered['html'], $key);
            $this->assertStringNotContainsString('family: "', $rendered['html'], $key);
            $this->assertGreaterThan(20, strlen(trim($rendered['text'])), $key);
            $this->assertStringNotContainsString('<div', $rendered['text'], $key);
            $this->assertStringNotContainsString('<table', $rendered['text'], $key);
        }
    }

    public function test_required_copy_for_checkout_and_account_mail(): void
    {
        $service = $this->service();

        $checkedOut = $service->codeDefaultFor('CHECKED_OUT');
        $this->assertSame('Thank You for Staying at Fern Cottage', $checkedOut['subject']);
        $this->assertStringContainsString('Thank you for choosing <strong>Fern Cottage</strong>', $checkedOut['html']);
        $this->assertStringContainsString('Thank you for choosing Fern Cottage by Hamptworth Stays.', $checkedOut['text']);

        $reset = $service->codeDefaultFor('PASSWORD_RESET');
        $this->assertSame('Reset Your Hamptworth Stays Password', $reset['subject']);
        $this->assertStringContainsString('Reset Your Password', $reset['html']);
        $this->assertStringContainsString('reset-password?token=preview-token', $reset['html']);
        $this->assertStringContainsString('reset-password?token=preview-token', $reset['text']);

        $changed = $service->codeDefaultFor('PASSWORD_CHANGED');
        $this->assertSame('Your Password Has Been Updated', $changed['subject']);
        $this->assertStringContainsString('Sign In to Your Account', $changed['html']);
        $this->assertStringContainsString('https://book.hamptworthstays.com/login', $changed['html']);
        $this->assertStringContainsString('https://book.hamptworthstays.com/login', $changed['text']);
        $this->assertStringNotContainsString('preview-token', $changed['html']);
    }
}
