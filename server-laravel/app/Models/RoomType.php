<?php

namespace App\Models;

/**
 * Backward compatibility alias model pointing to cottages table.
 */
class RoomType extends Cottage
{
    protected $table = 'cottages';
}
