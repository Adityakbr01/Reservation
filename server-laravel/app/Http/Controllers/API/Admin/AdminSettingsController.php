<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\SiteSettings;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    public function show()
    {
        $settings = SiteSettings::first() ?? SiteSettings::defaultSettings();

        return response()->json([
            'success' => true,
            'data' => $this->settingsData($settings),
        ]);
    }

    public function update(Request $request)
    {
        $settings = SiteSettings::first() ?? SiteSettings::defaultSettings();
        $input = $request->all();

        $data = [];
        if (array_key_exists('propertyName', $input) || array_key_exists('property_name', $input)) {
            $data['property_name'] = $input['propertyName'] ?? $input['property_name'] ?? 'Hamptworth Stays';
        }
        if (array_key_exists('logoMediaId', $input) || array_key_exists('logo_media_id', $input)) {
            $data['logo_media_id'] = $input['logoMediaId'] ?? $input['logo_media_id'] ?? null;
        }
        if (array_key_exists('faviconMediaId', $input) || array_key_exists('favicon_media_id', $input)) {
            $data['favicon_media_id'] = $input['faviconMediaId'] ?? $input['favicon_media_id'] ?? null;
        }
        if (array_key_exists('phone', $input)) {
            $data['phone'] = $input['phone'];
        }
        if (array_key_exists('supportEmail', $input) || array_key_exists('support_email', $input)) {
            $data['support_email'] = $input['supportEmail'] ?? $input['support_email'] ?? null;
        }
        if (array_key_exists('address', $input)) {
            $data['address'] = $input['address'];
        }
        if (array_key_exists('timezone', $input)) {
            $data['timezone'] = trim($input['timezone'] ?? '') ?: 'Europe/London';
        }
        if (array_key_exists('currency', $input)) {
            $data['currency'] = strtoupper(trim($input['currency'] ?? '')) ?: 'GBP';
        }
        if (array_key_exists('checkInTime', $input) || array_key_exists('check_in_time', $input)) {
            $data['check_in_time'] = $input['checkInTime'] ?? $input['check_in_time'] ?? null;
        }
        if (array_key_exists('checkOutTime', $input) || array_key_exists('check_out_time', $input)) {
            $data['check_out_time'] = $input['checkOutTime'] ?? $input['check_out_time'] ?? null;
        }
        if (array_key_exists('reminderHoursBefore', $input) || array_key_exists('reminder_hours_before', $input)) {
            $val = $input['reminderHoursBefore'] ?? $input['reminder_hours_before'];
            $data['reminder_hours_before'] = $val !== null ? (int) $val : 24;
        }
        if (array_key_exists('whyBookWithUs', $input) || array_key_exists('why_book_with_us', $input) || array_key_exists('whyBookWithUsHeading', $input) || array_key_exists('why_book_with_us_heading', $input)) {
            $rawWhy = $input['whyBookWithUs'] ?? $input['why_book_with_us'] ?? null;
            $heading = $input['whyBookWithUsHeading'] ?? $input['why_book_with_us_heading'] ?? null;

            if ($rawWhy === null) {
                $current = $settings->why_book_with_us;
                $rawWhy = is_array($current) && isset($current['items']) ? $current['items'] : (is_array($current) ? $current : []);
                $heading = $heading ?? (is_array($current) && isset($current['heading']) ? $current['heading'] : 'Why book with us?');
            } elseif (is_array($rawWhy) && isset($rawWhy['items'])) {
                $heading = $heading ?? ($rawWhy['heading'] ?? 'Why book with us?');
                $rawWhy = is_array($rawWhy['items']) ? $rawWhy['items'] : [];
            }

            $heading = $heading ?: 'Why book with us?';
            $sanitizedItems = [];
            foreach ((is_array($rawWhy) ? $rawWhy : []) as $it) {
                if (!is_array($it)) continue;
                $sanitizedItems[] = [
                    'title' => trim((string) ($it['title'] ?? '')),
                    'text' => $it['text'] ?? null,
                    'icon' => !empty($it['icon']) ? trim((string) $it['icon']) : null,
                    'imageMediaId' => !empty($it['imageMediaId'] ?? $it['image_media_id']) ? (string) ($it['imageMediaId'] ?? $it['image_media_id']) : null,
                    'badgeColor' => !empty($it['badgeColor'] ?? $it['badge_color']) ? (string) ($it['badgeColor'] ?? $it['badge_color']) : null,
                ];
            }

            $data['why_book_with_us'] = [
                'heading' => $heading,
                'items' => $sanitizedItems,
            ];
        }
        if (array_key_exists('social', $input)) {
            $data['social'] = $input['social'];
        }
        if (array_key_exists('defaultSeo', $input) || array_key_exists('default_seo', $input)) {
            $data['default_seo'] = $input['defaultSeo'] ?? $input['default_seo'];
        }
        if (array_key_exists('headerNavigation', $input) || array_key_exists('header_navigation', $input)) {
            $data['header_navigation'] = $input['headerNavigation'] ?? $input['header_navigation'];
        }
        if (array_key_exists('footerNavigation', $input) || array_key_exists('footer_navigation', $input)) {
            $data['footer_navigation'] = $input['footerNavigation'] ?? $input['footer_navigation'];
        }
        if (array_key_exists('bookingAcknowledgement', $input) || array_key_exists('booking_acknowledgement', $input)) {
            $data['booking_acknowledgement'] = $input['bookingAcknowledgement'] ?? $input['booking_acknowledgement'];
        }
        if (array_key_exists('bookingPage', $input) || array_key_exists('booking_page', $input)) {
            $raw = $input['bookingPage'] ?? $input['booking_page'];
            if (is_array($raw)) {
                $data['booking_page'] = $this->sanitizeBookingPage($raw, $settings->booking_page);
            }
        }
        if (array_key_exists('homePage', $input) || array_key_exists('home_page', $input)) {
            $raw = $input['homePage'] ?? $input['home_page'];
            if (is_array($raw)) {
                $sanitized = $this->sanitizeHomePage($raw, $settings->home_page);
                if (\Illuminate\Support\Facades\Schema::hasColumn('site_settings', 'home_page')) {
                    $data['home_page'] = $sanitized;
                } else {
                    $bp = $data['booking_page'] ?? $settings->booking_page ?? [];
                    $bp['homePage'] = $sanitized;
                    $data['booking_page'] = $bp;
                }
            }
        }

        if (! empty($data)) {
            $settings->update($data);
        }

        // Keep Property table in sync with site settings
        $propertyUpdates = [];
        if (! empty($data['property_name'])) {
            $propertyUpdates['name'] = $data['property_name'];
        }
        if (! empty($data['currency'])) {
            $propertyUpdates['currency'] = $data['currency'];
        }
        if (! empty($data['timezone'])) {
            $propertyUpdates['timezone'] = $data['timezone'];
        }
        if (! empty($propertyUpdates)) {
            Property::query()->update($propertyUpdates);
        }

        // Keep existing RatePlan pricing currency in sync if currency changed
        if (! empty($data['currency'])) {
            $newCurrency = $data['currency'];
            foreach (\App\Models\RatePlan::all() as $rp) {
                if (is_array($rp->pricing)) {
                    $p = $rp->pricing;
                    $p['currency'] = $newCurrency;
                    $rp->update(['pricing' => $p]);
                }
            }
        }

        $fresh = $settings->fresh() ?? $settings;

        return response()->json([
            'success' => true,
            'data' => $this->settingsData($fresh),
        ]);
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

        // Migrate legacy flat-string bookingJourney values to { isEnabled, value } objects
        if (isset($defaults['bookingJourney']) && is_array($defaults['bookingJourney'])) {
            foreach ($defaults['bookingJourney'] as $key => $val) {
                if (is_string($val)) {
                    $defaults['bookingJourney'][$key] = ['isEnabled' => true, 'value' => $val];
                } elseif (! is_array($val) || ! isset($val['isEnabled'], $val['value'])) {
                    $defaults['bookingJourney'][$key] = ['isEnabled' => true, 'value' => ''];
                }
            }
        }

        return $defaults;
    }

    private function sanitizeBookingPage(array $raw, ?array $current): array
    {
        $resolved = $this->resolveBookingPage($current);

        foreach ($resolved as $section => $defaults) {
            $snakeSection = \Illuminate\Support\Str::snake($section);
            $incoming = is_array($raw[$section] ?? null)
                ? $raw[$section]
                : (is_array($raw[$snakeSection] ?? null) ? $raw[$snakeSection] : []);
            foreach ($defaults as $key => $default) {
                $snakeKey = \Illuminate\Support\Str::snake($key);
                if (! array_key_exists($key, $incoming) && ! array_key_exists($snakeKey, $incoming)) {
                    continue;
                }

                // Nested togglable field: { isEnabled, value }
                if (is_array($default) && isset($default['isEnabled']) && isset($default['value'])) {
                    $fieldIncoming = is_array($incoming[$key] ?? null)
                        ? $incoming[$key]
                        : (is_array($incoming[$snakeKey] ?? null) ? $incoming[$snakeKey] : []);
                    $incomingIsEnabled = array_key_exists('isEnabled', $fieldIncoming)
                        ? $fieldIncoming['isEnabled']
                        : (array_key_exists('is_enabled', $fieldIncoming) ? $fieldIncoming['is_enabled'] : null);
                    $incomingValue = array_key_exists('value', $fieldIncoming)
                        ? $fieldIncoming['value']
                        : null;
                    $resolved[$section][$key] = [
                        'isEnabled' => $incomingIsEnabled !== null ? (bool) $incomingIsEnabled : (bool) ($default['isEnabled'] ?? true),
                        'value' => $incomingValue !== null ? (string) $incomingValue : (string) ($default['value'] ?? ''),
                    ];
                    continue;
                }

                $value = array_key_exists($key, $incoming) ? $incoming[$key] : $incoming[$snakeKey];
                if (is_bool($default)) {
                    $resolved[$section][$key] = (bool) $value;
                } elseif (is_int($default)) {
                    $resolved[$section][$key] = max(1, (int) $value);
                } else {
                    $resolved[$section][$key] = is_string($value) ? $value : (string) $default;
                }
            }
        }

        return $resolved;
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

    private function sanitizeHomePage(array $raw, ?array $current): array
    {
        $resolved = $this->resolveHomePage($current);

        // Nested togglable home page search form fields: { isEnabled, label/text }
        $searchDefaults = SiteSettings::defaultHomePage()['searchForm'] ?? [];
        if (is_array($searchDefaults)) {
            $rawSearch = is_array($raw['searchForm'] ?? null)
                ? $raw['searchForm']
                : (is_array($raw['search_form'] ?? null) ? $raw['search_form'] : []);
            foreach ($searchDefaults as $field => $default) {
                $val = is_array($rawSearch[$field] ?? null)
                    ? $rawSearch[$field]
                    : (is_array($rawSearch[\Illuminate\Support\Str::snake($field)] ?? null)
                        ? $rawSearch[\Illuminate\Support\Str::snake($field)]
                        : []);
                if (empty($val)) {
                    continue;
                }
                $valueKey = isset($default['label']) ? 'label' : 'text';
                $resolved['searchForm'][$field] = [
                    'isEnabled' => isset($val['isEnabled']) ? (bool) $val['isEnabled'] : (bool) ($default['isEnabled'] ?? true),
                    $valueKey => isset($val[$valueKey]) ? (string) $val[$valueKey] : (string) ($default[$valueKey] ?? ''),
                ];
            }
        }

        foreach ($resolved as $section => $defaults) {
            // searchForm fields are handled by the dedicated block above
            if ($section === 'searchForm') {
                continue;
            }
            $snakeSection = \Illuminate\Support\Str::snake($section);
            if (is_array($defaults)) {
                $incoming = is_array($raw[$section] ?? null)
                    ? $raw[$section]
                    : (is_array($raw[$snakeSection] ?? null) ? $raw[$snakeSection] : []);
                foreach ($defaults as $key => $default) {
                    $snakeKey = \Illuminate\Support\Str::snake($key);
                    if (! array_key_exists($key, $incoming) && ! array_key_exists($snakeKey, $incoming)) {
                        continue;
                    }
                    $value = array_key_exists($key, $incoming) ? $incoming[$key] : $incoming[$snakeKey];
                    if (is_bool($default)) {
                        $resolved[$section][$key] = (bool) $value;
                    } else {
                        $resolved[$section][$key] = is_string($value) ? $value : (string) $default;
                    }
                }
            } else {
                if (array_key_exists($section, $raw)) {
                    $resolved[$section] = is_string($raw[$section]) ? $raw[$section] : (string) $defaults;
                } elseif (array_key_exists($snakeSection, $raw)) {
                    $resolved[$section] = is_string($raw[$snakeSection]) ? $raw[$snakeSection] : (string) $defaults;
                }
            }
        }

        return $resolved;
    }

    private function settingsData(SiteSettings $settings): array
    {
        $bookingPage = $this->resolveBookingPage($settings->booking_page);
        $rawHomePage = $settings->home_page;
        if (! $rawHomePage && isset($settings->booking_page['homePage'])) {
            $rawHomePage = $settings->booking_page['homePage'];
        }
        $homePage = $this->resolveHomePage($rawHomePage);

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

        return [
            'id' => $settings->id,
            'property_name' => $settings->property_name ?? 'Hamptworth Stays',
            'propertyName' => $settings->property_name ?? 'Hamptworth Stays',
            'logo_media_id' => $settings->logo_media_id,
            'logoMediaId' => $settings->logo_media_id,
            'favicon_media_id' => $settings->favicon_media_id,
            'faviconMediaId' => $settings->favicon_media_id,
            'phone' => $settings->phone ?? '',
            'support_email' => $settings->support_email ?? '',
            'supportEmail' => $settings->support_email ?? '',
            'address' => $settings->address ?? '',
            'timezone' => $settings->timezone ?? 'Europe/London',
            'currency' => $settings->currency ?? 'GBP',
            'check_in_time' => $settings->check_in_time ?? '16:00',
            'checkInTime' => $settings->check_in_time ?? '16:00',
            'check_out_time' => $settings->check_out_time ?? '10:00',
            'checkOutTime' => $settings->check_out_time ?? '10:00',
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
        ];
    }
}
