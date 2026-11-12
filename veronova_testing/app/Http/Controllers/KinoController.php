<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class KinoController extends Controller
{
	 public function kino()
    {
        $bets = DB::table('keno_bet')->where('game_id', 17)->orderBy('created_at', 'desc')->paginate(10);
        return view('kino.kinobet', compact('bets'));
    }
	
	public function kino_result()
    {
        $bets = DB::table('keno_bet_result')->where('game_id', 17)->orderBy('created_at', 'desc')->paginate(10);
        return view('kino.kinoresult', compact('bets'));
    }
	
	//kino
    public function kino_winner()
    {
        $latestGame = DB::table('keno_bet_result')->orderByDesc('games_no')->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
    
        $multipliers = DB::table('keno_multipliers')->select('selections', 'id')->get();
        $bets = DB::table('bets')->where('games_no', $nextGameNo)->get();
    
        $betsAmount = $multipliers->mapWithKeys(function ($multiplier) use ($bets) {
            $total = 0;
            foreach ($bets as $bet) {
                $betItems = json_decode($bet->bets, true);
                if (is_array($betItems)) {
                    foreach ($betItems as $item) {
                        if (($item['number'] ?? null) == $multiplier->id) {
                            $total += $item['amount'];
                        }
                    }
                }
            }
            return [$multiplier->id => $total];
        });
    
        return view('kino.kinoadmin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
            'multiplierData'=> $multipliers,
            'betsAmount'    => $betsAmount
        ]);
    }
    public function update_winner(Request $request)
    {
		
        $request->validate([
            'selections' => 'required|array',
            'games_no'   => 'required|integer',
        ]);
    //dd($request);
        DB::table('admin_winner_results')->insert([
            'gamesno'   => $request->games_no,
            'gameId'     => 17,
            'number'     => json_encode($request->selections),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    
        return back()->with('success', 'Winner added successfully!');
    }
	
}