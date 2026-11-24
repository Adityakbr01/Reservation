<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\EmailTemplate;
use App\Models\Notification;
use App\Models\Payment;
use App\Services\EmailTemplateService;
use App\Support\Email\EmailRegistry;
use App\Support\Email\EmailShared;
use App\Support\Email\Templates\AdminTemplates;
use App\Support\Email\Templates\BookingTemplates;
use App\Support\Email\Templates\PaymentTemplates;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function enqueue(array $data): Notification
    {
        $idempotencyKey = $data['idempotency_key'] ?? ('notif_' . bin2hex(random_bytes(12)));
        $existing = Notification::where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            return $existing;
        }

        $notification = Notification::create(array_merge([
            'id' => bin2hex(random_bytes(12)),
            'status' => 'QUEUED',
            'attempts' => 0,
            'max_attempts' => 5,
            'idempotency_key' => $idempotencyKey,
        ], $data));

        // Attempt immediate dispatch for shared hosting environments
        try {
            $this->processNotification($notification);
        } catch (\Throwable $e) {
            Log::warning('Synchronous notification dispatch error: ' . $e->getMessage(), [
                'id' => $notification->id,
                'type' => $notification->type,
            ]);
        }

        return $notification;
    }

    public function processPending(): void
    {
        $pending = Notification::where('status', 'QUEUED')
            ->where(function ($q) {
                $q->whereNull('next_attempt_at')
                    ->orWhere('next_attempt_at', '<=', now());
            })
            ->limit(10)
            ->get();

        foreach ($pending as $notification) {
            try {
                $this->processNotification($notification);
            } catch (\Throwable $e) {
                // Handled inside processNotification
            }
        }
    }

    public function processNotification(Notification $notification): void
    {
        try {
            Log::info('Processing notification', ['id' => $notification->id, 'type' => $notification->type]);

            $rendered = $this->renderNotification($notification);
            $subject = $rendered['subject'] ?? 'Notification from Hamptworth Stays';
            $html = $rendered['html'] ?? ('<p>' . htmlspecialchars($subject) . '</p>');
            $text = $rendered['text'] ?? null;

            $provider = 'log';
            $providerMessageId = null;

            $apiKey = config('services.resend.key', env('RESEND_API_KEY'));
            if ($apiKey && ! empty($notification->recipient)) {
                $provider = 'resend';
                $providerMessageId = $this->sendViaResend(
                    $notification->recipient,
                    $subject,
                    $html,
                    $text
                );
                if (! $providerMessageId) {
                    throw new \Exception('Resend delivery failed. Check Resend API key or sender domain in .env.');
                }
            }

            $notification->status = 'SENT';
            $notification->sent_at = now();
            $notification->provider = $provider;
            $notification->provider_message_id = $providerMessageId;
            $notification->last_error = null;
            $notification->save();
        } catch (\Exception $e) {
            Log::error('Notification failed', ['id' => $notification->id, 'error' => $e->getMessage()]);
            $notification->attempts += 1;
            $notification->status = $notification->attempts >= $notification->max_attempts ? 'FAILED' : 'QUEUED';
            $notification->last_error = $e->getMessage();
            $notification->save();
            throw $e;
        }
    }

    public function renderNotification(Notification $notification): array
    {
        $booking = null;
        if (! empty($notification->booking_id)) {
            $booking = Booking::with(['items.room.roomType', 'user'])->find($notification->booking_id);
        }

        $ctx = $this->buildBookingContext($booking);
        $type = $notification->type;

        $codeDefault = match ($type) {
            'BOOKING_RECEIVED' => BookingTemplates::bookingReceived($ctx),
            'BOOKING_CONFIRMED' => BookingTemplates::bookingConfirmed($ctx),
            'BOOKING_CANCELLED' => BookingTemplates::bookingCancelled($ctx),
            'CHECKIN_REMINDER' => BookingTemplates::checkinReminder($ctx),
            'CHECKED_IN' => BookingTemplates::checkedIn($ctx),
            'CHECKED_OUT' => BookingTemplates::checkedOut($ctx),
            'ADMIN_NEW_BOOKING' => AdminTemplates::adminAlert([
                'bookingReference' => $ctx['bookingReference'],
                'headline' => 'New booking',
                'detail' => ($ctx['guestName'] . ', ' . $ctx['roomSummary'] . ', ' . $ctx['checkIn'] . ' → ' . $ctx['checkOut']),
                'adminUrl' => env('ADMIN_URL', 'https://hamptworthstays.com') . '/reservations/' . ($booking?->id ?? ''),
            ], 'New booking'),
            'ADMIN_CANCELLATION' => AdminTemplates::adminAlert([
                'bookingReference' => $ctx['bookingReference'],
                'headline' => 'Booking cancelled',
                'detail' => 'Booking cancelled for ' . $ctx['guestName'] . '.',
                'adminUrl' => env('ADMIN_URL', 'https://hamptworthstays.com') . '/reservations/' . ($booking?->id ?? ''),
            ], 'Booking cancelled'),
            'ADMIN_PAYMENT_FAILURE' => AdminTemplates::adminAlert([
                'bookingReference' => $ctx['bookingReference'],
                'headline' => 'Payment failure',
                'detail' => 'Payment failed for ' . $ctx['guestName'] . '.',
                'adminUrl' => env('ADMIN_URL', 'https://hamptworthstays.com') . '/reservations/' . ($booking?->id ?? ''),
            ], 'Payment failure'),
            'ADMIN_SOLD_OUT' => AdminTemplates::adminAlert([
                'bookingReference' => $ctx['bookingReference'],
                'headline' => 'Fully booked',
                'detail' => 'All rooms are now booked for dates: ' . $ctx['checkIn'] . ' → ' . $ctx['checkOut'],
                'adminUrl' => env('ADMIN_URL', 'https://hamptworthstays.com'),
            ], 'Fully booked'),
            'PAYMENT_FAILED' => PaymentTemplates::paymentFailed([
                'guestName' => $ctx['guestName'],
                'bookingReference' => $ctx['bookingReference'],
                'holdExpiresAt' => now()->addMinutes(30)->format('j M Y, g:i a'),
                'supportEmail' => $ctx['supportEmail'],
                'manageUrl' => $ctx['manageUrl'],
            ]),
            'REFUND_UPDATED' => PaymentTemplates::refundUpdated([
                'guestName' => $ctx['guestName'],
                'bookingReference' => $ctx['bookingReference'],
                'currency' => $ctx['currency'],
                'refundAmount' => $ctx['total'],
                'refundStatus' => 'succeeded',
                'supportEmail' => $ctx['supportEmail'],
            ]),
            default => [
                'subject' => 'Notification from Hamptworth Stays',
                'html' => '<p>You have a new update from Hamptworth Stays.</p>',
                'text' => 'You have a new update from Hamptworth Stays.',
            ],
        };

        if (EmailRegistry::isKey($type)) {
            $override = EmailTemplate::where('key', $type)->first();
            if ($override) {
                try {
                    $vars = $this->buildTemplateVars($type, $ctx, $booking, $notification);
                    $templateService = app(EmailTemplateService::class);
                    $res = $templateService->renderWithOverride(
                        $type,
                        $vars,
                        $codeDefault,
                        $override->toArray()
                    );
                    return $res['rendered'];
                } catch (\Throwable $e) {
                    Log::error("Failed to render custom email template {$type}: " . $e->getMessage(), [
                        'exception' => $e,
                    ]);
                }
            }
        }

        return $codeDefault;
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, string>
     */
    public function buildTemplateVars(string $type, array $ctx, ?Booking $booking = null, ?Notification $notification = null): array
    {
        $adminBase = rtrim(env('ADMIN_URL', 'https://admin.hamptworthstays.com'), '/');
        $clientBase = rtrim(env('CLIENT_URL', 'https://book.hamptworthstays.com'), '/');
        $currency = (string) ($ctx['currency'] ?? 'GBP');

        $totalFormatted = is_numeric($ctx['total'] ?? null)
            ? EmailShared::money((int) $ctx['total'], $currency)
            : (string) ($ctx['total'] ?? '');

        $totalPaidFormatted = is_numeric($ctx['totalPaid'] ?? null)
            ? EmailShared::money((int) $ctx['totalPaid'], $currency)
            : $totalFormatted;

        $refundAmountFormatted = isset($ctx['refundAmount'])
            ? (is_numeric($ctx['refundAmount']) ? EmailShared::money((int) $ctx['refundAmount'], $currency) : (string) $ctx['refundAmount'])
            : $totalFormatted;

        $cottageName = (string) ($ctx['cottageName'] ?? $ctx['roomSummary'] ?? 'Hamptworth Stay');
        $guestName = (string) ($ctx['guestName'] ?? 'Guest');
        $bookingRef = (string) ($ctx['bookingReference'] ?? ($booking?->booking_number ?? $booking?->id ?? ''));

        $checkInFormatted = (string) ($ctx['checkIn'] ?? '');
        $checkOutFormatted = (string) ($ctx['checkOut'] ?? '');

        $headline = match ($type) {
            'ADMIN_PAYMENT_FAILURE' => 'Payment failure',
            'ADMIN_CANCELLATION' => 'Booking cancelled',
            'ADMIN_SOLD_OUT' => 'Fully booked',
            default => 'New booking',
        };

        $detail = match ($type) {
            'ADMIN_PAYMENT_FAILURE' => "Payment failed for {$guestName}.",
            'ADMIN_CANCELLATION' => "Booking cancelled for {$guestName}.",
            'ADMIN_SOLD_OUT' => "All rooms are now booked for dates: {$checkInFormatted} → {$checkOutFormatted}",
            default => "{$guestName}, {$cottageName}, {$checkInFormatted} → {$checkOutFormatted}.",
        };

        $adminUrl = "{$adminBase}/reservations/" . ($booking?->id ?? '');

        return [
            'guestName' => $guestName,
            'cottageName' => $cottageName,
            'propertyName' => (string) ($ctx['propertyName'] ?? EmailShared::DEFAULT_BRAND_NAME),
            'brandName' => (string) ($ctx['brandName'] ?? EmailShared::DEFAULT_BRAND_NAME),
            'bookingReference' => $bookingRef,
            'checkIn' => $checkInFormatted,
            'checkOut' => $checkOutFormatted,
            'nights' => (string) ($ctx['nights'] ?? 1),
            'guests' => (string) ($ctx['guests'] ?? '1 guest'),
            'currency' => $currency,
            'total' => $totalFormatted,
            'totalPaid' => $totalPaidFormatted,
            'paymentStatus' => (string) ($ctx['paymentStatus'] ?? 'PAID'),
            'cancellationPolicy' => (string) ($ctx['cancellationPolicy'] ?? 'Free cancellation until 48h before check-in.'),
            'supportEmail' => (string) ($ctx['supportEmail'] ?? env('ADMIN_NOTIFICATION_EMAIL', 'stay@hamptworthstays.com')),
            'manageUrl' => (string) ($ctx['manageUrl'] ?? "{$clientBase}/bookings"),
            'receiptUrl' => (string) ($ctx['receiptUrl'] ?? ($ctx['manageUrl'] ?? '')),
            'downloadReceiptUrl' => (string) ($ctx['downloadReceiptUrl'] ?? ''),
            'checkInTime' => EmailShared::checkInLabel($ctx['checkInTime'] ?? null),
            'checkOutTime' => EmailShared::checkOutLabel($ctx['checkOutTime'] ?? null),
            'propertyAddress' => (string) ($ctx['propertyAddress'] ?? ''),
            'mapsUrl' => ($ctx['mapsUrl'] ?? null) ?: EmailShared::mapsDirectionsUrl($ctx['propertyAddress'] ?? ''),
            'brandSiteUrl' => (string) ($ctx['brandSiteUrl'] ?? EmailShared::DEFAULT_BRAND_SITE_URL),
            'bookingSiteUrl' => (string) ($ctx['bookingSiteUrl'] ?? EmailShared::DEFAULT_BOOKING_SITE_URL),
            'holdExpiresAt' => now()->addMinutes(30)->format('j M Y, g:i a'),
            'cancelledAt' => date('j M Y'),
            'refundAmount' => $refundAmountFormatted,
            'refundStatus' => (string) ($ctx['refundStatus'] ?? 'succeeded'),
            'headline' => $headline,
            'detail' => $detail,
            'adminUrl' => $adminUrl,
            'resetUrl' => "{$clientBase}/reset-password",
            'loginUrl' => "{$clientBase}/login",
            'expiryNote' => 'For your security, the reset link expires after 1 hour.',
        ];
    }

    public function sendBookingConfirmation(Booking $booking): void
    {
        $contact = is_array($booking->contact) ? $booking->contact : [];
        $recipient = $contact['email'] ?? $booking->user?->email;
        if ($recipient) {
            $this->enqueue([
                'type' => 'BOOKING_CONFIRMED',
                'recipient' => $recipient,
                'booking_id' => $booking->id,
                'idempotency_key' => 'confirm_' . $booking->id,
            ]);
        }

        $adminEmail = env('ADMIN_NOTIFICATION_EMAIL', 'stay@hamptworthstays.com');
        if ($adminEmail) {
            $this->enqueue([
                'type' => 'ADMIN_NEW_BOOKING',
                'recipient' => $adminEmail,
                'booking_id' => $booking->id,
                'idempotency_key' => 'admin_notif_' . $booking->id,
            ]);
        }
    }

    private function buildBookingContext(?Booking $booking): array
    {
        $dummy = EmailRegistry::dummyBookingContext();
        if (! $booking) {
            return $dummy;
        }

        $settings = \App\Models\SiteSettings::first();
        $property = $booking->property ?? \App\Models\Property::first();
        $pricing = is_array($booking->pricing) ? $booking->pricing : [];

        $propertyName = $settings?->property_name ?? $property?->name ?? 'Hamptworth Stays';
        $propertyAddress = $settings?->address ?? $property?->address ?? '';
        $supportEmail = $settings?->support_email ?? env('ADMIN_NOTIFICATION_EMAIL', 'stay@hamptworthstays.com');
        $checkInTime = $settings?->check_in_time ?? $property?->check_in_time ?? '16:00';
        $checkOutTime = $settings?->check_out_time ?? $property?->check_out_time ?? '10:00';
        $currency = $pricing['currency'] ?? $settings?->currency ?? $property?->currency ?? $booking->currency ?? 'GBP';
        $brandName = $propertyName;

        $contact = is_array($booking->contact) ? $booking->contact : [];
        $guestName = trim(($contact['firstName'] ?? '') . ' ' . ($contact['lastName'] ?? '')) ?: ($booking->user?->name ?? 'Guest');
        $roomNames = $booking->items->map(fn ($it) => $it->room_name_snapshot ?? $it->room?->name ?? $it->room?->roomType?->name)->filter()->implode(', ');
        if (! $roomNames) {
            $roomNames = 'Hamptworth Stay';
        }

        $checkInFormatted = $booking->check_in ? date('j M Y', strtotime($booking->check_in)) : $dummy['checkIn'];
        $checkOutFormatted = $booking->check_out ? date('j M Y', strtotime($booking->check_out)) : $dummy['checkOut'];

        $subtotal = (int) ($pricing['subtotal'] ?? 0);
        $discount = (int) ($pricing['discount'] ?? 0);
        $taxes = (int) ($pricing['taxes'] ?? 0);
        $total = (int) ($pricing['total'] ?? 0);

        $clientBase = rtrim(env('CLIENT_URL', 'https://book.hamptworthstays.com'), '/');
        $receiptUrl = "{$clientBase}/booking/confirmation/{$booking->id}";
        $downloadReceiptUrl = "{$receiptUrl}?download=true";

        return array_merge($dummy, [
            'guestName' => $guestName,
            'bookingReference' => $booking->booking_number ?? $booking->id,
            'roomSummary' => $roomNames,
            'cottageName' => $roomNames,
            'checkIn' => $checkInFormatted,
            'checkOut' => $checkOutFormatted,
            'nights' => (int) ($booking->nights ?? 1),
            'currency' => $currency,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'taxes' => $taxes,
            'total' => $total,
            'totalPaid' => $total,
            'paymentStatus' => $booking->payment_status ?? 'PAID',
            'manageUrl' => $receiptUrl,
            'receiptUrl' => $receiptUrl,
            'downloadReceiptUrl' => $downloadReceiptUrl,
            'propertyName' => $propertyName,
            'brandName' => $brandName,
            'propertyAddress' => $propertyAddress,
            'supportEmail' => $supportEmail,
            'checkInTime' => $checkInTime,
            'checkOutTime' => $checkOutTime,
        ]);
    }

    public function sendViaResend(string $to, string $subject, string $html, ?string $text = null): ?string
    {
        $payload = [
            'from' => env('RESEND_FROM_EMAIL', env('EMAIL_FROM', 'no-reply@hamptworthstays.com')),
            'to' => [$to],
            'subject' => $subject,
            'html' => $html ?: '<p>' . htmlspecialchars($subject) . '</p>',
        ];

        if ($text) {
            $payload['text'] = $text;
        }
        if ($replyTo = env('EMAIL_REPLY_TO')) {
            $payload['reply_to'] = $replyTo;
        }

        $resend = \App\Support\Resend\Resend::client();
        $result = $resend->emails->send($payload);

        return $result['id'] ?? null;
    }
}

