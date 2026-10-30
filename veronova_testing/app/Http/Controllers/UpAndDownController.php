<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class UpAndDownController extends Controller
{
	public function updown()
    {
        $bets = DB::table('bets')->where('game_id',15)->orderBy('created_at', 'desc')->paginate(10);
        return view('7UpDown.7updownhistory', compact('bets'));
    }
	
	 public function updown_result()
    {
        $bets = DB::table('bet_results')->where('game_id', 15)->orderBy('created_at', 'desc')->paginate(10);
        return view('7UpDown.updownresult', compact('bets'));
    }
	
	//7updown update
    public function updown_winner()
    {
        $latestGame = DB::table('bet_results')->orderByDesc('games_no')->where('game_id', 15)->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
    
        return view('7UpDown.7updownadmin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
        ]);
    }
    public function updown_update(Request $request)
    {
        $request->validate([
            'game_type' => 'required|in:2-6,7,8-12,2,3,4,5,6,8,9,10,11,12',
            'games_no'  => 'required|integer',
        ]);
		//dd($request);
        $map = [
            '2-6'   => 1,
            '7'     => 2,
            '8-12'  => 3,
			'2'     => 2,
			'3'     => 3,
			'4'     => 4,
			'5'     => 5,
			'6'     => 6,
			'8'     => 8,
			'9'     => 9,
			'10'     => 10,
			'11'     => 11,
			'12'     => 12
			
        ];
        $number = $map[$request->game_type];
        DB::table('admin_winner_results')->insert([
            'gamesno'   => $request->games_no,
            'gameId'     => 15,
            'number'     => $number,
			'status'  => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    
        return back()->with('success', 'Winner added successfully!');
    }
	
	
}
