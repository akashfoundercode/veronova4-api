<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AviatorAdminResult extends Model
{
    use HasFactory;
    
    protected $fillable = ['game_sr_num', 'game_id', 'number', 'multiplier', 'status', 'created_at'];

}
