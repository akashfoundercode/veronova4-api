<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;


use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;





class FuntargetApiController extends Controller
{	


public function demo_result()
{
	$kolkataTime = Carbon::now('Asia/Kolkata');
	$formattedTime = $kolkataTime->toDateTimeString();
	
    $gamesno=DB::table('fun_bet_logs')->value('games_no');

    $result = DB::select("SELECT * FROM fun_game_settings");
    if (!empty($result)) {
        $values = array_map(function($item) {
            return $item->number;
        }, $result);

        
		$datetime=now();

        // Get a random value from the $values array
        $random_key = array_rand($values);
        $random_value = $values[$random_key];

        $store=DB::select("INSERT INTO fun_results( games_no, number, time) VALUES ('$gamesno','$random_value','$formattedTime')");
		
		 //$this->amount_distributation($gamesno);
       

    } else {
        dd('No results found');
    }
}
	
	public function fun_target_bet(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required',
        'bets'=>'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()],200);
    }
    
    $datetime=date('Y-m-d H:i:s');
    
     $testData = $request->bets;
    $userid = $request->user_id;
      
    $gamesno=DB::table('fun_bet_logs')->value('games_no');
    //$gamesno=$gamesrno[0]->games_no;
		//$gamesno = !empty($game_no) ? $game_no[0]->gamesno + 1 : 1;
 
    foreach ($testData as $item) {
        $user_wallet = DB::table('users')->select('wallet')->where('id', $userid)->first();
            $userwallet = $user_wallet->wallet;
   
        $gameid = $item['game_id'];
        $amount = $item['amount'];
        if($userwallet >= $amount){
      if ($amount>=0.1) {
        DB::insert("INSERT INTO `fun_bets`(`user_id`, `game_id`, `amount`, `games_no`, `status`, `created_at`, `updated_at`) VALUES ('$userid','$gameid','$amount','$gamesno','0','$datetime','$datetime')");
            DB::table('users')->where('id', $userid)->update(['wallet' => DB::raw('wallet - ' . $amount)]);
      }
			$multiplier=DB::table('fun_game_settings')->where('game_id',$gameid )->value('multiplier');
			
			$bet_log = DB::select("SELECT * FROM fun_bet_logs ");
             foreach($bet_log as $row){
             $game_id_array = json_decode($row->game_id);
             $num=$row->number;
            $multiply_amt = $amount * $multiplier;
				if($gameid == $game_id_array) {
                     $bet_amt= DB::update("UPDATE `fun_bet_logs` SET `amount`=amount+'$multiply_amt' where number= $num");
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
        'message' => 'Bet Accepted Successfuly!',
    ]);   
    
}
	
	public function fun_bet_history(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required',
        'limit' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
    }

    $userid = $request->user_id;
    $limit = $request->limit;
    $offset = $request->offset ?? 0;

    $query = "
        SELECT 
            g.games_no AS games_no,
            g.number AS number,
            b.game_id AS game_id,
            b.amount AS amount,
            b.win_amount AS win_amount
        FROM fun_bets b
        INNER JOIN fun_results g ON b.games_no = g.games_no
        WHERE b.user_id = ?
        ORDER BY g.games_no DESC
        LIMIT ?, ?
    ";

    $bet_history = DB::select($query, [$userid, (int)$offset, (int)$limit]);

    // Get total count of user's bets (not total games)
    $count_result = DB::select("SELECT COUNT(*) as total FROM fun_bets WHERE user_id = ?", [$userid]);
    $total_count = $count_result[0]->total ?? 0;

    if ($bet_history) {
        return response()->json([
            'message' => 'data found',
            'status' => 200,
            'result_count' => $total_count,
            'data' => $bet_history
        ]);
    } else {
        return response()->json([
            'message' => 'No record found',
            'status' => 400,
            'data' => []
        ], 200);
    }
}

	

	
	public function fun_last10_result()
{
    // Get the last 10 results
    $last_result = DB::select("SELECT * FROM fun_results ORDER BY id DESC LIMIT 10");
    
    // Check if there are results
    if (count($last_result) > 0) {
        $data = [];

        foreach ($last_result as $result) {
            // Assuming $result is an array, access its elements accordingly
            $number = $result->number;
            $number_index = DB::select("SELECT `index` FROM `fun_wheel` WHERE game_id = $number");
            
            // Check if the number_index query returned a result
            $index = count($number_index) > 0 ? $number_index[0]->index : null;

            $data[] = [
                'id' => $result->id,
                'game_id' => $result->game_id,
                'games_no' => $result->games_no,
                'number' => $result->number,
                'status' => $result->status,
                'time' => $result->time,
                'index' => $index
            ];
        }

        $response = [
            'message' => 'Data found',
            'status' => 200,
            'data' => $data
        ];
    } else {
        $response = [
            'message' => 'No record found',
            'status' => 400,
            'data' => []
        ];
    }

    return response()->json($response);
}

	
	//// Win_amount Function /////
	
		public function fun_win_amount(Request $request)
      {
		  $validator = Validator::make($request->all(), [
        'user_id' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'status' => 400,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 200);
    }

    $userid = $request->user_id;
 
		  //$bet_amount=DB::select("SELECT g.games_no AS games_no, g.number AS number, COALESCE(b.amount, 0) AS amount, SUM(COALESCE(b.win_amount, 0)) OVER (PARTITION BY g.games_no) AS total_win_amount, CASE WHEN COALESCE(b.amount, 0) = 0 THEN 1 WHEN COALESCE(b.amount, 0) > 0 AND COALESCE(b.win_amount, 0) = 0 THEN 2 WHEN COALESCE(b.amount, 0) > 0 AND COALESCE(b.win_amount, 0) > 0 THEN 3 END AS status FROM fun_results g LEFT JOIN fun_bets b ON g.games_no = b.games_no AND b.user_id = $userid ORDER BY g.games_no DESC LIMIT 1;");
		  $bet_amount=DB::select("SELECT g.games_no AS games_no, g.number AS number, COALESCE(SUM(b.amount), 0) AS amount, COALESCE(SUM(b.win_amount), 0) AS total_win_amount FROM fun_results g LEFT JOIN fun_bets b ON g.games_no = b.games_no AND b.user_id = $userid GROUP BY g.games_no, g.number ORDER BY g.games_no DESC LIMIT 1;
");
//dd($bet_amount);
	
		$total_win_amount=$bet_amount[0]->total_win_amount;
		//$amount=$bet_amount[0]->amount;
			$win_number=$bet_amount[0]->number;
			//$status=$bet_amount[0]->status;
		    //dd($win_number);
        if ($bet_amount) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'win_amount' => $total_win_amount,
				'win_number' => $win_number,
				'game_status'=>1
            ];

            return response()->json($response);
        } else {
            return response()->json(['message' => 'No record found', 'status' => 400,
                'data' => []], 200);
        }
    }
	
	
	///// Result And Amount Distributation /////
	
	
	public function fun_result()
{
			$kolkataTime = Carbon::now('Asia/Kolkata');
            $formattedTime = $kolkataTime->toDateTimeString();
			
			$gamesno=DB::table('fun_bet_logs')->value('games_no');
			$admin_result = DB::table('fun_admin_result')->where('games_no',$gamesno)->orderBy('id','desc')->value('number');
		
			//$admin_result=null;
			$given_amount=1000000;
			$result=DB::select("SELECT 
    SUM(`amount`) AS total_amount,
    MIN(`amount`) AS min_amount,
    MAX(`amount`) AS max_amount
FROM `fun_bet_logs`");
			$total_amt=$result[0]->total_amount;
			$min_amt=$result[0]->min_amount;
			$max_amt=$result[0]->max_amount;
			
			if(!($admin_result == null)){
			$number=$admin_result;
				$results=DB::Select("SELECT * FROM `fun_bet_logs` WHERE `number`=$number");
				$game_idd=json_decode($results[0]->game_id);
				//dd($game_idd);
			}elseif($total_amt == 0){
			$result1=DB::select("SELECT *
                   FROM `fun_bet_logs`
					WHERE `amount` <= (
						SELECT MIN(`amount`)
						FROM `fun_bet_logs`
					)
					ORDER BY RAND()
					LIMIT 1");
			$number=$result1[0]->number;
				$game_idd=json_decode($result1[0]->game_id);
			
			}elseif($total_amt <= $given_amount){
			$result2=DB::select("SELECT *
						FROM `fun_bet_logs`
						WHERE `amount` <= $given_amount
						ORDER BY RAND()
						LIMIT 1");
			$number=$result2[0]->number;
				$game_idd=json_decode($result2[0]->game_id);
			}else{
			$result3=DB::Select("SELECT * FROM `fun_bet_logs` ORDER BY `amount` ASC LIMIT 1");
				$number=$result3[0]->number;
				$game_idd=json_decode($result3[0]->game_id);
				//dd($game_idd);
			//dd($number);
			}
			
			$bet_details= DB::select("SELECT * FROM `fun_bets` WHERE `games_no`=$gamesno");
			foreach($bet_details as $item){
				$game_ids=$item->game_id;
				//dd($game_ids,$game_idd);
				$bet_ids=$item->id;
				$userid=$item->user_id;
				$amounts=$item->amount;
				
			$multiplier=DB::table('fun_game_settings')->where('game_id',$game_ids )->value('multiplier');
				$total_multy_amt=$amounts*$multiplier;
				
           if($game_ids == $game_idd){
		   DB::table('users')->where('id',$userid)->update(['wallet'=>DB::raw("wallet+$total_multy_amt")]);
			   DB::table('fun_bets')->where('id',$bet_ids)->update(['win_amount'=>$total_multy_amt,'status'=>1,'win_number'=>$number]);
		   }else{
		    DB::table('fun_bets')->where('id',$bet_ids)->update(['status'=>2,'win_number'=>$number]);

		   }
				
			}
	
					$store=DB::select("INSERT INTO `fun_results`( `games_no`, `number`,`status`, `time`) VALUES ('$gamesno','$number','1','$formattedTime')");
		
			DB::table('fun_bet_logs')->update(['amount'=>0,'games_no'=>DB::raw("games_no+1")]);
		 //$this->amount_distributation($gamesno);
      
}


    public function takeAmount(Request $request)
    {
        $validator = Validator::make($request->all(), [
        'user_id' => 'required|numeric',
        'amount' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'status' => 400,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 200);
    }

    $userid = $request->user_id;
    $amount = $request->amount;
    
        $add_amount=DB::table('users')->where('id',$userid)->update(['wallet'=>DB::raw("wallet+$amount")]);
        
        if ($add_amount) {
            $response = [
                'message' => 'Amount Added Successfully',
                'status' => 200,
                'amount' => $amount,
            ];

            return response()->json($response);
        } else {
            return response()->json(['message' => 'Amount Not Added, Something Went Wrong', 'status' => 400]);
        }
        
    }
	
	
	
	
	public function getLatestBetLogsAmount()
{
    // Fetch all relevant data from lucky12_betlogs for numbers 1 to 12
    $betLogs = DB::table('fun_bet_logs')
                 ->select('number', 'amount')
                 ->whereIn('number', range(1, 12)) // Fetch for numbers 1 to 12
                 ->get();

    return response()->json($betLogs);
}


 public function getLatestBetLogs()
{
    // Fetch the latest data from the lucky12_betlogs table
    $latestBetLogs = DB::table('fun_bet_logs')
                        ->select('games_no')
                        ->orderBy('updated_at', 'desc')
                        ->first(); // first() fetches the latest record

    return response()->json($latestBetLogs);
}

public function auto_fun_ad_result_insert(Request $request){
        $period_number = $request->period_num;
        $card_number = $request->card_number;
        $up = DB::table('fun_admin_result')->insert(['games_no'=>$period_number,'number'=>$card_number]);
        if($up){
            return response()->json(['status'=>200,'message'=>'prediction stored successfully.']);
        }else{
             return response()->json(['status'=>400,'message'=>'something went wrong!']);
        }
    }


public function admin_prediction4(Request $request){
        
        $request->validate([
            'games_no' => 'required|unique:fun_admin_result|max:10',
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
          $prediction_insert = DB::table('fun_admin_result')->insert(['card_number'=>$number,'result_time'=>$result_time ?? now(),
          'game_no' => $game_no
          ]);
          
          if($prediction_insert){
              return redirect()->back()->with('success','Result Inserted Successfully');
          }else{
              return redirect()->back()->with('error','Result Inserted Successfully');
          }
          
    }


	
}
