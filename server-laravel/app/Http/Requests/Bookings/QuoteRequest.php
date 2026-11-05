<?php

namespace App\Http\Requests\Bookings;

use Illuminate\Foundation\Http\FormRequest;

class QuoteRequest extends FormRequest
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
            'check_in' => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'guests.adults' => ['required', 'integer', 'min:1', 'max:20'],
            'guests.children' => ['required', 'integer', 'min:0', 'max:20'],
            'coupon_code' => ['nullable', 'string', 'min:1', 'max:40'],
        ];
    }
}
