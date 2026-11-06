<?php

namespace App\Http\Requests\Availability;

use Illuminate\Foundation\Http\FormRequest;

class SearchAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'check_in' => $this->input('check_in') ?? $this->input('checkIn'),
            'check_out' => $this->input('check_out') ?? $this->input('checkOut'),
            'room_type_id' => $this->input('room_type_id') ?? $this->input('roomTypeId'),
            'adults' => $this->input('adults') ?? 2,
            'children' => $this->input('children') ?? 0,
            'rooms' => $this->input('rooms') ?? 1,
        ]);
    }

    public function rules(): array
    {
        return [
            'check_in' => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'room_type_id' => ['nullable', 'string', 'size:24'],
            'adults' => ['nullable', 'integer', 'min:1', 'max:20'],
            'children' => ['nullable', 'integer', 'min:0', 'max:20'],
            'rooms' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }
}
