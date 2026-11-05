<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class User extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'name', 'email', 'password_hash', 'role', 'is_active',
        'avatar_url', 'avatar_file_id', 'avatar_storage_provider',
        'legacy_avatar_url', 'legacy_avatar_file_id',
        'password_reset_token_hash', 'password_reset_expires',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash', 'password_reset_token_hash',
    ];

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
        return $this->password_hash;
    }
}
