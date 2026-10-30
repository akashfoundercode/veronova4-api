<?php

// app/Http/Controllers/JilliGameBetController.php
namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class JilliGameBetController extends Controller
{
    public function index()
    {
        $bets = DB::table('jilli_game_bets')
            ->select('id', 'game_uid', 'game_round', 'member_account', 'currency_code', 'bet_amount', 'win_amount', 'serial_number', 'timestamp', 'code', 'created_at', 'updated_at')
            ->orderByDesc('id')
            ->paginate(20);

        return view('jilli_game_bets.index', compact('bets'));
    }
}
