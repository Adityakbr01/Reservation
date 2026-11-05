<?php

namespace App\Http\Requests\RoomTypes;

use Illuminate\Foundation\Http\FormRequest;

class CreateRoomTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'max_adults' => ['required', 'integer', 'min:1'],
            'max_children' => ['nullable', 'integer', 'min:0'],
            'max_occupancy' => ['required', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:DRAFT,ACTIVE,ARCHIVED'],
        ];
    }
}
