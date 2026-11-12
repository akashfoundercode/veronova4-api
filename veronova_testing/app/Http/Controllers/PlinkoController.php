<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use DB;
use Illuminate\Support\Str;
use App\Models\All_image;

class PlinkoController extends Controller
{
       public function index()
    {
		$bets = DB::table('plinko_bet')
			->leftJoin('users', 'plinko_bet.userid', '=', 'users.id')
			->select('plinko_bet.*', 'users.username')
			->orderBy('plinko_bet.id', 'DESC')
			->get();

		return view('plinko.index', compact('bets'));
    }
}
      
      
	
      

     
