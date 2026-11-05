<?php

namespace App\Support;

/**
 * Folder path rules shared by media upload, listing and metadata updates.
 */
class MediaFolders
{
    public static function normalizeFolderPath(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $parts = [];
        foreach (explode('/', $raw) as $part) {
            $cleaned = trim(preg_replace('/\s+/u', ' ', $part) ?? '');
            if ($cleaned === '' || $cleaned === '.' || $cleaned === '..') {
                continue;
            }
            $parts[] = mb_substr($cleaned, 0, 60);
            if (count($parts) === 3) {
                break;
            }
        }

        return $parts === [] ? null : implode('/', $parts);
    }

    /**
     * Mirrors the Node folder filter contract:
     * - "__root__" => null (unfiled only)
     * - "Parent/*" => ['$regex' => '^Parent/'] (subtree)
     * - anything else => exact folder string
     *
     * @return null|string|array{'$regex': string}
     */
    public static function folderQuery(string $folder): null|string|array
    {
        if ($folder === '__root__') {
            return null;
        }

        if (str_ends_with($folder, '/*')) {
            $prefix = substr($folder, 0, -2);
            $escaped = str_replace('\\/', '/', preg_quote($prefix, '/'));

            return ['$regex' => '^'.$escaped.'/'];
        }

        return $folder;
    }

    public static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
