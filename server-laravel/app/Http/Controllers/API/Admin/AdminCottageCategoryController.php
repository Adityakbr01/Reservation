<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cottage;
use App\Models\CottageCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminCottageCategoryController extends Controller
{
    public function index()
    {
        if (!Schema::hasTable('cottage_categories')) {
            return response()->json([
                'success' => true,
                'data' => CottageCategory::defaultCategories(),
            ]);
        }

        $categories = CottageCategory::orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        if ($categories->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => CottageCategory::defaultCategories(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $categories->map(fn ($cat) => $this->formatCategory($cat)),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'slug' => 'nullable|string|max:191',
            'description' => 'nullable|string',
            'allow_multiple' => 'nullable',
            'allowMultiple' => 'nullable',
            'sort_order' => 'nullable|integer',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $name = trim($validated['name']);
        $slug = !empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($name);

        $allowMultiple = true;
        if ($request->has('allow_multiple')) {
            $allowMultiple = filter_var($request->input('allow_multiple'), FILTER_VALIDATE_BOOLEAN);
        } elseif ($request->has('allowMultiple')) {
            $allowMultiple = filter_var($request->input('allowMultiple'), FILTER_VALIDATE_BOOLEAN);
        }

        if (Schema::hasTable('cottage_categories')) {
            // Ensure unique slug
            $originalSlug = $slug;
            $counter = 1;
            while (CottageCategory::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter++;
            }

            $category = CottageCategory::create([
                'id' => 'cat_' . Str::slug($name, '_') . '_' . substr(bin2hex(random_bytes(4)), 0, 6),
                'name' => $name,
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'allow_multiple' => $allowMultiple,
                'sort_order' => (int) ($validated['sort_order'] ?? 0),
                'status' => $validated['status'] ?? 'ACTIVE',
            ]);

            return response()->json([
                'success' => true,
                'data' => $this->formatCategory($category),
            ], 201);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'cat_' . Str::slug($name, '_'),
                'name' => $name,
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'allow_multiple' => $allowMultiple,
                'allowMultiple' => $allowMultiple,
                'sort_order' => 0,
                'status' => 'ACTIVE',
            ],
        ], 201);
    }

    public function update(string $id, Request $request)
    {
        if (!Schema::hasTable('cottage_categories')) {
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $id,
                    'name' => $request->input('name', 'Category'),
                    'slug' => Str::slug($request->input('name', 'Category')),
                    'allowMultiple' => filter_var($request->input('allow_multiple') ?? $request->input('allowMultiple', true), FILTER_VALIDATE_BOOLEAN),
                ],
            ]);
        }

        $category = CottageCategory::find($id);
        if (!$category) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Category not found'],
            ], 404);
        }

        $payload = [];
        if ($request->has('name')) {
            $payload['name'] = trim((string) $request->input('name'));
        }
        if ($request->has('slug')) {
            $slug = trim((string) $request->input('slug'));
            $payload['slug'] = Str::slug($slug);
        }
        if ($request->has('description')) {
            $payload['description'] = $request->input('description');
        }
        if ($request->has('allow_multiple') || $request->has('allowMultiple')) {
            $payload['allow_multiple'] = filter_var($request->input('allow_multiple') ?? $request->input('allowMultiple'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('sort_order')) {
            $payload['sort_order'] = (int) $request->input('sort_order');
        }
        if ($request->has('status')) {
            $payload['status'] = $request->input('status');
        }

        $category->update($payload);

        return response()->json([
            'success' => true,
            'data' => $this->formatCategory($category),
        ]);
    }

    public function destroy(string $id)
    {
        if (Schema::hasTable('cottage_categories')) {
            $category = CottageCategory::find($id);
            if ($category) {
                // Reassign any linked cottages to default category if exists
                if (Schema::hasColumn('cottages', 'category_id')) {
                    Cottage::where('category_id', $id)->update(['category_id' => 'cat_farm_cottages']);
                }
                $category->delete();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Category deleted',
        ]);
    }

    private function formatCategory($cat): array
    {
        return [
            'id' => $cat->id,
            'name' => $cat->name,
            'slug' => $cat->slug,
            'description' => $cat->description,
            'allow_multiple' => (bool) $cat->allow_multiple,
            'allowMultiple' => (bool) $cat->allow_multiple,
            'sort_order' => (int) $cat->sort_order,
            'sortOrder' => (int) $cat->sort_order,
            'status' => $cat->status ?? 'ACTIVE',
        ];
    }
}
