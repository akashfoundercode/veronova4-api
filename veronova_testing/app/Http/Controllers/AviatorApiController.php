<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AviatorModel;
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AviatorApiController extends Controller
{



 public function bet_now()
        {
	           
	        $userId = request('userid');
            $amount = request('amount');
	
	        if(!empty($userId)){
				if(!empty($amount)){
					$walletAmount = DB::table('user')->where('id', $userId)->first();
					
				   $wallet = $walletAmount->wallet; 
					
					if($wallet > $amount){
					$lastGame = DB::table('aviator_result')->orderBy('id', 'desc')->first();
                    $gameNo = $lastGame->gamesno + 1 ;
						 
						$data2 = DB::table('aviator_bet')->where('gamesno',$gameNo)->get();
						
						if(count($data2)==0){
							$updateamount=DB::update("UPDATE `user` SET `wallet` = `wallet` - $amount WHERE `id` = $userId;");
					 //$updateamount=DB::table('user')->where('id', $userId)->decrement('wallet', $amount);
						//dd($updateamount);
					$bets=DB::table('aviator_bet')->insert([
                     'uid' => $userId,
                     'amount' => $amount,
                     'gamesno' => $gameNo,
                     'datetime' => date('Y-m-d H:i:s'),
                     'status' => '0',
                  ]);
					if($bets){
						
						$response =[ 'error'=>"200",
                      'message'=>'Bet placed successfully'];
                       return response ()->json ($response,200);
					}else{
						
							$response =[ 'error'=>"400",
                        'message'=>'Internet Server Error'];
                        return response ()->json ($response,400);
					}
					  }else{
					   $response =[ 'error'=>"400",
                        'message'=>'Already Bet Created'];
                        return response ()->json ($response,400);
				        }
					  }else{
					 $response =[ 'error'=>"400",
                    'message'=>'Balance is Low'];
                   return response ()->json ($response,400);
				     }
					
				}else{
					 $response =[ 'error'=>"400",
                'message'=>'Amount  Is Required'];
                 return response ()->json ($response,400);
				}
				
			}else{
				 $response =[ 'error'=>"400",
                'message'=>'User id Is Required'];
                 return response ()->json ($response,400);
			}
	       
        }
	 public function cash_out()
        {
	           
	        $userId = request('userid');
            $amount = request('amount');
		    $multiplier = request('multiplier');
		  $gamesno = request('gamesno');
	        if(!empty($userId)){
				if(!empty($amount)){
					if(!empty($multiplier)){
						
					
					//$lastGame = DB::table('aviator_result')->orderBy('id', 'desc')->first();
						
                  // $gameNo = $lastGame ? $lastGame->gamesno + 1 : 1; 
						
						$aviatorBets = DB::table('aviator_bet')->where('gamesno', $gamesno)->first();
						
						 $betamount = $aviatorBets->amount; 
						$data2 = DB::table('aviator_cashout')->where('gamesno',$gamesno)->get();
						if(count($data2)==0){
							
				$updateAmount = DB::table('user')
             ->where('id', $userId)
              ->update([
             'wallet' => DB::raw("wallet + $amount*$multiplier"),
            'winning_wallet' => DB::raw("winning_wallet + $amount*$multiplier")
            ]);
					$cashout=DB::table('aviator_cashout')->insert([
                     'uid' => $userId,
                     'amount' => $amount*$multiplier,
                     'gamesno' => $gamesno,
					 'multiplier'=>$multiplier,
					 'bet_amount'=>$betamount,
                     'datetime' => date('Y-m-d H:i:s'),
                     
                  ]);
					if($cashout){
						
						$response =[ 'error'=>"200",
                      'message'=>'Cash Out successfully'];
                       return response ()->json ($response,200);
					}else{
						
							$response =[ 'error'=>"400",
                        'message'=>'Internet Server Error'];
                        return response ()->json ($response,400);
					}
					  }else{
					   $response =[ 'error'=>"400",
                        'message'=>'Already Cashed Out '];
                        return response ()->json ($response,400);
				        }
					  
					}else{
					 $response =[ 'error'=>"400",
                  'message'=>'Multiplier Is Required'];
                   return response ()->json ($response,400);
				 }
				  }else{
					 $response =[ 'error'=>"400",
                  'message'=>'Amount Is Required'];
                  return response ()->json ($response,400);
				}
				
			}else{
				 $response =[ 'error'=>"400",
                'message'=>'User id Is Required'];
                 return response ()->json ($response,400);
			}
	       
        }
	
	public function bet_histroy()
     {
    $userId = request('userid');
    

    if (!empty($userId)) {
        
            $query = "SELECT aviator_bet.*, aviator_cashout.amount AS cashout_amount,aviator_cashout.multiplier AS multiplier FROM aviator_bet LEFT JOIN aviator_cashout ON              aviator_bet.gamesno = aviator_cashout.gamesno WHERE aviator_bet.uid = $userId ORDER BY aviator_bet.id DESC ";

            $aviatorBets = DB::select($query);

            if (!empty($aviatorBets)) {
                $response = [
					'data' => $aviatorBets,
                    'error' => "200",
                    'message' => 'success'
                ];
                return response()->json($response, 200);
            } else {
                $response = [
                    'error' => "400",
                    'message' => 'Data Not Found'
                ];
                return response()->json($response, 400);
            }
        
    } else {
        $response = [
            'error' => "400",
            'message' => 'User id Is Required'
        ];
        return response()->json($response, 400);
    }
  }
  
	  public function result()
     {
		  //$userId = request('userid');
         $limit = request('limit');
		//if (!empty($userId)) {
          if (!empty($limit)) {
			  
			  $query="SELECT * FROM `aviator_result` ORDER BY `id` DESC LIMIT $limit";
			  $result = DB::select($query);
			  if(!empty($result)){
				   $response = [
					'data' => $result,
                    'error' => "200",
                    'message' => 'success'
                ];
				 return response()->json($response, 200); 
			  }else{
				   $response = [
                    'error' => "400",
                    'message' => 'Data Not Found'
                ];
                return response()->json($response, 400);
			  }
		      
		  } else {
            $response = [
                'error' => "400",
                'message' => 'Limit Is Required'
            ];
            return response()->json($response, 400);
        }
    //} else {
       // $response = [
           // 'error' => "400",
            //'message' => 'User id Is Required'
        //];
        //return response()->json($response, 400);
   // }
		  
	  }
	
	public function result_cron()
	{
		date_default_timezone_set('Asia/Calcutta'); 

		$m= date('i');
		$s=date('s');
		if($s>30){
		$mins=$m.'.'.'5';
		}else{
			$mins=$m;
		}
		
	$gamesno = DB::select("SELECT gamesno,datetime FROM `aviator_result` ORDER BY `id` DESC LIMIT 1;");
		 $gamesnop=$gamesno[0]->gamesno;
		
		if($gamesno[0]->datetime!=$mins)
		{
			
			$gamesnop=$gamesnop+1;
			$admin_result=DB::select("SELECT `id`, `gamesno`, `gameid`, `number`, `status`, `datetime` FROM `aviator_admin_result` WHERE `gamesno`='$gamesnop';");

			if(empty($admin_result))
			{
				$gamesc=DB::select("SELECT COUNT(id) AS totalbet, SUM(amount) AS totalamount FROM aviator_bet WHERE gamesno = $gamesnop");
		 $totalbet=$gamesc[0]->totalbet;

			if($totalbet<4){
		if($totalbet==0)
		{
		echo $randomFloat = rand(50, 250) / 48;
	 $result= number_format($randomFloat, 2);
			$store=db::insert("INSERT INTO `aviator_result`( `gamesno`, `result`, `datetime`) VALUES ('$gamesnop','$result','$mins')");
				 $response = [
            'error' => "200",
            'message' => "$result"
        ];
								
		}
		else
		{

				echo $randomFloat = rand(50, 55) / 48;
	 $result= number_format($randomFloat, 2);
			$store=db::insert("INSERT INTO `aviator_result`( `gamesno`, `result`, `datetime`) VALUES ('$gamesnop','$result','$mins')");
				 $response = [
            'error' => "200",
            'message' => "$result"
        ];
			
		}}else{
		$store=DB::insert("INSERT INTO `aviator_result`( `gamesno`, `result`, `datetime`) VALUES ('$gamesnop','wait','$mins')");

			}
		}
			else{
	 $result= $admin_result->number;
			$store=db::insert("INSERT INTO `aviator_result`( `gamesno`, `result`, `datetime`) VALUES ('$gamesnop','$result','$mins')");
				 $response = [
            'error' => "200",
            'message' => "$result"
        ];
			}
			}
	
	 
		
	}
	
	public function result_bet()
	{
		date_default_timezone_set('Asia/Calcutta'); 

		 $m= date('i');
		$gamesrno = request('gamesno');
		$multiplayer= request('multiplier');
		 if(!empty($gamesrno))
		 {
			 $gamesnop =$gamesrno;
		 $gamesno = DB::select("SELECT * FROM `aviator_result` ORDER BY `id` DESC LIMIT 1;");
			
		 $gamesnop=$gamesno[0]->gamesno;
			  $multiplay=$gamesno[0]->result;
		if($gamesnop==$gamesrno && $multiplay !='wait'){
			
			$response = [
            'error' => "200",
            'message' => "$multiplay"
        ];
					return response()->json($response);
		}else{
	$gamesc=DB::select("SELECT COUNT(id) AS totalbet, SUM(amount) AS totalamount FROM aviator_bet WHERE gamesno = $gamesrno;");
			$totalbet=$gamesc[0]->totalbet;
  $totalamt=$gamesc[0]->totalamount;
			$percentage=DB::select("SELECT `parsantage` FROM `game_setting` WHERE id=5;");
			 $percentages= $percentage[0]->parsantage;
				  $finalcutoff=$totalamt*$percentages*0.01;
				$cashout=DB::select("SELECT SUM(amount) AS amount FROM `aviator_cashout` WHERE gamesno=$gamesrno;");
				if($cashout[0]->amount >= $finalcutoff){
				$update=DB::update("UPDATE `aviator_result` SET `result`='$multiplayer' WHERE gamesno = $gamesrno");
					
				  $data= "stop";
					 $response = [
            'error' => "200",
            'message' => "$multiplayer"
        ];
					return response()->json($response);
					
				}
				else{
			 $response = [
            'error' => "200",
            'message' => "wait"
        ];
					return response()->json($response);
				}
	
		 } 
		 }
	}
	
	
	
	
}
