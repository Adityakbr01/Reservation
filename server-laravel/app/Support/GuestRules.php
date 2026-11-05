<?php

namespace App\Support;

use Illuminate\Support\Facades\Validator;

class GuestRules
{
    public static function normalizeGuestEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    public static function guestDisplayName(?string $firstName, ?string $lastName): string
    {
        $name = trim(trim((string) $firstName).' '.trim((string) $lastName));

        return $name === '' ? 'Guest' : mb_substr($name, 0, 80);
    }

    /**
     * Checkout acceptances are mandatory (policies acknowledgement).
     */
    public static function assertGuestAcceptances(bool $acceptPrivacy, bool $acceptTerms): void
    {
        if (! $acceptPrivacy || ! $acceptTerms) {
            throw new AppError(
                'Please accept the Privacy Terms and Booking Conditions to continue',
                400,
                'ACCEPTANCES_REQUIRED'
            );
        }
    }

    public static function assertGuestAcceptancesFor(array $input): void
    {
        self::assertGuestAcceptances(
            ($input['acceptPrivacy'] ?? false) === true,
            ($input['acceptTerms'] ?? false) === true
        );
    }

    /**
     * Validated, normalized guest booking payload.
     *
     * @throws AppError
     */
    public static function validate(array $input): array
    {
        $validator = Validator::make($input, [
            'rooms' => ['required', 'array', 'min:1', 'max:5'],
            'rooms.*.roomTypeId' => ['required', 'regex:/^[a-f0-9]{24}$/i'],
            'rooms.*.ratePlanId' => ['required', 'regex:/^[a-f0-9]{24}$/i'],
            'rooms.*.quantity' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'checkIn' => ['required', 'date'],
            'checkOut' => ['required', 'date'],
            'guests' => ['required', 'array'],
            'guests.adults' => ['required', 'integer', 'min:1', 'max:20'],
            'guests.children' => ['required', 'integer', 'min:0', 'max:20'],
            'contact' => ['required', 'array'],
            'contact.title' => ['sometimes', 'nullable', 'string', 'max:20'],
            'contact.firstName' => ['required', 'string', 'max:80'],
            'contact.lastName' => ['required', 'string', 'max:80'],
            'contact.email' => ['required', 'email', 'max:160'],
            'contact.phone' => ['required', 'string', 'min:4', 'max:40'],
            'contact.mobile' => ['sometimes', 'nullable', 'string', 'max:40'],
            'contact.address1' => ['sometimes', 'nullable', 'string', 'max:200'],
            'contact.address2' => ['sometimes', 'nullable', 'string', 'max:200'],
            'contact.city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'contact.county' => ['sometimes', 'nullable', 'string', 'max:80'],
            'contact.postcode' => ['sometimes', 'nullable', 'string', 'max:20'],
            'contact.country' => ['sometimes', 'nullable', 'string', 'max:80'],
            'couponCode' => ['sometimes', 'string', 'min:1', 'max:40'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'acceptPrivacy' => ['required', 'boolean'],
            'acceptTerms' => ['required', 'boolean'],
            'createAccount' => ['sometimes', 'nullable', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'max:128'],
            'confirmPassword' => ['sometimes', 'nullable', 'string', 'max:128'],
            'newsletter' => ['sometimes', 'nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            throw new AppError($validator->errors()->first(), 422, 'VALIDATION_ERROR', $validator->errors()->toArray());
        }

        $data = $validator->validated();
        $data['rooms'] = array_map(static fn (array $room): array => [
            'roomTypeId' => $room['roomTypeId'],
            'ratePlanId' => $room['ratePlanId'],
            'quantity' => $room['quantity'] ?? 1,
        ], $data['rooms']);

        $data['contact'] = array_map(
            static fn (mixed $value): mixed => is_string($value) ? trim($value) : $value,
            $data['contact']
        );
        $data['contact']['email'] = self::normalizeGuestEmail((string) $data['contact']['email']);
        foreach (['rooms', 'checkIn', 'checkOut', 'guests'] as $field) {
            if (is_string($data[$field] ?? null)) {
                $data[$field] = trim($data[$field]);
            }
        }

        if (($data['createAccount'] ?? false) === true) {
            $password = trim((string) ($data['password'] ?? ''));
            $confirm = trim((string) ($data['confirmPassword'] ?? ''));
            if ($password === '' || $confirm === '') {
                throw new AppError(
                    'Enter and confirm a password to create your account, or uncheck the box',
                    422,
                    'PASSWORD_REQUIRED'
                );
            }
            if (strlen($password) < 8) {
                throw new AppError('Password must be at least 8 characters long', 422, 'PASSWORD_TOO_SHORT');
            }
            if ($password !== $confirm) {
                throw new AppError('Passwords do not match', 422, 'PASSWORD_MISMATCH');
            }
        }

        return $data;
    }
}
