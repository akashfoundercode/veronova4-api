<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\{AviatorModel,User};
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Routing\Controller; // Add this line

class NewPublicApiController extends Controller{
    
 public function beginner_guide() {
    $data = DB::table('settings')
        ->select('name', 'description', 'image')
        ->whereIn('type', [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21])
        ->orderBy('type', 'asc')
        ->get()
        ->map(function ($item) {
            $item->image = $item->image ? asset('/' . $item->image) : null;
            return $item;
        });
    return response()->json([
        'status' => 200,
        'message' => 'Beginner guide data fetched successfully',
        'data' => $data
    ]);
}

    public function announcement() {
        $data = DB::table('announcement')->get();
    
        if ($data->isEmpty()) {
            return response()->json([
                'status' => 400,
                'message' => 'No announcement found',
                'data' => []
            ],200);
        }
    
        return response()->json([
            'status' => 200,
            'data' => $data
        ],200);
    }
    
public function notification($user_id, $notification_id = null) {
    if ($notification_id) {
        $notification = DB::table('notifications')
            ->where('id', $notification_id)
            ->where('user_id', $user_id)
            ->first();

        if (!$notification) {
            return response()->json([
                'status' => 404,
                'message' => 'Notification not found for this user',
                'data' => []
            ], 200);
        }

        // Delete the notification
        DB::table('notifications')
            ->where('id', $notification_id)
            ->where('user_id', $user_id)
            ->delete();

        // Get remaining notifications
        $remaining = DB::table('notifications')
            ->where('user_id', $user_id)
            ->select('id', 'user_id', 'name', 'disc', 'created_at')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 200,
            'message' => 'Notification deleted successfully',
            'data' => $remaining
        ], 200);
    } else {
        $notifications = DB::table('notifications')
            ->where('user_id', $user_id)
            ->select('id', 'user_id', 'name', 'disc', 'created_at')
            ->orderBy('id', 'desc')
            ->get();

        if ($notifications->isEmpty()) {
            return response()->json([
                'status' => 404,
                'message' => 'No notifications found',
                'data' => []
            ], 200);
        }

        return response()->json([
            'status' => 200,
            'message' => 'Notifications fetched successfully',
            'data' => $notifications
        ], 200);
    }
}


     
 
}