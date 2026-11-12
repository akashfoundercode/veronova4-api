<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

use Illuminate\Support\Facades\DB;

class SalaryApiController extends Controller
{


public function calculateAllUserSalaries()
{
    $today = Carbon::today();
    $monthStart = Carbon::now()->startOfMonth();
    $monthEnd = Carbon::now()->endOfMonth();

    // Step 1: Get users who have at least one downline
    $usersWithDownline = DB::table('users')
        ->select('users.id')
        ->join('users as downlines', 'users.id', '=', 'downlines.referral_user_id')
        ->groupBy('users.id')
        ->get();

    foreach ($usersWithDownline as $user) {
        $userId = $user->id;

        // Get this user's downline IDs
        $downlineIds = DB::table('users')
            ->where('referral_user_id', $userId)
            ->pluck('id');

        if ($downlineIds->isEmpty()) {
            continue;
        }

        // Count active players
        $activeDepositUsers = DB::table('payins')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2)
            ->pluck('user_id');

        $activeWithdrawUsers = DB::table('withdraw_histories')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2)
            ->pluck('user_id');

        $activePlayers = collect($activeDepositUsers)
            ->merge($activeWithdrawUsers)
            ->unique()
            ->count();

        if ($activePlayers === 0) {
            continue;
        }

        // Daily
        $dailyDeposit = DB::table('payins')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2)
            ->whereDate('created_at', $today)
            ->sum('cash');

        $dailyWithdrawal = DB::table('withdraw_histories')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2)
            ->whereDate('created_at', $today)
            ->sum('amount');

        $dailyPL = $dailyDeposit - $dailyWithdrawal;
        $dailyPLType = $dailyPL >= 0 ? 'profit' : 'loss';

        // Monthly
        $monthlyDeposit = DB::table('payins')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->sum('cash');

        $monthlyWithdrawal = DB::table('withdraw_histories')
            ->whereIn('user_id', $downlineIds)
            ->where('status', 2)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->sum('amount');

        $monthlyPL = $monthlyDeposit - $monthlyWithdrawal;
        $monthlyPLType = $monthlyPL >= 0 ? 'profit' : 'loss';

        // Final safety check
        if (
            $dailyDeposit == 0 &&
            $dailyWithdrawal == 0 &&
            $monthlyDeposit == 0 &&
            $monthlyWithdrawal == 0
        ) {
            continue;
        }

        // ✅ Get how many levels of downline the user has
        $downlineLevels = $this->getDownlineLevelCount($userId);

        // Insert into user_salary
        DB::table('user_salary')->insert([
            'user_id' => $userId,
            'active_players' => $activePlayers,
            'downline_levels' => $downlineLevels, // 👈 new field
            'daily_deposit' => $dailyDeposit,
            'daily_withdrawal' => $dailyWithdrawal,
            'daily_profit_loss' => abs($dailyPL),
            'daily_profit_loss_type' => $dailyPLType,
            'monthly_deposit' => $monthlyDeposit,
            'monthly_withdrawal' => $monthlyWithdrawal,
            'monthly_profit_loss' => abs($monthlyPL),
            'monthly_profit_loss_type' => $monthlyPLType,
            'salary' => null,
            'created_at' => now(),
        ]);
    }

    return response()->json(['message' => 'Salaries calculated with downline levels.'], 200);
}

	private function getDownlineLevelCount($userId, $level = 0)
{
    $directDownlines = DB::table('users')
        ->where('referral_user_id', $userId)
        ->pluck('id');

    if ($directDownlines->isEmpty()) {
        return $level;
    }

    $maxLevel = $level;

    foreach ($directDownlines as $downlineId) {
        $subLevel = $this->getDownlineLevelCount($downlineId, $level + 1);
        $maxLevel = max($maxLevel, $subLevel);
    }

    return $maxLevel;
}

	
}