<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DragonAdminController extends Controller
{
    public function dragon_create(Request $request,$game_id)
	{
	    dd($game_id);
	
		// $gamesno=$request->gamesno;
      $value = $request->session()->has('id');
	
        if(!empty($value))
        {
			$amounts=DB::select("SELECT bet_logs.*,game_settings.winning_percentage AS parsantage ,game_settings.id AS id FROM `bet_logs` LEFT JOIN game_settings ON bet_logs.game_id=game_settings.id where bet_logs.game_id=$gameid Limit 10");

			 return view('dragon.index')->with('amounts', $amounts)->with('game_id', $game_id);
		}
        else
        {
           return redirect()->route('login');  
        }
	}
	
	 public function fetchData($game_id)
    {
        	$amounts=DB::select("SELECT bet_logs.*,game_settings.winning_percentage AS parsantage ,game_settings.id AS id FROM `bet_logs` LEFT JOIN game_settings ON bet_logs.game_id=game_settings.id where bet_logs.game_id=$gameid Limit 10");

        return response()->json(['amounts' => $amounts,'game_id' => $game_id]);
    }
	
	public function dragon_store(Request $request)
	{
		 $datetime = Carbon::now('Asia/Kolkata')->toDateTimeString();
	$value = $request->session()->has('id');
	
        if(!empty($value))
        {
	      $gamesno=$request->gamesno;
         $number=$request->number;
		 
		
        DB::insert("INSERT INTO `dragon_admin_result`( `gamesno`, `number`, `status`, `datetime`) VALUES ('$gamesno','$number','1','$datetime')");
			
         
        
             return redirect()->back(); 
			 }
        else
        {
           return redirect()->route('login');  
        }
	}
  
	
}
