<?php 

namespace App\Helpers;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class Jilli
{
	public static function jilliIndex(){
		return ("abc");
	}
	
	public static function deduct_from_wallet($user_id, $amount){
		 
		$account_token = DB::table('users')->where('id',$user_id)->value('account_token');
		$apiUrl = 'https://api.gamebridge.co.in/seller/v1/amount-transfer-from-user';
	    $manager_key = 'FEGISo8cR74cf';
	    $headers = [
					'authorization' => 'Bearer ' .$manager_key,
					'validateuser' => 'Bearer '.$account_token
				   ];
	
		       $pay_load = ['transfer_amount'=>$amount];
		       $pay_load = json_encode($pay_load);
		       $pay_load = base64_encode($pay_load);
		       $payloadpar = ['payload'=>$pay_load];
		
		try {
				$response = Http::withHeaders($headers)->post($apiUrl, $payloadpar);
				$apiResponse = json_decode($response->body());
				// Check if API call was successful
				if ($response->successful() && isset($apiResponse->error) && $apiResponse->error == false) {
		return ['status'=>false,'message' => 'Transaction details..','newBalance'=>$apiResponse->newBalance,'utr_no'=>$apiResponse->utr_no];
				}
            return ['status'=>true,'message' =>$response->body()];
			} catch (\Exception $e) {
				Log::error('PayIn API Error:', ['error' => $e->getMessage()]);
			    return ['status'=>true,'message' =>$e->getMessage()];
			}
	}
	
	
	public static function add_in_jilli_wallet($user_id, $amount){
	    $account_token = DB::table('users')->where('id',$user_id)->value('account_token');
		$apiUrl = 'https://api.gamebridge.co.in/seller/v1/transfer-amount-to-user';
		$manager_key = 'FEGISo8cR74cf';
	    $headers = [
				'authorization' => 'Bearer ' .$manager_key,
				'validateuser' => 'Bearer '.$account_token
			];
		$pay_load = ['transfer_amount'=>$amount];
		$pay_load = json_encode($pay_load);
		$pay_load = base64_encode($pay_load);
		$payloadpar = ['payload'=>$pay_load];
		
		try {
				$response = Http::withHeaders($headers)->post($apiUrl, $payloadpar);
				$apiResponse = json_decode($response->body());
				// Check if API call was successful
				if ($response->successful() && isset($apiResponse->error) && $apiResponse->error == false) {
	                 return ['status'=>false,'message' =>$apiResponse->msg,'utr_no'=>$apiResponse->utr_no];
				}
				// Handle API errors
			     return ['status'=>true,'message' =>$apiResponse->msg];
			} catch (\Exception $e) {
				// Log exception
				Log::error('PayIn API Error:', ['error' => $e->getMessage()]);
			    return ['status'=>true,'message' =>$e->getMessage()];
			}
	}
	
	public function update_user_wallet($user_id)
	{	
		$token=User::where('id',$user_id)->first();
		$user_token=$token->account_token;
		$apiUrl = 'https://api.gamebridge.co.in/seller/v1/get-user-info';
		$manager_key = 'FEGISo8cR74cf';
	    $headers = [
				'authorization' => 'Bearer ' .$manager_key,
				'validateuser' => 'Bearer '.$user_token
			];
		$payloadpar = ['payload'=>''];
		
		try {
				$response = Http::withHeaders($headers)->post($apiUrl, $payloadpar);
				$apiResponse = json_decode($response->body());
			$money=$apiResponse->money;
			//dd($money);
				// Check if API call was successful
				if ($response->successful() && isset($apiResponse->error) && $apiResponse->error == false) {
					$update=User::where('id', $user_id)->update(['wallet' => $money]);
					return 1;
				}
				// Handle API errors
				return 0;
			} catch (\Exception $e) {
				// Log exception
				Log::error('PayIn API Error:', ['error' => $e->getMessage()]);
				// Return server error response
				return 0;
			}
		
	}
	
	
	
	
}




	
	
	