<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminWinnerResult extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'gamesno',
        'gameId',
        'number',
        'status',
    ];

    public $timestamps = false; // If your table doesn’t have created_at and updated_at columns

    
}
