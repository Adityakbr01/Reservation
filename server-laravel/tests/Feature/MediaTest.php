<?php

namespace Tests\Feature;

use App\Models\CmsPage;
use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->admin = User::create([
            'id' => bin2hex(random_bytes(12)),
            'name' => 'Admin User',
            'email' => 'admin-'.bin2hex(random_bytes(4)).'@example.com',
            'password_hash' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $now = now();
        $this->token = JWT::encode([
            'iss' => 'http://localhost',
            'iat' => $now->timestamp,
            'exp' => $now->copy()->addHour()->timestamp,
            'nbf' => $now->timestamp,
            'sub' => $this->admin->id,
            'jti' => bin2hex(random_bytes(16)),
        ], config('jwt.secret'), 'HS256', 'default');
    }

    private function authHeaders(): array
    {
        return ['Authorization' => 'Bearer '.$this->token];
    }

    public function test_admin_uploads_multiple_files_and_returns_array_with_camel_case_fields(): void
    {
        $response = $this->withHeaders($this->authHeaders())->post('/api/v1/admin/media', [
            'files' => [
                UploadedFile::fake()->image('photo.jpg', 40, 30),
                UploadedFile::fake()->image('second.png', 20, 20),
            ],
            'folder' => 'Cottage/Oakwood Cottage',
            'alt' => 'Room view',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.fileName', 'photo.jpg')
            ->assertJsonPath('data.0.folder', 'Cottage/Oakwood Cottage')
            ->assertJsonPath('data.0.alt', 'Room view')
            ->assertJsonPath('data.0.kind', 'image')
            ->assertJsonPath('data.0.storageProvider', 'local');

        $first = $response->json('data.0');
        $this->assertMatchesRegularExpression('/^media\/\d{4}\/\d{2}\/[0-9a-f]{8}-photo\.(jpg|jpeg)$/', $first['storageKey']);
        Storage::disk('public')->assertExists($first['storageKey']);
        $this->assertDatabaseHas('media', ['id' => $first['id'], 'folder' => 'Cottage/Oakwood Cottage']);
    }

    public function test_list_filters_by_folder_subtree_and_search(): void
    {
        $this->upload('one.jpg', 'Cottage');
        $this->upload('two.jpg', 'Cottage/Oakwood Cottage');
        $this->upload('three.jpg', null);

        $all = $this->withHeaders($this->authHeaders())->get('/api/v1/admin/media');
        $all->assertOk()->assertJsonPath('meta.total', 3);

        $subtree = $this->withHeaders($this->authHeaders())->get('/api/v1/admin/media?folder='.urlencode('Cottage/*'));
        $subtree->assertOk()->assertJsonPath('meta.total', 1);

        $root = $this->withHeaders($this->authHeaders())->get('/api/v1/admin/media?folder=__root__');
        $root->assertOk()->assertJsonPath('meta.total', 1);

        $search = $this->withHeaders($this->authHeaders())->get('/api/v1/admin/media?q=two');
        $search->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.fileName', 'two.jpg');

        $folders = $this->withHeaders($this->authHeaders())->get('/api/v1/admin/media/folders');
        $folders->assertOk()->assertJsonPath('data', ['Cottage', 'Cottage/Oakwood Cottage']);
    }

    public function test_patch_updates_alt_caption_and_folder(): void
    {
        $media = $this->upload('photo.jpg', 'Old');

        $response = $this->withHeaders($this->authHeaders())->patchJson(
            '/api/v1/admin/media/'.$media['id'],
            ['alt' => 'Updated alt', 'caption' => 'Caption', 'folder' => 'New Folder']
        );

        $response->assertOk()
            ->assertJsonPath('data.alt', 'Updated alt')
            ->assertJsonPath('data.caption', 'Caption')
            ->assertJsonPath('data.folder', 'New Folder');
    }

    public function test_public_resolve_returns_only_public_fields_and_skips_unknown_ids(): void
    {
        $media = $this->upload('photo.jpg', null);

        $response = $this->postJson('/api/public/media/resolve', [
            'ids' => [$media['id'], 'unknown', str_repeat('a', 24)],
        ]);

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $media['id'])
            ->assertJsonPath('data.0.url', $media['url']);
    }

    public function test_delete_removes_record_and_binary(): void
    {
        $media = $this->upload('photo.jpg', null);

        $this->withHeaders($this->authHeaders())
            ->deleteJson('/api/v1/admin/media/'.$media['id'])
            ->assertOk()
            ->assertJsonPath('data.message', 'Media deleted');

        $this->assertDatabaseMissing('media', ['id' => $media['id']]);
        Storage::disk('public')->assertMissing($media['storageKey']);
    }

    public function test_delete_is_blocked_while_referenced_by_published_content(): void
    {
        $media = $this->upload('photo.jpg', null);

        CmsPage::create([
            'id' => bin2hex(random_bytes(12)),
            'title' => 'Home',
            'slug' => 'home-'.bin2hex(random_bytes(3)),
            'sections' => [],
            'featured_image_media_id' => $media['id'],
            'status' => 'PUBLISHED',
            'created_by' => $this->admin->id,
        ]);

        $this->withHeaders($this->authHeaders())
            ->deleteJson('/api/v1/admin/media/'.$media['id'])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'MEDIA_IN_USE');

        $this->assertDatabaseHas('media', ['id' => $media['id']]);
    }

    public function test_upload_rejects_unsupported_mime_with_api_error_envelope(): void
    {
        $response = $this->withHeaders($this->authHeaders())->post('/api/v1/admin/media', [
            'files' => [UploadedFile::fake()->create('script.exe', 10, 'application/octet-stream')],
        ]);

        $response->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_upload_requires_at_least_one_file(): void
    {
        $this->withHeaders($this->authHeaders())
            ->post('/api/v1/admin/media', ['folder' => 'Cottage'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_list_applies_default_and_coerced_pagination(): void
    {
        $this->upload('one.jpg', null);
        $this->upload('two.jpg', null);
        $this->upload('three.jpg', null);

        $defaults = $this->withHeaders($this->authHeaders())->get('/api/v1/admin/media');
        $defaults->assertOk()
            ->assertJsonPath('meta.page', 1)
            ->assertJsonPath('meta.limit', 10)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.totalPages', 1)
            ->assertJsonCount(3, 'data');

        $paged = $this->withHeaders($this->authHeaders())->get('/api/v1/admin/media?page=2&limit=2');
        $paged->assertOk()
            ->assertJsonPath('meta.page', 2)
            ->assertJsonPath('meta.limit', 2)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.totalPages', 2)
            ->assertJsonCount(1, 'data');
    }

    public function test_list_rejects_invalid_pagination_with_validation_envelope(): void
    {
        $this->withHeaders($this->authHeaders())
            ->get('/api/v1/admin/media?page=0&limit=abc')
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    private function upload(string $name, ?string $folder): array
    {
        $payload = ['files' => [UploadedFile::fake()->image($name, 20, 20)]];
        if ($folder !== null) {
            $payload['folder'] = $folder;
        }

        return $this->withHeaders($this->authHeaders())
            ->post('/api/v1/admin/media', $payload)
            ->assertCreated()
            ->json('data.0');
    }
}
