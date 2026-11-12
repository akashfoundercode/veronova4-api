<?php

namespace App\Http\Controllers;

use App\Models\TripleChance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TripleChanceController extends Controller
{
   
    public function bets(){
        $records =DB:: table('triplechance_bets')->paginate(10);
        return view('triplechance.bets', compact('records'));
    }
    
    public function results(){
        $records = DB::table('triplechance_results')->paginate(10);
        return view('triplechance.results', compact('records'));
    }
}

