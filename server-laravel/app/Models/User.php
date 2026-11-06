<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'name', 'email', 'password_hash', 'passwordHash', 'role', 'is_active', 'isActive',
        'avatar_url', 'avatar_file_id', 'avatar_storage_provider',
        'legacy_avatar_url', 'legacy_avatar_file_id',
        'password_reset_token_hash', 'password_reset_expires',
        'last_login_at', 'lastLoginAt',
        'created_at', 'updated_at', 'createdAt', 'updatedAt',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $now = now();
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'createdAt') && empty($model->createdAt)) {
                $model->createdAt = $now;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'updatedAt') && empty($model->updatedAt)) {
                $model->updatedAt = $now;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'created_at') && empty($model->created_at)) {
                $model->created_at = $now;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'updated_at') && empty($model->updated_at)) {
                $model->updated_at = $now;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'password_hash') && ! empty($model->passwordHash) && empty($model->password_hash)) {
                $model->password_hash = $model->passwordHash;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'passwordHash') && ! empty($model->password_hash) && empty($model->passwordHash)) {
                $model->passwordHash = $model->password_hash;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'is_active') && ! isset($model->is_active)) {
                $model->is_active = $model->isActive ?? 1;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'isActive') && ! isset($model->isActive)) {
                $model->isActive = $model->is_active ?? 1;
            }
        });

        static::updating(function ($model) {
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'updatedAt')) {
                $model->updatedAt = now();
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'updated_at')) {
                $model->updated_at = now();
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'password_hash') && ! empty($model->passwordHash)) {
                $model->password_hash = $model->passwordHash;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), 'passwordHash') && ! empty($model->password_hash)) {
                $model->passwordHash = $model->password_hash;
            }
        });
    }

    protected $hidden = [
        'password_hash', 'passwordHash', 'password_reset_token_hash',
    ];

    public function getPasswordHashAttribute()
    {
        return $this->attributes['password_hash'] ?? $this->attributes['passwordHash'] ?? null;
    }

    public function getIsActiveAttribute()
    {
        return (bool) ($this->attributes['is_active'] ?? $this->attributes['isActive'] ?? true);
    }

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'user_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'user_id');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class, 'requested_by');
    }

    public function createdBlocks(): HasMany
    {
        return $this->hasMany(AvailabilityBlock::class, 'created_by');
    }

    public function createdCoupons(): HasMany
    {
        return $this->hasMany(Coupon::class, 'created_by');
    }

    public function createdMedia(): HasMany
    {
        return $this->hasMany(Media::class, 'created_by');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'user_id');
    }

    public function emailTemplates(): HasMany
    {
        return $this->hasMany(EmailTemplate::class, 'updated_by');
    }

    public function createdPages(): HasMany
    {
        return $this->hasMany(CmsPage::class, 'created_by');
    }

    public function createdBlogPosts(): HasMany
    {
        return $this->hasMany(CmsBlogPost::class, 'created_by');
    }

    public function createdFaqs(): HasMany
    {
        return $this->hasMany(CmsFaq::class, 'created_by');
    }

    public function createdOffers(): HasMany
    {
        return $this->hasMany(CmsOffer::class, 'created_by');
    }

    public function createdPolicyDocs(): HasMany
    {
        return $this->hasMany(CmsPolicyDoc::class, 'created_by');
    }

    public function getAuthPassword(): string
    {
        return (string) ($this->password_hash ?? $this->passwordHash ?? '');
    }
}
