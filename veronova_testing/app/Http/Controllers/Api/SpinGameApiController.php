<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\{spinBet,spinResult};
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

use Illuminate\Support\Facades\DB;

class SpinGameApiController extends Controller
{
   public function SpinBet(Request $request)
{
    $kolkataTime = Carbon::now('Asia/Kolkata');
    $formattedTime = $kolkataTime->toDateTimeString();

    $validator = Validator::make($request->all(), [
        'user_id' => 'required',
        'bets' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['success' => false, 'message' => $validator->errors()->first()], 200);
    }

    $testData = $request->bets;
    $userid = $request->user_id;

    $gamesno = DB::table('spin_betlogs')->value('period_no');

    foreach ($testData as $item) {
        $user_wallet = DB::table('users')->select('wallet')->where('id', $userid)->first();
        $userwallet = $user_wallet->wallet;
		//dd($userwallet);

        $gameid = $item['game_id'];
        $amount = $item['amount'];

        if ($userwallet >= $amount) {
            if ($amount >= 0.1) {
                DB::insert("INSERT INTO `spin_bets`(`user_id`, `game_id`, `amount`, `period_no`, `status`, `created_at`, `updated_at`) VALUES ('$userid','$gameid','$amount','$gamesno','0','$formattedTime','$formattedTime')");
                DB::table('users')->where('id', $userid)->update(['wallet' => DB::raw('wallet - ' . $amount)]);
            }

            $multiplier = DB::table('spin_game_settings')->where('game_id', $gameid)->value('multiplier');

            $bet_log = DB::select("SELECT * FROM spin_betlogs");
            foreach ($bet_log as $row) {
                $game_id_array = json_decode($row->game_id, true); // Decode and ensure it's an array

                if (is_array($game_id_array) && in_array($gameid, $game_id_array)) {
                    $num = $row->number;
                    $multiply_amt = $amount * $multiplier;
                    DB::update("UPDATE `spin_betlogs` SET `amount`=amount+'$multiply_amt' where number= $num");
                }
            }
        } else {
            return response()->json(['success' => false, 'message' => 'Insufficient balance'], 200);
        }
    }

    return response()->json(['success' => true, 'message' => 'Bet Accepted Successfully!'], 200);
}



public function SpinBetHistory(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|integer',
        'limit' => 'required|integer',
        'offset' => 'nullable|integer'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['success' => false, 'message' => $validator->errors()->first()], 200);
    }

    $userid = $request->user_id;
    $limit = $request->limit;
    $offset = $request->offset ?? 0;

    // Fetch bet history and calculate sums grouped by period_no
    //$bet_history = spinBet::where('user_id', $userid)
	$bet_history =DB::table('spin_bets')->where('user_id', $userid)
        ->select('period_no')
        ->selectRaw('SUM(amount) as amount, SUM(win_amount) as win_amount')
        ->groupBy('period_no')
        ->orderBy('period_no', 'DESC')
        ->offset($offset)
        ->limit($limit)
        ->get();

    // Count the total number of records
    //$total_count = spinBet::where('user_id', $userid)->count();
	$total_count = DB::table('spin_bets')->where('user_id', $userid)->count();

    if ($bet_history->isNotEmpty()) {
        return response()->json([
            'message' => 'Data found',
            'success' => true,
            'result_count' => $total_count,
            'data' => $bet_history
        ]);
    } else {
        return response()->json([
            'message' => 'No record found',
            'success' => false,
            'data' => []
        ], 200);
    }
}

 public function SpinBetResult(Request $request)
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

        $gamesno=DB::select("SELECT `period_no` FROM `spin_betlogs` LIMIT 1;");
         $period=$gamesno[0]->period_no;
         $less_no=$period-1;
         //dd($less_no);
//          $lastwin_amt=DB::select("SELECT IFNULL(SUM(spin_bets.win_amount), 0) AS win_amount
// FROM spin_bets
// JOIN spin_betlogs ON spin_bets.period_no = spin_betlogs.period_no
// WHERE spin_bets.period_no = $bet_no 
// AND spin_betlogs.period_no = $less_no
// AND spin_bets.user_id = $user_id;");
 $lastwin_amt=DB::select("SELECT SUM(`win_amount`) as win_amount FROM `spin_bets` WHERE `user_id` = $user_id AND `period_no` = $less_no");
   //dd("SELECT SUM(`win_amount`) as win_amount FROM `lucky12_bets` WHERE `user_id` = $user_id AND `period_no` = $less_no");
        $win_amt = $lastwin_amt[0]->win_amount ?? 0;
      $spinresult = DB::select("SELECT * FROM ( SELECT * FROM `spin_results` ORDER BY `id` DESC LIMIT 10 ) AS last_10_results ORDER BY `id` DESC;");
        if ($spinresult) {
            return response()->json(['success' => true, 'message' => 'Spin result latest data fatch Successfully..!' ,'win_amount' => $win_amt, 'data' => $spinresult ]);
        }
        
        return response()->json(['success' => false, 'message' => 'Spin result latest data not found..!']);

    } catch (Exception $e) {
        return response()->json(['error' => 'API request failed: ' . $e->getMessage()], 500);
    }
}


///// ////////

		public function result_store(){

			$kolkataTime = Carbon::now('Asia/Kolkata');

// Format the date and time as needed
$formattedTime = $kolkataTime->toDateTimeString();
		
			$gamesno=DB::table('spin_betlogs')->value('period_no');
			
			$admin_result=DB::table('spin_admin_results')->where('period_no',$gamesno)->orderBy('id','desc')->value('number');
			//jackpot///
			
				$jackpot = DB::table('spin_admin_results')->where('period_no', $gamesno)->value('jackpot');
            // Set a default value in case $jackpot is null
            $jackpots = $jackpot !== null ? $jackpot : 1;
			
			//// end. jackpot///
			
			//$admin_result=null;
			$given_amount=1000000;
			$result=DB::select("SELECT 
    SUM(`amount`) AS total_amount,
    MIN(`amount`) AS min_amount,
    MAX(`amount`) AS max_amount
FROM `spin_betlogs`");
			$total_amt=$result[0]->total_amount;
			$min_amt=$result[0]->min_amount;
			$max_amt=$result[0]->max_amount;
			//dd($result);
			if(!($admin_result == null)){
			$number=$admin_result;
				$results=DB::Select("SELECT * FROM `spin_betlogs` WHERE `number`=$number");
				$game_idd=json_decode($results[0]->game_id);
				//dd($game_idd);
			}elseif($total_amt == 0){
			$result1=DB::select("SELECT *
                   FROM `spin_betlogs`
					WHERE `amount` <= (
						SELECT MIN(`amount`)
						FROM `spin_betlogs`
					)
					ORDER BY RAND()
					LIMIT 1");
				//dd($result1);
			$number=$result1[0]->number;
				$game_idd=json_decode($result1[0]->game_id);
			
			}elseif($total_amt <= $given_amount){
			$result2=DB::select("SELECT *
						FROM `spin_betlogs`
						WHERE `amount` <= $given_amount
						ORDER BY RAND()
						LIMIT 1");
			$number=$result2[0]->number;
				$game_idd=json_decode($result2[0]->game_id);
			}else{
			$result3=DB::Select("SELECT * FROM `spin_betlogs` ORDER BY `amount` ASC LIMIT 1");
				$number=$result3[0]->number;
				$game_idd=json_decode($result3[0]->game_id);
			//dd($number);
			}
			
			$bet_details= DB::select("SELECT * FROM `spin_bets` WHERE `period_no`=$gamesno");
			foreach($bet_details as $item){
				$game_ids=$item->game_id;
				$bet_ids=$item->id;
				$userid=$item->user_id;
				$amounts=$item->amount;
				
			$multiplier=DB::table('spin_game_settings')->where('game_id',$game_ids )->value('multiplier');
				$total_multy_amount=$amounts*$multiplier;
				/// jackpot multiplier ///
				$total_multy_amt= $total_multy_amount  * $jackpots;
				/// end jackpot multiplier////
				
           if($game_ids == $game_idd){
		   DB::table('users')->where('id',$userid)->update(['wallet'=>DB::raw("wallet+$total_multy_amt")]);
			   DB::table('spin_bets')->where('id',$bet_ids)->update(['win_amount'=>$total_multy_amt,'status'=>1,'win_number'=>$number]);
		   }else{
		    DB::table('spin_bets')->where('id',$bet_ids)->update(['status'=>2,'win_number'=>$number]);

		   }
				
			}
	
		$red_black=DB::Select("SELECT * FROM `spin_game_settings` WHERE number=$number && game_id IN(45,46)");
			if($red_black ){
			$game_ids=$red_black[0]->game_id;
        
		if($game_ids == 45){
			$status = 0;
		}else if($game_ids == 46){
			$status = 1;
		}
			}
			else{
			$status = 2;
		}
			//dd($red_black);
			  $index=DB::select("SELECT `index` FROM `spin_index` WHERE `game_no`=$number;");
			  $number_index=$index[0]->index;
	     
					$store=DB::select("INSERT INTO `spin_results`( `period_no`, `win_number`,`win_index`,`jackpot`,`status`, `time`) VALUES ('$gamesno','$number','$number_index','$jackpots','$status','$formattedTime')");
		
			DB::table('spin_betlogs')->update(['amount'=>0,'period_no'=>DB::raw("period_no+1")]);
		 $this->amountdistribution($gamesno,$number,$jackpots);
		 
      
}
	
	
	 private function amountdistribution($gamesno,$number,$jackpots)
    {
        //dd($number);
        //dd($gamesno);
       //dd("hii");
        $amounts = DB::select("SELECT `amount`, `game_id` FROM `spin_bets` WHERE `period_no` = ?", [$gamesno]);
        //dd($amounts);
        if (empty($amounts)) {
    // Data is empty, handle it here
    //echo "No data found for the given period.";
} else {
    // Data is available, process it
   // dd($amounts);

		 foreach ($amounts as $item) {
        $gameid = $item->game_id;
        //dd($gameid);
        //echo "$gameid"; echo "<br>";
        $amount = $item->amount;
        //dd($gameid);
$multiplierResult = DB::select("SELECT `multiplier`,`number` FROM `spin_game_settings` WHERE `game_id` = ?", [$gameid]);
//dd($multiplierResult);
//print_r($multiplierResult);
//$win_number=[];
        foreach ($multiplierResult as $winamount) {
            
            $multiple = $winamount->multiplier;
            $total_multy_amount = $amount * $multiple;
            
            	/// jackpot multiplier ///
				$total_multiply= $total_multy_amount  * $jackpots;
				/// end jackpot multiplier//// 
				
            //dd($total_multiply);
            $win_number=$winamount->number;
            //echo "$win_number";
            
            //dd($win_number,$total_multiply,$multiplierResult,$gameid,$number);
            if(!empty($win_number)){
				
				if($number == $win_number){
				$he	= DB::select("UPDATE spin_bets SET win_amount =$total_multiply,win_number= $number,status=1 WHERE period_no='$gamesno' && game_id=  '$win_number' ");
			     //dd($he);
				}
            }
            
		}
		 }
                $uid = DB::select("SELECT  win_amount,  user_id FROM spin_bets where win_number>=0 && period_no='$gamesno' && game_id=  '$number' ");
                //dd($uid);
        foreach ($uid as $row) {
             $amount = $row->win_amount;
            $userid = $row->user_id;
      $useramt= DB::update("UPDATE users SET wallet = wallet + $total_multiply WHERE id = $userid");
        //dd($useramt);
        }

          DB::select("UPDATE spin_bets SET status=2 ,win_number= '$number' WHERE period_no='$gamesno' && game_id=  '$gameid' &&  status=0 && win_amount=0");

}
    }
    
 public function getLatestBetLogsAmount()
{
    // Fetch all relevant data from lucky12_betlogs for numbers 1 to 12
    $betLogs = DB::table('spin_betlogs')
                 ->select('number', 'amount')
                 ->whereIn('number', range(1, 12)) // Fetch for numbers 1 to 12
                 ->get();

    return response()->json($betLogs);
}


 public function getLatestBetLogs()
{
    // Fetch the latest data from the lucky12_betlogs table
    $latestBetLogs = DB::table('spin_betlogs')
                        ->select('period_no')
                        ->orderBy('updated_at', 'desc')
                        ->first(); // first() fetches the latest record

    return response()->json($latestBetLogs);
}

public function auto_spin_ad_result_insert(Request $request){
        $period_number = $request->period_num;
        $card_number = $request->card_number;
        $up = DB::table('spin_admin_results')->insert(['period_no'=>$period_number,'number'=>$card_number]);
        if($up){
            return response()->json(['status'=>200,'message'=>'prediction stored successfully.']);
        }else{
             return response()->json(['status'=>400,'message'=>'something went wrong!']);
        }
    }


public function admin_prediction4(Request $request){
        
        $request->validate([
            'game_no' => 'required|unique:admin_results|max:10',
            'number' => 'required',
        ]);
        
          $custom_date_time= $request->custom_result_date_time;
          if($custom_date_time){
              $custom_date_time = date('Y-m-d H:i:s', strtotime($custom_date_time));
          }
       // dd($custom_date_time);
          $result_time = $request->result_time;
          $number = $request->number;
          $game_no = $request->period_no;
          $prediction_insert = DB::table('admin_results')->insert(['card_number'=>$number,'result_time'=>$result_time ?? now(),
          'game_no' => $game_no
          ]);
          
          if($prediction_insert){
              return redirect()->back()->with('success','Result Inserted Successfully');
          }else{
              return redirect()->back()->with('error','Result Inserted Successfully');
          }
          
    }


}
