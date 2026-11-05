<?php

namespace Tests\Unit\Support;

use App\Support\AppError;
use App\Support\GuestRules;
use Tests\TestCase;

class GuestRulesTest extends TestCase
{
    private function base(): array
    {
        return [
            'rooms' => [[
                'roomTypeId' => '507f1f77bcf86cd799439011',
                'ratePlanId' => '507f1f77bcf86cd799439012',
                'quantity' => 1,
            ]],
            'checkIn' => '2026-12-10T00:00:00Z',
            'checkOut' => '2026-12-12T00:00:00Z',
            'guests' => ['adults' => 2, 'children' => 0],
            'contact' => [
                'firstName' => 'Ada',
                'lastName' => 'Lovelace',
                'email' => 'ada@example.com',
                'phone' => '+911234567890',
            ],
            'acceptPrivacy' => true,
            'acceptTerms' => true,
        ];
    }

    public function test_normalizes_guest_email(): void
    {
        $this->assertSame('guest@example.com', GuestRules::normalizeGuestEmail('  Guest@Example.COM '));
    }

    public function test_guest_display_name_joins_names(): void
    {
        $this->assertSame('Ada Lovelace', GuestRules::guestDisplayName('Ada', 'Lovelace'));
    }

    public function test_guest_display_name_caps_length_and_falls_back_for_blanks(): void
    {
        $this->assertSame(80, mb_strlen(GuestRules::guestDisplayName(str_repeat('A', 100), str_repeat('B', 100))));
        $this->assertSame('Guest', GuestRules::guestDisplayName('  ', '  '));
    }

    public function test_acceptances_pass_when_both_are_accepted(): void
    {
        $this->expectNotToPerformAssertions();
        GuestRules::assertGuestAcceptances(true, true);
    }

    public function test_acceptances_reject_when_either_is_missing(): void
    {
        foreach ([[false, true], [true, false]] as [$privacy, $terms]) {
            try {
                GuestRules::assertGuestAcceptances($privacy, $terms);
                $this->fail('Expected acceptances to be rejected');
            } catch (AppError $error) {
                $this->assertStringContainsString('Privacy Terms', $error->getMessage());
                $this->assertSame('ACCEPTANCES_REQUIRED', $error->errorCode);
            }
        }
    }

    public function test_accepts_checkout_address_fields_and_opt_ins(): void
    {
        $parsed = GuestRules::validate(array_merge($this->base(), [
            'contact' => array_merge($this->base()['contact'], [
                'title' => 'Ms',
                'postcode' => 'SW1A 1AA',
                'country' => 'UK',
            ]),
            'createAccount' => true,
            'password' => 'correct horse 1!',
            'confirmPassword' => 'correct horse 1!',
            'newsletter' => false,
        ]));

        $this->assertSame('SW1A 1AA', $parsed['contact']['postcode']);
        $this->assertTrue($parsed['createAccount']);
    }

    public function test_acceptances_travel_with_payload_for_service_guard(): void
    {
        $parsed = GuestRules::validate(array_merge($this->base(), [
            'acceptPrivacy' => false,
            'acceptTerms' => true,
        ]));

        try {
            GuestRules::assertGuestAcceptancesFor($parsed);
            $this->fail('Expected acceptances to be rejected');
        } catch (AppError $error) {
            $this->assertSame('ACCEPTANCES_REQUIRED', $error->errorCode);
        }
    }

    public function test_account_password_must_be_entered_long_enough_and_matching(): void
    {
        foreach ([
            [['createAccount' => true, 'password' => 'short', 'confirmPassword' => 'short'], 'at least 8 characters'],
            [['createAccount' => true, 'password' => 'correct horse 1!', 'confirmPassword' => 'different horse 2?'], 'do not match'],
            [['createAccount' => true, 'password' => 'correct horse 1!'], 'confirm a password'],
        ] as [$overrides, $message]) {
            try {
                GuestRules::validate(array_merge($this->base(), $overrides));
                $this->fail('Expected password validation to fail');
            } catch (AppError $error) {
                $this->assertStringContainsString($message, $error->getMessage());
            }
        }

        $parsed = GuestRules::validate(array_merge($this->base(), [
            'createAccount' => true,
            'password' => 'correct horse 1!',
            'confirmPassword' => 'correct horse 1!',
        ]));
        $this->assertSame('correct horse 1!', $parsed['password']);
    }

    public function test_account_creation_stays_optional_for_plain_guests(): void
    {
        $parsed = GuestRules::validate($this->base());

        $this->assertArrayNotHasKey('createAccount', $parsed);
        $this->assertArrayNotHasKey('password', $parsed);
    }
}
