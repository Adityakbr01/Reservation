<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * @mixin Model
 * @method static void creating(\Closure|callable|string|array $callback)
 *
 * @property string $keyType
 * @property bool $incrementing
 * @property array $fillable
 */
trait HasHexId
{
    public static function bootHasHexId(): void
    {
        static::creating(function ($model) {
            $key = $model->getKeyName();
            if (empty($model->{$key})) {
                $model->{$key} = bin2hex(random_bytes(12));
            }
        });
    }

    public function initializeHasHexId(): void
    {
        $this->keyType = 'string';
        $this->incrementing = false;

        $key = $this->getKeyName();
        if (! in_array($key, $this->fillable)) {
            $this->fillable[] = $key;
        }
    }

    public function getIncrementing()
    {
        return false;
    }

    public function getKeyType()
    {
        return 'string';
    }
}


