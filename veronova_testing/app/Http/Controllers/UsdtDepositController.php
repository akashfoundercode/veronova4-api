<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;

class UsdtDepositController extends Controller
{
	
	public function usdt_deposit_index(string $id)
{
    $deposits = DB::table('payins')
        ->leftJoin('users', 'payins.user_id', '=', 'users.id')
        ->select(
            'payins.*',
            'users.username AS uname',
            'users.id AS userid',
            'users.mobile AS mobile'
        )
        ->where('payins.status', $id)
        ->where('payins.type', 1)
        ->whereNotNull('users.id')
        ->orderBy('payins.id', 'DESC')
        ->paginate(10); // 20 records per page

    return view('usdt_deposit.deposit', compact('deposits', 'id'));
}
    public function usdt_deposit_index_08_05_2026(string $id)
    {

         $deposits= DB::select("SELECT payins.*,users.username AS uname,users.id As userid, users.mobile As mobile FROM `payins` LEFT JOIN 
users ON payins.user_id=users.id WHERE payins.status = '$id' && payins.type=1");

        return view('usdt_deposit.deposit')->with('deposits',$deposits)->with('id',$id);
    }
  

public function usdt_success(string $id) {
    // Fetch the details
    $details = DB::table('payins')->where('id', $id)->first();

    // Check if details exist
    if (!$details) {
        return redirect()->back()->with('error', 'Payin details not found.');
    }

    $amount = $details->cash;
    $user_id = $details->user_id;

    $referid = DB::select("SELECT `referral_user_id` FROM `users` WHERE `id` = ?", [$user_id]);
    $referuserid = $referid[0]->referral_user_id;
    //$amounts = $amount * 0.05;
    $amounts = 0;

    //$amounts = $amount;
   // $firstselfamount = $amount * 5 * 0.01 + $amount;
    $firstselfamount = $amount;
    //$everyselfamount = $amount * 3 * 0.01 + $amount;
    $everyselfamount = $amount;

    // Update the payin status
    DB::table('payins')->where('id', $id)->update([
        'status' => 2
    ]);

    // Insert into wallet history
    DB::table('wallet_history')->insert([
        'userid' => $user_id,
        'amount' => $amount,
        'subtypeid' =>  3
    ]);

    $referid = DB::select("SELECT referral_user_id, first_recharge FROM `users` WHERE id = ?", [$user_id]);
    $first_recharge = $referid[0]->first_recharge;
    $referuserid = $referid[0]->referral_user_id;

    if ($referuserid !== null && $referuserid !== "") {
        if ($first_recharge == 0) {
            DB::update("UPDATE users SET 
                first_recharge_amount = first_recharge_amount + ?,
                wallet = wallet + ?,
                recharge = recharge + ?,
                total_payin = total_payin + ?,
                no_of_payin = no_of_payin + 1,
                deposit_balance = deposit_balance + ?
                WHERE id = ?", [$amount, $firstselfamount, $amount, $amount, $amount, $user_id]);
            
            DB::update("UPDATE `users` SET `wallet` = wallet + ? WHERE `id` = ?", [$amounts, $referuserid]);
            DB::update("UPDATE users SET 
                yesterday_payin = yesterday_payin + ?, 
                yesterday_no_of_payin = yesterday_no_of_payin + 1, 
                yesterday_first_deposit = yesterday_first_deposit + 1 
                WHERE id = ?", [$amount, $user_id]);
        } else {
            DB::update("UPDATE users SET 
                wallet = wallet + ?,
                 first_recharge = 0,
                recharge = recharge + ?, 
                total_payin = total_payin + ?, 
                no_of_payin = no_of_payin + 1, 
                deposit_balance = deposit_balance + ?
                WHERE id = ?", [$everyselfamount, $amount, $amount, $amount, $user_id]);

            DB::update("UPDATE `users` SET `wallet` = wallet + ? WHERE `id` = ?", [$amounts, $referuserid]);
            DB::update("UPDATE users SET 
                yesterday_payin = yesterday_payin + ?, 
                yesterday_no_of_payin = yesterday_no_of_payin + 1 
                WHERE id = ?", [$amount, $user_id]);
        }
    } else {
        if ($first_recharge == 0) {
            DB::update("UPDATE users SET 
                
                first_recharge_amount = first_recharge_amount + ?,
                wallet = wallet + ?,
                recharge = recharge + ?,
                total_payin = total_payin + ?,
                no_of_payin = no_of_payin + 1,
                deposit_balance = deposit_balance + ?
                WHERE id = ?", [$amount, $firstselfamount, $amount, $amount, $amount, $user_id]);
        } else {
            DB::update("UPDATE users SET 
                wallet = wallet + ?,
                first_recharge = 0,
                recharge = recharge + ?, 
                total_payin = total_payin + ?, 
                no_of_payin = no_of_payin + 1, 
                deposit_balance = deposit_balance + ?
                WHERE id = ?", [$everyselfamount, $amount, $amount, $amount, $user_id]);
        }
    }

    return redirect()->back()->with('success', 'Successfully Updated.');
}

 public function usdt_reject(string $id){

                DB::table('payins')->where('id', $id)->update([
                        'status' => 3
                ]);

                return redirect()->back()->with('success', 'Successfully Updated.');
        }


}