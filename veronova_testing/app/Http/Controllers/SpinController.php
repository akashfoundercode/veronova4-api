<?php

namespace App\Http\Controllers;

use App\Models\{Spin,Jackpot,JackpotMultiplier};
use Illuminate\Http\Request;

use Illuminate\Support\Facades\DB; // ✅ Sahi import


class SpinController extends Controller
{
    
    public function adminresults(){
        $records = DB::table('spin_admin_results')->paginate(10);
        return view('spin.adminresults', compact('records'));
    }
    
    public function bets(){
        $records = DB::table('spin_bets')->paginate(10);
        return view('spin.bets', compact('records'));
    }
    
    
    public function results(){
        $records = DB::table('spin_results')->paginate(10);
        return view('spin.results', compact('records'));
    }
    
     public function indexold()
    {
        // $jackpot_multiplier= DB::select("SELECT `multiplier` FROM `jackpot_multipliers`");
        
      $jackpot_multiplier = JackpotMultiplier::all();
      //dd($jackpot_multiplier);
         $jackpot = Jackpot::find(1);
         //dd($jackpot);
        $game_settings = DB::table('spingame_settings')->where('id', 1)->first();
        //dd($game_settings);
        return view('spin.index')->with('game_settings', $game_settings)->with('jackpot', $jackpot)->with('jackpot_multiplier', $jackpot_multiplier);
    }
	

public function index()
{
    // Direct DB facade use karte hue jackpot_multipliers table se data fetch
    $jackpot_multiplier = DB::table('jackpot_multipliers')->get();

    // Jackpot table se id = 1 wala record fetch
    $jackpot = DB::table('jackpots')->where('id', 1)->first();

    // spingame_settings table se id = 1 wala record fetch
    $game_settings = DB::table('spingame_settings')->where('id', 1)->first();

    // View ko data pass karna
    return view('spin.index', [
        'game_settings' => $game_settings,
        'jackpot' => $jackpot,
        'jackpot_multiplier' => $jackpot_multiplier
    ]);
}

    
     public function spin_update(Request $request)
{
    // Fetch the game number (period_no) from the ab_bet_logs table
    $gamesno = DB::select("SELECT period_no FROM spin_betlogs ORDER BY period_no ASC LIMIT 1");
    $game_no = $gamesno[0]->period_no;

   
        // Get the jackpot value from the request
        $jackpot = $request->jackpot;

        // Update the jackpot in the ab_admin_winner_result table for the corresponding period_no
        DB::update("UPDATE spin_admin_results SET jackpot = ? WHERE period_no = ?", [$jackpot, $game_no]);
        
        // Redirect back to the previous page
        return redirect()->back();
   
}

    
}

