<?php

namespace App\Console\Commands;

use App\Services\NotificationService;
use Illuminate\Console\Command;

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
