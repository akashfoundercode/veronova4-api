<?php

namespace App\Http\Controllers;

use App\Models\{Spin,Jackpot,JackpotMultiplier};
use Illuminate\Http\Request;

use Illuminate\Support\Facades\DB; // ✅ Sahi import


class FunTargetController extends Controller
{
    
    public function fun_adminresults(){
        $records = DB::table('fun_admin_result')->paginate(10);
        return view('funtarget.adminresults', compact('records'));
    }
    
    public function fun_bets(){
        $records = DB::table('fun_bets')->paginate(10);
        return view('funtarget.bets', compact('records'));
    }
    
    
    public function fun_results(){
        $records = DB::table('fun_results')->paginate(10);
        return view('funtarget.results', compact('records'));
    }
	

public function fun_index()
{
    // Direct DB facade use karte hue jackpot_multipliers table se data fetch
    $jackpot_multiplier = DB::table('jackpot_multipliers')->get();
	
	//$period_no = DB::table('fun_bet_logs')->get();
	$period_no = DB::table('fun_bet_logs')->orderBy('id', 'desc')->value('games_no');


    // Jackpot table se id = 1 wala record fetch
    $jackpot = DB::table('jackpots')->where('id', 1)->first();

    // spingame_settings table se id = 1 wala record fetch
    $game_settings = DB::table('fun_game_settings')->where('id', 1)->first();

    // View ko data pass karna
    return view('funtarget.index', [
        'fun_game_settings' => $game_settings,
        'jackpot' => $jackpot,
        'jackpot_multiplier' => $jackpot_multiplier,
		'period_no' => $period_no
    ]);
}

    
     public function fun_update(Request $request)
{
    // Fetch the game number (period_no) from the ab_bet_logs table
    $gamesno = DB::select("SELECT games_no FROM fun_bet_logs ORDER BY games_no ASC LIMIT 1");
    $game_no = $gamesno[0]->games_no;

   //dd($gamesno);
        // Get the jackpot value from the request
        $jackpot = $request->jackpot;

        // Update the jackpot in the ab_admin_winner_result table for the corresponding period_no
        DB::update("UPDATE fun_admin_result SET jackpot = ? WHERE games_no = ?", [$jackpot, $game_no]);
        
        // Redirect back to the previous page
        return redirect()->back();
   
}

    
}

