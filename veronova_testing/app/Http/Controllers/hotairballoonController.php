<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class hotairballoonController extends Controller
{
	
	public function hotair_prediction_create(string $game_id)
{
    $perPage = 10;

    $results = DB::table('balloon_result')
        ->where('game_id', $game_id)
        ->orderByDesc('id')
        ->select('id', 'game_sr_num') 
        ->first();

    $setting = DB::table('balloon_setting')
        ->where('game_id', $game_id)
        ->select('win_per') 
        ->first();

    $baloon_res = DB::table('balloon_result')
        ->where('game_id', $game_id)
        ->orderByDesc('id')
        ->paginate($perPage);

    return view('hotair.hotairadmin', [
        'results' => $results,
        'game_id' => $game_id,
        'baloon_res' => $baloon_res,
        'win_per' => $setting ? $setting->win_per : 0 // fallback if null
    ]);
}


	
	public function hotair_store(Request $request)
	{
		  	date_default_timezone_set('Asia/Kolkata');
           $datetime = date('Y-m-d H:i:s');
		
      $game_id =$request->game_id;
		 $game_sr_num =$request->game_sr_num;
		 $number=$request->number;
       $multiplier =$request->multiplier;
      //dd($game_id);
		
		DB::table('balloon_admin_result')->insert([
		'game_sr_num'=>$game_sr_num,
        'game_id'=>$game_id,
			//'game_id'=>23,
			'number'=>$multiplier,
			'multiplier'=>$multiplier,
			'status'=>1,
			//'datetime'=>$datetime
			'created_at' =>now(),
			'updated_at'=> now(),
		]);
		
             return redirect()->back(); 
		//return view('hotair.hotairadmin');

	}
  
   public function hotair_update(Request $request)
      {
	   //dd($request);
	     	date_default_timezone_set('Asia/Kolkata');
           $datetime = date('Y-m-d H:i:s');
	   
	   $game_id=$request->game_id;
        $percentage = $request->winning_percentage;
	    
         //$data= DB::select("UPDATE `game_setting` SET `percentage` = '$percentage','datetime'='$datetime' WHERE `id` ='$gamid'");
	  $data =  DB::table('game_settings')->where('id',$game_id)->update(['winning_percentage'=>$percentage]);
         if($data){
        return redirect()->back()->with('message', "Percentage updated Successfully...!");
		 }else{
			 return 'Can not update';
		 }
      }
   
	
      
	
	  public function hotair_bet_history(string $game_id)
    {
		  $perPage = 10;

			$bets = DB::table('balloon_bet')
				->select('balloon_bet.id as id','balloon_bet.game_sr_num as game_sr_num','balloon_bet.amount as amount', 'balloon_bet.win as win','balloon_bet.created_at as datetime','users.u_id as username', 'users.mobile as mobile')
				->where('balloon_bet.game_id', $game_id)
				->join('users', 'balloon_bet.uid', '=', 'users.id')
				->orderByDesc('balloon_bet.id')
				->paginate($perPage);
		  
	    return view('hotair.hotairadmin')->with('bets', $bets); 
	  }
	
	public function hotairballoon()
    {
        $bets = DB::table('balloon_bet')->where('game_id', 23)->orderBy('created_at', 'desc')->paginate(10);
        return view('hotair.hotairballoon', compact('bets'));
    }
	
	public function hotairballoon_result()
    {
        $bets = DB::table('balloon_result')->where('game_id', 23)->orderBy('datetime', 'desc')->paginate(10);
        return view('hotair.hotairballoonresult', compact('bets'));
    }
}