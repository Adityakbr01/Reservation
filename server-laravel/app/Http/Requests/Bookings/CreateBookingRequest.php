<?php

namespace App\Http\Requests\Bookings;

use Illuminate\Foundation\Http\FormRequest;

class CreateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rooms' => ['required', 'array', 'min:1', 'max:5'],
            'rooms.*.room_type_id' => ['required', 'string', 'size:24'],
            'rooms.*.rate_plan_id' => ['required', 'string', 'size:24'],
            'rooms.*.quantity' => ['required', 'integer', 'min:1', 'max:10'],
            'check_in' => ['required', 'date', 'after_or_equal:today'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'guests.adults' => ['required', 'integer', 'min:1', 'max:20'],
            'guests.children' => ['required', 'integer', 'min:0', 'max:20'],
            'contact.title' => ['nullable', 'string', 'max:20'],
            'contact.first_name' => ['required', 'string', 'min:1', 'max:80'],
            'contact.last_name' => ['required', 'string', 'min:1', 'max:80'],
            'contact.email' => ['required', 'email', 'max:160'],
            'contact.phone' => ['required', 'string', 'min:4', 'max:40'],
            'contact.mobile' => ['nullable', 'string', 'max:40'],
            'contact.address1' => ['nullable', 'string', 'max:200'],
            'contact.address2' => ['nullable', 'string', 'max:200'],
            'contact.city' => ['nullable', 'string', 'max:80'],
            'contact.county' => ['nullable', 'string', 'max:80'],
            'contact.postcode' => ['nullable', 'string', 'max:20'],
            'contact.country' => ['nullable', 'string', 'max:80'],
            'coupon_code' => ['nullable', 'string', 'min:1', 'max:40'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
