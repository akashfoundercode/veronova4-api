<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use App\Helper\jilli;
use Illuminate\Support\Facades\DB;

class BlockchaingameApiController extends Controller
{
	public function blockchain_bet(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required|exists:users,id',
        'game_id' => 'required|exists:virtual_games,game_id',// for 1 hrs game id=27 ,3hrs =28 24hrs=29
        'selected_numbers' => 'required|string', // JSON string
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }

    // Decode JSON
    $selectedNumbersList = json_decode($request->selected_numbers, true);

    if (!is_array($selectedNumbersList) || empty($selectedNumbersList)) {
        return response()->json(['status' => 400, 'message' => 'Invalid selected numbers format.']);
    }

    $uid = $request->userid;
    $gameId = $request->game_id;

    // Get bet amount from lottery_setting table
    $setting = DB::table('lottery_setting')->where('id', 1)->first();
    $fixedAmount = $setting ? $setting->bet_amount : 1; // fallback to 1 if not found

    $totalAmount = $fixedAmount * count($selectedNumbersList);

    $user = DB::table('users')->where('id', $uid)->first();
    if (!$user) {
        return response()->json(['status' => 404, 'message' => 'User not found.']);
    }

    if ($user->wallet < $totalAmount) {
        return response()->json([
            'status' => 400,
            'message' => 'Insufficient balance for placing the bet.'
        ]);
    }

    $gamesNo = DB::table('lottery_betlogs')
        ->where('game_id', $gameId)
        ->value('games_no');

    foreach ($selectedNumbersList as $numbers) {
        DB::table('lottery_bets')->insert([
            'user_id' => $uid,
            'game_id' => $gameId,
            'games_no' => $gamesNo,
            'amount' => $fixedAmount, // FIXED: only one bet amount
            'selected_number' => json_encode($numbers),
            'created_at' => now(),
            'updated_at' => now(),
            'status' => 0,
        ]);

        foreach ($numbers as $number) {
            $virtualGame = DB::table('virtual_games')
                ->where('number', $number)
                ->where('game_id', $gameId)
                ->select('actual_number', 'multiplier')
                ->first();

            if ($virtualGame) {
                DB::table('lottery_betlogs')
                    ->where('game_id', $gameId)
                    ->where('number', $virtualGame->actual_number)
                    ->increment('amount', $fixedAmount * $virtualGame->multiplier); // FIXED
            }
        }
    }

    // 💰 Recharge and wallet update
    $recharge = $user->recharge;
    if ($recharge >= $totalAmount) {
        DB::table('users')->where('id', $uid)->update([
            'recharge' => DB::raw("recharge - $totalAmount"),
            'wallet' => DB::raw("wallet - $totalAmount")
        ]);
    } else {
        $remaining = $totalAmount - $recharge;
        DB::table('users')->where('id', $uid)->update([
            'recharge' => 0,
            'wallet' => DB::raw("wallet - $remaining")
        ]);
    }

    return response()->json(['status' => 200, 'message' => 'Multiple bets placed successfully']);
}

	public function lottery_result(Request $request)
{
    $validator = Validator::make($request->all(), [
        'game_id' => 'required',
        'limit' => 'required',
        'user_id' => 'required',
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
    $userid = $request->user_id;

    $where = [];

    if (!empty($game_id)) {
        $where[] = "lottery_bet_result.game_id = '$game_id'";
    }

    if (!empty($from_date) && !empty($to_date)) {
        $where[] = "lottery_bet_result.created_at BETWEEN '$from_date' AND '$to_date'";
    }

    $query = "SELECT lottery_bet_result.*, virtual_games.name AS game_name, virtual_games.number AS game_number, virtual_games.game_id AS game_gameid, game_settings.name AS game_setting_name 
        FROM lottery_bet_result
        LEFT JOIN virtual_games ON lottery_bet_result.game_id = virtual_games.game_id AND lottery_bet_result.number = virtual_games.number 
        JOIN game_settings ON lottery_bet_result.game_id = game_settings.id";

    if (!empty($where)) {
        $query .= " WHERE " . implode(" AND ", $where);
    }

    $query .= " ORDER BY lottery_bet_result.id DESC LIMIT $offset, $limit";

    $results = DB::select($query);

    $totalWinAmount = 0;
    $totalLossAmount = 0;

    foreach ($results as &$result) {
        $gameId = $result->game_id;
        $gamesNo = $result->games_no ?? $result->number;

        // Get win amount where status = 1 (win)
        $winData = DB::select("
            SELECT SUM(win_amount) AS total_win
            FROM lottery_bets 
            WHERE games_no = ? AND game_id = ? AND user_id = ? AND status = 1
        ", [$gamesNo, $gameId, $userid]);

        // Get loss amount where status = 2 (loss)
        $lossData = DB::select("
            SELECT SUM(amount) AS total_loss
            FROM lottery_bets 
            WHERE games_no = ? AND game_id = ? AND user_id = ? AND status = 2
        ", [$gamesNo, $gameId, $userid]);

        $winAmount = $winData[0]->total_win ?? 0;
        $lossAmount = $lossData[0]->total_loss ?? 0;

        $result->win_amount = $winAmount;
        $result->loss_amount = $lossAmount;

        $totalWinAmount += $winAmount;
        $totalLossAmount += $lossAmount;
    }

    return response()->json([
        'status' => 200,
        'message' => 'Data found',
        'win_amount' => $totalWinAmount,
        'loss_amount' => $totalLossAmount,
        'data' => $results
    ]);
}

	

	
	public function lottery_win_amount(Request $request)
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
//dd($game_id);
    $winningNumbers = DB::table('lottery_bet_result')
        ->where('game_id', $game_id)
        ->where('games_no', $game_no)
        ->value('number'); 

    if (!$winningNumbers) {
        return response()->json(['status' => 400, 'message' => 'Winning numbers not found.'], 400);
    }
//dd($winningNumbers);
    $winningNumbers = json_decode($winningNumbers, true);

    $win_amount = DB::Select("
    SELECT SUM(`win_amount`) AS total_amount, 
           `amount`, 
           `games_no`, 
           `game_id` AS gameid, 
           `selected_number`
    FROM `lottery_bets` 
    WHERE `games_no` = $game_no 
      AND `game_id` = $game_id 
      AND `user_id` = $userid 
    GROUP BY `games_no`, `game_id`, `selected_number`, `amount`
");

    if ($win_amount) {
        $totalWinAmount = $win_amount[0]->total_amount;
        $selectedNumbers = json_decode($win_amount[0]->selected_number, true);

        $matchedNumbers = array_intersect($selectedNumbers, $winningNumbers);
//dd($win_amount);
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
//dd($response);
        return response()->json($response, 200);
    } else {
        return response()->json(['msg' => 'No record found', 'status' => 400], 400);
    }
}
	public function lottery_ResultHistory(Request $request)
{
    try {
        // 1. Validate user_id and game_id input
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|numeric|exists:users,id',
            'game_id' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $userId = $request->user_id;
        $gameId = $request->game_id;

        // 2. Allow only specific game IDs
        $allowedGameIds = [27, 28, 29];
        if (!in_array($gameId, $allowedGameIds)) {
            return response()->json([
                'success' => true,
                'message' => 'This game is not available.',
                'data'    => [],
            ]);
        }

        // 3. Fetch all user bets on this game (with or without result)
        $bets = DB::table('lottery_bets as b')
            ->leftJoin('lottery_bet_result as r', function ($join) {
                $join->on('b.game_id', '=', 'r.game_id')
                     ->on('b.games_no', '=', 'r.games_no');
            })
            ->where('b.user_id', $userId)
            ->where('b.game_id', $gameId)
            ->orderBy('b.id', 'desc')
            ->select(
                'b.id as bet_id',
                'b.game_id',
                'b.games_no',
                'b.selected_number',
                'b.amount',
                'b.win_amount',
                'b.win_number',
                'b.status',
                'r.created_at as result_time'
            )
            ->get();

        if ($bets->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'No bets found for this user in this game.',
                'data'    => [],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Bet history fetched successfully!',
            'data'    => $bets,
        ]);

    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'error'   => 'API request failed: ' . $e->getMessage(),
        ], 500);
    }
}


	
	public function lottery_ResultHistory12june(Request $request)
{
    try {
        // 1. Validate user_id and game_id input
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|numeric|exists:users,id',
            'game_id' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $userId = $request->user_id;
        $gameId = $request->game_id;

        // 2. Allow only specific game IDs
        $allowedGameIds = [27, 28, 29];

        if (!in_array($gameId, $allowedGameIds)) {
            return response()->json([
                'success' => true,
                'message' => 'This game is not available.',
                'data'    => [],
            ]);
        }

        // 3. Check if user has placed a bet on this game_id
        $hasBet = DB::table('lottery_bets')
            ->where('user_id', $userId)
            ->where('game_id', $gameId)
            ->exists();

        if (!$hasBet) {
            return response()->json([
                'success' => true,
                'message' => 'User has not placed any bet on this game.',
                'data'    => [],
            ]);
        }

        // 4. Fetch results with user's amount and win_amount
        $result = DB::table('lottery_bet_result as r')
            ->join('lottery_bets as b', function ($join) use ($userId, $gameId) {
                $join->on('r.game_id', '=', 'b.game_id')
                     ->on('r.games_no', '=', 'b.games_no')
                     ->where('b.user_id', '=', $userId);
            })
            ->where('r.game_id', $gameId)
            ->orderBy('r.id', 'desc')
            ->select(
                'r.id as result_id',
                'r.game_id',
                'r.games_no',
               // 'r.result',
                'r.created_at as result_time',
                'b.amount',
                'b.win_amount'
            )
            ->get();

        if ($result->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'Result not declared yet for this game.',
                'data'    => [],
            ]);
        }

        // 5. Return result with bet details
        return response()->json([
            'success' => true,
            'message' => 'Result with bet details fetched successfully!',
            'data'    => $result,
        ]);

    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'error'   => 'API request failed: ' . $e->getMessage(),
        ], 500);
    }
}

	
public function lottery_ResultHistoryold(Request $request)
{
    try {
        // 1. Validate user_id and game_id input
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|numeric|exists:users,id',
            'game_id' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $userId = $request->user_id;
        $gameId = $request->game_id;

        // 2. Allow only specific game IDs
        $allowedGameIds = [27, 28, 29];

        if (!in_array($gameId, $allowedGameIds)) {
            return response()->json([
                'success' => true,
                'message' => 'This game is not available.',
                'data'    => [],
            ]);
        }

        // 3. Check if user has placed a bet on this game_id
        $hasBet = DB::table('lottery_bets')
            ->where('user_id', $userId)
            ->where('game_id', $gameId)
			
            ->exists();

        if (! $hasBet) {
            return response()->json([
                'success' => true,
                'message' => 'User has not placed any bet on this game.',
                'data'    => [],
            ]);
        }

        // 4. Check if result exists for the given game_id
       $result = DB::table('lottery_bet_result')
    ->where('game_id', $gameId)
    ->orderBy('id', 'desc')  // Optional: latest result first
    ->get();

		

        if (! $result) {
            return response()->json([
                'success' => true,
                'message' => 'Result not declared yet for this game.',
                'data'    => [],
            ]);
        }

        // 5. Return result
        return response()->json([
            'success' => true,
            'message' => 'Result fetched successfully!',
            'data'    => $result,
        ]);

    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'error'   => 'API request failed: ' . $e->getMessage(),
        ], 500);
    }
}
	
	public function lottery_cron($game_id)
{
    // 1. Get current game number
    $gameno = DB::select("SELECT games_no FROM lottery_betlogs WHERE game_id = ? LIMIT 1", [$game_id]);
    if (empty($gameno)) {
        return response()->json(['status' => false, 'message' => 'No game found']);
    }
    $game_no = $gameno[0]->games_no;
    $period = $game_no;

    // 2. Check manual result from admin_winner_results
    $admin_winner = DB::select("SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1", [$game_no, $game_id]);
    if (!empty($admin_winner)) {
        $result = json_decode($admin_winner[0]->number, true);
    } else {
        $numbers = range(0, 9);
        shuffle($numbers);
        $result = array_slice($numbers, 0, 6); // Random 6 numbers
    }

    // 3. Save result and process winners
    $this->gameon_lottery($game_id, $period, $result);
}
	private function gameon_lottery($game_id, $period, $result)
{
    // 1. Save result
    DB::insert("INSERT INTO lottery_bet_result (number, games_no, game_id, status, created_at) VALUES (?, ?, ?, 1, NOW())", [
        json_encode($result), $period, $game_id
    ]);

    // 2. Get all bets
    $bets = DB::select("SELECT * FROM lottery_bets WHERE game_id = ? AND games_no = ?", [$game_id, $period]);

    $winners = [
        'first' => null,
        'second' => null,
        'third' => null,
    ];

    foreach ($bets as $bet) {
        $user_numbers = json_decode($bet->selected_number, true);
        $matched_numbers = array_values(array_intersect($user_numbers, $result));
        $match_count = count($matched_numbers);

        // Decide winner positions
        if ($match_count == 6 && $winners['first'] === null) {
            $winners['first'] = ['bet' => $bet, 'matches' => $matched_numbers];
        } elseif ($match_count == 5 && $winners['second'] === null) {
            $winners['second'] = ['bet' => $bet, 'matches' => $matched_numbers];
        } elseif ($match_count == 4 && $winners['third'] === null) {
            $winners['third'] = ['bet' => $bet, 'matches' => $matched_numbers];
        }
    }

    // 3. Update all bets
    foreach ($bets as $bet) {
        $user_numbers = json_decode($bet->selected_number, true);
        $matched_numbers = array_values(array_intersect($user_numbers, $result));
        $win_number = json_encode($matched_numbers);
        $status = 2;
        $win_amount = 0;

        if ($winners['first'] && $bet->id == $winners['first']['bet']->id) {
            $status = 1;
            $win_amount = 50;
        } elseif ($winners['second'] && $bet->id == $winners['second']['bet']->id) {
            $status = 1;
            $win_amount = 30;
        } elseif ($winners['third'] && $bet->id == $winners['third']['bet']->id) {
            $status = 1;
            $win_amount = 20;
        }

        // Add win amount if winner
        if ($status == 1) {
            DB::update("UPDATE users SET wallet = wallet + ? WHERE id = ?", [$win_amount, $bet->user_id]);
        }

        // Update bet entry — win_number always saved
        DB::update("UPDATE lottery_bets SET status = ?, win_amount = ?, win_number = ? WHERE id = ?", [
            $status, $win_amount, $win_number, $bet->id
        ]);
    }

    // 4. Increment game number
    DB::update("UPDATE lottery_betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?", [$game_id]);

    return true;
}


private function gameon_lotteryoldddddd($game_id, $period, $result)
{
    // 1. Save result to lottery_bet_result
    DB::insert("INSERT INTO lottery_bet_result (number, games_no, game_id, status, created_at) VALUES (?, ?, ?, 1, NOW())", [
        json_encode($result), $period, $game_id
    ]);

    // 2. Fetch all bets
    $bets = DB::select("SELECT * FROM lottery_bets WHERE game_id = ? AND games_no = ?", [$game_id, $period]);

    $winners = [
        'first' => null,
        'second' => null,
        'third' => null,
    ];

    foreach ($bets as $bet) {
        $user_numbers = json_decode($bet->selected_number, true);
        $matched_numbers = array_values(array_intersect($user_numbers, $result));
        $match_count = count($matched_numbers);

        // Determine placement
        if ($match_count == 6 && $winners['first'] === null) {
            $winners['first'] = ['bet' => $bet, 'matches' => $matched_numbers];
        } elseif ($match_count == 5 && $winners['second'] === null) {
            $winners['second'] = ['bet' => $bet, 'matches' => $matched_numbers];
        } elseif ($match_count == 4 && $winners['third'] === null) {
            $winners['third'] = ['bet' => $bet, 'matches' => $matched_numbers];
        }
    }

    // 3. Assign prizes
    foreach ($bets as $bet) {
        $status = 2;
        $win_amount = 0;
        $win_number = json_encode([]);

        if ($winners['first'] && $bet->id == $winners['first']['bet']->id) {
            $status = 1;
            $win_amount = 50;
            $win_number = json_encode($winners['first']['matches']);
        } elseif ($winners['second'] && $bet->id == $winners['second']['bet']->id) {
            $status = 1;
            $win_amount = 30;
            $win_number = json_encode($winners['second']['matches']);
        } elseif ($winners['third'] && $bet->id == $winners['third']['bet']->id) {
            $status = 1;
            $win_amount = 20;
            $win_number = json_encode($winners['third']['matches']);
        }

        // Update user wallet if win
        if ($status == 1) {
            DB::update("UPDATE users SET wallet = wallet + ? WHERE id = ?", [$win_amount, $bet->user_id]);
        }

        // Update bet record
        DB::update("UPDATE lottery_bets SET status = ?, win_amount = ?, win_number = ? WHERE id = ?", [
            $status, $win_amount, $win_number, $bet->id
        ]);
    }

    // 4. Increment game number
    DB::update("UPDATE lottery_betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?", [$game_id]);

    return true;
}

private function gameon_lotteryolddd($game_id, $period, $result)
{
    // 1. Insert result
    DB::insert("INSERT INTO lottery_bet_result (number, games_no, game_id, status, created_at) VALUES (?, ?, ?, 1, NOW())", [
        json_encode($result), $period, $game_id
    ]);

    // 2. Get all bets
    $bets = DB::select("SELECT * FROM lottery_bets WHERE game_id = ? AND games_no = ?", [$game_id, $period]);

    foreach ($bets as $bet) {
        $user_id = $bet->user_id;
        $user_numbers = json_decode($bet->selected_number, true);
        $bet_amount = $bet->amount;

        $matched = array_intersect($user_numbers, $result);
        $match_count = count($matched);

        // Multiplier logic
        $multiplier = 0;
        if ($match_count == 1) {
            $multiplier = 2;
        } elseif ($match_count == 2) {
            $multiplier = 3;
        } elseif ($match_count == 3) {
            $multiplier = 4;
        } elseif ($match_count == 4) {
            $multiplier = 5;
        } elseif ($match_count == 5) {
            $multiplier = 6;
        } elseif ($match_count == 6) {
            $multiplier = 7;
        }

        if ($multiplier > 0) {
            $win_amount = $bet_amount * $multiplier;

            // ✅ Update user wallet
            DB::update("UPDATE users SET wallet = wallet + ? WHERE id = ?", [$win_amount, $user_id]);

            // ✅ Update original bet status and win info
            DB::update("UPDATE lottery_bets SET status = 1, win_number = ?, win_amount = ? WHERE id = ?", [
                $match_count, $win_amount, $bet->id
            ]);
        } else {
            // ✅ Update as loss
            DB::update("UPDATE lottery_bets SET status = 2, win_number = 0, win_amount = 0 WHERE id = ?", [$bet->id]);
        }
    }

    // 3. Reset bet log
    DB::update("UPDATE lottery_betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?", [$game_id]);

    return true;
}



	private function simulateUserWinnings($game_id, $period, $result)
{
    $bets = DB::select("SELECT * FROM lottery_bets WHERE game_id = ? AND games_no = ?", [$game_id, $period]);
    $total_payout = 0;

    foreach ($bets as $bet) {
        $user_numbers = json_decode($bet->selected_number, true);
        $matched = array_intersect($user_numbers, $result);
        $match_count = count($matched);

        // Same multiplier logic
        $multiplier = 0;
        if ($match_count == 1) {
            $multiplier = 2;
        } elseif ($match_count == 2) {
            $multiplier = 3;
        } elseif ($match_count == 3) {
            $multiplier = 4;
        } elseif ($match_count == 4) {
            $multiplier = 5;
        } elseif ($match_count == 5) {
            $multiplier = 6;
        } elseif ($match_count == 6) {
            $multiplier = 7;
        }

        if ($multiplier > 0) {
            $win_amount = $bet->amount * $multiplier;
            $total_payout += $win_amount;
        }
    }

    return $total_payout;
}


	public function lottery_cronold($game_id)
    {
        // dd($game_id);
                  $per=DB::select("SELECT game_settings.winning_percentage as winning_percentage FROM game_settings WHERE game_settings.id=$game_id");
            $percentage = $per[0]->winning_percentage;  
    
                $gameno=DB::select("SELECT * FROM lottery_betlogs WHERE game_id=$game_id LIMIT 1");
                //
            //  // dd($gameno);
                $game_no=$gameno[0]->games_no;
                // dd($game_no);
                 $period=$game_no;
                
    				
                $sumamt=DB::select("SELECT SUM(amount) AS amount FROM lottery_bets WHERE game_id = '$game_id' && games_no='$game_no'");
    
    // dd($sumamt);
    				
                $totalamount=$sumamt[0]->amount;
    		
                $percentageamount = $totalamount*$percentage*0.01; 
    // 			dd($percentageamount);
                $lessamount=DB::select(" SELECT * FROM lottery_betlogs WHERE game_id = '$game_id'  && games_no='$game_no' && amount <= $percentageamount ORDER BY amount asc LIMIT 1 ");
    				if(count($lessamount)==0){
    				$lessamount=DB::select(" SELECT * FROM lottery_betlogs WHERE game_id = '$game_id'  && games_no='$game_no' && amount >= '$percentageamount' ORDER BY amount asc LIMIT 1 ");
    				}
                $zeroamount=DB::select(" SELECT * FROM lottery_betlogs WHERE game_id =  '$game_id'  && games_no='$game_no' && amount=0 ORDER BY RAND() LIMIT 1 ");
                $admin_winner=DB::select("SELECT * FROM admin_winner_results WHERE gamesno = '$game_no' AND gameId = '$game_id' ORDER BY id DESC LIMIT 1");
    // 		 dd($admin_winner);
                //  dd($admin_winner);
                $min_max=DB::select("SELECT min(number) as mins,max(number) as maxs FROM lottery_betlogs WHERE game_id=$game_id;");
            if(!empty($admin_winner)){
                echo 'a ';
                $number=$admin_winner[0]->number;
            }
          
            if (!empty($admin_winner)) {
                echo 'b ';
                $res=$number;
            } 
             elseif ( $totalamount< 50) {
                 echo 'c ';
                $res= rand($min_max[0]->mins, $min_max[0]->maxs);
            }elseif($totalamount > 50){
                echo 'd ';
                $res=$lessamount[0]->number;
            }
            //$result=$number;
            $result=$res;
    //if ($game_id == 27) {
		if ($game_id == 27 || $game_id == 28 || $game_id == 29) {
    //$this->colour_prediction_and_bingo($game_id, $period, $result);
        $this->gameon_lotteryold($game_id, $period, $result);
    					
    } 
    }
	
	private function gameon_lotteryold($game_id,$period, $result)
{
    $per = DB::select("SELECT winning_percentage FROM game_settings WHERE id = ?", [$game_id]);
    if (empty($per)) {
        return response()->json(['error' => 'Invalid game ID'], 400);
    }
    $percentage = $per[0]->winning_percentage;

    $gameno = DB::select("SELECT games_no FROM lottery_betlogs WHERE game_id = ? LIMIT 1", [$game_id]);
    if (empty($gameno)) {
        return response()->json(['error' => 'No game found in lottery_betlogs'], 400);
    }
    $game_no = $gameno[0]->games_no;
    $period = $game_no;

    $sumamt = DB::select("SELECT SUM(amount) AS amount FROM lottery_bets WHERE game_id = ? AND games_no = ?", [$game_id, $period]);
    $totalamount = $sumamt[0]->amount ?? 0;
    $percentageamount = $totalamount * ($percentage / 100);

    $lessamount = DB::select("SELECT number FROM lottery_betlogs WHERE game_id = ? AND games_no = ? AND amount <= ? ORDER BY amount ASC LIMIT 1", [$game_id, $period, $percentageamount]);
    if (empty($lessamount)) {
        $lessamount = DB::select("SELECT number FROM lottery_betlogs WHERE game_id = ? AND games_no = ? AND amount >= ? ORDER BY amount ASC LIMIT 1", [$game_id, $game_no, $percentageamount]);
    }

    $admin_winner = DB::select("SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1", [$game_no, $game_id]);

    // Generate 10 random unique numbers between 0-9
    $numbers = range(0, 9);
    shuffle($numbers);
    $selected_numbers = array_slice($numbers, 0, 6); // Select only 6 numbers

    if (!empty($admin_winner)) {
        $res = json_decode($admin_winner[0]->number, true);
    } else {
        $res = $selected_numbers; // Store as array
    }

    // Insert result in keno_bet_result table
    DB::insert("INSERT INTO lottery_bet_result (number, games_no, game_id, status) VALUES (?, ?, ?, 1)", [
        json_encode($res), $period, $game_id, 1
    ]);

   // $this->amountdistributioncolors($game_id, $period, $res);

    //DB::update("UPDATE lottery_bet_result SET  games_no = games_no + 1 WHERE game_id = ?", [$game_id]);
		 DB::update("UPDATE lottery_betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?", [$game_id]);

    return true;
}

 
 

}