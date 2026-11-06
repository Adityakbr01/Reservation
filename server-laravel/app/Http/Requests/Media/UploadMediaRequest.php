<?php

namespace App\Http\Requests\Media;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UploadMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $mimes = implode(',', config('media.allowed_mimes', []));
        $maxKb = (int) ceil(config('media.max_video_bytes', 50 * 1024 * 1024) / 1024);

        return [
            'file' => ['nullable', 'file', 'max:'.$maxKb, 'mimetypes:'.$mimes],
            'files' => ['nullable', 'array', 'max:'.config('media.max_files', 10)],
            'files.*' => ['file', 'max:'.$maxKb, 'mimetypes:'.$mimes],
            'folder' => ['nullable', 'string', 'max:200'],
            'alt' => ['nullable', 'string', 'max:200'],
            'caption' => ['nullable', 'string', 'max:300'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $filesInput = $this->file('files');
            if ($filesInput instanceof \Illuminate\Http\UploadedFile) {
                $filesInput = [$filesInput];
            } elseif (! is_array($filesInput)) {
                $filesInput = [];
            }

            $singleFile = $this->file('file');
            $files = array_merge(
                $singleFile instanceof \Illuminate\Http\UploadedFile ? [$singleFile] : [],
                $filesInput
            );

            if ($files === []) {
                $validator->errors()->add('file', 'Attach files with the `file` or `files` field');

                return;
            }

            foreach ($files as $file) {
                $mime = (string) $file->getMimeType();
                $size = (int) $file->getSize();
                if (str_starts_with($mime, 'video/') && $size > config('media.max_video_bytes')) {
                    $validator->errors()->add('files', "Video {$file->getClientOriginalName()} must be smaller than 50 MB");
                } elseif (str_starts_with($mime, 'image/') && $size > config('media.max_image_bytes')) {
                    $validator->errors()->add('files', "Image {$file->getClientOriginalName()} must be smaller than 8 MB");
                }
            }
        });
    }
}
