<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class jackpotController extends Controller
{
	
	 public function jackpot()
    {
        $bets = DB::table('bets')->where('game_id', 25)->orderBy('created_at', 'desc')->paginate(10);
    
        return view('jackpot.jackpotbet', compact('bets'));
    }
	
	 public function jackpot_result()
    {
        $bets = DB::table('bet_results')->where('game_id', 25)->orderBy('created_at', 'desc')->paginate(10);
    
        return view('jackpot.jackpotresult', compact('bets'));
    }
	
	
	//jackpot winner
    public function jckpt_winner()
    {
        $latestGame = DB::table('bet_results')->orderByDesc('games_no')->where('game_id', 25)->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
        return view('jackpot.jackpotadmin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
        ]);
		//dd($nextGameNo);
    }
    public function jack_update(Request $request)
    {
		//dd($request);
        $request->validate([
            'game_type' => 'required|in:SET,PURE SEQ,SEQ,COLOR,PAIR,HIGH CARD',
            'gamesno'  => 'required|integer',
        ]);
		//dd($request);
        $number = $request->game_type === 'SET' ? 1
                : ($request->game_type === 'PURE SEQ' ? 2
                : ($request->game_type === 'SEQ' ? 3
                : ($request->game_type === 'COLOR' ? 4
                : ($request->game_type === 'PAIR' ? 5
                : 6))));
            $alreadyExists = DB::table('admin_winner_results')->where('gamesno', $request->gamesno)->where('gameId', 25)->exists();
        if ($alreadyExists) {
            return back()->with('error', '⚠️ Result already announced for this game number.');
        }
		//dd($number);
        DB::table('admin_winner_results')->insert([
            'gamesno'   => $request->games_no,
            'gameId'     => 25,
            'number'     => $number,
			'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return back()->with('success', '✅ Winner added successfully!');
    }
}