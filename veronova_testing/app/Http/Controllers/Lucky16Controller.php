<?php

namespace App\Http\Controllers;

use App\Models\Lucky16;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Lucky16Controller extends Controller
{
    
//     public function fetch_lucky_16(){
//       $bet_log = DB::table('lucky_16_bet_logs')->get();
//       return response()->json(['status'=>200,'data'=>$bet_log]);
//   }
    
    public function bets(){
        $records = DB::table('lucky16_bets')->paginate(10);
        return view('lucky16.bets', compact('records'));
    }
    
    public function results(){
        $records = DB::table('lucky16_results')->paginate(10);
        return view('lucky16.results', compact('records'));
    }
    
    public function index()
    {
        $game_settings = DB::table('game_settings')->where('id', 1)->first();
        return view('lucky16.index')->with('game_settings', $game_settings);
    }
    
     public function lucky16_update(Request $request)
{
    // Fetch the game number (period_no) from the ab_bet_logs table
    $gamesno = DB::select("SELECT period_no FROM lucky16_betlogs ORDER BY period_no ASC LIMIT 1");
    $game_no = $gamesno[0]->period_no;

   
        // Get the jackpot value from the request
        $jackpot = $request->jackpot;

        // Update the jackpot in the ab_admin_winner_result table for the corresponding period_no
        DB::update("UPDATE lucky16admin_winner_result SET jackpot = ? WHERE period_no = ?", [$jackpot, $game_no]);
        
        // Redirect back to the previous page
        return redirect()->back();
   
}
    
}

