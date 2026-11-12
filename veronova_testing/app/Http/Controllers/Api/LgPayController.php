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
use Illuminate\Support\Facades\Log;


class LgPayController extends Controller
{
    private function md5_sign($data, $key, $unset = []) {
        ksort($data);
        foreach ($unset as $value) {
            unset($data[$value]);
        }
        $string = http_build_query($data);
        $string = urldecode($string);
        $string = trim($string) . "&key=" . $key;
        return strtoupper(md5($string));
    }

    // Route 1: Payment Initiate
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

        if ($user) { 
            if ($cash >= 1) {
                if ($type == '2') {
                    $bonus = 0;
                    $totalAmount = $cash;
                    $baseUrl = URL::to('https://admin.funplay.services');
                    $notify_url = $baseUrl . "/api/lg-pay-checkPayment";

                    // Insert into payin table
                    $inserted = DB::table('payins')->insert([
                        'user_id' => $user->id,
                        'cash' => $cash,
                        'bonus' => $bonus,
                        'type' => $type,
                        'order_id' => $orderid,
                        'redirect_url' => $notify_url,
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

                    // LG PAY API Configuration
                    $app_id = "YD5200";  // Provided by LG PAY
                    $secret_key = "5c8I4NTbwzWBHlUbJwcDsqw54gxBoJbW";  // Provided by LG PAY
                    $trade_type = "INRUPI";  // Test mode (use "test" for testing)
                    
                    $lgData = [
                        "app_id" => $app_id,
                        "trade_type" => $trade_type,
                        "order_sn" => $orderid,
                        "money" => $cash * 100,  // Convert to paisa
                        "notify_url" => $notify_url,
                        "ip" => $request->ip() ?? "139.180.137.164",
                        "remark" => "payIn",
                    ];

                    $lgData["sign"] = $this->md5_sign($lgData, $secret_key);

                    $curl = curl_init();
                    curl_setopt_array($curl, [
                        CURLOPT_URL => 'https://www.lg-pay.com/api/order/create',
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_ENCODING => '',
                        CURLOPT_MAXREDIRS => 10,
                        CURLOPT_TIMEOUT => 0,
                        CURLOPT_FOLLOWLOCATION => true,
                        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                        CURLOPT_CUSTOMREQUEST => 'POST',
                        CURLOPT_POSTFIELDS => http_build_query($lgData),
                        CURLOPT_HTTPHEADER => [
                            'Content-Type: application/x-www-form-urlencoded'
                        ],
                    ]);
                    
                    
                    $response = curl_exec($curl);
                    curl_close($curl);
                
                    
                    echo $response;
                    die;
                    
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
    

    // Route 2: Callback/Webhook (Notify URL)
    public function lgPayCallback(Request $request){
        
      //  dd($$request->all());
        Log::info('LG Pay Callback', $request->all());
        
        $data = $request->all();
        
        // Log callback
        DB::table('payzaar_callback')->insert([
            'data' => json_encode($data),
            'datetime' => now()
        ]);

        $secret_key = "5c8I4NTbwzWBHlUbJwcDsqw54gxBoJbW";  // Provided by LG PAY
        $sign = $data['sign'] ?? '';
        
        $dataForVerify = $data;
        unset($dataForVerify['sign']);

        $generatedSign = $this->md5_sign($dataForVerify, $secret_key);
        
        if ($generatedSign !== $sign) {
            echo "success";
            return;
        }

        $orderId = $data['order_sn'] ?? null;
        $amount = $data['money'] ?? null;
        $status = $data['status'] ?? null;

        if (!$orderId || !$amount || !$status) {
            echo "success";
            return;
        }

        if (strtolower($status) === 'success' || $status == '1' || $status == 'SUCCESS') {
            $match_order = DB::table('payins')
                ->where('order_id', $orderId)
                ->where('status', 1)
                ->first();

            if ($match_order) {
                $uid = $match_order->user_id;
                $cash = $match_order->cash;

                $updated = DB::table('payins')
                    ->where('order_id', $orderId)
                    ->update(['status' => 2]);

                if ($updated) {
                    $user = DB::table('users')->where('id', $uid)->first();
                    $first_recharge = $user->first_recharge;
                    $referral_user_id = $user->referral_user_id;

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
                    
                    if ($first_recharge == 0) {
                        if ($cash >= 1000) {
                            $self_bonus = $cash * 0.15;

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

                        DB::table('users')->where('id', $uid)->update([
                            'first_recharge' => 1
                        ]);

                    } else {
                        $success_count = DB::table('payins')
                            ->where('user_id', $uid)
                            ->where('status', 2)
                            ->count();
                      
                        if ($success_count == 2 && $cash >= 1000) {
                            $self_bonus = $cash * 0.20;

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
                }
            }
        }
        echo "success";
    }
}