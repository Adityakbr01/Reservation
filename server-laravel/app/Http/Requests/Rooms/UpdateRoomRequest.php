<?php

namespace App\Http\Requests\Rooms;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:80'],
            'room_number' => ['sometimes', 'string', 'max:20'],
            'floor' => ['nullable', 'string', 'max:20'],
            'status' => ['sometimes', 'string', 'in:ACTIVE,MAINTENANCE,OUT_OF_ORDER'],
            'condition' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
