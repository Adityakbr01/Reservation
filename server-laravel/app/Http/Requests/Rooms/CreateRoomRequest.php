<?php

namespace App\Http\Requests\Rooms;

use Illuminate\Foundation\Http\FormRequest;

class CreateRoomRequest extends FormRequest
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

        if ($this->has('status') && is_string($this->status)) {
            $merges['status'] = strtoupper($this->status);
        }

        if (! empty($merges)) {
            $this->merge($merges);
        }
    }

    public function rules(): array
    {
        return [
            'room_type_id' => ['required', 'string', 'size:24'],
            'name' => ['required', 'string', 'max:80'],
            'room_number' => ['required', 'string', 'max:20'],
            'floor' => ['nullable', 'string', 'max:20'],
            'status' => ['nullable', 'string', 'in:ACTIVE,MAINTENANCE,OUT_OF_ORDER,active,maintenance,out_of_order'],
            'condition' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
