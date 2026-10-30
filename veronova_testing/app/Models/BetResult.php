<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BetResult extends Model
{
    use HasFactory;
    
    //protected $table = 'bet_results';
     protected $fillable = [
        'number',
        'games_no',
        'game_id',
        'status',
        'json',
        'random_card',
    ];
    
    
   
    
}
