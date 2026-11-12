<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AllBetHistoryController extends Controller
{
	public function all_bet_history(string $id){
		$perPage = 100;
		if($id==1||$id==2||$id==3||$id==4||$id==6||$id==7||$id==8||$id==9||$id==10){
			$color = DB::table('bets')
				->select('bets.*', 'users.username as username')
				->leftJoin('users', 'users.id', '=', 'bets.userid')
				->where('bets.game_id', $id)
				->orderByDesc('bets.id')
				->paginate($perPage);

			
			$color->getCollection()->transform(function ($item) {
				switch ($item->status) {
					case 1:
						$item->status = 'win';
						break;
					case 2:
						$item->status = 'loss';
						break;
					case 0:
						$item->status = 'pending';
						break;
				}
				return $item;
			});
			$color->getCollection()->transform(function ($val) {
				switch ($val->number) {
					case 10:
						$val->number = 'Green';
						break;
					case 20:
						$val->number = 'Voilet';
						break;
					case 30:
						$val->number = 'Red';
						break;
					case 40:
						$val->number = 'Big';
						break;
					case 50:
						$val->number = 'Small';
						break;
				}
				return $val;
			});
			$total_bet = DB::table('bets')->where('game_id',$id)->count('id');
			return view('All_bet_history.color')->with('bets',$color)->with('total_bet',$total_bet);   
		}elseif($id==5){
			$color = DB::table('aviator_bet')->select('aviator_bet.*','users.username as username')->leftJoin('users','users.id', '=', 'aviator_bet.uid')->where('aviator_bet.game_id',$id)->orderBydesc('aviator_bet.id')->paginate($perPage);
			$color->getCollection()->transform(function ($item) {
				switch ($item->status) {
					case 1:
						$item->status = 'win';
						break;
					case 2:
						$item->status = 'loss';
						break;
					case 0:
						$item->status = 'pending';
						break;
				}
				return $item;
			});
			$total_bet = DB::table('aviator_bet')->where('game_id',$id)->count('id');
			return view('All_bet_history.aviator')->with('bets',$color)->with('total_bet',$total_bet); 
		}elseif($id==11){
			$color = DB::table('plinko_bets')->where('game_id',$id)->orderBydesc('id')->paginate($perPage);
			$color->getCollection()->transform(function ($item) {
				switch ($item->type) {
					case 1:
						$item->type = 'Green';
						break;
					case 2:
						$item->type = 'yellow';
						break;
					case 3:
						$item->type = 'red';
						break;
				}
				return $item;
			});
			$total_bet = DB::table('plinko_bets')->where('game_id',$id)->count('id');
			return view('All_bet_history.plinko')->with('bets',$color)->with('total_bet',$total_bet);   
		}

	}
	
	
}