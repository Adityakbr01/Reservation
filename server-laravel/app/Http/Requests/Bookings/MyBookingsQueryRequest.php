<?php

namespace App\Http\Requests\Bookings;

use Illuminate\Foundation\Http\FormRequest;

class MyBookingsQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'status' => ['nullable', 'string', 'in:HELD,PAYMENT_PENDING,CONFIRMED,CHECKED_IN,CHECKED_OUT,CANCELLED,EXPIRED,REFUND_PENDING,REFUNDED'],
        ];
    }
}
