<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AviatorBet extends Model
{
    use HasFactory;
    
     protected $fillable = [
        'uid',
        'amount',
        'number',
        'game_id',
        'totalamount',
        'color',
        'game_sr_num',
        'commission',
        'status',
        'stop_multiplier',
        'datetime',
        'created_at',
    ];
}
