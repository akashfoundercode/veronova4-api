<?php

namespace App\Http\Controllers;

use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DragonAdminController extends Controller
{
    public function dragon_create(Request $request, $game_id = 10)
    {
        $value = $request->session()->has('id');
        if (!empty($value)) {
            $amounts = DB::select("SELECT betlogs.*, game_settings.winning_percentage AS parsantage, game_settings.id AS id FROM `betlogs` LEFT JOIN game_settings ON betlogs.game_id=game_settings.id WHERE betlogs.game_id = ? ORDER BY betlogs.id DESC LIMIT 10", [$game_id]);
            if (empty($amounts)) {
                $amounts = DB::select("SELECT * FROM `betlogs` WHERE game_id = ? ORDER BY id DESC LIMIT 10", [$game_id]);
            }
            $gamesno = !empty($amounts) && isset($amounts[0]->gamesno) ? $amounts[0]->gamesno : (isset($amounts[0]->games_no) ? $amounts[0]->games_no : null);
            $active_forced = null;
            if ($gamesno) {
                $forced = DB::table('admin_winner_results')
                    ->where('gamesno', $gamesno)
                    ->where('gameId', $game_id)
                    ->where('status', '1')
                    ->orderByDesc('id')
                    ->first();
                if ($forced && isset($forced->number)) {
                    $active_forced = $forced->number;
                }
            }

            return view('dragon.index')->with('amounts', $amounts)->with('game_id', $game_id)->with('active_forced', $active_forced);
        } else {
            return redirect()->route('login');  
        }
    }
    
    public function fetchData($game_id = 10)
    {
        $amounts = DB::select("SELECT betlogs.*, game_settings.winning_percentage AS parsantage, game_settings.id AS id FROM `betlogs` LEFT JOIN game_settings ON betlogs.game_id=game_settings.id WHERE betlogs.game_id = ? ORDER BY betlogs.id DESC LIMIT 10", [$game_id]);
        if (empty($amounts)) {
            $amounts = DB::select("SELECT * FROM `betlogs` WHERE game_id = ? ORDER BY id DESC LIMIT 10", [$game_id]);
        }
        $gamesno = !empty($amounts) && isset($amounts[0]->gamesno) ? $amounts[0]->gamesno : (isset($amounts[0]->games_no) ? $amounts[0]->games_no : null);
        $active_forced = null;
        if ($gamesno) {
            $forced = DB::table('admin_winner_results')
                ->where('gamesno', $gamesno)
                ->where('gameId', $game_id)
                ->where('status', '1')
                ->orderByDesc('id')
                ->first();
            if ($forced && isset($forced->number)) {
                $active_forced = $forced->number;
            }
        }

        return response()->json(['amounts' => $amounts, 'game_id' => $game_id, 'active_forced' => $active_forced]);
    }
    
    public function dragon_store(Request $request)
    {
        $datetime = Carbon::now('Asia/Kolkata')->toDateTimeString();
        $value = $request->session()->has('id');
        if (!empty($value)) {
            $gamesno = $request->gamesno;
            $number = $request->number;
            $game_id = $request->game_id ?? 10;
         
            DB::statement("INSERT INTO `admin_winner_results` (`gamesno`, `gameId`, `number`, `status`) VALUES (?, ?, ?, '1') ON DUPLICATE KEY UPDATE number = VALUES(number), status = '1'", [$gamesno, $game_id, $number]);
            try {
                DB::insert("INSERT INTO `dragon_admin_result` (`gamesno`, `number`, `status`, `datetime`) VALUES (?, ?, '1', ?)", [$gamesno, $number, $datetime]);
            } catch (\Exception $e) {}
            
            return redirect()->back()->with('success', "Result configured successfully for period $gamesno"); 
        } else {
            return redirect()->route('login');  
        }
    }
}
