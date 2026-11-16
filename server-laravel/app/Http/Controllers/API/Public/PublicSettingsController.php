<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;

class PublicSettingsController extends Controller
{
    public function show()
    {
        $settings = SiteSettings::first() ?? SiteSettings::defaultSettings();

        $rawWhy = $settings->why_book_with_us;
        $whyHeading = 'Why book with us?';
        $whyItems = [];
        if (is_array($rawWhy)) {
            if (isset($rawWhy['items']) && is_array($rawWhy['items'])) {
                $whyHeading = $rawWhy['heading'] ?? 'Why book with us?';
                $whyItems = $rawWhy['items'];
            } else {
                $whyItems = $rawWhy;
            }
        }

        $mediaIds = [];
        foreach ($whyItems as $it) {
            if (is_array($it)) {
                $mid = $it['imageMediaId'] ?? $it['image_media_id'] ?? null;
                if ($mid) {
                    $mediaIds[] = $mid;
                }
            }
        }
        $mediaMap = !empty($mediaIds) ? \App\Models\Media::whereIn('id', array_unique($mediaIds))->get()->keyBy('id') : collect();

        $resolvedWhyItems = [];
        foreach ($whyItems as $it) {
            if (!is_array($it)) continue;
            $mid = $it['imageMediaId'] ?? $it['image_media_id'] ?? null;
            $imageUrl = ($mid && isset($mediaMap[$mid])) ? $mediaMap[$mid]->url : ($it['imageUrl'] ?? $it['image_url'] ?? null);

            $resolvedWhyItems[] = [
                'title' => (string) ($it['title'] ?? ''),
                'text' => $it['text'] ?? null,
                'icon' => $it['icon'] ?? null,
                'imageMediaId' => $mid,
                'image_media_id' => $mid,
                'imageUrl' => $imageUrl,
                'image_url' => $imageUrl,
                'badgeColor' => $it['badgeColor'] ?? $it['badge_color'] ?? null,
                'badge_color' => $it['badgeColor'] ?? $it['badge_color'] ?? null,
            ];
        }

        $bookingPage = $this->resolveBookingPage($settings->booking_page);
        $rawHomePage = $settings->home_page;
        if (! $rawHomePage && isset($settings->booking_page['homePage'])) {
            $rawHomePage = $settings->booking_page['homePage'];
        }
        $homePage = $this->resolveHomePage($rawHomePage);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $settings->id,
                'property_name' => $settings->property_name,
                'propertyName' => $settings->property_name,
                'logo_media_id' => $settings->logo_media_id,
                'logoMediaId' => $settings->logo_media_id,
                'favicon_media_id' => $settings->favicon_media_id,
                'faviconMediaId' => $settings->favicon_media_id,
                'phone' => $settings->phone,
                'support_email' => $settings->support_email,
                'supportEmail' => $settings->support_email,
                'address' => $settings->address,
                'currency' => $settings->currency,
                'timezone' => $settings->timezone,
                'check_in_time' => $settings->check_in_time,
                'checkInTime' => $settings->check_in_time,
                'check_out_time' => $settings->check_out_time,
                'checkOutTime' => $settings->check_out_time,
                'reminder_hours_before' => (int) ($settings->reminder_hours_before ?? 24),
                'reminderHoursBefore' => (int) ($settings->reminder_hours_before ?? 24),
                'why_book_with_us' => $resolvedWhyItems,
                'whyBookWithUs' => $resolvedWhyItems,
                'why_book_with_us_heading' => $whyHeading,
                'whyBookWithUsHeading' => $whyHeading,
                'why_book_with_us_data' => [
                    'heading' => $whyHeading,
                    'items' => $resolvedWhyItems,
                ],
                'whyBookWithUsData' => [
                    'heading' => $whyHeading,
                    'items' => $resolvedWhyItems,
                ],
                'social' => $settings->social ?? [],
                'default_seo' => $settings->default_seo ?? [],
                'defaultSeo' => $settings->default_seo ?? [],
                'header_navigation' => $settings->header_navigation ?? [
                    'links' => [
                        ['id' => 'local-area', 'label' => 'The Local Area', 'url' => 'https://hamptworthstays.com/local-area-and-map/', 'openInNewTab' => true, 'isEnabled' => true],
                        ['id' => 'the-estate', 'label' => 'The estate', 'url' => 'https://hamptworthstays.com/', 'openInNewTab' => true, 'isEnabled' => true],
                        ['id' => 'bespoke', 'label' => 'Bespoke', 'url' => 'https://hamptworthstays.com/private-bespoke/', 'openInNewTab' => true, 'isEnabled' => true],
                    ],
                    'enquireButton' => [
                        'label' => 'Enquire',
                        'url' => 'https://hamptworthstays.com/plan-your-experience/',
                        'openInNewTab' => true,
                        'isEnabled' => true,
                    ],
                ],
                'headerNavigation' => $settings->header_navigation ?? [
                    'links' => [
                        ['id' => 'local-area', 'label' => 'The Local Area', 'url' => 'https://hamptworthstays.com/local-area-and-map/', 'openInNewTab' => true, 'isEnabled' => true],
                        ['id' => 'the-estate', 'label' => 'The estate', 'url' => 'https://hamptworthstays.com/', 'openInNewTab' => true, 'isEnabled' => true],
                        ['id' => 'bespoke', 'label' => 'Bespoke', 'url' => 'https://hamptworthstays.com/private-bespoke/', 'openInNewTab' => true, 'isEnabled' => true],
                    ],
                    'enquireButton' => [
                        'label' => 'Enquire',
                        'url' => 'https://hamptworthstays.com/plan-your-experience/',
                        'openInNewTab' => true,
                        'isEnabled' => true,
                    ],
                ],
                'footer_navigation' => $settings->footer_navigation ?? [
                    'col1' => ['showLogo' => true, 'tagline' => 'Luxury holiday cottages in Hamptworth, Hampshire'],
                    'col2' => [
                        'heading' => 'Your stay',
                        'links' => [
                            ['id' => 'c1', 'label' => 'Find a cottage', 'url' => '/', 'openInNewTab' => false, 'isEnabled' => true],
                            ['id' => 'c2', 'label' => 'Group stays', 'url' => 'https://hamptworthstays.com/plan-your-experience/', 'openInNewTab' => true, 'isEnabled' => true],
                            ['id' => 'c3', 'label' => 'Explore the local area ↗', 'url' => 'https://hamptworthstays.com/local-area-and-map/', 'openInNewTab' => true, 'isEnabled' => true],
                        ],
                    ],
                    'col3' => [
                        'heading' => 'A little help',
                        'links' => [
                            ['id' => 'h1', 'label' => 'Make an enquiry', 'url' => 'https://hamptworthstays.com/plan-your-experience/', 'openInNewTab' => true, 'isEnabled' => true],
                            ['id' => 'h2', 'label' => 'Bespoke ↗', 'url' => 'https://hamptworthstays.com/private-bespoke/', 'openInNewTab' => true, 'isEnabled' => true],
                            ['id' => 'h3', 'label' => 'Booking terms', 'url' => '/policies/TERMS', 'openInNewTab' => false, 'isEnabled' => true],
                            ['id' => 'h4', 'label' => 'Privacy policy', 'url' => '/policies/PRIVACY', 'openInNewTab' => false, 'isEnabled' => true],
                        ],
                    ],
                    'col4' => [
                        'heading' => 'Contact',
                        'showPhone' => true,
                        'showEmail' => true,
                        'showAddress' => false,
                    ],
                    'bottomBar' => [
                        'copyrightText' => '© 2026 Hamptworth Stays',
                        'locationText' => 'Home Farm · Hamptworth',
                        'showBackToTop' => true,
                    ],
                ],
                'footerNavigation' => $settings->footer_navigation ?? [
                    'col1' => ['showLogo' => true, 'tagline' => 'Luxury holiday cottages in Hamptworth, Hampshire'],
                    'col2' => [
                        'heading' => 'Your stay',
                        'links' => [
                            ['id' => 'c1', 'label' => 'Find a cottage', 'url' => '/', 'openInNewTab' => false, 'isEnabled' => true],
                            ['id' => 'c2', 'label' => 'Group stays', 'url' => 'https://hamptworthstays.com/plan-your-experience/', 'openInNewTab' => true, 'isEnabled' => true],
                            ['id' => 'c3', 'label' => 'Explore the local area ↗', 'url' => 'https://hamptworthstays.com/local-area-and-map/', 'openInNewTab' => true, 'isEnabled' => true],
                        ],
                    ],
                    'col3' => [
                        'heading' => 'A little help',
                        'links' => [
                            ['id' => 'h1', 'label' => 'Make an enquiry', 'url' => 'https://hamptworthstays.com/plan-your-experience/', 'openInNewTab' => true, 'isEnabled' => true],
                            ['id' => 'h2', 'label' => 'Bespoke ↗', 'url' => 'https://hamptworthstays.com/private-bespoke/', 'openInNewTab' => true, 'isEnabled' => true],
                            ['id' => 'h3', 'label' => 'Booking terms', 'url' => '/policies/TERMS', 'openInNewTab' => false, 'isEnabled' => true],
                            ['id' => 'h4', 'label' => 'Privacy policy', 'url' => '/policies/PRIVACY', 'openInNewTab' => false, 'isEnabled' => true],
                        ],
                    ],
                    'col4' => [
                        'heading' => 'Contact',
                        'showPhone' => true,
                        'showEmail' => true,
                        'showAddress' => false,
                    ],
                    'bottomBar' => [
                        'copyrightText' => '© 2026 Hamptworth Stays',
                        'locationText' => 'Home Farm · Hamptworth',
                        'showBackToTop' => true,
                    ],
                ],
                'booking_acknowledgement' => $settings->booking_acknowledgement ?? [
                    'showPoliciesSection' => true,
                    'bookFaster' => [
                        'isEnabled' => true,
                        'title' => 'Book Faster (Optional)',
                        'checkboxText' => 'I would like to create an account.',
                        'passwordHint' => 'At least 8 characters long, case sensitive, can contain !$#%, no spaces, not the same as previous password or login',
                        'expandedByDefault' => false,
                    ],
                    'sections' => [
                        [
                            'id' => 'sec-acknowledgement',
                            'title' => 'Acknowledgement',
                            'introText' => '',
                            'isEnabled' => true,
                            'items' => [
                                ['id' => 'ack-privacy', 'text' => '* I agree with the Privacy Terms. <a href="/policies/PRIVACY" target="_blank" rel="noopener noreferrer">Privacy Notice</a>', 'isRequired' => true, 'isEnabled' => true],
                                ['id' => 'ack-terms', 'text' => 'I agree with the Booking Conditions. <a href="/policies/TERMS" target="_blank" rel="noopener noreferrer">Booking Conditions</a>', 'isRequired' => true, 'isEnabled' => true],
                            ],
                        ],
                    ],
                    'title' => 'Acknowledgement',
                    'privacyCheckboxText' => '* I agree with the Privacy Terms.',
                    'privacyLinkLabel' => 'Privacy Notice',
                    'privacyLinkUrl' => '/policies/PRIVACY',
                    'termsCheckboxText' => 'I agree with the Booking Conditions.',
                    'termsLinkLabel' => 'Booking Conditions',
                    'termsLinkUrl' => '/policies/TERMS',
                    'buttonText' => 'Confirm booking',
                    'busyButtonText' => 'Holding your cottage…',
                    'incompleteContactHint' => 'Complete contact info above to continue.',
                    'incompleteTermsHint' => 'Please accept the Privacy Terms and Booking Conditions to continue.',
                ],
                'bookingAcknowledgement' => $settings->booking_acknowledgement ?? [
                    'showPoliciesSection' => true,
                    'bookFaster' => [
                        'isEnabled' => true,
                        'title' => 'Book Faster (Optional)',
                        'checkboxText' => 'I would like to create an account.',
                        'passwordHint' => 'At least 8 characters long, case sensitive, can contain !$#%, no spaces, not the same as previous password or login',
                        'expandedByDefault' => false,
                    ],
                    'sections' => [
                        [
                            'id' => 'sec-acknowledgement',
                            'title' => 'Acknowledgement',
                            'introText' => '',
                            'isEnabled' => true,
                            'items' => [
                                ['id' => 'ack-privacy', 'text' => '* I agree with the Privacy Terms. <a href="/policies/PRIVACY" target="_blank" rel="noopener noreferrer">Privacy Notice</a>', 'isRequired' => true, 'isEnabled' => true],
                                ['id' => 'ack-terms', 'text' => 'I agree with the Booking Conditions. <a href="/policies/TERMS" target="_blank" rel="noopener noreferrer">Booking Conditions</a>', 'isRequired' => true, 'isEnabled' => true],
                            ],
                        ],
                    ],
                    'title' => 'Acknowledgement',
                    'privacyCheckboxText' => '* I agree with the Privacy Terms.',
                    'privacyLinkLabel' => 'Privacy Notice',
                    'privacyLinkUrl' => '/policies/PRIVACY',
                    'termsCheckboxText' => 'I agree with the Booking Conditions.',
                    'termsLinkLabel' => 'Booking Conditions',
                    'termsLinkUrl' => '/policies/TERMS',
                    'buttonText' => 'Confirm booking',
                    'busyButtonText' => 'Holding your cottage…',
                    'incompleteContactHint' => 'Complete contact info above to continue.',
                    'incompleteTermsHint' => 'Please accept the Privacy Terms and Booking Conditions to continue.',
                ],
                'booking_page' => $bookingPage,
                'bookingPage' => $bookingPage,
                'home_page' => $homePage,
                'homePage' => $homePage,
            ],
            'booking_page' => $bookingPage,
            'bookingPage' => $bookingPage,
            'home_page' => $homePage,
            'homePage' => $homePage,
        ]);
    }

    private function resolveHomePage(?array $stored): array
    {
        $defaults = SiteSettings::defaultHomePage();
        $stored = is_array($stored) ? $stored : [];

        foreach ($defaults as $section => $values) {
            if (is_array($values)) {
                $snakeSection = \Illuminate\Support\Str::snake($section);
                $incoming = is_array($stored[$section] ?? null)
                    ? $stored[$section]
                    : (is_array($stored[$snakeSection] ?? null) ? $stored[$snakeSection] : []);
                $defaults[$section] = array_merge($values, $incoming);
            } else {
                $snakeSection = \Illuminate\Support\Str::snake($section);
                if (array_key_exists($section, $stored)) {
                    $defaults[$section] = $stored[$section];
                } elseif (array_key_exists($snakeSection, $stored)) {
                    $defaults[$section] = $stored[$snakeSection];
                }
            }
        }

        return $defaults;
    }

    private function resolveBookingPage(?array $stored): array
    {
        $defaults = SiteSettings::defaultBookingPage();
        $stored = is_array($stored) ? $stored : [];

        foreach ($defaults as $section => $values) {
            $snakeSection = \Illuminate\Support\Str::snake($section);
            $incoming = is_array($stored[$section] ?? null)
                ? $stored[$section]
                : (is_array($stored[$snakeSection] ?? null) ? $stored[$snakeSection] : []);
            $defaults[$section] = array_merge($values, $incoming);
        }

        return $defaults;
    }
}
