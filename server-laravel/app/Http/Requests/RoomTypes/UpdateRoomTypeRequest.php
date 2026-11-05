<?php

namespace App\Http\Requests\RoomTypes;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomTypeRequest extends FormRequest
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
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'max_adults' => ['sometimes', 'integer', 'min:1'],
            'max_children' => ['sometimes', 'integer', 'min:0'],
            'max_occupancy' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', 'string', 'in:DRAFT,ACTIVE,ARCHIVED'],
        ];
    }
}
