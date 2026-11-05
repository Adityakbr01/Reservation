<?php

use App\Models\User;

return [

    'secret' => env('JWT_SECRET'),

    'keys' => [
        'public' => env('JWT_PUBLIC_KEY', null),
        'private' => env('JWT_PRIVATE_KEY', null),
        'passphrase' => env('JWT_PASSPHRASE', null),
    ],

    'ttl' => env('JWT_TTL', 60),

    'refresh_ttl' => env('JWT_REFRESH_TTL', 20160),

    'algo' => env('JWT_ALGO', 'HS256'),

    'required_claims' => ['iss', 'iat', 'exp', 'nbf', 'sub', 'jti'],

    'persistent_claims' => [],

    'blacklist_enabled' => env('JWT_BLACKLIST_ENABLED', true),

    'blacklist_grace_period' => env('JWT_BLACKLIST_GRACE_PERIOD', 0),

    'user' => [
        'table' => env('JWT_USER_TABLE', 'users'),
        'model' => User::class,
    ],

    'cookie' => [
        'enabled' => false,
        'name' => 'jwt_token',
        'path' => '/',
        'domain' => null,
        'secure' => false,
        'http_only' => true,
        'same_site' => 'lax',
    ],

];
