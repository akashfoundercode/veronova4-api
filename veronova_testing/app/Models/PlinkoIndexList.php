<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlinkoIndexList extends Model
{
    use HasFactory;
    
     protected $table = 'plinko_index_lists';
    protected $fillable = ['type']; 
    
 
    
}