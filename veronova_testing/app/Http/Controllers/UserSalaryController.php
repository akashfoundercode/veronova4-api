<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UserSalaryController extends Controller
{
	public function calculateUserSalary_old(Request $request)
    {
        $userId = $request->user_id;
        $existing = DB::table('user_salary')->where('user_id', $userId)->exists();
		if($existing){
			return redirect()->back()->with('error', "Salary has already been calculated for User ID: {$userId} in the User Salary Records table.");
		}
        if (!$userId || !is_numeric($userId)) {
            return redirect()->back()->with('message', 'Invalid User ID.');
        }

        $today = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();
        $monthEnd = Carbon::now()->endOfMonth();

        // Get all downline IDs up to 6 levels
        $downlineIds = $this->getDownlinesUptoLevel($userId, 6);

        if (empty($downlineIds)) {
            return redirect()->back()->with('message', 'No downlines found for this user.');
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
            return redirect()->back()->with('message', 'No active downline players found.');
        }

        // Daily stats
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

        // Monthly stats
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

        // Skip if no transactions at all
        if (
            $dailyDeposit == 0 &&
            $dailyWithdrawal == 0 &&
            $monthlyDeposit == 0 &&
            $monthlyWithdrawal == 0
        ) {
            return redirect()->back()->with('message', 'No deposit or withdrawal found in downline.');
        }

        // Insert into user_salary
        DB::table('user_salary')->insert([
            'user_id' => $userId,
            'active_players' => $activePlayers,
            'downline_levels' => 6,
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

        return redirect()->back()->with('message', 'Salary calculated successfully for user ID: ' . $userId);
    }

    // 🔁 Helper function to get downline users up to 6 levels
    private function getDownlinesUptoLevel_old($userId, $maxLevel = 6)
    {
        $allDownlines = [];
        $currentLevelUsers = [$userId];

        for ($level = 1; $level <= $maxLevel; $level++) {
            $nextLevelUsers = DB::table('users')
                ->whereIn('referral_user_id', $currentLevelUsers)
                ->pluck('id')
                ->toArray();

            if (empty($nextLevelUsers)) {
                break;
            }

            $allDownlines = array_merge($allDownlines, $nextLevelUsers);
            $currentLevelUsers = $nextLevelUsers;
        }

        return $allDownlines;
    }
	
	public function calculateUserSalary(Request $request)
{
    $username = $request->u_id;

    // ✅ Username se user ka id nikalna
    $user = DB::table('users')->where('u_id', $username)->first();
    if (!$user) {
        return redirect()->back()->with('error', "User with User Id '{$username}' not found.");
    }

    $userId = $user->id;
		//dd($userId);

    // Salary already calculated check
    $existing = DB::table('user_salary')->where('user_id', $userId)->exists();
    if ($existing) {
        return redirect()->back()->with('error', "Salary has already been calculated for Username: {$username} in the User Salary Records table.");
    }

   // $today = Carbon::today();
		$today = Carbon::today()->subDay();
		//dd($today,
		  //$yesterday);
    $monthStart = Carbon::now()->startOfMonth();
    $monthEnd = Carbon::now()->endOfMonth();

    // Get all downline IDs up to 6 levels
    $downlineIds = $this->getDownlinesUptoLevel($userId, 6);
//return $downlineIds;
    if (empty($downlineIds)) {
        return redirect()->back()->with('message', 'No downlines found for this user.');
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
        return redirect()->back()->with('message', 'No active downline players found.');
    }

    // Daily stats
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

    // Monthly stats
    $monthlyDeposit = DB::table('payins')
        ->whereIn('user_id', $downlineIds)
        ->where('status', 2)
        ->whereBetween('created_at', [$monthStart, $monthEnd])
        ->sum('cash');
//dd($monthlyDeposit);
    $monthlyWithdrawal = DB::table('withdraw_histories')
        ->whereIn('user_id', $downlineIds)
        ->where('status', 2)
        ->whereBetween('created_at', [$monthStart, $monthEnd])
        ->sum('amount');

    $monthlyPL = $monthlyDeposit - $monthlyWithdrawal;
    $monthlyPLType = $monthlyPL >= 0 ? 'profit' : 'loss';

    // Skip if no transactions at all
    if (
        $dailyDeposit == 0 &&
        $dailyWithdrawal == 0 &&
        $monthlyDeposit == 0 &&
        $monthlyWithdrawal == 0
    ) {
        return redirect()->back()->with('message', 'No deposit or withdrawal found in downline.');
    }

    // Insert into user_salary
    DB::table('user_salary')->insert([
        'user_id' => $userId,
        'active_players' => $activePlayers,
        'downline_levels' => 6,
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

    return redirect()->back()->with('message', 'Salary calculated successfully for username: ' . $username);
}

// 🔁 Helper function same rahegi
private function getDownlinesUptoLevel($userId, $maxLevel = 6)
{
    $allDownlines = [];
    $currentLevelUsers = [$userId];

    for ($level = 1; $level <= $maxLevel; $level++) {
        $nextLevelUsers = DB::table('users')
            ->whereIn('referral_user_id', $currentLevelUsers)
            ->pluck('id')
            ->toArray();
		//return $nextLevelUsers;
        if (empty($nextLevelUsers)) {
            break;
        }

        $allDownlines = array_merge($allDownlines, $nextLevelUsers);
		//return $allDownlines;
        $currentLevelUsers = $nextLevelUsers;
		//dd($currentLevelUsers);
		 return $allDownlines;
    }

}

	
    public function index()
    {
        $salaries = DB::table('user_salary')
            ->join('users', 'user_salary.user_id', '=', 'users.id')
            ->select(
                'user_salary.*',
                'users.username as user_name',
                'users.wallet as user_wallet'
            )
            ->orderBy('user_salary.id', 'desc')
            ->get();
    // dd($salaries);
        return view('user_salaries.index', compact('salaries'));
    }

	
    public function updateSalary(Request $request){
        $request->validate([
            'id' => 'required|exists:user_salary,id',
            'salary' => 'required|numeric|min:0',
			'salary_type' => 'required'
        ]);
      
      $data =  DB::table('user_salary')
            ->where('id', $request->id)
            ->update([
                'salary' => $request->salary,
				'salary_type' => $request->salary_type,
                'created_at' => now()
            ]);
       
        return response()->json(['success' => true]);
    }
	
	
	
	
	
	

  public function sendSalary(Request $request)
{
    $request->validate([
        'selected_ids' => 'required|array',
        'selected_ids.*' => 'exists:user_salary,id'
    ]);

    foreach ($request->selected_ids as $id) {
        $type = $request->salary_type[$id] ?? null;
        if ($type != 1 && $type != 2) {
            return back()->with('error', 'Please check before submitting that you have selected either daily or monthly for all selected rows.');
        }
    }

    DB::beginTransaction();

    try {
        $salaries = DB::table('user_salary')
            ->whereIn('id', $request->selected_ids)
            ->get();

        foreach ($salaries as $salary) {
            $type = $request->salary_type[$salary->id]; // Get the salary type for this row
            $remark = ($type == 1) ? 'Daily Salary' : 'Monthly Salary';
			 $type = ($type == 1) ? 31 : 32;

            // Update user wallet
            DB::table('users')
                ->where('id', $salary->user_id)
                ->increment('wallet', $salary->salary);

            // Add transaction history
            //DB::table('transaction_histories')->insert([
            //    'user_id' => $salary->user_id,
            //    'amount' => $salary->salary,
             //   'type' => $type,
              //  'status' => 1,
              //  'created_at' => now(),
             //   'updated_at' => now()
            //]);
			
			 DB::table('wallet_history')->insert([
                    'userid' =>$salary->user_id,
                    'amount' => $salary->salary,
                    'subtypeid' => $type, // Assuming 23 is commission
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

            // Add salary record
            DB::table('all_users_salary_record')->insert([
                'user_id' => $salary->user_id,
                'salary_amount' => $salary->salary,
                'remark' => $remark,
                'status' => 1,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        DB::commit();
        return back()->with('success', 'Salaries sent successfully!');
    } catch (\Exception $e) {
        DB::rollBack();
        return back()->with('error', 'Failed to process salaries: ' . $e->getMessage());
    }
}

}