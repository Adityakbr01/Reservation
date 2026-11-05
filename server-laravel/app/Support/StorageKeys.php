<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;

/**
 * Storage keys are relative to the disk jail root:
 * `media/<yyyy>/<mm>/<hex>-<slug>.<ext>` or `avatars/<user>-<ms>-<hex>-<slug>.<ext>`.
 * Extension always comes from the server-detected MIME, never the client.
 */
class StorageKeys
{
    private const MIME_TO_EXT = [
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
        'image/avif' => '.avif',
        'video/mp4' => '.mp4',
        'video/webm' => '.webm',
    ];

    private const SEGMENT_PATTERN = '/^[A-Za-z0-9][A-Za-z0-9._-]*$/';

    private const MAX_KEY_LENGTH = 220;

    /**
     * @return array<int, string>
     */
    public static function prefixSegments(?string $prefix = null): array
    {
        $prefix ??= (string) config('media.storage_prefix', '');

        if (str_starts_with($prefix, '/')) {
            throw new AppError('Invalid GODADDY_FTP_PREFIX', 500, 'INVALID_STORAGE_CONFIG');
        }

        $cleaned = rtrim(trim($prefix), '/');
        if ($cleaned === '') {
            return [];
        }

        $segments = explode('/', $cleaned);
        foreach ($segments as $segment) {
            if ($segment === 'media' || $segment === 'avatars' || ! preg_match(self::SEGMENT_PATTERN, $segment)) {
                throw new AppError('Invalid GODADDY_FTP_PREFIX', 500, 'INVALID_STORAGE_CONFIG');
            }
        }

        return $segments;
    }

    public static function assertStorageKey(string $key): void
    {
        if ($key === '' || strlen($key) > self::MAX_KEY_LENGTH || str_contains($key, '\\')) {
            throw new AppError('Invalid storage key', 500, 'INVALID_STORAGE_KEY');
        }

        $segments = explode('/', $key);
        $kindIndex = null;
        foreach ($segments as $index => $segment) {
            if (! preg_match(self::SEGMENT_PATTERN, $segment)) {
                throw new AppError('Invalid storage key', 500, 'INVALID_STORAGE_KEY');
            }
            if ($kindIndex === null && ($segment === 'media' || $segment === 'avatars')) {
                $kindIndex = $index;
            }
        }

        if ($kindIndex === null || $kindIndex === count($segments) - 1) {
            throw new AppError('Invalid storage key', 500, 'INVALID_STORAGE_KEY');
        }
    }

    private static function safeFileSuffix(string $originalName, string $mime): string
    {
        $ext = self::MIME_TO_EXT[$mime] ?? null;
        if ($ext === null) {
            throw new AppError(
                'Only JPEG, PNG, WebP, AVIF images or MP4/WebM video are allowed',
                400,
                'INVALID_FILE_TYPE'
            );
        }

        $base = Slug::make(preg_replace('/\.[A-Za-z0-9]{1,5}$/', '', $originalName) ?? '');
        if ($base === '') {
            $base = 'file';
        }

        return substr(bin2hex(random_bytes(4)), 0, 8).'-'.substr($base, 0, 60).$ext;
    }

    private static function datePrefix(DateTimeInterface $now): string
    {
        return $now->setTimezone(new \DateTimeZone('UTC'))->format('Y/m');
    }

    /**
     * @param  array<int, string>  $parts
     */
    private static function withPrefix(array $parts, ?string $prefix = null): string
    {
        $key = implode('/', array_merge(self::prefixSegments($prefix), $parts));
        self::assertStorageKey($key);

        return $key;
    }

    public static function buildMediaKey(
        string $originalName,
        string $mime,
        ?DateTimeInterface $now = null,
        ?string $prefix = null
    ): string {
        $now ??= new DateTimeImmutable;

        return self::withPrefix(
            ['media', self::datePrefix($now), self::safeFileSuffix($originalName, $mime)],
            $prefix
        );
    }

    public static function buildAvatarKey(
        string $userId,
        string $originalName,
        string $mime,
        ?int $nowMs = null,
        ?string $prefix = null
    ): string {
        $safeUser = substr(preg_replace('/[^A-Za-z0-9_-]/', '', $userId) ?? '', 0, 40);
        if ($safeUser === '') {
            $safeUser = 'user';
        }

        return self::withPrefix(
            ['avatars', $safeUser.'-'.($nowMs ?? (int) floor(microtime(true) * 1000)).'-'.self::safeFileSuffix($originalName, $mime)],
            $prefix
        );
    }

    public static function publicAssetUrl(string $baseUrl, string $key): string
    {
        self::assertStorageKey($key);

        return rtrim($baseUrl, '/').'/'.$key;
    }

    public static function parentDirOf(string $key): string
    {
        self::assertStorageKey($key);
        $parts = explode('/', $key);
        array_pop($parts);

        return implode('/', $parts);
    }
}
