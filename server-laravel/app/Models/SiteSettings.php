<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Models\Concerns\HasHexId;

class SiteSettings extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'key', 'property_name', 'logo_media_id', 'favicon_media_id',
        'phone', 'support_email', 'address', 'timezone', 'currency',
        'check_in_time', 'check_out_time', 'reminder_hours_before',
        'social', 'default_seo', 'why_book_with_us',
        'header_navigation', 'footer_navigation', 'booking_acknowledgement',
        'booking_page',
    ];

    protected $casts = [
        'social' => 'array',
        'default_seo' => 'array',
        'why_book_with_us' => 'array',
        'reminder_hours_before' => 'integer',
        'header_navigation' => 'array',
        'footer_navigation' => 'array',
        'booking_acknowledgement' => 'array',
        'booking_page' => 'array',
    ];

    public static function defaultBookingPage(): array
    {
        return [
            'enquiry' => [
                'isEnabled' => true,
                'heading' => 'Enquire about {cottage}',
                'description' => 'Tell us your dates, party and budget — we will be in touch.',
                'buttonLabel' => 'Enquire now',
                'url' => 'https://hamptworthstays.com/plan-your-experience/',
                'openInNewTab' => true,
                'showBookNow' => true,
                'bookNowLabel' => 'Book now',
                'dialogDescription' => 'Holiday budget, party size, dates, location, dog friendly — anything helps.',
            ],
            'reservationDetails' => [
                'isEnabled' => true,
                'title' => 'Reservation details',
                'specialRequestsLabel' => 'Special Requests',
                'specialRequestsPlaceholder' => 'Special Requests',
                'maxLength' => 1000,
            ],
            'policies' => [
                'isEnabled' => true,
                'title' => 'Policies',
                'checkInLabel' => 'Check-in',
                'checkInText' => 'after 4:00 pm',
                'checkOutLabel' => 'Check-out',
                'checkOutText' => 'before 10:00 am',
            ],
        ];
    }

    public static function defaultSettings(): self
    {
        return static::firstOrCreate(
            ['key' => 'site'],
            [
                'id' => '6ac0cc40a287cfd3dfbbf8a7',
                'property_name' => 'Hamptworth Stays',
                'phone' => '+44 1794 390155',
                'support_email' => 'hamptworthstays@gmail.com',
                'address' => 'Home Farm, Hamptworth, Salisbury SP5 2DU',
                'timezone' => 'Europe/London',
                'currency' => 'GBP',
                'check_in_time' => '16:00',
                'check_out_time' => '10:00',
                'reminder_hours_before' => 24,
                'why_book_with_us' => [
                    ['title' => 'Charming Luxury Cottages', 'text' => 'Set on the edge of the New Forest.'],
                    ['title' => 'Complimentary Welcome Hamper', 'text' => 'Fresh local treats on arrival.'],
                    ['title' => 'Golf & Country Club Facilities', 'text' => 'Direct access to Hamptworth Golf & Country Club.'],
                ],
                'header_navigation' => [
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
                'footer_navigation' => [
                    'col1' => [
                        'showLogo' => true,
                        'tagline' => 'Luxury holiday cottages in Hamptworth, Hampshire',
                    ],
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
                'booking_acknowledgement' => [
                    'showPoliciesSection' => true,
                    'bookFaster' => [
                        'isEnabled' => true,
                        'title' => 'Book Faster (Optional)',
                        'checkboxText' => 'I would like to create an account.',
                        'passwordHint' => 'At least 8 characters long, case sensitive, can contain !$#%, no spaces, not the same as previous password or login',
                        'expandedByDefault' => false,
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
                'booking_page' => self::defaultBookingPage(),
            ]
        );
    }
}
