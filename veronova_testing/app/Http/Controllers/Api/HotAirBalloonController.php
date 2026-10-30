<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Routing\Controller; 

class HotAirBalloonController extends Controller
{
    public function balloon_bet(Request  $request)
    {
	    date_default_timezone_set('Asia/Kolkata');
        $datetime = date('Y-m-d H:i:s');
		$validator = Validator::make($request->all(),[
		'uid'=>'required|exists:users,id',
		'number'=>'required',
		'amount'=>'required',
		'game_id'=>'required|in:23',
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
    	$sr_num_bet = DB::table('balloon_bet')
    	 ->where('game_id',23)
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
    	$user = DB::table('users')->where('id',$uid)->first();
    	if(!$user){
    	    return response()->json(['status'=>400,'message'=>'Failed to get data of user!']);
    		}
            $wallet = $user->wallet;
    		$winning_wallet = $user->winning_wallet;
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
	    $datetime = date('Y-m-d h:i:s');
	    $betting_fee = DB::table('admin_settings')->where('id', 10)->first();
		$percentage_bet =  $betting_fee->longtext;
	    $commission  = $amount*$percentage_bet;
	    $amounttrade = $amount-$commission;
	   	$betsql = DB::table('balloon_bet')->insert([
		    'uid' => $uid,
			'amount' => $amount,
			'number' => $number,
			'game_id' => $game_id,
			'totalamount' => $amounttrade,
			'color' => "Balloon",
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
    public function balloon_cashout(Request $request, )
    {
        if (!$request->has('salt')) {
            return response()->json(['message' => 'Missing salt parameter', 'status' => 400]);
        }
        $decodedRequest = base64_decode($request->salt);
        if ($decodedRequest === false) {
            return response()->json(['message' => 'Invalid base64 encoding', 'status' => 400]);
        }
        $requests = json_decode($decodedRequest);
        if (!$requests) {
            return response()->json(['message' => 'Invalid JSON format', 'status' => 400]);
        }
        date_default_timezone_set('Asia/Kolkata');
        $datetime = now()->format('Y-m-d H:i:s');
        if (!isset($requests->uid, $requests->multiplier, $requests->game_sr_num, $requests->number)) {
            return response()->json(['message' => 'Missing required parameters', 'status' => 400]);
        }
        $uid = $requests->uid;
        $multiplier = $requests->multiplier;
        $game_sr_num = $requests->game_sr_num;
        $number = $requests->number;
        $amount_trade = $requests->totalamount;
    // dd($amount_trade);
        $bet_details = DB::table('balloon_bet')
            ->where('game_sr_num', $game_sr_num)
            ->where('game_id', 23) 
            ->where('uid', $uid)
            ->where('number', $number)
            ->where('status', 0)
            ->where('result_status', 0)
            ->first();
        $amount_trade = $bet_details->totalamount;
        $win_amount = $amount_trade * $multiplier;
        $update = DB::table('balloon_bet')
            ->where('uid', $uid)
            ->where('number', $number)
            ->where('game_id', 23) 
            ->where('status', 0)
            ->where('game_sr_num', $game_sr_num)
            ->where('result_status', 0)
            ->update([
                'status' => 1,
                'result_status' => 1,
                'multiplier' => $multiplier,
                'win' => $win_amount
            ]);
        if ($update) {
            $user_update = DB::table('users')->where('id', $uid)->update([
                'winning_wallet' => DB::raw('winning_wallet + ' . $win_amount),
                'wallet' => DB::raw('wallet + ' . $win_amount),
            ]);
            $wallet_history = DB::table('wallet_history')->insert([
                'userid' => $uid,
                'amount' => $win_amount,
                'subtypeid' => 24,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
    
            if ($user_update && $wallet_history) {
                return response()->json(['message' => "$win_amount Rs. Cashout Successfully", 'status' => 200]);
            } else {
                return response()->json(['message' => 'Internal Error: Wallet Update Failed', 'status' => 400]);
            }
        } else {
            return response()->json(['message' => 'Internal Error: Bet Update Failed', 'status' => 400]);
        }
    }
    public function balloon_history(Request $request)
    {
    	$validator = Validator::make($request->all(), [
	    'uid'=>'required',
	    'game_id' => 'required',
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
        if (!empty($game_id)) {
            $where['balloon_bet.game_id'] = "$game_id";
            $where['balloon_bet.uid'] = "$userid";
        }
        if (!empty($from_date)) {
        $where['balloon_bet.created_at']="$from_date%";
        $where['balloon_bet.created_at']="$to_date%";
        }
        $query = "SELECT balloon_bet.*, balloon_bet.win AS cashout_amount,balloon_bet.multiplier AS multiplier,balloon_result.price AS crash_point FROM balloon_bet LEFT JOIN balloon_result ON balloon_bet.game_sr_num = balloon_result.game_sr_num";
            if (!empty($where)) {
            $query .= " WHERE " . implode(" AND ", array_map(function ($key, $value) {
                return "$key = '$value'";
            }, array_keys($where), $where));
        }
        $query .= " ORDER BY id DESC  LIMIT $offset , $limit";
        $results = DB::select($query);
        if(!empty($results)){
		return response()->json([
            'status' => 200,
            'message' => 'Data found',
            'data' => $results
        ]);
        return response()->json($response,200);
            }else{
                $response = [
                'status' => 400,
                'message' => 'No Data found',
                'data' => $results
            ];
        return response()->json($response, $response['status']);
        }
    }
	public function balloon_bet_cancle(Request $request)
    {
        date_default_timezone_set('Asia/Kolkata');
        $datetime = now()->format('Y-m-d H:i:s');
        $validator = Validator::make($request->all(), [
            'userid' => 'required|exists:balloon_bet,uid',
            'gamesno' => 'required|exists:balloon_bet,game_sr_num'
        ]);
        $validator->stopOnFirstFailure();
        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
        }
        $uid = (int) $request->userid;
        $game_sr_num = (int) $request->gamesno;
        $user_bet_data = DB::table('balloon_bet')
            ->where('uid', $uid)
            ->where('status', 0)
            ->where('game_sr_num', $game_sr_num)
            ->first();
        if (!$user_bet_data) {
            return response()->json(['status' => 404, 'message' => 'No active bet found']);
        }
    
        $bet_amount = $user_bet_data->amount;
        $user_update = DB::table('users')->where('id', $uid)->update([
            'winning_wallet' => DB::raw('winning_wallet + ' . $bet_amount),
            'wallet' => DB::raw('wallet + ' . $bet_amount),
        ]);
        if ($user_update) {
            $bet_delete = DB::table('balloon_bet')
                ->where('uid', $uid)
                ->where('status', 0)
                ->where('game_sr_num', $game_sr_num)
                ->delete();
            if ($bet_delete) {
                return response()->json(['message' => 'Bet Cancel Successfully', 'status' => 200]);
            } else {
                return response()->json(['message' => 'Can Not Cancel Bet', 'status' => 200]);
            }
        } else {
            return response()->json(['message' => 'Internal error...!', 'status' => 200]);
        }
    }

	public function  last_five_result()
	{
        $results = DB::table('balloon_result')->select('price')
        ->where('status', 1)
        ->orderByDesc('id')
        ->limit(10)
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
	public function get_image()
	{
	    $image = DB::table('balloon_image')->get();
	    return response()->json([
	        'status' => 200,
	        'image' => $image,
	        ],200);
	}
	public function post_image(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userid' => 'required|exists:balloon_bet,uid',
            'image_id' => 'required|exists:balloon_image,id',
        ]);
        $validator->stopOnFirstFailure();
        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first()
            ]);
        }
        $userId = $request->input('userid');
        $imageId = $request->input('image_id');
        $image = DB::table('balloon_image')->where('id', $imageId)->first();
        if ($image) {
            return response()->json([
                'status' => 200,
                'data' => $image, 
            ], 200);
        } else {
            return response()->json([
                'status' => 404,
                'message' => 'Image not found or invalid image ID.',
            ], 404);
        }
    }
    
}
