<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Validator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class UsdtPayinController extends Controller
{

public function usdtPayin_old()
	{
		
		$amount = "1000.00";
		$coin = "USDT.BEP20";
		$userEmail = "adityajaora25@gmail.com"; 
		$token = "05046612816829581937590347280653"; 
		$transactionId = uniqid("txn_");
		$format = "json";
		$postData = [
			"txtamount" => $amount,
			"coin" => $coin,
			"UserID" => $userEmail,
			"Token" => $token,
			"TransactionID" => $transactionId,
			"format" => $format
		];
		$url = "https://cryptofit.biz/Payment/coinpayments_api_call";
		$ch = curl_init($url);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			'Content-Type: application/x-www-form-urlencoded'
		]);
		echo $response = curl_exec($ch);
		die;
		if (curl_errno($ch)) {
			echo "cURL Error: " . curl_error($ch);
		} else {
			$result = json_decode($response, true);

			if ($result && $result['status'] == 200) {
				echo "✅ Transaction Successful!\n";
				echo "💰 Amount: " . $result['amount'] . "\n";
				echo "🏦 Address: " . $result['address'] . "\n";
				echo "⏳ Timeout: " . $result['timeout'] . " seconds\n";
				echo "🔗 Status URL: " . $result['status_url'] . "\n";
				echo "🧾 QR Code URL: " . $result['qrcode_url'] . "\n";
			} else {
				echo "❌ API Error: " . ($result['error'] ?? 'Unknown error') . "\n";
			}
		}
		curl_close($ch);
	}
	
	public function usdtPayin(Request $request)
	{
		$validator = Validator::make($request->all(), [
			'user_id' => 'required|exists:users,id',
			'inr' => 'required',
			'type' => 'required',
			'cash'=>'required'
		]);

		$validator->stopOnFirstFailure();

		if ($validator->fails()) {
			return response()->json([
				'status' => "400",
				'message' => $validator->errors()->first()
			], 200);
		}

		// 2. Prepare data
		$inramount = $request->inr;
		$cash = $request->cash;
		$userid = $request->user_id;
		$type = $request->type;

		$dateTime = new \DateTime('now', new \DateTimeZone('Asia/Kolkata'));
		$formattedDateTime = $dateTime->format('YmdHis');
		$rand = rand(11111, 99999);
		$orderid = $formattedDateTime . $rand;

			$url = 'https://app.paydtx.com/api/create-deposit';
			$apiKey = '09d6d8b1-d06b-4a75-a06d-7eff6e3f5f4d';
			$data = [
				"amount" => (int)$cash,
				"network" => "TRC",
				"contractAddress" => "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
				"coinName" => "USDT",
				"ipnUrl" => "https://root.bdgcassino.com/api/usdt_callback",
				"udf1" => "$orderid"
			];
			$jsonData = json_encode($data);
			$ch = curl_init($url);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
			curl_setopt($ch, CURLOPT_HTTPHEADER, [
				'Content-Type: application/json',
				'x-api-key: ' . $apiKey
			]);
			 $response = curl_exec($ch);
			curl_close($ch);
		
		$data = json_decode($response, true);
		if (json_last_error() !== JSON_ERROR_NONE) {
			return response()->json([
				'status' => "400",
				'message' => 'invalid response'
			], 200);
			
		}
			$requiredKeys = ['txnId', 'address', 'network', 'contractAddress', 'expiresAt', 'coinName', 'amount', 'qr_url'];
			foreach ($requiredKeys as $key) {
				if (!isset($data[$key]) || empty($data[$key])) {
					return response()->json([
				'status' => "400",
				'message' => "missing $key in response"
			], 200);
				}
			}
			$txnId = $data['txnId'];
			$walletAddress = $data['address'];
			$network = strtoupper($data['network']);
			$contractAddress = $data['contractAddress'];
			$expiresAt = $data['expiresAt'];
			$coinName = strtoupper($data['coinName']);
			$amount = $data['amount'];
			$qrUrl = $data['qr_url'];
		
			$resp=[
			  "amount"=> $amount,
			  "address"=> "$walletAddress",
			  "orderid"=> "$contractAddress",
			  "qr"=> "$qrUrl"
			];
			$properData=base64_encode(json_encode($resp));
			$paymentUrl="https://root.bdgcassino.com/usdt/qr.php?"."data=".$properData;
			$responseForSend=['status'=>200,'msg'=>'payment link created','paymentUrl'=>$paymentUrl];
			echo  json_encode($responseForSend);




	}
	
	public function usdt_payin_callback(Request $request)
	{
		header('Content-Type: application/json');
		$rawInput = file_get_contents('php://input');
		
		DB::table('usdt_callbacks')->insert([
			'data' => $rawInput,
			'status' => 1
		]);
		
		
		$data = json_decode($rawInput, true);
		if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
			http_response_code(400); // Bad Request
			echo json_encode(["status" => false, "message" => "Invalid JSON"]);
			exit;
		}

		file_put_contents('webhook_log.txt', date('c') . ' - ' . print_r($data, true), FILE_APPEND);
		if (isset($data['event']) && $data['event'] === 'deposit_confirmed') {
			$txnId = $data['txnId'] ?? null;
			$amount = $data['amount'] ?? null;
			$status = $data['status'] ?? null;
			$udf1 = $data['udf1'] ?? null;
		}
		http_response_code(200);
		echo json_encode(["status" => true, "message" => "IPN received"]);
		
	}
	
	public function usdt_withdraw()
	{

$userid = "adityajaora25@gmail.com"; 
$token = "05046612816829581937590347280653"; 
$coin = "USDT.TRC20"; 
$address = "TAp3rKwFuw4bMeEdyF44T79n1fuvzLb3bS"; 
$amount = "19.00";
$transactionId = date('YmdHis') . rand(10000, 99999); 
$callbackUrl = "https://yourdomain.com/payout-callback"; 

$url = "https://cryptofit.biz/v1/Payoutm/payout_gateway";

$postData = [
    'userid' => $userid,
    'token' => $token,
    'txtcoin' => $coin,
    'txtaddress' => $address,
    'txtamount' => $amount,
    'transactionId' => $transactionId,
    'call_back_url' => $callbackUrl
];

$ch = curl_init($url);

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded'
]);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo "cURL Error: " . curl_error($ch);
} else {
    $result = json_decode($response, true);

    if (!$result) {
        echo "❌ Failed to parse response.";
    } elseif (isset($result['error']) && $result['error'] === false && $result['status'] === 'PENDING') {
        echo "✅ Payout Initiated. Status: " . $result['status'] . "\n";
        echo "📨 Message: " . $result['message'] . "\n";
    } elseif (isset($result['status']) && $result['status'] === 'Complete') {
        echo "✅ Payout Completed!\n";
        echo "💰 Amount: " . $result['amt'] . "\n";
        echo "🏦 Address: " . $result['send_address'] . "\n";
        echo "🔗 Transaction ID: " . $result['trans_id'] . "\n";
    } else {
        echo "❌ Error: " . $result['message'] . "\n";
    }
}

curl_close($ch);

	}

}