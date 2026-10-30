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

class PayinController extends Controller
{
    
   public function innersoulcares(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|exists:users,id',
        'cash'    => 'required|numeric|min:1',
        'type'    => 'required|in:0',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status'  => 400,
            'message' => $validator->errors()->first()
        ]);
    }

    $userid = $request->user_id;
    $cash   = $request->cash;
    $type   = $request->type;

    // User Details
    $user = DB::table('users')->where('id', $userid)->first();

    if (!$user) {
        return response()->json([
            'status'  => 400,
            'message' => 'User not found'
        ]);
    }

    // Generate Order ID
    $orderId = 'ORD' . time() . rand(1000, 9999);

    // Redirect URL
    $redirect_url = "https://root.veronova.co.in/api/checkInnersoulPayment?order_id=".$orderId;

    // Save Pending Payment
    DB::table('payins')->insert([
        'user_id'      => $userid,
        'cash'         => $cash,
        'type'         => $type,
        'order_id'     => $orderId,
        'redirect_url' => $redirect_url,
        'status'       => 1, // Pending
        'typeimage'    => "https://root.veronova.co.in/public/uploads/payzaar.jpg",
        'created_at'   => now(),
        'updated_at'   => now(),
    ]);

    // Gateway Payload
    $payload = [
        "merchantid"   => "GIFTAURA00014",
        "orderid"      => $orderId,
        "amount"       => (string)$cash,
        "name"         => $user->username ?? "N/A",
        "email"        => !empty($user->email) ? $user->email : "johndoe@gmail.com",
        "mobile"       => !empty($user->mobile) ? $user->mobile : "9876543210",
        "remark"       => "Wallet Recharge",
        "type"         => "0",
        "redirect_url" => $redirect_url
    ];
	  

    // Curl Call
    $curl = curl_init();

    curl_setopt_array($curl, [
        CURLOPT_URL            => "https://pgapi.giftaura.shop/paynow",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            "Content-Type: application/json"
        ]
    ]);
	   //echo  json_encode($payload);
	   //die;

    $response = curl_exec($curl);
	   //dd($response);

		//$decodedResponse = json_decode($response, true);

		//dd([
		//	'raw_response'     => $response,
		//	'decoded_response' => $decodedResponse,
		//	'json_error'       => json_last_error_msg(),
		//]);

    if (curl_errno($curl)) {

        DB::table('payins')
            ->where('order_id', $orderId)
            ->delete();

        return response()->json([
            'status'  => 500,
            'message' => curl_error($curl)
        ]);
    }

    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

    curl_close($curl);

    $responseData = json_decode($response, true);

    if ($httpCode != 200 || !$responseData) {

        DB::table('payins')
            ->where('order_id', $orderId)
            ->delete();

        return response()->json([
            'status'  => 500,
            'message' => 'Invalid Gateway Response',
            'response' => $response
        ]);
    }

    if (($responseData['status'] ?? '') != "SUCCESS") {

        DB::table('payins')
            ->where('order_id', $orderId)
            ->delete();

        return response()->json([
            'status'  => 400,
            'message' => $responseData['message'] ?? 'Payment Link Generation Failed',
            'response' => $responseData
        ]);
    }

    // Clean Payment Link
    if (!empty($responseData['payment_link'])) {

        $paymentLink = preg_replace('/\s+/', '', $responseData['payment_link']);

        $responseData['payment_link'] = $paymentLink;

        $responseData['Qr_Link'] =
            "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" .
            urlencode($paymentLink);
    }

    return response()->json([
        'status'  => 200,
        'message' => 'Payment Link Generated Successfully',
        'data'    => $responseData
    ]);
}

public function checkInnersoulPayment(Request $request)
{
    $request->validate([
        'order_id' => 'required|string'
    ]);

    $orderId = $request->order_id;

    // Fetch Order
    $payin = DB::table('payins')
        ->where('order_id', $orderId)
        ->first();

    if (!$payin) {
        return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');
    }

    // Already Success
    if ($payin->status == 2) {
        return redirect()->away('https://root.veronova.co.in/uploads/payment_success.php');
    }

    // Already Failed
    if ($payin->status == 3) {
        return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');
    }

    // Pending Order -> Check Gateway Status

    $curl = curl_init();

    curl_setopt_array($curl, [
        CURLOPT_URL => "https://root.veronova.co.in/pg/v1/api/payinstatus?order_id=".$orderId,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPGET => true,
    ]);

    $response = curl_exec($curl);

    if (curl_errno($curl)) {

        curl_close($curl);

        return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');

    }

    curl_close($curl);

    $result = json_decode($response, true);

    if (!$result || !isset($result['status'])) {

        return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');

    }

    $gatewayStatus = strtolower($result['status']);

    // ---------------- Pending ----------------

    if ($gatewayStatus == "pending") {

        return redirect()->away('https://root.veronova.co.in/uploads/payment_pending.php');

    }

    // ---------------- Failed ----------------

    if ($gatewayStatus == "failed") {

        DB::table('payins')
            ->where('order_id', $orderId)
            ->where('status', 1)
            ->update([
                'status' => 3,
                'updated_at' => now()
            ]);

        return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');

    }

    // ---------------- Success ----------------
if ($gatewayStatus == "success") {

    DB::beginTransaction();

    try {

        // Lock Payin Row
        $payin = DB::table('payins')
            ->where('id', $payin->id)
            ->where('status', 1)
            ->lockForUpdate()
            ->first();

        // Agar kisi aur request ne pehle hi process kar diya ho
        if (!$payin) {

            DB::commit();

            return redirect()->away('https://root.veronova.co.in/uploads/payment_success.php');
        }

        // Lock User
        $user = DB::table('users')
            ->where('id', $payin->user_id)
            ->lockForUpdate()
            ->first();

        if (!$user) {

            DB::rollBack();

            return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');
        }

        $cash = (float) $payin->cash;

        // Wallet Update
        DB::table('users')
            ->where('id', $user->id)
            ->update([

                'wallet'            => DB::raw("wallet + {$cash}"),

                'deposit_balance'   => DB::raw("deposit_balance + {$cash}"),

                'total_payin'       => DB::raw("total_payin + {$cash}"),

                'no_of_payin'       => DB::raw("no_of_payin + 1"),

                'updated_at'        => now()

            ]);

        // Update Payin Status
        DB::table('payins')
            ->where('id', $payin->id)
            ->update([

                'status'     => 2, // Success

                'updated_at' => now()

            ]);

        DB::commit();

        return redirect()->away('https://root.veronova.co.in/uploads/payment_success.php');

    } catch (\Exception $e) {

        DB::rollBack();

        \Log::error('Innersoul Payment Error: '.$e->getMessage());

        return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');
    }
}

// Unknown Status
return redirect()->away('https://root.veronova.co.in/uploads/payment_failed.php');
}



    public function payzaaarCallback(Request $request){
    $data = $request->all(); // Get all POST data

    // Log callback for reference/debugging
    DB::table('payzaar_callback')->insert([
        'data'     => json_encode($data),
        'datetime' => now()
    ]);

    // Validate required fields
    $orderId = $data['orderid'] ?? null;
    $amount  = $data['amount'] ?? null;
    $status  = $data['status'] ?? null;
    $utr     = $data['utr'] ?? null;

    if (!$orderId || !$amount || !$status) {
        return response()->json(['status' => 400, 'message' => 'Missing required callback data']);
    }
    if (strtolower($status) === 'success') {

        $payin = DB::table('payins')->where('order_id', $orderId)->first();

        if ($payin && $payin->status != 2) {
            // Mark payin as successful
            DB::table('payins')->where('order_id', $orderId)->update(['status' => 2, 'updated_at' => now()]);

            $userId = $payin->user_id;
            $cash   = $payin->cash;

            $user = DB::table('users')->where('id', $userId)->first();

            if ($user) {
                // Update user wallet balances
                DB::table('users')->where('id', $userId)->update([
                    'wallet'          => DB::raw("wallet + $cash"),
                    'recharge'        => DB::raw("recharge + $cash"),
                    'total_payin'     => DB::raw("total_payin + $cash"),
                    'no_of_payin'     => DB::raw("no_of_payin + 1"),
                    'deposit_balance' => DB::raw("deposit_balance + $cash")
                ]);

                // First recharge check
                if ($user->first_recharge == 0) {
                    DB::table('users')->where('id', $userId)->update([
                        'first_recharge'        => $cash,
                        'first_recharge_amount' => $cash
                    ]);

                    // Referral update
                    if ($user->referral_user_id) {
                        DB::table('users')->where('id', $user->referral_user_id)->update([
                            'yesterday_payin'         => DB::raw("yesterday_payin + $cash"),
                            'yesterday_no_of_payin'   => DB::raw("yesterday_no_of_payin + 1"),
                            'yesterday_first_deposit' => DB::raw("yesterday_first_deposit + $cash")
                        ]);
                    }
                }
            }
        }
    }

    return response()->json(['status' => 200, 'message' => 'Callback processed']);
}

    public function checkPayzaaarPayment(Request $request){
    $orderid = $request->input('order_id');

    if (empty($orderid)) {
        return response()->json(['status' => 400, 'message' => 'Order ID is required']);
    }

    $match_order = DB::table('payins')->where('order_id', $orderid)->where('status', 1)->first();

    if (!$match_order) {
        return response()->json(['status' => 400, 'message' => 'Order ID not found or already processed']);
    }

    $uid      = $match_order->user_id;
    $cash     = $match_order->cash;
    $type     = $match_order->type;
    $datetime = now();

    $update_payin = DB::table('payins')
        ->where('order_id', $orderid)
        ->where('status', 1)
        ->where('user_id', $uid)
        ->update(['status' => 2]);

    if (!$update_payin) {
        return response()->json(['status' => 400, 'message' => 'Failed to update payment status']);
    }

    // Check if it's user's first recharge
    $referData = DB::table('users')->select('referral_user_id', 'first_recharge')->where('id', $uid)->first();
    $referuserid     = $referData->referral_user_id;
    $first_recharge  = $referData->first_recharge;

    if ($first_recharge == 0) {
        $extra = DB::table('extra_first_deposit_bonus')
            ->where('first_deposit_ammount', '<=', $cash)
            ->where('max_amount', '>=', $cash)
            ->first();

        if ($extra) {
            $bonus  = $extra->bonus;
            $amount = $cash + $bonus;

            DB::table('extra_first_deposit_bonus_claim')->insert([
                'userid'         => $uid,
                'extra_fdb_id'   => $extra->id,
                'amount'         => $cash,
                'bonus'          => $bonus,
                'status'         => 0,
                'created_at'     => $datetime,
                'updated_at'     => $datetime,
            ]);

            DB::update("UPDATE users 
                SET 
                    wallet = wallet + $amount,
                    first_recharge = 1,
                    first_recharge_amount = first_recharge_amount + $amount,
                    recharge = recharge + $amount,
                    total_payin = total_payin + $amount,
                    no_of_payin = no_of_payin + 1,
                    deposit_balance = deposit_balance + $amount
                WHERE id = ?", [$uid]);

        } else {
            // No extra bonus matched
            DB::update("UPDATE users 
                SET 
                    wallet = wallet + $cash,
                    first_recharge = 1,
                    first_recharge_amount = first_recharge_amount + $cash,
                    recharge = recharge + $cash,
                    total_payin = total_payin + $cash,
                    no_of_payin = no_of_payin + 1,
                    deposit_balance = deposit_balance + $cash
                WHERE id = ?", [$uid]);
        }

        if (!empty($referuserid)) {
            DB::update("UPDATE users 
                SET 
                    yesterday_payin = yesterday_payin + $cash,
                    yesterday_no_of_payin = yesterday_no_of_payin + 1,
                    yesterday_first_deposit = yesterday_first_deposit + $cash,
                    created_at = ?
                WHERE id = ?", [$datetime, $referuserid]);
        }

    } else {
        // Not first recharge
        DB::update("UPDATE users 
            SET 
                wallet = wallet + $cash,
                recharge = recharge + $cash,
                total_payin = total_payin + $cash,
                no_of_payin = no_of_payin + 1,
                deposit_balance = deposit_balance + $cash
            WHERE id = ?", [$uid]);

        if (!empty($referuserid)) {
            DB::update("UPDATE users 
                SET 
                    yesterday_payin = yesterday_payin + $cash,
                    yesterday_no_of_payin = yesterday_no_of_payin + 1
                WHERE id = ?", [$referuserid]);
        }
    }

    // ✅ Redirect to success page
    return redirect()->away('https://root.jupitergames.world/uploads/payment_success.php');
}
	
    public function withdraw_request(Request $request){
    	    $date = date('Ymd');
            $rand = rand(1111111, 9999999);
            $transaction_id = $date . $rand;
    	
    		 $userid=$request->userid;
    		 $amount=$request->amount;
    		   $validator=validator ::make($request->all(),
            [
                'userid'=>'required',
    			'amount'=>'required',
    			
            ]);
            $date=date('Y-m-d h:i:s');
            if($validator ->fails()){
                $response=[
                    'success'=>"400",
                    'message'=>$validator ->errors()
                ];                                                   
                
                return response()->json($response,400);
            }
          
    		 $datetime = date('Y-m-d H:i:s');
    		 
             $user = DB::select("SELECT * FROM `users` where `id` =$userid");
    		 $account_id=$user[0]->accountno_id;
    		 $mobile=$user[0]->mobile;
    		 $wallet=$user[0]->wallet;
    // 		 dd($wallet);
    		 $accountlist=DB::select("SELECT * FROM `bank_details` WHERE `id`=$account_id");
    		 
    		 $insert= DB::table('transaction_history')->insert([
            'userid' => $userid,
            'amount' => $amount,
            'mobile' => $mobile,
    		  'account_id'=>$account_id,
            'status' => 0,
    			 'type'=>1,
            'date' => $datetime,
    		  'transaction_id' => $transaction_id,
        ]);
    		  DB::select("UPDATE `users` SET `wallet`=`wallet`-$amount,`winning_wallet`=`winning_wallet`-$amount  WHERE `id`=$userid");
              if($insert){
              $response =[ 'success'=>"200",'data'=>$insert,'message'=>'Successfully'];return response ()->json ($response,200);
          }
          else{
           $response =[ 'success'=>"400",'data'=>[],'message'=>'Not Found Data'];return response ()->json ($response,400); 
          } 
        }
	
    public function redirect_success(){
        return view('success');
    }
	
	
// 	 public function qr_view() 
//     {

//       $show_qr = DB::select("SELECT* FROM `usdt_qr`");
//       //$show_qr = DB::select("SELECT `name`, `qr_code` FROM `usdt_qr`");

//         if ($show_qr) {
//             $response = [
//                 'message' => 'Successfully',
//                 'status' => 200,
//                 'data' => $show_qr
//             ];

//             return response()->json($response,200);
//         } else {
//             return response()->json(['message' => 'No record found','status' => 400,
//                 'data' => []], 400);
//         }
//     }
    
//   public function usdt_payin(Request $request){
//     $validator = Validator::make($request->all(), [
//         'user_id' => 'required|exists:users,id',
//         'cash' => 'required|numeric',
//         'type' => 'required|integer',
//     ]);

//     if ($validator->fails()) {
//         return response()->json([
//             'status' => 400,
//             'message' => $validator->errors()->first()
//         ]);
//     }

//     $usdt = $request->cash;
//     $image = $request->screenshot;
//     $type = $request->type;
//     $userid = $request->user_id;
//     $inr = $usdt;
//     $datetime = now();
//     $orderid = date('YmdHis') . rand(11111, 99999);

//     // Validate image input
//     if (empty($image) || $image === '0' || $image === 'null' || $image === null || $image === '' || $image === 0) {
//         return response()->json([
//             'status' => 400,
//             'message' => 'Please Select Image'
//         ]);
//     }

//     // Handle image saving
//     $path = '';
//     if (!empty($image)) {
//         $imageData = base64_decode($image);
//         if ($imageData === false) {
//             return response()->json([
//                 'status' => 400,
//                 'message' => 'Invalid base64 encoded image'
//             ]);
//         }

//         // Save image to /public/usdt_images directory
//         $newName = Str::random(6) . '.png';
//         $relativePath = 'usdt_images/' . $newName;

//         // Ensure directory exists
//         if (!file_exists(public_path('usdt_images'))) {
//             mkdir(public_path('usdt_images'), 0775, true);
//         }

//         // Save the image file
//         if (!file_put_contents(public_path($relativePath), $imageData)) {
//             return response()->json([
//                 'status' => 400,
//                 'message' => 'Failed to save image'
//             ]);
//         }

//         // Generate URL to store in DB
//         $path = asset('usdt_images/' . $newName);
//     }

//     // Handle type == 0 (payin logic)
//     if ($type == 1) {
//         $insert_usdt = DB::table('payins')->insert([
//             'user_id' => $userid,
//             'cash' => $usdt * 90,
//             'usdt_amount' => $inr,
//             'type' => '1',
//             'typeimage' => $path,
//             'order_id' => $orderid,
//             'status' => 1,
//             'created_at' => $datetime,
//             'updated_at' => $datetime
//         ]);

//         if ($insert_usdt) {
//             return response()->json([
//                 'status' => 200,
//                 'message' => 'USDT Payment Request sent successfully. Please wait for admin approval.'
//             ]);
//         } else {
//             return response()->json([
//                 'status' => 500,
//                 'message' => 'Failed to insert USDT Payment'
//             ]);
//         }
//     } else {
//         return response()->json([
//             'status' => 400,
//             'message' => 'Invalid Type'
//         ]);
//     }
// }

//     public function payin_usdt(Request $request){
//     // Validation
//         $validator = Validator::make($request->all(), [
//             'user_id' => 'required|exists:users,id',
//             'amount' => 'required|numeric|gt:0',
//             'type' => 'required|in:1',
//         ]);
     
//         $validator->stopOnFirstFailure();
        
//         if ($validator->fails()) {
//             return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
//         }
    
//         // Get input data
//         $user_id = $request->user_id;
//         $amount = $request->amount;
//         $type = $request->type;
//         $inr_amt = $amount * 94;
        
//         // Get client IP address
//       // $clientIp = $request->ip();
    
//         // Dump and die to see IP address
//         //dd('Client IP Address:', $clientIp); // Here, you can see the IP
    
//         $email = 'Globalbettech@gmail.com'; 
//         $token = '58839776549046321236110964258208'; // Replace with a secure token or config value
//         $apiUrl = "https://cryptofit.biz/Payment/coinpayments_api_call";
//         $coin = 'USDT.BEP20';
    
//         // Generate unique order ID
//         do {
//             $orderId = str_pad(mt_rand(1000000000, 9999999999), 10, '0', STR_PAD_LEFT);
//         } while (DB::table('payins')->where('order_id', $orderId)->exists());
    
//         // User validation
//         $user_exist = DB::table('users')->where('id', $user_id)->first();
    
//         // Prepare API data
//         $formData = [
//             'txtamount' => $amount,
//             'coin' => $coin,
//             'UserID' => $email,
//             'Token' => $token,
//             'TransactionID' => $orderId,
//         ];
    
//         try {
//             // Make API request
//             $response = Http::asForm()->post($apiUrl, $formData);
//             Log::info('PayIn API Response:', ['response' => $response->body()]);
//             Log::info('PayIn API Status Code:', ['status' => $response->status()]);
//             // Decode the response
//             $apiResponse = json_decode($response->body());
//             // You can dump API response here
    
//             // Check if the API response is successful
//             if ($response->successful() && isset($apiResponse->error) && $apiResponse->error === 'ok') {
//                 // Insert data into payins table
//                 $inserted_id = DB::table('payins')->insertGetId([
//                     'user_id' => $user_id,
//                     'status' => 1,
//                     'order_id' => $orderId,
//                     'cash' => $inr_amt,
//                     'usdt_amount' => $amount,
//                     'type' => $type,
//                 ]);
    
//                 return response()->json([
//                     'status' => 200,
//                     'message' => 'Payment initiated successfully.',
//                     'data' => $apiResponse,
//                 ], 200);
//             }
    
//             return response()->json([
//                 'status' => 400,
//                 'message' => 'Failed to initiate payment.'
//             ], 400);
//         } catch (\Exception $e) {
//             Log::error('PayIn API Error:', ['error' => $e->getMessage()]);
//             return response()->json(['status' => 400, 'message' => 'Internal Server Error'], 400);
//         }
//     }
    
//     public function payin_call_back(Request $request){
		
// 		$validator = Validator::make($request->all(), [
// 					'invoice' => 'required',
// 					'status_text' => 'required',
// 					'amount' => 'required'
// 				]);

// 				$validator->stopOnFirstFailure();

// 				if ($validator->fails()) {
// 					return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
// 				}
		
// 		$invoice = $request->invoice;
// 		$status_text = $request->status_text;
// 		$amount = $request->amount;
// 		if($status_text=='complete'){
			
//           $a =  DB::table('payins')->where('order_id',$invoice)->update(['status'=>2]);
			
// 			if($a){
// 				$user_detail = Payin::where('order_id', $invoice)
//                             ->where('status', 2)
//                             ->first();
// 				$user_id=$user_detail->user_id;
// 				$amount1=$user_detail->cash;
// 				//$update_wallet = jilli::update_user_wallet($user_id);
// 				$update=User::where('id', $user_id)->update(['wallet' => $amount1]);
// 				$add_jili = jilli::add_in_jilli_wallet($user_id,$amount1);
// 				return response()->json(['status'=>200,'message'=>'Payment successful.'],200);
// 			}else{
// 			   return response()->json(['status'=>400,'message'=>'Failed to update!'],400);
// 			}
// 		}else{
//           return response()->json(['status'=>400,'message'=>'Something went wrong!'],400);
// 		}
// 	}

// public function payin(Request $request)
// {
//     $validator = Validator::make($request->all(), [
//         'user_id' => 'required|exists:users,id',
//         'cash' => 'required|numeric|min:100',
//         'type' => 'required'
//     ]);

//     $validator->stopOnFirstFailure();
//     if ($validator->fails()) {
//         return response()->json([
//             'status' => "400",
//             'message' => $validator->errors()->first()
//         ], 200);
//     }

//     $cash = $request->cash;
//     $userid = $request->user_id;
//     $type = $request->type;

//     $dateTime = new \DateTime('now', new \DateTimeZone('Asia/Kolkata'));
//     $formattedDateTime = $dateTime->format('YmdHis');
//     $rand = rand(11, 99);
//     $orderid = "TXT".$formattedDateTime . $rand;

//     // Get user manually via query
//     $user = DB::table('users')->where('id', $userid)->first();
	
// 	$email = $user->email ?? Str::random(10) . '@example.com';
// 	$username = $user->username ?? 'user';
	
//     $account_type = $user->account_type;
//     if ($account_type == 1) {
		
//         DB::table('users')->where('id', $userid)->increment('wallet', $cash);
// 		DB::table('payins')->insert([
//                     'user_id' => $userid,
//                     'cash' => $cash,
//                     'type' => $type,
//                     'order_id' => $orderid,
//                     'status' => 2,
//                     'created_at' => $dateTime,
//                     'updated_at' => $dateTime,
//                 ]);
//         return view('success');
//     }

//     //dd($user);
//     if ($user) { 
//         if ($cash >= 1) {
//             if ($type == '2') {
//                 $bonus = 0;
//                 $totalAmount = $cash;
//                 $baseUrl = URL::to('/');
//                 $redirect_url = $baseUrl . "/api/checkPayment?order_id=$orderid";

//                 // Insert into payin table manually
//                 $inserted = DB::table('payins')->insert([
//                     'user_id' => $user->id,
//                     'cash' => $cash,
//                     'bonus' => $bonus,
//                     'type' => $type,
//                     'order_id' => $orderid,
//                     'redirect_url' => $redirect_url,
//                     'status' => 1,
//                     'created_at' => $dateTime,
//                     'updated_at' => $dateTime,
//                 ]);

//                 if (!$inserted) {
//                     return response()->json([
//                         'status' => "400",
//                         'message' => 'Failed to store record in payin history!'
//                     ], 200);
//                 }

                 
//                 $postParameter = [
//                     "merchantid" => "INDIANPAY00INDIANPAY00147",
//                     "orderid" => $orderid,
//                     "amount" => $totalAmount,
//                     "name" => $username,
//                     "email" => $email,
//                     "mobile" => $user->mobile,
//                     "remark" => "payIn",
//                     "type" => "2",
//                     "redirect_url" => $redirect_url
//                 ];
// //dd($postParameter);
				
// 			//	echo json_encode($postParameter);die;
//                 // Call external payment API
//                 $curl = curl_init();
//                 curl_setopt_array($curl, [
//                     CURLOPT_URL => 'https://indianpay.co.in/admin/paynow',
//                     CURLOPT_RETURNTRANSFER => true,
//                     CURLOPT_ENCODING => '',
//                     CURLOPT_MAXREDIRS => 10,
//                     CURLOPT_TIMEOUT => 0,
//                     CURLOPT_FOLLOWLOCATION => true,
//                     CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
//                     CURLOPT_CUSTOMREQUEST => 'POST',
//                     CURLOPT_POSTFIELDS => json_encode($postParameter),
//                     CURLOPT_HTTPHEADER => [
//                         'Content-Type: application/json',
//                         'Cookie: ci_session=oo35jvjuvh3ukuk9t7biecukphiiu8vl'
//                     ],
//                 ]);
//                 $response = curl_exec($curl);
//                 curl_close($curl);
//                 echo $response;
// 				//dd($response);
//             } else {
//                 return response()->json([
//                     'status' => "400",
//                     'message' => 'Invalid type value!'
//                 ], 200);
//             }
//         } else {
//             return response()->json([
//                 'status' => "400",
//                 'message' => 'Minimum Deposit amount is 100 rs!'
//             ], 200);
//         }
//     } else {
//         return response()->json([
//             'status' => "400",
//             'message' => 'Internal error! User not found.'
//         ], 400);
//     }
// }



// 	public function checkPayment(Request $request){
// 		$orderid = $request->input('order_id');

// 		if (empty($orderid)) {
// 			return response()->json(['status' => 400, 'message' => 'Order ID is required']);
// 		}

// 		$match_order = DB::table('payins')
// 			->where('order_id', $orderid)
// 			->where('status', 1)
// 			->first();

// 		if (!$match_order) {
// 			return response()->json(['status' => 400, 'message' => 'Order ID not found or already processed']);
// 		}

// 		$uid  = $match_order->user_id;
// 		$cash = $match_order->cash;

// 		// ✅ Mark payin as success
// 		$updated = DB::table('payins')
// 			->where('order_id', $orderid)
// 			->update(['status' => 2]);

// 		if (!$updated) {
// 			return response()->json(['status' => 400, 'message' => 'Failed to update payment status']);
// 		}

// 		// ✅ Get user info
// 		$user = DB::table('users')->where('id', $uid)->first();
// 		$first_recharge = $user->first_recharge;
// 		$referral_user_id = $user->referral_user_id;

// 		// ✅ Update user wallet always
// 		DB::table('users')->where('id', $uid)->update([
// 			'wallet' => DB::raw("wallet + $cash"),
// 			'recharge' => DB::raw("recharge + $cash"),
// 			'total_payin' => DB::raw("total_payin + $cash"),
// 			'no_of_payin' => DB::raw("no_of_payin + 1"),
// 			'deposit_balance' => DB::raw("deposit_balance + $cash")
// 		]);
		
//          DB::table('wallet_history')->insert([
// 						'userid' => $uid,
// 						'amount' => $cash,
// 						'subtypeid' => "3",
// 						'created_at' => now(),
//                         'updated_at' => now()
// 					]);
		
// 		// ✅ First Recharge Logic
// 		if ($first_recharge == 0) {

// 			if ($cash >= 1000) {
// 				$self_bonus = $cash * 0.15;

// 				// ✅ Bonus to self
// 				DB::table('users')
// 					->where('id', $uid)
// 					->update([
// 						'wallet' => DB::raw("wallet + $self_bonus")
// 					]);
				
// 				 DB::table('wallet_history')->insert([
// 						'userid' => $uid,
// 						'amount' => $self_bonus,
// 						'subtypeid' => "9",
// 						'created_at' => now(),
//                         'updated_at' => now()
// 					]);

// 				// ✅ Bonus to referral
// 				if (!empty($referral_user_id) && $referral_user_id != 0) {
// 					DB::table('users')
// 						->where('id', $referral_user_id)
// 						->update([
// 							'wallet' => DB::raw("wallet + $self_bonus")
// 						]);
// 					DB::table('wallet_history')->insert([
// 						'userid' => $referral_user_id,
// 						'amount' => $self_bonus,
// 						'subtypeid' => "33",
// 						'created_at' => now(),
//                         'updated_at' => now()
// 					]);
// 				}
// 			}

// 			// ✅ Update first recharge
// 			DB::table('users')->where('id', $uid)->update([
// 				'first_recharge' => 1
// 			]);

// 		} else {
// 			// ✅ Check second recharge
// 			$success_count = DB::table('payins')
// 				->where('user_id', $uid)
// 				->where('status', 2)
// 				->count();
          
// 			if ($success_count == 2 && $cash >= 1000) {
// 				$self_bonus = $cash * 0.20;

// 				// ✅ 20% Bonus to self only
// 				DB::table('users')
// 					->where('id', $uid)
// 					->update([
// 						'wallet' => DB::raw("wallet + $self_bonus")
// 					]);
// 				DB::table('wallet_history')->insert([
// 						'userid' => $uid,
// 						'amount' => $self_bonus,
// 						'subtypeid' => "34",
// 						'created_at' => now(),
//                         'updated_at' => now()
// 					]);
// 			}
// 		}

// 		return view('success');
// 	}

public function payin(Request $request)
{
	
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|exists:users,id',
        'cash' => 'required|numeric|min:100',
        'type' => 'required'
    ]);

    $validator->stopOnFirstFailure();
    if ($validator->fails()) {
        return response()->json([
            'status' => "400",
            'message' => $validator->errors()->first()
        ], 200);
    }

    $cash = $request->cash;
    $userid = $request->user_id;
    $type = $request->type;

    $dateTime = new \DateTime('now', new \DateTimeZone('Asia/Kolkata'));
    $formattedDateTime = $dateTime->format('YmdHis');
    $rand = rand(11, 99);
    $orderid = "TXT".$formattedDateTime . $rand;

    // Get user manually via query
    $user = DB::table('users')->where('id', $userid)->first();
	
	$email = $user->email ?? Str::random(10) . '@example.com';
	$username = $user->username ?? 'user';
	
    $account_type = $user->account_type;
    if ($account_type == 1) {
		
        DB::table('users')->where('id', $userid)->increment('wallet', $cash);
		DB::table('payins')->insert([
                    'user_id' => $userid,
                    'cash' => $cash,
                    'type' => $type,
                    'order_id' => $orderid,
                    'status' => 2,
                    'created_at' => $dateTime,
                    'updated_at' => $dateTime,
                ]);
        return view('success');
    }

    //dd($user);
    if ($user) { 
        if ($cash >= 1) {
            if ($type == '2') {
                $bonus = 0;
                $totalAmount = $cash;
                $baseUrl = URL::to('/');
                $redirect_url = $baseUrl . "/api/checkPayment?order_id=$orderid";

                // Insert into payin table manually
                $inserted = DB::table('payins')->insert([
                    'user_id' => $user->id,
                    'cash' => $cash,
                    'bonus' => $bonus,
                    'type' => $type,
                    'order_id' => $orderid,
                    'redirect_url' => $redirect_url,
                    'status' => 1,
                    'created_at' => $dateTime,
                    'updated_at' => $dateTime,
                ]);

                if (!$inserted) {
                    return response()->json([
                        'status' => "400",
                        'message' => 'Failed to store record in payin history!'
                    ], 200);
                }

                 
                $postParameter = [
                    "merchantid" => "GIFTAURA00008",
                    "orderid" => $orderid,
                    "amount" => $totalAmount,
                    "name" => $username,
                    "email" => $email,
                    "mobile" => $user->mobile,
                    "remark" => "payIn",
                    "type" => "2",
                    "redirect_url" => $redirect_url
                ];

				
			//	echo json_encode($postParameter);die;
                // Call external payment API
                $curl = curl_init();
                curl_setopt_array($curl, [
                    CURLOPT_URL => 'https://pgapi.giftaura.shop/paynow',
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_ENCODING => '',
                    CURLOPT_MAXREDIRS => 10,
                    CURLOPT_TIMEOUT => 0,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                    CURLOPT_CUSTOMREQUEST => 'POST',
                    CURLOPT_POSTFIELDS => json_encode($postParameter),
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json',
                        'Cookie: ci_session=oo35jvjuvh3ukuk9t7biecukphiiu8vl'
                    ],
                ]);
                $response = curl_exec($curl);
                curl_close($curl);
                echo $response;
				//dd($response);
            } else {
                return response()->json([
                    'status' => "400",
                    'message' => 'Invalid type value!'
                ], 200);
            }
        } else {
            return response()->json([
                'status' => "400",
                'message' => 'Minimum Deposit amount is 100 rs!'
            ], 200);
        }
    } else {
        return response()->json([
            'status' => "400",
            'message' => 'Internal error! User not found.'
        ], 400);
    }
}



	public function checkPayment(Request $request){
		$orderid = $request->input('order_id');

		if (empty($orderid)) {
			return response()->json(['status' => 400, 'message' => 'Order ID is required']);
		}

		$match_order = DB::table('payins')
			->where('order_id', $orderid)
			->where('status', 1)
			->first();
//dd($match_order);
		if (!$match_order) {
			return response()->json(['status' => 400, 'message' => 'Order ID not found or already processed']);
		}

		$uid  = $match_order->user_id;
		$cash = $match_order->cash;

		// ✅ Mark payin as success
		$updated = DB::table('payins')
			->where('order_id', $orderid)
			->update(['status' => 2]);

		if (!$updated) {
			return response()->json(['status' => 400, 'message' => 'Failed to update payment status']);
		}

		// ✅ Get user info
		$user = DB::table('users')->where('id', $uid)->first();
		$first_recharge = $user->first_recharge;
		$referral_user_id = $user->referral_user_id;

		// ✅ Update user wallet always
		DB::table('users')->where('id', $uid)->update([
			'wallet' => DB::raw("wallet + $cash"),
			'recharge' => DB::raw("recharge + $cash"),
			'total_payin' => DB::raw("total_payin + $cash"),
			'no_of_payin' => DB::raw("no_of_payin + 1"),
			'deposit_balance' => DB::raw("deposit_balance + $cash")
		]);
		
         DB::table('wallet_history')->insert([
						'userid' => $uid,
						'amount' => $cash,
						'subtypeid' => "3",
						'created_at' => now(),
                        'updated_at' => now()
					]);
		
		// ✅ First Recharge Logic
		if ($first_recharge == 0) {

			if ($cash >= 1000) {
				$self_bonus = $cash * 0.15;

				// ✅ Bonus to self
				DB::table('users')
					->where('id', $uid)
					->update([
						'wallet' => DB::raw("wallet + $self_bonus")
					]);
				
				 DB::table('wallet_history')->insert([
						'userid' => $uid,
						'amount' => $self_bonus,
						'subtypeid' => "9",
						'created_at' => now(),
                        'updated_at' => now()
					]);

				// ✅ Bonus to referral
				if (!empty($referral_user_id) && $referral_user_id != 0) {
					DB::table('users')
						->where('id', $referral_user_id)
						->update([
							'wallet' => DB::raw("wallet + $self_bonus")
						]);
					DB::table('wallet_history')->insert([
						'userid' => $referral_user_id,
						'amount' => $self_bonus,
						'subtypeid' => "33",
						'created_at' => now(),
                        'updated_at' => now()
					]);
				}
			}

			// ✅ Update first recharge
			DB::table('users')->where('id', $uid)->update([
				'first_recharge' => 1
			]);

		} else {
			// ✅ Check second recharge
			$success_count = DB::table('payins')
				->where('user_id', $uid)
				->where('status', 2)
				->count();
          
			if ($success_count == 2 && $cash >= 1000) {
				$self_bonus = $cash * 0.20;

				// ✅ 20% Bonus to self only
				DB::table('users')
					->where('id', $uid)
					->update([
						'wallet' => DB::raw("wallet + $self_bonus")
					]);
				DB::table('wallet_history')->insert([
						'userid' => $uid,
						'amount' => $self_bonus,
						'subtypeid' => "34",
						'created_at' => now(),
                        'updated_at' => now()
					]);
			}
		}

		return view('success');
	}









}
