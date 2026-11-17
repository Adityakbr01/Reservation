<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CottageCategory extends Model
{
    protected $table = 'cottage_categories';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'allow_multiple',
        'sort_order',
        'status',
    ];

    protected $casts = [
        'allow_multiple' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->slug) && !empty($model->name)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }

    public function cottages(): HasMany
    {
        return $this->hasMany(Cottage::class, 'category_id');
    }

    /**
     * Fallback default categories when database table is not yet migrated or empty.
     */
    public static function defaultCategories(): array
    {
        return [
            [
                'id' => 'cat_farm_cottages',
                'name' => 'Farm Cottages',
                'slug' => 'farm-cottages',
                'description' => 'Charming holiday cottages at Home Farm. Group bookings welcome (multiple cottages can be selected).',
                'allow_multiple' => true,
                'allowMultiple' => true,
                'sort_order' => 1,
                'status' => 'ACTIVE',
            ],
            [
                'id' => 'cat_estate_collection',
                'name' => 'The Estate Collection',
                'slug' => 'the-estate-collection',
                'description' => 'Exclusive estate properties and private retreats. Individual bookings only (single cottage selection).',
                'allow_multiple' => false,
                'allowMultiple' => false,
                'sort_order' => 2,
                'status' => 'ACTIVE',
            ],
        ];
    }
}
