<?php

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL', 'http://localhost').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        'ftp' => [
            'driver' => 'ftp',
            'host' => env('GODADDY_FTP_HOST'),
            'port' => env('GODADDY_FTP_PORT', 21),
            'username' => env('GODADDY_FTP_USER'),
            'password' => env('GODADDY_FTP_PASSWORD'),
            'root' => env('GODADDY_FTP_PREFIX', ''),
            'ssl' => env('GODADDY_FTP_SECURE', true),
            'passive' => true,
            'timeout' => 30,
        ],

    ],

];
