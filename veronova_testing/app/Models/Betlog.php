<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Betlog extends Model
{
    use HasFactory;
    
   // FetchData function use Coulorprediction controller
public function gameSetting()
{
    return $this->belongsTo(GameSetting::class, 'game_id');
}

}
