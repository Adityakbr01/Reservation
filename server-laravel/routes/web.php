<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
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

Route::match(['get', 'post'], '/fix-env', function () {
    if (request('token') !== 'hamptworth2026') {
        abort(403, 'Unauthorized');
    }

    $envPath = base_path('.env');
    if (! file_exists($envPath)) {
        return response()->json(['error' => '.env file not found'], 404);
    }

    $content = file_get_contents($envPath);
    $content = preg_replace('/^DB_HOST=.*$/m', 'DB_HOST=localhost', $content);
    $content = preg_replace('/^DB_DATABASE=.*$/m', 'DB_DATABASE=hamptworthstays', $content);
    $content = preg_replace('/^DB_USERNAME=.*$/m', 'DB_USERNAME=hamptworthstays-user', $content);
    $content = preg_replace('/^DB_PASSWORD=.*$/m', 'DB_PASSWORD="ZZhXesv]esB?+-FM"', $content);
    file_put_contents($envPath, $content);

    $storageSymlink = public_path('storage');
    if (is_link($storageSymlink) || (! is_dir($storageSymlink) && file_exists($storageSymlink))) {
        @unlink($storageSymlink);
    }

    try {
        Artisan::call('config:clear');
    } catch (\Throwable $e) {
    }

    return response()->json([
        'success' => true,
        'message' => 'Production database credentials restored in .env successfully',
        'db_user' => 'hamptworthstays-user',
        'db_database' => 'hamptworthstays',
    ]);
});

// Direct file serving for uploads and legacy storage paths
Route::get('/uploads/{path}', function (string $path) {
    $filename = basename($path);
    $candidates = [
        public_path('uploads/' . $filename),
        public_path('uploads/' . $path),
        storage_path('app/public/uploads/' . $filename),
        storage_path('app/public/' . $path),
    ];

    foreach ($candidates as $file) {
        if (file_exists($file) && ! is_dir($file)) {
            $mime = mime_content_type($file) ?: 'application/octet-stream';

            return response()->file($file, [
                'Content-Type' => $mime,
                'Access-Control-Allow-Origin' => '*',
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }
    }

    abort(404, 'File not found');
})->where('path', '.*');

Route::get('/storage/{path}', function (string $path) {
    $filename = basename($path);
    $candidates = [
        public_path('uploads/' . $filename),
        storage_path('app/public/' . $path),
        public_path('storage/' . $path),
        storage_path('app/public/media/' . $path),
        storage_path('app/public/media/2026/11/' . $filename),
    ];

    foreach ($candidates as $file) {
        if (file_exists($file) && ! is_dir($file)) {
            $mime = mime_content_type($file) ?: 'application/octet-stream';

            return response()->file($file, [
                'Content-Type' => $mime,
                'Access-Control-Allow-Origin' => '*',
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }
    }

    abort(404, 'File not found');
})->where('path', '.*');
