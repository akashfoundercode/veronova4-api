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
use Illuminate\Support\Facades\Cache;



class MakazJiliController extends Controller
{    
    public function gameCategories_old()
{
    $categories = DB::table('tbl_game_category')
        ->where('status', 1)
        ->get();

    return response()->json([
        'status' => true,
        'message' => 'Game categories fetched successfully',
        'data' => $categories
    ], 200);
}

public function gameCategories()
{
    $categories = DB::table('tbl_game_category')
        ->where('status', 1)
        ->orderByRaw("
            CASE cat_name
                WHEN 'Jili' THEN 1
                WHEN 'Spribe' THEN 2
                WHEN 'Inout' THEN 3
                WHEN 'Evolution Live' THEN 4
                WHEN 'Evolution Live(Asia)' THEN 5
                WHEN 'Ezugi' THEN 6
                WHEN 'Bgaming' THEN 7
                WHEN 'SABASports(IBC)' THEN 8
                WHEN 'PGSoft' THEN 9
                ELSE 999
            END ASC
        ")
        ->orderBy('cat_name', 'ASC') // Optional: secondary sort for the rest
        ->get();

    return response()->json([
        'status' => true,
        'message' => 'Game categories fetched successfully',
        'data' => $categories
    ], 200);
}

    public function gamesByCategory(Request $request)
    {
        // ✅ Validation
        $validator = Validator::make($request->all(), [
            'cat_id' => 'required|integer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => $validator->errors()->first()
            ], 200);
        }

        $cat_id = $request->cat_id;

        // ✅ Fetch games
        $games = DB::table('tbl_games_list')
            ->where('cat_id', $cat_id)
            ->where('status', 1) // sirf active games (optional)
            ->orderBy('id', 'DESC')
            ->get();

        if ($games->isEmpty()) {
            return response()->json([
                'status' => false,
                'message' => 'No games found for this category',
                'data' => []
            ], 200);
        }

        return response()->json([
            'status' => true,
            'message' => 'Games list fetched successfully',
            'data' => $games
        ], 200);
    }
   

public function launchGame(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id'  => 'required',
        'game_uid' => 'required'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status'  => false,
            'message' => $validator->errors()->first()
        ]);
    }

    $userId  = $request->user_id;
    $gameUid = $request->game_uid;

    $user = DB::table('users')
        ->select('wallet', 'account_type', 'first_recharge')
        ->where('id', $userId)
        ->first();

    if (!$user) {
        return response()->json([
            'status' => false,
            'message' => 'User not found'
        ]);
    }

    if ($user->account_type == 1) {
        return response()->json([
            'status' => false,
            'message' => 'You are not a legal user.'
        ]);
    }

    if ($user->first_recharge == 0) {
        return response()->json([
            'status' => false,
            'message' => 'Please complete your first recharge to play this game.'
        ]);
    }

    $wallet = (float) $user->wallet;

    $token     = "ab381adbd9b445be8b8e6b1c5753bf";
    $secretKey = "55c1ab90bb07ffad39d24ed4be7849";
    $timestamp = round(microtime(true) * 1000);

    // Payload
    $payloadData = [
        "user_id"       => (string) $userId,
        "wallet_amount" => $wallet,
        "game_uid"      => (string) $gameUid,
        "token"         => $token,
        "timestamp"     => $timestamp
    ];

    $jsonPayload = json_encode($payloadData, JSON_UNESCAPED_SLASHES);

    // AES-256-ECB
    $encrypted = openssl_encrypt(
        $jsonPayload,
        'AES-256-ECB',
        $secretKey,
        OPENSSL_RAW_DATA
    );

    if ($encrypted === false) {
        return response()->json([
            'status' => false,
            'message' => 'Encryption failed'
        ]);
    }

    // Base64
    $payload = base64_encode($encrypted);

    // Game URL
    $gameUrl = "https://bulkapi.site/launch_game"
        . "?user_id=" . urlencode($userId)
        . "&wallet_amount=" . urlencode($wallet)
        . "&game_uid=" . urlencode($gameUid)
        . "&token=" . urlencode($token)
        . "&timestamp=" . urlencode($timestamp)
        . "&payload=" . urlencode($payload);

    // DEBUG
    // dd([
    //     'user_id'      => $userId,
    //     'wallet'       => $wallet,
    //     'game_uid'     => $gameUid,
    //     'token'        => $token,
    //     'timestamp'    => $timestamp,
    //     'json_payload' => $jsonPayload,
    //     'payload'      => $payload,
    //     'game_url'     => $gameUrl
    // ]);

    return response()->json([
        'status'   => true,
        'game_url' => $gameUrl
    ]);
    
//     return response()->json([
//     'user_id'      => $userId,
//     'wallet'       => $wallet,
//     'game_uid'     => $gameUid,
//     'token'        => $token,
//     'timestamp'    => $timestamp,
//     'json_payload' => $jsonPayload,
//     'payload'      => $payload,
//     'game_url'     => $gameUrl
// ]);
    
    
}

public function gameCategoriesMakaz()
{
    // Sirf category ID 5 aur 21
    $categories = DB::table('tbl_game_category')
        ->select('id', 'cat_name', 'img')
        ->whereIn('id', [5, 21])
        ->where('status', 'active')
        ->orderBy('id', 'ASC')
        ->get();

    $data = [];

    foreach ($categories as $category) {

        // Is category ke active games
        $games = DB::table('tbl_games_list')
            ->select('id', 'name', 'cat_id', 'gmId', 'img')
            ->where('cat_id', $category->id)
            ->where('status', 'active')
            ->orderBy('id', 'ASC') // 373, 374, 375...
            ->get();

        $data[] = [
            'cat_id'   => $category->id,
            'cat_name' => $category->cat_name,
            'img'      => $category->img,
            'count'    => $games->count(),
            'games'    => $games
        ];
    }

    return response()->json([
        'status'  => true,
        'message' => 'Game categories fetched successfully',
        'data'    => $data
    ], 200);
}



}