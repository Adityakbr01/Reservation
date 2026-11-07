<?php
require __DIR__ . '/server-laravel/vendor/autoload.php';
$app = require_once __DIR__ . '/server-laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Test quote calculation
$req = Illuminate\Http\Request::create('/api/v1/bookings/quote', 'POST', [
    'roomTypeId' => 'foxglove-cottage',
    'checkIn' => '2026-11-07',
    'checkOut' => '2026-11-10',
    'quantity' => 1,
]);
$ctrl = app(App\Http\Controllers\API\Public\PublicBookingController::class);
$res = $ctrl->quote($req);
echo "QUOTE STATUS: " . $res->getStatusCode() . "\n";
echo "QUOTE BODY: " . $res->getContent() . "\n";

