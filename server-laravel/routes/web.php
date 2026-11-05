<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::match(['get', 'post'], '/db-migrate', function () {
    if (request('token') !== 'hamptworth2026') {
        abort(403, 'Unauthorized setup access');
    }

    $results = [];

    try {
        Artisan::call('migrate', ['--force' => true]);
        $results['migrate'] = Artisan::output();
    } catch (\Throwable $e) {
        $results['migrate_error'] = $e->getMessage();
    }

    try {
        Artisan::call('storage:link');
        $results['storage'] = Artisan::output();
    } catch (\Throwable $e) {
        $results['storage_error'] = $e->getMessage();
    }

    try {
        Artisan::call('optimize:clear');
        $results['cache_clear'] = Artisan::output();
    } catch (\Throwable $e) {
        $results['cache_clear_error'] = $e->getMessage();
    }

    return response()->json([
        'success' => true,
        'message' => 'Laravel migrations and setup completed',
        'results' => $results,
        'php_version' => PHP_VERSION,
        'app_env' => config('app.env'),
    ]);
});

Route::match(['get', 'post'], '/setup-system', function () {
    return redirect('/db-migrate?token=' . request('token'));
});

Route::match(['get', 'post'], '/artisan-setup', function () {
    return redirect('/db-migrate?token=' . request('token'));
});
