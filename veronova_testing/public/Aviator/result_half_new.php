<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include 'dbconnection.php';

// Current completed period
$lastResult = mysqli_fetch_assoc(mysqli_query($conn,
    "SELECT COALESCE(MAX(game_sr_num),0) AS game_sr FROM aviator_result"
));

$currentPeriod = (int)$lastResult['game_sr'];

// Active period = next period
$game_sr = $currentPeriod + 1;

$data = mysqli_fetch_assoc(mysqli_query($conn, "
SELECT
    COALESCE(SUM(amount),0) totalamount,
    COUNT(uid) totalusers,
    COALESCE(MAX(amount),0) highestamount
FROM aviator_bet
WHERE game_id='5'
AND game_sr_num='$game_sr'
"));

$admin = mysqli_fetch_assoc(mysqli_query($conn,"
SELECT number
FROM aviator_admin_result
WHERE game_id='5'
AND game_sr_num='$game_sr'
LIMIT 1
"));

$setting = mysqli_fetch_assoc(mysqli_query($conn,"
SELECT *
FROM aviator_setting
WHERE id=1
"));

$totalWin = mysqli_fetch_assoc(mysqli_query($conn,"
SELECT COALESCE(SUM(win),0) total_win
FROM aviator_bet
WHERE game_id='5'
AND game_sr_num='$game_sr'
"));

echo json_encode([
    "status"=>200,
    "game_sr"=>$game_sr,
    "totalamount"=>(int)$data['totalamount'],
    "totalusers"=>(int)$data['totalusers'],
    "highestamount"=>(int)$data['highestamount'],
    "adminmultiply"=>$admin['number'] ?? 0,
    "adminpercent"=>$setting['win_per'] ?? 0,
    "loss_per"=>$setting['loss_per'] ?? 0,
    "min_amount"=>$setting['amount'] ?? 0,
    "total_win"=>$totalWin['total_win'] ?? 0
]);

?>
