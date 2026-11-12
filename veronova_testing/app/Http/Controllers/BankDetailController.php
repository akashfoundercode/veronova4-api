<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;
class BankDetailController extends Controller
{
    public function bankdetails(Request $request)
    {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
        // $bank_details = DB::select("SELECT * FROM `account_details` WHERE 1");
         $bank_details = DB::select("SELECT account_details.*,users.mobile as mobile FROM `account_details` LEFT JOIN users ON users.id = account_details.user_id");
			//dd($bank_details);
       
        return view('bank_details.index', compact('bank_details'));
			  }
        else
        {
           return redirect()->route('login');  
        }
    }
  public function edit_bank_details(Request $request)
{
    $id = $request->id;
    $name = $request->name;
    $account_number = $request->account_number;
    $branch = $request->branch;
    $bank_name = $request->bank_name;
    $ifsc_code = $request->ifsc_code;
    $upiid = $request->upi_id;
    
    $user_id = DB::table('account_details')->where('id', $id)->value('user_id');
    $account_details_update = DB::table('account_details')->where('id', $id)
        ->update([
            'name' => $name,
            'account_number' => $account_number,
            'branch' => $branch,
            'bank_name' => $bank_name,
            'ifsc_code' => $ifsc_code,
            'upi_id' => $upiid,
            'created_at' => now()
        ]);
       
    if ($account_details_update) {
        return redirect()->back()->with('message', 'Account details updated successfully.');
    } else {
        return redirect()->back()->with('error', 'No changes were made.');
    }
}

  
}
