<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WithdrawHistory extends Model
{
    use HasFactory;
    
     public function account(): BelongsTo
    {
        // return $this->hasOne(AccountDetail::class);
        return $this->belongsTo(AccountDetail::class, 'account_id');
    }
    
     public function user(): BelongsTo
    {
        // return $this->hasOne(AccountDetail::class);
        return $this->belongsTo(User::class, 'user_id');
    }
}
