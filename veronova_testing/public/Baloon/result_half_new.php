<?php

// old 


header("Access-Control-Allow-Methods: GET");
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

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(array("message" => "Method Not Allowed", "status" => 405));
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);


//   $q = "SELECT COALESCE(SUM(aviator_bet.amount), 0) AS totalamount, COUNT(aviator_bet.amount) AS totalusers, COALESCE(MAX(aviator_bet.amount), 0) AS highestamount, COALESCE(aviator_admin_result.number, 0) AS adminmultiply, (SELECT `winning_percentage` FROM game_settings WHERE id=5) AS adminpercent, (SELECT COALESCE(MAX(game_sr_num), 0) FROM aviator_results) + 1 AS game_sr FROM aviator_bet JOIN aviator_admin_result ON aviator_bet.game_id = aviator_admin_result.game_id JOIN game_settings ON aviator_bet.game_id = game_settings.id WHERE game_settings.id = '5' AND aviator_bet.game_sr_num = (SELECT COALESCE(MAX(game_sr_num), 0) FROM aviator_results) AND aviator_admin_result.game_sr_num = (SELECT COALESCE(MAX(game_sr_num), 0) FROM aviator_results) ORDER BY aviator_bet.amount DESC LIMIT 1;";
//$q="SELECT COALESCE(SUM(amount), 0) AS totalamount, COALESCE(COUNT(`uid`), 0) AS totalusers , COALESCE(`amount`, 0) AS highestamount , ( SELECT COALESCE(MAX(game_sr_num), 0)+1 FROM aviator_results LIMIT 1 )as game_sr, (SELECT COALESCE( (SELECT COALESCE(`multiplier`, 0) FROM `aviator_admin_result` WHERE `game_sr_num` = (SELECT COALESCE(MAX(`game_sr_num`), 0) + 1 FROM `aviator_results`) AND `game_id` = '5' ), 0 )) AS adminmultiply, (SELECT `winning_percentage` FROM `game_settings` WHERE `id`=5) as adminpercent FROM aviator_bet WHERE game_id = '5' AND game_sr_num = ( SELECT COALESCE(MAX(game_sr_num), 0)+1 FROM aviator_results LIMIT 1 ) ORDER BY `amount` desc limit 1";


$q="SELECT COALESCE(SUM(amount), 0) AS totalamount, 
COALESCE(COUNT(`uid`), 0) AS totalusers ,
 COALESCE(MAX(`amount`), 0) AS highestamount , 
(SELECT COALESCE(MAX(game_sr_num), 0)+1 FROM balloon_result LIMIT 1 )as game_sr, 

(SELECT COALESCE( 
 (SELECT COALESCE(`multiplier`, 0) FROM `balloon_admin_result` WHERE `game_sr_num` =
 (SELECT COALESCE(MAX(`game_sr_num`), 0) + 1 FROM `balloon_result` LIMIT 1) AND `game_id` = '25' LIMIT 1 ),
  0 )) AS adminmultiply, 
  
  (SELECT `winning_percentage` FROM `game_settings` WHERE `id`=25) as adminpercent
  
   FROM balloon_bet WHERE game_id = '25' AND game_sr_num = 
   ( SELECT COALESCE(MAX(game_sr_num), 0)+1 FROM balloon_result LIMIT 1 ) ORDER BY `amount` desc limit 1";




$query = mysqli_query($conn,$q);

if($query){

$res = mysqli_fetch_assoc($query);
	      $totalamount = $res['totalamount'];
		  $totalusers = $res['totalusers'];
		  $highestamount = $res['highestamount'];
		  $adminmultiply = $res['adminmultiply'];
		  $adminpercent = $res['adminpercent'];
		  $game_sr = $res['game_sr'];
	
	$qyw=mysqli_query($conn,"SELECT `multiplier` FROM `balloon_admin_result` WHERE `game_sr_num`='$game_sr' LIMIT 1");
	
	  if (mysqli_num_rows($qyw) > 0) {
        $res_ss = mysqli_fetch_assoc($qyw);
        $multiplier = $res_ss['multiplier'];
     }else{
	     $multiplier = 0;
	 }
	 
	  $tot_win =mysqli_fetch_assoc(mysqli_query($conn,"SELECT COALESCE(SUM(win), 0) AS total_win FROM balloon_bet WHERE game_sr_num = '$game_sr' AND game_id = '25'")); 
      $total_win = $tot_win['total_win'];
	 
	 $aviator_setting = mysqli_fetch_assoc(mysqli_query($conn,"select * from balloon_setting where id=1"));
// 	 echo "$aviator_setting";
// 	 die;
	 
	
	echo json_encode(array("message" => "Data fetched successfully",
						   "status" => 200,
						   'totalamount'=>intval($totalamount),
						   'totalusers'=>intval($totalusers),
						   'game_sr'=>intval($game_sr),
						   	'highestamount'=>intval($highestamount),
						   'adminmultiply'=>intval($multiplier),
						   'adminpercent'=>$aviator_setting['win_per']??0,
						   'loss_per'=>$aviator_setting['loss_per']??0,
						   'min_amount'=>$aviator_setting['amount']??0,
						   'total_win' => $total_win
						  ));
          exit;
}else{
	
    echo json_encode(array("message" => "Database connection failed", "status" => 400));
    exit;
}




?>
