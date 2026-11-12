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

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(array("message" => "Method Not Allowed", "status" => 405));
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);

// Check if required fields are provided
if (!isset($input['totalamount']) || !isset($input['game_sr']) || !isset($input['adminpercent'])) {
    echo json_encode(array("message" => "Missing required fields", "status" => 400));
    exit;
} 

// Extract data from input
$totalamount = $input['totalamount'];
$game_sr = $input['game_sr'];		
$adminpercent = $input['adminpercent'];
$multiplier = $input['adminmultiply'];

 $q = mysqli_fetch_assoc(mysqli_query($conn,"SELECT SUM(`win`) AS total_win FROM `aviator_bet` WHERE `game_sr_num` = '$game_sr' AND `game_id` = '5' limit 1"));



if($q['total_win'] >($totalamount*0.01*$adminpercent)){
	echo json_encode(array("multi" => number_format($multiplier + 0.10, 2), "status" => 300));
	exit;
}elseif($multiplier > 3){
	echo json_encode(array("multi" =>number_format($multiplier + 0.10, 2), "status" => 200));
	exit;
}else{
	echo json_encode(array("multi" => 'wait', "status" => 200));
	exit;
}
  

?>
