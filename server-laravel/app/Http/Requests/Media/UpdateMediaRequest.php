<?php

namespace App\Http\Requests\Media;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'alt' => ['sometimes', 'nullable', 'string', 'max:200'],
            'caption' => ['sometimes', 'nullable', 'string', 'max:300'],
            'folder' => [
                'sometimes',
                'nullable',
                'string',
                'max:200',
                'regex:/^[A-Za-z0-9 _-]+(\/[A-Za-z0-9 _-]+){0,2}$/',
            ],
        ];
    }
}
