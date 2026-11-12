<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Validator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\SalaryListExport;

class SalaryController extends Controller
{

public function salaryLists()
{
    $salaries = DB::table('salary_lists')->orderByDesc('id')->paginate(20);
    return view('salary.index', compact('salaries'));
}

public function updateSalary(Request $request)
{
    $request->validate([
        'id' => 'required|exists:salary_lists,id',
        'amount' => 'required|numeric|min:0'
    ]);

    DB::table('salary_lists')
        ->where('id', $request->id)
        ->update([
            'amount' => $request->amount,
            'updated_at' => now(),
        ]);

    return response()->json(['message' => 'Amount updated successfully.']);
}

public function exportSalary()
{
    return Excel::download(new SalaryListExport, 'salary_lists.xlsx');
}

}