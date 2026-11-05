<?php

namespace App\Http\Requests\Dashboard;

use Illuminate\Foundation\Http\FormRequest;

class SalesReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_in_from' => ['nullable', 'date'],
            'check_out_to' => ['nullable', 'date', 'after_or_equal:check_in_from'],
        ];
    }
}
