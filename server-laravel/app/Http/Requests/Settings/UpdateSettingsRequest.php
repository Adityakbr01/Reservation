<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'property_name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'support_email' => ['nullable', 'email', 'max:160'],
            'address' => ['nullable', 'string', 'max:300'],
            'timezone' => ['nullable', 'string', 'max:60'],
            'currency' => ['nullable', 'string', 'max:10'],
            'check_in_time' => ['nullable', 'string', 'max:10'],
            'check_out_time' => ['nullable', 'string', 'max:10'],
            'reminder_hours_before' => ['nullable', 'integer', 'min:1'],
            'social' => ['nullable', 'array'],
            'default_seo' => ['nullable', 'array'],
            'why_book_with_us' => ['nullable', 'array'],
        ];
    }
}
