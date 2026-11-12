<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class miniroulleteadminController extends Controller
{
	 
	 public function MiniRoulete_bethistory()
    {
        $bets = DB::table('mini_roulette_bets')->where('game_id', 26)->orderBy('created_at', 'desc')->paginate(10);
        return view('miniroullete.bethistory', compact('bets'));
    }
	
	public function MiniRoulete_betresult()
    {
        $bets = DB::table('mini_roulette_result')->where('game_id', 26)->orderBy('created_at', 'desc')->paginate(10);
        return view('miniroullete.betresult', compact('bets'));
    }
	
    public function mini_winneradmin()
    {
        $latestGame = DB::table('betlogs')->orderByDesc('games_no')->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
    
        $multipliers = DB::table('mini_roulette_multiplier')->select('id')->get();
        $bets = DB::table('mini_roulette_bets')->where('games_no', $nextGameNo)->get();
    
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
    
        return view('miniroullete.adminwin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
            'multiplierData'=> $multipliers,
            'betsAmount'    => $betsAmount
        ]);
    }
   public function miniroulleteupdate_winner(Request $request)
{
    // Validate only the existing fields
    $request->validate([
        'games_no'   => 'required|integer',
        'selections' => 'required|array',
    ]);

    // For debugging purpose (remove later)
    // dd($request->all());

    // Insert winner result
    DB::table('admin_winner_results')->insert([
        'gamesno'    => $request->games_no,
        'gameId'     => 26,
        //'number'     => json_encode($request->selections),
		 'number'     => $request->selections[0],
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return back()->with('success', 'Winner added successfully!');
}
	
}