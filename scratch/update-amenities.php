<?php
require __DIR__ . '/../server-laravel/vendor/autoload.php';
$app = require_once __DIR__ . '/../server-laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    foreach (\App\Models\Amenity::all() as $a) {
        echo "{$a->id} | {$a->name} | {$a->slug}\n";
        if (stripos($a->name, 'infant') !== false || stripos($a->slug, 'infant') !== false) {
            $a->update(['name' => 'Cot / high chair', 'slug' => 'cot-high-chair']);
            echo " -> Updated to Cot / high chair\n";
        }
        if (stripos($a->name, 'dog') !== false) {
            $a->update(['name' => 'Pet Friendly', 'slug' => 'pet-friendly']);
            echo " -> Updated to Pet Friendly\n";
        }
        if (stripos($a->name, 'baby') !== false) {
            $a->update(['name' => 'Infant friendly', 'slug' => 'infant-friendly']);
            echo " -> Updated to Infant friendly\n";
        }
    }
} catch (\Throwable $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}
