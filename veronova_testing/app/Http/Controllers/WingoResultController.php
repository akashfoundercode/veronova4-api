<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WingoResultController extends Controller
{
    public function showForm()
    {
        $active_result = DB::table('wingo_result_type')->where('status', 1)->first();

        $pattern_results = DB::table('result_pattern_set')
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
                
            DB::table('result_pattern_set')->update(['status' => 0]);

            return redirect()->route('wingo.show.form')->with('success', 'Business Mode Set successfully.');
        }

        if ($type === 'Pattern') {
             DB::table('result_pattern_set')->update(['status' => 1]);
             
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

    public function submitPattern(Request $request)
    {
        $request->validate([
            'number_count' => 'required|numeric',
            'game_id' => 'required|in:1,2,3,4' // 1=30sec, 2=1min, 3=3min, 4=5min
        ]);

        $numberCount = $request->number_count;
        $numbers = $request->number;
        $gameId = $request->game_id;
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

        // Deactivate any existing active pattern for this game
        // DB::table('result_pattern_set')
        //     ->where('game_id', $gameId)
        //     ->update(['status' => 0]);

        DB::table('result_pattern_set')->insert([
            'game_id' => $gameId,
            'number' => $number,
            'name' => $name,
            'status' => 1,
            'number_count' => $numberCount,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->route('wingo.show.form')->with('success', 'Pattern result set successfully.');
    }

    public function updatePattern(Request $request, $id)
    {
        $request->validate([
            'number_count' => 'required|numeric',
            'name' => 'required|in:big,small,red,green,voilet',
            'game_id' => 'required|in:1,2,3,4'
        ]);

        $numberCount = $request->number_count;
        $name = strtolower($request->name);
        $gameId = $request->game_id;
        $options = [];

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

        // Deactivate any existing active pattern for this game
        // DB::table('result_pattern_set')
        //     ->where('game_id', $gameId)
        //     ->where('id', '!=', $id)
        //     ->update(['status' => 0]);

        $updated = DB::table('result_pattern_set')->where('id', $id)->update([
            'game_id' => $gameId,
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