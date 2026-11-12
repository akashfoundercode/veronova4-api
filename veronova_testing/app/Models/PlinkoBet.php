<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlinkoBet extends Model
{
    use HasFactory;


    protected $fillable = [
        'amount',
        'game_id',
        'type',
        'userid',
        'status',
        'datetime',
        'tax',
        'after_tax',
        'orderid',
    ];

    
}
