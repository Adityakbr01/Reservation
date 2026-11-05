<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Media disk
    |--------------------------------------------------------------------------
    |
    | Local development uses Laravel's standard "public" disk
    | (storage/app/public + `php artisan storage:link`). Production can point
    | this at the FTP disk once GODADDY_FTP_* is configured.
    |
    */

    'disk' => env('MEDIA_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Storage prefix
    |--------------------------------------------------------------------------
    |
    | Optional path prefix for GoDaddy storage keys, e.g. "uploads" produces
    | uploads/media/2026/10/<hash>-<slug>.jpg. Empty keeps media/… keys.
    |
    */

    'storage_prefix' => env('GODADDY_FTP_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Public asset base URL
    |--------------------------------------------------------------------------
    |
    | Used for remote/FTP uploads. Local public-disk URLs come from the disk
    | configuration so `storage:link` keeps working out of the box.
    |
    */

    'asset_base_url' => env('ASSETS_BASE_URL'),

    /*
    |--------------------------------------------------------------------------
    | Upload limits
    |--------------------------------------------------------------------------
    |
    | Mirrors the Node backend: images up to 8 MB, video up to 50 MB, max 10
    | files per multipart request.
    |
    */

    'max_image_bytes' => 8 * 1024 * 1024,
    'max_video_bytes' => 50 * 1024 * 1024,
    'max_files' => 10,

    'allowed_mimes' => [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'video/mp4',
        'video/webm',
    ],

];
