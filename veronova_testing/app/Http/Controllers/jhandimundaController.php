<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class jhandimundaController extends Controller
{
	 //jhandi munda
    public function jm_winner()
    {
        $latestGame = DB::table('bet_results')->orderByDesc('games_no')->where('game_id', 22)->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
    
        return view('jm.jmadmin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
        ]);
    }
    public function jhandi_win(Request $request)
    {
		//dd($request);
        $request->validate([
            'game_type' => 'required|in:Heart,Spades,Diamond,Club,Face,Flag',
            'games_no'  => 'required|integer',
        ]);
        $mapping = [
            'Heart'   => 1,
            'Spades'  => 2,
            'Diamond' => 3,
            'Club'    => 4,
            'Face'    => 5,
            'Flag'    => 6,
        ];
        $number = $mapping[$request->game_type] ?? 7;
        $alreadyExists = DB::table('admin_winner_results')->where('gamesno', $request->games_no)->where('gameId', 22)->exists();
        if ($alreadyExists) {
            return back()->with('error', '⚠️ Result already announced for this game number.');
        }
        DB::table('admin_winner_results')->insert([
            'gamesno'   => $request->games_no,
            'gameId'     => 22,
            'number'     => $number, 
			'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return back()->with('success', '✅ Winner added successfully!');
    }
	
	
	public function jhandimunda()
    {
        $bets = DB::table('bets')->where('game_id', 22)->orderBy('created_at', 'desc')->paginate(10);
        //return view('All_bet_history.jhandimunda', compact('bets'));
		return view('jm.jmhistory', compact('bets'));
    }
	
	
	  public function jhandimunda_result()
    {
        $bets = DB::table('bet_results')->where('game_id', 22)->orderBy('created_at', 'desc')->paginate(10);
       // return view('All_bet_result.jm', compact('bets'));
		  return view('jm.jmresult', compact('bets'));
    }
	
	
	
	
	
}
