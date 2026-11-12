<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Models\{AccountDetail,WithdrawHistory,User};
// use App\Models\Project_maintenance;

class WidthdrawlController extends Controller{
    
    public function success(Request $request,$id)
    {
		$value = $request->session()->has('id');
		
     if(!empty($value))
        {
        
         $data=DB::select("SELECT account_details.*, users.email AS email, users.mobile AS mobile, withdraw_histories.amount AS amount, admin_settings.longtext AS mid, (SELECT admin_settings.longtext FROM admin_settings WHERE id = 13) AS token, (SELECT admin_settings.longtext FROM admin_settings WHERE id = 14 ) AS orderid FROM account_details LEFT JOIN users ON account_details.user_id = users.id LEFT JOIN withdraw_histories ON withdraw_histories.user_id = users.id && withdraw_histories.account_id=account_details.id LEFT JOIN admin_settings ON admin_settings.id = 12 WHERE withdraw_histories.id=$id;");
      
    //dd($data);
         foreach ($data as $object) {
            
            // $object->amount
            $name= $object->name;
            $ac_no= $object->account_number;
            $ifsc=$object->ifsc_code;
            $bankname= $object->bank_name;
            $email= $object->email;
            $mobile=$object->mobile;
            $amount=$object->amount;
            $mid=$object->mid;
            $token=$object->token;
            $orderid=$object->orderid;
        }
		//dd($token,$mid,$amount,$ac_no); 
		
        $rand=rand(11111111,99999999);
      $randid="$rand";
      //$amount
       $payoutdata=  json_encode(array(    
         "merchant_id"=>$mid,
         "merchant_token"=>$token,
         "account_no"=>$ac_no,
         "ifsccode"=>$ifsc,
         "amount"=>$amount,
         "bankname"=>$bankname,
         "remark"=>"payout",
         "orderid"=>$randid,
         "name"=>$name,
         "contact"=>$mobile,
         "email"=>$email
      ));
    
    // Encode the payout data using base64
    $salt = base64_encode($payoutdata);
    
    // Prepare the JSON data
    $json = [
        "salt" => $salt
    ];
    
    // Initialize cURL session
    $curl = curl_init();
    
		 
    // Set cURL options
    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://pgapi.giftaura.shop/single_transaction',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode($json), // Encode JSON data
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json' // Set Content-Type header
        ),
    ));
    
    // Execute cURL request and get the response
    $response = curl_exec($curl);
    //dd($response);
    // Check for errors
    if (curl_errno($curl)) {
        echo 'Error: ' . curl_error($curl);
    } else {
        // Print the response
        echo $response;
    }
    
    // Close cURL session
    curl_close($curl);
	
    DB::select("UPDATE `withdraw_histories` SET `status`='2',`response`='$response' WHERE id=$id;");
		 return redirect()->route('widthdrawl', '1')->with('key', 'value');

    }
		else
        {
           return redirect()->route('login');  
        }
			
			
    }
	
	
  public function indiaonlin_payout(Request $request, $id)
{
    $data = DB::select("
        SELECT 
            account_details.*, 
            users.email AS email, 
            users.mobile AS mobile, 
            withdraw_histories.amount AS amount, 
            (SELECT `longtext` FROM admin_settings WHERE id = 13) AS token, 
            (SELECT `longtext` FROM admin_settings WHERE id = 14) AS orderid 
        FROM account_details 
        LEFT JOIN users ON account_details.user_id = users.id 
        LEFT JOIN withdraw_histories ON withdraw_histories.user_id = users.id AND withdraw_histories.account_id = account_details.id 
        WHERE withdraw_histories.id = ?
    ", [$id]);

    if (empty($data)) {
        return redirect()->route('widthdrawl', '1')->with('error', 'Withdrawal not found.');
    }

    $object = $data[0];
    $name = $object->name;
    $email = $object->email;
    $mobile = $object->mobile;
    $ac_no = $object->account_number;
    $ifsc = $object->ifsc_code;
    $bankname = $object->bank_name;
    $amount = $object->amount;
    $token = $object->token; // not used but kept for similarity
    $orderid = $object->orderid; // not used but kept for similarity

    // Random invoice number (same as previous logic)
    $rand = rand(11111111, 99999999);
    $date = date('YmdHis');
    $invoiceNumber = $date . $rand;

    // Prepare API data
   
	   $payoutdata=  json_encode(array(    
         "merchant_id"=> "GIFTAURA00014",
         "merchant_token"=> "nZrQIFXZpiix8xjXoxpBakKjTt6ANW6y",
         "account_no"=> $ac_no,
         "ifsccode"=>$ifsc,
         "amount"=>$amount,
         "bankname"=>$bankname,
         "remark"=>"payout",
         "orderid"=>$orderid,
         "name"=>$name,
         "contact"=>$mobile,
         "email"=>$email
      ));
  
    // Encode payload in base64 (same process as earlier)
    $salt = base64_encode($payoutdata);

    // Prepare JSON
    $json = [
        "salt" => $salt
    ];

    // CURL request
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => 'https://pgapi.giftaura.shop/single_transaction',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode($json),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Cookie: Path=/'
        ],
    ]);

    $response = curl_exec($curl);
  //dd($response);
    if (curl_errno($curl)) {
        $errorMsg = curl_error($curl);
        curl_close($curl);
        return redirect()->route('widthdrawl', '1')->with('error', 'Curl Error: ' . $errorMsg);
    }

    curl_close($curl);

    // Decode response
    $dataArray = json_decode($response, true);

    if (isset($dataArray['Data']['Status']) && $dataArray['Data']['Status'] === "Received") {
        $referenceId = $dataArray['Data']['ReferenceId'] ?? null;

        // Update withdraw status
        DB::table('withdraw_histories')
            ->where('id', $id)
            ->update([
                'referenceId' => $referenceId,
                'response'    => $response,
                'status'      => 2
            ]);

        return redirect()->route('widthdrawl', '1')->with('success', 'Withdrawal approved successfully.');
    }

    // Save failed response
    DB::table('withdraw_histories')
        ->where('id', $id)
        ->update([
            'response' => $response,
            'status'   => 3 // failed
        ]);

    return redirect()->route('widthdrawl', '1')->with('error', 'Payout failed or not accepted.');
}


       public function reject(Request $request,$id){
       $rejectionReason = $request->input('msg');
	  $data=DB::select("SELECT * FROM `withdraw_histories` WHERE id=$id;");
		$amt=$data[0]->amount;
		$useid=$data[0]->user_id;
         $value = $request->session()->has('id');
     if(!empty($value))
        {
       $ss= DB::select("UPDATE `withdraw_histories` SET `status`='3',`rejectmsg`='$rejectionReason' WHERE id=$id;");
    	DB::select("UPDATE `users` SET `wallet`=`wallet`+'$amt' WHERE id=$useid;");
       return redirect()->route('widthdrawl', '1')->with('key', 'value');
		  }
		 else
        {
           return redirect()->route('login');  
        }
			

       // return redirect()->route('widthdrawl/0');
  }
	
	public function widthdrawl_index($id)
{
    $widthdrawls = DB::table('withdraw_histories')
        ->leftJoin('users', 'withdraw_histories.user_id', '=', 'users.id')
        ->leftJoin('account_details', 'account_details.id', '=', 'withdraw_histories.account_id')
        ->select(
            'withdraw_histories.*',
            'users.username AS uname',
            'users.mobile AS mobile',
            'account_details.account_number AS acno',
            'account_details.name AS name',
            'account_details.upi_id AS upi_id',
            'account_details.bank_name AS bname',
            'account_details.ifsc_code AS ifsc'
        )
        ->where('withdraw_histories.status', $id)
        ->where('withdraw_histories.type', 2)
        ->whereNotNull('users.id')
        ->orderBy('withdraw_histories.id', 'DESC')
        ->paginate(10); // 20 records per page

    return view('widthdrawl.index', compact('widthdrawls', 'id'));
}
    
 public function widthdrawl_index_08_05_2026($id)
{
    $widthdrawls = DB::select("
        SELECT 
            withdraw_histories.*, 
            users.username AS uname, 
            users.mobile AS mobile, 
            account_details.account_number AS acno, 
			account_details.name AS name,
            account_details.upi_id AS upi_id, 
            account_details.bank_name AS bname, 
            account_details.ifsc_code AS ifsc 
        FROM withdraw_histories 
        LEFT JOIN users ON withdraw_histories.user_id = users.id 
        LEFT JOIN account_details ON account_details.id = withdraw_histories.account_id 
        WHERE withdraw_histories.`status` = ? 
            AND withdraw_histories.`type` = 2
            AND users.id IS NOT NULL 
        ORDER BY withdraw_histories.id DESC
    ", [$id]);
//dd($widthdrawls);
    return view('widthdrawl.index', compact('widthdrawls'))->with('id', $id);
}

    
    public function success_by_upi(Request $request, $id)
    {
     //dd($request);
    $value = $request->session()->has('id');
   
    $pin = 2020;
    $inputPin = $request->input('pin');
    
    if ($inputPin == $pin) {
        if (!empty($value)) {
            $data = DB::select("SELECT account_details.*, users.email AS email, users.mobile AS mobile, withdraw_histories.amount AS amount, admin_settings.longtext AS mid, 
                                (SELECT admin_settings.longtext FROM admin_settings WHERE id = 13) AS token, 
                                (SELECT admin_settings.longtext FROM admin_settings WHERE id = 14 ) AS orderid 
                                FROM account_details 
                                LEFT JOIN users ON account_details.user_id = users.id 
                                LEFT JOIN withdraw_histories ON withdraw_histories.user_id = users.id AND withdraw_histories.account_id = account_details.id 
                                LEFT JOIN admin_settings ON admin_settings.id = 12 
                                WHERE withdraw_histories.id = ?", [$id]);
   
            if (empty($data)) {
                return redirect()->route('widthdrawl', '1')->with('error', 'No withdrawal data found for the specified ID.');
            }
   
            $object = $data[0];  
            $upiid = $object->upi_id;
            $amount = $object->amount;
            $mid = $object->mid;
            $token = $object->token;

            $rand = rand(11111111111111, 99999999999999);
            $randid = "$rand";

            $curl = curl_init();
dd($curl);
            curl_setopt_array($curl, array(
              CURLOPT_URL => "https://indianpay.co.in/admin/PayViaUpi?upiid=$upiid&amount=$amount&merchantId=$mid&token=$token&orderid=$randid",
              CURLOPT_RETURNTRANSFER => true,
              CURLOPT_ENCODING => '',
              CURLOPT_MAXREDIRS => 10,
              CURLOPT_TIMEOUT => 0,
              CURLOPT_FOLLOWLOCATION => true,
              CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
              CURLOPT_CUSTOMREQUEST => 'GET',
              CURLOPT_HTTPHEADER => array(
                'Content-Type: application/json'
              ),
            ));

            $response = curl_exec($curl);
           //dd($response);

            if (curl_errno($curl)) {
                return redirect()->back()->with('error', 'CURL Error: ' . curl_error($curl));
            }

            curl_close($curl);

            // Check if response is not empty and is valid JSON
            if (empty($response)) {
                return redirect()->back()->with('error', 'Empty response from the server');
            }

            $datta = json_decode($response);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return redirect()->back()->with('error', 'Invalid JSON response');
            }

            // Ensure that $datta is not null before accessing properties
            if (is_object($datta) && isset($datta->status)) {
                $status = $datta->status;
                $error = $datta->error;

                if ($status == 400) {
                    return redirect()->back()->with('error', $error);
                }

                DB::update("UPDATE `withdraw_histories` SET `status` = ?, `response` = ?, `remark` = 'by upi' WHERE id = ?", [2, $response, $id]);
                return redirect()->route('widthdrawl', '1')->with('key', 'value');
            } else {
                return redirect()->back()->with('error', 'Unexpected response structure');
            }

        } else {
            return redirect()->route('login');
        }
    } else {
        return redirect()->route('widthdrawl', '1')
            ->withInput()  
            ->withErrors(['pin' => 'Invalid pin. Please try again.']);
    }
}
   

    public function PayzaaarWitdhraw(Request $request)
    {
        $id = $request->query('id'); // or use $request->input('id'); for POST
        if (!$id) {
            return response()->json([
                'status' => false,
                'message' => 'Withdrawal ID is missing'
            ], 400);
        }
        $pin = 2020;
        $inputPin = $request->input('pin');
        $value = $request->session()->has('id'); // SESSION CHECK
        if ($inputPin == $pin) {
            if (!empty($value)) {
                // Fetch withdrawal data
                $data = DB::select("SELECT account_details.*, users.email AS email, users.mobile AS mobile, withdraw_histories.amount AS amount, admin_settings.longtext AS mid, 
                                        (SELECT admin_settings.longtext FROM admin_settings WHERE id = 13) AS token, 
                                        (SELECT admin_settings.longtext FROM admin_settings WHERE id = 14 ) AS orderid 
                                    FROM account_details 
                                    LEFT JOIN users ON account_details.user_id = users.id 
                                    LEFT JOIN withdraw_histories ON withdraw_histories.user_id = users.id AND withdraw_histories.account_id = account_details.id 
                                    LEFT JOIN admin_settings ON admin_settings.id = 12 
                                    WHERE withdraw_histories.id = ?", [$id]);
    
                if (empty($data)) {
                    return response()->json([
                        'status' => false,
                        'message' => 'No withdrawal data found for this ID.'
                    ], 404);
                }
                //dd($data);
    
                $object = $data[0];
                $name = $object->name;
                $ac_no = $object->account_number;
                $ifsc = $object->ifsc_code;
                $bankname = $object->bank_name;
                $email = $object->email;
                $mobile = $object->mobile;
                $amount = $object->amount;
                $mid = $object->mid;
                $token = $object->token;
                $randid = rand(11111111111111, 99999999999999);
                // Update status before API call
                DB::update("UPDATE `withdraw_histories` SET `status` = 1 WHERE id = ?", [$id]);
                // Step 1: Encrypt
                $payload = [
                    "data" => [
                        "merchantid" => "$mid",
                        "apitoken" => "$token",
                        "accountholdername" => "$name",
                        "accountnumber" => "$ac_no",
                        "ifsc" => "$ifsc",
                        "bankname" => "$bankname",
                        "orderid" => "$randid",
                        "remark" => "Payment for order #$randid",
                        "amount" => "$amount",
                        "email" => "$email",
                        "phone" => "$mobile"
                    ],
                    "apiToken" => "$token"
                ];
                $jsonPayload = json_encode($payload);
                $curl = curl_init();
                curl_setopt_array($curl, [
                    CURLOPT_URL => 'https://payzaaar.com/dashboard/api/letsencrypt',
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $jsonPayload,
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json',
                    ]
                ]);
                $response = curl_exec($curl);
                curl_close($curl);
                // Step 2: Payout
                $dataDecode = json_decode($response, true);
                $payloadData = $dataDecode['data'] ?? '';
    
                $payoutPayload = [
                    "data" => "$payloadData",
                    "apitoken" => "$token"
                ];
    
                $curl = curl_init();
                curl_setopt_array($curl, [
                    CURLOPT_URL => 'https://payzaaar.com/dashboard/api/payout',
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CUSTOMREQUEST => 'POST',
                    CURLOPT_POSTFIELDS => json_encode($payoutPayload),
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json',
                        'X-Merchant-ID: USER000107',
                        'X-Api-Key: 6afce6b69d62883533af545c8088ee96'
                    ]
                ]);
                $response2 = curl_exec($curl);
                curl_close($curl);
    
                // Step 3: Decrypt
                $encodeDataForDecode = json_decode($response2, true);
                $payloadForDecode = $encodeDataForDecode['data'] ?? '';
    
                $payoutPayloadRes = [
                    "encodedData" => "$payloadForDecode",
                    "apiToken" => "$token"
                ];
    
                $curl = curl_init();
                curl_setopt_array($curl, [
                    CURLOPT_URL => 'https://payzaaar.com/dashboard/api/letsDecrypt',
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CUSTOMREQUEST => 'POST',
                    CURLOPT_POSTFIELDS => json_encode($payoutPayloadRes),
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json',
                    ]
                ]);
                $response3 = curl_exec($curl);
                curl_close($curl);
    
                // ✅ Final update in withdraw history
                DB::update("UPDATE `withdraw_histories` SET `status` = 2, `response` = ? WHERE id = ?", [$response3, $id]);
    
                return redirect()->route('widthdrawl', '1')->with('success', 'Withdrawal processed successfully!');
            } else {
                return redirect()->route('login');
            }
        } else {
            return redirect()->route('widthdrawl', '1')
                ->withInput()
                ->withErrors(['pin' => 'Invalid pin. Please try again.']);
        }
    }		
		
		
 

  
    public function only_success(Request $request,$id)    
    {           
    $value = $request->session()->has('id');
    // dd($id);
     $pin = 2020;

    // Retrieve the pin input from the request (e.g., assuming the input name is 'pin')
    $inputPin = $request->input('pin');
//dd($pin , $inputPin);
    // Check if the input pin matches the predefined pin
    if ($inputPin == $pin) {
    
    if(!empty($value))
    {
        // Update withdraw histories status
        DB::update("UPDATE `withdraw_histories` SET `status` = '2' WHERE `status` = '1' AND `id` = ?", [$id]);
        
        // Fetch the withdraw histories data if necessary
       // $widthdrawls = DB::table('withdraw_histories')->get();
        
        // Pass $widthdrawls to the view
         return redirect()->back()->with('success', 'withdraw approved successfully!');
    }
    else
    {
        // If no session ID is found, redirect to login
        return redirect()->route('login');  
    }
    } else {
        // Pin does not match, return an invalid pin message
        return redirect()->route('widthdrawl', '1')
            ->withInput()  // Keep user input in the form
            ->withErrors(['pin' => 'Invalid pin. Please try again.']);
    }
}


    // Encryption and Decryption Functions
     private function encryptData($data, $key, $iv)
     {
        $encrypted = openssl_encrypt($data, 'aes-256-cbc', $key, 0, $iv);
        if ($encrypted === false) {
            abort(500, 'Encryption failed');
        }
        return $encrypted;
    }

     private function decryptData($data, $key, $iv)
     {
        $decrypted = openssl_decrypt($data, 'aes-256-cbc', $key, 0, $iv);
        if ($decrypted === false) {
            abort(500, 'Decryption failed');
        }
        return $decrypted;
    }

     public function sendEncryptedPayoutRequest($id)
     {
        
        $validator = Validator::make(['id' => $id], [
            'id' => 'required|exists:withdraw_histories,id',
        ]);
        
        $withdrawHistory = WithdrawHistory::with('account','user')->where('id',$id)->where('type',1)->where('status',1)->first();
      
       
       
        $transactionId = now()->format('YmdHis') . rand(11111, 99999);
        
        $authId = 'M00006488';
        $authKey = 'tE2Pl4nM4Bj1Ez4lA9kP9fu7Qc5jG4jT';
    
        $amount = $withdrawHistory->amount;

        // Prepare JSON Data
        $jsonData = json_encode([
            "type" => "test",
            "description" => "Salary Payout",
            "AuthID" => $authId,
            "paymentRequests" => [
                [
                    "amount" => "$amount",
                    "ClientTxnId" => $withdrawHistory->order_id,
                    "txnMode" => "IMPS",
                    "account_number" => $withdrawHistory->account->account_number,
                    "account_Ifsc" => $withdrawHistory->account->ifsc_code,
                    "bank_name" => $withdrawHistory->account->bank_name,
                    "account_holder_name" => $withdrawHistory->account->name,
                    "beneficiary_name" => $withdrawHistory->account->name,
                    "vpa" => "NA",
                    "adf1" => $withdrawHistory->user->mobile,
                    "adf2" => $withdrawHistory->user->email,
                    "adf3" => "NA",
                    "adf4" => "NA",
                    "adf5" => "NA"
                ]
            ]
        ]);
        
        
        // dd($jsonData);

        if (!$jsonData) {
             return response()->json(['error' => 'Failed to encode JSON data'], 500);
            
        }

        // Encrypt Data
        $iv = substr($authKey, 0, 16);
        $encryptedData = $this->encryptData($jsonData, $authKey, $iv);

        // Prepare POST Data
        $postData = [
            'EncReq' => $encryptedData,
            'AuthID' => $authId
        ];

        // Send POST Request
        $url = 'https://dashboard.skill-pay.in/crmpre/PayoutBulkRaised';

        try {
            $response = Http::post($url, $postData);
            
            if ($response->failed()) {
                
                 user::where('id',$withdrawHistory->user_id)->where('status',1)
                    ->update(['wallet' => DB::raw("wallet + $withdrawHistory->amount")]);
                    
             WithdrawHistory::where('id',$id)->where('type',3)->where('status',1)->update(['status' => 3]);
             
             return redirect()->back()->with('error','Payout request failed!');
                
               // return response()->json(['error' => 'Failed to send request'], 500);
            }

            // Decode the response
            $responseData = $response->json();
            
           // return response()->json($responseData);
           
           WithdrawHistory::where('id',$id)->where('type',3)->where('status',1)->update(['status' => 2]);
           
           return redirect()->back()->with('success','Payout request was successful!');

        } catch (\Exception $e) {
            return response()->json(['error' => 'Request failed: ' . $e->getMessage()], 500);
        }
    }


      public function withdraw_response()
     {
    // Get the withdraw responses from the database
    $withdraw_responses = DB::select("SELECT `id`, `response` FROM `withdraw_histories` WHERE `response` IS NOT NULL;");
    
    // Loop through the results
    foreach ($withdraw_responses as $response) {
        $user_id = $response->id;
        $response_text = $response->response;
        $response_data = json_decode($response_text);
        $status = $response_data->status;
        //dd($status);
        // Update the status in the database based on the response status
        if ($status == 200) {
            DB::update("UPDATE `withdraw_histories` SET `status` = ? WHERE `id` = ?", [4, $user_id]);
        } else {
            DB::update("UPDATE `withdraw_histories` SET `status` = ? WHERE `id` = ?", [5, $user_id]);
        }
    }
}


	

	
	

}
