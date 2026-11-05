<?php

namespace App\Http\Requests\Cms;

use Illuminate\Foundation\Http\FormRequest;

class CreatePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:140', 'unique:cms_pages,slug'],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'sections' => ['required', 'array'],
            'featured_image_media_id' => ['nullable', 'string', 'size:24'],
            'seo' => ['nullable', 'array'],
            'status' => ['required', 'string', 'in:DRAFT,PUBLISHED,ARCHIVED'],
        ];
    }
}
