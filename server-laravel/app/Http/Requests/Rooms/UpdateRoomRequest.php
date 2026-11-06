<?php

namespace App\Http\Requests\Rooms;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $map = [
            'roomNumber' => 'room_number',
            'roomTypeId' => 'room_type_id',
            'propertyId' => 'property_id',
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
            'property_id' => ['sometimes', 'string'],
            'room_type_id' => ['sometimes', 'string'],
            'name' => ['sometimes', 'string', 'max:80'],
            'room_number' => ['sometimes', 'string', 'max:20'],
            'floor' => ['nullable', 'string', 'max:20'],
            'status' => ['sometimes', 'string'],
            'condition' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
