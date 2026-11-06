<?php

namespace App\Http\Requests\RatePlans;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class CreateRatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('roomTypeId') && ! $this->has('room_type_id')) {
            $merge['room_type_id'] = $this->input('roomTypeId');
        }
        if ($this->has('cancellationPolicyId') && ! $this->has('cancellation_policy_id')) {
            $merge['cancellation_policy_id'] = $this->input('cancellationPolicyId');
        }
        if (! $this->has('slug') && $this->has('name')) {
            $merge['slug'] = Str::slug($this->input('name'));
        }
        if (! $this->has('pricing') || ! is_array($this->input('pricing'))) {
            $merge['pricing'] = [
                'basePrice' => (int) ($this->input('price', 15000)),
                'currency' => 'GBP',
                'multiplier' => (float) ($this->input('multiplier', 1.0)),
            ];
        }
        if (! $this->has('restrictions') || ! is_array($this->input('restrictions'))) {
            $merge['restrictions'] = [
                'minStay' => (int) ($this->input('min_nights', 1)),
                'maxStay' => (int) ($this->input('max_nights', 30)),
            ];
        }
        if ($this->has('status')) {
            $merge['status'] = strtoupper($this->input('status'));
        } else {
            $merge['status'] = 'ACTIVE';
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
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
            'status' => ['nullable', 'string', 'in:DRAFT,ACTIVE,ARCHIVED,draft,active,archived'],
        ];
    }
}
