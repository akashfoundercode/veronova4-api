<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class ChickenController extends Controller
{ 
   public function betlist(){
    $user_id = session::get('id');
    
    if (!empty($user_id)) {
        $bets = DB::table('chicken_bets')
            ->join('users', 'chicken_bets.user_id', '=', 'users.id')
            ->select('chicken_bets.*', 'users.username as user_name') 
             ->orderBy('chicken_bets.id', 'desc')
            ->get();
        
        return view('chicken_road.bet', ['bet' => $bets]);
    } else {
        return redirect('/');
    }
}

function amountSetup(){
    
    $amountSetup =DB::table('game_rules')->get();
    
    return view('chicken_road.amount_setupList',compact('amountSetup'));
     
 } 
    public function updateGameRules(Request $request)
{
    $current = DB::table('game_rules')->where('id', $request->id)->value('value');

    if ($current === $request->value) {
        return redirect()->back()->with('success', 'No changes made.');
    }

    DB::table('game_rules')
        ->where('id', $request->id)
        ->update(['value' => $request->value]);

    return redirect()->back()->with('success', 'Setting updated successfully.');
}
    
    public function bet_history(){
        $user_id=session::get('id');
        if(!empty($user_id)){
        $bet_history=DB::table('bets')->get();
        return view('chicken_road.betHistory',['betHistory'=>$bet_history]);
        }else{
            return redirect('/');
        }
    }
    
    
           public function multiplier()
        {
            $user_id = Session::get('id');
        
            if (!empty($user_id)) {
                $multipliers = DB::table('multiplier')->get();
        
                $roastMultipliers = DB::table('roast_control')->get();
               
               $multiList = [
            1 => DB::table('multiplier')->where('type', 1)->pluck('multiplier'),
            2 => DB::table('multiplier')->where('type', 2)->pluck('multiplier'),
            3 => DB::table('multiplier')->where('type', 3)->pluck('multiplier'),
            4 => DB::table('multiplier')->where('type', 4)->pluck('multiplier'),
        ];

        return view('chicken_road.multiplier', [
            'multiplier' => $multipliers,
            'roast_multipliers' => $roastMultipliers,
            'multiList'=>$multiList
        ]);
    } else {
        return redirect('/');
    }
}

    
    public function cashout(){
        $user_id=session::get('id');
        if(!empty($user_id)){
        return view('chicken_road.cashout');
        }else{
            return redirect('/');
        }
    }
    
 
 public function winner(){
     $user_id=session::get('id');
     if(!empty($user_id)){
         return view('chicken_road.winner');
     }else{
         return redirect('/');
     }
 }
 
 
 
 
  // Store new multiplier
    public function add_multiplier(Request $request)
    {
        $request->validate([
            'multiplier' => 'required',
            'frequency' => 'nullable|numeric',
            'type' => 'required|in:1,2,3,4',
        ]);

        DB::table('multiplier')->insert([
            'multiplier' => $request->multiplier,
            'frequency' => $request->frequency,
            'type' => $request->type,
           
        ]);

        return redirect()->back()->with('success', 'Multiplier added successfully!');
    }

public function multiplier_update(Request $request)
{
    
    // dd($request->all());
    $request->validate([
        'id' => 'required',
        'multiplier' => 'required',
        'frequency' => 'nullable|numeric',
        'type' => 'required|in:1,2,3,4',
    ]);

    \DB::table('multiplier')->where('id', $request->id)->update([
        'multiplier' => $request->multiplier,
        'frequency' => $request->frequency,
        'type' => $request->type,
    ]);

    return redirect()->back()->with('success', 'Multiplier updated successfully!');
}

public function updateRoastMultiplier(Request $request)
{
    $request->validate([
        'id' => 'required',
        'roast_multiplier' => 'required'
    ]);

    DB::table('roast_control')
        ->where('id', $request->id)
        ->update([
            'roast_multiplier' => $request->roast_multiplier
        ]);

    return redirect()->back()->with('success', 'Roast Multiplier Updated!');
}

public function multiplier_delete(Request $request)
{
    $request->validate([
        'id' => 'required|exists:multiplier,id',
    ]);

    DB::table('multiplier')->where('id', $request->id)->delete();

    return redirect()->back()->with('success', 'Multiplier deleted successfully.');
}

function betValues()
{
    $betValues = DB::table('bet_values')
        ->orderBy('id', 'desc')
        ->get();

    return view('chicken_road.bet_values', compact('betValues'));
}

public function updateBetValues(Request $request)
{
    $request->validate([
        'id' => 'required|exists:bet_values,id',
        'value' => 'required|numeric',
    ]);

    DB::table('bet_values')
      ->where('id', $request->id)
      ->update([
          'value' => $request->value,
          'updated_at' => now(),
      ]);

    return redirect()->back()->with('success', 'Bet Value updated successfully.');
}



}
