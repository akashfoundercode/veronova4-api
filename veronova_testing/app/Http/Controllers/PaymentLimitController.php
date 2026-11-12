<?php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentLimitController extends Controller
{
    public function index()
    {
        $limits = DB::table('payment_limits') ->orderBy('id', 'desc') ->get();
        return view('payment_limits.index', compact('limits'));
    }

    public function edit($id)
    {
        $limit = DB::table('payment_limits')->where('id', $id)->first();
        if (!$limit) {
            return redirect()->route('admin.payment_limits.index')->with('error', 'Record not found.');
        }
        return view('payment_limits.edit', compact('limit'));
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'status' => 'required|in:0,1',
        ]);

        DB::table('payment_limits')
            ->where('id', $id)
            ->update([
                'amount' => $request->amount,
                'status' => $request->status,
                'updated_at' => now(),
            ]);

        return redirect()->route('admin.payment_limits.index')->with('success', 'Payment limit updated successfully.');
    }
}
