<?php

return [

    'stripe' => [
        'secret_key' => env('STRIPE_SECRET_KEY'),
        'publishable_key' => env('STRIPE_PUBLISHABLE_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'mail' => [
        'from' => [
            'address' => env('EMAIL_FROM', 'no-reply@example.com'),
            'name' => env('APP_NAME', 'Reservation API'),
        ],
    ],

    'storage' => [
        'provider' => env('STORAGE_PROVIDER', 'local'),
        'base_url' => env('ASSETS_BASE_URL', null),
    ],

];
