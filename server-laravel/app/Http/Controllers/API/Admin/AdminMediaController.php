<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\ListMediaRequest;
use App\Http\Requests\Media\UpdateMediaRequest;
use App\Http\Requests\Media\UploadMediaRequest;
use App\Services\MediaService;
use Illuminate\Http\Request;

class AdminMediaController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function index(ListMediaRequest $request)
    {
        $result = $this->mediaService->list($request->validated());

        return response()->json([
            'success' => true,
            'data' => $result['data'],
            'meta' => $result['meta'],
        ]);
    }

    public function store(UploadMediaRequest $request)
    {
        $user = $request->attributes->get('auth_user');

        $files = [];
        if ($request->file('file')) {
            $files[] = $request->file('file');
        }
        foreach ($request->file('files', []) ?: [] as $file) {
            $files[] = $file;
        }

        $results = [];
        foreach ($files as $file) {
            $results[] = $this->mediaService->upload($file, [
                'folder' => $request->input('folder'),
                'alt' => $request->input('alt'),
                'caption' => $request->input('caption'),
            ], $user?->id);
        }

        return response()->json([
            'success' => true,
            'data' => $results,
        ], 201);
    }

    public function folders()
    {
        return response()->json([
            'success' => true,
            'data' => $this->mediaService->folders(),
        ]);
    }

    public function resolve(Request $request)
    {
        $ids = $request->query('ids', '');
        if (is_string($ids)) {
            $ids = array_filter(array_map('trim', explode(',', $ids)));
        }

        return response()->json([
            'success' => true,
            'data' => $this->mediaService->resolve(is_array($ids) ? $ids : []),
        ]);
    }

    public function update(string $id, UpdateMediaRequest $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->mediaService->updateMeta($id, $request->validated()),
        ]);
    }

    public function destroy(string $id)
    {
        $this->mediaService->delete($id);

        return response()->json([
            'success' => true,
            'data' => ['message' => 'Media deleted'],
        ]);
    }
}
