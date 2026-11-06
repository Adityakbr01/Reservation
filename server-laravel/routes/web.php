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

    try {
        $results['bridge'] = \App\Services\DatabaseBridgeService::syncAll();
    } catch (\Throwable $e) {
        $results['bridge_error'] = $e->getMessage();
    }

    return response()->json([
        'success' => true,
        'message' => 'Laravel migrations and setup completed',
        'results' => $results,
        'php_version' => PHP_VERSION,
        'app_env' => config('app.env'),
    ]);
});

Route::match(['get', 'post'], '/db-inspect', function () {
    if (request('token') !== 'hamptworth2026') {
        abort(403, 'Unauthorized');
    }

    $pdo = \Illuminate\Support\Facades\DB::connection()->getPdo();
    $tables = \Illuminate\Support\Facades\DB::select('SHOW TABLES');
    $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
    $keyName = "Tables_in_" . $dbName;

    $tableStats = [];
    foreach ($tables as $t) {
        $tableName = $t->$keyName;
        $count = \Illuminate\Support\Facades\DB::table($tableName)->count();
        $tableStats[$tableName] = $count;
    }

    $users = \Illuminate\Support\Facades\Schema::hasTable('users') 
        ? \Illuminate\Support\Facades\DB::table('users')->select('id', 'name', 'email', 'role')->get() 
        : [];

    $userColumns = \Illuminate\Support\Facades\Schema::hasTable('users')
        ? \Illuminate\Support\Facades\Schema::getColumnListing('users')
        : [];

    return response()->json([
        'database' => $dbName,
        'table_count' => count($tables),
        'tables' => $tableStats,
        'users' => $users,
        'user_columns' => $userColumns,
    ]);
});

Route::match(['get', 'post'], '/setup-system', function () {
    return redirect('/db-migrate?token=' . request('token'));
});

Route::match(['get', 'post'], '/artisan-setup', function () {
    return redirect('/db-migrate?token=' . request('token'));
});

Route::match(['get', 'post'], '/seed-admin', function () {
    if (request('token') !== 'hamptworth2026') {
        abort(403, 'Unauthorized');
    }

    try {
        $bridgeLog = \App\Services\DatabaseBridgeService::syncAll();
    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
        ], 500);
    }

    return response()->json([
        'success' => true,
        'message' => 'Database synchronized and Admin ready: admin@gmail.com / admin@gmail.com',
        'details' => $bridgeLog,
    ]);
});

Route::match(['get', 'post'], '/test-email', function () {
    if (request('token') !== 'hamptworth2026') {
        abort(403, 'Unauthorized');
    }

    $to = request('to');
    if (! $to || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return response()->json([
            'success' => false,
            'error' => 'Please provide a valid recipient: ?token=hamptworth2026&to=youremail@example.com',
        ], 422);
    }

    try {
        $id = app(\App\Services\NotificationService::class)->sendViaResend(
            $to,
            'Hamptworth Stays — Email Test',
            '<h2>Email Delivery Working!</h2><p>This is a test email sent from Hamptworth Stays Laravel API on GoDaddy cPanel via Resend.</p><p>Timestamp: ' . now()->toDateTimeString() . '</p>'
        );

        return response()->json([
            'success' => true,
            'message' => "Test email successfully sent to {$to}",
            'resend_id' => $id,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
        ], 500);
    }
});
