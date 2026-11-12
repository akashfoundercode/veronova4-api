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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class ManualUsdtController extends Controller
{
public function get_usdt()
{
    $data = DB::table('usdt_qr')
        ->select(
            'id',
            'wallet_address',
            'qr_code as image',
            'created_at'
        )
        ->get();

    if ($data->isNotEmpty()) {

        return response()->json([
            'status' => 200,
            'data' => $data
        ]);

    } else {

        return response()->json([
            'status' => 404,
            'data' => []
        ]);
    }
}
public function payin_usdt(Request $request){
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|exists:users,id',
        'cash' => 'required|numeric',
	    'inr' => 'required|numeric',
        'type' => 'required|integer',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ]);
    }

    // ✅ Check if type is not 1
    if ($request->type != 1) {
        return response()->json([
            'status' => 400,
            'message' => 'Please enter valid type'
        ]);
    }

    $usdt = $request->cash;
    $image = $request->screenshot;
    $type = $request->type;
    $userid = $request->user_id;
	$inr = $request->inr;
    $datetime = now();
    $orderid = date('YmdHis') . rand(11111, 99999);
	

    if (empty($image) || $image === '0' || $image === 'null' || $image === null || $image === '' || $image === 0) {
        return response()->json([
            'status' => 400,
            'message' => 'Please Select Image'
        ]);
    }

    $path = '';

    if (!empty($image)) {
        $imageData = base64_decode($image);
        if ($imageData === false) {
            return response()->json([
                'status' => 400,
                'message' => 'Invalid base64 encoded image'
            ]);
        }

        $newName = Str::random(6) . '.png';
        $path = 'usdt_images/' . $newName;

        if (!file_put_contents(public_path($path), $imageData)) {
            return response()->json([
                'status' => 400,
                'message' => 'Failed to save image'
            ]);
        }
    }

    $user = DB::table('users')->where('id', $userid)->first();

    if ($user->status == 0) {
        return response()->json([
            'status' => 400,
            'message' => 'Your account is blocked. You cannot make a deposit.'
        ]);
    }
    $insert_usdt = DB::table('payins')->insert([
        'user_id' => $userid,
        'cash' => $inr ,
        'usdt_amount' => $usdt,
        'type' => $type,
        'screenshot' => $path,
        'order_id' => $orderid,
        'status' => 1,
        'created_at' => $datetime,
        'updated_at' => $datetime
    ]);

    if ($insert_usdt) {
        return response()->json([
            'status' => 200,
            'message' => 'Payment Request sent successfully. Please wait for admin approval.'
        ]);
    } else {
        return response()->json([
            'status' => 400,
            'message' => 'Failed to process payment'
        ]);
    }
}
	
	
	
	
}
