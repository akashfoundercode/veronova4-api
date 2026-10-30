<?php

namespace App\Http\Controllers;
use DB;
use Carbon\Carbon;
use Illuminate\Http\Request;

class TitliadminController extends Controller
{
	 public function admin_result()
    {
        // Get latest active game number
        $gameid = DB::table('betlogs')->where('game_id', 21)->get();
		//dd($gameid);
        //$latestGame = DB::table('bet_results')->orderBy('games_no', 'desc')->first();
       //dd( $latestGame->games_no);
		
		$latestGame = DB::table('bet_results')->where('game_id', 21)->orderBy('id', 'desc')->first();
		//dd($latestGame);
		
 //dd([
  //  'game_id' => $latestGame->game_id,
   // 'games_no' => $latestGame->games_no,
//]);
        $nextGameNo = $latestGame ? $latestGame->games_no + 1 : 1;
    
        $multiplierData = DB::table('multiplier')->select('image', 'id')->get(); 
    
        $betsAmount = [];
    
        if ($latestGame) {
            $nextGameNo = $latestGame->games_no + 1;
        
            $allBets = DB::table('bets')
                ->where('games_no', $nextGameNo)
                ->get(); 
        
            foreach ($multiplierData as $data) {
                $totalAmount = 0; 
        
                foreach ($allBets as $bet) {
                    $betsArray = json_decode($bet->bets, true); 
        
                    foreach ($betsArray as $betItem) {
                        if ($betItem['number'] == $data->id) {
                            $totalAmount += $betItem['amount'];
                        }
                    }
                }
        
                $betsAmount[$data->id] = $totalAmount;
            }
        }
        return view('titli.index2', compact('latestGame', 'nextGameNo', 'multiplierData', 'betsAmount'));
    }

    public function admin_winner(Request $request)
    {
        $request->validate([
            'games_no' => 'required|integer',
            'card_id'  => 'required|integer',
        ]);
    
        DB::table('admin_winner_results')->insert([
            'gamesno' => $request->games_no,
            'gameId' => 21,
            'number'  => $request->card_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    
        return redirect()->back()->with('success', 'Winner added successfully!');
    }
	
	 public function game_manage()
    {
        $data = DB::table('multiplier')->get();
        return view('titli.index', compact('data'));   
    }
    public function edit($id)
    {
        $row = DB::table('multiplier')->where('id', $id)->first();

        if (!$row) {
            return response()->json(['error' => 'Record not found'], 404);
        }

        return response()->json($row);
    }
    public function update(Request $request, $id)
    {
		dd($request);
        $request->validate([
            'name' => 'nullable|string|max:255',
            'multiplier' => 'required|numeric',
        ]);
    
        DB::table('multiplier')->where('id', $id)->update([
            'name' => $request->name,
            'multiplier' => $request->multiplier,
        ]);
    
        return redirect()->back()->with('success', 'Data updated successfully.');
    }
	
	public function game()
    {
        $data = DB::table('bet_results')->select('id', 'card_name', 'games_no', 'image')->where('game_id', 21)->get();
        return view('titli.result', compact('data'));   
    }
	
	 public function bet_history()
    {
        $data = DB::table('bets')->get();
        return view('titli.history', compact('data'));
    }
	
}