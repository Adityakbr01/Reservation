<?php

namespace App\Services;

use App\Support\AppError;
use App\Support\Email\EmailRegistry;
use App\Support\Email\EmailShared;
use App\Support\Email\Templates\AdminTemplates;
use App\Support\Email\Templates\AuthTemplates;
use App\Support\Email\Templates\BookingTemplates;
use App\Support\Email\Templates\PaymentTemplates;
use App\Support\Email\Templates\WelcomeTemplates;

class EmailTemplateService
{
    /**
     * @return array{subject: string, html: string, text: string}
     */
    public function codeDefaultFor(string $key): array
    {
        $booking = EmailRegistry::dummyBookingContext();

        return match ($key) {
            'BOOKING_RECEIVED' => BookingTemplates::bookingReceived($booking),
            'BOOKING_CONFIRMED' => BookingTemplates::bookingConfirmed($booking),
            'PAYMENT_FAILED' => PaymentTemplates::paymentFailed([
                'guestName' => $booking['guestName'],
                'bookingReference' => $booking['bookingReference'],
                'holdExpiresAt' => '23 Dec 2026, 4:00 pm',
                'supportEmail' => $booking['supportEmail'],
                'manageUrl' => $booking['manageUrl'],
            ]),
            'REFUND_UPDATED' => PaymentTemplates::refundUpdated([
                'guestName' => $booking['guestName'],
                'bookingReference' => $booking['bookingReference'],
                'currency' => $booking['currency'],
                'refundAmount' => $booking['total'],
                'refundStatus' => 'succeeded',
                'supportEmail' => $booking['supportEmail'],
            ]),
            'BOOKING_CANCELLED' => BookingTemplates::bookingCancelled(array_merge($booking, [
                'cancelledAt' => '18 Dec 2026',
                'refundAmount' => $booking['total'],
                'refundStatus' => 'succeeded',
            ])),
            'CHECKIN_REMINDER' => BookingTemplates::checkinReminder($booking),
            'CHECKED_IN' => BookingTemplates::checkedIn($booking),
            'CHECKED_OUT' => BookingTemplates::checkedOut($booking),
            'PASSWORD_RESET' => AuthTemplates::passwordReset(
                $booking['guestName'],
                'https://book.hamptworthstays.com/reset-password?token=preview-token'
            ),
            'PASSWORD_CHANGED' => AuthTemplates::passwordChanged($booking['guestName']),
            'WELCOME', 'REGISTER' => WelcomeTemplates::welcome($booking['guestName']),
            'ADMIN_NEW_BOOKING' => AdminTemplates::adminAlert([
                'bookingReference' => $booking['bookingReference'],
                'headline' => 'New booking',
                'detail' => 'Alexandra Morgan, Fern Cottage, 20 Dec 2026 → 23 Dec 2026.',
                'adminUrl' => 'https://admin.hamptworthstays.com/reservations/abc123',
            ], 'New booking'),
            'ADMIN_PAYMENT_FAILURE' => AdminTemplates::adminAlert([
                'bookingReference' => $booking['bookingReference'],
                'headline' => 'Payment failure',
                'detail' => 'Payment for Alexandra Morgan failed. Booking is failed.',
                'adminUrl' => 'https://admin.hamptworthstays.com/reservations/abc123',
            ], 'Payment failure'),
            'ADMIN_CANCELLATION' => AdminTemplates::adminAlert([
                'bookingReference' => $booking['bookingReference'],
                'headline' => 'Booking cancelled',
                'detail' => 'Cancelled by guest/admin. Payment state: paid.',
                'adminUrl' => 'https://admin.hamptworthstays.com/reservations/abc123',
            ], 'Booking cancelled'),
            'ADMIN_SOLD_OUT' => AdminTemplates::adminAlert([
                'bookingReference' => $booking['bookingReference'],
                'headline' => 'Fully booked',
                'detail' => 'All rooms are now sold for 20 Dec 2026 → 23 Dec 2026. Triggered by this booking.',
                'adminUrl' => 'https://admin.hamptworthstays.com/reservations/abc123',
            ], 'Fully booked'),
            default => throw new \InvalidArgumentException("No default render for email template {$key}"),
        };
    }

    /**
     * Converts the code-default render back into editable {{variables}}.
     *
     * @return array{subject: string, htmlBody: string, textBody: string}
     */
    public function editableSourceFor(string $key): array
    {
        $definition = EmailRegistry::definition($key);
        $allowed = array_flip(array_merge($definition['requiredVars'], $definition['optionalVars']));
        $vars = EmailRegistry::dummyStringVars($key);
        $default = $this->codeDefaultFor($key);
        $skipPlain = array_flip(['nights', 'paymentStatus', 'currency', 'propertyName']);

        $pairs = [];
        foreach ($vars as $name => $value) {
            if (isset($allowed[$name]) && ! isset($skipPlain[$name]) && mb_strlen(trim($value)) >= 4) {
                $pairs[$name] = $value;
            }
        }
        uasort($pairs, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));

        $restore = static function (string $source) use ($allowed, $vars, $pairs): string {
            $out = $source;
            if (isset($allowed['nights']) && ($vars['nights'] ?? '') !== '') {
                $out = str_replace("{$vars['nights']} nights", '{{nights}} nights', $out);
                $out = str_replace("{$vars['nights']} night", '{{nights}} night', $out);
                $out = str_replace(">{$vars['nights']} / ", '>{{nights}} / ', $out);
            }
            if (isset($allowed['paymentStatus']) && ($vars['paymentStatus'] ?? '') !== '') {
                $out = str_replace("({$vars['paymentStatus']})", '({{paymentStatus}})', $out);
            }
            foreach ($pairs as $name => $value) {
                if ($value === '') {
                    continue;
                }
                $out = str_replace($value, '{{'.$name.'}}', $out);
            }

            return $out;
        };

        return [
            'subject' => $restore($default['subject']),
            'htmlBody' => $restore($default['html']),
            'textBody' => $restore($default['text']),
        ];
    }

    /**
     * @return array{subject: string, htmlBody: string, textBody: string}
     */
    public function starterFor(string $key): array
    {
        $definition = EmailRegistry::definition($key);
        $allVars = array_merge($definition['requiredVars'], $definition['optionalVars']);
        $varComment = '<!-- Available variables: '.implode(' ', array_map(static fn (string $name): string => '{{'.$name.'}}', $allVars)).' -->';
        $subject = preg_replace_callback('/QB-[A-Z0-9]+|Fern Cottage|Deluxe Room/', static function (array $m): string {
            return str_starts_with($m[0], 'QB-') ? '{{bookingReference}}' : '{{cottageName}}';
        }, $this->codeDefaultFor($key)['subject']) ?? '';
        $htmlBody = "<div style=\"font-family: Arial,Helvetica,sans-serif; font-size: 15px; line-height: 1.9; color: #526157;\">\n<p>Hello {{guestName}},</p>\n<p>[Write your message here. Click a variable below to insert it.]</p>\n<p>Warm wishes,<br />The Hamptworth Stays Team</p>\n</div>\n{$varComment}";
        $textBody = implode("\n", ['Hello {{guestName}},', '', '[Write your message here.]', '', 'Warm wishes,', 'The Hamptworth Stays Team']);

        return ['subject' => $subject, 'htmlBody' => $htmlBody, 'textBody' => $textBody];
    }

    /**
     * @param  array<string, string>  $vars
     * @param  array{subject: string, html: string, text: string}  $codeDefault
     * @param  array<string, mixed>|null  $override
     * @return array{rendered: array{subject: string, html: string, text: string}, source: string}
     */
    public function renderWithOverride(string $key, array $vars, array $codeDefault, ?array $override): array
    {
        if ($override === null || ! ($override['isEnabled'] ?? $override['is_enabled'] ?? true)) {
            return ['rendered' => $codeDefault, 'source' => 'default'];
        }

        $subjectCustom = trim((string) ($override['subject'] ?? ''));
        $htmlCustom = trim((string) ($override['htmlBody'] ?? $override['html_body'] ?? ''));
        $textCustom = trim((string) ($override['textBody'] ?? $override['text_body'] ?? ''));
        if ($subjectCustom === '' && $htmlCustom === '' && $textCustom === '') {
            return ['rendered' => $codeDefault, 'source' => 'default'];
        }

        $allowed = $this->allowedVars($key);
        $unknown = [];
        foreach ([$subjectCustom, $htmlCustom, $textCustom] as $field) {
            foreach (EmailShared::extractPlaceholders($field) as $name) {
                if (! in_array($name, $allowed, true)) {
                    $unknown[] = $name;
                }
            }
        }
        $unknown = array_values(array_unique($unknown));
        if ($unknown !== []) {
            throw new \RuntimeException('unknown variables: '.implode(', ', $unknown));
        }

        $html = $htmlCustom !== ''
            ? EmailShared::renderPlaceholderTemplate(EmailShared::sanitizeEmailHtml($htmlCustom), $vars, $allowed, $key)
            : $codeDefault['html'];
        $subject = $subjectCustom !== ''
            ? EmailShared::renderPlaceholderTemplate($subjectCustom, $vars, $allowed, $key)
            : $codeDefault['subject'];
        $text = $textCustom !== ''
            ? (trim($this->renderTextPlaceholders($textCustom, $vars)) ?: EmailShared::htmlToText($html))
            : $codeDefault['text'];
        if (trim($subject) === '' || trim($html) === '') {
            throw new \RuntimeException('override renders empty');
        }

        return [
            'rendered' => ['subject' => $subject, 'html' => $html, 'text' => $text],
            'source' => 'custom',
        ];
    }

    /**
     * @param  array{subject?: ?string, htmlBody?: ?string, textBody?: ?string}  $draft
     * @return array{subject: string, html: string, text: string, source: string, variables: array<string, array<int, string>>}
     */
    public function renderDraftPreview(string $key, array $draft): array
    {
        $definition = EmailRegistry::definition($key);
        $allowed = $this->allowedVars($key);
        $provided = [(string) ($draft['subject'] ?? ''), (string) ($draft['htmlBody'] ?? ''), (string) ($draft['textBody'] ?? '')];
        $unknown = [];
        foreach ($provided as $field) {
            foreach (EmailShared::extractPlaceholders($field) as $name) {
                if (! in_array($name, $allowed, true)) {
                    $unknown[$name] = $name;
                }
            }
        }
        if ($unknown !== []) {
            sort($unknown);
            throw new AppError(
                'Unknown variables: '.implode(', ', $unknown).'. Allowed: '.implode(', ', $allowed),
                400,
                'EMAIL_TEMPLATE_VARS_UNKNOWN'
            );
        }

        $codeDefault = $this->codeDefaultFor($key);
        $vars = EmailRegistry::dummyStringVars($key);
        $subjectSrc = trim((string) ($draft['subject'] ?? '')) !== '' ? (string) $draft['subject'] : $codeDefault['subject'];
        $htmlSrc = trim((string) ($draft['htmlBody'] ?? '')) !== '' ? (string) $draft['htmlBody'] : $codeDefault['html'];
        $textSrc = trim((string) ($draft['textBody'] ?? '')) !== '' ? (string) $draft['textBody'] : $codeDefault['text'];

        $html = $htmlSrc === $codeDefault['html'] ? $htmlSrc : EmailShared::sanitizeEmailHtml($htmlSrc);
        if (trim($html) === '') {
            throw new AppError('Template HTML was rejected as unsafe', 400, 'EMAIL_TEMPLATE_UNSAFE');
        }
        $subject = $subjectSrc === $codeDefault['subject']
            ? $subjectSrc
            : EmailShared::renderPlaceholderTemplate($subjectSrc, $vars, $allowed, $key);
        if ($htmlSrc !== $codeDefault['html']) {
            $html = EmailShared::renderPlaceholderTemplate($html, $vars, $allowed, $key);
        }
        $text = $textSrc === $codeDefault['text']
            ? $textSrc
            : (trim($this->renderTextPlaceholders($textSrc, $vars)) ?: EmailShared::htmlToText($html));
        if (trim($subject) === '') {
            throw new AppError('Template needs a subject', 400, 'EMAIL_TEMPLATE_EMPTY');
        }

        return [
            'subject' => $subject,
            'html' => $html,
            'text' => $text,
            'source' => 'draft',
            'variables' => ['required' => $definition['requiredVars'], 'optional' => $definition['optionalVars']],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function allowedVars(string $key): array
    {
        $definition = EmailRegistry::definition($key);

        return array_merge($definition['requiredVars'], $definition['optionalVars']);
    }

    /**
     * @param  array<string, string>  $vars
     */
    private function renderTextPlaceholders(string $template, array $vars): string
    {
        return preg_replace_callback(
            '/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/',
            static fn (array $m): string => (string) ($vars[$m[1]] ?? ''),
            $template
        ) ?? '';
    }
}
