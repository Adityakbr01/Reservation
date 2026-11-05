<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordTest extends TestCase
{
    public function test_hash_round_trips_and_rejects_wrong_passwords(): void
    {
        $hash = Hash::make('correct horse battery staple');

        $this->assertNotSame('correct horse battery staple', $hash);
        $this->assertStringStartsWith('$2y$', $hash);
        $this->assertTrue(Hash::check('correct horse battery staple', $hash));
        $this->assertFalse(Hash::check('wrong password', $hash));
    }

    public function test_salted_hashes_are_unique(): void
    {
        $this->assertNotSame(Hash::make('same-password'), Hash::make('same-password'));
    }
}
