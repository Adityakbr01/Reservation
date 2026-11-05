<?php

namespace App\Http\Requests\RatePlans;

use Illuminate\Foundation\Http\FormRequest;

class CreateRatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'room_type_id' => ['required', 'string', 'size:24'],
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140'],
            'description' => ['nullable', 'string'],
            'pricing' => ['required', 'array'],
            'restrictions' => ['nullable', 'array'],
            'cancellation_policy_id' => ['nullable', 'string', 'size:24'],
            'status' => ['nullable', 'string', 'in:DRAFT,ACTIVE,ARCHIVED'],
        ];
    }
}
