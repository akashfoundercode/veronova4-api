<?php


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Validator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

use Illuminate\Support\Facades\DB;



class HighLowgameApiController extends Controller
{
	public function high_low_bet(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'game_id' => 'required',
        'card_number' => 'required',
        'number' => 'required',
        'amount' => 'required|numeric|min:0.1',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    $userid = $request->userid;
    $gameid = $request->game_id;
    $number = $request->number;
    $card_number = $request->card_number;
    $amount = $request->amount;

    date_default_timezone_set('Asia/Kolkata');
    $datetime = date('Y-m-d H:i:s');
    $orderid = date('YmdHis') . rand(11111, 99999);

    $gamesno = DB::table('betlogs')->where('game_id', $gameid)->value('games_no');
    $userWallet = DB::table('users')->where('id', $userid)->value('wallet');

    if ($userWallet < $amount) {
        return response()->json(['status' => 400, 'message' => 'Insufficient balance']);
    }

    $commission = $amount * 0.00;
    $betAmount = $amount - $commission;

    $data1 = DB::table('virtual_games')
        ->where('number', $number)
        ->where('game_id', $gameid)
        ->get(['multiplier', 'actual_number']);

    $totalAmount = 0;
    foreach ($data1 as $row) {
        $totalAmount += $betAmount * $row->multiplier;
    }

    DB::beginTransaction();
    try {
        $hii = DB::table('high_low_bets')->insert([
            'amount' => $amount,
            'trade_amount' => $betAmount,
            'commission' => $commission,
            'number' => $number,
            'card_number' => $card_number,
            'games_no' => $gamesno,
            'game_id' => $gameid,
            'userid' => $userid,
            'order_id' => $orderid,
            'created_at' => $datetime,
            'updated_at' => $datetime,
            'status' => 0
        ]);

        if (!$hii) {
            DB::rollBack();
            return response()->json(['status' => 500, 'message' => 'Failed to place bet.']);
        }

        if (empty($data1)) {
            DB::rollBack();
            return response()->json(['status' => 500, 'message' => 'No matching game data found.']);
        }

        foreach ($data1 as $row) {
            DB::table('betlogs')
                ->where('game_id', $gameid)
                ->where('number', $row->actual_number)
                ->increment('amount', $betAmount * $row->multiplier);
        }

        DB::table('users')
            ->where('id', $userid)
            ->update([
                'wallet' => DB::raw('wallet - ' . $amount),
                'recharge' => DB::raw('CASE WHEN recharge >= ' . $amount . ' THEN recharge - ' . $amount . ' ELSE 0 END'),
                'today_turnover' => DB::raw('today_turnover + ' . $amount),
            ]);

        DB::commit();
        return response()->json(['status' => 200, 'message' => 'Bet Successfully']);
    } catch (\Exception $e) {
        DB::rollBack();
        // Debug error message
        dd($e->getMessage());

        // For production use:
        // Log::error('HighLowBet Error: ' . $e->getMessage());
         return response()->json(['status' => 500, 'message' => 'Something went wrong']);
    }
}


    public function high_low_cron($game_id)
    {
    $per = DB::select("SELECT winning_percentage FROM game_settings WHERE id = ?", [$game_id]);
    $percentage = $per[0]->winning_percentage;

    $gameno = DB::select("SELECT * FROM betlogs WHERE game_id = ? LIMIT 1", [$game_id]);
    $game_no = $gameno[0]->games_no;
    $period = $game_no;

    $sumamt = DB::select("SELECT SUM(amount) AS amount FROM high_low_bets WHERE game_id = ? AND games_no = ?", [$game_id, $period]);
    $totalamount = $sumamt[0]->amount ?? 0;

    $percentageamount = $totalamount * $percentage * 0.01;

    $lessamount = DB::select("SELECT * FROM betlogs WHERE game_id = ? AND games_no = ? AND amount <= ? ORDER BY amount ASC LIMIT 1", [$game_id, $period, $percentageamount]);
    if (count($lessamount) == 0) {
        $lessamount = DB::select("SELECT * FROM betlogs WHERE game_id = ? AND games_no = ? AND amount >= ? ORDER BY amount ASC LIMIT 1", [$game_id, $period, $percentageamount]);
    }

    $zeroamount = DB::select("SELECT * FROM betlogs WHERE game_id = ? AND games_no = ? AND amount = 0 ORDER BY RAND() LIMIT 1", [$game_id, $period]);

    $admin_winner = DB::select("SELECT * FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1", [$period, $game_id]);
    $min_max = DB::select("SELECT MIN(number) AS mins, MAX(number) AS maxs FROM betlogs WHERE game_id = ?", [$game_id]);

    if (!empty($admin_winner)) {
        $number = $admin_winner[0]->number;
        $res = $number;
    } elseif ($totalamount < 450) {
        $res = rand($min_max[0]->mins, $min_max[0]->maxs);
    } else {
        $res = $lessamount[0]->number ?? rand($min_max[0]->mins, $min_max[0]->maxs);
    }

    $result = $res;

    $cards = DB::select("SELECT id FROM cards ORDER BY RAND() LIMIT 1");
    $card = $cards[0]->id;

    DB::insert("INSERT INTO bet_results (`number`, `games_no`, `game_id`, `status`, `json`, `random_card`) VALUES (?, ?, ?, '1', ?, ?)", [$result, $period, $game_id, $card, $card]);

    //$this->amountdistributioncolors($game_id, $period, $result, $card);
		$this->amountdistributionhilo($game_id, $period, $result, $card);

    DB::update("UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?", [$game_id]);

    return true;
}
    private function amountdistributionhilo($game_id, $period, $result, $card)
    {
        $bets = DB::select("SELECT id, userid, number, trade_amount FROM high_low_bets WHERE games_no = ? AND game_id = ?", [$period, $game_id]);
        foreach ($bets as $bet) {
            if ($bet->number == $result) {
                $virtual = DB::select("SELECT multiplier FROM virtual_games WHERE game_id = 15 AND actual_number = ?", [$bet->number]);
                if (!empty($virtual)) {
                    $multiplier = $virtual[0]->multiplier;
                    $winAmount = $bet->trade_amount * $multiplier;
                    DB::update("UPDATE high_low_bets SET win_amount = ?, win_number = ?, status = 1, result_card = ? WHERE id = ?", [$winAmount, $result, $card, $bet->id]);
                    DB::update("UPDATE users SET wallet = wallet + ?, winning_wallet = winning_wallet + ? WHERE id = ?", [$winAmount, $winAmount, $bet->userid]);
                }
            }else {
                DB::update("UPDATE high_low_bets SET win_amount = 0, win_number = ?, status = 2, result_card = ? WHERE id = ?", [$result, $card, $bet->id]);
            }
        }
    }
    public function high_low_bet_history(Request $request)
	{
    	$validator = Validator::make($request->all(), [
    	    'userid'=>'required',
    	    'game_id' => 'required',
    		 ]);
        $validator->stopOnFirstFailure();
        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
        }
    	$userid = $request->userid;
        $game_id = $request->game_id;
        $limit = $request->limit ?? 10000;
        $offset = $request->offset ?? 0;
    	$from_date = $request->created_at;
    	$to_date = $request->created_at;
        if (!empty($game_id)) {
            $where['high_low_bets.game_id'] = "$game_id";
            $where['high_low_bets.userid'] = "$userid";
        }
        if (!empty($from_date)) {
        $where['high_low_bets.created_at']="$from_date%";
        $where['high_low_bets.created_at']="$to_date%";
        }
        $query = " SELECT DISTINCT high_low_bets.*, game_settings.name AS game_name, virtual_games.name AS name 
        FROM high_low_bets
        LEFT JOIN game_settings ON game_settings.id = high_low_bets.game_id 
        LEFT JOIN virtual_games ON virtual_games.game_id = high_low_bets.game_id AND virtual_games.number = high_low_bets.number" ;
        
        if (!empty($where)) {
            $query .= " WHERE " . implode(" AND ", array_map(function ($key, $value) {
                return "$key = '$value'";
            }, array_keys($where), $where));
        }
        $query .= " ORDER BY  high_low_bets.id DESC  LIMIT $offset , $limit";
        $results = DB::select($query);
        $bets=DB::select("SELECT userid, COUNT(*) AS total_bets FROM high_low_bets WHERE `userid`=$userid GROUP BY userid
        ");
        		if (isset($bets[0])) {
            $total_bet = $bets[0]->total_bets;
        } else {
            $total_bet = 0; 
        }
        if(!empty($results)){
        return response()->json([
            'status' => 200,
            'message' => 'Data found',
            'total_bets' => $total_bet,
            'data' => $results
        ]);
        return response()->json($response,200);
        }else{
            $response = [
            'status' => 400,
            'message' => 'No Data found',
            'data' => $results
        ];
        return response()->json($response, $response['status']);
        }
    }

     public function high_low_win_amount(Request $request)
     {
    	    
     	    	$validator = Validator::make($request->all(), [ 
     				'userid' => 'required',
     		       'game_id' => 'required',
     		       'games_no'=>'required'
    		
     			]);
    
         $validator->stopOnFirstFailure();
    
         if ($validator->fails()) {
             return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
         }
    	
    	
         $game_id = $request->game_id;
         $userid = $request->userid;
     	$game_no = $request->games_no;
     
    	   
     // 	     $win_amount = DB::Select("SELECT 
     //     SUM(`win_amount`) AS total_amount,
     //     `gamesno`,
     //     `status`,
     //     `game_id` AS gameid,
     //     `win_number` AS number,
     //     CASE WHEN SUM(`win_amount`) = 0 THEN 'lose' ELSE 'win' END AS result 
     // FROM 
     //     `high_low_bets` 
     // WHERE 
     //     `gamesno` =  $game_no
     //     AND `game_id` = $game_id 
     //     AND `userid` = $userid 
     // GROUP BY 
     //     `gamesno`,
     //     `game_id`,
     //     `win_number`
     // ");
     $win_amount = DB::Select("SELECT 
         SUM(win_amount) AS total_amount,
         games_no,
         game_id AS gameid,
         win_number AS number,
         CASE WHEN SUM(win_amount) = 0 THEN 'lose' ELSE 'win' END AS result,
         CASE WHEN SUM(win_amount) = 0 THEN 2 ELSE 1 END AS win_loss_status 
     FROM 
         high_low_bets 
     WHERE 
         games_no = $game_no 
         AND game_id = $game_id 
         AND userid = $userid 
     GROUP BY 
         games_no, 
         game_id, 
         win_number");
      if ($win_amount) {
                 $response = [
                     'message' => 'Successfully',
                     'status' => 200,
                     'win' => $win_amount[0]->total_amount,
                     'games_no' => $win_amount[0]->games_no,
                     'result' => $win_amount[0]->result,
                     'gameid' => $win_amount[0]->gameid,
                     'number' => $win_amount[0]->number,
                     'win_loss_status' => $win_amount[0]->win_loss_status,
                 ];
                 return response()->json($response,200);
             } else {
                 return response()->json(['msg' => 'No record found','status' => 400,], 400);
             }
    	    
    	}
	
     public function high_low_results(Request $request)
     {
     $validator = Validator::make($request->all(), [
         'game_id' => 'required',
         'limit' => 'required'
     ]);

     $validator->stopOnFirstFailure();

     if ($validator->fails()) {
         return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }
    
    $game_id = $request->game_id;
     $limit = $request->limit;
      $offset = $request->offset ?? 0;
     $from_date = $request->created_at;
     $to_date = $request->created_at;
     $status = $request->status;

     $where = [];
//  dd($where);
   if (!empty($game_id)) {
         $where[] = "bet_results.game_id = '$game_id'";
     }
     // dd($game_id);
     if (!empty($from_date) && !empty($to_date)) {
         $where[] = "bet_results.created_at BETWEEN '$from_date' AND '$to_date'";
     }
     $query = "
         SELECT 
     bet_results.*, 
     virtual_games.name AS game_name,
     virtual_games.number AS game_number, 
     virtual_games.game_id AS game_gameid,
     game_settings.name AS game_setting_name 
FROM 
     bet_results
 LEFT JOIN 
     virtual_games ON bet_results.game_id = virtual_games.game_id && bet_results.number=virtual_games.number
 JOIN 
     game_settings ON bet_results.game_id = game_settings.id 
     ";
 // dd($query);
     if (!empty($where)) {
         $query .= " WHERE " . implode(" AND ", $where);
     }

     $query .= " ORDER BY bet_results.id DESC LIMIT $offset,$limit";
     // dd($query);
     $results = DB::select($query);
     return response()->json([
         'status' => 200,
         'message' => 'Data found',
         'data' => $results
     ]);
 }
    
}