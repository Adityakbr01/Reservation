<?php

namespace App\Http\Requests\RatePlans;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $map = [
            'roomTypeId' => 'room_type_id',
            'propertyId' => 'property_id',
            'cancellationPolicyId' => 'cancellation_policy_id',
        ];

        $merges = [];
        $all = $this->all();
        foreach ($map as $camel => $snake) {
            if (array_key_exists($camel, $all) && ! array_key_exists($snake, $all)) {
                $merges[$snake] = $all[$camel];
            }
        }

        if (! empty($merges)) {
            $this->merge($merges);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'slug' => ['sometimes', 'string', 'max:140'],
            'room_type_id' => ['sometimes', 'string'],
            'property_id' => ['sometimes', 'string'],
            'description' => ['nullable', 'string'],
            'pricing' => ['sometimes', 'array'],
            'restrictions' => ['nullable', 'array'],
            'cancellation_policy_id' => ['nullable', 'string'],
            'status' => ['sometimes', 'string'],
        ];
    }
}
