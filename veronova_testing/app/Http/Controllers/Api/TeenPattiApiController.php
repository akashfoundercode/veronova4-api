<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TeenPattiApiController extends Controller
{

    public function teenPatti_bets(Request $request)
    {
        // dd($request);
        $validator = Validator::make($request->all(), [
            'userid' => 'required|exists:users,id',
            'game_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.1',
            'selected_cards' => 'nullable|array|min:3|max:3',
        ]);
        // dd($validator);
        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
        }
        $userid = $request->userid;
        // dd($userid);
        $amount = $request->amount;
        $game_id = $request->game_id;
        $selectedCards = $request->selected_cards;
    // dd($selectedCards);
        $userWallet = DB::table('users')->where('id', $userid)->value('wallet');
        if ($userWallet < $amount) {
            return response()->json(['status' => 400, 'message' => 'Insufficient balance']);
        }
    // dd($userWallet);
        $betAmount = $amount;
    
        $gamesno = DB::table('betlogs')->where('game_id', $game_id)->value('games_no');
        // dd($gamesno);
        if (!$gamesno) {
            return response()->json(['status' => 400, 'message' => 'Game not found']);
        }
    
        // Fetch random cards from the deck
        $cardsData = DB::table('cards')->inRandomOrder()->limit(6)->get(['card', 'colour']);
        if (count($cardsData) < 6) {
            return response()->json(['status' => 400, 'message' => 'Not enough cards available']);
        }
    
        $cards = $cardsData->pluck('card')->toArray();
        $bankerCards = array_map('strval', array_slice($cards, 0, 3)); // Ensure banker cards are strings
    
        if ($selectedCards && count($selectedCards) === 3) {
            $playerCards = array_map('strval', $selectedCards); 
        } else {
            $playerCards = array_map('strval', array_slice($cards, 3, 3));
        }
    
        $orderNumber = now()->format('YmdHis') . rand(10000, 99999);
    
        DB::beginTransaction();
    
        try {
            DB::table('teen_patti_bet')->insert([
                'amount' => $amount,
                'trade_amount' => $betAmount,
                'games_no' => $gamesno,
                'game_id' => $game_id,
                'userid' => $userid,
                'banker_cards' => json_encode($bankerCards),
                'player_cards' => json_encode($playerCards),
                'order_id' => $orderNumber,
                'created_at' => now(),
                'status' => 0
            ]);
    
            DB::table('users')->where('id', $userid)->decrement('wallet', $amount);
            DB::table('users')->where('id', $userid)->increment('today_turnover', $amount);
    
            DB::commit();
    
            return response()->json([
                'status' => 200,
                'message' => 'Bet placed successfully',
                'banker_cards' => $bankerCards,
                'player_cards' => $playerCards,
            ]);
    
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 500, 'message' => 'An error occurred: ' . $e->getMessage()]);
        }
    }
    public function teen_patti_cron($game_id)
    {
    $per = DB::select("SELECT winning_percentage FROM game_settings WHERE id = ?", [$game_id]);
    if (empty($per)) {
        return response()->json(['error' => 'Invalid game ID'], 400);
    }
    $percentage = $per[0]->winning_percentage;

    $gameno = DB::select("SELECT games_no FROM betlogs WHERE game_id = ? LIMIT 1", [$game_id]);
    if (empty($gameno)) {
        return response()->json(['error' => 'No game found in betlogs'], 400);
    }
    $game_no = $gameno[0]->games_no;
    $period = $game_no;

    $sumamt = DB::select("SELECT SUM(amount) AS amount FROM teen_patti_bet WHERE game_id = ? AND games_no = ?", [$game_id, $period]);
    $totalamount = $sumamt[0]->amount ?? 0;

    $percentageamount = $totalamount * $percentage * 0.01;

    $lessamount = DB::select("SELECT * FROM betlogs WHERE game_id = ? AND games_no = ? AND amount <= ? ORDER BY amount ASC LIMIT 1", [$game_id, $period, $percentageamount]);
    if (empty($lessamount)) {
        $lessamount = DB::select("SELECT * FROM betlogs WHERE game_id = ? AND games_no = ? AND amount >= ? ORDER BY amount ASC LIMIT 1", [$game_id, $game_no, $percentageamount]);
    }

    $results = DB::table('teen_patti_bet')->where('game_id', $game_id)->where('status', 0)->get();

    $winner_cards = [
        'banker_cards' => json_encode([]),
        'player_cards' => json_encode([])
    ];

    foreach ($results as $result) {
        $bankerCards = json_decode($result->banker_cards, true);
        $playerCards = json_decode($result->player_cards, true);

        $winner = $this->determineWinner($bankerCards, $playerCards);
        $win_amount = ($winner === 'player') ? $result->amount * 2 : 0;

        if ($winner === 'player') {
            $winner_cards['player_cards'] = json_encode($playerCards);
            $winner_cards['banker_cards'] = json_encode([]); // Empty banker cards
        } elseif ($winner === 'banker') {
            $winner_cards['banker_cards'] = json_encode($bankerCards);
            $winner_cards['player_cards'] = json_encode([]); // Empty player cards
        }

        DB::table('teen_patti_bet')->where('id', $result->id)->update([
            'status' => 1,
            'win_amount' => $win_amount,
            'winner' => $winner
        ]);

        if ($win_amount > 0) {
            DB::table('users')->where('id', $result->userid)->increment('winning_wallet', $win_amount);
        }
    }

    $zeroamount = DB::select("SELECT * FROM betlogs WHERE game_id = ? AND games_no = ? AND amount = 0 ORDER BY RAND() LIMIT 1", [$game_id, $game_no]);

    $admin_winner = DB::select("SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1", [$game_no, $game_id]);

    $min_max = DB::select("SELECT MIN(number) AS mins, MAX(number) AS maxs FROM betlogs WHERE game_id = ?", [$game_id]);

    if (!empty($admin_winner) && isset($admin_winner[0]->number)) {
        $res = $admin_winner[0]->number;
    } elseif ($totalamount < 450) {
        $res = rand($min_max[0]->mins, $min_max[0]->maxs);
    } elseif ($totalamount > 450 && !empty($lessamount) && isset($lessamount[0]->number)) {
        $res = $lessamount[0]->number;
    } else {
        return response()->json(['error' => 'No valid winner could be determined'], 500);
    }

    $cards = DB::select("SELECT id FROM cards ORDER BY RAND() LIMIT 1");
    if (empty($cards)) {
        return response()->json(['error' => 'No cards available'], 500);
    }
    $card = $cards[0]->id;

    DB::insert("INSERT INTO teen_patti_bet_result (number, games_no, game_id, status, json, random_card, banker_cards, player_cards) VALUES (?, ?, ?, 1, ?, ?, ?, ?)", [
        $res,
        $period,
        $game_id,
        $card,
        $card,
        $winner_cards['banker_cards'], 
        $winner_cards['player_cards']
    ]);

    $this->amountDistribution($game_id, $period, $res, $card);

    DB::update("UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?", [$game_id]);

    return true;
    }
    private function determineWinner($bankerCards, $playerCards)
    {
        $bankerRank = $this->getHandRank($bankerCards);
        $playerRank = $this->getHandRank($playerCards);

        $favorBanker = rand(1, 100) <= 70; 

        if ($bankerRank > $playerRank || ($bankerRank === $playerRank && $favorBanker)) {
            return 'banker';
        } elseif ($bankerRank < $playerRank) {
            return 'player';
        } else {
            return 'tie';
        }
    }
    private function getHandRank($cards)
    {
        $ranks = array_map(fn($card) => ($card - 1) % 13 + 1, $cards);
        sort($ranks);

        if (count(array_unique($ranks)) === 1) return 6; 
        if ($ranks[1] == $ranks[0] + 1 && $ranks[2] == $ranks[1] + 1) return 5; 
        if (count(array_unique($ranks)) === 2) return 4;
        return 1; 
    }
    private function amountDistribution($game_id,$period,$result,$card)
    {
        $virtual=DB::select("SELECT name, number, actual_number, game_id, multiplier FROM virtual_games WHERE actual_number='$result' && game_id= '$game_id' AND ((type != 1 AND multiplier != '1.5') OR (type = 1 AND multiplier = '1.5'));");

        foreach ($virtual as $winamount) {
            
            $multiple = $winamount->multiplier;

            $number=$winamount->number;
            
            if(!empty($number)){
				
				if($result == '0'){
					DB::select("UPDATE teen_patti_bet SET win_amount =(trade_amount*9),win_number= '0',status=1,result_card='$card' WHERE games_no='$period' && game_id=  '$game_id' && number =$result");
				}
            
          DB::select("UPDATE teen_patti_bet SET win_amount =(trade_amount*$multiple),win_number= '$result',status=1,result_card='$card' WHERE games_no='$period' && game_id=  '$game_id' && number =$number");
        
            }
            
		}
                $uid = DB::select("SELECT  win_amount,  userid FROM teen_patti_bet where win_number>=0 && games_no='$period' && game_id=  '$game_id' ");
        foreach ($uid as $row) {
             $amount = $row->win_amount;
            $userid = $row->userid;
      DB::update("UPDATE users SET wallet = wallet + $amount, winning_wallet = winning_wallet + $amount WHERE id = $userid");
        
        }
 
          DB::select("UPDATE teen_patti_bet SET status=2 ,win_number= '$result',result_card='$card' WHERE games_no='$period' && game_id=  '$game_id' &&  status=0 && win_amount=0");

    }
    public function teenPattibet_history(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userid' => 'required',
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
    
        $where = [
            'teen_patti_bet.game_id' => $game_id,
            'teen_patti_bet.userid' => $userid,
        ];
    
        $query = "SELECT DISTINCT teen_patti_bet.*, 
                     game_settings.name AS game_name, 
                     virtual_games.name AS name, 
                     teen_patti_bet.winner,
                     -- Conditionally extract the winner's card based on the winner column
                     CASE 
                        WHEN teen_patti_bet.winner = 'banker' THEN JSON_UNQUOTE(teen_patti_bet.banker_cards)
                         WHEN teen_patti_bet.winner = 'player' THEN teen_patti_bet.player_cards
                         ELSE NULL 
                     END AS winner_card
              FROM teen_patti_bet
              LEFT JOIN game_settings ON game_settings.id = teen_patti_bet.game_id 
              LEFT JOIN virtual_games ON virtual_games.game_id = teen_patti_bet.game_id 
                                     AND virtual_games.number = teen_patti_bet.number";
    
        $conditions = [];
        foreach ($where as $key => $value) {
            $conditions[] = "$key = '$value'";
        }
    
        if (!empty($from_date)) {
            $conditions[] = "teen_patti_bet.created_at >= '$from_date'";
            $conditions[] = "teen_patti_bet.created_at <= '$to_date'";
        }
    
        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }
    
        $query .= " ORDER BY teen_patti_bet.id DESC LIMIT $offset, $limit";
    
        $results = DB::select($query);
    
        $bets = DB::select("SELECT userid, COUNT(*) AS total_bets FROM teen_patti_bet WHERE userid = ? GROUP BY userid", [$userid]);
        $total_bet = $bets[0]->total_bets ?? 0;
    
        if (!empty($results)) {
            return response()->json([
                'status' => 200,
                'message' => 'Data found',
                'total_bets' => $total_bet,
                'data' => $results
            ]);
        } else {
            return response()->json([
                'status' => 400,
                'message' => 'No Data found',
                'data' => []
            ]);
        }
    }
    public function teen_patti_win_amt(Request $request)
    {
    $validator = Validator::make($request->all(), [ 
        'userid' => 'required|exists:users,id',
        'game_id' => 'required|integer',
        'games_no' => 'required|integer'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $game_id = $request->game_id;
    $userid = $request->userid;
    $game_no = $request->games_no;

    $win_amount = DB::table('teen_patti_bet')
        ->selectRaw("
            SUM(win_amount) AS total_amount,
            games_no,
            game_id AS gameid,
            winner,
            CASE 
                WHEN winner = 'banker' THEN banker_cards
                WHEN winner = 'player' THEN player_cards
                ELSE NULL 
            END AS winner_cards,
            CASE 
                WHEN winner = 'banker' OR winner = 'tie' THEN 'lose' 
                WHEN winner = 'player' THEN 'win' 
                ELSE 'lose' 
            END AS result,
            CASE 
                WHEN winner = 'banker' OR winner = 'tie' THEN 2 
                WHEN winner = 'player' THEN 1 
                ELSE 2 
            END AS win_loss_status
        ")
        ->where('games_no', $game_no)
        ->where('game_id', $game_id)
        ->where('userid', $userid)
        ->groupBy('games_no', 'game_id', 'winner', 'banker_cards', 'player_cards')
        ->first();

        if ($win_amount) {
            return response()->json([
                'message' => 'Successfully retrieved data',
                'status' => 200,
                'win' => $win_amount->total_amount,
                'games_no' => $win_amount->games_no,
                'result' => $win_amount->result,
                'gameid' => $win_amount->gameid,
                'win_loss_status' => $win_amount->win_loss_status,
                'winner_cards' => $win_amount->winner_cards ?? null,
				'winner' => $win_amount->winner
            ], 200);
        } else {
            return response()->json([
                'msg' => 'No record found',
                'status' => 400
            ], 400);
        }
    }
	
	public function teenPatti_results_old(Request $request)
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

    $where = [];
    if (!empty($game_id)) {
        $where[] = "tpr.game_id = '$game_id'";
    }
    if (!empty($from_date) && !empty($to_date)) {
        $where[] = "tpr.created_at BETWEEN '$from_date' AND '$to_date'";
    }

    $query = "
        SELECT 
            tpr.*, 
            vg.name AS game_name,
            vg.number AS game_number, 
            vg.game_id AS game_gameid,
            gs.name AS game_setting_name,

            -- Added from joined teen_patti_bet
            CASE 
                WHEN tpb.winner = 'banker' THEN tpb.banker_cards
                WHEN tpb.winner = 'player' THEN tpb.player_cards
                ELSE NULL
            END AS winner_cards,

            CASE 
                WHEN tpb.winner = 'banker' OR tpb.winner = 'tie' THEN 'lose'
                WHEN tpb.winner = 'player' THEN 'win'
                ELSE 'lose'
            END AS result,

            CASE 
                WHEN tpb.winner = 'banker' OR tpb.winner = 'tie' THEN 2
                WHEN tpb.winner = 'player' THEN 1
                ELSE 2
            END AS win_loss_status,

            tpb.winner

        FROM teen_patti_bet_result AS tpr
        LEFT JOIN virtual_games AS vg ON tpr.game_id = vg.game_id AND tpr.number = vg.number
        JOIN game_settings AS gs ON tpr.game_id = gs.id

        LEFT JOIN teen_patti_bet AS tpb ON tpr.game_id = tpb.game_id AND tpr.number = tpb.games_no

    ";

    if (!empty($where)) {
        $query .= " WHERE " . implode(" AND ", $where);
    }

    $query .= " ORDER BY tpr.id DESC LIMIT $offset, $limit";

    $results = DB::select($query);

    return response()->json([
        'status' => 200,
        'message' => 'Data found',
        'data' => $results
    ]);
}

	
    public function teenPatti_results(Request $request)
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
    if (!empty($game_id)) {
        $where[] = "teen_patti_bet_result.game_id = '$game_id'";
    }
    if (!empty($from_date) && !empty($to_date)) {
        $where[] = "teen_patti_bet_result.created_at BETWEEN '$from_date' AND '$to_date'";
        }
        $query = "SELECT teen_patti_bet_result.*, virtual_games.name AS game_name,virtual_games.number AS game_number, virtual_games.game_id AS game_gameid,game_settings.name AS game_setting_name FROM teen_patti_bet_result
        LEFT JOIN virtual_games ON teen_patti_bet_result.game_id = virtual_games.game_id && teen_patti_bet_result.number=virtual_games.number JOIN game_settings ON teen_patti_bet_result.game_id = game_settings.id ";
        if (!empty($where)) {
            $query .= " WHERE " . implode(" AND ", $where);
        }
        $query .= " ORDER BY teen_patti_bet_result.id DESC LIMIT $offset,$limit";
        $results = DB::select($query);
        return response()->json([
            'status' => 200,
            'message' => 'Data found',
            'data' => $results
        ]);
    }
    private function getHandName($rank)
    {
        $handNames = [
            6 => 'Three of a Kind',
            5 => 'Pure Sequence',
            4 => 'Sequence',
            3 => 'Color',
            2 => 'Pair',
            1 => 'High Card'
        ];
    
        return $handNames[$rank] ?? 'Unknown';
    }

}
