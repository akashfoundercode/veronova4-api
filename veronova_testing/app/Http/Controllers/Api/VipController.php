<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Validator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use DateTime; 
use DateInterval; 

use Illuminate\Support\Facades\DB;




class VipController extends Controller
{
	  public function vip_level(Request $request)
    {
        date_default_timezone_set('Asia/Kolkata');
        $datetime = date('Y-m-d H:i:s');
        //  $date = date('Y-m-d');
        //  date_default_timezone_set('Asia/Kolkata');
        $date = now()->format('Y-m-d');
           $validator = Validator::make($request->all(), [
         'userid' => 'required|numeric'
    ]);


        $validator->stopOnFirstFailure();

    if($validator->fails()){

                                             $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 

                return response()->json($response,400);

    }
 $userid = $request->userid;  
		  
		  		 $my_exp = DB::select("SELECT `created_at` FROM `users` WHERE `id` = $userid");


    $created_at = new DateTime($my_exp[0]->created_at);

    // Current date
    $current_date = new DateTime(now());

    // Calculate the difference
    $interval = $created_at->diff($current_date);

    // Calculate total months and days
    $total_months = $interval->y * 12 + $interval->m; // Convert years to months and add months
    $total_days = $interval->d; // Days remain the same

    //dd($total_months,$total_days);
   
    

		  
		  
		  
       // $userid = $request->input('userid');
      $bet_amount = DB::table('bets')
    ->where('userid', $userid)
    //->whereDate('created_at', '=', $date)
    ->sum('amount');
   // dd($bet_amount);

     $activity_reward=DB::select("SELECT vip_levels.*, vip_levels_claim.level_up_status as level_up_status, vip_levels_claim.monthly_rewards_status AS monthly_rewards_status , vip_levels_claim.rebate_rate_status as rebate_rate_status, COALESCE(vip_levels_claim.`status`, '0') AS `claim_status`, COALESCE(vip_levels.`created_at`, 'Not Found') AS `created_at` FROM vip_levels LEFT JOIN vip_levels_claim ON vip_levels.`id` = vip_levels_claim.vip_levels_id AND vip_levels_claim.`userid` =$userid ORDER BY vip_levels.`id` ASC LIMIT 10;
");
      //dd($activity_reward);
    //$range_amount=$activity_reward['range_amount'];
    $data=[];
foreach ($activity_reward as $item){
    
       $bet_range= $item->betting_range;
       $level_rewards=$item->level_up_rewards;
        $monthly_rewards=$item->monthly_rewards;
        $rebate_rate=$item->rebate_rate;
         $safe_income=$item->safe_income;
        $rebate_rate_status =$item->rebate_rate_status;
        $monthly_rewards_status =$item->monthly_rewards_status;
       $level_up_status =$item->level_up_status;

       $id=$item->id;
       $name=$item->name;
       $status=$item->claim_status;
       $created_at=$item->created_at;
       $updated_at=$item->updated_at;
 $totalpercentage=($bet_amount / $bet_range) * 100;
        $percantage=number_format($totalpercentage, 2);
    //$amount=$activity_reward['amount'];
    
	$check_exist = DB::table('vip_levels_claim')->where('userid',$userid)->where('vip_levels_id',$id)->first();
	
	if(!$check_exist){
		if($bet_amount >= $bet_range){

           DB::select("INSERT INTO `vip_levels_claim`( `userid`, `vip_levels_id`, `status`,`level_up_status`) VALUES ('$userid','$id','1','1')");
    }
	}
   
    

    
     $data[] = [
         'id'=>$id,
         'name'=>$name,
         'range_amount'=>$bet_range,
         'level_up_rewards'=>$level_rewards,
                 'monthly_rewards'=>$monthly_rewards,
                 'rebate_rate'=>$rebate_rate,
                  'safe_income'=>$safe_income,
         'status'=>$status,
       'level_up_status' => isset($level_up_status) ? (string)$level_up_status : "0",
'monthly_rewards_status' => $monthly_rewards_status ?? 0,
'rebate_rate_status' => $rebate_rate_status ?? 0,
         'bet_amount'=>$bet_amount,
         'percantage'=>$percantage,
         'created_at'=>$created_at,    
         'updated_at'=>$updated_at       
         ];
 //dd($data);
}

    
         $days_count = $total_days ?? 0; 
        //dd($days_count);
         // $days_count =  $activity_reward['days_count'];
         $my_exprience =  $total_months ?? 0;
        if (!empty($activity_reward)) {
            $response = [
                'message' => 'Vip Lavel List',
                'status' => 200,
                //'bet_amount'=>$bet_amount,
               'days_count'=>$days_count,
               'my_exprience'=>$my_exprience,
                'data' => $data

            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }

	
	  public function vip_level_old(Request $request)
    {
        date_default_timezone_set('Asia/Kolkata');
        $datetime = date('Y-m-d H:i:s');
        //  $date = date('Y-m-d');
        //  date_default_timezone_set('Asia/Kolkata');
        $date = now()->format('Y-m-d');
           $validator = Validator::make($request->all(), [
         'userid' => 'required|numeric'
    ]);


        $validator->stopOnFirstFailure();

    if($validator->fails()){
                        $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 

                return response()->json($response,400);

    }
    $userid = $request->userid;  
    $my_exp = DB::select("SELECT `created_at` FROM `users` WHERE `id` = $userid");
    $created_at = new DateTime($my_exp[0]->created_at);
    // Current date
    $current_date = new DateTime(now());
    // Calculate the difference
    $interval = $created_at->diff($current_date);
    // Calculate total months and days
    $total_months = $interval->y * 12 + $interval->m; // Convert years to months and add months
    $total_days = $interval->d; // Days remain the same
    //dd($total_months,$total_days);
   
    

		  
		  
		  
       // $userid = $request->input('userid');
      //$bet_amount = DB::table('aviator_bet')
    //->where('uid', $userid)
    //->whereDate('created_at', '=', $date)
   // ->sum('amount');
   // dd($bet_amount);
		  
		   $bet_amount = DB::table('bets')
    ->where('userid', $userid)
    //->whereDate('created_at', '=', $date)
    ->sum('amount');

     $activity_reward=DB::select("SELECT vip_levels.*, vip_levels_claim.level_up_status as level_up_status, vip_levels_claim.monthly_rewards_status AS monthly_rewards_status , vip_levels_claim.rebate_rate_status as rebate_rate_status, COALESCE(vip_levels_claim.`status`, '0') AS `claim_status`, COALESCE(vip_levels.`created_at`, 'Not Found') AS `created_at` FROM vip_levels LEFT JOIN vip_levels_claim ON vip_levels.`id` = vip_levels_claim.vip_levels_id AND vip_levels_claim.`userid` =$userid ORDER BY vip_levels.`id` ASC LIMIT 10;
");
      //dd($activity_reward);
    //$range_amount=$activity_reward['range_amount'];
    $data=[];
foreach ($activity_reward as $item){
    
       $bet_range= $item->betting_range;
       $level_rewards=$item->level_up_rewards;
        $monthly_rewards=$item->monthly_rewards;
        $rebate_rate=$item->rebate_rate;
         $safe_income=$item->safe_income;
        $rebate_rate_status =$item->rebate_rate_status;
        $monthly_rewards_status =$item->monthly_rewards_status;
       $level_up_status =$item->level_up_status;

       $id=$item->id;
       $name=$item->name;
       $status=$item->claim_status;
       $created_at=$item->created_at;
       $updated_at=$item->updated_at;
 $totalpercentage=($bet_amount / $bet_range) * 100;
        $percantage=number_format($totalpercentage, 2);
    //$amount=$activity_reward['amount'];
    
	$check_exist = DB::table('vip_levels_claim')->where('userid',$userid)->where('vip_levels_id',$id)->first();
	
	if(!$check_exist){
		if($bet_amount >= $bet_range){

         //  DB::select("INSERT INTO `vip_levels_claim`( `userid`, `vip_levels_id`, `status`,`level_up_status`) VALUES ('$userid','$id','1','1')");
    }
	}
   
    

    
     $data[] = [
         'id'=>$id,
         'name'=>$name,
         'range_amount'=>$bet_range,
         'level_up_rewards'=>$level_rewards,
                 'monthly_rewards'=>$monthly_rewards,
                 'rebate_rate'=>$rebate_rate,
                  'safe_income'=>$safe_income,
         'status'=>$status,
        'level_up_status' => $status ?? 0,
'monthly_rewards_status' => $monthly_rewards_status ?? 0,
'rebate_rate_status' => $rebate_rate_status ?? 0,
         'bet_amount'=>$bet_amount,
         'percantage'=>$percantage,
         'created_at'=>$created_at,    
         'updated_at'=>$updated_at       
         ];
 //dd($data);
}

    
         $days_count = $total_days ?? 0; 
        //dd($days_count);
         // $days_count =  $activity_reward['days_count'];
         $my_exprience =  $total_months ?? 0;
        if (!empty($activity_reward)) {
            $response = [
                'message' => 'Vip Lavel List',
                'status' => 200,
                //'bet_amount'=>$bet_amount,
               'days_count'=>$days_count,
               'my_exprience'=>$my_exprience,
                'data' => $data

            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }


 //// vip Level History ////
    public function vip_level_history(Request $request){
        $validator = Validator::make($request->all(), [
                    'userid'=>'required',
                    // 'limit' => 'required'
                        ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

        $userid = $request->userid;
        $limit = $request->limit ?? 10000;
        $offset = $request->offset ?? 0;
        $from_date = $request->created_at;
        $to_date = $request->created_at;


if (!empty($userid)) {
    $where['vip_levels_claim.userid'] = "$userid";
}

if (!empty($from_date)) {
    
       $where['vip_levels_claim.created_at']="$from_date%";
       $where['vip_levels_claim.created_at']="$to_date%";
}

    $query = "SELECT `exp`,`created_at` FROM `vip_levels_claim`";
    if (!empty($where)) {
        $query .= " WHERE " . implode(" AND ", array_map(function ($key, $value) {
            return "$key = '$value'";
        }, array_keys($where), $where));
    }

 $query .= " ORDER BY  vip_levels_claim.id DESC  LIMIT $offset , $limit";
//////
$results = DB::select($query);
if(!empty($results)){
    ///
                //
                 return response()->json([
            'status' => 200,
            'message' => 'Data found',
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


return response()->json($response, $response['status']);

    
}

        }
	
	public function receive_money_old(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'level_id'=>'required'

    ]);

     $validator->stopOnFirstFailure();

    if($validator->fails()){
         $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 

                return response()->json($response,400);

    }
	     $userid = $request->input('userid');
         $level_id = $request->input('level_id');
	
	$check_exist = DB::table('vip_levels_claim')->where('userid',$userid)->where('vip_levels_id',$level_id)->where('level_up_status',0)->first();

	if($check_exist){
		return response()->JSON(['message'=>'Already claimed!','status'=>400]);
	}

          $datetime=now();
 
         $level_up_reward =$request->input('level_up_rewards');
             $monthly_rewards = $request->input('monthly_rewards');
            //  dd($level_up_reward,$monthly_rewards);
 if(!empty($level_up_reward > 0)){
                        $data = [
                            'userid' => $userid,
                            'amount' => $level_up_reward,
                            'subtypeid' => 27,
                            'created_at' => $datetime,
                            'updated_at' => $datetime
                        ];
                       
                        DB::table('wallet_history')->insert($data);
                           DB::update("UPDATE users SET wallet = wallet + ?, recharge = recharge + ? WHERE id = ?", [$level_up_reward, $level_up_reward, $userid]);
                           DB::update("UPDATE vip_levels_claim SET level_up_status='0' WHERE userid=$userid && vip_levels_id = $level_id");
                   }else{
                   $data = [
                            'userid' => $userid,
                            'amount' => $monthly_rewards,
                            'subtypeid' => 28,
                            'created_at' => $datetime,
                            'updated_at' => $datetime
                        ];
                        DB::table('wallet_history')->insert($data);
                          $user_id = DB::update("UPDATE users SET wallet = wallet + ?, recharge = recharge + ? WHERE id = ?", [$monthly_rewards, $monthly_rewards, $userid]);
                           DB::select("UPDATE vip_levels_claim SET monthly_rewards_status='0' WHERE userid=$userid && vip_levels_id = $level_id");
                   }
                        $response['message'] = " Add  Successfully";
                        $response['status'] = "200";
                        return response()->json($response,200);
       }
	
	public function receive_money(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'level_id' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $userid = $request->input('userid');
    $level_id = $request->input('level_id');

    // Check if already claimed
    $check_exist = DB::table('vip_levels_claim')
        ->where('userid', $userid)
        ->where('vip_levels_id', $level_id)
        ->where('level_up_status', 0)
        ->first();

    if ($check_exist) {
        return response()->json([
            'message' => 'Already claimed!',
            'status' => 400
        ]);
    }

    $datetime = now();
    $level_up_reward = $request->input('level_up_rewards', 0);
    $monthly_rewards = $request->input('monthly_rewards', 0);

    if (!empty($level_up_reward) && $level_up_reward > 0) {
        // Insert into wallet history
        DB::table('wallet_history')->insert([
            'userid' => $userid,
            'amount' => $level_up_reward,
            'subtypeid' => 27,
            'created_at' => $datetime,
            'updated_at' => $datetime
        ]);

        // Update user wallet balance & recharge balance
        DB::update("UPDATE `users` SET `wallet` = `wallet` + ?, `recharge` = `recharge` + ? WHERE `id` = ?", 
            [$level_up_reward, $level_up_reward, $userid]);

        // Update level up status
        DB::update("UPDATE `vip_levels_claim` SET `level_up_status` = ? WHERE `userid` = ? AND `vip_levels_id` = ?", 
            [2, $userid, $level_id]);
    } else {
        // Insert monthly reward into wallet history
        DB::table('wallet_history')->insert([
            'userid' => $userid,
            'amount' => $monthly_rewards,
            'subtypeid' => 28,
            'created_at' => $datetime,
            'updated_at' => $datetime
        ]);

        // Update user wallet balance & recharge balance
        DB::update("UPDATE `users` SET `wallet` = `wallet` + ?, `recharge` = `recharge` + ? WHERE `id` = ?", 
            [$monthly_rewards, $monthly_rewards, $userid]);
        
        // Update monthly rewards status
        DB::update("UPDATE `vip_levels_claim` SET `monthly_rewards_status` = ? WHERE `userid` = ? AND `vip_levels_id` = ?", 
            [2, $userid, $level_id]);
    }

    return response()->json([
        'message' => "Added Successfully",
        'status' => 200
    ], 200);
}




}