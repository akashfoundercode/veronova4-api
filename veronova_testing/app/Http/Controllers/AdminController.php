<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use DB;
use Illuminate\Support\Str;
use App\Models\All_image;
use Carbon\Carbon;

use Illuminate\Support\Facades\URL;


class AdminController extends Controller
{
    
public function admin_details(Request $request)
{
    $users = DB::table('users')->get();
    $startDate = $request->input('start_date');
    $endDate = $request->input('end_date');

    // Date normalization
    $startDateTime = null;
    $endDateTime = null;
    if ($startDate && $endDate) {
        if ($startDate === $endDate) {
            $startDateTime = $startDate . ' 00:00:00';
            $endDateTime = $endDate . ' 23:59:59';
        } else {
            $startDateTime = $startDate;
            $endDateTime = $endDate;
        }
    }

    $aviatorData = [];
    $chickenData = [];
    $wingoData = [];
    $payingData = [];
    $withdrawData = [];

    // Recursive function to fetch full downline (excluding the base user)
    function getAllDownlines($userId, &$collected = [])
    {
        $children = DB::table('users')
            ->where('referral_user_id', $userId)
            ->pluck('id')
            ->toArray();

        foreach ($children as $childId) {
            if (!in_array($childId, $collected)) {
                $collected[] = $childId;
                getAllDownlines($childId, $collected);
            }
        }

        return $collected;
    }

    // 🔹 Admin's direct referrals (Level 1)
    $adminLevel1 = DB::table('users')->where('referral_user_id', 1)->get();

    // 🔁 For each level 1 user, fetch data of their recursive downlines only
    foreach ($adminLevel1 as $user) {
        $downlineIds = [];
        getAllDownlines($user->id, $downlineIds); // Skip user's own ID

        if (empty($downlineIds)) continue;

        // ✅ Aviator
        $aviatorQuery = DB::table('aviator_bet')->whereIn('uid', $downlineIds);
        if ($startDateTime && $endDateTime) {
            $aviatorQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
        }
        $aviatorData[$user->id] = $aviatorQuery->selectRaw("
            COUNT(*) as total_bets,
            SUM(amount) as total_amount,
            SUM(CASE WHEN status = 1 THEN win ELSE 0 END) as total_win,
            SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as total_loss
        ")->first();

        // ✅ Chicken
        $chickenQuery = DB::table('chicken_bets')->whereIn('user_id', $downlineIds);
        if ($startDateTime && $endDateTime) {
            $chickenQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
        }
        $chickenData[$user->id] = $chickenQuery->selectRaw("
            COUNT(*) as total_bets,
            SUM(amount) as total_amount,
            SUM(CASE WHEN status = 1 THEN win_amount ELSE 0 END) as total_win,
            SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as total_loss
        ")->first();

        // ✅ Wingo
        $wingoQuery = DB::table('bets')->whereIn('userid', $downlineIds);
        if ($startDateTime && $endDateTime) {
            $wingoQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
        }
        $wingoData[$user->id] = $wingoQuery->selectRaw("
            COUNT(*) as total_bets,
            SUM(amount) as total_amount,
            SUM(CASE WHEN status = 1 THEN win_amount ELSE 0 END) as total_win,
            SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as total_loss
        ")->first();

        // ✅ Payin
        $payinQuery = DB::table('payins')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2);
        if ($startDateTime && $endDateTime) {
            $payinQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
        }
        $payingData[] = [
            'user_id' => $user->id,
            'total_paying' => $payinQuery->sum('cash')
        ];

        // ✅ Withdraw
        $withdrawQuery = DB::table('withdraw_histories')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2);
        if ($startDateTime && $endDateTime) {
            $withdrawQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
        }
        $withdrawData[] = [
            'user_id' => $user->id,
            'total_withdraw' => $withdrawQuery->sum('amount')
        ];
    }

    // 🔁 Now: Admin total (excluding direct referrals - Level 1 - but including rest)
    $adminDownlineIds = [];
    foreach ($adminLevel1 as $user) {
        $tmpDownlines = [];
        getAllDownlines($user->id, $tmpDownlines);
        $adminDownlineIds = array_merge($adminDownlineIds, $tmpDownlines);
    }

    // Remove Level 1 ids from adminDownlineIds
    $adminLevel1Ids = $adminLevel1->pluck('id')->toArray();
    $adminRecursiveDownline = array_diff($adminDownlineIds, $adminLevel1Ids);

    // ✅ Admin Aviator
    $adminAviatorQuery = DB::table('aviator_bet')->whereIn('uid', $adminRecursiveDownline);
    if ($startDateTime && $endDateTime) {
        $adminAviatorQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
    }
    $aviatorData[1] = $adminAviatorQuery->selectRaw("
        COUNT(*) as total_bets,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 1 THEN win ELSE 0 END) as total_win,
        SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as total_loss
    ")->first();

    // ✅ Admin Chicken
    $adminChickenQuery = DB::table('chicken_bets')->whereIn('user_id', $adminRecursiveDownline);
    if ($startDateTime && $endDateTime) {
        $adminChickenQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
    }
    $chickenData[1] = $adminChickenQuery->selectRaw("
        COUNT(*) as total_bets,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 1 THEN win_amount ELSE 0 END) as total_win,
        SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as total_loss
    ")->first();

    // ✅ Admin Wingo
    $adminWingoQuery = DB::table('bets')->whereIn('userid', $adminRecursiveDownline);
    if ($startDateTime && $endDateTime) {
        $adminWingoQuery->whereBetween('created_at', [$startDateTime, $endDateTime]);
    }
    $wingoData[1] = $adminWingoQuery->selectRaw("
        COUNT(*) as total_bets,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 1 THEN win_amount ELSE 0 END) as total_win,
        SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as total_loss
    ")->first();

    return view('user.admindetails', compact(
        'users',
        'aviatorData',
        'chickenData',
        'wingoData',
        'payingData',
        'withdrawData',
        'startDate',
        'endDate'
    ));
}




	
}