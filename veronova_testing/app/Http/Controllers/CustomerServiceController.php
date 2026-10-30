<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class CustomerServiceController extends Controller
{
    public function view_bank_request()
    {
        $data = DB::table('delete_bank_accounts')->get();
        return view('CustomerService.view-delete-withdraw-bank')->with('data', $data);
    }

    public function approveBankAccount(Request $request, $id)
    {
        $request->validate([
            'id' => 'required|integer',
            'action_type' => 'required|in:approve,reject',
        ]);

        $record = DB::table('delete_bank_accounts')->where('id', $id)->first();

        if (!$record) {
            return back()->with('error', 'Record not found');
        }

        if ($request->action_type === 'approve') {
            DB::table('delete_bank_accounts')->where('id', $id)->update([
                'status' => 1,
                'remark' => null,
            ]);
            return back()->with('success', 'Bank account approved successfully.');
        }

        if ($request->action_type === 'reject') {
            $request->validate([
                'reason' => 'required|string',
            ]);
            DB::table('delete_bank_accounts')->where('id', $id)->update([
                'status' => 2,
                'remark' => $request->reason,
            ]);
            return back()->with('success', 'Bank account rejected with reason.');
        }

        return back()->with('error', 'Invalid action.');
    }

    public function request_change_login_password()
    {
        $data = DB::table('request_change_login_password')->get();
        return view('CustomerService.request_change_login_password')->with('data', $data);
    }

    public function approveloginpasswordrequest($id)
    {
        $record = DB::table('request_change_login_password')->where('id', $id)->first();

        if (!$record) {
            return redirect()->back()->with('error', 'Record not found.');
        }

        DB::table('request_change_login_password')->where('id', $id)->update([
            'status' => 1
        ]);

        return redirect()->back()->with('success', 'Bank account approved successfully.');
    }

    public function ifsc_modifications()
    {
        $data = DB::table('ifsc_modifications')->get();
        return view('CustomerService.ifsc_modifications')->with('data', $data);
    }

    public function approveIfscModification(Request $request, $id)
    {
        $record = DB::table('ifsc_modifications')->where('id', $id)->first();

        if (!$record) {
            return redirect()->back()->with('error', 'Record not found.');
        }

        if ($request->has('action_type') && $request->action_type === 'reject') {
            DB::table('ifsc_modifications')->where('id', $id)->update([
                'status' => 2,
                'remark' => $request->input('remark'),
                'updated_at' => now(),
            ]);

            return redirect()->back()->with('success', 'IFSC modification rejected with remark.');
        } else {
            DB::table('ifsc_modifications')->where('id', $id)->update([
                'status' => 1,
                'remark' => null,
                'updated_at' => now(),
            ]);

            return redirect()->back()->with('success', 'IFSC modification approved successfully!');
        }
    }

    public function usdtVerificationList($id)
    {
        $data = DB::table('usdt_verifications')
            ->where('region_status', $id)
            ->orderByDesc('id')
            ->get();

        return view('CustomerService.indin-non-indian-verification', compact('data', 'id'));
    }

    public function approveUsdt($id)
    {
        DB::table('usdt_verifications')->where('id', $id)->update(['status' => 1]);
        return redirect()->back()->with('success', 'USDT Verification Approved Successfully.');
    }

    public function viewUsdtAddressVerification()
    {
        $data = DB::table('delete_old_usdt_address')->orderBy('id', 'desc')->get();
        return view('CustomerService.delete_old_usdt_list')->with('data', $data);
    }

    public function changeUsdtAddressStatus($id)
    {
        DB::table('delete_old_usdt_address')->where('id', $id)->update([
            'status' => 1,
            'updated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'IFSC modification approved successfully!');
    }

    public function bank_name_modifications()
    {
        $data = DB::table('bank_name_modification')->orderBy('id', 'desc')->get();
        return view('CustomerService.bank_name_modifications')->with('data', $data);
    }

    public function approveBankNameModification(Request $request, $id)
    {
        $record = DB::table('bank_name_modification')->where('id', $id)->first();

        if (!$record) {
            return redirect()->back()->with('error', 'Record not found.');
        }

        if ($request->has('action_type') && $request->action_type === 'reject') {
            DB::table('bank_name_modification')->where('id', $id)->update([
                'status' => 2,
                'remark' => $request->input('remark'),
                'updated_at' => now(),
            ]);

            return redirect()->back()->with('success', 'IFSC modification rejected with remark.');
        } else {
            DB::table('bank_name_modification')->where('id', $id)->update([
                'status' => 1,
                'remark' => null,
                'updated_at' => now(),
            ]);

            return redirect()->back()->with('success', 'IFSC modification approved successfully!');
        }
    }

    public function game_issue_complaints()
    {
        $data = DB::table('game_issue_complaint')->orderBy('id', 'desc')->get();
        return view('CustomerService.game_issue_complaints')->with('data', $data);
    }

    public function approveGameIssueComplaint(Request $request, $id)
    {
        $record = DB::table('game_issue_complaint')->where('id', $id)->first();

        if (!$record) {
            return redirect()->back()->with('error', 'Record not found.');
        }

        if ($request->has('action_type') && $request->action_type === 'reject') {
            DB::table('game_issue_complaint')->where('id', $id)->update([
                'status' => 2,
                'remark' => $request->input('remark'),
                'updated_at' => now(),
            ]);

            return redirect()->back()->with('success', 'Game issue rejected with remark.');
        } else {
            DB::table('game_issue_complaint')->where('id', $id)->update([
                'status' => 1,
                'remark' => null,
                'updated_at' => now(),
            ]);

            return redirect()->back()->with('success', 'Game issue complaint marked as resolved.');
        }
    }
}
