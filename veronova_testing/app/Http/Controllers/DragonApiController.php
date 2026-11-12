<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DragonApiController extends Controller
{

public function Dragon_bet()
{
     
	$userid = request('userid');
    $dragon = request('dragon');
    $tiger = request('tiger');
    $tie = request('tie');
    
	$gameno = DB::table('dragon_result')->select('*')->orderBy('id', 'desc')->first();

    //$gameno = DB::select("SELECT * FROM `dragon_result` ORDER BY id DESC LIMIT 1");
    $gamesno = $gameno->gamesno + 1;

    if (!empty($userid)) {
        if (empty($dragon) && empty($tiger) && empty($tie)) {
             $response['status'] = "400";
             echo json_encode($response);
        } else {
			
			
			                $dragonamount = (int)$dragon;
							$tigeramount = (int)$tiger;
							$tieamount = (int)$tie;
						    $amount = $dragonamount + $tigeramount + $tieamount;
							
						
							$num = $amount;
                            $useramount = (int)$num;
							$user_wallet = DB::table('user')->select('wallet')->where('id', $userid)->first();

							//$user_wallet = DB::select("SELECT `wallet` FROM `user` WHERE `id` ='$userid';");
							$userwallet = $user_wallet->wallet;
							if($userwallet > $useramount ){
								if(!empty($dragon) && !empty($tiger) && !empty($tie)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'dragon' => $dragon,'tiger' => $tiger,'tie' => $tie,'datetime' =>date('Y-m-d H:i:s'), ];  }
									elseif(!empty($dragon) && !empty($tiger)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'dragon' => $dragon,'tiger' => $tiger,'datetime' =>date('Y-m-d H:i:s'), ];  }
									elseif(!empty($dragon) && !empty($tie)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'dragon' => $dragon,'tie' => $tie,'datetime' =>date('Y-m-d H:i:s'), ];  }
										elseif(!empty($tiger) && !empty($tie)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'tiger' => $tiger,'tie' => $tie,'datetime' =>date('Y-m-d H:i:s'), ];  }
											elseif(!empty($tiger) && !empty($dragon)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'tiger' => $tiger,'dragon' => $dragon,'datetime' =>date('Y-m-d H:i:s'), ];  }
								
											elseif(!empty($tiger)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'tiger' => $tiger,'datetime' =>date('Y-m-d H:i:s'), ];  }
											elseif(!empty($dragon)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'dragon' => $dragon,'datetime' =>date('Y-m-d H:i:s'), ];  }
													elseif(!empty($tie)){
							$dragondata = ['gamesno'=>$gamesno,'userid' => $userid,'tie' => $tie,'datetime' =>date('Y-m-d H:i:s'), ];  }			
								
        
         DB::table('dragon_bet')->insert($dragondata);
	         if('dragon_bet()'== true){
				 
				 DB::table('user')->where('id', $userid)->update(['wallet' => DB::raw('wallet - ' . $amount)]);
				//DB::select("UPDATE `user` SET `wallet`=`wallet`- $amount WHERE `id`='$userid';");
                $response['msg']="Bet Successfully..!";
                        	$response['status']="200";
                        	echo json_encode($response);
            }else{
                 $response['msg']="Internal Error..!";
                        	$response['status']="400";
                        	echo json_encode($response);
            } 
							}
			
			
            
        }
    } else {
        $response['msg'] = "User Id Required";
        $response['status'] = "400";
        echo json_encode($response);
    }
}	
	
	
	public function Dragon_bet_result()  
    {
		
		
		date_default_timezone_set('Asia/Calcutta'); 
		 $datetime=date('d-m-Y H:i:s ');
		$gameno = DB::table('dragon_result')->orderBy('id', 'desc')->first();
	
		       // $gameno=$this->db->query("SELECT * FROM `dragon_result` ORDER BY id  DESC LIMIT 1")->row();
			$gamesno=$gameno->gamesno+1;
		
		$query = DB::table('dragon_bet')->where('status', '0')->where('gamesno', $gamesno)->get();

     // $query = DB::select("SELECT * FROM `dragon_bet` WHERE `status`='0' && `gamesno`='$gamesno'")->result_array();
		if (!empty($query)) {
    $tie = 0;
    $dragon = 0;
    $tiger = 0;
    
    foreach ($query as $item) {
        $betid = $item->id; // Assuming 'id' is the primary key of the table
        $dragon += $item->dragon;
        $tiger += $item->tiger;
        $tie += $item->tie;
    }

    $totaltie = $tie * 5;
    $totaltiger = $tiger * 2;
    $totaldragon = $dragon * 2;


	
			if ($totaltie < $totaltiger && $totaltie < $totaldragon) {
    // Retrieve bet list where status is 0
    $betlist = DB::table('dragon_bet')->where('status', '0')->get();

    foreach ($betlist as $item) {
        $betid = $item->id;
        $betuserid = $item->userid;
        $bettie = $item->tie;
        $batieamount = $betTie * 5;
                     DB::table('user')->where('id', $betuserid)->increment('wallet', $batieamount);
					//$this->db->query("UPDATE `user` SET `wallet`=`wallet`+ $batieamount WHERE `id` = '$betuserid'");
		             DB::table('dragon_bet')->where('id',$betid)->update(['status' => 1]);
					//$this->db->query("UPDATE `dragon_bet` SET `status`= 1 WHERE `id` = '$betid'");
		             DB::table('dragon_bet')->where('id', $betid)->update(['dragon_status' => 2, 'tiger_status' => 2, 'status' => 2]);

					//$this->db->query("UPDATE `dragon_bet` SET `dragon_status`= 2 , `tiger_status`=2,`status`=2 WHERE `id` = '$betid'");

				}
				DB::table('dragon_result')->insert(['gamesno' => $gamesno,'win_number' => 1,'datetime' => $datetime,]);
				//$this->db->query("INSERT INTO `dragon_result`( `gamesno`,`win_number`, `datetime`) VALUES ('$gamesno','1','$datetime')");

				
			 
				
			}
			elseif($totaltiger<$totaldragon && $totaltiger < $totaltei){
				
				
				$betlist = DB::table('dragon_bet')->where('status', '0')->get()->toArray();

				//$betlist = $this->db->query("SELECT * FROM `dragon_bet` WHERE status='0'")->result_array();
				
				foreach ($betlist as $item) {
                    $betid = $item->id;
                    $betuserid = $item->userid;
                    $bettiger = $item->tiger;
                    $battigeramount = $bettiger * 2;
					
					DB::table('user')->where('id', $betuserid)->increment('wallet', $battigeramount);

					//$this->db->query("UPDATE `user` SET `wallet`=`wallet`+ $battigeramount WHERE `id` = '$betuserid'");
					DB::table('dragon_bet')->where('id',$betid)->update(['tie_status'=>1]);
					//$this->db->query("UPDATE `dragon_bet` SET `tie_status`= 1 WHERE `id` = '$betid'");
					DB::table('dragon_bet')->where('id',$betid)->update(['tie_status'=>2,'dragon_status'=>2,'status'=>2]);
					//$this->db->query("UPDATE `dragon_bet` SET `tie_status`= 2 , `dragon_status`=2,`status`=2 WHERE `id` = '$betid'");


				}
				DB::table('dragon_result')->insert(['gamesno' => $gamesno,'win_number' => 3,'datetime' => $datetime,]);
				//$this->db->query("INSERT INTO `dragon_result`( `gamesno`,`win_number`, `datetime`) VALUES ('$gamesno','3','$datetime')");

				
			}
			else{
				//echo "windragon";
				   $betlist = DB::table('dragon_bet')->where('status', '0')->get()->toArray();
					//$betlist = $this->db->query("SELECT * FROM `dragon_bet` WHERE status='0'")->result_array();
				
				 foreach($betlist as $item){
					$betid = $item->id;
					$betuserid = $item->userid;
					$betdragon = $item->dragon;
					$batdragon = $betdragon*2;
					
					 DB::table('user')->where('id', $betuserid)->increment('wallet', $batdragon);
					//$this->db->query("UPDATE `user` SET `wallet`=`wallet`+ $batdragon WHERE `id` = '$betuserid'");
					 DB::table('dragon_bet')->where('id',$betid)->update(['dragon_status'=>1]);
					//$this->db->query("UPDATE `dragon_bet` SET `dragon_status`= 1 WHERE `id` = '$betid'");
					 DB::table('dragon_bet')->where('id',$betid)->update(['tie_status'=>2,'tiger_status'=>2,'status'=>2]);
					//$this->db->query("UPDATE `dragon_bet` SET `tie_status`= 2 , `tiger_status`=2,`status`=2 WHERE `id` = '$betid'");

				}
				     DB::table('dragon_result')->insert(['gamesno' => $gamesno,'win_number' => 2,'datetime' => $datetime,]);
				//$this->db->query("INSERT INTO `dragon_result`( `gamesno`,`win_number`, `datetime`) VALUES ('$gamesno','2','$datetime')");

				
			}
		}
		else
		{
			
			$rand=rand(1,3);
			DB::table('dragon_result')->insert(['gamesno'=>$gamesno,'win_number'=>$rand,'datetime'=>$datetime]);
			//$this->db->query("INSERT INTO `dragon_result`( `gamesno`,`win_number`, `datetime`) VALUES ('$gamesno','$rand','$datetime')");
		}
		
	}
	
	public function lastresult()
	{
		$gameno = DB::table('dragon_result')->orderBy('id', 'desc')->first();

		//$gameno=$this->db->query("SELECT * FROM `dragon_result` ORDER BY id  DESC LIMIT 1")->row();
		//$gamesno=$gameno>gamesno+1;
		$result=$gameno->win_number;
		
		if($result==1)
		{
			//echo "tei winner";
	       $patta=rand(1,52);
		    $minpatta= rand(1, $patta);
			
			$response = [
            'dragon' => "$patta",
            'tiger' => "$patta",
            'status' => "$result",
            'msg' => 'successfully',
            'error' => 200,
        ];

        return response()->json($response);
			
		}
		elseif($result==2)
		{
			//echo "dragon winner";
		     $patta=rand(1,52);
			
            $minpatta= rand(1, $patta);
			 $response = [
            'dragon' => "$patta",
            'tiger' => "$minpatta",
            'status' => "$result",
            'msg' => 'successfully',
            'error' => 200,
        ];

        return response()->json($response);
		
		}
		else
		{
			//echo "tiger winner";
		     $patta=rand(1,52);
			
            $result= rand(0, $patta);
             $minpatta= rand(1, $patta);
			$response = [
            'dragon' => "$minpatta",
            'tiger' => "$patta",
            'status' => "$result",
            'msg' => 'successfully',
            'error' => 200,
        ];

        return response()->json($response);
			
		}

	}
	public function last15result(){
    $data = DB::table('dragon_result')->select('win_number', 'datetime')->orderBy('id', 'desc')->limit(15)->get();
		//$data=DB::select("SELECT win_number,datetime FROM dragon_result ORDER BY id DESC LIMIT 15");

   $data2=array();
    foreach ($data as $result) {
       $winnumber=$result->win_number;
		$datetime=$result->datetime;
		$datap=[
			'win_number'=>"$winnumber",
			'datetime'=>$datetime,
		];
		$data2[]=$datap;
    }
		

    $response = [
        'last_result' => $data2,
        'msg' => 'successfully',
        'status' => 200,
    ];

    return response()->json($response);
}

	
	public function Dragon_rules()
{
    $data = DB::table('setting')->where('id', 17)->where('status', 1)->get();

	$response =[
		'data' => $data,
        'status' => 200,
		];
    

    return response()->json($response);
}
	
	public function dragonbet_history()
{
    $data = DB::table('dragon_bet')->where('userid', 2)->get();

    // Cast numeric values to strings
    $stringifiedData = $data->map(function ($item) {
        foreach ($item as $key => $value) {
            if (is_numeric($value)) {
                $item->$key = (string) $value;
            }
        }
        return $item;
    });

    $response = [
        'data' => $stringifiedData,
        'status' => 200,
    ];

    return response()->json($response);
}

	
	
	
	
	
}