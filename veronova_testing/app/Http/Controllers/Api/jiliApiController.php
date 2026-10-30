<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str; 
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;


class jiliApiController extends Controller
{
	public function jilliGame(Request $request)
	{
	
         $validator = Validator::make($request->all(), [
					'user_id' => 'required',
					'amount' => 'required',
			 		'game_id' => 'required'
			 
				]);
				$validator->stopOnFirstFailure();
				if ($validator->fails()) {
					return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
				}  
		$userid=$request->user_id;
		$amount=$request->amount;
		$game_id=$request->game_id;
		
		$mobile_no=DB::select("SELECT `mobile`,`account_type` FROM `users` WHERE `id`=$userid");
		
		$mobile=$mobile_no[0]->mobile;
		$account_type=$mobile_no[0]->account_type;
		
		 if ($account_type != 0) {
			return response()->json(['status' => 400, 'message' => 'Game is not available for demo accounts.'], 200);
		}

		
		
		
		
		$secret_id = "d579e92e0778fb40e3e9a8c4d06515cb";
		$secret_key = "904884d270104938027e910fa6475c76";

		$payload = [
		  "user_id" => $mobile,
		  "balance" => (int)$amount,
		  "game_uid" => "$game_id",
		  "token" => "e6fb3cd374263f0b9e31d66339541182",
		  "timestamp" => round(microtime(true) * 1000)
		];

		$payload_json = json_encode($payload);
		$encrypted = openssl_encrypt($payload_json, "AES-256-ECB", $secret_key, OPENSSL_RAW_DATA);
		$encoded = base64_encode($encrypted);

		$url = "https://nuxapi.space/client.php?payload=" . urlencode($encoded) . "&secret_id=" . $secret_id;
		$resp=['gameid'=>$game_id,'userPhone'=>$mobile,'gameUrl'=>$url];
		
		echo json_encode($resp);

				

		
	}
	

	
	public function getJilliGames()
	{
		$curl = curl_init();

		curl_setopt_array($curl, array(
			CURLOPT_URL => "https://nuxapi.space/get_games.php?brand=JILI",
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_ENCODING => "",
			CURLOPT_MAXREDIRS => 10,
			CURLOPT_TIMEOUT => 15,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
			CURLOPT_CUSTOMREQUEST => "GET",
		));

		 $response = curl_exec($curl);
		
		 $get_games = json_decode($response, true);
		if (json_last_error() !== JSON_ERROR_NONE) {
			return response()->json([
				'status' => 400,
				'message' => 'Invalid JSON response',
				'data' => []
			]);
		}
		$games = [];
		foreach ($get_games as $game) {
			$games[] = [
				'gameNameEn' => $game['gameNameEn'] ?? null,
				'gameId' => $game['gameCode'] ?? null,
				'imgUrl' => $game['imgUrl'] ?? null,
				'category' => $game['category'] ?? null
			];
		}

		return response()->json([
			'status' => 200,
			'message' => 'Success',
			'data' => $games
		]);

	}

}