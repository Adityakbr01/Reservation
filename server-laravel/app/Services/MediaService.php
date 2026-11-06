<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\CmsBlogPost;
use App\Models\CmsOffer;
use App\Models\CmsPage;
use App\Models\Media;
use App\Models\RoomType;
use App\Models\SiteSettings;
use App\Support\AppError;
use App\Support\MediaFolders;
use App\Support\StorageKeys;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

class MediaService
{
    public function upload(UploadedFile $file, array $options = [], ?string $createdBy = null): array
    {
        $mime = (string) ($file->getMimeType() ?: $file->getClientMimeType());
        $this->assertAllowedFile($mime, (int) $file->getSize(), $file->getClientOriginalName());

        $key = StorageKeys::buildMediaKey(
            $file->getClientOriginalName(),
            $mime,
            null,
            (string) config('media.storage_prefix', '')
        );

        [$disk, $provider] = $this->storeFile($file, $key);
        [$url] = $this->urlFor($disk, $key);

        try {
            $media = Media::create([
                'id' => bin2hex(random_bytes(12)),
                'file_name' => $file->getClientOriginalName(),
                'url' => $url,
                'storage_key' => $key,
                'storage_provider' => $provider,
                'mime' => $mime,
                'kind' => str_starts_with($mime, 'video/') ? 'video' : 'image',
                'folder' => MediaFolders::normalizeFolderPath($options['folder'] ?? null),
                'alt' => $options['alt'] ?? null,
                'caption' => $options['caption'] ?? null,
                'size' => (int) $file->getSize(),
                'position' => (int) ($options['position'] ?? 0),
                'created_by' => $createdBy,
            ]);
        } catch (Throwable $error) {
            $this->removeBinary($provider, $key);

            throw $error;
        }

        return $this->toArray($media);
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
     */
    public function list(array $filter): array
    {
        $page = max(1, (int) ($filter['page'] ?? 1));
        $limit = min(100, max(1, (int) ($filter['limit'] ?? 10)));

        $query = Media::query();

        $q = trim((string) ($filter['q'] ?? ''));
        if ($q !== '') {
            $query->where('file_name', 'like', '%'.MediaFolders::escapeLike($q).'%');
        }

        $kind = $filter['kind'] ?? null;
        if ($kind === 'video') {
            $query->where(function ($builder): void {
                $builder->where('kind', 'video')->orWhere('mime', 'like', 'video/%');
            });
        } elseif ($kind === 'image') {
            $query->where('kind', 'image');
        }

        if (array_key_exists('folder', $filter) && $filter['folder'] !== null) {
            $folder = (string) $filter['folder'];
            $folderFilter = MediaFolders::folderQuery($folder);
            if ($folder === '__root__') {
                $query->whereNull('folder');
            } elseif (is_array($folderFilter)) {
                $prefix = substr($folder, 0, -2);
                $query->where('folder', 'like', MediaFolders::escapeLike($prefix).'/%');
            } else {
                $query->where('folder', $folderFilter);
            }
        }

        $total = (clone $query)->count();

        $rows = $query
            ->orderBy('position')
            ->orderByDesc('created_at')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get()
            ->map(fn (Media $media) => $this->toArray($media))
            ->all();

        return [
            'data' => $rows,
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    public function folders(): array
    {
        $folders = Media::query()
            ->whereNotNull('folder')
            ->distinct()
            ->pluck('folder')
            ->filter(fn ($folder) => is_string($folder) && $folder !== '')
            ->values()
            ->all();

        sort($folders, SORT_NATURAL | SORT_FLAG_CASE);

        return $folders;
    }

    public function updateMeta(string $id, array $patch): array
    {
        $media = $this->findOrFail($id);

        if (array_key_exists('alt', $patch)) {
            $media->alt = $patch['alt'];
        }
        if (array_key_exists('caption', $patch)) {
            $media->caption = $patch['caption'];
        }
        if (array_key_exists('folder', $patch)) {
            $media->folder = MediaFolders::normalizeFolderPath($patch['folder']);
        }

        $media->save();

        return $this->toArray($media);
    }

    public function delete(string $id): void
    {
        $media = $this->findOrFail($id);

        $refs = $this->findReferences($id);
        if ($refs > 0) {
            throw new AppError(
                "Media is used by {$refs} published item(s) — replace it there first",
                409,
                'MEDIA_IN_USE'
            );
        }

        $this->removeBinary($media->storage_provider, $media->storage_key);
        $media->delete();
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return array<int, array{id: string, url: string, alt: ?string, mime: string, kind: string}>
     */
    public function resolve(array $ids): array
    {
        $unique = array_values(array_unique(array_filter(
            array_map(fn ($id) => is_string($id) ? trim($id) : '', $ids),
            fn (string $id) => strlen($id) === 24
        )));

        $unique = array_slice($unique, 0, 50);
        if ($unique === []) {
            return [];
        }

        return Media::query()
            ->whereIn('id', $unique)
            ->get()
            ->map(fn (Media $media) => [
                'id' => $media->id,
                'url' => $media->url,
                'alt' => $media->alt,
                'mime' => $media->mime,
                'kind' => $this->kindFor($media),
            ])
            ->all();
    }

    public function find(string $id): ?Media
    {
        if (strlen($id) !== 24) {
            return null;
        }

        return Media::find($id);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Media $media): array
    {
        return [
            'id' => $media->id,
            'fileName' => $media->file_name,
            'url' => $media->url,
            'storageKey' => $media->storage_key,
            'storageProvider' => $media->storage_provider,
            'mime' => $media->mime,
            'kind' => $this->kindFor($media),
            'folder' => $media->folder,
            'width' => $media->width,
            'height' => $media->height,
            'durationSec' => $media->duration_sec !== null ? (float) $media->duration_sec : null,
            'alt' => $media->alt,
            'caption' => $media->caption,
            'size' => (int) $media->size,
            'position' => (int) $media->position,
            'createdBy' => $media->created_by,
            'createdAt' => $this->isoDate($media->created_at),
            'updatedAt' => $this->isoDate($media->updated_at),
        ];
    }

    private function findOrFail(string $id): Media
    {
        $media = $this->find($id);
        if (! $media) {
            throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
        }

        return $media;
    }

    private function kindFor(Media $media): string
    {
        return $media->kind === 'video' || str_starts_with((string) $media->mime, 'video/')
            ? 'video'
            : 'image';
    }

    private function isoDate(mixed $date): ?string
    {
        if (empty($date)) {
            return null;
        }

        if ($date instanceof \DateTimeInterface) {
            return $date->format('Y-m-d\TH:i:s.v\Z');
        }

        if (is_string($date)) {
            try {
                return \Illuminate\Support\Carbon::parse($date)->utc()->format('Y-m-d\TH:i:s.v\Z');
            } catch (\Throwable) {
                return $date;
            }
        }

        return (string) $date;
    }

    private function assertAllowedFile(string $mime, int $size, string $fileName): void
    {
        if (! in_array($mime, config('media.allowed_mimes', []), true)) {
            throw new AppError(
                'Only JPEG, PNG, WebP, AVIF images or MP4/WebM video are allowed',
                400,
                'INVALID_FILE_TYPE'
            );
        }

        if (str_starts_with($mime, 'video/') && $size > config('media.max_video_bytes')) {
            throw new AppError("Video {$fileName} must be smaller than 50 MB", 400, 'FILE_TOO_LARGE');
        }

        if (str_starts_with($mime, 'image/') && $size > config('media.max_image_bytes')) {
            throw new AppError("Image {$fileName} must be smaller than 8 MB", 400, 'FILE_TOO_LARGE');
        }
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function storeFile(UploadedFile $file, string $key): array
    {
        $filename = basename($key);

        // 1. Save directly into public/uploads (no symlink dependency)
        $publicUploads = public_path('uploads');
        if (! file_exists($publicUploads)) {
            @mkdir($publicUploads, 0755, true);
        }
        $publicTarget = $publicUploads . DIRECTORY_SEPARATOR . $filename;
        @copy($file->getRealPath(), $publicTarget);

        // 2. Also save to storage/app/public/uploads as backup
        $storageUploads = storage_path('app/public/uploads');
        if (! file_exists($storageUploads)) {
            @mkdir($storageUploads, 0755, true);
        }
        $storageTarget = $storageUploads . DIRECTORY_SEPARATOR . $filename;
        @copy($file->getRealPath(), $storageTarget);

        try {
            Storage::disk('public')->put($key, file_get_contents($file->getRealPath()));
        } catch (Throwable) {
        }

        return ['public', 'local'];
    }

    /**
     * @return array{0: string, 1: ?string}
     */
    private function urlFor(string $disk, string $key): array
    {
        $baseUrl = rtrim(config('app.url', 'https://laravel.hamptworthstays.com'), '/');
        $filename = basename($key);

        return ["{$baseUrl}/uploads/{$filename}", null];
    }

    private function removeBinary(string $provider, string $key): void
    {
        $filename = basename($key);
        $publicFile = public_path('uploads/' . $filename);
        if (file_exists($publicFile)) {
            @unlink($publicFile);
        }

        $storageFile = storage_path('app/public/uploads/' . $filename);
        if (file_exists($storageFile)) {
            @unlink($storageFile);
        }

        try {
            Storage::disk('public')->delete($key);
        } catch (Throwable) {
            // Best-effort cleanup; a missing binary must not block the DB change.
        }
    }

    private function findReferences(string $mediaId): int
    {
        $count = 0;

        foreach (CmsPage::all(['id', 'featured_image_media_id', 'seo']) as $page) {
            if ($page->featured_image_media_id === $mediaId || $this->seoUsesMedia($page->seo, $mediaId)) {
                $count++;
            }
        }

        foreach (CmsBlogPost::all(['id', 'featured_image_media_id', 'seo']) as $post) {
            if ($post->featured_image_media_id === $mediaId || $this->seoUsesMedia($post->seo, $mediaId)) {
                $count++;
            }
        }

        foreach (CmsOffer::all(['id', 'image_media_id', 'seo']) as $offer) {
            if ($offer->image_media_id === $mediaId || $this->seoUsesMedia($offer->seo, $mediaId)) {
                $count++;
            }
        }

        foreach (RoomType::all([
            'id', 'welcome_hamper_image_media_id', 'floorplan_media_ids', 'images', 'media',
        ]) as $roomType) {
            $matched = $roomType->welcome_hamper_image_media_id === $mediaId
                || $this->listUsesMedia($roomType->floorplan_media_ids, $mediaId)
                || $this->objectsUseMedia($roomType->images, $mediaId)
                || $this->objectsUseMedia($roomType->media, $mediaId);

            if ($matched) {
                $count++;
            }
        }

        foreach (SiteSettings::all(['id', 'logo_media_id', 'favicon_media_id', 'default_seo']) as $settings) {
            if (
                $settings->logo_media_id === $mediaId
                || $settings->favicon_media_id === $mediaId
                || $this->seoUsesMedia($settings->default_seo, $mediaId)
            ) {
                $count++;
            }
        }

        foreach (Amenity::all(['id', 'image_media_id']) as $amenity) {
            if ($amenity->image_media_id === $mediaId) {
                $count++;
            }
        }

        return $count;
    }

    private function seoUsesMedia(mixed $seo, string $mediaId): bool
    {
        return is_array($seo) && (($seo['ogImageMediaId'] ?? null) === $mediaId);
    }

    private function listUsesMedia(mixed $ids, string $mediaId): bool
    {
        return is_array($ids) && in_array($mediaId, $ids, true);
    }

    private function objectsUseMedia(mixed $items, string $mediaId): bool
    {
        if (! is_array($items)) {
            return false;
        }

        foreach ($items as $item) {
            if (is_array($item) && (($item['mediaId'] ?? null) === $mediaId)) {
                return true;
            }
        }

        return false;
    }
}
