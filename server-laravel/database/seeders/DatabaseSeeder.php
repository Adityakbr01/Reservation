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

        Property::firstOrCreate(
            ['slug' => 'hamptworth-stays'],
            [
                'id' => '6ac0cc41a287cfd3dfbbf8a9',
                'name' => 'Hamptworth Stays',
                'description' => 'Luxury countryside retreat on the edge of New Forest',
                'currency' => 'GBP',
                'timezone' => 'Europe/London',
                'check_in_time' => '15:00',
                'check_out_time' => '10:00',
                'status' => 'active',
            ]
        );
    }
}
