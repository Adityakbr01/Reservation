<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        try {
            $settings = \App\Models\SiteSettings::first();
            if ($settings && ! empty($settings->timezone)) {
                config(['app.timezone' => $settings->timezone]);
                @date_default_timezone_set($settings->timezone);
            }
        } catch (\Throwable) {
            // Keep safe during migrations/fresh installation
        }
    }
}
