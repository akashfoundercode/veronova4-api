<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class RedBlackController extends Controller
{
	
	 public function redBlack()
    {
        $bets = DB::table('bets')->where('game_id', 16)->orderBy('created_at', 'desc')->paginate(10);
        return view('RedBlack.rbhistory', compact('bets'));
    }
	
	public function redBlack_result()
    {
        $bets = DB::table('bet_results')->where('game_id', 16)->orderBy('created_at', 'desc')->paginate(10);
        return view('RedBlack.rbresult', compact('bets'));
    }
	
	// red black
    public function rb_winner()
    {
        $latestGame = DB::table('bet_results')->orderByDesc('games_no')->where('game_id', 16)->first();
        $nextGameNo = ($latestGame->games_no ?? 0) + 1;
    
        return view('RedBlack.rbadmin', [
            'latestGame'    => $latestGame,
            'nextGameNo'    => $nextGameNo,
        ]);
    }
   public function redblack_win(Request $request)
{
    // Step 1: Validate Request
    $data = $request->validate([
        'game_type' => 'required|in:Heart,Club,Spade,Diamond,Red,Black',
        'games_no'  => 'required|integer',
    ]);
//dd($data);
    // Step 2: Mapping game_type to number
    $mapping = [
        'Heart'   => 1,
        'Club'    => 2,
        'Spade'   => 3,
        'Diamond' => 4,
        'Black'   => 5,
        'Red'     => 6,
    ];

    // Step 3: Get mapped number
    $number = $mapping[$request->game_type] ?? 0;
	   //dd($number);

    // Step 4: Insert into database
    DB::table('admin_winner_results')->insert([
        'gamesno'    => $request->games_no,
        'gameId'     => 16,
        'number'     => $number,
        'status'     => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Step 5: Redirect with success message
    return back()->with('success', 'Winner added successfully!');
}

	
	
}
