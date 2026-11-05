<?php

namespace App\Http\Requests\RatePlans;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'slug' => ['sometimes', 'string', 'max:140'],
            'description' => ['nullable', 'string'],
            'pricing' => ['sometimes', 'array'],
            'restrictions' => ['nullable', 'array'],
            'cancellation_policy_id' => ['nullable', 'string', 'size:24'],
            'status' => ['sometimes', 'string', 'in:DRAFT,ACTIVE,ARCHIVED'],
        ];
    }
}
