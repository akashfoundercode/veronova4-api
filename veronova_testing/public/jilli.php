<?php

$userId=$_GET['userPhone'];
$amount=$_GET['amount'];
$gameId=$_GET['gameId'];


$secret_id = "7ab0710c35f413a6f98aa91a236e78bb";
$secret_key = "305bb8629f07f4263b345ece36aa7cc9";

$payload = [
  "user_id" => "$userId",
  "balance" => (int)$amount,
  "game_uid" => "$gameId",
  "token" => "f0c5dd36bd9c995b1d6193e0c6008f66",
  "timestamp" => round(microtime(true) * 1000)
];

$payload_json = json_encode($payload);
$encrypted = openssl_encrypt($payload_json, "AES-256-ECB", $secret_key, OPENSSL_RAW_DATA);
$encoded = base64_encode($encrypted);

$url = "https://nuxapi.space/client.php?payload=" . urlencode($encoded) . "&secret_id=" . $secret_id;
$resp=['gameid'=>$gameId,'userPhone'=>$userId,'gameUrl'=>$url];
return json_encode($resp);

?>