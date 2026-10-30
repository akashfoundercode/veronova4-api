<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;
use Illuminate\Support\Facades\Storage;
use DB;

class ColourPredictionController extends Controller
{
public function colour_prediction_create($gameid)
{
    // 🔹 Get bets for the current game ID
    $bets = DB::table('betlogs')
        ->select('betlogs.*', 'game_settings.winning_percentage AS parsantage', 'game_settings.id AS id')
        ->leftJoin('game_settings', 'betlogs.game_id', '=', 'game_settings.id')
        ->where('betlogs.game_id', $gameid)
        ->orderByDesc('betlogs.id')
        ->limit(10)
        ->get();

    // 🔹 Get latest period number
    $current_game_no = optional($bets->first())->games_no;
    
    // Profit Summary Logic
    $today = \Carbon\Carbon::today();
    $total = DB::table('bets')
        ->selectRaw('SUM(amount) as total_amount, SUM(win_amount) as total_win_amount')
        ->first();

    $total_admin_profit = $total->total_amount - $total->total_win_amount;
    $total_user_profit = $total->total_win_amount;

    $todayData = DB::table('bets')
        ->whereDate('created_at', $today)
        ->selectRaw('SUM(amount) as today_amount, SUM(win_amount) as today_win_amount')
        ->first();

    $today_admin_profit = $todayData->today_amount - $todayData->today_win_amount;
    $today_user_profit = $todayData->today_win_amount;

    $period_no = DB::table('betlogs')
               ->where('game_id', $gameid)
               ->orderBy('id', 'desc')
               ->value('games_no');

    $total_users_playing = DB::table('bets')
        ->where('games_no', $period_no)
        ->distinct('userid')
        ->count('userid');

    // Future Predictions - Simple query without JOIN
    $futurePredictions = DB::table('admin_winner_results')
        ->select('id', 'gamesno', 'number as predicted_number', 'created_at', 'updated_at')
        ->orderByDesc('id')
        ->paginate(10);
    
    $userBets = DB::table('bets')
        ->orderBy('id', 'desc')
        ->paginate(10);
    
    $gameSettings = DB::table('game_settings')->find($gameid);
    
    $gameModes = DB::table('game_settings')
        ->whereIn('name', ['Wingo 30 Second', 'Wingo 1 Minute', 'Wingo 3 Minute', 'Wingo 5 Minute'])
        ->orderByRaw("FIELD(name, 'Wingo 30 Second', 'Wingo 1 Minute', 'Wingo 3 Minute', 'Wingo 5 Minute')")
        ->get();

    return view('colour_prediction.index', compact(
        'bets', 'gameid', 'total_admin_profit', 'total_user_profit',
        'today_admin_profit', 'today_user_profit', 'futurePredictions',
        'userBets', 'total_users_playing', 'gameSettings', 'gameModes'
    ));
}
	
public function colour_prediction_create_08_05_2026($gameid)
{
    // 🔹 Get bets for the current game ID
    $bets = DB::table('betlogs')
        ->select('betlogs.*', 'game_settings.winning_percentage AS parsantage', 'game_settings.id AS id')
        ->leftJoin('game_settings', 'betlogs.game_id', '=', 'game_settings.id')
        ->where('betlogs.game_id', $gameid)
        ->orderByDesc('betlogs.id')
        ->limit(10)
        ->get();

    // 🔹 Get latest period number
    $current_game_no = optional($bets->first())->games_no;
    
     // 🔽🔽🔽 Start: Profit Summary Logic 🔽🔽🔽
    $today = \Carbon\Carbon::today();
     // Total profit (all time)
    $total = DB::table('bets')
        ->selectRaw('SUM(amount) as total_amount, SUM(win_amount) as total_win_amount')
        ->first();

    $total_admin_profit = $total->total_amount - $total->total_win_amount;
    $total_user_profit = $total->total_win_amount;  // Just sum of win_amount

    // Today's profit
    $todayData = DB::table('bets')
        ->whereDate('created_at', $today)
        ->selectRaw('SUM(amount) as today_amount, SUM(win_amount) as today_win_amount')
        ->first();

    $today_admin_profit = $todayData->today_amount - $todayData->today_win_amount;
    $today_user_profit = $todayData->today_win_amount;  // Just sum of today's win_amount

  // 🔹 Get latest period number
    $period_no = DB::table('betlogs')
               ->where('game_id', 13)
               ->orderBy('id', 'desc')
               ->value('games_no');


 // ✅ Total Users Playing in current period
   $total_users_playing = DB::table('bets')
    ->where('games_no', $period_no)
    ->distinct('userid')
    ->count('userid');
// dd($total_users_playing,$period_no);


    // 🔹 Future Predictions
        
         $futurePredictions = DB::table('admin_winner_results as fpr')
    ->select(
        'fpr.id',
        'fpr.gamesno',
        'fpr.number as predicted_number',
        DB::raw('IFNULL(fr.number, "pending") as result_number'),
        'fpr.created_at',
        'fpr.updated_at'
    )
    ->leftJoin('bet_results as fr', 'fr.games_no', '=', 'fpr.gamesno')  // Fixed join
    ->orderByDesc('fpr.id')
    ->paginate(10);

        
        $userBets = DB::table('bets')
        ->orderBy('id', 'desc')
        ->paginate(10); // Pagination here
        
        // Get game settings
        $gameSettings = DB::table('game_settings')->find($gameid);
        
        // Get game modes for tabs
        $gameModes = DB::table('game_settings')
            ->whereIn('name', ['Wingo 30 Second', 'Wingo 1 Minute', 'Wingo 3 Minute', 'Wingo 5 Minute'])
            ->orderByRaw("FIELD(name, 'Wingo 30 Second', 'Wingo 1 Minute', 'Wingo 3 Minute', 'Wingo 5 Minute')")
            ->get();
  

        return view('colour_prediction.index', compact(
        'bets',
        'gameid',
        'total_admin_profit',
        'total_user_profit',
        'today_admin_profit',
        'today_user_profit',
        'futurePredictions',
        'userBets',
        'total_users_playing',
        'gameSettings',
            'gameModes'
    ));

}

  public function fetchData($gameid)
{
    $bets = DB::select("SELECT betlogs.*, game_settings.winning_percentage AS parsantage, game_settings.id AS id 
                        FROM `betlogs` 
                        LEFT JOIN game_settings ON betlogs.game_id = game_settings.id 
                        WHERE betlogs.game_id = $gameid 
                        ORDER BY betlogs.id DESC 
                        LIMIT 20;");

    return response()->json(['bets' => $bets, 'gameid' => $gameid]);
}
	
	public function fetchData_07_05_2026($gameid)
    {
		
		
		$bets = DB::select("SELECT betlogs.*,game_settings.winning_percentage AS parsantage ,game_settings.id AS id FROM `betlogs` LEFT JOIN game_settings ON betlogs.game_id=game_settings.id where betlogs.game_id=$gameid Limit 20;");

		//dd($bets);

        return response()->json(['bets' => $bets, 'gameid' => $gameid]);
    }
	
	public function store(Request $request)
	{
		
// 	$datetime=now();
	  //$gamesno=$request->gamesno+1;
      $gameid=$request->game_id;
		 $gamesno=$request->game_no;
         $number=$request->number;
	
		 
        DB::insert("INSERT INTO `admin_winner_results`( `gamesno`, `gameId`, `number`, `status`) VALUES ('$gamesno','$gameid','$number','1')");
         
        
             return redirect()->back(); 
	}
	
	 public function future_store(Request $request)
    {
        $request->validate([
            'game_id'  => 'required|integer',
            'game_no'  => 'required|numeric',
            'number'   => 'required|numeric|min:0|max:9',
        ]);

        DB::table('admin_winner_results')->insert([
            'gamesno'    => $request->input('game_no'),
            'gameId'     => $request->input('game_id'),
            'number'     => $request->input('number'),
            'status'     => 1, // assuming default status for future result is 0
            // 'created_at' => now(),
            // 'updated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Future result added successfully.');
    }
  


public function color_update(Request $request)
      {
	   
	   $gamid=$request->id;
	
        $parsantage=$request->parsantage;
               $data= DB::select("UPDATE `game_settings` SET `winning_percentage` = '$parsantage' WHERE `id` ='$gamid'");
	         
         
             return redirect()->back();
          
      }
      
      

}
