<?php

namespace Database\Seeders;

use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Guarantee Admin user exists
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

        // 2. Guarantee Default Property exists (required by foreign key constraints)
        Property::updateOrCreate(
            ['id' => '6ac0cc41a287cfd3dfbbf8a9'],
            [
                'name' => 'Hamptworth Stays',
                'slug' => 'hamptworth-stays',
                'description' => 'Luxury holiday cottages in Hamptworth, Hampshire',
                'check_in_time' => '14:00',
                'check_out_time' => '12:00',
                'timezone' => 'Europe/London',
                'currency' => 'GBP',
                'status' => 'ACTIVE',
            ]
        );
    }
}
