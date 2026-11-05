<?php

namespace App\Http\Requests\Cms;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:160'],
            'slug' => ['sometimes', 'string', 'max:140', 'unique:cms_pages,slug,'.$this->route('id')],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'sections' => ['sometimes', 'array'],
            'featured_image_media_id' => ['nullable', 'string', 'size:24'],
            'seo' => ['nullable', 'array'],
            'status' => ['sometimes', 'string', 'in:DRAFT,PUBLISHED,ARCHIVED'],
        ];
    }
}
