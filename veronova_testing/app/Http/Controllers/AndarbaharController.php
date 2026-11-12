<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AndarbaharController extends Controller
{
    public function andarbahar_create(Request $request,$game_id)
	{
	   // dd($game_id);
	
		// $gamesno=$request->gamesno;
      $value = $request->session()->has('id');
	
        if(!empty($value))
        {
			$amounts=DB::select("SELECT bet_logs.*,game_settings.winning_percentage AS parsantage ,game_settings.id AS id FROM `bet_logs` LEFT JOIN game_settings ON bet_logs.game_id=game_settings.id where bet_logs.game_id=$gameid Limit 14");
//dd($amounts);
			 return view('andar_bahar.index')->with('amounts', $amounts)->with('game_id', $game_id);
		}
        else
        {
           return redirect()->route('login');  
        }
	}
	
	 public function fetchDatas($game_id)
    {
        	$amounts=DB::select("SELECT bet_logs.*,game_settings.winning_percentage AS parsantage ,game_settings.id AS id FROM `bet_logs` LEFT JOIN game_settings ON bet_logs.game_id=game_settings.id where bet_logs.game_id=$gameid Limit 14");

        return response()->json(['amounts' => $amounts,'game_id' => $game_id]);
    }
	
	public function andar_bahar_store(Request $request)
	{
		 $datetime = Carbon::now('Asia/Kolkata')->toDateTimeString();
	$value = $request->session()->has('id');
	
        if(!empty($value))
        {
	      $gamesno=$request->games_no;
         $number=$request->number;
		 
		
        DB::insert("INSERT INTO `admin_winner_result`( `games_no`, `number`, `status`, `datetime`) VALUES ('$gamesno','$number','1','$datetime')");
			
         
        
             return redirect()->back(); 
			 }
        else
        {
           return redirect()->route('login');  
        }
	}
  
	
}
