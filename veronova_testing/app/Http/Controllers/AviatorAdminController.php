<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
class AviatorAdminController extends Controller
{
    
        // Store crash data directly in database
    public function storeCrash(Request $request)
    {
        try {
            $validated = $request->validate([
                'round_id' => 'required|string',
                'crash_point' => 'required|numeric|min:1.01',
            ]);

            // Check if already exists
            $exists = DB::table('aviator_crashes')
                ->where('round_id', $validated['round_id'])
                ->exists();
            
            if (!$exists) {
                // Insert directly without model
                DB::table('aviator_crashes')->insert([
                    'round_id' => $validated['round_id'],
                    'crash_point' => $validated['crash_point'],
                    'crashed_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Get last 20 history records
            $history = DB::table('aviator_crashes')
                ->orderBy('id', 'desc')
                ->limit(20)
                ->get();
            
            return response()->json([
                'success' => true,
                'message' => 'Crash recorded successfully',
                'history' => $history
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to record crash: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get crash history
    public function getCrashHistory()
    {
        $history = DB::table('aviator_crashes')
            ->orderBy('id', 'desc')
            ->limit(20)
            ->get();
        
        return response()->json($history);
    }
    
    // Get live data (your existing method)
    // public function getLiveData(Request $request)
    // {
    //     // Your existing live data logic here
    //     // This is just an example - replace with your actual logic
    //     return response()->json([
    //         'totalBet' => rand(1000, 50000),
    //         'totalCashout' => rand(500, 25000),
    //         'totalPlayer' => rand(5, 50)
    //     ]);
    // }
      
      /*
    |--------------------------------------------------------------------------
    | LIVE DATA
    |--------------------------------------------------------------------------
    */

    public function getLiveData(Request $request)
    {

        $period = $request->period;

        /*
        |--------------------------------------------------------------------------
        | TOTAL BET
        |--------------------------------------------------------------------------
        */

        $totalBet =
            DB::table('aviator_bet')
            ->where('game_sr_num', $period)
            ->sum('amount');

        /*
        |--------------------------------------------------------------------------
        | TOTAL CASHOUT
        |--------------------------------------------------------------------------
        */

        $totalCashout =
            DB::table('aviator_bet')
            ->where('game_sr_num', $period)
            ->where('status', 1)
            ->sum('win');

        /*
        |--------------------------------------------------------------------------
        | TOTAL PLAYER
        |--------------------------------------------------------------------------
        */

        $totalPlayer =
    DB::table('aviator_bet')
    ->where('game_sr_num', $period)
    ->distinct('uid')
    ->count('uid');
        
        // $totalPlayer =
        //     DB::table('aviator_bet')
        //     ->where('game_sr_num', $period)
        //     ->count();

        return response()->json([

            'totalBet'      => $totalBet ?? 0,

            'totalCashout'  => $totalCashout ?? 0,

            'totalPlayer'   => $totalPlayer ?? 0

        ]);

    }

    /*
    |--------------------------------------------------------------------------
    | DROP NOW
    |--------------------------------------------------------------------------
    */

    public function dropNow(Request $request)
    {

        DB::table('aviator_admin_results')->insert([

            'type' => 'drop',

            'created_at' => now(),

            'updated_at' => now()

        ]);

        return response()->json([

            'status' => true,

            'message' => 'Crash Triggered'

        ]);

    }

      
      public function index()
    {
        return view('aviator.aviator_ui');
    }

    public function totalBet()
    {

        /*
        current round ka total bet
        */

        $totalBet = DB::table('aviator_bets')
                    ->where('status', 0)
                    ->sum('amount');

        return response()->json([
            'totalBet' => number_format($totalBet, 2)
        ]);
    }

    // public function dropNow(Request $request)
    // {

    //     /*
    //     yaha aap admin crash logic lagao
    //     */

    //     DB::table('aviator_admin_control')->insert([
    //         'type' => 'instant_crash',
    //         'created_at' => now(),
    //         'updated_at' => now(),
    //     ]);

    //     return response()->json([
    //         'status' => 200,
    //         'message' => 'Plane crashed successfully'
    //     ]);
    // }
      

//   public function aviator_prediction_create(string $game_id)
//     {
	    
// 	    $perPage = 10;
	   
// 		$results = DB::table('aviator_result')
// 			->join('game_settings', 'aviator_result.game_id', '=', 'game_settings.id')
// 			->where('aviator_result.game_id', $game_id)
// 			->orderByDesc('aviator_result.id')
// 			->first();

//         $aviator_res = DB::table('aviator_result')->where('game_id',5)->orderByDesc('id')->paginate($perPage);

	   
//         return view('aviator.result')->with('results', $results)->with('game_id', $game_id)->with('aviator_res',$aviator_res);
//     }
	
	public function aviator_prediction_create(string $game_id)
{
    
    // In your main controller
$settings = DB::table('aviator_game_settings')->first();
$aviatorui = $settings->game_type ?? 'simple'; // 'simple' or 'advance'
//dd($aviatorui);
    //$aviatorui=0;
    $perPage = 10;
    $today = \Carbon\Carbon::today();
if($aviatorui == "advance")
{
    // 🔹 Latest Aviator Result for Given Game
    $latestResult = DB::table('aviator_result')
        ->join('game_settings', 'aviator_result.game_id', '=', 'game_settings.id')
        ->where('aviator_result.game_id', $game_id)
        ->orderByDesc('aviator_result.id')
        ->first();


    $period_no = $latestResult->game_sr_num ?? 0;
//dd($period_no);
    // 🔹 Total unique users playing in current period
    $total_users_playing = DB::table('aviator_bet')
        ->where('game_sr_num', $period_no)
        ->distinct('uid')
        ->count('uid');

    // 🔹 Profit Summary

    // Total profit (all time)
    $total = DB::table('aviator_bet')
        ->selectRaw('SUM(amount) as total_amount, SUM(win) as total_win_amount')
        ->first();

    $total_admin_profit = ($total->total_amount ?? 0) - ($total->total_win_amount ?? 0);
    $total_user_profit = $total->total_win_amount ?? 0;

    // Today's profit
    $todayData = DB::table('aviator_bet')
        ->whereDate('created_at', $today)
        ->selectRaw('SUM(amount) as today_amount, SUM(win) as today_win_amount')
        ->first();

    $today_admin_profit = ($todayData->today_amount ?? 0) - ($todayData->today_win_amount ?? 0);
    $today_user_profit = $todayData->today_win_amount ?? 0;

    // 🔹 Future Predictions - REMOVED aviator_result JOIN
    $futurePredictions = DB::table('aviator_admin_result')
        ->select(
            'id',
            'game_sr_num',
            'number as predicted_number',
            'datetime'
        )
        ->orderByDesc('id')
        ->paginate($perPage);

    // 🔹 User Bets
    $userBets = DB::table('aviator_bet')
        ->orderByDesc('id')
        ->paginate($perPage);

    // 🔹 Aviator Results for Game ID = 5 (Hardcoded, if intentional)
    $aviator_res = DB::table('aviator_result')
        ->where('game_id', 5)
        ->orderByDesc('id')
        ->paginate($perPage);

    // 🔹 Return View with current period for status comparison
    return view('aviator.result', [
        'results' => $latestResult,
        'game_id' => $game_id,
        'aviator_res' => $aviator_res,
        'total_users_playing' => $total_users_playing,
        'total_admin_profit' => $total_admin_profit,
        'total_user_profit' => $total_user_profit,
        'today_admin_profit' => $today_admin_profit,
        'today_user_profit' => $today_user_profit,
        'futurePredictions' => $futurePredictions,
        'userBets' => $userBets,
        'currentPeriod' => $period_no,
    ]);
}
else{
     // 🔹 Latest Aviator Result for Given Game
    $latestResult = DB::table('aviator_result')
        ->join('game_settings', 'aviator_result.game_id', '=', 'game_settings.id')
        ->where('aviator_result.game_id', $game_id)
        ->orderByDesc('aviator_result.id')
        ->first();
        

    $period_no = $latestResult->game_sr_num ?? 0;
//dd($period_no);
    // 🔹 Total unique users playing in current period
    $total_users_playing = DB::table('aviator_bet')
        ->where('game_sr_num', $period_no)
        ->distinct('uid')
        ->count('uid');

    // 🔹 Profit Summary

    // Total profit (all time)
    $total = DB::table('aviator_bet')
        ->selectRaw('SUM(amount) as total_amount, SUM(win) as total_win_amount')
        ->first();

    $total_admin_profit = ($total->total_amount ?? 0) - ($total->total_win_amount ?? 0);
    $total_user_profit = $total->total_win_amount ?? 0;

    // Today's profit
    $todayData = DB::table('aviator_bet')
        ->whereDate('created_at', $today)
        ->selectRaw('SUM(amount) as today_amount, SUM(win) as today_win_amount')
        ->first();

    $today_admin_profit = ($todayData->today_amount ?? 0) - ($todayData->today_win_amount ?? 0);
    $today_user_profit = $todayData->today_win_amount ?? 0;

    // 🔹 Future Predictions - REMOVED aviator_result JOIN
    $futurePredictions = DB::table('aviator_admin_result')
        ->select(
            'id',
            'game_sr_num',
            'number as predicted_number',
            'datetime'
        )
        ->orderByDesc('id')
        ->paginate($perPage);

    // 🔹 User Bets
    $userBets = DB::table('aviator_bet')
        ->orderByDesc('id')
        ->paginate($perPage);

    // 🔹 Aviator Results for Game ID = 5 (Hardcoded, if intentional)
    $aviator_res = DB::table('aviator_result')
        ->where('game_id', 5)
        ->orderByDesc('id')
        ->paginate($perPage);

    // 🔹 Return View with current period for status comparison
    return view('aviator.aviator_ui', [
        'results' => $latestResult,
        'game_id' => $game_id,
        'aviator_res' => $aviator_res,
        'total_users_playing' => $total_users_playing,
        'total_admin_profit' => $total_admin_profit,
        'total_user_profit' => $total_user_profit,
        'today_admin_profit' => $today_admin_profit,
        'today_user_profit' => $today_user_profit,
        'futurePredictions' => $futurePredictions,
        'userBets' => $userBets,
        'currentPeriod' => $period_no,
    ]);
}
}
	
 

    public function aviator_fetchDatacolor($game_id)
    {
		
        $bets = DB::select("SELECT bet_logs.*,game_settings.winning_percentage AS percentage ,game_settings.id AS id FROM `bet_logs` LEFT JOIN game_settings ON bet_logs.game_id=game_settings.id where bet_logs.game_id=$game_id Limit 10");

        return response()->json(['bets' => $bets, 'game_id' => $game_id]);
    }
	
public function aviator_store(Request $request)
{
    date_default_timezone_set('Asia/Kolkata');
    $datetime = date('Y-m-d H:i:s');

    $game_id     = $request->game_id;
    $game_sr_num = $request->game_sr_num;
    $multiplier  = $request->multiplier;

    // 1️⃣ Get current running period from aviator_result
    $currentPeriod = DB::table('aviator_result')->max('game_sr_num');

    if ($currentPeriod === null) {
        $currentPeriod = 0;
    }

    // 2️⃣ Block CURRENT period — show error
    if ($game_sr_num == $currentPeriod) {
        return redirect()->back()->with(
            'error',
            "❌ Result for Period {$game_sr_num} cannot be announced because it is the CURRENT running period. Please enter a future period number (greater than {$currentPeriod})."
        );
    }

    // 3️⃣ Block OLDER periods — show error
    if ($game_sr_num < $currentPeriod) {
        return redirect()->back()->with(
            'error',
            "❌ Result for Period {$game_sr_num} cannot be announced because it is an OLD period. The current running period is {$currentPeriod}. Please enter a future period number (greater than {$currentPeriod})."
        );
    }

    // 4️⃣ Extra safety: same period already has result in aviator_result
    $alreadyExists = DB::table('aviator_result')
        ->where('game_sr_num', $game_sr_num)
        ->exists();

    if ($alreadyExists) {
        return redirect()->back()->with(
            'error',
            "❌ Result for Period {$game_sr_num} is already announced."
        );
    }

    // 5️⃣ Prevent duplicate insert in admin result table
    $alreadyInAdmin = DB::table('aviator_admin_result')
        ->where('game_sr_num', $game_sr_num)
        ->exists();

    if ($alreadyInAdmin) {
        return redirect()->back()->with(
            'error',
            "❌ Result for Period {$game_sr_num} is already announced in admin results."
        );
    }

    // 6️⃣ Insert the result (only future period reaches here)
    DB::table('aviator_admin_result')->insert([
        'game_sr_num' => $game_sr_num,
        'game_id'     => $game_id,
        'number'      => $multiplier,
        'multiplier'  => $multiplier,
        'status'      => 1,
        'datetime'    => $datetime
    ]);

    return redirect()->back()->with('success', '✅ Result announced successfully.');
}
	
	public function aviator_store_15_09_2026(Request $request)
	{
		
		  	date_default_timezone_set('Asia/Kolkata');
           $datetime = date('Y-m-d H:i:s');
		
	  
      $game_id =$request->game_id;
		 $game_sr_num =$request->game_sr_num;
		 $number=$request->number;
       $multiplier =$request->multiplier;
    //   dd($multiplier);
		
		DB::table('aviator_admin_result')->insert([
		'game_sr_num'=>$game_sr_num,
        'game_id'=>$game_id,
			'number'=>$multiplier,
			'multiplier'=>$multiplier,
			'status'=>1,
			'datetime'=>$datetime
		]);
		
             return redirect()->back(); 
	}
  
   public function aviator_update(Request $request)
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
   
      
	
	  public function aviator_bet_history(string $game_id)
    {
		  $perPage = 10;

			$bets = DB::table('aviator_bet')
				->select('aviator_bet.id as id','aviator_bet.game_sr_num as game_sr_num','aviator_bet.amount as amount', 'aviator_bet.win as win','aviator_bet.created_at as datetime','users.u_id as username', 'users.mobile as mobile')
				->where('aviator_bet.game_id', $game_id)
				->join('users', 'aviator_bet.uid', '=', 'users.id')
				->orderByDesc('aviator_bet.id')
				->paginate($perPage);
		  
	    return view('aviator.bet')->with('bets', $bets); 
	  }
	
	

}


