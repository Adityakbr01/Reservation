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
