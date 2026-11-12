<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class TitiliBetApiController extends Controller
{
    public function bets(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userid' => 'required|exists:users,id',
            'game_id' => 'required|exists:betlogs,game_id',
            'bet' => 'required|array|min:1',
        ]);
            if ($validator->fails()) {
                return response()->json(['status' => false, 'message' => $validator->errors()->first()]);
            }
            $userid = $request->userid;
            $gameid = $request->game_id;
            $cardNumberAmount = $request->bet;
            date_default_timezone_set('Asia/Kolkata');
            $datetime = date('Y-m-d H:i:s');
            $orderid = date('YmdHis') . rand(11111, 99999);
            $gamesno = DB::table('betlogs')->where('game_id', $gameid)->value('games_no');
            $userWallet = DB::table('users')->where('id', $userid)->value('wallet');
            $totalBetAmount = array_sum(array_column($cardNumberAmount, 'amount'));
            if ($userWallet < $totalBetAmount) {
                return response()->json(['status' => false, 'message' => 'Insufficient balance']);
            }
            $validCardNumbers = DB::table('multiplier')->pluck('id')->toArray();
            foreach ($cardNumberAmount as $bet) {
                if (!isset($bet['number']) || !is_numeric($bet['number']) || !in_array($bet['number'], $validCardNumbers)) {
                    return response()->json(['status' => false, 'message' => 'Invalid number. It must match an ID from mini_roulette_multiplier table.']);
                }
            }
            $multiplierData = DB::table('multiplier')
                ->whereIn('id', array_column($cardNumberAmount, 'number')) 
                ->pluck('multiplier', 'id');
            DB::beginTransaction();
            try {
                DB::table('bets')->insert([
                    'bets' => json_encode($cardNumberAmount),
                    'amount' => $totalBetAmount,
                    'number' => json_encode(array_column($cardNumberAmount, 'number')),
                    'games_no' => $gamesno,
                    'game_id' => $gameid,
                    'userid' => $userid,
                    'order_id' => $orderid,
                    'created_at' => $datetime,
                    'updated_at' => $datetime,
                    'status' => 0
                ]);
                foreach ($cardNumberAmount as $bet) {
                    $card = $bet['number'];
                    $betAmount = $bet['amount'];
                    if (isset($multiplierData[$card])) {
                        $multiplier = $multiplierData[$card];
                        DB::table('betlogs')
                            ->where('game_id', $gameid)
                            ->increment('amount', $betAmount * $multiplier);
                    }
                }
                DB::table('users')->where('id', $userid)->decrement('wallet', $totalBetAmount);
                DB::commit();
                return response()->json(['status' => true, 'message' => 'Bet Successfully']);
            } catch (\Exception $e) {
                DB::rollback();
                return response()->json(['status' => 500, 'message' => 'Something went wrong', 'error' => $e->getMessage()]);
            }
        }
        //titli titli_cron
    public function titli_cron($game_id)
    {
    $per = DB::table('game_settings')->where('id', $game_id)->value('winning_percentage');
    if (!$per) {
        return response()->json(['error' => 'Invalid game ID'], false);
    }
    $game_no = DB::table('betlogs')->where('game_id', $game_id)->value('games_no');
    if (!$game_no) {
        return response()->json(['error' => 'No game found in betlogs'], false);
    }
    $admin_selected_card = DB::table('admin_winner_results')
        ->where('gamesno', $game_no)
        ->where('gameId', $game_id)
        ->value('number');

    if ($admin_selected_card) {
        // If admin has chosen a card, fetch its details
        $selected_card = DB::table('multiplier')->where('id', $admin_selected_card)->first();
        if (!$selected_card) {
            return response()->json(['error' => 'Selected card not found'], false);
        }
    } else {
        // Otherwise, pick a random card
        $selected_card = DB::table('multiplier')->inRandomOrder()->first();
        if (!$selected_card) {
            return response()->json(['error' => 'No card found in multiplier'], false);
        }
    }

    $image = $selected_card->image;
    $result_card_type = $selected_card->name;
    $multiplier = $selected_card->multiplier;
    $result_card = $selected_card->id;

    // Insert result into bet_results
    DB::table('bet_results')->insert([
        'games_no' => $game_no,
        'game_id' => $game_id,
		'number' => $result_card,
        'card_name' => $result_card_type,
        'card_id' => $result_card,
        'multiplier' => $multiplier,
        'image' => $image,
        'status' => 1,
        'created_at' => now(),
        'updated_at' => now()
    ]);

    // Distribute amounts
    $this->amountDistributor($game_id, $game_no);

    // Update betlogs
    DB::table('betlogs')->where('game_id', $game_id)->update([
        'amount' => 0,
        'games_no' => DB::raw('games_no + 1'),
    ]);

    return true;
}
    private function amountDistributor($game_id, $game_no)
    {
        $result = DB::table('bet_results')
            ->where('game_id', $game_id)
            ->latest('id')
            ->first();
    
        if (!$result) {
            return;
        }
    
        $result_card_id = (int) $result->card_id;
        $multiplier = $result->multiplier;
    
        $bets = DB::table('bets')
            ->where('game_id', $game_id)
            ->where('games_no', $game_no)
            ->get();
    
        $userWinningAmounts = []; 
    
        foreach ($bets as $bet) {
            $betData = json_decode($bet->bets ?? '', true);
    
            if ($betData === null || !is_array($betData) || empty($betData)) {
                \Log::error("Invalid bet data for Bet ID: {$bet->id}");
                continue;
            }
    
            $win_amount = 0;
            $is_winner = false;
    
            foreach ($betData as $betItem) {
                if ((int) $betItem['number'] === $result_card_id) {
                    $win_amount = $betItem['amount'] * $multiplier;
                    $is_winner = true;
                    break;
                }
            }
    
            $status = $is_winner ? 1 : 2;
    
            DB::table('bets')
                ->where('id', $bet->id)
                ->update([
                    'status' => $status,
                    'win_amount' => $win_amount,
                    'win_number' => $is_winner ? $result_card_id : null,
                    'updated_at' => now()
                ]);
    
            if ($is_winner && $win_amount > 0) {
                if (!isset($userWinningAmounts[$bet->userid])) {
                    $userWinningAmounts[$bet->userid] = 0;
                }
                $userWinningAmounts[$bet->userid] += $win_amount;
            }
        }
    
        // Bulk update user wallets
        foreach ($userWinningAmounts as $user_id => $total_win) {
            DB::table('users')
                ->where('id', $user_id)
                ->increment('wallet', $total_win);
        }
    }
    public function titli_result(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'game_id' => 'required',
            'limit' => 'required'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            return response()->json(['status' => false, 'message' => $validator->errors()->first()]);
        }
        
        $game_id = $request->game_id;
        $limit = $request->limit;
         $offset = $request->offset ?? 0;
        $from_date = $request->created_at;
        $to_date = $request->created_at;
        $status = $request->status;
    
        $where = [];
    
        if (!empty($game_id)) {
            $where[] = "bet_results.game_id = '$game_id'";
        }
    
        if (!empty($from_date) && !empty($to_date)) {
            $where[] = "bet_results.created_at BETWEEN '$from_date' AND '$to_date'";
            }
            $query = "SELECT bet_results.*, virtual_games.name AS game_name,virtual_games.number AS game_number, virtual_games.game_id AS game_gameid,game_settings.name AS game_setting_name FROM bet_results
        LEFT JOIN virtual_games ON bet_results.game_id = virtual_games.game_id && bet_results.number=virtual_games.number JOIN game_settings ON bet_results.game_id = game_settings.id ";
        
            if (!empty($where)) {
                $query .= " WHERE " . implode(" AND ", $where);
            }
        
            $query .= " ORDER BY bet_results.id DESC LIMIT $offset,$limit";
        
            $results = DB::select($query);
             
            return response()->json([
                'status' => true,
                'message' => 'All Result',
                'data' => $results
            ]);
    }
    public function bet_history(Request $request)
    {
        	$validator = Validator::make($request->all(), [
                'userid'=>'required',
        		'game_id' => 'required',
               	]);
    		
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            return response()->json(['status' => false, 'message' => $validator->errors()->first()]);
        }
    	
    	$userid = $request->userid;
        $game_id = $request->game_id;
        $limit = $request->limit ?? 10000;
        $offset = $request->offset ?? 0;
    	$from_date = $request->created_at;
    	$to_date = $request->created_at;
    	
    	if (!empty($game_id)) {
        $where['bets.game_id'] = "$game_id";
        $where['bets.userid'] = "$userid";
        }
        
        
        if (!empty($from_date)) {
            
               $where['bets.created_at']="$from_date%";
          $where['bets.created_at']="$to_date%";
        }
        
        $query = " SELECT DISTINCT bets.*, game_settings.name AS game_name, virtual_games.name AS name 
        FROM bets
        LEFT JOIN game_settings ON game_settings.id = bets.game_id 
        LEFT JOIN virtual_games ON virtual_games.game_id = bets.game_id AND virtual_games.number = bets.number" ;
        
        if (!empty($where)) {
            $query .= " WHERE " . implode(" AND ", array_map(function ($key, $value) {
                return "$key = '$value'";
            }, array_keys($where), $where));
        }
        
         $query .= " ORDER BY bets.id DESC  LIMIT $offset , $limit";
        
        $results = DB::select($query);
        $bets=DB::select("SELECT userid, COUNT(*) AS bets FROM bets WHERE `userid`=$userid GROUP BY userid
        ");
        // 		if (isset($bets[0])) {
        //     $total_bet = $bets[0]->total_bets;
        // } else {
        //     $total_bet = 0; 
        // }
        
        if(!empty($results)){
        		 return response()->json([
                    'status' => true,
                    'message' => 'Data found',
                    'data' => $results
                    
                ]);
                 return response()->json($response,true);
        }else{
            
            $response = [
            'status' => false,
            'message' => 'No Data found',
            'data' => $results
        ];
        
            return response()
            ->json($response, $response['status']);
                     
            }
    
    }
    public function getamount(Request $request)
    {
        $validator = Validator::make($request->all(), [ 
            'userid' => 'required',
            'games_no' => 'required'
        ]);
        $validator->stopOnFirstFailure();
        if ($validator->fails()) {
            return response()->json(['status' => false, 'message' => $validator->errors()->first()]);
        }
    
        $userid = $request->userid;
        $games_no = $request->games_no;
    
        // Summing win_amount and total_amount
        $gameData = DB::table('bets')
            ->selectRaw('SUM(win_amount) as total_win_amount, SUM(amount) as total_bet_amount')
            ->where('userid', $userid)
            ->where('games_no', $games_no)
            ->first(); 
    
        if ($gameData && ($gameData->total_win_amount !== null || $gameData->total_bet_amount !== null)) {
            return response()->json([
                'status' => true,
                'message' => 'Data found',
                'data' => $gameData
            ]);
        } else {
            return response()->json([
                'status' => false,
                'message' => 'No data found'
            ]);
        }
    }
    public function titli_win_amount(Request $request)
{
    $validator = Validator::make($request->all(), [ 
        'userid' => 'required',
        'game_id' => 'required',
        'games_no' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    // Get the input data
    $game_id = $request->game_id;
    $userid = $request->userid;
    $game_no = $request->games_no;

    // Fetch winning numbers
    $rawWinningNumbers = DB::table('bet_results')
        ->where('game_id', $game_id)
        ->where('games_no', $game_no)
        ->value('number'); 

    if (!$rawWinningNumbers) {
        return response()->json(['status' => 400, 'message' => 'Winning numbers not found.'], 400);
    }

    // Decode or wrap as array
    $winningNumbers = is_string($rawWinningNumbers)
        ? json_decode($rawWinningNumbers, true)
        : (array) $rawWinningNumbers;

    // Fetch user's bet
    $win_amount = DB::select("
        SELECT SUM(`win_amount`) AS total_amount, 
               `amount`, 
               `games_no`, 
               `game_id` AS gameid, 
               `number`
        FROM `bets` 
        WHERE `games_no` = ? 
          AND `game_id` = ? 
          AND `userid` = ? 
        GROUP BY `games_no`, `game_id`, `number`, `amount`
    ", [$game_no, $game_id, $userid]);

    if ($win_amount) {
        $totalWinAmount = $win_amount[0]->total_amount ?? 0;

        // Decode bet numbers
        $selectedNumbers = json_decode($win_amount[0]->number, true);

        // Ensure both are arrays
        $selectedNumbers = is_array($selectedNumbers) ? $selectedNumbers : (array) $selectedNumbers;
        $winningNumbers = is_array($winningNumbers) ? $winningNumbers : (array) $winningNumbers;

        // Find matched numbers
        $matchedNumbers = array_intersect($selectedNumbers, $winningNumbers);

        // Prepare response
        $response = [
            'message' => 'Successfully fetched win details',
            'status' => 200,
            'win' => $totalWinAmount,
            'amount' => $win_amount[0]->amount,
            'games_no' => $win_amount[0]->games_no,
            'result' => $totalWinAmount > 0 ? 'win' : 'lose', 
            'gameid' => $win_amount[0]->gameid,
           // 'number' => array_values($matchedNumbers), // Reindex array
			'number' => !empty($matchedNumbers) ? reset($matchedNumbers) : null,

        ];

        return response()->json($response, 200);
    } else {
        return response()->json(['msg' => 'No record found', 'status' => 400], 400);
    }
}

	
		public function titli_win_amount_old(Request $request)
{
    $validator = Validator::make($request->all(), [ 
        'userid' => 'required',
        'game_id' => 'required',
        'games_no' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    // Get the input data
    $game_id = $request->game_id;
    $userid = $request->userid;
    $game_no = $request->games_no;

    $winningNumbers = DB::table('bet_results')
        ->where('game_id', $game_id)
        ->where('games_no', $game_no)
        ->value('number'); 

    if (!$winningNumbers) {
        return response()->json(['status' => 400, 'message' => 'Winning numbers not found.'], 400);
    }

    $winningNumbers = json_decode($winningNumbers, true);

    $win_amount = DB::Select("
    SELECT SUM(`win_amount`) AS total_amount, 
           `amount`, 
           `games_no`, 
           `game_id` AS gameid, 
           `selected_numbers`
    FROM `bets` 
    WHERE `games_no` = $game_no 
      AND `game_id` = $game_id 
      AND `userid` = $userid 
    GROUP BY `games_no`, `game_id`, `selected_numbers`, `amount`
");

    if ($win_amount) {
        $totalWinAmount = $win_amount[0]->total_amount;
        $selectedNumbers = json_decode($win_amount[0]->selected_numbers, true);

        $matchedNumbers = array_intersect($selectedNumbers, $winningNumbers);

        // Prepare the result message
        $response = [
            'message' => 'Successfully fetched win details',
            'status' => 200,
            'win' => $totalWinAmount,
            'amount' => $win_amount[0]->amount,
            'games_no' => $win_amount[0]->games_no,
            'result' => $totalWinAmount > 0 ? 'win' : 'lose', 
            'gameid' => $win_amount[0]->gameid,
            'number' => $matchedNumbers, 
        ];

        return response()->json($response, 200);
    } else {
        return response()->json(['msg' => 'No record found', 'status' => 400], 400);
    }
}
	
    //funab_cron
    public function funab_cron($game_id)
    {
        $per = DB::table('game_settings')->where('id', $game_id)->value('winning_percentage');
        if (!$per) {
            return response()->json(['error' => 'Invalid game ID'], false);
        }
    
        $game_no = DB::table('betlogs')->where('game_id', $game_id)->value('games_no');
        if (!$game_no) {
            return response()->json(['error' => 'No game found in betlogs'], false);
        }
    
        $admin_selected_card = DB::table('admin_winner_results')
            ->where('games_no', $game_no)
            ->where('game_id', $game_id)
            ->value('number');
    
        if ($admin_selected_card) {
            $selected_card = DB::table('cards')->where('id', $admin_selected_card)->first();
            if (!$selected_card) {
                return response()->json(['error' => 'Selected card not found'], false);
            }
        } else {
            $selected_card = DB::table('cards')->inRandomOrder()->first();
            if (!$selected_card) {
                return response()->json(['error' => 'No card found in multiplier'], false);
            }
        }
    }
}
