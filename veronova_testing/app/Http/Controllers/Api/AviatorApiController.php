<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\{AviatorModel,User};
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Routing\Controller; // Add this line

class AviatorApiController extends Controller
{

    public function aviator_bet_new(Request  $request){
	   
		// game_id = 5, represents aviator game
		
		  	date_default_timezone_set('Asia/Kolkata');
           $datetime = date('Y-m-d H:i:s');
		
		
		   $validator = Validator::make($request->all(),[
		        'uid'=>'required|exists:users,id',
		        'number'=>'required',
			   'amount'=>'required',
			   'game_id'=>'required|in:5',
			   'game_sr_num'=>'required'
		   ]);
          
		   $validator->StopOnFirstFailure();
		
		  if($validator->fails()){
			  
			  return response()->json([
			  'message'=>$validator->errors()->first()
			  ]);
		  }
		 
				  
		    $uid=$request->uid;
			$amount=$request->amount;
			$sr_num=$request->game_sr_num;
			$number=$request->number;
			$game_id=$request->game_id;
		    $stop_multiplier = $request->stop_multiplier;
		    
		
		    if(!$request->stop_multiplier){
				$stop_multiplier = 0;
			}
		    
		
		 // $last_game_sr_num = DB::table('aviator_result')->where('game_id',5)->orderByDesc('id')->first();
		  
		  //dd($last_game_sr_num);
// 		 if($last_game_sr_num){
		//	 $sr_num = $last_game_sr_num->game_sr_num + 1;
			
			 $sr_num_bet = DB::table('aviator_bet')
				 ->where('game_id',5)
				  ->where('number',$number)
				 ->where('game_sr_num',$sr_num)
				 ->where('uid',$uid)
				 ->where('status',0)
				 ->first();
			 
			 if($sr_num_bet){
				 return response()->json(['status'=>400,'message'=>'Already bet created!']);
			 }else{
				$newgamesno = $sr_num;
				
			 }
			 
			 
// 		 }else{
// 			 $newgamesno = 1;
// 		 }
		   
		 
		   
		   $user = DB::table('users')->where('id',$uid)->first();
		  // $user =DB::select("SELECT * FROM users WHERE id =$uid LIMIT 1");
		   
		   if(!$user){
			   return response()->json(['status'=>400,'message'=>'Failed to get data of user!']);
		   }
		  
           $wallet = $user->wallet;
		   $winning_wallet = $user->winning_wallet;
		  
 
        //   if(!($wallet >= 10 && $wallet >=$amount)){
		   if(!($wallet >=$amount)){
			   return response()->json(['status'=>400,'message'=>'Insufficient funds!']);
		   }
		   
		   $bet = $wallet - $amount;
		   
					if ($wallet <= $winning_wallet && $amount <= $winning_wallet) {
						
				DB::table('users')->where('id', $uid)->update([
					'today_turnover' => DB::raw("today_turnover + $amount"),
					'wallet' => DB::raw("wallet - $amount"),
					'winning_wallet' => DB::raw("winning_wallet - $amount")
				]);
			} else {

					if($amount>$winning_wallet)	{
						
						DB::table('users')->where('id',$uid)->update([
						'today_turnover'=>DB::raw("today_turnover + $amount"),
							'wallet'=>DB::raw("wallet - $amount"),
							'winning_wallet'=>0
						]);
					}else{
						DB::table('users')->where('id',$uid)->update([
						 'today_turnover'=>DB::raw("today_turnover + $amount"),
							'wallet'=>DB::raw("wallet - $amount"),
							'winning_wallet' => DB::raw("winning_wallet - $amount")
						]);
					}		
			}
		
				   
		  // $color = DB::table('color_number')->where('number',90)->first();
		   
		  // if($color){
			 //  $color_name = $color->color;			   
		  // }
		   
		   /// $datetime = now();
		    $datetime = date('Y-m-d h:i:s');
		   //$gamesnum = DB::table('color_bet_log')->where('game_id',$game_id)->first();
		   $betting_fee = DB::table('admin_settings')->where('id', 10)->first();
		   
		  	   //$newgamesno =  $gamesnum->game_sr_num;
			   $percentage_bet =  $betting_fee->longtext;
		   //dd($percentage_bet);
		        $commission  = $amount*$percentage_bet;
		        $amounttrade = $amount-$commission;
	
		   		   
		   	     $betsql = DB::table('aviator_bet')->insert([
			  'uid' => $uid,
				'amount' => $amount,
				'number' => $number,
				'game_id' => $game_id,
				'totalamount' => $amounttrade,
				'color' => "Aviator",
				'game_sr_num' => $newgamesno,
				'commission' => $commission,
				'status' => 0,
			
				'stop_multiplier'=>$stop_multiplier,
				'datetime'=>$datetime,
				'created_at'=>$datetime
			 ]);
		   
		   if($betsql){
			   return response()->json(['status'=>200,'message'=>'Bet placed successfully.']);
		   }else{
			    return response()->json(['status'=>400,'message'=>'Something Went Wrong.']);
		   }
		   
		   
	   }
	
    public function aviator_bet(Request  $request){
// 	    $bettingDisabled = true; // Set to true to disable, false to enable.

// if ($bettingDisabled) {
//     return response()->json(['status' => 400, 'message' => 'Betting is currently disabled. Please update your APK from the website.']);
// }

		// game_id = 5, represents aviator game
		
		  	date_default_timezone_set('Asia/Kolkata');
           $datetime = date('Y-m-d H:i:s');
		
		
		   $validator = Validator::make($request->all(),[
		        'uid'=>'required|exists:users,id',
		        'number'=>'required',
			   'amount'=>'required',
			   'game_id'=>'required|in:5',
			   'game_sr_num'=>'required'
		   ]);
          
		   $validator->StopOnFirstFailure();
		
		  if($validator->fails()){
			  
			  return response()->json([
			  'message'=>$validator->errors()->first()
			  ]);
		  }
		$user = User::findOrFail($request->uid);
    $account_type=$user->account_type;
    // dd($account_type);
				  
		    $uid=$request->uid;
			$amount=$request->amount;
			$sr_num=$request->game_sr_num;
			$number=$request->number;
			$game_id=$request->game_id;
		    $stop_multiplier = $request->stop_multiplier;
		    
		
		    if(!$request->stop_multiplier){
				$stop_multiplier = 0;
			}
		    
		
		 // $last_game_sr_num = DB::table('aviator_result')->where('game_id',5)->orderByDesc('id')->first();
		  
		  //dd($last_game_sr_num);
// 		 if($last_game_sr_num){
		//	 $sr_num = $last_game_sr_num->game_sr_num + 1;
			
			 $sr_num_bet = DB::table('aviator_bet')
				 ->where('game_id',5)
				  ->where('number',$number)
				 ->where('game_sr_num',$sr_num)
				 ->where('uid',$uid)
				 ->where('status',0)
				 ->first();
				 //dd($sr_num_bet);
			 
			 if($sr_num_bet){
				 return response()->json(['status'=>400,'message'=>'Already bet created!']);
			 }else{
				$newgamesno = $sr_num;
				
			 }
			 
			 
// 		 }else{
// 			 $newgamesno = 1;
// 		 }
		   
		 
		   
		   $user = DB::table('users')->where('id',$uid)->first();
		  // $user =DB::select("SELECT * FROM users WHERE id =$uid LIMIT 1");
		   
		   if(!$user){
			   return response()->json(['status'=>400,'message'=>'Failed to get data of user!']);
		   }
		  
           $wallet = $user->wallet;
		   $winning_wallet = $user->winning_wallet;
		  
 
        //   if(!($wallet >= 10 && $wallet >=$amount)){
		   if(!($wallet >=$amount)){
			   return response()->json(['status'=>400,'message'=>'Insufficient funds!']);
		   }
		   
		   $bet = $wallet - $amount;
		   
					if ($wallet <= $winning_wallet && $amount <= $winning_wallet) {
						
				DB::table('users')->where('id', $uid)->update([
					'today_turnover' => DB::raw("today_turnover + $amount"),
					'wallet' => DB::raw("wallet - $amount"),
					'winning_wallet' => DB::raw("winning_wallet - $amount")
				]);
			} else {

					if($amount>$winning_wallet)	{
						
						DB::table('users')->where('id',$uid)->update([
						'today_turnover'=>DB::raw("today_turnover + $amount"),
							'wallet'=>DB::raw("wallet - $amount"),
							'winning_wallet'=>0
						]);
					}else{
						DB::table('users')->where('id',$uid)->update([
						 'today_turnover'=>DB::raw("today_turnover + $amount"),
							'wallet'=>DB::raw("wallet - $amount"),
							'winning_wallet' => DB::raw("winning_wallet - $amount")
						]);
					}		
			}
		
				   
		  // $color = DB::table('color_number')->where('number',90)->first();
		   
		  // if($color){
			 //  $color_name = $color->color;			   
		  // }
		   
		   /// $datetime = now();
		    $datetime = date('Y-m-d h:i:s');
		   //$gamesnum = DB::table('color_bet_log')->where('game_id',$game_id)->first();
		   $betting_fee = DB::table('admin_settings')->where('id', 10)->first();
		   
		  	   //$newgamesno =  $gamesnum->game_sr_num;
			   $percentage_bet =  $betting_fee->longtext;
		   //dd($percentage_bet);
		        $commission  = $amount*$percentage_bet;
		        $amounttrade = $amount-$commission;
	
		   		   
		   	     $betsql = DB::table('aviator_bet')->insert([
			  'uid' => $uid,
				'amount' => $amount,
				'number' => $number,
				'game_id' => $game_id,
				'totalamount' => $amounttrade,
				'color' => "Aviator",
				'game_sr_num' => $newgamesno,
				'commission' => $commission,
				'status' => 0,
					'account_type'=>$account_type,
				'stop_multiplier'=>$stop_multiplier,
				'datetime'=>$datetime,
				'created_at'=>$datetime
			 ]);
		   
		   if($betsql){
			   return response()->json(['status'=>200,'message'=>'Bet placed successfully.']);
		   }else{
			    return response()->json(['status'=>400,'message'=>'Something Went Wrong.']);
		   }
		   
		   
	   }

    public function aviator_cashout(Request $request){
			$requests=json_decode(base64_decode($request->salt));

	          date_default_timezone_set('Asia/Kolkata');
              $datetime = now()->format('Y-m-d H:i:s');
			
			$uid = $requests->uid;
			$multiplier = $requests->multiplier;
			$game_sr_num = $requests->game_sr_num;
			$number = $requests->number;
	//dd($uid,$multiplier,$game_sr_num,$number);
			
		$bet_details = DB::table('aviator_bet')
			->where('game_sr_num',$game_sr_num)
			->where('game_id',5)
			->where('uid',$uid)
			->where('number',$number)
			->where('status',0)
			->where('result_status',0)
			->first();
			
// 			$bet_details = DB::table('aviator_bet')
// 			->where('game_sr_num',$game_sr_num)
// 			->where('game_id',5)
// 			->where('uid',$uid)
// 			->where('number',$number)
// 			->first();
	//	dd($bet_details);
          if(!$bet_details){
			  return response()->json(['message'=>'Flew Away..!','status'=>400]);
		  }

			$amount_trade = $bet_details->totalamount;
			$win_amount = $amount_trade*$multiplier;
			//dd($win_amount);
			$update = DB::table('aviator_bet')
				->where('uid',$uid)
				->where('number',$number)
				->where('game_id',5) ////5 for aviator
				->where('status',0)
				->where('game_sr_num',$game_sr_num)
				->where('result_status',0)
				->update([
				   'status'=>1,
					'result_status'=>1,
					'multiplier'=>$multiplier,
					'win'=>$win_amount
				]);
				
			if($update){
				
	           $user_update =  DB::table('users')->where('id', $uid)->update([
                    'winning_wallet' => DB::raw('winning_wallet + ' . $win_amount),
                    'wallet' => DB::raw('wallet + ' . $win_amount),
                ]);

			  $wallet_history =  DB::table('wallet_history')->insert([
                    'userid' => $uid,
                    'amount' => $win_amount,
                    'subtypeid' =>24,   //24 for aviator
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
					
				if($user_update && $wallet_history){
					return response()->json(['message'=>"$win_amount Rs. Cashout Successfully",'status'=>200]);
				}else{
					return response()->json(['message'=>'Internal Error','status'=>400]);
				}
				
				
			}else{
				return response()->json(['message'=>'Internal Error','status'=>400]);
			}
	
			
	}

  
    public function aviator_history(Request $request)
	{
	$validator = Validator::make($request->all(), [
	            'uid'=>'required',
				'game_id' => 'required',
		       //'limit' => 'required'
		       	]);
		
    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }
	
	$userid = $request->uid;
    $game_id = $request->game_id;
    $limit = $request->limit ?? 10000;
    $offset = $request->offset ?? 0;
	$from_date = $request->created_at;
	$to_date = $request->created_at;
	//////
	

if (!empty($game_id)) {
    $where['aviator_bet.game_id'] = "$game_id";
    $where['aviator_bet.uid'] = "$userid";
}


if (!empty($from_date)) {
    
       $where['aviator_bet.created_at']="$from_date%";
  $where['aviator_bet.created_at']="$to_date%";
}

//$query = "SELECT aviator_bet.*, aviator_bet.win AS cashout_amount,aviator_bet.multiplier AS multiplier FROM aviator_bet" ;

$query = "SELECT aviator_bet.*, 
                  aviator_bet.win AS cashout_amount,
                  aviator_bet.multiplier AS multiplier,
                  aviator_result.price AS crash_point 
          FROM aviator_bet 
          LEFT JOIN aviator_result 
          ON aviator_bet.game_sr_num = aviator_result.game_sr_num";

// $query = "SELECT aviator_bet.*, 
//       aviator_bet.win AS cashout_amount,
//       aviator_bet.multiplier AS multiplier,
//       aviator_result.price AS crash_point 
// FROM aviator_bet 
// LEFT JOIN aviator_result 
//   ON aviator_bet.game_sr_num = aviator_result.game_sr_num
// WHERE aviator_bet.account_type = 0";



if (!empty($where)) {
    $query .= " WHERE " . implode(" AND ", array_map(function ($key, $value) {
        return "$key = '$value'";
    }, array_keys($where), $where));
}

 $query .= " ORDER BY id DESC  LIMIT $offset , $limit";
//////
$results = DB::select($query);
// $bets=DB::select("SELECT userid, COUNT(*) AS total_bets FROM aviator_bet WHERE `userid`=$userid GROUP BY userid
// ");
// $total_bet=$bets[0]->total_bets;
if(!empty($results)){
    ///
		//
		 return response()->json([
            'status' => 200,
            'message' => 'Data found',
            // 'total_bets' => $total_bet,
            'data' => $results
            
        ]);
         return response()->json($response,200);
}else{
    
     //return response()->json(['msg' => 'No Data found'], 400);
    $response = [
    'status' => 400,
    'message' => 'No Data found',
    'data' => $results
];

//
return response()->json($response, $response['status']);
         
    
}
		
	}


	
	public function bet_cancel(Request $request){
		
		  date_default_timezone_set('Asia/Kolkata');
              $datetime = now()->format('Y-m-d H:i:s');
		     		
          $validator = Validator::make($request->all(), [
              'userid' => 'required|exists:aviator_bet,uid',
              'number' =>'required|exists:aviator_bet,number',
              'gamesno' => 'required|exists:aviator_bet,game_sr_num'
          ]);
		   
        $validator->stopOnFirstFailure();

        if ($validator->fails()) {
            return response()->json(['status'=>400,'message'=> $validator->errors()->first()], 400);
        }
			
			$uid = $request->userid;
			$game_sr_num = $request->gamesno;
			$number = $request->number;
		
		   $user_bet_data =  DB::table('aviator_bet')->where('uid',$uid)->where('number',$number)->where('status',0)->where('game_sr_num',$game_sr_num)->first();
		//dd($user_bet_data);
		       $bet_amount = $user_bet_data->amount;
	//	dd($bet_amount);
		     $user_update =  DB::table('users')->where('id', $uid)->update([
                    'winning_wallet' => DB::raw('winning_wallet + ' . $bet_amount),
                    'wallet' => DB::raw('wallet + ' . $bet_amount),
                ]);
		
		if($user_update){
			$bet_delete = DB::table('aviator_bet')->where('uid',$uid)->where('number',$number)->where('status',0)->where('game_sr_num',$game_sr_num)->delete();
			
			if($bet_delete){
					return response()->json(['message'=>'Bet Cancel Successfully','status'=>200]);
			}else{
					return response()->json(['message'=>'Can Not Cancel Bet','status'=>200]);
			}
		}
		else{
				return response()->json(['message'=>'internal error...!','status'=>200]);
		}
		
	}
	

	
	public function  last_five_result(){
        
            $results = DB::table('aviator_result')->select('price')
     ->where('status', 1)
    ->orderByDesc('id')
    ->limit(25)
    ->get();

            if (!empty($results)) {
                $response = [
					
                    'status' => "200",
                    'message' => 'success',
					'data' => $results,
                ];
                return response()->json($response, 200);
            } else {
                $response = [
                    'status' => "400",
                    'message' => 'Data Not Found'
                ];
                return response()->json($response, 400);
            }
        

	}
	
	
	// 	public function bet_cancel(Request $request)
//     {
//         //dd($request);
//         $validator = Validator::make($request->all(),[
// 		    'userid'=>'required|exists:users,id|exists:aviator_bet,uid',
// 		    'number'=>'required|numeric|exists:aviator_bet,number',
// 		    'gamesno'=>'required'
// 		]);
		
// 		if($validator->fails()){
// 	        return response()->json(['message'=>$validator->errors()->first()]);
// 		}
		
// 		$userId = $request->userid;
// 		$number = $request->number;
// 		$gameno= $request->gamesno;
//       	$gamesno = $request->gamesno + 1;
      	
// 	$cancelCount = DB::table('aviator_bet')
//     ->where('uid', $userId)
//     ->where('number', $number)
//     ->where('status', 4)
//     ->whereIn('game_sr_num', [$gamesno, $gameno])
//     ->count();

// 			//dd($cancelCount);	
// 			if($cancelCount >= 1 ){
// 				 return response()->json(['message'=>'Cancel limit exits...!','status'=>400]);
// 			}
			
// 	$userBet = DB::table('aviator_bet')
//     ->where('uid', $userId)
//     ->where('number', $number)
//     ->where('status', 0)
//     ->whereIn('game_sr_num', [$gamesno, $gameno])
//     ->first();

//             //dd($userBet);
//         if($userBet){
//           //dd("hii");
//           $refundAmount = User::where('id', $userId)
//                 ->update(['wallet' => DB::raw('wallet + ' . $userBet->amount)]);
//                  //dd($refundAmount);
//             if($refundAmount){
//                 //dd("hello");
//           $cancelBet = DB::table('aviator_bet')
//     ->where('uid', $userId)
//     ->where('number', $number)
//     ->where('status', 0)
//     ->whereIn('game_sr_num', [$gamesno, $gameno])
//     ->update(['status' => 4]);


//                 //dd($cancelBet);
//                 if($cancelBet){
//                     return response()->json([ 'success'=>true, 'message'=>'Bet Cancel Successfully'],200);
//                 }else{
//                     return response()->json([ 'success'=>false, 'message'=>'internal error..!'],500);
//                 }
                
//             }
//         }
        
//     }
	
	// 	public function aviator_cashout(Request $request){
			
// 	          date_default_timezone_set('Asia/Kolkata');
//               $datetime = now()->format('Y-m-d H:i:s');	
// 		     $uid = $request->userid;
// 			$multiplier = $request->multiplier;
// 		 	$game_sr_num = $request->gamesno; 
			 

// 	  $bet_details  =	DB::select("SELECT *
// FROM aviator_bet
// WHERE
//     game_sr_num = $game_sr_num
//     AND game_id = 5
//     AND uid = $uid
//     AND status = 0
//     AND result_status = 0
// LIMIT 1;");
			
//           if(!$bet_details){
// 			  return response()->json(['message'=>'Already cashout..!','status'=>400]);
// 		  }

// 			$amount_trade = $bet_details[0]->amount;
// 			$win_amount = $amount_trade*$multiplier;
			
	
		
// 		$update = DB::select("UPDATE aviator_bet SET status = 1, result_status = 1, multiplier = $multiplier, win = $win_amount WHERE uid = $uid AND game_id = 5 AND status = 0 AND game_sr_num = $game_sr_num AND result_status = 0");
	
				
				
		
// 	  $user_update =  DB::select("UPDATE `user` SET `wallet`= `wallet` + $win_amount,`winning_wallet`=`winning_wallet` + $win_amount WHERE `id`= $uid");
						
		
// 		DB::select("INSERT INTO `wallet_history`( `userid`, `amount`, `type`, `subtypeid`, `datetime`) VALUES ('$uid','$win_amount','1','8','$datetime')");
			
					
				
// 					return response()->json(['message'=>'Cashout Successfully','status'=>200]);
				
				
			
	
			
// 	}

    // public function aviator_cashout(Request $request)
// {
//     date_default_timezone_set('Asia/Kolkata');
//     $datetime = now()->format('Y-m-d H:i:s');

//     // Direct Request Parameters
//     $uid = $request->uid;
//     $multiplier = $request->multiplier;
//     $game_sr_num = $request->game_sr_num;
//     $number = $request->number;

//     $bet_details = DB::table('aviator_bet')
//         ->where('game_sr_num', $game_sr_num)
//         ->where('game_id', 5)
//         ->where('uid', $uid)
//         ->where('number', $number)
//         ->where('status', 0)
//         ->where('result_status', 0)
//         ->first();

//     // if (!$bet_details) {
//     //     return response()->json([
//     //         'message' => 'Already cashout..!',
//     //         'status' => 400
//     //     ]);
//     // }

//     $amount_trade = $bet_details->totalamount;
//     $win_amount = $amount_trade * $multiplier;

//     $update = DB::table('aviator_bet')
//         ->where('uid', $uid)
//         ->where('number', $number)
//         ->where('game_id', 5)
//         ->where('status', 0)
//         ->where('game_sr_num', $game_sr_num)
//         ->where('result_status', 0)
//         ->update([
//             'status' => 1,
//             'result_status' => 1,
//             'multiplier' => $multiplier,
//             'win' => $win_amount
//         ]);

//     if ($update) {

//         $user_update = DB::table('users')
//             ->where('id', $uid)
//             ->update([
//                 'winning_wallet' => DB::raw('winning_wallet + ' . $win_amount),
//                 'wallet' => DB::raw('wallet + ' . $win_amount),
//             ]);

//         $wallet_history = DB::table('wallet_history')->insert([
//             'userid' => $uid,
//             'amount' => $win_amount,
//             'subtypeid' => 24, // 24 for aviator
//             'created_at' => now(),
//             'updated_at' => now(),
//         ]);

//         if ($user_update && $wallet_history) {
//             return response()->json([
//                 'message' => $win_amount . ' Rs. Cashout Successfully',
//                 'status' => 200
//             ]);
//         } else {
//             return response()->json([
//                 'message' => 'Internal Error',
//                 'status' => 400
//             ]);
//         }
//     } else {
//         return response()->json([
//             'message' => 'Internal Error',
//             'status' => 400
//         ]);
//     }
// }

// public function bet_histroy()
//      {
//     $userId = request('uid');
    

//     if (!empty($userId)) {
        
//             $query = "SELECT * FROM `aviator_bet` WHERE id=$userId ORDER BY id DESC";

//             $aviatorBets = DB::select($query);

//             if (!empty($aviatorBets)) {
//                 $response = [
// 					'data' => $aviatorBets,
//                     'error' => "200",
//                     'message' => 'success'
//                 ];
//                 return response()->json($response, 200);
//             } else {
//                 $response = [
//                     'error' => "400",
//                     'message' => 'Data Not Found'
//                 ];
//                 return response()->json($response, 400);
//             }
        
//     } else {
//         $response = [
//             'error' => "400",
//             'message' => 'User id Is Required'
//         ];
//         return response()->json($response, 400);
//     }
//   }
	
}
