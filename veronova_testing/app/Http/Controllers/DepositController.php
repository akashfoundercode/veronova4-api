<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;

class DepositController extends Controller
{
	public function deposit_index($id)
{
    // Use pagination instead of loading all records
    $deposits = DB::table('payins')
        ->leftJoin('users', 'payins.user_id', '=', 'users.id')
        ->select('payins.*', 'users.username AS uname', 'users.id AS userid', 'users.mobile AS mobile')
        ->where('payins.status', $id)
        ->whereNotNull('users.id')
        ->orderBy('payins.id', 'desc') // Show latest first
        ->paginate(10); // Load 20 records per page
    
    return view('work_order_assign.deposit', compact('deposits', 'id'));
}
	
    public function deposit_index_08_05_2026($id)
    {
        //  $deposits= DB::select("SELECT payins.*,users.username AS uname,users.id As userid, users.mobile As mobile FROM `payins` LEFT JOIN users ON payins.user_id=users.id WHERE payins.status = '$id'");
        $deposits=DB::select("SELECT payins.*, users.username AS uname, users.id AS userid, users.mobile AS mobile FROM payins LEFT JOIN users ON payins.user_id = users.id WHERE payins.status = $id AND users.id IS NOT NULL");
         //dd($deposits);
        return view('work_order_assign.deposit')->with('deposits',$deposits)->with('id',$id);
        
    }
	
	public function payin_success(Request $request, $id)
{
    $pin = 2020;
    $inputPin = $request->input('pin');

    if ($inputPin != $pin) {
        return redirect()->back()->with('error', 'Invalid pin. Please try again.');
    }

    if (!$request->session()->has('id')) {
        return redirect()->back()->with('error', 'Session expired!');
    }

    $payin = DB::table('payins')->where('id', $id)->first();

    if (!$payin) {
        return redirect()->back()->with('error', 'Payin details not found!');
    }

    if ($payin->status != 1) {
        return redirect()->back()->with('error', 'Payin already approved!');
    }

    $amount = $payin->cash;
    $userId = $payin->user_id;
    $hashId = $payin->transaction_id;
    $now = now();

    // Payin status update
    DB::table('payins')->where('id', $id)->update(['status' => 2]);

    // First Recharge Bonus Logic
    $user = DB::table('users')->where('id', $userId)->first();
    $referId = $user->referral_user_id;
    $firstRecharge = $user->first_recharge;

    if ($firstRecharge == 0) {
        $extra = DB::table('extra_first_deposit_bonus')->where('first_deposit_ammount', $amount)->first();

        if ($extra) {
            $bonus = $extra->bonus;
            $totalAdd = $amount + $bonus;

            DB::table('extra_first_deposit_bonus_claim')->insert([
                'userid'        => $userId,
                'extra_fdb_id'  => $extra->id,
                'amount'        => $amount,
                'bonus'         => $bonus,
                'status'        => 0,
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);
        } else {
            $bonus = 0;
            $totalAdd = $amount;
        }

        DB::table('users')->where('id', $userId)->update([
            'wallet'                => DB::raw("wallet + $totalAdd"),
            'first_recharge'        => 1,
            'first_recharge_amount' => DB::raw("first_recharge_amount + $totalAdd"),
            'recharge'              => DB::raw("recharge + $totalAdd"),
            'total_payin'           => DB::raw("total_payin + $totalAdd"),
            'no_of_payin'           => DB::raw("no_of_payin + 1"),
            'deposit_balance'       => DB::raw("deposit_balance + $totalAdd"),
        ]);

        if ($referId) {
            DB::table('users')->where('id', $referId)->update([
                'yesterday_payin'          => DB::raw("yesterday_payin + $amount"),
                'yesterday_no_of_payin'    => DB::raw("yesterday_no_of_payin + 1"),
                'yesterday_first_deposit'  => DB::raw("yesterday_first_deposit + $amount"),
                'created_at'               => $now,
            ]);
        }

    } else {
        // Normal recharge
        DB::table('users')->where('id', $userId)->update([
            'wallet'          => DB::raw("wallet + $amount"),
            'recharge'        => DB::raw("recharge + $amount"),
            'total_payin'     => DB::raw("total_payin + $amount"),
            'no_of_payin'     => DB::raw("no_of_payin + 1"),
            'deposit_balance' => DB::raw("deposit_balance + $amount"),
        ]);

        if ($referId) {
            DB::table('users')->where('id', $referId)->update([
                'yesterday_payin'       => DB::raw("yesterday_payin + $amount"),
                'yesterday_no_of_payin' => DB::raw("yesterday_no_of_payin + 1"),
            ]);
        }
    }

    // Bonus for deposit (10% optional)
    $bonus = $amount * 0.10;

    DB::table('wallet_history')->insert([
        'userid'     => $userId,
        'amount'     => $bonus,
        'subtypeid'  => 5,
        'description'=> 'Deposit Bonus',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    DB::table('users')->where('id', $userId)->update([
        'wallet' => DB::raw("wallet + $bonus"),
    ]);

    return redirect()->back()->with('success', 'Payin approved and bonus added!');
}

	
	public function payin_successoldddd(Request $request, $id)
{
    $pin = 2020;
    $inputPin = $request->input('pin');

    if ($inputPin == $pin) {
        if ($request->session()->has('id')) {

            $payin = DB::table('payins')->where('id', $id)->first();

            if (!$payin) {
                return redirect()->back()->with('error', 'Payin details not found!');
            }

            $amount = $payin->cash;
            $userId = $payin->user_id;

            // Update payin status
            $update = DB::table('payins')->where('id', $id)->update(['status' => 2]);

            if ($update) {
                $user = DB::table('users')->where('id', $userId)->first();

                // Calculate bonus (10%)
                $bonus = $amount * 0.10;

                // Update user's wallet
                DB::table('users')->where('id', $userId)->update([
                    'wallet' => DB::raw("wallet + $amount + $bonus"),
                    'recharge' => DB::raw("recharge + $amount"),
                    'total_payin' => DB::raw("total_payin + $amount"),
                    'no_of_payin' => DB::raw("no_of_payin + 1"),
                    'deposit_balance' => DB::raw("deposit_balance + $amount"),
                ]);

                // Insert into wallet_history for bonus
                DB::table('wallet_history')->insert([
                    'userid' => $userId,
                    'amount' => $bonus,
                    //'subtypeid' => 'credit', // assuming bonus is a credit
                    'subtypeid' => 5,
                    'description' => 'Deposit Bonus',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                return redirect()->back()->with('success', 'Payin approved successfully. Bonus added!');
            } else {
                return redirect()->back()->with('error', 'Failed to update payin status!');
            }

        } else {
            return redirect()->back()->with('error', 'Session expired!');
        }
    } else {
        return redirect()->back()->with('error', 'Invalid pin. Please try again.');
    }
}

    
    public function payin_successold(Request $request, $id)
{
   // dd($id);
    $pin = 2020;  // Predefined pin

    // Retrieve the pin input from the request
    $inputPin = $request->input('pin');
   //dd($inputPin);
    // Check if the input pin matches the predefined pin
    if ($inputPin == $pin) {
        if ($request->session()->has('id')) {
            //dd("hii");
            // Fetch payin details
            $payin_details = DB::SELECT("SELECT * FROM `payins` WHERE `id` = ?", [$id]);
            

            if (empty($payin_details)) {
                
                return redirect()->back()->with('error', 'Payin details not found!');
            }

            $amount = $payin_details[0]->cash;
            $userid = $payin_details[0]->user_id;
            
            // Update payin status
            $update = DB::table('payins')
                        ->where('id', '=', $id)
                        ->update(['status' => 2]);

            if ($update) {
                // Check if the user has already made their first recharge
                $user = DB::table('users')->where('id', '=', $userid)->first();

                // If first_recharge is 0, update it to 1
                if ($user->first_recharge == 0) {
                    DB::table('users')
                        ->where('id', '=', $userid)
                        ->update(['first_recharge' => 1]);
                }

                // Update the user's wallet
                DB::table('users')
                    ->where('id', '=', $userid)
                    ->update(['wallet' => DB::raw('wallet + ' . $amount)]);

                return redirect()->back()->with('success', 'Payin approved successfully!');
            } else {
                return redirect()->back()->with('error', 'Failed to update payin status!');
            }
        } else {
            // Session does not exist
            return redirect()->back()->with('error', 'Operation Failed!');
        }
    } else {
        // Pin does not match, return an invalid pin message
        return redirect()->back()->with('error', 'Invalid pin. Please try again.');
    }
}

    public function deposit_delete(Request $request,$id)
    {
    
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
        $data=DB::delete("DELETE FROM `payins` WHERE id=$id");
       
       return redirect()->back()->with('success', 'Deleted successfully!');
			  }
        else
        {
           return redirect()->route('login');  
        }
    }
    
    
    public function deposit_delete_all(Request $request)
    {
        
		$value = $request->session()->has('id');
        if(!empty($value))
        {
        $data=DB::delete("DELETE FROM `payins` WHERE status=1");
       
       return redirect()->back()->with('success', 'All Deleted successfully!');
			  }
        else
        {
           return redirect()->route('login');  
        }
    }
    
	 public function deposit_reject(Request $request,$id){
       $rejectionReason = $request->input('msg');
         $value = $request->session()->has('id');
     if(!empty($value))
        {
       $ss= DB::select("UPDATE `payins` SET `status`='3',`rejectmsg`='$rejectionReason' WHERE id=$id;");
    	
        return redirect()->back()->with('success', 'Deposit Reject successfully!');
		  }
		 else
        {
           return redirect()->route('login');  
        }
			

       // return redirect()->route('widthdrawl/0');
  }
    

}
