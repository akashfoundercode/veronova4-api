<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class highlowController extends Controller
{
	 //high low
    public function hilo_winner()
    {
        $latestGame = DB::table('bet_results')->orderByDesc('games_no')->where('game_id', 24)->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
        // $nextGameNo = $latestGame->games_no;
    
        return view('hilo.hiloadmin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
        ]);
    }
    public function update_winner(Request $request)
    {
        $request->validate([
        'game_type' => 'required|in:High,Low',
        'games_no'  => 'required|integer',
        ]);
        $number = $request->game_type === 'High' ? 1 : 2;
        $alreadyExists = DB::table('admin_winner_results')->where('gamesno', $request->games_no)->where('gameId', 24)->exists();
        if ($alreadyExists) {
            return back()->with('error', '⚠️ Result already announced for this game number.');
        }
        DB::table('admin_winner_results')->insert([
            'gamesno'   => $request->games_no,
            'gameId'     => 24,
            'number'     => $number, 
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return back()->with('success', '✅ Winner added successfully!');

    }
	//bet history
	public function hilo()
    {
        $bets = DB::table('high_low_bets')->where('game_id', 24)->orderBy('created_at', 'desc')->paginate(10);
        return view('hilo.hilobet', compact('bets'));
    }
	
	  public function hilo_result()
    {
        $bets = DB::table('bet_results')->where('game_id', 24)->orderBy('created_at', 'desc')->paginate(10);
        return view('hilo.hiloresult', compact('bets'));
    }
	
}