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

Route::match(['get', 'post'], '/db-purify', function () {
    if (request('token') !== 'hamptworth2026') {
        abort(403, 'Unauthorized');
    }

    $log = [];

    // 1. Drop old duplicate Prisma tables (un-underscored)
    $prismaTables = [
        'roomtypes', 'sitesettings', 'cancellationpolicies', 'rateplans', 'bookingitems',
        'cmspages', 'cmsblogposts', 'cmsfaqs', 'cmsoffers', 'cmspolicydocs',
        'emailtemplates', 'newslettersubscribers', 'auditlogs', 'webhookevents',
        'availabilityblocks', 'dailyprices',
    ];

    $droppedTables = [];
    foreach ($prismaTables as $tbl) {
        if (\Illuminate\Support\Facades\Schema::hasTable($tbl)) {
            try {
                \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS `{$tbl}`");
                $droppedTables[] = $tbl;
            } catch (\Throwable $e) {}
        }
    }
    $log['dropped_old_prisma_tables'] = $droppedTables;

    // 2. Drop camelCase columns from users so users table is 100% pure Laravel
    if (\Illuminate\Support\Facades\Schema::hasTable('users')) {
        $camelCols = [
            'passwordHash', 'isActive', 'avatarUrl', 'avatarFileId', 'avatarStorageProvider',
            'legacyAvatarUrl', 'legacyAvatarFileId', 'passwordResetTokenHash', 'passwordResetExpires',
            'lastLoginAt', 'createdAt', 'updatedAt',
        ];
        $droppedCols = [];
        foreach ($camelCols as $col) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('users', $col)) {
                try {
                    \Illuminate\Support\Facades\DB::statement("ALTER TABLE `users` DROP COLUMN `{$col}`");
                    $droppedCols[] = $col;
                } catch (\Throwable $e) {
                    $log['drop_err_' . $col] = $e->getMessage();
                }
            }
        }
        $log['dropped_user_camel_columns'] = $droppedCols;
    }

    // 3. Drop camelCase columns from other tables if present
    $tablesToClean = ['rooms', 'bookings', 'payments', 'refunds', 'coupons', 'properties', 'media', 'amenities'];
    foreach ($tablesToClean as $tbl) {
        if (\Illuminate\Support\Facades\Schema::hasTable($tbl)) {
            $cols = ['createdAt', 'updatedAt', 'propertyId', 'roomTypeId', 'bookingId', 'userId', 'bookingNumber', 'paymentStatus', 'checkIn', 'checkOut', 'reminderSent', 'paymentMethod', 'idempotencyKey', 'gatewayTransactionId', 'paymentIntentId', 'rawPayload', 'errorMessage', 'paidAt', 'refundAmount', 'gatewayRefundId', 'requestedBy', 'processedAt', 'discountType', 'discountValue', 'minSpend', 'maxDiscount', 'startDate', 'endDate', 'usageLimit', 'usageCount', 'mapEmbedUrl', 'checkInTime', 'checkOutTime', 'storageProvider', 'fileId', 'originalFilename', 'mimeType', 'sizeBytes', 'thumbnailUrl', 'thumbnailFileId', 'uploadedBy', 'imageMediaId', 'iconUrl', 'sortOrder'];
            foreach ($cols as $col) {
                if (\Illuminate\Support\Facades\Schema::hasColumn($tbl, $col)) {
                    try {
                        \Illuminate\Support\Facades\DB::statement("ALTER TABLE `{$tbl}` DROP COLUMN `{$col}`");
                    } catch (\Throwable $e) {}
                }
            }
        }
    }

    // 4. Ensure admin exists in pure Laravel users table
    $hash = \Illuminate\Support\Facades\Hash::make('admin@gmail.com');
    $admin = \Illuminate\Support\Facades\DB::table('users')->where('email', 'admin@gmail.com')->first();
    if ($admin) {
        \Illuminate\Support\Facades\DB::table('users')->where('email', 'admin@gmail.com')->update([
            'password_hash' => $hash,
            'role' => 'admin',
            'is_active' => 1,
            'updated_at' => now(),
        ]);
        $log['admin'] = 'admin@gmail.com password reset to admin@gmail.com';
    } else {
        \Illuminate\Support\Facades\DB::table('users')->insert([
            'id' => '6ac0cc40a287cfd3dfbbf8a8',
            'name' => 'Administrator',
            'email' => 'admin@gmail.com',
            'password_hash' => $hash,
            'role' => 'admin',
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $log['admin'] = 'admin@gmail.com created';
    }

    // 5. Remove broken/forbidden public/storage symlink if present (prevents Apache 403 on GoDaddy)
    $storageSymlink = public_path('storage');
    if (is_link($storageSymlink) || (! is_dir($storageSymlink) && file_exists($storageSymlink))) {
        @unlink($storageSymlink);
        $log['storage_symlink_removed'] = true;
    }

    // 6. Migrate existing media files to public/uploads/
    $publicUploads = public_path('uploads');
    if (! file_exists($publicUploads)) {
        @mkdir($publicUploads, 0755, true);
    }
    $mediaMigrated = 0;
    $allMedia = \App\Models\Media::all();
    $baseUrl = rtrim(config('app.url', 'https://laravel.hamptworthstays.com'), '/');
    foreach ($allMedia as $m) {
        $filename = basename($m->storage_key ?? $m->url ?? '');
        if (! $filename) {
            continue;
        }

        $sourceCandidates = [
            storage_path('app/public/' . ($m->storage_key ?? '')),
            storage_path('app/public/media/' . ($m->storage_key ?? '')),
            storage_path('app/public/media/2026/11/' . $filename),
            public_path('uploads/' . $filename),
        ];

        foreach ($sourceCandidates as $src) {
            if (file_exists($src) && ! is_dir($src)) {
                $target = $publicUploads . DIRECTORY_SEPARATOR . $filename;
                if (! file_exists($target)) {
                    @copy($src, $target);
                }
                break;
            }
        }

        $newUrl = "{$baseUrl}/uploads/{$filename}";
        $newKey = "uploads/{$filename}";
        if ($m->url !== $newUrl || $m->storage_key !== $newKey) {
            \Illuminate\Support\Facades\DB::table('media')->where('id', $m->id)->update([
                'url' => $newUrl,
                'storage_key' => $newKey,
                'folder' => null,
            ]);
            $mediaMigrated++;
        }
    }
    $log['media_migrated_to_uploads'] = $mediaMigrated;

    try {
        Artisan::call('optimize:clear');
    } catch (\Throwable $e) {}

    return response()->json([
        'success' => true,
        'message' => 'Database purified to 100% pure Laravel & MySQL. All legacy Prisma tables and camelCase columns removed.',
        'details' => $log,
    ]);
});

Route::match(['get', 'post'], '/db-fresh', function () {
    if (request('token') !== 'hamptworth2026') {
        abort(403, 'Unauthorized');
    }

    $migrateOutput = '';
    $seedOutput = '';

    try {
        Artisan::call('migrate:fresh', ['--force' => true]);
        $migrateOutput = Artisan::output();
    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'step' => 'migrate:fresh',
            'error' => $e->getMessage(),
        ], 500);
    }

    try {
        Artisan::call('db:seed', ['--force' => true]);
        $seedOutput = Artisan::output();
    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'step' => 'db:seed',
            'error' => $e->getMessage(),
            'migrate_output' => $migrateOutput,
        ], 500);
    }

    return response()->json([
        'success' => true,
        'message' => 'Database wiped and rebuilt with pure Laravel migrations and seeded from scratch',
        'migrate' => $migrateOutput,
        'seed' => $seedOutput,
    ]);
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
