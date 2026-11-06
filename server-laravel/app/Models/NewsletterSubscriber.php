<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Models\Concerns\HasHexId;

class NewsletterSubscriber extends Model
{
    use HasHexId;
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'email', 'normalized_email', 'name', 'source', 'status',
        'unsubscribe_token',
    ];
}
