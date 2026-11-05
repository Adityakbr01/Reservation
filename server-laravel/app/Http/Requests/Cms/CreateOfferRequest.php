<?php

namespace App\Http\Requests\Cms;

use Illuminate\Foundation\Http\FormRequest;

class CreateOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:140', 'unique:cms_offers,slug'],
            'description' => ['required', 'string'],
            'image_media_id' => ['nullable', 'string', 'size:24'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after:valid_from'],
            'cta_label' => ['nullable', 'string', 'max:80'],
            'cta_url' => ['nullable', 'url', 'max:500'],
            'coupon_id' => ['nullable', 'string', 'size:24'],
            'seo' => ['nullable', 'array'],
            'status' => ['required', 'string', 'in:DRAFT,PUBLISHED,ARCHIVED'],
        ];
    }
}
