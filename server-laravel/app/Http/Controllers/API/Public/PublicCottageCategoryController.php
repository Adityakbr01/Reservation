<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\CottageCategory;
use Illuminate\Support\Facades\Schema;

class PublicCottageCategoryController extends Controller
{
    public function index()
    {
        if (!Schema::hasTable('cottage_categories')) {
            return response()->json([
                'success' => true,
                'data' => CottageCategory::defaultCategories(),
            ]);
        }

        $categories = CottageCategory::where('status', 'ACTIVE')
            ->orderBy('sort_order', 'asc')
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
            'data' => $categories->map(function ($cat) {
                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'slug' => $cat->slug,
                    'description' => $cat->description,
                    'allow_multiple' => (bool) $cat->allow_multiple,
                    'allowMultiple' => (bool) $cat->allow_multiple,
                    'sortOrder' => (int) $cat->sort_order,
                ];
            }),
        ]);
    }
}
