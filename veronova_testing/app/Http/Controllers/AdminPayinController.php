<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Validator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminPayinController extends Controller
{
  
   public function admin_payin(Request $request,$id)
    {
        //dd($id);

    $userid = $id;
    //dd($userid);
    $cash = $request->wallet;
   
    
	   //	$total_amt=$cash+$extra_amt+$bonus;
		 
               $date = date('YmdHis');
        $rand = rand(11111, 99999);
        $orderid = 'admin'.$date . $rand;

        $check_id = DB::table('users')->where('id',$userid)->first();
        
        if(1 == 1){
        if ($check_id) {
            
            $insert_payin = DB::table('payins')->insert([
                'user_id' => $userid,
                'cash' =>$cash,
                'type' => 1,
                'order_id' => $orderid,
                'redirect_url' => "admin",
                'status' => 1 // Assuming initial status is 0
            ]);
         
            if (!$insert_payin) {
                return response()->json(['status' => 400, 'message' => 'Failed to store record in payin history!']);
            }
            $redirect_url = env('APP_URL')."api/checkPayment?order_id=$orderid";
// dd($redirect_url);
       $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $redirect_url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
        $output = curl_exec($curl);
        curl_close($curl);

        } else {
            return response()->json([
                'status' => 400,
                'message' => 'Internal error!'
            ]);
        }
            
        }else{
           return response()->json([
                'status' => 400,
                'message' => 'USDT is Not Supported ....!'
            ]); 
        }
    }

  
  
}