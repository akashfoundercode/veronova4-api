<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Bet,Card,AdminWinnerResult,User,Betlog,GameSetting,VirtualGame,BetResult,MineGameBet,PlinkoBet,PlinkoIndexList};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use App\Helper\jilli;
use Illuminate\Support\Facades\Log;

use Illuminate\Support\Facades\DB;

class GameApiController extends Controller
{
    
     public function gameSerialNo()
     {
         $date = now()->format('Ymd');
             // wingo
             $gamesNo1 = $date . "01" . "0001";
     		$gamesNo2 = $date . "02" . "0001";
     		$gamesNo3 = $date . "03" . "0001";
     		$gamesNo4 = $date . "04" . "0001";
     		// trx
     		$gamesNo6 = $date . "06" . "0001";
     		$gamesNo7 = $date . "07" . "0001";
     		$gamesNo8 = $date . "08" . "0001";
     		$gamesNo9 = $date . "09" . "0001";
     		// D & T
     		$gamesNo10 = $date . "10" . "0001";
		 	 $gamesNo11 = $date . "11" . "0001";
		 	 $gamesNo12 = $date . "12" . "0001";
		 	 $gamesNo13 = $date . "13" . "0001";
		 $gamesNo14 = $date . "14" . "0001";
		 $gamesNo15 = $date . "15" . "0001";
		 $gamesNo16 = $date . "16" . "0001";
		  $gamesNo17 = $date . "17" . "0001";
		  $gamesNo18 = $date . "18" . "0001";
		 $gamesNo20 = $date . "20" . "0001";
		  $gamesNo21 = $date . "21" . "0001";
		  $gamesNo22 = $date . "22" . "0001";
		  $gamesNo23 = $date . "23" . "0001";
		  $gamesNo24 = $date . "24" . "0001";
		 $gamesNo25 = $date . "25" . "0001";
		 $gamesNo26 = $date . "26" . "0001";
    		
       	    DB::table('betlogs')->where('game_id', 1)
                           ->update(['games_no' => $gamesNo1]);
    		
     		DB::table('betlogs')->where('game_id', 2)
                           ->update(['games_no' => $gamesNo2]);
    		
     		DB::table('betlogs')->where('game_id', 3)
                           ->update(['games_no' => $gamesNo3]);
    		
     		DB::table('betlogs')->where('game_id', 4)
                           ->update(['games_no' => $gamesNo4]);
                          
             DB::table('betlogs')->where('game_id', 6)
                           ->update(['games_no' => $gamesNo6]);
    		
     		DB::table('betlogs')->where('game_id', 7)
                           ->update(['games_no' => $gamesNo7]);
    		
     		DB::table('betlogs')->where('game_id', 8)
                           ->update(['games_no' => $gamesNo8]);
    		
     		DB::table('betlogs')->where('game_id', 9)
                           ->update(['games_no' => $gamesNo9]);
    
             DB::table('betlogs')->where('game_id', 10)
                           ->update(['games_no' => $gamesNo10]);
		 
		 	 DB::table('betlogs')->where('game_id', 11)
                           ->update(['games_no' => $gamesNo11]);
		 
		 	 DB::table('betlogs')->where('game_id', 12)
                           ->update(['games_no' => $gamesNo12]);
		 
		 	 DB::table('betlogs')->where('game_id', 13)
                           ->update(['games_no' => $gamesNo13]);
		 
		 	DB::table('betlogs')->where('game_id', 14)
                           ->update(['games_no' => $gamesNo14]);
		 	DB::table('betlogs')->where('game_id', 15)
                           ->update(['games_no' => $gamesNo15]);
		 
		 	DB::table('betlogs')->where('game_id', 16)
                           ->update(['games_no' => $gamesNo16]);
		 DB::table('betlogs')->where('game_id', 17)
                           ->update(['games_no' => $gamesNo17]);
		  DB::table('betlogs')->where('game_id', 18)
                           ->update(['games_no' => $gamesNo18]);
		  DB::table('betlogs')->where('game_id', 20)
                           ->update(['games_no' => $gamesNo20]);
		 DB::table('betlogs')->where('game_id', 21)
                           ->update(['games_no' => $gamesNo22]);
		 DB::table('betlogs')->where('game_id', 22)
                           ->update(['games_no' => $gamesNo22]);
		 DB::table('betlogs')->where('game_id', 23)
                           ->update(['games_no' => $gamesNo23]);
		 DB::table('betlogs')->where('game_id', 24)
                           ->update(['games_no' => $gamesNo24]);
		 DB::table('betlogs')->where('game_id', 25)
                           ->update(['games_no' => $gamesNo25]);
		 DB::table('betlogs')->where('game_id', 26)
                           ->update(['games_no' => $gamesNo26]);
		 
     }
    

	public function dragon_bet_new(Request $request)
{
//     $bettingDisabled = true; // Set to true to disable, false to enable.

// if ($bettingDisabled) {
//     return response()->json(['status' => 400, 'message' => 'Betting is currently disabled.']);
// }

    $validator = Validator::make($request->all(), [
        'userid' => 'required',
    
        'game_id' => 'required',
      
        'json'=>'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()],400);
    }
    
    $datetime=date('Y-m-d H:i:s');
    
     $testData = $request->json;
    $userid = $request->userid;
    $gameid = $request->game_id;
  // $gameno = $request->game_no;
 
  $orderid = date('YmdHis') . rand(11111, 99999);
    
    $gamesrno=DB::select("SELECT games_no FROM `betlogs` WHERE `game_id`=$gameid  LIMIT 1");
    $gamesno=$gamesrno[0]->games_no;
 
   //dd($gamesno);
    
    foreach ($testData as $item) {
        $user_wallet = DB::table('users')->select('wallet','recharge')->where('id', $userid)->first();
            $userwallet = $user_wallet->wallet;
            //4$recharge = $user_wallet->recharge;
   
        $number = $item['number'];
        $amount = $item['amount'];
        
        //$commission = $amount * 0.05; // Calculate commission   
    //$betAmount = $amount - $commission; // Bet amount after commission deduction

        if($userwallet >= $amount){
      if ($amount>=1) {
        DB::insert("INSERT INTO `bets`(`amount`,`trade_amount`,`commission`, `number`, `games_no`, `game_id`, `userid`, `status`,`order_id`,`created_at`,`updated_at`) 
            VALUES ('$amount','$amount','0', '$number', '$gamesno', '$gameid', '$userid', '0','$orderid','$datetime','$datetime')");

        $data1 = DB::table('virtual_games')->where('game_id',$gameid)->where('number',$number)->first();
        $multiplier = $data1->multiplier;
        $num = $data1->actual_number;
       $multiply_amt = $multiplier*$amount;
       $bet_amt = DB::table('betlogs')->where('game_id',$gameid)->where('number',$num)->update([
           'amount'=>DB::raw("amount + $multiply_amt")
           ]);
       //DB::table('users')->where('id', $userid)->update(['wallet' => DB::raw("wallet - $amount")]);
      

    $recharge = $user_wallet->recharge;
  
        if ($recharge >= $amount) {
            
            DB::table('users')->where('id', $userid)->update([
                'recharge' => DB::raw("recharge - $amount"),
                 'wallet' => DB::raw("wallet - $amount")
            ]);
        } else {
           
            DB::table('users')->where('id', $userid)->update([
                'recharge' => 0,
                'wallet' => DB::raw("wallet - $amount")
            ]);
        }
    

       
      }
      }
      else {
                $response['msg'] = "Insufficient balance";
                $response['status'] = "400";
                return response()->json($response);
            }

    }

     return response()->json([
        'status' => 200,
        'message' => 'Bet Successfully',
    ]);   
    
}
	
	public function dragon_bet(Request $request)
{
    $bettingDisabled = false; // Set to true to disable, false to enable.

    if ($bettingDisabled) {
        return response()->json(['status' => 400, 'message' => 'Betting is currently disabled.']);
    }

    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'game_id' => 'required',
        'json' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
    }

    $datetime = date('Y-m-d H:i:s');
    $testData = $request->json;
    $userid = $request->userid;
    $gameid = $request->game_id;
    $orderid = date('YmdHis') . rand(11111, 99999);

    // Get game number
    $gamesrno = DB::select("SELECT games_no FROM `betlogs` WHERE `game_id` = $gameid LIMIT 1");
    $gamesno = $gamesrno[0]->games_no;

    // Calculate total amount from all bets
    $totalAmount = 0;
    foreach ($testData as $item) {
        $totalAmount += $item['amount'];
    }

    // Fetch user wallet and recharge
    $user_wallet = DB::table('users')->select('wallet', 'recharge')->where('id', $userid)->first();

    if (!$user_wallet) {
        return response()->json(['status' => 400, 'message' => 'User not found.']);
    }

    if ($user_wallet->wallet < $totalAmount) {
        return response()->json([
            'status' => 400,
            'message' => 'Your balance is too low to place this bet. Please add more funds to continue.'
        ]);
    }

    foreach ($testData as $item) {
        $number = $item['number'];
        $amount = $item['amount'];

        if ($amount >= 0.1) {
            DB::insert("INSERT INTO `bets`(`amount`, `trade_amount`, `commission`, `number`, `games_no`, `game_id`, `userid`, `status`, `order_id`, `created_at`, `updated_at`) 
                VALUES ('$amount', '$amount', '0', '$number', '$gamesno', '$gameid', '$userid', '0', '$orderid', '$datetime', '$datetime')");

            // Get multiplier and winning number
            $data1 = DB::table('virtual_games')->where('game_id', $gameid)->where('number', $number)->first();
            $multiplier = $data1->multiplier;
            $num = $data1->actual_number;

            // Update betlogs table
            $multiply_amt = $multiplier * $amount;
            DB::table('betlogs')->where('game_id', $gameid)->where('number', $num)->update([
                'amount' => DB::raw("amount + $multiply_amt")
            ]);

            // Deduct amount from recharge first, then from wallet
            $recharge = $user_wallet->recharge;

            if ($recharge >= $amount) {
                DB::table('users')->where('id', $userid)->update([
                    'recharge' => DB::raw("recharge - $amount"),
                    'wallet' => DB::raw("wallet - $amount")
                ]);
                $user_wallet->recharge -= $amount;
            } else {
                DB::table('users')->where('id', $userid)->update([
                    'recharge' => 0,
                    'wallet' => DB::raw("wallet - $amount")
                ]);
                $user_wallet->recharge = 0;
            }

            // Also update the user wallet variable after deduction for next iteration
            $user_wallet->wallet -= $amount;
        } else {
            return response()->json([
                'status' => 400,
                'message' => 'Minimum bet amount must be 0.1 or more.'
            ]);
        }
    }

    return response()->json([
        'status' => 200,
        'message' => 'Bet Successfully',
    ]);
}

public function bet(Request $request)
{
    // Step 1: Validation
    $validator = Validator::make($request->all(), [
        'userid' => 'required|exists:users,id',
        'game_id' => 'required|exists:virtual_games,game_id',
        'number' => 'required|numeric',
        'amount' => 'required|numeric|min:0.1',
        'games_no' => 'nullable',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    $uid = $request->userid;
    $user = User::findOrFail($uid);
    $amount = $request->amount;

    // Step 2: Check Balance
    if ($user->wallet < $amount) {
        return response()->json(['status' => 400, 'message' => 'Your balance is too low to place this bet.']);
    }

    // Step 3: Fetch Virtual Game Data
    $virtualGames = VirtualGame::where('number', $request->number)
        ->where('game_id', $request->game_id)
        ->get(['multiplier', 'actual_number']);

    if ($virtualGames->isEmpty()) {
        return response()->json(['status' => 400, 'message' => 'No valid virtual game found for this number and game ID.']);
    }
			$commission = $amount * 0.02; // Calculate 2% commission   
			$betAmount = $amount - $commission; // Bet amount after commission deduction
$game_no = DB::table('betlogs')
    ->where('game_id', $request->game_id)
    ->value('games_no');
//dd($game_no);
    // Step 4: Create Bet Record
    $bet = Bet::create([
        'amount' => $amount,
        'trade_amount' => $betAmount,
        'commission' => $commission,
        'number' => $request->number,
        'games_no' => $game_no,
        'game_id' => $request->game_id,
        'userid' => $uid,
        'order_id' => now()->format('YmdHis') . rand(11111, 99999),
        'created_at' => now(),
        'updated_at' => now(),
        'status' => 0,
        'illegal_count' => 0 // Default to legal
    ]);

    // Step 5: Update Bet Logs
    foreach ($virtualGames as $game) {
        Betlog::where('game_id', $request->game_id)
            ->where('number', $game->actual_number)
            ->increment('amount', $amount * $game->multiplier);
    }

    // Step 6: Deduct Balance
    $recharge = $user->recharge;
    if ($recharge >= $amount) {
        DB::table('users')->where('id', $uid)->update([
            'recharge' => DB::raw("recharge - $amount"),
            'wallet' => DB::raw("wallet - $amount")
        ]);
    } else {
        DB::table('users')->where('id', $uid)->update([
            'recharge' => 0,
            'wallet' => DB::raw("wallet - $amount")
        ]);
    }

    // Step 7: Check for Illegal Bets
    $gamesNo = $request->games_no;
    $userBetsInPeriod = Bet::where('userid', $uid)->where('games_no', $gamesNo)->pluck('number');

    $groupA = $userBetsInPeriod->filter(fn($n) => $n >= 0 && $n <= 9)->count();
    $groupB = $userBetsInPeriod->filter(fn($n) => in_array($n, [10, 20, 30]))->count();
    $groupC = $userBetsInPeriod->filter(fn($n) => in_array($n, [40, 50]))->count();

    if ($groupA > 1 || $groupB > 1 || $groupC > 1 || ($groupA + $groupB + $groupC) > 3) {
        // Mark bet as illegal
        $bet->illegal_status = 1;
        $bet->save();

        // Increment user's illegal_status count
        DB::table('users')->where('id', $uid)->increment('illegal_count');
    }

    return response()->json(['status' => 200, 'message' => 'Bet Successfully Placed']);
}

// public function bet(Request $request)
// {

//     // Validate the request
//     $validator = Validator::make($request->all(), [
//         'userid' => 'required|exists:users,id',
//         'game_id' => 'required|exists:virtual_games,game_id',
//         'number' => 'required',
//         'amount' => 'required|numeric|min:0.1',
//         'games_no' => 'required',
//     ]);

//     // If validation fails, return error message
//     if ($validator->fails()) {
//         return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
//     }

//     $uid = $request->userid;
//     $user = User::findOrFail($request->userid);
//     $amount = $request->amount;

//     // Check if the user's wallet has enough balance
//     if ($user->wallet < $request->amount) {
//         return response()->json(['status' => 400, 'message' => 'Your balance is too low to place this bet. Please add more funds to continue.']);
//     }

//     // Get virtual games data based on number and game_id
//     $virtualGames = VirtualGame::where('number', $request->number)
//         ->where('game_id', $request->game_id)
//         ->get(['multiplier', 'actual_number']);

//     // Check if no virtual games found for the given number and game_id
//     if ($virtualGames->isEmpty()) {
//         return response()->json(['status' => 400, 'message' => 'No valid virtual game found for the provided number and game ID.']);
//     }

//     // Create a new bet record
//     $bet = Bet::create([
//         'amount' => $request->amount,
//         'trade_amount' => $request->amount,
//         'commission' => 0,
//         'number' => $request->number,
//         'games_no' => $request->games_no,
//         'game_id' => $request->game_id,
//         'userid' => $user->id,
//         'order_id' => now()->format('YmdHis') . rand(11111, 99999),
//         'created_at' => now(),
//         'updated_at' => now(),
//         'status' => 0,
//     ]);

//     // Update the bet logs
//     foreach ($virtualGames as $game) {
//         Betlog::where('game_id', $request->game_id)
//             ->where('number', $game->actual_number)
//             ->increment('amount', $request->amount * $game->multiplier);
//     }

//     // Check the user's recharge balance and deduct from wallet
//     $recharge = $user->recharge;

//     if ($recharge >= $amount) {
//         // If recharge balance is sufficient, deduct from both recharge and wallet
//         DB::table('users')->where('id', $uid)->update([
//             'recharge' => DB::raw("recharge - $amount"),
//             'wallet' => DB::raw("wallet - $amount")
//         ]);
//     } else {
//         // If recharge is insufficient, reset recharge to 0 and deduct from wallet
//         DB::table('users')->where('id', $uid)->update([
//             'recharge' => 0,
//             'wallet' => DB::raw("wallet - $amount")
//         ]);
//     }

//     // Return success response if bet is placed successfully
//     return response()->json(['status' => 200, 'message' => 'Bet Successfully Placed']);
// } 


public function win_amount(Request $request)
{
    $validator = Validator::make($request->all(), [ 
        'userid' => 'required|integer',
        'game_id' => 'required|integer',
        'games_no' => 'required|integer',
        //'period_no'=>'required'
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
    }

    $game_id = $request->game_id;
    $userid = $request->userid;
    $game_no = $request->games_no;
     //$period = $request->period_no;
    
    // echo "$game_id,$userid,$game_no";
    // die;
   
    $win_amount = Bet::selectRaw('SUM(win_amount) AS total_amount, games_no, game_id AS gameid, win_number AS number, 
        CASE WHEN SUM(win_amount) = 0 THEN "lose" ELSE "win" END AS result')
        ->where('games_no', $game_no)
        ->where('game_id', $game_id)
        ->where('userid', $userid)
        ->groupBy('games_no', 'game_id', 'win_number')
        ->first();
       
    if ($win_amount) {
         $win = [
    'win' => $win_amount->total_amount,
    'games_no' => $win_amount->games_no,
    'result' => $win_amount->result,
    'gameid' => $win_amount->gameid,
    'number' => $win_amount->number
];
        
        return response()->json([
            'message' => 'Successfully',
            'status' => 200,
            'data' => $win,
            
        ], 200);
    } else {
        return response()->json(['msg' => 'No record found', 'status' => 400], 200);
    }
}


 public function results(Request $request)
{
    $validator = Validator::make($request->all(), [
        'game_id' => 'required',
        'limit' => 'required|integer',
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    $game_id = $request->game_id;
    $limit = $request->limit;
    $offset = $request->offset ?? 0;
    $from_date = $request->from_date;
    $to_date = $request->to_date;
    $status = $request->status;

    // Build the query
    $query = BetResult::where('game_id', $game_id);

    if (!empty($from_date) && !empty($to_date)) {
        $query->whereBetween('created_at', [$from_date, $to_date]);
    }

    if (!empty($status)) {
        $query->where('status', $status);
    }

    // Retrieve the results with limit and offset
    $results = $query->orderBy('id', 'desc')
                     ->offset($offset)
                     ->limit($limit)
                     ->get();

    // Get the total count of bet_results for the game_id
    $total_result = BetResult::where('game_id', $game_id)->count();

    return response()->json([
        'status' => 200,
        'message' => 'Data found',
        'total_result' => $total_result,
        'data' => $results,
    ]);
}

//// last
public function lastFiveResults(Request $request)
{
    $validator = Validator::make($request->all(), [
        'game_id' => 'required',
        'limit' => 'required|integer'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }
    
    $game_id = $request->game_id;
    $limit = (int) $request->limit;
    $offset = (int) ($request->offset ?? 0);
    $from_date = $request->from_date;
    $to_date = $request->to_date;

    $query = BetResult::where('game_id', $game_id);

    // Apply date range filter if provided
    if ($from_date && $to_date) {
        $query->whereBetween('created_at', [$from_date, $to_date]);
    }

    // Fetch the results with limit and offset
    $results = $query
        ->orderBy('id', 'desc')
        ->offset($offset)
        ->limit($limit)
        ->get();

    return response()->json([
        'status' => 200,
        'message' => 'Data found',
        'data' => $results
    ]);
}

// last result ///
public function lastResults(Request $request)
{
    $validator = Validator::make($request->all(), [
        'game_id' => 'required',
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }
    
    
    $game_id = $request->game_id;
    // $offset = (int) ($request->offset ?? 0);
    // $from_date = $request->from_date;
    // $to_date = $request->to_date;
    
    
    $results= BetResult::where('game_id', $game_id)->latest()->first();

    // $query = BetResult::where('game_id', $game_id);

    // // Apply date range filter if provided
    // if ($from_date && $to_date) {
    //     $query->whereBetween('created_at', [$from_date, $to_date]);
    // }

    // // Fetch the results with limit and offset
    // $results = $query
    //     ->orderBy('id', 'desc')
    //     ->offset($offset)
    //     ->limit(1)
    //     ->get();

    return response()->json([
        'status' => 200,
        'message' => 'Data found',
        'data' => $results
    ]);
}


public function bet_history(Request $request)
{
    // Validate the request
    $validator = Validator::make($request->all(), [
        'userid' => 'required|integer',
        'game_id' => 'required|integer',
        'limit' => 'integer|nullable',
        'offset' => 'integer|nullable',
        'from_date' => 'date|nullable',
        'to_date' => 'date|nullable',
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    // Extract validated data
    $userid = $request->userid;
    $game_id = $request->game_id;
    $limit = $request->limit ?? 10000;
    $offset = $request->offset ?? 0;

    // Build the query
    $query = DB::table('bets')
        ->select('bets.*', 'game_settings.name AS game_name', 'virtual_games.name AS virtual_game_name')
        ->leftJoin('game_settings', 'game_settings.id', '=', 'bets.game_id')
        ->leftJoin('virtual_games', function ($join) {
            $join->on('virtual_games.game_id', '=', 'bets.game_id')
                 ->on('virtual_games.number', '=', 'bets.number');
        })
        ->where('bets.userid', $userid)
        ->where('bets.game_id', $game_id);
    
    // $query = DB::table('bets')
    // ->select(
    //     'bets.*', 
    //     'game_settings.name AS game_name', 
    //     'virtual_games.name AS virtual_game_name'
    // )
    // ->leftJoin('game_settings', 'game_settings.id', '=', 'bets.game_id')
    // ->leftJoin('virtual_games', function ($join) {
    //     $join->on('virtual_games.game_id', '=', 'bets.game_id')
    //          ->on('virtual_games.number', '=', 'bets.number');
    // })
    // ->where('bets.userid', $userid)
    // ->where('bets.game_id', $game_id)
    // ->where('bets.account_type', 0); // 👈 This is the added condition


    // Apply date filters if provided
    if ($request->from_date) {
        $query->where('bets.created_at', '>=', $request->from_date);
    }

    if ($request->to_date) {
        $query->where('bets.created_at', '<=', $request->to_date);
    }
    // Apply pagination
    $results = $query->orderBy('bets.id', 'DESC')
                     ->offset($offset)
                     ->limit($limit)
                     ->distinct()
                     ->get();
    // Get total bets count for the user
   $total_bet = DB::table('bets')
    ->where('userid', $userid)
    ->where('game_id', $game_id)
    ->count(); 
      
    
    // Prepare the response
    if ($results->isNotEmpty()) {
        return response()->json([
            'status' => 200,
            'message' => 'Data found',
            'total_bets' => $total_bet,
            'data' => $results
        ]);
    } else {
        return response()->json([
            'status' => 200,
            'message' => 'No Data found',
            'data' => []
        ]);
    }
}

public function cron_with_pattern($game_id)
{
    // ✅ Step 1: Get global result type
    $type_data = DB::select("SELECT type FROM wingo_result_type WHERE status = 1 LIMIT 1");

    if (empty($type_data)) {
        echo "Global type not set (wingo_result_type where status = 1).";
        return;
    }

    $type = $type_data[0]->type;

    // ✅ Step 2: Get current game round
    $gameno = DB::select("SELECT * FROM betlogs WHERE game_id = $game_id ORDER BY id DESC LIMIT 1");
    if (empty($gameno)) {
        echo "No game round found.";
        return;
    }

    $game_no = $gameno[0]->games_no;
    $period = $game_no;

    // ✅ Step 3: Logic Based on Type
    if ($type == 1) {
        // --- Percentage-based logic ---
        $per = DB::select("SELECT winning_percentage FROM game_settings WHERE id = $game_id");
        $percentage = $per[0]->winning_percentage;

        $sumamt = DB::select("SELECT SUM(amount) AS amount FROM bets WHERE game_id = '$game_id' AND games_no = '$game_no'");
        $totalamount = $sumamt[0]->amount ?? 0;

        $percentageamount = $totalamount * $percentage * 0.01;

        $lessamount = DB::select("SELECT * FROM betlogs WHERE game_id = '$game_id' AND games_no = '$game_no' AND amount <= $percentageamount ORDER BY amount ASC LIMIT 1");
        if (count($lessamount) == 0) {
            $lessamount = DB::select("SELECT * FROM betlogs WHERE game_id = '$game_id' AND games_no = '$game_no' AND amount >= $percentageamount ORDER BY amount ASC LIMIT 1");
        }

        $admin_winner = DB::select("SELECT * FROM admin_winner_results WHERE gamesno = '$game_no' AND gameId = '$game_id' ORDER BY id DESC LIMIT 1");

        $min_max = DB::select("SELECT MIN(number) as mins, MAX(number) as maxs FROM betlogs WHERE game_id = $game_id");

        if (!empty($admin_winner)) {
            $res = $admin_winner[0]->number;
        } elseif ($totalamount < 450) {
            $res = rand($min_max[0]->mins ?? 0, $min_max[0]->maxs ?? 9);
        } elseif (!empty($lessamount)) {
            $res = $lessamount[0]->number;
        } else {
            $res = rand($min_max[0]->mins ?? 0, $min_max[0]->maxs ?? 9);
        }
    }

    elseif ($type == 2) {
        // --- Pattern-based logic with auto-init ---

        // Get the pattern rows
        $pattern = DB::select("SELECT * FROM result_pattern_set WHERE status = 1 ORDER BY id ASC");
        if (empty($pattern)) {
            echo "No pattern data found.";
            return;
        }

        // Check if pattern_tracking row exists, else insert
        $tracking = DB::select("SELECT * FROM pattern_tracking LIMIT 1");
        if (empty($tracking)) {
            DB::insert("INSERT INTO pattern_tracking (current_index, remaining_count) VALUES (0, 0)");
            $tracking = DB::select("SELECT * FROM pattern_tracking LIMIT 1");
        }

        $current_index = $tracking[0]->current_index;
        $remaining_count = $tracking[0]->remaining_count;

        // Defensive: if index exceeds pattern count (e.g. pattern table changed)
        if (!isset($pattern[$current_index])) {
            $current_index = 0;
            $remaining_count = 0;
        }

        // Load number and manage remaining count
        if ($remaining_count <= 0) {
            $remaining_count = $pattern[$current_index]->number_count;
        }

        $res = $pattern[$current_index]->number;
        $remaining_count--;

        // If count reaches 0, move to next
        if ($remaining_count <= 0) {
            $current_index++;

            if ($current_index >= count($pattern)) {
                $current_index = 0;
            }

            $remaining_count = $pattern[$current_index]->number_count;
        }

        // Update tracking table
        DB::update("UPDATE pattern_tracking SET current_index = ?, remaining_count = ?", [$current_index, $remaining_count]);
    }

    // ✅ Step 4: Send result to game-specific logic
    $result = $res;
//dd($result);
    if (in_array($game_id, [1, 2, 3, 4])) {
        $this->colour_prediction_and_bingo($game_id, $period, $result);
    } elseif ($game_id == 10) {
        $this->dragon_tiger($game_id, $period, $result);
    } elseif (in_array($game_id, [6, 7, 8, 9])) {
        $this->trx($game_id, $period, $result);
    } elseif ($game_id == 13) {
        $this->andarbaharpatta($game_id, $period, $result);
    } elseif ($game_id == 14) {
        $this->head_tail($game_id, $period, $result);
    } elseif ($game_id == 15) {
        $this->up7down($game_id, $period, $result);
    } elseif ($game_id == 16) {
        $this->red_black($game_id, $period, $result);
    } elseif ($game_id == 20) {
        $this->dice($game_id, $period, $result);
    } elseif ($game_id == 22) {
        $this->jhandimunda($game_id, $period, $result);
    }
}

public function cron($game_id)
{
	//dd($game_id);
    // ✅ Step 1: Get game-specific pattern if available
    $activePattern = DB::table('result_pattern_set')
        ->where('game_id', $game_id)
        ->where('status', 1)
        ->orderBy('id', 'asc')
        ->get();
       
//dd($activePattern);
    if ($activePattern->count() > 0) {
		//dd("hii");
        // ✅ Step 2: Get or Initialize pattern tracking for this game_id
        $tracking = DB::table('pattern_tracking')
            ->where('game_id', $game_id)
            ->first();

        if (empty($tracking)) {
            DB::table('pattern_tracking')->insert([
                'game_id' => $game_id,
                'current_index' => 0,
                'remaining_count' => $activePattern[0]->number_count,
                'updated_at' => now()
            ]);
            $tracking = DB::table('pattern_tracking')
                ->where('game_id', $game_id)
                ->first();
        }

        $current_index = $tracking->current_index;
        $remaining_count = $tracking->remaining_count;

        // Defensive: reset if index out of bounds
        if (!isset($activePattern[$current_index])) {
            $current_index = 0;
            $remaining_count = $activePattern[0]->number_count;
        }

        // ✅ Step 3: Get result and manage repeat logic
        $res = $activePattern[$current_index]->number;
        
        $remaining_count--;

        if ($remaining_count <= 0) {
            $current_index++;
            if ($current_index >= count($activePattern)) {
                $current_index = 0;
            }
            $remaining_count = $activePattern[$current_index]->number_count;
        }

        // ✅ Step 4: Update tracking table
        DB::table('pattern_tracking')
            ->where('game_id', $game_id)
            ->update([
                'current_index' => $current_index,
                'remaining_count' => $remaining_count,
                'updated_at' => now()
            ]);

        // ✅ Step 5: Get current game round
        $gameno = DB::table('betlogs')
            ->where('game_id', $game_id)
            ->orderBy('id', 'desc')
            ->first();

        if (empty($gameno)) {
            echo "No game round found.";
            return;
        }

        $period = $gameno->games_no;

        // ✅ Step 6: Send result
        $this->sendToGameLogic($game_id, $period, $res);
        return;
    }

    // ✅ Step 7: Fallback to global logic (if no game-specific pattern)
    $type_data = DB::table('wingo_result_type')
        ->where('status', 1)
        ->first();
//dd($type_data);
    if (empty($type_data)) {
        echo "Global type not set (wingo_result_type where status = 1).";
        return;
    }

    $type = $type_data->type;
//dd($type);
    // ✅ Step 8: Get current game round
    $gameno = DB::table('betlogs')
        ->where('game_id', $game_id)
        ->orderBy('id', 'desc')
        ->first();

    if (empty($gameno)) {
        echo "No game round found.";
        return;
    }

    $game_no = $gameno->games_no;
    $period = $game_no;

    if ($type == 1) {
		
		$admin_winner = DB::table('admin_winner_results')
            ->where('gamesno', $game_no)
            ->where('gameId', $game_id)
            ->orderBy('id', 'desc')
            ->first();
		//dd("heello");
        // --- Percentage-based logic ---
        $per = DB::table('game_settings')
            ->where('id', $game_id)
            ->first();
        $percentage = $per->winning_percentage;

        $sumamt = DB::table('bets')
            ->where('game_id', $game_id)
            ->where('games_no', $game_no)
            ->sum('amount');
        $totalamount = $sumamt ?? 0;

        $percentageamount = $totalamount * $percentage * 0.01;

        $lessamount = DB::table('betlogs')
            ->where('game_id', $game_id)
            ->where('games_no', $game_no)
            ->where('amount', '<=', $percentageamount)
            ->orderBy('amount', 'asc')
            ->first();

        if (empty($lessamount)) {
            $lessamount = DB::table('betlogs')
                ->where('game_id', $game_id)
                ->where('games_no', $game_no)
                ->where('amount', '>=', $percentageamount)
                ->orderBy('amount', 'asc')
                ->first();
        }

        
//dd($admin_winner);
        $min_max = DB::table('betlogs')
            ->where('game_id', $game_id)
            ->selectRaw('MIN(number) as mins, MAX(number) as maxs')
            ->first();

        if (!empty($admin_winner)) {
            $res = $admin_winner->number;
        } elseif ($totalamount < 450) {
            $res = rand($min_max->mins ?? 0, $min_max->maxs ?? 9);
        } elseif (!empty($lessamount)) {
            $res = $lessamount->number;
        } else {
            $res = rand($min_max->mins ?? 0, $min_max->maxs ?? 9);
        }
//dd($game_id, $period, $res);
        // ✅ Final Step: Send result
        $this->sendToGameLogic($game_id, $period, $res);
    }
}


private function sendToGameLogic($game_id, $period, $res)
{
   
    if (in_array($game_id, [1, 2, 3, 4])) {
        $this->colour_prediction_and_bingo($game_id, $period, $res);
    } elseif ($game_id == 10) {
        $this->dragon_tiger($game_id, $period, $result);
    } elseif (in_array($game_id, [6, 7, 8, 9])) {
        $this->trx($game_id, $period, $result);
    } elseif ($game_id == 13) {
        $this->andarbaharpatta($game_id, $period, $result);
    } elseif ($game_id == 14) {
        $this->head_tail($game_id, $period, $result);
    } elseif ($game_id == 15) {
        $this->up7down($game_id, $period, $result);
    } elseif ($game_id == 16) {
        $this->red_black($game_id, $period, $result);
    } elseif ($game_id == 20) {
        $this->dice($game_id, $period, $result);
    } elseif ($game_id == 22) {
        $this->jhandimunda($game_id, $period, $result);
    }
}

private function colour_prediction_and_bingo($game_id, $period, $res)
{
   //dd( $period, $res);
    //echo"$game_id,$period,$res";
    // Fetch the colours associated with the given game_id and result
    $colours = VirtualGame::where('actual_number', $res)
        ->where('game_id', $game_id)
        ->where('multiplier', '!=', '1.5')
        ->pluck('name');
//dd($colours);
    // Convert the collection to JSON
    $pdata = json_encode($colours);
    //dd($pdata);
    // Insert the bet result
    BetResult::create([
        'number' => $res,
        'games_no' => $period,
        'game_id' => $game_id,
        'status' => 1,
        'json' => $pdata,
        'random_card' => $res
    ]);

      Betlog::where('game_id', $game_id)
        ->update(['amount' => 0, 'games_no' => \DB::raw('games_no + 1')]);

    
    // Call the amount distribution method
    $this->amountdistributioncolors($game_id, $period, $res);
    // Update bet logs
   
    return true;

}
	
	 public function cron_without_result_pattern_set($game_id)
    {
              $per=DB::select("SELECT game_settings.winning_percentage as winning_percentage FROM game_settings WHERE game_settings.id=$game_id");
        $percentage = $per[0]->winning_percentage;  

            $gameno=DB::select("SELECT * FROM betlogs WHERE game_id=$game_id LIMIT 1");
            //
            
            $game_no=$gameno[0]->games_no;
             $period=$game_no;
             //dd($period);
            
				
            $sumamt=DB::select("SELECT SUM(amount) AS amount FROM bets WHERE game_id = '$game_id' && games_no='$game_no'");
				
            $totalamount=$sumamt[0]->amount;
		
            $percentageamount = $totalamount*$percentage*0.01; 
			
            $lessamount=DB::select(" SELECT * FROM betlogs WHERE game_id = '$game_id'  && games_no='$game_no' && amount <= $percentageamount ORDER BY amount asc LIMIT 1 ");
				if(count($lessamount)==0){
				$lessamount=DB::select(" SELECT * FROM betlogs WHERE game_id = '$game_id'  && games_no='$game_no' && amount >= '$percentageamount' ORDER BY amount asc LIMIT 1 ");
				}
            $zeroamount=DB::select(" SELECT * FROM betlogs WHERE game_id =  '$game_id'  && games_no='$game_no' && amount=0 ORDER BY RAND() LIMIT 1 ");
            $admin_winner=DB::select("SELECT * FROM admin_winner_results WHERE gamesno = '$game_no' AND gameId = '$game_id' ORDER BY id DESC LIMIT 1");
            //  dd($admin_winner);
            $min_max=DB::select("SELECT min(number) as mins,max(number) as maxs FROM betlogs WHERE game_id=$game_id;");
        if(!empty($admin_winner)){
            echo 'a ';
            $number=$admin_winner[0]->number;
        }
      
        if (!empty($admin_winner)) {
            echo 'b ';
            $res=$number;
        } 
         elseif ( $totalamount< 450) {
             echo 'c ';
            $res= rand($min_max[0]->mins, $min_max[0]->maxs);
        }elseif($totalamount > 450){
            echo 'd ';
            $res=$lessamount[0]->number;
        }
        //$result=$number;
        $result=$res;
    
     
       //  $this->resultannounce($game_id,$period,$result);
				
				//$this->colour_prediction_and_bingo($game_id,$period,$result);
				// $this->trx($game_id,$period,$result);
			if ($game_id == 1 || $game_id == 2 || $game_id == 3 || $game_id == 4) {
    $this->colour_prediction_and_bingo($game_id, $period, $result);
					
} elseif ($game_id == 10 ) {
    $this->dragon_tiger($game_id, $period, $result);
}	elseif ($game_id == 6 || $game_id == 7 || $game_id == 8 || $game_id == 9) {
    $this->trx($game_id, $period, $result);
				}			
		 elseif ($game_id == 13 ) {
    $this->andarbaharpatta($game_id, $period, $result);
}
elseif ($game_id == 14 ) {
    $this-> head_tail($game_id, $period, $result);
}
		 elseif ($game_id == 15 ) {
    $this-> up7down($game_id, $period, $result);
}
		 elseif ($game_id == 16 ) {
    $this-> red_black($game_id, $period, $result);
}
		  elseif ($game_id == 20 ) {
    $this-> dice($game_id, $period, $result);
}
		  elseif ($game_id == 22 ) {
    $this-> jhandimunda($game_id, $period, $result);
}
	 }
	
	
		 private function jhandimunda($game_id, $period, $result)
    {
        if (is_null($result)) {
            $result = rand(1, 6);
        }
        $virtual_games = [
            1 => 'heart',
            2 => 'spades',
            3 => 'diamond',
            4 => 'club',
            5 => 'face',
            6 => 'flag'
        ];
    
        // Get the selected game based on the result
        $selected_game = $virtual_games[$result];
		  
        DB::insert("INSERT INTO `bet_results` (`number`,`games_no`, `game_id`, `status`, `json`, `random_card`) VALUES (?,?, ?, ?, ?, ?)", [$result, $period, 22, 1, $result,  $result ]);
		 $this->jhandi_munda($game_id, $period, $result);
        DB::update("UPDATE `betlogs` SET amount = 0, games_no = games_no + 1 WHERE game_id = 22");
       
    
        return true;
    }

		private function jhandi_munda($game_id, $period, $result)
{
    //echo"$game_id,$period,$res";
    // Fetch the virtual games based on criteria
    $virtualGames = VirtualGame::where('actual_number', $result)
        ->where('game_id', $game_id)
        ->where(function ($query) {
            $query->where('type', '!=', 1)->where('multiplier', '!=', '1.5')
                  ->orWhere(function ($query) {
                      $query->where('type', 1)->where('multiplier', '1.5');
                  });
        })
        ->get();
    //dd($virtualGames);
    foreach ($virtualGames as $winAmount) {
        $multiple = $winAmount->multiplier;
        $number = $winAmount->number;

        if (!empty($number)) {
           
           $test1= Bet::where('games_no', $period)
                ->where('game_id', $game_id)
                ->where('number', $number)
                ->update(['win_amount' => DB::raw("trade_amount * $multiple"), 'win_number' => $result, 'status' => 1]);
        }
    }

    // Update users' wallets based on the winning amounts
    $winningBets = Bet::where('win_number', '>=', 0)
        ->where('games_no', $period)
        ->where('game_id', $game_id)
        ->get();

    foreach ($winningBets as $bet) {
        $amount = $bet->win_amount;
        $userId = $bet->userid;

      $amount = (float) $amount;

User::where('id', $userId)
    ->update([
        'wallet' => DB::raw("wallet + {$amount}"), 
        'winning_wallet' => DB::raw("winning_wallet + {$amount}"),
        'updated_at' => now()
    ]); 
	
    }

    // Update bets with no winning amount
    Bet::where('games_no', $period)
        ->where('game_id', $game_id)
        ->where('status', 0)
        ->where('win_amount', 0)
        ->update(['status' => 2, 'win_number' => $result]);
         DB::select("UPDATE `betlogs` SET amount=0,games_no=games_no+1 where game_id =  '$game_id';");
}

	 private function dice($game_id,$period,$result)
  {
     if($result==1) {
         $colour='d';
     }elseif($result==2) {
         $colour='c';
     }elseif($result==3) {
         $colour='k';
     }elseif($result==4) {
         $colour='e';
     }
     
     $ddta=DB::select("SELECT image FROM cards WHERE colour='$colour' ORDER BY RAND() limit 1")[0]->image;


    
     DB::select("INSERT INTO bet_results( number, games_no, game_id, status,json,random_card) VALUES ('$result','$period','$game_id','1','$ddta','$ddta')"); 
      DB::select("UPDATE betlogs SET amount=0,games_no=games_no+1 where game_id =  '$game_id'"); 
		 $this->amountdistribution_dice($game_id, $period, $result);
     return true;
  }
	
	private function amountdistribution_dice($game_id, $period, $result)
    {
        DB::update("UPDATE `bets` SET `status` = 2 WHERE `games_no` = '$period' AND `game_id` = '$game_id'");
        $virtual = DB::select("SELECT `name`, `number`, `actual_number`, `game_id`, `multiplier` FROM `virtual_games` WHERE `actual_number` = '$result' AND `game_id` = '$game_id'");
        if (!empty($virtual)) {
            foreach ($virtual as $winamount) {
            $multiple = $winamount->multiplier;
            $number = $winamount->number;
            DB::update("UPDATE `bets` SET `win_amount` = `amount` * '$multiple', `win_number` = '$result', `status` = 1 WHERE `games_no` = '$period' AND `game_id` = '$game_id' AND `number` = '$number'");
            }
            $uids = DB::select("SELECT `win_amount`, `userid` FROM `bets` WHERE `status` = 1 AND `games_no` = '$period' AND `game_id` = '$game_id'");
            foreach ($uids as $row) {
                $amount = $row->win_amount;
                $userid = $row->userid;
                DB::update("UPDATE `users` SET `wallet` = `wallet` + $amount, `winning_wallet` = `winning_wallet` + $amount WHERE id = $userid");
            }
        }
    }

	
	  private function up7down($game_id,$period,$result)
    {
      $card=array();
      if($result==1){
          $image1=rand(1,5);
          $im2=rand($image1,6);
          $image2=$im2-$image1;
     $card=["https://magicwinner.motug.com/public/uploads/7up/$image1.png",$card="https://magicwinner.motug.com/public/uploads/7up/$image2.png"]; 
      }elseif($result==2){
        $image1=rand(1,5);
        $image2=7-$image1;
        $card=["https://magicwinner.motug.com/public/uploads/7up/$image1.png" ,$card="https://magicwinner.motug.com/public/uploads/7up/$image2.png"];
        }else{
         $image1=6;
        $im2=rand($image1,12);
        $image2=$im2-$image1;
         $card=["https://magicwinner.motug.com/public/uploads/7up/$image1.png" ,$card="https://magicwinner.motug.com/public/uploads/7up/$image2.png"];       
      }
      $cccc=$image1+$image2;
        $dtat=json_encode($card);
        DB::select("INSERT INTO `bet_results`( `number`, `games_no`, `game_id`, `status`,`json`,`random_card`) VALUES ('$result','$period','$game_id','1','$dtat','$cccc')"); 
        $this->distributeUp7DownWinnings($game_id, $period);
        DB::select("UPDATE `betlogs` SET amount=0,games_no=games_no+1 where game_id =  '$game_id'"); 
     return true;
    }
	
    private function distributeUp7DownWinnings($game_id, $period)
    {
        // Bet Result Fetch karo
        $result = DB::table('bet_results')
            ->where('game_id', $game_id)
            ->where('games_no', $period)
            ->latest('id')
            ->first();
    
        if (!$result) {
            \Log::error("No result found for Game ID: $game_id, Period: $period");
            return;
        }
    
        $result_number = (int)$result->number; 
        $random_card_sum = (int)$result->random_card; 
        $bets = DB::table('bets')
            ->where('game_id', 15)
            ->where('games_no', $period)
            ->get();
        $userWinningAmounts = [];
        foreach ($bets as $bet) {
            $tradeAmount = (float)$bet->amount;
            $betNumber = (int)$bet->number; 
    
            $win_amount = 0;
            $is_winner = false;
    
            if ($betNumber === $result_number) {
                $multiplier = 2; 
                $win_amount = $tradeAmount * $multiplier;
                $is_winner = true;
            }
            $status = $is_winner ? 1 : 2;
            DB::table('bets')
            ->where('id', $bet->id)
            ->update([
                'status' => $status,
                'win_amount' => $win_amount,
                'win_number' => $random_card_sum,
                'updated_at' => now()
            ]);
            if ($is_winner && $win_amount > 0) {
                if (!isset($userWinningAmounts[$bet->userid])) {
                    $userWinningAmounts[$bet->userid] = 0;
                }
                $userWinningAmounts[$bet->userid] += $win_amount;
            }
        }
        foreach ($userWinningAmounts as $user_id => $total_win) {
            DB::table('users')
                ->where('id', $user_id)
                ->increment('wallet', $total_win);
        }
        \Log::info("7UpDown winnings distributed for Game ID: 15, Period: $period");
    }
	
		 
		   private function red_black($game_id, $period, $result)
    {
        switch ($result) {
            case 1:
                $colour = 'd';
                break;
    
            case 2:
                $colour = 'c';
                break;
    
            case 3:
                $colour = 'k';
                break;
    
            case 4:
                $colour = 'e';
                break;
    
            case 5:
                $cardInfo = DB::table('cards')->where('card', 11)->first();
                if (!$cardInfo) {
                    throw new \Exception("Card with card = 11 not found");
                }
                $colours = ['e', 'd'];
                $colour = $colours[array_rand($colours)];
                break;
            case 6:
                $colours = ['e', 'd'];
                $colour = $colours[array_rand($colours)];
                break;
            case 7:
                $colours = ['c', 'k'];
                $colour = $colours[array_rand($colours)];
                break;
            default:
                throw new \Exception("Invalid result value: $result");
        }
    
        $card = DB::select("SELECT `image` FROM `cards` WHERE `colour` = ? ORDER BY RAND() LIMIT 1", [$colour]);
        if (empty($card)) {
            throw new \Exception("No card found for colour: $colour");
        }
        $ddta = $card[0]->image;
        DB::insert("INSERT INTO `bet_results` (`number`, `games_no`, `game_id`, `status`, `json`, `win_number`,`random_card`) VALUES (?, ?, '16', '1', ?, ?,?)", [
            $result, $period, $ddta, $ddta, $result
        ]);
        $this->distributeRedBlackWinnings($game_id, $period);
        DB::update("UPDATE `betlogs` SET amount = 0, games_no = games_no + 1 WHERE game_id = 16");
    
        return true;
    }
	
    private function distributeRedBlackWinnings($game_id, $period)
    {
        $result = DB::table('bet_results')
            ->where('game_id', $game_id)
            ->where('games_no', $period)
            ->latest('id')
            ->first();
// dd($result);
        if (!$result) {
            Log::error("No result found for Game ID: $game_id, Period: $period");
            return;
        }

        // Step 2: Get random card and match virtual game
        $random_card = (int)$result->number;
// dd($random_card);
        $virtualGame = DB::table('virtual_games')
            ->where('game_id', 16)
            ->where('actual_number', $random_card)
            ->first();
        if (!$virtualGame) {
            Log::error("No virtual game found for Game ID: $game_id and Random Card: $random_card");
            return;
        }
        $multiplier = $virtualGame->multiplier;
// dd($multiplier);
        DB::table('bets')
            ->where('game_id', 16)
            ->where('games_no', $period)
            ->update([
                'trade_amount' => $multiplier
            ]);
// dd($hii);
        // Step 4: Process each bet and calculate win
        $result_number = (int)$result->number;
        $bets = DB::table('bets')
            ->where('game_id', 16)
            ->where('games_no', $period)
            ->get();
// dd($bets);
        $userWinningAmounts = [];

        foreach ($bets as $bet) {
            $tradeAmount = (float)$bet->amount;
            $betNumber = (int)$bet->number;
            $win_amount = 0;
            $is_winner = false;

            if ($betNumber === $result_number) {
                $win_amount = $tradeAmount * $multiplier;
                $is_winner = true;
            }

            $status = $is_winner ? 1 : 2;

            DB::table('bets')
                ->where('id', $bet->id)
                ->update([
                    'status' => $status,
                    'win_amount' => $win_amount,
                    'trade_amount' => $multiplier,
                    'win_number' => $random_card,
                    'updated_at' => now()
                ]);

            if ($is_winner && $win_amount > 0) {
                if (!isset($userWinningAmounts[$bet->userid])) {
                    $userWinningAmounts[$bet->userid] = 0;
                }
                $userWinningAmounts[$bet->userid] += $win_amount;
            }
        }

        // Step 5: Add win amounts to each user's wallet
        foreach ($userWinningAmounts as $user_id => $total_win) {
            DB::table('users')
                ->where('id', $user_id)
                ->increment('wallet', $total_win);
        }

        Log::info("Red/Black winnings distributed for Game ID: $game_id, Period: $period");
    }
	
	  private function head_tail($game_id, $period, $result)
     {
     if($result==20){
       $card="https://root.gameon.deals/public/image/heads.png" ; 
       }else{
       $card="https://root.gameon.deals/public/image/tails.png"  ;
       }
       DB::select("INSERT INTO `bet_results`( `number`, `games_no`, `game_id`, `status`,`json`,`random_card`) VALUES ('$result','$period','$game_id','1','$card','$card')"); 
       DB::select("UPDATE `betlogs` SET amount=0,games_no=games_no+1 where game_id =  '$game_id'"); 
      
       $this->distributeHeadTailWinnings($game_id, $period, $result);
      
      return true;
     }
	 private function distributeHeadTailWinnings($game_id, $period, $result)
    {
        DB::update("UPDATE `bets` SET `status` = 2 WHERE `games_no` = '$period' AND `game_id` = '$game_id'");
        $virtual = DB::select("SELECT `name`, `number`, `actual_number`, `game_id`, `multiplier` FROM `virtual_games` WHERE `actual_number` = '$result' AND `game_id` = '$game_id'");
        if (!empty($virtual)) {
            foreach ($virtual as $winamount) {
            $multiple = $winamount->multiplier;
            $number = $winamount->number;
            DB::update("UPDATE `bets` SET `win_amount` = `amount` * '$multiple', `win_number` = '$result', `status` = 1 WHERE `games_no` = '$period' AND `game_id` = '$game_id' AND `number` = '$number'");
            }
            $uids = DB::select("SELECT `win_amount`, `userid` FROM `bets` WHERE `status` = 1 AND `games_no` = '$period' AND `game_id` = '$game_id'");
            foreach ($uids as $row) {
                $amount = $row->win_amount;
                $userid = $row->userid;
                DB::update("UPDATE `users` SET `wallet` = `wallet` + $amount, `winning_wallet` = `winning_wallet` + $amount WHERE id = $userid");
            }
        }
    }


	private function andarbaharpatta($game_id,$period,$result)
     {
		 //dd($game_id);
      $lastimage=DB::select("SELECT cards.*, bet_results.random_card AS rand_card, bet_results.game_id AS gameiid,bet_results.id as rid FROM cards JOIN bet_results ON cards.card = bet_results.random_card WHERE bet_results.game_id = $game_id ORDER BY bet_results.id DESC LIMIT 1; 
");
		 //dd($lastimage);
 
            //card id
         $rescardid = $lastimage[0]->id ?? 1;
       
         $res=$lastimage[0]->card ?? 1;//  card number
             
        
     $randomNumber = rand(1, 11); 
     $evenNumber = $randomNumber * 2; 
    


 $randomNumbers = rand(1, 11); 
     $evenNumbersss = $randomNumbers % 2; 
      
if($evenNumbersss ==1){
$dragon=$randomNumbers;

}else{
    $dragon=$randomNumbers-1;
    
}
     //echo $dragon; 
     $limit=$dragon-1;
     $patta=DB::select("SELECT * FROM cards where card != $res  ORDER BY RAND(colour) LIMIT $limit");
     
     $pattafinal =DB::select("SELECT * FROM cards where card = $res  && id !=$rescardid ORDER BY RAND(id) LIMIT 1");
     $cards=array();
     foreach($patta as $item)
     {
  
     $image = $item->card;
     $cards[] = $image;

    
     }
    
      $cards[]=DB::select("SELECT * FROM cards where card = $res  && id !=$rescardid ORDER BY RAND(id) LIMIT 1")[0]->card ?? 1;
     $dataa=json_encode($cards);
    $nextresultcard =DB::select("SELECT * FROM cards where id !=$rescardid ORDER BY RAND(colour) LIMIT 1")[0]->card ?? 1;
    
   
    
     DB::select("INSERT INTO `bet_results`( `number`, `games_no`, `game_id`, `status`,`json`,`random_card`) VALUES ('$result','$period','$game_id','1','$dataa','$nextresultcard')"); 
     $this->amountdistributioncolors($game_id,$period,$result);
     // DB::select("UPDATE `betlogs` SET amount=0,games_no=games_no+1 where game_id =  '$game_id'"); 
      

      
     return true;
     
  }  
  
	 



public function get_result(Request $request)
{
    
     $validator = Validator::make($request->all(), [ 
        'game_id' => 'required|integer'
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
    }

    $game_id = $request->game_id;
    //$period = $request->games_no;
  $period = DB::table('bets')
    ->where('game_id', $game_id)
    ->where('status', 0)
    ->orderBy('created_at', 'desc') // assuming 'created_at' is the column for determining the most recent entry
    ->pluck('games_no')
    ->first();
    //dd($period);
if($period != null){
//dd($period);
    
    $curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => "https://root.usawin.vip/api/trx/results_by_periodno?gameid=$game_id&period_no=$period",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'GET',
));

$response = curl_exec($curl);

curl_close($curl);
$response = json_decode($response);  // Convert the string into an object
//dd($response);
$result = $response->win_number;
//dd($result);

  $this->trx($game_id, $period, $result);
//dd($win_number);
//echo $response;
if($result){
     return response()->json([
            'status' => 200,
            'message' => 'result updated successfully!',
            'games_no' => $period,
            'win_number' => $result
        ]);
}
}else{
    dd("No Bet Found");
}

}

/// trx ////

private function trx($game_id,$period,$result)
   {
     
      
       //$colour=DB::select("SELECT `name` FROM `virtual_games` WHERE actual_number=$result && game_id=$game_id && `multiplier` !='1.5'");
       $colour = DB::select("SELECT `name` FROM `virtual_games` WHERE actual_number = ? AND game_id = ? AND `multiplier` != '1.5'", [$result, $game_id]);

       //dd($colour);
      
       $tokens=$this->generateRandomString().$result;
		 
       $json=[];
       foreach ($colour as $item){
           $json[]=$item->name;
       }
       $pdata=json_encode($json);
		 $blockk = DB::table('bet_results')
            ->selectRaw('`block` + CASE 
                            WHEN ? = 6 THEN 20 
                            WHEN ? = 7 THEN 60 
                            WHEN ? = 8 THEN 100 
                            ELSE 200 
                          END AS adjusted_block', [$game_id, $game_id, $game_id])
            ->where('game_id', $game_id)
            ->orderByDesc('id')
            ->limit(1)
            ->first();
	$block=$blockk->adjusted_block ?? 100;
	  //dd($period);
      $result = empty($result) ? 0 : $result; // Ensure $result is a number (default to 0 if empty)

$period = (string) $period; // This ensures $period is treated as a string

DB::select("
    INSERT INTO `bet_results` (`number`, `games_no`, `game_id`, `status`, `json`, `random_card`, `token`, `block`)
    VALUES ('$result', '$period', '$game_id', '1', '$pdata', '$result', '$tokens', '$block')
");

  DB::select("UPDATE `bets` SET `status`=2 WHERE `games_no`='$period' && `game_id`=  '$game_id' && number ='$result' && `status`=0;");
        
          $this->amountdistributioncolors($game_id,$period,$result);
        // DB::select("UPDATE `bets` SET `status`=2 WHERE `games_no`='$period' && `game_id`=  '$game_id' && number ='$result' && `status`=0;");
        
      return true;
			
   }
   
     private function generateRandomString($length = 4) {
    $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $randomString = '';
    $maxIndex = strlen($characters) - 1;

    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $maxIndex)];
    }
    return $randomString;
}

private function dragon_tiger($game_id, $period, $result)
{
    $data = [];
    
    try {
        if ($result == 1) {
            $rand = rand(2, 16);
            $card1 = Card::where('card', '>', $rand)
                ->inRandomOrder()
                ->first();
                
            $rand2 = rand(2, $rand - 2);
            $card2 = Card::where('card', '>', $rand2)
                ->inRandomOrder()
                ->first();
                
            $data = [$card1->card ?? null, $card2->card ?? null];
        } elseif ($game_id == 2) {
            $rand = rand(2, 13);
            $card2 = Card::where('card', '>', $rand)
                ->inRandomOrder()
                ->first();
                
            $rand2 = rand(2, $rand - 2);
            $card1 = Card::where('card', '>', $rand2)
                ->inRandomOrder()
                ->first();
                
            $data = [$card1->card ?? null, $card2->card ?? null];
        } else {
            $rand = rand(2, 13);
            $card2 = Card::where('card', $rand)
                ->orderBy('id', 'asc')
                ->first();
                
            $card1 = Card::where('card', $rand)
                ->orderBy('id', 'desc')
                ->first();
                
            $data = [$card1->card ?? null, $card2->card ?? null];
        }

        $resJson = json_encode($data);
        
        BetResult::create([
            'number' => $result,
            'games_no' => $period,
            'game_id' => $game_id,
            'status' => 1,
            'json' => $resJson,
        ]);
  Betlog::where('game_id', $game_id)
            ->update(['amount' => 0, 'games_no' => DB::raw('games_no + 1')]);

        $this->amountDistributionColors($game_id, $period, $result);
        
       
    } catch (\Exception $e) {
        Log::error('Error in dragonTiger function: ' . $e->getMessage());
    }
}
	private function amountdistributioncolors($game_id, $period, $res)
{
    try {
        // ✅ Wait until all bets for the given game & period are inserted
        // This loop checks up to 5 seconds before proceeding
        $maxWaitSeconds = 5;
        $waited = 0;
        while ($waited < $maxWaitSeconds) {
            $betsCount = Bet::where('games_no', $period)
                ->where('game_id', $game_id)
                ->count();

            if ($betsCount > 0) {
                break; // bets found, proceed
            }

            usleep(500000); // wait 0.5 sec
            $waited += 0.5;
        }

        DB::beginTransaction();

        // ✅ Fetch the virtual games with multiplier logic
        $virtualGames = VirtualGame::where('actual_number', $res)
            ->where('game_id', $game_id)
            ->where(function ($query) {
                $query->where('type', '!=', 1)->where('multiplier', '!=', '1.5')
                      ->orWhere(function ($query) {
                          $query->where('type', 1)->where('multiplier', '1.5');
                      });
            })
            ->get();

        foreach ($virtualGames as $winAmount) {
            $multiple = (float) $winAmount->multiplier;
            $number = $winAmount->number;

            if (!empty($number)) {
                // ✅ Special rule if result is "0"
                if ($res === '0') {
                    Bet::where('games_no', $period)
                        ->where('game_id', $game_id)
                        ->where('number', $res)
                        ->update([
                            'win_amount' => DB::raw('trade_amount * 9'),
                            'win_number' => '0',
                            'status' => 1
                        ]);
                }

                // ✅ Normal multiplier update
                Bet::where('games_no', $period)
                    ->where('game_id', $game_id)
                    ->where('number', $number)
                    ->update([
                        'win_amount' => DB::raw("trade_amount * {$multiple}"),
                        'win_number' => $res,
                        'status' => 1
                    ]);
            }
        }

        // ✅ Update wallets for winners
        $winningBets = Bet::where('games_no', $period)
            ->where('game_id', $game_id)
            ->where('status', 1)
            ->get();

        foreach ($winningBets as $bet) {
            $amount = (float) $bet->win_amount;
            User::where('id', $bet->userid)
                ->update([
                    'wallet' => DB::raw("wallet + {$amount}"),
                    'winning_wallet' => DB::raw("winning_wallet + {$amount}"),
                    'updated_at' => now()
                ]);
        }

        // ✅ Mark all others as losers
        Bet::where('games_no', $period)
            ->where('game_id', $game_id)
            ->where('status', 0) // untouched bets
            ->update([
                'status' => 2,
                'win_number' => $res,
                'win_amount' => 0
            ]);

        DB::commit();

    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error("Amount distribution failed for Game ID: {$game_id}, Period: {$period}. Error: " . $e->getMessage());
    }
}


private function amountdistributioncolors_12_08_2025($game_id, $period, $res)
{
   
    //echo"$game_id,$period,$res";
    // Fetch the virtual games based on criteria
    $virtualGames = VirtualGame::where('actual_number', $res)
        ->where('game_id', $game_id)
        ->where(function ($query) {
            $query->where('type', '!=', 1)->where('multiplier', '!=', '1.5')
                  ->orWhere(function ($query) {
                      $query->where('type', 1)->where('multiplier', '1.5');
                  });
        })
        ->get();
   
    foreach ($virtualGames as $winAmount) {
        $multiple = $winAmount->multiplier;
        $number = $winAmount->number;
        
       

        if (!empty($number)) {
            // Update bet for result '0'
            //dd($number);
            if ($res == '0') {
                //dd("hii");
                $test= Bet::where('games_no', $period)
                    ->where('game_id', $game_id)
                    ->where('number', $res)
                    ->update(['win_amount' => DB::raw('trade_amount * 9'), 'win_number' => '0', 'status' => 1]);
                   //dd($test); 
            }
              //dd("hello");
            // Update bets based on multiplier
           $test1= Bet::where('games_no', $period)
                ->where('game_id', $game_id)
                ->where('number', $number)
                ->update(['win_amount' => DB::raw("trade_amount * $multiple"), 'win_number' => $res, 'status' => 1]);
        }
    }

    // Update users' wallets based on the winning amounts
    $winningBets = Bet::where('win_number', '>=', 0)
        ->where('games_no', $period)
        ->where('game_id', $game_id)
        ->get();

    foreach ($winningBets as $bet) {
        $amount = $bet->win_amount;
        $userId = $bet->userid;

      $amount = (float) $amount;

User::where('id', $userId)
    ->update([
        'wallet' => DB::raw("wallet + {$amount}"), 
        'winning_wallet' => DB::raw("winning_wallet + {$amount}"),
        'updated_at' => now()
    ]); 
	
    }

    // Update bets with no winning amount
    Bet::where('games_no', $period)
        ->where('game_id', $game_id)
        ->where('status', 0)
        ->where('win_amount', 0)
        ->update(['status' => 2, 'win_number' => $res]);
        //  DB::select("UPDATE `betlogs` SET amount=0,games_no=games_no+1 where game_id =  '$game_id';");
}

////// Mine Game Api ///////
	
	
public function mine_bet(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'game_id' => 'required',
        'amount' => 'required|numeric|min:0.1',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    $userid = $request->userid;
    $gameid = $request->game_id;
    $amount = $request->amount;

    date_default_timezone_set('Asia/Kolkata');
    $datetime = now();
    $orderid = now()->format('YmdHis') . rand(11111, 99999);

    $tax = 0.00;
    $commission = $amount * $tax;
    $betAmount = $amount - $commission;

    // Get user from DB
    $user = DB::table('users')->where('id', $userid)->first();

    if ($amount >= 0.1) {
        if ($user && $user->wallet >= $amount) {
            // Insert into mine_game_bets table
            DB::table('minegame_bet')->insert([
                'amount' => $amount,
                'game_id' => $gameid,
                'userid' => $userid,
                'status' => 0,
                'created_at' => $datetime,
                'updated_at' => $datetime,
                'tax' => $tax,
                'after_tax' => $betAmount,
                'orderid' => $orderid
            ]);

            // Update wallet
            DB::table('users')->where('id', $userid)->decrement('wallet', $amount);

            return response()->json(['status' => 200, 'message' => 'Bet placed successfully'], 200);
        } else {
            return response()->json(['status' => 400, 'message' => 'Insufficient balance'], 400);
        }
    } else {
        return response()->json(['status' => 400, 'message' => 'Bet placed minimum 0.1 rupees'], 400);
    }
}


public function mine_betold(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'game_id' => 'required',
        'amount' => 'required|numeric|min:0',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    $userid = $request->userid;
    $gameid = $request->game_id;
    $amount = $request->amount;

    date_default_timezone_set('Asia/Kolkata');
    $datetime = now(); // Using Laravel's now() function
    $orderid = now()->format('YmdHis') . rand(11111, 99999);
    //dd($orderid);
    $tax = 0.00;
    $commission = $amount * $tax;
    $betAmount = $amount - $commission;

    $user = User::find($userid);
          
    if ($amount >= 10) {
        if ($user && $user->wallet >= $amount) {
            // Create the bet record
            MineGameBet::create([
                'amount' => $amount,
                'game_id' => $gameid,
                'userid' => $userid,
                'status' => 0,
                'created_at' => $datetime,
                'updated_at' => $datetime,
                'tax' => $tax,
                'after_tax' => $betAmount,
                'order_id' => $orderid   
            ]);

            // Update the user's wallet
            $user->decrement('wallet', $amount);

            return response()->json(['status' => 200, 'message' => 'Bet placed successfully'], 200);
        } else {
            return response()->json(['status' => 400, 'message' => 'Insufficient balance'], 400);
        }
    } else {
        return response()->json(['status' => 400, 'message' => 'Bet placed minimum 10 rupees'], 400);
    }
}

public function mine_cashout(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required|integer',
        'win_amount' => 'required|numeric',
        'multipler' => 'required|numeric',
        'status' => 'required|integer'
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
    }

    $userid = $request->userid;
    $win_amount = $request->win_amount;
    $status = $request->status;
    $multipler = $request->multipler;

    date_default_timezone_set('Asia/Kolkata');
    $datetime = now();

    // Check if user exists
    $user = DB::table('users')->where('id', $userid)->first();
    if (!$user) {
        return response()->json(['status' => 400, 'message' => 'User does not exist'], 400);
    }

    // Find the active bet
    $minegame_bet = DB::table('minegame_bet')
        ->where('userid', $userid)
        ->where('status', 0)
        ->orderBy('id', 'asc')
        ->first();

    if (!$minegame_bet) {
        return response()->json(['status' => 400, 'message' => 'No active minegame bet found for the user'], 400);
    }

    // Update the minegame bet
    DB::table('minegame_bet')
        ->where('id', $minegame_bet->id)
        ->update([
            'status' => $status,
            'multipler' => $multipler,
            'win_amount' => $win_amount,
            'updated_at' => $datetime,
        ]);

    // Increment user's wallet
    DB::table('users')
        ->where('id', $userid)
        ->update([
            'wallet' => DB::raw("wallet + $win_amount")
        ]);

    return response()->json([
        'status' => 200,
        'message' => 'CashOut successfully',
        'win_amount' => $win_amount
    ], 200);
}


public function mine_result(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $userid = $request->userid;
    $limit = $request->limit ?? 0;
    $offset = $request->offset ?? 0;

    // Build base query
    $query = DB::table('minegame_bet')
                ->where('userid', $userid)
                ->where(function ($q) {
                    $q->where('status', 1)
                      ->orWhere('status', 2);
                })
                ->orderBy('id', 'DESC');

    // Clone query for count
    $countQuery = clone $query;
    $count = $countQuery->count();

    // Apply pagination if needed
    if ($limit > 0) {
        $data = $query->offset($offset)->limit($limit)->get();
    } else {
        $data = $query->get();
    }

    if (!$data->isEmpty()) {
        return response()->json([
            'status' => 200,
            'message' => 'Success',
            'count' => $count,
            'data' => $data
        ], 200);
    } else {
        return response()->json([
            'status' => 200,
            'message' => 'No data found'
        ], 200);
    }
}

public function mine_multiplier() 
{
    $multipliers = DB::table('mine_multipliers')
                ->select('id','name', 'multiplier')
                ->get(); // Use the Card model to fetch all records

    if ($multipliers->isNotEmpty()) { // Check if the collection is not empty
        $response['status'] = 200;
        $response['data'] = $multipliers;
    } else {
        $response['status'] = "400";
        $response['data'] = [];
    }

    return response()->json($response);
}

public function plinkoBet(Request $request)
{
//     $bettingDisabled = true; // Set to true to disable, false to enable.

// if ($bettingDisabled) {
//     return response()->json(['status' => 400, 'message' => 'Betting is currently disabled. Please update your APK from the website.']);
// }

    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'game_id' => 'required',
        'amount' => 'required|numeric|min:0.1',
        'type' => 'required',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    $userid = $request->userid;
	//$update_wallet = jilli::update_user_wallet($userid);
    $gameid = $request->game_id;
    $amount = $request->amount; 
    $type = $request->type; 
	date_default_timezone_set('Asia/Kolkata');
    $datetime = date('Y-m-d H:i:s');
    $orderid = date('YmdHis') . rand(11111, 99999);
    $tax = 0.00;
    $commission = $amount * $tax; // Calculate commission
    $betAmount = $amount - $commission;
    $userWallet = DB::table('users')->where('id', $userid)->value('wallet');
   if($amount >= 0.1){
       
    // DB::table('plinko_bet')->where('userid', $userid)->where('status', 0)->where('multipler', 0)->where('indexs', 0)->delete();
       
   $alreadyBet = DB::table('plinko_bets')->where('userid', $userid)->where('status', 0)->orderBy('id', 'DESC')->first();

    if (empty($alreadyBet)) {
        if ($userWallet >= $amount) {
           $plinkoBetId =  DB::table('plinko_bets')->insertGetId([
                'amount' => $amount,
                'game_id' => $gameid,
                'type' => $type,
                'userid' => $userid,
                'status' => 0,
                'created_at' => $datetime,
                'tax' => $tax,
                'after_tax' => $betAmount,
                'orderid' => $orderid
            ]);
            
            

            DB::update("UPDATE users SET wallet = wallet - $amount WHERE id = $userid");
			//$deduct_jili = jilli::deduct_from_wallet($userid,$amount);
			
           $plinkoBet = DB::table('plinko_bets')->where('id',$plinkoBetId)->first();
            return response()->json(['status' => 200, 'message' => 'Bet placed successfully', 'data'=>$plinkoBet ], 200);
        } else {
            return response()->json(['status' => 400, 'message' => 'Insufficient balance'], 400);
        }
    } else {
       
        return response()->json(['status' => 400, 'message' => 'Already Bet placed'], 400);
         
    }
} else {
    return response()->json(['status' => 400, 'message' => 'Bet placed minimum 0.1 rupees'], 400);
}

}

public function plinkoBet_new(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'game_id' => 'required',
        'amount' => 'required|numeric|min:0',
        'type' => 'required',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    $userid = $request->userid;
	//$update_wallet = jilli::update_user_wallet($userid);
    $gameid = $request->game_id;
    $amount = $request->amount; 
    $type = $request->type; 
	date_default_timezone_set('Asia/Kolkata');
    $datetime = date('Y-m-d H:i:s');
    $orderid = date('YmdHis') . rand(11111, 99999);
    $tax = 0.00;
    $commission = $amount * $tax; // Calculate commission
    $betAmount = $amount - $commission;
    $userWallet = DB::table('users')->where('id', $userid)->value('wallet');
   if($amount >= 10){
       
    // DB::table('plinko_bet')->where('userid', $userid)->where('status', 0)->where('multipler', 0)->where('indexs', 0)->delete();
       
   $alreadyBet = DB::table('plinko_bets')->where('userid', $userid)->where('status', 0)->orderBy('id', 'DESC')->first();

    if (empty($alreadyBet)) {
        if ($userWallet >= $amount) {
           $plinkoBetId =  DB::table('plinko_bets')->insertGetId([
                'amount' => $amount,
                'game_id' => $gameid,
                'type' => $type,
                'userid' => $userid,
                'status' => 0,
                'created_at' => $datetime,
                'tax' => $tax,
                'after_tax' => $betAmount,
                'orderid' => $orderid
            ]);
            
            

            DB::update("UPDATE users SET wallet = wallet - $amount WHERE id = $userid");
			//$deduct_jili = jilli::deduct_from_wallet($userid,$amount);
			
           $plinkoBet = DB::table('plinko_bets')->where('id',$plinkoBetId)->first();
            return response()->json(['status' => 200, 'message' => 'Bet placed successfully', 'data'=>$plinkoBet ], 200);
        } else {
            return response()->json(['status' => 400, 'message' => 'Insufficient balance'], 400);
        }
    } else {
       
        return response()->json(['status' => 400, 'message' => 'Already Bet placed'], 400);
         
    }
} else {
    return response()->json(['status' => 400, 'message' => 'Bet placed minimum 10 rupees'], 400);
}

}	
	
public function plinko_index_list(Request $request)
  {
    $validator = Validator::make($request->all(), [
        'type' => 'required',
    ]);

    $validator->stopOnFirstFailure();
    
    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }
    
    $type = $request->type;
    
    $data = DB::table('plinko_index_lists')
        ->where('type', $type)
        ->get();

    if (!$data->isEmpty()) {  
        return response()->json([
            'status' => 200,
            'message' => 'Success',
            'data' => $data
        ], 200);
    } else {
        return response()->json([
            'status' => 400,
            'message' => 'No data found'
        ], 400);
    }
}

	public function plinko_multiplier(Request $request)
{
    
    $validator = Validator::make($request->all(), [
        'userid' => 'required|integer',
        'index' => 'required|integer',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
    }

    $userid = $request->userid;
    $index = $request->index;
	date_default_timezone_set('Asia/Kolkata');	
    $datetime = date('Y-m-d H:i:s');

    $plinko_bet = DB::table('plinko_bets')
        ->where('userid', $userid)
        ->where('Status', 0)
        ->orderBy('id', 'asc')
        ->first();

    if (!$plinko_bet) {
        return response()->json(['status' => 400, 'message' => 'No active plinko bet found for the user'], 400);
    }

    $bet_amount = $plinko_bet->amount;
    $type = $plinko_bet->type;


    $index_multiplier = DB::table('plinko_index_lists')
        ->where('type', $type)
        ->where('indexs', $index)
        ->first();


    if (empty($index_multiplier)) {
        DB::table('plinko_bets')
            ->where('id', $plinko_bet->id)
            ->update(['Status' => 2, 'indexs' => $index, 'multipler' => 'out', 'win_amount' => 0]);

        return response()->json([
            'status' => 200,
            'message' => 'Plinko result calculated successfully',
            'win_amount' => '0'
        ], 200);
    }
    $multipler=$index_multiplier->multiplier;
  
    $win_amount = $bet_amount * $multipler;

 
    DB::table('plinko_bets')
        ->where('id', $plinko_bet->id)
        ->update(['Status' => 1, 'indexs' => $index, 'multipler' => $multipler,'win_amount' => $win_amount]);

     DB::update("UPDATE users SET wallet = wallet + $win_amount  WHERE id = $userid");
		
		///jilli///
		
		//$add_jili = jilli::add_in_jilli_wallet($userid,$win_amount);

		
		///end jilli////
		
    return response()->json([
        'status' => 200,
        'message' => 'Plinko result calculated successfully',
        'win_amount' => $win_amount
    ],200);
} 

public function plinko_result(Request $request)
{
    
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
    ]);

    
    $validator->stopOnFirstFailure();
    
    
    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }
    
   
    $userid = $request->userid;
    $limit = $request->limit??0;
	$offset = $request->offset ?? 0;


   if (empty($limit)) {
        $data = DB::table('plinko_bets')->where('userid', $userid)->where('status', 1)->orderBy('id', 'DESC')->get();
    } else {
        $data = DB::table('plinko_bets')->where('userid', $userid)->where('status', 1)->orderBy('id', 'DESC')->skip($offset)->take($limit)->get();
    }   
  
    if (!$data->isEmpty()) {  
        return response()->json([
            'status' => 200,
            'message' => 'Success',
            'data' => $data
        ], 200);
    } else {
        return response()->json([
            'status' => 400,
            'message' => 'No data found'
        ], 400);
    }
}


}
