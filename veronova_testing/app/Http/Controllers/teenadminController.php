<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class teenadminController extends Controller
{
	 
	 public function teen_bethistory()
    {
        $bets = DB::table('teen_patti_bet')->where('game_id', 18)->orderBy('created_at', 'desc')->paginate(10);
        return view('teenpatti.bethistory', compact('bets'));
    }
	
	public function teen_betresult()
    {
        $bets = DB::table('teen_patti_bet_result')->where('game_id', 18)->orderBy('created_at', 'desc')->paginate(10);
        return view('teenpatti.betresult', compact('bets'));
    }
	 //high low
    public function teen_winner()
    {
        $latestGame = DB::table('teen_patti_bet')->orderByDesc('games_no')->where('game_id', 18)->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
        // $nextGameNo = $latestGame->games_no;
    
        return view('teenpatti.adminwinresult', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
        ]);
    }

    public function teen_winner_old()
    {
        $latestGame = DB::table('teen_patti_bet')->orderByDesc('games_no')->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
    //dd($latestGame);
        $multipliers = DB::table('teen_patti_multiplier')->select('id')->get();
        $bets = DB::table('teen_patti_bet')->where('games_no', $nextGameNo)->get();
    //dd($bets);
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
    
        return view('teenpatti.adminwinresult', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
           // 'multiplierData'=> $multipliers,
           // 'betsAmount'    => $betsAmount
        ]);
    }
	
	public function teenupdate_winner(Request $request)
{
    $request->validate([
        'game_type' => 'required|in:show,see,pack',
        'games_no'  => 'required|integer',
    ]);
//dd($request);
    // Assign number based on game_type
    $number = $request->game_type === 'show' 
        ? 1 
        : ($request->game_type === 'see' ? 2 : 3);

    // Check if result already exists
    $alreadyExists = DB::table('admin_winner_results')
        ->where('gamesno', $request->games_no)
        ->where('gameId', 18)
        ->exists();

    if ($alreadyExists) {
        return back()->with('error', '⚠️ Result already announced for this game number.');
    }

    // Insert new winner result
    DB::table('admin_winner_results')->insert([
        'gamesno'   => $request->games_no,
        'gameId'     => 18,
        'number'     => $number, 
		'status' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return back()->with('success', '✅ Winner added successfully!');
}

	
    public function teenupdate_winnerold(Request $request)
    {
        $request->validate([
            'id' => 'required|array',
            'games_no'   => 'required|integer',
        ]);
    
        DB::table('admin_winner_results')->insert([
            'gamesno'   => $request->games_no,
            'gameId'     => 18,
            'number'     => json_encode($request->selections),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    
        return back()->with('success', 'Winner added successfully!');
    }
	
	
}