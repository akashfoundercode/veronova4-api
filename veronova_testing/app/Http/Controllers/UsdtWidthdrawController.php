<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;

class UsdtWidthdrawController extends Controller
{
	
	public function usdt_widthdrawl_index($id)
{
    // Fetch paginated records from the USDT withdrawal history
    $widthdrawls = DB::table('withdraw_histories')
        ->join('users', 'withdraw_histories.user_id', '=', 'users.id')
        ->select(
            'withdraw_histories.*',
            'users.username AS uname',
            'users.mobile AS mobile',
            'withdraw_histories.usdt_wallet_address AS beneficiary_name'
        )
        ->where('withdraw_histories.type', 1)
        ->where('withdraw_histories.status', $id)
        ->orderBy('withdraw_histories.id', 'DESC')
        ->paginate(10); // 20 records per page

    // Pass the data to the view
    return view('usdt_withdraw.index', compact('widthdrawls', 'id'));
}

public function usdt_widthdrawl_index_08_05_2026($id)
{
    // Fetch all records from the USDT withdrawal history
     $widthdrawls = DB::select("
        SELECT 
            withdraw_histories.*, 
            users.username AS uname, 
            users.mobile AS mobile, 
            withdraw_histories.usdt_wallet_address AS beneficiary_name
        FROM 
            withdraw_histories 
        JOIN 
            users ON withdraw_histories.user_id = users.id 
        WHERE 
            withdraw_histories.type = 1 
            AND withdraw_histories.status = ?
    ", [$id]);

    // Check if any withdrawal records exist
    if (empty($widthdrawls)) {
        // Handle the case where no withdrawals were found (optional)
        // e.g., set a flash message, log, etc.
    }

    // Pass the data to the view and load the 'usdt_withdraw.index' Blade file
    return view('usdt_withdraw.index', compact('widthdrawls'))->with('id', $id);
}

public function usdt_success(Request $request, $id)
{
    $request->validate([
        'pin' => 'required|numeric',
    ]);

    $pin = 2020;
    $inputPin = $request->input('pin');

    if ($inputPin != $pin) {
        return redirect()->back()
            ->withInput()
            ->withErrors(['pin' => 'Invalid pin. Please try again.']);
    }

    DB::table('withdraw_histories')
        ->where('id', $id)
        ->update(['status' => 2]);

    return redirect()->route('usdt_widthdrawl', ['id' => $id, 'status' => 1])
                     ->with('success', 'Withdrawal approved successfully!');
}

   
    // public function usdt_success(Request $request, $id)
    // {
    //     // Check if the session has an 'id' key
    //     if ($request->session()->has('id')) {
    //         // Use parameter binding to prevent SQL injection
    //         DB::table('withdraw_histories')
    //             ->where('id', $id)
    //             ->update(['status' => 2]);

    //         // Redirect with route and parameters
    //          return redirect()->route('usdt_widthdrawl', ['id' => $id, 'status' => 1])->with('key', 'value');
    //     } else {
    //         // Redirect to login if session does not have 'id'
    //         return redirect()->back()->with('success', 'Operation successful!');

    //     }
    // }

    public function usdt_reject(Request $request, $id)
    {
        // Retrieve the withdrawal history for the given id
        $data = DB::table('withdraw_histories')->where('id', $id)->first();
        
        // If no data is found, handle it appropriately
        if (!$data) {
            // Handle the case where no withdrawal history is found
            //return redirect()->back('usdt_widthdrawl', ['status' => 1])->with('error', 'Withdrawal history not found.');
			return redirect()->back()->with([
    'status' => 1,
    'error'  => 'Withdrawal history not found.'
]);

        }

        $amt = $data->amount;
        $useid = $data->user_id;

        // Check if the session has an 'id' key
        if ($request->session()->has('id')) {
            // Use Query Builder to perform updates safely
            DB::table('withdraw_histories')->where('id', $id)->update(['status' => 3]);
            DB::table('users')->where('id', $useid)->increment('wallet', $amt);
            
            // Redirect with route and parameters
           // return redirect()->route('usdt_widthdrawl', ['id' => $id,'status' => 1])->with('key', 'value');
			return redirect()->back()->with([
    'id' => $id,
    'status' => 1,
    'key' => 'value'
]);

        } else {
            // Redirect to login if session does not have 'id'
            return redirect()->route('login');
        }
    }

    public function all_success(Request $request)
    {
        // Check if the session has an 'id' key
        if ($request->session()->has('id')) {
            // Use Query Builder to perform the update safely
            DB::table('withdraw_histories')
                ->where('status', 1)
                ->update(['status' => 2]);

            // Retrieve updated withdrawal histories
            $widthdrawls = DB::table('withdraw_histories')->get();

            // Return the view with the updated data
            return view('widthdrawl.index', compact('widthdrawls'))->with('id', '1');
        } else {
            // Redirect to login if session does not have 'id'
            return redirect()->route('login');
        }
    }
}