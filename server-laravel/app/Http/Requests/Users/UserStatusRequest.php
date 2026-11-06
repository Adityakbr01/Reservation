<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;

class UserStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('isActive') && ! $this->has('is_active')) {
            $this->merge([
                'is_active' => $this->input('isActive'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'is_active' => ['required', 'boolean'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }
}
