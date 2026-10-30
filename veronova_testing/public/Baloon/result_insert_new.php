<?php

header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, Content-Type");
header("Content-Type: application/json");
header("Expires: 0");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

include 'dbconnection.php';

   date_default_timezone_set('Asia/Kolkata');
   $datetime = date('Y-m-d H:i:s');

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(array("message" => "Method Not Allowed", "status" => 405));
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);
// dd($input);
// Check if required fields are provided
if (!isset($input['adminmultiply']) || !isset($input['game_sr'])) {
    echo json_encode(array("message" => "Missing required fields", "status" => 400));
    exit;
} 

// Extract data from input
$game_sr = $input['game_sr'];		
$multiplier = $input['adminmultiply'];
// dd($multiplier);
$ab="SELECT * FROM `balloon_result` WHERE `game_sr_num`='$game_sr'";
$query = mysqli_query($conn,$ab);
if(mysqli_num_rows($query)=='0')
{

  $q = "INSERT INTO `balloon_result`(`color`, `game_sr_num`, `game_id`, `price`, `status`, `datetime`) VALUES ('Balloon','$game_sr','23','$multiplier','1','$datetime')";
  $query = mysqli_query($conn,$q);

   if($query){
	   $get_bet_his = "SELECT * FROM `balloon_bet` where `game_sr_num` = '$game_sr' && `game_id`= 23 && `status` = 0 && `win`=0 && `result_status` = 0";
	   $up_query = mysqli_query($conn,$get_bet_his);
	   
	   if($up_query){
		    while($res = mysqli_fetch_assoc($up_query)){
				  $id = $res['id'];
				  $uid = $res['uid']; 
				  $stop_multiplier = $res['stop_multiplier'];
		 if(($stop_multiplier != 0 ) && ($stop_multiplier<=$multiplier) ){
			 
					   $trade_amount = $res['totalamount'];
					   $win_amount = $trade_amount*$stop_multiplier;
					   
		 $update = mysqli_query($conn,"UPDATE `balloon_bet` SET `status` = 1,`result_status`=1,`win` = '$win_amount' where `id` = $id");
					     
	$wallet_insert = mysqli_query($conn,"INSERT INTO `wallet_history`(`userid`,`amount`,`subtypeid`) values('$uid','$win_amount',24)");
					   
			 $user_table = mysqli_fetch_assoc(mysqli_query($conn,"SELECT* FROM `users` where `id` = '$uid'"));
					     $wallet = $win_amount + $user_table['wallet'];
					     $winning = $win_amount + $user_table['winning_wallet'];
					     $today_turnover = $user_table['today_turnover'];
					   
 $users_update = mysqli_query($conn,"UPDATE `users` set `wallet` = '$wallet',`winning_wallet` = '$winning' where `id` = '$uid'");
					   
				   }else{
					   $update = "UPDATE `balloon_bet` SET `status` = 2,`result_status`= 1 where `id` = $id && `game_sr_num` = '$game_sr'";
				        $update_query = mysqli_query($conn,$update); 
				   }
			}
		    echo json_encode(array("message" => "Result declared, user bet history updated.", "status" => 200));
         exit;
	   }else{	   
	      echo json_encode(array("message" => "Failed  to update user bet history!", "status" => 400));
       exit;
	   }
	      

   }else{
	   echo json_encode(array("message" => "Failed to insert result!", "status" => 400));
       exit;
   }
}
else{
    echo json_encode(array("message" => "Game Sr No. Already Exist", "status" => 400));
       exit;
}



?>
