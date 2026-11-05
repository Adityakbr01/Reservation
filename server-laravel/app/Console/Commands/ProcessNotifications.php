<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NotificationService;

class ProcessNotifications extends Command
{
    protected $signature = 'notifications:process';
    protected $description = 'Process pending notifications';

    public function handle(): void
    {
        app(NotificationService::class)->processPending();
        $this->info('Notifications processed.');
    }
}
