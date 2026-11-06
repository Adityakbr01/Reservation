<?php

use App\Http\Controllers\API\Admin\AdminAmenitiesController;
use App\Http\Controllers\API\Admin\AdminAuditLogsController;
use App\Http\Controllers\API\Admin\AdminAvailabilityController;
use App\Http\Controllers\API\Admin\AdminBookingController;
use App\Http\Controllers\API\Admin\AdminCmsBlogPostController;
use App\Http\Controllers\API\Admin\AdminCmsFaqController;
use App\Http\Controllers\API\Admin\AdminCmsOfferController;
use App\Http\Controllers\API\Admin\AdminCmsPageController;
use App\Http\Controllers\API\Admin\AdminCmsPolicyController;
use App\Http\Controllers\API\Admin\AdminCouponController;
use App\Http\Controllers\API\Admin\AdminDashboardController;
use App\Http\Controllers\API\Admin\AdminEmailTemplateController;
use App\Http\Controllers\API\Admin\AdminEnquiriesController;
use App\Http\Controllers\API\Admin\AdminMediaController;
use App\Http\Controllers\API\Admin\AdminNewsletterController;
use App\Http\Controllers\API\Admin\AdminNotificationController;
use App\Http\Controllers\API\Admin\AdminPaymentController;
use App\Http\Controllers\API\Admin\AdminPolicyController;
use App\Http\Controllers\API\Admin\AdminPropertyController;
use App\Http\Controllers\API\Admin\AdminRatePlanController;
use App\Http\Controllers\API\Admin\AdminRefundController;
use App\Http\Controllers\API\Admin\AdminReviewController;
use App\Http\Controllers\API\Admin\AdminRoomController;
use App\Http\Controllers\API\Admin\AdminRoomTypeController;
use App\Http\Controllers\API\Admin\AdminSettingsController;
use App\Http\Controllers\API\Admin\AdminUserController;
use App\Http\Controllers\API\Auth\AuthController;
use App\Http\Controllers\API\Public\PublicAmenitiesController;
use App\Http\Controllers\API\Public\PublicAvailabilityController;
use App\Http\Controllers\API\Public\PublicBookingController;
use App\Http\Controllers\API\Public\PublicCmsController;
use App\Http\Controllers\API\Public\PublicCouponController;
use App\Http\Controllers\API\Public\PublicEnquiriesController;
use App\Http\Controllers\API\Public\PublicMediaController;
use App\Http\Controllers\API\Public\PublicNewsletterController;
use App\Http\Controllers\API\Public\PublicPropertyController;
use App\Http\Controllers\API\Public\PublicReviewController;
use App\Http\Controllers\API\Public\PublicRoomTypeController;
use App\Http\Controllers\API\Public\PublicSettingsController;
use App\Http\Controllers\Webhook\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'service' => 'reservation-api',
            'status' => 'ok',
            'health' => '/health',
            'ready' => '/ready',
        ],
    ]);
});

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'status' => 'ok',
            'uptime_seconds' => floor(microtime(true) - LARAVEL_START),
        ],
    ]);
});

Route::get('/ready', function () {
    $dbConnected = app()->make('db')->connection()->getPdo();
    if (! $dbConnected) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'NOT_READY', 'message' => 'Dependencies are not ready'],
        ], 503);
    }

    return response()->json([
        'success' => true,
        'data' => ['ready' => true],
    ]);
});

// Stripe webhook - raw body for signature verification
Route::post('/v1/webhooks/stripe', [StripeWebhookController::class, 'handle'])
    ->middleware('throttle:60,1');

// Test POST route
Route::post('/test-post', function () {
    return response()->json(['success' => true, 'method' => 'POST']);
});

// Auth routes
Route::prefix('/v1/auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('jwt.auth');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:20,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:20,1');
    Route::get('/me', [AuthController::class, 'me'])->middleware('jwt.auth');
    Route::patch('/me', [AuthController::class, 'updateMe'])->middleware('jwt.auth');
    Route::post('/change-password', [AuthController::class, 'changePassword'])->middleware('jwt.auth');
    Route::post('/set-password', [AuthController::class, 'setPassword'])->middleware('jwt.auth');
});

// Admin users
Route::prefix('/v1/admin/users')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminUserController::class, 'index']);
    Route::get('/{id}', [AdminUserController::class, 'show']);
    Route::patch('/{id}/status', [AdminUserController::class, 'setStatus']);
});

// Public property (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/property', '/v1/public/property'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/', [PublicPropertyController::class, 'show']);
    });
}

// Admin property
Route::prefix('/v1/admin/properties')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminPropertyController::class, 'show']);
    Route::patch('/', [AdminPropertyController::class, 'update']);
});
Route::prefix('/v1/admin/property')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminPropertyController::class, 'show']);
    Route::patch('/', [AdminPropertyController::class, 'update']);
});

// Public room types (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/room-types', '/v1/public/room-types'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/', [PublicRoomTypeController::class, 'index']);
        Route::get('/{slug}', [PublicRoomTypeController::class, 'showBySlug']);
        Route::get('/{id}/offers', [PublicRoomTypeController::class, 'offers']);
    });
}

// Admin room types
Route::prefix('/v1/admin/room-types')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminRoomTypeController::class, 'index']);
    Route::post('/', [AdminRoomTypeController::class, 'store']);
    Route::get('/{id}', [AdminRoomTypeController::class, 'show']);
    Route::patch('/{id}', [AdminRoomTypeController::class, 'update']);
});

// Admin rooms
Route::prefix('/v1/admin/rooms')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminRoomController::class, 'index']);
    Route::get('/occupancy', [AdminRoomController::class, 'occupancy']);
    Route::post('/', [AdminRoomController::class, 'store']);
    Route::get('/{id}', [AdminRoomController::class, 'show']);
    Route::patch('/{id}', [AdminRoomController::class, 'update']);
});

// Admin rate plans
Route::prefix('/v1/admin/rate-plans')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminRatePlanController::class, 'index']);
    Route::post('/', [AdminRatePlanController::class, 'store']);
    Route::get('/{id}', [AdminRatePlanController::class, 'show']);
    Route::patch('/{id}', [AdminRatePlanController::class, 'update']);
    Route::get('/{id}/prices', [AdminRatePlanController::class, 'prices']);
    Route::put('/{id}/prices', [AdminRatePlanController::class, 'upsertPrices']);
    Route::delete('/{id}/prices/{date}', [AdminRatePlanController::class, 'deletePrice']);
});

// Public availability (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/availability', '/v1/public/availability'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::post('/search', [PublicAvailabilityController::class, 'search']);
        Route::get('/calendar', [PublicAvailabilityController::class, 'calendar']);
    });
}

// Admin availability
Route::prefix('/v1/admin/availability')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminAvailabilityController::class, 'index']);
    Route::post('/blocks', [AdminAvailabilityController::class, 'createBlock']);
    Route::delete('/blocks/{id}', [AdminAvailabilityController::class, 'deleteBlock']);
});

// Public coupons (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/coupons', '/v1/public/coupons'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::post('/validate', [PublicCouponController::class, 'validate']);
    });
}

// Admin coupons
Route::prefix('/v1/admin/coupons')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminCouponController::class, 'index']);
    Route::post('/', [AdminCouponController::class, 'store']);
    Route::get('/{id}', [AdminCouponController::class, 'show']);
    Route::patch('/{id}', [AdminCouponController::class, 'update']);
});

// Bookings
Route::prefix('/v1/bookings')->middleware('jwt.auth')->group(function () {
    Route::post('/quote', [PublicBookingController::class, 'quote']);
    Route::post('/', [PublicBookingController::class, 'store']);
    Route::get('/{id}/receipt', [PublicBookingController::class, 'receipt']);
    Route::get('/{id}', [PublicBookingController::class, 'show']);
    Route::post('/{id}/cancel', [PublicBookingController::class, 'cancel']);
});

// My bookings
Route::prefix('/me/bookings')->middleware('jwt.auth')->group(function () {
    Route::get('/', [PublicBookingController::class, 'myIndex']);
    Route::get('/{id}', [PublicBookingController::class, 'myShow']);
});

// Admin bookings
Route::prefix('/v1/admin/reservations')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminBookingController::class, 'index']);
    Route::get('/{id}', [AdminBookingController::class, 'show']);
    Route::get('/{id}/cancel-preview', [AdminBookingController::class, 'cancelPreview']);
    Route::post('/{id}/cancel', [AdminBookingController::class, 'cancel']);
    Route::post('/{id}/refund', [AdminBookingController::class, 'refund']);
    Route::post('/{id}/check-in', [AdminBookingController::class, 'checkIn']);
    Route::post('/{id}/check-out', [AdminBookingController::class, 'checkOut']);
    Route::post('/{id}/reassign', [AdminBookingController::class, 'reassign']);
});

// Payments
Route::prefix('/v1/payments')->middleware('jwt.auth')->group(function () {
    Route::post('/create-intent', [PublicBookingController::class, 'createIntent']);
    Route::get('/{id}', [PublicBookingController::class, 'paymentShow']);
});

// Admin payments
Route::prefix('/v1/admin/payments')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminPaymentController::class, 'index']);
    Route::get('/{id}', [AdminPaymentController::class, 'show']);
});

// Admin refunds
Route::prefix('/v1/admin/refunds')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminRefundController::class, 'index']);
});

// Admin notifications
Route::prefix('/v1/admin/notifications')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminNotificationController::class, 'index']);
    Route::post('/{id}/retry', [AdminNotificationController::class, 'retry']);
});

// Admin email templates
Route::prefix('/v1/admin/email-templates')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminEmailTemplateController::class, 'index']);
    Route::get('/{key}', [AdminEmailTemplateController::class, 'show']);
    Route::put('/{key}', [AdminEmailTemplateController::class, 'update']);
    Route::post('/{key}/preview', [AdminEmailTemplateController::class, 'preview']);
    Route::post('/{key}/draft-preview', [AdminEmailTemplateController::class, 'draftPreview']);
    Route::post('/{key}/test', [AdminEmailTemplateController::class, 'test']);
});

// Admin dashboard
Route::prefix('/v1/admin/dashboard')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/summary', [AdminDashboardController::class, 'summary']);
    Route::get('/sales', [AdminDashboardController::class, 'sales']);
});

// Admin CMS
Route::prefix('/v1/admin/cms')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::post('/pages', [AdminCmsPageController::class, 'store']);
    Route::get('/pages', [AdminCmsPageController::class, 'index']);
    Route::get('/pages/{id}', [AdminCmsPageController::class, 'show']);
    Route::patch('/pages/{id}', [AdminCmsPageController::class, 'update']);
    Route::post('/pages/{id}/status', [AdminCmsPageController::class, 'status']);
    Route::post('/pages/{id}/preview', [AdminCmsPageController::class, 'preview']);

    Route::post('/blogs', [AdminCmsBlogPostController::class, 'store']);
    Route::get('/blogs', [AdminCmsBlogPostController::class, 'index']);
    Route::get('/blogs/{id}', [AdminCmsBlogPostController::class, 'show']);
    Route::patch('/blogs/{id}', [AdminCmsBlogPostController::class, 'update']);
    Route::post('/blogs/{id}/status', [AdminCmsBlogPostController::class, 'status']);
    Route::post('/blogs/{id}/preview', [AdminCmsBlogPostController::class, 'preview']);

    Route::post('/faqs', [AdminCmsFaqController::class, 'store']);
    Route::get('/faqs', [AdminCmsFaqController::class, 'index']);
    Route::patch('/faqs/{id}', [AdminCmsFaqController::class, 'update']);
    Route::post('/faqs/{id}/status', [AdminCmsFaqController::class, 'status']);
    Route::delete('/faqs/{id}', [AdminCmsFaqController::class, 'destroy']);

    Route::post('/offers', [AdminCmsOfferController::class, 'store']);
    Route::get('/offers', [AdminCmsOfferController::class, 'index']);
    Route::get('/offers/{id}', [AdminCmsOfferController::class, 'show']);
    Route::patch('/offers/{id}', [AdminCmsOfferController::class, 'update']);
    Route::post('/offers/{id}/status', [AdminCmsOfferController::class, 'status']);

    Route::put('/policies', [AdminCmsPolicyController::class, 'upsert']);
    Route::get('/policies', [AdminCmsPolicyController::class, 'index']);
    Route::post('/policies/{key}/status', [AdminCmsPolicyController::class, 'status']);
});

// Public CMS (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/cms', '/v1/public/cms'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/site-settings', [PublicSettingsController::class, 'show']);
        Route::get('/pages/{slug}', [PublicCmsController::class, 'page']);
        Route::get('/blogs', [PublicCmsController::class, 'blogs']);
        Route::get('/blogs/{slug}', [PublicCmsController::class, 'blog']);
        Route::get('/faqs', [PublicCmsController::class, 'faqs']);
        Route::get('/offers', [PublicCmsController::class, 'offers']);
        Route::get('/policies/{key}', [PublicCmsController::class, 'policy']);
        Route::get('/preview/{token}', [PublicCmsController::class, 'preview']);
    });
}

// Admin media
Route::prefix('/v1/admin/media')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::post('/', [AdminMediaController::class, 'store']);
    Route::get('/', [AdminMediaController::class, 'index']);
    Route::get('/folders', [AdminMediaController::class, 'folders']);
    Route::get('/resolve', [AdminMediaController::class, 'resolve']);
    Route::patch('/{id}', [AdminMediaController::class, 'update']);
    Route::delete('/{id}', [AdminMediaController::class, 'destroy']);
});

// Public media (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/media', '/v1/public/media'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::post('/resolve', [PublicMediaController::class, 'resolve']);
    });
}

// Admin settings
Route::prefix('/v1/admin/settings')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminSettingsController::class, 'show']);
    Route::patch('/', [AdminSettingsController::class, 'update']);
});

// Public settings (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/cms/site-settings', '/v1/public/cms/site-settings'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/', [PublicSettingsController::class, 'show']);
    });
}

// Admin audit logs
Route::prefix('/v1/admin/audit-logs')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminAuditLogsController::class, 'index']);
});

// Admin policies
Route::prefix('/v1/admin/policies')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminPolicyController::class, 'index']);
    Route::post('/', [AdminPolicyController::class, 'store']);
    Route::get('/{id}', [AdminPolicyController::class, 'show']);
    Route::patch('/{id}', [AdminPolicyController::class, 'update']);
});

// Admin amenities
Route::prefix('/v1/admin/amenities')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminAmenitiesController::class, 'index']);
});

// Public amenities (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/amenities', '/v1/public/amenities'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/', [PublicAmenitiesController::class, 'index']);
    });
}

// Admin enquiries
Route::prefix('/v1/admin/enquiries')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminEnquiriesController::class, 'index']);
});

// Public enquiries (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/enquiries', '/v1/public/enquiries'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/', [PublicEnquiriesController::class, 'index']);
        Route::post('/', [PublicEnquiriesController::class, 'store']);
    });
}

// Admin newsletter
Route::prefix('/v1/admin/newsletter')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminNewsletterController::class, 'index']);
});

// Public newsletter (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/newsletter', '/v1/public/newsletter'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/', [PublicNewsletterController::class, 'index']);
        Route::post('/subscribe', [PublicNewsletterController::class, 'subscribe']);
    });
}

// Admin reviews
Route::prefix('/v1/admin/reviews')->middleware('jwt.auth', 'role:admin')->group(function () {
    Route::get('/', [AdminReviewController::class, 'index']);
});

// Public reviews (available at both /api/public/* and /api/v1/public/*)
foreach (['/public/reviews', '/v1/public/reviews'] as $prefix) {
    Route::prefix($prefix)->group(function () {
        Route::get('/', [PublicReviewController::class, 'index']);
    });
}

// Reviews
Route::prefix('/v1/reviews')->group(function () {
    Route::get('/', [PublicReviewController::class, 'index']);
});

// Sitemap and robots
Route::get('/sitemap.xml', [PublicCmsController::class, 'sitemap']);
Route::get('/robots.txt', [PublicCmsController::class, 'robots']);
