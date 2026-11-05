<?php

namespace App\Http\Requests\Cms;

use Illuminate\Foundation\Http\FormRequest;

class CreateBlogPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:140', 'unique:cms_blog_posts,slug'],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'content' => ['required', 'string'],
            'featured_image_media_id' => ['nullable', 'string', 'size:24'],
            'author' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:80'],
            'tags' => ['nullable', 'array'],
            'reading_minutes' => ['nullable', 'integer', 'min:1'],
            'seo' => ['nullable', 'array'],
            'status' => ['required', 'string', 'in:DRAFT,PUBLISHED,ARCHIVED'],
        ];
    }
}
