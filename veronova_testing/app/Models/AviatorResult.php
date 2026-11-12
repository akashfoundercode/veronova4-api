<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AviatorResult extends Model
{
    use HasFactory;
    
     protected $fillable = [
        'color',
        'game_sr_num',
        'game_id',
        'price',
        'status',
        'created_at',
        'updated_at'
    ];
}
