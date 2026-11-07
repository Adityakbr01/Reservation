<?php

namespace App\Models;

/**
 * Cottage domain model (mapped to room_types table for single-unit cottage reservations).
 */
class Cottage extends RoomType
{
    protected $table = 'room_types';
}

