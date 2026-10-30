<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DiceController extends Controller
{
	
	 public function Dice()
    {
        $bets = DB::table('bets')->where('game_id', 20)->orderBy('created_at', 'desc')->paginate(10);
        return view('dice.dicehistory', compact('bets'));
    }
	
	public function Dice_result()
    {
        $bets = DB::table('bet_results')->where('game_id', 20)->orderBy('created_at', 'desc')->paginate(10);
        return view('dice.diceresult', compact('bets'));
    }
	
	// red black
    public function Dice_winner()
    {
        $latestGame = DB::table('bet_results')->orderByDesc('games_no')->where('game_id', 20)->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
    
        return view('dice.diceadmin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
        ]);
    }
    public function Dice_win(Request $request)
    {
        $request->validate([
            'game_type' => 'required|in:One,Two,Three,Four,Five,Six',
            'games_no'  => 'required|integer',
        ]);
        $number = $request->game_type === 'One' ? 1
                : ($request->game_type === 'Two' ? 2
                : ($request->game_type === 'Three' ? 3
                : ($request->game_type === 'Four' ? 4
                : ($request->game_type === 'Five' ? 5
                : ($request->game_type === 'Six' ? 6
                : 7)))));
        DB::table('admin_winner_results')->insert([
            'gamesno'   => $request->games_no,
            'gameId'     => 20,
            'number'     => $number,
			'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return back()->with('success', 'Winner added successfully!');
    }
	
	public function Dice_nextGameNo()
{
    $latestGame = DB::table('bet_results')->orderByDesc('games_no')->where('game_id', 20)->first();
    $nextGameNo = ($latestGame->games_no ?? 0) + 1;

    return response()->json(['nextGameNo' => $nextGameNo]);
}

	
	
	
	
	
	
}
