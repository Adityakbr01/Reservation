<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
    $tables = \Illuminate\Support\Facades\DB::select('SHOW FULL TABLES');
    echo "Found " . count($tables) . " objects in DB:\n";
    foreach ($tables as $t) {
        $arr = array_values((array)$t);
        $name = $arr[0];
        $type = $arr[1] ?? 'BASE TABLE';
        echo "- {$name} ({$type})\n";
        if (strtoupper($type) === 'VIEW') {
            \Illuminate\Support\Facades\DB::statement("DROP VIEW IF EXISTS `{$name}`");
        } else {
            \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS `{$name}`");
        }
    }
    \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
    echo "Successfully dropped everything!\n";

    // Now test migration
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    echo "Migrate output:\n" . \Illuminate\Support\Facades\Artisan::output() . "\n";

    // Now test seed
    \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
    echo "Seed output:\n" . \Illuminate\Support\Facades\Artisan::output() . "\n";

} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
}

