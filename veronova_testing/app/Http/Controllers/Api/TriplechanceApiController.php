<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

use Illuminate\Support\Facades\DB;

class TriplechanceApiController extends Controller
{

 public function triplechance_bet(Request $request)
{
    $kolkataTime = Carbon::now('Asia/Kolkata');
    $formattedTime = $kolkataTime->toDateTimeString();

    $validator = Validator::make($request->all(), [
        'user_id' => 'required',
        'bets' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
    }

    $testData = $request->bets;
    $userid = $request->user_id;

    $gamesno = DB::table('triplechance_bet_logs')->value('games_no');

    foreach ($testData as $item) {
        $user_wallet = DB::table('users')->select('wallet')->where('id', $userid)->first();
        $userwallet = $user_wallet->wallet;

        $gameid = $item['game_id'];
        $amount = $item['amount'];
        $wheel_no = $item['wheel_no'];

        if ($userwallet >= $amount) {
            if ($amount >= 1) {
                DB::insert("INSERT INTO `triplechance_bets`(`user_id`, `game_id`, `amount`,`wheel_no`, `games_no`, `status`, `created_at`, `updated_at`) VALUES ('$userid','$gameid','$amount','$wheel_no','$gamesno','0','$formattedTime','$formattedTime')");
                DB::table('users')->where('id', $userid)->update(['wallet' => DB::raw('wallet - ' . $amount)]);
            }

            $multiplier = DB::table('triplechance_game_settings')->where('game_id', $gameid)->value('multiplier');

            $bet_log = DB::select("SELECT * FROM triplechance_bet_logs");
             foreach ($bet_log as $row) {
                $game_id_array = json_decode($row->game_id);
                
     $num=$row->number;
            $multiply_amt = $amount * $multiplier;
                if ($gameid == $game_id_array) {
                  
                    DB::update("UPDATE `triplechance_bet_logs` SET `amount`=amount+'$multiply_amt' where number= $num");
                }
            }
        } else {
            return response()->json(['status' => 400, 'message' => 'Insufficient balance'], 200);
        }
    }

    return response()->json(['status' => 200, 'message' => 'Bet Accepted Successfully!'], 200);
}

 public function triplechanceBetHistory(Request $request)
{
		$validator = Validator::make($request->all(), [
        'user_id' => 'required',
	    'limit' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()],200);
    }
		    $userid = $request->user_id;
		$limit = $request->limit;
     $offset = $request->offset ?? 0;
		
		$where = [];

    if (!empty($game_id)) {
        $where[] = "triplechance_bets.user_id = '$userid'";
    }
    $query = "SELECT * FROM `triplechance_bets`";

    if (!empty($where)) {
        $query .= " WHERE " . implode(" AND ", $where);
    }

    $query .= " ORDER BY triplechance_bets.games_no DESC LIMIT $offset,$limit";

    $bet_history = DB::select($query);
     
	//$bet_history=DB::select("SELECT g.games_no AS games_no, g.number AS number, COALESCE(b.game_id, '') AS game_id, COALESCE(b.amount, '') AS amount,COALESCE(b.win_amount, '') AS win_amount FROM green_36_results g LEFT JOIN bets b ON g.games_no = b.games_no AND b.user_id = 1 ORDER BY g.games_no DESC LIMIT 10");
		$result_count=DB::select("SELECT COUNT(`id`) as id FROM `triplechance_bets`");
		$total_count=$result_count[0]->id;
		 if ($bet_history) {
            $response = [
                'message' => 'data found',
                'success' => true,
				'result_count'=>$total_count,
                'history_triplechance' => $bet_history
            ];

            return response()->json($response);
        } else {
            return response()->json(['message' => 'No record found', 'success' => false,
                'data' => []], 200);
        }
	}

public function triplechanceBetResult(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['success' => false, 'message' => $validator->errors()->first()], 200);
    }

   
    $user_id = $request->user_id;
    try {
         $gamesno=DB::select("SELECT `games_no` FROM `triplechance_bet_logs` LIMIT 1;");
         $period=$gamesno[0]->games_no;
          $less_no=$period-1;
        $lastwin_amt=DB::select("SELECT SUM(`win_amount`) as win_amount FROM `triplechance_bets` WHERE `user_id` = $user_id AND `games_no` = $less_no");
         //$lastwin_amt = DB::select("SELECT COALESCE(SUM(`win_amount`), 0) AS total_win_amount  FROM `triplechance_bets` WHERE `games_no` = ? AND `user_id` = ?", [$less_no, $user_id]);
    $f_s_t_amount=DB::select("SELECT 
          SUM(CASE 
                WHEN LENGTH(CAST(`win_number` AS CHAR)) = 1 THEN `win_amount`
                ELSE 0 
              END) AS `first_wheel_amount`,
          
          SUM(CASE 
                WHEN LENGTH(CAST(`win_number` AS CHAR)) = 2 THEN `win_amount`
                ELSE 0 
              END) AS `second_wheel_amount`,
          
          SUM(CASE 
                WHEN LENGTH(CAST(`win_number` AS CHAR)) = 3 THEN `win_amount`
                ELSE 0 
              END) AS `third_wheel_amount`
        FROM `triplechance_bets` 
        WHERE `games_no` = ? AND `user_id` = ?", [$less_no, $user_id]);
        
        $first_wheel_amount=$f_s_t_amount[0]->first_wheel_amount ?? 0;
        $second_wheel_amount=$f_s_t_amount[0]->second_wheel_amount ?? 0;
        $third_wheel_amount=$f_s_t_amount[0]->third_wheel_amount ?? 0;

        $win_amt = $lastwin_amt[0]->win_amount ?? 0;
        //dd($lastwin_amt);
      $spinresult = DB::select("SELECT * FROM `triplechance_results` ORDER BY `triplechance_results`.`id` DESC LIMIT 10;");
        if ($spinresult) {
            return response()->json(['success' => true, 'message' => 'TripleChance result latest data fatch Successfully..!' ,'win_amount' => $win_amt,'first_wheel_amount' =>$first_wheel_amount,'second_wheel_amount' => $second_wheel_amount,'third_wheel_amount' => $third_wheel_amount, 'result_triple_chance' => $spinresult ]);
        }
        
        return response()->json(['success' => false, 'message' => 'TripleChance result latest data not found..!']);

    } catch (Exception $e) {
        return response()->json(['error' => 'API request failed: ' . $e->getMessage()], 500);
    }
}

public function triplechance_win_amount(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'success' => false,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 200);
    }
    
    // Get the first `games_no` value
    $gamesno = DB::select("SELECT `games_no` FROM `triplechance_bet_logs` ORDER BY `games_no` ASC LIMIT 1");
    
    // Check if the gamesno query returns a result
    if (empty($gamesno)) {
        return response()->json(['message' => 'No games found', 'success' => false]);
    }
    
    $game_no = $gamesno[0]->games_no;

    // Get the bet details for the user and the current game number
    $userid = $request->user_id;
    $bet_amount = DB::select("SELECT COALESCE(SUM(`win_amount`), 0) AS total_win_amount  FROM `triplechance_bets` WHERE `games_no` = ? AND `user_id` = ?", [$game_no, $userid]);
    $f_s_t_amount=DB::select("SELECT 
          SUM(CASE 
                WHEN LENGTH(CAST(`win_number` AS CHAR)) = 1 THEN `win_amount`
                ELSE 0 
              END) AS `first_wheel_amount`,
          
          SUM(CASE 
                WHEN LENGTH(CAST(`win_number` AS CHAR)) = 2 THEN `win_amount`
                ELSE 0 
              END) AS `second_wheel_amount`,
          
          SUM(CASE 
                WHEN LENGTH(CAST(`win_number` AS CHAR)) = 3 THEN `win_amount`
                ELSE 0 
              END) AS `third_wheel_amount`
        FROM `triplechance_bets` 
        WHERE `games_no` = ? AND `user_id` = ?", [$game_no, $userid]);
        
        $first_wheel_amount=$f_s_t_amount[0]->first_wheel_amount ?? 0;
        $second_wheel_amount=$f_s_t_amount[0]->second_wheel_amount ?? 0;
        $third_wheel_amount=$f_s_t_amount[0]->third_wheel_amount ?? 0;

    // Retrieve win_amount and win_number, handle 0 win_amount case
    $total_win_amount = $bet_amount[0]->win_amount ?? 0; // Default to 0 if not found

    // Return the result
    return response()->json([
        'message' => 'Successfully retrieved win data',
        'success' => true,
        'total_win_amount' => $total_win_amount,
        'first_wheel_amount' => $first_wheel_amount,
        'second_wheel_amount' => $second_wheel_amount,
        'third_wheel_amount' => $third_wheel_amount
    ]);
}

public function tc_result_store()
{
     $kolkataTime = Carbon::now('Asia/Kolkata');
    $formattedTime = $kolkataTime->toDateTimeString();

     $games_no=DB::table('triplechance_bet_logs')->value('games_no');
     
     $admin_result=DB::table('triplechance_admin_winner_result')->where('game_no',$games_no)->orderBy('id','desc')->value('number');
     //jackpot//
				// $jackpot = DB::table('triplechance_results')->where('period_no', $gamesno)->value('jackpot');
            // Set a default value in case $jackpot is null
            // $jackpots = $jackpot !== null ? $jackpot : 1;
			
			//// end. jackpot///
    $sum_amount = DB::table('triplechance_bets')->where('games_no',$games_no)->sum('amount');
    $winning_amt=$sum_amount *0.70;
    $rand_game_id = DB::table('triplechance_bet_logs')
    ->where('amount', '<=', $winning_amt)
    ->inRandomOrder()
    ->value('game_id');
    $x = $rand_game_id;
    $digit_count = strlen(strval($x));
     $arr = str_split(strval($x));
//      if(!($admin_result == null)){
// 			$number=$admin_result;
// 				$results=DB::Select("SELECT * FROM `triplechance_bet_logs` WHERE `number`=$number");
// 				$game_idd=json_decode($results[0]->game_id);
// 				//dd($game_idd);
// 			}
			if($digit_count==1){
         $third_wheel_number = $arr[0];
         $second_wheel_number = "0";
         $first_wheel_number = "0";
     }elseif($digit_count==2){
         $third_wheel_number = $arr[1];
         $second_wheel_number = $arr[0];
         $first_wheel_number = "0";
     }elseif($digit_count==3){
         $third_wheel_number = $arr[2];
         $second_wheel_number = $arr[1];
         $first_wheel_number = $arr[0];
     }
  
           $index1=DB::select("SELECT `index` FROM `triplechance_wheel_index` WHERE `value`=$first_wheel_number;");
			  $first_index=$index1[0]->index;
			  
			  $index2=DB::select("SELECT `index` FROM `triplechance_wheel_index` WHERE `value`=$second_wheel_number;");
			  $second_index=$index2[0]->index;
			  
			  $index3=DB::select("SELECT `index` FROM `triplechance_wheel_index` WHERE `value`=$third_wheel_number;");
			  $third_index=$index3[0]->index;
     
     //echo"$first_wheel_number";
     
     //dd($third_wheel_number,$third_index,$second_wheel_number,$second_index,$first_wheel_number,$first_index);
     
          DB::select("INSERT INTO `triplechance_results`(`games_no`, `wheel1_index`, `wheel1_result`, `wheel2_index`, `wheel2_result`, `wheel3_index`, `wheel3_result`,`jackpot`, `status`,`time`) VALUES ('$games_no','$first_index','$first_wheel_number','$second_index','$second_wheel_number','$third_index','$third_wheel_number','0','1','$formattedTime')");
     
    
    $bet_details = DB::table('triplechance_bets')
    ->where('games_no', $games_no)
    ->where('game_id', $first_wheel_number)
    ->where('wheel_no', 1)
    ->get();

// Check if the collection is not empty
if (!$bet_details->isEmpty()) {
    foreach ($bet_details as $item) {
        $userid = $item->user_id;
        $amounts = $item->amount * 9;
       // echo "$userid , $amounts";
        
        // Update the user's wallet
        DB::table('users')->where('id', $userid)->update([
            'wallet' => DB::raw("wallet + $amounts")
        ]);
        
        // Update the bet details
        DB::table('triplechance_bets')
            ->where('status', 0)
            ->where('wheel_no', 1)
            ->where('game_id', $first_wheel_number)
            ->where('games_no', $games_no)
            ->update([
                'win_amount' => $amounts,
                'status' => 1,
                'win_number' => $first_wheel_number
            ]);
    }
} 
    $bet_details2 = DB::table('triplechance_bets')
    ->where('games_no', $games_no)
    ->whereIn('game_id', [$first_wheel_number, $second_wheel_number])
    ->where('wheel_no', 2)
    ->get();

// Check if the collection is not empty
if (!$bet_details2->isEmpty()) {
    foreach ($bet_details2 as $item) {
        $userid = $item->user_id;
        $amounts = $item->amount * 90;

        // Update the user's wallet
        DB::table('users')->where('id', $userid)->update([
            'wallet' => DB::raw("wallet + $amounts")
        ]);

        // Update the bet details
        DB::table('triplechance_bets')
            ->where('status', 0)
            ->where('wheel_no', 2)
            ->whereIn('game_id', [$first_wheel_number, $second_wheel_number])
            ->where('games_no', $games_no)
            ->update([
                'win_amount' => $amounts,
                'status' => 1,
                'win_number' => $first_wheel_number . $second_wheel_number
            ]);
    }
} 

          $bet_details3 = DB::table('triplechance_bets')
    ->where('games_no', $games_no)
    ->whereIn('game_id', [$first_wheel_number, $second_wheel_number, $third_wheel_number])
    ->where('wheel_no', 3)
    ->get();

// Check if the collection is not empty
if (!$bet_details3->isEmpty()) {
    foreach ($bet_details3 as $item) {
        $userid = $item->user_id;
        $amounts = $item->amount * 900;

        // Update the user's wallet
        DB::table('users')->where('id', $userid)->update([
            'wallet' => DB::raw("wallet + $amounts")
        ]);

        // Update the bet details
        DB::table('triplechance_bets')
            ->where('status', 0)
            ->where('wheel_no', 3)
            ->whereIn('game_id', [$first_wheel_number, $second_wheel_number, $third_wheel_number])
            ->where('games_no', $games_no)
            ->update([
                'win_amount' => $amounts,
                'status' => 1,
                'win_number' => $first_wheel_number . $second_wheel_number . $third_wheel_number
            ]);
    }
}
          
               DB::table('triplechance_bets')->where('status',0)->where('games_no',$games_no)->update(['status'=>2,'win_number'=>$first_wheel_number. $second_wheel_number. $third_wheel_number]);
                  
		  
     /// end add ////
     	DB::table('triplechance_bet_logs')->update(['amount'=>0,'games_no'=>DB::raw("games_no+1")]);
     	//$this->amountdistribution($games_no,$rand_game_id);
      
   
    
}


     private function amountdistribution($games_no,$rand_game_id)
    {
        //dd($games_no);
        $amounts = DB::select("SELECT `amount`, `game_id` FROM `triplechance_bets` WHERE `games_no` = $games_no");
        //dd("SELECT `amount`, `game_id` FROM `triplechance_bets` WHERE `games_no` = $games_no");
		 foreach ($amounts as $item) {
        $gameid = $item->game_id;
        //dd($gameid);
        $amount = $item->amount;
        //dd($gameid);
$multiplierResult = DB::select("SELECT `multiplier`,`number` FROM `triplechance_game_settings` WHERE `game_id` = ?", [$gameid]);
//dd($multiplierResult);
        foreach ($multiplierResult as $winamount) {
            
            $multiple = $winamount->multiplier;
            $total_multy_amount = $amount * $multiple;
            //// jackpot multiplier ///
				$total_multiply= $total_multy_amount  * $jackpots;
				/// end jackpot multiplier////
            //dd($total_multiply);
            $win_number=$winamount->number;
            //dd($win_number);
            if(!empty($win_number)){
				
				if($number == $win_number){
				$he	= DB::select("UPDATE triplechance_bets SET win_amount =$total_multiply,win_number= $rand_game_id,status=1 WHERE period_no='$games_no' && game_id=  '$win_number' ");
			     //dd($he);
				}
            }
            
		}
		 }
		 //dd("SELECT  win_amount,  user_id FROM triplechance_bets where win_number>=0 && period_no='$games_no' && game_id=  '$win_number'");
               $uid = DB::select("SELECT  win_amount,  user_id FROM triplechance_bets where win_number>=0 && period_no='$games_no' && game_id=  '$win_number' ");
                
        foreach ($uid as $row) {
             $amount = $row->win_amount;
            $userid = $row->user_id;
      $useramt= DB::update("UPDATE users SET wallet = wallet + $total_multiply WHERE id = $userid");
        //dd($useramt);
        }
 
          DB::select("UPDATE triplechance_bets SET status=2 ,win_number= '$rand_game_id' WHERE period_no='$games_no' && game_id=  '$gameid' &&  status=0 && win_amount=0");

            
    }
    
    
    
    
    
    
    
}