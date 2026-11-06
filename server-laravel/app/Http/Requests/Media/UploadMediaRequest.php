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
        return [
            'file' => ['nullable'],
            'files' => ['nullable'],
            'folder' => ['nullable', 'string', 'max:200'],
            'alt' => ['nullable', 'string', 'max:200'],
            'caption' => ['nullable', 'string', 'max:300'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $files = [];

            if ($this->file('file') instanceof \Illuminate\Http\UploadedFile) {
                $files[] = $this->file('file');
            }

            $filesInput = $this->file('files');
            if ($filesInput instanceof \Illuminate\Http\UploadedFile) {
                $files[] = $filesInput;
            } elseif (is_array($filesInput)) {
                foreach ($filesInput as $f) {
                    if ($f instanceof \Illuminate\Http\UploadedFile) {
                        $files[] = $f;
                    }
                }
            }

            if (empty($files)) {
                $validator->errors()->add('files', 'Attach files with the `file` or `files` field');
                return;
            }

            $maxFiles = (int) config('media.max_files', 10);
            if (count($files) > $maxFiles) {
                $validator->errors()->add('files', "The files field must not have more than {$maxFiles} items.");
                return;
            }

            $allowedMimes = config('media.allowed_mimes', []);
            $maxVideo = (int) config('media.max_video_bytes', 50 * 1024 * 1024);
            $maxImage = (int) config('media.max_image_bytes', 8 * 1024 * 1024);

            foreach ($files as $file) {
                $mime = (string) ($file->getMimeType() ?: $file->getClientMimeType());
                $size = (int) $file->getSize();

                if (! empty($allowedMimes) && ! in_array($mime, $allowedMimes, true)) {
                    $validator->errors()->add('files', "File {$file->getClientOriginalName()} has unsupported type ({$mime}).");
                } elseif (str_starts_with($mime, 'video/') && $size > $maxVideo) {
                    $validator->errors()->add('files', "Video {$file->getClientOriginalName()} must be smaller than 50 MB");
                } elseif (str_starts_with($mime, 'image/') && $size > $maxImage) {
                    $validator->errors()->add('files', "Image {$file->getClientOriginalName()} must be smaller than 8 MB");
                }
            }
        });
    }
}
