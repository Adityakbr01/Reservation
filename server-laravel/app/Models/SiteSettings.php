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
        'booking_page', 'home_page',
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
        'home_page' => 'array',
    ];

    public static function defaultHomePage(): array
    {
        return [
            'hero' => [
                'eyebrow' => 'Hamptworth Stays · Home Farm',
                'title' => 'A little escape.',
                'subtitle' => 'Choose your dates. Enjoy a slower pace.',
                'showEyebrow' => true,
                'showTitle' => true,
                'showSubtitle' => true,
                'showBird' => true,
                'showLeaves' => true,
            ],
            'section1' => [
                'isEnabled' => true,
                'showHeading' => true,
                'showSubtitle' => true,
                'showEnquireUrl' => true,
                'heading' => 'Available cottages',
                'subtitle' => 'Booking several cottages? Enquire about a group stay',
                'enquireUrl' => 'https://hamptworthstays.com/plan-your-experience/',
                'showEnquireLink' => true,
            ],
            'section2' => [
                'isEnabled' => true,
                'showHeading' => true,
                'showSubtitle' => true,
                'showEnquireUrl' => true,
                'heading' => 'More Estate Cottages',
                'subtitle' => 'Explore our additional luxury countryside retreats',
                'enquireUrl' => 'https://hamptworthstays.com/plan-your-experience/',
                'showEnquireLink' => true,
            ],
            'emptyHeading' => 'Nothing available for these dates',
            'emptySubtitle' => 'Try different dates, fewer guests, or fewer cottages.',
        ];
    }

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
            'bookingJourney' => [
                'previewNotice' => 'DESIGN PREVIEW · NO BOOKINGS OR PAYMENTS TAKEN',
                'modalTitle' => 'Book your stay.',
                'step1Subtitle' => 'YOUR STAY AT HOME FARM',
                'step1Title' => 'When would you like to stay?',
                'step1Note' => 'Design preview · example prices, no live availability.',
                'step1ExploreLinkText' => 'Explore the cottages first',
                'step1CheckInLabel' => 'CHECK IN',
                'step1CheckOutLabel' => 'CHECK OUT',
                'step1AdultsLabel' => 'ADULTS',
                'step1ChildrenLabel' => 'CHILDREN',
                'step1ButtonText' => 'See available cottages',
                'step2Subtitle' => 'YOUR STAY AT HOME FARM',
                'step2Title' => 'Choose your cottage.',
                'step2Description' => 'Take a closer look and choose your place at Home Farm.',
                'groupStayText' => 'Bringing a larger group or planning an event? Talk to our team about taking over multiple cottages.',
                'groupStayUrl' => 'https://hamptworthstays.com/plan-your-experience/',
                'noCottagesMessage' => 'No cottages available for these dates and party size.',
                'step3DogsTitle' => 'Dogs & pets',
                'step3DogsDescription' => '{cottage} welcomes up to {max} dog{plural}. £{fee} per dog for the whole stay.',
                'step3DogsSelectLabel' => 'DOGS JOINING YOUR STAY',
                'step3DogsZeroOption' => 'No dogs — no charge',
                'noPetsNotice' => 'This cottage does not accommodate pets.',
                'seePetCottagesText' => 'See pet-friendly cottages',
                'extrasHeading' => 'A few nice extras',
                'extrasDescription' => 'Add rounds on the course, padel court time or dining at The Barn. You can adjust these later.',
                'extrasEmptyMessage' => 'No optional extras currently listed for this cottage. Admin can add extras in the Admin Panel anytime.',
                'extrasDisclaimer' => 'Activities and dining are subject to tee times, court availability and opening hours. We will confirm these with you after booking.',
                'skipExtrasText' => 'Skip activities & dining →',
                'step3NextButtonText' => 'Your details →',
                'step4Title' => 'Your details',
                'step4Description' => 'Enter your details to complete your reservation enquiry.',
                'step4ReservedDescription' => 'Your cottage is reserved. Complete payment securely below to confirm your stay.',
                'contactSectionTitle' => 'Contact information',
                'specialRequestsLabel' => 'Special requests',
                'specialRequestsPlaceholder' => 'Any notes for your stay (optional)',
                'acknowledgementText' => 'I understand this is a booking request and dates are subject to confirmation.',
                'payButtonText' => 'Pay with Card',
                'step5Title' => 'Thank you for your stay request',
                'step5Subtitle' => 'We have received your enquiry and our team will get in touch shortly.',
                'step5Note' => 'A confirmation email has been sent with your booking details and receipt.',
                'sidebarTaxesNotice' => 'Taxes and all charges included. Secure card payment via Stripe.',
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
