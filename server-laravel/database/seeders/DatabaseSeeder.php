<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'id' => '6ac0cc40a287cfd3dfbbf8a8',
                'name' => 'Administrator',
                'password_hash' => Hash::make('admin@gmail.com'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );
    }
}
