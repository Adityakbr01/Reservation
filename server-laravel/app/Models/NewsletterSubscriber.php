<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterSubscriber extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'email', 'normalized_email', 'name', 'source', 'status',
        'unsubscribe_token',
    ];
}
