<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VirtualGame extends Model
{
    use HasFactory;
    
     protected $fillable = ['name', 'number', 'actual_number', 'game_id', 'multiplier'];
     
}
