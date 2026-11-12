<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WingoResultController extends Controller
{
    // public function showForm()
    // {
    //      $active_result = DB::table('wingo_result_type')->where('status', 1)->first();

    //     return view('colour_prediction.result_set', compact('active_result'));
    // }
    
    public function showForm()
{
    $active_result = DB::table('wingo_result_type')->where('status', 1)->first();

    $pattern_results = DB::table('result_pattern_set')
                        ->orderBy('created_at', 'desc')
                        ->get();

    return view('colour_prediction.result_set', compact('active_result', 'pattern_results'));
}

    public function updateStatus(Request $request)
    {
        $type = $request->input('type');

        if ($type === 'Business' || $type === 'Pattern + Business') {
                   DB::table('wingo_result_type')
                        ->where('id', 1)
                        ->update(['status' => 1]);
                        
                        DB::table('wingo_result_type')
                        ->where('id', 2)
                        ->update(['status' => 0]);
                        DB::select("UPDATE `result_pattern_set` SET `status`=0 WHERE `status`=1");


            return redirect()->route('wingo.show.form')->with('success', 'Business Mode Set successfully.');
        }

        if ($type === 'Pattern') {
              DB::select("UPDATE `result_pattern_set` SET `status`=1 WHERE `status`=0");
              
              DB::table('wingo_result_type')
        ->where('id', 1)
        ->update(['status' => 0]);

    DB::table('wingo_result_type')
        ->where('id', 2)
        ->update(['status' => 1]);
        
    return redirect()->route('wingo.show.form')
        ->with('show_pattern_form', true)
        ->with('selected_type', 'Pattern');
}


        return redirect()->route('wingo.show.form');
    }

    // public function submitPattern(Request $request)
    // {
    //     $request->validate([
    //         'number' => 'required|string',
    //         'number_count' => 'required|numeric',
    //     ]);

    //     DB::table('result_pattern_set')->insert([
    //         'number' => $request->number,
    //         'status' => 1,
    //         'number_count' => $request->number_count,
    //         'created_at' => now(),
    //         'updated_at' => now(),
    //     ]);
        
    //     DB::table('wingo_result_type')
    //                     ->where('id', 1)
    //                     ->update(['status' => 0]);
                        
    //                     DB::table('wingo_result_type')
    //                     ->where('id', 2)
    //                     ->update(['status' => 1]);

    //     return redirect()->route('wingo.show.form')->with('success', 'Pattern result Set successfully.');
    // }
    
    public function submitPattern(Request $request)
{
    //dd($request);
    $request->validate([
        'number_count' => 'required|numeric',
    ]);

    $numberCount = $request->number_count;
    $numbers=$request->number;
    $number = null;
    $name = null;

    if ($numbers == 50) {
        $options = [0, 1, 2, 3, 4];
        $name = 'small';
    } elseif ($numbers == 40) {
        $options = [5, 6, 7, 8, 9];
        $name = 'big';
    } elseif ($numbers == 30) {
        $options = [2, 4, 6, 8];
        $name = 'red';
    } elseif ($numbers == 20) {
        $options = [0, 5];
        $name = 'voilet';
    } elseif ($numbers == 10) {
        $options = [1, 3, 5, 7, 9];
        $name = 'green';
    } else {
        return redirect()->back()->withErrors(['number_count' => 'Invalid number count provided.']);
    }

    $number = $options[array_rand($options)];

    DB::table('result_pattern_set')->insert([
        'number' => $number,
        'name' => $name,
        'status' => 1,
        'number_count' => $numberCount,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // DB::table('wingo_result_type')
    //     ->where('id', 1)
    //     ->update(['status' => 0]);

    // DB::table('wingo_result_type')
    //     ->where('id', 2)
    //     ->update(['status' => 1]);

    return redirect()->route('wingo.show.form')->with('success', 'Pattern result set successfully.');
}



public function updatePattern(Request $request, $id)
{
    $request->validate([
        'number_count' => 'required|numeric',
        'name' => 'required|in:big,small,red,green,voilet',
    ]);

    $numberCount = $request->number_count;
    $name = strtolower($request->name);
    $number = null;
    $options = [];

    // Mapping name to numbers options
    switch ($name) {
        case 'small':
            $options = [0, 1, 2, 3, 4];
            break;
        case 'big':
            $options = [5, 6, 7, 8, 9];
            break;
        case 'red':
            $options = [2, 4, 6, 8];
            break;
        case 'voilet':
            $options = [0, 5];
            break;
        case 'green':
            $options = [1, 3, 5, 7, 9];
            break;
        default:
            return redirect()->back()->withErrors(['name' => 'Invalid pattern name.']);
    }

    $number = $options[array_rand($options)];

    $updated = DB::table('result_pattern_set')->where('id', $id)->update([
        'name' => $name,
        'number' => $number,
        'number_count' => $numberCount,
        'updated_at' => now(),
    ]);

    if ($updated) {
        return redirect()->route('wingo.show.form')->with('success', 'Pattern result updated successfully.');
    } else {
        return redirect()->route('wingo.show.form')->with('error', 'Failed to update pattern result.');
    }
}

public function deletePattern($id)
{
    $deleted = DB::table('result_pattern_set')->where('id', $id)->delete();

    if ($deleted) {
        return redirect()->route('wingo.show.form')->with('success', 'Pattern result deleted successfully.');
    } else {
        return redirect()->route('wingo.show.form')->with('error', 'Unable to delete pattern result.');
    }
}



}
