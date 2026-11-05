<?php

use App\Console\Commands\ProcessNotifications;
use Illuminate\Support\Facades\Artisan;

// Schedule: php artisan schedule:run
// Add to cPanel cron: * * * * * cd /home/USER/server-laravel && php artisan schedule:run >> /dev/null 2>&1

// Commands are registered in bootstrap/app.php via the `withCommands` method
// or in App\Console\Kernel for older Laravel versions.
// For Laravel 11, register in bootstrap/app.php:
//
// ->withCommands([
//     \App\Console\Commands\ProcessNotifications::class,
// ])
