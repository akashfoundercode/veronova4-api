<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Models\{AccountDetail,WithdrawHistory,User};
// use App\Models\Project_maintenance;

class UserManualUsdtController extends Controller{
	
	
public function updateUSDT(Request $request)
{
    $request->validate([
        'id' => 'required|integer|exists:payins,id',
        'status' => 'required|in:2,3'
    ]);

    $id = $request->id;         // payins table ID
    $status = $request->status;

    // ✅ Get payin row
    $match_order = DB::table('payins')
        ->where('id', $id)
        ->where('status', 1)
        ->first();

    if (!$match_order) {
        return back()->with('error', 'Payin not found or already processed.');
    }

    $uid = $match_order->user_id;
    $cash = $match_order->cash;

    // ✅ Update payin status
    $updated = DB::table('payins')->where('id', $id)->update(['status' => $status]);

    if (!$updated) {
        return back()->with('error', 'Failed to update payment status.');
    }
     if ($status == 3) {
        DB::table('payins')->where('id', $id)->update(['status' => 3]);
        return back()->with('error', 'USDT payment rejected successfully.');
    }
    // ✅ Get user info
    $user = DB::table('users')->where('id', $uid)->first();
    $first_recharge = $user->first_recharge;
    $referral_user_id = $user->referral_user_id;

    // ✅ Always update user wallet
    DB::table('users')->where('id', $uid)->update([
        'wallet' => DB::raw("wallet + $cash"),
        'recharge' => DB::raw("recharge + $cash"),
        'total_payin' => DB::raw("total_payin + $cash"),
        'no_of_payin' => DB::raw("no_of_payin + 1"),
        'deposit_balance' => DB::raw("deposit_balance + $cash")
    ]);

    // ✅ Wallet history for recharge
    DB::table('wallet_history')->insert([
        'userid' => $uid,
        'amount' => $cash,
        'subtypeid' => "3",
        'created_at' => now(),
        'updated_at' => now()
    ]);

    // ✅ First Recharge Bonus
    if ($first_recharge == 0) {
        if ($cash >= 1000) {
            $self_bonus = $cash * 0.15;

            // ✅ Bonus to self
            DB::table('users')->where('id', $uid)->update([
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
                DB::table('users')->where('id', $referral_user_id)->update([
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

        // ✅ Update first recharge flag
        DB::table('users')->where('id', $uid)->update([
            'first_recharge' => 1
        ]);
    } else {
        // ✅ Check second recharge bonus
        $success_count = DB::table('payins')
            ->where('user_id', $uid)
            ->where('status', 2)
            ->count();
     
        if ($success_count == 2 && $cash >= 1000) {
            $self_bonus = $cash * 0.20;
            // ✅ Bonus to self
            DB::table('users')->where('id', $uid)->update([
                'wallet' => DB::raw("wallet + $self_bonus")
            ]);

            DB::table('wallet_history')->insert([
                'userid' => $uid,
                'amount' => $self_bonus, // 🔥 Corrected here
                'subtypeid' => "34",
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }
    }

    return back()->with('success', 'USDT payment approved and bonus applied successfully.');
}

	

}



