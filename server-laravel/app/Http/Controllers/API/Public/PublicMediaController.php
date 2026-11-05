<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Services\MediaService;
use Illuminate\Http\Request;

class PublicMediaController extends Controller
{
    public function __construct(private readonly MediaService $mediaService)
    {
    }

    public function resolve(Request $request)
    {
        $ids = $request->input('ids', []);
        $ids = is_array($ids)
            ? array_values(array_filter($ids, fn ($id) => is_string($id)))
            : [];

        return response()->json([
            'success' => true,
            'data' => $this->mediaService->resolve($ids),
        ]);
    }
}
