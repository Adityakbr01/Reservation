<?php

namespace Tests\Unit\Support;

use App\Support\AppError;
use App\Support\StorageKeys;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class StorageKeysTest extends TestCase
{
    public function test_builds_dated_keys_with_hex_slug_and_mime_extension(): void
    {
        $key = StorageKeys::buildMediaKey(
            'Homepage Banner.PNG',
            'image/png',
            new DateTimeImmutable('2026-10-12T00:00:00Z'),
            ''
        );

        $this->assertMatchesRegularExpression('/^media\/2026\/10\/[0-9a-f]{8}-homepage-banner\.png$/', $key);
    }

    public function test_prepends_configured_prefix(): void
    {
        $key = StorageKeys::buildMediaKey(
            'a.jpg',
            'image/jpeg',
            new DateTimeImmutable('2026-10-12T00:00:00Z'),
            'uploads'
        );

        $this->assertMatchesRegularExpression('/^uploads\/media\/2026\/10\/[0-9a-f]{8}-a\.jpg$/', $key);
    }

    public function test_ignores_client_extension_when_mime_differs(): void
    {
        $key = StorageKeys::buildMediaKey(
            'photo.exe',
            'image/jpeg',
            new DateTimeImmutable('2026-01-05T00:00:00Z'),
            ''
        );

        $this->assertStringEndsWith('.jpg', $key);
        $this->assertStringNotContainsString('.exe', $key);
    }

    public function test_rejects_disallowed_mime_types(): void
    {
        $this->expectException(AppError::class);
        StorageKeys::buildMediaKey('x.svg', 'image/svg+xml', new DateTimeImmutable, '');
    }

    public function test_scopes_avatars_by_user_with_timestamp(): void
    {
        $key = StorageKeys::buildAvatarKey('user_123', 'me.webp', 'image/webp', 1728650000000, '');

        $this->assertMatchesRegularExpression('/^avatars\/user_123-1728650000000-[0-9a-f]{8}-me\.webp$/', $key);
    }

    public function test_sanitizes_hostile_user_ids(): void
    {
        $key = StorageKeys::buildAvatarKey('../../etc', 'a.png', 'image/png', 1, '');

        $this->assertStringNotContainsString('..', $key);
        $this->assertStringStartsWith('avatars/', $key);
    }

    public function test_empty_prefix_yields_no_segments(): void
    {
        $this->assertSame([], StorageKeys::prefixSegments(''));
    }

    public function test_rejects_hostile_or_colliding_prefixes(): void
    {
        foreach (['../x', 'media', 'avatars', 'a//b', '/abs'] as $bad) {
            try {
                StorageKeys::prefixSegments($bad);
                $this->fail("Expected prefix \"{$bad}\" to be rejected");
            } catch (AppError) {
                $this->addToAssertionCount(1);
            }
        }

        $this->assertSame(['uploads'], StorageKeys::prefixSegments('uploads'));
        $this->assertSame(['uploads'], StorageKeys::prefixSegments('uploads/'));
    }

    public function test_accepts_well_formed_keys_with_or_without_prefix(): void
    {
        foreach ([
            'media/2026/10/ab12cd34-photo.jpg',
            'avatars/u-1-a.png',
            'uploads/media/2026/10/ab12cd34-photo.jpg',
            'uploads/avatars/u-1-a.png',
        ] as $key) {
            StorageKeys::assertStorageKey($key);
            $this->addToAssertionCount(1);
        }
    }

    public function test_rejects_traversal_absolute_backslashes_and_kindless_keys(): void
    {
        foreach ([
            '../etc/passwd',
            'media/../../x.jpg',
            '/media/x.jpg',
            'media\\x.jpg',
            'other/x.jpg',
            'media',
            'uploads/media',
            '',
        ] as $bad) {
            try {
                StorageKeys::assertStorageKey($bad);
                $this->fail("Expected key \"{$bad}\" to be rejected");
            } catch (AppError) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_joins_public_asset_url_and_returns_parent_dir(): void
    {
        $this->assertSame(
            'https://hamptworthstays.com/hamptworthStay/uploads/media/2026/10/a.jpg',
            StorageKeys::publicAssetUrl(
                'https://hamptworthstays.com/hamptworthStay/',
                'uploads/media/2026/10/a.jpg'
            )
        );
        $this->assertSame('uploads/media/2026/10', StorageKeys::parentDirOf('uploads/media/2026/10/a.jpg'));
    }
}
