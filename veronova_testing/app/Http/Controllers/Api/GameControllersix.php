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


class GameControllersix extends Controller
{
	public function sixteenGame(Request $request)
{
    $url = "https://16games.codescarts.com/api/merchant/games?key=2D3B62AA2D74";

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        return response()->json([
            'status' => false,
            'error' => curl_error($ch)
        ], 500);
    }

    curl_close($ch);

    // Decode JSON
    $data = json_decode($response, true);

    return response()->json([
        'status' => true,
        'data' => $data
    ]);
}
	
	

	public function launchGame(Request $request)
	{

		$request->validate([
			'user_id' => 'required',
			'game_id' => 'required',
			'wallet' => 'required|numeric',
			'name' => 'required',
			'profile_image' => 'required|url',
		]);

		$url = "https://16games.codescarts.com/api/game/launch";

		$data = [
			"user_id" => $request->user_id,
			"game_id" => $request->game_id,
			"key" => "2D3B62AA2D74",
			"wallet" => $request->wallet,
			"name" => $request->name,
			"profile_image" => $request->profile_image
		];

		$ch = curl_init($url);

		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			"Content-Type: application/json",
			"Accept: application/json"
		]);

		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

		$response = curl_exec($ch);

		if (curl_errno($ch)) {
			return response()->json([
				'status' => false,
				'error' => curl_error($ch),
				'request_data' => $data
			], 500);
		}

		curl_close($ch);

		return response()->json([
			'status' => true,
			'request_data' => $data,
			'api_response' => json_decode($response, true)
		]);
	}
	
	
	
	
	
	
	

}