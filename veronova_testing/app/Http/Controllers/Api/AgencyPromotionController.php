<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Validator;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use DateTime;

use Illuminate\Support\Facades\Http;


 
class AgencyPromotionController extends Controller
{
	public function promotion_data($id) {
    try {
        $users = User::findOrFail($id);
        $user_id = $users->id;

        $currentDate = Carbon::now()->subDay()->format('Y-m-d');

        // Direct downline users (account_type = 0)
        $directSubordinateCount = User::where('referral_user_id', $user_id)
            ->where('account_type', 0)
            ->count();

        $totalCommission = User::where('id', $user_id)->value('commission');
        $referral_code = User::where('id', $user_id)->value('referral_code');
        $yesterday_total_commission = User::where('id', $user_id)->value('yesterday_total_commission');

        // Total team (all levels)
        $teamSubordinateCount = \DB::select("
            WITH RECURSIVE subordinates AS (
                SELECT id
                FROM users
                WHERE referral_user_id = ?

                UNION ALL

                SELECT u.id
                FROM users u
                INNER JOIN subordinates s ON s.id = u.referral_user_id
            )
            SELECT COUNT(*) as count
            FROM subordinates
        ", [$user_id]);

        // Direct downline register yesterday
        $register = \DB::select("
            SELECT COUNT(id) AS register
            FROM users
            WHERE referral_user_id = ?
              AND created_at LIKE ?
        ", [$user_id, $currentDate . '%']);
//dd($user_id,$currentDate);
		$deposit_number = \DB::select("
    SELECT COUNT(p.id) AS deposit_number, 
           SUM(p.cash) AS deposit_amount 
    FROM payins p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 2
      AND u.referral_user_id = ?
      AND DATE(p.created_at) = DATE(NOW() - INTERVAL 1 DAY)
", [$user_id]);
//dd($deposit_number);
        // Direct downline deposit
       // $deposit_number = \DB::select("
       //     SELECT COUNT(p.id) AS deposit_number, 
       //            SUM(p.cash) AS deposit_amount 
       //     FROM payins p
       //     JOIN users u ON p.user_id = u.id
        //    WHERE p.status = 2
         //     AND u.referral_user_id = ?
       //       AND u.created_at LIKE ?
      //  ", [$user_id, $currentDate . '%']);

        // Direct downline first deposit
        $first_deposit = \DB::select("
            SELECT COUNT(p.id) AS first_deposit
            FROM payins p
            JOIN users u ON p.user_id = u.id
            WHERE u.referral_user_id = ?
              AND u.created_at LIKE ?
              AND u.salary_first_recharge = '0'
        ", [$user_id, $currentDate . '%']);

        // ALL subordinates register (unlimited levels)
        $subordinates_register = \DB::select("
            WITH RECURSIVE subordinates AS (
                SELECT id
                FROM users
                WHERE referral_user_id = ?

                UNION ALL

                SELECT u.id
                FROM users u
                INNER JOIN subordinates s ON s.id = u.referral_user_id
            )
            SELECT COUNT(*) as register 
            FROM users 
            WHERE id IN (SELECT id FROM subordinates)
              AND created_at LIKE ?
        ", [$user_id, $currentDate . '%']);

        // ALL subordinates deposit (unlimited levels)
        $subordinates_deposit = \DB::select("
            WITH RECURSIVE subordinates AS (
                SELECT id
                FROM users
                WHERE referral_user_id = ?

                UNION ALL

                SELECT u.id
                FROM users u
                INNER JOIN subordinates s ON s.id = u.referral_user_id
            )
            SELECT COUNT(p.id) AS deposit_number, 
                   SUM(p.cash) AS deposit_amount 
            FROM payins p
            WHERE p.user_id IN (SELECT id FROM subordinates)
              AND p.status = 2
              AND p.created_at LIKE ?
        ", [$user_id, $currentDate . '%']);

        // ALL subordinates first deposit (unlimited levels)
        $subordinates_first_deposit = \DB::select("
            WITH RECURSIVE subordinates AS (
                SELECT id
                FROM users
                WHERE referral_user_id = ?

                UNION ALL

                SELECT u.id
                FROM users u
                INNER JOIN subordinates s ON s.id = u.referral_user_id
            )
            SELECT COUNT(p.id) AS first_deposit
            FROM payins p
            JOIN users u ON p.user_id = u.id
            WHERE u.id IN (SELECT id FROM subordinates)
              AND p.created_at LIKE ?
              AND u.salary_first_recharge = '0'
        ", [$user_id, $currentDate . '%']);

        // Final result
        $result = [
            'yesterday_total_commission' => $yesterday_total_commission ?? 0,

            // Direct referrals
            'register' => $register[0]->register ?? 0,
            'deposit_number' => $deposit_number[0]->deposit_number ?? 0,
            'deposit_amount' => $deposit_number[0]->deposit_amount ?? 0,
            'first_deposit' => $first_deposit[0]->first_deposit ?? 0,

            // All downlines (recursive)
            'subordinates_register' => $subordinates_register[0]->register ?? 0,
            'subordinates_deposit_number' => $subordinates_deposit[0]->deposit_number ?? 0,
            'subordinates_deposit_amount' => $subordinates_deposit[0]->deposit_amount ?? 0,
            'subordinates_first_deposit' => $subordinates_first_deposit[0]->first_deposit ?? 0,

            'direct_subordinate' => $directSubordinateCount ?? 0,
            'total_commission' => $totalCommission ?? 0,
            'team_subordinate' => $teamSubordinateCount[0]->count ?? 0,

            'referral_code' => $referral_code
        ];

        return response()->json($result, 200);

    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

	
	
	public function promotion_data_old($id) {
    try {
       
        $users = User::findOrFail($id);
        $user_id = $users->id;
		
		$currentDate = Carbon::now()->subDay()->format('Y-m-d');
        //dd($currentDate);
       
        // $directSubordinateCount = User::where('referral_user_id', $user_id)->count();
        $directSubordinateCount = User::where('referral_user_id', $user_id)
    ->where('account_type', 0)
    ->count();

        //dd($directSubordinateCount);

       
        $totalCommission = User::where('id', $user_id)->value('commission');
		
		$referral_code = User::where('id', $user_id)->value('referral_code');
		
		$yesterday_total_commission = User::where('id', $user_id)->value('yesterday_total_commission');
		
		
		 $teamSubordinateCount = \DB::select("
            WITH RECURSIVE subordinates AS (
                SELECT id, referral_user_id, 1 AS level
                FROM users
                WHERE referral_user_id = ?

                UNION ALL

                SELECT u.id, u.referral_user_id, s.level + 1
                FROM users u
                INNER JOIN subordinates s ON s.id = u.referral_user_id
                WHERE s.level < 15
            )
            SELECT COUNT(*) as count
            FROM subordinates
        ", [$user_id]);
		//dd($teamSubordinateCount);
		
		$register = \DB::select("
    SELECT count(`id`) as register
    FROM `users`
    WHERE `referral_user_id` = ? 
    AND `created_at` LIKE '$currentDate %'
", [$user_id]);
		//dd($register);
		//$deposit_number = \DB::select("SELECT count(`p`.`id`) as deposit_number, 
       	//	sum(`p`.`cash`) as deposit_amount 
		//	FROM `payins` p
			//JOIN `users` u ON p.`user_id` = u.`id`
			//WHERE u.`referral_user_id` = ?
  			//AND u.`created_at` like '$currentDate %'", [$user_id]);
		//dd($deposit_number);
		//dd($user_id,$currentDate);
		$deposit_number = \DB::select("
    SELECT 
        COUNT(p.`id`) AS deposit_number, 
        SUM(p.`cash`) AS deposit_amount 
    FROM `payins` p
    JOIN `users` u 
        ON p.`user_id` = u.`id`
    WHERE 
        p.`status` = 2
        AND u.`referral_user_id` = ?
        AND u.`created_at` LIKE ?
", [$user_id, $currentDate . '%']);

	  $first_deposit = \DB::select("
    SELECT count(`p`.`id`) as first_deposit
    FROM `payins` p
    JOIN `users` u ON p.`user_id` = u.`id`
    WHERE u.`referral_user_id` = $user_id
    AND u.`created_at` LIKE '$currentDate %' 
    AND u.`salary_first_recharge` = '0'
");
		//dd($first_deposit);


	$subordinates_register = \DB::select("
    WITH RECURSIVE subordinates AS (
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?

        UNION ALL

        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level < 15
    )
    SELECT count(*) as register 
    FROM users 
    WHERE referral_user_id = ? 
    AND created_at LIKE '$currentDate %'
", [$user_id, $user_id]);
		
			//$subordinates_deposit = \DB::select("
    //WITH RECURSIVE subordinates AS (
    //    SELECT id, referral_user_id, 1 AS level
    //    FROM users
    //    WHERE referral_user_id = ?
    //    UNION ALL
    //    SELECT u.id, u.referral_user_id, s.level + 1
     //   FROM users u
    //    INNER JOIN subordinates s ON s.id = u.referral_user_id
   //     WHERE s.level < 15
  //  )
  //  SELECT count(p.id) as deposit_number, 
//sum(p.cash) as deposit_amount 
  //  FROM payins p
  //  JOIN users s ON p.user_id = s.id
  //  WHERE s.referral_user_id = ? 
  //  AND s.created_at LIKE '$currentDate %'
//", [$user_id, $user_id]);
		
		$subordinates_deposit = \DB::select("
    WITH RECURSIVE subordinates AS (
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?
        UNION ALL
        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level < 15
    )
    SELECT COUNT(p.id) AS deposit_number, 
           SUM(p.cash) AS deposit_amount 
    FROM payins p
    JOIN users s ON p.user_id = s.id
    WHERE s.referral_user_id = ?
      AND s.created_at LIKE '$currentDate %'
      AND p.status = 2
", [$user_id, $user_id]);

		
    $subordinates_first_deposit = \DB::select("
	
	 WITH RECURSIVE subordinates AS (
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?
        UNION ALL
        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level < 15
    )
	
    SELECT count(`p`.`id`) as first_deposit
    FROM `payins` p
    JOIN `users` u ON p.`user_id` = u.`id`
    WHERE u.`referral_user_id` = ?
    AND u.`created_at` LIKE '$currentDate %' 
    AND u.`salary_first_recharge` = '0'
    ", [$user_id, $user_id]);



      
        $result = [
			'yesterday_total_commission' => $yesterday_total_commission ?? 0,
			'register' => $register[0]->register ?? 0,
			'deposit_number' => $deposit_number[0]->deposit_number ?? 0,
			'deposit_amount' => $deposit_number[0]->deposit_amount ?? 0,
			'first_deposit' => $first_deposit[0]->first_deposit ?? 0,
			
			'subordinates_register' => $subordinates_register[0]->register ?? 0,
			'subordinates_deposit_number' => $subordinates_deposit[0]->deposit_number ?? 0,
			'subordinates_deposit_amount' => $subordinates_deposit[0]->deposit_amount ?? 0,
			'subordinates_first_deposit' => $subordinates_first_deposit[0]->first_deposit ?? 0,
			
            'direct_subordinate' => $directSubordinateCount ?? 0,
            'total_commission' => $totalCommission ?? 0,
            'team_subordinate' => $teamSubordinateCount[0]->count ?? 0,
			
			'referral_code' => $referral_code
        ];

	
                return response()->json($result,200);
		
     
    } catch (\Exception $e) {
       
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

	public function new_subordinate(Request $request){
	try {
		
		 $validator = Validator::make($request->all(), [
            'id' => 'required',
			'type' => 'required',
        ]);

        $validator->stopOnFirstFailure();
	
        if($validator->fails()){
         $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 
		
		return response()->json($response,400);
		
    }
       
        $users = User::findOrFail($request->id);
        $user_id = $users->id;
		
		$currentDate = Carbon::now()->format('Y-m-d');
		$yesterdayDate  = Carbon::yesterday()->format('Y-m-d');
		$startOfMonth = Carbon::now()->startOfMonth()->format('Y-m-d');
        $endOfMonth = Carbon::now()->endOfMonth()->format('Y-m-d');
		
		if($request->type == 1){
		$subordinate_data = DB::table('users')->select('mobile', 'u_id', 'created_at')
    ->where('referral_user_id', $user_id)
    ->where('created_at', 'like', $currentDate . '%')
    ->get();
			
			if($subordinate_data->isNotEmpty()){
					 $response = ['status' => 200,'message' => 'Successfully..!', 'data' => $subordinate_data]; 
		
		               return response()->json($response,200);
			}else{
				 $response = ['status' => 400, 'message' => 'data not fount' ]; 
		
		        return response()->json($response,400);
			}
			
		}elseif($request->type == 2){
			
				$subordinate_data = DB::table('users')->select('mobile', 'u_id', 'created_at')
    ->where('referral_user_id', $user_id)
    ->where('created_at', 'like', $yesterdayDate . '%')
    ->get();
			
			if($subordinate_data->isNotEmpty()){
					 $response = ['status' => 200,'message' => 'Successfully..!', 'data' => $subordinate_data]; 
		
		               return response()->json($response,200);
			}else{
				 $response = ['status' => 400, 'message' => 'data not fount' ]; 
		
		        return response()->json($response,400);
			}
			
		}elseif($request->type == 3){
				$subordinate_data = DB::table('users')->select('mobile', 'u_id', 'created_at')
    ->where('referral_user_id', $user_id)
    ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
    ->get();
			
			if($subordinate_data->isNotEmpty()){
					 $response = ['status' => 200,'message' => 'Successfully..!', 'data' => $subordinate_data]; 
		
		               return response()->json($response,200);
			}else{
				 $response = ['status' => 400, 'message' => 'data not fount' ]; 
		
		        return response()->json($response,400);
			}
		}
		
		
		 } catch (\Exception $e) {
       
        return response()->json(['error' => $e->getMessage()], 500);
    }
 }

	public function tier(){
		try {
			
		//$tier =	DB::table('mlm_levels')->select('name')->get();
			$tier = DB::table('mlm_levels')->select('*')->get();
			
			if($tier->isNotEmpty()){
					 $response = ['status' => 200,'message' => 'Successfully..!', 'data' => $tier]; 
		
		               return response()->json($response,200);
			}else{
				 $response = ['status' => 400, 'message' => 'data not fount' ]; 
		
		        return response()->json($response,400);
			}
			
			} catch (\Exception $e) {
       
        	 return response()->json(['error' => $e->getMessage()], 500);
      }
		
		
	}
	
	public function subordinate_data(Request $request) 
{
    try {
        // Step 1: Validate query parameters
        $validator = Validator::make($request->query(), [
            'id' => 'required|integer',
            'tier' => 'nullable|integer|min:0',
            'created_at' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
        }

        // Step 2: Extract and default parameters
        $userId = $request->query('id');
        $searchUid = $request->query('u_id');
        $tier = is_null($request->query('tier')) ? 0 : (int) $request->query('tier');
        $currentDate = $request->query('created_at') ?: Carbon::now()->subDay()->format('Y-m-d');

        // Step 3: Build subordinate list with safety limit
        $subordinates = collect();
        $currentLevelUsers = User::where('referral_user_id', $userId)->get();
        $currentLevel = 1;
        $maxDepth = 10;

        while ($currentLevelUsers->isNotEmpty() && ($tier == 0 ? $currentLevel <= $maxDepth : $currentLevel <= $tier)) {
            // Add level information to each user
            foreach ($currentLevelUsers as $user) {
                $user->level = $currentLevel;
            }
            $subordinates = $subordinates->merge($currentLevelUsers);
            $currentLevelUsers = User::whereIn('referral_user_id', $currentLevelUsers->pluck('id'))->get();
            $currentLevel++;
        }

        $subordinateIds = $subordinates->pluck('id');

        // Step 4: Filter by UID if provided
        if (!empty($searchUid)) {
            $subordinateIds = User::whereIn('id', $subordinateIds)
                                  ->where('u_id', 'like', $searchUid . '%')
                                  ->pluck('id');
            $subordinates = $subordinates->whereIn('id', $subordinateIds);
        }

        // Step 5: Handle empty subordinate case
        if ($subordinateIds->isEmpty()) {
            return response()->json([
                'status' => 200,
                'message' => 'No subordinates found',
                'data' => [
                    'number_of_deposit' => 0,
                    'payin_amount' => 0,
                    'number_of_bettor' => 0,
                    'bet_amount' => 0,
                    'first_deposit' => 0,
                    'first_deposit_amount' => 0,
                    'subordinates_data' => [],
                ]
            ]);
        }

        // Step 6: Get commission percentages by level
        $mlmLevels = DB::table('mlm_levels')->get()->keyBy('level');
        $useDBCommission = $mlmLevels->isNotEmpty();

        // Step 7: Get aggregated data
        $subordinatesData = DB::table('users')
            ->leftJoin(DB::raw("(
                SELECT userid, SUM(amount) as total_bet 
                FROM bets 
                WHERE DATE(created_at) = '{$currentDate}' 
                GROUP BY userid
            ) as bet_data"), 'users.id', '=', 'bet_data.userid')
            ->leftJoin(DB::raw("(
                SELECT user_id, SUM(cash) as total_payin, COUNT(id) as deposit_count 
                FROM payins 
                WHERE DATE(created_at) = '{$currentDate}' 
                AND status = 2 
                GROUP BY user_id
            ) as payin_data"), 'users.id', '=', 'payin_data.user_id')
            ->leftJoin(DB::raw("(
                SELECT p1.user_id, COUNT(p1.id) as total_first_recharge, SUM(p1.cash) as total_first_deposit_amount 
                FROM payins p1 
                WHERE p1.status = 2 
                AND p1.created_at = (
                    SELECT MIN(p2.created_at) 
                    FROM payins p2 
                    WHERE p2.user_id = p1.user_id 
                    AND p2.status = 2
                )
                GROUP BY p1.user_id
            ) as first_deposit_data"), 'users.id', '=', 'first_deposit_data.user_id')
            ->whereIn('users.id', $subordinateIds)
            ->select([
                'users.id',
                'users.u_id',
                DB::raw('COALESCE(bet_data.total_bet, 0) as bet_amount'),
                DB::raw('COALESCE(payin_data.total_payin, 0) as payin_amount'),
                DB::raw('COALESCE(payin_data.deposit_count, 0) as number_of_deposit'),
                DB::raw('COALESCE(first_deposit_data.total_first_recharge, 0) as total_first_recharge'),
                DB::raw('COALESCE(first_deposit_data.total_first_deposit_amount, 0) as total_first_deposit_amount')
            ])
            ->get();

        // Attach level to each user data
        foreach ($subordinatesData as $userData) {
            $user = $subordinates->firstWhere('id', $userData->id);
            $userData->level = $user ? $user->level : 1;
        }

        // Step 8: Aggregate result
        $result = [
            'number_of_deposit' => 0,
            'payin_amount' => 0,
            'number_of_bettor' => 0,
            'bet_amount' => 0,
            'first_deposit' => 0,
            'first_deposit_amount' => 0,
            'subordinates_data' => [],
        ];

        foreach ($subordinatesData as $user) {
            $betAmount = (float) $user->bet_amount;
            $payinAmount = (float) $user->payin_amount;
            $depositCount = (int) $user->number_of_deposit;
            
            // Calculate commission based on BET AMOUNT and user level
            $commissionPercent = 0;
            if ($useDBCommission && isset($mlmLevels[$user->level])) {
                $commissionPercent = (float) $mlmLevels[$user->level]->commission;
            } else {
                // Fallback commission percentages
                if ($user->level == 1) $commissionPercent = 5;
                elseif ($user->level == 2) $commissionPercent = 3;
                elseif ($user->level == 3) $commissionPercent = 2;
                else $commissionPercent = 1;
            }
            
            $commission = ($betAmount * $commissionPercent) / 100;
            $firstDeposit = (int) $user->total_first_recharge;
            $firstDepositAmount = (float) $user->total_first_deposit_amount;

            $result['bet_amount'] += $betAmount;
            $result['payin_amount'] += $payinAmount;
            $result['number_of_deposit'] += $depositCount;
            $result['first_deposit'] += $firstDeposit;
            $result['first_deposit_amount'] += $firstDepositAmount;

            if ($betAmount > 0) {
                $result['number_of_bettor']++;
            }

            // Response with all fields including level
            $result['subordinates_data'][] = [
                'id' => $user->id,
                'u_id' => $user->u_id,
                'level' => $user->level,
                'bet_amount' => $betAmount,
                'payin_amount' => $payinAmount,
                'number_of_deposit' => $depositCount,
                'commission' => round($commission, 2),
                'first_deposit' => $firstDeposit,
                'first_deposit_amount' => $firstDepositAmount,
            ];
        }

        // Step 9: Return final response
        return response()->json([
            'status' => 200, 
            'message' => 'Data fetched successfully', 
            'data' => $result
        ], 200);

    } catch (\Exception $e) {
        \Log::error('Subordinate data error: ' . $e->getMessage());
        return response()->json([
            'status' => 500, 
            'error' => $e->getMessage()
        ], 500);
    }
}
	
	
	public function subordinate_data_06_05_2026(Request $request) 
{
    try {
        // Step 1: Validate input
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'tier' => 'nullable|integer|min:0',
            'created_at' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
        }

        // Step 2: Initialize input values
        $userId = $request->id;
        $tier = $request->tier ?? 0;
        $searchUid = $request->u_id;
        $currentDate = $request->created_at ? Carbon::parse($request->created_at) : Carbon::now();
        $filterDate = $currentDate->format('Y-m-d');

        // Step 3: Build subordinate map with levels
        $subordinateMap = collect();
        $currentLevelUsers = User::where('referral_user_id', $userId)
            ->where('account_type', 0)
            ->get()
            ->map(function ($user) {
                $user->level = 1;
                return $user;
            });

        $currentLevel = 1;

        while ($currentLevelUsers->isNotEmpty() && ($tier == 0 || $currentLevel <= $tier)) {
            foreach ($currentLevelUsers as $user) {
                $subordinateMap->push(['id' => $user->id, 'level' => $user->level]);
            }

            $nextLevelUsers = User::whereIn('referral_user_id', $currentLevelUsers->pluck('id'))
                ->where('account_type', 0)
                ->get()
                ->map(function ($user) use ($currentLevel) {
                    $user->level = $currentLevel + 1;
                    return $user;
                });

            $currentLevelUsers = $nextLevelUsers;
            $currentLevel++;
        }

        // If tier is specified (not 0), filter subordinates by that specific tier
        if ($tier > 0) {
            $subordinateMap = $subordinateMap->where('level', $tier);
            
            if ($subordinateMap->isEmpty()) {
                return response()->json([
                    'status' => 200,
                    'message' => 'No data found for the specified tier',
                    'data' => [
                        'number_of_deposit' => 0,
                        'payin_amount' => 0,
                        'number_of_bettor' => 0,
                        'bet_amount' => 0,
                        'first_deposit' => 0,
                        'first_deposit_amount' => 0,
                        'subordinates_data' => [],
                        'date_filter' => $filterDate,
                        'tier_filter' => $tier
                    ]
                ], 200);
            }

            $subordinateMap = $subordinateMap->values();
        }

        // Step 4: Get all subordinate IDs
        $subordinateIds = $subordinateMap->pluck('id');

        if ($subordinateIds->isEmpty()) {
            return response()->json([
                'status' => 200,
                'message' => 'No subordinates found',
                'data' => [
                    'number_of_deposit' => 0,
                    'payin_amount' => 0,
                    'number_of_bettor' => 0,
                    'bet_amount' => 0,
                    'first_deposit' => 0,
                    'first_deposit_amount' => 0,
                    'subordinates_data' => [],
                    'date_filter' => $filterDate,
                    'tier_filter' => $tier
                ]
            ], 200);
        }

        // Step 5: Filter by UID if provided
        if (!empty($searchUid)) {
            $filteredIds = User::whereIn('id', $subordinateIds)
                ->where('u_id', 'like', $searchUid . '%')
                ->pluck('id');

            $subordinateMap = $subordinateMap->whereIn('id', $filteredIds)->values();
            $subordinateIds = $filteredIds;

            if ($subordinateIds->isEmpty()) {
                return response()->json([
                    'status' => 200,
                    'message' => 'No data found for the specified UID',
                    'data' => [
                        'number_of_deposit' => 0,
                        'payin_amount' => 0,
                        'number_of_bettor' => 0,
                        'bet_amount' => 0,
                        'first_deposit' => 0,
                        'first_deposit_amount' => 0,
                        'subordinates_data' => [],
                        'date_filter' => $filterDate,
                        'tier_filter' => $tier
                    ]
                ], 200);
            }
        }

        // Step 6: Create inline level mapping table
        $levelCases = [];
        foreach ($subordinateMap as $item) {
            $levelCases[] = "SELECT {$item['id']} as id, {$item['level']} as level";
        }
        $levelTable = implode(" UNION ALL ", $levelCases);

        // Step 7: Join and fetch subordinate data with DATE filtering
        $subordinatesData = DB::table('users')
            ->join(DB::raw("($levelTable) as level_map"), 'users.id', '=', 'level_map.id')
            ->leftJoin('mlm_levels', 'users.role_id', '=', 'mlm_levels.id')
            ->leftJoin(DB::raw("(
                SELECT userid, SUM(amount) as total_bet 
                FROM bets 
                WHERE DATE(created_at) = '{$filterDate}'
                GROUP BY userid
            ) as bet_data"), 'users.id', '=', 'bet_data.userid')
            ->leftJoin(DB::raw("(
                SELECT user_id, SUM(cash) as total_payin, COUNT(id) as deposit_count 
                FROM payins 
                WHERE DATE(created_at) = '{$filterDate}'
                AND status = 2 
                GROUP BY user_id
            ) as payin_data"), 'users.id', '=', 'payin_data.user_id')
            ->leftJoin(DB::raw("(
                SELECT p1.user_id, COUNT(p1.id) as total_first_recharge, SUM(p1.cash) as total_first_deposit_amount 
                FROM payins p1 
                WHERE p1.status = 2 
                AND DATE(p1.created_at) = '{$filterDate}'
                AND p1.created_at = (
                    SELECT MIN(p2.created_at) 
                    FROM payins p2 
                    WHERE p2.user_id = p1.user_id 
                    AND p2.status = 2
                    AND DATE(p2.created_at) = '{$filterDate}'
                )
                GROUP BY p1.user_id
            ) as first_deposit_data"), 'users.id', '=', 'first_deposit_data.user_id')
            ->whereIn('users.id', $subordinateIds)
            ->select([
                'users.id',
                'users.u_id',
                'level_map.level',
                'mlm_levels.commission as commission_percentage',
                DB::raw('COALESCE(bet_data.total_bet, 0) as bet_amount'),
                DB::raw('COALESCE(payin_data.total_payin, 0) as payin_amount'),
                DB::raw('COALESCE(payin_data.deposit_count, 0) as number_of_deposit'),
                DB::raw('(COALESCE(bet_data.total_bet, 0) * COALESCE(mlm_levels.commission, 0)) / 100 as commission'),
                DB::raw('COALESCE(first_deposit_data.total_first_recharge, 0) as total_first_recharge'),
                DB::raw('COALESCE(first_deposit_data.total_first_deposit_amount, 0) as total_first_deposit_amount')
            ])
            ->get();

        // Step 8: Prepare result
        $result = [
            'number_of_deposit' => 0,
            'payin_amount' => 0,
            'number_of_bettor' => 0,
            'bet_amount' => 0,
            'first_deposit' => 0,
            'first_deposit_amount' => 0,
            'subordinates_data' => [],
            'date_filter' => $filterDate,
            'tier_filter' => $tier
        ];

        // Step 9: Populate result
        foreach ($subordinatesData as $user) {
            $betAmount = $user->bet_amount;
            $payinAmount = $user->payin_amount;
            $depositCount = $user->number_of_deposit;
            $commission = $user->commission;
            $firstDeposit = $user->total_first_recharge;
            $firstDepositAmount = $user->total_first_deposit_amount;

            $result['bet_amount'] += $betAmount;
            $result['payin_amount'] += $payinAmount;
            $result['number_of_deposit'] += $depositCount;
            $result['first_deposit'] += $firstDeposit;
            $result['first_deposit_amount'] += $firstDepositAmount;

            if ($betAmount > 0) {
                $result['number_of_bettor']++;
            }

            $result['subordinates_data'][] = [
                'id' => $user->id,
                'u_id' => $user->u_id,
                'level' => $user->level,
                'bet_amount' => $betAmount,
                'payin_amount' => $payinAmount,
                'number_of_deposit' => $depositCount,
                'commission' => $commission,
                'first_deposit' => $firstDeposit,
                'first_deposit_amount' => $firstDepositAmount,
            ];
        }

        // Step 10: Return response
        return response()->json([
            'status' => 200,
            'message' => 'Data fetched successfully',
            'data' => $result
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}

	public function subordinate_data_tierdata_correct(Request $request) 
{
    try {
        // Step 1: Validate input
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'tier' => 'nullable|integer|min:0',
            'created_at' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
        }

        // Step 2: Initialize input values
        $userId = $request->id;
        $tier = $request->tier ?? 0;
        $searchUid = $request->u_id;
        $currentDate = $request->created_at ? Carbon::parse($request->created_at)->format('Y-m-d') : Carbon::now()->format('Y-m-d');

        // Step 3: Build subordinate map with levels
        $subordinateMap = collect();
        $currentLevelUsers = User::where('referral_user_id', $userId)
            ->where('account_type', 0)
            ->get()
            ->map(function ($user) {
                $user->level = 1;
                return $user;
            });

        $currentLevel = 1;

        while ($currentLevelUsers->isNotEmpty() && ($tier == 0 || $currentLevel <= $tier)) {
            foreach ($currentLevelUsers as $user) {
                $subordinateMap->push(['id' => $user->id, 'level' => $user->level]);
            }

            $nextLevelUsers = User::whereIn('referral_user_id', $currentLevelUsers->pluck('id'))
                ->where('account_type', 0)
                ->get()
                ->map(function ($user) use ($currentLevel) {
                    $user->level = $currentLevel + 1;
                    return $user;
                });

            $currentLevelUsers = $nextLevelUsers;
            $currentLevel++;
        }

        // If tier is specified (not 0), filter subordinates by that specific tier
        if ($tier > 0) {
            $subordinateMap = $subordinateMap->where('level', $tier);
            
            // Return empty response if no subordinates found for the specified tier
            if ($subordinateMap->isEmpty()) {
                return response()->json([
                    'status' => 200,
                    'message' => 'No data found for the specified tier',
                    'data' => [
                        'number_of_deposit' => 0,
                        'payin_amount' => 0,
                        'number_of_bettor' => 0,
                        'bet_amount' => 0,
                        'first_deposit' => 0,
                        'first_deposit_amount' => 0,
                        'subordinates_data' => [],
                        'date_filter' => $currentDate,
                        'tier_filter' => $tier
                    ]
                ], 200);
            }
            
            $subordinateMap = $subordinateMap->values();
        }

        // Step 4: Get all subordinate IDs
        $subordinateIds = $subordinateMap->pluck('id');

        // Return empty response if no subordinates found at all
        if ($subordinateIds->isEmpty()) {
            return response()->json([
                'status' => 200,
                'message' => 'No subordinates found',
                'data' => [
                    'number_of_deposit' => 0,
                    'payin_amount' => 0,
                    'number_of_bettor' => 0,
                    'bet_amount' => 0,
                    'first_deposit' => 0,
                    'first_deposit_amount' => 0,
                    'subordinates_data' => [],
                    'date_filter' => $currentDate,
                    'tier_filter' => $tier
                ]
            ], 200);
        }

        // Step 5: Filter by UID if provided
        if (!empty($searchUid)) {
            $filteredIds = User::whereIn('id', $subordinateIds)
                ->where('u_id', 'like', $searchUid . '%')
                ->pluck('id');
            
            $subordinateMap = $subordinateMap->whereIn('id', $filteredIds)->values();
            $subordinateIds = $filteredIds;
            
            // Return empty response if no matches found for UID filter
            if ($subordinateIds->isEmpty()) {
                return response()->json([
                    'status' => 200,
                    'message' => 'No data found for the specified UID',
                    'data' => [
                        'number_of_deposit' => 0,
                        'payin_amount' => 0,
                        'number_of_bettor' => 0,
                        'bet_amount' => 0,
                        'first_deposit' => 0,
                        'first_deposit_amount' => 0,
                        'subordinates_data' => [],
                        'date_filter' => $currentDate,
                        'tier_filter' => $tier
                    ]
                ], 200);
            }
        }

        // Step 6: Create inline level mapping table
        $levelCases = [];
        foreach ($subordinateMap as $item) {
            $levelCases[] = "SELECT {$item['id']} as id, {$item['level']} as level";
        }
        $levelTable = implode(" UNION ALL ", $levelCases);

        // Step 7: Join and fetch subordinate data with date filtering
        $subordinatesData = DB::table('users')
            ->join(DB::raw("($levelTable) as level_map"), 'users.id', '=', 'level_map.id')
            ->leftJoin('mlm_levels', 'users.role_id', '=', 'mlm_levels.id')
            ->leftJoin(DB::raw("(
                SELECT userid, SUM(amount) as total_bet 
                FROM bets 
                WHERE DATE(created_at) = '{$currentDate}' 
                GROUP BY userid
            ) as bet_data"), 'users.id', '=', 'bet_data.userid')
            ->leftJoin(DB::raw("(
                SELECT user_id, SUM(cash) as total_payin, COUNT(id) as deposit_count 
                FROM payins 
                WHERE DATE(created_at) = '{$currentDate}' 
                AND status = 2 
                GROUP BY user_id
            ) as payin_data"), 'users.id', '=', 'payin_data.user_id')
            ->leftJoin(DB::raw("(
                SELECT p1.user_id, COUNT(p1.id) as total_first_recharge, SUM(p1.cash) as total_first_deposit_amount 
                FROM payins p1 
                WHERE p1.status = 2 
                AND DATE(p1.created_at) = '{$currentDate}'
                AND p1.created_at = (
                    SELECT MIN(p2.created_at) 
                    FROM payins p2 
                    WHERE p2.user_id = p1.user_id 
                    AND p2.status = 2
                    AND DATE(p2.created_at) = '{$currentDate}'
                )
                GROUP BY p1.user_id
            ) as first_deposit_data"), 'users.id', '=', 'first_deposit_data.user_id')
            ->whereIn('users.id', $subordinateIds)
            ->select([
                'users.id',
                'users.u_id',
                'level_map.level',
                'mlm_levels.commission as commission_percentage',
                DB::raw('COALESCE(bet_data.total_bet, 0) as bet_amount'),
                DB::raw('COALESCE(payin_data.total_payin, 0) as payin_amount'),
                DB::raw('COALESCE(payin_data.deposit_count, 0) as number_of_deposit'),
                DB::raw('(COALESCE(bet_data.total_bet, 0) * COALESCE(mlm_levels.commission, 0)) / 100 as commission'),
                DB::raw('COALESCE(first_deposit_data.total_first_recharge, 0) as total_first_recharge'),
                DB::raw('COALESCE(first_deposit_data.total_first_deposit_amount, 0) as total_first_deposit_amount')
            ])
            ->get();

        // Step 8: Prepare result
        $result = [
            'number_of_deposit' => 0,
            'payin_amount' => 0,
            'number_of_bettor' => 0,
            'bet_amount' => 0,
            'first_deposit' => 0,
            'first_deposit_amount' => 0,
            'subordinates_data' => [],
            'date_filter' => $currentDate,
            'tier_filter' => $tier
        ];

        // Step 9: Populate result
        foreach ($subordinatesData as $user) {
            $betAmount = $user->bet_amount;
            $payinAmount = $user->payin_amount;
            $depositCount = $user->number_of_deposit;
            $commission = $user->commission;
            $firstDeposit = $user->total_first_recharge;
            $firstDepositAmount = $user->total_first_deposit_amount;

            $result['bet_amount'] += $betAmount;
            $result['payin_amount'] += $payinAmount;
            $result['number_of_deposit'] += $depositCount;
            $result['first_deposit'] += $firstDeposit;
            $result['first_deposit_amount'] += $firstDepositAmount;

            if ($betAmount > 0) {
                $result['number_of_bettor']++;
            }

            $result['subordinates_data'][] = [
                'id' => $user->id,
                'u_id' => $user->u_id,
                'level' => $user->level,
                'bet_amount' => $betAmount,
                'payin_amount' => $payinAmount,
                'number_of_deposit' => $depositCount,
                'commission' => $commission,
                'first_deposit' => $firstDeposit,
                'first_deposit_amount' => $firstDepositAmount,
            ];
        }

        // Step 10: Return response
        return response()->json([
            'status' => 200,
            'message' => 'Data fetched successfully',
            'data' => $result
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}
	
	public function subordinate_data_old(Request $request) 
{
    try {
        // Step 1: Validate input
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'tier' => 'nullable|integer|min:0',
            'created_at' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
        }

        // Step 2: Initialize input values
        $userId = $request->id;
        $tier = $request->tier ?? 0;
        $searchUid = $request->u_id;
        $currentDate = $request->created_at ? Carbon::parse($request->created_at)->format('Y-m-d') : Carbon::now()->format('Y-m-d');

        // Step 3: Build subordinate map with levels
        $subordinateMap = collect(); // [ ['id' => 5, 'level' => 1], ['id' => 12, 'level' => 2], ... ]
        $currentLevelUsers = User::where('referral_user_id', $userId)
            ->where('account_type', 0)
            ->get()
            ->map(function ($user) {
                $user->level = 1;
                return $user;
            });

        $currentLevel = 1;

        while ($currentLevelUsers->isNotEmpty() && ($tier == 0 || $currentLevel <= $tier)) {
            foreach ($currentLevelUsers as $user) {
                $subordinateMap->push(['id' => $user->id, 'level' => $user->level]);
            }

            $nextLevelUsers = User::whereIn('referral_user_id', $currentLevelUsers->pluck('id'))
                ->where('account_type', 0)
                ->get()
                ->map(function ($user) use ($currentLevel) {
                    $user->level = $currentLevel + 1;
                    return $user;
                });

            $currentLevelUsers = $nextLevelUsers;
            $currentLevel++;
        }

        // If tier is specified (not 0), filter subordinates by that specific tier
        if ($tier > 0) {
            $subordinateMap = $subordinateMap->where('level', $tier)->values();
        }

        // Step 4: Get all subordinate IDs
        $subordinateIds = $subordinateMap->pluck('id');

        // Step 5: Filter by UID if provided
        if (!empty($searchUid)) {
            $filteredIds = User::whereIn('id', $subordinateIds)
                ->where('u_id', 'like', $searchUid . '%')
                ->pluck('id');
            
            $subordinateMap = $subordinateMap->whereIn('id', $filteredIds)->values();
            $subordinateIds = $filteredIds;
        }

        // Step 6: Create inline level mapping table
        $levelCases = [];
        foreach ($subordinateMap as $item) {
            $levelCases[] = "SELECT {$item['id']} as id, {$item['level']} as level";
        }
        $levelTable = implode(" UNION ALL ", $levelCases);

        // Step 7: Join and fetch subordinate data
        $subordinatesData = DB::table('users')
            ->join(DB::raw("($levelTable) as level_map"), 'users.id', '=', 'level_map.id')
            ->leftJoin('mlm_levels', 'users.role_id', '=', 'mlm_levels.id')
            ->leftJoin(DB::raw("(
                SELECT userid, SUM(amount) as total_bet 
                FROM bets 
                WHERE DATE(created_at) = '{$currentDate}' 
                GROUP BY userid
            ) as bet_data"), 'users.id', '=', 'bet_data.userid')
            ->leftJoin(DB::raw("(
                SELECT user_id, SUM(cash) as total_payin, COUNT(id) as deposit_count 
                FROM payins 
                WHERE DATE(created_at) = '{$currentDate}' 
                AND status = 2 
                GROUP BY user_id
            ) as payin_data"), 'users.id', '=', 'payin_data.user_id')
            ->leftJoin(DB::raw("(
                SELECT p1.user_id, COUNT(p1.id) as total_first_recharge, SUM(p1.cash) as total_first_deposit_amount 
                FROM payins p1 
                WHERE p1.status = 2 
                AND DATE(p1.created_at) = '{$currentDate}'
                AND p1.created_at = (
                    SELECT MIN(p2.created_at) 
                    FROM payins p2 
                    WHERE p2.user_id = p1.user_id 
                    AND p2.status = 2
                    AND DATE(p2.created_at) = '{$currentDate}'
                )
                GROUP BY p1.user_id
            ) as first_deposit_data"), 'users.id', '=', 'first_deposit_data.user_id')
            ->whereIn('users.id', $subordinateIds)
            ->select([
                'users.id',
                'users.u_id',
                'level_map.level',
                'mlm_levels.commission as commission_percentage',
                DB::raw('COALESCE(bet_data.total_bet, 0) as bet_amount'),
                DB::raw('COALESCE(payin_data.total_payin, 0) as payin_amount'),
                DB::raw('COALESCE(payin_data.deposit_count, 0) as number_of_deposit'),
                DB::raw('(COALESCE(bet_data.total_bet, 0) * COALESCE(mlm_levels.commission, 0)) / 100 as commission'),
                DB::raw('COALESCE(first_deposit_data.total_first_recharge, 0) as total_first_recharge'),
                DB::raw('COALESCE(first_deposit_data.total_first_deposit_amount, 0) as total_first_deposit_amount')
            ])
            ->get();

        // Step 8: Prepare result
        $result = [
            'number_of_deposit' => 0,
            'payin_amount' => 0,
            'number_of_bettor' => 0,
            'bet_amount' => 0,
            'first_deposit' => 0,
            'first_deposit_amount' => 0,
            'subordinates_data' => [],
            'date_filter' => $currentDate,
            'tier_filter' => $tier
        ];

        // Step 9: Populate result
        foreach ($subordinatesData as $user) {
            $betAmount = $user->bet_amount;
            $payinAmount = $user->payin_amount;
            $depositCount = $user->number_of_deposit;
            $commission = $user->commission;
            $firstDeposit = $user->total_first_recharge;
            $firstDepositAmount = $user->total_first_deposit_amount;

            $result['bet_amount'] += $betAmount;
            $result['payin_amount'] += $payinAmount;
            $result['number_of_deposit'] += $depositCount;
            $result['first_deposit'] += $firstDeposit;
            $result['first_deposit_amount'] += $firstDepositAmount;

            if ($betAmount > 0) {
                $result['number_of_bettor']++;
            }

            $result['subordinates_data'][] = [
                'id' => $user->id,
                'u_id' => $user->u_id,
                'level' => $user->level,
                'bet_amount' => $betAmount,
                'payin_amount' => $payinAmount,
                'number_of_deposit' => $depositCount,
                'commission' => $commission,
                'first_deposit' => $firstDeposit,
                'first_deposit_amount' => $firstDepositAmount,
            ];
        }

        // Step 10: Return response
        return response()->json([
            'status' => 200,
            'message' => 'Data fetched successfully',
            'data' => $result
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}
	
	
	public function subordinate_data_04_08_2025(Request $request) 
{
    try {
        // Step 1: Validate input
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'tier' => 'nullable|integer|min:0',
            'created_at' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
        }

        // Step 2: Initialize input values
        $userId = $request->id;
        $tier = $request->tier ?? 0;
        $searchUid = $request->u_id;
        $currentDate = $request->created_at ?: Carbon::now()->subDay()->format('Y-m-d');

        // Step 3: Build subordinate map with levels
        $subordinateMap = collect(); // [ ['id' => 5, 'level' => 1], ['id' => 12, 'level' => 2], ... ]
        $currentLevelUsers = User::where('referral_user_id', $userId)
            ->where('account_type', 0)
            ->get()
            ->map(function ($user) {
                $user->level = 1;
                return $user;
            });

        $currentLevel = 1;

        while ($currentLevelUsers->isNotEmpty() && ($tier == 0 || $currentLevel <= $tier)) {
            foreach ($currentLevelUsers as $user) {
                $subordinateMap->push(['id' => $user->id, 'level' => $user->level]);
            }

            $nextLevelUsers = User::whereIn('referral_user_id', $currentLevelUsers->pluck('id'))
                ->where('account_type', 0)
                ->get()
                ->map(function ($user) use ($currentLevel) {
                    $user->level = $currentLevel + 1;
                    return $user;
                });

            $currentLevelUsers = $nextLevelUsers;
            $currentLevel++;
        }

        // Step 4: Get all subordinate IDs
        $subordinateIds = $subordinateMap->pluck('id');

        // Step 5: Filter by UID if provided
        if (!empty($searchUid)) {
            $filteredIds = User::whereIn('id', $subordinateIds)
                ->where('u_id', 'like', $searchUid . '%')
                ->pluck('id');
            
            $subordinateMap = $subordinateMap->whereIn('id', $filteredIds)->values();
            $subordinateIds = $filteredIds;
        }

        // Step 6: Create inline level mapping table
        $levelCases = [];
        foreach ($subordinateMap as $item) {
            $levelCases[] = "SELECT {$item['id']} as id, {$item['level']} as level";
        }
        $levelTable = implode(" UNION ALL ", $levelCases);

        // Step 7: Join and fetch subordinate data
        $subordinatesData = DB::table('users')
            ->join(DB::raw("($levelTable) as level_map"), 'users.id', '=', 'level_map.id')
            ->leftJoin('mlm_levels', 'users.role_id', '=', 'mlm_levels.id')
            ->leftJoin(DB::raw("(
                SELECT userid, SUM(amount) as total_bet 
                FROM bets 
                WHERE DATE(created_at) = '{$currentDate}' 
                GROUP BY userid
            ) as bet_data"), 'users.id', '=', 'bet_data.userid')
            ->leftJoin(DB::raw("(
                SELECT user_id, SUM(cash) as total_payin, COUNT(id) as deposit_count 
                FROM payins 
                WHERE DATE(created_at) = '{$currentDate}' 
                AND status = 2 
                GROUP BY user_id
            ) as payin_data"), 'users.id', '=', 'payin_data.user_id')
            ->leftJoin(DB::raw("(
                SELECT p1.user_id, COUNT(p1.id) as total_first_recharge, SUM(p1.cash) as total_first_deposit_amount 
                FROM payins p1 
                WHERE p1.status = 2 
                AND p1.created_at = (
                    SELECT MIN(p2.created_at) 
                    FROM payins p2 
                    WHERE p2.user_id = p1.user_id 
                    AND p2.status = 2
                )
                GROUP BY p1.user_id
            ) as first_deposit_data"), 'users.id', '=', 'first_deposit_data.user_id')
            ->whereIn('users.id', $subordinateIds)
            ->select([
                'users.id',
                'users.u_id',
                'level_map.level',
                'mlm_levels.commission as commission_percentage',
                DB::raw('COALESCE(bet_data.total_bet, 0) as bet_amount'),
                DB::raw('COALESCE(payin_data.total_payin, 0) as payin_amount'),
                DB::raw('COALESCE(payin_data.deposit_count, 0) as number_of_deposit'),
                DB::raw('(COALESCE(bet_data.total_bet, 0) * COALESCE(mlm_levels.commission, 0)) / 100 as commission'),
                DB::raw('COALESCE(first_deposit_data.total_first_recharge, 0) as total_first_recharge'),
                DB::raw('COALESCE(first_deposit_data.total_first_deposit_amount, 0) as total_first_deposit_amount')
            ])
            ->get();

        // Step 8: Prepare result
        $result = [
            'number_of_deposit' => 0,
            'payin_amount' => 0,
            'number_of_bettor' => 0,
            'bet_amount' => 0,
            'first_deposit' => 0,
            'first_deposit_amount' => 0,
            'subordinates_data' => [],
        ];

        // Step 9: Populate result
        foreach ($subordinatesData as $user) {
            $betAmount = $user->bet_amount;
            $payinAmount = $user->payin_amount;
            $depositCount = $user->number_of_deposit;
            $commission = $user->commission;
            $firstDeposit = $user->total_first_recharge;
            $firstDepositAmount = $user->total_first_deposit_amount;

            $result['bet_amount'] += $betAmount;
            $result['payin_amount'] += $payinAmount;
            $result['number_of_deposit'] += $depositCount;
            $result['first_deposit'] += $firstDeposit;
            $result['first_deposit_amount'] += $firstDepositAmount;

            if ($betAmount > 0) {
                $result['number_of_bettor']++;
            }

            $result['subordinates_data'][] = [
                'id' => $user->id,
                'u_id' => $user->u_id,
                'level' => $user->level,
                'bet_amount' => $betAmount,
                'payin_amount' => $payinAmount,
                'number_of_deposit' => $depositCount,
                'commission' => $commission,
                'first_deposit' => $firstDeposit,
                'first_deposit_amount' => $firstDepositAmount,
            ];
        }

        // Step 10: Return response
        return response()->json([
            'status' => 200,
            'message' => 'Data fetched successfully',
            'data' => $result
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}

	
	public function subordinate_data_03_08_2025(Request $request) 
{
    try {
        // Validate the request
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'tier' => 'nullable|integer|min:0',
            'created_at' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 400);
        }

        // Get input parameters
        $userId = $request->id;
        $tier = $request->tier ?? 0;
        $searchUid = $request->u_id;
        $currentDate = $request->created_at ?: Carbon::now()->subDay()->format('Y-m-d');

        // Step 1: Initialize a collection to store subordinates
        $subordinates = collect();

        // Step 2: Get the initial users at level 1 (direct referrals)
        // $currentLevelUsers = User::where('referral_user_id', $userId)->get();
        $currentLevelUsers = User::where('referral_user_id', $userId)
    ->where('account_type', 0)
    ->get();

        $currentLevel = 1;

        // Step 3: Iterate through each level to get subordinates up to the given tier
        while ($currentLevelUsers->isNotEmpty() && ($tier == 0 || $currentLevel <= $tier)) {
            $subordinates = $subordinates->merge($currentLevelUsers);
            $currentLevelUsers = User::whereIn('referral_user_id', $currentLevelUsers->pluck('id'))->get();
            $currentLevel++;
        }

        // Get all subordinate user IDs
        $subordinateIds = $subordinates->pluck('id');

        // If search UID is provided, filter by UID
        if (!empty($searchUid)) {
            $subordinateIds = User::whereIn('id', $subordinateIds)
                                  ->where('u_id', 'like', $searchUid . '%')
                                  ->pluck('id');
        }

        // Step 4: Fetch Data with Corrected Query
        $subordinatesData = DB::table('users')
            ->leftJoin('mlm_levels', 'users.role_id', '=', 'mlm_levels.id')
            ->leftJoin(DB::raw("(
                SELECT userid, SUM(amount) as total_bet 
                FROM bets 
                WHERE DATE(created_at) = '{$currentDate}' 
                GROUP BY userid
            ) as bet_data"), 'users.id', '=', 'bet_data.userid')
            ->leftJoin(DB::raw("(
                SELECT user_id, SUM(cash) as total_payin, COUNT(id) as deposit_count 
                FROM payins 
                WHERE DATE(created_at) = '{$currentDate}' 
                AND status = 2 
                GROUP BY user_id
            ) as payin_data"), 'users.id', '=', 'payin_data.user_id')
            ->leftJoin(DB::raw("(
                SELECT p1.user_id, COUNT(p1.id) as total_first_recharge, SUM(p1.cash) as total_first_deposit_amount 
                FROM payins p1 
                WHERE p1.status = 2 
                AND p1.created_at = (
                    SELECT MIN(p2.created_at) 
                    FROM payins p2 
                    WHERE p2.user_id = p1.user_id 
                    AND p2.status = 2
                )
                GROUP BY p1.user_id
            ) as first_deposit_data"), 'users.id', '=', 'first_deposit_data.user_id')
            ->whereIn('users.id', $subordinateIds)
            ->select([
                'users.id',
                'users.u_id',
                'mlm_levels.commission as commission_percentage',
                DB::raw('COALESCE(bet_data.total_bet, 0) as bet_amount'),
                DB::raw('COALESCE(payin_data.total_payin, 0) as payin_amount'),
                DB::raw('COALESCE(payin_data.deposit_count, 0) as number_of_deposit'),
                DB::raw('(COALESCE(bet_data.total_bet, 0) * COALESCE(mlm_levels.commission, 0)) / 100 as commission'),
                DB::raw('COALESCE(first_deposit_data.total_first_recharge, 0) as total_first_recharge'),
                DB::raw('COALESCE(first_deposit_data.total_first_deposit_amount, 0) as total_first_deposit_amount')
            ])
            ->get();
//dd($subordinatesData);
        // Step 5: Initialize the result array
        $result = [
            'number_of_deposit' => 0,
            'payin_amount' => 0,
            'number_of_bettor' => 0,
            'bet_amount' => 0,
            'first_deposit' => 0,
            'first_deposit_amount' => 0,
            'subordinates_data' => [],
        ];

        // Step 6: Calculate data for each subordinate
        foreach ($subordinatesData as $user) {
            // Calculate values
            $betAmount = $user->bet_amount;
            $payinAmount = $user->payin_amount;
            $depositCount = $user->number_of_deposit;
            $commission = $user->commission;
            $firstDeposit = $user->total_first_recharge;
            $firstDepositAmount = $user->total_first_deposit_amount;

            // Update result totals
            $result['bet_amount'] += $betAmount;
            $result['payin_amount'] += $payinAmount;
            $result['number_of_deposit'] += $depositCount;
            $result['first_deposit'] += $firstDeposit;
            $result['first_deposit_amount'] += $firstDepositAmount;

            if ($betAmount > 0) {
                $result['number_of_bettor']++;
            }

            // Add individual subordinate data
            $result['subordinates_data'][] = [
                'id' => $user->id,
                'u_id' => $user->u_id,
                'bet_amount' => $betAmount,
                'payin_amount' => $payinAmount,
                'number_of_deposit' => $depositCount,
                'commission' => $commission,
                'first_deposit' => $firstDeposit,
                'first_deposit_amount' => $firstDepositAmount,
            ];
        }

        // Step 7: Return the result
        return response()->json(['status' => 200, 'message' => 'Data fetched successfully', 'data' => $result], 200);

    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

	
	
public function subordinate_data_28_06_2025(Request $request) {
	
    try {
        $validator = Validator::make($request->all(), [
            'id' => 'required',
            'tier' => 'required|integer|min:1',
        ]);

        $validator->stopOnFirstFailure();

        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ]; 
            return response()->json($response, 400);
        }

        $user_id = $request->id; 
        $tier = $request->tier; 
		$search_uid = $request->u_id;
        $currentDate = Carbon::now()->subDay()->format('Y-m-d');
		
		  if (!empty($search_uid)) {
           $subordinates_deposit = \DB::select("
    SELECT 
        users.id, 
        users.u_id, 
        COALESCE(SUM(bets.amount), 0) AS bet_amount, 
        COALESCE(SUM(payins.cash), 0) AS total_cash, 
        users.commission AS commission, 
        DATE_SUB(CURDATE(), INTERVAL 1 DAY) AS yesterday_date 
    FROM users
    LEFT JOIN bets ON users.id = bets.userid AND bets.created_at LIKE ?
    LEFT JOIN payins ON users.id = payins.user_id AND payins.created_at LIKE ?
    WHERE users.u_id LIKE ?
    GROUP BY users.id, users.u_id, users.commission;
", [$currentDate . ' %', $currentDate . ' %', $search_uid .'%']);
			  
			 
			  $subordinates_data = \DB::select("
    WITH RECURSIVE subordinates AS (
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?
        UNION ALL
        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level + 1 <= ?
    )
    SELECT 
        users.id, 
        users.u_id, 
        COALESCE(payin_summary1.total_payins, 0) AS payin_count,
        COALESCE(bettor_count.total_bettors, 0) AS bettor_count,
        COALESCE(bet_summary.total_bet_amount, 0) AS bet_amount,
        COALESCE(payin_summary2.total_payin_cash, 0) AS payin_amount
    FROM users
    LEFT JOIN (
        SELECT userid, SUM(amount) AS total_bet_amount 
        FROM bets 
        WHERE created_at LIKE ? 
        GROUP BY userid
    ) AS bet_summary ON users.id = bet_summary.userid
    
    LEFT JOIN (
        SELECT user_id, SUM(cash) AS total_payin_cash
        FROM payins 
        WHERE status = 2 AND created_at LIKE ? 
        GROUP BY user_id
    ) AS payin_summary2 ON users.id = payin_summary2.user_id
    
    LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_payins
        FROM payins 
        WHERE status = 2 AND created_at LIKE ? 
        GROUP BY user_id
    ) AS payin_summary1 ON users.id = payin_summary1.user_id

    LEFT JOIN (
        SELECT userid, COUNT(DISTINCT userid) AS total_bettors
        FROM bets 
        WHERE created_at LIKE ? 
        GROUP BY userid
    ) AS bettor_count ON users.id = bettor_count.userid
    WHERE users.id IN (
        SELECT id FROM subordinates WHERE level = ?
    )
    GROUP BY 
        users.id, 
        users.u_id, 
        payin_summary1.total_payins,
        bettor_count.total_bettors,
        bet_summary.total_bet_amount,
        payin_summary2.total_payin_cash
", [$user_id, $tier, $currentDate . '%', $currentDate . '%', $currentDate . '%', $currentDate . '%', $tier]);



			  

        } else {
		
       $subordinates_deposit = \DB::select("
    WITH RECURSIVE subordinates AS (
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?
        UNION ALL
        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level + 1 <= ?
    )
    SELECT 
        users.id, 
        users.u_id, 
        COALESCE(bet_summary.total_bet_amount, 0) AS bet_amount, 
        COALESCE(payin_summary.total_cash, 0) AS total_cash,  
        users.commission AS commission, 
        DATE_SUB(CURDATE(), INTERVAL 1 DAY) AS yesterday_date 
    FROM users
    LEFT JOIN (
        SELECT userid, SUM(amount) AS total_bet_amount 
        FROM bets 
        WHERE created_at LIKE ? 
        GROUP BY userid
    ) AS bet_summary ON users.id = bet_summary.userid 
    LEFT JOIN (
        SELECT user_id, SUM(cash) AS total_cash 
        FROM payins 
        WHERE status = 2 AND created_at LIKE ? 
        GROUP BY user_id
    ) AS payin_summary ON users.id = payin_summary.user_id
    WHERE users.id IN (
        SELECT id FROM subordinates WHERE level = ?
    )
    GROUP BY users.id, users.u_id, users.commission, bet_summary.total_bet_amount, payin_summary.total_cash
",[$user_id, $tier, $currentDate . ' %', $currentDate . ' %', $tier]);
		
	$subordinates_data = \DB::select("
    WITH RECURSIVE subordinates AS (
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?
        UNION ALL
        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level + 1 <= ?
    )
    SELECT 
        users.id, 
        users.u_id, 
        COALESCE(payin_summary1.total_payins, 0) AS payin_count,
        COALESCE(bettor_count.total_bettors, 0) AS bettor_count,
        COALESCE(bet_summary.total_bet_amount, 0) AS bet_amount,
        COALESCE(payin_summary2.total_payin_cash, 0) AS payin_amount
    FROM users
    LEFT JOIN (
        SELECT userid, SUM(amount) AS total_bet_amount 
        FROM bets 
        WHERE created_at LIKE ? 
        GROUP BY userid
    ) AS bet_summary ON users.id = bet_summary.userid
    
    LEFT JOIN (
        SELECT user_id, SUM(cash) AS total_payin_cash
        FROM payins 
        WHERE status = 2 AND created_at LIKE ? 
        GROUP BY user_id
    ) AS payin_summary2 ON users.id = payin_summary2.user_id
    
    LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_payins
        FROM payins 
        WHERE status = 2 AND created_at LIKE ? 
        GROUP BY user_id
    ) AS payin_summary1 ON users.id = payin_summary1.user_id

    LEFT JOIN (
        SELECT userid, COUNT(DISTINCT userid) AS total_bettors
        FROM bets 
        WHERE created_at LIKE ? 
        GROUP BY userid
    ) AS bettor_count ON users.id = bettor_count.userid
    WHERE users.id IN (
        SELECT id FROM subordinates WHERE level = ?
    )
    GROUP BY 
        users.id, 
        users.u_id, 
        payin_summary1.total_payins,
        bettor_count.total_bettors,
        bet_summary.total_bet_amount,
        payin_summary2.total_payin_cash
", [$user_id, $tier, $currentDate . '%', $currentDate . '%', $currentDate . '%', $currentDate . '%', $tier]);



		 }

        $result = [
			'number of deposit' => $subordinates_data[0]->payin_count,
			'payin amount' => $subordinates_data[0]->payin_amount,
			'number of bettor' => $subordinates_data[0]->bettor_count,
			'bet amount' => $subordinates_data[0]->bet_amount,
			'first deposit ' => $subordinates_data[0]->total_first_recharge ?? 0,
			'first deposit amount' => $subordinates_data[0]->total_first_deposit_amount ?? 0,
			
            'subordinates_data' => $subordinates_deposit ?? 0,
        ];

        return response()->json($result, 200);

    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
		
    }
}

public function turnover_new_oldd()
{
    // Get the current datetime and the date for the previous day
    $datetime = Carbon::now();
    $currentDate = Carbon::now()->subDay()->format('Y-m-d');
    //dd($currentDate);

	
    DB::table('users')->update(['yesterday_total_commission' => 0]);

    // Fetch users who have a referral_user_id
    $referralUsers = DB::table('users')->whereNotNull('users.referral_user_id')->get();

    
    $referralUsersCount = $referralUsers->count();


    // Check if there are any users retrieved
   if ($referralUsersCount > 0) {
      
  

        foreach ($referralUsers as $referralUser) {
            $user_id = $referralUser->id;
	  
            $maxTier = 10;

   $subordinatesData = \DB::select("
    WITH RECURSIVE subordinates AS (
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?
        UNION ALL
        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level + 1 <= ?
    )
    SELECT 
        users.id, 
        subordinates.level,
        COALESCE(SUM(bet_summary.total_bet_amount), 0) AS bet_amount,
        COALESCE(SUM(bet_summary.total_bet_amount), 0) * COALESCE(level_commissions.commission, 0) / 100 AS commission
    FROM users
    LEFT JOIN (
        SELECT userid, SUM(amount) AS total_bet_amount 
        FROM bets 
        WHERE created_at LIKE ?
        GROUP BY userid
    ) AS bet_summary ON users.id = bet_summary.userid 
    LEFT JOIN subordinates ON users.id = subordinates.id
    LEFT JOIN (
        SELECT id, commission
        FROM mlm_levels
    ) AS level_commissions ON subordinates.level = level_commissions.id
    WHERE subordinates.level <= ?
    GROUP BY users.id, subordinates.level, level_commissions.commission;
", [$user_id, $maxTier, $currentDate . '%', $maxTier]);

$totalCommission = 0;



foreach ($subordinatesData as $data) {
    $totalCommission += $data->commission;
    

   
}

			 //echo($user_id);
			 //die;
	// echo "<pre>"; print_r($subordinatesData); echo "<pre>";  die;

                DB::table('users')->where('id', $user_id)->update([
        'wallet' => DB::raw('wallet + ' . $totalCommission),
        'commission' => DB::raw('commission + ' . $totalCommission),
		'yesterday_total_commission' => $totalCommission,
        'updated_at' => $datetime,
    ]);
		
			  DB::table('wallet_history')->insert([
    'userid' => $user_id,
    'amount' => $totalCommission,
    'subtypeid' => 26,
    'created_at' => $datetime,
    'updated_at' => $datetime,
]);
			

           
        }

    
    }else{
         return response()->json(['message' => 'No referral users found.'], 400);
    }

   
}



public function turnover_new_old()
{
        $datetime = Carbon::now();
    $currentDate = Carbon::now()->subDay()->format('Y-m-d');
    
    DB::table('users')->update(['yesterday_total_commission' => 0]);

    $referralUsers = DB::table('users')->whereNotNull('referral_user_id')->get();
    //dd($referralUsers);
    $referralUsersCount = $referralUsers->count();

    if ($referralUsersCount > 0) {

        foreach ($referralUsers as $referralUser) {
            $user_id = $referralUser->id;
            $maxTier = 10;

           $subordinatesData = \DB::select("
    WITH RECURSIVE subordinates AS (
        -- Base case: Start from users directly referred by the current user
        SELECT id, referral_user_id, 1 AS level
        FROM users
        WHERE referral_user_id = ?
        UNION ALL
        -- Recursive case: Get users referred by users in the previous level
        SELECT u.id, u.referral_user_id, s.level + 1
        FROM users u
        INNER JOIN subordinates s ON s.id = u.referral_user_id
        WHERE s.level + 1 <= ?
    )
    SELECT 
        users.id, 
        subordinates.level,
        COALESCE(SUM(payins.total_payin_amount), 0) AS total_payin_amount,  -- Changed from bet_summary to payins
        COALESCE(SUM(payins.total_payin_amount), 0) * COALESCE(level_commissions.commission, 0) / 100 AS commission
    FROM users
    LEFT JOIN (
        -- Sum payin amounts for each user for the previous day
        SELECT user_id, SUM(cash) AS total_payin_amount  -- Using the payins table
        FROM payins
        WHERE status = 2
        AND created_at LIKE ?  -- Added AND here to fix the multiple WHERE issue
        GROUP BY user_id
    ) AS payins ON users.id = payins.user_id
    LEFT JOIN subordinates ON users.id = subordinates.id  -- Join with subordinates
    LEFT JOIN (
        -- Commission rates for each level
        SELECT id, commission
        FROM mlm_levels
    ) AS level_commissions ON subordinates.level = level_commissions.id
    WHERE subordinates.level <= ?  -- Filter by max tier level
    GROUP BY users.id, subordinates.level, level_commissions.commission;
", [$user_id, $maxTier, $currentDate . '%', $maxTier]);

           //return $subordinatesData;
            $totalCommission = 0;
            //$totalPayinAmount = 0;
            foreach ($subordinatesData as $data) {
                $totalCommission += $data->commission;
                //$totalPayinAmount += $data->total_payin_amount;
                //dd($totalPayinAmount);
            }
            
            DB::table('users')->where('id', $user_id)->update([
    'wallet' => DB::raw('wallet + ' . $totalCommission),  // Preserve the current wallet amount and add the commission
    'recharge' => DB::raw('recharge + ' . $totalCommission),  // Add commission to recharge
    'commission' => DB::raw('commission + ' . $totalCommission),  // Add commission to commission field
    'yesterday_total_commission' => $totalCommission,  // Set yesterday's total commission
    'updated_at' => $datetime,  // Update the timestamp
]);


            // DB::table('users')->where('id', $user_id)->update([
            //     'wallet' => DB::raw('wallet + ' . $totalCommission),
            //      'wallet' => DB::raw('recharge + ' . $totalCommission),
            //     'commission' => DB::raw('commission + ' . $totalCommission),
            //     'yesterday_total_commission' => $totalCommission,
            //     'updated_at' => $datetime,
            // ]);

            DB::table('wallet_history')->insert([
                'userid' => $user_id,
                'amount' => $totalCommission,
                'subtypeid' => 23,
                //'description' => $totalPayinAmount,
                'created_at' => $datetime,
                'updated_at' => $datetime,
            ]);
            $this->gameSerialNo();
        }

    } else {
        return response()->json(['message' => 'No referral users found.'], 400);
    }
}


  private function gameSerialNo()
    {
        $date = now()->format('Ymd');
            // wingo
            $gamesNo1 = $date . "01" . "0001";
    		$gamesNo2 = $date . "02" . "0001";
    		$gamesNo3 = $date . "03" . "0001";
    		$gamesNo4 = $date . "04" . "0001";
    		// trx
    		$gamesNo6 = $date . "06" . "0001";
    		$gamesNo7 = $date . "07" . "0001";
    		$gamesNo8 = $date . "08" . "0001";
    		$gamesNo9 = $date . "09" . "0001";
    		// D & T
    		$gamesNo10 = $date . "10" . "0001";
		 	$gamesNo11 = $date . "11" . "0001";
		 	$gamesNo12 = $date . "12" . "0001";
		 	$gamesNo13 = $date . "13" . "0001";
    		
       	    DB::table('betlogs')->where('game_id', 1)
                          ->update(['games_no' => $gamesNo1]);
    		
    		DB::table('betlogs')->where('game_id', 2)
                          ->update(['games_no' => $gamesNo2]);
    		
    		DB::table('betlogs')->where('game_id', 3)
                          ->update(['games_no' => $gamesNo3]);
    		
    		DB::table('betlogs')->where('game_id', 4)
                          ->update(['games_no' => $gamesNo4]);
                          
            DB::table('betlogs')->where('game_id', 6)
                          ->update(['games_no' => $gamesNo6]);
    		
    		DB::table('betlogs')->where('game_id', 7)
                          ->update(['games_no' => $gamesNo7]);
    		
    		DB::table('betlogs')->where('game_id', 8)
                          ->update(['games_no' => $gamesNo8]);
    		
    		DB::table('betlogs')->where('game_id', 9)
                          ->update(['games_no' => $gamesNo9]);
    
            DB::table('betlogs')->where('game_id', 10)
                          ->update(['games_no' => $gamesNo10]);
		 
		 	DB::table('betlogs')->where('game_id', 11)
                          ->update(['games_no' => $gamesNo11]);
		 
		 	DB::table('betlogs')->where('game_id', 12)
                          ->update(['games_no' => $gamesNo12]);
		 
		 	DB::table('betlogs')->where('game_id', 13)
                          ->update(['games_no' => $gamesNo13]);
		 
    }


// public function turnover_new()
// {
//     // Get current datetime and the previous day (yesterday's date)
//     $datetime = Carbon::now();
//     $currentDate = Carbon::now()->subDay()->format('Y-m-d');

//     // Reset yesterday's total commission to 0 for all users
//     DB::table('users')->update(['yesterday_total_commission' => 0]);

//     // Get all users who have a referrer_id
//     // $referralUsers = DB::table('users')->whereNotNull('referral_user_id')->get();
//     $referralUsers = DB::table('users')
//     ->whereNotNull('referral_user_id')
//     ->where('account_type', 0)
//     ->get();

//     $referralUsersCount = $referralUsers->count();

//     if ($referralUsersCount > 0) {
//         // Loop through each referral user
//         foreach ($referralUsers as $referralUser) {
//             $user_id = $referralUser->id;
//             $maxTier = 5;
			

//             // Get subordinate data with the recursive CTE query
//             $subordinatesData = \DB::select("
//                 WITH RECURSIVE subordinates AS (
//                     -- Base case: Start from users directly referred by the current user
//                     SELECT id, referral_user_id, 1 AS level
//                     FROM users
//                     WHERE referral_user_id = ?
//                     UNION ALL
//                     -- Recursive case: Get users referred by users in the previous level
//                     SELECT u.id, u.referral_user_id, s.level + 1
//                     FROM users u
//                     INNER JOIN subordinates s ON s.id = u.referral_user_id
//                     WHERE s.level + 1 <= ?
//                 )
//                 SELECT 
//                     users.id, 
//                     subordinates.level,
//                     COALESCE(SUM(bet_summary.total_bet_amount), 0) AS bet_amount,
//                     COALESCE(SUM(bet_summary.total_bet_amount), 0) * COALESCE(level_commissions.commission, 0) / 100 AS commission
//                 FROM users
//                 LEFT JOIN (
//                     -- Sum bet amounts for each user for the previous day
//                     SELECT userid, SUM(amount) AS total_bet_amount 
//                     FROM bets 
//                     WHERE created_at LIKE ?
//                     GROUP BY userid
//                 ) AS bet_summary ON users.id = bet_summary.userid 
//                 LEFT JOIN subordinates ON users.id = subordinates.id
//                 LEFT JOIN (
//                     -- Commission rates for each level
//                     SELECT id, commission
//                     FROM mlm_levels
//                 ) AS level_commissions ON subordinates.level = level_commissions.id
//                 WHERE subordinates.level <= ?
//                 GROUP BY users.id, subordinates.level, level_commissions.commission;
//             ", [$user_id, $maxTier, $currentDate . '%', $maxTier]);
//           // return $subordinatesData;
//             // Calculate total commission
//             $totalCommission = 0;
//             foreach ($subordinatesData as $data) {
//                 $totalCommission += $data->commission;
//             }

//             // Update the user's wallet, recharge, commission, yesterday_total_commission fields
//             // DB::table('users')->where('id', $user_id)->update([
//             //     'wallet' => DB::raw('wallet + ' . $totalCommission),  
//             //     'recharge' => DB::raw('recharge + ' . $totalCommission),  
//             //     'commission' => DB::raw('commission + ' . $totalCommission),  
//             //     'yesterday_total_commission' => $totalCommission,  
//             //     'updated_at' => $datetime,  
//             // ]);  

//             // Insert into wallet_histories to log the commission
//             DB::table('wallet_history')->insert([
//                 'userid' => $user_id,
//                 'amount' => $totalCommission,
//                 'subtypeid' => 23,  // Assuming type 23 is for commission-related transactions
//                 'created_at' => $datetime,
//                 'updated_at' => $datetime,
//             ]);
//         }

//         // Once done with all referral users, return success message
//         return response()->json(['message' => 'Turnover commission calculated successfully.'], 200);
//     } else {
//         // No referral users found
//         return response()->json(['message' => 'No referral users found.'], 400);
//     }
// }
	
	public function turnover_new()
{
    // Current datetime and yesterday's date
    $datetime = Carbon::now();
    $currentDate = Carbon::now()->subDay()->format('Y-m-d');

    // Reset yesterday's total commission to 0 for all users
    DB::table('users')->update(['yesterday_total_commission' => 0]);

    // Get all users who have a referral_user_id and account_type = 0
    $referralUsers = DB::table('users')
        ->whereNotNull('referral_user_id')
        ->where('account_type', 0)
        ->get();

    // Check if there are any referral users
    if ($referralUsers->count() > 0) {
        foreach ($referralUsers as $referralUser) {
            $user_id = $referralUser->id;
            $maxTier = 5;

            // Get subordinate data using recursive query
            $subordinatesData = \DB::select("
                WITH RECURSIVE subordinates AS (
                    SELECT id, referral_user_id, 1 AS level
                    FROM users
                    WHERE referral_user_id = ?
                    UNION ALL
                    SELECT u.id, u.referral_user_id, s.level + 1
                    FROM users u
                    INNER JOIN subordinates s ON s.id = u.referral_user_id
                    WHERE s.level + 1 <= ?
                )
                SELECT 
                    users.id, 
                    subordinates.level,
                    COALESCE(SUM(bet_summary.total_bet_amount), 0) AS bet_amount,
                    COALESCE(SUM(bet_summary.total_bet_amount), 0) * COALESCE(level_commissions.commission, 0) / 100 AS commission,
                    COUNT(DISTINCT CASE WHEN bet_summary.total_bet_amount > 0 THEN users.id END) AS number_of_bettors
                FROM users
                LEFT JOIN (
                    SELECT userid, SUM(amount) AS total_bet_amount 
                    FROM bets 
                    WHERE created_at LIKE ?
                    GROUP BY userid
                ) AS bet_summary ON users.id = bet_summary.userid 
                LEFT JOIN subordinates ON users.id = subordinates.id
                LEFT JOIN (
                    SELECT id, commission
                    FROM mlm_levels
                ) AS level_commissions ON subordinates.level = level_commissions.id
                WHERE subordinates.level <= ?
                GROUP BY users.id, subordinates.level, level_commissions.commission;
            ", [$user_id, $maxTier, $currentDate . '%', $maxTier]);

            // Calculate total commission and prepare data for wallet_history
            $totalCommission = 0;
            $totalBetAmount = 0;
            $totalNumberOfBettors = 0;
            
            foreach ($subordinatesData as $data) {
                if ($data->bet_amount > 0 && $data->commission > 0) {
                    $totalCommission += $data->commission;
                    $totalBetAmount += $data->bet_amount;
                    $totalNumberOfBettors++;
                }
            }

            // Insert only if totalCommission > 0
            if ($totalCommission > 0) {
                // Prepare description and description_2
                $description = "Total Bet Amount: " . number_format($totalBetAmount, 2);
                $description2 = "Number of Bettors: " . $totalNumberOfBettors;
                
                // Insert into wallet_history with description and description_2
                DB::table('wallet_history')->insert([
                    'userid' => $user_id,
                    'amount' => $totalCommission,
                    'subtypeid' => 23, // Assuming 23 is commission
                    'description' => $description,
                    'description_2' => $description2,
                    'created_at' => $datetime,
                    'updated_at' => $datetime,
                ]);

                // Optional: Update user balance and commission
                DB::table('users')->where('id', $user_id)->update([
                    'wallet' => DB::raw('wallet + ' . $totalCommission),
                    'commission' => DB::raw('commission + ' . $totalCommission),
                    'yesterday_total_commission' => $totalCommission,
                    'updated_at' => $datetime,
                ]);
            }
        }

        // Success response
        return response()->json(['message' => 'Turnover commission calculated and inserted successfully.'], 200);
    } else {
        // No referral users found
        return response()->json(['message' => 'No referral users found.'], 400);
    }
}

public function turnover_new_08_05_2026()
{
    // Current datetime and yesterday's date
    $datetime = Carbon::now();
    $currentDate = Carbon::now()->subDay()->format('Y-m-d');

    // Reset yesterday's total commission to 0 for all users
    DB::table('users')->update(['yesterday_total_commission' => 0]);

    // Get all users who have a referral_user_id and account_type = 0
    $referralUsers = DB::table('users')
        ->whereNotNull('referral_user_id')
        ->where('account_type', 0)
        ->get();

    // Check if there are any referral users
    if ($referralUsers->count() > 0) {
        foreach ($referralUsers as $referralUser) {
            $user_id = $referralUser->id;
            $maxTier = 5;

            // Get subordinate data using recursive query
            $subordinatesData = \DB::select("
                WITH RECURSIVE subordinates AS (
                    SELECT id, referral_user_id, 1 AS level
                    FROM users
                    WHERE referral_user_id = ?
                    UNION ALL
                    SELECT u.id, u.referral_user_id, s.level + 1
                    FROM users u
                    INNER JOIN subordinates s ON s.id = u.referral_user_id
                    WHERE s.level + 1 <= ?
                )
                SELECT 
                    users.id, 
                    subordinates.level,
                    COALESCE(SUM(bet_summary.total_bet_amount), 0) AS bet_amount,
                    COALESCE(SUM(bet_summary.total_bet_amount), 0) * COALESCE(level_commissions.commission, 0) / 100 AS commission
                FROM users
                LEFT JOIN (
                    SELECT userid, SUM(amount) AS total_bet_amount 
                    FROM bets 
                    WHERE created_at LIKE ?
                    GROUP BY userid
                ) AS bet_summary ON users.id = bet_summary.userid 
                LEFT JOIN subordinates ON users.id = subordinates.id
                LEFT JOIN (
                    SELECT id, commission
                    FROM mlm_levels
                ) AS level_commissions ON subordinates.level = level_commissions.id
                WHERE subordinates.level <= ?
                GROUP BY users.id, subordinates.level, level_commissions.commission;
            ", [$user_id, $maxTier, $currentDate . '%', $maxTier]);
//return $subordinatesData;
            // Calculate total commission only for valid subordinates
            $totalCommission = 0;
            foreach ($subordinatesData as $data) {
                if ($data->bet_amount > 0 && $data->commission > 0) {
                    $totalCommission += $data->commission;
                }
            }

            // Insert only if totalCommission > 0
            if ($totalCommission > 0) {
                // Insert into wallet_history
                DB::table('wallet_history')->insert([
                    'userid' => $user_id,
                    'amount' => $totalCommission,
                    'subtypeid' => 23, // Assuming 23 is commission
                    'created_at' => $datetime,
                    'updated_at' => $datetime,
                ]);

               

                // Optional: Update user balance and commission
                 DB::table('users')->where('id', $user_id)->update([
                    'wallet' => DB::raw('wallet + ' . $totalCommission),
                    'commission' => DB::raw('commission + ' . $totalCommission),
                    'yesterday_total_commission' => $totalCommission,
                    'updated_at' => $datetime,
                ]);
            }
        }

        // Success response
        return response()->json(['message' => 'Turnover commission calculated and inserted successfully.'], 200);
    } else {
        // No referral users found
        return response()->json(['message' => 'No referral users found.'], 400);
    }
}


	

	  
	
}